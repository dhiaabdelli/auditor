package handlers

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net"
	"net/http"
	neturl "net/url"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"network-script-generator/internal/database"

	"github.com/gorilla/websocket"
)

// SpeedtestResult represents a speedtest result
type SpeedtestResult struct {
	ID             int64     `json:"id"`
	DownloadSpeed  float64   `json:"downloadSpeed"` // Mbps
	UploadSpeed    float64   `json:"uploadSpeed"`   // Mbps
	Ping           float64   `json:"ping"`          // ms
	Jitter         float64   `json:"jitter"`        // ms
	ServerName     string    `json:"serverName"`
	ServerLocation string    `json:"serverLocation"`
	ServerID       int       `json:"serverId"`
	ISP            string    `json:"isp"`
	IP             string    `json:"ip"`
	PacketLoss     float64   `json:"packetLoss,omitempty"`    // %
	DownloadBytes  int64     `json:"downloadBytes,omitempty"` // bytes
	UploadBytes    int64     `json:"uploadBytes,omitempty"`   // bytes
	Status         string    `json:"status,omitempty"`        // completed, failed, running
	Scheduled      bool      `json:"scheduled,omitempty"`
	Timestamp      time.Time `json:"timestamp"`
}

// SpeedtestStats represents aggregated statistics
type SpeedtestStats struct {
	Ping struct {
		Avg float64 `json:"avg"`
		Min float64 `json:"min"`
		Max float64 `json:"max"`
	} `json:"ping"`
	Download struct {
		Avg float64 `json:"avg"`
		Min float64 `json:"min"`
		Max float64 `json:"max"`
	} `json:"download"`
	Upload struct {
		Avg float64 `json:"avg"`
		Min float64 `json:"min"`
		Max float64 `json:"max"`
	} `json:"upload"`
	Jitter struct {
		Avg float64 `json:"avg"`
		Min float64 `json:"min"`
		Max float64 `json:"max"`
	} `json:"jitter"`
	TotalResults int `json:"totalResults"`
}

// SpeedtestChartData represents data for chart rendering
type SpeedtestChartData struct {
	Labels   []string       `json:"labels"`
	Datasets []ChartDataset `json:"datasets"`
}

// ChartDataset represents a dataset for Chart.js
type ChartDataset struct {
	Label           string    `json:"label"`
	Data            []float64 `json:"data"`
	BorderColor     string    `json:"borderColor,omitempty"`
	BackgroundColor string    `json:"backgroundColor,omitempty"`
	PointRadius     int       `json:"pointRadius,omitempty"`
	Fill            bool      `json:"fill,omitempty"`
	Tension         float64   `json:"tension,omitempty"`
}

// SpeedtestRequest represents a speedtest request
type SpeedtestRequest struct {
	ServerID int `json:"serverId,omitempty"` // Optional: specific server ID
}

// SpeedtestServer represents a Speedtest.net server
type SpeedtestServer struct {
	ID       int     `json:"id"`
	Name     string  `json:"name"`
	Location string  `json:"location"`
	Country  string  `json:"country"`
	Host     string  `json:"host"`
	URL      string  `json:"url"`
	Lat      float64 `json:"lat"`
	Lon      float64 `json:"lon"`
	Distance float64 `json:"distance,omitempty"`
	// Additional fields that might be in the API response
	Sponsor string `json:"sponsor,omitempty"`
	City    string `json:"city,omitempty"`
	CC      string `json:"cc,omitempty"` // Country code
}

// SpeedtestServerRaw represents a server with flexible field types for parsing
type SpeedtestServerRaw struct {
	ID       interface{} `json:"id"`
	Name     interface{} `json:"name"`
	Location interface{} `json:"location"`
	Country  interface{} `json:"country"`
	Host     interface{} `json:"host"`
	URL      interface{} `json:"url"`
	Lat      interface{} `json:"lat"`
	Lon      interface{} `json:"lon"`
	Distance interface{} `json:"distance"`
	Sponsor  interface{} `json:"sponsor"`
	City     interface{} `json:"city"`
	CC       interface{} `json:"cc"`
}

// SpeedtestUpdate represents a real-time update during speedtest
type SpeedtestUpdate struct {
	Type           string  `json:"type"` // "ping", "download", "upload", "complete", "error"
	Ping           float64 `json:"ping,omitempty"`
	Jitter         float64 `json:"jitter,omitempty"`
	DownloadSpeed  float64 `json:"downloadSpeed,omitempty"`
	UploadSpeed    float64 `json:"uploadSpeed,omitempty"`
	Progress       float64 `json:"progress,omitempty"` // 0-100
	Message        string  `json:"message,omitempty"`
	ServerName     string  `json:"serverName,omitempty"`
	ServerLocation string  `json:"serverLocation,omitempty"`
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins
	},
}

// HandleSpeedtestServers returns available speedtest servers from Speedtest.net
func HandleSpeedtestServers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	servers, err := getSpeedtestServers(ctx)
	if err != nil {
		// Return empty list on error
		servers = []SpeedtestServer{}
	}

	// Convert to response format
	serverList := []map[string]interface{}{
		{
			"id":       0,
			"name":     "Auto (Best Server)",
			"location": "Auto-select best server",
			"country":  "",
			"host":     "",
		},
	}

	for _, server := range servers {
		serverList = append(serverList, map[string]interface{}{
			"id":       server.ID,
			"name":     server.Name,
			"sponsor":  server.Sponsor,
			"location": server.Location,
			"city":     server.City,
			"country":  server.Country,
			"host":     server.Host,
			"url":      server.URL,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"servers": serverList,
	})
}

// HandleStartSpeedtest starts a new speedtest
func HandleStartSpeedtest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req SpeedtestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Create background task
	taskManager := GetTaskManager()
	serverName := "Auto (Best Server)"
	if req.ServerID != 0 {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		servers, err := getSpeedtestServers(ctx)
		if err == nil {
			for _, s := range servers {
				if s.ID == req.ServerID {
					if s.Sponsor != "" {
						serverName = s.Sponsor
					} else if s.Name != "" {
						serverName = s.Name
					}
					break
				}
			}
		}
	}

	task := taskManager.CreateTask(
		"Speedtest",
		fmt.Sprintf("Running speedtest on %s", serverName),
		map[string]interface{}{
			"type":     "speedtest",
			"serverId": req.ServerID,
		},
	)

	// Start speedtest in background as a task
	taskManager.RunTask(task, func(t *Task) error {
		// Wait a moment for task to be started
		time.Sleep(100 * time.Millisecond)

		// Update progress
		if err := taskManager.UpdateProgress(t.ID, 5, "Initializing speedtest..."); err != nil {
			// Silent error handling
		}

		// Create update channel for task progress
		updateChan := make(chan SpeedtestUpdate, 10)
		var finalResult *SpeedtestResult
		go func() {
			defer close(updateChan)
			result := runSpeedtestWithUpdates(req.ServerID, updateChan)
			if result != nil {
				// Save result
				saveSpeedtestResult(result)
				finalResult = result
			}
		}()

		// Monitor updates and update task progress
		lastProgress := 5
		for update := range updateChan {
			if t.IsCancelled() {
				return fmt.Errorf("speedtest cancelled")
			}

			progress := lastProgress
			message := update.Message

			switch update.Type {
			case "ping":
				progress = 20
				if update.Ping > 0 {
					message = fmt.Sprintf("Ping: %.2f ms", update.Ping)
				}
			case "download":
				progress = 50
				if update.DownloadSpeed > 0 {
					message = fmt.Sprintf("Download: %.2f Mbps", update.DownloadSpeed)
				}
			case "upload":
				progress = 80
				if update.UploadSpeed > 0 {
					message = fmt.Sprintf("Upload: %.2f Mbps", update.UploadSpeed)
				}
			case "complete":
				progress = 100
				message = "Speedtest completed"
			case "error":
				return fmt.Errorf("%s", update.Message)
			}

			if progress > lastProgress {
				lastProgress = progress
				if err := taskManager.UpdateProgress(t.ID, progress, message); err != nil {
					// Silent error handling
				}
			}
		}

		// Complete the task after all updates are processed
		// Note: RunTask will automatically call CompleteTask if we return nil
		// So we just update the progress to 100% with final message
		// RunTask will then call CompleteTask with a default message, but we've already set the message
		if finalResult != nil {
			completeMessage := fmt.Sprintf("Completed: %.2f Mbps down, %.2f Mbps up, %.2f ms ping",
				finalResult.DownloadSpeed, finalResult.UploadSpeed, finalResult.Ping)
			// Update progress to 100% with final message
			if err := taskManager.UpdateProgress(t.ID, 100, completeMessage); err != nil {
				// Silent error handling
			}
			// Wait a moment to ensure the task is in "running" state before RunTask completes it
			time.Sleep(50 * time.Millisecond)
		}

		return nil
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Speedtest started",
		"taskId":  task.ID,
	})
}

// HandleSpeedtestResults returns speedtest results history
func HandleSpeedtestResults(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	limit := 100 // Default limit
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		fmt.Sscanf(limitStr, "%d", &limit)
	}

	offset := 0
	if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
		fmt.Sscanf(offsetStr, "%d", &offset)
	}

	// Get total count
	total, err := getSpeedtestResultsCount(nil, nil)
	if err != nil {
		total = 0
	}

	results, err := getSpeedtestResults(limit, offset, nil, nil)
	if err != nil {
		http.Error(w, "Failed to fetch results", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"results": results,
		"total":   total,
	})
}

// HandleDeleteSpeedtestResult deletes a speedtest result
func HandleDeleteSpeedtestResult(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ID int64 `json:"id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := deleteSpeedtestResult(req.ID); err != nil {
		http.Error(w, "Failed to delete result", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Result deleted",
	})
}

// HandleSpeedtestStats returns aggregated statistics
func HandleSpeedtestStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var startTime, endTime *time.Time
	if startStr := r.URL.Query().Get("start_at"); startStr != "" {
		if t, err := time.Parse(time.RFC3339, startStr); err == nil {
			startTime = &t
		}
	}
	if endStr := r.URL.Query().Get("end_at"); endStr != "" {
		if t, err := time.Parse(time.RFC3339, endStr); err == nil {
			endTime = &t
		}
	}

	stats, err := getSpeedtestStats(startTime, endTime)
	if err != nil {
		http.Error(w, "Failed to fetch stats", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"stats":   stats,
	})
}

// HandleSpeedtestChartData returns chart data for a specific metric
func HandleSpeedtestChartData(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	metric := r.URL.Query().Get("metric") // ping, download, upload, jitter
	if metric == "" {
		metric = "ping"
	}

	period := r.URL.Query().Get("period") // 24h, week, month
	if period == "" {
		period = "24h"
	}

	chartData, err := getSpeedtestChartData(metric, period)
	if err != nil {
		http.Error(w, "Failed to fetch chart data", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    chartData,
	})
}

// HandleSpeedtestLatest returns the latest speedtest result
func HandleSpeedtestLatest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	results, err := getSpeedtestResults(1, 0, nil, nil)
	if err != nil {
		http.Error(w, "Failed to fetch latest result", http.StatusInternalServerError)
		return
	}

	if len(results) == 0 {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"result":  nil,
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"result":  results[0],
	})
}

// HandleSpeedtestWebSocket handles WebSocket connections for real-time speedtest updates
func HandleSpeedtestWebSocket(w http.ResponseWriter, r *http.Request) {
	// Check authentication (token in query or header)
	token := r.URL.Query().Get("token")
	if token == "" {
		// Try Authorization header
		authHeader := r.Header.Get("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			token = strings.TrimPrefix(authHeader, "Bearer ")
		}
	}

	// Validate token (basic check - you may want to use your auth middleware)
	if token == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	// Read server ID from query parameter
	serverIDStr := r.URL.Query().Get("serverId")
	serverID := 0
	if serverIDStr != "" {
		if id, err := strconv.Atoi(serverIDStr); err == nil {
			serverID = id
		}
	}

	// Create background task for WebSocket connection
	taskManager := GetTaskManager()
	serverName := "Auto (Best Server)"
	if serverID != 0 {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		servers, err := getSpeedtestServers(ctx)
		if err == nil {
			for _, s := range servers {
				if s.ID == serverID {
					if s.Sponsor != "" {
						serverName = s.Sponsor
					} else if s.Name != "" {
						serverName = s.Name
					}
					break
				}
			}
		}
	}

	task := taskManager.CreateTask(
		"Speedtest",
		fmt.Sprintf("Running speedtest on %s", serverName),
		map[string]interface{}{
			"type":     "speedtest",
			"serverId": serverID,
		},
	)

	// Start the task
	if err := taskManager.StartTask(task.ID); err != nil {
		// Silent error handling
	}

	// Channel to send updates
	updateChan := make(chan SpeedtestUpdate, 10)

	// Start speedtest in background
	var finalResult *SpeedtestResult
	go func() {
		defer close(updateChan)
		result := runSpeedtestWithUpdates(serverID, updateChan)
		if result != nil {
			saveSpeedtestResult(result)
			finalResult = result
		}
	}()

	// Monitor updates and send to both WebSocket and task progress
	lastProgress := 5
	for update := range updateChan {
		// Send to WebSocket
		if err := conn.WriteJSON(update); err != nil {
			return
		}

		// Update task progress
		if task.IsCancelled() {
			return
		}

		progress := lastProgress
		message := update.Message

		switch update.Type {
		case "ping":
			progress = 20
			if update.Ping > 0 {
				message = fmt.Sprintf("Ping: %.2f ms", update.Ping)
			}
		case "download":
			progress = 50
			if update.DownloadSpeed > 0 {
				message = fmt.Sprintf("Download: %.2f Mbps", update.DownloadSpeed)
			}
		case "upload":
			progress = 80
			if update.UploadSpeed > 0 {
				message = fmt.Sprintf("Upload: %.2f Mbps", update.UploadSpeed)
			}
		case "complete":
			progress = 100
			message = "Speedtest completed"
		case "error":
			taskManager.FailTask(task.ID, update.Message)
			return
		}

		if progress > lastProgress {
			lastProgress = progress
			taskManager.UpdateProgress(task.ID, progress, message)
		}
	}

	// Complete the task after all updates are processed
	if finalResult != nil {
		completeMessage := fmt.Sprintf("Completed: %.2f Mbps down, %.2f Mbps up, %.2f ms ping",
			finalResult.DownloadSpeed, finalResult.UploadSpeed, finalResult.Ping)
		// Update progress to 100% with final message first
		if err := taskManager.UpdateProgress(task.ID, 100, completeMessage); err != nil {
			// Silent error handling
		}
		// Wait a moment to ensure the task is in "running" state
		time.Sleep(50 * time.Millisecond)
		// Now complete the task
		if err := taskManager.CompleteTask(task.ID, completeMessage); err != nil {
			// Silent error handling
		}
	}
}

// runSpeedtestWithUpdates performs speedtest with real-time updates
func runSpeedtestWithUpdates(serverID int, updateChan chan<- SpeedtestUpdate) *SpeedtestResult {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	// Get public IP first
	publicIP := getPublicIP(ctx)

	// Get or select server
	var server *SpeedtestServer
	if serverID == 0 {
		// Auto-select best server
		if updateChan != nil {
			updateChan <- SpeedtestUpdate{
				Type:     "ping",
				Message:  "Selecting best server...",
				Progress: 0,
			}
		}
		server = selectBestServer(ctx)
	} else {
		// Get specific server
		servers, err := getSpeedtestServers(ctx)
		if err == nil {
			for i := range servers {
				if servers[i].ID == serverID {
					server = &servers[i]
					break
				}
			}
		}
	}

	// Fallback to default if no server found
	var ping, jitter float64
	var serverName, serverLocation string

	if server == nil || server.Host == "" {
		if updateChan != nil {
			updateChan <- SpeedtestUpdate{
				Type:    "error",
				Message: "No server available",
			}
		}
		return &SpeedtestResult{
			DownloadSpeed:  0,
			UploadSpeed:    0,
			Ping:           0,
			Jitter:         0,
			ServerName:     "Speedtest.net",
			ServerLocation: "Server not available",
			ServerID:       0,
			ISP:            getISPInfo(ctx, publicIP),
			IP:             publicIP,
			Timestamp:      time.Now(),
		}
	}

	// Build server info
	if server.Sponsor != "" {
		serverName = server.Sponsor
	} else if server.Name != "" {
		serverName = server.Name
	} else {
		serverName = "Speedtest.net Server"
	}

	locationParts := []string{}
	if server.Name != "" {
		locationParts = append(locationParts, server.Name)
	}
	if server.City != "" && server.City != server.Name {
		locationParts = append(locationParts, server.City)
	}
	if server.Location != "" && server.Location != server.Name && server.Location != server.City {
		locationParts = append(locationParts, server.Location)
	}
	if server.Country != "" {
		locationParts = append(locationParts, server.Country)
	} else if server.CC != "" {
		locationParts = append(locationParts, server.CC)
	}

	if len(locationParts) > 0 {
		serverLocation = strings.Join(locationParts, ", ")
	} else {
		serverLocation = "Unknown Location"
	}

	if updateChan != nil {
		updateChan <- SpeedtestUpdate{
			Type:           "ping",
			ServerName:     serverName,
			ServerLocation: serverLocation,
			Message:        fmt.Sprintf("Testing ping to %s...", serverName),
		}
	}

	// Test ping with updates
	ping, jitter = testPingToServerWithUpdates(ctx, server, updateChan)

	if updateChan != nil {
		updateChan <- SpeedtestUpdate{
			Type:    "download",
			Ping:    ping,
			Jitter:  jitter,
			Message: "Starting download test...",
		}
	}

	// Test download speed with updates
	downloadSpeed := testDownloadSpeedFromServerWithUpdates(ctx, server, updateChan)

	if updateChan != nil {
		updateChan <- SpeedtestUpdate{
			Type:          "upload",
			Ping:          ping,
			Jitter:        jitter,
			DownloadSpeed: downloadSpeed,
			Message:       "Starting upload test...",
		}
	}

	// Test upload speed with updates
	uploadSpeed := testUploadSpeedToServerWithUpdates(ctx, server, updateChan)

	// Get ISP information
	isp := getISPInfo(ctx, publicIP)

	// Use server ID from selected server
	resultServerID := serverID
	if server.ID > 0 {
		resultServerID = server.ID
	}

	result := &SpeedtestResult{
		DownloadSpeed:  downloadSpeed,
		UploadSpeed:    uploadSpeed,
		Ping:           ping,
		Jitter:         jitter,
		ServerName:     serverName,
		ServerLocation: serverLocation,
		ServerID:       resultServerID,
		ISP:            isp,
		IP:             publicIP,
		Timestamp:      time.Now(),
	}

	if updateChan != nil {
		updateChan <- SpeedtestUpdate{
			Type:           "complete",
			Ping:           ping,
			Jitter:         jitter,
			DownloadSpeed:  downloadSpeed,
			UploadSpeed:    uploadSpeed,
			ServerName:     serverName,
			ServerLocation: serverLocation,
			Progress:       100,
			Message:        "Test complete!",
		}
	}

	return result
}

// runSpeedtest performs the actual speedtest using Speedtest.net servers
func runSpeedtest(serverID int) *SpeedtestResult {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	// Get public IP first
	publicIP := getPublicIP(ctx)

	// Get or select server
	var server *SpeedtestServer
	if serverID == 0 {
		// Auto-select best server
		server = selectBestServer(ctx)
	} else {
		// Get specific server
		servers, err := getSpeedtestServers(ctx)
		if err == nil {
			for i := range servers {
				if servers[i].ID == serverID {
					server = &servers[i]
					break
				}
			}
		}
	}

	// Fallback to default if no server found - use basic ping test
	var ping, jitter float64
	var serverName, serverLocation string

	if server == nil || server.Host == "" {
		// No server found - retry getting servers or fail
		return &SpeedtestResult{
			DownloadSpeed:  0,
			UploadSpeed:    0,
			Ping:           0,
			Jitter:         0,
			ServerName:     "Speedtest.net",
			ServerLocation: "Server not available",
			ServerID:       0,
			ISP:            getISPInfo(ctx, publicIP),
			IP:             publicIP,
			Timestamp:      time.Now(),
		}
	} else {
		// Test ping to the selected server
		ping, jitter = testPingToServer(ctx, server)

		// Use sponsor as server name (sponsor is the ISP/provider name)
		if server.Sponsor != "" {
			serverName = server.Sponsor
		} else if server.Name != "" {
			// Fallback to name if sponsor not available
			serverName = server.Name
		} else {
			serverName = "Speedtest.net Server"
		}

		// Build location string from available server data
		// In Speedtest.net API, "name" field is the city/location, not the server name
		locationParts := []string{}
		if server.Name != "" {
			// Name field contains the city/location
			locationParts = append(locationParts, server.Name)
		}
		if server.City != "" && server.City != server.Name {
			locationParts = append(locationParts, server.City)
		}
		if server.Location != "" && server.Location != server.Name && server.Location != server.City {
			locationParts = append(locationParts, server.Location)
		}
		if server.Country != "" {
			locationParts = append(locationParts, server.Country)
		} else if server.CC != "" {
			locationParts = append(locationParts, server.CC)
		}

		if len(locationParts) > 0 {
			serverLocation = strings.Join(locationParts, ", ")
		} else {
			serverLocation = "Unknown Location"
		}
	}

	// Test download speed (server is guaranteed to be non-nil here)
	downloadSpeed := testDownloadSpeedFromServer(ctx, server)

	// Test upload speed (server is guaranteed to be non-nil here)
	uploadSpeed := testUploadSpeedToServer(ctx, server)

	// Get ISP information
	isp := getISPInfo(ctx, publicIP)

	// Use server ID from selected server
	resultServerID := serverID
	if server.ID > 0 {
		resultServerID = server.ID
	}

	return &SpeedtestResult{
		DownloadSpeed:  downloadSpeed,
		UploadSpeed:    uploadSpeed,
		Ping:           ping,
		Jitter:         jitter,
		ServerName:     serverName,
		ServerLocation: serverLocation,
		ServerID:       resultServerID,
		ISP:            isp,
		IP:             publicIP,
		Timestamp:      time.Now(),
	}
}

// getServerInfo retrieves server information from the test endpoint
func getServerInfo(ctx context.Context) (string, string, string) {
	// Get public IP
	publicIP := getPublicIP(ctx)

	// Since we're using Cloudflare's speed test, detect that
	serverName := "Cloudflare"
	serverLocation := "Global CDN"

	// Try to get more specific location from IP geolocation
	if publicIP != "" {
		if location := getIPLocation(ctx, publicIP); location != "" {
			serverLocation = location
		}
	}

	return serverName, serverLocation, publicIP
}

// getPublicIP retrieves the public IP address
func getPublicIP(ctx context.Context) string {
	ipServices := []string{
		"https://api.ipify.org?format=text",
		"https://icanhazip.com",
		"https://ifconfig.me/ip",
	}

	for _, url := range ipServices {
		req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
		if err != nil {
			continue
		}

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			continue
		}
		defer resp.Body.Close()

		if resp.StatusCode == http.StatusOK {
			body, err := io.ReadAll(resp.Body)
			if err == nil && len(body) > 0 {
				ip := strings.TrimSpace(string(body))
				// Basic IP validation
				if net.ParseIP(ip) != nil {
					return ip
				}
			}
		}
	}

	return ""
}

// getIPLocation gets approximate location from IP (simplified)
func getIPLocation(ctx context.Context, ip string) string {
	// Use a free IP geolocation service
	url := fmt.Sprintf("https://ipapi.co/%s/json/", ip)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return ""
	}

	req.Header.Set("User-Agent", "Speedtest-App/1.0")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return ""
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		var data struct {
			City    string `json:"city"`
			Region  string `json:"region"`
			Country string `json:"country_name"`
		}

		if err := json.NewDecoder(resp.Body).Decode(&data); err == nil {
			parts := []string{}
			if data.City != "" {
				parts = append(parts, data.City)
			}
			if data.Region != "" {
				parts = append(parts, data.Region)
			}
			if data.Country != "" {
				parts = append(parts, data.Country)
			}
			if len(parts) > 0 {
				return strings.Join(parts, ", ")
			}
		}
	}

	return ""
}

// testPing tests ping and jitter
func testPing(ctx context.Context) (float64, float64) {
	// Simple ping test using HTTP request timing
	testURL := "https://www.google.com"

	var latencies []float64
	for i := 0; i < 5; i++ {
		start := time.Now()
		req, err := http.NewRequestWithContext(ctx, "GET", testURL, nil)
		if err != nil {
			continue
		}

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			continue
		}
		resp.Body.Close()

		latency := time.Since(start).Seconds() * 1000 // Convert to ms
		latencies = append(latencies, latency)
	}

	if len(latencies) == 0 {
		return 0, 0
	}

	// Calculate average ping
	var sum float64
	for _, l := range latencies {
		sum += l
	}
	avgPing := sum / float64(len(latencies))

	// Calculate jitter (standard deviation)
	var variance float64
	for _, l := range latencies {
		variance += (l - avgPing) * (l - avgPing)
	}
	jitter := variance / float64(len(latencies))

	return avgPing, jitter
}

// saveSpeedtestResult saves a speedtest result to the database
func saveSpeedtestResult(result *SpeedtestResult) error {
	// Try new schema first, fallback to old if columns don't exist
	query := `
		INSERT INTO speedtest_results (
			download_speed, upload_speed, ping, jitter,
			server_name, server_location, server_id, isp, ip,
			packet_loss, download_bytes, upload_bytes, status, scheduled, timestamp
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	scheduled := 0
	if result.Scheduled {
		scheduled = 1
	}
	status := result.Status
	if status == "" {
		status = "completed"
	}

	_, err := database.DB.Exec(
		query,
		result.DownloadSpeed,
		result.UploadSpeed,
		result.Ping,
		result.Jitter,
		result.ServerName,
		result.ServerLocation,
		result.ServerID,
		result.ISP,
		result.IP,
		result.PacketLoss,
		result.DownloadBytes,
		result.UploadBytes,
		status,
		scheduled,
		result.Timestamp,
	)

	if err != nil {
		// Fallback to old schema if new columns don't exist
		queryOld := `
			INSERT INTO speedtest_results (
				download_speed, upload_speed, ping, jitter,
				server_name, server_location, server_id, isp, ip, timestamp
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`
		_, err = database.DB.Exec(
			queryOld,
			result.DownloadSpeed,
			result.UploadSpeed,
			result.Ping,
			result.Jitter,
			result.ServerName,
			result.ServerLocation,
			result.ServerID,
			result.ISP,
			result.IP,
			result.Timestamp,
		)
		if err != nil {
			return err
		}
	}

	return nil
}

// getSpeedtestResultsCount returns the total count of speedtest results
func getSpeedtestResultsCount(startTime, endTime *time.Time) (int, error) {
	query := `SELECT COUNT(*) FROM speedtest_results WHERE 1=1`
	args := []interface{}{}

	if startTime != nil {
		query += " AND timestamp >= ?"
		args = append(args, *startTime)
	}
	if endTime != nil {
		query += " AND timestamp <= ?"
		args = append(args, *endTime)
	}

	var count int
	err := database.DB.QueryRow(query, args...).Scan(&count)
	return count, err
}

// getSpeedtestResults retrieves speedtest results from the database
func getSpeedtestResults(limit, offset int, startTime, endTime *time.Time) ([]SpeedtestResult, error) {
	query := `
		SELECT id, download_speed, upload_speed, ping, jitter,
		       server_name, server_location, server_id, isp, ip,
		       COALESCE(packet_loss, 0), COALESCE(download_bytes, 0), COALESCE(upload_bytes, 0),
		       COALESCE(status, 'completed'), COALESCE(scheduled, 0), timestamp
		FROM speedtest_results
		WHERE 1=1
	`
	args := []interface{}{}

	if startTime != nil {
		query += " AND timestamp >= ?"
		args = append(args, *startTime)
	}
	if endTime != nil {
		query += " AND timestamp <= ?"
		args = append(args, *endTime)
	}

	query += " ORDER BY timestamp DESC"
	if limit > 0 {
		query += " LIMIT ?"
		args = append(args, limit)
		if offset > 0 {
			query += " OFFSET ?"
			args = append(args, offset)
		}
	}

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []SpeedtestResult
	for rows.Next() {
		var result SpeedtestResult
		var scheduled int
		err := rows.Scan(
			&result.ID,
			&result.DownloadSpeed,
			&result.UploadSpeed,
			&result.Ping,
			&result.Jitter,
			&result.ServerName,
			&result.ServerLocation,
			&result.ServerID,
			&result.ISP,
			&result.IP,
			&result.PacketLoss,
			&result.DownloadBytes,
			&result.UploadBytes,
			&result.Status,
			&scheduled,
			&result.Timestamp,
		)
		if err != nil {
			continue
		}
		result.Scheduled = scheduled == 1
		results = append(results, result)
	}

	return results, nil
}

// deleteSpeedtestResult deletes a speedtest result from the database
func deleteSpeedtestResult(id int64) error {
	query := `DELETE FROM speedtest_results WHERE id = ?`
	_, err := database.DB.Exec(query, id)
	return err
}

// getSpeedtestStats retrieves aggregated statistics from the database
func getSpeedtestStats(startTime, endTime *time.Time) (*SpeedtestStats, error) {
	query := `
		SELECT 
			COUNT(*) as total_results,
			AVG(ping) as avg_ping,
			MIN(ping) as min_ping,
			MAX(ping) as max_ping,
			AVG(download_speed) as avg_download,
			MIN(download_speed) as min_download,
			MAX(download_speed) as max_download,
			AVG(upload_speed) as avg_upload,
			MIN(upload_speed) as min_upload,
			MAX(upload_speed) as max_upload,
			AVG(jitter) as avg_jitter,
			MIN(jitter) as min_jitter,
			MAX(jitter) as max_jitter
		FROM speedtest_results
		WHERE COALESCE(status, 'completed') = 'completed'
	`
	args := []interface{}{}

	if startTime != nil {
		query += " AND timestamp >= ?"
		args = append(args, *startTime)
	}
	if endTime != nil {
		query += " AND timestamp <= ?"
		args = append(args, *endTime)
	}

	var stats SpeedtestStats
	var avgPing, minPing, maxPing sql.NullFloat64
	var avgDownload, minDownload, maxDownload sql.NullFloat64
	var avgUpload, minUpload, maxUpload sql.NullFloat64
	var avgJitter, minJitter, maxJitter sql.NullFloat64

	err := database.DB.QueryRow(query, args...).Scan(
		&stats.TotalResults,
		&avgPing, &minPing, &maxPing,
		&avgDownload, &minDownload, &maxDownload,
		&avgUpload, &minUpload, &maxUpload,
		&avgJitter, &minJitter, &maxJitter,
	)
	if err != nil {
		return nil, err
	}

	if avgPing.Valid {
		stats.Ping.Avg = avgPing.Float64
		stats.Ping.Min = minPing.Float64
		stats.Ping.Max = maxPing.Float64
	}
	if avgDownload.Valid {
		stats.Download.Avg = avgDownload.Float64
		stats.Download.Min = minDownload.Float64
		stats.Download.Max = maxDownload.Float64
	}
	if avgUpload.Valid {
		stats.Upload.Avg = avgUpload.Float64
		stats.Upload.Min = minUpload.Float64
		stats.Upload.Max = maxUpload.Float64
	}
	if avgJitter.Valid {
		stats.Jitter.Avg = avgJitter.Float64
		stats.Jitter.Min = minJitter.Float64
		stats.Jitter.Max = maxJitter.Float64
	}

	return &stats, nil
}

// getSpeedtestChartData retrieves data for chart rendering
func getSpeedtestChartData(metric string, period string) (*SpeedtestChartData, error) {
	var startTime *time.Time
	now := time.Now()

	switch period {
	case "24h":
		t := now.Add(-24 * time.Hour)
		startTime = &t
	case "week":
		t := now.Add(-7 * 24 * time.Hour)
		startTime = &t
	case "month":
		t := now.Add(-30 * 24 * time.Hour)
		startTime = &t
	}

	results, err := getSpeedtestResults(0, 0, startTime, nil)
	if err != nil {
		return nil, err
	}

	// Sort by timestamp ascending for chart
	sort.Slice(results, func(i, j int) bool {
		return results[i].Timestamp.Before(results[j].Timestamp)
	})

	chartData := &SpeedtestChartData{
		Labels:   make([]string, len(results)),
		Datasets: []ChartDataset{},
	}

	var data []float64
	var label string
	var borderColor, backgroundColor string

	switch metric {
	case "ping":
		label = "Ping"
		borderColor = "rgba(16, 185, 129, 1)"
		backgroundColor = "rgba(16, 185, 129, 0.1)"
		for _, r := range results {
			data = append(data, r.Ping)
		}
		// Calculate average line
		if len(results) > 0 {
			var sum float64
			for _, r := range results {
				sum += r.Ping
			}
			avg := sum / float64(len(results))
			avgData := make([]float64, len(results))
			for i := range avgData {
				avgData[i] = avg
			}
			chartData.Datasets = append(chartData.Datasets, ChartDataset{
				Label:       "Average",
				Data:        avgData,
				BorderColor: "rgba(243, 7, 6, 1)",
				PointRadius: 0,
				Fill:        false,
				Tension:     0.4,
			})
		}
	case "download":
		label = "Download"
		borderColor = "rgba(14, 165, 233, 1)"
		backgroundColor = "rgba(14, 165, 233, 0.1)"
		for _, r := range results {
			data = append(data, r.DownloadSpeed)
		}
		// Calculate average line
		if len(results) > 0 {
			var sum float64
			for _, r := range results {
				sum += r.DownloadSpeed
			}
			avg := sum / float64(len(results))
			avgData := make([]float64, len(results))
			for i := range avgData {
				avgData[i] = avg
			}
			chartData.Datasets = append(chartData.Datasets, ChartDataset{
				Label:       "Average",
				Data:        avgData,
				BorderColor: "rgba(243, 7, 6, 1)",
				PointRadius: 0,
				Fill:        false,
				Tension:     0.4,
			})
		}
	case "upload":
		label = "Upload"
		borderColor = "rgba(10, 191, 83, 1)"
		backgroundColor = "rgba(10, 191, 83, 0.1)"
		for _, r := range results {
			data = append(data, r.UploadSpeed)
		}
		// Calculate average line
		if len(results) > 0 {
			var sum float64
			for _, r := range results {
				sum += r.UploadSpeed
			}
			avg := sum / float64(len(results))
			avgData := make([]float64, len(results))
			for i := range avgData {
				avgData[i] = avg
			}
			chartData.Datasets = append(chartData.Datasets, ChartDataset{
				Label:       "Average",
				Data:        avgData,
				BorderColor: "rgba(243, 7, 6, 1)",
				PointRadius: 0,
				Fill:        false,
				Tension:     0.4,
			})
		}
	case "jitter":
		label = "Jitter"
		borderColor = "rgba(139, 92, 246, 1)"
		backgroundColor = "rgba(139, 92, 246, 0.1)"
		for _, r := range results {
			data = append(data, r.Jitter)
		}
		// Calculate average line
		if len(results) > 0 {
			var sum float64
			for _, r := range results {
				sum += r.Jitter
			}
			avg := sum / float64(len(results))
			avgData := make([]float64, len(results))
			for i := range avgData {
				avgData[i] = avg
			}
			chartData.Datasets = append(chartData.Datasets, ChartDataset{
				Label:       "Average",
				Data:        avgData,
				BorderColor: "rgba(243, 7, 6, 1)",
				PointRadius: 0,
				Fill:        false,
				Tension:     0.4,
			})
		}
	default:
		return nil, fmt.Errorf("unknown metric: %s", metric)
	}

	// Format labels
	for i, r := range results {
		chartData.Labels[i] = r.Timestamp.Format("01/02 15:04")
	}

	// Add main dataset
	pointRadius := 3
	if len(results) > 24 {
		pointRadius = 0
	}

	chartData.Datasets = append([]ChartDataset{{
		Label:           label,
		Data:            data,
		BorderColor:     borderColor,
		BackgroundColor: backgroundColor,
		PointRadius:     pointRadius,
		Fill:            true,
		Tension:         0.4,
	}}, chartData.Datasets...)

	return chartData, nil
}

// getSpeedtestServers fetches available servers from Speedtest.net API
func getSpeedtestServers(ctx context.Context) ([]SpeedtestServer, error) {
	// Speedtest.net API endpoint for servers
	url := "https://www.speedtest.net/api/js/servers?engine=js"

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "application/json, text/javascript, */*; q=0.01")
	req.Header.Set("Referer", "https://www.speedtest.net/")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch servers: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch servers: status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Parse response

	// Speedtest.net API returns servers in different formats
	// Parse as raw JSON first to handle flexible types
	var rawServers []SpeedtestServerRaw
	var servers []SpeedtestServer

	// Try parsing as direct array first
	if err := json.Unmarshal(body, &rawServers); err != nil {
		// Try parsing as object with servers field
		var response1 struct {
			Servers []SpeedtestServerRaw `json:"servers"`
		}
		if err2 := json.Unmarshal(body, &response1); err2 == nil {
			rawServers = response1.Servers
		} else {
			// Try parsing as object with data field
			var response2 struct {
				Data struct {
					Servers []SpeedtestServerRaw `json:"servers"`
				} `json:"data"`
			}
			if err3 := json.Unmarshal(body, &response2); err3 == nil {
				rawServers = response2.Data.Servers
			} else {
				// Try parsing as map with server objects
				var serverMap map[string]interface{}
				if err4 := json.Unmarshal(body, &serverMap); err4 == nil {
					// Extract servers from map - try different possible keys
					var serversList []interface{}
					if list, ok := serverMap["servers"].([]interface{}); ok {
						serversList = list
					} else if list, ok := serverMap["data"].([]interface{}); ok {
						serversList = list
					} else if dataObj, ok := serverMap["data"].(map[string]interface{}); ok {
						if list, ok := dataObj["servers"].([]interface{}); ok {
							serversList = list
						}
					}

					if len(serversList) > 0 {
						for _, s := range serversList {
							if serverObj, ok := s.(map[string]interface{}); ok {
								rawServer := parseServerFromMapRaw(serverObj)
								server := convertRawServer(rawServer)
								if server.Host != "" && server.ID > 0 {
									servers = append(servers, server)
								}
							}
						}
					}
				} else {
					return nil, fmt.Errorf("failed to parse servers: %w", err)
				}
			}
		}
	}

	// Convert raw servers to typed servers
	if len(rawServers) > 0 {
		for _, raw := range rawServers {
			server := convertRawServer(raw)
			if server.Host != "" && server.ID > 0 {
				servers = append(servers, server)
			}
		}
	}

	if len(servers) == 0 {
		return nil, fmt.Errorf("no valid servers found")
	}

	return servers, nil
}

// convertRawServer converts a raw server to a typed server
func convertRawServer(raw SpeedtestServerRaw) SpeedtestServer {
	server := SpeedtestServer{}

	// Convert ID - can be float64, int, or string
	if id, ok := raw.ID.(float64); ok {
		server.ID = int(id)
	} else if id, ok := raw.ID.(int); ok {
		server.ID = id
	} else if idStr, ok := raw.ID.(string); ok && idStr != "" {
		if id, err := strconv.Atoi(idStr); err == nil {
			server.ID = id
		}
	}

	// Convert Name
	if name, ok := raw.Name.(string); ok {
		server.Name = name
	}

	// Convert Location
	if location, ok := raw.Location.(string); ok {
		server.Location = location
	}

	// Convert Country
	if country, ok := raw.Country.(string); ok {
		server.Country = country
	}

	// Convert Host - can be string or might be in URL field
	if host, ok := raw.Host.(string); ok && host != "" {
		server.Host = host
	} else if url, ok := raw.URL.(string); ok && url != "" {
		// Try to extract host from URL
		if strings.HasPrefix(url, "http://") || strings.HasPrefix(url, "https://") {
			// Parse URL to extract host
			if u, err := neturl.Parse(url); err == nil {
				server.Host = u.Host
			}
		} else {
			// URL might just be the host
			server.Host = url
		}
	}

	// Convert URL
	if url, ok := raw.URL.(string); ok {
		server.URL = url
	}

	// Convert Lat (can be string or float64)
	if lat, ok := raw.Lat.(float64); ok {
		server.Lat = lat
	} else if latStr, ok := raw.Lat.(string); ok && latStr != "" {
		if lat, err := strconv.ParseFloat(latStr, 64); err == nil {
			server.Lat = lat
		}
	}

	// Convert Lon (can be string or float64)
	if lon, ok := raw.Lon.(float64); ok {
		server.Lon = lon
	} else if lonStr, ok := raw.Lon.(string); ok && lonStr != "" {
		if lon, err := strconv.ParseFloat(lonStr, 64); err == nil {
			server.Lon = lon
		}
	}

	// Convert Sponsor
	if sponsor, ok := raw.Sponsor.(string); ok {
		server.Sponsor = sponsor
	}

	// Convert City
	if city, ok := raw.City.(string); ok {
		server.City = city
	}

	// Convert CC
	if cc, ok := raw.CC.(string); ok {
		server.CC = cc
	}

	return server
}

// parseServerFromMapRaw parses a server object from a map to raw format
func parseServerFromMapRaw(m map[string]interface{}) SpeedtestServerRaw {
	raw := SpeedtestServerRaw{}

	if val, ok := m["id"]; ok {
		raw.ID = val
	}
	if val, ok := m["name"]; ok {
		raw.Name = val
	}
	if val, ok := m["location"]; ok {
		raw.Location = val
	}
	if val, ok := m["country"]; ok {
		raw.Country = val
	}
	if val, ok := m["host"]; ok {
		raw.Host = val
	}
	if val, ok := m["url"]; ok {
		raw.URL = val
	}
	if val, ok := m["sponsor"]; ok {
		raw.Sponsor = val
	}
	if val, ok := m["city"]; ok {
		raw.City = val
	}
	if val, ok := m["cc"]; ok {
		raw.CC = val
	}
	if val, ok := m["lat"]; ok {
		raw.Lat = val
	}
	if val, ok := m["lon"]; ok {
		raw.Lon = val
	}

	return raw
}

// getServerMapKeys returns all keys from a map for debugging
func getServerMapKeys(m map[string]interface{}) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}

// selectBestServer selects the best server based on ping/latency
func selectBestServer(ctx context.Context) *SpeedtestServer {
	servers, err := getSpeedtestServers(ctx)
	if err != nil || len(servers) == 0 {
		return nil
	}

	// Test ping to first few servers and select the one with lowest latency
	bestServer := &servers[0]
	bestPing := 9999.0

	// Test up to 3 servers to find the best one (reduced for speed)
	maxTests := 3
	if len(servers) < maxTests {
		maxTests = len(servers)
	}

	for i := 0; i < maxTests; i++ {
		if servers[i].Host == "" {
			continue
		}
		ping, _ := testPingToServer(ctx, &servers[i])
		if ping > 0 && ping < bestPing {
			bestPing = ping
			bestServer = &servers[i]
		}
		// Don't wait too long - if we found a good server (< 50ms), use it
		if bestPing < 50 && bestPing > 0 {
			break
		}
	}

	return bestServer
}

// testPingToServer tests ping to a specific Speedtest.net server
func testPingToServer(ctx context.Context, server *SpeedtestServer) (float64, float64) {
	return testPingToServerWithUpdates(ctx, server, nil)
}

// testPingToServerWithUpdates tests ping with optional real-time updates
func testPingToServerWithUpdates(ctx context.Context, server *SpeedtestServer, updateChan chan<- SpeedtestUpdate) (float64, float64) {
	if server == nil || server.Host == "" {
		return 0, 0
	}

	// Test ping to server host using HTTP (not HTTPS) for more accurate ping
	var latencies []float64
	testCount := 10 // More pings for better accuracy

	if updateChan != nil {
		updateChan <- SpeedtestUpdate{
			Type:     "ping",
			Message:  "Testing ping...",
			Progress: 0,
		}
	}

	// Extract hostname from server.Host
	host := server.Host

	// Check if port is specified and extract hostname
	if strings.Contains(host, ":") {
		parts := strings.Split(host, ":")
		host = parts[0]
	}

	// Try port 8080 first (speedtest.net standard for latency), fallback to 80
	pingPorts := []string{"8080", "80"}

	for i := 0; i < testCount; i++ {
		start := time.Now()
		var latency float64
		success := false

		// Try multiple ports (8080 first, then 80)
		for _, testPort := range pingPorts {
			// Use TCP connection for accurate ping measurement
			// This measures only the TCP handshake time, which is close to real ICMP ping
			dialer := &net.Dialer{
				Timeout: 3 * time.Second, // Shorter timeout for faster ping
			}

			// Connect to server using TCP (just establish connection, no HTTP)
			conn, err := dialer.DialContext(ctx, "tcp", net.JoinHostPort(host, testPort))
			if err == nil {
				// TCP connection successful - measure only connection time
				conn.Close()
				latency = time.Since(start).Seconds() * 1000 // Convert to ms
				latencies = append(latencies, latency)
				success = true
				break
			}
		}

		// If all TCP connections failed, skip this ping
		if !success {
			continue
		}

		if updateChan != nil {
			// Calculate current average
			var sum float64
			for _, l := range latencies {
				sum += l
			}
			avgPing := sum / float64(len(latencies))

			updateChan <- SpeedtestUpdate{
				Type:     "ping",
				Ping:     avgPing,
				Progress: float64(i+1) / float64(testCount) * 20, // Ping is 20% of total progress
				Message:  fmt.Sprintf("Ping test %d/%d...", i+1, testCount),
			}
		}

		// Small delay between pings
		time.Sleep(100 * time.Millisecond)
	}

	if len(latencies) == 0 {
		return 0, 0
	}

	// Calculate average ping
	var sum float64
	for _, l := range latencies {
		sum += l
	}
	avgPing := sum / float64(len(latencies))

	// Calculate jitter (standard deviation)
	var variance float64
	for _, l := range latencies {
		diff := l - avgPing
		variance += diff * diff
	}
	jitter := math.Sqrt(variance / float64(len(latencies))) // Use standard deviation, not variance

	// Send final ping/jitter update
	if updateChan != nil {
		updateChan <- SpeedtestUpdate{
			Type:     "ping",
			Ping:     avgPing,
			Jitter:   jitter,
			Progress: 20,
			Message:  fmt.Sprintf("Ping: %.2f ms, Jitter: %.2f ms", avgPing, jitter),
		}
	}

	return avgPing, jitter
}

// testDownloadSpeedFromServer tests download speed from a Speedtest.net server
func testDownloadSpeedFromServer(ctx context.Context, server *SpeedtestServer) float64 {
	return testDownloadSpeedFromServerWithUpdates(ctx, server, nil)
}

// testDownloadSpeedFromServerWithUpdates tests download speed with optional real-time updates
// Matches speedtest.net methodology: multiple parallel connections, adaptive chunk sizes, minimum 10s duration
func testDownloadSpeedFromServerWithUpdates(ctx context.Context, server *SpeedtestServer, updateChan chan<- SpeedtestUpdate) float64 {
	if server == nil || server.Host == "" {
		return 0
	}

	// Create HTTP client with longer timeout for large transfers (matches speedtest.net)
	client := &http.Client{
		Timeout: 300 * time.Second, // 5 minutes per request (for very slow connections)
		Transport: &http.Transport{
			MaxIdleConns:        100,
			MaxIdleConnsPerHost: 8, // Speedtest.net uses up to 8 parallel connections
			IdleConnTimeout:     90 * time.Second,
			DisableCompression:  true,
			DisableKeepAlives:   false, // Reuse connections for parallel requests
		},
	}

	// Speedtest.net methodology:
	// - Uses 4-8 parallel connections for download
	// - Adaptive chunk sizes: starts small, increases based on speed
	// - Minimum 10 seconds duration
	// - Typically transfers 100-500MB depending on connection speed

	numConnections := 4                 // Start with 4 parallel connections (speedtest.net uses 4-8)
	chunkSize := int64(10000000)        // 10MB chunks (smaller for faster initial results)
	minTestDuration := 5 * time.Second  // Minimum 5 seconds (faster results)
	maxTestDuration := 30 * time.Second // Maximum 30 seconds

	var totalBytes int64
	var totalDuration time.Duration
	testStart := time.Now()

	if updateChan != nil {
		updateChan <- SpeedtestUpdate{
			Type:     "download",
			Message:  "Starting download test...",
			Progress: 20, // After ping
		}
	}

	// Use a channel to collect results from parallel connections
	type chunkResult struct {
		bytes    int64
		duration time.Duration
	}
	resultChan := make(chan chunkResult, numConnections*10)

	// Start a ticker to send periodic updates (every 500ms for real-time feel)
	var updateTicker *time.Ticker
	var updateTickerStop chan bool
	if updateChan != nil {
		updateTicker = time.NewTicker(500 * time.Millisecond)
		updateTickerStop = make(chan bool)
		go func() {
			for {
				select {
				case <-updateTicker.C:
					if totalDuration > 0 {
						currentSpeed := float64(totalBytes*8) / totalDuration.Seconds() / 1000000
						elapsed := time.Since(testStart).Seconds()
						progress := 20 + (elapsed / 30.0 * 40) // Progress based on time (max 30s)
						if progress > 60 {
							progress = 60
						}
						select {
						case updateChan <- SpeedtestUpdate{
							Type:          "download",
							DownloadSpeed: currentSpeed,
							Progress:      progress,
							Message:       fmt.Sprintf("Downloading... %.1f Mbps", currentSpeed),
						}:
						default:
							// Channel full, skip this update
						}
					}
				case <-updateTickerStop:
					return
				}
			}
		}()
	}

	// Run parallel downloads until we reach minimum duration
	chunkNum := 0
	for {
		// Check if we've exceeded max duration
		if time.Since(testStart) >= maxTestDuration {
			break
		}

		// Check if we've reached minimum duration and have enough data
		// Start showing results after 2 chunks (faster feedback)
		if totalDuration >= minTestDuration && chunkNum >= 2 {
			// Continue for a bit more to ensure accuracy
			if chunkNum >= 4 {
				break
			}
		}

		// Launch parallel connections
		var wg sync.WaitGroup
		chunkStart := time.Now()

		for conn := 0; conn < numConnections; conn++ {
			wg.Add(1)
			go func(connID int) {
				defer wg.Done()

				downloadURL := fmt.Sprintf("http://%s/download?size=%d&nocache=%d", server.Host, chunkSize, time.Now().UnixNano())

				req, err := http.NewRequestWithContext(ctx, "GET", downloadURL, nil)
				if err != nil {
					return
				}

				start := time.Now()
				resp, err := client.Do(req)
				if err != nil {
					return
				}

				bytes, _ := io.Copy(io.Discard, resp.Body)
				resp.Body.Close()
				duration := time.Since(start)

				resultChan <- chunkResult{bytes: bytes, duration: duration}
			}(conn)
		}

		// Wait for all connections in this batch
		wg.Wait()
		chunkDuration := time.Since(chunkStart)

		// Collect results from this batch
		batchBytes := int64(0)
		batchTransferTime := time.Duration(0) // Actual transfer time, not wall clock
		for i := 0; i < numConnections; i++ {
			select {
			case result := <-resultChan:
				batchBytes += result.bytes
				// Use the actual transfer duration, not wall clock time
				if result.duration > batchTransferTime {
					batchTransferTime = result.duration
				}
			default:
				// Some connections may have failed
			}
		}

		totalBytes += batchBytes
		// Use actual transfer time instead of wall clock time for more accurate speed
		// This gives better results when connections are slow to start
		if batchTransferTime > 0 {
			totalDuration += batchTransferTime
		} else {
			totalDuration += chunkDuration
		}
		chunkNum++

		// Send immediate update after each chunk for faster feedback
		if updateChan != nil && totalDuration > 0 {
			currentSpeed := float64(totalBytes*8) / totalDuration.Seconds() / 1000000
			elapsed := time.Since(testStart).Seconds()
			progress := 20 + (elapsed / 30.0 * 40)
			if progress > 60 {
				progress = 60
			}
			select {
			case updateChan <- SpeedtestUpdate{
				Type:          "download",
				DownloadSpeed: currentSpeed,
				Progress:      progress,
				Message:       fmt.Sprintf("Downloading... %.1f Mbps", currentSpeed),
			}:
			default:
				// Channel full, skip
			}
		}
	}

	// Stop the update ticker
	if updateTicker != nil {
		updateTicker.Stop()
		close(updateTickerStop)
	}

	if totalDuration.Seconds() == 0 {
		return 0
	}

	// Convert to Mbps (speedtest.net uses bits per second)
	speedMbps := float64(totalBytes*8) / totalDuration.Seconds() / 1000000
	return speedMbps
}

// testUploadSpeedToServer tests upload speed to a Speedtest.net server
func testUploadSpeedToServer(ctx context.Context, server *SpeedtestServer) float64 {
	return testUploadSpeedToServerWithUpdates(ctx, server, nil)
}

// testUploadSpeedToServerWithUpdates tests upload speed with optional real-time updates
func testUploadSpeedToServerWithUpdates(ctx context.Context, server *SpeedtestServer, updateChan chan<- SpeedtestUpdate) float64 {
	if server == nil || server.Host == "" {
		return 0
	}

	// Create HTTP client with longer timeout for large transfers (matches speedtest.net)
	client := &http.Client{
		Timeout: 300 * time.Second, // 5 minutes per request (for very slow connections)
		Transport: &http.Transport{
			MaxIdleConns:        100,
			MaxIdleConnsPerHost: 4, // Speedtest.net uses fewer connections for upload (typically 1-4)
			IdleConnTimeout:     90 * time.Second,
			DisableCompression:  true,
		},
	}

	// Speedtest.net upload URL format: http://[host]/upload
	uploadURL := fmt.Sprintf("http://%s/upload", server.Host)

	// Speedtest.net methodology for upload:
	// - Uses 1-4 sequential connections (not parallel like download)
	// - Chunk sizes: typically 1-10MB chunks
	// - Minimum 10-15 seconds duration
	// - Typically transfers 10-50MB depending on connection speed

	chunkSize := int64(8000000)         // 8MB chunks (optimized for speed)
	minTestDuration := 8 * time.Second  // Minimum 8 seconds (balanced for speed/accuracy)
	maxTestDuration := 30 * time.Second // Maximum 30 seconds

	var totalBytes int64
	var totalDuration time.Duration
	testStart := time.Now()

	if updateChan != nil {
		updateChan <- SpeedtestUpdate{
			Type:     "upload",
			Message:  "Starting upload test...",
			Progress: 60, // After ping and download
		}
	}

	// Start a ticker to send periodic updates (every 500ms for real-time feel)
	var updateTicker *time.Ticker
	var updateTickerStop chan bool
	if updateChan != nil {
		updateTicker = time.NewTicker(500 * time.Millisecond)
		updateTickerStop = make(chan bool)
		go func() {
			for {
				select {
				case <-updateTicker.C:
					if totalDuration > 0 {
						currentSpeed := float64(totalBytes*8) / totalDuration.Seconds() / 1000000
						elapsed := time.Since(testStart).Seconds()
						progress := 60 + (elapsed / 30.0 * 40) // Progress based on time (max 30s)
						if progress > 100 {
							progress = 100
						}
						select {
						case updateChan <- SpeedtestUpdate{
							Type:        "upload",
							UploadSpeed: currentSpeed,
							Progress:    progress,
							Message:     fmt.Sprintf("Uploading... %.1f Mbps", currentSpeed),
						}:
						default:
							// Channel full, skip this update
						}
					}
				case <-updateTickerStop:
					return
				}
			}
		}()
	}

	// Sequential uploads (speedtest.net uses sequential, not parallel for upload)
	chunkNum := 0
	for {
		// Check if we've exceeded max duration
		if time.Since(testStart) >= maxTestDuration {
			break
		}

		// Check if we've reached minimum duration and have enough data
		if totalDuration >= minTestDuration && chunkNum >= 4 {
			// Continue for a bit more to ensure accuracy
			if chunkNum >= 6 {
				break
			}
		}

		// Create test payload (speedtest.net uses random data)
		testData := make([]byte, chunkSize)
		for i := range testData {
			testData[i] = byte((i + chunkNum) % 256)
		}

		start := time.Now()
		req, err := http.NewRequestWithContext(ctx, "POST", uploadURL, bytes.NewReader(testData))
		if err != nil {
			break
		}
		req.ContentLength = int64(len(testData))
		req.Header.Set("Content-Type", "application/octet-stream")

		resp, err := client.Do(req)
		if err != nil {
			break
		}
		resp.Body.Close()

		duration := time.Since(start)
		totalBytes += int64(len(testData))
		totalDuration += duration
		chunkNum++

		// Updates are now sent by the ticker, so we don't need to send here
	}

	// Stop the update ticker
	if updateTicker != nil {
		updateTicker.Stop()
		close(updateTickerStop)
	}

	if totalDuration.Seconds() == 0 {
		return 0
	}

	// Convert to Mbps (speedtest.net uses bits per second)
	speedMbps := float64(totalBytes*8) / totalDuration.Seconds() / 1000000
	return speedMbps
}

// getISPInfo gets ISP information from IP
func getISPInfo(ctx context.Context, ip string) string {
	if ip == "" {
		return "Unknown"
	}

	url := fmt.Sprintf("https://ipapi.co/%s/json/", ip)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return "Unknown"
	}

	req.Header.Set("User-Agent", "Speedtest-App/1.0")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "Unknown"
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		var data struct {
			Org string `json:"org"`
		}

		if err := json.NewDecoder(resp.Body).Decode(&data); err == nil {
			if data.Org != "" {
				return data.Org
			}
		}
	}

	return "Unknown"
}
