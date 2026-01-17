package handlers

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"network-script-generator/internal/database"
	"network-script-generator/internal/mfa"
	"network-script-generator/internal/security"
)

// HandleMFASettings handles GET and POST requests for MFA settings
func HandleMFASettings(w http.ResponseWriter, r *http.Request) {
	// Get username from Authorization header (JWT token)
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	username, _, err := security.ValidateJWT(tokenString)
	if err != nil {
		http.Error(w, "Unauthorized: Invalid token", http.StatusUnauthorized)
		return
	}

	usernameStr := username

	switch r.Method {
	case "GET":
		getMFASettings(w, r, usernameStr)
	case "POST":
		updateMFASettings(w, r, usernameStr)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// HandleMFATOTPGenerate handles TOTP secret generation
// Frontend calls this endpoint, and this handler makes the request to the external MFA server
func HandleMFATOTPGenerate(w http.ResponseWriter, r *http.Request) {
	// Log for debugging
	fmt.Printf("[MFA Generate] Request received: Method=%s, Path=%s\n", r.Method, r.URL.Path)

	if r.Method != "POST" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
		return
	}

	// Get username from JWT token (middleware already validated it)
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized: Missing Authorization header"})
		return
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	username, _, err := security.ValidateJWT(tokenString)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized: Invalid token", "details": err.Error()})
		return
	}

	if username == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized: Could not extract username from token"})
		return
	}

	// Get MFA config to get the server URL and token
	cfg, err := mfa.GetMFAConfig()
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to get MFA configuration", "details": err.Error()})
		return
	}

	// Backend makes the request to external MFA server (not frontend)
	mfaServer := strings.TrimSuffix(cfg.MFAServer, "/")
	generateURL := fmt.Sprintf("%s/mfa/totp/generate", mfaServer)

	req, err := http.NewRequest("POST", generateURL, nil)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create request", "details": err.Error()})
		return
	}

	// Use embedded token for server authentication
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", cfg.MFAToken))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, "Failed to contact MFA server: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "Failed to read MFA response: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if resp.StatusCode != http.StatusOK {
		http.Error(w, fmt.Sprintf("MFA server returned %s: %s", resp.Status, string(body)), resp.StatusCode)
		return
	}

	// Store the secret temporarily in database (we'll validate it next)
	var mfaResp struct {
		Secret    string `json:"secret"`
		QRCodeURL string `json:"qr_code_url"`
		Account   string `json:"account"`
		Issuer    string `json:"issuer"`
		Message   string `json:"message"`
	}

	if err := json.Unmarshal(body, &mfaResp); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error":         "Failed to parse MFA response",
			"details":       err.Error(),
			"response_body": string(body),
		})
		return
	}

	// Store secret in database (pending validation)
	_, err = database.DB.Exec("UPDATE users SET mfa_secret = ?, mfa_secret_validated = 0 WHERE username = ?", mfaResp.Secret, username)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to store MFA secret", "details": err.Error()})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(mfaResp)
}

// HandleMFATOTPValidate handles TOTP code validation
// Frontend calls this endpoint with the code, and this handler makes the request to the external MFA server
func HandleMFATOTPValidate(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get username from JWT token
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	username, _, err := security.ValidateJWT(tokenString)
	if err != nil {
		http.Error(w, "Unauthorized: Invalid token", http.StatusUnauthorized)
		return
	}

	var request struct {
		Code string `json:"code"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if request.Code == "" {
		http.Error(w, "Code is required", http.StatusBadRequest)
		return
	}

	// Get stored secret from database
	var storedSecret string
	err = database.DB.QueryRow("SELECT mfa_secret FROM users WHERE username = ?", username).Scan(&storedSecret)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to get MFA secret: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if storedSecret == "" {
		http.Error(w, "No MFA secret found. Please generate one first.", http.StatusBadRequest)
		return
	}

	// Get MFA config
	cfg, err := mfa.GetMFAConfig()
	if err != nil {
		http.Error(w, "Failed to get MFA configuration: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Backend makes the request to external MFA server to validate the code (not frontend)
	mfaServer := strings.TrimSuffix(cfg.MFAServer, "/")
	validateURL := fmt.Sprintf("%s/mfa/totp/validate", mfaServer)

	requestBody := map[string]string{"code": request.Code}
	jsonBody, _ := json.Marshal(requestBody)

	req, err := http.NewRequest("POST", validateURL, bytes.NewBuffer(jsonBody))
	if err != nil {
		http.Error(w, "Failed to create request: "+err.Error(), http.StatusInternalServerError)
		return
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", cfg.MFAToken))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, "Failed to contact MFA server: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "Failed to read MFA response: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if resp.StatusCode != http.StatusOK {
		http.Error(w, fmt.Sprintf("MFA server returned %s: %s", resp.Status, string(body)), resp.StatusCode)
		return
	}

	var validateResp struct {
		Valid   bool   `json:"valid"`
		Message string `json:"message"`
	}

	if err := json.Unmarshal(body, &validateResp); err != nil {
		http.Error(w, "Failed to parse MFA response: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if !validateResp.Valid {
		http.Error(w, validateResp.Message, http.StatusUnauthorized)
		return
	}

	// Mark secret as validated
	_, err = database.DB.Exec("UPDATE users SET mfa_secret_validated = 1 WHERE username = ?", username)
	if err != nil {
		http.Error(w, "Failed to update MFA secret status: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(validateResp)
}

// HandleMFATOTPEnable handles MFA enablement
// Frontend calls this endpoint, and this handler makes the request to the external MFA server
func HandleMFATOTPEnable(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get username from JWT token
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	username, _, err := security.ValidateJWT(tokenString)
	if err != nil {
		http.Error(w, "Unauthorized: Invalid token", http.StatusUnauthorized)
		return
	}

	// Check if secret is validated
	var secretValidated int
	var storedSecret string
	err = database.DB.QueryRow("SELECT mfa_secret, mfa_secret_validated FROM users WHERE username = ?", username).Scan(&storedSecret, &secretValidated)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to get MFA secret: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if storedSecret == "" || secretValidated == 0 {
		http.Error(w, "MFA secret not validated. Please validate a code first.", http.StatusBadRequest)
		return
	}

	// Get MFA config
	cfg, err := mfa.GetMFAConfig()
	if err != nil {
		http.Error(w, "Failed to get MFA configuration: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Backend makes the request to external MFA server to enable MFA (not frontend)
	mfaServer := strings.TrimSuffix(cfg.MFAServer, "/")
	enableURL := fmt.Sprintf("%s/mfa/totp/enable", mfaServer)

	req, err := http.NewRequest("POST", enableURL, nil)
	if err != nil {
		http.Error(w, "Failed to create request: "+err.Error(), http.StatusInternalServerError)
		return
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", cfg.MFAToken))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, "Failed to contact MFA server: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "Failed to read MFA response: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if resp.StatusCode != http.StatusOK {
		http.Error(w, fmt.Sprintf("MFA server returned %s: %s", resp.Status, string(body)), resp.StatusCode)
		return
	}

	var enableResp struct {
		Enabled     bool     `json:"enabled"`
		Secret      string   `json:"secret"`
		BackupCodes []string `json:"backup_codes"`
		Message     string   `json:"message"`
	}

	if err := json.Unmarshal(body, &enableResp); err != nil {
		http.Error(w, "Failed to parse MFA response: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Enable MFA in database
	_, err = database.DB.Exec("UPDATE users SET mfa_enabled = 1 WHERE username = ?", username)
	if err != nil {
		http.Error(w, "Failed to enable MFA: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Store backup codes (as JSON array)
	backupCodesJSON, _ := json.Marshal(enableResp.BackupCodes)
	_, err = database.DB.Exec("UPDATE users SET mfa_backup_codes = ? WHERE username = ?", string(backupCodesJSON), username)
	if err != nil {
		// Log error but don't fail - backup codes are stored in response
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(enableResp)
}

func getMFASettings(w http.ResponseWriter, _ *http.Request, username string) {
	var mfaEnabled bool
	err := database.DB.QueryRow("SELECT mfa_enabled FROM users WHERE username = ?", username).Scan(&mfaEnabled)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to get MFA settings: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"enabled": mfaEnabled,
	})
}

func updateMFASettings(w http.ResponseWriter, r *http.Request, username string) {
	var request struct {
		Enabled bool `json:"enabled"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// If disabling MFA, notify the external MFA server and update the database
	if !request.Enabled {
		// Get MFA config
		cfg, err := mfa.GetMFAConfig()
		if err != nil {
			http.Error(w, "Failed to get MFA config: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// Disable MFA on external server
		if err := mfa.DisableMFA(cfg); err != nil {
			log.Printf("Warning: Failed to disable MFA on external server: %v", err)
			// Continue anyway - we'll still disable it locally
		}

		// Update local database
		_, err = database.DB.Exec("UPDATE users SET mfa_enabled = 0 WHERE username = ?", username)
		if err != nil {
			http.Error(w, "Failed to disable MFA: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"enabled": false,
			"message": "MFA disabled successfully",
		})
		return
	}

	// If enabling, check if secret is validated
	var secretValidated int
	err := database.DB.QueryRow("SELECT mfa_secret_validated FROM users WHERE username = ?", username).Scan(&secretValidated)
	if err != nil {
		http.Error(w, "Failed to check MFA secret status: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if secretValidated == 0 {
		http.Error(w, "MFA secret not validated. Please complete the setup process first.", http.StatusBadRequest)
		return
	}

	// Enable MFA (actual enablement is done via HandleMFATOTPEnable, this is just for direct toggle)
	_, err = database.DB.Exec("UPDATE users SET mfa_enabled = 1 WHERE username = ?", username)
	if err != nil {
		http.Error(w, "Failed to enable MFA: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Log the MFA setting change
	sessionID := r.Header.Get("X-Session-ID")
	if sessionID == "" {
		// Try to extract from JWT token
		authHeader := r.Header.Get("Authorization")
		if authHeader != "" && len(authHeader) > 7 {
			tokenString := authHeader[7:] // Remove "Bearer "
			_, sessionID, _ = security.ValidateJWT(tokenString)
		}
	}

	// Log the event
	eventType := "MFA_DISABLED"
	if request.Enabled {
		eventType = "MFA_ENABLED"
	}

	database.DB.Exec(`
		INSERT INTO api_audit_logs (
			event_type, method, path, ip_address, user_agent,
			request_headers, request_body, response_status,
			response_body, session_id, created_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
		eventType,
		r.Method,
		r.URL.Path,
		r.RemoteAddr,
		r.UserAgent(),
		"{}",
		"{}",
		200,
		"{}",
		sessionID,
	)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"enabled": request.Enabled,
		"message": "MFA settings updated successfully",
	})
}
