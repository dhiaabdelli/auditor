package handlers

import (
	// Standard library - encoding
	"encoding/json"

	// Standard library - net
	"net/http"

	// Standard library - other
	"log"

	// Internal packages
	"network-script-generator/internal/security"
)

// HandleGetAPIKeyForSetup returns the API key only once (first time setup)
func HandleGetAPIKeyForSetup(w http.ResponseWriter, r *http.Request) {
	// Allow both GET and POST (POST to mark as shown)
	if r.Method == http.MethodPost {
		// Mark API key as shown
		if err := security.MarkAPIKeyAsShown(); err != nil {
			log.Printf("Warning: Failed to mark API key as shown: %v", err)
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": "API key marked as shown",
		})
		return
	}

	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Initialize API key if needed (generates if doesn't exist)
	apiKey, shownOnce, err := security.InitializeAPIKeyIfNeeded()
	if err != nil {
		log.Printf("Error initializing API key: %v", err)
		http.Error(w, "Failed to initialize API key", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	// If already shown, don't return the key
	if shownOnce {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"key":       "",
			"shownOnce": true,
			"message":   "API key has already been displayed. Please use the key you saved during initial setup.",
		})
		return
	}

	// Don't mark as shown yet - let the user see it first, then mark when they confirm
	// The key will be marked as shown when user clicks "I've Saved My Key"

	// Return the key (only time it will be shown)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"key":       apiKey,
		"shownOnce": false,
		"message":   "IMPORTANT: Save this API key now. You will not be able to see it again!",
	})
}

// HandleValidateAPIKey validates an API key for login
func HandleValidateAPIKey(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		APIKey string `json:"apiKey"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Get the stored API key from database
	storedKey, _, err := security.GetStoredAPIKey()
	if err != nil {
		log.Printf("Error retrieving API key: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"valid":   false,
			"message": "Failed to validate API key",
		})
		return
	}

	if storedKey == "" {
		// No key stored yet, initialize one
		apiKey, _, err := security.InitializeAPIKeyIfNeeded()
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"valid":   false,
				"message": "Failed to initialize API key",
			})
			return
		}
		storedKey = apiKey
	}

	// Constant-time comparison to prevent timing attacks
	providedKey := req.APIKey
	isValid := providedKey != "" && security.ConstantTimeCompare([]byte(providedKey), []byte(storedKey))

	w.Header().Set("Content-Type", "application/json")
	if isValid {
		// Log successful login and get session ID
		ipAddress := r.RemoteAddr
		if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
			ipAddress = forwarded
		}
		sessionID := security.LogSessionEvent("LOGIN", ipAddress, r.UserAgent(), "User logged in successfully", true)
		
		// Generate JWT token with session ID included
		token, err := security.GenerateJWT(providedKey, sessionID)
		if err != nil {
			log.Printf("Error generating JWT token: %v", err)
			// Log failed login attempt
			security.LogSessionEvent("LOGIN_FAILED", ipAddress, r.UserAgent(), "Failed to generate JWT token", false)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"valid":   false,
				"message": "Failed to generate authentication token",
			})
			return
		}
		
		// Return token (session ID is included in token)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"valid":   true,
			"message": "API key is valid",
			"token":   token,
		})
		return

	} else {
		// Log failed login attempt
		ipAddress := r.RemoteAddr
		if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
			ipAddress = forwarded
		}
		security.LogSessionEvent("LOGIN_FAILED", ipAddress, r.UserAgent(), "Invalid API key provided", false)
		
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"valid":   false,
			"message": "Invalid API key",
		})
	}
}

// HandleCheckAPIKeyStatus checks if API key exists and if it's been shown
func HandleCheckAPIKeyStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	_, shownOnce, err := security.GetStoredAPIKey()
	if err != nil {
		log.Printf("Error checking API key status: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"exists": false,
			"error":  "Failed to check API key status",
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"exists":    true,
		"shownOnce": shownOnce,
	})
}


