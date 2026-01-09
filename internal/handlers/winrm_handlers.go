package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os/exec"
	"runtime"
	"strings"
	"sync"

	"github.com/gorilla/websocket"
	"network-script-generator/internal/shared"
)

// WinRMConnection represents a WinRM connection
type WinRMConnection struct {
	Host     string
	Port     int
	User     string
	Password string
	WSConn   *websocket.Conn
	mu       sync.Mutex
	isClosed bool
}

// WinRMConnectRequest represents a WinRM connection request
type WinRMConnectRequest struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	User     string `json:"user"`
	Password string `json:"password"`
	UseHTTPS bool   `json:"useHttps"`
}

var (
	WinRMConnections = make(map[string]*WinRMConnection)
	WinRMConnMu      sync.RWMutex
)

// HandleWinRMConnect handles WinRM connection requests
func HandleWinRMConnect(w http.ResponseWriter, r *http.Request) {
	if runtime.GOOS != "windows" {
		http.Error(w, "WinRM is only available on Windows", http.StatusNotImplemented)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req WinRMConnectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Port == 0 {
		if req.UseHTTPS {
			req.Port = 5986
		} else {
			req.Port = 5985
		}
	}

	connID := fmt.Sprintf("%s@%s:%d", req.User, req.Host, req.Port)

	// Test WinRM connection using PowerShell
	testCmd := fmt.Sprintf(`$cred = New-Object System.Management.Automation.PSCredential("%s", (ConvertTo-SecureString -String "%s" -AsPlainText -Force)); Invoke-Command -ComputerName %s -Port %d -Credential $cred -ScriptBlock { "WinRM Test" } -ErrorAction Stop`, req.User, req.Password, req.Host, req.Port)
	
	cmd := exec.Command("powershell", "-Command", testCmd)
	if err := cmd.Run(); err != nil {
		http.Error(w, fmt.Sprintf("Failed to connect to WinRM: %v", err), http.StatusInternalServerError)
		return
	}

	winrmConn := &WinRMConnection{
		Host:     req.Host,
		Port:     req.Port,
		User:     req.User,
		Password: req.Password,
	}

	WinRMConnMu.Lock()
	WinRMConnections[connID] = winrmConn
	WinRMConnMu.Unlock()

	response := map[string]interface{}{
		"success": true,
		"connId":  connID,
		"message": "Connected successfully",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleWinRMWebSocket handles WinRM WebSocket connections
func HandleWinRMWebSocket(w http.ResponseWriter, r *http.Request) {
	if runtime.GOOS != "windows" {
		http.Error(w, "WinRM is only available on Windows", http.StatusNotImplemented)
		return
	}

	conn, err := shared.Upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}
	defer conn.Close()

	// Get connection ID from query parameter
	connID := r.URL.Query().Get("connId")
	if connID == "" {
		conn.WriteJSON(map[string]interface{}{
			"type":    "error",
			"message": "Connection ID required",
		})
		return
	}

	// Get WinRM connection
	WinRMConnMu.RLock()
	winrmConn, exists := WinRMConnections[connID]
	WinRMConnMu.RUnlock()

	if !exists {
		conn.WriteJSON(map[string]interface{}{
			"type":    "error",
			"message": "Connection not found",
		})
		return
	}

	// Set WebSocket connection
	winrmConn.mu.Lock()
	winrmConn.WSConn = conn
	winrmConn.mu.Unlock()

	// Send initial connection message
	conn.WriteJSON(map[string]interface{}{
		"type":    "connected",
		"message": "WinRM connection established",
	})

	// Handle incoming messages from WebSocket
	go func() {
		for {
			var msg map[string]interface{}
			if err := conn.ReadJSON(&msg); err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					log.Printf("WebSocket error: %v", err)
				}
				break
			}

			msgType, _ := msg["type"].(string)
			switch msgType {
			case "command":
				command, _ := msg["command"].(string)
				go winrmConn.executeCommand(conn, command)
			case "close":
				winrmConn.Close()
				return
			}
		}
	}()
}

// executeCommand executes a PowerShell command via WinRM
func (wc *WinRMConnection) executeCommand(wsConn *websocket.Conn, command string) {
	if runtime.GOOS != "windows" {
		wsConn.WriteJSON(map[string]interface{}{
			"type":    "error",
			"message": "WinRM commands are only available on Windows",
		})
		return
	}

	// Escape command for PowerShell
	escapedCmd := strings.ReplaceAll(command, `"`, `\"`)
	psCommand := fmt.Sprintf(`$cred = New-Object System.Management.Automation.PSCredential("%s", (ConvertTo-SecureString -String "%s" -AsPlainText -Force)); Invoke-Command -ComputerName %s -Port %d -Credential $cred -ScriptBlock { %s }`, wc.User, wc.Password, wc.Host, wc.Port, escapedCmd)

	cmd := exec.Command("powershell", "-Command", psCommand)
	output, err := cmd.CombinedOutput()

	if err != nil {
		wsConn.WriteJSON(map[string]interface{}{
			"type":    "error",
			"message": fmt.Sprintf("Command execution error: %v", err),
			"output":  string(output),
		})
		return
	}

	wsConn.WriteJSON(map[string]interface{}{
		"type":   "output",
		"output": string(output),
	})
}

// Close closes the WinRM connection
func (wc *WinRMConnection) Close() {
	wc.mu.Lock()
	defer wc.mu.Unlock()

	if wc.isClosed {
		return
	}

	wc.isClosed = true

	if wc.WSConn != nil {
		wc.WSConn.Close()
	}
}

// HandleWinRMDisconnect handles WinRM disconnection
func HandleWinRMDisconnect(w http.ResponseWriter, r *http.Request) {
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

	WinRMConnMu.Lock()
	if conn, exists := WinRMConnections[req.ConnID]; exists {
		conn.Close()
		delete(WinRMConnections, req.ConnID)
	}
	WinRMConnMu.Unlock()

	response := map[string]interface{}{
		"success": true,
		"message": "Disconnected successfully",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

