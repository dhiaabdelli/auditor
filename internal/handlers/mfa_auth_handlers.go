package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"network-script-generator/internal/mfa"
	"network-script-generator/internal/security"
)

// HandleMFALoginRequest creates an MFA request for login
func HandleMFALoginRequest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get username from temporary JWT token
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	_, _, err := security.ValidateJWT(tokenString)
	if err != nil {
		http.Error(w, "Unauthorized: Invalid token", http.StatusUnauthorized)
		return
	}

	// Get MFA config
	cfg, err := mfa.GetMFAConfig()
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to get MFA configuration: " + err.Error()})
		return
	}

	// Call MFA server to create MFA request
	mfaServer := strings.TrimSuffix(cfg.MFAServer, "/")
	requestURL := fmt.Sprintf("%s/mfa/request", mfaServer)

	req, err := http.NewRequest("POST", requestURL, nil)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create request: " + err.Error()})
		return
	}

	// Use embedded token for server authentication
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", cfg.MFAToken))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error":   "Failed to contact MFA server",
			"details": err.Error(),
		})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to read MFA response: " + err.Error()})
		return
	}

	if resp.StatusCode != http.StatusOK {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		json.NewEncoder(w).Encode(map[string]string{
			"error":   fmt.Sprintf("MFA server returned %s", resp.Status),
			"details": string(body),
		})
		return
	}

	var mfaResp struct {
		MFARequestID int `json:"mfa_request_id"`
		ExpiresIn    int `json:"expires_in"`
	}

	if err := json.Unmarshal(body, &mfaResp); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error":   "Failed to parse MFA response",
			"details": err.Error(),
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(mfaResp)
}

// HandleMFAStatus polls the status of an MFA request
func HandleMFAStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract MFA request ID from URL path
	// Expected format: /api/auth/mfa/status/:id
	pathParts := strings.Split(r.URL.Path, "/")
	var mfaRequestID string
	for i, part := range pathParts {
		if part == "status" && i+1 < len(pathParts) {
			mfaRequestID = pathParts[i+1]
			break
		}
	}

	if mfaRequestID == "" {
		http.Error(w, "MFA request ID is required", http.StatusBadRequest)
		return
	}

	// Get MFA config
	cfg, err := mfa.GetMFAConfig()
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to get MFA configuration: " + err.Error()})
		return
	}

	// Call MFA server to get status (no auth required for this endpoint)
	mfaServer := strings.TrimSuffix(cfg.MFAServer, "/")
	statusURL := fmt.Sprintf("%s/mfa/status/%s", mfaServer, mfaRequestID)

	req, err := http.NewRequest("GET", statusURL, nil)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create request: " + err.Error()})
		return
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error":   "Failed to contact MFA server",
			"details": err.Error(),
		})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to read MFA response: " + err.Error()})
		return
	}

	if resp.StatusCode != http.StatusOK {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		json.NewEncoder(w).Encode(map[string]string{
			"error":   fmt.Sprintf("MFA server returned %s", resp.Status),
			"details": string(body),
		})
		return
	}

	// Return the response as-is (status: "pending" | "approved" | "denied" | "expired")
	w.Header().Set("Content-Type", "application/json")
	w.Write(body)
}

// HandleMFATOTPVerify verifies a TOTP code for MFA login
func HandleMFATOTPVerify(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get username from temporary JWT token
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	_, _, err := security.ValidateJWT(tokenString)
	if err != nil {
		http.Error(w, "Unauthorized: Invalid token", http.StatusUnauthorized)
		return
	}

	var request struct {
		MFARequestID int    `json:"mfa_request_id"`
		Code         string `json:"code"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if request.MFARequestID == 0 {
		http.Error(w, "mfa_request_id is required", http.StatusBadRequest)
		return
	}

	if request.Code == "" {
		http.Error(w, "code is required", http.StatusBadRequest)
		return
	}

	// Get MFA config
	cfg, err := mfa.GetMFAConfig()
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to get MFA configuration: " + err.Error()})
		return
	}

	// Call MFA server to verify TOTP code
	mfaServer := strings.TrimSuffix(cfg.MFAServer, "/")
	verifyURL := fmt.Sprintf("%s/mfa/totp/verify", mfaServer)

	requestBody := map[string]interface{}{
		"mfa_request_id": request.MFARequestID,
		"code":           request.Code,
	}
	jsonBody, _ := json.Marshal(requestBody)

	req, err := http.NewRequest("POST", verifyURL, bytes.NewBuffer(jsonBody))
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create request: " + err.Error()})
		return
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", cfg.MFAToken))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error":   "Failed to contact MFA server",
			"details": err.Error(),
		})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to read MFA response: " + err.Error()})
		return
	}

	if resp.StatusCode != http.StatusOK {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		json.NewEncoder(w).Encode(map[string]string{
			"error":   fmt.Sprintf("MFA server returned %s", resp.Status),
			"details": string(body),
		})
		return
	}

	// Return the response as-is
	w.Header().Set("Content-Type", "application/json")
	w.Write(body)
}

// HandleMFAComplete completes the login after MFA is approved
func HandleMFAComplete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get username from temporary JWT token
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

	// Generate final JWT token (24 hour expiration)
	ipAddress := r.RemoteAddr
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		ipAddress = forwarded
	}
	sessionID := security.LogSessionEvent("LOGIN", ipAddress, r.UserAgent(), "User logged in successfully with MFA", true)

	token, err := security.GenerateJWT(username, sessionID)
	if err != nil {
		log.Printf("Error generating JWT token: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"valid":   false,
			"message": "Failed to generate authentication token",
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"valid":   true,
		"message": "Login successful",
		"token":   token,
	})
}
