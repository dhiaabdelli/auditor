package security

import (
	// Standard library - crypto
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"

	// Standard library - net
	"net/http"

	// Standard library - other
	"fmt"
	"log"
	"math"
	"os"
	"strings"
	"sync"
	"time"

	// Internal packages
	"network-script-generator/internal/database"
)

// Security configuration
var (
	apiKey       string
	apiKeyMutex  sync.RWMutex
	rateLimiter  *RateLimiter
	securityInit sync.Once
)

// RateLimiter provides rate limiting functionality
type RateLimiter struct {
	requests map[string][]time.Time
	mu       sync.RWMutex
	maxReqs  int
	window   time.Duration
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(maxRequests int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		requests: make(map[string][]time.Time),
		maxReqs:  maxRequests,
		window:   window,
	}
	// Cleanup old entries periodically
	go rl.cleanup()
	return rl
}

func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		rl.mu.Lock()
		now := time.Now()
		for ip, times := range rl.requests {
			valid := []time.Time{}
			for _, t := range times {
				if now.Sub(t) < rl.window {
					valid = append(valid, t)
				}
			}
			if len(valid) == 0 {
				delete(rl.requests, ip)
			} else {
				rl.requests[ip] = valid
			}
		}
		rl.mu.Unlock()
	}
}

func (rl *RateLimiter) Allow(identifier string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	times := rl.requests[identifier]

	// Remove old requests outside the window
	valid := []time.Time{}
	for _, t := range times {
		if now.Sub(t) < rl.window {
			valid = append(valid, t)
		}
	}

	if len(valid) >= rl.maxReqs {
		return false
	}

	valid = append(valid, now)
	rl.requests[identifier] = valid
	return true
}

// InitializeSecurity initializes security features
func InitializeSecurity() {
	securityInit.Do(func() {
		// Try to load API key from database (encrypted)
		storedKey, _, err := GetStoredAPIKey()
		if err != nil {
			log.Printf("Warning: Failed to load API key from database: %v", err)
		}

		// Fallback to environment variable if database key not available
		key := os.Getenv("API_KEY")
		if key == "" && storedKey != "" {
			key = storedKey
		} else if key == "" {
			// Generate a secure random API key (will be stored in database on first use)
			keyBytes := make([]byte, 32)
			if _, err := rand.Read(keyBytes); err != nil {
				log.Fatal("Failed to generate API key:", err)
			}
			key = base64.URLEncoding.EncodeToString(keyBytes)
			// Don't log the actual API key for security
			log.Println("Generated API key (will be stored in database)")
		}

		apiKeyMutex.Lock()
		apiKey = key
		apiKeyMutex.Unlock()

		// Initialize rate limiter: unlimited requests (effectively infinity)
		rateLimiter = NewRateLimiter(math.MaxInt, 1*time.Minute)

		log.Println("Security middleware initialized")
	})
}

// GetAPIKey returns the current API key (for testing/admin purposes)
func GetAPIKey() string {
	apiKeyMutex.RLock()
	defer apiKeyMutex.RUnlock()
	return apiKey
}

// SecurityHeaders adds security headers to responses
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Prevent clickjacking
		w.Header().Set("X-Frame-Options", "DENY")
		// Prevent MIME type sniffing
		w.Header().Set("X-Content-Type-Options", "nosniff")
		// XSS Protection
		w.Header().Set("X-XSS-Protection", "1; mode=block")
		// Strict Transport Security (HSTS) - only if HTTPS
		if r.TLS != nil {
			w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		// Content Security Policy
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://api.qrserver.com; font-src 'self' data:;")
		// Referrer Policy
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		// Permissions Policy
		w.Header().Set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")

		next.ServeHTTP(w, r)
	})
}

// CORS handles Cross-Origin Resource Sharing
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		// Allow requests from same origin or configured origins
		allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
		if allowedOrigins == "" {
			allowedOrigins = "*" // Default: allow all (for development)
		}

		if allowedOrigins == "*" || strings.Contains(allowedOrigins, origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Max-Age", "3600")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// RateLimitMiddleware enforces rate limiting
func RateLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		InitializeSecurity()

		// Skip rate limiting for security/auth endpoints (API key setup, validation, status, user check)
		// These are needed for initial setup and login, so they should be more permissive
		if strings.HasPrefix(r.URL.Path, "/api/security/api-key") ||
			strings.HasPrefix(r.URL.Path, "/api/security/validate-key") ||
			strings.HasPrefix(r.URL.Path, "/api/auth/check") {
			next.ServeHTTP(w, r)
			return
		}

		identifier := getClientIdentifier(r)

		if !rateLimiter.Allow(identifier) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusTooManyRequests)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "Rate limit exceeded. Please try again later.",
			})
			return
		}

		next.ServeHTTP(w, r)
	})
}

// AuthenticateAPIKey validates API key from request
func AuthenticateAPIKey(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		InitializeSecurity()

		// Skip authentication for static files, health checks, and security/auth endpoints
		if strings.HasPrefix(r.URL.Path, "/static/") ||
			r.URL.Path == "/" ||
			r.URL.Path == "/health" ||
			r.URL.Path == "/favicon.ico" ||
			strings.HasPrefix(r.URL.Path, "/api/security/api-key") ||
			strings.HasPrefix(r.URL.Path, "/api/security/validate-key") ||
			strings.HasPrefix(r.URL.Path, "/api/auth/register") ||
			strings.HasPrefix(r.URL.Path, "/api/auth/login") ||
			strings.HasPrefix(r.URL.Path, "/api/auth/check") {
			next.ServeHTTP(w, r)
			return
		}

		// Try to get JWT token from Authorization header first
		authHeader := r.Header.Get("Authorization")
		var tokenString string
		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenString = strings.TrimPrefix(authHeader, "Bearer ")
		}

		// If no Bearer token, try X-API-Key header (for backward compatibility or direct API key)
		if tokenString == "" {
			tokenString = r.Header.Get("X-API-Key")
		}

		// If still no token, try query parameter
		if tokenString == "" {
			tokenString = r.URL.Query().Get("api_key")
		}

		if tokenString == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "Unauthorized: Missing authentication token",
			})
			return
		}

		// Try to validate as JWT token first
		apiKeyFromToken, sessionID, err := ValidateJWT(tokenString)
		if err == nil {
			// Check if the value from token is a username (exists in users table)
			var usernameExists int
			err := database.DB.QueryRow("SELECT COUNT(*) FROM users WHERE username = ?", apiKeyFromToken).Scan(&usernameExists)
			if err == nil && usernameExists > 0 {
				// Valid username-based token, proceed
				next.ServeHTTP(w, r)
				return
			}

			// If not a username, try to validate as API key (backward compatibility)
			validKey := ""
			storedKey, _, err := GetStoredAPIKey()
			if err == nil && storedKey != "" {
				validKey = storedKey
			} else {
				// Fallback to in-memory key
				apiKeyMutex.RLock()
				validKey = apiKey
				apiKeyMutex.RUnlock()
			}

			// Validate API key from token matches stored key
			if validKey == "" || subtle.ConstantTimeCompare([]byte(apiKeyFromToken), []byte(validKey)) != 1 {
				// Invalid token - close session if we have session ID
				if sessionID != "" {
					CloseSessionByID(sessionID)
				}
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				json.NewEncoder(w).Encode(map[string]string{
					"error": "Unauthorized: Invalid token",
				})
				return
			}

			// Token is valid, proceed
			next.ServeHTTP(w, r)
			return
		} else {
			// Token validation failed (might be expired) - try to extract session ID from expired token
			// Parse token without validation to extract claims
			if sessionID == "" {
				sessionID = extractSessionIDFromToken(tokenString)
			}
			if sessionID != "" {
				CloseSessionByID(sessionID)
			}
		}

		// If JWT validation failed, try as direct API key (backward compatibility)
		providedKey := tokenString

		// Get API key from database (encrypted) or fallback to in-memory key
		validKey := ""
		storedKey, _, err2 := GetStoredAPIKey()
		if err2 == nil && storedKey != "" {
			validKey = storedKey
		} else {
			// Fallback to in-memory key
			apiKeyMutex.RLock()
			validKey = apiKey
			apiKeyMutex.RUnlock()
		}

		// Constant-time comparison to prevent timing attacks
		if providedKey == "" || validKey == "" || subtle.ConstantTimeCompare([]byte(providedKey), []byte(validKey)) != 1 {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "Unauthorized: Invalid or missing API key",
			})
			return
		}

		next.ServeHTTP(w, r)
	})
}

// RequestLogging logs HTTP requests (disabled by default, enable with ENABLE_REQUEST_LOGGING=true)
func RequestLogging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Check if request logging is enabled
		enableLogging := os.Getenv("ENABLE_REQUEST_LOGGING") == "true"

		// Skip logging for health checks and static files
		if r.URL.Path == "/health" || strings.HasPrefix(r.URL.Path, "/static/") {
			next.ServeHTTP(w, r)
			return
		}

		start := time.Now()

		// Create a response writer wrapper to capture status code
		rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		// Serve the request
		next.ServeHTTP(rw, r)

		// Only log if explicitly enabled
		if enableLogging {
			duration := time.Since(start)

			// Sanitize path to remove sensitive query parameters
			sanitizedPath := r.URL.Path
			if r.URL.RawQuery != "" {
				// Remove sensitive query parameters
				query := r.URL.Query()
				for key := range query {
					lowerKey := strings.ToLower(key)
					if strings.Contains(lowerKey, "key") ||
						strings.Contains(lowerKey, "token") ||
						strings.Contains(lowerKey, "password") ||
						strings.Contains(lowerKey, "secret") ||
						strings.Contains(lowerKey, "auth") {
						query.Del(key)
					}
				}
				if len(query) > 0 {
					sanitizedPath += "?" + query.Encode()
				}
			}

			// Sanitize user agent (only show browser name, not full version)
			userAgent := sanitizeUserAgent(r.UserAgent())

			log.Printf("[%s] %s %s %d %v %s",
				r.RemoteAddr,
				r.Method,
				sanitizedPath,
				rw.statusCode,
				duration,
				userAgent,
			)
		}
		// If logging is disabled, just serve the request (already done above)
	})
}

// sanitizeUserAgent sanitizes user agent string to show only browser name
func sanitizeUserAgent(ua string) string {
	if ua == "" {
		return "Unknown"
	}

	// Extract just the browser name, not full version details
	ua = strings.ToLower(ua)
	if strings.Contains(ua, "chrome") {
		return "Chrome"
	} else if strings.Contains(ua, "firefox") {
		return "Firefox"
	} else if strings.Contains(ua, "safari") && !strings.Contains(ua, "chrome") {
		return "Safari"
	} else if strings.Contains(ua, "edge") {
		return "Edge"
	} else if strings.Contains(ua, "opera") {
		return "Opera"
	}

	return "Other"
}

// InputValidation validates and sanitizes input
func InputValidation(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Check for potentially dangerous patterns in URL and headers
		dangerousPatterns := []string{
			"<script",
			"javascript:",
			"onerror=",
			"onload=",
			"../",
			"..\\",
		}

		// Check URL path
		path := strings.ToLower(r.URL.Path)
		for _, pattern := range dangerousPatterns {
			if strings.Contains(path, pattern) {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusBadRequest)
				json.NewEncoder(w).Encode(map[string]string{
					"error": "Invalid request: potentially dangerous input detected",
				})
				return
			}
		}

		// Check query parameters
		for key, values := range r.URL.Query() {
			for _, value := range values {
				lowerValue := strings.ToLower(value)
				for _, pattern := range dangerousPatterns {
					if strings.Contains(lowerValue, pattern) {
						w.Header().Set("Content-Type", "application/json")
						w.WriteHeader(http.StatusBadRequest)
						json.NewEncoder(w).Encode(map[string]string{
							"error": fmt.Sprintf("Invalid request: dangerous input in parameter '%s'", key),
						})
						return
					}
				}
			}
		}

		next.ServeHTTP(w, r)
	})
}

// Helper functions

func getClientIdentifier(r *http.Request) string {
	// Try to get real IP from X-Forwarded-For or X-Real-IP headers
	ip := r.Header.Get("X-Forwarded-For")
	if ip == "" {
		ip = r.Header.Get("X-Real-IP")
	}
	if ip == "" {
		ip = strings.Split(r.RemoteAddr, ":")[0]
	}
	return ip
}

// responseWriter wraps http.ResponseWriter to capture status code
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// ChainMiddleware chains multiple middleware functions
func ChainMiddleware(handler http.Handler, middlewares ...func(http.Handler) http.Handler) http.Handler {
	for i := len(middlewares) - 1; i >= 0; i-- {
		handler = middlewares[i](handler)
	}
	return handler
}
