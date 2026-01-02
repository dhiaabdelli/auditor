package handlers

import (
	"encoding/base64"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path"
	"strings"
	"time"

	"golang.org/x/crypto/ssh"
	"github.com/pkg/sftp"

	"network-script-generator/internal/models"
	"network-script-generator/internal/security"
	"network-script-generator/internal/shared"
)

// HandleSFTPWebSocket handles SFTP WebSocket connections
func HandleSFTPWebSocket(w http.ResponseWriter, r *http.Request) {
	// Upgrade connection to WebSocket
	conn, err := shared.Upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("SFTP WebSocket upgrade error: %v", err)
		return
	}
	defer conn.Close()

	// Authenticate connection
	authenticated := false
	var token string
	
	// Try to get token from query parameter or header
	token = r.URL.Query().Get("token")
	if token == "" {
		authHeader := r.Header.Get("Authorization")
		if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
			token = strings.TrimPrefix(authHeader, "Bearer ")
		}
	}
	
	if token != "" {
		if _, _, err := security.ValidateJWT(token); err == nil {
			authenticated = true
		}
	}

	if !authenticated {
		// Send auth request
		conn.WriteJSON(map[string]interface{}{
			"type": "auth_required",
		})
		
		// Wait for auth message
		var msg map[string]interface{}
		if err := conn.ReadJSON(&msg); err != nil {
			return
		}
		
		if msg["type"] == "auth" {
			token, _ := msg["token"].(string)
			if token != "" {
				if _, _, err := security.ValidateJWT(token); err == nil {
					authenticated = true
					conn.WriteJSON(map[string]interface{}{
						"type": "auth",
						"status": "success",
					})
				} else {
					conn.WriteJSON(map[string]interface{}{
						"type": "auth",
						"status": "error",
						"message": "Invalid token",
					})
					return
				}
			}
		}
	}

	if !authenticated {
		conn.WriteJSON(map[string]interface{}{
			"type": "error",
			"message": "Authentication required",
		})
		return
	}

	var sftpClient *sftp.Client
	var sshClient *ssh.Client
	var connID string

	for {
		var msg map[string]interface{}
		err := conn.ReadJSON(&msg)
		if err != nil {
			log.Printf("SFTP WS read error: %v", err)
			break
		}

		msgType, _ := msg["type"].(string)

		switch msgType {
		case "connect":
			host, _ := msg["host"].(string)
			port, _ := msg["port"].(float64)
			user, _ := msg["user"].(string)
			password, _ := msg["password"].(string)
			sessionID, _ := msg["sessionID"].(string)

			if sessionID == "" {
				sessionID = fmt.Sprintf("%d", time.Now().UnixNano())
			}
			connID = fmt.Sprintf("sftp:%s@%s:%d#%s", user, host, int(port), sessionID)

			// Check if connection already exists
			shared.SSHConnMu.RLock()
			existingClient, exists := shared.SFTPClients[connID]
			shared.SSHConnMu.RUnlock()

			if exists && existingClient != nil {
				conn.WriteJSON(map[string]interface{}{
					"type": "connected",
					"connID": connID,
				})
				sftpClient = existingClient
				continue
			}

			// Create new SSH connection
			config := &ssh.ClientConfig{
				User: user,
				Auth: []ssh.AuthMethod{
					ssh.Password(password),
				},
				HostKeyCallback: ssh.InsecureIgnoreHostKey(),
				Timeout:         10 * time.Second,
				Config: ssh.Config{
					KeyExchanges: []string{
						"curve25519-sha256@libssh.org",
						"ecdh-sha2-nistp256",
						"ecdh-sha2-nistp384",
						"ecdh-sha2-nistp521",
						"diffie-hellman-group-exchange-sha256",
						"diffie-hellman-group14-sha256",
					},
					Ciphers: []string{
						"chacha20-poly1305@openssh.com",
						"aes128-ctr",
						"aes192-ctr",
						"aes256-ctr",
					},
					MACs: []string{
						"hmac-sha2-256-etm@openssh.com",
						"hmac-sha2-512-etm@openssh.com",
						"hmac-sha2-256",
						"hmac-sha2-512",
					},
				},
			}

			address := fmt.Sprintf("%s:%d", host, int(port))
			client, err := ssh.Dial("tcp", address, config)
			if err != nil {
				errorMsg := fmt.Sprintf("Connection failed: %v", err)
				if strings.Contains(err.Error(), "unable to authenticate") {
					errorMsg = fmt.Sprintf("Authentication failed: Please check your username and password. Error: %v", err)
				}
				conn.WriteJSON(map[string]interface{}{
					"type": "error",
					"message": errorMsg,
				})
				continue
			}

			// Create SFTP client
			sftpClient, err = sftp.NewClient(client)
			if err != nil {
				client.Close()
				conn.WriteJSON(map[string]interface{}{
					"type": "error",
					"message": fmt.Sprintf("SFTP client creation failed: %v", err),
				})
				continue
			}

			sshClient = client

			// Store connections
			shared.SSHConnMu.Lock()
			if shared.SFTPClients == nil {
				shared.SFTPClients = make(map[string]*sftp.Client)
			}
			shared.SFTPClients[connID] = sftpClient
			shared.SSHConnections[connID] = &models.SSHConnection{
				Client: client,
				Host:   host,
				User:   user,
				Port:   int(port),
			}
			shared.SSHConnMu.Unlock()

			conn.WriteJSON(map[string]interface{}{
				"type": "connected",
				"connID": connID,
			})

		case "list":
			dirPath, _ := msg["path"].(string)
			log.Printf("[SFTP Debug] Received list request with path: '%s'", dirPath)
			if dirPath == "" {
				dirPath = "/"
				log.Printf("[SFTP Debug] Path was empty, defaulting to: '%s'", dirPath)
			}

			if sftpClient == nil {
				log.Printf("[SFTP Debug] Error: SFTP client is nil")
				conn.WriteJSON(map[string]interface{}{
					"type": "error",
					"message": "Not connected",
				})
				continue
			}

			// Normalize path - ensure it starts with /
			if !strings.HasPrefix(dirPath, "/") {
				dirPath = "/" + dirPath
				log.Printf("[SFTP Debug] Path didn't start with /, normalized to: '%s'", dirPath)
			}
			// Clean the path to remove any .. or . components
			// Replace backslashes with forward slashes first (in case Windows path separators got in)
			dirPath = strings.ReplaceAll(dirPath, "\\", "/")
			originalPath := dirPath
			dirPath = path.Clean(dirPath)
			if originalPath != dirPath {
				log.Printf("[SFTP Debug] Path cleaned from '%s' to '%s'", originalPath, dirPath)
			}
			// Ensure it's still absolute after cleaning
			if !strings.HasPrefix(dirPath, "/") {
				dirPath = "/" + dirPath
				log.Printf("[SFTP Debug] Path wasn't absolute after cleaning, normalized to: '%s'", dirPath)
			}

			log.Printf("[SFTP Debug] Attempting to list directory: '%s'", dirPath)
			// Try to list the directory
			files, err := sftpClient.ReadDir(dirPath)
			if err != nil {
				log.Printf("[SFTP Debug] Error listing directory '%s': %v", dirPath, err)
				// If the path doesn't exist, try to get the current working directory
				errStr := strings.ToLower(err.Error())
				if strings.Contains(errStr, "does not exist") || 
				   strings.Contains(errStr, "no such file") || 
				   strings.Contains(errStr, "file does not exist") {
					log.Printf("[SFTP Debug] Path doesn't exist, trying to get current working directory")
					// Try to get current working directory
					cwd, cwdErr := sftpClient.Getwd()
					if cwdErr == nil && cwd != "" {
						log.Printf("[SFTP Debug] Current working directory: '%s'", cwd)
						dirPath = cwd
						files, err = sftpClient.ReadDir(dirPath)
						// If still error, try root
						if err != nil {
							log.Printf("[SFTP Debug] Error listing CWD '%s': %v, trying root", dirPath, err)
							dirPath = "/"
							files, err = sftpClient.ReadDir(dirPath)
						}
					} else {
						log.Printf("[SFTP Debug] Failed to get CWD: %v, trying root", cwdErr)
						// If Getwd fails, try root
						dirPath = "/"
						files, err = sftpClient.ReadDir(dirPath)
					}
				}
				
				if err != nil {
					log.Printf("[SFTP Debug] Final error listing directory '%s': %v", dirPath, err)
					conn.WriteJSON(map[string]interface{}{
						"type": "error",
						"message": fmt.Sprintf("Failed to list directory '%s': %v", dirPath, err),
					})
					continue
				}
			}

			log.Printf("[SFTP Debug] Successfully listed directory '%s', found %d items", dirPath, len(files))
			var fileList []map[string]interface{}
			for _, file := range files {
				// Use path.Join (not filepath.Join) to ensure forward slashes for Unix paths
				filePath := path.Join(dirPath, file.Name())
				// Ensure path starts with / if it's absolute
				if strings.HasPrefix(dirPath, "/") && !strings.HasPrefix(filePath, "/") {
					filePath = "/" + filePath
				}
				fileInfo := map[string]interface{}{
					"name":    file.Name(),
					"path":    filePath,
					"size":    file.Size(),
					"mode":    file.Mode().String(),
					"modTime": file.ModTime().Format(time.RFC3339),
					"isDir":   file.IsDir(),
				}
				log.Printf("[SFTP Debug] - File: name='%s', path='%s', isDir=%v", file.Name(), filePath, file.IsDir())
				fileList = append(fileList, fileInfo)
			}

			log.Printf("[SFTP Debug] Sending list response with path: '%s', %d files", dirPath, len(fileList))
			conn.WriteJSON(map[string]interface{}{
				"type": "list",
				"files": fileList,
				"path":  dirPath,
			})

		case "download":
			filePath, _ := msg["path"].(string)
			if filePath == "" {
				conn.WriteJSON(map[string]interface{}{
					"type": "error",
					"message": "Path parameter required",
				})
				continue
			}

			if sftpClient == nil {
				conn.WriteJSON(map[string]interface{}{
					"type": "error",
					"message": "Not connected",
				})
				continue
			}

			// Open file for reading
			srcFile, err := sftpClient.Open(filePath)
			if err != nil {
				conn.WriteJSON(map[string]interface{}{
					"type": "error",
					"message": fmt.Sprintf("Failed to open file: %v", err),
				})
				continue
			}

			// Get file info
			fileInfo, err := srcFile.Stat()
			if err != nil {
				srcFile.Close()
				conn.WriteJSON(map[string]interface{}{
					"type": "error",
					"message": fmt.Sprintf("Failed to get file info: %v", err),
				})
				continue
			}

			// Send file info first
			conn.WriteJSON(map[string]interface{}{
				"type": "download_start",
				"fileName": path.Base(filePath),
				"size": fileInfo.Size(),
			})

			// Read file in chunks and send
			buf := make([]byte, 32*1024) // 32KB chunks
			totalSent := int64(0)
			for {
				n, err := srcFile.Read(buf)
				if n > 0 {
					// Send chunk as base64
					chunkData := map[string]interface{}{
						"type": "download_chunk",
						"data": fmt.Sprintf("%x", buf[:n]), // Send as hex for binary data
						"size": n,
					}
					if err := conn.WriteJSON(chunkData); err != nil {
						srcFile.Close()
						return
					}
					totalSent += int64(n)
				}
				if err == io.EOF {
					break
				}
				if err != nil {
					srcFile.Close()
					conn.WriteJSON(map[string]interface{}{
						"type": "error",
						"message": fmt.Sprintf("Read error: %v", err),
					})
					return
				}
			}
			srcFile.Close()

			conn.WriteJSON(map[string]interface{}{
				"type": "download_complete",
				"size": totalSent,
			})

		case "upload":
			remotePath, _ := msg["path"].(string)
			fileName, _ := msg["fileName"].(string)
			fileData, _ := msg["data"].(string) // Base64 encoded
			chunkIndex, _ := msg["chunkIndex"].(float64)
			totalChunks, _ := msg["totalChunks"].(float64)
			isFirstChunk := chunkIndex == 0
			isLastChunk := chunkIndex == totalChunks-1

			if sftpClient == nil {
				conn.WriteJSON(map[string]interface{}{
					"type": "error",
					"message": "Not connected",
				})
				continue
			}

			if remotePath == "" {
				remotePath = "/"
			}

			// If path ends with /, append filename
			if strings.HasSuffix(remotePath, "/") {
				remotePath = path.Join(remotePath, fileName)
			}

			// Create parent directories if needed (only on first chunk)
			if isFirstChunk {
				parentDir := path.Dir(remotePath)
				if parentDir != "." && parentDir != "/" {
					err := sftpClient.MkdirAll(parentDir)
					if err != nil && !os.IsExist(err) {
						conn.WriteJSON(map[string]interface{}{
							"type": "error",
							"message": fmt.Sprintf("Failed to create directory: %v", err),
						})
						continue
					}
				}
			}

			// Decode hex data
			decodedData := make([]byte, len(fileData)/2)
			_, decodeErr := fmt.Sscanf(fileData, "%x", &decodedData)
			if decodeErr != nil {
				// Try as base64
				decodedData, decodeErr = base64.StdEncoding.DecodeString(fileData)
				if decodeErr != nil {
					conn.WriteJSON(map[string]interface{}{
						"type": "error",
						"message": fmt.Sprintf("Failed to decode file data: %v", decodeErr),
					})
					continue
				}
			}

			// Open file for writing (create or append)
			var dstFile *sftp.File
			var fileErr error
			if isFirstChunk {
				dstFile, fileErr = sftpClient.Create(remotePath)
			} else {
				dstFile, fileErr = sftpClient.OpenFile(remotePath, os.O_WRONLY|os.O_APPEND)
			}

			if fileErr != nil {
				conn.WriteJSON(map[string]interface{}{
					"type": "error",
					"message": fmt.Sprintf("Failed to open file: %v", fileErr),
				})
				continue
			}

			// Write chunk
			_, writeErr := dstFile.Write(decodedData)
			if writeErr != nil {
				dstFile.Close()
				conn.WriteJSON(map[string]interface{}{
					"type": "error",
					"message": fmt.Sprintf("Failed to write file: %v", writeErr),
				})
				continue
			}

			if isLastChunk {
				dstFile.Close()
				conn.WriteJSON(map[string]interface{}{
					"type": "upload_complete",
					"path": remotePath,
				})
			} else {
				dstFile.Close()
				conn.WriteJSON(map[string]interface{}{
					"type": "upload_progress",
					"chunkIndex": int(chunkIndex),
					"totalChunks": int(totalChunks),
				})
			}

		case "delete":
			delPath, _ := msg["path"].(string)
			log.Printf("[SFTP Debug] Received delete request for path: '%s'", delPath)
			if delPath == "" {
				conn.WriteJSON(map[string]interface{}{
					"type": "error",
					"message": "Path parameter required",
				})
				continue
			}

			if sftpClient == nil {
				log.Printf("[SFTP Debug] Error: SFTP client is nil")
				conn.WriteJSON(map[string]interface{}{
					"type": "error",
					"message": "Not connected",
				})
				continue
			}

			// Normalize path - replace backslashes with forward slashes
			delPath = strings.ReplaceAll(delPath, "\\", "/")
			// Ensure path is absolute
			if !strings.HasPrefix(delPath, "/") {
				delPath = "/" + delPath
			}
			delPath = path.Clean(delPath)
			if !strings.HasPrefix(delPath, "/") {
				delPath = "/" + delPath
			}
			log.Printf("[SFTP Debug] Normalized delete path: '%s'", delPath)

			// Check if it's a directory
			fileInfo, err := sftpClient.Stat(delPath)
			if err != nil {
				log.Printf("[SFTP Debug] Error getting file info for '%s': %v", delPath, err)
				conn.WriteJSON(map[string]interface{}{
					"type": "error",
					"message": fmt.Sprintf("Failed to get file info: %v", err),
				})
				continue
			}

			log.Printf("[SFTP Debug] File info: IsDir=%v, attempting to delete", fileInfo.IsDir())
			if fileInfo.IsDir() {
				// RemoveDirectory only works on empty directories
				// First, recursively delete all contents
				err = removeDirectoryRecursive(sftpClient, delPath)
				if err != nil {
					log.Printf("[SFTP Debug] Error removing directory '%s': %v", delPath, err)
				} else {
					log.Printf("[SFTP Debug] Successfully removed directory '%s'", delPath)
				}
			} else {
				err = sftpClient.Remove(delPath)
				if err != nil {
					log.Printf("[SFTP Debug] Error removing file '%s': %v", delPath, err)
				} else {
					log.Printf("[SFTP Debug] Successfully removed file '%s'", delPath)
				}
			}

			if err != nil {
				conn.WriteJSON(map[string]interface{}{
					"type": "error",
					"message": fmt.Sprintf("Failed to delete: %v", err),
				})
				continue
			}

			log.Printf("[SFTP Debug] Delete successful, sending delete_complete")
			conn.WriteJSON(map[string]interface{}{
				"type": "delete_complete",
			})

		case "mkdir":
			path, _ := msg["path"].(string)
			if path == "" {
				conn.WriteJSON(map[string]interface{}{
					"type": "error",
					"message": "Path parameter required",
				})
				continue
			}

			if sftpClient == nil {
				conn.WriteJSON(map[string]interface{}{
					"type": "error",
					"message": "Not connected",
				})
				continue
			}

			err := sftpClient.MkdirAll(path)
			if err != nil {
				conn.WriteJSON(map[string]interface{}{
					"type": "error",
					"message": fmt.Sprintf("Failed to create directory: %v", err),
				})
				continue
			}

			conn.WriteJSON(map[string]interface{}{
				"type": "mkdir_complete",
				"path": path,
			})

		case "rename":
			oldPath, _ := msg["oldPath"].(string)
			newPath, _ := msg["newPath"].(string)
			if oldPath == "" || newPath == "" {
				conn.WriteJSON(map[string]interface{}{
					"type": "error",
					"message": "oldPath and newPath are required",
				})
				continue
			}

			if sftpClient == nil {
				conn.WriteJSON(map[string]interface{}{
					"type": "error",
					"message": "Not connected",
				})
				continue
			}

			err := sftpClient.Rename(oldPath, newPath)
			if err != nil {
				conn.WriteJSON(map[string]interface{}{
					"type": "error",
					"message": fmt.Sprintf("Failed to rename: %v", err),
				})
				continue
			}

			conn.WriteJSON(map[string]interface{}{
				"type": "rename_complete",
			})

		case "disconnect":
			if sftpClient != nil {
				sftpClient.Close()
			}
			if sshClient != nil {
				sshClient.Close()
			}
			if connID != "" {
				shared.SSHConnMu.Lock()
				delete(shared.SFTPClients, connID)
				delete(shared.SSHConnections, connID)
				shared.SSHConnMu.Unlock()
			}
			conn.WriteJSON(map[string]interface{}{
				"type": "disconnected",
			})
			return

		default:
			conn.WriteJSON(map[string]interface{}{
				"type": "error",
				"message": fmt.Sprintf("Unknown message type: %s", msgType),
			})
		}
	}
}

// removeDirectoryRecursive recursively deletes a directory and all its contents
func removeDirectoryRecursive(sftpClient *sftp.Client, dirPath string) error {
	// List all files in the directory
	files, err := sftpClient.ReadDir(dirPath)
	if err != nil {
		return fmt.Errorf("failed to read directory: %w", err)
	}

	// Delete all files and subdirectories
	for _, file := range files {
		filePath := path.Join(dirPath, file.Name())
		if file.IsDir() {
			// Recursively delete subdirectory
			if err := removeDirectoryRecursive(sftpClient, filePath); err != nil {
				return fmt.Errorf("failed to remove subdirectory %s: %w", filePath, err)
			}
		} else {
			// Delete file
			if err := sftpClient.Remove(filePath); err != nil {
				return fmt.Errorf("failed to remove file %s: %w", filePath, err)
			}
		}
	}

	// Remove the empty directory
	if err := sftpClient.RemoveDirectory(dirPath); err != nil {
		return fmt.Errorf("failed to remove directory %s: %w", dirPath, err)
	}

	return nil
}

