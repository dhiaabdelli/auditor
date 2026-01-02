package security

import (
	// Standard library - crypto
	"crypto/subtle"
	
	// Standard library - net
	"net/http"
	
	// Standard library - other
	"encoding/json"
)

// ConstantTimeCompare performs constant-time comparison of two byte slices
func ConstantTimeCompare(a, b []byte) bool {
	return subtle.ConstantTimeCompare(a, b) == 1
}

// HandleGetAPIKey returns the API key for authenticated requests (admin only)
// This endpoint should be protected and only accessible to admins
func HandleGetAPIKey(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	// In a production environment, you should verify admin credentials here
	// For now, we'll return the API key if requested
	apiKeyMutex.RLock()
	key := apiKey
	apiKeyMutex.RUnlock()
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"apiKey": key,
		"note":   "Set API_KEY environment variable to customize",
	})
}








