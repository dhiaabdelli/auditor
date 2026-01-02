package security

import (
	"bytes"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	"network-script-generator/internal/database"
)

// AuditResponseWriter wrapper to capture response body
type AuditResponseWriter struct {
	http.ResponseWriter
	statusCode int
	body       *bytes.Buffer
}

func newAuditResponseWriter(w http.ResponseWriter) *AuditResponseWriter {
	return &AuditResponseWriter{
		ResponseWriter: w,
		statusCode:     http.StatusOK,
		body:           &bytes.Buffer{},
	}
}

func (rw *AuditResponseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func (rw *AuditResponseWriter) Write(b []byte) (int, error) {
	rw.body.Write(b)
	return rw.ResponseWriter.Write(b)
}

// AuditMiddleware logs all API calls to the database
func AuditMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip logging for static files and WebSocket connections
		if strings.HasPrefix(r.URL.Path, "/static/") ||
			strings.HasPrefix(r.URL.Path, "/ws/") ||
			r.URL.Path == "/" ||
			r.URL.Path == "/favicon.ico" {
			next.ServeHTTP(w, r)
			return
		}

		startTime := time.Now()

		// Capture request body
		var requestBody []byte
		if r.Body != nil {
			requestBody, _ = io.ReadAll(r.Body)
			r.Body = io.NopCloser(bytes.NewBuffer(requestBody))
		}

		// Capture response
		rw := newAuditResponseWriter(w)

		// Process request
		next.ServeHTTP(rw, r)

		// Calculate response time
		responseTime := time.Since(startTime)

		// Get IP address
		ipAddress := getClientIP(r)

		// Get user agent
		userAgent := r.UserAgent()

		// Capture request headers (excluding sensitive data)
		requestHeaders := make(map[string]string)
		for key, values := range r.Header {
			lowerKey := strings.ToLower(key)
			// Skip sensitive headers
			if lowerKey == "authorization" || lowerKey == "cookie" || lowerKey == "x-api-key" {
				requestHeaders[key] = "[REDACTED]"
			} else {
				requestHeaders[key] = strings.Join(values, ", ")
			}
		}
		headersJSON, _ := json.Marshal(requestHeaders)

		// Limit request/response body size (first 10KB)
		requestBodyStr := string(requestBody)
		if len(requestBodyStr) > 10000 {
			requestBodyStr = requestBodyStr[:10000] + "... [truncated]"
		}

		responseBodyStr := rw.body.String()
		if len(responseBodyStr) > 10000 {
			responseBodyStr = responseBodyStr[:10000] + "... [truncated]"
		}

		// Get session ID from request header or cookie
		sessionID := r.Header.Get("X-Session-ID")
		if sessionID == "" {
			// Try to get from cookie
			cookie, err := r.Cookie("session_id")
			if err == nil && cookie != nil {
				sessionID = cookie.Value
			}
		}

		// Log to database asynchronously to avoid blocking
		go func() {
			_, err := database.DB.Exec(`
				INSERT INTO api_audit_logs (
					event_type, method, path, ip_address, user_agent,
					request_headers, request_body,
					response_status, response_body,
					response_time_ms, session_id, created_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				"API_CALL",
				r.Method,
				r.URL.Path,
				ipAddress,
				userAgent,
				string(headersJSON),
				requestBodyStr,
				rw.statusCode,
				responseBodyStr,
				int(responseTime.Milliseconds()),
				sessionID,
				startTime,
			)
			if err != nil {
				// Log error but don't fail the request
				// Use standard log package for errors
				_ = err
			}

			// Update session last activity if session ID exists
			if sessionID != "" {
				UpdateSessionActivity(sessionID, ipAddress)
			}
		}()
	})
}

// getClientIP extracts the client IP address from the request
func getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header (for proxies/load balancers)
	forwarded := r.Header.Get("X-Forwarded-For")
	if forwarded != "" {
		// Take the first IP in the chain
		ips := strings.Split(forwarded, ",")
		if len(ips) > 0 {
			return strings.TrimSpace(ips[0])
		}
	}

	// Check X-Real-IP header
	realIP := r.Header.Get("X-Real-IP")
	if realIP != "" {
		return realIP
	}

	// Fall back to RemoteAddr
	ip := r.RemoteAddr
	if idx := strings.LastIndex(ip, ":"); idx != -1 {
		ip = ip[:idx]
	}
	return ip
}

// APIAuditLog represents an API audit log entry
type APIAuditLog struct {
	ID            int64                  `json:"id"`
	EventType     string                 `json:"eventType"`
	Method        string                 `json:"method"`
	Path          string                 `json:"path"`
	IPAddress     string                 `json:"ipAddress"`
	UserAgent     string                 `json:"userAgent"`
	RequestHeaders map[string]string     `json:"requestHeaders"`
	RequestBody   string                 `json:"requestBody"`
	ResponseStatus int                    `json:"responseStatus"`
	ResponseBody  string                 `json:"responseBody"`
	ResponseTimeMs int                    `json:"responseTimeMs"`
	ErrorMessage  sql.NullString         `json:"errorMessage,omitempty"`
	EventDescription string              `json:"eventDescription,omitempty"`
	SessionID     sql.NullString         `json:"sessionId,omitempty"`
	CreatedAt     time.Time              `json:"createdAt"`
}

// UserSession represents a user session
type UserSession struct {
	ID            string    `json:"id"`
	IPAddress     string    `json:"ipAddress"`
	UserAgent     string    `json:"userAgent"`
	LoginAt       time.Time `json:"loginAt"`
	LogoutAt      sql.NullTime `json:"logoutAt,omitempty"`
	LastActivity  time.Time `json:"lastActivity"`
	DurationSeconds sql.NullInt64 `json:"durationSeconds,omitempty"`
	Status        string    `json:"status"`
	CreatedAt     time.Time `json:"createdAt"`
}

// LogSessionEvent logs a session event (login, logout, etc.)
func LogSessionEvent(eventType, ipAddress, userAgent, description string, success bool) string {
	sessionID := ""
	if eventType == "LOGIN" && success {
		// Generate session ID
		sessionID = generateSessionID()
		
		// Create session record
		go func() {
			_, err := database.DB.Exec(`
				INSERT INTO user_sessions (
					id, ip_address, user_agent, login_at, last_activity, status
				) VALUES (?, ?, ?, ?, ?, ?)`,
				sessionID,
				ipAddress,
				userAgent,
				time.Now(),
				time.Now(),
				"active",
			)
			if err != nil {
				_ = err
			}
		}()
	} else if eventType == "LOGOUT" {
		// Try to get session ID from description or find active session
		// For now, we'll update the most recent active session for this IP
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
	
	go func() {
		var statusCode int
		if success {
			statusCode = 200
		} else {
			statusCode = 401
		}
		
		_, err := database.DB.Exec(`
			INSERT INTO api_audit_logs (
				event_type, ip_address, user_agent,
				response_status, event_description, session_id, created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?)`,
			eventType,
			ipAddress,
			userAgent,
			statusCode,
			description,
			sessionID,
			time.Now(),
		)
		if err != nil {
			_ = err
		}
	}()
	
	return sessionID
}

// generateSessionID generates a unique session ID
func generateSessionID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return "sess_" + base64.URLEncoding.EncodeToString(b)
}

// UpdateSessionActivity updates the last activity time for a session
func UpdateSessionActivity(sessionID, ipAddress string) {
	go func() {
		_, err := database.DB.Exec(`
			UPDATE user_sessions 
			SET last_activity = ?
			WHERE id = ? OR (ip_address = ? AND status = 'active')
			ORDER BY login_at DESC
			LIMIT 1`,
			time.Now(),
			sessionID,
			ipAddress,
		)
		if err != nil {
			_ = err
		}
	}()
}

