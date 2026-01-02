package security

import (
	// Standard library - crypto
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	
	// Standard library - database
	"database/sql"
	
	// Standard library - encoding
	"encoding/base64"
	
	// Standard library - other
	"fmt"
	"log"
	"os"
	
	// Third-party packages
	"golang.org/x/crypto/pbkdf2"
	
	// Internal packages
	"network-script-generator/internal/database"
)

// GetMasterKey derives a master encryption key from machine-specific data
func GetMasterKey() []byte {
	// Use hostname and a hardcoded salt to create a consistent master key
	hostname, _ := os.Hostname()
	salt := []byte("api-key-master-salt-v1") // Hardcoded salt for consistency
	// Use PBKDF2 to derive a 32-byte key
	return pbkdf2.Key([]byte(hostname), salt, 10000, 32, sha256.New)
}

// EncryptAPIKey encrypts an API key using the master key
func EncryptAPIKey(apiKey string) (string, string, error) {
	// Generate random salt for this specific encryption
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", "", err
	}
	
	// Derive encryption key from master key + salt
	masterKey := GetMasterKey()
	key := pbkdf2.Key(masterKey, salt, 10000, 32, sha256.New)
	
	// Create AES cipher
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", "", err
	}
	
	// Generate random IV
	iv := make([]byte, aes.BlockSize)
	if _, err := rand.Read(iv); err != nil {
		return "", "", err
	}
	
	// Encrypt data
	stream := cipher.NewCFBEncrypter(block, iv)
	ciphertext := make([]byte, len(apiKey))
	stream.XORKeyStream(ciphertext, []byte(apiKey))
	
	// Combine IV + ciphertext and encode
	encrypted := append(iv, ciphertext...)
	encryptedBase64 := base64.StdEncoding.EncodeToString(encrypted)
	saltBase64 := base64.StdEncoding.EncodeToString(salt)
	
	return encryptedBase64, saltBase64, nil
}

// DecryptAPIKey decrypts an API key using the master key
func DecryptAPIKey(encryptedBase64, saltBase64 string) (string, error) {
	// Decode salt and encrypted data
	salt, err := base64.StdEncoding.DecodeString(saltBase64)
	if err != nil {
		return "", err
	}
	
	encrypted, err := base64.StdEncoding.DecodeString(encryptedBase64)
	if err != nil {
		return "", err
	}
	
	// Derive encryption key from master key + salt
	masterKey := GetMasterKey()
	key := pbkdf2.Key(masterKey, salt, 10000, 32, sha256.New)
	
	// Create AES cipher
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	
	// Extract IV and ciphertext
	if len(encrypted) < aes.BlockSize {
		return "", fmt.Errorf("encrypted data too short")
	}
	iv := encrypted[:aes.BlockSize]
	ciphertext := encrypted[aes.BlockSize:]
	
	// Decrypt data
	stream := cipher.NewCFBDecrypter(block, iv)
	plaintext := make([]byte, len(ciphertext))
	stream.XORKeyStream(plaintext, ciphertext)
	
	return string(plaintext), nil
}

// GetStoredAPIKey retrieves and decrypts the API key from database
func GetStoredAPIKey() (string, bool, error) {
	var encryptedKey, salt string
	var shownOnce bool
	
	err := database.RetryQueryRow(`
		SELECT encrypted_key, salt, shown_once 
		FROM api_keys 
		ORDER BY id DESC 
		LIMIT 1
	`).Scan(&encryptedKey, &salt, &shownOnce)
	
	if err == sql.ErrNoRows {
		return "", false, nil // No key stored yet
	}
	if err != nil {
		return "", false, err
	}
	
	decryptedKey, err := DecryptAPIKey(encryptedKey, salt)
	if err != nil {
		return "", false, err
	}
	
	return decryptedKey, shownOnce, nil
}

// StoreAPIKey encrypts and stores an API key in the database
func StoreAPIKey(apiKey string) error {
	encryptedKey, salt, err := EncryptAPIKey(apiKey)
	if err != nil {
		return err
	}
	
	// Delete any existing keys (only one key should exist)
	_, err = database.RetryExec(`DELETE FROM api_keys`)
	if err != nil {
		return err
	}
	
	// Insert new encrypted key
	_, err = database.RetryExec(`
		INSERT INTO api_keys (encrypted_key, salt, shown_once)
		VALUES (?, ?, 0)
	`, encryptedKey, salt)
	
	return err
}

// MarkAPIKeyAsShown marks the API key as shown (one-time display)
func MarkAPIKeyAsShown() error {
	_, err := database.RetryExec(`
		UPDATE api_keys 
		SET shown_once = 1, updated_at = CURRENT_TIMESTAMP
		WHERE id = (SELECT id FROM api_keys ORDER BY id DESC LIMIT 1)
	`)
	return err
}

// GenerateSecureAPIKey generates a secure random API key
func GenerateSecureAPIKey() (string, error) {
	keyBytes := make([]byte, 32)
	if _, err := rand.Read(keyBytes); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(keyBytes), nil
}

// InitializeAPIKeyIfNeeded checks if API key exists, generates and stores if not
func InitializeAPIKeyIfNeeded() (string, bool, error) {
	existingKey, shownOnce, err := GetStoredAPIKey()
	if err != nil {
		return "", false, err
	}
	
	if existingKey != "" {
		// Key exists, return it
		return existingKey, shownOnce, nil
	}
	
	// No key exists, generate a new one
	log.Println("No API key found in database, generating new key...")
	newKey, err := GenerateSecureAPIKey()
	if err != nil {
		return "", false, err
	}
	
	// Store the encrypted key
	if err := StoreAPIKey(newKey); err != nil {
		return "", false, err
	}
	
	log.Println("New API key generated and stored (encrypted)")
	return newKey, false, nil // Not shown yet
}



