package utils

import (
	// Standard library - crypto
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	
	// Standard library - encoding
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	
	// Standard library - other
	"errors"
	"fmt"
	"path/filepath"
	"strings"
	
	// Third-party packages
	"golang.org/x/crypto/pbkdf2"
)

// DetectMimeType detects MIME type based on file extension
func DetectMimeType(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	mimeTypes := map[string]string{
		".ps1":    "text/x-powershell",
		".psm1":   "text/x-powershell",
		".psd1":   "text/x-powershell",
		".ps1xml": "text/x-powershell",
		".sh":     "text/x-shellscript",
		".bat":    "text/x-msdos-batch",
		".cmd":    "text/x-msdos-batch",
		".txt":    "text/plain",
		".md":     "text/markdown",
		".json":   "application/json",
		".xml":    "text/xml",
		".csv":    "text/csv",
		".pdf":    "application/pdf",
		".doc":    "application/msword",
		".docx":   "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		".xls":    "application/vnd.ms-excel",
		".xlsx":   "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		".ppt":    "application/vnd.ms-powerpoint",
		".pptx":   "application/vnd.openxmlformats-officedocument.presentationml.presentation",
		".zip":    "application/zip",
		".rar":    "application/x-rar-compressed",
		".7z":     "application/x-7z-compressed",
		".tar":    "application/x-tar",
		".gz":     "application/gzip",
		".png":    "image/png",
		".jpg":    "image/jpeg",
		".jpeg":   "image/jpeg",
		".gif":    "image/gif",
		".svg":    "image/svg+xml",
		".webp":   "image/webp",
		".mp4":    "video/mp4",
		".avi":    "video/x-msvideo",
		".mov":    "video/quicktime",
		".mp3":    "audio/mpeg",
		".wav":    "audio/wav",
		".ogg":    "audio/ogg",
	}

	if mimeType, ok := mimeTypes[ext]; ok {
		return mimeType
	}
	return "application/octet-stream"
}

// IsEncryptedPayload checks if a payload is encrypted
func IsEncryptedPayload(data map[string]interface{}) bool {
	// Check for new format: data, iv, key structure
	if _, hasData := data["data"].(string); hasData {
		if _, hasIV := data["iv"].(string); hasIV {
			if _, hasKey := data["key"].(string); hasKey {
				return true
			}
		}
	}
	// Check for old format: encrypted boolean flag
	if encrypted, ok := data["encrypted"].(bool); ok && encrypted {
		return true
	}
	return false
}

// DecryptData decrypts encrypted data using the private key
func DecryptData(encryptedData, privateKeyPEM string) (string, error) {
	var data map[string]interface{}
	if err := json.Unmarshal([]byte(encryptedData), &data); err != nil {
		return "", err
	}

	if !IsEncryptedPayload(data) {
		return encryptedData, nil
	}

	// Handle new format: data, iv, key structure (from PowerShell script)
	if encryptedDataStr, hasData := data["data"].(string); hasData {
		if encryptedIVStr, hasIV := data["iv"].(string); hasIV {
			if encryptedKeyStr, hasKey := data["key"].(string); hasKey {
				// Decode base64 strings
				encryptedBytes, err := base64.StdEncoding.DecodeString(encryptedDataStr)
				if err != nil {
					return "", fmt.Errorf("failed to decode encrypted data: %w", err)
				}

				encryptedIV, err := base64.StdEncoding.DecodeString(encryptedIVStr)
				if err != nil {
					return "", fmt.Errorf("failed to decode IV: %w", err)
				}

				encryptedKeyBytes, err := base64.StdEncoding.DecodeString(encryptedKeyStr)
				if err != nil {
					return "", fmt.Errorf("failed to decode encrypted key: %w", err)
				}

				// Decode private key
				block, _ := pem.Decode([]byte(privateKeyPEM))
				if block == nil {
					return "", errors.New("failed to decode private key PEM")
				}

				privateKey, err := x509.ParsePKCS1PrivateKey(block.Bytes)
				if err != nil {
					return "", fmt.Errorf("failed to parse private key: %w", err)
				}

				// Decrypt AES key using RSA
				decryptedKey, err := rsa.DecryptPKCS1v15(rand.Reader, privateKey, encryptedKeyBytes)
				if err != nil {
					return "", fmt.Errorf("failed to decrypt AES key: %w", err)
				}

				// Create AES cipher
				blockCipher, err := aes.NewCipher(decryptedKey)
				if err != nil {
					return "", fmt.Errorf("failed to create cipher: %w", err)
				}

				// Decrypt using AES-CBC (PowerShell uses AES-CBC, not GCM)
				if len(encryptedBytes)%aes.BlockSize != 0 {
					return "", errors.New("encrypted data length is not a multiple of block size")
				}

				mode := cipher.NewCBCDecrypter(blockCipher, encryptedIV)
				decryptedBytes := make([]byte, len(encryptedBytes))
				mode.CryptBlocks(decryptedBytes, encryptedBytes)

				// Remove PKCS7 padding
				padding := int(decryptedBytes[len(decryptedBytes)-1])
				if padding > aes.BlockSize || padding == 0 {
					return "", errors.New("invalid padding")
				}
				decryptedBytes = decryptedBytes[:len(decryptedBytes)-padding]

				return string(decryptedBytes), nil
			}
		}
	}

	// Handle old format: encrypted boolean with content field
	encryptedContent, ok := data["content"].(string)
	if !ok {
		return "", errors.New("encrypted content not found")
	}

	encryptedBytes, err := base64.StdEncoding.DecodeString(encryptedContent)
	if err != nil {
		return "", fmt.Errorf("failed to decode encrypted content: %w", err)
	}

	block, _ := pem.Decode([]byte(privateKeyPEM))
	if block == nil {
		return "", errors.New("failed to decode private key PEM")
	}

	privateKey, err := x509.ParsePKCS1PrivateKey(block.Bytes)
	if err != nil {
		return "", fmt.Errorf("failed to parse private key: %w", err)
	}

	encryptedKey, ok := data["key"].(string)
	if !ok {
		return "", errors.New("encrypted key not found")
	}

	encryptedKeyBytes, err := base64.StdEncoding.DecodeString(encryptedKey)
	if err != nil {
		return "", fmt.Errorf("failed to decode encrypted key: %w", err)
	}

	decryptedKey, err := rsa.DecryptOAEP(
		sha256.New(),
		rand.Reader,
		privateKey,
		encryptedKeyBytes,
		nil,
	)
	if err != nil {
		return "", fmt.Errorf("failed to decrypt key: %w", err)
	}

	key := decryptedKey[:32]
	nonce := decryptedKey[32:44]

	blockCipher, err := aes.NewCipher(key)
	if err != nil {
		return "", fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(blockCipher)
	if err != nil {
		return "", fmt.Errorf("failed to create GCM: %w", err)
	}

	decryptedBytes, err := gcm.Open(nil, nonce, encryptedBytes, nil)
	if err != nil {
		return "", fmt.Errorf("failed to decrypt data: %w", err)
	}

	return string(decryptedBytes), nil
}

// GetNullableString gets a string from a sql.NullString
func GetNullableString(s interface{}) string {
	// This function signature needs to match what's expected
	// We'll need to check how it's used
	return ""
}

// Helper functions for SSH encryption/decryption
func DeriveKeyFromPassword(password string, salt []byte) []byte {
	return pbkdf2.Key([]byte(password), salt, 10000, 32, sha256.New)
}

func EncryptSSHData(data []byte, password string) (string, string, error) {
	// Generate random salt
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", "", err
	}

	// Derive key from password
	key := DeriveKeyFromPassword(password, salt)

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
	ciphertext := make([]byte, len(data))
	stream.XORKeyStream(ciphertext, data)

	// Combine IV + ciphertext and encode
	encrypted := append(iv, ciphertext...)
	encryptedBase64 := base64.StdEncoding.EncodeToString(encrypted)
	saltBase64 := base64.StdEncoding.EncodeToString(salt)

	return encryptedBase64, saltBase64, nil
}

func DecryptSSHData(encryptedBase64, saltBase64, password string) ([]byte, error) {
	// Decode salt and encrypted data
	salt, err := base64.StdEncoding.DecodeString(saltBase64)
	if err != nil {
		return nil, err
	}

	encrypted, err := base64.StdEncoding.DecodeString(encryptedBase64)
	if err != nil {
		return nil, err
	}

	// Derive key from password
	key := DeriveKeyFromPassword(password, salt)

	// Create AES cipher
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	// Extract IV and ciphertext
	if len(encrypted) < aes.BlockSize {
		return nil, fmt.Errorf("encrypted data too short")
	}
	iv := encrypted[:aes.BlockSize]
	ciphertext := encrypted[aes.BlockSize:]

	// Decrypt data
	stream := cipher.NewCFBDecrypter(block, iv)
	plaintext := make([]byte, len(ciphertext))
	stream.XORKeyStream(plaintext, ciphertext)

	return plaintext, nil
}

// HTML to plain text conversion
func HTMLToPlainText(html string) string {
	// Simple HTML tag removal
	text := html
	text = strings.ReplaceAll(text, "<br>", "\n")
	text = strings.ReplaceAll(text, "<br/>", "\n")
	text = strings.ReplaceAll(text, "<p>", "\n")
	text = strings.ReplaceAll(text, "</p>", "")
	// Remove other HTML tags (simple regex would be better, but keeping it simple)
	return strings.TrimSpace(text)
}

// DOCX generation helpers
func CreateMinimalDOCX(content string) ([]byte, error) {
	// This would need a proper DOCX library implementation
	// For now, return error indicating it needs implementation
	return nil, fmt.Errorf("DOCX generation not yet implemented")
}

func EscapeXML(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	s = strings.ReplaceAll(s, "\"", "&quot;")
	s = strings.ReplaceAll(s, "'", "&apos;")
	return s
}

