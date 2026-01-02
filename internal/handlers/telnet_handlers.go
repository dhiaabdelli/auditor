package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"network-script-generator/internal/shared"
)

// TelnetConnection represents a telnet connection
type TelnetConnection struct {
	Conn     net.Conn
	WSConn   *websocket.Conn
	Host     string
	Port     int
	Output   chan string
	Error    chan error
	StopCh   chan struct{}
	mu       sync.Mutex
	isClosed bool
}

var (
	TelnetConnections = make(map[string]*TelnetConnection)
	TelnetConnMu      sync.RWMutex
)

// TelnetConnectRequest represents a telnet connection request
type TelnetConnectRequest struct {
	Host string `json:"host"`
	Port int    `json:"port"`
}

// HandleTelnetConnect handles telnet connection requests
func HandleTelnetConnect(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req TelnetConnectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Port == 0 {
		req.Port = 23 // Default telnet port
	}

	connID := fmt.Sprintf("%s:%d", req.Host, req.Port)

	// Check if connection already exists
	TelnetConnMu.RLock()
	if _, exists := TelnetConnections[connID]; exists {
		TelnetConnMu.RUnlock()
		response := map[string]interface{}{
			"success": true,
			"connId":  connID,
			"message": "Connection already exists",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}
	TelnetConnMu.RUnlock()

	// Connect to telnet server
	address := fmt.Sprintf("%s:%d", req.Host, req.Port)
	conn, err := net.DialTimeout("tcp", address, 10*time.Second)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to connect: %v", err), http.StatusInternalServerError)
		return
	}

	telnetConn := &TelnetConnection{
		Conn:   conn,
		Host:   req.Host,
		Port:   req.Port,
		Output: make(chan string, 100),
		Error:  make(chan error, 10),
		StopCh: make(chan struct{}),
	}

	TelnetConnMu.Lock()
	TelnetConnections[connID] = telnetConn
	TelnetConnMu.Unlock()

	// Start reading from connection
	go telnetConn.readLoop()

	response := map[string]interface{}{
		"success": true,
		"connId":  connID,
		"message": "Connected successfully",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleTelnetWebSocket handles telnet WebSocket connections
func HandleTelnetWebSocket(w http.ResponseWriter, r *http.Request) {
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

	// Get telnet connection
	TelnetConnMu.RLock()
	telnetConn, exists := TelnetConnections[connID]
	TelnetConnMu.RUnlock()

	if !exists {
		conn.WriteJSON(map[string]interface{}{
			"type":    "error",
			"message": "Connection not found",
		})
		return
	}

	// Set WebSocket connection
	telnetConn.mu.Lock()
	telnetConn.WSConn = conn
	telnetConn.mu.Unlock()

	// Send initial connection message
	conn.WriteJSON(map[string]interface{}{
		"type":    "connected",
		"message": "Telnet connection established",
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
			case "input":
				data, _ := msg["data"].(string)
				if telnetConn.Conn != nil {
					telnetConn.mu.Lock()
					if !telnetConn.isClosed {
						_, err := telnetConn.Conn.Write([]byte(data))
						if err != nil {
							log.Printf("Error writing to telnet connection: %v", err)
						}
					}
					telnetConn.mu.Unlock()
				}
			case "close":
				telnetConn.Close()
				return
			}
		}
	}()

	// Forward output from telnet connection to WebSocket
	for {
		select {
		case output := <-telnetConn.Output:
			if err := conn.WriteJSON(map[string]interface{}{
				"type": "output",
				"data": output,
			}); err != nil {
				log.Printf("Error writing to WebSocket: %v", err)
				return
			}
		case err := <-telnetConn.Error:
			conn.WriteJSON(map[string]interface{}{
				"type":    "error",
				"message": err.Error(),
			})
			return
		case <-telnetConn.StopCh:
			return
		}
	}
}

// readLoop reads data from telnet connection
func (tc *TelnetConnection) readLoop() {
	buffer := make([]byte, 4096)
	for {
		select {
		case <-tc.StopCh:
			return
		default:
			tc.mu.Lock()
			if tc.isClosed {
				tc.mu.Unlock()
				return
			}
			tc.mu.Unlock()

			tc.Conn.SetReadDeadline(time.Now().Add(1 * time.Second))
			n, err := tc.Conn.Read(buffer)
			if err != nil {
				if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
					continue
				}
				tc.Error <- err
				return
			}

			if n > 0 {
				output := string(buffer[:n])
				select {
				case tc.Output <- output:
				default:
				}
			}
		}
	}
}

// Close closes the telnet connection
func (tc *TelnetConnection) Close() {
	tc.mu.Lock()
	defer tc.mu.Unlock()

	if tc.isClosed {
		return
	}

	tc.isClosed = true
	close(tc.StopCh)

	if tc.Conn != nil {
		tc.Conn.Close()
	}

	if tc.WSConn != nil {
		tc.WSConn.Close()
	}
}

// HandleTelnetDisconnect handles telnet disconnection
func HandleTelnetDisconnect(w http.ResponseWriter, r *http.Request) {
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

	TelnetConnMu.Lock()
	if conn, exists := TelnetConnections[req.ConnID]; exists {
		conn.Close()
		delete(TelnetConnections, req.ConnID)
	}
	TelnetConnMu.Unlock()

	response := map[string]interface{}{
		"success": true,
		"message": "Disconnected successfully",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

