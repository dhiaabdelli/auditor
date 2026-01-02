package handlers

import (
	// Standard library - encoding
	"encoding/json"
	
	// Standard library - io
	"fmt"
	"net/http"
	"time"
	
	// Internal packages
	"network-script-generator/internal/models"
	"network-script-generator/internal/scripts"
)

// HandleGenerateScript handles script generation requests
func HandleGenerateScript(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.ScriptRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	script := scripts.GeneratePowerShellScript(req.Adapters)

	response := models.ScriptResponse{Script: script}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleDownloadScript handles script download requests
func HandleDownloadScript(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.ScriptRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	script := scripts.GeneratePowerShellScript(req.Adapters)
	filename := fmt.Sprintf("network-setup-%s.ps1", time.Now().Format("20060102-150405"))

	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	w.Write([]byte(script))
}

