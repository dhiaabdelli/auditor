package handlers

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"log"
	"net/http"
)

// HandleGenerateRSAKeyPair generates an RSA key pair and returns PEM-encoded keys
func HandleGenerateRSAKeyPair(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get bits from query parameter or default to 2048
	bits := 2048
	if r.URL.Query().Get("bits") != "" {
		var err error
		bits, err = parseInt(r.URL.Query().Get("bits"))
		if err != nil || (bits != 1024 && bits != 2048 && bits != 4096) {
			bits = 2048
		}
	}

	// Generate RSA key pair
	privateKey, err := rsa.GenerateKey(rand.Reader, bits)
	if err != nil {
		log.Printf("Error generating RSA key: %v", err)
		http.Error(w, "Failed to generate RSA key pair: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Encode private key to PEM format
	privateKeyDER := x509.MarshalPKCS1PrivateKey(privateKey)
	privateKeyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: privateKeyDER,
	})

	// Encode public key to PEM format
	publicKeyDER, err := x509.MarshalPKIXPublicKey(&privateKey.PublicKey)
	if err != nil {
		log.Printf("Error marshaling public key: %v", err)
		http.Error(w, "Failed to encode public key: "+err.Error(), http.StatusInternalServerError)
		return
	}

	publicKeyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: publicKeyDER,
	})

	// Return JSON response
	response := map[string]string{
		"publicKey":  string(publicKeyPEM),
		"privateKey": string(privateKeyPEM),
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}

// Helper function to parse integer from string
func parseInt(s string) (int, error) {
	var result int
	_, err := fmt.Sscanf(s, "%d", &result)
	return result, err
}

