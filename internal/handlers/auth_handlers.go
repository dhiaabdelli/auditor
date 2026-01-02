package handlers

import (
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"

	"network-script-generator/internal/database"
	"network-script-generator/internal/security"
)

// HandleRegisterUser handles user registration (first time setup)
func HandleRegisterUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate input
	if req.Username == "" || req.Password == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": "Username and password are required",
		})
		return
	}

	if len(req.Username) < 3 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": "Username must be at least 3 characters",
		})
		return
	}

	if len(req.Password) < 8 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": "Password must be at least 8 characters",
		})
		return
	}

	// Check if any user already exists
	var existingCount int
	err := database.DB.QueryRow("SELECT COUNT(*) FROM users").Scan(&existingCount)
	if err != nil && err != sql.ErrNoRows {
		log.Printf("Error checking existing users: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": "Failed to check existing users",
		})
		return
	}

	if existingCount > 0 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": "A user already exists. Please login instead.",
		})
		return
	}

	// Check if username already exists
	var usernameExists int
	err = database.DB.QueryRow("SELECT COUNT(*) FROM users WHERE username = ?", req.Username).Scan(&usernameExists)
	if err != nil && err != sql.ErrNoRows {
		log.Printf("Error checking username: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": "Failed to check username",
		})
		return
	}

	if usernameExists > 0 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": "Username already exists",
		})
		return
	}

	// Generate salt
	saltBytes := make([]byte, 16)
	if _, err := rand.Read(saltBytes); err != nil {
		log.Printf("Error generating salt: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": "Failed to generate salt",
		})
		return
	}
	salt := base64.URLEncoding.EncodeToString(saltBytes)

	// Hash password with bcrypt
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("Error hashing password: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": "Failed to hash password",
		})
		return
	}

	// Store user in database
	_, err = database.DB.Exec(
		"INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)",
		req.Username,
		string(passwordHash),
		salt,
	)
	if err != nil {
		log.Printf("Error creating user: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": "Failed to create user",
		})
		return
	}

	// Log successful registration
	ipAddress := r.RemoteAddr
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		ipAddress = forwarded
	}
	security.LogSessionEvent("REGISTER", ipAddress, r.UserAgent(), "User registered successfully", true)

	// Auto-login after registration
	sessionID := security.LogSessionEvent("LOGIN", ipAddress, r.UserAgent(), "User logged in after registration", true)

	// Generate JWT token (use username as the identifier)
	token, err := security.GenerateJWT(req.Username, sessionID)
	if err != nil {
		log.Printf("Error generating JWT token: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": "Failed to generate authentication token",
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "User created successfully",
		"token":   token,
	})
}

// HandleLoginUser handles user login
func HandleLoginUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate input
	if req.Username == "" || req.Password == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"valid":   false,
			"message": "Username and password are required",
		})
		return
	}

	// Get user from database
	var passwordHash string
	var salt string
	var mfaEnabled bool
	err := database.DB.QueryRow(
		"SELECT password_hash, salt, mfa_enabled FROM users WHERE username = ?",
		req.Username,
	).Scan(&passwordHash, &salt, &mfaEnabled)

	if err == sql.ErrNoRows {
		// Log failed login attempt
		ipAddress := r.RemoteAddr
		if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
			ipAddress = forwarded
		}
		security.LogSessionEvent("LOGIN_FAILED", ipAddress, r.UserAgent(), "Invalid username", false)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"valid":   false,
			"message": "Invalid username or password",
		})
		return
	}

	if err != nil {
		log.Printf("Error retrieving user: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"valid":   false,
			"message": "Failed to validate credentials",
		})
		return
	}

	// Verify password
	err = bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password))
	if err != nil {
		// Log failed login attempt
		ipAddress := r.RemoteAddr
		if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
			ipAddress = forwarded
		}
		security.LogSessionEvent("LOGIN_FAILED", ipAddress, r.UserAgent(), "Invalid password", false)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"valid":   false,
			"message": "Invalid username or password",
		})
		return
	}

	// Log successful password verification
	ipAddress := r.RemoteAddr
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		ipAddress = forwarded
	}

	// If MFA is enabled, return a temporary token and require MFA verification
	if mfaEnabled {
		// Generate a temporary JWT token (short-lived, 5 minutes)
		// This token will be used to create MFA request and verify MFA
		tempSessionID := security.LogSessionEvent("LOGIN_PASSWORD_VERIFIED", ipAddress, r.UserAgent(), "Password verified, MFA required", true)
		
		// Generate temporary token (5 minutes expiry)
		tempToken, err := security.GenerateJWTWithExpiry(req.Username, tempSessionID, 5*time.Minute)
		if err != nil {
			log.Printf("Error generating temporary JWT token: %v", err)
			security.LogSessionEvent("LOGIN_FAILED", ipAddress, r.UserAgent(), "Failed to generate temporary JWT token", false)
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
			"valid":        true,
			"message":      "Password verified. MFA required.",
			"mfa_required": true,
			"temp_token":   tempToken, // Temporary token for MFA verification
		})
		return
	}

	// MFA not enabled, proceed with normal login
	sessionID := security.LogSessionEvent("LOGIN", ipAddress, r.UserAgent(), "User logged in successfully", true)

	// Generate JWT token (use username as the identifier)
	token, err := security.GenerateJWT(req.Username, sessionID)
	if err != nil {
		log.Printf("Error generating JWT token: %v", err)
		security.LogSessionEvent("LOGIN_FAILED", ipAddress, r.UserAgent(), "Failed to generate JWT token", false)
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

// HandleCheckUserExists checks if any user exists (for setup mode)
func HandleCheckUserExists(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var userCount int
	err := database.DB.QueryRow("SELECT COUNT(*) FROM users").Scan(&userCount)
	if err != nil {
		log.Printf("Error checking users: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"exists": false,
			"error":  "Failed to check users",
		})
		return
	}

	exists := userCount > 0

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"exists": exists,
	})
}

// HandleValidateToken validates a JWT token
// This endpoint requires authentication (via middleware) and just returns 200 if valid, 401 if invalid
func HandleValidateToken(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract token from Authorization header
	authHeader := r.Header.Get("Authorization")
	var tokenString string
	if strings.HasPrefix(authHeader, "Bearer ") {
		tokenString = strings.TrimPrefix(authHeader, "Bearer ")
	}

	// If no Bearer token, try X-API-Key header (for backward compatibility)
	if tokenString == "" {
		tokenString = r.Header.Get("X-API-Key")
	}

	// If still no token, try query parameter
	if tokenString == "" {
		tokenString = r.URL.Query().Get("api_key")
	}

	// If we reach here, the middleware has already validated the token
	// Return success with the token
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"valid": true,
		"token": tokenString,
	})
}
