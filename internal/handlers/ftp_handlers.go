package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"path/filepath"
	"sync"
	"time"

	"github.com/jlaffaye/ftp"
)

// FTPConnection represents an FTP connection
type FTPConnection struct {
	Client   *ftp.ServerConn
	Host     string
	Port     int
	User     string
	Password string
	mu       sync.Mutex
	isClosed bool
}

// FTPConnectRequest represents an FTP connection request
type FTPConnectRequest struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	User     string `json:"user"`
	Password string `json:"password"`
	Passive  bool   `json:"passive"`
}

var (
	FTPConnections = make(map[string]*FTPConnection)
	FTPConnMu      sync.RWMutex
)

// HandleFTPConnect handles FTP connection requests
func HandleFTPConnect(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req FTPConnectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Port == 0 {
		req.Port = 21 // Default FTP port
	}

	connID := fmt.Sprintf("%s@%s:%d", req.User, req.Host, req.Port)

	// Check if connection already exists
	FTPConnMu.RLock()
	if _, exists := FTPConnections[connID]; exists {
		FTPConnMu.RUnlock()
		response := map[string]interface{}{
			"success": true,
			"connId":  connID,
			"message": "Connection already exists",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}
	FTPConnMu.RUnlock()

	// Connect to FTP server
	address := fmt.Sprintf("%s:%d", req.Host, req.Port)
	client, err := ftp.Dial(address, ftp.DialWithTimeout(10*time.Second))
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to connect: %v", err), http.StatusInternalServerError)
		return
	}

	// Login
	if err := client.Login(req.User, req.Password); err != nil {
		client.Quit()
		http.Error(w, fmt.Sprintf("Failed to login: %v", err), http.StatusUnauthorized)
		return
	}

	ftpConn := &FTPConnection{
		Client:   client,
		Host:     req.Host,
		Port:     req.Port,
		User:     req.User,
		Password: req.Password,
	}

	FTPConnMu.Lock()
	FTPConnections[connID] = ftpConn
	FTPConnMu.Unlock()

	response := map[string]interface{}{
		"success": true,
		"connId":  connID,
		"message": "Connected successfully",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleFTPList handles FTP directory listing
func HandleFTPList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ConnID string `json:"connId"`
		Path   string `json:"path"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	FTPConnMu.RLock()
	ftpConn, exists := FTPConnections[req.ConnID]
	FTPConnMu.RUnlock()

	if !exists {
		http.Error(w, "Connection not found", http.StatusNotFound)
		return
	}

	entries, err := ftpConn.Client.List(req.Path)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to list directory: %v", err), http.StatusInternalServerError)
		return
	}

	files := make([]map[string]interface{}, 0)
	for _, entry := range entries {
		files = append(files, map[string]interface{}{
			"name":    entry.Name,
			"size":    entry.Size,
			"type":    entry.Type.String(),
			"time":    entry.Time.Format(time.RFC3339),
			"isDir":   entry.Type == ftp.EntryTypeFolder,
		})
	}

	response := map[string]interface{}{
		"success": true,
		"files":   files,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleFTPDownload handles FTP file download
func HandleFTPDownload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ConnID string `json:"connId"`
		Path   string `json:"path"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	FTPConnMu.RLock()
	ftpConn, exists := FTPConnections[req.ConnID]
	FTPConnMu.RUnlock()

	if !exists {
		http.Error(w, "Connection not found", http.StatusNotFound)
		return
	}

	resp, err := ftpConn.Client.Retr(req.Path)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to download file: %v", err), http.StatusInternalServerError)
		return
	}
	defer resp.Close()

	// Set headers for file download
	filename := filepath.Base(req.Path)
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	w.Header().Set("Content-Type", "application/octet-stream")

	// Copy file content to response
	_, err = io.Copy(w, resp)
	if err != nil {
		log.Printf("Error copying file: %v", err)
	}
}

// HandleFTPUpload handles FTP file upload
func HandleFTPUpload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	connID := r.FormValue("connId")
	path := r.FormValue("path")

	FTPConnMu.RLock()
	ftpConn, exists := FTPConnections[connID]
	FTPConnMu.RUnlock()

	if !exists {
		http.Error(w, "Connection not found", http.StatusNotFound)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Failed to get file: "+err.Error(), http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Determine upload path
	uploadPath := path
	if uploadPath == "" {
		uploadPath = header.Filename
	}

	err = ftpConn.Client.Stor(uploadPath, file)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to upload file: %v", err), http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"success": true,
		"message": "File uploaded successfully",
		"path":    uploadPath,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleFTPDelete handles FTP file deletion
func HandleFTPDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ConnID string `json:"connId"`
		Path   string `json:"path"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	FTPConnMu.RLock()
	ftpConn, exists := FTPConnections[req.ConnID]
	FTPConnMu.RUnlock()

	if !exists {
		http.Error(w, "Connection not found", http.StatusNotFound)
		return
	}

	err := ftpConn.Client.Delete(req.Path)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to delete file: %v", err), http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"success": true,
		"message": "File deleted successfully",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleFTPMkdir handles FTP directory creation
func HandleFTPMkdir(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ConnID string `json:"connId"`
		Path   string `json:"path"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	FTPConnMu.RLock()
	ftpConn, exists := FTPConnections[req.ConnID]
	FTPConnMu.RUnlock()

	if !exists {
		http.Error(w, "Connection not found", http.StatusNotFound)
		return
	}

	err := ftpConn.Client.MakeDir(req.Path)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create directory: %v", err), http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"success": true,
		"message": "Directory created successfully",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleFTPRename handles FTP file/directory rename
func HandleFTPRename(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ConnID  string `json:"connId"`
		OldPath string `json:"oldPath"`
		NewPath string `json:"newPath"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	FTPConnMu.RLock()
	ftpConn, exists := FTPConnections[req.ConnID]
	FTPConnMu.RUnlock()

	if !exists {
		http.Error(w, "Connection not found", http.StatusNotFound)
		return
	}

	err := ftpConn.Client.Rename(req.OldPath, req.NewPath)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to rename: %v", err), http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"success": true,
		"message": "Renamed successfully",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleFTPDisconnect handles FTP disconnection
func HandleFTPDisconnect(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ConnID string `json:"connId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	FTPConnMu.Lock()
	if conn, exists := FTPConnections[req.ConnID]; exists {
		conn.Close()
		delete(FTPConnections, req.ConnID)
	}
	FTPConnMu.Unlock()

	response := map[string]interface{}{
		"success": true,
		"message": "Disconnected successfully",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Close closes the FTP connection
func (fc *FTPConnection) Close() {
	fc.mu.Lock()
	defer fc.mu.Unlock()

	if fc.isClosed {
		return
	}

	fc.isClosed = true

	if fc.Client != nil {
		fc.Client.Quit()
	}
}

