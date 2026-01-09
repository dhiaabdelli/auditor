package handlers

import (
	"bytes"
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
	"time"

	"network-script-generator/internal/database"
	"network-script-generator/internal/utils"
)

// Linux Server Report CRUD handlers
func HandleGetLinuxServerReports(w http.ResponseWriter, r *http.Request) {
	// Ensure table exists
	_, err := database.DB.Exec(`
		CREATE TABLE IF NOT EXISTS linux_server_reports (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			server_name TEXT NOT NULL,
			report_data TEXT,
			private_key TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		log.Printf("Error creating linux_server_reports table: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Migrate: Add private_key column if it doesn't exist
	if err := migrateLinuxServerReportsTable(); err != nil {
		log.Printf("Warning: Failed to migrate linux_server_reports table: %v", err)
		// Continue anyway - migration failures are not critical
	}

	rows, err := database.DB.Query(`
		SELECT id, name, server_name,
		       CASE WHEN report_data IS NOT NULL AND report_data != '' THEN 1 ELSE 0 END as has_data,
		       created_at, updated_at 
		FROM linux_server_reports 
		ORDER BY created_at DESC
	`)
	if err != nil {
		log.Printf("Error querying linux_server_reports: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var reports []map[string]interface{}
	for rows.Next() {
		var id int
		var name, serverName sql.NullString
		var hasData int
		var createdAt, updatedAt sql.NullString

		if err := rows.Scan(&id, &name, &serverName, &hasData, &createdAt, &updatedAt); err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}

		report := map[string]interface{}{
			"id":         id,
			"name":       name.String,
			"serverName": serverName.String,
			"hasData":    hasData == 1,
			"createdAt":  createdAt.String,
			"updatedAt":  updatedAt.String,
		}
		reports = append(reports, report)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(reports)
}

func HandleGetSingleLinuxServerReport(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "Report ID is required", http.StatusBadRequest)
		return
	}

	var rawJSON, privateKey sql.NullString
	err := database.DB.QueryRow(`
		SELECT report_data, private_key 
		FROM linux_server_reports 
		WHERE id = ?
	`, id).Scan(&rawJSON, &privateKey)

	if err == sql.ErrNoRows {
		http.Error(w, "Report not found", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("Error querying linux_server_reports: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if !rawJSON.Valid || rawJSON.String == "" {
		http.Error(w, "Report data not found", http.StatusNotFound)
		return
	}

	var data map[string]interface{}
	if err := json.Unmarshal([]byte(rawJSON.String), &data); err != nil {
		http.Error(w, "Invalid report data", http.StatusInternalServerError)
		return
	}

	// Check if data is encrypted and decrypt if needed
	if utils.IsEncryptedPayload(data) {
		if !privateKey.Valid || privateKey.String == "" {
			http.Error(w, "Private key not found for encrypted report", http.StatusBadRequest)
			return
		}

		decryptedData, err := utils.DecryptData(rawJSON.String, privateKey.String)
		if err != nil {
			log.Printf("Error decrypting report data: %v", err)
			http.Error(w, "Failed to decrypt report data", http.StatusInternalServerError)
			return
		}

		// Parse decrypted data
		if err := json.Unmarshal([]byte(decryptedData), &data); err != nil {
			http.Error(w, "Invalid decrypted report data", http.StatusInternalServerError)
			return
		}
	}

	// Return the full report data
	json.NewEncoder(w).Encode(data)
}

func HandleCreateLinuxServerReport(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name       string `json:"name"`
		ServerName string `json:"serverName"`
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

	result, err := database.DB.Exec(`
		INSERT INTO linux_server_reports (name, server_name)
		VALUES (?, ?)
	`, req.Name, req.ServerName)

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

func HandleUpdateLinuxServerReport(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ID         int    `json:"id"`
		Name       string `json:"name"`
		ServerName string `json:"serverName"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.ID == 0 {
		http.Error(w, "Report ID is required", http.StatusBadRequest)
		return
	}

	_, err := database.DB.Exec(`
		UPDATE linux_server_reports 
		SET name = ?, server_name = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, req.Name, req.ServerName, req.ID)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
	})
}

func HandleDeleteLinuxServerReport(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ID int `json:"id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.ID == 0 {
		http.Error(w, "Report ID is required", http.StatusBadRequest)
		return
	}

	_, err := database.DB.Exec(`
		DELETE FROM linux_server_reports 
		WHERE id = ?
	`, req.ID)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
	})
}

// HandleImportLinuxServerReport handles importing a Linux Server audit report
func HandleImportLinuxServerReport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ReportID   *int   `json:"reportId"`
		ReportData string `json:"reportData"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.ReportID == nil || *req.ReportID == 0 {
		http.Error(w, "Report ID is required", http.StatusBadRequest)
		return
	}

	if req.ReportData == "" {
		http.Error(w, "Report data is required", http.StatusBadRequest)
		return
	}

	// Parse and validate JSON
	var reportData map[string]interface{}
	if err := json.Unmarshal([]byte(req.ReportData), &reportData); err != nil {
		http.Error(w, "Invalid JSON data: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Store the report data
	_, err := database.DB.Exec(`
		UPDATE linux_server_reports 
		SET report_data = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, req.ReportData, *req.ReportID)

	if err != nil {
		log.Printf("Error updating linux_server_reports: %v", err)
		http.Error(w, "Failed to save report data", http.StatusInternalServerError)
		return
	}

	// Return success with the imported data
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    reportData,
	})
}

// HandleGenerateLinuxServerReportScript generates a bash script for Linux Server auditing
func HandleGenerateLinuxServerReportScript(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ReportID  *int  `json:"reportId"`
		Obfuscate *bool `json:"obfuscate"`
		Encrypt   *bool `json:"encrypt"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	obfuscate := false // Bash obfuscation is optional
	if req.Obfuscate != nil {
		obfuscate = *req.Obfuscate
	}
	encrypt := true
	if req.Encrypt != nil {
		encrypt = *req.Encrypt
	}

	var publicKeyPEM string
	if encrypt {
		// Check if report already has a private key (to preserve compatibility with existing encrypted data)
		var existingPrivateKey sql.NullString
		if req.ReportID != nil && *req.ReportID > 0 {
			err := database.DB.QueryRow(`
				SELECT private_key 
				FROM linux_server_reports 
				WHERE id = ?
			`, *req.ReportID).Scan(&existingPrivateKey)
			if err != nil && err != sql.ErrNoRows {
				log.Printf("Warning: Failed to check for existing private key: %v", err)
			}
		}

		var privateKey *rsa.PrivateKey
		if existingPrivateKey.Valid && existingPrivateKey.String != "" {
			// Use existing private key to maintain compatibility with previously encrypted data
			block, _ := pem.Decode([]byte(existingPrivateKey.String))
			if block == nil {
				log.Printf("Warning: Failed to decode existing private key, generating new one")
				// Fall through to generate new key
			} else {
				var parseErr error
				privateKey, parseErr = x509.ParsePKCS1PrivateKey(block.Bytes)
				if parseErr != nil {
					log.Printf("Warning: Failed to parse existing private key, generating new one: %v", parseErr)
					// Fall through to generate new key
				}
			}
		}

		// Generate new key pair only if no valid existing key was found
		if privateKey == nil {
			var err error
			privateKey, err = rsa.GenerateKey(rand.Reader, 2048)
			if err != nil {
				http.Error(w, "Failed to generate encryption keys: "+err.Error(), http.StatusInternalServerError)
				return
			}

			// Encode private key to PEM format
			privateKeyPEMBytes := pem.EncodeToMemory(&pem.Block{
				Type:  "RSA PRIVATE KEY",
				Bytes: x509.MarshalPKCS1PrivateKey(privateKey),
			})

			// Store private key in database if report ID is provided
			if req.ReportID != nil && *req.ReportID > 0 {
				_, err = database.DB.Exec(`
					UPDATE linux_server_reports 
					SET private_key = ? 
					WHERE id = ?
				`, string(privateKeyPEMBytes), *req.ReportID)
				if err != nil {
					log.Printf("Warning: Failed to store private key: %v", err)
				}
			}
		}

		// Get public key in PEM format
		publicKeyDER, err := x509.MarshalPKIXPublicKey(&privateKey.PublicKey)
		if err != nil {
			http.Error(w, "Failed to encode public key: "+err.Error(), http.StatusInternalServerError)
			return
		}
		publicKeyPEMBytes := pem.EncodeToMemory(&pem.Block{
			Type:  "PUBLIC KEY",
			Bytes: publicKeyDER,
		})
		publicKeyPEM = string(publicKeyPEMBytes)
	}

	// Generate script with appropriate options
	script := generateLinuxServerAuditScript(publicKeyPEM, encrypt)

	if obfuscate {
		// Basic bash obfuscation (can be enhanced)
		script = obfuscateBashScript(script)
	}

	response := map[string]interface{}{"script": script}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// generateLinuxServerAuditScript creates a bash script for Linux Server auditing
func generateLinuxServerAuditScript(publicKeyPEM string, encrypt bool) string {
	var script bytes.Buffer
	script.WriteString("#!/bin/bash\n")
	script.WriteString("# Linux Server Audit Data Collection Script\n")
	script.WriteString("# Generated on " + time.Now().Format("2006-01-02 15:04:05") + "\n")
	if encrypt {
		script.WriteString("# This script collects Linux Server data and outputs encrypted JSON\n\n")
	} else {
		script.WriteString("# This script collects Linux Server data and outputs plain JSON\n\n")
	}

	script.WriteString("set -euo pipefail\n\n")

	// Check for required tools
	script.WriteString("# Check for required tools\n")
	script.WriteString("if ! command -v jq >/dev/null 2>&1; then\n")
	script.WriteString("  echo \"Error: jq is required but not installed. Please install it with: apt-get install jq (Debian/Ubuntu) or yum install jq (RHEL/CentOS)\" >&2\n")
	script.WriteString("  exit 1\n")
	script.WriteString("fi\n")
	if encrypt {
		script.WriteString("if ! command -v openssl >/dev/null 2>&1; then\n")
		script.WriteString("  echo \"Error: openssl is required for encryption but not installed\" >&2\n")
		script.WriteString("  exit 1\n")
		script.WriteString("fi\n")
	}
	script.WriteString("\n")

	// Check if running as root
	script.WriteString("# Check if running as root\n")
	script.WriteString("if [ \"$EUID\" -ne 0 ]; then \n")
	script.WriteString("  echo \"Error: This script must be run as root\" >&2\n")
	script.WriteString("  exit 1\n")
	script.WriteString("fi\n\n")

	if encrypt {
		// Encode public key to base64 for embedding in script
		pubKeyB64 := base64.StdEncoding.EncodeToString([]byte(publicKeyPEM))
		script.WriteString("PUB_KEY_B64='" + pubKeyB64 + "'\n\n")

		// Add encryption function using openssl
		script.WriteString("# Function to encrypt data using RSA public key\n")
		script.WriteString("encrypt_data() {\n")
		script.WriteString("  local data=\"$1\"\n")
		script.WriteString("  echo \"$PUB_KEY_B64\" | base64 -d > /tmp/pubkey.pem\n")
		script.WriteString("  echo -n \"$data\" | openssl rsautl -encrypt -pubin -inkey /tmp/pubkey.pem | base64 -w 0\n")
		script.WriteString("  rm -f /tmp/pubkey.pem\n")
		script.WriteString("}\n\n")
	}

	script.WriteString("# Initialize result JSON object\n")
	script.WriteString("result='{}'\n\n")

	// System Information
	script.WriteString("# System Information\n")
	script.WriteString("echo \"Collecting system information...\" >&2\n")
	script.WriteString("OS_NAME=$(cat /etc/os-release | grep '^NAME=' | cut -d'=' -f2 | tr -d '\"')\n")
	script.WriteString("OS_VERSION=$(cat /etc/os-release | grep '^VERSION=' | cut -d'=' -f2 | tr -d '\"')\n")
	script.WriteString("KERNEL=$(uname -r)\n")
	script.WriteString("HOSTNAME=$(hostname)\n")
	script.WriteString("FQDN=$(hostname -f 2>/dev/null || hostname)\n")
	script.WriteString("UPTIME_SECONDS=$(cat /proc/uptime | cut -d' ' -f1 | cut -d'.' -f1)\n")
	script.WriteString("UPTIME_DAYS=$((UPTIME_SECONDS / 86400))\n")
	script.WriteString("UPTIME_HOURS=$(((UPTIME_SECONDS % 86400) / 3600))\n")
	script.WriteString("UPTIME_MINUTES=$(((UPTIME_SECONDS % 3600) / 60))\n")
	script.WriteString("UPTIME_STRING=\"${UPTIME_DAYS} days, ${UPTIME_HOURS} hours, ${UPTIME_MINUTES} minutes\"\n")
	script.WriteString("ARCHITECTURE=$(uname -m)\n")
	script.WriteString("CPU_MODEL=$(grep 'model name' /proc/cpuinfo | head -1 | cut -d':' -f2 | xargs)\n")
	script.WriteString("CPU_CORES=$(nproc)\n")
	script.WriteString("MEMORY_TOTAL_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')\n")
	script.WriteString("MEMORY_TOTAL_GB=$((MEMORY_TOTAL_KB / 1024 / 1024))\n")
	script.WriteString("MEMORY_AVAILABLE_KB=$(grep MemAvailable /proc/meminfo | awk '{print $2}')\n")
	script.WriteString("MEMORY_AVAILABLE_GB=$((MEMORY_AVAILABLE_KB / 1024 / 1024))\n")
	script.WriteString("MEMORY_USED_GB=$((MEMORY_TOTAL_GB - MEMORY_AVAILABLE_GB))\n")
	script.WriteString("MEMORY_USAGE_PERCENT=$((MEMORY_USED_GB * 100 / MEMORY_TOTAL_GB))\n\n")

	script.WriteString("result=$(echo \"$result\" | jq --arg os \"$OS_NAME\" '. + {os: $os}')\n")
	script.WriteString("result=$(echo \"$result\" | jq --arg version \"$OS_VERSION\" '. + {version: $version}')\n")
	script.WriteString("result=$(echo \"$result\" | jq --arg kernel \"$KERNEL\" '. + {kernel: $kernel}')\n")
	script.WriteString("result=$(echo \"$result\" | jq --arg hostname \"$HOSTNAME\" '. + {hostname: $hostname}')\n")
	script.WriteString("result=$(echo \"$result\" | jq --arg fqdn \"$FQDN\" '. + {fqdn: $fqdn}')\n")
	script.WriteString("result=$(echo \"$result\" | jq --arg uptime \"$UPTIME_STRING\" '. + {uptime: $uptime}')\n")
	script.WriteString("result=$(echo \"$result\" | jq --arg arch \"$ARCHITECTURE\" '. + {architecture: $arch}')\n")
	script.WriteString("result=$(echo \"$result\" | jq --arg cpu \"$CPU_MODEL\" '. + {cpuModel: $cpu}')\n")
	script.WriteString("result=$(echo \"$result\" | jq --argjson cores $CPU_CORES '. + {cpuCores: $cores}')\n")
	script.WriteString("result=$(echo \"$result\" | jq --argjson totalGB $MEMORY_TOTAL_GB '. + {memoryTotalGB: $totalGB}')\n")
	script.WriteString("result=$(echo \"$result\" | jq --argjson availableGB $MEMORY_AVAILABLE_GB '. + {memoryAvailableGB: $availableGB}')\n")
	script.WriteString("result=$(echo \"$result\" | jq --argjson usedGB $MEMORY_USED_GB '. + {memoryUsedGB: $usedGB}')\n")
	script.WriteString("result=$(echo \"$result\" | jq --argjson usagePercent $MEMORY_USAGE_PERCENT '. + {memoryUsagePercent: $usagePercent}')\n\n")

	// Network Configuration
	script.WriteString("# Network Configuration\n")
	script.WriteString("echo \"Collecting network configuration...\" >&2\n")
	script.WriteString("if command -v ip >/dev/null 2>&1; then\n")
	script.WriteString("  INTERFACES=$(ip -j addr show 2>/dev/null || echo '[]')\n")
	script.WriteString("  ROUTES=$(ip -j route show 2>/dev/null || echo '[]')\n")
	script.WriteString("else\n")
	script.WriteString("  # Fallback to ifconfig/route and convert to JSON\n")
	script.WriteString("  INTERFACES='[]'\n")
	script.WriteString("  ROUTES='[]'\n")
	script.WriteString("fi\n")
	script.WriteString("result=$(echo \"$result\" | jq --argjson interfaces \"$INTERFACES\" '. + {interfaces: $interfaces}')\n")
	script.WriteString("result=$(echo \"$result\" | jq --argjson routes \"$ROUTES\" '. + {routes: $routes}')\n\n")

	// Disk Information
	script.WriteString("# Disk Information\n")
	script.WriteString("echo \"Collecting disk information...\" >&2\n")
	script.WriteString("DISKS=$(df -h | awk 'NR>1 {gsub(/\\\"/, \"\\\\\\\"\", $1); gsub(/\\\"/, \"\\\\\\\"\", $2); gsub(/\\\"/, \"\\\\\\\"\", $3); gsub(/\\\"/, \"\\\\\\\"\", $4); gsub(/\\\"/, \"\\\\\\\"\", $5); gsub(/\\\"/, \"\\\\\\\"\", $6); print \"{\\\"filesystem\\\":\\\"\"$1\"\\\",\\\"size\\\":\\\"\"$2\"\\\",\\\"used\\\":\\\"\"$3\"\\\",\\\"available\\\":\\\"\"$4\"\\\",\\\"usePercent\\\":\\\"\"$5\"\\\",\\\"mounted\\\":\\\"\"$6\"\\\"}\"}' | jq -s '.')\n")
	script.WriteString("result=$(echo \"$result\" | jq --argjson disks \"$DISKS\" '. + {disks: $disks}')\n\n")

	// Installed Packages
	script.WriteString("# Installed Packages\n")
	script.WriteString("echo \"Collecting installed packages...\" >&2\n")
	script.WriteString("if command -v dpkg >/dev/null 2>&1; then\n")
	script.WriteString("  PACKAGES=$(dpkg-query -W -f='{\"name\":\"${Package}\",\"version\":\"${Version}\"}\\n' | jq -s '.')\n")
	script.WriteString("elif command -v rpm >/dev/null 2>&1; then\n")
	script.WriteString("  PACKAGES=$(rpm -qa --queryformat '{\"name\":\"%{NAME}\",\"version\":\"%{VERSION}\"}\\n' | jq -s '.')\n")
	script.WriteString("elif command -v pacman >/dev/null 2>&1; then\n")
	script.WriteString("  PACKAGES=$(pacman -Q | awk '{print \"{\\\"name\\\":\\\"\"$1\"\\\",\\\"version\\\":\\\"\"$2\"\\\"}\"}' | jq -s '.')\n")
	script.WriteString("else\n")
	script.WriteString("  PACKAGES='[]'\n")
	script.WriteString("fi\n")
	script.WriteString("result=$(echo \"$result\" | jq --argjson packages \"$PACKAGES\" '. + {packages: $packages}')\n\n")

	// Services
	script.WriteString("# Services\n")
	script.WriteString("echo \"Collecting service information...\" >&2\n")
	script.WriteString("if command -v systemctl >/dev/null 2>&1; then\n")
	script.WriteString("  SERVICES=$(systemctl list-units --type=service --no-pager -o json | jq -r '.[] | {name: .unit, status: .active_state, enabled: .unit_file_state}' | jq -s '.')\n")
	script.WriteString("elif command -v service >/dev/null 2>&1; then\n")
	script.WriteString("  SERVICES=$(service --status-all 2>/dev/null | awk '{print \"{\\\"name\\\":\\\"\"$4\"\\\",\\\"status\\\":\\\"unknown\\\"}\"}' | jq -s '.')\n")
	script.WriteString("else\n")
	script.WriteString("  SERVICES='[]'\n")
	script.WriteString("fi\n")
	script.WriteString("result=$(echo \"$result\" | jq --argjson services \"$SERVICES\" '. + {services: $services}')\n\n")

	// Users
	script.WriteString("# Users\n")
	script.WriteString("echo \"Collecting user information...\" >&2\n")
	script.WriteString("USERS=$(getent passwd | awk -F: '{print \"{\\\"name\\\":\\\"\"$1\"\\\",\\\"uid\\\":\"$3\",\\\"gid\\\":\"$4\",\\\"home\\\":\\\"\"$6\"\\\",\\\"shell\\\":\\\"\"$7\"\\\"}\"}' | jq -s '.')\n")
	script.WriteString("result=$(echo \"$result\" | jq --argjson users \"$USERS\" '. + {users: $users}')\n\n")

	// Groups
	script.WriteString("# Groups\n")
	script.WriteString("echo \"Collecting group information...\" >&2\n")
	script.WriteString("GROUPS=$(getent group | awk -F: '{print \"{\\\"name\\\":\\\"\"$1\"\\\",\\\"gid\\\":\"$3\"}\"}' | jq -s '.')\n")
	script.WriteString("result=$(echo \"$result\" | jq --argjson groups \"$GROUPS\" '. + {groups: $groups}')\n\n")

	// Listening Ports
	script.WriteString("# Listening Ports\n")
	script.WriteString("echo \"Collecting listening ports...\" >&2\n")
	script.WriteString("if command -v ss >/dev/null 2>&1; then\n")
	script.WriteString("  PORTS=$(ss -tuln | awk 'NR>1 {print \"{\\\"protocol\\\":\\\"\"$1\"\\\",\\\"localAddress\\\":\\\"\"$4\"\\\",\\\"state\\\":\\\"\"$5\"\\\"}\"}' | jq -s '.')\n")
	script.WriteString("elif command -v netstat >/dev/null 2>&1; then\n")
	script.WriteString("  PORTS=$(netstat -tuln | awk 'NR>2 {print \"{\\\"protocol\\\":\\\"\"$1\"\\\",\\\"localAddress\\\":\\\"\"$4\"\\\",\\\"state\\\":\\\"\"$6\"\\\"}\"}' | jq -s '.')\n")
	script.WriteString("else\n")
	script.WriteString("  PORTS='[]'\n")
	script.WriteString("fi\n")
	script.WriteString("result=$(echo \"$result\" | jq --argjson ports \"$PORTS\" '. + {listeningPorts: $ports}')\n\n")

	// Processes
	script.WriteString("# Processes\n")
	script.WriteString("echo \"Collecting process information...\" >&2\n")
	script.WriteString("PROCESSES=$(ps aux | awk 'NR>1 {cmd=\"\"; for(i=11;i<=NF;i++) {if(i>11) cmd=cmd\" \"; gsub(/\\\"/, \"\\\\\\\"\", $i); cmd=cmd$i} gsub(/\\\"/, \"\\\\\\\"\", $1); print \"{\\\"user\\\":\\\"\"$1\"\\\",\\\"pid\\\":\"$2\",\\\"cpu\\\":\"$3\",\\\"mem\\\":\"$4\",\\\"command\\\":\\\"\"cmd\"\\\"}\"}' | jq -s '.')\n")
	script.WriteString("result=$(echo \"$result\" | jq --argjson processes \"$PROCESSES\" '. + {processes: $processes}')\n\n")

	// Output result
	script.WriteString("# Output result\n")
	if encrypt {
		script.WriteString("ENCRYPTED=$(encrypt_data \"$result\")\n")
		script.WriteString("echo \"{\\\"encrypted\\\":true,\\\"data\\\":\\\"$ENCRYPTED\\\"}\"\n")
	} else {
		script.WriteString("echo \"$result\"\n")
	}

	return script.String()
}

// obfuscateBashScript performs basic obfuscation on bash scripts
func obfuscateBashScript(script string) string {
	// Basic obfuscation: base64 encode and wrap in eval
	encoded := base64.StdEncoding.EncodeToString([]byte(script))
	return "#!/bin/bash\neval \"$(echo '" + encoded + "' | base64 -d)\"\n"
}

// migrateLinuxServerReportsTable adds missing columns to linux_server_reports table
func migrateLinuxServerReportsTable() error {
	// Check if private_key column exists
	var count int
	err := database.DB.QueryRow("SELECT COUNT(*) FROM pragma_table_info('linux_server_reports') WHERE name='private_key'").Scan(&count)
	if err != nil || count == 0 {
		// Add private_key column
		_, err = database.DB.Exec("ALTER TABLE linux_server_reports ADD COLUMN private_key TEXT")
		if err != nil && !strings.Contains(err.Error(), "duplicate column") {
			return err
		}
		log.Printf("Added private_key column to linux_server_reports table")
	}
	return nil
}

