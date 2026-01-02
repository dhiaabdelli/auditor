package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"golang.org/x/crypto/ssh"
	"github.com/pkg/sftp"

	"network-script-generator/internal/models"
	"network-script-generator/internal/security"
	"network-script-generator/internal/shared"
)

// SFTPConnectRequest represents an SFTP connection request
type SFTPConnectRequest struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	User     string `json:"user"`
	Password string `json:"password"`
	SessionID string `json:"sessionID"`
}

// SFTPFileInfo represents file/directory information
type SFTPFileInfo struct {
	Name    string    `json:"name"`
	Path    string    `json:"path"`
	Size    int64     `json:"size"`
	Mode    string    `json:"mode"`
	ModTime time.Time `json:"modTime"`
	IsDir   bool      `json:"isDir"`
}

// HandleSFTPConnect establishes an SFTP connection
func HandleSFTPConnect(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Authenticate request - extract token from header
	token := r.Header.Get("Authorization")
	if token != "" && strings.HasPrefix(token, "Bearer ") {
		token = strings.TrimPrefix(token, "Bearer ")
	} else {
		// Try cookie
		cookie, err := r.Cookie("jwt_token")
		if err == nil {
			token = cookie.Value
		}
	}
	if token == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	_, _, err := security.ValidateJWT(token)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req SFTPConnectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.Host == "" || req.User == "" {
		http.Error(w, "Host and user are required", http.StatusBadRequest)
		return
	}

	if req.Port == 0 {
		req.Port = 22
	}

	// Use session ID to create unique connection
	sessionID := req.SessionID
	if sessionID == "" {
		sessionID = fmt.Sprintf("%d", time.Now().UnixNano())
	}
	connID := fmt.Sprintf("sftp:%s@%s:%d#%s", req.User, req.Host, req.Port, sessionID)

	// Check if connection already exists
	shared.SSHConnMu.RLock()
	sshConn := shared.SSHConnections[connID]
	shared.SSHConnMu.RUnlock()

	if sshConn == nil {
		// Create new SSH connection
		// Build auth methods - always include password if provided
		authMethods := []ssh.AuthMethod{}
		if req.Password != "" {
			authMethods = append(authMethods, ssh.Password(req.Password))
		}

		// If no auth methods, return error
		if len(authMethods) == 0 {
			http.Error(w, "Password is required for authentication", http.StatusBadRequest)
			return
		}

		config := &ssh.ClientConfig{
			User:            req.User,
			Auth:            authMethods,
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

		address := fmt.Sprintf("%s:%d", req.Host, req.Port)
		client, err := ssh.Dial("tcp", address, config)
		if err != nil {
			// Provide more detailed error message
			errorMsg := fmt.Sprintf("Connection failed: %v", err)
			if strings.Contains(err.Error(), "unable to authenticate") {
				errorMsg = fmt.Sprintf("Authentication failed: Please check your username and password. Error: %v", err)
			} else if strings.Contains(err.Error(), "connection refused") {
				errorMsg = fmt.Sprintf("Connection refused: The server at %s:%d may be down or not accepting connections. Error: %v", req.Host, req.Port, err)
			} else if strings.Contains(err.Error(), "timeout") {
				errorMsg = fmt.Sprintf("Connection timeout: Unable to reach %s:%d. Error: %v", req.Host, req.Port, err)
			}
			http.Error(w, errorMsg, http.StatusInternalServerError)
			return
		}

		// Create SFTP client
		sftpClient, err := sftp.NewClient(client)
		if err != nil {
			client.Close()
			http.Error(w, fmt.Sprintf("SFTP client creation failed: %v", err), http.StatusInternalServerError)
			return
		}

		sshConn = &models.SSHConnection{
			Client:  client,
			Host:    req.Host,
			User:    req.User,
			Port:    req.Port,
		}

		// Store SFTP client in a map (we'll need to extend the model or use a separate map)
		// For now, we'll store it in a global map
		if shared.SFTPClients == nil {
			shared.SFTPClients = make(map[string]*sftp.Client)
		}
		shared.SFTPClients[connID] = sftpClient

		shared.SSHConnMu.Lock()
		shared.SSHConnections[connID] = sshConn
		shared.SSHConnMu.Unlock()
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"connID":  connID,
	})
}

// HandleSFTPList lists files in a directory
func HandleSFTPList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Authenticate request - extract token from header
	token := r.Header.Get("Authorization")
	if token != "" && strings.HasPrefix(token, "Bearer ") {
		token = strings.TrimPrefix(token, "Bearer ")
	} else {
		// Try cookie
		cookie, err := r.Cookie("jwt_token")
		if err == nil {
			token = cookie.Value
		}
	}
	if token == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	_, _, err := security.ValidateJWT(token)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	connID := r.URL.Query().Get("connID")
	path := r.URL.Query().Get("path")
	if path == "" {
		path = "/"
	}

	shared.SSHConnMu.RLock()
	sftpClient, exists := shared.SFTPClients[connID]
	shared.SSHConnMu.RUnlock()

	if !exists || sftpClient == nil {
		http.Error(w, "SFTP connection not found", http.StatusNotFound)
		return
	}

	files, err := sftpClient.ReadDir(path)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to list directory: %v", err), http.StatusInternalServerError)
		return
	}

	var fileList []SFTPFileInfo
	for _, file := range files {
		fileInfo := SFTPFileInfo{
			Name:    file.Name(),
			Path:    filepath.Join(path, file.Name()),
			Size:    file.Size(),
			Mode:    file.Mode().String(),
			ModTime: file.ModTime(),
			IsDir:   file.IsDir(),
		}
		fileList = append(fileList, fileInfo)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"files":   fileList,
		"path":    path,
	})
}

// HandleSFTPDownload downloads a file
func HandleSFTPDownload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Authenticate request - extract token from header
	token := r.Header.Get("Authorization")
	if token != "" && strings.HasPrefix(token, "Bearer ") {
		token = strings.TrimPrefix(token, "Bearer ")
	} else {
		// Try cookie
		cookie, err := r.Cookie("jwt_token")
		if err == nil {
			token = cookie.Value
		}
	}
	if token == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	_, _, err := security.ValidateJWT(token)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	connID := r.URL.Query().Get("connID")
	filePath := r.URL.Query().Get("path")

	if filePath == "" {
		http.Error(w, "Path parameter required", http.StatusBadRequest)
		return
	}

	shared.SSHConnMu.RLock()
	sftpClient, exists := shared.SFTPClients[connID]
	shared.SSHConnMu.RUnlock()

	if !exists || sftpClient == nil {
		http.Error(w, "SFTP connection not found", http.StatusNotFound)
		return
	}

	// Open file for reading
	srcFile, err := sftpClient.Open(filePath)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to open file: %v", err), http.StatusInternalServerError)
		return
	}
	defer srcFile.Close()

	// Get file info
	fileInfo, err := srcFile.Stat()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get file info: %v", err), http.StatusInternalServerError)
		return
	}

	// Set headers for file download
	fileName := filepath.Base(filePath)
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", fileName))
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Length", fmt.Sprintf("%d", fileInfo.Size()))

	// Copy file to response
	_, err = io.Copy(w, srcFile)
	if err != nil {
		log.Printf("Error copying file: %v", err)
		return
	}
}

// HandleSFTPUpload uploads a file
func HandleSFTPUpload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Authenticate request - extract token from header
	token := r.Header.Get("Authorization")
	if token != "" && strings.HasPrefix(token, "Bearer ") {
		token = strings.TrimPrefix(token, "Bearer ")
	} else {
		// Try cookie
		cookie, err := r.Cookie("jwt_token")
		if err == nil {
			token = cookie.Value
		}
	}
	if token == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	_, _, err := security.ValidateJWT(token)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse multipart form
	err = r.ParseMultipartForm(32 << 20) // 32MB max
	if err != nil {
		http.Error(w, "Failed to parse form", http.StatusBadRequest)
		return
	}

	connID := r.FormValue("connID")
	remotePath := r.FormValue("path")
	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Failed to get file from form", http.StatusBadRequest)
		return
	}
	defer file.Close()

	if remotePath == "" {
		remotePath = "/"
	}

	// If path ends with /, append filename
	if strings.HasSuffix(remotePath, "/") {
		remotePath = filepath.Join(remotePath, header.Filename)
	}

	shared.SSHConnMu.RLock()
	sftpClient, exists := shared.SFTPClients[connID]
	shared.SSHConnMu.RUnlock()

	if !exists || sftpClient == nil {
		http.Error(w, "SFTP connection not found", http.StatusNotFound)
		return
	}

	// Create parent directories if needed
	parentDir := filepath.Dir(remotePath)
	if parentDir != "." && parentDir != "/" {
		err = sftpClient.MkdirAll(parentDir)
		if err != nil && !os.IsExist(err) {
			http.Error(w, fmt.Sprintf("Failed to create directory: %v", err), http.StatusInternalServerError)
			return
		}
	}

	// Create remote file
	dstFile, err := sftpClient.Create(remotePath)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create file: %v", err), http.StatusInternalServerError)
		return
	}
	defer dstFile.Close()

	// Copy file content
	_, err = io.Copy(dstFile, file)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to upload file: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"path":    remotePath,
	})
}

// HandleSFTPDelete deletes a file or directory
func HandleSFTPDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Authenticate request - extract token from header
	token := r.Header.Get("Authorization")
	if token != "" && strings.HasPrefix(token, "Bearer ") {
		token = strings.TrimPrefix(token, "Bearer ")
	} else {
		// Try cookie
		cookie, err := r.Cookie("jwt_token")
		if err == nil {
			token = cookie.Value
		}
	}
	if token == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	_, _, err := security.ValidateJWT(token)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		ConnID string `json:"connID"`
		Path   string `json:"path"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	shared.SSHConnMu.RLock()
	sftpClient, exists := shared.SFTPClients[req.ConnID]
	shared.SSHConnMu.RUnlock()

	if !exists || sftpClient == nil {
		http.Error(w, "SFTP connection not found", http.StatusNotFound)
		return
	}

	// Check if it's a directory
	fileInfo, err := sftpClient.Stat(req.Path)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get file info: %v", err), http.StatusInternalServerError)
		return
	}

	if fileInfo.IsDir() {
		err = sftpClient.RemoveDirectory(req.Path)
	} else {
		err = sftpClient.Remove(req.Path)
	}

	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to delete: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
	})
}

// HandleSFTPMkdir creates a directory
func HandleSFTPMkdir(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Authenticate request - extract token from header
	token := r.Header.Get("Authorization")
	if token != "" && strings.HasPrefix(token, "Bearer ") {
		token = strings.TrimPrefix(token, "Bearer ")
	} else {
		// Try cookie
		cookie, err := r.Cookie("jwt_token")
		if err == nil {
			token = cookie.Value
		}
	}
	if token == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	_, _, err := security.ValidateJWT(token)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		ConnID string `json:"connID"`
		Path   string `json:"path"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	shared.SSHConnMu.RLock()
	sftpClient, exists := shared.SFTPClients[req.ConnID]
	shared.SSHConnMu.RUnlock()

	if !exists || sftpClient == nil {
		http.Error(w, "SFTP connection not found", http.StatusNotFound)
		return
	}

	err = sftpClient.MkdirAll(req.Path)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create directory: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"path":    req.Path,
	})
}

// HandleSFTPRename renames a file or directory
func HandleSFTPRename(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Authenticate request - extract token from header
	token := r.Header.Get("Authorization")
	if token != "" && strings.HasPrefix(token, "Bearer ") {
		token = strings.TrimPrefix(token, "Bearer ")
	} else {
		// Try cookie
		cookie, err := r.Cookie("jwt_token")
		if err == nil {
			token = cookie.Value
		}
	}
	if token == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	_, _, err := security.ValidateJWT(token)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		ConnID   string `json:"connID"`
		OldPath  string `json:"oldPath"`
		NewPath  string `json:"newPath"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	shared.SSHConnMu.RLock()
	sftpClient, exists := shared.SFTPClients[req.ConnID]
	shared.SSHConnMu.RUnlock()

	if !exists || sftpClient == nil {
		http.Error(w, "SFTP connection not found", http.StatusNotFound)
		return
	}

	err = sftpClient.Rename(req.OldPath, req.NewPath)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to rename: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
	})
}

// HandleSFTPDisconnect closes an SFTP connection
func HandleSFTPDisconnect(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Authenticate request - extract token from header
	token := r.Header.Get("Authorization")
	if token != "" && strings.HasPrefix(token, "Bearer ") {
		token = strings.TrimPrefix(token, "Bearer ")
	} else {
		// Try cookie
		cookie, err := r.Cookie("jwt_token")
		if err == nil {
			token = cookie.Value
		}
	}
	if token == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	_, _, err := security.ValidateJWT(token)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		ConnID string `json:"connID"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	shared.SSHConnMu.Lock()
	defer shared.SSHConnMu.Unlock()

	// Close SFTP client
	if sftpClient, exists := shared.SFTPClients[req.ConnID]; exists && sftpClient != nil {
		sftpClient.Close()
		delete(shared.SFTPClients, req.ConnID)
	}

	// Close SSH connection
	if sshConn, exists := shared.SSHConnections[req.ConnID]; exists {
		if sshConn.Session != nil {
			sshConn.Session.Close()
		}
		if sshConn.Client != nil {
			sshConn.Client.Close()
		}
		delete(shared.SSHConnections, req.ConnID)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
	})
}

