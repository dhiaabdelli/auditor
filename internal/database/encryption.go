package database

import (
	// Standard library - crypto
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"io"
	"os"
	"path/filepath"
	"time"
	
	// Standard library - other
	"errors"
	"fmt"
	"log"
	
	// Third-party packages
	"golang.org/x/crypto/pbkdf2"
)

const (
	dbPath      = "./docs.db"
	encryptedDBPath = "./docs.db.encrypted"
)

// EncryptDatabase encrypts the database file when application shuts down
func EncryptDatabase() error {
	// Check if database file exists
	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		// No database file to encrypt
		log.Println("No database file to encrypt")
		return nil
	}
	
	// CRITICAL: Always encrypt the current database, even if encrypted version exists
	// This ensures we capture all changes made during this session
	// CRITICAL: Sync database before encryption
	// This ensures all WAL (Write-Ahead Logging) changes are checkpointed into the main database
	if DB != nil {
		log.Println("Syncing database before encryption...")
		// Execute PRAGMA commands to ensure all data is written to main database
		// First, checkpoint the WAL file to merge all changes into the main database
		_, err := DB.Exec("PRAGMA wal_checkpoint(FULL)")
		if err != nil {
			log.Printf("Warning: Failed to checkpoint WAL: %v", err)
		}
		// Final checkpoint with truncate to ensure WAL is empty
		_, err = DB.Exec("PRAGMA wal_checkpoint(TRUNCATE)")
		if err != nil {
			log.Printf("Warning: Failed to truncate WAL: %v", err)
		}
		// Close the database connection to release file locks
		log.Println("Closing database connection...")
		DB.Close()
		DB = nil // Clear the reference
	}
	
	// Small delay to ensure file handles are released
	time.Sleep(100 * time.Millisecond)
	
	log.Println("Encrypting database file...")
	
	// Encrypt the database file
	err := encryptFile(dbPath, encryptedDBPath)
	if err != nil {
		return fmt.Errorf("failed to encrypt database: %w", err)
	}
	
	// Remove WAL and SHM files if they exist (they should be empty after checkpoint)
	walPath := dbPath + "-wal"
	shmPath := dbPath + "-shm"
	if _, err := os.Stat(walPath); err == nil {
		os.Remove(walPath)
		log.Println("Removed WAL file after checkpoint")
	}
	if _, err := os.Stat(shmPath); err == nil {
		os.Remove(shmPath)
		log.Println("Removed SHM file after checkpoint")
	}
	
	// Remove the unencrypted database file
	err = os.Remove(dbPath)
	if err != nil {
		log.Printf("Warning: Failed to remove unencrypted database: %v", err)
		// Don't fail - encrypted file exists
	}
	
	log.Println("Database encrypted successfully")
	return nil
}

// DecryptDatabase decrypts the database file when application starts
func DecryptDatabase() error {
	// Check if encrypted database exists
	if _, err := os.Stat(encryptedDBPath); os.IsNotExist(err) {
		// No encrypted database - check if unencrypted exists (for migration)
		if _, err := os.Stat(dbPath); err == nil {
			log.Println("Unencrypted database found - will encrypt on shutdown")
			return nil
		}
		// No database at all - will be created
		return nil
	}
	
	// Check if unencrypted database already exists
	if _, err := os.Stat(dbPath); err == nil {
		log.Println("Unencrypted database already exists - skipping decryption")
		return nil
	}
	
	log.Println("Decrypting database file...")
	
	// Decrypt the database file
	decryptedData, err := decryptFile(encryptedDBPath)
	if err != nil {
		return fmt.Errorf("failed to decrypt database: %w", err)
	}
	
	// Write decrypted data to database file
	err = os.WriteFile(dbPath, decryptedData, 0600) // Read/write for owner only
	if err != nil {
		return fmt.Errorf("failed to write decrypted database: %w", err)
	}
	
	log.Println("Database decrypted successfully")
	return nil
}

// IsDatabaseEncrypted checks if the database is currently encrypted
func IsDatabaseEncrypted() bool {
	_, err := os.Stat(encryptedDBPath)
	return err == nil
}

// GetDatabasePath returns the path to the database file
func GetDatabasePath() string {
	return dbPath
}

// CleanupDatabase removes temporary database files
func CleanupDatabase() error {
	// Remove decrypted database file if it exists (should be done on shutdown)
	if _, err := os.Stat(dbPath); err == nil {
		// Check if encrypted version exists
		if IsDatabaseEncrypted() {
			// Remove unencrypted version
			err := os.Remove(dbPath)
			if err != nil {
				return fmt.Errorf("failed to remove unencrypted database: %w", err)
			}
		}
	}
	return nil
}

// EnsureDatabaseSecurity ensures proper file permissions on database files
func EnsureDatabaseSecurity() error {
	// Set secure permissions on database file if it exists
	if _, err := os.Stat(dbPath); err == nil {
		err := os.Chmod(dbPath, 0600) // Read/write for owner only
		if err != nil {
			return fmt.Errorf("failed to set database permissions: %w", err)
		}
	}
	
	// Set secure permissions on encrypted database file if it exists
	if _, err := os.Stat(encryptedDBPath); err == nil {
		err := os.Chmod(encryptedDBPath, 0600) // Read/write for owner only
		if err != nil {
			return fmt.Errorf("failed to set encrypted database permissions: %w", err)
		}
	}
	
	return nil
}

// MigrateToEncryption migrates an existing unencrypted database to encrypted format
func MigrateToEncryption() error {
	// Check if unencrypted database exists
	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		// No database to migrate
		return nil
	}
	
	// Check if already encrypted
	if IsDatabaseEncrypted() {
		log.Println("Database already encrypted")
		return nil
	}
	
	log.Println("Migrating database to encrypted format...")
	
	// Encrypt the database
	err := EncryptDatabase()
	if err != nil {
		return fmt.Errorf("failed to migrate database: %w", err)
	}
	
	log.Println("Database migration to encrypted format complete")
	return nil
}

// GetBackupPath returns the path for database backups
func GetBackupPath() string {
	return filepath.Join(filepath.Dir(dbPath), "backups")
}

// CreateEncryptedBackup creates an encrypted backup of the database
func CreateEncryptedBackup() error {
	// Ensure backup directory exists
	backupDir := GetBackupPath()
	err := os.MkdirAll(backupDir, 0700) // Read/write/execute for owner only
	if err != nil {
		return fmt.Errorf("failed to create backup directory: %w", err)
	}
	
	// Generate backup filename with timestamp
	backupFile := filepath.Join(backupDir, fmt.Sprintf("docs_backup_%d.encrypted", 
		os.Getpid())) // Using PID for uniqueness
	
	// If encrypted database exists, copy it
	if IsDatabaseEncrypted() {
		encryptedData, err := os.ReadFile(encryptedDBPath)
		if err != nil {
			return fmt.Errorf("failed to read encrypted database: %w", err)
		}
		
		err = os.WriteFile(backupFile, encryptedData, 0600)
		if err != nil {
			return fmt.Errorf("failed to write backup: %w", err)
		}
	} else {
		// Encrypt current database for backup
		err := encryptFile(dbPath, backupFile)
		if err != nil {
			return fmt.Errorf("failed to encrypt database for backup: %w", err)
		}
	}
	
	log.Printf("Encrypted backup created: %s", backupFile)
	return nil
}

// getFileEncryptionKey derives an encryption key for file encryption
func getFileEncryptionKey() []byte {
	// Use hostname and a hardcoded salt to create a consistent encryption key
	hostname, _ := os.Hostname()
	salt := []byte("file-encryption-salt-v1") // Hardcoded salt for consistency
	// Use PBKDF2 to derive a 32-byte key
	return pbkdf2.Key([]byte(hostname), salt, 10000, 32, sha256.New)
}

// encryptFile encrypts a file and writes it to disk
func encryptFile(inputPath, outputPath string) error {
	// Read the input file
	data, err := os.ReadFile(inputPath)
	if err != nil {
		return fmt.Errorf("failed to read input file: %w", err)
	}
	
	// Encrypt the data
	encryptedData, err := encryptData(data)
	if err != nil {
		return fmt.Errorf("failed to encrypt data: %w", err)
	}
	
	// Write encrypted data to output file
	err = os.WriteFile(outputPath, encryptedData, 0600) // Read/write for owner only
	if err != nil {
		return fmt.Errorf("failed to write encrypted file: %w", err)
	}
	
	return nil
}

// decryptFile decrypts a file and returns the decrypted data
func decryptFile(filePath string) ([]byte, error) {
	// Read the encrypted file
	encryptedData, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read encrypted file: %w", err)
	}
	
	// Decrypt the data
	decryptedData, err := decryptData(encryptedData)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt data: %w", err)
	}
	
	return decryptedData, nil
}

// encryptData encrypts data using AES-256-GCM
func encryptData(data []byte) ([]byte, error) {
	key := getFileEncryptionKey()
	
	// Create AES cipher
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("failed to create cipher: %w", err)
	}
	
	// Create GCM mode
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCM: %w", err)
	}
	
	// Generate random nonce
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, fmt.Errorf("failed to generate nonce: %w", err)
	}
	
	// Encrypt data
	ciphertext := gcm.Seal(nonce, nonce, data, nil)
	
	return ciphertext, nil
}

// decryptData decrypts data using AES-256-GCM
func decryptData(encryptedData []byte) ([]byte, error) {
	key := getFileEncryptionKey()
	
	// Create AES cipher
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("failed to create cipher: %w", err)
	}
	
	// Create GCM mode
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCM: %w", err)
	}
	
	// Extract nonce
	nonceSize := gcm.NonceSize()
	if len(encryptedData) < nonceSize {
		return nil, errors.New("encrypted data too short")
	}
	
	nonce, ciphertext := encryptedData[:nonceSize], encryptedData[nonceSize:]
	
	// Decrypt data
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt: %w", err)
	}
	
	return plaintext, nil
}



