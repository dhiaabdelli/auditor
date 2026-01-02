package handlers

import (
	// Standard library - crypto
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	
	// Standard library - database
	"database/sql"
	
	// Standard library - encoding
	"encoding/base64"
	"encoding/json"
	
	// Standard library - io
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"strings"
	"time"
	
	// Third-party packages
	"golang.org/x/crypto/pbkdf2"
	"golang.org/x/crypto/ssh"
	
	// Internal packages
	"network-script-generator/internal/database"
	"network-script-generator/internal/models"
	"network-script-generator/internal/security"
	"network-script-generator/internal/shared"
)

// SSH Connection handlers

// HandleSSHConnect handles SSH connection requests
func HandleSSHConnect(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.SSHConnectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	connID := fmt.Sprintf("%s@%s:%d", req.User, req.Host, req.Port)

	// Create SSH client config with improved security
	config := &ssh.ClientConfig{
		User: req.User,
		Auth: []ssh.AuthMethod{
			ssh.Password(req.Password),
		},
		// Use a more secure host key callback
		// In production, you should verify host keys against a known_hosts file
		HostKeyCallback: func(hostname string, remote net.Addr, key ssh.PublicKey) error {
			// For now, we'll log the host key fingerprint for security auditing
			// In production, compare against a known_hosts file
			log.Printf("SSH connection to %s: host key fingerprint: %s", hostname, ssh.FingerprintSHA256(key))
			// TODO: Implement host key verification against known_hosts file
			return nil
		},
		Timeout: 10 * time.Second,
		// Add additional security configurations
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
		http.Error(w, fmt.Sprintf("Failed to connect: %v", err), http.StatusInternalServerError)
		return
	}

	session, err := client.NewSession()
	if err != nil {
		client.Close()
		http.Error(w, fmt.Sprintf("Failed to create session: %v", err), http.StatusInternalServerError)
		return
	}

	sshConn := &models.SSHConnection{
		Client:  client,
		Session: session,
		Host:    req.Host,
		User:    req.User,
		Port:    req.Port,
		Output:  make(chan string, 100),
		Error:   make(chan error, 10),
	}

	shared.SSHConnMu.Lock()
	shared.SSHConnections[connID] = sshConn
	shared.SSHConnMu.Unlock()

	response := map[string]interface{}{
		"success": true,
		"connId":  connID,
		"message": "Connected successfully",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleSSHWebSocket handles SSH WebSocket connections
func HandleSSHWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := shared.Upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}
	defer conn.Close()

	// Wait for authentication message first (if not authenticated via middleware)
	authenticated := false
	authTimeout := time.NewTimer(5 * time.Second)
	defer authTimeout.Stop()

	// Check if already authenticated via middleware (query param or header)
	token := r.URL.Query().Get("api_key")
	if token == "" {
		token = r.Header.Get("Authorization")
		if strings.HasPrefix(token, "Bearer ") {
			token = strings.TrimPrefix(token, "Bearer ")
		}
	}

	if token != "" {
		// Validate token
		if _, _, err := security.ValidateJWT(token); err == nil {
			authenticated = true
		}
	}

	// If not authenticated, wait for auth message
	if !authenticated {
		authChan := make(chan bool, 1)
		go func() {
			for {
				var msg map[string]interface{}
				if err := conn.ReadJSON(&msg); err != nil {
					return
				}

				if msgType, ok := msg["type"].(string); ok && msgType == "auth" {
					token, _ := msg["token"].(string)
					if token != "" {
						if _, _, err := security.ValidateJWT(token); err == nil {
							authChan <- true
							conn.WriteJSON(map[string]interface{}{
								"type":    "auth",
								"status":  "success",
								"message": "Authenticated",
							})
							return
						}
					}
					conn.WriteJSON(map[string]interface{}{
						"type":    "auth",
						"status":  "error",
						"message": "Invalid token",
					})
					return
				}
			}
		}()

		select {
		case <-authChan:
			authenticated = true
		case <-authTimeout.C:
			log.Printf("SSH WebSocket authentication timeout")
			conn.WriteJSON(map[string]interface{}{
				"type":    "error",
				"data":    "Authentication timeout",
			})
			return
		}
	}

	var sshConn *models.SSHConnection
	var connID string

	for {
		var msg models.WSMessage
		err := conn.ReadJSON(&msg)
		if err != nil {
			log.Printf("Read error: %v", err)
			if sshConn != nil && sshConn.Conn == conn {
				sshConn.Conn = nil
			}
			break
		}

		switch msg.Type {
		case "connect":
			// Use a unique connection ID that includes a session identifier
			// This allows multiple tabs to connect to the same host with independent sessions
			sessionID := msg.SessionID
			if sessionID == "" {
				// Generate a unique session ID if not provided
				sessionID = fmt.Sprintf("%d", time.Now().UnixNano())
			}
			connID = fmt.Sprintf("%s@%s:%d#%s", msg.User, msg.Host, msg.Port, sessionID)
			shared.SSHConnMu.RLock()
			sshConn = shared.SSHConnections[connID]
			shared.SSHConnMu.RUnlock()
			
			if sshConn == nil {
				config := &ssh.ClientConfig{
					User: msg.User,
					Auth: []ssh.AuthMethod{
						ssh.Password(msg.Password),
					},
					HostKeyCallback: ssh.InsecureIgnoreHostKey(),
					Timeout:         10 * time.Second,
				}

				address := fmt.Sprintf("%s:%d", msg.Host, msg.Port)
				client, err := ssh.Dial("tcp", address, config)
				if err != nil {
					conn.WriteJSON(models.WSMessage{Type: "error", Data: fmt.Sprintf("Connection failed: %v", err)})
					continue
				}

				session, err := client.NewSession()
				if err != nil {
					client.Close()
					conn.WriteJSON(models.WSMessage{Type: "error", Data: fmt.Sprintf("Session failed: %v", err)})
					continue
				}

				sshConn = &models.SSHConnection{
					Client:  client,
					Session: session,
					Host:    msg.Host,
					User:    msg.User,
					Port:    msg.Port,
					Conn:    conn,
					Output:  make(chan string, 100),
					Error:   make(chan error, 10),
				}

				shared.SSHConnMu.Lock()
				shared.SSHConnections[connID] = sshConn
				shared.SSHConnMu.Unlock()

				modes := ssh.TerminalModes{
					ssh.ECHO:          1,
					ssh.TTY_OP_ISPEED: 14400,
					ssh.TTY_OP_OSPEED: 14400,
				}

				if err := session.RequestPty("xterm", 80, 24, modes); err != nil {
					conn.WriteJSON(models.WSMessage{Type: "error", Data: fmt.Sprintf("PTY failed: %v", err)})
					continue
				}

				stdout, _ := session.StdoutPipe()
				stderr, _ := session.StderrPipe()
				stdin, _ := session.StdinPipe()

				sshConn.Stdin = stdin
				sshConn.Stdout = stdout
				sshConn.Stderr = stderr
				sshConn.StopCh = make(chan struct{})

				if err := session.Shell(); err != nil {
					conn.WriteJSON(models.WSMessage{Type: "error", Data: fmt.Sprintf("Shell failed: %v", err)})
					continue
				}

				conn.WriteJSON(models.WSMessage{Type: "connected", Data: "Connected successfully"})
				if history := sshConn.GetHistory(); history != "" {
					conn.WriteJSON(models.WSMessage{Type: "history", Data: history})
				}

				// Start stdout reader
				go func() {
					buf := make([]byte, 1024)
					for {
						select {
						case <-sshConn.StopCh:
							return
						default:
							n, err := stdout.Read(buf)
							if err != nil {
								// Check if it's EOF (session ended) or other error
								if !errors.Is(err, io.EOF) && sshConn.Conn != nil {
									sshConn.Conn.WriteJSON(models.WSMessage{Type: "error", Data: fmt.Sprintf("Output read error: %v", err)})
								}
								// Mark stdin as closed if session ended
								if errors.Is(err, io.EOF) {
									shared.SSHConnMu.Lock()
									if sshConn.Stdin != nil {
										sshConn.Stdin = nil
									}
									shared.SSHConnMu.Unlock()
								}
								return
							}
							if n > 0 && sshConn.Conn != nil {
								chunk := string(buf[:n])
								sshConn.AppendHistory(chunk)
								sshConn.Conn.WriteJSON(models.WSMessage{Type: "output", Data: chunk})
							}
						}
					}
				}()

				// Start stderr reader
				go func() {
					buf := make([]byte, 1024)
					for {
						select {
						case <-sshConn.StopCh:
							return
						default:
							n, err := stderr.Read(buf)
							if err != nil {
								return
							}
							if n > 0 && sshConn.Conn != nil {
								chunk := string(buf[:n])
								sshConn.AppendHistory(fmt.Sprintf("Error: %s\n", strings.TrimRight(chunk, "\n")))
								sshConn.Conn.WriteJSON(models.WSMessage{Type: "error", Data: chunk})
							}
						}
					}
				}()

			} else {
				// Reconnecting to existing SSH session - just update WebSocket connection
				// The stdout/stderr readers are already running and will use the new connection
				sshConn.Conn = conn
				conn.WriteJSON(models.WSMessage{Type: "connected", Data: "Reconnected"})
				if history := sshConn.GetHistory(); history != "" {
					conn.WriteJSON(models.WSMessage{Type: "history", Data: history})
				}
			}

		case "command":
			if sshConn != nil && sshConn.Stdin != nil {
				// Check if session is still active
				shared.SSHConnMu.RLock()
				stdin := sshConn.Stdin
				shared.SSHConnMu.RUnlock()
				
				if stdin == nil {
					conn.WriteJSON(models.WSMessage{Type: "error", Data: "SSH session has ended"})
					continue
				}
				
				_, err := stdin.Write([]byte(msg.Data + "\n"))
				if err != nil {
					// If stdin is closed, mark it as nil
					if errors.Is(err, io.EOF) || strings.Contains(err.Error(), "use of closed network connection") {
						shared.SSHConnMu.Lock()
						sshConn.Stdin = nil
						shared.SSHConnMu.Unlock()
						conn.WriteJSON(models.WSMessage{Type: "error", Data: "SSH session has ended"})
					} else {
						conn.WriteJSON(models.WSMessage{Type: "error", Data: fmt.Sprintf("Command write error: %v", err)})
					}
				}
			} else {
				conn.WriteJSON(models.WSMessage{Type: "error", Data: "Not connected to SSH session"})
			}

		case "control":
			// Handle control characters (Ctrl+C, Ctrl+D, etc.)
			if sshConn != nil {
				// Check if session is still active
				shared.SSHConnMu.RLock()
				stdin := sshConn.Stdin
				shared.SSHConnMu.RUnlock()
				
				if stdin == nil {
					conn.WriteJSON(models.WSMessage{Type: "error", Data: "SSH session has ended"})
					continue
				}
				
				// Write control character directly without newline
				_, err := stdin.Write([]byte(msg.Data))
				if err != nil {
					// If stdin is closed, mark it as nil
					if errors.Is(err, io.EOF) || strings.Contains(err.Error(), "use of closed network connection") {
						shared.SSHConnMu.Lock()
						sshConn.Stdin = nil
						shared.SSHConnMu.Unlock()
						conn.WriteJSON(models.WSMessage{Type: "error", Data: "SSH session has ended"})
					} else {
						conn.WriteJSON(models.WSMessage{Type: "error", Data: fmt.Sprintf("Control character write error: %v", err)})
					}
				}
			} else {
				conn.WriteJSON(models.WSMessage{Type: "error", Data: "Not connected to SSH session"})
			}

		case "disconnect":
			if sshConn != nil {
				if sshConn.StopCh != nil {
					close(sshConn.StopCh)
					sshConn.StopCh = nil
				}
				sshConn.Session.Close()
				sshConn.Client.Close()
				if sshConn.Conn == conn {
					sshConn.Conn = nil
				}
				shared.SSHConnMu.Lock()
				delete(shared.SSHConnections, connID)
				shared.SSHConnMu.Unlock()
				conn.WriteJSON(models.WSMessage{Type: "disconnected", Data: "Disconnected successfully"})
			}
			return
		}
	}
}

// SSH Connection encryption/decryption helpers

// DeriveKeyFromPassword derives an encryption key from a password using PBKDF2
func DeriveKeyFromPassword(password string, salt []byte) []byte {
	return pbkdf2.Key([]byte(password), salt, 10000, 32, sha256.New)
}

// EncryptSSHData encrypts SSH connection data using AES
func EncryptSSHData(data []byte, password string) (string, string, error) {
	// Generate random salt
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", "", err
	}

	// Derive key from password
	key := DeriveKeyFromPassword(password, salt)

	// Create AES cipher
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", "", err
	}

	// Generate random IV
	iv := make([]byte, aes.BlockSize)
	if _, err := rand.Read(iv); err != nil {
		return "", "", err
	}

	// Encrypt data
	stream := cipher.NewCFBEncrypter(block, iv)
	ciphertext := make([]byte, len(data))
	stream.XORKeyStream(ciphertext, data)

	// Combine IV + ciphertext and encode
	encrypted := append(iv, ciphertext...)
	encryptedBase64 := base64.StdEncoding.EncodeToString(encrypted)
	saltBase64 := base64.StdEncoding.EncodeToString(salt)

	return encryptedBase64, saltBase64, nil
}

// DecryptSSHData decrypts SSH connection data using AES
func DecryptSSHData(encryptedBase64, saltBase64, password string) ([]byte, error) {
	// Decode salt and encrypted data
	salt, err := base64.StdEncoding.DecodeString(saltBase64)
	if err != nil {
		return nil, err
	}

	encrypted, err := base64.StdEncoding.DecodeString(encryptedBase64)
	if err != nil {
		return nil, err
	}

	// Derive key from password
	key := DeriveKeyFromPassword(password, salt)

	// Create AES cipher
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	// Extract IV and ciphertext
	if len(encrypted) < aes.BlockSize {
		return nil, fmt.Errorf("encrypted data too short")
	}
	iv := encrypted[:aes.BlockSize]
	ciphertext := encrypted[aes.BlockSize:]

	// Decrypt data
	stream := cipher.NewCFBDecrypter(block, iv)
	plaintext := make([]byte, len(ciphertext))
	stream.XORKeyStream(plaintext, ciphertext)

	return plaintext, nil
}

// SSH Connection management handlers

// HandleCheckSSHConnections checks if SSH connections exist in the database
func HandleCheckSSHConnections(w http.ResponseWriter, r *http.Request) {
	// Ensure table exists
	_, err := database.DB.Exec(`
		CREATE TABLE IF NOT EXISTS ssh_connections (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			encrypted_data TEXT NOT NULL,
			salt TEXT NOT NULL,
			name TEXT,
			host TEXT,
			port INTEGER,
			username TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		log.Printf("Error creating ssh_connections table: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if err := EnsureSSHConnectionColumns(); err != nil {
		log.Printf("Error ensuring ssh_connections columns: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var count int
	err = database.DB.QueryRow(`SELECT COUNT(*) FROM ssh_connections`).Scan(&count)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"hasData": count > 0})
}

// HandleUnlockSSHConnections unlocks and decrypts SSH connections
func HandleUnlockSSHConnections(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Password == "" {
		http.Error(w, "Password required", http.StatusBadRequest)
		return
	}

	// Get all encrypted connections
	rows, err := database.DB.Query(`SELECT id, encrypted_data, salt, name, host, port, username FROM ssh_connections`)
	if err != nil {
		// Return JSON error instead of plain text
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{"error": err.Error()})
		return
	}
	defer rows.Close()

	var connections []map[string]interface{}
	for rows.Next() {
		var id int
		var encryptedData, salt sql.NullString
		var name, host, username sql.NullString
		var port sql.NullInt64

		if err := rows.Scan(&id, &encryptedData, &salt, &name, &host, &port, &username); err != nil {
			continue
		}

		// Decrypt connection data
		if !encryptedData.Valid || !salt.Valid {
			continue
		}

		decrypted, err := DecryptSSHData(encryptedData.String, salt.String, req.Password)
		if err != nil {
			// Wrong password - return JSON error
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]interface{}{"error": "Invalid password"})
			return
		}

		var conn map[string]interface{}
		if err := json.Unmarshal(decrypted, &conn); err != nil {
			continue
		}

		conn["id"] = id
		if name.Valid {
			conn["name"] = name.String
		}
		if host.Valid {
			conn["host"] = host.String
		}
		if username.Valid {
			conn["username"] = username.String
		}
		if port.Valid {
			conn["port"] = port.Int64
		}
		connections = append(connections, conn)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"connections": connections})
}

// HandleSaveSSHConnection saves a new SSH connection to the database
func HandleSaveSSHConnection(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Password   string                 `json:"password"`
		Connection map[string]interface{} `json:"connection"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Password == "" {
		http.Error(w, "Password required", http.StatusBadRequest)
		return
	}

	// Encrypt connection data
	connectionJSON, err := json.Marshal(req.Connection)
	if err != nil {
		http.Error(w, "Error encoding connection data", http.StatusInternalServerError)
		return
	}

	encryptedData, salt, err := EncryptSSHData(connectionJSON, req.Password)
	if err != nil {
		http.Error(w, "Error encrypting data: "+err.Error(), http.StatusInternalServerError)
		return
	}

	name := GetStringFromMap(req.Connection, "name")
	host := GetStringFromMap(req.Connection, "host")
	username := GetStringFromMap(req.Connection, "username")
	port := GetIntFromMap(req.Connection, "port")

	// Save to database
	_, err = database.DB.Exec(`
		INSERT INTO ssh_connections (encrypted_data, salt, name, host, port, username)
		VALUES (?, ?, ?, ?, ?, ?)
	`, encryptedData, salt, name, host, port, username)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

// HandleDeleteSSHConnection deletes an SSH connection from the database
func HandleDeleteSSHConnection(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Password string `json:"password"`
		ID       int    `json:"id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Verify password by trying to decrypt (optional security check)
	// For simplicity, we'll just delete if ID exists
	_, err := database.DB.Exec(`DELETE FROM ssh_connections WHERE id = ?`, req.ID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

// HandleUpdateSSHConnection updates an existing SSH connection in the database
func HandleUpdateSSHConnection(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Password   string                 `json:"password"`
		ID         int                    `json:"id"`
		Connection map[string]interface{} `json:"connection"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Password == "" || req.ID == 0 {
		http.Error(w, "Password and ID required", http.StatusBadRequest)
		return
	}

	connectionJSON, err := json.Marshal(req.Connection)
	if err != nil {
		http.Error(w, "Error encoding connection data", http.StatusInternalServerError)
		return
	}

	encryptedData, salt, err := EncryptSSHData(connectionJSON, req.Password)
	if err != nil {
		http.Error(w, "Error encrypting data: "+err.Error(), http.StatusInternalServerError)
		return
	}

	name := GetStringFromMap(req.Connection, "name")
	host := GetStringFromMap(req.Connection, "host")
	username := GetStringFromMap(req.Connection, "username")
	port := GetIntFromMap(req.Connection, "port")

	_, err = database.DB.Exec(`
		UPDATE ssh_connections
		SET encrypted_data = ?, salt = ?, name = ?, host = ?, port = ?, username = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, encryptedData, salt, name, host, port, username, req.ID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

// EnsureSSHConnectionColumns ensures all required columns exist in ssh_connections table
func EnsureSSHConnectionColumns() error {
	rows, err := database.DB.Query(`PRAGMA table_info(ssh_connections)`)
	if err != nil {
		return err
	}
	defer rows.Close()

	existing := make(map[string]bool)
	for rows.Next() {
		var cid int
		var name, ctype string
		var notnull, pk int
		var dflt sql.NullString
		if err := rows.Scan(&cid, &name, &ctype, &notnull, &dflt, &pk); err == nil {
			existing[name] = true
		}
	}

	required := map[string]string{
		"name":     "TEXT",
		"host":     "TEXT",
		"port":     "INTEGER",
		"username": "TEXT",
	}

	for col, colType := range required {
		if !existing[col] {
			_, err := database.DB.Exec(fmt.Sprintf(`ALTER TABLE ssh_connections ADD COLUMN %s %s`, col, colType))
			if err != nil {
				return err
			}
		}
	}
	return nil
}

// Helper functions for extracting values from maps

// GetStringFromMap extracts a string value from a map
func GetStringFromMap(m map[string]interface{}, key string) string {
	if val, ok := m[key]; ok {
		switch v := val.(type) {
		case string:
			return v
		}
	}
	return ""
}

// GetIntFromMap extracts an integer value from a map
func GetIntFromMap(m map[string]interface{}, key string) int {
	if val, ok := m[key]; ok {
		switch v := val.(type) {
		case float64:
			return int(v)
		case int:
			return v
		}
	}
	return 0
}

