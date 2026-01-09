package handlers

import (
	"bufio"
	"context"
	"fmt"
	"log"
	"net/http"
	"os/exec"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"network-script-generator/internal/security"
	"network-script-generator/internal/shared"
)

var (
	powershellClients = make(map[*websocket.Conn]bool)
	powershellMu      sync.RWMutex
	// Per-connection write mutexes to prevent concurrent writes
	powershellWriteMu = make(map[*websocket.Conn]*sync.Mutex)
	powershellWriteMuLock sync.Mutex
)

// HandlePowerShellWebSocket handles WebSocket connections for PowerShell console
func HandlePowerShellWebSocket(w http.ResponseWriter, r *http.Request) {
	if runtime.GOOS != "windows" {
		http.Error(w, "PowerShell console is only available on Windows", http.StatusNotImplemented)
		return
	}

	conn, err := shared.Upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("PowerShell WebSocket upgrade error: %v", err)
		return
	}
	defer conn.Close()

	// Wait for authentication message first
	authenticated := false
	authTimeout := time.NewTimer(5 * time.Second)
	defer authTimeout.Stop()

	// Check if already authenticated via query param or header
	token := r.URL.Query().Get("token")
	if token == "" {
		authHeader := r.Header.Get("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			token = strings.TrimPrefix(authHeader, "Bearer ")
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
		// Set read deadline for auth
		conn.SetReadDeadline(time.Now().Add(5 * time.Second))
		
		var msg map[string]interface{}
		if err := conn.ReadJSON(&msg); err != nil {
			log.Printf("PowerShell WebSocket auth read error: %v", err)
			// Create temporary write mutex for auth phase
			tempMu := &sync.Mutex{}
			tempMu.Lock()
			conn.WriteJSON(map[string]interface{}{
				"type":    "auth",
				"status":  "error",
				"message": "Failed to read authentication message",
			})
			tempMu.Unlock()
			return
		}

		// Clear read deadline
		conn.SetReadDeadline(time.Time{})

		if msgType, ok := msg["type"].(string); ok && msgType == "auth" {
			token, _ := msg["token"].(string)
			// Create temporary write mutex for auth phase
			tempMu := &sync.Mutex{}
			if token != "" {
				if _, _, err := security.ValidateJWT(token); err == nil {
					authenticated = true
					tempMu.Lock()
					conn.WriteJSON(map[string]interface{}{
						"type":    "auth",
						"status":  "success",
						"message": "Authenticated",
					})
					tempMu.Unlock()
				} else {
					tempMu.Lock()
					conn.WriteJSON(map[string]interface{}{
						"type":    "auth",
						"status":  "error",
						"message": "Invalid token",
					})
					tempMu.Unlock()
					return
				}
			} else {
				tempMu.Lock()
				conn.WriteJSON(map[string]interface{}{
					"type":    "auth",
					"status":  "error",
					"message": "Missing token",
				})
				tempMu.Unlock()
				return
			}
		} else {
			tempMu := &sync.Mutex{}
			tempMu.Lock()
			conn.WriteJSON(map[string]interface{}{
				"type":    "auth",
				"status":  "error",
				"message": "Expected auth message",
			})
			tempMu.Unlock()
			return
		}
	}

	// Register client and create write mutex
	powershellMu.Lock()
	powershellClients[conn] = true
	powershellMu.Unlock()
	
	powershellWriteMuLock.Lock()
	powershellWriteMu[conn] = &sync.Mutex{}
	powershellWriteMuLock.Unlock()
	
	log.Printf("PowerShell client connected. Total clients: %d", len(powershellClients))

	// Unregister client on exit
	defer func() {
		powershellMu.Lock()
		delete(powershellClients, conn)
		powershellMu.Unlock()
		
		powershellWriteMuLock.Lock()
		delete(powershellWriteMu, conn)
		powershellWriteMuLock.Unlock()
		
		log.Printf("PowerShell client disconnected. Total clients: %d", len(powershellClients))
	}()

	// Send welcome message
	welcomeMsg := map[string]interface{}{
		"type":    "output",
		"content": "PowerShell Console Ready",
		"time":    time.Now().Format("15:04:05"),
	}
	safeWriteJSON(conn, welcomeMsg)

	// Send initial prompt
	promptMsg := map[string]interface{}{
		"type":    "prompt",
		"content": getPowerShellPrompt(),
	}
	safeWriteJSON(conn, promptMsg)

	// Set up ping/pong to keep connection alive
	conn.SetReadDeadline(time.Time{}) // Clear any deadlines
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	// Start ping ticker
	pingTicker := time.NewTicker(30 * time.Second)
	defer pingTicker.Stop()

	// Handle incoming messages
	messageChan := make(chan map[string]interface{}, 10)
	errorChan := make(chan error, 1)

	// Read messages in a goroutine
	go func() {
		for {
			var msg map[string]interface{}
			err := conn.ReadJSON(&msg)
			if err != nil {
				errorChan <- err
				return
			}
			messageChan <- msg
		}
	}()

	// Main message loop
	for {
		select {
		case msg := <-messageChan:
			msgType, _ := msg["type"].(string)
			switch msgType {
			case "command":
				command, _ := msg["command"].(string)
				if command != "" {
					go executePowerShellCommand(conn, command)
				}
			case "ping":
				// Respond to ping
				safeWriteJSON(conn, map[string]interface{}{
					"type": "pong",
				})
			}
		case err := <-errorChan:
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("PowerShell WebSocket read error: %v", err)
			}
			return
		case <-pingTicker.C:
			// Send ping (WriteMessage is thread-safe for ping/pong)
			powershellWriteMuLock.Lock()
			writeMu, exists := powershellWriteMu[conn]
			powershellWriteMuLock.Unlock()
			if exists {
				writeMu.Lock()
				err := conn.WriteMessage(websocket.PingMessage, nil)
				writeMu.Unlock()
				if err != nil {
					log.Printf("PowerShell WebSocket ping error: %v", err)
					return
				}
			}
		}
	}
}

// safeWriteJSON safely writes JSON to a WebSocket connection using a mutex
func safeWriteJSON(conn *websocket.Conn, v interface{}) error {
	powershellWriteMuLock.Lock()
	writeMu, exists := powershellWriteMu[conn]
	powershellWriteMuLock.Unlock()
	
	if !exists {
		// Connection not registered, try direct write
		return conn.WriteJSON(v)
	}
	
	writeMu.Lock()
	defer writeMu.Unlock()
	return conn.WriteJSON(v)
}

// executePowerShellCommand executes a PowerShell command and streams output
func executePowerShellCommand(conn *websocket.Conn, command string) {
	if runtime.GOOS != "windows" {
		errorMsg := map[string]interface{}{
			"type":    "error",
			"content": "PowerShell commands are only available on Windows",
			"time":    time.Now().Format("15:04:05"),
		}
		safeWriteJSON(conn, errorMsg)
		return
	}

	// Send command echo with command type for colorization
	echoMsg := map[string]interface{}{
		"type":    "command",
		"content": fmt.Sprintf("PS> %s", command),
		"time":    time.Now().Format("15:04:05"),
	}
	safeWriteJSON(conn, echoMsg)

	// Create context with timeout (30 seconds max)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Execute PowerShell command
	cmd := exec.CommandContext(ctx, "powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command)

	// Get stdout and stderr pipes
	stdout, err := cmd.StdoutPipe()
		if err != nil {
			errorMsg := map[string]interface{}{
				"type":    "error",
				"content": fmt.Sprintf("Error creating stdout pipe: %v", err),
				"time":    time.Now().Format("15:04:05"),
			}
			safeWriteJSON(conn, errorMsg)
			return
		}

		stderr, err := cmd.StderrPipe()
		if err != nil {
			errorMsg := map[string]interface{}{
				"type":    "error",
				"content": fmt.Sprintf("Error creating stderr pipe: %v", err),
				"time":    time.Now().Format("15:04:05"),
			}
			safeWriteJSON(conn, errorMsg)
			return
		}

	// Start the command
	if err := cmd.Start(); err != nil {
		errorMsg := map[string]interface{}{
			"type":    "error",
			"content": fmt.Sprintf("Error starting command: %v", err),
			"time":    time.Now().Format("15:04:05"),
		}
		safeWriteJSON(conn, errorMsg)
		return
	}

	// Read stdout line by line
	go func() {
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			line := scanner.Text()
			outputMsg := map[string]interface{}{
				"type":    "output",
				"content": line,
				"time":    time.Now().Format("15:04:05"),
			}
			safeWriteJSON(conn, outputMsg)
		}
		if err := scanner.Err(); err != nil {
			errorMsg := map[string]interface{}{
				"type":    "error",
				"content": fmt.Sprintf("Error reading stdout: %v", err),
				"time":    time.Now().Format("15:04:05"),
			}
			safeWriteJSON(conn, errorMsg)
		}
	}()

	// Read stderr line by line
	go func() {
		scanner := bufio.NewScanner(stderr)
		for scanner.Scan() {
			line := scanner.Text()
			errorMsg := map[string]interface{}{
				"type":    "error",
				"content": line,
				"time":    time.Now().Format("15:04:05"),
			}
			safeWriteJSON(conn, errorMsg)
		}
		if err := scanner.Err(); err != nil {
			errorMsg := map[string]interface{}{
				"type":    "error",
				"content": fmt.Sprintf("Error reading stderr: %v", err),
				"time":    time.Now().Format("15:04:05"),
			}
			safeWriteJSON(conn, errorMsg)
		}
	}()

	// Wait for command to complete
	err = cmd.Wait()
	if err != nil {
		// Command failed, but stderr should have been sent already
		exitMsg := map[string]interface{}{
			"type":    "output",
			"content": fmt.Sprintf("\nCommand exited with code: %v", err),
			"time":    time.Now().Format("15:04:05"),
		}
		safeWriteJSON(conn, exitMsg)
	}

	// Send new prompt
	promptMsg := map[string]interface{}{
		"type":    "prompt",
		"content": getPowerShellPrompt(),
	}
	safeWriteJSON(conn, promptMsg)
}

// getPowerShellPrompt returns the current PowerShell prompt
func getPowerShellPrompt() string {
	if runtime.GOOS != "windows" {
		return "PS> "
	}
	// Get current directory
	cmd := exec.Command("powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "Get-Location | Select-Object -ExpandProperty Path")
	output, err := cmd.Output()
	if err != nil {
		return "PS> "
	}
	path := strings.TrimSpace(string(output))
	// Extract just the directory name
	parts := strings.Split(path, "\\")
	dirName := parts[len(parts)-1]
	return fmt.Sprintf("PS %s> ", dirName)
}

