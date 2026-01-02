package handlers

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"log"
	"net/http"
	"strings"

	"network-script-generator/internal/database"
	"network-script-generator/internal/scripts"
	"network-script-generator/internal/utils"
)

// File Share Report CRUD handlers
func HandleGetFileShareReports(w http.ResponseWriter, r *http.Request) {
	// Ensure table exists
	_, err := database.DB.Exec(`
		CREATE TABLE IF NOT EXISTS file_share_reports (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			server_name TEXT NOT NULL,
			folder_path TEXT,
			report_data TEXT,
			private_key TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		log.Printf("Error creating file_share_reports table: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Migrate: Add private_key column if it doesn't exist
	if err := migrateFileShareReportsTable(); err != nil {
		log.Printf("Warning: Failed to migrate file_share_reports table: %v", err)
		// Continue anyway - migration failures are not critical
	}

	rows, err := database.DB.Query(`
		SELECT id, name, server_name, folder_path,
		       CASE WHEN report_data IS NOT NULL AND report_data != '' THEN 1 ELSE 0 END as has_data,
		       created_at, updated_at 
		FROM file_share_reports 
		ORDER BY created_at DESC
	`)
	if err != nil {
		log.Printf("Error querying file_share_reports: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var reports []map[string]interface{}
	for rows.Next() {
		var id int
		var name, serverName, folderPath sql.NullString
		var hasData int
		var createdAt, updatedAt string

		err := rows.Scan(&id, &name, &serverName, &folderPath, &hasData, &createdAt, &updatedAt)
		if err != nil {
			continue
		}

		report := map[string]interface{}{
			"id":         id,
			"name":       name.String,
			"serverName": serverName.String,
			"folderPath": folderPath.String,
			"hasData":    hasData == 1,
			"createdAt":  createdAt,
			"updatedAt":  updatedAt,
		}

		reports = append(reports, report)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(reports)
}

func HandleGetSingleFileShareReport(w http.ResponseWriter, r *http.Request) {
	// Extract report ID from URL path
	path := strings.TrimPrefix(r.URL.Path, "/api/file-share-reports/")
	reportID := strings.Split(path, "/")[0]

	if reportID == "" {
		http.Error(w, "Missing report ID", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	var name, serverName, folderPath, reportData, privateKey sql.NullString
	var createdAt, updatedAt string

	err := database.DB.QueryRow(`
		SELECT name, server_name, folder_path, report_data, private_key, created_at, updated_at 
		FROM file_share_reports 
		WHERE id = ?`, reportID).Scan(
		&name, &serverName, &folderPath, &reportData, &privateKey, &createdAt, &updatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Report not found", http.StatusNotFound)
		} else {
			log.Printf("Error querying report: %v", err)
			http.Error(w, "Database error", http.StatusInternalServerError)
		}
		return
	}

	// Build response with report metadata
	response := map[string]interface{}{
		"id":         reportID,
		"name":       name.String,
		"serverName": serverName.String,
		"folderPath": folderPath.String,
		"createdAt":  createdAt,
		"updatedAt":  updatedAt,
	}

	// If report data exists, parse and include it
	if reportData.Valid && reportData.String != "" {
		// Try to parse as plain JSON first
		var data map[string]interface{}
		rawJSON := strings.TrimSpace(reportData.String)

		if err := json.Unmarshal([]byte(rawJSON), &data); err == nil {
			// Check if data is encrypted and decrypt if needed
			if utils.IsEncryptedPayload(data) {
				if privateKey.Valid && privateKey.String != "" {
					decryptedData, err := utils.DecryptData(rawJSON, privateKey.String)
					if err == nil {
						if err := json.Unmarshal([]byte(decryptedData), &data); err == nil {
							// Merge decrypted data into response
							for k, v := range data {
								response[k] = v
							}
						}
					}
				}
			} else {
				// Merge plain data into response
				for k, v := range data {
					response[k] = v
				}
			}
		}
	}

	// Return the full report data (with or without audit data)
	json.NewEncoder(w).Encode(response)
}

func HandleCreateFileShareReport(w http.ResponseWriter, r *http.Request) {
	// Ensure table exists and has all columns
	_, err := database.DB.Exec(`
		CREATE TABLE IF NOT EXISTS file_share_reports (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			server_name TEXT NOT NULL,
			folder_path TEXT,
			report_data TEXT,
			private_key TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		log.Printf("Error creating file_share_reports table: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Migrate: Add columns if they don't exist
	if err := migrateFileShareReportsTable(); err != nil {
		log.Printf("Warning: Failed to migrate file_share_reports table: %v", err)
		// Continue anyway - migration failures are not critical
	}

	var req struct {
		Name       string `json:"name"`
		ServerName string `json:"serverName"`
		FolderPath string `json:"folderPath"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		http.Error(w, "Report name is required", http.StatusBadRequest)
		return
	}

	if req.ServerName == "" {
		http.Error(w, "Server name is required", http.StatusBadRequest)
		return
	}

	if req.FolderPath == "" {
		http.Error(w, "Folder path is required", http.StatusBadRequest)
		return
	}

	result, err := database.DB.Exec(`
		INSERT INTO file_share_reports (name, server_name, folder_path)
		VALUES (?, ?, ?)
	`, req.Name, req.ServerName, req.FolderPath)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	id, _ := result.LastInsertId()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"id":      id,
	})
}

func HandleUpdateFileShareReport(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "ID required", http.StatusBadRequest)
		return
	}

	var req struct {
		Name       string `json:"name"`
		ServerName string `json:"serverName"`
		ReportData string `json:"reportData"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var reportData sql.NullString
	if req.ReportData != "" {
		reportData = sql.NullString{String: req.ReportData, Valid: true}
	}

	_, err := database.DB.Exec(`
		UPDATE file_share_reports 
		SET name = ?, server_name = ?, report_data = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, req.Name, req.ServerName, reportData, id)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

func HandleDeleteFileShareReport(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "ID required", http.StatusBadRequest)
		return
	}

	_, err := database.DB.Exec("DELETE FROM file_share_reports WHERE id = ?", id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

// HandleGenerateFileShareReportScript generates a PowerShell script for file share auditing
func HandleGenerateFileShareReportScript(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ReportID   int    `json:"reportId"`
		ServerName string `json:"serverName"`
		FolderPath string `json:"folderPath"`
		Obfuscated bool   `json:"obfuscated"`
		Encrypt    bool   `json:"encrypt"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.ReportID == 0 {
		http.Error(w, "Report ID is required", http.StatusBadRequest)
		return
	}

	// Check if private key already exists for this report
	var existingPrivateKey sql.NullString
	_ = database.DB.QueryRow(`
		SELECT private_key FROM file_share_reports WHERE id = ?
	`, req.ReportID).Scan(&existingPrivateKey)

	var privateKeyPEM string
	var publicKeyPEM string
	var encrypt bool = req.Encrypt

	// Generate key pair if encryption is requested and no key exists
	if encrypt {
		if existingPrivateKey.Valid && existingPrivateKey.String != "" {
			// Use existing private key
			privateKeyPEM = existingPrivateKey.String
			// Extract public key from private key
			block, _ := pem.Decode([]byte(privateKeyPEM))
			if block == nil {
				http.Error(w, "Failed to decode existing private key", http.StatusInternalServerError)
				return
			}
			privateKey, err := x509.ParsePKCS1PrivateKey(block.Bytes)
			if err != nil {
				http.Error(w, "Failed to parse existing private key", http.StatusInternalServerError)
				return
			}
			publicKeyDER, err := x509.MarshalPKIXPublicKey(&privateKey.PublicKey)
			if err != nil {
				http.Error(w, "Failed to marshal public key", http.StatusInternalServerError)
				return
			}
			publicKeyPEM = string(pem.EncodeToMemory(&pem.Block{
				Type:  "PUBLIC KEY",
				Bytes: publicKeyDER,
			}))
		} else {
			// Generate new key pair
			privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
			if err != nil {
				http.Error(w, "Failed to generate RSA key pair", http.StatusInternalServerError)
				return
			}

			// Encode private key
			privateKeyDER := x509.MarshalPKCS1PrivateKey(privateKey)
			privateKeyPEM = string(pem.EncodeToMemory(&pem.Block{
				Type:  "RSA PRIVATE KEY",
				Bytes: privateKeyDER,
			}))

			// Encode public key
			publicKeyDER, err := x509.MarshalPKIXPublicKey(&privateKey.PublicKey)
			if err != nil {
				http.Error(w, "Failed to marshal public key", http.StatusInternalServerError)
				return
			}
			publicKeyPEM = string(pem.EncodeToMemory(&pem.Block{
				Type:  "PUBLIC KEY",
				Bytes: publicKeyDER,
			}))

			// Store private key in database
			_, err = database.DB.Exec(`
				UPDATE file_share_reports 
				SET private_key = ?, updated_at = CURRENT_TIMESTAMP
				WHERE id = ?
			`, privateKeyPEM, req.ReportID)
			if err != nil {
				log.Printf("Error storing private key: %v", err)
				http.Error(w, "Failed to store private key", http.StatusInternalServerError)
				return
			}
		}
	}

	// Get folder path from database if not provided
	folderPath := req.FolderPath
	if folderPath == "" {
		var dbFolderPath sql.NullString
		err := database.DB.QueryRow(`
			SELECT folder_path FROM file_share_reports WHERE id = ?
		`, req.ReportID).Scan(&dbFolderPath)
		if err == nil && dbFolderPath.Valid && dbFolderPath.String != "" {
			folderPath = dbFolderPath.String
		}
	}

	if folderPath == "" {
		http.Error(w, "Folder path is required", http.StatusBadRequest)
		return
	}

	// Generate the PowerShell script
	script := generateFileShareAuditScriptForLocal(req.ServerName, folderPath, publicKeyPEM, encrypt)

	// Obfuscate if requested
	if req.Obfuscated {
		script = scripts.ObfuscatePowerShellScript(script)
	}

	// Return JSON response (like Windows Server Auditor)
	response := map[string]interface{}{"script": script}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleImportFileShareReport handles importing file share audit data
func HandleImportFileShareReport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ReportID int    `json:"reportId"`
		Data     string `json:"data"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.ReportID == 0 {
		http.Error(w, "Report ID is required", http.StatusBadRequest)
		return
	}

	// Check if data is encrypted
	var data map[string]interface{}
	if err := json.Unmarshal([]byte(req.Data), &data); err != nil {
		http.Error(w, "Invalid JSON data", http.StatusBadRequest)
		return
	}

	var finalData string
	if utils.IsEncryptedPayload(data) {
		// Get private key from database
		var privateKey sql.NullString
		err := database.DB.QueryRow(`
			SELECT private_key FROM file_share_reports WHERE id = ?
		`, req.ReportID).Scan(&privateKey)

		if err != nil || !privateKey.Valid || privateKey.String == "" {
			http.Error(w, "Private key not found. Please regenerate the script for this report.", http.StatusBadRequest)
			return
		}

		// Decrypt the data
		decryptedData, err := utils.DecryptData(req.Data, privateKey.String)
		if err != nil {
			log.Printf("Error decrypting report data: %v", err)
			http.Error(w, "Failed to decrypt report data. Please ensure you're importing data generated with the same script.", http.StatusBadRequest)
			return
		}
		finalData = decryptedData
	} else {
		finalData = req.Data
	}

	// Store the decrypted/plain data in database
	_, err := database.DB.Exec(`
		UPDATE file_share_reports 
		SET report_data = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, finalData, req.ReportID)

	if err != nil {
		log.Printf("Error updating report: %v", err)
		http.Error(w, "Failed to save report data", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Report imported successfully",
	})
}

// migrateFileShareReportsTable adds private_key and folder_path columns if they don't exist
func migrateFileShareReportsTable() error {
	rows, err := database.DB.Query("PRAGMA table_info(file_share_reports)")
	if err != nil {
		return err
	}
	defer rows.Close()

	hasPrivateKey := false
	hasFolderPath := false
	for rows.Next() {
		var cid int
		var name, ctype string
		var notnull int
		var dfltValue sql.NullString
		var pk int

		if err := rows.Scan(&cid, &name, &ctype, &notnull, &dfltValue, &pk); err != nil {
			continue
		}

		if name == "private_key" {
			hasPrivateKey = true
		}
		if name == "folder_path" {
			hasFolderPath = true
		}
	}

	if !hasPrivateKey {
		_, err := database.DB.Exec("ALTER TABLE file_share_reports ADD COLUMN private_key TEXT")
		if err != nil && !strings.Contains(err.Error(), "duplicate column") {
			return err
		}
		log.Printf("Added private_key column to file_share_reports table")
	}

	if !hasFolderPath {
		_, err := database.DB.Exec("ALTER TABLE file_share_reports ADD COLUMN folder_path TEXT")
		if err != nil && !strings.Contains(err.Error(), "duplicate column") {
			return err
		}
		log.Printf("Added folder_path column to file_share_reports table")
	}

	return nil
}

// generateFileShareAuditScriptForLocal generates a PowerShell script to audit a specific folder's permissions
func generateFileShareAuditScriptForLocal(serverName string, folderPath string, publicKeyPEM string, encrypt bool) string {
	encryptionCode := ""
	if encrypt && publicKeyPEM != "" {
		// Encode public key to base64 for embedding in script
		pubKeyB64 := base64.StdEncoding.EncodeToString([]byte(publicKeyPEM))
		encryptionCode = `
$pubKeyB64 = '` + pubKeyB64 + `'

# Function to parse PEM public key
function Parse-PEMPublicKey {
    param([string]$PEM)
    $base64 = $PEM -replace '-----BEGIN PUBLIC KEY-----', '' -replace '-----END PUBLIC KEY-----', '' -replace '\s', ''
    $keyBytes = [System.Convert]::FromBase64String($base64)
    $pos = 0
    if ($keyBytes[$pos] -ne 0x30) { throw 'Invalid PEM format' }
    $pos++
    $len = $keyBytes[$pos]
    $pos++
    if ($len -gt 127) {
        $lenBytes = $len - 128
        $len = 0
        for ($i = 0; $i -lt $lenBytes; $i++) {
            $len = ($len -shl 8) -bor $keyBytes[$pos]
            $pos++
        }
    }
    if ($keyBytes[$pos] -eq 0x30) { $pos++ }
    $algLen = $keyBytes[$pos]
    $pos++
    if ($algLen -gt 127) {
        $lenBytes = $algLen - 128
        $pos += $lenBytes
    }
    $pos += $algLen
    if ($keyBytes[$pos] -ne 0x03) { throw 'Invalid PEM format' }
    $pos++
    $bitStrLen = $keyBytes[$pos]
    $pos++
    if ($bitStrLen -gt 127) {
        $lenBytes = $bitStrLen - 128
        $bitStrLen = 0
        for ($i = 0; $i -lt $lenBytes; $i++) {
            $bitStrLen = ($bitStrLen -shl 8) -bor $keyBytes[$pos]
            $pos++
        }
    }
    $pos++
    if ($keyBytes[$pos] -ne 0x30) { throw 'Invalid RSA key format' }
    $pos++
    $rsaKeyLen = $keyBytes[$pos]
    $pos++
    if ($rsaKeyLen -gt 127) {
        $lenBytes = $rsaKeyLen - 128
        $rsaKeyLen = 0
        for ($i = 0; $i -lt $lenBytes; $i++) {
            $rsaKeyLen = ($rsaKeyLen -shl 8) -bor $keyBytes[$pos]
            $pos++
        }
    }
    if ($keyBytes[$pos] -ne 0x02) { throw 'Invalid modulus' }
    $pos++
    $modLen = $keyBytes[$pos]
    $pos++
    if ($modLen -gt 127) {
        $lenBytes = $modLen - 128
        $modLen = 0
        for ($i = 0; $i -lt $lenBytes; $i++) {
            $modLen = ($modLen -shl 8) -bor $keyBytes[$pos]
            $pos++
        }
    }
    if ($keyBytes[$pos] -eq 0) { $pos++; $modLen-- }
    $modulus = New-Object byte[] $modLen
    [Array]::Copy($keyBytes, $pos, $modulus, 0, $modLen)
    $pos += $modLen
    if ($keyBytes[$pos] -ne 0x02) { throw 'Invalid exponent' }
    $pos++
    $expLen = $keyBytes[$pos]
    $pos++
    $exponent = New-Object byte[] $expLen
    [Array]::Copy($keyBytes, $pos, $exponent, 0, $expLen)
    return @{ Modulus = $modulus; Exponent = $exponent }
}

function Encrypt-Data {
    param([string]$Data, [string]$PublicKeyBase64)
    try {
        $aes = New-Object System.Security.Cryptography.AesCryptoServiceProvider
        $aes.GenerateKey()
        $aes.GenerateIV()
        $aesKey = $aes.Key
        $aesIV = $aes.IV
        $dataBytes = [System.Text.Encoding]::UTF8.GetBytes($Data)
        $encryptor = $aes.CreateEncryptor()
        $encryptedData = $encryptor.TransformFinalBlock($dataBytes, 0, $dataBytes.Length)
        $pubKeyBytes = [System.Convert]::FromBase64String($PublicKeyBase64)
        $pubKeyPEM = [System.Text.Encoding]::UTF8.GetString($pubKeyBytes)
        $keyParams = Parse-PEMPublicKey -PEM $pubKeyPEM
        $rsaParams = New-Object System.Security.Cryptography.RSAParameters
        $rsaParams.Modulus = $keyParams.Modulus
        $rsaParams.Exponent = $keyParams.Exponent
        $rsa = New-Object System.Security.Cryptography.RSACryptoServiceProvider
        $rsa.ImportParameters($rsaParams)
        $encryptedKey = $rsa.Encrypt($aesKey, $false)
        $result = @{
            key = [System.Convert]::ToBase64String($encryptedKey)
            iv = [System.Convert]::ToBase64String($aesIV)
            data = [System.Convert]::ToBase64String($encryptedData)
        }
        return ($result | ConvertTo-Json -Compress)
    } catch {
        Write-Error "Encryption failed: $_"
        return $null
    } finally {
        if ($aes) { $aes.Dispose() }
        if ($encryptor) { $encryptor.Dispose() }
        if ($rsa) { $rsa.Dispose() }
    }
}
`
	}

	script := `$ErrorActionPreference = "Continue"
$result = @{}` + encryptionCode + `

# Folder path to analyze
$folderPath = "` + strings.ReplaceAll(folderPath, `"`, `\"`) + `"

try {
    # Verify folder exists
    if (-not (Test-Path $folderPath -PathType Container)) {
        Write-Error "Folder path does not exist: $folderPath"
        exit 1
    }
    
    $folderInfo = @{
        "folderPath" = $folderPath
        "exists" = $true
    }
    
    # Get folder size (properly handle access denied)
    try {
        $totalSize = 0
        
        # Function to recursively get folder size
        function Get-FolderSize {
            param([string]$Path)
            $size = 0
            try {
                # Get files in current folder
                $files = Get-ChildItem -Path $Path -File -ErrorAction SilentlyContinue
                if ($files) {
                    foreach ($file in $files) {
                        try {
                            $size += $file.Length
                        } catch {
                            # Skip files we can't access
                        }
                    }
                }
                
                # Recursively process subdirectories
                $dirs = Get-ChildItem -Path $Path -Directory -ErrorAction SilentlyContinue
                if ($dirs) {
                    foreach ($dir in $dirs) {
                        try {
                            $subSize = Get-FolderSize -Path $dir.FullName
                            $size += $subSize
                        } catch {
                            # Skip directories we can't access
                        }
                    }
                }
            } catch {
                # Skip folders we can't access
            }
            return $size
        }
        
        $totalSize = Get-FolderSize -Path $folderPath
        $folderInfo["totalSize"] = [math]::Round($totalSize / 1GB, 2)
    } catch {
        $folderInfo["totalSize"] = 0
    }
    
    # Function to resolve account to SID (language-independent)
    function Get-AccountSID {
        param([string]$AccountName)
        try {
            $ntAccount = New-Object System.Security.Principal.NTAccount($AccountName)
            $sid = $ntAccount.Translate([System.Security.Principal.SecurityIdentifier])
            return $sid.Value
        } catch {
            # Fallback for common English names on non-English systems or when resolution fails
            $knownSIDs = @{
                "BUILTIN\Administrators" = "S-1-5-32-544"
                "NT AUTHORITY\SYSTEM" = "S-1-5-18"
                "BUILTIN\Backup Operators" = "S-1-5-32-551"
                "NT AUTHORITY\INTERACTIVE" = "S-1-5-4"
                "NT AUTHORITY\SERVICE" = "S-1-5-6"
                "NT AUTHORITY\Authenticated Users" = "S-1-5-11"
                "BUILTIN\Users" = "S-1-5-32-545"
                "Everyone" = "S-1-1-0"
                "NT AUTHORITY\ANONYMOUS LOGON" = "S-1-5-7"
                "NT AUTHORITY\NETWORK SERVICE" = "S-1-5-20"
                "NT AUTHORITY\LOCAL SERVICE" = "S-1-5-19"
            }
            
            # Case-insensitive check
            foreach ($key in $knownSIDs.Keys) {
                if ($key.Equals($AccountName, [StringComparison]::OrdinalIgnoreCase)) {
                    return $knownSIDs[$key]
                }
            }
            return $null
        }
    }
    
    # Function to check if account is a legitimate system account (using SIDs)
    function Test-IsSystemAccount {
        param([string]$AccountName)
        try {
            # Check for CREATOR OWNER explicitly (it may not resolve via Get-AccountSID)
            if ($AccountName -eq "CREATOR OWNER" -or $AccountName -match "CREATOR.*OWNER|CREATEUR.*PROPRIETAIRE" -or $AccountName -match "^S-1-3-0") {
                return $true
            }
            
            $sid = Get-AccountSID -AccountName $AccountName
            if (-not $sid) { 
                # If it's a SID starting with S-1-3-0, it's CREATOR OWNER
                if ($AccountName -match "^S-1-3-0") {
                    return $true
                }
                return $false 
            }
            
            # Well-known SIDs for legitimate system accounts
            $systemSIDs = @(
                "S-1-5-18",           # NT AUTHORITY\SYSTEM
                "S-1-5-32-544",       # BUILTIN\Administrators
                "S-1-3-0",            # CREATOR OWNER
                "S-1-5-32-551",       # BUILTIN\Backup Operators
                "S-1-5-4",            # NT AUTHORITY\INTERACTIVE
                "S-1-5-6",            # NT AUTHORITY\SERVICE
                "S-1-5-19",           # NT AUTHORITY\LOCAL SERVICE
                "S-1-5-20"            # NT AUTHORITY\NETWORK SERVICE
            )
            
            # Check if SID matches any system account
            foreach ($systemSID in $systemSIDs) {
                if ($sid -eq $systemSID) {
                    return $true
                }
            }
            
            # Check if it's a domain administrators group (ends with -512)
            if ($sid -match "-512$") {
                return $true
            }
            
            return $false
        } catch {
            # If exception occurs but it's CREATOR OWNER, still return true
            if ($AccountName -eq "CREATOR OWNER" -or $AccountName -match "CREATOR.*OWNER|CREATEUR.*PROPRIETAIRE" -or $AccountName -match "^S-1-3-0") {
                return $true
            }
            return $false
        }
    }
    
    # Function to analyze folder permissions
    function Get-FolderPermissions {
        param([string]$FolderPath, [string]$RootPath)
        
        $folderPerms = @{
            "path" = $FolderPath
            "relativePath" = ""
            "name" = ""
            "permissions" = @()
            "hasMisconfigurations" = $false
            "riskLevel" = "Low"
            "criticalCount" = 0
            "highCount" = 0
            "mediumCount" = 0
            "warningCount" = 0
        }
        
        try {
            $relativePath = $FolderPath.Replace($RootPath, "").TrimStart('\')
            if ([string]::IsNullOrEmpty($relativePath)) {
                $relativePath = "."
            }
            $folderPerms["relativePath"] = $relativePath
            $folderPerms["name"] = Split-Path -Leaf $FolderPath
            
            # Get ACL
            $acl = Get-Acl -Path $FolderPath -ErrorAction Stop
            if (-not $acl -or -not $acl.Access) {
                $folderPerms["error"] = "Failed to retrieve ACL or no access rules"
                return $folderPerms
            }
            
            # Process each access rule
            foreach ($accessRule in $acl.Access) {
                if (-not $accessRule) { continue }
                
                try {
                    $identity = $accessRule.IdentityReference.Value
                    $rightsRaw = $accessRule.FileSystemRights
                    $accessType = $accessRule.AccessControlType.ToString()
                    $isInherited = $accessRule.IsInherited
                    $propagationFlags = $accessRule.PropagationFlags.ToString()
                    
                    # Convert FileSystemRights to readable string
                    $rights = ""
                    $rightsValue = 0
                    
                    # Get the numeric value of the rights
                    if ($rightsRaw -is [System.Security.AccessControl.FileSystemRights]) {
                        $rightsValue = [int]$rightsRaw
                        $rights = $rightsRaw.ToString()
                    } elseif ($rightsRaw -is [int] -or $rightsRaw -is [long]) {
                        $rightsValue = [int]$rightsRaw
                        try {
                            $rightsEnum = [System.Security.AccessControl.FileSystemRights]$rightsValue
                            $rights = $rightsEnum.ToString()
                        } catch {
                            # If conversion fails, try to decode manually
                            $rights = ""
                        }
                    } else {
                        try {
                            $rightsValue = [int]$rightsRaw
                            $rightsEnum = [System.Security.AccessControl.FileSystemRights]$rightsValue
                            $rights = $rightsEnum.ToString()
                        } catch {
                            $rights = $rightsRaw.ToString()
                        }
                    }
                    
                    # Handle Creator Owner special permission (268435456 = 0x10000000 = CREATOR_OWNER_RIGHT)
                    # This is a special flag that grants the creator/owner full control
                    if ($rightsValue -eq 268435456) {
                        $rights = "FullControl"
                    } elseif (($rightsValue -band 268435456) -eq 268435456) {
                        # Contains Creator Owner flag, remove it and decode the rest
                        $rightsWithoutCreator = $rightsValue -band (-bnot 268435456)
                        if ($rightsWithoutCreator -gt 0) {
                            try {
                                $rightsEnum = [System.Security.AccessControl.FileSystemRights]$rightsWithoutCreator
                                $rights = $rightsEnum.ToString()
                            } catch {
                                $rights = "FullControl"
                            }
                        } else {
                            $rights = "FullControl"
                        }
                    }
                    
                    # If rights is still empty or numeric, try to decode common values
                    if ([string]::IsNullOrWhiteSpace($rights) -or $rights -match "^\d+$") {
                        # Common FileSystemRights values
                        switch ($rightsValue) {
                            2032127 { $rights = "FullControl" }  # 0x001F01FF
                            1245631 { $rights = "Modify" }        # 0x001301BF
                            1179785 { $rights = "ReadAndExecute" }  # 0x001200A9
                            1179817 { $rights = "ReadAndExecute, Synchronize" }  # 0x001200A9
                            1180063 { $rights = "Read, Write, Execute" }  # 0x001203AF
                            268435456 { $rights = "FullControl" }  # Creator Owner
                            default {
                                # Try to decode as enum
                                try {
                                    $rightsEnum = [System.Security.AccessControl.FileSystemRights]$rightsValue
                                    $rights = $rightsEnum.ToString()
                                } catch {
                                    $rights = "Special Permissions ($rightsValue)"
                                }
                            }
                        }
                    }
                    
                    # Clean up the rights string (remove extra commas, spaces)
                    $rights = $rights.Trim().Trim(',').Trim()
                    
                    # Translate well-known SIDs and language-specific names to readable English names
                    $identitySID = Get-AccountSID -AccountName $identity
                    if ($identitySID) {
                        # Check for well-known SIDs first
                        switch ($identitySID) {
                            "S-1-3-0" { $identity = "CREATOR OWNER" }
                            "S-1-3-1" { $identity = "CREATOR GROUP" }
                            "S-1-3-2" { $identity = "OWNER SERVER" }
                            "S-1-3-3" { $identity = "GROUP SERVER" }
                            "S-1-3-4" { $identity = "OWNER RIGHTS" }
                            default {
                                # Try to resolve the SID to a readable name
                                try {
                                    $sidObj = New-Object System.Security.Principal.SecurityIdentifier($identitySID)
                                    $translatedIdentity = $sidObj.Translate([System.Security.Principal.NTAccount])
                                    if ($translatedIdentity) {
                                        $identity = $translatedIdentity.Value
                                    }
                                } catch {
                                    # Keep original identity if translation fails
                                }
                            }
                        }
                    } elseif ($identity -match "^S-1-3-0") {
                        $identity = "CREATOR OWNER"
                    }
                    
                    # Also check for language-specific CREATOR OWNER names
                    if ($identity -match "CREATEUR|CREATOR|PROPRIETAIRE|OWNER" -and $identity -notmatch "CREATOR OWNER") {
                        # Try to get the SID to confirm
                        try {
                            $testSID = Get-AccountSID -AccountName $identity
                            if ($testSID -eq "S-1-3-0") {
                                $identity = "CREATOR OWNER"
                            }
                        } catch {
                            # If it looks like CREATOR OWNER in any language, standardize it
                            if ($identity -match "CREATEUR.*PROPRIETAIRE|CREATOR.*OWNER|PROPRIETAIRE.*CREATEUR") {
                                $identity = "CREATOR OWNER"
                            }
                        }
                    }
                    
                    # Initialize permission object
                    $perm = @{
                        "identityReference" = $identity
                        "fileSystemRights" = $rights
                        "accessControlType" = $accessType
                        "isInherited" = $isInherited
                        "propagationFlags" = $propagationFlags
                        "riskLevel" = "Low"
                    }
                    
                    # Check for misconfigurations
                    $issues = @()
                    $riskLevel = "Low"
                    
                    # Check if this is a legitimate system account (skip flagging)
                    $isSystemAccount = Test-IsSystemAccount -AccountName $identity
                    
                    # Determine highest effective right (to avoid duplicate findings) - MUST BE FIRST
                    $effectiveRight = "Read"
                    if ($rights -match "FullControl") {
                        $effectiveRight = "FullControl"
                    } elseif ($rights -match "Modify") {
                        $effectiveRight = "Modify"
                    } elseif ($rights -match "Write|CreateFiles|AppendData") {
                        $effectiveRight = "Write"
                    } elseif ($rights -match "Delete") {
                        $effectiveRight = "Delete"
                    }
                    
                    # Get SID for identity
                    $currentSID = Get-AccountSID -AccountName $identity
                    
                    # Handle CREATOR OWNER special case (S-1-3-0) - it's a placeholder that may not resolve via Get-AccountSID
                    if ($identity -eq "CREATOR OWNER" -or $identity -match "CREATOR.*OWNER|CREATEUR.*PROPRIETAIRE") {
                        $currentSID = "S-1-3-0"
                        $isSystemAccount = $true
                    }
                    
                    # Warning: Orphaned SID (account doesn't resolve) - but skip system accounts and CREATOR OWNER
                    if (-not $currentSID -and $identity -notmatch "^S-1-" -and -not $isSystemAccount -and $identity -ne "CREATOR OWNER" -and $identity -notmatch "CREATOR.*OWNER|CREATEUR.*PROPRIETAIRE") {
                        $issues += "Warning: Orphaned SID detected ($identity) - account may be deleted or from another domain"
                        if ($riskLevel -eq "Low") { $riskLevel = "Medium"; $folderPerms["mediumCount"]++ }
                    }
                    
                    # Warning: Deny ACEs (can cause unexpected access denials)
                    if ($accessType -eq "Deny") {
                        $issues += "Warning: Deny ACE present - Deny ACEs can cause unexpected access denials and are difficult to troubleshoot"
                        if ($riskLevel -eq "Low") { $riskLevel = "Medium"; $folderPerms["mediumCount"]++ }
                    }
                    
                    # Critical: Anonymous access (unauthenticated)
                    $anonymousSID = Get-AccountSID -AccountName "NT AUTHORITY\ANONYMOUS LOGON"
                    if ($currentSID -and $currentSID -eq "S-1-5-7" -and $accessType -eq "Allow") {
                        $issues += "Critical: Anonymous (unauthenticated) access granted - allows access without credentials"
                        $riskLevel = "Critical"
                        $folderPerms["criticalCount"]++
                    }
                    
                    # Critical: Everyone with FullControl or Modify (authenticated but broad)
                    $everyoneSID = Get-AccountSID -AccountName "Everyone"
                    if ($currentSID -and $currentSID -eq "S-1-1-0" -and $accessType -eq "Allow") {
                        if ($effectiveRight -eq "FullControl") {
                            $issues += "Critical: Full Control granted to Everyone (all authenticated users) - violates principle of least privilege"
                            $riskLevel = "Critical"
                            $folderPerms["criticalCount"]++
                        } elseif ($effectiveRight -eq "Modify") {
                            $issues += "Critical: Modify rights granted to Everyone (all authenticated users) - allows file modification/deletion by any authenticated user"
                            $riskLevel = "Critical"
                            $folderPerms["criticalCount"]++
                        } elseif ($effectiveRight -eq "Write") {
                            $issues += "High: Write access granted to Everyone (all authenticated users) - potential ransomware propagation risk"
                            if ($riskLevel -ne "Critical") { $riskLevel = "High"; $folderPerms["highCount"]++ }
                        }
                    }
                    
                    # Critical: Broad groups with FullControl or Modify
                    $authenticatedUsersSID = Get-AccountSID -AccountName "NT AUTHORITY\Authenticated Users"
                    $domainUsersSID = Get-AccountSID -AccountName "BUILTIN\Users"
                    if ($currentSID -and ($currentSID -eq "S-1-5-11" -or $currentSID -eq "S-1-5-32-545") -and $accessType -eq "Allow") {
                        if ($effectiveRight -eq "FullControl") {
                            $issues += "Critical: Full Control granted to broad group ($identity) - violates principle of least privilege"
                            $riskLevel = "Critical"
                            $folderPerms["criticalCount"]++
                        } elseif ($effectiveRight -eq "Modify") {
                            $issues += "Critical: Modify rights granted to broad group ($identity) - allows file modification/deletion by any authenticated user"
                            $riskLevel = "Critical"
                            $folderPerms["criticalCount"]++
                        } elseif ($effectiveRight -eq "Write") {
                            $issues += "High: Write access granted to broad group ($identity) - potential ransomware propagation risk"
                            if ($riskLevel -ne "Critical") { $riskLevel = "High"; $folderPerms["highCount"]++ }
                        }
                    }
                    
                    # Critical: Full Control to non-administrator accounts (skip system accounts including CREATOR OWNER)
                    if ($effectiveRight -eq "FullControl" -and $accessType -eq "Allow" -and -not $isSystemAccount -and $identity -ne "CREATOR OWNER" -and $identity -notmatch "CREATOR.*OWNER|CREATEUR.*PROPRIETAIRE") {
                        $issues += "Critical: Full Control granted to non-administrator ($identity) - violates principle of least privilege"
                        $riskLevel = "Critical"
                        $folderPerms["criticalCount"]++
                    }
                    
                    # Medium: Individual user with Modify (not broad group)
                    if ($effectiveRight -eq "Modify" -and $accessType -eq "Allow" -and -not $isSystemAccount) {
                        if ($currentSID -and $currentSID -ne "S-1-1-0" -and $currentSID -ne "S-1-5-7" -and $currentSID -ne "S-1-5-11" -and $currentSID -ne "S-1-5-32-545") {
                            if ($riskLevel -eq "Low") {
                                $issues += "Medium: Modify rights granted to individual user ($identity) - allows file modification/deletion"
                                $riskLevel = "Medium"
                                $folderPerms["mediumCount"]++
                            }
                        }
                    }
                    
                    # High: Service accounts with write access (potential privilege escalation)
                    if (($identity -match "SERVICE|SVC_|SRV_|SQL|IIS|APPPOOL|MSSQL|SQLSERVER" -or $identity -match "^.*\\SVC_|^.*\\SRV_") -and $accessType -eq "Allow") {
                        if ($effectiveRight -match "Write|Modify|FullControl") {
                            $issues += "High: Write access granted to service account ($identity) - service accounts with write access pose privilege escalation risk"
                            if ($riskLevel -ne "Critical") { $riskLevel = "High"; $folderPerms["highCount"]++ }
                        }
                    }
                    
                    # Warning: Read-only rights but folder is writable (unusual configuration)
                    if ($effectiveRight -eq "Read" -and $accessType -eq "Allow" -and -not $isInherited) {
                        # Check if folder has any write permissions (will be checked after all permissions are processed)
                        # This will be handled at folder level after processing all permissions
                    }
                    
                    # Add issues to permission
                    if ($issues.Count -gt 0) {
                        $perm["misconfigurations"] = $issues
                        $perm["riskLevel"] = $riskLevel
                        $folderPerms["hasMisconfigurations"] = $true
                        
                        if ($riskLevel -eq "Critical" -or ($riskLevel -eq "High" -and $folderPerms["riskLevel"] -ne "Critical")) {
                            $folderPerms["riskLevel"] = $riskLevel
                        } elseif ($riskLevel -eq "High" -and $folderPerms["riskLevel"] -eq "Low") {
                            $folderPerms["riskLevel"] = $riskLevel
                        } elseif ($riskLevel -eq "Medium" -and $folderPerms["riskLevel"] -eq "Low") {
                            $folderPerms["riskLevel"] = $riskLevel
                        }
                    } else {
                        $perm["misconfigurations"] = @()
                    }
                    
                    $perm["riskLevel"] = $riskLevel
                    $folderPerms["permissions"] += $perm
                } catch {
                    Write-Warning "Error processing access rule for $FolderPath : $($_.Exception.Message)"
                }
            }
        } catch {
            $folderPerms["error"] = $_.Exception.Message
        }
        
        return $folderPerms
    }
    
    # Build folder tree with permissions
    $folderTree = @()
    $ntfsMisconfigurations = @()
    $subfolders = @()
    
    # Analyze root folder
    $rootFolderInfo = Get-FolderPermissions -FolderPath $folderPath -RootPath $folderPath
    $folderTree += $rootFolderInfo
    
    # Collect misconfigurations from root folder
    foreach ($perm in $rootFolderInfo["permissions"]) {
        if ($perm["misconfigurations"] -and $perm["misconfigurations"].Count -gt 0) {
            $permCopy = @{}
            foreach ($key in $perm.Keys) {
                $permCopy[$key] = $perm[$key]
            }
            $permCopy["path"] = $folderPath
            $ntfsMisconfigurations += $permCopy
        }
    }
    
    # Recursively get all subfolders
    try {
        $allFolders = Get-ChildItem -Path $folderPath -Directory -Recurse -ErrorAction SilentlyContinue
        foreach ($subFolder in $allFolders) {
            $subFolderInfo = Get-FolderPermissions -FolderPath $subFolder.FullName -RootPath $folderPath
            $folderTree += $subFolderInfo
            
            # Collect misconfigurations from subfolder
            foreach ($perm in $subFolderInfo["permissions"]) {
                if ($perm["misconfigurations"] -and $perm["misconfigurations"].Count -gt 0) {
                    $permCopy = @{}
                    foreach ($key in $perm.Keys) {
                        $permCopy[$key] = $perm[$key]
                    }
                    $permCopy["path"] = $subFolder.FullName
                    $ntfsMisconfigurations += $permCopy
                }
            }
            
            if ($subFolderInfo["hasMisconfigurations"]) {
                $subfolders += $subFolderInfo
            }
        }
    } catch {
        $folderInfo["subfoldersError"] = $_.Exception.Message
    }
    
    $folderInfo["folderTree"] = $folderTree
    $folderInfo["ntfsMisconfigurations"] = $ntfsMisconfigurations
    $folderInfo["subfoldersWithIssues"] = $subfolders
    $folderInfo["subfoldersAnalyzed"] = if ($allFolders) { ($allFolders | Measure-Object).Count } else { 0 }
    $folderInfo["totalFoldersAnalyzed"] = $folderTree.Count
    
    # Inheritance Integrity Scan
    $inheritanceIntegrity = @{
        "foldersBreakingInheritance" = @()
        "deepInheritanceChains" = @()
        "explicitDuplicatingInherited" = @()
        "orphanedACLEntries" = @()
        "creatorOwnerOnSharedRoot" = @()
    }
    
    try {
        foreach ($folder in $folderTree) {
            if (-not $folder -or -not $folder.path) { continue }
            
            $folderPath = $folder.path
            $relativePath = $folder.relativePath
            $permissions = $folder.permissions
            
            if (-not $permissions -or $permissions.Count -eq 0) { continue }
            
            # Calculate inheritance depth (count of backslashes in relative path)
            $inheritanceDepth = 0
            if ($relativePath -and $relativePath -ne ".") {
                $inheritanceDepth = ($relativePath.ToCharArray() | Where-Object { $_ -eq '\' }).Count
            }
            
            # Get ACL to check inheritance protection
            try {
                $acl = Get-Acl -Path $folderPath -ErrorAction SilentlyContinue
                if ($acl) {
                    $isInheritanceProtected = $acl.AreAccessRulesProtected
                    $hasExplicit = $false
                    $hasInherited = $false
                    $explicitPerms = @()
                    $inheritedPerms = @()
                    $orphanedSIDs = @()
                    $hasCreatorOwnerFullControl = $false
                    
                    foreach ($perm in $permissions) {
                        if ($perm.isInherited) {
                            $hasInherited = $true
                            $inheritedPerms += $perm
                        } else {
                            $hasExplicit = $true
                            $explicitPerms += $perm
                        }
                        
                        # Check for orphaned SID
                        $identity = $perm.identityReference
                        if ($identity -and $identity -notmatch "^S-1-") {
                            $sid = Get-AccountSID -AccountName $identity
                            if (-not $sid -and $identity -ne "CREATOR OWNER" -and $identity -notmatch "CREATOR.*OWNER|CREATEUR.*PROPRIETAIRE") {
                                $orphanedSIDs += @{
                                    "folder" = $relativePath
                                    "identity" = $identity
                                    "rights" = $perm.fileSystemRights
                                }
                            }
                        }
                        
                        # Check for CREATOR OWNER with FullControl
                        if ($identity -and ($identity -eq "CREATOR OWNER" -or $identity -match "CREATOR.*OWNER|CREATEUR.*PROPRIETAIRE") -and $perm.fileSystemRights -match "FullControl") {
                            if ($relativePath -eq "." -or $inheritanceDepth -eq 0) {
                                $hasCreatorOwnerFullControl = $true
                            }
                        }
                    }
                    
                    # Check for broken inheritance
                    if ($isInheritanceProtected -and $hasExplicit -and $hasInherited) {
                        $inheritanceIntegrity["foldersBreakingInheritance"] += @{
                            "folder" = $relativePath
                            "depth" = $inheritanceDepth
                            "explicitCount" = $explicitPerms.Count
                            "inheritedCount" = $inheritedPerms.Count
                            "riskLevel" = if ($inheritanceDepth -gt 3) { "Critical" } else { "High" }
                        }
                    }
                    
                    # Check for deep inheritance chains (> 3 levels)
                    if ($inheritanceDepth -gt 3 -and $isInheritanceProtected) {
                        $inheritanceIntegrity["deepInheritanceChains"] += @{
                            "folder" = $relativePath
                            "depth" = $inheritanceDepth
                            "hasBrokenInheritance" = ($isInheritanceProtected -and $hasExplicit -and $hasInherited)
                        }
                    }
                    
                    # Check for explicit permissions duplicating inherited rights
                    # Skip system accounts (Administrators, SYSTEM, CREATOR OWNER, etc.) as they are expected
                    foreach ($explicitPerm in $explicitPerms) {
                        $identity = $explicitPerm.identityReference
                        $isSystemAccount = Test-IsSystemAccount -AccountName $identity
                        
                        # Skip system accounts - they are expected to have explicit permissions
                        if ($isSystemAccount) { continue }
                        
                        foreach ($inheritedPerm in $inheritedPerms) {
                            if ($explicitPerm.identityReference -eq $inheritedPerm.identityReference -and 
                                $explicitPerm.fileSystemRights -eq $inheritedPerm.fileSystemRights -and
                                $explicitPerm.accessControlType -eq $inheritedPerm.accessControlType) {
                                $inheritanceIntegrity["explicitDuplicatingInherited"] += @{
                                    "folder" = $relativePath
                                    "identity" = $explicitPerm.identityReference
                                    "rights" = $explicitPerm.fileSystemRights
                                    "depth" = $inheritanceDepth
                                }
                                break
                            }
                        }
                    }
                    
                    # Add orphaned SIDs
                    if ($orphanedSIDs.Count -gt 0) {
                        $inheritanceIntegrity["orphanedACLEntries"] += @{
                            "folder" = $relativePath
                            "orphanedSIDs" = $orphanedSIDs
                        }
                    }
                    
                    # Check for CREATOR OWNER with FullControl on shared root
                    # Note: CREATOR OWNER with FullControl on root is actually normal Windows behavior
                    # Only flag it if it's on a non-root folder (which would be unusual)
                    # For root folder, CREATOR OWNER is expected and should not be flagged
                    if ($hasCreatorOwnerFullControl -and $relativePath -ne "." -and $inheritanceDepth -gt 0) {
                        $inheritanceIntegrity["creatorOwnerOnSharedRoot"] += @{
                            "folder" = $relativePath
                            "rights" = "FullControl"
                        }
                    }
                }
            } catch {
                # Skip if ACL cannot be retrieved
            }
        }
    } catch {
        $folderInfo["inheritanceIntegrityError"] = $_.Exception.Message
    }
    
    $folderInfo["inheritanceIntegrity"] = $inheritanceIntegrity
    
    # Unauthenticated Access Exposure Scan
    $unauthenticatedAccess = @{
        "anonymousAccessPaths" = @()
        "guestReadableFolders" = @()
        "guestWritableFolders" = @()
        "smbAnonymousEnumeration" = $false
        "offlineFilesWithAnonymous" = @()
    }
    
    try {
        # Check SMB settings for anonymous enumeration
        try {
            $smbServerConfig = Get-SmbServerConfiguration -ErrorAction SilentlyContinue
            if ($smbServerConfig) {
                # Check if anonymous enumeration is allowed
                # RestrictNullSessionAccess controls anonymous enumeration
                # If it's $false, anonymous enumeration is allowed
                if ($smbServerConfig.RestrictNullSessionAccess -eq $false) {
                    $unauthenticatedAccess["smbAnonymousEnumeration"] = $true
                } else {
                    $unauthenticatedAccess["smbAnonymousEnumeration"] = $false
                }
            }
        } catch {
            # Cannot determine SMB anonymous enumeration setting - default to false (safe assumption)
            $unauthenticatedAccess["smbAnonymousEnumeration"] = $false
        }
        
        # Anonymous SID: S-1-5-7 (NT AUTHORITY\ANONYMOUS LOGON)
        # Guests SID: S-1-5-32-546 (BUILTIN\Guests)
        $anonymousSID = "S-1-5-7"
        $guestsSID = "S-1-5-32-546"
        
        foreach ($folder in $folderTree) {
            if (-not $folder -or -not $folder.path -or -not $folder.permissions) { continue }
            
            $folderPath = $folder.path
            $relativePath = $folder.relativePath
            $permissions = $folder.permissions
            
            $hasAnonymousAccess = $false
            $hasGuestAccess = $false
            $anonymousRights = @()
            $guestRights = @()
            
            foreach ($perm in $permissions) {
                if (-not $perm -or -not $perm.identityReference) { continue }
                
                $identity = $perm.identityReference
                $rights = $perm.fileSystemRights
                $accessType = $perm.accessControlType
                
                # Skip Deny ACEs for this check
                if ($accessType -eq "Deny") { continue }
                
                # Get SID for identity
                $sid = Get-AccountSID -AccountName $identity
                
                # Check for Anonymous access
                if ($sid -eq $anonymousSID -or $identity -match "ANONYMOUS|Anonymous") {
                    $hasAnonymousAccess = $true
                    $anonymousRights += @{
                        "folder" = $relativePath
                        "rights" = $rights
                        "accessType" = $accessType
                    }
                }
                
                # Check for Guest access
                if ($sid -eq $guestsSID -or $identity -match "Guests|Guest") {
                    $hasGuestAccess = $true
                    $effectiveRight = "Read"
                    if ($rights -match "FullControl") {
                        $effectiveRight = "FullControl"
                    } elseif ($rights -match "Modify") {
                        $effectiveRight = "Modify"
                    } elseif ($rights -match "Write|CreateFiles|AppendData") {
                        $effectiveRight = "Write"
                    }
                    
                    $guestRights += @{
                        "folder" = $relativePath
                        "rights" = $rights
                        "effectiveRight" = $effectiveRight
                        "accessType" = $accessType
                    }
                }
            }
            
            # Add anonymous access paths
            if ($hasAnonymousAccess) {
                $highestRight = "Read"
                foreach ($anonRight in $anonymousRights) {
                    $rightsStr = $anonRight.rights
                    if ($rightsStr -match "FullControl") {
                        $highestRight = "FullControl"
                        break
                    } elseif ($rightsStr -match "Modify" -and $highestRight -ne "FullControl") {
                        $highestRight = "Modify"
                    } elseif ($rightsStr -match "Write" -and $highestRight -notmatch "FullControl|Modify") {
                        $highestRight = "Write"
                    }
                }
                
                $unauthenticatedAccess["anonymousAccessPaths"] += @{
                    "folder" = $relativePath
                    "highestRight" = $highestRight
                    "rights" = $anonymousRights
                }
            }
            
            # Add guest access (readable and writable)
            if ($hasGuestAccess) {
                foreach ($guestRight in $guestRights) {
                    if ($guestRight.effectiveRight -eq "Read") {
                        $unauthenticatedAccess["guestReadableFolders"] += @{
                            "folder" = $relativePath
                            "rights" = $guestRight.rights
                        }
                    } elseif ($guestRight.effectiveRight -match "Write|Modify|FullControl") {
                        $unauthenticatedAccess["guestWritableFolders"] += @{
                            "folder" = $relativePath
                            "rights" = $guestRight.rights
                            "effectiveRight" = $guestRight.effectiveRight
                        }
                    }
                }
            }
        }
        
        # Check for offline files with anonymous access (data exfiltration risk)
        if ($smbShare -and $smbPermissions.Count -gt 0) {
            # Get caching mode from smbShare hashtable
            $cachingMode = $null
            if ($smbShare.ContainsKey("CachingMode")) {
                $cachingMode = $smbShare["CachingMode"]
            } elseif ($smbShare.ContainsKey("cachingMode")) {
                $cachingMode = $smbShare["cachingMode"]
            }
            
            if ($cachingMode -and $cachingMode -ne "None" -and $cachingMode -ne $null) {
                # Check if anonymous access exists on the share
                foreach ($smbPerm in $smbPermissions) {
                    $accountName = $smbPerm.accountName
                    $sid = Get-AccountSID -AccountName $accountName
                    if ($sid -eq $anonymousSID -or $accountName -match "ANONYMOUS|Anonymous") {
                        $shareName = if ($smbShare.ContainsKey("name")) { $smbShare["name"] } elseif ($smbShare.ContainsKey("Name")) { $smbShare["Name"] } else { "Unknown" }
                        $unauthenticatedAccess["offlineFilesWithAnonymous"] += @{
                            "share" = $shareName
                            "cachingMode" = $cachingMode.ToString()
                            "account" = $accountName
                            "rights" = $smbPerm.accessRight
                        }
                    }
                }
            }
        }
    } catch {
        $folderInfo["unauthenticatedAccessError"] = $_.Exception.Message
    }
    
    $folderInfo["unauthenticatedAccess"] = $unauthenticatedAccess
    
    # Check if folder is shared via SMB
    $smbShare = $null
    $smbPermissions = @()
    $smbMisconfigurations = @()
    
    try {
        # Normalize folder path for comparison
        $normalizedFolderPath = $folderPath.TrimEnd('\').ToUpper()
        
        $shares = Get-SmbShare -ErrorAction SilentlyContinue
        if ($shares) {
            $foundShare = $false
            foreach ($share in $shares) {
                # Skip administrative shares by name
                $adminShares = @("ADMIN$", "C$", "D$", "E$", "F$", "G$", "H$", "IPC$", "NETLOGON", "SYSVOL")
                $isAdministrativeShare = $false
                foreach ($adminShare in $adminShares) {
                    if ($share.Name -eq $adminShare) {
                        $isAdministrativeShare = $true
                        break
                    }
                }
                # Also skip any share ending with $ (administrative shares)
                if ($share.Name -match '\$$') {
                    $isAdministrativeShare = $true
                }
                # Skip admin share type
                if ($share.ShareType.ToString() -match "Admin") {
                    $isAdministrativeShare = $true
                }
                
                if ($isAdministrativeShare) { continue }
                
                if (-not $share.Path) { continue }
                $normalizedSharePath = $share.Path.TrimEnd('\').ToUpper()
                
                # Only match if share path exactly matches folder path (exact match only, not parent shares)
                if ($normalizedSharePath -eq $normalizedFolderPath) {
                    $foundShare = $true
                    $smbShare = @{
                        "name" = $share.Name
                        "path" = $share.Path
                        "description" = if ($share.Description) { $share.Description } else { "" }
                        "shareType" = $share.ShareType.ToString()
                        "scopeName" = $share.ScopeName
                        "continuouslyAvailable" = $share.ContinuouslyAvailable
                        "encryptData" = $share.EncryptData
                        "folderEnumerationMode" = $share.FolderEnumerationMode.ToString()
                        "concurrentUserLimit" = $share.ConcurrentUserLimit
                        "CachingMode" = if ($share.CachingMode) { $share.CachingMode.ToString() } else { "None" }
                        "isAdministrative" = $false
                        "isHidden" = $false
                    }
                    
                    # Get SMB share permissions
                    try {
                        $shareAccess = Get-SmbShareAccess -Name $share.Name -ErrorAction SilentlyContinue
                        if ($shareAccess) {
                            foreach ($access in $shareAccess) {
                                $accountName = $access.AccountName
                                $accessRightEnum = $access.AccessRight
                                $accessControlType = $access.AccessControlType.ToString()
                                
                                # Parse individual rights from the enum value
                                $rightsList = @()
                                $primaryRight = "None"
                                
                                # Get the numeric value of the enum
                                $enumValue = [int]$accessRightEnum
                                
                                # SMB Share Access Rights enum values (flags-based)
                                # Full = 0x001F0000 (2032127)
                                # Change = 0x0013011F (1245631)
                                # Read = 0x00120089 (1179785)
                                # Synchronize = 0x00100000 (1048576)
                                # TakeOwnership = 0x00080000 (524288)
                                # Modify = 0x00000116 (278)
                                # Write = 0x00000116 (278)
                                
                                # Check for Full Control (highest priority)
                                if ($enumValue -band 0x001F0000 -eq 0x001F0000 -or $enumValue -eq 2032127) {
                                    $rightsList += "Full"
                                    $primaryRight = "Full"
                                }
                                # Check for Change
                                elseif ($enumValue -band 0x0013011F -eq 0x0013011F -or $enumValue -eq 1245631) {
                                    $rightsList += "Change"
                                    $primaryRight = "Change"
                                }
                                # Check for Modify
                                elseif ($enumValue -band 0x00000116 -eq 0x00000116 -or ($enumValue -band 278) -eq 278) {
                                    $rightsList += "Modify"
                                    $primaryRight = "Modify"
                                }
                                # Check for Write
                                elseif (($enumValue -band 0x00000116) -ne 0 -and $primaryRight -eq "None") {
                                    $rightsList += "Write"
                                    $primaryRight = "Write"
                                }
                                # Check for Read
                                elseif ($enumValue -band 0x00120089 -eq 0x00120089 -or $enumValue -eq 1179785) {
                                    $rightsList += "Read"
                                    $primaryRight = "Read"
                                }
                                
                                # Check for Synchronize (can be combined with other rights)
                                if ($enumValue -band 0x00100000 -eq 0x00100000) {
                                    $rightsList += "Synchronize"
                                }
                                
                                # Check for TakeOwnership
                                if ($enumValue -band 0x00080000 -eq 0x00080000) {
                                    $rightsList += "TakeOwnership"
                                }
                                
                                # Fallback: Parse from string representation if enum parsing failed
                                if ($rightsList.Count -eq 0) {
                                    $rightsString = $accessRightEnum.ToString()
                                    # Remove parentheses and split by comma
                                    $rightsString = $rightsString.Trim('(', ')')
                                    $rightsArray = $rightsString -split ',' | ForEach-Object { $_.Trim() }
                                    $rightsList = $rightsArray
                                    
                                    # Determine primary right (highest priority)
                                    if ($rightsList -contains "Full") {
                                        $primaryRight = "Full"
                                    } elseif ($rightsList -contains "Change") {
                                        $primaryRight = "Change"
                                    } elseif ($rightsList -contains "Modify") {
                                        $primaryRight = "Modify"
                                    } elseif ($rightsList -contains "Write") {
                                        $primaryRight = "Write"
                                    } elseif ($rightsList -contains "Read") {
                                        $primaryRight = "Read"
                                    } else {
                                        $primaryRight = $rightsList[0]
                                    }
                                }
                                
                                $smbPerm = @{
                                    "accountName" = $accountName
                                    "accessRight" = $primaryRight  # Keep for backward compatibility
                                    "accessRights" = $rightsList   # New: array of individual rights
                                    "accessControlType" = $accessControlType
                                    "riskLevel" = "Low"
                                }
                                
                                # Check for SMB misconfigurations
                                $smbIssues = @()
                                $smbRiskLevel = "Low"
                                
                                # Check if this is a legitimate system account (skip flagging)
                                $isSystemAccount = Test-IsSystemAccount -AccountName $accountName
                                $currentSMBAccountSID = Get-AccountSID -AccountName $accountName
                                
                                # Critical: Anonymous SMB access (unauthenticated)
                                if ($currentSMBAccountSID -and $currentSMBAccountSID -eq "S-1-5-7" -and $accessControlType -eq "Allow") {
                                    $smbIssues += "Critical: Anonymous (unauthenticated) SMB access - allows network access without credentials"
                                    $smbRiskLevel = "Critical"
                                }
                                
                                # Critical: Everyone SMB access with Full or Change (authenticated but broad)
                                if ($currentSMBAccountSID -and $currentSMBAccountSID -eq "S-1-1-0" -and $accessControlType -eq "Allow") {
                                    if ($primaryRight -eq "Full" -or $rightsList -contains "Full") {
                                        $smbIssues += "Critical: Full SMB access to Everyone (all authenticated users) - violates principle of least privilege"
                                        $smbRiskLevel = "Critical"
                                    } elseif ($primaryRight -eq "Change" -or $rightsList -contains "Change") {
                                        $smbIssues += "Critical: Change SMB access to Everyone (all authenticated users) - allows file modification/deletion by any authenticated user"
                                        $smbRiskLevel = "Critical"
                                    }
                                }
                                
                                # Critical: Broad groups with Full or Change SMB access
                                if ($currentSMBAccountSID -and ($currentSMBAccountSID -eq "S-1-5-11" -or $currentSMBAccountSID -eq "S-1-5-32-545") -and $accessControlType -eq "Allow") {
                                    if ($primaryRight -eq "Full" -or $rightsList -contains "Full") {
                                        $smbIssues += "Critical: Full SMB access to broad group ($accountName) - violates principle of least privilege"
                                        $smbRiskLevel = "Critical"
                                    } elseif ($primaryRight -eq "Change" -or $rightsList -contains "Change") {
                                        $smbIssues += "Critical: Change SMB access to broad group ($accountName) - allows file modification/deletion by any authenticated user"
                                        $smbRiskLevel = "Critical"
                                    }
                                }
                                
                                # Critical: Full SMB access to non-administrator (skip system accounts)
                                if (($primaryRight -eq "Full" -or $rightsList -contains "Full") -and $accessControlType -eq "Allow" -and -not $isSystemAccount) {
                                    $smbIssues += "Critical: Full SMB access to non-administrator ($accountName) - violates principle of least privilege"
                                    $smbRiskLevel = "Critical"
                                }
                                
                                # High: Change SMB access to broad groups
                                if (($primaryRight -eq "Change" -or $rightsList -contains "Change") -and $accessControlType -eq "Allow") {
                                    if ($currentSMBAccountSID -and ($currentSMBAccountSID -eq "S-1-1-0" -or $currentSMBAccountSID -eq "S-1-5-11" -or $currentSMBAccountSID -eq "S-1-5-32-545")) {
                                        if ($smbRiskLevel -ne "Critical") {
                                            $smbIssues += "High: Change SMB access to broad group ($accountName) - writable share, potential ransomware propagation vector"
                                            $smbRiskLevel = "High"
                                        }
                                    }
                                }
                                
                                # Warning: Read access to Everyone
                                if (($primaryRight -eq "Read" -or $rightsList -contains "Read") -and $currentSMBAccountSID -eq "S-1-1-0" -and $accessControlType -eq "Allow") {
                                    if ($smbRiskLevel -eq "Low") {
                                        $smbIssues += "Warning: Read access granted to Everyone - information disclosure risk"
                                        $smbRiskLevel = "Medium"
                                    }
                                }
                                
                                $smbPerm["riskLevel"] = $smbRiskLevel
                                if ($smbIssues.Count -gt 0) {
                                    $smbPerm["misconfigurations"] = $smbIssues
                                    $smbMisconfigurations += $smbPerm
                                } else {
                                    $smbPerm["misconfigurations"] = @()
                                }
                                
                                $smbPermissions += $smbPerm
                            }
                        }
                    } catch {
                        $folderInfo["smbPermissionsError"] = $_.Exception.Message
                    }
                    
                    break
                }
            }
            
            if (-not $foundShare) {
                # Check if any subfolders are shared
                $subfolderShares = @()
                foreach ($share in $shares) {
                    # Skip administrative shares
                    $adminShares = @("ADMIN$", "C$", "D$", "E$", "F$", "G$", "H$", "IPC$", "NETLOGON", "SYSVOL")
                    $isAdministrativeShare = $false
                    foreach ($adminShare in $adminShares) {
                        if ($share.Name -eq $adminShare) {
                            $isAdministrativeShare = $true
                            break
                        }
                    }
                    if ($share.Name -match '\$$' -or $share.ShareType.ToString() -match "Admin" -or $isAdministrativeShare) {
                        continue
                    }
                    
                    if ($share.Path) {
                        $normalizedSharePath = $share.Path.TrimEnd('\').ToUpper()
                        # Check if share path is within the folder being audited
                        if ($normalizedSharePath.StartsWith($normalizedFolderPath + '\')) {
                            $subfolderShares += @{
                                "name" = $share.Name
                                "path" = $share.Path
                            }
                        }
                    }
                }
                
                if ($subfolderShares.Count -gt 0) {
                    $folderInfo["smbInfo"] = "Folder is not directly shared, but $($subfolderShares.Count) subfolder(s) are shared: $($subfolderShares.Name -join ', ')"
                    $folderInfo["subfolderShares"] = $subfolderShares
                } else {
                    $availableShares = $shares | Where-Object { $_.Name -notmatch '^\$' -and $_.Path } | Select-Object -ExpandProperty Path
                    if ($availableShares) {
                        $folderInfo["smbInfo"] = "Folder is not directly shared. Available shares: $($availableShares -join ', ')"
                    }
                }
            }
        }
        
    $folderInfo["smbShare"] = $smbShare
    $folderInfo["smbPermissions"] = $smbPermissions
    $folderInfo["smbMisconfigurations"] = $smbMisconfigurations
    } catch {
        $folderInfo["smbError"] = $_.Exception.Message
    }
    
    # Permission Model Analysis - Compare NTFS vs Share Permissions
    $permissionAnalysis = @()
    $permissionMisconfigurations = @()
    
    try {
        if ($smbShare -and $smbPermissions.Count -gt 0) {
            # Get NTFS permissions for the shared folder
            $ntfsAcl = Get-Acl -Path $folderPath -ErrorAction SilentlyContinue
            if ($ntfsAcl -and $ntfsAcl.Access) {
                # Create a map of NTFS permissions by account
                $ntfsPermMap = @{}
                foreach ($ntfsRule in $ntfsAcl.Access) {
                    if (-not $ntfsRule) { continue }
                    $identity = $ntfsRule.IdentityReference.Value
                    $rights = $ntfsRule.FileSystemRights.ToString()
                    $isInherited = $ntfsRule.IsInherited
                    $accessType = $ntfsRule.AccessControlType.ToString()
                    
                    if (-not $ntfsPermMap.ContainsKey($identity)) {
                        $ntfsPermMap[$identity] = @{
                            "rights" = @()
                            "hasExplicit" = $false
                            "hasInherited" = $false
                            "hasDeny" = $false
                            "hasAllow" = $false
                        }
                    }
                    
                    $ntfsPermMap[$identity]["rights"] += @{
                        "rights" = $rights
                        "isInherited" = $isInherited
                        "accessType" = $accessType
                    }
                    
                    if (-not $isInherited) {
                        $ntfsPermMap[$identity]["hasExplicit"] = $true
                    } else {
                        $ntfsPermMap[$identity]["hasInherited"] = $true
                    }
                    
                    if ($accessType -eq "Deny") {
                        $ntfsPermMap[$identity]["hasDeny"] = $true
                    } else {
                        $ntfsPermMap[$identity]["hasAllow"] = $true
                    }
                }
                
                # Compare with Share permissions
                foreach ($sharePerm in $smbPermissions) {
                    $accountName = $sharePerm.accountName
                    $shareRight = $sharePerm.accessRight
                    $shareRights = $sharePerm.accessRights  # Array of individual rights
                    $shareAccessType = $sharePerm.accessControlType
                    
                    # Skip Deny ACEs in share permissions (they're rare and usually misconfigurations)
                    if ($shareAccessType -eq "Deny") {
                        $permissionMisconfigurations += @{
                            "account" = $accountName
                            "issue" = "Warning: Deny ACE used in Share permissions - Deny ACEs in Share permissions are unusual and may indicate misconfiguration"
                            "riskLevel" = "Medium"
                            "type" = "DenyACE"
                        }
                        continue
                    }
                    
                    # Check if account has NTFS permissions
                    $hasNTFS = $ntfsPermMap.ContainsKey($accountName)
                    
                    if ($hasNTFS) {
                        $ntfsInfo = $ntfsPermMap[$accountName]
                        $ntfsRights = $ntfsInfo.rights
                        
                        # Determine effective NTFS permission level
                        $ntfsLevel = "None"
                        $hasFullControl = $false
                        $hasModify = $false
                        $hasWrite = $false
                        $hasRead = $false
                        
                        foreach ($ntfsRule in $ntfsRights) {
                            if ($ntfsRule.accessType -eq "Deny") {
                                # Deny ACEs override Allow ACEs
                                $ntfsLevel = "Denied"
                                break
                            }
                            
                            $rightsStr = $ntfsRule.rights
                            if ($rightsStr -match "FullControl") {
                                $hasFullControl = $true
                                $ntfsLevel = "FullControl"
                            } elseif ($rightsStr -match "Modify" -and $ntfsLevel -ne "FullControl") {
                                $hasModify = $true
                                $ntfsLevel = "Modify"
                            } elseif ($rightsStr -match "Write" -and $ntfsLevel -notmatch "FullControl|Modify") {
                                $hasWrite = $true
                                $ntfsLevel = "Write"
                            } elseif ($rightsStr -match "Read" -and $ntfsLevel -notmatch "FullControl|Modify|Write") {
                                $hasRead = $true
                                $ntfsLevel = "Read"
                            }
                        }
                        
                        # Map Share permission to level (use primary right from array if available)
                        $shareLevel = "None"
                        if ($shareRights -and $shareRights.Count -gt 0) {
                            if ($shareRights -contains "Full") {
                                $shareLevel = "FullControl"
                            } elseif ($shareRights -contains "Change") {
                                $shareLevel = "Modify"
                            } elseif ($shareRights -contains "Modify") {
                                $shareLevel = "Modify"
                            } elseif ($shareRights -contains "Write") {
                                $shareLevel = "Write"
                            } elseif ($shareRights -contains "Read") {
                                $shareLevel = "Read"
                            }
                        } else {
                            # Fallback to string matching
                            if ($shareRight -match "Full") {
                                $shareLevel = "FullControl"
                            } elseif ($shareRight -match "Change") {
                                $shareLevel = "Modify"
                            } elseif ($shareRight -match "Read") {
                                $shareLevel = "Read"
                            }
                        }
                        
                        # Calculate effective permission (most restrictive = intersection of Share and NTFS)
                        # Effective access = min(Share, NTFS) - the most restrictive permission applies
                        $effectiveLevel = "None"
                        if ($ntfsLevel -eq "Denied") {
                            $effectiveLevel = "Denied"
                        } elseif ($shareLevel -eq "None" -or $ntfsLevel -eq "None") {
                            $effectiveLevel = "None"
                        } else {
                            # Order: None=0, Read=1, Write=2, Modify=3, FullControl=4
                            $permissionOrder = @{ "Read" = 1; "Write" = 2; "Modify" = 3; "FullControl" = 4 }
                            $shareOrder = if ($permissionOrder.ContainsKey($shareLevel)) { $permissionOrder[$shareLevel] } else { 0 }
                            $ntfsOrder = if ($permissionOrder.ContainsKey($ntfsLevel)) { $permissionOrder[$ntfsLevel] } else { 0 }
                            
                            # Most restrictive (lowest order) wins
                            $effectiveOrder = [math]::Min($shareOrder, $ntfsOrder)
                            $effectiveLevel = ($permissionOrder.GetEnumerator() | Where-Object { $_.Value -eq $effectiveOrder } | Select-Object -First 1).Key
                            if (-not $effectiveLevel) {
                                $effectiveLevel = "Read"  # Default fallback
                            }
                        }
                        
                        # Detect misconfigurations
                        $analysisIssues = @()
                        $analysisRiskLevel = "Low"
                        
                        # Misconfiguration: Share allows Read but NTFS allows Modify/FullControl
                        if ($shareLevel -eq "Read" -and ($ntfsLevel -eq "Modify" -or $ntfsLevel -eq "FullControl")) {
                            $analysisIssues += "Critical: Share allows Read but NTFS allows $ntfsLevel - users can bypass share restrictions via direct local access"
                            $analysisRiskLevel = "Critical"
                        }
                        
                        # Misconfiguration: Share allows Modify but NTFS allows only Read
                        if ($shareLevel -eq "Modify" -and $ntfsLevel -eq "Read") {
                            $analysisIssues += "Warning: Share allows Modify but NTFS only allows Read - share permission is ineffective"
                            if ($analysisRiskLevel -ne "Critical") { $analysisRiskLevel = "Medium" }
                        }
                        
                        # Check for broken inheritance
                        if ($ntfsInfo.hasExplicit -and $ntfsInfo.hasInherited) {
                            # Mixed explicit and inherited - check if inheritance is broken
                            $aclProtection = $ntfsAcl.AreAccessRulesProtected
                            if ($aclProtection) {
                                $analysisIssues += "Warning: Broken inheritance detected - explicit permissions override inherited permissions, may cause maintenance issues"
                                if ($analysisRiskLevel -eq "Low") { $analysisRiskLevel = "Medium" }
                            }
                        }
                        
                        # Check for Deny ACEs
                        if ($ntfsInfo.hasDeny) {
                            $analysisIssues += "Warning: Deny ACEs present in NTFS permissions - Deny ACEs can cause unexpected access denials and are difficult to troubleshoot"
                            if ($analysisRiskLevel -eq "Low") { $analysisRiskLevel = "Medium" }
                        }
                        
                        # Check if all permissions are inherited (no explicit permissions)
                        if (-not $ntfsInfo.hasExplicit -and $ntfsInfo.hasInherited) {
                            # All inherited - this is usually fine, but note it
                        }
                        
                        $permissionAnalysis += @{
                            "account" = $accountName
                            "sharePermission" = if ($shareRights -and $shareRights.Count -gt 0) { $shareRights -join ", " } else { $shareRight }
                            "shareRights" = $shareRights
                            "shareLevel" = $shareLevel
                            "ntfsPermission" = $ntfsLevel
                            "effectivePermission" = $effectiveLevel
                            "hasExplicitNTFS" = $ntfsInfo.hasExplicit
                            "hasInheritedNTFS" = $ntfsInfo.hasInherited
                            "hasDenyACE" = $ntfsInfo.hasDeny
                            "brokenInheritance" = ($ntfsAcl.AreAccessRulesProtected -and $ntfsInfo.hasExplicit -and $ntfsInfo.hasInherited)
                            "issues" = $analysisIssues
                            "riskLevel" = $analysisRiskLevel
                        }
                        
                        if ($analysisIssues.Count -gt 0) {
                            foreach ($issue in $analysisIssues) {
                                $permissionMisconfigurations += @{
                                    "account" = $accountName
                                    "issue" = $issue
                                    "riskLevel" = $analysisRiskLevel
                                    "type" = if ($issue -match "bypass") { "PermissionBypass" } elseif ($issue -match "inheritance") { "BrokenInheritance" } elseif ($issue -match "Deny") { "DenyACE" } else { "Other" }
                                }
                            }
                        }
                    } else {
                        # Account has Share permission but no NTFS permission
                        $permissionAnalysis += @{
                            "account" = $accountName
                            "sharePermission" = if ($shareRights -and $shareRights.Count -gt 0) { $shareRights -join ", " } else { $shareRight }
                            "shareRights" = $shareRights
                            "shareLevel" = $shareLevel
                            "ntfsPermission" = "None"
                            "effectivePermission" = "None"
                            "hasExplicitNTFS" = $false
                            "hasInheritedNTFS" = $false
                            "hasDenyACE" = $false
                            "brokenInheritance" = $false
                            "issues" = @("Warning: Account has Share permission but no NTFS permission - share access will be denied")
                            "riskLevel" = "Medium"
                        }
                        
                        $permissionMisconfigurations += @{
                            "account" = $accountName
                            "issue" = "Warning: Account has Share permission but no NTFS permission - share access will be denied"
                            "riskLevel" = "Medium"
                            "type" = "MissingNTFS"
                        }
                    }
                }
            }
        }
    } catch {
        $folderInfo["permissionAnalysisError"] = $_.Exception.Message
    }
    
    $folderInfo["permissionAnalysis"] = $permissionAnalysis
    $folderInfo["permissionMisconfigurations"] = $permissionMisconfigurations
    
    # B. High-Risk Principals Analysis
    $highRiskPrincipals = @()
    $highRiskPrincipalSIDs = @{
        "S-1-1-0" = "Everyone"
        "S-1-5-11" = "Authenticated Users"
        "S-1-5-32-545" = "BUILTIN\Users"
        "S-1-5-7" = "Anonymous Logon"
        "S-1-5-32-546" = "Guests"
    }
    
    try {
        # Check NTFS permissions for high-risk principals
        if ($ntfsAcl -and $ntfsAcl.Access) {
            foreach ($rule in $ntfsAcl.Access) {
                if (-not $rule) { continue }
                
                $identity = $rule.IdentityReference.Value
                $rights = $rule.FileSystemRights.ToString()
                $accessType = $rule.AccessControlType.ToString()
                $isInherited = $rule.IsInherited
                
                if ($accessType -eq "Deny") { continue }
                
                # Get SID for the identity
                $identitySID = Get-AccountSID -AccountName $identity
                
                # Check if it's a high-risk principal
                $isHighRisk = $false
                $principalType = ""
                
                if ($identitySID -and $highRiskPrincipalSIDs.ContainsKey($identitySID)) {
                    $isHighRisk = $true
                    $principalType = $highRiskPrincipalSIDs[$identitySID]
                } elseif ($identity -match "^(Domain Users|Domain Computers|.*\\Domain Users|.*\\Domain Computers)" -or $identity -match "SERVICE|SVC_|SRV_|SQL|IIS|APPPOOL") {
                    $isHighRisk = $true
                    if ($identity -match "Domain Users|Domain Computers") {
                        $principalType = if ($identity -match "Domain Users") { "Domain Users" } else { "Domain Computers" }
                    } elseif ($identity -match "SERVICE|SVC_|SRV_|SQL|IIS|APPPOOL") {
                        $principalType = "Service Account"
                    } else {
                        $principalType = "Domain Group"
                    }
                }
                
                if ($isHighRisk) {
                    # Determine risk level based on rights
                    $riskLevel = "Low"
                    $riskScore = 0
                    $riskIcon = "🟢"
                    
                    if ($rights -match "FullControl") {
                        $riskLevel = "Critical"
                        $riskScore = 5
                        $riskIcon = "🔴"
                    } elseif ($rights -match "Modify") {
                        $riskLevel = "High"
                        $riskScore = 4
                        $riskIcon = "🔴"
                    } elseif ($rights -match "Write|CreateFiles|AppendData") {
                        $riskLevel = "High"
                        $riskScore = 3
                        $riskIcon = "🟠"
                    } elseif ($rights -match "Read") {
                        $riskLevel = "Medium"
                        $riskScore = 2
                        $riskIcon = "🟡"
                    } else {
                        $riskLevel = "Low"
                        $riskScore = 1
                        $riskIcon = "🟢"
                    }
                    
                    # Check Share permissions for this principal
                    $sharePermission = "None"
                    $shareRights = @()
                    $shareRiskLevel = "Low"
                    foreach ($sharePerm in $smbPermissions) {
                        if ($sharePerm.accountName -eq $identity) {
                            $shareRights = $sharePerm.accessRights
                            $sharePermission = if ($shareRights -and $shareRights.Count -gt 0) { $shareRights -join ", " } else { $sharePerm.accessRight }
                            if ($shareRights -and $shareRights.Count -gt 0) {
                                if ($shareRights -contains "Full") {
                                    $shareRiskLevel = "Critical"
                                } elseif ($shareRights -contains "Change" -or $shareRights -contains "Modify") {
                                    $shareRiskLevel = "High"
                                } elseif ($shareRights -contains "Read") {
                                    $shareRiskLevel = "Medium"
                                }
                            } else {
                                if ($sharePermission -match "Full") {
                                    $shareRiskLevel = "Critical"
                                } elseif ($sharePermission -match "Change") {
                                    $shareRiskLevel = "High"
                                } elseif ($sharePermission -match "Read") {
                                    $shareRiskLevel = "Medium"
                                }
                            }
                            break
                        }
                    }
                    
                    $highRiskPrincipals += @{
                        "principal" = $identity
                        "principalType" = $principalType
                        "sid" = $identitySID
                        "ntfsRights" = $rights
                        "ntfsRiskLevel" = $riskLevel
                        "ntfsRiskScore" = $riskScore
                        "ntfsRiskIcon" = $riskIcon
                        "sharePermission" = $sharePermission
                        "shareRights" = $shareRights
                        "shareRiskLevel" = $shareRiskLevel
                        "isInherited" = $isInherited
                        "isServiceAccount" = ($principalType -eq "Service Account")
                        "hasWriteAccess" = ($rights -match "Write|CreateFiles|AppendData|Modify|FullControl")
                    }
                }
            }
        }
        
        # Sort by risk score (highest first)
        $highRiskPrincipals = $highRiskPrincipals | Sort-Object -Property @{Expression={$_.ntfsRiskScore}; Descending=$true}, @{Expression={$_.principalType}; Descending=$false}
    } catch {
        $folderInfo["highRiskPrincipalsError"] = $_.Exception.Message
    }
    
    $folderInfo["highRiskPrincipals"] = $highRiskPrincipals
    
    # Share Enumeration - Get all SMB shares on the server
    $shareEnumeration = @()
    try {
        $computerName = $env:COMPUTERNAME
        $domainName = $env:USERDOMAIN
        $fqdn = "$computerName.$domainName"
        if (-not $fqdn -or $fqdn -eq ".") {
            $fqdn = $computerName
        }
        
        $allShares = Get-SmbShare -ErrorAction SilentlyContinue
        if ($allShares) {
            foreach ($share in $allShares) {
                try {
                    $shareName = $share.Name
                    $sharePath = $share.Path
                    $isHidden = $shareName -match '^\$'
                    $isAdmin = $share.ShareType.ToString() -match "Admin"
                    
                    # Skip administrative/system shares (we're auditing a specific folder, not all shares)
                    $adminShares = @("ADMIN$", "C$", "D$", "E$", "F$", "G$", "H$", "IPC$", "NETLOGON", "SYSVOL")
                    $isAdministrativeShare = $false
                    foreach ($adminShare in $adminShares) {
                        if ($shareName -eq $adminShare) {
                            $isAdministrativeShare = $true
                            break
                        }
                    }
                    # Also skip any share ending with $ (administrative shares)
                    if ($shareName -match '\$$' -and $shareName -ne $smbShare.Name) {
                        $isAdministrativeShare = $true
                    }
                    # Skip if it's an admin share type
                    if ($isAdmin) {
                        $isAdministrativeShare = $true
                    }
                    
                    # Skip this share if it's administrative
                    if ($isAdministrativeShare) {
                        continue
                    }
                    
                    $shareType = if ($isAdmin) { "Admin" } elseif ($isHidden) { "Hidden" } else { "Normal" }
                    
                    # Build UNC path
                    $uncPath = "\\$computerName\$shareName"
                    
                    # Get share access to check if hidden shares are exposed to non-admins
                    $shareAccessList = Get-SmbShareAccess -Name $shareName -ErrorAction SilentlyContinue
                    $nonAdminAccess = $false
                    if ($shareAccessList) {
                        foreach ($access in $shareAccessList) {
                            $accountSID = Get-AccountSID -AccountName $access.AccountName
                            $isSystemAccount = Test-IsSystemAccount -AccountName $access.AccountName
                            if (-not $isSystemAccount -and $access.AccessControlType -eq "Allow") {
                                $nonAdminAccess = $true
                                break
                            }
                        }
                    }
                    
                    # Check if share points to system folders
                    $systemFolders = @(
                        "$env:SystemRoot",
                        "$env:SystemRoot\System32",
                        "$env:SystemRoot\SysWOW64",
                        "$env:ProgramFiles",
                        "$env:ProgramFiles(x86)",
                        "$env:ProgramData"
                    )
                    $pointsToSystemFolder = $false
                    if ($sharePath) {
                        $normalizedSharePath = $sharePath.TrimEnd('\').ToUpper()
                        foreach ($sysFolder in $systemFolders) {
                            if ($sysFolder) {
                                $normalizedSysFolder = $sysFolder.TrimEnd('\').ToUpper()
                                if ($normalizedSharePath -eq $normalizedSysFolder -or $normalizedSharePath.StartsWith($normalizedSysFolder + '\')) {
                                    $pointsToSystemFolder = $true
                                    break
                                }
                            }
                        }
                    }
                    
                    # Check SMB version (SMB1 enabled)
                    $smb1Enabled = $false
                    try {
                        $smbServerConfig = Get-SmbServerConfiguration -ErrorAction SilentlyContinue
                        if ($smbServerConfig) {
                            $smb1Enabled = $smbServerConfig.EnableSMB1Protocol
                        }
                    } catch {
                        # Try alternative method
                        try {
                            $smb1Feature = Get-WindowsOptionalFeature -Online -FeatureName "SMB1Protocol" -ErrorAction SilentlyContinue
                            if ($smb1Feature -and $smb1Feature.State -eq "Enabled") {
                                $smb1Enabled = $true
                            }
                        } catch {}
                    }
                    
                    # Determine SMB version allowed
                    $smbVersion = "SMB2/3"
                    if ($smb1Enabled) {
                        $smbVersion = "SMB1/2/3"
                    }
                    
                    # Analyze NTFS permissions for this share path to determine share risk level
                    $shareRiskLevel = "Low"
                    $shareRiskIcon = "🟢"
                    $shareRiskColor = "#10b981"
                    $highestNTFSRisk = "Low"
                    $ntfsRiskDescription = ""
                    
                    if ($sharePath -and (Test-Path -Path $sharePath -PathType Container)) {
                        try {
                            $shareAcl = Get-Acl -Path $sharePath -ErrorAction SilentlyContinue
                            if ($shareAcl -and $shareAcl.Access) {
                                $riskLevels = @()
                                $riskDetails = @()  # Array of hashtables: @{Level="Critical"; Description="..."}
                                
                                foreach ($rule in $shareAcl.Access) {
                                    if (-not $rule) { continue }
                                    
                                    $identity = $rule.IdentityReference.Value
                                    $rights = $rule.FileSystemRights.ToString()
                                    $accessType = $rule.AccessControlType.ToString()
                                    
                                    # Skip Deny ACEs and system accounts for risk calculation
                                    if ($accessType -eq "Deny") { continue }
                                    $isSystemAccount = Test-IsSystemAccount -AccountName $identity
                                    if ($isSystemAccount) { continue }
                                    
                                    # Get SID for identity
                                    $identitySID = Get-AccountSID -AccountName $identity
                                    
                                    # Determine risk level based on identity and rights
                                    $ruleRisk = "Low"
                                    $ruleDescription = ""
                                    
                                    # Critical: Anonymous access
                                    if ($identitySID -eq "S-1-5-7" -or $identity -match "ANONYMOUS|Anonymous") {
                                        if ($rights -match "FullControl") {
                                            $ruleRisk = "Critical"
                                            $ruleDescription = "Anonymous logon has FullControl"
                                        } elseif ($rights -match "Modify|Write") {
                                            $ruleRisk = "Critical"
                                            $ruleDescription = "Anonymous logon has write access"
                                        } else {
                                            $ruleRisk = "High"
                                            $ruleDescription = "Anonymous logon has read access"
                                        }
                                    }
                                    # Critical: Everyone with FullControl or Modify
                                    elseif ($identitySID -eq "S-1-1-0" -or $identity -match "Everyone") {
                                        if ($rights -match "FullControl") {
                                            $ruleRisk = "Critical"
                                            $ruleDescription = "Everyone has FullControl"
                                        } elseif ($rights -match "Modify") {
                                            $ruleRisk = "Critical"
                                            $ruleDescription = "Everyone has Modify"
                                        } elseif ($rights -match "Write") {
                                            $ruleRisk = "High"
                                            $ruleDescription = "Everyone has Write"
                                        } else {
                                            $ruleRisk = "Medium"
                                            $ruleDescription = "Everyone has Read"
                                        }
                                    }
                                    # Critical: Broad groups with FullControl or Modify
                                    elseif ($identitySID -eq "S-1-5-11" -or $identitySID -eq "S-1-5-32-545" -or $identity -match "Authenticated Users|BUILTIN\\Users") {
                                        if ($rights -match "FullControl") {
                                            $ruleRisk = "Critical"
                                            $ruleDescription = "$identity has FullControl"
                                        } elseif ($rights -match "Modify") {
                                            $ruleRisk = "Critical"
                                            $ruleDescription = "$identity has Modify"
                                        } elseif ($rights -match "Write") {
                                            $ruleRisk = "High"
                                            $ruleDescription = "$identity has Write"
                                        } else {
                                            $ruleRisk = "Medium"
                                            $ruleDescription = "$identity has Read"
                                        }
                                    }
                                    # High: FullControl to non-administrator
                                    elseif ($rights -match "FullControl") {
                                        $ruleRisk = "Critical"
                                        $ruleDescription = "$identity has FullControl"
                                    }
                                    # High: Modify to non-administrator
                                    elseif ($rights -match "Modify") {
                                        $ruleRisk = "High"
                                        $ruleDescription = "$identity has Modify"
                                    }
                                    # Medium: Write to non-administrator
                                    elseif ($rights -match "Write|CreateFiles|AppendData") {
                                        $ruleRisk = "High"
                                        $ruleDescription = "$identity has Write"
                                    }
                                    
                                    if ($ruleRisk -ne "Low" -and $ruleDescription) {
                                        $riskLevels += $ruleRisk
                                        $riskDetails += @{
                                            "Level" = $ruleRisk
                                            "Description" = $ruleDescription
                                        }
                                    }
                                }
                                
                                # Determine highest risk level
                                if ($riskLevels -contains "Critical") {
                                    $highestNTFSRisk = "Critical"
                                    $shareRiskLevel = "Critical"
                                    $shareRiskIcon = "🔴"
                                    $shareRiskColor = "#ef4444"
                                } elseif ($riskLevels -contains "High") {
                                    $highestNTFSRisk = "High"
                                    $shareRiskLevel = "High"
                                    $shareRiskIcon = "🟠"
                                    $shareRiskColor = "#f59e0b"
                                } elseif ($riskLevels -contains "Medium") {
                                    $highestNTFSRisk = "Medium"
                                    $shareRiskLevel = "Medium"
                                    $shareRiskIcon = "🟡"
                                    $shareRiskColor = "#fbbf24"
                                }
                            }
                        } catch {
                            # Cannot analyze NTFS permissions for this share
                        }
                    }
                    
                    # Collect red flags (including NTFS risk)
                    $redFlags = @()
                    if ($smb1Enabled) {
                        $redFlags += "SMB1 enabled"
                    }
                    if ($isHidden -and $nonAdminAccess) {
                        $redFlags += "Hidden share exposed to non-admins"
                    }
                    if ($pointsToSystemFolder) {
                        $redFlags += "Share points to system folder"
                    }
                    # Add NTFS risk as red flags if Critical or High
                    if ($shareRiskLevel -eq "Critical" -or $shareRiskLevel -eq "High") {
                        # Get all critical risks first
                        $criticalRisks = $riskDetails | Where-Object { $_.Level -eq "Critical" } | ForEach-Object { $_.Description }
                        # Get high risks (only if no critical risks, or if share risk is High)
                        $highRisks = $riskDetails | Where-Object { $_.Level -eq "High" } | ForEach-Object { $_.Description }
                        
                        # Add critical risks first
                        foreach ($risk in $criticalRisks) {
                            $redFlags += "NTFS: $risk"
                        }
                        
                        # Add high risks if no critical risks found, or if share risk is High
                        if ($criticalRisks.Count -eq 0 -or $shareRiskLevel -eq "High") {
                            foreach ($risk in $highRisks) {
                                $redFlags += "NTFS: $risk"
                            }
                        }
                        
                        # Fallback if no details captured
                        if (($redFlags | Where-Object { $_ -match "^NTFS:" }).Count -eq 0) {
                            if ($shareRiskLevel -eq "Critical") {
                                $redFlags += "NTFS: Critical risk detected"
                            } else {
                                $redFlags += "NTFS: High risk detected"
                            }
                        }
                    }
                    
                    $shareInfo = @{
                        "shareName" = $shareName
                        "uncPath" = $uncPath
                        "localPath" = if ($sharePath) { $sharePath } else { "N/A" }
                        "hostingServer" = $computerName
                        "shareType" = $shareType
                        "offlineFilesEnabled" = if ($share.CachingMode -and $share.CachingMode -ne "None") { "Yes" } else { "No" }
                        "smbVersion" = $smbVersion
                        "encryptionRequired" = if ($share.EncryptData) { "Yes" } else { "No" }
                        "continuousAvailability" = if ($share.ContinuouslyAvailable) { "Yes" } else { "No" }
                        "redFlags" = $redFlags
                        "hasRedFlags" = ($redFlags.Count -gt 0)
                        "description" = if ($share.Description) { $share.Description } else { "" }
                        "concurrentUserLimit" = $share.ConcurrentUserLimit
                        "folderEnumerationMode" = if ($share.FolderEnumerationMode) { $share.FolderEnumerationMode.ToString() } else { "N/A" }
                        "shareRiskLevel" = $shareRiskLevel
                        "shareRiskIcon" = $shareRiskIcon
                        "shareRiskColor" = $shareRiskColor
                        "highestNTFSRisk" = $highestNTFSRisk
                    }
                    
                    $shareEnumeration += $shareInfo
                } catch {
                    Write-Warning "Error enumerating share $($share.Name): $($_.Exception.Message)"
                }
            }
        }
    } catch {
        $folderInfo["shareEnumerationError"] = $_.Exception.Message
    }
    
    $folderInfo["shareEnumeration"] = $shareEnumeration
    
    # Summary of misconfigurations with risk-based categorization
    $criticalIssues = @()
    $highRiskIssues = @()
    $mediumRiskIssues = @()
    $warningIssues = @()
    $writableShares = @()
    $leastPrivilegeViolations = @()
    
    foreach ($misconfig in $ntfsMisconfigurations) {
        $pathInfo = if ($misconfig.path -and $misconfig.path -ne $folderPath) { " (Path: $($misconfig.path))" } else { "" }
        $riskLevel = if ($misconfig.riskLevel) { $misconfig.riskLevel } else { "Low" }
        
        foreach ($issue in $misconfig.misconfigurations) {
            $issueText = "NTFS: $issue (Identity: $($misconfig.identityReference))$pathInfo"
            
            if ($issue -match "Critical:") {
                $criticalIssues += $issueText
                # Check for least privilege violations
                if ($issue -match "principle of least privilege|Full Control.*non-administrator|Modify.*broad group") {
                    $leastPrivilegeViolations += $issueText
                }
            } elseif ($issue -match "High:") {
                $highRiskIssues += $issueText
                # Check for writable shares (ransomware risk)
                if ($issue -match "Writable|ransomware|Write.*broad group") {
                    $writableShares += $issueText
                }
            } elseif ($issue -match "Warning:") {
                if ($riskLevel -eq "Medium") {
                    $mediumRiskIssues += $issueText
                } else {
                    $warningIssues += $issueText
                }
                # Check for writable shares
                if ($issue -match "Write.*broad group|allows file uploads") {
                    $writableShares += $issueText
                }
            } else {
                $warningIssues += $issueText
            }
        }
    }
    
    foreach ($misconfig in $smbMisconfigurations) {
        $riskLevel = if ($misconfig.riskLevel) { $misconfig.riskLevel } else { "Low" }
        
        foreach ($issue in $misconfig.misconfigurations) {
            $issueText = "SMB: $issue (Account: $($misconfig.accountName))"
            
            if ($issue -match "Critical:") {
                $criticalIssues += $issueText
                # Check for least privilege violations
                if ($issue -match "principle of least privilege|Full.*non-administrator|Change.*broad group") {
                    $leastPrivilegeViolations += $issueText
                }
            } elseif ($issue -match "High:") {
                $highRiskIssues += $issueText
                # Check for writable shares (ransomware risk)
                if ($issue -match "writable share|ransomware|Change.*broad group") {
                    $writableShares += $issueText
                }
            } elseif ($issue -match "Warning:") {
                if ($riskLevel -eq "Medium") {
                    $mediumRiskIssues += $issueText
                } else {
                    $warningIssues += $issueText
                }
            } else {
                $warningIssues += $issueText
            }
        }
    }
    
    $folderInfo["summary"] = @{
        "criticalIssuesCount" = $criticalIssues.Count
        "highRiskIssuesCount" = $highRiskIssues.Count
        "mediumRiskIssuesCount" = $mediumRiskIssues.Count
        "warningIssuesCount" = $warningIssues.Count
        "criticalIssues" = $criticalIssues
        "highRiskIssues" = $highRiskIssues
        "mediumRiskIssues" = $mediumRiskIssues
        "warningIssues" = $warningIssues
        "writableSharesCount" = ($writableShares | Select-Object -Unique).Count
        "writableShares" = ($writableShares | Select-Object -Unique)
        "leastPrivilegeViolationsCount" = ($leastPrivilegeViolations | Select-Object -Unique).Count
        "leastPrivilegeViolations" = ($leastPrivilegeViolations | Select-Object -Unique)
        "hasMisconfigurations" = ($criticalIssues.Count -gt 0 -or $highRiskIssues.Count -gt 0 -or $mediumRiskIssues.Count -gt 0 -or $warningIssues.Count -gt 0)
        "subfoldersWithIssuesCount" = ($subfolders | Measure-Object).Count
        "subfoldersAnalyzed" = $folderInfo["subfoldersAnalyzed"]
    }
    
    $result["folderAnalysis"] = $folderInfo
    $result["auditDate"] = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $result["serverName"] = "` + serverName + `"
    
    # Convert to JSON and save output
    $outputFile = "FileShareAudit_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
    $json = $result | ConvertTo-Json -Depth 10 -Compress
    # Use .NET method to write UTF-8 without BOM
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    $fullPath = Join-Path (Get-Location).Path $outputFile
    
    if (` + func() string {
		if encrypt {
			return "$true"
		}
		return "$false"
	}() + ` -and $pubKeyB64) {
        $encryptedData = Encrypt-Data -Data $json -PublicKeyBase64 $pubKeyB64
        if (-not $encryptedData) {
            Write-Error "Failed to encrypt data"
            exit 1
        }
        try {
            [System.IO.File]::WriteAllText($fullPath, $encryptedData, $utf8NoBom)
        } catch {
            Write-Error "Failed to save file: $_"
            exit 1
        }
        Write-Host "Encrypted report data saved to: $outputFile"
    } else {
        try {
            [System.IO.File]::WriteAllText($fullPath, $json, $utf8NoBom)
        } catch {
            Write-Error "Failed to save file: $_"
            exit 1
        }
        Write-Host "Plain report data saved to: $outputFile"
        Write-Warning "Report contains unencrypted data."
    }
    
} catch {
    Write-Error "Script execution failed: $($_.Exception.Message)"
    exit 1
}`

	return script
}
