package security

import (
	"encoding/base64"
	"encoding/json"
	"strings"
	"time"

	"network-script-generator/internal/database"
)

// MarkExpiredSessionsInactive marks sessions as inactive if their JWT tokens have expired
// This should be called periodically or when validating tokens
func MarkExpiredSessionsInactive() {
	go func() {
		// Mark sessions inactive that haven't been updated in the last 25 hours
		// (JWT tokens expire after 24 hours, so 25 hours gives a buffer)
		_, err := database.DB.Exec(`
			UPDATE user_sessions 
			SET logout_at = ?, status = 'inactive',
			    duration_seconds = CAST((julianday(?) - julianday(login_at)) * 86400 AS INTEGER)
			WHERE status = 'active' 
			AND last_activity < datetime('now', '-25 hours')`,
			time.Now(),
			time.Now(),
		)
		if err != nil {
			_ = err
		}
	}()
}

// CloseSessionByID closes a specific session by ID
func CloseSessionByID(sessionID string) {
	if sessionID == "" {
		return
	}
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
}

// extractSessionIDFromToken extracts session ID from JWT token without validation
// This is used when token is expired but we still want to close the session
func extractSessionIDFromToken(tokenString string) string {
	parts := strings.Split(tokenString, ".")
	if len(parts) < 2 {
		return ""
	}
	
	// Decode payload (second part)
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return ""
	}
	
	var claims map[string]interface{}
	if err := json.Unmarshal(payload, &claims); err != nil {
		return ""
	}
	
	if sid, ok := claims["sessionId"].(string); ok {
		return sid
	}
	
	return ""
}

