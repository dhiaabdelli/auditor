package security

import (
	// Standard library - crypto
	"crypto/sha256"

	// Standard library - other
	"errors"
	"fmt"
	"os"
	"sync"
	"time"

	// Third-party packages
	"github.com/golang-jwt/jwt/v5"
)

var (
	jwtSecret     []byte
	jwtSecretOnce sync.Once
)

// GetJWTSecret gets or generates a JWT secret key
func GetJWTSecret() []byte {
	jwtSecretOnce.Do(func() {
		// Try to get from environment variable first
		secret := os.Getenv("JWT_SECRET")
		if secret != "" {
			jwtSecret = []byte(secret)
			return
		}

		// Generate a secret based on machine-specific data (consistent across restarts)
		hostname, _ := os.Hostname()
		salt := []byte("jwt-secret-salt-v1")
		hash := sha256.Sum256(append([]byte(hostname), salt...))
		jwtSecret = hash[:]
	})
	return jwtSecret
}

// GenerateJWT generates a JWT token for a user (24 hour expiration)
func GenerateJWT(apiKey string, sessionID string) (string, error) {
	return GenerateJWTWithExpiry(apiKey, sessionID, 24*time.Hour)
}

// GenerateJWTWithExpiry generates a JWT token for a user with custom expiration
func GenerateJWTWithExpiry(apiKey string, sessionID string, expiry time.Duration) (string, error) {
	secret := GetJWTSecret()

	// Create token with claims
	claims := jwt.MapClaims{
		"apiKey": apiKey,                          // Store hashed API key in token
		"exp":    time.Now().Add(expiry).Unix(),    // Custom expiration
		"iat":    time.Now().Unix(),
		"iss":    "dhia-control-tower",
	}
	
	// Include session ID if provided
	if sessionID != "" {
		claims["sessionId"] = sessionID
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Sign token with secret
	tokenString, err := token.SignedString(secret)
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, nil
}

// JWTClaims represents the claims extracted from a JWT token
type JWTClaims struct {
	APIKey    string
	SessionID string
}

// ValidateJWT validates a JWT token and returns the API key and session ID
func ValidateJWT(tokenString string) (string, string, error) {
	secret := GetJWTSecret()

	// Parse token
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Validate signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return secret, nil
	})

	if err != nil {
		return "", "", fmt.Errorf("failed to parse token: %w", err)
	}

	// Validate token
	if !token.Valid {
		return "", "", errors.New("invalid token")
	}

	// Extract claims
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", "", errors.New("invalid token claims")
	}

	// Get API key from claims
	apiKey, ok := claims["apiKey"].(string)
	if !ok {
		return "", "", errors.New("apiKey not found in token claims")
	}

	// Get session ID from claims (optional)
	sessionID := ""
	if sid, ok := claims["sessionId"].(string); ok {
		sessionID = sid
	}

	return apiKey, sessionID, nil
}

// ValidateJWTLegacy validates a JWT token and returns only the API key (for backward compatibility)
func ValidateJWTLegacy(tokenString string) (string, error) {
	apiKey, _, err := ValidateJWT(tokenString)
	return apiKey, err
}

// RefreshJWT generates a new JWT token (refresh token logic)
func RefreshJWT(oldTokenString string) (string, error) {
	// Validate old token first
	apiKey, sessionID, err := ValidateJWT(oldTokenString)
	if err != nil {
		return "", err
	}

	// Generate new token with same session ID
	return GenerateJWT(apiKey, sessionID)
}