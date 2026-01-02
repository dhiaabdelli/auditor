package handlers

import (
	"net/http"
	"strings"
	"time"

	"network-script-generator/internal/database"
	"network-script-generator/internal/security"
)

// HandleLogout logs a logout event and closes the session
func HandleLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get IP address
	ipAddress := r.RemoteAddr
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		ipAddress = forwarded
	}

	// Get session ID from header first
	sessionID := r.Header.Get("X-Session-ID")
	
	// If not in header, try to extract from JWT token
	if sessionID == "" {
		authHeader := r.Header.Get("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenString := strings.TrimPrefix(authHeader, "Bearer ")
			_, sessionIDFromToken, err := security.ValidateJWT(tokenString)
			if err == nil && sessionIDFromToken != "" {
				sessionID = sessionIDFromToken
			}
		}
	}

	// Close session in database if session ID provided
	if sessionID != "" {
		go func() {
			_, err := database.DB.Exec(`
				UPDATE user_sessions 
				SET logout_at = ?, status = 'inactive',
				    duration_seconds = CAST((julianday(?) - julianday(login_at)) * 86400 AS INTEGER)
				WHERE id = ? AND status = 'active'`,
				time.Now(),
				time.Now(),
				sessionID,
			)
			if err != nil {
				_ = err
			}
		}()
	} else {
		// If no session ID, try to close most recent active session for this IP
		go func() {
			_, err := database.DB.Exec(`
				UPDATE user_sessions 
				SET logout_at = ?, status = 'inactive',
				    duration_seconds = CAST((julianday(?) - julianday(login_at)) * 86400 AS INTEGER)
				WHERE ip_address = ? AND status = 'active'
				ORDER BY login_at DESC
				LIMIT 1`,
				time.Now(),
				time.Now(),
				ipAddress,
			)
			if err != nil {
				_ = err
			}
		}()
	}

	// Log logout event
	security.LogSessionEvent("LOGOUT", ipAddress, r.UserAgent(), "User logged out", true)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"success": true}`))
}

