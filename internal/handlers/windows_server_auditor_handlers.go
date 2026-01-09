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
	"io"
	"log"
	"net/http"
	"os/exec"
	"strings"
	"time"

	"network-script-generator/internal/database"
	"network-script-generator/internal/scripts"
	"network-script-generator/internal/utils"
)

// Windows Server Report CRUD handlers
func HandleGetWindowsServerReports(w http.ResponseWriter, r *http.Request) {
	// Ensure table exists
	_, err := database.DB.Exec(`
		CREATE TABLE IF NOT EXISTS windows_server_reports (
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
		log.Printf("Error creating windows_server_reports table: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Migrate: Add private_key column if it doesn't exist
	if err := migrateWindowsServerReportsTable(); err != nil {
		log.Printf("Warning: Failed to migrate windows_server_reports table: %v", err)
		// Continue anyway - migration failures are not critical
	}

	rows, err := database.DB.Query(`
		SELECT id, name, server_name,
		       CASE WHEN report_data IS NOT NULL AND report_data != '' THEN 1 ELSE 0 END as has_data,
		       created_at, updated_at 
		FROM windows_server_reports 
		ORDER BY created_at DESC
	`)
	if err != nil {
		log.Printf("Error querying windows_server_reports: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var reports []map[string]interface{}
	for rows.Next() {
		var id int
		var name, serverName sql.NullString
		var hasData int
		var createdAt, updatedAt string

		err := rows.Scan(&id, &name, &serverName, &hasData, &createdAt, &updatedAt)
		if err != nil {
			continue
		}

		report := map[string]interface{}{
			"id":         id,
			"name":       name.String,
			"serverName": serverName.String,
			"hasData":    hasData == 1,
			"createdAt":  createdAt,
			"updatedAt":  updatedAt,
		}

		reports = append(reports, report)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(reports)
}

func HandleGetSingleWindowsServerReport(w http.ResponseWriter, r *http.Request) {
	// Extract report ID from URL path
	path := strings.TrimPrefix(r.URL.Path, "/api/windows-server-reports/")
	reportID := strings.Split(path, "/")[0]

	if reportID == "" {
		http.Error(w, "Missing report ID", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	var name, serverName, reportData, privateKey sql.NullString
	var createdAt, updatedAt string

	err := database.DB.QueryRow(`
		SELECT name, server_name, report_data, private_key, created_at, updated_at 
		FROM windows_server_reports 
		WHERE id = ?`, reportID).Scan(
		&name, &serverName, &reportData, &privateKey, &createdAt, &updatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Report not found", http.StatusNotFound)
		} else {
			log.Printf("Error querying report: %v", err)
			http.Error(w, "Database error", http.StatusInternalServerError)
		}
		return
	}

	if !reportData.Valid || reportData.String == "" {
		http.Error(w, "Report data not found", http.StatusNotFound)
		return
	}

	// Try to parse as plain JSON first
	var data map[string]interface{}
	rawJSON := strings.TrimSpace(reportData.String)

	if err := json.Unmarshal([]byte(rawJSON), &data); err != nil {
		http.Error(w, "Invalid report data format", http.StatusInternalServerError)
		return
	}

	// Check if data is encrypted and decrypt if needed
	if utils.IsEncryptedPayload(data) {
		if !privateKey.Valid || privateKey.String == "" {
			http.Error(w, "Private key not found for encrypted report", http.StatusBadRequest)
			return
		}

		decryptedData, err := utils.DecryptData(rawJSON, privateKey.String)
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

func HandleCreateWindowsServerReport(w http.ResponseWriter, r *http.Request) {
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
		INSERT INTO windows_server_reports (name, server_name)
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

func HandleUpdateWindowsServerReport(w http.ResponseWriter, r *http.Request) {
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
		UPDATE windows_server_reports 
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

func HandleDeleteWindowsServerReport(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "ID required", http.StatusBadRequest)
		return
	}

	_, err := database.DB.Exec("DELETE FROM windows_server_reports WHERE id = ?", id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

// HandleAuditWindowsServer performs a comprehensive audit of a Windows Server
func HandleAuditWindowsServer(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ReportID      int    `json:"reportId"`
		ServerName    string `json:"serverName"`
		ServerAddress string `json:"serverAddress"`
		Username      string `json:"username"`
		Password      string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.ReportID == 0 {
		http.Error(w, "Report ID is required", http.StatusBadRequest)
		return
	}

	// Generate PowerShell script to audit Windows Server
	auditScript := generateWindowsServerAuditScript()

	// Execute the script (local execution for now, can be extended to remote via WinRM)
	var cmd *exec.Cmd
	if req.ServerAddress != "" && req.ServerAddress != "localhost" && req.ServerAddress != "127.0.0.1" {
		// Remote execution via WinRM (would need to implement)
		// For now, we'll use local execution
		cmd = exec.Command("powershell", "-Command", auditScript)
	} else {
		// Local execution
		cmd = exec.Command("powershell", "-Command", auditScript)
	}

	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("Error executing audit script: %v, Output: %s", err, string(output))
		http.Error(w, "Failed to execute audit: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Parse the JSON output
	var auditData map[string]interface{}
	if err := json.Unmarshal(output, &auditData); err != nil {
		log.Printf("Error parsing audit output: %v, Raw output: %s", err, string(output))
		http.Error(w, "Failed to parse audit results", http.StatusInternalServerError)
		return
	}

	// Add metadata
	auditData["auditDate"] = time.Now().Format(time.RFC3339)
	auditData["serverName"] = req.ServerName
	if req.ServerAddress != "" {
		auditData["serverAddress"] = req.ServerAddress
	}

	// Convert to JSON string
	reportDataJSON, err := json.Marshal(auditData)
	if err != nil {
		http.Error(w, "Failed to serialize audit data", http.StatusInternalServerError)
		return
	}

	// Update the report in database
	_, err = database.DB.Exec(`
		UPDATE windows_server_reports 
		SET report_data = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, string(reportDataJSON), req.ReportID)

	if err != nil {
		log.Printf("Error updating report: %v", err)
		http.Error(w, "Failed to save audit results", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    auditData,
	})
}

// generateWindowsServerAuditScript creates a comprehensive PowerShell script to audit Windows Server
func generateWindowsServerAuditScript() string {
	return `
$ErrorActionPreference = "Stop"
$result = @{}

try {
    # System Information
    $os = Get-CimInstance Win32_OperatingSystem
    $computer = Get-CimInstance Win32_ComputerSystem
    $bios = Get-CimInstance Win32_BIOS
    
    # Processor Information
    $processor = Get-CimInstance Win32_Processor | Select-Object -First 1
    
    # Get PowerShell Version
    $powershellVersion = "N/A"
    try {
        $psVersion = $PSVersionTable.PSVersion
        if ($psVersion) {
            $powershellVersion = "$($psVersion.Major).$($psVersion.Minor).$($psVersion.Build)"
            if ($psVersion.Revision -and $psVersion.Revision -gt 0) {
                $powershellVersion += ".$($psVersion.Revision)"
            }
        }
    } catch {
        try {
            $powershellVersion = $PSVersionTable.PSVersion.ToString()
        } catch {}
    }
    
    $result["systemInfo"] = @{
        "computerName" = $computer.Name
        "domain" = $computer.Domain
        "domainRole" = $computer.DomainRole
        "manufacturer" = $computer.Manufacturer
        "model" = $computer.Model
        "serialNumber" = $bios.SerialNumber
        "processor" = $processor.Name
        "numberOfProcessors" = $computer.NumberOfProcessors
        "numberOfCores" = $processor.NumberOfCores
        "numberOfLogicalProcessors" = $computer.NumberOfLogicalProcessors
        "osName" = $os.Caption
        "osVersion" = $os.Version
        "osBuild" = $os.BuildNumber
        "osArchitecture" = $os.OSArchitecture
        "installDate" = $os.InstallDate
        "lastBootTime" = $os.LastBootUpTime
        "totalPhysicalMemory" = [math]::Round($computer.TotalPhysicalMemory / 1GB, 2)
        "biosVersion" = $bios.Version
        "biosManufacturer" = $bios.Manufacturer
        "biosReleaseDate" = $bios.ReleaseDate
        "powershellVersion" = $powershellVersion
    }
    
    # Installed Roles and Features
    $allFeatures = Get-WindowsFeature
    $result["rolesAndFeatures"] = @{
        "installedRoles" = @($allFeatures | Where-Object { $_.FeatureType -eq "Role" } | ForEach-Object {
            @{
                "name" = $_.Name
                "displayName" = $_.DisplayName
                "description" = $_.Description
                "installed" = ($_.InstallState -eq "Installed")
            }
        })
        "installedFeatures" = @($allFeatures | Where-Object { $_.FeatureType -eq "Feature" } | ForEach-Object {
            @{
                "name" = $_.Name
                "displayName" = $_.DisplayName
                "description" = $_.Description
                "installed" = ($_.InstallState -eq "Installed")
            }
        })
        "totalCount" = ($allFeatures | Where-Object { $_.InstallState -eq "Installed" }).Count
    }
    
    # Installed Drivers
    try {
        $systemDrivers = Get-CimInstance -ClassName Win32_SystemDriver -ErrorAction SilentlyContinue
        $drivers = @()
        foreach ($driver in $systemDrivers) {
            $classDescription = $driver.Description
            if (-not $classDescription -or $classDescription -eq '') {
                $classDescription = $driver.Name
            }
            $driverInfo = @{
                "name" = $driver.Name
                "classDescription" = $classDescription
                "providerName" = $driver.PathName
                "driverVersion" = $driver.Version
                "versionDate" = if ($driver.InstallDate) { $driver.InstallDate } else { 'N/A' }
                "status" = if ($driver.State -eq 'Running') { 'OK' } else { 'Stopped' }
            }
            $drivers += $driverInfo
        }
        # Remove duplicates based on class description and driver version
        $uniqueDrivers = @{}
        $finalDrivers = @()
        foreach ($driver in $drivers) {
            $key = "$($driver.classDescription)|$($driver.driverVersion)"
            if (-not $uniqueDrivers.ContainsKey($key)) {
                $uniqueDrivers[$key] = $true
                $finalDrivers += $driver
            }
        }
        $result["drivers"] = $finalDrivers
    } catch {
        $result["drivers"] = @()
    }
    
    # Services
    $services = Get-Service | Select-Object Name, DisplayName, Status, StartType
    $result["services"] = @{
        "total" = $services.Count
        "running" = ($services | Where-Object { $_.Status -eq "Running" }).Count
        "stopped" = ($services | Where-Object { $_.Status -eq "Stopped" }).Count
        "services" = @($services | ForEach-Object {
            @{
                "name" = $_.Name
                "displayName" = $_.DisplayName
                "status" = $_.Status.ToString()
                "startType" = $_.StartType.ToString()
            }
        })
    }
    
    # Network Configuration
    $adapters = Get-NetAdapter
    $ipConfig = Get-NetIPConfiguration
    $result["network"] = @{
        "adapters" = @($adapters | ForEach-Object {
            $adapter = $_
            $config = $ipConfig | Where-Object { $_.NetAdapter.Name -eq $adapter.Name } | Select-Object -First 1
            $gateway = ""
            $dnsSuffix = ""
            $mtu = $adapter.MTUSize
            if ($config) {
                if ($config.IPv4DefaultGateway) {
                    if ($config.IPv4DefaultGateway -is [array]) {
                        $gateway = $config.IPv4DefaultGateway[0].NextHop
                    } else {
                        $gateway = $config.IPv4DefaultGateway.NextHop
                    }
                }
                if ($config.DNSSuffix) {
                    $dnsSuffix = $config.DNSSuffix
                }
            }
            @{
                "name" = $adapter.Name
                "interfaceDescription" = $adapter.InterfaceDescription
                "interfaceIndex" = $adapter.InterfaceIndex
                "linkSpeed" = $adapter.LinkSpeed
                "macAddress" = $adapter.MacAddress
                "status" = $adapter.Status.ToString()
                "mtu" = $mtu
                "ipAddresses" = if ($config) { @($config.IPv4Address.IPAddress) } else { @() }
                "gateway" = $gateway
                "dnsServers" = if ($config) { @($config.DNSServer.ServerAddresses) } else { @() }
                "dnsSuffix" = $dnsSuffix
            }
        })
    }
    
    # Network Time Protocol (NTP) Configuration
    $ntpInfo = @{}
    try {
        # Windows Time Service Status
        $w32timeService = Get-Service -Name "W32Time" -ErrorAction SilentlyContinue
        if ($w32timeService) {
            $ntpInfo["serviceStatus"] = $w32timeService.Status.ToString()
            $ntpInfo["serviceStartType"] = $w32timeService.StartType.ToString()
        } else {
            $ntpInfo["serviceStatus"] = "Not Found"
            $ntpInfo["serviceStartType"] = "N/A"
        }
        
        # Get NTP configuration from registry
        $ntpRegPath = "HKLM:\SYSTEM\CurrentControlSet\Services\W32Time\Parameters"
        
        # Time source type (NTP, NT5DS, etc.)
        $typeValue = (Get-ItemProperty -Path $ntpRegPath -Name "Type" -ErrorAction SilentlyContinue).Type
        if ($typeValue) {
            switch ($typeValue) {
                "NTP" { $ntpInfo["timeSourceType"] = "NTP" }
                "NT5DS" { $ntpInfo["timeSourceType"] = "Domain Hierarchy (NT5DS)" }
                "NoSync" { $ntpInfo["timeSourceType"] = "No Sync" }
                "AllSync" { $ntpInfo["timeSourceType"] = "All Sync" }
                default { $ntpInfo["timeSourceType"] = "Unknown ($typeValue)" }
            }
        } else {
            $ntpInfo["timeSourceType"] = "N/A"
        }
        
        # NTP Server (if configured)
        $ntpServer = (Get-ItemProperty -Path $ntpRegPath -Name "NtpServer" -ErrorAction SilentlyContinue).NtpServer
        if ($ntpServer) {
            $ntpInfo["ntpServer"] = $ntpServer
        } else {
            $ntpInfo["ntpServer"] = "N/A"
        }
        
        # Get time synchronization status using w32tm
        $syncStatus = "Unknown"
        $lastSyncTime = "N/A"
        $timeSource = "N/A"
        $pollInterval = "N/A"
        $stratum = "N/A"
        try {
            $w32tmQuery = w32tm /query /status 2>&1
            if ($LASTEXITCODE -eq 0) {
                foreach ($line in $w32tmQuery) {
                    if ($line -match "Source:\s*(.+)") {
                        $timeSource = $matches[1].Trim()
                    }
                    if ($line -match "Last Successful Sync Time:\s*(.+)") {
                        $lastSyncTime = $matches[1].Trim()
                    }
                    if ($line -match "Poll Interval:\s*(\d+)") {
                        $pollInterval = $matches[1].Trim() + " seconds"
                    }
                    if ($line -match "Stratum:\s*(\d+)") {
                        $stratum = $matches[1].Trim()
                    }
                }
                
                # Check if synchronized
                $w32tmResync = w32tm /resync /nowait 2>&1
                if ($LASTEXITCODE -eq 0) {
                    $syncStatus = "Synchronized"
                } else {
                    $syncStatus = "Not Synchronized"
                }
            }
        } catch {
            # w32tm may not be available or accessible
        }
        
        $ntpInfo["syncStatus"] = $syncStatus
        $ntpInfo["lastSyncTime"] = $lastSyncTime
        $ntpInfo["timeSource"] = $timeSource
        $ntpInfo["pollInterval"] = $pollInterval
        $ntpInfo["stratum"] = $stratum
        
        # Get NTP peers (if any)
        $ntpPeers = @()
        try {
            $w32tmPeers = w32tm /query /peers 2>&1
            if ($LASTEXITCODE -eq 0) {
                $currentPeer = $null
                foreach ($line in $w32tmPeers) {
                    if ($line -match "^#([^:]+):") {
                        if ($currentPeer) {
                            $ntpPeers += $currentPeer
                        }
                        $currentPeer = @{ "peer" = $matches[1].Trim() }
                    } elseif ($currentPeer -and $line -match "Stratum:\s*(\d+)") {
                        $currentPeer["stratum"] = $matches[1].Trim()
                    } elseif ($currentPeer -and $line -match "Time Source:\s*(.+)") {
                        $currentPeer["timeSource"] = $matches[1].Trim()
                    }
                }
                if ($currentPeer) {
                    $ntpPeers += $currentPeer
                }
            }
        } catch {
            # Error getting peers
        }
        $ntpInfo["peers"] = $ntpPeers
        
    } catch {
        $ntpInfo["error"] = $_.Exception.Message
    }
    $result["ntp"] = $ntpInfo
    
    # Installed Software
    $software = Get-CimInstance Win32_Product | Select-Object Name, Version, Vendor, InstallDate
    $result["software"] = @{
        "total" = $software.Count
        "applications" = @($software | ForEach-Object {
            @{
                "name" = $_.Name
                "version" = $_.Version
                "vendor" = $_.Vendor
                "installDate" = $_.InstallDate
            }
        })
    }
    
    # Detect Update Source (WSUS vs Microsoft Update)
    $updateSource = "Microsoft"
    try {
        $wuServer = (Get-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate" -Name "WUServer" -ErrorAction SilentlyContinue).WUServer
        if ($wuServer -and $wuServer.Trim() -ne '') {
            $updateSource = "WSUS"
        } else {
            # Check UpdateServiceManager
            try {
                $updateServiceManager = New-Object -ComObject Microsoft.Update.ServiceManager -ErrorAction SilentlyContinue
                if ($updateServiceManager) {
                    $services = $updateServiceManager.Services
                    $hasWSUS = $false
                    foreach ($service in $services) {
                        if ($service.IsDefaultAUService -and $service.ServiceID -ne '7971f918-a847-4430-9279-4a52d1efe18d') {
                            $hasWSUS = $true
                            break
                        }
                    }
                    if ($hasWSUS) {
                        $updateSource = "WSUS"
                    }
                }
            } catch {
                # COM object may not be available
            }
        }
    } catch {
        # Registry check failed, default to Microsoft
    }
    
    # Windows Updates (Installed)
    try {
        $updates = Get-HotFix -ErrorAction SilentlyContinue | Sort-Object -Property InstalledOn -Descending
        $result["windowsUpdates"] = @($updates | ForEach-Object {
            @{
                "hotFixID" = [string]$_.HotFixID
                "description" = [string]$_.Description
                "installedBy" = [string]$_.InstalledBy
                "installedOn" = if ($_.InstalledOn) { $_.InstalledOn.ToString("yyyy-MM-dd") } else { "N/A" }
                "updateSource" = $updateSource
            }
        })
    } catch {
        $result["windowsUpdates"] = @()
    }
    
    # Missing Windows Updates
    try {
        $updateSession = New-Object -ComObject Microsoft.Update.Session -ErrorAction SilentlyContinue
        if ($updateSession) {
            $updateSearcher = $updateSession.CreateUpdateSearcher()
            $searchResult = $updateSearcher.Search("IsInstalled=0 and Type='Software'")
            $missingUpdates = @()
            foreach ($update in $searchResult.Updates) {
                $kbNumber = "N/A"
                $title = $update.Title
                
                # Extract KB number from title
                if ($title -match "(?i)\bKB[\s-]?(\d{6,})\b") {
                    $kbNumber = "KB$($matches[1])"
                } elseif ($title -match "\b(\d{6,7})\b") {
                    $potentialKB = $matches[1]
                    if ($potentialKB -notmatch "^(19|20)\d{2}$" -and $potentialKB.Length -ge 6) {
                        $kbNumber = "KB$potentialKB"
                    }
                }
                if ($kbNumber -eq "N/A" -and $update.Identity.UpdateID -match "(?i)KB[\s-]?(\d{6,})") {
                    $kbNumber = "KB$($matches[1])"
                }
                
                $size = "N/A"
                if ($update.MaxDownloadSize -gt 0) {
                    $sizeMB = [math]::Round($update.MaxDownloadSize / 1MB, 2)
                    $size = "$sizeMB MB"
                }
                
                $date = "N/A"
                if ($update.LastDeploymentChangeTime) {
                    $date = $update.LastDeploymentChangeTime.ToString("yyyy-MM-dd")
                }
                
                $missingUpdates += @{
                    "title" = $title
                    "kbNumber" = $kbNumber
                    "size" = $size
                    "date" = $date
                    "updateId" = $update.Identity.UpdateID
                    "updateSource" = $updateSource
                }
            }
            $result["missingUpdates"] = $missingUpdates
        } else {
            $result["missingUpdates"] = @()
        }
    } catch {
        $result["missingUpdates"] = @()
    }
    
    # Scheduled Tasks (Inventory)
    try {
        $scheduledTasks = Get-ScheduledTask -ErrorAction SilentlyContinue
        $totalTasks = $scheduledTasks.Count
        
        # Count enabled (Ready or Running) vs disabled tasks
        $enabledTasks = ($scheduledTasks | Where-Object { $_.State -eq "Ready" -or $_.State -eq "Running" }).Count
        $disabledTasks = ($scheduledTasks | Where-Object { $_.State -eq "Disabled" }).Count
        
        $allTasks = @()
        $failedTasks = @()
        
        foreach ($task in $scheduledTasks) {
            try {
                $taskInfo = Get-ScheduledTaskInfo -TaskName $task.TaskName -TaskPath $task.TaskPath -ErrorAction SilentlyContinue
                if ($taskInfo) {
                    $lastRunTimeStr = "Never"
                    if ($taskInfo.LastRunTime -and $taskInfo.LastRunTime -ne [DateTime]::MinValue) {
                        $lastRunTimeStr = $taskInfo.LastRunTime.ToString("yyyy-MM-dd HH:mm:ss")
                    }
                    
                    $nextRunTimeStr = "N/A"
                    if ($taskInfo.NextRunTime -and $taskInfo.NextRunTime -ne [DateTime]::MinValue) {
                        $nextRunTimeStr = $taskInfo.NextRunTime.ToString("yyyy-MM-dd HH:mm:ss")
                    }
                    
                    # Check if task runs as SYSTEM
                    $runsAsSystem = $false
                    $principal = $task.Principal
                    if ($principal) {
                        $userId = $principal.UserId
                        if ($userId -eq "SYSTEM" -or $userId -like "*\SYSTEM" -or $userId -like "NT AUTHORITY\SYSTEM") {
                            $runsAsSystem = $true
                        }
                    }
                    
                    # Check if task runs PowerShell or cmd
                    $runsPowerShellOrCmd = $false
                    $actionType = ""
                    $actionCommand = ""
                    if ($task.Actions) {
                        foreach ($action in $task.Actions) {
                            if ($action.Execute) {
                                $actionCommand = $action.Execute
                                $actionType = $action.Execute
                                if ($action.Execute -like "*powershell*" -or $action.Execute -like "*pwsh*" -or $action.Arguments -like "*powershell*" -or $action.Arguments -like "*pwsh*") {
                                    $runsPowerShellOrCmd = $true
                                    $actionType = "PowerShell"
                                } elseif ($action.Execute -like "*cmd.exe*" -or $action.Execute -like "*cmd*" -or $action.Arguments -like "*cmd*") {
                                    $runsPowerShellOrCmd = $true
                                    $actionType = "CMD"
                                }
                            }
                            if ($action.Arguments) {
                                $actionCommand += " " + $action.Arguments
                            }
                        }
                    }
                    
                    # Check if task has stored credentials
                    $hasStoredCredentials = $false
                    $storedUserName = ""
                    if ($principal) {
                        if ($principal.LogonType -eq "Password" -or $principal.LogonType -eq "InteractiveTokenOrPassword") {
                            if ($principal.UserId -and $principal.UserId -ne "SYSTEM" -and $principal.UserId -notlike "*\SYSTEM" -and $principal.UserId -notlike "NT AUTHORITY\SYSTEM" -and $principal.UserId -notlike "NT AUTHORITY\LOCAL SERVICE" -and $principal.UserId -notlike "NT AUTHORITY\NETWORK SERVICE") {
                                $hasStoredCredentials = $true
                                $storedUserName = $principal.UserId
                            }
                        }
                        # Also check if RunLevel is Highest (requires stored credentials for elevation)
                        if ($principal.RunLevel -eq "Highest" -and $principal.UserId -and $principal.UserId -ne "SYSTEM" -and $principal.UserId -notlike "*\SYSTEM" -and $principal.UserId -notlike "NT AUTHORITY\SYSTEM") {
                            $hasStoredCredentials = $true
                            if (-not $storedUserName) {
                                $storedUserName = $principal.UserId
                            }
                        }
                    }
                    
                    $taskData = @{
                        taskName = $task.TaskName
                        taskPath = $task.TaskPath
                        state = $task.State.ToString()
                        lastRunTime = $lastRunTimeStr
                        lastTaskResult = if ($taskInfo.LastTaskResult -ne $null) { $taskInfo.LastTaskResult } else { 0 }
                        nextRunTime = $nextRunTimeStr
                        numberOfMissedRuns = $taskInfo.NumberOfMissedRuns
                        runsAsSystem = $runsAsSystem
                        runsPowerShellOrCmd = $runsPowerShellOrCmd
                        actionType = $actionType
                        actionCommand = $actionCommand
                        hasStoredCredentials = $hasStoredCredentials
                        storedUserName = $storedUserName
                    }
                    
                    $allTasks += $taskData
                    
                    # Check if last run result indicates failure
                    # LastTaskResult: 0 = Success, non-zero = Error/Failure
                    if ($taskInfo.LastTaskResult -ne $null -and $taskInfo.LastTaskResult -ne 0) {
                        $failedTasks += $taskData
                    }
                }
            } catch {
                # Skip tasks we can't access
            }
        }
        
        $result["scheduledTasks"] = @{
            "totalTasks" = $totalTasks
            "enabledTasks" = $enabledTasks
            "disabledTasks" = $disabledTasks
            "failedTasksCount" = $failedTasks.Count
            "allTasks" = $allTasks
            "failedTasks" = $failedTasks
        }
    } catch {
        $result["scheduledTasks"] = @{
            "totalTasks" = 0
            "enabledTasks" = 0
            "disabledTasks" = 0
            "failedTasksCount" = 0
            "allTasks" = @()
            "failedTasks" = @()
        }
    }
    
    # Security Settings
    $firewall = Get-NetFirewallProfile
    
    # Detect Antivirus
    $antivirusList = @()
    
    # Check Windows Defender (built-in)
    try {
        $defenderStatus = Get-MpComputerStatus -ErrorAction SilentlyContinue
        if ($defenderStatus) {
            $antivirusList += @{
                "name" = "Windows Defender"
                "displayName" = "Microsoft Defender Antivirus"
                "productState" = "Enabled"
                "enabled" = $defenderStatus.RealTimeProtectionEnabled
                "version" = $defenderStatus.AntivirusSignatureVersion
                "lastUpdate" = if ($defenderStatus.AntivirusSignatureLastUpdated) { $defenderStatus.AntivirusSignatureLastUpdated.ToString("yyyy-MM-dd HH:mm:ss") } else { "N/A" }
                "provider" = "Microsoft"
            }
        }
    } catch {}
    
    # Check Security Center 2 (WMI) for third-party antivirus
    try {
        $securityProducts = Get-CimInstance -Namespace root\SecurityCenter2 -ClassName AntiVirusProduct -ErrorAction SilentlyContinue
        if ($securityProducts) {
            foreach ($product in $securityProducts) {
                if ($product.displayName -like "*Windows Defender*" -or $product.displayName -like "*Microsoft Defender*") { continue }
                $productState = switch ($product.productState) {
                    { $_ -ge 262144 -and $_ -lt 393216 } { "On" }
                    { $_ -ge 393216 -and $_ -lt 524288 } { "Off" }
                    default { "Unknown" }
                }
                $antivirusList += @{
                    "name" = $product.displayName
                    "displayName" = $product.displayName
                    "productState" = $productState
                    "enabled" = $productState -eq "On"
                    "version" = "N/A"
                    "lastUpdate" = "N/A"
                    "provider" = if ($product.displayName) { ($product.displayName -split " ")[0] } else { "Unknown" }
                }
            }
        }
    } catch {}
    
    # If no antivirus found
    if ($antivirusList.Count -eq 0) {
        $antivirusList += @{
            "name" = "None Detected"
            "displayName" = "No Antivirus Detected"
            "productState" = "Not Found"
            "enabled" = $false
            "version" = "N/A"
            "lastUpdate" = "N/A"
            "provider" = "N/A"
        }
    }
    
    $result["security"] = @{
        "firewallProfiles" = @($firewall | ForEach-Object {
            @{
                "name" = $_.Name
                "enabled" = $_.Enabled
                "defaultInboundAction" = $_.DefaultInboundAction.ToString()
                "defaultOutboundAction" = $_.DefaultOutboundAction.ToString()
            }
        })
        "antivirus" = $antivirusList
    }
    
    # Event Logs (Recent Errors and Warnings)
    $errorLogs = Get-EventLog -LogName System -Newest 50 -EntryType Error | Select-Object TimeGenerated, Source, Message -First 10
    $warningLogs = Get-EventLog -LogName System -Newest 50 -EntryType Warning | Select-Object TimeGenerated, Source, Message -First 10
    $result["eventLogs"] = @{
        "recentErrors" = @($errorLogs | ForEach-Object {
            @{
                "timeGenerated" = $_.TimeGenerated.ToString("yyyy-MM-dd HH:mm:ss")
                "source" = $_.Source
                "message" = $_.Message.Substring(0, [Math]::Min(200, $_.Message.Length))
            }
        })
        "recentWarnings" = @($warningLogs | ForEach-Object {
            @{
                "timeGenerated" = $_.TimeGenerated.ToString("yyyy-MM-dd HH:mm:ss")
                "source" = $_.Source
                "message" = $_.Message.Substring(0, [Math]::Min(200, $_.Message.Length))
            }
        })
    }
    
    # IIS Configuration (if installed)
    if (Get-WindowsFeature -Name Web-Server -ErrorAction SilentlyContinue | Where-Object { $_.InstallState -eq "Installed" }) {
        try {
            Import-Module WebAdministration -ErrorAction SilentlyContinue
            $sites = Get-Website
            $result["iis"] = @{
                "installed" = $true
                "sites" = @($sites | ForEach-Object {
                    @{
                        "name" = $_.Name
                        "state" = $_.State.ToString()
                        "bindings" = @($_.Bindings | ForEach-Object { $_.Protocol + "://" + $_.BindingInformation })
                    }
                })
            }
        } catch {
            $result["iis"] = @{ "installed" = $true; "error" = $_.Exception.Message }
        }
    } else {
        $result["iis"] = @{ "installed" = $false }
    }
    
    # SQL Server Instances (if installed)
    try {
        $sqlInstances = Get-Service | Where-Object { $_.Name -like "MSSQL*" -or $_.DisplayName -like "*SQL Server*" }
        if ($sqlInstances) {
            $result["sqlServer"] = @{
                "installed" = $true
                "instances" = @($sqlInstances | ForEach-Object {
                    @{
                        "name" = $_.Name
                        "displayName" = $_.DisplayName
                        "status" = $_.Status.ToString()
                    }
                })
            }
        } else {
            $result["sqlServer"] = @{ "installed" = $false }
        }
    } catch {
        $result["sqlServer"] = @{ "installed" = $false; "error" = $_.Exception.Message }
    }
    
    # Active Directory (if domain controller)
    if ($computer.DomainRole -ge 3) {
        try {
            Import-Module ActiveDirectory -ErrorAction SilentlyContinue
            $domain = Get-ADDomain -ErrorAction SilentlyContinue
            if ($domain) {
                $result["activeDirectory"] = @{
                    "isDomainController" = $true
                    "domainName" = $domain.DNSRoot
                    "domainNetBIOSName" = $domain.NetBIOSName
                    "forestName" = $domain.Forest
                }
            }
        } catch {
            $result["activeDirectory"] = @{ "isDomainController" = $true; "error" = $_.Exception.Message }
        }
    } else {
        $result["activeDirectory"] = @{ "isDomainController" = $false }
    }
    
} catch {
    $result["error"] = $_.Exception.Message
    $result["errorDetails"] = $_.Exception.ToString()
}

$result | ConvertTo-Json -Depth 10 -Compress
`
}

// HandleGenerateWindowsServerReportScript generates a PowerShell script for Windows Server auditing
func HandleGenerateWindowsServerReportScript(w http.ResponseWriter, r *http.Request) {
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

	obfuscate := true
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
				FROM windows_server_reports 
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
					UPDATE windows_server_reports 
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
	script := generateWindowsServerAuditScriptForLocal(publicKeyPEM, encrypt)

	if obfuscate {
		script = scripts.ObfuscatePowerShellScript(script)
	}

	response := map[string]interface{}{"script": script}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// generateWindowsServerAuditScriptForLocal creates a PowerShell script for local Windows Server auditing
func generateWindowsServerAuditScriptForLocal(publicKeyPEM string, encrypt bool) string {
	var script strings.Builder
	script.WriteString("# Windows Server Audit Data Collection Script\n")
	script.WriteString("# Generated on " + time.Now().Format("2006-01-02 15:04:05") + "\n")
	if encrypt {
		script.WriteString("# This script collects Windows Server data and outputs encrypted JSON\n\n")
	} else {
		script.WriteString("# This script collects Windows Server data and outputs plain JSON\n\n")
	}

	script.WriteString("#Requires -Version 3.0\n")
	script.WriteString("#Requires -RunAsAdministrator\n\n")

	script.WriteString("$ErrorActionPreference = 'Stop'\n\n")

	if encrypt {
		// Encode public key to base64 for embedding in script
		pubKeyB64 := base64.StdEncoding.EncodeToString([]byte(publicKeyPEM))
		script.WriteString("$pubKeyB64 = '" + pubKeyB64 + "'\n\n")

		// Add encryption functions (matching Hyper-V implementation)
		script.WriteString("# Function to parse PEM public key\n")
		script.WriteString("function Parse-PEMPublicKey {\n")
		script.WriteString("    param([string]$PEM)\n")
		script.WriteString("    # Remove PEM headers/footers and whitespace\n")
		script.WriteString("    $base64 = $PEM -replace '-----BEGIN PUBLIC KEY-----', '' -replace '-----END PUBLIC KEY-----', '' -replace '\\s', ''\n")
		script.WriteString("    $keyBytes = [System.Convert]::FromBase64String($base64)\n")
		script.WriteString("    $pos = 0\n")
		script.WriteString("    \n")
		script.WriteString("    # Read SEQUENCE (0x30)\n")
		script.WriteString("    if ($keyBytes[$pos] -ne 0x30) { throw 'Invalid PEM format' }\n")
		script.WriteString("    $pos++\n")
		script.WriteString("    \n")
		script.WriteString("    # Read length (skip for now)\n")
		script.WriteString("    $len = $keyBytes[$pos]\n")
		script.WriteString("    $pos++\n")
		script.WriteString("    if ($len -gt 127) {\n")
		script.WriteString("        $lenBytes = $len - 128\n")
		script.WriteString("        $len = 0\n")
		script.WriteString("        for ($i = 0; $i -lt $lenBytes; $i++) {\n")
		script.WriteString("            $len = ($len -shl 8) -bor $keyBytes[$pos]\n")
		script.WriteString("            $pos++\n")
		script.WriteString("        }\n")
		script.WriteString("    }\n")
		script.WriteString("    \n")
		script.WriteString("    # Skip AlgorithmIdentifier (SEQUENCE)\n")
		script.WriteString("    if ($keyBytes[$pos] -eq 0x30) { $pos++ }\n")
		script.WriteString("    $algLen = $keyBytes[$pos]\n")
		script.WriteString("    $pos++\n")
		script.WriteString("    if ($algLen -gt 127) {\n")
		script.WriteString("        $lenBytes = $algLen - 128\n")
		script.WriteString("        $pos += $lenBytes\n")
		script.WriteString("    }\n")
		script.WriteString("    $pos += $algLen\n")
		script.WriteString("    \n")
		script.WriteString("    # Read BIT STRING (0x03)\n")
		script.WriteString("    if ($keyBytes[$pos] -ne 0x03) { throw 'Invalid PEM format' }\n")
		script.WriteString("    $pos++\n")
		script.WriteString("    $bitStrLen = $keyBytes[$pos]\n")
		script.WriteString("    $pos++\n")
		script.WriteString("    if ($bitStrLen -gt 127) {\n")
		script.WriteString("        $lenBytes = $bitStrLen - 128\n")
		script.WriteString("        $bitStrLen = 0\n")
		script.WriteString("        for ($i = 0; $i -lt $lenBytes; $i++) {\n")
		script.WriteString("            $bitStrLen = ($bitStrLen -shl 8) -bor $keyBytes[$pos]\n")
		script.WriteString("            $pos++\n")
		script.WriteString("        }\n")
		script.WriteString("    }\n")
		script.WriteString("    $pos++ # Skip unused bits byte\n")
		script.WriteString("    \n")
		script.WriteString("    # Read RSA public key SEQUENCE\n")
		script.WriteString("    if ($keyBytes[$pos] -ne 0x30) { throw 'Invalid RSA key format' }\n")
		script.WriteString("    $pos++\n")
		script.WriteString("    $rsaKeyLen = $keyBytes[$pos]\n")
		script.WriteString("    $pos++\n")
		script.WriteString("    if ($rsaKeyLen -gt 127) {\n")
		script.WriteString("        $lenBytes = $rsaKeyLen - 128\n")
		script.WriteString("        $rsaKeyLen = 0\n")
		script.WriteString("        for ($i = 0; $i -lt $lenBytes; $i++) {\n")
		script.WriteString("            $rsaKeyLen = ($rsaKeyLen -shl 8) -bor $keyBytes[$pos]\n")
		script.WriteString("            $pos++\n")
		script.WriteString("        }\n")
		script.WriteString("    }\n")
		script.WriteString("    \n")
		script.WriteString("    # Read modulus INTEGER (0x02)\n")
		script.WriteString("    if ($keyBytes[$pos] -ne 0x02) { throw 'Invalid modulus' }\n")
		script.WriteString("    $pos++\n")
		script.WriteString("    $modLen = $keyBytes[$pos]\n")
		script.WriteString("    $pos++\n")
		script.WriteString("    if ($modLen -gt 127) {\n")
		script.WriteString("        $lenBytes = $modLen - 128\n")
		script.WriteString("        $modLen = 0\n")
		script.WriteString("        for ($i = 0; $i -lt $lenBytes; $i++) {\n")
		script.WriteString("            $modLen = ($modLen -shl 8) -bor $keyBytes[$pos]\n")
		script.WriteString("            $pos++\n")
		script.WriteString("        }\n")
		script.WriteString("    }\n")
		script.WriteString("    # Handle leading zero\n")
		script.WriteString("    if ($keyBytes[$pos] -eq 0) { $pos++; $modLen-- }\n")
		script.WriteString("    $modulus = New-Object byte[] $modLen\n")
		script.WriteString("    [Array]::Copy($keyBytes, $pos, $modulus, 0, $modLen)\n")
		script.WriteString("    $pos += $modLen\n")
		script.WriteString("    \n")
		script.WriteString("    # Read exponent INTEGER (0x02)\n")
		script.WriteString("    if ($keyBytes[$pos] -ne 0x02) { throw 'Invalid exponent' }\n")
		script.WriteString("    $pos++\n")
		script.WriteString("    $expLen = $keyBytes[$pos]\n")
		script.WriteString("    $pos++\n")
		script.WriteString("    $exponent = New-Object byte[] $expLen\n")
		script.WriteString("    [Array]::Copy($keyBytes, $pos, $exponent, 0, $expLen)\n")
		script.WriteString("    \n")
		script.WriteString("    return @{ Modulus = $modulus; Exponent = $exponent }\n")
		script.WriteString("}\n\n")

		script.WriteString("# Function to encrypt data using hybrid encryption (AES + RSA)\n")
		script.WriteString("function Encrypt-Data {\n")
		script.WriteString("    param([string]$Data, [string]$PublicKeyBase64)\n")
		script.WriteString("    try {\n")
		script.WriteString("        # Generate AES key and IV\n")
		script.WriteString("        $aes = New-Object System.Security.Cryptography.AesCryptoServiceProvider\n")
		script.WriteString("        $aes.GenerateKey()\n")
		script.WriteString("        $aes.GenerateIV()\n")
		script.WriteString("        $aesKey = $aes.Key\n")
		script.WriteString("        $aesIV = $aes.IV\n")
		script.WriteString("        # Encrypt data with AES\n")
		script.WriteString("        $dataBytes = [System.Text.Encoding]::UTF8.GetBytes($Data)\n")
		script.WriteString("        $encryptor = $aes.CreateEncryptor()\n")
		script.WriteString("        $encryptedData = $encryptor.TransformFinalBlock($dataBytes, 0, $dataBytes.Length)\n")
		script.WriteString("        # Parse and import RSA public key\n")
		script.WriteString("        $pubKeyBytes = [System.Convert]::FromBase64String($PublicKeyBase64)\n")
		script.WriteString("        $pubKeyPEM = [System.Text.Encoding]::UTF8.GetString($pubKeyBytes)\n")
		script.WriteString("        $keyParams = Parse-PEMPublicKey -PEM $pubKeyPEM\n")
		script.WriteString("        # Create RSA parameters and import to RSA provider\n")
		script.WriteString("        $rsaParams = New-Object System.Security.Cryptography.RSAParameters\n")
		script.WriteString("        $rsaParams.Modulus = $keyParams.Modulus\n")
		script.WriteString("        $rsaParams.Exponent = $keyParams.Exponent\n")
		script.WriteString("        $rsa = New-Object System.Security.Cryptography.RSACryptoServiceProvider\n")
		script.WriteString("        $rsa.ImportParameters($rsaParams)\n")
		script.WriteString("        $encryptedKey = $rsa.Encrypt($aesKey, $false)\n")
		script.WriteString("        # Combine: encrypted key + IV + encrypted data (all base64)\n")
		script.WriteString("        $result = @{\n")
		script.WriteString("            key = [System.Convert]::ToBase64String($encryptedKey)\n")
		script.WriteString("            iv = [System.Convert]::ToBase64String($aesIV)\n")
		script.WriteString("            data = [System.Convert]::ToBase64String($encryptedData)\n")
		script.WriteString("        }\n")
		script.WriteString("        return ($result | ConvertTo-Json -Compress)\n")
		script.WriteString("    } catch {\n")
		script.WriteString("        Write-Error \"Encryption failed: $_\"\n")
		script.WriteString("        return $null\n")
		script.WriteString("    } finally {\n")
		script.WriteString("        if ($aes) { $aes.Dispose() }\n")
		script.WriteString("        if ($encryptor) { $encryptor.Dispose() }\n")
		script.WriteString("        if ($rsa) { $rsa.Dispose() }\n")
		script.WriteString("    }\n")
		script.WriteString("}\n\n")
	} else {
		script.WriteString("# NOTE: This script saves report data as plain JSON without encryption.\n")
		script.WriteString("Write-Warning 'Report data will be saved without encryption. Handle securely.'\n\n")
	}

	script.WriteString("$result = @{}\n\n")

	// Add progress tracking
	script.WriteString("# Progress tracking\n")
	script.WriteString("$totalSteps = 25\n")
	script.WriteString("$currentStep = 0\n")
	script.WriteString("function Update-Progress {\n")
	script.WriteString("    param([int]$Step, [string]$Activity, [string]$Status)\n")
	script.WriteString("    $percent = [math]::Round(($Step / $totalSteps) * 100)\n")
	script.WriteString("    Write-Progress -Activity \"Windows Server Audit\" -Status $Status -PercentComplete $percent\n")
	script.WriteString("    Write-Host \"[$percent%] $Activity\" -ForegroundColor Cyan\n")
	script.WriteString("}\n\n")

	script.WriteString("try {\n")
	script.WriteString("    Update-Progress -Step ($currentStep++) -Activity \"Starting audit...\" -Status \"Initializing\"\n")
	script.WriteString("    Start-Sleep -Milliseconds 100\n\n")
	script.WriteString("    # System Information\n")
	script.WriteString("    Update-Progress -Step ($currentStep++) -Activity \"Collecting System Information\" -Status \"Gathering OS and system details\"\n")
	script.WriteString("    $os = Get-CimInstance Win32_OperatingSystem\n")
	script.WriteString("    $computer = Get-CimInstance Win32_ComputerSystem\n")
	script.WriteString("    $bios = Get-CimInstance Win32_BIOS\n")
	script.WriteString("    $processor = Get-CimInstance Win32_Processor | Select-Object -First 1\n")
	script.WriteString("    \n")
	script.WriteString("    # Calculate uptime\n")
	script.WriteString("    $uptime = (Get-Date) - $os.LastBootUpTime\n")
	script.WriteString("    $uptimeString = \"$($uptime.Days) days, $($uptime.Hours) hours, $($uptime.Minutes) minutes\"\n")
	script.WriteString("    \n")
	script.WriteString("    # Get FQDN\n")
	script.WriteString("    $fqdn = [System.Net.Dns]::GetHostByName($computer.Name).HostName\n")
	script.WriteString("    \n")
	script.WriteString("    # Detect if VM or Physical\n")
	script.WriteString("    $isVM = $false\n")
	script.WriteString("    $hypervisor = 'Physical'\n")
	script.WriteString("    try {\n")
	script.WriteString("        $vmInfo = Get-CimInstance -ClassName Win32_ComputerSystem -ErrorAction SilentlyContinue\n")
	script.WriteString("        $manufacturer = $vmInfo.Manufacturer.ToLower()\n")
	script.WriteString("        $model = $vmInfo.Model.ToLower()\n")
	script.WriteString("        if ($manufacturer -like '*vmware*' -or $model -like '*vmware*') {\n")
	script.WriteString("            $isVM = $true\n")
	script.WriteString("            $hypervisor = 'VMware'\n")
	script.WriteString("        } elseif ($manufacturer -like '*microsoft*' -or $model -like '*virtual*' -or $model -like '*hyper-v*') {\n")
	script.WriteString("            $isVM = $true\n")
	script.WriteString("            $hypervisor = 'Hyper-V'\n")
	script.WriteString("        } elseif ($manufacturer -like '*xen*' -or $model -like '*xen*') {\n")
	script.WriteString("            $isVM = $true\n")
	script.WriteString("            $hypervisor = 'Xen'\n")
	script.WriteString("        } elseif ($manufacturer -like '*parallels*' -or $model -like '*parallels*') {\n")
	script.WriteString("            $isVM = $true\n")
	script.WriteString("            $hypervisor = 'Parallels'\n")
	script.WriteString("        } elseif ($manufacturer -like '*qemu*' -or $model -like '*qemu*' -or $model -like '*kvm*') {\n")
	script.WriteString("            $isVM = $true\n")
	script.WriteString("            $hypervisor = 'KVM/QEMU'\n")
	script.WriteString("        }\n")
	script.WriteString("    } catch {}\n")
	script.WriteString("    \n")
	script.WriteString("    # Check NUMA\n")
	script.WriteString("    $numaEnabled = $false\n")
	script.WriteString("    try {\n")
	script.WriteString("        $numaNodes = Get-CimInstance -ClassName Win32_NUMANode -ErrorAction SilentlyContinue\n")
	script.WriteString("        $numaEnabled = ($numaNodes.Count -gt 1)\n")
	script.WriteString("    } catch {}\n")
	script.WriteString("    \n")
	script.WriteString("    # Get Power Plan\n")
	script.WriteString("    $powerPlan = 'N/A'\n")
	script.WriteString("    try {\n")
	script.WriteString("        # Get active power scheme GUID\n")
	script.WriteString("        $activeGuidOutput = powercfg /getactivescheme 2>&1\n")
	script.WriteString("        if ($activeGuidOutput) {\n")
	script.WriteString("            # Extract GUID from output (format: Power Scheme GUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)\n")
	script.WriteString("            $guidMatch = [regex]::Match($activeGuidOutput, '([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)\n")
	script.WriteString("            if ($guidMatch.Success) {\n")
	script.WriteString("                $activeGuid = $guidMatch.Groups[1].Value\n")
	script.WriteString("                # Get all power schemes\n")
	script.WriteString("                $allPlansOutput = powercfg /list 2>&1\n")
	script.WriteString("                if ($allPlansOutput) {\n")
	script.WriteString("                    # Find the line with the active GUID and extract the name\n")
	script.WriteString("                    $planLine = $allPlansOutput | Select-String -Pattern $activeGuid\n")
	script.WriteString("                    if ($planLine) {\n")
	script.WriteString("                        # Extract name from line like: \"Power Scheme GUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  (Name)\"\n")
	script.WriteString("                        $lineText = $planLine.Line\n")
	script.WriteString("                        # Remove GUID and parentheses, get the name\n")
	script.WriteString("                        $nameMatch = [regex]::Match($lineText, '\\(([^)]+)\\)')\n")
	script.WriteString("                        if ($nameMatch.Success) {\n")
	script.WriteString("                            $powerPlan = $nameMatch.Groups[1].Value.Trim()\n")
	script.WriteString("                        } else {\n")
	script.WriteString("                            # Fallback: try to get name before GUID\n")
	script.WriteString("                            $parts = $lineText -split $activeGuid\n")
	script.WriteString("                            if ($parts.Length -gt 0) {\n")
	script.WriteString("                                $powerPlan = $parts[0].Replace('Power Scheme GUID:', '').Trim()\n")
	script.WriteString("                                if ([string]::IsNullOrWhiteSpace($powerPlan)) {\n")
	script.WriteString("                                    # Try alternative: use CIM instance\n")
	script.WriteString("                                    $powerScheme = Get-CimInstance -Namespace 'root\\cimv2\\power' -ClassName Win32_PowerPlan -Filter \"InstanceID LIKE '%$activeGuid%'\" -ErrorAction SilentlyContinue | Select-Object -First 1\n")
	script.WriteString("                                    if ($powerScheme) {\n")
	script.WriteString("                                        $powerPlan = $powerScheme.ElementName\n")
	script.WriteString("                                    }\n")
	script.WriteString("                                }\n")
	script.WriteString("                            }\n")
	script.WriteString("                        }\n")
	script.WriteString("                    } else {\n")
	script.WriteString("                        # Try using CIM instance directly\n")
	script.WriteString("                        $powerScheme = Get-CimInstance -Namespace 'root\\cimv2\\power' -ClassName Win32_PowerPlan -Filter \"InstanceID LIKE '%$activeGuid%'\" -ErrorAction SilentlyContinue | Select-Object -First 1\n")
	script.WriteString("                        if ($powerScheme) {\n")
	script.WriteString("                            $powerPlan = $powerScheme.ElementName\n")
	script.WriteString("                        }\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("        }\n")
	script.WriteString("        # If still N/A, try CIM instance without GUID\n")
	script.WriteString("        if ($powerPlan -eq 'N/A') {\n")
	script.WriteString("            $activeScheme = Get-CimInstance -Namespace 'root\\cimv2\\power' -ClassName Win32_PowerPlan -Filter 'IsActive=True' -ErrorAction SilentlyContinue | Select-Object -First 1\n")
	script.WriteString("            if ($activeScheme) {\n")
	script.WriteString("                $powerPlan = $activeScheme.ElementName\n")
	script.WriteString("            }\n")
	script.WriteString("        }\n")
	script.WriteString("    } catch {\n")
	script.WriteString("        # Final fallback: try simple CIM query\n")
	script.WriteString("        try {\n")
	script.WriteString("            $activeScheme = Get-CimInstance -Namespace 'root\\cimv2\\power' -ClassName Win32_PowerPlan -Filter 'IsActive=True' -ErrorAction SilentlyContinue | Select-Object -First 1\n")
	script.WriteString("            if ($activeScheme) {\n")
	script.WriteString("                $powerPlan = $activeScheme.ElementName\n")
	script.WriteString("            }\n")
	script.WriteString("        } catch {}\n")
	script.WriteString("    }\n")
	script.WriteString("    \n")
	script.WriteString("    # Get Timezone\n")
	script.WriteString("    $timezone = (Get-TimeZone).DisplayName\n")
	script.WriteString("    \n")
	script.WriteString("    # Get License and Activation Status\n")
	script.WriteString("    $licenseType = 'N/A'\n")
	script.WriteString("    $activationStatus = 'N/A'\n")
	script.WriteString("    $partialProductKey = 'N/A'\n")
	script.WriteString("    $originalProductKey = 'N/A'\n")
	script.WriteString("    try {\n")
	script.WriteString("        # Get Windows license (filter for Windows licenses)\n")
	script.WriteString("        $license = Get-CimInstance -ClassName SoftwareLicensingProduct -ErrorAction SilentlyContinue | Where-Object { $_.PartialProductKey -and $_.Name -like '*Windows*' } | Select-Object -First 1\n")
	script.WriteString("        if ($license) {\n")
	script.WriteString("            $licenseType = $license.Name\n")
	script.WriteString("            $partialProductKey = $license.PartialProductKey\n")
	script.WriteString("            # Map license status codes\n")
	script.WriteString("            $activationStatus = switch ($license.LicenseStatus) {\n")
	script.WriteString("                0 { 'Unlicensed' }\n")
	script.WriteString("                1 { 'Licensed' }\n")
	script.WriteString("                2 { 'OOB Grace Period' }\n")
	script.WriteString("                3 { 'OOT Grace Period' }\n")
	script.WriteString("                4 { 'Non-Genuine Grace Period' }\n")
	script.WriteString("                5 { 'Notification Period (Activation Required)' }\n")
	script.WriteString("                6 { 'Extended Grace Period' }\n")
	script.WriteString("                default { \"Unknown ($($license.LicenseStatus))\" }\n")
	script.WriteString("            }\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        # Try to get OA3xOriginalProductKey (OEM key)\n")
	script.WriteString("        $osLicensing = Get-CimInstance -ClassName SoftwareLicensingService -ErrorAction SilentlyContinue\n")
	script.WriteString("        if ($osLicensing -and $osLicensing.OA3xOriginalProductKey) {\n")
	script.WriteString("            $originalProductKey = $osLicensing.OA3xOriginalProductKey\n")
	script.WriteString("        }\n")
	script.WriteString("    } catch {}\n")
	script.WriteString("    \n")
	script.WriteString("    # Check Server Core vs Desktop Experience\n")
	script.WriteString("    $serverCore = $false\n")
	script.WriteString("    try {\n")
	script.WriteString("        $serverGuiShell = Get-WindowsFeature -Name Server-Gui-Shell -ErrorAction SilentlyContinue\n")
	script.WriteString("        if ($serverGuiShell) {\n")
	script.WriteString("            $serverCore = ($serverGuiShell.InstallState -ne 'Installed')\n")
	script.WriteString("        }\n")
	script.WriteString("    } catch {}\n")
	script.WriteString("    \n")
	script.WriteString("    # Get PowerShell Version\n")
	script.WriteString("    $powershellVersion = 'N/A'\n")
	script.WriteString("    try {\n")
	script.WriteString("        $psVersion = $PSVersionTable.PSVersion\n")
	script.WriteString("        if ($psVersion) {\n")
	script.WriteString("            $powershellVersion = \"$($psVersion.Major).$($psVersion.Minor).$($psVersion.Build)\"\n")
	script.WriteString("            if ($psVersion.Revision -and $psVersion.Revision -gt 0) {\n")
	script.WriteString("                $powershellVersion += \".$($psVersion.Revision)\"\n")
	script.WriteString("            }\n")
	script.WriteString("        }\n")
	script.WriteString("    } catch {\n")
	script.WriteString("        # Fallback: try $PSVersionTable directly\n")
	script.WriteString("        try {\n")
	script.WriteString("            $powershellVersion = $PSVersionTable.PSVersion.ToString()\n")
	script.WriteString("        } catch {}\n")
	script.WriteString("    }\n")
	script.WriteString("    \n")
	script.WriteString("    $result['systemInfo'] = @{\n")
	script.WriteString("        'computerName' = $computer.Name\n")
	script.WriteString("        'fqdn' = $fqdn\n")
	script.WriteString("        'domain' = $computer.Domain\n")
	script.WriteString("        'domainRole' = $computer.DomainRole\n")
	script.WriteString("        'isVM' = $isVM\n")
	script.WriteString("        'vmOrPhysical' = if ($isVM) { 'VM' } else { 'Physical' }\n")
	script.WriteString("        'hypervisor' = $hypervisor\n")
	script.WriteString("        'uptime' = $uptimeString\n")
	script.WriteString("        'lastBootTime' = $os.LastBootUpTime\n")
	script.WriteString("        'manufacturer' = $computer.Manufacturer\n")
	script.WriteString("        'model' = $computer.Model\n")
	script.WriteString("        'biosVersion' = $bios.Version\n")
	script.WriteString("        'biosManufacturer' = $bios.Manufacturer\n")
	script.WriteString("        'biosReleaseDate' = $bios.ReleaseDate\n")
	script.WriteString("        'processor' = $processor.Name\n")
	script.WriteString("        'numberOfProcessors' = $computer.NumberOfProcessors\n")
	script.WriteString("        'numberOfCores' = $processor.NumberOfCores\n")
	script.WriteString("        'numberOfLogicalProcessors' = $computer.NumberOfLogicalProcessors\n")
	script.WriteString("        'totalPhysicalMemory' = [math]::Round($computer.TotalPhysicalMemory / 1GB, 2)\n")
	script.WriteString("        'numaEnabled' = $numaEnabled\n")
	script.WriteString("        'powerPlan' = $powerPlan\n")
	script.WriteString("        'osName' = $os.Caption\n")
	script.WriteString("        'osVersion' = $os.Version\n")
	script.WriteString("        'osBuild' = $os.BuildNumber\n")
	script.WriteString("        'installDate' = $os.InstallDate\n")
	script.WriteString("        'timezone' = $timezone\n")
	script.WriteString("        'licenseType' = $licenseType\n")
	script.WriteString("        'activationStatus' = $activationStatus\n")
	script.WriteString("        'partialProductKey' = $partialProductKey\n")
	script.WriteString("        'originalProductKey' = $originalProductKey\n")
	script.WriteString("        'serverCore' = $serverCore\n")
	script.WriteString("        'osArchitecture' = $os.OSArchitecture\n")
	script.WriteString("        'serialNumber' = $bios.SerialNumber\n")
	script.WriteString("        'powershellVersion' = $powershellVersion\n")
	script.WriteString("    }\n\n")

	// Get detailed memory information
	script.WriteString("    # Memory Details\n")
	script.WriteString("    try {\n")
	script.WriteString("        # Memory usage %\n")
	script.WriteString("        # FreePhysicalMemory is in KB, convert to bytes (multiply by 1024)\n")
	script.WriteString("        $freeMemoryBytes = $os.FreePhysicalMemory * 1024\n")
	script.WriteString("        $totalMemoryBytes = $computer.TotalPhysicalMemory\n")
	script.WriteString("        $usedMemoryBytes = $totalMemoryBytes - $freeMemoryBytes\n")
	script.WriteString("        $memoryUsagePercent = if ($totalMemoryBytes -gt 0) { [math]::Round(($usedMemoryBytes / $totalMemoryBytes) * 100, 1) } else { 0 }\n")
	script.WriteString("        $result['systemInfo']['memoryUsagePercent'] = $memoryUsagePercent\n\n")

	script.WriteString("        # Get physical memory modules\n")
	script.WriteString("        $memoryModules = Get-CimInstance -ClassName Win32_PhysicalMemory -ErrorAction SilentlyContinue\n")
	script.WriteString("        if ($memoryModules) {\n")
	script.WriteString("            # Memory speed (MHz)\n")
	script.WriteString("            $memorySpeeds = $memoryModules | Where-Object { $_.Speed -and $_.Speed -gt 0 } | Select-Object -ExpandProperty Speed -Unique\n")
	script.WriteString("            if ($memorySpeeds.Count -gt 0) {\n")
	script.WriteString("                $memorySpeed = ($memorySpeeds | Measure-Object -Average).Average\n")
	script.WriteString("                $result['systemInfo']['memorySpeed'] = [math]::Round($memorySpeed, 0)\n")
	script.WriteString("            } else {\n")
	script.WriteString("                $result['systemInfo']['memorySpeed'] = 'N/A'\n")
	script.WriteString("            }\n\n")

	script.WriteString("            # Memory type (DDR4 / DDR5 / Unknown)\n")
	script.WriteString("            $memoryTypes = $memoryModules | Where-Object { $_.SMBIOSMemoryType -or $_.MemoryType } | Select-Object -First 1\n")
	script.WriteString("            $memoryType = 'Unknown'\n")
	script.WriteString("            if ($memoryTypes) {\n")
	script.WriteString("                $typeCode = if ($memoryTypes.SMBIOSMemoryType) { $memoryTypes.SMBIOSMemoryType } else { $memoryTypes.MemoryType }\n")
	script.WriteString("                switch ($typeCode) {\n")
	script.WriteString("                    26 { $memoryType = 'DDR4' }  # DDR4\n")
	script.WriteString("                    27 { $memoryType = 'DDR4' }  # DDR4 ECC\n")
	script.WriteString("                    34 { $memoryType = 'DDR5' }  # DDR5\n")
	script.WriteString("                    35 { $memoryType = 'DDR5' }  # DDR5 ECC\n")
	script.WriteString("                    24 { $memoryType = 'DDR3' }  # DDR3\n")
	script.WriteString("                    25 { $memoryType = 'DDR3' }  # DDR3 ECC\n")
	script.WriteString("                    default { $memoryType = 'Unknown' }\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("            $result['systemInfo']['memoryType'] = $memoryType\n\n")

	script.WriteString("            # Memory slots (used / total) - try to get for both physical and VM\n")
	script.WriteString("            $usedSlots = $memoryModules.Count\n")
	script.WriteString("            # Try to get total slots from Win32_PhysicalMemoryArray\n")
	script.WriteString("            $memoryArrays = Get-CimInstance -ClassName Win32_PhysicalMemoryArray -ErrorAction SilentlyContinue\n")
	script.WriteString("            $totalSlots = 0\n")
	script.WriteString("            if ($memoryArrays) {\n")
	script.WriteString("                $totalSlots = ($memoryArrays | Measure-Object -Property MemoryDevices -Sum).Sum\n")
	script.WriteString("            }\n")
	script.WriteString("            if ($totalSlots -gt 0) {\n")
	script.WriteString("                $result['systemInfo']['memorySlots'] = \"$usedSlots / $totalSlots\"\n")
	script.WriteString("            } elseif ($usedSlots -gt 0) {\n")
	script.WriteString("                $result['systemInfo']['memorySlots'] = \"$usedSlots / Unknown\"\n")
	script.WriteString("            } else {\n")
	script.WriteString("                $result['systemInfo']['memorySlots'] = 'N/A'\n")
	script.WriteString("            }\n")
	script.WriteString("        } else {\n")
	script.WriteString("            $result['systemInfo']['memorySpeed'] = 'N/A'\n")
	script.WriteString("            $result['systemInfo']['memoryType'] = 'Unknown'\n")
	script.WriteString("            $result['systemInfo']['memorySlots'] = 'N/A'\n")
	script.WriteString("        }\n")
	script.WriteString("    } catch {\n")
	script.WriteString("        $result['systemInfo']['memoryUsagePercent'] = 0\n")
	script.WriteString("        $result['systemInfo']['memorySpeed'] = 'N/A'\n")
	script.WriteString("        $result['systemInfo']['memoryType'] = 'Unknown'\n")
	script.WriteString("        $result['systemInfo']['memorySlots'] = 'N/A'\n")
	script.WriteString("    }\n\n")

	// Get virtualization support information
	script.WriteString("    # Virtualization Support\n")
	script.WriteString("    try {\n")
	script.WriteString("        $virtualizationSupported = $false\n")
	script.WriteString("        $virtualizationEnabled = $false\n")
	script.WriteString("        \n")
	script.WriteString("        # Use systeminfo to get virtualization information\n")
	script.WriteString("        try {\n")
	script.WriteString("            $sysInfoOutput = systeminfo 2>&1 | Out-String\n")
	script.WriteString("            \n")
	script.WriteString("            # Check for virtualization support (VT-x / AMD-V)\n")
	script.WriteString("            # Look for 'A second-level address translation (SLAT)' or processor virtualization features\n")
	script.WriteString("            if ($sysInfoOutput -match 'Hyper-V Requirements.*A second-level address translation.*:.*Yes') {\n")
	script.WriteString("                $virtualizationSupported = $true\n")
	script.WriteString("            } elseif ($sysInfoOutput -match 'Hyper-V Requirements.*VM Monitor Mode Extensions.*:.*Yes') {\n")
	script.WriteString("                $virtualizationSupported = $true\n")
	script.WriteString("            } else {\n")
	script.WriteString("                # Fallback: Check processor name for Intel/AMD (most modern CPUs support virtualization)\n")
	script.WriteString("                $processorName = $processor.Name\n")
	script.WriteString("                if ($processorName -match 'Intel|AMD|Xeon|Core|Ryzen|EPYC') {\n")
	script.WriteString("                    $virtualizationSupported = $true\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("            \n")
	script.WriteString("            # Check if virtualization is enabled in firmware/BIOS\n")
	script.WriteString("            if ($sysInfoOutput -match 'Virtualization Enabled In Firmware.*:.*Yes') {\n")
	script.WriteString("                $virtualizationEnabled = $true\n")
	script.WriteString("            } elseif ($sysInfoOutput -match 'Virtualization Enabled In Firmware.*:.*No') {\n")
	script.WriteString("                $virtualizationEnabled = $false\n")
	script.WriteString("            }\n")
	script.WriteString("        } catch {\n")
	script.WriteString("            # Fallback: Try Get-ComputerInfo (PowerShell 5.1+)\n")
	script.WriteString("            if (Get-Command Get-ComputerInfo -ErrorAction SilentlyContinue) {\n")
	script.WriteString("                try {\n")
	script.WriteString("                    $computerInfo = Get-ComputerInfo -ErrorAction SilentlyContinue\n")
	script.WriteString("                    if ($computerInfo.HyperVRequirementVirtualizationFirmwareEnabled -ne $null) {\n")
	script.WriteString("                        $virtualizationEnabled = $computerInfo.HyperVRequirementVirtualizationFirmwareEnabled\n")
	script.WriteString("                    }\n")
	script.WriteString("                    if ($computerInfo.HyperVRequirementSecondLevelAddressTranslation -ne $null) {\n")
	script.WriteString("                        if ($computerInfo.HyperVRequirementSecondLevelAddressTranslation) {\n")
	script.WriteString("                            $virtualizationSupported = $true\n")
	script.WriteString("                        }\n")
	script.WriteString("                    }\n")
	script.WriteString("                } catch {}\n")
	script.WriteString("            }\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        $result['systemInfo']['virtualizationSupported'] = $virtualizationSupported\n")
	script.WriteString("        $result['systemInfo']['virtualizationEnabled'] = $virtualizationEnabled\n")
	script.WriteString("    } catch {\n")
	script.WriteString("        $result['systemInfo']['virtualizationSupported'] = $false\n")
	script.WriteString("        $result['systemInfo']['virtualizationEnabled'] = $false\n")
	script.WriteString("    }\n\n")

	// Get Secure Boot status
	script.WriteString("    # Get Secure Boot Status\n")
	script.WriteString("    $secureBoot = 'N/A'\n")
	script.WriteString("    try {\n")
	script.WriteString("        if (Get-Command Confirm-SecureBootUEFI -ErrorAction SilentlyContinue) {\n")
	script.WriteString("            $secureBootEnabled = Confirm-SecureBootUEFI -ErrorAction SilentlyContinue\n")
	script.WriteString("            if ($secureBootEnabled) {\n")
	script.WriteString("                $secureBoot = 'Enabled'\n")
	script.WriteString("            } else {\n")
	script.WriteString("                $secureBoot = 'Disabled'\n")
	script.WriteString("            }\n")
	script.WriteString("        } else {\n")
	script.WriteString("            # Fallback: Check via registry\n")
	script.WriteString("            $secureBootReg = Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\SecureBoot\\State' -Name 'UEFISecureBootEnabled' -ErrorAction SilentlyContinue\n")
	script.WriteString("            if ($secureBootReg) {\n")
	script.WriteString("                $secureBoot = if ($secureBootReg.UEFISecureBootEnabled -eq 1) { 'Enabled' } else { 'Disabled' }\n")
	script.WriteString("            }\n")
	script.WriteString("        }\n")
	script.WriteString("    } catch {}\n")
	script.WriteString("    $result['systemInfo']['secureBoot'] = $secureBoot\n\n")

	// Add reboot and shutdown information collection
	script.WriteString("    # Reboot and Shutdown Information\n")
	script.WriteString("    try {\n")
	script.WriteString("        # Last reboot reason (Event ID 1074)\n")
	script.WriteString("        $lastRebootReason = 'N/A'\n")
	script.WriteString("        $rebootEvent = Get-WinEvent -FilterHashtable @{LogName='System'; ID=1074} -MaxEvents 1 -ErrorAction SilentlyContinue\n")
	script.WriteString("        if ($rebootEvent) {\n")
	script.WriteString("            $rebootReason = $rebootEvent.Properties[4].Value\n")
	script.WriteString("            $rebootProcess = $rebootEvent.Properties[0].Value\n")
	script.WriteString("            if ($rebootReason) {\n")
	script.WriteString("                $lastRebootReason = \"$rebootReason\"\n")
	script.WriteString("                if ($rebootProcess) {\n")
	script.WriteString("                    $lastRebootReason += \" by $rebootProcess\"\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("        }\n")
	script.WriteString("        $result['systemInfo']['lastRebootReason'] = $lastRebootReason\n\n")

	script.WriteString("        # Unexpected shutdowns count (Event ID 6008)\n")
	script.WriteString("        $unexpectedShutdowns = 0\n")
	script.WriteString("        try {\n")
	script.WriteString("            $shutdownEvents = Get-WinEvent -FilterHashtable @{LogName='System'; ID=6008} -ErrorAction SilentlyContinue\n")
	script.WriteString("            if ($shutdownEvents) {\n")
	script.WriteString("                $unexpectedShutdowns = $shutdownEvents.Count\n")
	script.WriteString("            }\n")
	script.WriteString("        } catch {\n")
	script.WriteString("            $unexpectedShutdowns = 0\n")
	script.WriteString("        }\n")
	script.WriteString("        $result['systemInfo']['unexpectedShutdowns'] = $unexpectedShutdowns\n\n")

	script.WriteString("        # BugCheck / BSOD information (Event ID 1001)\n")
	script.WriteString("        $bugChecks = @()\n")
	script.WriteString("        try {\n")
	script.WriteString("            $bugCheckEvents = Get-WinEvent -FilterHashtable @{LogName='System'; ID=1001} -MaxEvents 10 -ErrorAction SilentlyContinue\n")
	script.WriteString("            if ($bugCheckEvents) {\n")
	script.WriteString("                foreach ($event in $bugCheckEvents) {\n")
	script.WriteString("                    $bugCheckInfo = @{\n")
	script.WriteString("                        'timestamp' = $event.TimeCreated.ToString('yyyy-MM-dd HH:mm:ss')\n")
	script.WriteString("                        'code' = if ($event.Properties[0].Value) { $event.Properties[0].Value } else { 'N/A' }\n")
	script.WriteString("                        'parameter1' = if ($event.Properties[1].Value) { $event.Properties[1].Value } else { 'N/A' }\n")
	script.WriteString("                        'parameter2' = if ($event.Properties[2].Value) { $event.Properties[2].Value } else { 'N/A' }\n")
	script.WriteString("                        'parameter3' = if ($event.Properties[3].Value) { $event.Properties[3].Value } else { 'N/A' }\n")
	script.WriteString("                        'parameter4' = if ($event.Properties[4].Value) { $event.Properties[4].Value } else { 'N/A' }\n")
	script.WriteString("                    }\n")
	script.WriteString("                    $bugChecks += $bugCheckInfo\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("        } catch {\n")
	script.WriteString("            $bugChecks = @()\n")
	script.WriteString("        }\n")
	script.WriteString("        $result['systemInfo']['bugChecks'] = $bugChecks\n")
	script.WriteString("        $result['systemInfo']['hasBugChecks'] = ($bugChecks.Count -gt 0)\n")
	script.WriteString("    } catch {\n")
	script.WriteString("        $result['systemInfo']['lastRebootReason'] = 'N/A'\n")
	script.WriteString("        $result['systemInfo']['unexpectedShutdowns'] = 0\n")
	script.WriteString("        $result['systemInfo']['bugChecks'] = @()\n")
	script.WriteString("        $result['systemInfo']['hasBugChecks'] = $false\n")
	script.WriteString("    }\n\n")

	// Shutdown Information
	script.WriteString("    Update-Progress -Step ($currentStep++) -Activity \"Collecting Shutdown History\" -Status \"Retrieving shutdown events\"\n")
	script.WriteString("    # Shutdown Information (Event ID 1074 and 1076)\n")
	script.WriteString("    $shutdowns = @()\n")
	script.WriteString("    try {\n")
	script.WriteString("        # Get shutdown events (Event ID 1074: Shutdown initiated by application/user, Event ID 1076: Shutdown initiated by another process)\n")
	script.WriteString("        $shutdownEvents = Get-WinEvent -FilterHashtable @{LogName='System'; ID=1074,1076} -MaxEvents 50 -ErrorAction SilentlyContinue | Sort-Object TimeCreated -Descending\n")
	script.WriteString("        if ($shutdownEvents) {\n")
	script.WriteString("            foreach ($event in $shutdownEvents) {\n")
	script.WriteString("                $shutdownInfo = @{}\n")
	script.WriteString("                $shutdownInfo['time'] = $event.TimeCreated.ToString('yyyy-MM-dd HH:mm:ss')\n")
	script.WriteString("                \n")
	script.WriteString("                # Event ID 1074 structure: [0]=Process, [1]=Reason Code, [2]=Reason, [3]=Major Reason, [4]=Minor Reason, [5]=Comment, [6]=User\n")
	script.WriteString("                # Event ID 1076 structure: [0]=Process, [1]=Reason Code, [2]=Reason, [3]=Comment\n")
	script.WriteString("                if ($event.Id -eq 1074) {\n")
	script.WriteString("                    $shutdownInfo['type'] = 'Shutdown'\n")
	script.WriteString("                    $shutdownInfo['process'] = if ($event.Properties[0].Value) { $event.Properties[0].Value } else { 'N/A' }\n")
	script.WriteString("                    $shutdownInfo['reasonCode'] = if ($event.Properties[1].Value) { $event.Properties[1].Value } else { 'N/A' }\n")
	script.WriteString("                    $shutdownInfo['reason'] = if ($event.Properties[2].Value) { $event.Properties[2].Value } else { 'N/A' }\n")
	script.WriteString("                    $shutdownInfo['comment'] = if ($event.Properties[5].Value) { $event.Properties[5].Value } else { 'N/A' }\n")
	script.WriteString("                    $shutdownInfo['user'] = if ($event.Properties[6].Value) { $event.Properties[6].Value } else { 'N/A' }\n")
	script.WriteString("                } elseif ($event.Id -eq 1076) {\n")
	script.WriteString("                    $shutdownInfo['type'] = 'Shutdown Initiated'\n")
	script.WriteString("                    $shutdownInfo['process'] = if ($event.Properties[0].Value) { $event.Properties[0].Value } else { 'N/A' }\n")
	script.WriteString("                    $shutdownInfo['reasonCode'] = if ($event.Properties[1].Value) { $event.Properties[1].Value } else { 'N/A' }\n")
	script.WriteString("                    $shutdownInfo['reason'] = if ($event.Properties[2].Value) { $event.Properties[2].Value } else { 'N/A' }\n")
	script.WriteString("                    $shutdownInfo['comment'] = if ($event.Properties[3].Value) { $event.Properties[3].Value } else { 'N/A' }\n")
	script.WriteString("                    $shutdownInfo['user'] = 'N/A'\n")
	script.WriteString("                }\n")
	script.WriteString("                \n")
	script.WriteString("                # Clean up empty values\n")
	script.WriteString("                if ($shutdownInfo['reason'] -eq '' -or $shutdownInfo['reason'] -eq $null) { $shutdownInfo['reason'] = 'N/A' }\n")
	script.WriteString("                if ($shutdownInfo['comment'] -eq '' -or $shutdownInfo['comment'] -eq $null) { $shutdownInfo['comment'] = 'N/A' }\n")
	script.WriteString("                if ($shutdownInfo['process'] -eq '' -or $shutdownInfo['process'] -eq $null) { $shutdownInfo['process'] = 'N/A' }\n")
	script.WriteString("                \n")
	script.WriteString("                $shutdowns += $shutdownInfo\n")
	script.WriteString("            }\n")
	script.WriteString("        }\n")
	script.WriteString("    } catch {\n")
	script.WriteString("        # Error collecting shutdown events\n")
	script.WriteString("    }\n")
	script.WriteString("    $result['shutdowns'] = $shutdowns\n\n")

	script.WriteString("    Update-Progress -Step ($currentStep++) -Activity \"Collecting Roles & Features\" -Status \"Enumerating installed roles and features\"\n")
	script.WriteString("    # Installed Roles and Features\n")
	script.WriteString("    $allFeatures = Get-WindowsFeature\n")
	script.WriteString("    $result['rolesAndFeatures'] = @{\n")
	script.WriteString("        'installedRoles' = @($allFeatures | Where-Object { $_.FeatureType -eq 'Role' } | ForEach-Object {\n")
	script.WriteString("            @{\n")
	script.WriteString("                'name' = $_.Name\n")
	script.WriteString("                'displayName' = $_.DisplayName\n")
	script.WriteString("                'description' = $_.Description\n")
	script.WriteString("                'installed' = ($_.InstallState -eq 'Installed')\n")
	script.WriteString("            }\n")
	script.WriteString("        })\n")
	script.WriteString("        'installedFeatures' = @($allFeatures | Where-Object { $_.FeatureType -eq 'Feature' } | ForEach-Object {\n")
	script.WriteString("            @{\n")
	script.WriteString("                'name' = $_.Name\n")
	script.WriteString("                'displayName' = $_.DisplayName\n")
	script.WriteString("                'description' = $_.Description\n")
	script.WriteString("                'installed' = ($_.InstallState -eq 'Installed')\n")
	script.WriteString("            }\n")
	script.WriteString("        })\n")
	script.WriteString("        'totalCount' = ($allFeatures | Where-Object { $_.InstallState -eq 'Installed' }).Count\n")
	script.WriteString("    }\n\n")
	script.WriteString("    Update-Progress -Step ($currentStep++) -Activity \"Collecting Drivers\" -Status \"Enumerating system drivers\"\n")
	script.WriteString("    # Installed Drivers\n")
	script.WriteString("    try {\n")
	script.WriteString("        $systemDrivers = Get-CimInstance -ClassName Win32_SystemDriver -ErrorAction SilentlyContinue\n")
	script.WriteString("        $drivers = @()\n")
	script.WriteString("        foreach ($driver in $systemDrivers) {\n")
	script.WriteString("            # Get driver file info\n")
	script.WriteString("            $driverVersion = 'N/A'\n")
	script.WriteString("            $driverDate = 'N/A'\n")
	script.WriteString("            $providerName = 'N/A'\n")
	script.WriteString("            \n")
	script.WriteString("            # Try to get version info from the driver file\n")
	script.WriteString("            if ($driver.PathName) {\n")
	script.WriteString("                try {\n")
	script.WriteString("                    $driverPath = $driver.PathName\n")
	script.WriteString("                    if ($driverPath -match '^\\\\\\\\.*') {\n")
	script.WriteString("                        # Expand system path\n")
	script.WriteString("                        $driverPath = $driverPath -replace '^\\\\SystemRoot\\\\', \"$env:SystemRoot\\\"\n")
	script.WriteString("                        $driverPath = $driverPath -replace '^\\\\??\\\\', ''\n")
	script.WriteString("                    }\n")
	script.WriteString("                    \n")
	script.WriteString("                    if (Test-Path $driverPath) {\n")
	script.WriteString("                        $fileInfo = Get-Item $driverPath -ErrorAction SilentlyContinue\n")
	script.WriteString("                        if ($fileInfo) {\n")
	script.WriteString("                            $versionInfo = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($fileInfo.FullName)\n")
	script.WriteString("                            if ($versionInfo) {\n")
	script.WriteString("                                $driverVersion = $versionInfo.FileVersion\n")
	script.WriteString("                                if (-not $driverVersion -or $driverVersion -eq '') {\n")
	script.WriteString("                                    $driverVersion = $versionInfo.ProductVersion\n")
	script.WriteString("                                }\n")
	script.WriteString("                                if (-not $driverVersion -or $driverVersion -eq '') {\n")
	script.WriteString("                                    $driverVersion = 'N/A'\n")
	script.WriteString("                                }\n")
	script.WriteString("                                $providerName = $versionInfo.CompanyName\n")
	script.WriteString("                                if (-not $providerName -or $providerName -eq '') {\n")
	script.WriteString("                                    $providerName = 'N/A'\n")
	script.WriteString("                                }\n")
	script.WriteString("                                $driverDate = $fileInfo.LastWriteTime.ToString('yyyy-MM-dd')\n")
	script.WriteString("                            }\n")
	script.WriteString("                        }\n")
	script.WriteString("                    }\n")
	script.WriteString("                } catch {\n")
	script.WriteString("                    # Ignore errors when reading driver file\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("            \n")
	script.WriteString("            # Use driver name as class description if available\n")
	script.WriteString("            $classDescription = $driver.Description\n")
	script.WriteString("            if (-not $classDescription -or $classDescription -eq '') {\n")
	script.WriteString("                $classDescription = $driver.Name\n")
	script.WriteString("            }\n")
	script.WriteString("            \n")
	script.WriteString("            $driverInfo = @{\n")
	script.WriteString("                'name' = $driver.Name\n")
	script.WriteString("                'classDescription' = $classDescription\n")
	script.WriteString("                'providerName' = $providerName\n")
	script.WriteString("                'driverVersion' = $driverVersion\n")
	script.WriteString("                'versionDate' = $driverDate\n")
	script.WriteString("                'status' = if ($driver.State -eq 'Running') { 'OK' } else { $driver.State }\n")
	script.WriteString("            }\n")
	script.WriteString("            $drivers += $driverInfo\n")
	script.WriteString("        }\n")
	script.WriteString("        # Remove duplicates based on class description and driver version\n")
	script.WriteString("        $uniqueDrivers = @{}\n")
	script.WriteString("        $finalDrivers = @()\n")
	script.WriteString("        foreach ($driver in $drivers) {\n")
	script.WriteString("            $key = \"$($driver.classDescription)|$($driver.driverVersion)\"\n")
	script.WriteString("            if (-not $uniqueDrivers.ContainsKey($key)) {\n")
	script.WriteString("                $uniqueDrivers[$key] = $true\n")
	script.WriteString("                $finalDrivers += $driver\n")
	script.WriteString("            }\n")
	script.WriteString("        }\n")
	script.WriteString("        $result['drivers'] = $finalDrivers\n")
	script.WriteString("    } catch {\n")
	script.WriteString("        $result['drivers'] = @()\n")
	script.WriteString("    }\n\n")
	script.WriteString("    Update-Progress -Step ($currentStep++) -Activity \"Collecting Minifilter Drivers\" -Status \"Enumerating minifilter drivers\"\n")
	script.WriteString("    # Minifilter Drivers\n")
	script.WriteString("    try {\n")
	script.WriteString("        $minifilters = @()\n")
	script.WriteString("        try {\n")
	script.WriteString("            # Use fltmc command to get minifilter drivers\n")
	script.WriteString("            $fltmcOutput = fltmc filters 2>$null\n")
	script.WriteString("            if ($fltmcOutput) {\n")
	script.WriteString("                # Skip header lines and empty lines\n")
	script.WriteString("                $filterLines = $fltmcOutput | Where-Object { $_ -and $_.Trim() -ne '' -and $_ -notmatch '^Filter\\s+Name' -and $_ -notmatch '^-+$' -and $_ -match '^[A-Za-z0-9]' }\n")
	script.WriteString("                foreach ($line in $filterLines) {\n")
	script.WriteString("                    if ($line.Trim() -ne '') {\n")
	script.WriteString("                        $parts = $line -split '\\s+', 4\n")
	script.WriteString("                        if ($parts.Count -ge 3) {\n")
	script.WriteString("                            $filterName = $parts[0].Trim()\n")
	script.WriteString("                            # Skip if it's a header word (common header words in different languages)\n")
	script.WriteString("                            $headerWords = @('Filter', 'Name', 'Altitude', 'Instances', 'Frame', 'Nom', 'filtre', 'Altitud', 'Instancias')\n")
	script.WriteString("                            if ($headerWords -contains $filterName) { continue }\n")
	script.WriteString("                            # Skip if altitude is not numeric (likely a header)\n")
	script.WriteString("                            $numInstances = $parts[1].Trim()\n")
	script.WriteString("                            $altitude = $parts[2].Trim()\n")
	script.WriteString("                            if (-not ($altitude -match '^\\d+$')) { continue }\n")
	script.WriteString("                            $frame = if ($parts.Count -ge 4) { $parts[3].Trim() } else { '' }\n")
	script.WriteString("                            \n")
	script.WriteString("                            # Get detailed info using fltmc instances\n")
	script.WriteString("                            $instances = @()\n")
	script.WriteString("                            $volumes = @()\n")
	script.WriteString("                            $instanceDetails = @()\n")
	script.WriteString("                            $driverPath = 'N/A'\n")
	script.WriteString("                            $vendor = 'N/A'\n")
	script.WriteString("                            \n")
	script.WriteString("                            try {\n")
	script.WriteString("                                $instanceOutput = fltmc instances -f $filterName 2>$null\n")
	script.WriteString("                                if ($instanceOutput) {\n")
	script.WriteString("                                    # Skip header lines and descriptive lines\n")
	script.WriteString("                                    $instanceLines = $instanceOutput | Where-Object { \n")
	script.WriteString("                                        $_ -and $_.Trim() -ne '' -and \n")
	script.WriteString("                                        $_ -notmatch '^Instance\\s+Name' -and \n")
	script.WriteString("                                        $_ -notmatch '^-+$' -and\n")
	script.WriteString("                                        $_ -notmatch '^le filtre' -and\n")
	script.WriteString("                                        $_ -notmatch '^pour ce filtre' -and\n")
	script.WriteString("                                        $_ -notmatch '^Aucune' -and\n")
	script.WriteString("                                        $_ -notmatch '^Instances' -and\n")
	script.WriteString("                                        $_ -match '^[A-Za-z0-9]' \n")
	script.WriteString("                                    }\n")
	script.WriteString("                                    foreach ($instLine in $instanceLines) {\n")
	script.WriteString("                                        if ($instLine.Trim() -ne '') {\n")
	script.WriteString("                                            # Skip lines that contain descriptive text (French messages from fltmc)\n")
	script.WriteString("                                            if ($instLine -match '^le filtre|^pour ce filtre|^Aucune|^Instances\\s+le|:\\s*$|^le filtre.*:$|^Instances.*:$') { continue }\n")
	script.WriteString("                                            # Skip lines that are too long (likely descriptive text)\n")
	script.WriteString("                                            if ($instLine.Trim().Length -gt 80) { continue }\n")
	script.WriteString("                                            \n")
	script.WriteString("                                            $instParts = $instLine -split '\\s+', 3\n")
	script.WriteString("                                            if ($instParts.Count -ge 2) {\n")
	script.WriteString("                                                $instanceName = $instParts[0].Trim()\n")
	script.WriteString("                                                $volumeName = if ($instParts.Count -ge 3) { $instParts[2].Trim() } else { '' }\n")
	script.WriteString("                                                \n")
	script.WriteString("                                                # Skip header words and descriptive text\n")
	script.WriteString("                                                $headerWords = @('Instance', 'Name', 'Altitude', 'Volume', 'Nom', 'Instances', 'le', 'filtre', 'pour', 'ce', 'Aucune')\n")
	script.WriteString("                                                if ($headerWords -contains $instanceName) { continue }\n")
	script.WriteString("                                                if ($instanceName -match '^le$|^filtre$|^pour$|^ce$|^Aucune$|^Instances$') { continue }\n")
	script.WriteString("                                                \n")
	script.WriteString("                                                # Skip if volume name contains descriptive text\n")
	script.WriteString("                                                if ($volumeName -match '^le filtre|^pour ce filtre|^Aucune|^Instances|:\\s*$|^le filtre.*:$') { continue }\n")
	script.WriteString("                                                # Skip if volume name is too long (likely descriptive text)\n")
	script.WriteString("                                                if ($volumeName.Length -gt 50) { continue }\n")
	script.WriteString("                                                \n")
	script.WriteString("                                                # Only add if we have valid data\n")
	script.WriteString("                                                if ($instanceName -and $instanceName -ne '' -and $instanceName.Length -lt 100) {\n")
	script.WriteString("                                                    $instances += $instanceName\n")
	script.WriteString("                                                    \n")
	script.WriteString("                                                    # Clean volume name - ensure it's a string\n")
	script.WriteString("                                                    if ($volumeName -and $volumeName -ne '' -and $volumeName -notmatch '^Volume$' -and $volumeName.Length -lt 100) { \n")
	script.WriteString("                                                        # Convert to string explicitly\n")
	script.WriteString("                                                        $volumeStr = if ($volumeName -is [string]) { $volumeName } else { $volumeName.ToString() }\n")
	script.WriteString("                                                        if ($volumeStr -and $volumeStr.Trim() -ne '') {\n")
	script.WriteString("                                                            $volumes += $volumeStr.Trim()\n")
	script.WriteString("                                                        }\n")
	script.WriteString("                                                    }\n")
	script.WriteString("                                                    \n")
	script.WriteString("                                                    # Store instance details\n")
	script.WriteString("                                                    $instanceInfo = @{\n")
	script.WriteString("                                                        'instanceName' = $instanceName\n")
	script.WriteString("                                                        'volumeName' = if ($volumeName -and $volumeName -ne '' -and $volumeName -notmatch '^Volume$') { $volumeName } else { '' }\n")
	script.WriteString("                                                    }\n")
	script.WriteString("                                                    $instanceDetails += $instanceInfo\n")
	script.WriteString("                                                }\n")
	script.WriteString("                                            }\n")
	script.WriteString("                                        }\n")
	script.WriteString("                                    }\n")
	script.WriteString("                                }\n")
	script.WriteString("                            } catch {}\n")
	script.WriteString("                            \n")
	script.WriteString("                            # Try to get driver path from registry\n")
	script.WriteString("                            try {\n")
	script.WriteString("                                $regPath = \"HKLM:\\\\SYSTEM\\\\CurrentControlSet\\\\Filters\\\\$filterName\"\n")
	script.WriteString("                                if (Test-Path $regPath) {\n")
	script.WriteString("                                    $driverPath = (Get-ItemProperty -Path $regPath -Name 'DefaultInstance' -ErrorAction SilentlyContinue).DefaultInstance\n")
	script.WriteString("                                    if (-not $driverPath) {\n")
	script.WriteString("                                        $driverPath = (Get-ItemProperty -Path $regPath -Name 'Altitude' -ErrorAction SilentlyContinue).Altitude\n")
	script.WriteString("                                    }\n")
	script.WriteString("                                    if (-not $driverPath -or $driverPath -eq '') {\n")
	script.WriteString("                                        $driverPath = 'N/A'\n")
	script.WriteString("                                    }\n")
	script.WriteString("                                }\n")
	script.WriteString("                                \n")
	script.WriteString("                                # Try to get from service registry\n")
	script.WriteString("                                if ($driverPath -eq 'N/A' -or $driverPath -match '^system32') {\n")
	script.WriteString("                                    $serviceRegPath = \"HKLM:\\\\SYSTEM\\\\CurrentControlSet\\\\Services\\\\$filterName\"\n")
	script.WriteString("                                    if (Test-Path $serviceRegPath) {\n")
	script.WriteString("                                        $imagePath = (Get-ItemProperty -Path $serviceRegPath -Name 'ImagePath' -ErrorAction SilentlyContinue).ImagePath\n")
	script.WriteString("                                        if ($imagePath) {\n")
	script.WriteString("                                            # Normalize path\n")
	script.WriteString("                                            $driverPath = $imagePath -replace '^\\\\SystemRoot\\\\', \"$env:SystemRoot\\\"\n")
	script.WriteString("                                            $driverPath = $driverPath -replace '^\\\\??\\\\', ''\n")
	script.WriteString("                                            # If path starts with system32, prepend SystemRoot\n")
	script.WriteString("                                            if ($driverPath -match '^system32') {\n")
	script.WriteString("                                                $driverPath = Join-Path $env:SystemRoot $driverPath\n")
	script.WriteString("                                            }\n")
	script.WriteString("                                        }\n")
	script.WriteString("                                        \n")
	script.WriteString("                                        # Get vendor from service description or company name\n")
	script.WriteString("                                        $description = (Get-ItemProperty -Path $serviceRegPath -Name 'Description' -ErrorAction SilentlyContinue).Description\n")
	script.WriteString("                                        if ($description -and $description -notmatch '^@') {\n")
	script.WriteString("                                            $vendor = $description\n")
	script.WriteString("                                        }\n")
	script.WriteString("                                        \n")
	script.WriteString("                                        # Try to get company from driver file\n")
	script.WriteString("                                        $fullDriverPath = $driverPath\n")
	script.WriteString("                                        if ($fullDriverPath -and $fullDriverPath -ne 'N/A') {\n")
	script.WriteString("                                            # Resolve relative paths\n")
	script.WriteString("                                            if (-not (Test-Path $fullDriverPath) -and $fullDriverPath -match '^system32') {\n")
	script.WriteString("                                                $fullDriverPath = Join-Path $env:SystemRoot $fullDriverPath\n")
	script.WriteString("                                            }\n")
	script.WriteString("                                            if (Test-Path $fullDriverPath) {\n")
	script.WriteString("                                                try {\n")
	script.WriteString("                                                    $fileInfo = Get-Item $fullDriverPath -ErrorAction SilentlyContinue\n")
	script.WriteString("                                                    if ($fileInfo) {\n")
	script.WriteString("                                                        $versionInfo = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($fileInfo.FullName)\n")
	script.WriteString("                                                        if ($versionInfo) {\n")
	script.WriteString("                                                            if ($versionInfo.CompanyName -and $versionInfo.CompanyName.Trim() -ne '') {\n")
	script.WriteString("                                                                $vendor = $versionInfo.CompanyName.Trim()\n")
	script.WriteString("                                                            }\n")
	script.WriteString("                                                            # Update driver path to full path\n")
	script.WriteString("                                                            $driverPath = $fileInfo.FullName\n")
	script.WriteString("                                                        }\n")
	script.WriteString("                                                    }\n")
	script.WriteString("                                                } catch {}\n")
	script.WriteString("                                            }\n")
	script.WriteString("                                        }\n")
	script.WriteString("                                    }\n")
	script.WriteString("                                } else {\n")
	script.WriteString("                                    # Normalize existing path if it's relative\n")
	script.WriteString("                                    if ($driverPath -match '^system32') {\n")
	script.WriteString("                                        $driverPath = Join-Path $env:SystemRoot $driverPath\n")
	script.WriteString("                                    }\n")
	script.WriteString("                                    # Try to get vendor from file if path is valid\n")
	script.WriteString("                                    if ($driverPath -ne 'N/A' -and (Test-Path $driverPath)) {\n")
	script.WriteString("                                        try {\n")
	script.WriteString("                                            $fileInfo = Get-Item $driverPath -ErrorAction SilentlyContinue\n")
	script.WriteString("                                            if ($fileInfo) {\n")
	script.WriteString("                                                $versionInfo = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($fileInfo.FullName)\n")
	script.WriteString("                                                if ($versionInfo -and $versionInfo.CompanyName -and $versionInfo.CompanyName.Trim() -ne '') {\n")
	script.WriteString("                                                    $vendor = $versionInfo.CompanyName.Trim()\n")
	script.WriteString("                                                }\n")
	script.WriteString("                                            }\n")
	script.WriteString("                                        } catch {}\n")
	script.WriteString("                                    }\n")
	script.WriteString("                                }\n")
	script.WriteString("                            } catch {}\n")
	script.WriteString("                            \n")
	script.WriteString("                            $minifilterInfo = @{\n")
	script.WriteString("                                'filterName' = $filterName\n")
	script.WriteString("                                'altitude' = $altitude\n")
	script.WriteString("                                'instances' = $instances.Count\n")
	script.WriteString("                                'attachedVolumes' = ($volumes | Select-Object -Unique).Count\n")
	script.WriteString("                                'driverPath' = $driverPath\n")
	script.WriteString("                                'vendor' = $vendor\n")
	script.WriteString("                                'frame' = $frame\n")
	script.WriteString("                                'instanceDetails' = $instanceDetails\n")
	script.WriteString("                                'volumeList' = @($volumes | Where-Object { $_ -and $_ -ne '' -and $_ -is [string] } | Select-Object -Unique)\n")
	script.WriteString("                            }\n")
	script.WriteString("                            $minifilters += $minifilterInfo\n")
	script.WriteString("                        }\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("        } catch {\n")
	script.WriteString("            # Fallback: try to get from registry directly\n")
	script.WriteString("            try {\n")
	script.WriteString("                $filtersPath = 'HKLM:\\\\SYSTEM\\\\CurrentControlSet\\\\Filters'\n")
	script.WriteString("                if (Test-Path $filtersPath) {\n")
	script.WriteString("                    $filterKeys = Get-ChildItem -Path $filtersPath -ErrorAction SilentlyContinue\n")
	script.WriteString("                    foreach ($filterKey in $filterKeys) {\n")
	script.WriteString("                        $filterName = $filterKey.PSChildName\n")
	script.WriteString("                        $altitude = (Get-ItemProperty -Path $filterKey.PSPath -Name 'Altitude' -ErrorAction SilentlyContinue).Altitude\n")
	script.WriteString("                        if (-not $altitude) { $altitude = 'N/A' }\n")
	script.WriteString("                        \n")
	script.WriteString("                        $minifilterInfo = @{\n")
	script.WriteString("                            'filterName' = $filterName\n")
	script.WriteString("                            'altitude' = $altitude\n")
	script.WriteString("                            'instances' = 0\n")
	script.WriteString("                            'attachedVolumes' = 0\n")
	script.WriteString("                            'driverPath' = 'N/A'\n")
	script.WriteString("                            'vendor' = 'N/A'\n")
	script.WriteString("                            'frame' = ''\n")
	script.WriteString("                        }\n")
	script.WriteString("                        $minifilters += $minifilterInfo\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("            } catch {}\n")
	script.WriteString("        }\n")
	script.WriteString("        $result['minifilters'] = $minifilters\n")
	script.WriteString("    } catch {\n")
	script.WriteString("        $result['minifilters'] = @()\n")
	script.WriteString("    }\n\n")
	script.WriteString("    Update-Progress -Step ($currentStep++) -Activity \"Collecting Devices & Peripherals\" -Status \"Enumerating all devices (including hidden and disabled)\"\n")
	script.WriteString("    # Device & Peripheral Inventory\n")
	script.WriteString("    try {\n")
	script.WriteString("        $allDevices = @()\n")
	script.WriteString("        $connectedDevices = @()\n")
	script.WriteString("        $hiddenDevices = @()\n")
	script.WriteString("        $disabledDevices = @()\n")
	script.WriteString("        $virtualDevices = @()\n")
	script.WriteString("        $devicesMissingDrivers = @()\n")
	script.WriteString("        \n")
	script.WriteString("        # Get all devices including hidden ones\n")
	script.WriteString("        try {\n")
	script.WriteString("            # Create a hash to track devices by InstanceId to avoid duplicates\n")
	script.WriteString("            $deviceMap = @{}\n")
	script.WriteString("            \n")
	script.WriteString("            # Method 1: Get all devices using Get-PnpDevice (including hidden)\n")
	script.WriteString("            try {\n")
	script.WriteString("                $pnpDevices = Get-PnpDevice -ErrorAction SilentlyContinue | Where-Object { $_.InstanceId -ne $null -and $_.InstanceId -ne '' }\n")
	script.WriteString("                foreach ($device in $pnpDevices) {\n")
	script.WriteString("                    if ($device.InstanceId -and -not $deviceMap.ContainsKey($device.InstanceId)) {\n")
	script.WriteString("                        $deviceMap[$device.InstanceId] = $device\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("            } catch {}\n")
	script.WriteString("            \n")
	script.WriteString("            # Method 2: Also get devices using WMI/CIM to catch any that PnpDevice might miss\n")
	script.WriteString("            try {\n")
	script.WriteString("                $wmiDevices = Get-CimInstance -ClassName Win32_PnPEntity -ErrorAction SilentlyContinue\n")
	script.WriteString("                foreach ($wmiDevice in $wmiDevices) {\n")
	script.WriteString("                    if ($wmiDevice.DeviceID -and -not $deviceMap.ContainsKey($wmiDevice.DeviceID)) {\n")
	script.WriteString("                        # Convert WMI device to PnpDevice-like object\n")
	script.WriteString("                        $pnpLikeDevice = [PSCustomObject]@{\n")
	script.WriteString("                            FriendlyName = $wmiDevice.Name\n")
	script.WriteString("                            InstanceId = $wmiDevice.DeviceID\n")
	script.WriteString("                            Status = $wmiDevice.Status\n")
	script.WriteString("                            Class = $wmiDevice.Class\n")
	script.WriteString("                            ClassGuid = $wmiDevice.ClassGuid\n")
	script.WriteString("                            Manufacturer = $wmiDevice.Manufacturer\n")
	script.WriteString("                            Present = $wmiDevice.Present\n")
	script.WriteString("                        }\n")
	script.WriteString("                        $deviceMap[$wmiDevice.DeviceID] = $pnpLikeDevice\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("            } catch {}\n")
	script.WriteString("            \n")
	script.WriteString("            # Process all collected devices\n")
	script.WriteString("            foreach ($device in $deviceMap.Values) {\n")
	script.WriteString("                try {\n")
	script.WriteString("                    # Get device class from registry if not available\n")
	script.WriteString("                    $deviceClass = $device.Class\n")
	script.WriteString("                    if (-not $deviceClass -or $deviceClass -eq 'Unknown' -or $deviceClass -eq '') {\n")
	script.WriteString("                        try {\n")
	script.WriteString("                            $classGuid = $device.ClassGuid\n")
	script.WriteString("                            if ($classGuid) {\n")
	script.WriteString("                                $regPath = \"HKLM:\\\\SYSTEM\\\\CurrentControlSet\\\\Control\\\\Class\\\\{$classGuid}\"\n")
	script.WriteString("                                if (Test-Path $regPath) {\n")
	script.WriteString("                                    $regClass = (Get-ItemProperty -Path $regPath -Name 'Class' -ErrorAction SilentlyContinue).Class\n")
	script.WriteString("                                    if ($regClass) { $deviceClass = $regClass }\n")
	script.WriteString("                                }\n")
	script.WriteString("                            }\n")
	script.WriteString("                            \n")
	script.WriteString("                            # If still unknown, try to get from InstanceId path\n")
	script.WriteString("                            if ((-not $deviceClass -or $deviceClass -eq 'Unknown') -and $device.InstanceId) {\n")
	script.WriteString("                                $instanceParts = $device.InstanceId -split '\\\\'\n")
	script.WriteString("                                if ($instanceParts.Count -gt 0) {\n")
	script.WriteString("                                    $firstPart = $instanceParts[0]\n")
	script.WriteString("                                    # Map common prefixes to classes\n")
	script.WriteString("                                    switch -Wildcard ($firstPart) {\n")
	script.WriteString("                                        'ACPI*' { $deviceClass = 'System devices' }\n")
	script.WriteString("                                        'PCI*' { $deviceClass = 'System devices' }\n")
	script.WriteString("                                        'USB*' { $deviceClass = 'Universal Serial Bus controllers' }\n")
	script.WriteString("                                        'HID*' { $deviceClass = 'Human Interface Devices' }\n")
	script.WriteString("                                        'ROOT*' { $deviceClass = 'System devices' }\n")
	script.WriteString("                                        'SWD*' { $deviceClass = 'Software devices' }\n")
	script.WriteString("                                        'VMBUS*' { $deviceClass = 'System devices' }\n")
	script.WriteString("                                        'STORAGE*' { $deviceClass = 'Storage controllers' }\n")
	script.WriteString("                                        'SCSI*' { $deviceClass = 'Storage controllers' }\n")
	script.WriteString("                                        'IDE*' { $deviceClass = 'IDE ATA/ATAPI controllers' }\n")
	script.WriteString("                                        'DISPLAY*' { $deviceClass = 'Display adapters' }\n")
	script.WriteString("                                        'MONITOR*' { $deviceClass = 'Monitors' }\n")
	script.WriteString("                                        'NET*' { $deviceClass = 'Network adapters' }\n")
	script.WriteString("                                        'BTH*' { $deviceClass = 'Bluetooth' }\n")
	script.WriteString("                                        'BTHENUM*' { $deviceClass = 'Bluetooth' }\n")
	script.WriteString("                                        'CDROM*' { $deviceClass = 'DVD/CD-ROM drives' }\n")
	script.WriteString("                                        'DISK*' { $deviceClass = 'Disk drives' }\n")
	script.WriteString("                                        'FLOPPY*' { $deviceClass = 'Floppy disk drives' }\n")
	script.WriteString("                                        'KEYBOARD*' { $deviceClass = 'Keyboards' }\n")
	script.WriteString("                                        'MOUSE*' { $deviceClass = 'Mice and other pointing devices' }\n")
	script.WriteString("                                        'PRINTER*' { $deviceClass = 'Print queues' }\n")
	script.WriteString("                                        'PROCESSOR*' { $deviceClass = 'Processors' }\n")
	script.WriteString("                                        'SYSTEM*' { $deviceClass = 'System devices' }\n")
	script.WriteString("                                        'COMPOSITE*' { $deviceClass = 'Universal Serial Bus controllers' }\n")
	script.WriteString("                                        'USBSTOR*' { $deviceClass = 'Disk drives' }\n")
	script.WriteString("                                        'WPD*' { $deviceClass = 'Portable Devices' }\n")
	script.WriteString("                                        default { $deviceClass = 'Other devices' }\n")
	script.WriteString("                                    }\n")
	script.WriteString("                                }\n")
	script.WriteString("                            }\n")
	script.WriteString("                        } catch {}\n")
	script.WriteString("                    }\n")
	script.WriteString("                    \n")
	script.WriteString("                    # If still unknown, set to 'Other devices'\n")
	script.WriteString("                    if (-not $deviceClass -or $deviceClass -eq 'Unknown' -or $deviceClass -eq '') {\n")
	script.WriteString("                        $deviceClass = 'Other devices'\n")
	script.WriteString("                    }\n")
	script.WriteString("                    \n")
	script.WriteString("                    # Get friendly name - try multiple sources\n")
	script.WriteString("                    $friendlyName = $device.FriendlyName\n")
	script.WriteString("                    if (-not $friendlyName -or $friendlyName -eq '') {\n")
	script.WriteString("                        # Try to get from device properties\n")
	script.WriteString("                        try {\n")
	script.WriteString("                            $deviceProps = Get-PnpDeviceProperty -InstanceId $device.InstanceId -ErrorAction SilentlyContinue\n")
	script.WriteString("                            $friendlyName = ($deviceProps | Where-Object { $_.KeyName -eq 'DEVPKEY_Device_FriendlyName' }).Data\n")
	script.WriteString("                            if (-not $friendlyName) {\n")
	script.WriteString("                                $friendlyName = ($deviceProps | Where-Object { $_.KeyName -eq 'DEVPKEY_Device_DeviceDesc' }).Data\n")
	script.WriteString("                            }\n")
	script.WriteString("                        } catch {}\n")
	script.WriteString("                    }\n")
	script.WriteString("                    \n")
	script.WriteString("                    # If still empty, try to extract from InstanceId\n")
	script.WriteString("                    if (-not $friendlyName -or $friendlyName -eq '') {\n")
	script.WriteString("                        if ($device.InstanceId) {\n")
	script.WriteString("                            $instanceParts = $device.InstanceId -split '\\\\'\n")
	script.WriteString("                            if ($instanceParts.Count -gt 1) {\n")
	script.WriteString("                                $friendlyName = $instanceParts[-1]\n")
	script.WriteString("                            }\n")
	script.WriteString("                        }\n")
	script.WriteString("                    }\n")
	script.WriteString("                    \n")
	script.WriteString("                    # Last resort: use InstanceId itself\n")
	script.WriteString("                    if (-not $friendlyName -or $friendlyName -eq '') {\n")
	script.WriteString("                        $friendlyName = if ($device.InstanceId) { $device.InstanceId } else { 'Unknown Device' }\n")
	script.WriteString("                    }\n")
	script.WriteString("                    \n")
	script.WriteString("                    $deviceInfo = @{\n")
	script.WriteString("                        'friendlyName' = $friendlyName\n")
	script.WriteString("                        'instanceId' = $device.InstanceId\n")
	script.WriteString("                        'status' = if ($device.Status) { $device.Status } else { 'Unknown' }\n")
	script.WriteString("                        'class' = if ($deviceClass) { $deviceClass } else { 'Unknown' }\n")
	script.WriteString("                        'classGuid' = if ($device.ClassGuid) { $device.ClassGuid } else { 'N/A' }\n")
	script.WriteString("                        'manufacturer' = if ($device.Manufacturer) { $device.Manufacturer } else { 'N/A' }\n")
	script.WriteString("                        'isPresent' = if ($device.Present -ne $null) { $device.Present } else { $true }\n")
	script.WriteString("                        'isHidden' = if ($device.InstanceId -like '*ROOT\\\\*' -or $device.InstanceId -like '*SWD\\\\*' -or $device.InstanceId -like '*HID\\\\*ROOT*' -or ($deviceClass -eq 'System' -and $device.FriendlyName -eq $null)) { $true } else { $false }\n")
	script.WriteString("                        'isDisabled' = if ($device.Status -eq 'Error' -or $device.Status -eq 'Disabled' -or $device.Status -eq 'Degraded') { $true } else { $false }\n")
	script.WriteString("                        'isVirtual' = if ($device.InstanceId -like '*VMBUS\\\\*' -or $device.InstanceId -like '*ROOT\\\\VMBUS*' -or $device.InstanceId -like '*SYNTHETIC*' -or $device.InstanceId -like '*HYPER-V*' -or ($deviceClass -eq 'System' -and $device.Manufacturer -like '*Microsoft*') -or $device.FriendlyName -like '*Hyper-V*' -or $device.FriendlyName -like '*Virtual*') { $true } else { $false }\n")
	script.WriteString("                        'hasDriver' = $true\n")
	script.WriteString("                        'driverProblem' = 'None'\n")
	script.WriteString("                    }\n")
	script.WriteString("                    \n")
	script.WriteString("                    # Check if device has driver issues\n")
	script.WriteString("                    try {\n")
	script.WriteString("                        $deviceDetails = Get-PnpDeviceProperty -InstanceId $device.InstanceId -ErrorAction SilentlyContinue\n")
	script.WriteString("                        $problemCode = ($deviceDetails | Where-Object { $_.KeyName -eq 'DEVPKEY_Device_ProblemCode' }).Data\n")
	script.WriteString("                        \n")
	script.WriteString("                        if ($problemCode -and $problemCode -ne 0) {\n")
	script.WriteString("                            $deviceInfo['hasDriver'] = $false\n")
	script.WriteString("                            switch ($problemCode) {\n")
	script.WriteString("                                1 { $deviceInfo['driverProblem'] = 'Not configured' }\n")
	script.WriteString("                                10 { $deviceInfo['driverProblem'] = 'Device cannot start' }\n")
	script.WriteString("                                21 { $deviceInfo['driverProblem'] = 'Windows cannot identify this device' }\n")
	script.WriteString("                                22 { $deviceInfo['driverProblem'] = 'Device is disabled' }\n")
	script.WriteString("                                24 { $deviceInfo['driverProblem'] = 'Device is not present, not working properly, or missing drivers' }\n")
	script.WriteString("                                28 { $deviceInfo['driverProblem'] = 'Device drivers are not installed' }\n")
	script.WriteString("                                31 { $deviceInfo['driverProblem'] = 'Device is not working properly because Windows cannot load the drivers' }\n")
	script.WriteString("                                33 { $deviceInfo['driverProblem'] = 'Device is not working properly because a driver cannot be found' }\n")
	script.WriteString("                                38 { $deviceInfo['driverProblem'] = 'Device drivers are not installed' }\n")
	script.WriteString("                                39 { $deviceInfo['driverProblem'] = 'Device drivers are not installed' }\n")
	script.WriteString("                                41 { $deviceInfo['driverProblem'] = 'Windows successfully loaded the device driver but cannot find the device' }\n")
	script.WriteString("                                42 { $deviceInfo['driverProblem'] = 'Windows cannot load the device driver' }\n")
	script.WriteString("                                43 { $deviceInfo['driverProblem'] = 'Device driver has been blocked by Windows' }\n")
	script.WriteString("                                48 { $deviceInfo['driverProblem'] = 'Device driver software could not be loaded' }\n")
	script.WriteString("                                default { $deviceInfo['driverProblem'] = \"Problem code: $problemCode\" }\n")
	script.WriteString("                            }\n")
	script.WriteString("                        }\n")
	script.WriteString("                        \n")
	script.WriteString("                        # Check for unknown devices\n")
	script.WriteString("                        if ($device.FriendlyName -like '*Unknown*' -or $device.FriendlyName -like '*Not recognized*' -or $device.FriendlyName -eq '') {\n")
	script.WriteString("                            $deviceInfo['hasDriver'] = $false\n")
	script.WriteString("                            if ($deviceInfo['driverProblem'] -eq 'None') {\n")
	script.WriteString("                                $deviceInfo['driverProblem'] = 'Device not recognized or driver missing'\n")
	script.WriteString("                            }\n")
	script.WriteString("                        }\n")
	script.WriteString("                    } catch {\n")
	script.WriteString("                        # Could not get device properties, continue\n")
	script.WriteString("                    }\n")
	script.WriteString("                    \n")
	script.WriteString("                    $allDevices += $deviceInfo\n")
	script.WriteString("                    \n")
	script.WriteString("                    # Categorize devices\n")
	script.WriteString("                    if ($deviceInfo['isPresent'] -and -not $deviceInfo['isHidden']) {\n")
	script.WriteString("                        $connectedDevices += $deviceInfo\n")
	script.WriteString("                    }\n")
	script.WriteString("                    if ($deviceInfo['isHidden']) {\n")
	script.WriteString("                        $hiddenDevices += $deviceInfo\n")
	script.WriteString("                    }\n")
	script.WriteString("                    if ($deviceInfo['isDisabled']) {\n")
	script.WriteString("                        $disabledDevices += $deviceInfo\n")
	script.WriteString("                    }\n")
	script.WriteString("                    if ($deviceInfo['isVirtual']) {\n")
	script.WriteString("                        $virtualDevices += $deviceInfo\n")
	script.WriteString("                    }\n")
	script.WriteString("                    if (-not $deviceInfo['hasDriver']) {\n")
	script.WriteString("                        $devicesMissingDrivers += $deviceInfo\n")
	script.WriteString("                    }\n")
	script.WriteString("                } catch {\n")
	script.WriteString("                    # Skip this device if there's an error\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("        } catch {\n")
	script.WriteString("            # Fallback: if both methods failed, try basic WMI query\n")
	script.WriteString("            try {\n")
	script.WriteString("                $devices = Get-CimInstance -ClassName Win32_PnPEntity -ErrorAction SilentlyContinue\n")
	script.WriteString("                foreach ($device in $devices) {\n")
	script.WriteString("                    if (-not $device.DeviceID) { continue }\n")
	script.WriteString("                    \n")
	script.WriteString("                    # Get device class from registry\n")
	script.WriteString("                    $deviceClass = $device.Class\n")
	script.WriteString("                    if (-not $deviceClass -or $deviceClass -eq 'Unknown' -or $deviceClass -eq '') {\n")
	script.WriteString("                        try {\n")
	script.WriteString("                            $classGuid = $device.ClassGuid\n")
	script.WriteString("                            if ($classGuid) {\n")
	script.WriteString("                                $regPath = \"HKLM:\\\\SYSTEM\\\\CurrentControlSet\\\\Control\\\\Class\\\\{$classGuid}\"\n")
	script.WriteString("                                if (Test-Path $regPath) {\n")
	script.WriteString("                                    $regClass = (Get-ItemProperty -Path $regPath -Name 'Class' -ErrorAction SilentlyContinue).Class\n")
	script.WriteString("                                    if ($regClass) { $deviceClass = $regClass }\n")
	script.WriteString("                                }\n")
	script.WriteString("                            }\n")
	script.WriteString("                            \n")
	script.WriteString("                            # If still unknown, try to get from DeviceID path\n")
	script.WriteString("                            if (($deviceClass -eq 'Unknown' -or -not $deviceClass) -and $device.DeviceID) {\n")
	script.WriteString("                                $instanceParts = $device.DeviceID -split '\\\\'\n")
	script.WriteString("                                if ($instanceParts.Count -gt 0) {\n")
	script.WriteString("                                    $firstPart = $instanceParts[0]\n")
	script.WriteString("                                    # Map common prefixes to classes\n")
	script.WriteString("                                    switch -Wildcard ($firstPart) {\n")
	script.WriteString("                                        'ACPI*' { $deviceClass = 'System devices' }\n")
	script.WriteString("                                        'PCI*' { $deviceClass = 'System devices' }\n")
	script.WriteString("                                        'USB*' { $deviceClass = 'Universal Serial Bus controllers' }\n")
	script.WriteString("                                        'HID*' { $deviceClass = 'Human Interface Devices' }\n")
	script.WriteString("                                        'ROOT*' { $deviceClass = 'System devices' }\n")
	script.WriteString("                                        'SWD*' { $deviceClass = 'Software devices' }\n")
	script.WriteString("                                        'VMBUS*' { $deviceClass = 'System devices' }\n")
	script.WriteString("                                        'STORAGE*' { $deviceClass = 'Storage controllers' }\n")
	script.WriteString("                                        'SCSI*' { $deviceClass = 'Storage controllers' }\n")
	script.WriteString("                                        'IDE*' { $deviceClass = 'IDE ATA/ATAPI controllers' }\n")
	script.WriteString("                                        'DISPLAY*' { $deviceClass = 'Display adapters' }\n")
	script.WriteString("                                        'MONITOR*' { $deviceClass = 'Monitors' }\n")
	script.WriteString("                                        'NET*' { $deviceClass = 'Network adapters' }\n")
	script.WriteString("                                        'BTH*' { $deviceClass = 'Bluetooth' }\n")
	script.WriteString("                                        'BTHENUM*' { $deviceClass = 'Bluetooth' }\n")
	script.WriteString("                                        'CDROM*' { $deviceClass = 'DVD/CD-ROM drives' }\n")
	script.WriteString("                                        'DISK*' { $deviceClass = 'Disk drives' }\n")
	script.WriteString("                                        'FLOPPY*' { $deviceClass = 'Floppy disk drives' }\n")
	script.WriteString("                                        'KEYBOARD*' { $deviceClass = 'Keyboards' }\n")
	script.WriteString("                                        'MOUSE*' { $deviceClass = 'Mice and other pointing devices' }\n")
	script.WriteString("                                        'PRINTER*' { $deviceClass = 'Print queues' }\n")
	script.WriteString("                                        'PROCESSOR*' { $deviceClass = 'Processors' }\n")
	script.WriteString("                                        'SYSTEM*' { $deviceClass = 'System devices' }\n")
	script.WriteString("                                        'COMPOSITE*' { $deviceClass = 'Universal Serial Bus controllers' }\n")
	script.WriteString("                                        'USBSTOR*' { $deviceClass = 'Disk drives' }\n")
	script.WriteString("                                        'WPD*' { $deviceClass = 'Portable Devices' }\n")
	script.WriteString("                                        default { $deviceClass = 'Other devices' }\n")
	script.WriteString("                                    }\n")
	script.WriteString("                                }\n")
	script.WriteString("                            }\n")
	script.WriteString("                        } catch {}\n")
	script.WriteString("                    }\n")
	script.WriteString("                    \n")
	script.WriteString("                    # If still unknown, set to 'Other devices'\n")
	script.WriteString("                    if ($deviceClass -eq 'Unknown' -or -not $deviceClass) {\n")
	script.WriteString("                        $deviceClass = 'Other devices'\n")
	script.WriteString("                    }\n")
	script.WriteString("                    \n")
	script.WriteString("                    # Get friendly name from WMI device\n")
	script.WriteString("                    $friendlyName = $device.Name\n")
	script.WriteString("                    if (-not $friendlyName -or $friendlyName -eq '') {\n")
	script.WriteString("                        if ($device.DeviceID) {\n")
	script.WriteString("                            $instanceParts = $device.DeviceID -split '\\\\'\n")
	script.WriteString("                            if ($instanceParts.Count -gt 1) {\n")
	script.WriteString("                                $friendlyName = $instanceParts[-1]\n")
	script.WriteString("                            } else {\n")
	script.WriteString("                                $friendlyName = $device.DeviceID\n")
	script.WriteString("                            }\n")
	script.WriteString("                        } else {\n")
	script.WriteString("                            $friendlyName = 'Unknown Device'\n")
	script.WriteString("                        }\n")
	script.WriteString("                    }\n")
	script.WriteString("                    \n")
	script.WriteString("                    $deviceInfo = @{\n")
	script.WriteString("                        'friendlyName' = $friendlyName\n")
	script.WriteString("                        'instanceId' = $device.DeviceID\n")
	script.WriteString("                        'status' = if ($device.Status) { $device.Status } else { 'Unknown' }\n")
	script.WriteString("                        'class' = $deviceClass\n")
	script.WriteString("                        'classGuid' = if ($device.ClassGuid) { $device.ClassGuid } else { 'N/A' }\n")
	script.WriteString("                        'manufacturer' = if ($device.Manufacturer) { $device.Manufacturer } else { 'N/A' }\n")
	script.WriteString("                        'isPresent' = if ($device.Present -ne $null) { $device.Present } else { $true }\n")
	script.WriteString("                        'isHidden' = if ($device.DeviceID -like '*ROOT\\\\*' -or $device.DeviceID -like '*SWD\\\\*' -or $device.DeviceID -like '*HID\\\\*ROOT*') { $true } else { $false }\n")
	script.WriteString("                        'isDisabled' = if ($device.Status -eq 'Error' -or $device.Status -eq 'Degraded') { $true } else { $false }\n")
	script.WriteString("                        'isVirtual' = if ($device.DeviceID -like '*VMBUS\\\\*' -or $device.DeviceID -like '*ROOT\\\\VMBUS*' -or $device.DeviceID -like '*HYPER-V*' -or ($deviceClass -eq 'System' -and $device.Manufacturer -like '*Microsoft*') -or $device.Name -like '*Hyper-V*' -or $device.Name -like '*Virtual*') { $true } else { $false }\n")
	script.WriteString("                        'hasDriver' = if ($device.Status -eq 'OK') { $true } else { $false }\n")
	script.WriteString("                        'driverProblem' = if ($device.Status -ne 'OK') { $device.Status } else { 'None' }\n")
	script.WriteString("                    }\n")
	script.WriteString("                    \n")
	script.WriteString("                    # Check for driver issues\n")
	script.WriteString("                    if ($device.Status -ne 'OK' -and $device.Status -ne 'Unknown') {\n")
	script.WriteString("                        $deviceInfo['hasDriver'] = $false\n")
	script.WriteString("                        $deviceInfo['driverProblem'] = $device.Status\n")
	script.WriteString("                    }\n")
	script.WriteString("                    \n")
	script.WriteString("                    $allDevices += $deviceInfo\n")
	script.WriteString("                    if ($deviceInfo['isPresent'] -and -not $deviceInfo['isHidden']) {\n")
	script.WriteString("                        $connectedDevices += $deviceInfo\n")
	script.WriteString("                    }\n")
	script.WriteString("                    if ($deviceInfo['isHidden']) {\n")
	script.WriteString("                        $hiddenDevices += $deviceInfo\n")
	script.WriteString("                    }\n")
	script.WriteString("                    if ($deviceInfo['isDisabled']) {\n")
	script.WriteString("                        $disabledDevices += $deviceInfo\n")
	script.WriteString("                    }\n")
	script.WriteString("                    if ($deviceInfo['isVirtual']) {\n")
	script.WriteString("                        $virtualDevices += $deviceInfo\n")
	script.WriteString("                    }\n")
	script.WriteString("                    if (-not $deviceInfo['hasDriver']) {\n")
	script.WriteString("                        $devicesMissingDrivers += $deviceInfo\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("            } catch {}\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        $result['devices'] = @{\n")
	script.WriteString("            'allDevices' = $allDevices\n")
	script.WriteString("            'connectedDevices' = $connectedDevices\n")
	script.WriteString("            'hiddenDevices' = $hiddenDevices\n")
	script.WriteString("            'disabledDevices' = $disabledDevices\n")
	script.WriteString("            'virtualDevices' = $virtualDevices\n")
	script.WriteString("            'devicesMissingDrivers' = $devicesMissingDrivers\n")
	script.WriteString("            'totalDevices' = $allDevices.Count\n")
	script.WriteString("            'totalConnected' = $connectedDevices.Count\n")
	script.WriteString("            'totalHidden' = $hiddenDevices.Count\n")
	script.WriteString("            'totalDisabled' = $disabledDevices.Count\n")
	script.WriteString("            'totalVirtual' = $virtualDevices.Count\n")
	script.WriteString("            'totalMissingDrivers' = $devicesMissingDrivers.Count\n")
	script.WriteString("        }\n")
	script.WriteString("    } catch {\n")
	script.WriteString("        $result['devices'] = @{\n")
	script.WriteString("            'allDevices' = @()\n")
	script.WriteString("            'connectedDevices' = @()\n")
	script.WriteString("            'hiddenDevices' = @()\n")
	script.WriteString("            'disabledDevices' = @()\n")
	script.WriteString("            'virtualDevices' = @()\n")
	script.WriteString("            'devicesMissingDrivers' = @()\n")
	script.WriteString("            'totalDevices' = 0\n")
	script.WriteString("            'totalConnected' = 0\n")
	script.WriteString("            'totalHidden' = 0\n")
	script.WriteString("            'totalDisabled' = 0\n")
	script.WriteString("            'totalVirtual' = 0\n")
	script.WriteString("            'totalMissingDrivers' = 0\n")
	script.WriteString("        }\n")
	script.WriteString("    }\n\n")
	script.WriteString("    Update-Progress -Step ($currentStep++) -Activity \"Collecting Services\" -Status \"Enumerating Windows services\"\n")
	script.WriteString("    # Services\n")
	script.WriteString("    $services = Get-Service | Select-Object Name, DisplayName, Status, StartType\n")
	script.WriteString("    $result['services'] = @{\n")
	script.WriteString("        'total' = $services.Count\n")
	script.WriteString("        'running' = ($services | Where-Object { $_.Status -eq 'Running' }).Count\n")
	script.WriteString("        'stopped' = ($services | Where-Object { $_.Status -eq 'Stopped' }).Count\n")
	script.WriteString("        'services' = @($services | ForEach-Object {\n")
	script.WriteString("            @{\n")
	script.WriteString("                'name' = $_.Name\n")
	script.WriteString("                'displayName' = $_.DisplayName\n")
	script.WriteString("                'status' = $_.Status.ToString()\n")
	script.WriteString("                'startType' = $_.StartType.ToString()\n")
	script.WriteString("            }\n")
	script.WriteString("        })\n")
	script.WriteString("    }\n\n")

	script.WriteString("    Update-Progress -Step ($currentStep++) -Activity \"Collecting Disks & Volumes\" -Status \"Enumerating physical disks and volumes\"\n")
	script.WriteString("    # Physical Disks\n")
	script.WriteString("    try {\n")
	script.WriteString("        $disks = Get-Disk -ErrorAction SilentlyContinue\n")
	script.WriteString("        $result['physicalDisks'] = @($disks | ForEach-Object {\n")
	script.WriteString("            $disk = $_\n")
	script.WriteString("            $diskName = $null\n")
	script.WriteString("            if ($disk.FriendlyName -and $disk.FriendlyName.Trim() -ne '') {\n")
	script.WriteString("                $diskName = $disk.FriendlyName.Trim()\n")
	script.WriteString("                if ($disk.Number -ne $null) {\n")
	script.WriteString("                    $diskName += \" (Disk $($disk.Number))\"\n")
	script.WriteString("                }\n")
	script.WriteString("            } elseif ($disk.Model -and $disk.Model.Trim() -ne '') {\n")
	script.WriteString("                $diskName = $disk.Model.Trim()\n")
	script.WriteString("                if ($disk.Number -ne $null) {\n")
	script.WriteString("                    $diskName += \" (Disk $($disk.Number))\"\n")
	script.WriteString("                }\n")
	script.WriteString("            } elseif ($disk.SerialNumber -and $disk.SerialNumber.Trim() -ne '') {\n")
	script.WriteString("                if ($disk.Number -ne $null) {\n")
	script.WriteString("                    $diskName = \"Disk $($disk.Number) - $($disk.SerialNumber.Trim())\"\n")
	script.WriteString("                } else {\n")
	script.WriteString("                    $diskName = \"Disk - $($disk.SerialNumber.Trim())\"\n")
	script.WriteString("                }\n")
	script.WriteString("            } else {\n")
	script.WriteString("                if ($disk.Number -ne $null) {\n")
	script.WriteString("                    $diskName = \"Physical Disk $($disk.Number)\"\n")
	script.WriteString("                } else {\n")
	script.WriteString("                    $diskName = \"Physical Disk\"\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("            # Get SMART status and temperature\n")
	script.WriteString("            $temperature = 'N/A'\n")
	script.WriteString("            $smartStatus = 'N/A'\n")
	script.WriteString("            try {\n")
	script.WriteString("                # Try Get-PhysicalDisk first (Storage module) - use UniqueId for better matching\n")
	script.WriteString("                $physicalDisk = $null\n")
	script.WriteString("                if ($disk.UniqueId) {\n")
	script.WriteString("                    $physicalDisk = Get-PhysicalDisk -UniqueId $disk.UniqueId -ErrorAction SilentlyContinue\n")
	script.WriteString("                }\n")
	script.WriteString("                if (-not $physicalDisk -and $disk.Number -ne $null) {\n")
	script.WriteString("                    # Fallback: Try by number\n")
	script.WriteString("                    $physicalDisk = Get-PhysicalDisk -Number $disk.Number -ErrorAction SilentlyContinue\n")
	script.WriteString("                }\n")
	script.WriteString("                if ($physicalDisk) {\n")
	script.WriteString("                    # Get temperature (may be in Celsius)\n")
	script.WriteString("                    if ($physicalDisk.Temperature -ne $null) {\n")
	script.WriteString("                        $tempValue = $physicalDisk.Temperature\n")
	script.WriteString("                        if ($tempValue -is [int] -or $tempValue -is [double]) {\n")
	script.WriteString("                            $temperature = \"$tempValue°C\"\n")
	script.WriteString("                        } else {\n")
	script.WriteString("                            $temperature = $tempValue.ToString()\n")
	script.WriteString("                        }\n")
	script.WriteString("                    }\n")
	script.WriteString("                    # Get health status (SMART status)\n")
	script.WriteString("                    if ($physicalDisk.HealthStatus) {\n")
	script.WriteString("                        $smartStatus = $physicalDisk.HealthStatus.ToString()\n")
	script.WriteString("                    }\n")
	script.WriteString("                    # If still N/A, try OperationalStatus\n")
	script.WriteString("                    if ($smartStatus -eq 'N/A' -and $physicalDisk.OperationalStatus) {\n")
	script.WriteString("                        $smartStatus = $physicalDisk.OperationalStatus.ToString()\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("                # Fallback: Use disk's own HealthStatus if PhysicalDisk not available\n")
	script.WriteString("                if ($smartStatus -eq 'N/A' -and $disk.HealthStatus) {\n")
	script.WriteString("                    $smartStatus = $disk.HealthStatus.ToString()\n")
	script.WriteString("                }\n")
	script.WriteString("                # Fallback: Use OperationalStatus\n")
	script.WriteString("                if ($smartStatus -eq 'N/A' -and $disk.OperationalStatus) {\n")
	script.WriteString("                    $smartStatus = $disk.OperationalStatus.ToString()\n")
	script.WriteString("                }\n")
	script.WriteString("            } catch {\n")
	script.WriteString("                # PhysicalDisk cmdlet may not be available or disk may not support SMART\n")
	script.WriteString("                # Use disk's own status as fallback\n")
	script.WriteString("                if ($smartStatus -eq 'N/A' -and $disk.HealthStatus) {\n")
	script.WriteString("                    $smartStatus = $disk.HealthStatus.ToString()\n")
	script.WriteString("                }\n")
	script.WriteString("                if ($smartStatus -eq 'N/A' -and $disk.OperationalStatus) {\n")
	script.WriteString("                    $smartStatus = $disk.OperationalStatus.ToString()\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("            @{\n")
	script.WriteString("                'number' = $disk.Number\n")
	script.WriteString("                'friendlyName' = $disk.FriendlyName\n")
	script.WriteString("                'name' = $diskName\n")
	script.WriteString("                'model' = if ($disk.Model) { $disk.Model.Trim() } else { '' }\n")
	script.WriteString("                'mediaType' = if ($disk.MediaType) { $disk.MediaType.ToString() } else { '' }\n")
	script.WriteString("                'serialNumber' = $disk.SerialNumber\n")
	script.WriteString("                'uniqueId' = $disk.UniqueId\n")
	script.WriteString("                'size' = [math]::Round($disk.Size / 1GB, 2)\n")
	script.WriteString("                'allocatedSize' = if ($disk.AllocatedSize) { [math]::Round($disk.AllocatedSize / 1GB, 2) } else { 0 }\n")
	script.WriteString("                'partitionStyle' = $disk.PartitionStyle\n")
	script.WriteString("                'busType' = $disk.BusType\n")
	script.WriteString("                'healthStatus' = $disk.HealthStatus\n")
	script.WriteString("                'operationalStatus' = $disk.OperationalStatus\n")
	script.WriteString("                'temperature' = $temperature\n")
	script.WriteString("                'smartStatus' = $smartStatus\n")
	script.WriteString("            }\n")
	script.WriteString("        })\n")
	script.WriteString("    } catch {\n")
	script.WriteString("        $result['physicalDisks'] = @()\n")
	script.WriteString("    }\n\n")
	script.WriteString("    # Volumes\n")
	script.WriteString("    try {\n")
	script.WriteString("        $volumes = Get-Volume -ErrorAction SilentlyContinue | Where-Object { $_.DriveLetter -or $_.FileSystemLabel }\n")
	script.WriteString("        $result['volumes'] = @($volumes | ForEach-Object {\n")
	script.WriteString("            $vol = $_\n")
	script.WriteString("            $bitLockerStatus = 'N/A'\n")
	script.WriteString("            if ($vol.DriveLetter) {\n")
	script.WriteString("                try {\n")
	script.WriteString("                    $bitLocker = Get-BitLockerVolume -MountPoint \"$($vol.DriveLetter):\" -ErrorAction SilentlyContinue\n")
	script.WriteString("                    if ($bitLocker) {\n")
	script.WriteString("                        $bitLockerStatus = $bitLocker.VolumeStatus.ToString()\n")
	script.WriteString("                    } else {\n")
	script.WriteString("                        $bitLockerStatus = 'Not Encrypted'\n")
	script.WriteString("                    }\n")
	script.WriteString("                } catch {\n")
	script.WriteString("                    # Check if error is because BitLocker module is not available\n")
	script.WriteString("                    if ($_.Exception.Message -like '*BitLocker*' -or $_.Exception.Message -like '*not recognized*') {\n")
	script.WriteString("                        $bitLockerStatus = 'Not Available'\n")
	script.WriteString("                    } else {\n")
	script.WriteString("                        $bitLockerStatus = 'Not Encrypted'\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("            @{\n")
	script.WriteString("                'driveLetter' = $vol.DriveLetter\n")
	script.WriteString("                'fileSystemLabel' = $vol.FileSystemLabel\n")
	script.WriteString("                'fileSystem' = $vol.FileSystem\n")
	script.WriteString("                'path' = $vol.Path\n")
	script.WriteString("                'uniqueId' = $vol.UniqueId\n")
	script.WriteString("                'size' = [math]::Round($vol.Size / 1GB, 2)\n")
	script.WriteString("                'sizeRemaining' = [math]::Round($vol.SizeRemaining / 1GB, 2)\n")
	script.WriteString("                'healthStatus' = $vol.HealthStatus\n")
	script.WriteString("                'bitLockerStatus' = $bitLockerStatus\n")
	script.WriteString("            }\n")
	script.WriteString("        })\n")
	script.WriteString("    } catch {\n")
	script.WriteString("        $result['volumes'] = @()\n")
	script.WriteString("    }\n\n")
	script.WriteString("    Update-Progress -Step ($currentStep++) -Activity \"Collecting iSCSI Information\" -Status \"Enumerating iSCSI connections and disks\"\n")
	script.WriteString("    # iSCSI Connections and Disks\n")
	script.WriteString("    try {\n")
	script.WriteString("        $iscsiConnections = @()\n")
	script.WriteString("        $iscsiSessions = @()\n")
	script.WriteString("        $iscsiDisks = @()\n")
	script.WriteString("        \n")
	script.WriteString("        # Get iSCSI sessions and connections\n")
	script.WriteString("        try {\n")
	script.WriteString("            $sessions = Get-IscsiSession -ErrorAction SilentlyContinue\n")
	script.WriteString("            foreach ($session in $sessions) {\n")
	script.WriteString("                $sessionInfo = @{\n")
	script.WriteString("                    'sessionId' = $session.SessionIdentifier\n")
	script.WriteString("                    'targetName' = $session.TargetName\n")
	script.WriteString("                    'targetNodeAddress' = $session.TargetNodeAddress\n")
	script.WriteString("                    'initiatorNodeAddress' = $session.InitiatorNodeAddress\n")
	script.WriteString("                    'isConnected' = $session.IsConnected\n")
	script.WriteString("                    'isPersistent' = $session.IsPersistent\n")
	script.WriteString("                }\n")
	script.WriteString("                $iscsiSessions += $sessionInfo\n")
	script.WriteString("                \n")
	script.WriteString("                # Get connections for this session\n")
	script.WriteString("                try {\n")
	script.WriteString("                    $connections = Get-IscsiConnection -SessionId $session.SessionIdentifier -ErrorAction SilentlyContinue\n")
	script.WriteString("                    foreach ($conn in $connections) {\n")
	script.WriteString("                        $connInfo = @{\n")
	script.WriteString("                            'connectionId' = $conn.ConnectionIdentifier\n")
	script.WriteString("                            'sessionId' = $conn.SessionIdentifier\n")
	script.WriteString("                            'targetName' = $conn.TargetName\n")
	script.WriteString("                            'initiatorAddress' = $conn.InitiatorAddress\n")
	script.WriteString("                            'targetAddress' = $conn.TargetAddress\n")
	script.WriteString("                            'initiatorPort' = $conn.InitiatorPort\n")
	script.WriteString("                            'targetPort' = $conn.TargetPort\n")
	script.WriteString("                            'connectionState' = $conn.ConnectionState\n")
	script.WriteString("                        }\n")
	script.WriteString("                        $iscsiConnections += $connInfo\n")
	script.WriteString("                    }\n")
	script.WriteString("                } catch {\n")
	script.WriteString("                    # Connection query failed, continue\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("        } catch {\n")
	script.WriteString("            # iSCSI module may not be available or no sessions\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        # Get iSCSI disks (disks with BusType = 'iSCSI')\n")
	script.WriteString("        try {\n")
	script.WriteString("            $allDisks = Get-Disk -ErrorAction SilentlyContinue\n")
	script.WriteString("            $iscsiDisks = @($allDisks | Where-Object { $_.BusType -eq 'iSCSI' } | ForEach-Object {\n")
	script.WriteString("                $disk = $_\n")
	script.WriteString("                $diskName = $null\n")
	script.WriteString("                if ($disk.FriendlyName -and $disk.FriendlyName.Trim() -ne '') {\n")
	script.WriteString("                    $diskName = $disk.FriendlyName.Trim()\n")
	script.WriteString("                    if ($disk.Number -ne $null) {\n")
	script.WriteString("                        $diskName += \" (Disk $($disk.Number))\"\n")
	script.WriteString("                    }\n")
	script.WriteString("                } elseif ($disk.Model -and $disk.Model.Trim() -ne '') {\n")
	script.WriteString("                    $diskName = $disk.Model.Trim()\n")
	script.WriteString("                    if ($disk.Number -ne $null) {\n")
	script.WriteString("                        $diskName += \" (Disk $($disk.Number))\"\n")
	script.WriteString("                    }\n")
	script.WriteString("                } else {\n")
	script.WriteString("                    if ($disk.Number -ne $null) {\n")
	script.WriteString("                        $diskName = \"iSCSI Disk $($disk.Number)\"\n")
	script.WriteString("                    } else {\n")
	script.WriteString("                        $diskName = \"iSCSI Disk\"\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("                @{\n")
	script.WriteString("                    'number' = $disk.Number\n")
	script.WriteString("                    'friendlyName' = $disk.FriendlyName\n")
	script.WriteString("                    'name' = $diskName\n")
	script.WriteString("                    'model' = if ($disk.Model) { $disk.Model.Trim() } else { '' }\n")
	script.WriteString("                    'serialNumber' = $disk.SerialNumber\n")
	script.WriteString("                    'uniqueId' = $disk.UniqueId\n")
	script.WriteString("                    'size' = [math]::Round($disk.Size / 1GB, 2)\n")
	script.WriteString("                    'allocatedSize' = if ($disk.AllocatedSize) { [math]::Round($disk.AllocatedSize / 1GB, 2) } else { 0 }\n")
	script.WriteString("                    'partitionStyle' = $disk.PartitionStyle\n")
	script.WriteString("                    'healthStatus' = $disk.HealthStatus\n")
	script.WriteString("                    'operationalStatus' = $disk.OperationalStatus\n")
	script.WriteString("                }\n")
	script.WriteString("            })\n")
	script.WriteString("        } catch {\n")
	script.WriteString("            $iscsiDisks = @()\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        $result['iscsi'] = @{\n")
	script.WriteString("            'sessions' = $iscsiSessions\n")
	script.WriteString("            'connections' = $iscsiConnections\n")
	script.WriteString("            'disks' = $iscsiDisks\n")
	script.WriteString("            'totalSessions' = $iscsiSessions.Count\n")
	script.WriteString("            'totalConnections' = $iscsiConnections.Count\n")
	script.WriteString("            'totalDisks' = $iscsiDisks.Count\n")
	script.WriteString("        }\n")
	script.WriteString("    } catch {\n")
	script.WriteString("        $result['iscsi'] = @{\n")
	script.WriteString("            'sessions' = @()\n")
	script.WriteString("            'connections' = @()\n")
	script.WriteString("            'disks' = @()\n")
	script.WriteString("            'totalSessions' = 0\n")
	script.WriteString("            'totalConnections' = 0\n")
	script.WriteString("            'totalDisks' = 0\n")
	script.WriteString("        }\n")
	script.WriteString("    }\n\n")
	script.WriteString("    # RAID Controller Health\n")
	script.WriteString("    try {\n")
	script.WriteString("        $raidControllers = @()\n")
	script.WriteString("        # Try to get RAID controllers using WMI\n")
	script.WriteString("        try {\n")
	script.WriteString("            $controllers = Get-CimInstance -ClassName Win32_SCSIController -ErrorAction SilentlyContinue | Where-Object { $_.Description -like '*RAID*' -or $_.Description -like '*Array*' -or $_.Manufacturer -like '*Dell*' -or $_.Manufacturer -like '*HP*' -or $_.Manufacturer -like '*IBM*' -or $_.Manufacturer -like '*LSI*' -or $_.Manufacturer -like '*Adaptec*' }\n")
	script.WriteString("            foreach ($controller in $controllers) {\n")
	script.WriteString("                $controllerInfo = @{\n")
	script.WriteString("                    'name' = $controller.Name\n")
	script.WriteString("                    'description' = $controller.Description\n")
	script.WriteString("                    'manufacturer' = $controller.Manufacturer\n")
	script.WriteString("                    'deviceID' = $controller.DeviceID\n")
	script.WriteString("                    'status' = $controller.Status\n")
	script.WriteString("                    'availability' = $controller.Availability\n")
	script.WriteString("                }\n")
	script.WriteString("                $raidControllers += $controllerInfo\n")
	script.WriteString("            }\n")
	script.WriteString("        } catch {\n")
	script.WriteString("            # WMI query failed, continue\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        # Try to get storage controllers using Get-StorageController (Windows Server 2012+)\n")
	script.WriteString("        try {\n")
	script.WriteString("            $storageControllers = Get-StorageController -ErrorAction SilentlyContinue\n")
	script.WriteString("            foreach ($controller in $storageControllers) {\n")
	script.WriteString("                # Check if this is a RAID controller\n")
	script.WriteString("                $isRaid = $false\n")
	script.WriteString("                if ($controller.FriendlyName -like '*RAID*' -or $controller.FriendlyName -like '*Array*' -or $controller.Manufacturer -like '*Dell*' -or $controller.Manufacturer -like '*HP*' -or $controller.Manufacturer -like '*IBM*' -or $controller.Manufacturer -like '*LSI*' -or $controller.Manufacturer -like '*Adaptec*') {\n")
	script.WriteString("                    $isRaid = $true\n")
	script.WriteString("                }\n")
	script.WriteString("                if ($isRaid) {\n")
	script.WriteString("                    $controllerInfo = @{\n")
	script.WriteString("                        'name' = $controller.FriendlyName\n")
	script.WriteString("                        'description' = $controller.FirmwareVersion\n")
	script.WriteString("                        'manufacturer' = $controller.Manufacturer\n")
	script.WriteString("                        'deviceID' = $controller.DeviceID\n")
	script.WriteString("                        'status' = if ($controller.HealthStatus) { $controller.HealthStatus.ToString() } else { 'N/A' }\n")
	script.WriteString("                        'operationalStatus' = if ($controller.OperationalStatus) { $controller.OperationalStatus.ToString() } else { 'N/A' }\n")
	script.WriteString("                    }\n")
	script.WriteString("                    $raidControllers += $controllerInfo\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("        } catch {\n")
	script.WriteString("            # Get-StorageController may not be available\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        $result['raidControllers'] = $raidControllers\n")
	script.WriteString("    } catch {\n")
	script.WriteString("        $result['raidControllers'] = @()\n")
	script.WriteString("    }\n\n")
	script.WriteString("    Update-Progress -Step ($currentStep++) -Activity \"Collecting Network Configuration\" -Status \"Enumerating network adapters and IP configuration\"\n")
	script.WriteString("    # Network Configuration (Host Networks)\n")
	script.WriteString("    $adapters = Get-NetAdapter\n")
	script.WriteString("    $ipConfig = Get-NetIPConfiguration\n")
	script.WriteString("    $result['network'] = @{\n")
	script.WriteString("        'adapters' = @($adapters | ForEach-Object {\n")
	script.WriteString("            $adapter = $_\n")
	script.WriteString("            $config = $ipConfig | Where-Object { $_.NetAdapter.Name -eq $adapter.Name } | Select-Object -First 1\n")
	script.WriteString("            $ipAddrs = @()\n")
	script.WriteString("            $dnsServs = @()\n")
	script.WriteString("            if ($config) {\n")
	script.WriteString("                if ($config.IPv4Address) {\n")
	script.WriteString("                    if ($config.IPv4Address -is [array]) {\n")
	script.WriteString("                        $ipAddrs = @($config.IPv4Address | ForEach-Object { $_.IPAddress })\n")
	script.WriteString("                    } else {\n")
	script.WriteString("                        $ipAddrs = @($config.IPv4Address.IPAddress)\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("                if ($config.DNSServer -and $config.DNSServer.ServerAddresses) {\n")
	script.WriteString("                    if ($config.DNSServer.ServerAddresses -is [array]) {\n")
	script.WriteString("                        $dnsServs = @($config.DNSServer.ServerAddresses)\n")
	script.WriteString("                    } else {\n")
	script.WriteString("                        $dnsServs = @($config.DNSServer.ServerAddresses)\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("            $gateway = ''\n")
	script.WriteString("            $dnsSuffix = ''\n")
	script.WriteString("            $mtu = $adapter.MTUSize\n")
	script.WriteString("            if ($config) {\n")
	script.WriteString("                if ($config.IPv4DefaultGateway) {\n")
	script.WriteString("                    if ($config.IPv4DefaultGateway -is [array]) {\n")
	script.WriteString("                        $gateway = $config.IPv4DefaultGateway[0].NextHop\n")
	script.WriteString("                    } else {\n")
	script.WriteString("                        $gateway = $config.IPv4DefaultGateway.NextHop\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("                if ($config.DNSSuffix) {\n")
	script.WriteString("                    $dnsSuffix = $config.DNSSuffix\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("            @{\n")
	script.WriteString("                'name' = $adapter.Name\n")
	script.WriteString("                'interfaceDescription' = $adapter.InterfaceDescription\n")
	script.WriteString("                'interfaceIndex' = $adapter.InterfaceIndex\n")
	script.WriteString("                'linkSpeed' = $adapter.LinkSpeed\n")
	script.WriteString("                'macAddress' = $adapter.MacAddress\n")
	script.WriteString("                'status' = $adapter.Status.ToString()\n")
	script.WriteString("                'mtu' = $mtu\n")
	script.WriteString("                'ipAddresses' = $ipAddrs\n")
	script.WriteString("                'gateway' = $gateway\n")
	script.WriteString("                'dnsServers' = $dnsServs\n")
	script.WriteString("                'dnsSuffix' = $dnsSuffix\n")
	script.WriteString("            }\n")
	script.WriteString("        })\n")
	script.WriteString("    }\n\n")

	script.WriteString("    Update-Progress -Step ($currentStep++) -Activity \"Collecting Network Routing Information\" -Status \"Retrieving routing table, persistent routes, and ARP table\"\n")
	script.WriteString("    # Routing Table, Persistent Routes, and ARP Table\n")
	script.WriteString("    try {\n")
	script.WriteString("        # Ensure network object exists\n")
	script.WriteString("        if (-not $result['network']) {\n")
	script.WriteString("            $result['network'] = @{}\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        # Routing Table (Active Routes)\n")
	script.WriteString("        $routingTable = @()\n")
	script.WriteString("        try {\n")
	script.WriteString("            $routes = Get-NetRoute -ErrorAction SilentlyContinue\n")
	script.WriteString("            if ($routes) {\n")
	script.WriteString("                foreach ($route in $routes) {\n")
	script.WriteString("                    $routingTable += @{\n")
	script.WriteString("                        'destinationPrefix' = if ($route.DestinationPrefix) { $route.DestinationPrefix } else { 'N/A' }\n")
	script.WriteString("                        'nextHop' = if ($route.NextHop) { $route.NextHop } else { 'N/A' }\n")
	script.WriteString("                        'interfaceAlias' = if ($route.InterfaceAlias) { $route.InterfaceAlias } else { 'N/A' }\n")
	script.WriteString("                        'interfaceIndex' = if ($route.InterfaceIndex) { $route.InterfaceIndex } else { 'N/A' }\n")
	script.WriteString("                        'routeMetric' = if ($route.RouteMetric) { $route.RouteMetric } else { 'N/A' }\n")
	script.WriteString("                        'ifMetric' = if ($route.ifMetric) { $route.ifMetric } else { 'N/A' }\n")
	script.WriteString("                        'protocol' = if ($route.Protocol) { $route.Protocol } else { 'N/A' }\n")
	script.WriteString("                        'publish' = if ($route.Publish) { $route.Publish } else { 'N/A' }\n")
	script.WriteString("                        'validLifetime' = if ($route.ValidLifetime) { $route.ValidLifetime } else { 'N/A' }\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("        } catch {\n")
	script.WriteString("            # Error getting routing table\n")
	script.WriteString("        }\n")
	script.WriteString("        $result['network']['routingTable'] = $routingTable\n")
	script.WriteString("        \n")
	script.WriteString("        # Persistent Routes\n")
	script.WriteString("        $persistentRoutes = @()\n")
	script.WriteString("        try {\n")
	script.WriteString("            $persistentRoutesData = Get-NetRoute -PolicyStore PersistentStore -ErrorAction SilentlyContinue\n")
	script.WriteString("            if ($persistentRoutesData) {\n")
	script.WriteString("                foreach ($route in $persistentRoutesData) {\n")
	script.WriteString("                    $persistentRoutes += @{\n")
	script.WriteString("                        'destinationPrefix' = if ($route.DestinationPrefix) { $route.DestinationPrefix } else { 'N/A' }\n")
	script.WriteString("                        'nextHop' = if ($route.NextHop) { $route.NextHop } else { 'N/A' }\n")
	script.WriteString("                        'interfaceAlias' = if ($route.InterfaceAlias) { $route.InterfaceAlias } else { 'N/A' }\n")
	script.WriteString("                        'interfaceIndex' = if ($route.InterfaceIndex) { $route.InterfaceIndex } else { 'N/A' }\n")
	script.WriteString("                        'routeMetric' = if ($route.RouteMetric) { $route.RouteMetric } else { 'N/A' }\n")
	script.WriteString("                        'protocol' = if ($route.Protocol) { $route.Protocol } else { 'N/A' }\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("        } catch {\n")
	script.WriteString("            # Error getting persistent routes\n")
	script.WriteString("        }\n")
	script.WriteString("        $result['network']['persistentRoutes'] = $persistentRoutes\n")
	script.WriteString("        \n")
	script.WriteString("        # ARP Table (Neighbor Cache)\n")
	script.WriteString("        $arpTable = @()\n")
	script.WriteString("        try {\n")
	script.WriteString("            $neighbors = Get-NetNeighbor -ErrorAction SilentlyContinue\n")
	script.WriteString("            foreach ($neighbor in $neighbors) {\n")
	script.WriteString("                $arpTable += @{\n")
	script.WriteString("                    'ipAddress' = if ($neighbor.IPAddress) { $neighbor.IPAddress } else { 'N/A' }\n")
	script.WriteString("                    'linkLayerAddress' = if ($neighbor.LinkLayerAddress) { $neighbor.LinkLayerAddress } else { 'N/A' }\n")
	script.WriteString("                    'interfaceAlias' = if ($neighbor.InterfaceAlias) { $neighbor.InterfaceAlias } else { 'N/A' }\n")
	script.WriteString("                    'interfaceIndex' = if ($neighbor.InterfaceIndex) { $neighbor.InterfaceIndex } else { 'N/A' }\n")
	script.WriteString("                    'state' = if ($neighbor.State) { $neighbor.State } else { 'N/A' }\n")
	script.WriteString("                    'addressFamily' = if ($neighbor.AddressFamily) { $neighbor.AddressFamily } else { 'N/A' }\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("        } catch {\n")
	script.WriteString("            # Error getting ARP table\n")
	script.WriteString("        }\n")
	script.WriteString("        $result['network']['arpTable'] = $arpTable\n")
	script.WriteString("    } catch {\n")
	script.WriteString("        # Error collecting network routing information\n")
	script.WriteString("        if (-not $result['network']['routingTable']) { $result['network']['routingTable'] = @() }\n")
	script.WriteString("        if (-not $result['network']['persistentRoutes']) { $result['network']['persistentRoutes'] = @() }\n")
	script.WriteString("        if (-not $result['network']['arpTable']) { $result['network']['arpTable'] = @() }\n")
	script.WriteString("    }\n\n")

	script.WriteString("    Update-Progress -Step ($currentStep++) -Activity \"Collecting NTP Configuration\" -Status \"Retrieving time synchronization settings\"\n")
	script.WriteString("    # Network Time Protocol (NTP) Configuration\n")
	script.WriteString("    $ntpInfo = @{}\n")
	script.WriteString("    try {\n")
	script.WriteString("        # Windows Time Service Status\n")
	script.WriteString("        $w32timeService = Get-Service -Name 'W32Time' -ErrorAction SilentlyContinue\n")
	script.WriteString("        if ($w32timeService) {\n")
	script.WriteString("            $ntpInfo['serviceStatus'] = $w32timeService.Status.ToString()\n")
	script.WriteString("            $ntpInfo['serviceStartType'] = $w32timeService.StartType.ToString()\n")
	script.WriteString("        } else {\n")
	script.WriteString("            $ntpInfo['serviceStatus'] = 'Not Found'\n")
	script.WriteString("            $ntpInfo['serviceStartType'] = 'N/A'\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        # Get NTP configuration from registry\n")
	script.WriteString("        $ntpRegPath = 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\W32Time\\Parameters'\n")
	script.WriteString("        $ntpTypeRegPath = 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\W32Time\\Parameters'\n")
	script.WriteString("        $ntpPeerRegPath = 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\W32Time\\Parameters'\n")
	script.WriteString("        \n")
	script.WriteString("        # Time source type (NTP, NT5DS, etc.)\n")
	script.WriteString("        $typeValue = (Get-ItemProperty -Path $ntpTypeRegPath -Name 'Type' -ErrorAction SilentlyContinue).Type\n")
	script.WriteString("        if ($typeValue) {\n")
	script.WriteString("            switch ($typeValue) {\n")
	script.WriteString("                'NTP' { $ntpInfo['timeSourceType'] = 'NTP' }\n")
	script.WriteString("                'NT5DS' { $ntpInfo['timeSourceType'] = 'Domain Hierarchy (NT5DS)' }\n")
	script.WriteString("                'NoSync' { $ntpInfo['timeSourceType'] = 'No Sync' }\n")
	script.WriteString("                'AllSync' { $ntpInfo['timeSourceType'] = 'All Sync' }\n")
	script.WriteString("                default { $ntpInfo['timeSourceType'] = \"Unknown ($typeValue)\" }\n")
	script.WriteString("            }\n")
	script.WriteString("        } else {\n")
	script.WriteString("            $ntpInfo['timeSourceType'] = 'N/A'\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        # NTP Server (if configured)\n")
	script.WriteString("        $ntpServer = (Get-ItemProperty -Path $ntpRegPath -Name 'NtpServer' -ErrorAction SilentlyContinue).NtpServer\n")
	script.WriteString("        if ($ntpServer) {\n")
	script.WriteString("            $ntpInfo['ntpServer'] = $ntpServer\n")
	script.WriteString("        } else {\n")
	script.WriteString("            $ntpInfo['ntpServer'] = 'N/A'\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        # Get time synchronization status using w32tm\n")
	script.WriteString("        $syncStatus = 'Unknown'\n")
	script.WriteString("        $lastSyncTime = 'N/A'\n")
	script.WriteString("        $timeSource = 'N/A'\n")
	script.WriteString("        $pollInterval = 'N/A'\n")
	script.WriteString("        $stratum = 'N/A'\n")
	script.WriteString("        try {\n")
	script.WriteString("            $w32tmQuery = w32tm /query /status 2>&1\n")
	script.WriteString("            if ($LASTEXITCODE -eq 0) {\n")
	script.WriteString("                foreach ($line in $w32tmQuery) {\n")
	script.WriteString("                    if ($line -match 'Source:\\s*(.+)') {\n")
	script.WriteString("                        $timeSource = $matches[1].Trim()\n")
	script.WriteString("                    }\n")
	script.WriteString("                    if ($line -match 'Last Successful Sync Time:\\s*(.+)') {\n")
	script.WriteString("                        $lastSyncTime = $matches[1].Trim()\n")
	script.WriteString("                    }\n")
	script.WriteString("                    if ($line -match 'Poll Interval:\\s*(\\d+)') {\n")
	script.WriteString("                        $pollInterval = $matches[1].Trim() + ' seconds'\n")
	script.WriteString("                    }\n")
	script.WriteString("                    if ($line -match 'Stratum:\\s*(\\d+)') {\n")
	script.WriteString("                        $stratum = $matches[1].Trim()\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("                \n")
	script.WriteString("                # Check if synchronized\n")
	script.WriteString("                $w32tmResync = w32tm /resync /nowait 2>&1\n")
	script.WriteString("                if ($LASTEXITCODE -eq 0) {\n")
	script.WriteString("                    $syncStatus = 'Synchronized'\n")
	script.WriteString("                } else {\n")
	script.WriteString("                    $syncStatus = 'Not Synchronized'\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("        } catch {\n")
	script.WriteString("            # w32tm may not be available or accessible\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        $ntpInfo['syncStatus'] = $syncStatus\n")
	script.WriteString("        $ntpInfo['lastSyncTime'] = $lastSyncTime\n")
	script.WriteString("        $ntpInfo['timeSource'] = $timeSource\n")
	script.WriteString("        $ntpInfo['pollInterval'] = $pollInterval\n")
	script.WriteString("        $ntpInfo['stratum'] = $stratum\n")
	script.WriteString("        \n")
	script.WriteString("        # Get NTP peers (if any)\n")
	script.WriteString("        $ntpPeers = @()\n")
	script.WriteString("        try {\n")
	script.WriteString("            $w32tmPeers = w32tm /query /peers 2>&1\n")
	script.WriteString("            if ($LASTEXITCODE -eq 0) {\n")
	script.WriteString("                $currentPeer = $null\n")
	script.WriteString("                foreach ($line in $w32tmPeers) {\n")
	script.WriteString("                    if ($line -match '^#([^:]+):') {\n")
	script.WriteString("                        if ($currentPeer) {\n")
	script.WriteString("                            $ntpPeers += $currentPeer\n")
	script.WriteString("                        }\n")
	script.WriteString("                        $currentPeer = @{ 'peer' = $matches[1].Trim() }\n")
	script.WriteString("                    } elseif ($currentPeer -and $line -match 'Stratum:\\s*(\\d+)') {\n")
	script.WriteString("                        $currentPeer['stratum'] = $matches[1].Trim()\n")
	script.WriteString("                    } elseif ($currentPeer -and $line -match 'Time Source:\\s*(.+)') {\n")
	script.WriteString("                        $currentPeer['timeSource'] = $matches[1].Trim()\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("                if ($currentPeer) {\n")
	script.WriteString("                    $ntpPeers += $currentPeer\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("        } catch {\n")
	script.WriteString("            # Error getting peers\n")
	script.WriteString("        }\n")
	script.WriteString("        $ntpInfo['peers'] = $ntpPeers\n")
	script.WriteString("        \n")
	script.WriteString("    } catch {\n")
	script.WriteString("        $ntpInfo['error'] = $_.Exception.Message\n")
	script.WriteString("    }\n")
	script.WriteString("    $result['ntp'] = $ntpInfo\n\n")

	script.WriteString("    Update-Progress -Step ($currentStep++) -Activity \"Collecting Installed Software\" -Status \"Enumerating installed applications\"\n")
	script.WriteString("    # Installed Software (using Registry - faster and more reliable than Win32_Product)\n")
	script.WriteString("    $installedApps = @()\n")
	script.WriteString("    $uninstallKeys = @(\n")
	script.WriteString("        'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',\n")
	script.WriteString("        'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall'\n")
	script.WriteString("    )\n")
	script.WriteString("    \n")
	script.WriteString("    foreach ($keyPath in $uninstallKeys) {\n")
	script.WriteString("        try {\n")
	script.WriteString("            $apps = Get-ItemProperty -Path \"$keyPath\\*\" -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -and $_.DisplayName -notmatch '^Update for|^Security Update|^Hotfix' }\n")
	script.WriteString("            foreach ($app in $apps) {\n")
	script.WriteString("                $installDate = 'N/A'\n")
	script.WriteString("                if ($app.InstallDate) {\n")
	script.WriteString("                    try {\n")
	script.WriteString("                        $dateStr = $app.InstallDate.ToString()\n")
	script.WriteString("                        if ($dateStr.Length -eq 8) {\n")
	script.WriteString("                            $year = $dateStr.Substring(0, 4)\n")
	script.WriteString("                            $month = $dateStr.Substring(4, 2)\n")
	script.WriteString("                            $day = $dateStr.Substring(6, 2)\n")
	script.WriteString("                            $installDate = \"$year-$month-$day\"\n")
	script.WriteString("                        } else {\n")
	script.WriteString("                            $installDate = $app.InstallDate.ToString('yyyy-MM-dd')\n")
	script.WriteString("                        }\n")
	script.WriteString("                    } catch {\n")
	script.WriteString("                        $installDate = 'N/A'\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("                \n")
	script.WriteString("                # Determine architecture based on registry key path\n")
	script.WriteString("                $architecture = 'N/A'\n")
	script.WriteString("                if ($keyPath -like '*WOW6432Node*') {\n")
	script.WriteString("                    $architecture = '32-bit'\n")
	script.WriteString("                } else {\n")
	script.WriteString("                    $architecture = '64-bit'\n")
	script.WriteString("                }\n")
	script.WriteString("                \n")
	script.WriteString("                $installedApps += @{\n")
	script.WriteString("                    'name' = $app.DisplayName\n")
	script.WriteString("                    'publisher' = if ($app.Publisher) { $app.Publisher } else { 'N/A' }\n")
	script.WriteString("                    'version' = if ($app.DisplayVersion) { $app.DisplayVersion } else { 'N/A' }\n")
	script.WriteString("                    'installDate' = $installDate\n")
	script.WriteString("                    'architecture' = $architecture\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("        } catch {\n")
	script.WriteString("            # Ignore errors when reading registry key\n")
	script.WriteString("        }\n")
	script.WriteString("    }\n")
	script.WriteString("    \n")
	script.WriteString("    # Remove duplicates based on application name and version\n")
	script.WriteString("    $uniqueApps = @{}\n")
	script.WriteString("    $finalApps = @()\n")
	script.WriteString("    foreach ($app in $installedApps) {\n")
	script.WriteString("        $key = \"$($app.name)|$($app.version)\"\n")
	script.WriteString("        if (-not $uniqueApps.ContainsKey($key)) {\n")
	script.WriteString("            $uniqueApps[$key] = $true\n")
	script.WriteString("            $finalApps += $app\n")
	script.WriteString("        }\n")
	script.WriteString("    }\n")
	script.WriteString("    \n")
	script.WriteString("    $result['software'] = @{\n")
	script.WriteString("        'total' = $finalApps.Count\n")
	script.WriteString("        'applications' = $finalApps\n")
	script.WriteString("    }\n\n")
	script.WriteString("    # Detect Update Source (WSUS vs Microsoft Update)\n")
	script.WriteString("    $updateSource = 'Microsoft'\n")
	script.WriteString("    try {\n")
	script.WriteString("        $wuServer = (Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate' -Name 'WUServer' -ErrorAction SilentlyContinue).WUServer\n")
	script.WriteString("        if ($wuServer -and $wuServer.Trim() -ne '') {\n")
	script.WriteString("            $updateSource = 'WSUS'\n")
	script.WriteString("        } else {\n")
	script.WriteString("            # Check UpdateServiceManager\n")
	script.WriteString("            try {\n")
	script.WriteString("                $updateServiceManager = New-Object -ComObject Microsoft.Update.ServiceManager -ErrorAction SilentlyContinue\n")
	script.WriteString("                if ($updateServiceManager) {\n")
	script.WriteString("                    $services = $updateServiceManager.Services\n")
	script.WriteString("                    $hasWSUS = $false\n")
	script.WriteString("                    foreach ($service in $services) {\n")
	script.WriteString("                        if ($service.IsDefaultAUService -and $service.ServiceID -ne '7971f918-a847-4430-9279-4a52d1efe18d') {\n")
	script.WriteString("                            $hasWSUS = $true\n")
	script.WriteString("                            break\n")
	script.WriteString("                        }\n")
	script.WriteString("                    }\n")
	script.WriteString("                    if ($hasWSUS) {\n")
	script.WriteString("                        $updateSource = 'WSUS'\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("            } catch {\n")
	script.WriteString("                # COM object may not be available\n")
	script.WriteString("            }\n")
	script.WriteString("        }\n")
	script.WriteString("    } catch {\n")
	script.WriteString("        # Registry check failed, default to Microsoft\n")
	script.WriteString("    }\n\n")
	script.WriteString("    Update-Progress -Step ($currentStep++) -Activity \"Collecting Windows Updates\" -Status \"Checking installed and missing updates\"\n")
	script.WriteString("    # Windows Updates (Installed)\n")
	script.WriteString("    $installedKBCount = 0\n")
	script.WriteString("    $lastInstalledUpdateDate = 'N/A'\n")
	script.WriteString("    try {\n")
	script.WriteString("        $updates = Get-HotFix -ErrorAction SilentlyContinue | Sort-Object -Property InstalledOn -Descending\n")
	script.WriteString("        $installedKBCount = $updates.Count\n")
	script.WriteString("        if ($updates.Count -gt 0 -and $updates[0].InstalledOn) {\n")
	script.WriteString("            $lastInstalledUpdateDate = $updates[0].InstalledOn.ToString('yyyy-MM-dd')\n")
	script.WriteString("        }\n")
	script.WriteString("        $result['windowsUpdates'] = @($updates | ForEach-Object {\n")
	script.WriteString("            @{\n")
	script.WriteString("                'hotFixID' = [string]$_.HotFixID\n")
	script.WriteString("                'description' = [string]$_.Description\n")
	script.WriteString("                'installedBy' = [string]$_.InstalledBy\n")
	script.WriteString("                'installedOn' = if ($_.InstalledOn) { $_.InstalledOn.ToString('yyyy-MM-dd') } else { 'N/A' }\n")
	script.WriteString("                'updateSource' = $updateSource\n")
	script.WriteString("            }\n")
	script.WriteString("        })\n")
	script.WriteString("    } catch {\n")
	script.WriteString("        $result['windowsUpdates'] = @()\n")
	script.WriteString("    }\n\n")
	script.WriteString("    # Missing Windows Updates (Cumulative only)\n")
	script.WriteString("    $missingCumulativeCount = 0\n")
	script.WriteString("    try {\n")
	script.WriteString("        $updateSession = New-Object -ComObject Microsoft.Update.Session -ErrorAction SilentlyContinue\n")
	script.WriteString("        if ($updateSession) {\n")
	script.WriteString("            $updateSearcher = $updateSession.CreateUpdateSearcher()\n")
	script.WriteString("            $searchResult = $updateSearcher.Search(\"IsInstalled=0 and Type='Software'\")\n")
	script.WriteString("            $missingUpdates = @()\n")
	script.WriteString("            foreach ($update in $searchResult.Updates) {\n")
	script.WriteString("                $title = $update.Title\n")
	script.WriteString("                \n")
	script.WriteString("                # Filter for Cumulative updates only\n")
	script.WriteString("                if ($title -notmatch '(?i)cumulative') {\n")
	script.WriteString("                    continue\n")
	script.WriteString("                }\n")
	script.WriteString("                \n")
	script.WriteString("                $kbNumber = 'N/A'\n")
	script.WriteString("                \n")
	script.WriteString("                # Extract KB number from title\n")
	script.WriteString("                if ($title -match '(?i)\\bKB[\\s-]?(\\d{6,})\\b') {\n")
	script.WriteString("                    $kbNumber = \"KB$($matches[1])\"\n")
	script.WriteString("                } elseif ($title -match '\\b(\\d{6,7})\\b') {\n")
	script.WriteString("                    $potentialKB = $matches[1]\n")
	script.WriteString("                    if ($potentialKB -notmatch '^(19|20)\\d{2}$' -and $potentialKB.Length -ge 6) {\n")
	script.WriteString("                        $kbNumber = \"KB$potentialKB\"\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("                if ($kbNumber -eq 'N/A' -and $update.Identity.UpdateID -match '(?i)KB[\\s-]?(\\d{6,})') {\n")
	script.WriteString("                    $kbNumber = \"KB$($matches[1])\"\n")
	script.WriteString("                }\n")
	script.WriteString("                \n")
	script.WriteString("                $size = 'N/A'\n")
	script.WriteString("                if ($update.MaxDownloadSize -gt 0) {\n")
	script.WriteString("                    $sizeMB = [math]::Round($update.MaxDownloadSize / 1MB, 2)\n")
	script.WriteString("                    $size = \"$sizeMB MB\"\n")
	script.WriteString("                }\n")
	script.WriteString("                \n")
	script.WriteString("                $date = 'N/A'\n")
	script.WriteString("                if ($update.LastDeploymentChangeTime) {\n")
	script.WriteString("                    $date = $update.LastDeploymentChangeTime.ToString('yyyy-MM-dd')\n")
	script.WriteString("                }\n")
	script.WriteString("                \n")
	script.WriteString("                $missingUpdates += @{\n")
	script.WriteString("                    'title' = $title\n")
	script.WriteString("                    'kbNumber' = $kbNumber\n")
	script.WriteString("                    'size' = $size\n")
	script.WriteString("                    'date' = $date\n")
	script.WriteString("                    'updateId' = $update.Identity.UpdateID\n")
	script.WriteString("                    'updateSource' = $updateSource\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("            $missingCumulativeCount = $missingUpdates.Count\n")
	script.WriteString("            $result['missingUpdates'] = $missingUpdates\n")
	script.WriteString("        } else {\n")
	script.WriteString("            $result['missingUpdates'] = @()\n")
	script.WriteString("        }\n")
	script.WriteString("    } catch {\n")
	script.WriteString("        $result['missingUpdates'] = @()\n")
	script.WriteString("    }\n\n")
	script.WriteString("    # Check for pending reboot\n")
	script.WriteString("    $rebootPending = $false\n")
	script.WriteString("    try {\n")
	script.WriteString("        # Check registry for pending reboot\n")
	script.WriteString("        $pendingReboot = Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager' -Name PendingFileRenameOperations -ErrorAction SilentlyContinue\n")
	script.WriteString("        if ($pendingReboot) {\n")
	script.WriteString("            $rebootPending = $true\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        # Check Component Based Servicing (CBS) for pending reboot\n")
	script.WriteString("        $cbsRebootPending = Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Component Based Servicing\\RebootPending' -ErrorAction SilentlyContinue\n")
	script.WriteString("        if ($cbsRebootPending) {\n")
	script.WriteString("            $rebootPending = $true\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        # Check Windows Update for pending reboot\n")
	script.WriteString("        $wuRebootPending = Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WindowsUpdate\\Auto Update\\RebootRequired' -ErrorAction SilentlyContinue\n")
	script.WriteString("        if ($wuRebootPending) {\n")
	script.WriteString("            $rebootPending = $true\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        # Check for pending computer rename\n")
	script.WriteString("        $computerRename = Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\ComputerName\\ComputerName' -Name ComputerName -ErrorAction SilentlyContinue\n")
	script.WriteString("        $pendingComputerName = Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\ComputerName\\ActiveComputerName' -Name ComputerName -ErrorAction SilentlyContinue\n")
	script.WriteString("        if ($computerRename -and $pendingComputerName -and $computerRename.ComputerName -ne $pendingComputerName.ComputerName) {\n")
	script.WriteString("            $rebootPending = $true\n")
	script.WriteString("        }\n")
	script.WriteString("    } catch {}\n\n")
	script.WriteString("    # Windows Updates Summary\n")
	script.WriteString("    $result['windowsUpdatesSummary'] = @{\n")
	script.WriteString("        'installedKBCount' = $installedKBCount\n")
	script.WriteString("        'lastInstalledUpdateDate' = $lastInstalledUpdateDate\n")
	script.WriteString("        'missingCumulativeCount' = $missingCumulativeCount\n")
	script.WriteString("        'rebootPending' = $rebootPending\n")
	script.WriteString("    }\n\n")

	// Local Users Information
	script.WriteString("    Update-Progress -Step ($currentStep++) -Activity \"Collecting Local Users\" -Status \"Enumerating local users and administrators\"\n")
	script.WriteString("    # Local Users Information\n")
	script.WriteString("    $result['localUsersSummary'] = @{}\n")
	script.WriteString("    $result['localUsersSummary']['localUsers'] = @()\n")
	script.WriteString("    $result['localUsersSummary']['administratorsMembers'] = @()\n")
	script.WriteString("    try {\n")
	script.WriteString("        # Get local users\n")
	script.WriteString("        $users = Get-LocalUser -ErrorAction SilentlyContinue\n")
	script.WriteString("        $localUsersCount = 0\n")
	script.WriteString("        $disabledLocalAccountsCount = 0\n")
	script.WriteString("        if ($users) {\n")
	script.WriteString("            $localUsersCount = $users.Count\n")
	script.WriteString("            foreach ($user in $users) {\n")
	script.WriteString("                if (-not $user.Enabled) {\n")
	script.WriteString("                    $disabledLocalAccountsCount++\n")
	script.WriteString("                }\n")
	script.WriteString("                \n")
	script.WriteString("                # Get LastLogon from Win32_UserAccount (more reliable than Get-LocalUser)\n")
	script.WriteString("                $lastLogon = 'Never'\n")
	script.WriteString("                try {\n")
	script.WriteString("                    $win32User = Get-CimInstance -ClassName Win32_UserAccount -Filter \"LocalAccount='True' AND Name='$($user.Name)'\" -ErrorAction SilentlyContinue | Select-Object -First 1\n")
	script.WriteString("                    if ($win32User -and $win32User.LastLogin) {\n")
	script.WriteString("                        $lastLogonDate = [DateTime]::Parse($win32User.LastLogin.ToString())\n")
	script.WriteString("                        if ($lastLogonDate -and $lastLogonDate -ne [DateTime]::MinValue) {\n")
	script.WriteString("                            $lastLogon = $lastLogonDate.ToString('yyyy-MM-dd HH:mm:ss')\n")
	script.WriteString("                        }\n")
	script.WriteString("                    }\n")
	script.WriteString("                } catch {\n")
	script.WriteString("                    # Fallback: try ADSI\n")
	script.WriteString("                    try {\n")
	script.WriteString("                        $computerName = $env:COMPUTERNAME\n")
	script.WriteString("                        $adsiPath = \"WinNT://$computerName/$($user.Name),user\"\n")
	script.WriteString("                        $adsiUser = [ADSI]$adsiPath\n")
	script.WriteString("                        if ($adsiUser -and $adsiUser.LastLogin) {\n")
	script.WriteString("                            $lastLogonValue = $adsiUser.LastLogin\n")
	script.WriteString("                            if ($lastLogonValue -and $lastLogonValue -ne 0) {\n")
	script.WriteString("                                $lastLogonDate = [DateTime]::FromFileTime($lastLogonValue)\n")
	script.WriteString("                                if ($lastLogonDate -and $lastLogonDate -ne [DateTime]::MinValue) {\n")
	script.WriteString("                                    $lastLogon = $lastLogonDate.ToString('yyyy-MM-dd HH:mm:ss')\n")
	script.WriteString("                                }\n")
	script.WriteString("                            }\n")
	script.WriteString("                        }\n")
	script.WriteString("                    } catch {}\n")
	script.WriteString("                }\n")
	script.WriteString("                \n")
	script.WriteString("                $result['localUsersSummary']['localUsers'] += @{\n")
	script.WriteString("                    name = $user.Name\n")
	script.WriteString("                    fullName = $user.FullName\n")
	script.WriteString("                    description = $user.Description\n")
	script.WriteString("                    enabled = $user.Enabled\n")
	script.WriteString("                    passwordExpires = $user.PasswordExpires\n")
	script.WriteString("                    passwordRequired = $user.PasswordRequired\n")
	script.WriteString("                    userMayChangePassword = $user.UserMayChangePassword\n")
	script.WriteString("                    lastLogon = $lastLogon\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("        }\n")
	script.WriteString("        $result['localUsersSummary']['localUsersCount'] = $localUsersCount\n")
	script.WriteString("        $result['localUsersSummary']['disabledLocalAccountsCount'] = $disabledLocalAccountsCount\n")
	script.WriteString("    } catch {\n")
	script.WriteString("        $result['localUsersSummary']['localUsersCount'] = 0\n")
	script.WriteString("        $result['localUsersSummary']['disabledLocalAccountsCount'] = 0\n")
	script.WriteString("    }\n")
	script.WriteString("    \n")
	script.WriteString("    # Get all Groups (Local and Domain) and their members\n")
	script.WriteString("    $result['localGroups'] = @()\n")
	script.WriteString("    $allGroupsHash = @{}\n")
	script.WriteString("    try {\n")
	script.WriteString("        # Method 1: Get Local Groups\n")
	script.WriteString("        try {\n")
	script.WriteString("            $localGroups = Get-LocalGroup -ErrorAction SilentlyContinue\n")
	script.WriteString("            foreach ($group in $localGroups) {\n")
	script.WriteString("                $groupKey = $group.SID.Value\n")
	script.WriteString("                if (-not $allGroupsHash.ContainsKey($groupKey)) {\n")
	script.WriteString("                    $allGroupsHash[$groupKey] = @{\n")
	script.WriteString("                        'name' = $group.Name\n")
	script.WriteString("                        'description' = $group.Description\n")
	script.WriteString("                        'sid' = $group.SID.Value\n")
	script.WriteString("                        'isLocal' = $true\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("        } catch {}\n")
	script.WriteString("        \n")
	script.WriteString("        # Method 2: Get all Groups (including Domain groups) using WMI\n")
	script.WriteString("        try {\n")
	script.WriteString("            $wmiGroups = Get-CimInstance -ClassName Win32_Group -ErrorAction SilentlyContinue\n")
	script.WriteString("            foreach ($group in $wmiGroups) {\n")
	script.WriteString("                $groupKey = $group.SID\n")
	script.WriteString("                if (-not $allGroupsHash.ContainsKey($groupKey)) {\n")
	script.WriteString("                    $allGroupsHash[$groupKey] = @{\n")
	script.WriteString("                        'name' = $group.Name\n")
	script.WriteString("                        'description' = if ($group.Description) { $group.Description } else { '' }\n")
	script.WriteString("                        'sid' = $group.SID\n")
	script.WriteString("                        'isLocal' = $group.LocalAccount\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("        } catch {}\n")
	script.WriteString("        \n")
	script.WriteString("        # Now get members for each group using Win32_GroupUser (most reliable method)\n")
	script.WriteString("        foreach ($groupKey in $allGroupsHash.Keys) {\n")
	script.WriteString("            $group = $allGroupsHash[$groupKey]\n")
	script.WriteString("            $members = @()\n")
	script.WriteString("            $membersHash = @{}\n")
	script.WriteString("            \n")
	script.WriteString("            # Method 1: Use Win32_GroupUser with WQL query (works for all group types)\n")
	script.WriteString("            try {\n")
	script.WriteString("                # Get group by SID first\n")
	script.WriteString("                $wmiGroup = Get-CimInstance -Query \"SELECT * FROM Win32_Group WHERE SID='$($group.sid)'\" -ErrorAction SilentlyContinue | Select-Object -First 1\n")
	script.WriteString("                if ($wmiGroup) {\n")
	script.WriteString("                    # Use ASSOCIATORS query to get all users in this group\n")
	script.WriteString("                    $groupUsers = Get-CimInstance -Query \"ASSOCIATORS OF {Win32_Group.SID='$($group.sid)'} WHERE AssocClass=Win32_GroupUser\" -ErrorAction SilentlyContinue\n")
	script.WriteString("                    if ($groupUsers) {\n")
	script.WriteString("                        foreach ($user in $groupUsers) {\n")
	script.WriteString("                            $memberName = $null\n")
	script.WriteString("                            \n")
	script.WriteString("                            # Check if it's a user account\n")
	script.WriteString("                            if ($user.CimClass.CimClassName -eq 'Win32_UserAccount') {\n")
	script.WriteString("                                if ($user.Domain -and $user.Name) {\n")
	script.WriteString("                                    $memberName = \"$($user.Domain)\\\\$($user.Name)\"\n")
	script.WriteString("                                } elseif ($user.Name) {\n")
	script.WriteString("                                    $memberName = $user.Name\n")
	script.WriteString("                                }\n")
	script.WriteString("                            }\n")
	script.WriteString("                            # Check if it's a group (nested group)\n")
	script.WriteString("                            elseif ($user.CimClass.CimClassName -eq 'Win32_Group') {\n")
	script.WriteString("                                if ($user.Domain -and $user.Name) {\n")
	script.WriteString("                                    $memberName = \"$($user.Domain)\\\\$($user.Name) (Group)\"\n")
	script.WriteString("                                } elseif ($user.Name) {\n")
	script.WriteString("                                    $memberName = \"$($user.Name) (Group)\"\n")
	script.WriteString("                                }\n")
	script.WriteString("                            }\n")
	script.WriteString("                            \n")
	script.WriteString("                            if ($memberName -and -not $membersHash.ContainsKey($memberName)) {\n")
	script.WriteString("                                $membersHash[$memberName] = $true\n")
	script.WriteString("                                $members += [string]$memberName\n")
	script.WriteString("                            }\n")
	script.WriteString("                        }\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("            } catch {}\n")
	script.WriteString("            \n")
	script.WriteString("            # Method 2: Fallback to Get-LocalGroupMember for local groups\n")
	script.WriteString("            if ($members.Count -eq 0 -and $group.isLocal) {\n")
	script.WriteString("                try {\n")
	script.WriteString("                    $groupMembers = Get-LocalGroupMember -Group $group.name -ErrorAction SilentlyContinue\n")
	script.WriteString("                    if ($groupMembers) {\n")
	script.WriteString("                        foreach ($gm in $groupMembers) {\n")
	script.WriteString("                            $memberName = $null\n")
	script.WriteString("                            \n")
	script.WriteString("                            if ($gm.Principal -and $gm.Principal.Value) {\n")
	script.WriteString("                                $memberName = $gm.Principal.Value\n")
	script.WriteString("                            } elseif ($gm.Name) {\n")
	script.WriteString("                                $memberName = $gm.Name\n")
	script.WriteString("                            } elseif ($gm.Domain -and $gm.Name) {\n")
	script.WriteString("                                $memberName = \"$($gm.Domain)\\\\$($gm.Name)\"\n")
	script.WriteString("                            }\n")
	script.WriteString("                            \n")
	script.WriteString("                            if ($memberName -and -not $membersHash.ContainsKey($memberName)) {\n")
	script.WriteString("                                $membersHash[$memberName] = $true\n")
	script.WriteString("                                $members += [string]$memberName\n")
	script.WriteString("                            }\n")
	script.WriteString("                        }\n")
	script.WriteString("                    }\n")
	script.WriteString("                } catch {}\n")
	script.WriteString("            }\n")
	script.WriteString("            \n")
	script.WriteString("            # Method 3: Fallback to Get-ADGroupMember for domain groups if module available\n")
	script.WriteString("            if ($members.Count -eq 0 -and -not $group.isLocal) {\n")
	script.WriteString("                try {\n")
	script.WriteString("                    if (Get-Module -ListAvailable -Name ActiveDirectory) {\n")
	script.WriteString("                        Import-Module ActiveDirectory -ErrorAction SilentlyContinue\n")
	script.WriteString("                        $adMembers = Get-ADGroupMember -Identity $group.name -ErrorAction SilentlyContinue\n")
	script.WriteString("                        if ($adMembers) {\n")
	script.WriteString("                            foreach ($adMember in $adMembers) {\n")
	script.WriteString("                                $memberName = $null\n")
	script.WriteString("                                if ($adMember.SamAccountName) {\n")
	script.WriteString("                                    $domainName = $env:USERDOMAIN\n")
	script.WriteString("                                    $memberName = \"$domainName\\$($adMember.SamAccountName)\"\n")
	script.WriteString("                                } elseif ($adMember.Name) {\n")
	script.WriteString("                                    $domainName = $env:USERDOMAIN\n")
	script.WriteString("                                    $memberName = \"$domainName\\$($adMember.Name)\"\n")
	script.WriteString("                                }\n")
	script.WriteString("                                if ($memberName -and -not $membersHash.ContainsKey($memberName)) {\n")
	script.WriteString("                                    $membersHash[$memberName] = $true\n")
	script.WriteString("                                    $members += [string]$memberName\n")
	script.WriteString("                                }\n")
	script.WriteString("                            }\n")
	script.WriteString("                        }\n")
	script.WriteString("                    }\n")
	script.WriteString("                } catch {}\n")
	script.WriteString("            }\n")
	script.WriteString("            \n")
	script.WriteString("            $result['localGroups'] += @{\n")
	script.WriteString("                'name' = $group.name\n")
	script.WriteString("                'description' = $group.description\n")
	script.WriteString("                'sid' = $group.sid\n")
	script.WriteString("                'members' = $members\n")
	script.WriteString("                'memberCount' = $members.Count\n")
	script.WriteString("            }\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        # Extract Administrators group members (SID: S-1-5-32-544) for backward compatibility\n")
	script.WriteString("        $adminGroup = $result['localGroups'] | Where-Object { $_.sid -eq 'S-1-5-32-544' } | Select-Object -First 1\n")
	script.WriteString("        if ($adminGroup) {\n")
	script.WriteString("            $result['localUsersSummary']['administratorsMembers'] = $adminGroup.members\n")
	script.WriteString("        }\n")
	script.WriteString("    } catch {}\n\n")

	// Environment Variables & Paths (Light)
	script.WriteString("    Update-Progress -Step ($currentStep++) -Activity \"Analyzing Environment Variables & PATH\" -Status \"Checking PATH configuration and environment variables\"\n")
	script.WriteString("    # Environment Variables & Paths (Light)\n")
	script.WriteString("    try {\n")
	script.WriteString("        # Get System PATH\n")
	script.WriteString("        $systemPath = [Environment]::GetEnvironmentVariable('Path', 'Machine')\n")
	script.WriteString("        $systemPathLength = 0\n")
	script.WriteString("        $systemPathEntriesCount = 0\n")
	script.WriteString("        $hasDuplicatePathEntries = $false\n")
	script.WriteString("        $hasEmptyPathEntries = $false\n")
	script.WriteString("        $hasRelativePathEntries = $false\n")
	script.WriteString("        $hasUncPaths = $false\n")
	script.WriteString("        $hasNonExistentPathEntries = $false\n")
	script.WriteString("        $hasTrailingSpaces = $false\n")
	script.WriteString("        $hasInvalidChars = $false\n")
	script.WriteString("        $hasRootDrivePaths = $false\n")
	script.WriteString("        $hasTempInPath = $false\n")
	script.WriteString("        $system32FirstInPath = $false\n")
	script.WriteString("        $userPathPrecedesSystemPath = $false\n")
	script.WriteString("        $executableShadowingRisk = $false\n")
	script.WriteString("        $shadowingExample = $null\n")
	script.WriteString("        $systemPathAnalysis = @()\n")
	script.WriteString("        $userPathAnalysis = @()\n")
	script.WriteString("        $findingsCritical = @()\n")
	script.WriteString("        $findingsWarning = @()\n")
	script.WriteString("        $findingsInfo = @()\n")
	script.WriteString("        \n")
	script.WriteString("        # Helper function to check if non-admin can write\n")
	script.WriteString("        function Test-NonAdminWriteAccess {\n")
	script.WriteString("            param($path)\n")
	script.WriteString("            try {\n")
	script.WriteString("                if (-not (Test-Path -Path $path -PathType Container)) { return $false }\n")
	script.WriteString("                $acl = Get-Acl -Path $path -ErrorAction SilentlyContinue\n")
	script.WriteString("                if (-not $acl) { return $false }\n")
	script.WriteString("                foreach ($rule in $acl.Access) {\n")
	script.WriteString("                    if ($rule.IdentityReference -eq 'BUILTIN\\Users' -or $rule.IdentityReference -eq 'Everyone' -or $rule.IdentityReference -eq 'NT AUTHORITY\\Authenticated Users') {\n")
	script.WriteString("                        if (($rule.FileSystemRights -band 'Write') -eq 'Write' -or ($rule.FileSystemRights -band 'Modify') -eq 'Modify' -or ($rule.FileSystemRights -band 'FullControl') -eq 'FullControl') {\n")
	script.WriteString("                            return $true\n")
	script.WriteString("                        }\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("                return $false\n")
	script.WriteString("            } catch {\n")
	script.WriteString("                return $false\n")
	script.WriteString("            }\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        if ($systemPath) {\n")
	script.WriteString("            $systemPathLength = $systemPath.Length\n")
	script.WriteString("            $allSystemEntries = $systemPath -split ';'\n")
	script.WriteString("            $systemPathEntries = $allSystemEntries | Where-Object { $_.Trim() -ne '' }\n")
	script.WriteString("            $systemPathEntriesCount = $systemPathEntries.Count\n")
	script.WriteString("            \n")
	script.WriteString("            # Check for empty entries\n")
	script.WriteString("            if ($allSystemEntries.Count -gt $systemPathEntries.Count) {\n")
	script.WriteString("                $hasEmptyPathEntries = $true\n")
	script.WriteString("            }\n")
	script.WriteString("            \n")
	script.WriteString("            # Check for duplicates\n")
	script.WriteString("            $uniqueEntries = $systemPathEntries | Select-Object -Unique\n")
	script.WriteString("            if ($systemPathEntries.Count -ne $uniqueEntries.Count) {\n")
	script.WriteString("                $hasDuplicatePathEntries = $true\n")
	script.WriteString("            }\n")
	script.WriteString("            \n")
	script.WriteString("            # Check if System32 is first\n")
	script.WriteString("            if ($systemPathEntries.Count -gt 0) {\n")
	script.WriteString("                $firstEntry = $systemPathEntries[0]\n")
	script.WriteString("                if ($firstEntry -like '*System32*') {\n")
	script.WriteString("                    $system32FirstInPath = $true\n")
	script.WriteString("                } else {\n")
	script.WriteString("                    $findingsWarning += 'System32 is not the first PATH entry'\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("            \n")
	script.WriteString("            # Analyze each System PATH entry\n")
	script.WriteString("            $index = 1\n")
	script.WriteString("            foreach ($entry in $systemPathEntries) {\n")
	script.WriteString("                $originalEntry = $entry\n")
	script.WriteString("                $entry = $entry.Trim()\n")
	script.WriteString("                \n")
	script.WriteString("                # Check for trailing spaces\n")
	script.WriteString("                if ($originalEntry -ne $entry) {\n")
	script.WriteString("                    $hasTrailingSpaces = $true\n")
	script.WriteString("                }\n")
	script.WriteString("                \n")
	script.WriteString("                # Check for relative paths\n")
	script.WriteString("                if ($entry -match '^\\.') {\n")
	script.WriteString("                    $hasRelativePathEntries = $true\n")
	script.WriteString("                }\n")
	script.WriteString("                \n")
	script.WriteString("                # Check for root drive paths (C:\\)\n")
	script.WriteString("                if ($entry -match '^[A-Z]:\\\\$') {\n")
	script.WriteString("                    $hasRootDrivePaths = $true\n")
	script.WriteString("                }\n")
	script.WriteString("                \n")
	script.WriteString("                # Check for invalid characters\n")
	script.WriteString("                if ($entry -match '[<>|\"]') {\n")
	script.WriteString("                    $hasInvalidChars = $true\n")
	script.WriteString("                }\n")
	script.WriteString("                \n")
	script.WriteString("                # Check for TEMP in PATH\n")
	script.WriteString("                if ($entry -like '*Temp*' -or $entry -like '*tmp*' -or $entry -like '*TEMP*') {\n")
	script.WriteString("                    $hasTempInPath = $true\n")
	script.WriteString("                }\n")
	script.WriteString("                \n")
	script.WriteString("                $status = 'OK'\n")
	script.WriteString("                $statusText = 'OK'\n")
	script.WriteString("                $exists = $false\n")
	script.WriteString("                $writableByNonAdmins = $false\n")
	script.WriteString("                $isUncPath = $false\n")
	script.WriteString("                $flags = @()\n")
	script.WriteString("                \n")
	script.WriteString("                # Check if UNC path\n")
	script.WriteString("                if ($entry -match '^\\\\\\\\') {\n")
	script.WriteString("                    $hasUncPaths = $true\n")
	script.WriteString("                    $isUncPath = $true\n")
	script.WriteString("                    $status = 'Warning'\n")
	script.WriteString("                    $statusText = '⚠️ Warning'\n")
	script.WriteString("                    $flags += 'UNC path in PATH'\n")
	script.WriteString("                    if ('UNC path detected in PATH' -notin $findingsWarning) {\n")
	script.WriteString("                        $findingsWarning += 'UNC path detected in PATH'\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("                \n")
	script.WriteString("                # Check if exists\n")
	script.WriteString("                if (Test-Path -Path $entry -PathType Container) {\n")
	script.WriteString("                    $exists = $true\n")
	script.WriteString("                    \n")
	script.WriteString("                    # Check writability\n")
	script.WriteString("                    $writableByNonAdmins = Test-NonAdminWriteAccess -path $entry\n")
	script.WriteString("                    \n")
	script.WriteString("                    # Check if temp directory and writable (critical)\n")
	script.WriteString("                    if ($writableByNonAdmins -and ($entry -like '*Temp*' -or $entry -like '*tmp*' -or $entry -like '*TEMP*')) {\n")
	script.WriteString("                        $status = 'Critical'\n")
	script.WriteString("                        $statusText = '❌ Critical'\n")
	script.WriteString("                        $flags += 'Writable directory in PATH'\n")
	script.WriteString("                        $flags += 'TEMP directory present in PATH'\n")
	script.WriteString("                        $criticalMsg = \"Writable TEMP directory detected in PATH ($entry)\"\n")
	script.WriteString("                        if ($criticalMsg -notin $findingsCritical) {\n")
	script.WriteString("                            $findingsCritical += $criticalMsg\n")
	script.WriteString("                        }\n")
	script.WriteString("                    } elseif ($writableByNonAdmins) {\n")
	script.WriteString("                        $flags += 'Writable directory in PATH'\n")
	script.WriteString("                    }\n")
	script.WriteString("                } else {\n")
	script.WriteString("                    $hasNonExistentPathEntries = $true\n")
	script.WriteString("                    $flags += 'Non-existent directory'\n")
	script.WriteString("                }\n")
	script.WriteString("                \n")
	script.WriteString("                $systemPathAnalysis += @{\n")
	script.WriteString("                    index = $index\n")
	script.WriteString("                    path = $entry\n")
	script.WriteString("                    status = $status\n")
	script.WriteString("                    statusText = $statusText\n")
	script.WriteString("                    exists = $exists\n")
	script.WriteString("                    writableByNonAdmins = $writableByNonAdmins\n")
	script.WriteString("                    isUncPath = $isUncPath\n")
	script.WriteString("                    flags = $flags\n")
	script.WriteString("                }\n")
	script.WriteString("                $index++\n")
	script.WriteString("            }\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        # Get TEMP directory location and details\n")
	script.WriteString("        $tempDir = [Environment]::GetEnvironmentVariable('TEMP', 'Machine')\n")
	script.WriteString("        if (-not $tempDir) {\n")
	script.WriteString("            $tempDir = [Environment]::GetEnvironmentVariable('TEMP', 'User')\n")
	script.WriteString("        }\n")
	script.WriteString("        if (-not $tempDir) {\n")
	script.WriteString("            $tempDir = $env:TEMP\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        # Get TEMP directory free space\n")
	script.WriteString("        $tempFreeSpace = 'N/A'\n")
	script.WriteString("        $tempPermissions = 'Unknown'\n")
	script.WriteString("        $tempCleanupRecommended = $false\n")
	script.WriteString("        \n")
	script.WriteString("        if ($tempDir -and (Test-Path -Path $tempDir -PathType Container)) {\n")
	script.WriteString("            try {\n")
	script.WriteString("                # Get free space\n")
	script.WriteString("                $tempDrive = Split-Path -Qualifier $tempDir\n")
	script.WriteString("                $disk = Get-CimInstance -ClassName Win32_LogicalDisk -Filter \"DeviceID='$tempDrive'\" -ErrorAction SilentlyContinue\n")
	script.WriteString("                if ($disk) {\n")
	script.WriteString("                    $freeSpaceGB = [math]::Round($disk.FreeSpace / 1GB, 2)\n")
	script.WriteString("                    $tempFreeSpace = \"$freeSpaceGB GB\"\n")
	script.WriteString("                }\n")
	script.WriteString("                \n")
	script.WriteString("                # Check permissions\n")
	script.WriteString("                try {\n")
	script.WriteString("                    $acl = Get-Acl -Path $tempDir -ErrorAction SilentlyContinue\n")
	script.WriteString("                    $isRestricted = $true\n")
	script.WriteString("                    foreach ($rule in $acl.Access) {\n")
	script.WriteString("                        if ($rule.IdentityReference -eq 'BUILTIN\\Users' -or $rule.IdentityReference -eq 'Everyone') {\n")
	script.WriteString("                            if (($rule.FileSystemRights -band 'Write') -eq 'Write' -or ($rule.FileSystemRights -band 'Modify') -eq 'Modify') {\n")
	script.WriteString("                                $isRestricted = $false\n")
	script.WriteString("                                break\n")
	script.WriteString("                            }\n")
	script.WriteString("                        }\n")
	script.WriteString("                    }\n")
	script.WriteString("                    $tempPermissions = if ($isRestricted) { 'Restricted' } else { 'Writable' }\n")
	script.WriteString("                } catch {\n")
	script.WriteString("                    $tempPermissions = 'Unknown'\n")
	script.WriteString("                }\n")
	script.WriteString("                \n")
	script.WriteString("                # Check if cleanup is recommended (if temp directory has many files or is large)\n")
	script.WriteString("                try {\n")
	script.WriteString("                    $tempFiles = Get-ChildItem -Path $tempDir -Recurse -ErrorAction SilentlyContinue | Measure-Object\n")
	script.WriteString("                    if ($tempFiles.Count -gt 1000) {\n")
	script.WriteString("                        $tempCleanupRecommended = $true\n")
	script.WriteString("                    }\n")
	script.WriteString("                } catch {\n")
	script.WriteString("                    # If we can't check, assume cleanup might be needed\n")
	script.WriteString("                    $tempCleanupRecommended = $true\n")
	script.WriteString("                }\n")
	script.WriteString("            } catch {}\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        # Get System drive temp space\n")
	script.WriteString("        $systemDriveTempSpace = 'N/A'\n")
	script.WriteString("        try {\n")
	script.WriteString("            $systemDrive = $env:SystemDrive\n")
	script.WriteString("            if ($systemDrive) {\n")
	script.WriteString("                $drive = Get-PSDrive -Name ($systemDrive -replace ':', '') -ErrorAction SilentlyContinue\n")
	script.WriteString("                if ($drive) {\n")
	script.WriteString("                    $freeSpaceGB = [math]::Round($drive.Free / 1GB, 2)\n")
	script.WriteString("                    $systemDriveTempSpace = \"$freeSpaceGB GB\"\n")
	script.WriteString("                } else {\n")
	script.WriteString("                    # Fallback: Use Get-CimInstance\n")
	script.WriteString("                    $disk = Get-CimInstance -ClassName Win32_LogicalDisk -Filter \"DeviceID='$systemDrive'\" -ErrorAction SilentlyContinue\n")
	script.WriteString("                    if ($disk) {\n")
	script.WriteString("                        $freeSpaceGB = [math]::Round($disk.FreeSpace / 1GB, 2)\n")
	script.WriteString("                        $systemDriveTempSpace = \"$freeSpaceGB GB\"\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("        } catch {}\n")
	script.WriteString("        \n")
	script.WriteString("        # Analyze User PATH\n")
	script.WriteString("        $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')\n")
	script.WriteString("        if ($userPath) {\n")
	script.WriteString("            $userPathEntries = ($userPath -split ';') | Where-Object { $_.Trim() -ne '' }\n")
	script.WriteString("            $userPathEntriesCount = $userPathEntries.Count\n")
	script.WriteString("            \n")
	script.WriteString("            # Check for executable shadowing risk\n")
	script.WriteString("            # Note: In Windows, System PATH is always searched before User PATH\n")
	script.WriteString("            # So User PATH never actually precedes System PATH in search order\n")
	script.WriteString("            # However, we check for potential shadowing scenarios where same executables exist in both\n")
	script.WriteString("            $userPathPrecedesSystemPath = $false\n")
	script.WriteString("            \n")
	script.WriteString("            if ($userPathEntriesCount -gt 0 -and $systemPathEntriesCount -gt 0) {\n")
	script.WriteString("                # Check for executable shadowing risk (same exe names in both paths)\n")
	script.WriteString("                foreach ($userEntry in $userPathEntries) {\n")
	script.WriteString("                    if (Test-Path -Path $userEntry -PathType Container) {\n")
	script.WriteString("                        $commonExes = @('python.exe', 'node.exe', 'git.exe', 'java.exe', 'npm.exe', 'pip.exe')\n")
	script.WriteString("                        foreach ($exe in $commonExes) {\n")
	script.WriteString("                            $userExePath = Join-Path $userEntry $exe\n")
	script.WriteString("                            if (Test-Path -Path $userExePath) {\n")
	script.WriteString("                                foreach ($sysEntry in $systemPathEntries) {\n")
	script.WriteString("                                    if (Test-Path -Path $sysEntry -PathType Container) {\n")
	script.WriteString("                                        $sysExePath = Join-Path $sysEntry $exe\n")
	script.WriteString("                                        if (Test-Path -Path $sysExePath) {\n")
	script.WriteString("                                            $executableShadowingRisk = $true\n")
	script.WriteString("                                            $shadowingExample = @{\n")
	script.WriteString("                                                shadowing = $userExePath\n")
	script.WriteString("                                                shadowed = $sysExePath\n")
	script.WriteString("                                            }\n")
	script.WriteString("                                            break\n")
	script.WriteString("                                        }\n")
	script.WriteString("                                    }\n")
	script.WriteString("                                }\n")
	script.WriteString("                                if ($shadowingExample) { break }\n")
	script.WriteString("                            }\n")
	script.WriteString("                        }\n")
	script.WriteString("                        if ($shadowingExample) { break }\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("                \n")
	script.WriteString("                if ($executableShadowingRisk) {\n")
	script.WriteString("                    $findingsWarning += 'Executable shadowing risk detected (same executables in both System and User PATH)'\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("            \n")
	script.WriteString("            # Analyze each User PATH entry\n")
	script.WriteString("            $index = 1\n")
	script.WriteString("            foreach ($entry in $userPathEntries) {\n")
	script.WriteString("                $entry = $entry.Trim()\n")
	script.WriteString("                $status = 'OK'\n")
	script.WriteString("                $statusText = 'OK'\n")
	script.WriteString("                $exists = $false\n")
	script.WriteString("                $writableByUser = $false\n")
	script.WriteString("                $flags = @()\n")
	script.WriteString("                \n")
	script.WriteString("                if (Test-Path -Path $entry -PathType Container) {\n")
	script.WriteString("                    $exists = $true\n")
	script.WriteString("                    $writableByUser = Test-NonAdminWriteAccess -path $entry\n")
	script.WriteString("                    \n")
	script.WriteString("                    if ($writableByUser) {\n")
	script.WriteString("                        $status = 'Warning'\n")
	script.WriteString("                        $statusText = '⚠️ Warning'\n")
	script.WriteString("                        $flags += 'User-writable directory'\n")
	script.WriteString("                        $flags += 'User PATH entry'\n")
	script.WriteString("                        if ('User-writable directory present in User PATH' -notin $findingsWarning) {\n")
	script.WriteString("                            $findingsWarning += 'User-writable directory present in User PATH'\n")
	script.WriteString("                        }\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("                \n")
	script.WriteString("                $userPathAnalysis += @{\n")
	script.WriteString("                    index = $index\n")
	script.WriteString("                    path = $entry\n")
	script.WriteString("                    status = $status\n")
	script.WriteString("                    statusText = $statusText\n")
	script.WriteString("                    exists = $exists\n")
	script.WriteString("                    writableByUser = $writableByUser\n")
	script.WriteString("                    flags = $flags\n")
	script.WriteString("                }\n")
	script.WriteString("                $index++\n")
	script.WriteString("            }\n")
	script.WriteString("        } else {\n")
	script.WriteString("            $userPathEntriesCount = 0\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        # Get TEMP & TMP directories\n")
	script.WriteString("        $tmpDir = [Environment]::GetEnvironmentVariable('TMP', 'Machine')\n")
	script.WriteString("        if (-not $tmpDir) {\n")
	script.WriteString("            $tmpDir = [Environment]::GetEnvironmentVariable('TMP', 'User')\n")
	script.WriteString("        }\n")
	script.WriteString("        if (-not $tmpDir) {\n")
	script.WriteString("            $tmpDir = $env:TMP\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        $tempTmpMatch = ($tempDir -eq $tmpDir)\n")
	script.WriteString("        $tempOnSystemDrive = $false\n")
	script.WriteString("        $tempOnNetworkShare = $false\n")
	script.WriteString("        if ($tempDir) {\n")
	script.WriteString("            if ($tempDir -match '^[A-Z]:\\\\') {\n")
	script.WriteString("                $tempOnSystemDrive = $true\n")
	script.WriteString("            } elseif ($tempDir -match '^\\\\\\\\') {\n")
	script.WriteString("                $tempOnNetworkShare = $true\n")
	script.WriteString("            }\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        # Update TEMP directory details\n")
	script.WriteString("        $tempFreeSpaceGB = 0\n")
	script.WriteString("        $tempFreeSpacePercent = 0\n")
	script.WriteString("        $tempFileCount = 0\n")
	script.WriteString("        $tempOldestFileAge = 0\n")
	script.WriteString("        $tempWritableByEveryone = $false\n")
	script.WriteString("        \n")
	script.WriteString("        if ($tempDir -and (Test-Path -Path $tempDir -PathType Container)) {\n")
	script.WriteString("            try {\n")
	script.WriteString("                # Get free space with percentage\n")
	script.WriteString("                $tempDrive = Split-Path -Qualifier $tempDir\n")
	script.WriteString("                $disk = Get-CimInstance -ClassName Win32_LogicalDisk -Filter \"DeviceID='$tempDrive'\" -ErrorAction SilentlyContinue\n")
	script.WriteString("                if ($disk) {\n")
	script.WriteString("                    $freeSpaceGB = [math]::Round($disk.FreeSpace / 1GB, 2)\n")
	script.WriteString("                    $totalSpaceGB = [math]::Round($disk.Size / 1GB, 2)\n")
	script.WriteString("                    $tempFreeSpaceGB = $freeSpaceGB\n")
	script.WriteString("                    $tempFreeSpacePercent = [math]::Round(($freeSpaceGB / $totalSpaceGB) * 100, 1)\n")
	script.WriteString("                    $tempFreeSpace = \"$freeSpaceGB GB ($tempFreeSpacePercent%)\"\n")
	script.WriteString("                }\n")
	script.WriteString("                \n")
	script.WriteString("                # Get file count and oldest file age\n")
	script.WriteString("                try {\n")
	script.WriteString("                    $tempFiles = Get-ChildItem -Path $tempDir -File -Recurse -ErrorAction SilentlyContinue\n")
	script.WriteString("                    $tempFileCount = $tempFiles.Count\n")
	script.WriteString("                    if ($tempFileCount -gt 0) {\n")
	script.WriteString("                        $oldestFile = $tempFiles | Sort-Object LastWriteTime | Select-Object -First 1\n")
	script.WriteString("                        $oldestFileAge = (Get-Date) - $oldestFile.LastWriteTime\n")
	script.WriteString("                        $tempOldestFileAge = [math]::Round($oldestFileAge.TotalDays, 0)\n")
	script.WriteString("                        \n")
	script.WriteString("                        if ($tempOldestFileAge -gt 90) {\n")
	script.WriteString("                            $tempCleanupRecommended = $true\n")
	script.WriteString("                            $findingsInfo += 'TEMP directory contains files older than 90 days'\n")
	script.WriteString("                        }\n")
	script.WriteString("                    }\n")
	script.WriteString("                } catch {}\n")
	script.WriteString("                \n")
	script.WriteString("                # Check if writable by everyone\n")
	script.WriteString("                try {\n")
	script.WriteString("                    $acl = Get-Acl -Path $tempDir -ErrorAction SilentlyContinue\n")
	script.WriteString("                    foreach ($rule in $acl.Access) {\n")
	script.WriteString("                        if ($rule.IdentityReference.Value -eq 'Everyone') {\n")
	script.WriteString("                            if ($rule.FileSystemRights -match 'Write|Modify|FullControl') {\n")
	script.WriteString("                                $tempWritableByEveryone = $true\n")
	script.WriteString("                                break\n")
	script.WriteString("                            }\n")
	script.WriteString("                        }\n")
	script.WriteString("                    }\n")
	script.WriteString("                } catch {}\n")
	script.WriteString("                \n")
	script.WriteString("                # Check cleanup recommendation\n")
	script.WriteString("                if ($tempFileCount -gt 1000 -or $tempOldestFileAge -gt 90) {\n")
	script.WriteString("                    $tempCleanupRecommended = $true\n")
	script.WriteString("                }\n")
	script.WriteString("            } catch {}\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        # Get Environment Variables (High-Level)\n")
	script.WriteString("        $totalSystemVariables = 0\n")
	script.WriteString("        $totalUserVariables = 0\n")
	script.WriteString("        $systemVariablesList = @()\n")
	script.WriteString("        $userVariablesList = @()\n")
	script.WriteString("        try {\n")
	script.WriteString("            $systemVars = [Environment]::GetEnvironmentVariables('Machine')\n")
	script.WriteString("            $totalSystemVariables = $systemVars.Count\n")
	script.WriteString("            foreach ($key in $systemVars.Keys) {\n")
	script.WriteString("                $value = $systemVars[$key]\n")
	script.WriteString("                # Truncate very long values for display\n")
	script.WriteString("                if ($value.Length -gt 200) {\n")
	script.WriteString("                    $value = $value.Substring(0, 200) + '...'\n")
	script.WriteString("                }\n")
	script.WriteString("                $systemVariablesList += @{\n")
	script.WriteString("                    name = $key\n")
	script.WriteString("                    value = $value\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("            \n")
	script.WriteString("            $userVars = [Environment]::GetEnvironmentVariables('User')\n")
	script.WriteString("            $totalUserVariables = $userVars.Count\n")
	script.WriteString("            foreach ($key in $userVars.Keys) {\n")
	script.WriteString("                $value = $userVars[$key]\n")
	script.WriteString("                # Truncate very long values for display\n")
	script.WriteString("                if ($value.Length -gt 200) {\n")
	script.WriteString("                    $value = $value.Substring(0, 200) + '...'\n")
	script.WriteString("                }\n")
	script.WriteString("                $userVariablesList += @{\n")
	script.WriteString("                    name = $key\n")
	script.WriteString("                    value = $value\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("        } catch {}\n")
	script.WriteString("        \n")
	script.WriteString("        # Calculate overall PATH health\n")
	script.WriteString("        $overallPathHealth = '✅ Healthy'\n")
	script.WriteString("        if ($findingsCritical.Count -gt 0) {\n")
	script.WriteString("            $overallPathHealth = '❌ Critical Issues'\n")
	script.WriteString("        } elseif ($findingsWarning.Count -gt 0) {\n")
	script.WriteString("            $overallPathHealth = '⚠️ Attention Required'\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        # Add informational findings\n")
	script.WriteString("        if ($systemPathLength -lt 2048) {\n")
	script.WriteString("            $findingsInfo += 'PATH length within acceptable limits'\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        # Build comprehensive result object\n")
	script.WriteString("        $result['environmentPaths'] = @{\n")
	script.WriteString("            'summary' = @{\n")
	script.WriteString("                'systemPathLength' = $systemPathLength\n")
	script.WriteString("                'systemPathEntriesCount' = $systemPathEntriesCount\n")
	script.WriteString("                'userPathEntriesCount' = $userPathEntriesCount\n")
	script.WriteString("                'totalPathEntries' = $systemPathEntriesCount + $userPathEntriesCount\n")
	script.WriteString("                'hasDuplicatePathEntries' = $hasDuplicatePathEntries\n")
	script.WriteString("                'hasEmptyPathEntries' = $hasEmptyPathEntries\n")
	script.WriteString("                'hasRelativePathEntries' = $hasRelativePathEntries\n")
	script.WriteString("                'hasUncPaths' = $hasUncPaths\n")
	script.WriteString("                'hasNonExistentPathEntries' = $hasNonExistentPathEntries\n")
	script.WriteString("                'hasTrailingSpaces' = $hasTrailingSpaces\n")
	script.WriteString("                'hasInvalidChars' = $hasInvalidChars\n")
	script.WriteString("                'hasRootDrivePaths' = $hasRootDrivePaths\n")
	script.WriteString("                'hasTempInPath' = $hasTempInPath\n")
	script.WriteString("                'overallPathHealth' = $overallPathHealth\n")
	script.WriteString("            }\n")
	script.WriteString("            'pathOrderAnalysis' = @{\n")
	script.WriteString("                'system32FirstInPath' = $system32FirstInPath\n")
	script.WriteString("                'userPathPrecedesSystemPath' = $userPathPrecedesSystemPath\n")
	script.WriteString("                'executableShadowingRisk' = $executableShadowingRisk\n")
	script.WriteString("                'shadowingExample' = $shadowingExample\n")
	script.WriteString("            }\n")
	script.WriteString("            'pathHygieneChecks' = @{\n")
	script.WriteString("                'hasDuplicatePathEntries' = $hasDuplicatePathEntries\n")
	script.WriteString("                'hasTrailingSpaces' = $hasTrailingSpaces\n")
	script.WriteString("                'hasInvalidChars' = $hasInvalidChars\n")
	script.WriteString("                'hasRelativePathEntries' = $hasRelativePathEntries\n")
	script.WriteString("                'hasRootDrivePaths' = $hasRootDrivePaths\n")
	script.WriteString("                'hasTempInPath' = $hasTempInPath\n")
	script.WriteString("            }\n")
	script.WriteString("            'systemPathAnalysis' = $systemPathAnalysis\n")
	script.WriteString("            'userPathAnalysis' = $userPathAnalysis\n")
	script.WriteString("            'tempConfig' = @{\n")
	script.WriteString("                'tempDirectory' = $tempDir\n")
	script.WriteString("                'tmpDirectory' = $tmpDir\n")
	script.WriteString("                'tempTmpMatch' = $tempTmpMatch\n")
	script.WriteString("                'tempOnSystemDrive' = $tempOnSystemDrive\n")
	script.WriteString("                'tempOnNetworkShare' = $tempOnNetworkShare\n")
	script.WriteString("            }\n")
	script.WriteString("            'tempHealth' = @{\n")
	script.WriteString("                'freeSpace' = $tempFreeSpace\n")
	script.WriteString("                'freeSpaceGB' = $tempFreeSpaceGB\n")
	script.WriteString("                'freeSpacePercent' = $tempFreeSpacePercent\n")
	script.WriteString("                'fileCount' = $tempFileCount\n")
	script.WriteString("                'oldestFileAge' = $tempOldestFileAge\n")
	script.WriteString("                'writableByEveryone' = $tempWritableByEveryone\n")
	script.WriteString("                'cleanupRecommended' = $tempCleanupRecommended\n")
	script.WriteString("            }\n")
	script.WriteString("            'environmentVariables' = @{\n")
	script.WriteString("                'totalSystemVariables' = $totalSystemVariables\n")
	script.WriteString("                'totalUserVariables' = $totalUserVariables\n")
	script.WriteString("                'systemVariables' = $systemVariablesList\n")
	script.WriteString("                'userVariables' = $userVariablesList\n")
	script.WriteString("            }\n")
	script.WriteString("            'findings' = @{\n")
	script.WriteString("                'critical' = $findingsCritical\n")
	script.WriteString("                'warning' = $findingsWarning\n")
	script.WriteString("                'info' = $findingsInfo\n")
	script.WriteString("            }\n")
	script.WriteString("        }\n")
	script.WriteString("    } catch {\n")
	script.WriteString("        $result['environmentPaths'] = @{\n")
	script.WriteString("            'summary' = @{\n")
	script.WriteString("                'systemPathLength' = 0\n")
	script.WriteString("                'systemPathEntriesCount' = 0\n")
	script.WriteString("                'userPathEntriesCount' = 0\n")
	script.WriteString("                'totalPathEntries' = 0\n")
	script.WriteString("                'hasDuplicatePathEntries' = $false\n")
	script.WriteString("                'hasEmptyPathEntries' = $false\n")
	script.WriteString("                'hasRelativePathEntries' = $false\n")
	script.WriteString("                'hasUncPaths' = $false\n")
	script.WriteString("                'hasNonExistentPathEntries' = $false\n")
	script.WriteString("                'hasTrailingSpaces' = $false\n")
	script.WriteString("                'hasInvalidChars' = $false\n")
	script.WriteString("                'hasRootDrivePaths' = $false\n")
	script.WriteString("                'hasTempInPath' = $false\n")
	script.WriteString("                'overallPathHealth' = 'Unknown'\n")
	script.WriteString("            }\n")
	script.WriteString("            'pathOrderAnalysis' = @{}\n")
	script.WriteString("            'pathHygieneChecks' = @{}\n")
	script.WriteString("            'systemPathAnalysis' = @()\n")
	script.WriteString("            'userPathAnalysis' = @()\n")
	script.WriteString("            'tempConfig' = @{}\n")
	script.WriteString("            'tempHealth' = @{}\n")
	script.WriteString("            'environmentVariables' = @{\n")
	script.WriteString("                'totalSystemVariables' = 0\n")
	script.WriteString("                'totalUserVariables' = 0\n")
	script.WriteString("                'systemVariables' = @()\n")
	script.WriteString("                'userVariables' = @()\n")
	script.WriteString("            }\n")
	script.WriteString("            'findings' = @{\n")
	script.WriteString("                'critical' = @()\n")
	script.WriteString("                'warning' = @()\n")
	script.WriteString("                'info' = @()\n")
	script.WriteString("            }\n")
	script.WriteString("        }\n")
	script.WriteString("    }\n\n")

	script.WriteString("    Update-Progress -Step ($currentStep++) -Activity \"Collecting Scheduled Tasks\" -Status \"Enumerating scheduled tasks\"\n")
	script.WriteString("    # Scheduled Tasks (Inventory)\n")
	script.WriteString("    try {\n")
	script.WriteString("        $scheduledTasks = Get-ScheduledTask -ErrorAction SilentlyContinue\n")
	script.WriteString("        $totalTasks = $scheduledTasks.Count\n")
	script.WriteString("        \n")
	script.WriteString("        # Count enabled (Ready or Running) vs disabled tasks\n")
	script.WriteString("        $enabledTasks = ($scheduledTasks | Where-Object { $_.State -eq 'Ready' -or $_.State -eq 'Running' }).Count\n")
	script.WriteString("        $disabledTasks = ($scheduledTasks | Where-Object { $_.State -eq 'Disabled' }).Count\n")
	script.WriteString("        \n")
	script.WriteString("        $allTasks = @()\n")
	script.WriteString("        $failedTasks = @()\n")
	script.WriteString("        \n")
	script.WriteString("        foreach ($task in $scheduledTasks) {\n")
	script.WriteString("            try {\n")
	script.WriteString("                $taskInfo = Get-ScheduledTaskInfo -TaskName $task.TaskName -TaskPath $task.TaskPath -ErrorAction SilentlyContinue\n")
	script.WriteString("                if ($taskInfo) {\n")
	script.WriteString("                    $lastRunTimeStr = 'Never'\n")
	script.WriteString("                    if ($taskInfo.LastRunTime -and $taskInfo.LastRunTime -ne [DateTime]::MinValue) {\n")
	script.WriteString("                        $lastRunTimeStr = $taskInfo.LastRunTime.ToString('yyyy-MM-dd HH:mm:ss')\n")
	script.WriteString("                    }\n")
	script.WriteString("                    \n")
	script.WriteString("                    $nextRunTimeStr = 'N/A'\n")
	script.WriteString("                    if ($taskInfo.NextRunTime -and $taskInfo.NextRunTime -ne [DateTime]::MinValue) {\n")
	script.WriteString("                        $nextRunTimeStr = $taskInfo.NextRunTime.ToString('yyyy-MM-dd HH:mm:ss')\n")
	script.WriteString("                    }\n")
	script.WriteString("                    \n")
	script.WriteString("                    # Check if task runs as SYSTEM\n")
	script.WriteString("                    $runsAsSystem = $false\n")
	script.WriteString("                    $principal = $task.Principal\n")
	script.WriteString("                    if ($principal) {\n")
	script.WriteString("                        $userId = $principal.UserId\n")
	script.WriteString("                        if ($userId -eq 'SYSTEM' -or $userId -like '*\\SYSTEM' -or $userId -like 'NT AUTHORITY\\SYSTEM') {\n")
	script.WriteString("                            $runsAsSystem = $true\n")
	script.WriteString("                        }\n")
	script.WriteString("                    }\n")
	script.WriteString("                    \n")
	script.WriteString("                    # Check if task runs PowerShell or cmd\n")
	script.WriteString("                    $runsPowerShellOrCmd = $false\n")
	script.WriteString("                    $actionType = ''\n")
	script.WriteString("                    $actionCommand = ''\n")
	script.WriteString("                    if ($task.Actions) {\n")
	script.WriteString("                        foreach ($action in $task.Actions) {\n")
	script.WriteString("                            if ($action.Execute) {\n")
	script.WriteString("                                $actionCommand = $action.Execute\n")
	script.WriteString("                                $actionType = $action.Execute\n")
	script.WriteString("                                if ($action.Execute -like '*powershell*' -or $action.Execute -like '*pwsh*' -or $action.Arguments -like '*powershell*' -or $action.Arguments -like '*pwsh*') {\n")
	script.WriteString("                                    $runsPowerShellOrCmd = $true\n")
	script.WriteString("                                    $actionType = 'PowerShell'\n")
	script.WriteString("                                } elseif ($action.Execute -like '*cmd.exe*' -or $action.Execute -like '*cmd*' -or $action.Arguments -like '*cmd*') {\n")
	script.WriteString("                                    $runsPowerShellOrCmd = $true\n")
	script.WriteString("                                    $actionType = 'CMD'\n")
	script.WriteString("                                }\n")
	script.WriteString("                            }\n")
	script.WriteString("                            if ($action.Arguments) {\n")
	script.WriteString("                                $actionCommand += ' ' + $action.Arguments\n")
	script.WriteString("                            }\n")
	script.WriteString("                        }\n")
	script.WriteString("                    }\n")
	script.WriteString("                    \n")
	script.WriteString("                    # Check if task has stored credentials\n")
	script.WriteString("                    $hasStoredCredentials = $false\n")
	script.WriteString("                    $storedUserName = ''\n")
	script.WriteString("                    if ($principal) {\n")
	script.WriteString("                        if ($principal.LogonType -eq 'Password' -or $principal.LogonType -eq 'InteractiveTokenOrPassword') {\n")
	script.WriteString("                            if ($principal.UserId -and $principal.UserId -ne 'SYSTEM' -and $principal.UserId -notlike '*\\SYSTEM' -and $principal.UserId -notlike 'NT AUTHORITY\\SYSTEM' -and $principal.UserId -notlike 'NT AUTHORITY\\LOCAL SERVICE' -and $principal.UserId -notlike 'NT AUTHORITY\\NETWORK SERVICE') {\n")
	script.WriteString("                                $hasStoredCredentials = $true\n")
	script.WriteString("                                $storedUserName = $principal.UserId\n")
	script.WriteString("                            }\n")
	script.WriteString("                        }\n")
	script.WriteString("                        # Also check if RunLevel is Highest (requires stored credentials for elevation)\n")
	script.WriteString("                        if ($principal.RunLevel -eq 'Highest' -and $principal.UserId -and $principal.UserId -ne 'SYSTEM' -and $principal.UserId -notlike '*\\SYSTEM' -and $principal.UserId -notlike 'NT AUTHORITY\\SYSTEM') {\n")
	script.WriteString("                            $hasStoredCredentials = $true\n")
	script.WriteString("                            if (-not $storedUserName) {\n")
	script.WriteString("                                $storedUserName = $principal.UserId\n")
	script.WriteString("                            }\n")
	script.WriteString("                        }\n")
	script.WriteString("                    }\n")
	script.WriteString("                    \n")
	script.WriteString("                    $taskData = @{\n")
	script.WriteString("                        taskName = $task.TaskName\n")
	script.WriteString("                        taskPath = $task.TaskPath\n")
	script.WriteString("                        state = $task.State.ToString()\n")
	script.WriteString("                        lastRunTime = $lastRunTimeStr\n")
	script.WriteString("                        lastTaskResult = if ($taskInfo.LastTaskResult -ne $null) { $taskInfo.LastTaskResult } else { 0 }\n")
	script.WriteString("                        nextRunTime = $nextRunTimeStr\n")
	script.WriteString("                        numberOfMissedRuns = $taskInfo.NumberOfMissedRuns\n")
	script.WriteString("                        runsAsSystem = $runsAsSystem\n")
	script.WriteString("                        runsPowerShellOrCmd = $runsPowerShellOrCmd\n")
	script.WriteString("                        actionType = $actionType\n")
	script.WriteString("                        actionCommand = $actionCommand\n")
	script.WriteString("                        hasStoredCredentials = $hasStoredCredentials\n")
	script.WriteString("                        storedUserName = $storedUserName\n")
	script.WriteString("                    }\n")
	script.WriteString("                    \n")
	script.WriteString("                    $allTasks += $taskData\n")
	script.WriteString("                    \n")
	script.WriteString("                    # Check if last run result indicates failure\n")
	script.WriteString("                    # LastTaskResult: 0 = Success, non-zero = Error/Failure\n")
	script.WriteString("                    if ($taskInfo.LastTaskResult -ne $null -and $taskInfo.LastTaskResult -ne 0) {\n")
	script.WriteString("                        $failedTasks += $taskData\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("            } catch {\n")
	script.WriteString("                # Skip tasks we can't access\n")
	script.WriteString("            }\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        $result['scheduledTasks'] = @{\n")
	script.WriteString("            'totalTasks' = $totalTasks\n")
	script.WriteString("            'enabledTasks' = $enabledTasks\n")
	script.WriteString("            'disabledTasks' = $disabledTasks\n")
	script.WriteString("            'failedTasksCount' = $failedTasks.Count\n")
	script.WriteString("            'allTasks' = $allTasks\n")
	script.WriteString("            'failedTasks' = $failedTasks\n")
	script.WriteString("        }\n")
	script.WriteString("    } catch {\n")
	script.WriteString("        $result['scheduledTasks'] = @{\n")
	script.WriteString("            'totalTasks' = 0\n")
	script.WriteString("            'enabledTasks' = 0\n")
	script.WriteString("            'disabledTasks' = 0\n")
	script.WriteString("            'failedTasksCount' = 0\n")
	script.WriteString("            'allTasks' = @()\n")
	script.WriteString("            'failedTasks' = @()\n")
	script.WriteString("        }\n")
	script.WriteString("    }\n\n")
	script.WriteString("    Update-Progress -Step ($currentStep++) -Activity \"Collecting Security Settings\" -Status \"Checking firewall profiles and antivirus\"\n")
	script.WriteString("    # Security Settings\n")
	script.WriteString("    $firewall = Get-NetFirewallProfile\n")
	script.WriteString("    \n")
	script.WriteString("    # Detect Antivirus\n")
	script.WriteString("    $antivirusList = @()\n")
	script.WriteString("    \n")
	script.WriteString("    # Check Windows Defender (built-in)\n")
	script.WriteString("    try {\n")
	script.WriteString("        $defenderStatus = Get-MpComputerStatus -ErrorAction SilentlyContinue\n")
	script.WriteString("        if ($defenderStatus) {\n")
	script.WriteString("            $antivirusList += @{\n")
	script.WriteString("                'name' = 'Windows Defender'\n")
	script.WriteString("                'displayName' = 'Microsoft Defender Antivirus'\n")
	script.WriteString("                'productState' = 'Enabled'\n")
	script.WriteString("                'enabled' = $defenderStatus.RealTimeProtectionEnabled\n")
	script.WriteString("                'version' = $defenderStatus.AntivirusSignatureVersion\n")
	script.WriteString("                'lastUpdate' = if ($defenderStatus.AntivirusSignatureLastUpdated) { $defenderStatus.AntivirusSignatureLastUpdated.ToString('yyyy-MM-dd HH:mm:ss') } else { 'N/A' }\n")
	script.WriteString("                'engineVersion' = $defenderStatus.AntispywareSignatureVersion\n")
	script.WriteString("                'isUpToDate' = $defenderStatus.AntivirusSignatureAge -lt 7\n")
	script.WriteString("                'provider' = 'Microsoft'\n")
	script.WriteString("            }\n")
	script.WriteString("        }\n")
	script.WriteString("    } catch {}\n")
	script.WriteString("    \n")
	script.WriteString("    # Check Security Center 2 (WMI) for third-party antivirus\n")
	script.WriteString("    try {\n")
	script.WriteString("        $securityProducts = Get-CimInstance -Namespace root\\SecurityCenter2 -ClassName AntiVirusProduct -ErrorAction SilentlyContinue\n")
	script.WriteString("        if ($securityProducts) {\n")
	script.WriteString("            foreach ($product in $securityProducts) {\n")
	script.WriteString("                # Skip if it's Windows Defender (already added)\n")
	script.WriteString("                if ($product.displayName -like '*Windows Defender*' -or $product.displayName -like '*Microsoft Defender*') {\n")
	script.WriteString("                    continue\n")
	script.WriteString("                }\n")
	script.WriteString("                \n")
	script.WriteString("                $productState = switch ($product.productState) {\n")
	script.WriteString("                    { $_ -ge 262144 -and $_ -lt 393216 } { 'On' }\n")
	script.WriteString("                    { $_ -ge 393216 -and $_ -lt 524288 } { 'Off' }\n")
	script.WriteString("                    { $_ -ge 65536 -and $_ -lt 196608 } { 'Expired' }\n")
	script.WriteString("                    default { 'Unknown' }\n")
	script.WriteString("                }\n")
	script.WriteString("                \n")
	script.WriteString("                $antivirusList += @{\n")
	script.WriteString("                    'name' = $product.displayName\n")
	script.WriteString("                    'displayName' = $product.displayName\n")
	script.WriteString("                    'productState' = $productState\n")
	script.WriteString("                    'enabled' = $productState -eq 'On'\n")
	script.WriteString("                    'version' = 'N/A'\n")
	script.WriteString("                    'lastUpdate' = 'N/A'\n")
	script.WriteString("                    'engineVersion' = 'N/A'\n")
	script.WriteString("                    'isUpToDate' = 'N/A'\n")
	script.WriteString("                    'provider' = if ($product.displayName) { ($product.displayName -split ' ')[0] } else { 'Unknown' }\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("        }\n")
	script.WriteString("    } catch {}\n")
	script.WriteString("    \n")
	script.WriteString("    # If no antivirus found, mark as 'None Detected'\n")
	script.WriteString("    if ($antivirusList.Count -eq 0) {\n")
	script.WriteString("        $antivirusList += @{\n")
	script.WriteString("            'name' = 'None Detected'\n")
	script.WriteString("            'displayName' = 'No Antivirus Detected'\n")
	script.WriteString("            'productState' = 'Not Found'\n")
	script.WriteString("            'enabled' = $false\n")
	script.WriteString("            'version' = 'N/A'\n")
	script.WriteString("            'lastUpdate' = 'N/A'\n")
	script.WriteString("            'engineVersion' = 'N/A'\n")
	script.WriteString("            'isUpToDate' = 'N/A'\n")
	script.WriteString("            'provider' = 'N/A'\n")
	script.WriteString("        }\n")
	script.WriteString("    }\n")
	script.WriteString("    \n")
	script.WriteString("    $result['security'] = @{\n")
	script.WriteString("        'firewallProfiles' = @($firewall | ForEach-Object {\n")
	script.WriteString("            @{\n")
	script.WriteString("                'name' = $_.Name\n")
	script.WriteString("                'enabled' = $_.Enabled\n")
	script.WriteString("                'defaultInboundAction' = $_.DefaultInboundAction.ToString()\n")
	script.WriteString("                'defaultOutboundAction' = $_.DefaultOutboundAction.ToString()\n")
	script.WriteString("            }\n")
	script.WriteString("        })\n")
	script.WriteString("        'antivirus' = $antivirusList\n")
	script.WriteString("    }\n\n")
	script.WriteString("    Update-Progress -Step ($currentStep++) -Activity \"Collecting Firewall Rules\" -Status \"Enumerating all firewall rules\"\n")
	script.WriteString("    # Firewall Rules\n")
	script.WriteString("    try {\n")
	script.WriteString("        $firewallRules = Get-NetFirewallRule -ErrorAction SilentlyContinue\n")
	script.WriteString("        $firewallRulesList = @()\n")
	script.WriteString("        if ($firewallRules) {\n")
	script.WriteString("            foreach ($rule in $firewallRules) {\n")
	script.WriteString("                try {\n")
	script.WriteString("                    $ruleName = if ($rule.DisplayName) { $rule.DisplayName } elseif ($rule.Name) { $rule.Name } else { 'N/A' }\n")
	script.WriteString("                    $ruleDescription = if ($rule.Description) { $rule.Description } else { 'N/A' }\n")
	script.WriteString("                    $ruleEnabled = if ($rule.Enabled -ne $null) { [bool]$rule.Enabled } else { $false }\n")
	script.WriteString("                    $ruleDirection = if ($rule.Direction) { $rule.Direction.ToString() } else { 'N/A' }\n")
	script.WriteString("                    $ruleAction = if ($rule.Action) { $rule.Action.ToString() } else { 'N/A' }\n")
	script.WriteString("                    $ruleProfile = if ($rule.Profile) { ($rule.Profile -join ', ') } else { 'N/A' }\n")
	script.WriteString("                    \n")
	script.WriteString("                    # Get Address Filter (Local/Remote addresses, ports)\n")
	script.WriteString("                    $localAddress = 'Any'\n")
	script.WriteString("                    $remoteAddress = 'Any'\n")
	script.WriteString("                    $localPort = 'Any'\n")
	script.WriteString("                    $remotePort = 'Any'\n")
	script.WriteString("                    $protocol = 'Any'\n")
	script.WriteString("                    try {\n")
	script.WriteString("                        $addressFilter = $rule | Get-NetFirewallAddressFilter -ErrorAction SilentlyContinue\n")
	script.WriteString("                        if ($addressFilter) {\n")
	script.WriteString("                            if ($addressFilter.LocalAddress) { $localAddress = ($addressFilter.LocalAddress -join ', ') }\n")
	script.WriteString("                            if ($addressFilter.RemoteAddress) { $remoteAddress = ($addressFilter.RemoteAddress -join ', ') }\n")
	script.WriteString("                        }\n")
	script.WriteString("                    } catch {}\n")
	script.WriteString("                    \n")
	script.WriteString("                    try {\n")
	script.WriteString("                        $portFilter = $rule | Get-NetFirewallPortFilter -ErrorAction SilentlyContinue\n")
	script.WriteString("                        if ($portFilter) {\n")
	script.WriteString("                            if ($portFilter.LocalPort) { $localPort = ($portFilter.LocalPort -join ', ') }\n")
	script.WriteString("                            if ($portFilter.RemotePort) { $remotePort = ($portFilter.RemotePort -join ', ') }\n")
	script.WriteString("                            if ($portFilter.Protocol) { $protocol = $portFilter.Protocol.ToString() }\n")
	script.WriteString("                        }\n")
	script.WriteString("                    } catch {}\n")
	script.WriteString("                    \n")
	script.WriteString("                    # Get Application Filter\n")
	script.WriteString("                    $program = 'Any'\n")
	script.WriteString("                    $service = 'Any'\n")
	script.WriteString("                    try {\n")
	script.WriteString("                        $appFilter = $rule | Get-NetFirewallApplicationFilter -ErrorAction SilentlyContinue\n")
	script.WriteString("                        if ($appFilter) {\n")
	script.WriteString("                            if ($appFilter.Program) { $program = $appFilter.Program }\n")
	script.WriteString("                            if ($appFilter.Service) { $service = $appFilter.Service }\n")
	script.WriteString("                        }\n")
	script.WriteString("                    } catch {}\n")
	script.WriteString("                    \n")
	script.WriteString("                    # Get Interface Filter\n")
	script.WriteString("                    $interfaceType = 'Any'\n")
	script.WriteString("                    $interfaceAlias = 'Any'\n")
	script.WriteString("                    try {\n")
	script.WriteString("                        $interfaceFilter = $rule | Get-NetFirewallInterfaceFilter -ErrorAction SilentlyContinue\n")
	script.WriteString("                        if ($interfaceFilter) {\n")
	script.WriteString("                            if ($interfaceFilter.InterfaceType) { $interfaceType = $interfaceFilter.InterfaceType.ToString() }\n")
	script.WriteString("                            if ($interfaceFilter.InterfaceAlias) { $interfaceAlias = ($interfaceFilter.InterfaceAlias -join ', ') }\n")
	script.WriteString("                        }\n")
	script.WriteString("                    } catch {}\n")
	script.WriteString("                    \n")
	script.WriteString("                    # Get Security Filter\n")
	script.WriteString("                    $authentication = 'NotRequired'\n")
	script.WriteString("                    $encryption = 'NotRequired'\n")
	script.WriteString("                    $overrideBlockRules = 'N/A'\n")
	script.WriteString("                    try {\n")
	script.WriteString("                        $securityFilter = $rule | Get-NetFirewallSecurityFilter -ErrorAction SilentlyContinue\n")
	script.WriteString("                        if ($securityFilter) {\n")
	script.WriteString("                            if ($securityFilter.Authentication) { $authentication = $securityFilter.Authentication.ToString() }\n")
	script.WriteString("                            if ($securityFilter.Encryption) { $encryption = $securityFilter.Encryption.ToString() }\n")
	script.WriteString("                            if ($securityFilter.OverrideBlockRules) { $overrideBlockRules = $securityFilter.OverrideBlockRules.ToString() }\n")
	script.WriteString("                        }\n")
	script.WriteString("                    } catch {}\n")
	script.WriteString("                    \n")
	script.WriteString("                    $firewallRuleInfo = @{\n")
	script.WriteString("                        'name' = $ruleName\n")
	script.WriteString("                        'displayName' = $rule.DisplayName\n")
	script.WriteString("                        'description' = $ruleDescription\n")
	script.WriteString("                        'enabled' = $ruleEnabled\n")
	script.WriteString("                        'direction' = $ruleDirection\n")
	script.WriteString("                        'action' = $ruleAction\n")
	script.WriteString("                        'profile' = $ruleProfile\n")
	script.WriteString("                        'localAddress' = $localAddress\n")
	script.WriteString("                        'remoteAddress' = $remoteAddress\n")
	script.WriteString("                        'localPort' = $localPort\n")
	script.WriteString("                        'remotePort' = $remotePort\n")
	script.WriteString("                        'protocol' = $protocol\n")
	script.WriteString("                        'program' = $program\n")
	script.WriteString("                        'service' = $service\n")
	script.WriteString("                        'interfaceType' = $interfaceType\n")
	script.WriteString("                        'interfaceAlias' = $interfaceAlias\n")
	script.WriteString("                        'authentication' = $authentication\n")
	script.WriteString("                        'encryption' = $encryption\n")
	script.WriteString("                        'overrideBlockRules' = $overrideBlockRules\n")
	script.WriteString("                        'group' = if ($rule.Group) { $rule.Group } else { 'N/A' }\n")
	script.WriteString("                        'edgeTraversalPolicy' = if ($rule.EdgeTraversalPolicy) { $rule.EdgeTraversalPolicy.ToString() } else { 'N/A' }\n")
	script.WriteString("                        'id' = if ($rule.ID) { $rule.ID } else { 'N/A' }\n")
	script.WriteString("                    }\n")
	script.WriteString("                    $firewallRulesList += $firewallRuleInfo\n")
	script.WriteString("                } catch {\n")
	script.WriteString("                    # Skip this rule if there's an error\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("        }\n")
	script.WriteString("        $result['firewallRules'] = $firewallRulesList\n")
	script.WriteString("    } catch {\n")
	script.WriteString("        $result['firewallRules'] = @()\n")
	script.WriteString("    }\n\n")
	script.WriteString("    Update-Progress -Step ($currentStep++) -Activity \"Collecting Listening Ports\" -Status \"Enumerating TCP and UDP listeners\"\n")
	script.WriteString("    # Listening Ports\n")
	script.WriteString("    try {\n")
	script.WriteString("        $tcpListeners = @()\n")
	script.WriteString("        $udpListeners = @()\n")
	script.WriteString("        \n")
	script.WriteString("        # Get TCP listeners\n")
	script.WriteString("        try {\n")
	script.WriteString("            $tcpConnections = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue\n")
	script.WriteString("            if ($tcpConnections) {\n")
	script.WriteString("                foreach ($tcp in $tcpConnections) {\n")
	script.WriteString("                    try {\n")
	script.WriteString("                        $processName = 'N/A'\n")
	script.WriteString("                        $processId = $null\n")
	script.WriteString("                        $processPath = 'N/A'\n")
	script.WriteString("                        \n")
	script.WriteString("                        if ($tcp.OwningProcess) {\n")
	script.WriteString("                            $processId = $tcp.OwningProcess\n")
	script.WriteString("                            try {\n")
	script.WriteString("                                $process = Get-Process -Id $processId -ErrorAction SilentlyContinue\n")
	script.WriteString("                                if ($process) {\n")
	script.WriteString("                                    $processName = $process.ProcessName\n")
	script.WriteString("                                    try {\n")
	script.WriteString("                                        $processPath = $process.Path\n")
	script.WriteString("                                        if (-not $processPath) { $processPath = 'N/A' }\n")
	script.WriteString("                                    } catch { $processPath = 'N/A' }\n")
	script.WriteString("                                }\n")
	script.WriteString("                            } catch {}\n")
	script.WriteString("                        }\n")
	script.WriteString("                        \n")
	script.WriteString("                        $localAddress = $tcp.LocalAddress\n")
	script.WriteString("                        if ($localAddress -eq '0.0.0.0') { $localAddress = '*' }\n")
	script.WriteString("                        if ($localAddress -eq '::') { $localAddress = '*' }\n")
	script.WriteString("                        \n")
	script.WriteString("                        $tcpInfo = @{\n")
	script.WriteString("                            'localAddress' = $localAddress\n")
	script.WriteString("                            'localPort' = $tcp.LocalPort\n")
	script.WriteString("                            'state' = $tcp.State.ToString()\n")
	script.WriteString("                            'processId' = if ($processId) { $processId } else { 'N/A' }\n")
	script.WriteString("                            'processName' = $processName\n")
	script.WriteString("                            'processPath' = $processPath\n")
	script.WriteString("                            'protocol' = 'TCP'\n")
	script.WriteString("                        }\n")
	script.WriteString("                        $tcpListeners += $tcpInfo\n")
	script.WriteString("                    } catch {\n")
	script.WriteString("                        # Skip this connection if there's an error\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("        } catch {}\n")
	script.WriteString("        \n")
	script.WriteString("        # Get UDP listeners\n")
	script.WriteString("        try {\n")
	script.WriteString("            # Define known system services and high-risk ports\n")
	script.WriteString("            $knownSystemServices = @{\n")
	script.WriteString("                53 = 'DNS'\n")
	script.WriteString("                123 = 'NTP'\n")
	script.WriteString("                161 = 'SNMP'\n")
	script.WriteString("                1900 = 'SSDP'\n")
	script.WriteString("                5353 = 'mDNS'\n")
	script.WriteString("                5355 = 'LLMNR'\n")
	script.WriteString("                137 = 'NetBIOS Name Service'\n")
	script.WriteString("                138 = 'NetBIOS Datagram Service'\n")
	script.WriteString("                445 = 'SMB'\n")
	script.WriteString("                69 = 'TFTP'\n")
	script.WriteString("                67 = 'DHCP Server'\n")
	script.WriteString("                68 = 'DHCP Client'\n")
	script.WriteString("                88 = 'Kerberos'\n")
	script.WriteString("                389 = 'LDAP'\n")
	script.WriteString("                636 = 'LDAPS'\n")
	script.WriteString("                135 = 'RPC Endpoint Mapper'\n")
	script.WriteString("                500 = 'ISAKMP'\n")
	script.WriteString("                4500 = 'IPSec NAT-T'\n")
	script.WriteString("            }\n")
	script.WriteString("            \n")
	script.WriteString("            $highRiskPorts = @(53, 69, 123, 161, 1900, 500, 4500, 389, 636, 88, 135)\n")
	script.WriteString("            \n")
	script.WriteString("            # Ephemeral port range (Windows default: 49152-65535)\n")
	script.WriteString("            $ephemeralPortStart = 49152\n")
	script.WriteString("            $ephemeralPortEnd = 65535\n")
	script.WriteString("            \n")
	script.WriteString("            $udpEndpoints = Get-NetUDPEndpoint -ErrorAction SilentlyContinue\n")
	script.WriteString("            if ($udpEndpoints) {\n")
	script.WriteString("                foreach ($udp in $udpEndpoints) {\n")
	script.WriteString("                    try {\n")
	script.WriteString("                        $localPort = $udp.LocalPort\n")
	script.WriteString("                        \n")
	script.WriteString("                        # Skip ephemeral ports (dynamic client ports)\n")
	script.WriteString("                        if ($localPort -ge $ephemeralPortStart -and $localPort -le $ephemeralPortEnd) {\n")
	script.WriteString("                            continue\n")
	script.WriteString("                        }\n")
	script.WriteString("                        \n")
	script.WriteString("                        $processName = 'N/A'\n")
	script.WriteString("                        $processId = $null\n")
	script.WriteString("                        $processPath = 'N/A'\n")
	script.WriteString("                        $serviceName = 'N/A'\n")
	script.WriteString("                        $riskLevel = 'Low'\n")
	script.WriteString("                        $isSystemService = $false\n")
	script.WriteString("                        \n")
	script.WriteString("                        # Classify port\n")
	script.WriteString("                        if ($knownSystemServices.ContainsKey($localPort)) {\n")
	script.WriteString("                            $serviceName = $knownSystemServices[$localPort]\n")
	script.WriteString("                            $isSystemService = $true\n")
	script.WriteString("                            if ($highRiskPorts -contains $localPort) {\n")
	script.WriteString("                                $riskLevel = 'High'\n")
	script.WriteString("                            } else {\n")
	script.WriteString("                                $riskLevel = 'Medium'\n")
	script.WriteString("                            }\n")
	script.WriteString("                        } elseif ($localPort -lt 1024) {\n")
	script.WriteString("                            # Well-known ports (0-1023)\n")
	script.WriteString("                            $riskLevel = 'Medium'\n")
	script.WriteString("                        } elseif ($localPort -ge 1024 -and $localPort -lt 49152) {\n")
	script.WriteString("                            # Registered ports (1024-49151)\n")
	script.WriteString("                            $riskLevel = 'Medium'\n")
	script.WriteString("                        }\n")
	script.WriteString("                        \n")
	script.WriteString("                        if ($udp.OwningProcess) {\n")
	script.WriteString("                            $processId = $udp.OwningProcess\n")
	script.WriteString("                            try {\n")
	script.WriteString("                                $process = Get-Process -Id $processId -ErrorAction SilentlyContinue\n")
	script.WriteString("                                if ($process) {\n")
	script.WriteString("                                    $processName = $process.ProcessName\n")
	script.WriteString("                                    \n")
	script.WriteString("                                    # Check if it's a known system process\n")
	script.WriteString("                                    $systemProcesses = @('svchost', 'dns', 'lsass', 'services', 'spoolsv', 'winlogon', 'csrss', 'smss', 'System')\n")
	script.WriteString("                                    if ($systemProcesses -contains $processName) {\n")
	script.WriteString("                                        $isSystemService = $true\n")
	script.WriteString("                                    }\n")
	script.WriteString("                                    \n")
	script.WriteString("                                    try {\n")
	script.WriteString("                                        $processPath = $process.Path\n")
	script.WriteString("                                        if (-not $processPath) { $processPath = 'N/A' }\n")
	script.WriteString("                                    } catch { $processPath = 'N/A' }\n")
	script.WriteString("                                }\n")
	script.WriteString("                            } catch {}\n")
	script.WriteString("                        }\n")
	script.WriteString("                        \n")
	script.WriteString("                        $localAddress = $udp.LocalAddress\n")
	script.WriteString("                        if ($localAddress -eq '0.0.0.0') { $localAddress = '*' }\n")
	script.WriteString("                        if ($localAddress -eq '::') { $localAddress = '*' }\n")
	script.WriteString("                        \n")
	script.WriteString("                        $udpInfo = @{\n")
	script.WriteString("                            'localAddress' = $localAddress\n")
	script.WriteString("                            'localPort' = $localPort\n")
	script.WriteString("                            'processId' = if ($processId) { $processId } else { 'N/A' }\n")
	script.WriteString("                            'processName' = $processName\n")
	script.WriteString("                            'processPath' = $processPath\n")
	script.WriteString("                            'protocol' = 'UDP'\n")
	script.WriteString("                            'serviceName' = $serviceName\n")
	script.WriteString("                            'riskLevel' = $riskLevel\n")
	script.WriteString("                            'isSystemService' = $isSystemService\n")
	script.WriteString("                        }\n")
	script.WriteString("                        $udpListeners += $udpInfo\n")
	script.WriteString("                    } catch {\n")
	script.WriteString("                        # Skip this endpoint if there's an error\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("        } catch {}\n")
	script.WriteString("        \n")
	script.WriteString("        $result['listeningPorts'] = @{\n")
	script.WriteString("            'tcpListeners' = $tcpListeners\n")
	script.WriteString("            'udpListeners' = $udpListeners\n")
	script.WriteString("            'totalTCP' = $tcpListeners.Count\n")
	script.WriteString("            'totalUDP' = $udpListeners.Count\n")
	script.WriteString("            'total' = $tcpListeners.Count + $udpListeners.Count\n")
	script.WriteString("        }\n")
	script.WriteString("    } catch {\n")
	script.WriteString("        $result['listeningPorts'] = @{\n")
	script.WriteString("            'tcpListeners' = @()\n")
	script.WriteString("            'udpListeners' = @()\n")
	script.WriteString("            'totalTCP' = 0\n")
	script.WriteString("            'totalUDP' = 0\n")
	script.WriteString("            'total' = 0\n")
	script.WriteString("        }\n")
	script.WriteString("    }\n\n")
	script.WriteString("    Update-Progress -Step ($currentStep++) -Activity \"Collecting Event Logs\" -Status \"Analyzing system and application event logs\"\n")
	script.WriteString("    # Event Log Overview\n")
	script.WriteString("    try {\n")
	script.WriteString("        $now = Get-Date\n")
	script.WriteString("        $last24h = $now.AddHours(-24)\n")
	script.WriteString("        $last7d = $now.AddDays(-7)\n")
	script.WriteString("        $last30d = $now.AddDays(-30)\n")
	script.WriteString("        \n")
	script.WriteString("        # System errors (last 24h / 7d / 30d) - collect actual events\n")
	script.WriteString("        $systemErrors24h = 0\n")
	script.WriteString("        $systemErrors7d = 0\n")
	script.WriteString("        $systemErrors30d = 0\n")
	script.WriteString("        $systemErrorsList = @()\n")
	script.WriteString("        try {\n")
	script.WriteString("            $systemEvents24h = Get-WinEvent -FilterHashtable @{LogName='System'; Level=2,3; StartTime=$last24h} -MaxEvents 50 -ErrorAction SilentlyContinue\n")
	script.WriteString("            if ($systemEvents24h) { $systemErrors24h = $systemEvents24h.Count }\n")
	script.WriteString("            $systemEvents7d = Get-WinEvent -FilterHashtable @{LogName='System'; Level=2,3; StartTime=$last7d} -MaxEvents 100 -ErrorAction SilentlyContinue\n")
	script.WriteString("            if ($systemEvents7d) { $systemErrors7d = $systemEvents7d.Count }\n")
	script.WriteString("            $systemEvents30d = Get-WinEvent -FilterHashtable @{LogName='System'; Level=2,3; StartTime=$last30d} -MaxEvents 200 -ErrorAction SilentlyContinue\n")
	script.WriteString("            if ($systemEvents30d) { $systemErrors30d = $systemEvents30d.Count }\n")
	script.WriteString("            \n")
	script.WriteString("            # Collect ALL system errors for display (up to 1000 events from last 30 days)\n")
	script.WriteString("            $systemEventsAll = Get-WinEvent -FilterHashtable @{LogName='System'; Level=2,3; StartTime=$last30d} -MaxEvents 1000 -ErrorAction SilentlyContinue\n")
	script.WriteString("            if ($systemEventsAll) {\n")
	script.WriteString("                foreach ($event in $systemEventsAll) {\n")
	script.WriteString("                    $systemErrorsList += @{\n")
	script.WriteString("                        time = $event.TimeCreated.ToString('yyyy-MM-dd HH:mm:ss')\n")
	script.WriteString("                        source = $event.ProviderName\n")
	script.WriteString("                        level = $event.LevelDisplayName\n")
	script.WriteString("                        id = $event.Id\n")
	script.WriteString("                        message = if ($event.Message) { $event.Message.Substring(0, [Math]::Min(200, $event.Message.Length)) } else { 'N/A' }\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("        } catch {}\n")
	script.WriteString("        \n")
	script.WriteString("        # Application errors (last 24h / 7d / 30d) - collect actual events\n")
	script.WriteString("        $appErrors24h = 0\n")
	script.WriteString("        $appErrors7d = 0\n")
	script.WriteString("        $appErrors30d = 0\n")
	script.WriteString("        $appErrorsList = @()\n")
	script.WriteString("        try {\n")
	script.WriteString("            $appEvents24h = Get-WinEvent -FilterHashtable @{LogName='Application'; Level=2,3; StartTime=$last24h} -MaxEvents 50 -ErrorAction SilentlyContinue\n")
	script.WriteString("            if ($appEvents24h) { $appErrors24h = $appEvents24h.Count }\n")
	script.WriteString("            $appEvents7d = Get-WinEvent -FilterHashtable @{LogName='Application'; Level=2,3; StartTime=$last7d} -MaxEvents 100 -ErrorAction SilentlyContinue\n")
	script.WriteString("            if ($appEvents7d) { $appErrors7d = $appEvents7d.Count }\n")
	script.WriteString("            $appEvents30d = Get-WinEvent -FilterHashtable @{LogName='Application'; Level=2,3; StartTime=$last30d} -MaxEvents 200 -ErrorAction SilentlyContinue\n")
	script.WriteString("            if ($appEvents30d) { $appErrors30d = $appEvents30d.Count }\n")
	script.WriteString("            \n")
	script.WriteString("            # Collect ALL application errors for display (up to 1000 events from last 30 days)\n")
	script.WriteString("            $appEventsAll = Get-WinEvent -FilterHashtable @{LogName='Application'; Level=2,3; StartTime=$last30d} -MaxEvents 1000 -ErrorAction SilentlyContinue\n")
	script.WriteString("            if ($appEventsAll) {\n")
	script.WriteString("                foreach ($event in $appEventsAll) {\n")
	script.WriteString("                    $appErrorsList += @{\n")
	script.WriteString("                        time = $event.TimeCreated.ToString('yyyy-MM-dd HH:mm:ss')\n")
	script.WriteString("                        source = $event.ProviderName\n")
	script.WriteString("                        level = $event.LevelDisplayName\n")
	script.WriteString("                        id = $event.Id\n")
	script.WriteString("                        message = if ($event.Message) { $event.Message.Substring(0, [Math]::Min(200, $event.Message.Length)) } else { 'N/A' }\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("        } catch {}\n")
	script.WriteString("        \n")
	script.WriteString("        # Critical events - collect actual events\n")
	script.WriteString("        $criticalEventsCount = 0\n")
	script.WriteString("        $criticalEventsList = @()\n")
	script.WriteString("        try {\n")
	script.WriteString("            $criticalEvents = Get-WinEvent -FilterHashtable @{Level=1} -MaxEvents 50 -ErrorAction SilentlyContinue\n")
	script.WriteString("            if ($criticalEvents) {\n")
	script.WriteString("                $criticalEventsCount = $criticalEvents.Count\n")
	script.WriteString("                foreach ($event in $criticalEvents | Select-Object -First 50) {\n")
	script.WriteString("                    $criticalEventsList += @{\n")
	script.WriteString("                        time = $event.TimeCreated.ToString('yyyy-MM-dd HH:mm:ss')\n")
	script.WriteString("                        source = $event.ProviderName\n")
	script.WriteString("                        level = $event.LevelDisplayName\n")
	script.WriteString("                        id = $event.Id\n")
	script.WriteString("                        message = if ($event.Message) { $event.Message.Substring(0, [Math]::Min(200, $event.Message.Length)) } else { 'N/A' }\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("        } catch {}\n")
	script.WriteString("        \n")
	script.WriteString("        # Oldest log retention days\n")
	script.WriteString("        $oldestLogDays = 'N/A'\n")
	script.WriteString("        try {\n")
	script.WriteString("            $systemLog = Get-WinEvent -ListLog System -ErrorAction SilentlyContinue\n")
	script.WriteString("            if ($systemLog) {\n")
	script.WriteString("                $oldestEvent = Get-WinEvent -LogName System -MaxEvents 1 -Oldest -ErrorAction SilentlyContinue\n")
	script.WriteString("                if ($oldestEvent) {\n")
	script.WriteString("                    $daysDiff = ($now - $oldestEvent.TimeCreated).TotalDays\n")
	script.WriteString("                    $oldestLogDays = [math]::Round($daysDiff, 0)\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("        } catch {}\n")
	script.WriteString("        \n")
	script.WriteString("        $result['eventLogOverview'] = @{\n")
	script.WriteString("            'systemErrors24h' = $systemErrors24h\n")
	script.WriteString("            'systemErrors7d' = $systemErrors7d\n")
	script.WriteString("            'systemErrors30d' = $systemErrors30d\n")
	script.WriteString("            'appErrors24h' = $appErrors24h\n")
	script.WriteString("            'appErrors7d' = $appErrors7d\n")
	script.WriteString("            'appErrors30d' = $appErrors30d\n")
	script.WriteString("            'criticalEventsCount' = $criticalEventsCount\n")
	script.WriteString("            'oldestLogDays' = $oldestLogDays\n")
	script.WriteString("            'systemErrors' = $systemErrorsList\n")
	script.WriteString("            'appErrors' = $appErrorsList\n")
	script.WriteString("            'criticalEvents' = $criticalEventsList\n")
	script.WriteString("        }\n")
	script.WriteString("    } catch {\n")
	script.WriteString("        $result['eventLogOverview'] = @{\n")
	script.WriteString("            'systemErrors24h' = 0\n")
	script.WriteString("            'systemErrors7d' = 0\n")
	script.WriteString("            'systemErrors30d' = 0\n")
	script.WriteString("            'appErrors24h' = 0\n")
	script.WriteString("            'appErrors7d' = 0\n")
	script.WriteString("            'appErrors30d' = 0\n")
	script.WriteString("            'criticalEventsCount' = 0\n")
	script.WriteString("            'oldestLogDays' = 'N/A'\n")
	script.WriteString("            'systemErrors' = @()\n")
	script.WriteString("            'appErrors' = @()\n")
	script.WriteString("            'criticalEvents' = @()\n")
	script.WriteString("        }\n")
	script.WriteString("    }\n\n")
	script.WriteString("    # Crash & BSOD Root-Cause Analysis\n")
	script.WriteString("    Update-Progress -Step ($currentStep++) -Activity \"Analyzing Crashes & BSODs\" -Status \"Detecting system crashes and blue screens\"\n")
	script.WriteString("    try {\n")
	script.WriteString("        $now = Get-Date\n")
	script.WriteString("        $last180d = $now.AddDays(-180)\n")
	script.WriteString("        \n")
	script.WriteString("        # 1. Crash Classification - Get all crash events from last 90 days\n")
	script.WriteString("        # Get events without date filter first, then filter manually for better reliability\n")
	script.WriteString("        $crashEvents = @()\n")
	script.WriteString("        try {\n")
	script.WriteString("            # Try with date filter first\n")
	script.WriteString("            $crashEvents = Get-WinEvent -FilterHashtable @{LogName='System'; Id=41,1001,1074,6008; StartTime=$last180d} -ErrorAction SilentlyContinue\n")
	script.WriteString("        } catch {\n")
	script.WriteString("            # If date filter fails, get all events and filter manually\n")
	script.WriteString("            $allCrashEvents = Get-WinEvent -FilterHashtable @{LogName='System'; Id=41,1001,1074,6008} -ErrorAction SilentlyContinue\n")
	script.WriteString("            if ($allCrashEvents) {\n")
	script.WriteString("                $crashEvents = $allCrashEvents | Where-Object { $_.TimeCreated -ge $last180d }\n")
	script.WriteString("            }\n")
	script.WriteString("        }\n")
	script.WriteString("        # Sort by date descending and limit to 2000 most recent\n")
	script.WriteString("        if ($crashEvents) {\n")
	script.WriteString("            $crashEvents = $crashEvents | Sort-Object TimeCreated -Descending | Select-Object -First 2000\n")
	script.WriteString("        }\n")
	script.WriteString("        $crashList = @()\n")
	script.WriteString("        $crashTypes = @{'CleanReboot'=0; 'PowerLoss'=0; 'BSOD'=0; 'KernelHang'=0; 'WatchdogReset'=0; 'HyperVReset'=0}\n")
	script.WriteString("        \n")
	script.WriteString("        if ($crashEvents) {\n")
	script.WriteString("            foreach ($event in $crashEvents) {\n")
	script.WriteString("                $crashType = 'Unknown'\n")
	script.WriteString("                $bugCheckCode = ''\n")
	script.WriteString("                $bugCheckParams = @()\n")
	script.WriteString("                $faultingModule = ''\n")
	script.WriteString("                \n")
	script.WriteString("                if ($event.Id -eq 1074) {\n")
	script.WriteString("                    $crashType = 'CleanReboot'\n")
	script.WriteString("                    $crashTypes['CleanReboot']++\n")
	script.WriteString("                } elseif ($event.Id -eq 1001) {\n")
	script.WriteString("                    $crashType = 'BSOD'\n")
	script.WriteString("                    $crashTypes['BSOD']++\n")
	script.WriteString("                    if ($event.Message) {\n")
	script.WriteString("                        if ($event.Message -match 'BugcheckCode: (0x[0-9A-Fa-f]+)') { $bugCheckCode = $matches[1] }\n")
	script.WriteString("                        if ($event.Message -match 'BugcheckParameter1: (0x[0-9A-Fa-f]+)') { $bugCheckParams += $matches[1] }\n")
	script.WriteString("                        if ($event.Message -match 'BugcheckParameter2: (0x[0-9A-Fa-f]+)') { $bugCheckParams += $matches[1] }\n")
	script.WriteString("                        if ($event.Message -match 'BugcheckParameter3: (0x[0-9A-Fa-f]+)') { $bugCheckParams += $matches[1] }\n")
	script.WriteString("                        if ($event.Message -match 'BugcheckParameter4: (0x[0-9A-Fa-f]+)') { $bugCheckParams += $matches[1] }\n")
	script.WriteString("                        if ($event.Message -match 'FaultingModule: ([^\\s]+)') { $faultingModule = $matches[1] }\n")
	script.WriteString("                    }\n")
	script.WriteString("                } elseif ($event.Id -eq 41) {\n")
	script.WriteString("                    if ($event.Message -and $event.Message -match 'bugcheck') {\n")
	script.WriteString("                        $crashType = 'WatchdogReset'\n")
	script.WriteString("                        $crashTypes['WatchdogReset']++\n")
	script.WriteString("                    } else {\n")
	script.WriteString("                        $crashType = 'PowerLoss'\n")
	script.WriteString("                        $crashTypes['PowerLoss']++\n")
	script.WriteString("                    }\n")
	script.WriteString("                } elseif ($event.Id -eq 6008) {\n")
	script.WriteString("                    $crashType = 'KernelHang'\n")
	script.WriteString("                    $crashTypes['KernelHang']++\n")
	script.WriteString("                }\n")
	script.WriteString("                \n")
	script.WriteString("                # Translate bugcheck codes\n")
	script.WriteString("                $bugCheckMeaning = ''\n")
	script.WriteString("                if ($bugCheckCode) {\n")
	script.WriteString("                    switch ($bugCheckCode) {\n")
	script.WriteString("                        '0x9F' { $bugCheckMeaning = 'Power state failure' }\n")
	script.WriteString("                        '0x7E' { $bugCheckMeaning = 'Driver exception' }\n")
	script.WriteString("                        '0x50' { $bugCheckMeaning = 'Memory corruption' }\n")
	script.WriteString("                        '0x133' { $bugCheckMeaning = 'DPC watchdog violation' }\n")
	script.WriteString("                        '0x124' { $bugCheckMeaning = 'Hardware error' }\n")
	script.WriteString("                        '0x7A' { $bugCheckMeaning = 'Kernel data inpage error (storage)' }\n")
	script.WriteString("                        '0xF4' { $bugCheckMeaning = 'Critical process died' }\n")
	script.WriteString("                        '0x101' { $bugCheckMeaning = 'Clock interrupt timeout' }\n")
	script.WriteString("                        default { $bugCheckMeaning = 'Unknown bugcheck code' }\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("                \n")
	script.WriteString("                $crashList += @{\n")
	script.WriteString("                    time = $event.TimeCreated.ToString('yyyy-MM-dd HH:mm:ss')\n")
	script.WriteString("                    type = $crashType\n")
	script.WriteString("                    eventId = $event.Id\n")
	script.WriteString("                    bugCheckCode = $bugCheckCode\n")
	script.WriteString("                    bugCheckMeaning = $bugCheckMeaning\n")
	script.WriteString("                    bugCheckParams = $bugCheckParams\n")
	script.WriteString("                    faultingModule = $faultingModule\n")
	script.WriteString("                    message = if ($event.Message) { $event.Message.Substring(0, [Math]::Min(500, $event.Message.Length)) } else { 'N/A' }\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        # 2. Dump File Intelligence\n")
	script.WriteString("        $dumpInfo = @{}\n")
	script.WriteString("        try {\n")
	script.WriteString("            $crashControl = Get-ItemProperty 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\CrashControl' -ErrorAction SilentlyContinue\n")
	script.WriteString("            if ($crashControl) {\n")
	script.WriteString("                $dumpInfo['dumpEnabled'] = $true\n")
	script.WriteString("                $dumpInfo['dumpType'] = switch ($crashControl.CrashDumpEnabled) {\n")
	script.WriteString("                    0 { 'None' }\n")
	script.WriteString("                    1 { 'Complete' }\n")
	script.WriteString("                    2 { 'Kernel' }\n")
	script.WriteString("                    3 { 'Small' }\n")
	script.WriteString("                    7 { 'Automatic' }\n")
	script.WriteString("                    default { 'Unknown' }\n")
	script.WriteString("                }\n")
	script.WriteString("                $dumpInfo['dumpFile'] = $crashControl.DumpFile\n")
	script.WriteString("                $dumpInfo['minidumpDir'] = $crashControl.MinidumpDir\n")
	script.WriteString("            }\n")
	script.WriteString("            \n")
	script.WriteString("            # Check for actual dump files\n")
	script.WriteString("            $minidumpPath = if ($dumpInfo['minidumpDir']) { $dumpInfo['minidumpDir'] } else { 'C:\\Windows\\Minidump' }\n")
	script.WriteString("            if (Test-Path $minidumpPath) {\n")
	script.WriteString("                $dumpFiles = Get-ChildItem $minidumpPath -Filter '*.dmp' -ErrorAction SilentlyContinue\n")
	script.WriteString("                $dumpInfo['dumpFileCount'] = ($dumpFiles | Measure-Object).Count\n")
	script.WriteString("                $dumpInfo['latestDump'] = if ($dumpFiles) { ($dumpFiles | Sort-Object LastWriteTime -Descending | Select-Object -First 1).LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss') } else { 'None' }\n")
	script.WriteString("            } else {\n")
	script.WriteString("                $dumpInfo['dumpFileCount'] = 0\n")
	script.WriteString("                $dumpInfo['latestDump'] = 'Directory not found'\n")
	script.WriteString("            }\n")
	script.WriteString("        } catch {\n")
	script.WriteString("            $dumpInfo['dumpEnabled'] = $false\n")
	script.WriteString("            $dumpInfo['error'] = $_.Exception.Message\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        # 3. Pre-Crash Indicators (up to 2 hours before crash)\n")
	script.WriteString("        $preCrashIndicators = @()\n")
	script.WriteString("        if ($crashList.Count -gt 0) {\n")
	script.WriteString("            foreach ($crash in $crashList) {\n")
	script.WriteString("                $crashTime = [DateTime]::Parse($crash.time)\n")
	script.WriteString("                $windowStart = $crashTime.AddHours(-2)\n")
	script.WriteString("                \n")
	script.WriteString("                # Get Error and Warning level events - expanded event IDs\n")
	script.WriteString("                # Try with date filter first\n")
	script.WriteString("                $indicators = @()\n")
	script.WriteString("                try {\n")
	script.WriteString("                    $indicators = Get-WinEvent -FilterHashtable @{LogName='System'; Id=219,7000,7001,10110,10111,55,153,129,56,6008,41,1001,1074,1076,2004,2019,2020,2021,6005,6006,6009,6013,7022,7023,7024,7026,7027,7031,7032,7034,7040,7045,10016; Level=2,3; StartTime=$windowStart; EndTime=$crashTime} -ErrorAction SilentlyContinue\n")
	script.WriteString("                } catch {\n")
	script.WriteString("                    # Fallback: get all events and filter manually\n")
	script.WriteString("                    $allIndicators = Get-WinEvent -FilterHashtable @{LogName='System'; Id=219,7000,7001,10110,10111,55,153,129,56,6008,41,1001,1074,1076,2004,2019,2020,2021,6005,6006,6009,6013,7022,7023,7024,7026,7027,7031,7032,7034,7040,7045,10016; Level=2,3} -ErrorAction SilentlyContinue\n")
	script.WriteString("                    if ($allIndicators) {\n")
	script.WriteString("                        $indicators = $allIndicators | Where-Object { $_.TimeCreated -ge $windowStart -and $_.TimeCreated -le $crashTime }\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("                if ($indicators) {\n")
	script.WriteString("                    foreach ($ind in $indicators) {\n")
	script.WriteString("                        # Less restrictive filtering - only exclude obvious false positives\n")
	script.WriteString("                        $isValid = $true\n")
	script.WriteString("                        $indMessage = if ($ind.Message) { $ind.Message } else { '' }\n")
	script.WriteString("                        \n")
	script.WriteString("                        # Event 55: Exclude only CPU power management informational messages\n")
	script.WriteString("                        if ($ind.Id -eq 55) {\n")
	script.WriteString("                            if ($ind.LevelDisplayName -eq 'Information' -and $indMessage -match '(processeur|caractéristiques|gestion.*alimentation|ACPI|performance|fréquence|CPU.*power|power.*management)') {\n")
	script.WriteString("                                $isValid = $false\n")
	script.WriteString("                            }\n")
	script.WriteString("                        }\n")
	script.WriteString("                        \n")
	script.WriteString("                        # Event 153: Exclude only virtualization security informational messages\n")
	script.WriteString("                        if ($ind.Id -eq 153) {\n")
	script.WriteString("                            if ($ind.LevelDisplayName -eq 'Information' -and $indMessage -match '(sécurité.*virtualisation|virtualization.*security|disabled|désactivé)') {\n")
	script.WriteString("                                $isValid = $false\n")
	script.WriteString("                            }\n")
	script.WriteString("                        }\n")
	script.WriteString("                        \n")
	script.WriteString("                        # Skip Information level events for most IDs (keep Error/Warning)\n")
	script.WriteString("                        if ($ind.LevelDisplayName -eq 'Information' -and $ind.Id -notin @(6005,6006,6009,6013)) {\n")
	script.WriteString("                            $isValid = $false\n")
	script.WriteString("                        }\n")
	script.WriteString("                        \n")
	script.WriteString("                        if (-not $isValid) { continue }\n")
	script.WriteString("                        \n")
	script.WriteString("                        $indicatorType = switch ($ind.Id) {\n")
	script.WriteString("                            219 { 'Driver load failure' }\n")
	script.WriteString("                            7000 { 'Service start failure' }\n")
	script.WriteString("                            7001 { 'Service driver failed' }\n")
	script.WriteString("                            10110 { 'USB driver reset' }\n")
	script.WriteString("                            10111 { 'USB driver reset' }\n")
	script.WriteString("                            55 { 'NTFS/File system error' }\n")
	script.WriteString("                            153 { 'Disk I/O error' }\n")
	script.WriteString("                            129 { 'Storage timeout' }\n")
	script.WriteString("                            56 { 'Network reset' }\n")
	script.WriteString("                            6008 { 'Unexpected shutdown' }\n")
	script.WriteString("                            41 { 'System rebooted without clean shutdown' }\n")
	script.WriteString("                            1001 { 'Bugcheck/BSOD' }\n")
	script.WriteString("                            1074 { 'System shutdown' }\n")
	script.WriteString("                            1076 { 'Shutdown initiated' }\n")
	script.WriteString("                            2004 { 'Resource exhaustion' }\n")
	script.WriteString("                            2019 { 'Memory allocation failure' }\n")
	script.WriteString("                            2020 { 'Memory leak detected' }\n")
	script.WriteString("                            2021 { 'Page file saturation' }\n")
	script.WriteString("                            6005 { 'Event log service started' }\n")
	script.WriteString("                            6006 { 'Event log service stopped' }\n")
	script.WriteString("                            6009 { 'Windows version detected' }\n")
	script.WriteString("                            6013 { 'System uptime' }\n")
	script.WriteString("                            7022 { 'Service hung' }\n")
	script.WriteString("                            7023 { 'Service terminated unexpectedly' }\n")
	script.WriteString("                            7024 { 'Service failed to start' }\n")
	script.WriteString("                            7026 { 'Service boot/auto-start failed' }\n")
	script.WriteString("                            7027 { 'Service failed to load' }\n")
	script.WriteString("                            7031 { 'Service crashed' }\n")
	script.WriteString("                            7032 { 'Service stopped unexpectedly' }\n")
	script.WriteString("                            7034 { 'Service terminated unexpectedly' }\n")
	script.WriteString("                            7040 { 'Service start type changed' }\n")
	script.WriteString("                            7045 { 'Service installed' }\n")
	script.WriteString("                            10016 { 'Application error' }\n")
	script.WriteString("                            default { \"Event ID $($ind.Id)\" }\n")
	script.WriteString("                        }\n")
	script.WriteString("                        \n")
	script.WriteString("                        $preCrashIndicators += @{\n")
	script.WriteString("                            crashTime = $crash.time\n")
	script.WriteString("                            crashType = $crash.type\n")
	script.WriteString("                            indicatorTime = $ind.TimeCreated.ToString('yyyy-MM-dd HH:mm:ss')\n")
	script.WriteString("                            indicatorType = $indicatorType\n")
	script.WriteString("                            eventId = $ind.Id\n")
	script.WriteString("                            message = if ($indMessage) { $indMessage.Substring(0, [Math]::Min(300, $indMessage.Length)) } else { 'N/A' }\n")
	script.WriteString("                        }\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        # 4. WHEA (Hardware Error Telemetry) - Multiple sources\n")
	script.WriteString("        $wheaEvents = @()\n")
	script.WriteString("        try {\n")
	script.WriteString("            # Try WHEA Logger provider\n")
	script.WriteString("            $wheaLogger = Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-WHEA-Logger'; StartTime=$last180d} -ErrorAction SilentlyContinue\n")
	script.WriteString("            if ($wheaLogger) { $wheaEvents += $wheaLogger }\n")
	script.WriteString("        } catch {}\n")
	script.WriteString("        try {\n")
	script.WriteString("            # Also check for hardware errors by Event ID (18, 19, 47, etc.)\n")
	script.WriteString("            $wheaById = Get-WinEvent -FilterHashtable @{LogName='System'; Id=18,19,47,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,20,21,22,23,24,25,26,27,28,29,30; StartTime=$last180d} -ErrorAction SilentlyContinue | Where-Object { $_.ProviderName -like '*WHEA*' -or $_.Message -like '*hardware*error*' -or $_.Message -like '*WHEA*' }\n")
	script.WriteString("            if ($wheaById) { $wheaEvents += $wheaById }\n")
	script.WriteString("        } catch {}\n")
	script.WriteString("        # Remove duplicates and sort\n")
	script.WriteString("        if ($wheaEvents) {\n")
	script.WriteString("            $wheaEvents = $wheaEvents | Sort-Object TimeCreated -Unique | Sort-Object TimeCreated -Descending | Select-Object -First 1000\n")
	script.WriteString("        }\n")
	script.WriteString("        $wheaList = @()\n")
	script.WriteString("        if ($wheaEvents) {\n")
	script.WriteString("            foreach ($whea in $wheaEvents) {\n")
	script.WriteString("                $wheaType = switch ($whea.Id) {\n")
	script.WriteString("                    18 { 'CPU cache error' }\n")
	script.WriteString("                    19 { 'Memory ECC error' }\n")
	script.WriteString("                    47 { 'PCIe bus error' }\n")
	script.WriteString("                    1 { 'Machine Check Exception' }\n")
	script.WriteString("                    2 { 'Corrected hardware error' }\n")
	script.WriteString("                    3 { 'Uncorrected hardware error' }\n")
	script.WriteString("                    4 { 'Fatal hardware error' }\n")
	script.WriteString("                    default { \"WHEA Event ID $($whea.Id)\" }\n")
	script.WriteString("                }\n")
	script.WriteString("                \n")
	script.WriteString("                $wheaList += @{\n")
	script.WriteString("                    time = $whea.TimeCreated.ToString('yyyy-MM-dd HH:mm:ss')\n")
	script.WriteString("                    eventId = $whea.Id\n")
	script.WriteString("                    type = $wheaType\n")
	script.WriteString("                    message = if ($whea.Message) { $whea.Message.Substring(0, [Math]::Min(300, $whea.Message.Length)) } else { 'N/A' }\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        # 5. Memory Exhaustion Detection - Expanded search\n")
	script.WriteString("        $memoryExhaustionEvents = @()\n")
	script.WriteString("        try {\n")
	script.WriteString("            $memoryExhaustionEvents = Get-WinEvent -FilterHashtable @{LogName='System'; Id=2004,2019,2020,2021,2001,2002,2003,2005,2006,2007,2008,2009,2010,2011,2012,2013,2014,2015,2016,2017,2018; Level=2,3; StartTime=$last180d} -ErrorAction SilentlyContinue\n")
	script.WriteString("        } catch {\n")
	script.WriteString("            # Fallback: get all memory-related events\n")
	script.WriteString("            $allMemEvents = Get-WinEvent -FilterHashtable @{LogName='System'; Level=2,3; StartTime=$last180d} -ErrorAction SilentlyContinue | Where-Object { $_.Id -in @(2004,2019,2020,2021,2001,2002,2003,2005,2006,2007,2008,2009,2010,2011,2012,2013,2014,2015,2016,2017,2018) -or ($_.Message -like '*memory*' -and ($_.Message -like '*exhaustion*' -or $_.Message -like '*low*' -or $_.Message -like '*limit*' -or $_.Message -like '*failure*')) }\n")
	script.WriteString("            if ($allMemEvents) { $memoryExhaustionEvents = $allMemEvents }\n")
	script.WriteString("        }\n")
	script.WriteString("        if ($memoryExhaustionEvents) {\n")
	script.WriteString("            $memoryExhaustionEvents = $memoryExhaustionEvents | Sort-Object TimeCreated -Descending | Select-Object -First 1000\n")
	script.WriteString("        }\n")
	script.WriteString("        $memoryIssues = @()\n")
	script.WriteString("        if ($memoryExhaustionEvents) {\n")
	script.WriteString("            foreach ($memEvent in $memoryExhaustionEvents) {\n")
	script.WriteString("                $memMessage = if ($memEvent.Message) { $memEvent.Message } else { '' }\n")
	script.WriteString("                \n")
	script.WriteString("                # Less restrictive filtering - only exclude obvious false positives\n")
	script.WriteString("                if ($memEvent.Id -eq 2004) {\n")
	script.WriteString("                    # Only exclude if it's Information level AND just says logging was successful\n")
	script.WriteString("                    if ($memEvent.LevelDisplayName -eq 'Information' -and $memMessage -match '(correctement journalisées|successfully logged|informations.*journalisées|informations.*système.*exploitation)' -and $memMessage -notmatch '(exhaustion|épuisement|failure|échec|low|insuffisant|limit|limite|memory|mémoire|resource|ressource|commit|pool|handle|error|erreur)') {\n")
	script.WriteString("                        continue\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("                \n")
	script.WriteString("                $memType = switch ($memEvent.Id) {\n")
	script.WriteString("                    2004 { 'Resource Exhaustion' }\n")
	script.WriteString("                    2019 { 'Memory allocation failure' }\n")
	script.WriteString("                    2020 { 'Memory leak detected' }\n")
	script.WriteString("                    2021 { 'Page file saturation' }\n")
	script.WriteString("                    default { 'Unknown memory issue' }\n")
	script.WriteString("                }\n")
	script.WriteString("                \n")
	script.WriteString("                $memoryIssues += @{\n")
	script.WriteString("                    time = $memEvent.TimeCreated.ToString('yyyy-MM-dd HH:mm:ss')\n")
	script.WriteString("                    eventId = $memEvent.Id\n")
	script.WriteString("                    type = $memType\n")
	script.WriteString("                    message = if ($memMessage) { $memMessage.Substring(0, [Math]::Min(300, $memMessage.Length)) } else { 'N/A' }\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        # 6. Hyper-V Crash Detection - Multiple log sources\n")
	script.WriteString("        $hypervEvents = @()\n")
	script.WriteString("        try {\n")
	script.WriteString("            # Try multiple Hyper-V log names\n")
	script.WriteString("            $hypervLogs = @('Microsoft-Windows-Hyper-V-Worker/Admin', 'Microsoft-Windows-Hyper-V-VMMS/Admin', 'Microsoft-Windows-Hyper-V-Compute/Admin', 'Microsoft-Windows-Hyper-V-Network/Admin', 'Microsoft-Windows-Hyper-V-StorageVSP/Admin')\n")
	script.WriteString("            $allHypervEvents = @()\n")
	script.WriteString("            foreach ($logName in $hypervLogs) {\n")
	script.WriteString("                try {\n")
	script.WriteString("                    $logEvents = Get-WinEvent -LogName $logName -ErrorAction SilentlyContinue | Where-Object { $_.TimeCreated -ge $last180d }\n")
	script.WriteString("                    if ($logEvents) { $allHypervEvents += $logEvents }\n")
	script.WriteString("                } catch {}\n")
	script.WriteString("            }\n")
	script.WriteString("            # Also check System log for Hyper-V related errors\n")
	script.WriteString("            try {\n")
	script.WriteString("                $hypervSystemEvents = Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-Hyper-V*'; Level=2,3; StartTime=$last180d} -ErrorAction SilentlyContinue\n")
	script.WriteString("                if ($hypervSystemEvents) { $allHypervEvents += $hypervSystemEvents }\n")
	script.WriteString("            } catch {}\n")
	script.WriteString("            \n")
	script.WriteString("            if ($allHypervEvents) {\n")
	script.WriteString("                $allHypervEvents = $allHypervEvents | Sort-Object TimeCreated -Descending | Select-Object -First 1000\n")
	script.WriteString("                foreach ($hvEvent in $allHypervEvents) {\n")
	script.WriteString("                    # Include Error, Critical, and Warning levels\n")
	script.WriteString("                    if ($hvEvent.LevelDisplayName -in @('Error', 'Critical', 'Warning')) {\n")
	script.WriteString("                        $hypervEvents += @{\n")
	script.WriteString("                            time = $hvEvent.TimeCreated.ToString('yyyy-MM-dd HH:mm:ss')\n")
	script.WriteString("                            eventId = $hvEvent.Id\n")
	script.WriteString("                            level = $hvEvent.LevelDisplayName\n")
	script.WriteString("                            message = if ($hvEvent.Message) { $hvEvent.Message.Substring(0, [Math]::Min(300, $hvEvent.Message.Length)) } else { 'N/A' }\n")
	script.WriteString("                        }\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("        } catch {}\n")
	script.WriteString("        \n")
	script.WriteString("        $result['crashAnalysis'] = @{\n")
	script.WriteString("            'crashTypes' = $crashTypes\n")
	script.WriteString("            'crashes' = $crashList\n")
	script.WriteString("            'dumpInfo' = $dumpInfo\n")
	script.WriteString("            'preCrashIndicators' = $preCrashIndicators\n")
	script.WriteString("            'wheaEvents' = $wheaList\n")
	script.WriteString("            'memoryIssues' = $memoryIssues\n")
	script.WriteString("            'hypervEvents' = $hypervEvents\n")
	script.WriteString("        }\n")
	script.WriteString("    } catch {\n")
	script.WriteString("        $result['crashAnalysis'] = @{\n")
	script.WriteString("            'crashTypes' = @{'CleanReboot'=0; 'PowerLoss'=0; 'BSOD'=0; 'KernelHang'=0; 'WatchdogReset'=0; 'HyperVReset'=0}\n")
	script.WriteString("            'crashes' = @()\n")
	script.WriteString("            'dumpInfo' = @{}\n")
	script.WriteString("            'preCrashIndicators' = @()\n")
	script.WriteString("            'wheaEvents' = @()\n")
	script.WriteString("            'memoryIssues' = @()\n")
	script.WriteString("            'hypervEvents' = @()\n")
	script.WriteString("        }\n")
	script.WriteString("    }\n\n")
	script.WriteString("    # Process Tree (Advanced Process Information)\n")
	script.WriteString("    try {\n")
	script.WriteString("        Update-Progress -Step ($currentStep++) -Activity \"Collecting Process Tree\" -Status \"Gathering all running processes\"\n")
	script.WriteString("        \n")
	script.WriteString("        # Get all processes with advanced data\n")
	script.WriteString("        $rawProcesses = Get-Process -ErrorAction SilentlyContinue\n")
	script.WriteString("        $allProcesses = $rawProcesses | ForEach-Object {\n")
	script.WriteString("            $proc = $_\n")
	script.WriteString("            try {\n")
	script.WriteString("                # Get WMI process data for additional info\n")
	script.WriteString("                $wmiProc = Get-CimInstance -ClassName Win32_Process -Filter \"ProcessId = $($proc.Id)\" -ErrorAction SilentlyContinue\n")
	script.WriteString("                \n")
	script.WriteString("                # Get command line and working directory\n")
	script.WriteString("                $commandLine = if ($wmiProc -and $wmiProc.CommandLine) { $wmiProc.CommandLine } elseif ($proc.Path) { $proc.Path } else { 'N/A' }\n")
	script.WriteString("                $workingDirectory = if ($wmiProc -and $wmiProc.ExecutablePath) { $wmiProc.ExecutablePath } else { $null }\n")
	script.WriteString("                \n")
	script.WriteString("                # Get owner/user\n")
	script.WriteString("                $owner = 'N/A'\n")
	script.WriteString("                $username = 'N/A'\n")
	script.WriteString("                try {\n")
	script.WriteString("                    if ($wmiProc) {\n")
	script.WriteString("                        $ownerInfo = $wmiProc | Invoke-CimMethod -MethodName GetOwner -ErrorAction SilentlyContinue\n")
	script.WriteString("                        if ($ownerInfo -and $ownerInfo.ReturnValue -eq 0) {\n")
	script.WriteString("                            $owner = \"$($ownerInfo.Domain)\\$($ownerInfo.User)\"\n")
	script.WriteString("                            $username = $ownerInfo.User\n")
	script.WriteString("                        }\n")
	script.WriteString("                    }\n")
	script.WriteString("                } catch {}\n")
	script.WriteString("                \n")
	script.WriteString("                # Check if process is elevated (admin)\n")
	script.WriteString("                $isElevated = $false\n")
	script.WriteString("                try {\n")
	script.WriteString("                    # Check if owner is SYSTEM, Administrator, or running with elevated privileges\n")
	script.WriteString("                    if ($owner -like '*SYSTEM*' -or $owner -like '*Administrator*' -or $owner -like '*NT AUTHORITY*') {\n")
	script.WriteString("                        $isElevated = $true\n")
	script.WriteString("                    } else {\n")
	script.WriteString("                        # Try to check token elevation using WMI\n")
	script.WriteString("                        try {\n")
	script.WriteString("                            $procSec = Get-CimInstance -ClassName Win32_Process -Filter \"ProcessId = $($proc.Id)\" -Property Handle, ExecutablePath -ErrorAction SilentlyContinue\n")
	script.WriteString("                            if ($procSec) {\n")
	script.WriteString("                                # Check if process path is in system directories\n")
	script.WriteString("                                $sysPaths = @('C:\\Windows\\System32', 'C:\\Windows\\SysWOW64', 'C:\\Program Files', 'C:\\Program Files (x86)')\n")
	script.WriteString("                                $procPath = if ($proc.Path) { $proc.Path } else { '' }\n")
	script.WriteString("                                foreach ($sysPath in $sysPaths) {\n")
	script.WriteString("                                    if ($procPath -like \"$sysPath*\") {\n")
	script.WriteString("                                        $isElevated = $true\n")
	script.WriteString("                                        break\n")
	script.WriteString("                                    }\n")
	script.WriteString("                                }\n")
	script.WriteString("                            }\n")
	script.WriteString("                        } catch {}\n")
	script.WriteString("                    }\n")
	script.WriteString("                } catch {\n")
	script.WriteString("                    $isElevated = $false\n")
	script.WriteString("                }\n")
	script.WriteString("                \n")
	script.WriteString("                # Check if process is suspended (like Task Manager)\n")
	script.WriteString("                $isSuspended = $false\n")
	script.WriteString("                try {\n")
	script.WriteString("                    # Use WMI to check process execution state\n")
	script.WriteString("                    $procWMI = Get-CimInstance -ClassName Win32_Process -Filter \"ProcessId = $($proc.Id)\" -Property ExecutionState -ErrorAction SilentlyContinue\n")
	script.WriteString("                    if ($procWMI -and $procWMI.ExecutionState) {\n")
	script.WriteString("                        # ExecutionState: 0 = Unknown, 1 = Other, 2 = Ready, 3 = Running, 4 = Blocked, 5 = Suspended Blocked, 6 = Suspended Ready\n")
	script.WriteString("                        # States 5 and 6 indicate suspended\n")
	script.WriteString("                        if ($procWMI.ExecutionState -eq 5 -or $procWMI.ExecutionState -eq 6) {\n")
	script.WriteString("                            $isSuspended = $true\n")
	script.WriteString("                        }\n")
	script.WriteString("                    }\n")
	script.WriteString("                    \n")
	script.WriteString("                    # Also check threads for suspended state\n")
	script.WriteString("                    if (-not $isSuspended) {\n")
	script.WriteString("                        $threads = Get-CimInstance -ClassName Win32_Thread -Filter \"ProcessHandle = $($proc.Id)\" -Property ThreadState, ThreadWaitReason -ErrorAction SilentlyContinue\n")
	script.WriteString("                        if ($threads -and $threads.Count -gt 0) {\n")
	script.WriteString("                            # ThreadState: 0 = Initialized, 1 = Ready, 2 = Running, 3 = Standby, 4 = Terminated, 5 = Wait, 6 = Transition, 7 = Unknown\n")
	script.WriteString("                            # ThreadWaitReason: 0 = Executive, 1 = FreePage, 2 = PageIn, 3 = PoolAllocation, 4 = ExecutionDelay, 5 = Suspended, 6 = UserRequest, etc.\n")
	script.WriteString("                            # Check if all threads are in Wait state with Suspended wait reason\n")
	script.WriteString("                            $suspendedThreads = $threads | Where-Object { $_.ThreadState -eq 5 -and $_.ThreadWaitReason -eq 5 }\n")
	script.WriteString("                            if ($suspendedThreads -and $suspendedThreads.Count -gt 0) {\n")
	script.WriteString("                                # If all threads are suspended, process is suspended\n")
	script.WriteString("                                if ($suspendedThreads.Count -eq $threads.Count) {\n")
	script.WriteString("                                    $isSuspended = $true\n")
	script.WriteString("                                }\n")
	script.WriteString("                            }\n")
	script.WriteString("                        }\n")
	script.WriteString("                    }\n")
	script.WriteString("                } catch {\n")
	script.WriteString("                    # On error, don't mark as suspended\n")
	script.WriteString("                    $isSuspended = $false\n")
	script.WriteString("                }\n")
	script.WriteString("                \n")
	script.WriteString("                # Get creation time\n")
	script.WriteString("                $creationTime = if ($wmiProc -and $wmiProc.CreationDate) { $wmiProc.CreationDate } elseif ($proc.StartTime) { $proc.StartTime } else { $null }\n")
	script.WriteString("                \n")
	script.WriteString("                # Calculate CPU time\n")
	script.WriteString("                $cpuTime = if ($proc.CPU -ne $null) { [Math]::Round($proc.CPU, 2) } else { 0 }\n")
	script.WriteString("                \n")
	script.WriteString("                # Get memory info\n")
	script.WriteString("                $workingSet = if ($proc.WorkingSet64) { [Math]::Round($proc.WorkingSet64 / 1MB, 2) } else { 0 }\n")
	script.WriteString("                $privateMemory = if ($proc.PrivateMemorySize64) { [Math]::Round($proc.PrivateMemorySize64 / 1MB, 2) } else { 0 }\n")
	script.WriteString("                $virtualMemory = if ($proc.VirtualMemorySize64) { [Math]::Round($proc.VirtualMemorySize64 / 1MB, 2) } else { 0 }\n")
	script.WriteString("                $pagedMemory = if ($proc.PagedMemorySize64) { [Math]::Round($proc.PagedMemorySize64 / 1MB, 2) } else { 0 }\n")
	script.WriteString("                \n")
	script.WriteString("                # Get handle and thread count\n")
	script.WriteString("                $handleCount = if ($proc.HandleCount) { $proc.HandleCount } else { 0 }\n")
	script.WriteString("                $threadCount = if ($proc.Threads -and $proc.Threads.Count) { $proc.Threads.Count } else { 0 }\n")
	script.WriteString("                \n")
	script.WriteString("                # Get priority\n")
	script.WriteString("                $priority = if ($proc.PriorityClass) { $proc.PriorityClass.ToString() } else { 'Normal' }\n")
	script.WriteString("                \n")
	script.WriteString("                # Get parent process ID\n")
	script.WriteString("                $parentId = if ($wmiProc -and $wmiProc.ParentProcessId) { $wmiProc.ParentProcessId } else { $null }\n")
	script.WriteString("                \n")
	script.WriteString("                $procObj = [PSCustomObject]@{\n")
	script.WriteString("                    id = $proc.Id\n")
	script.WriteString("                    name = $proc.Name\n")
	script.WriteString("                    parentId = $parentId\n")
	script.WriteString("                    path = if ($proc.Path) { $proc.Path } else { 'N/A' }\n")
	script.WriteString("                    commandLine = if ($commandLine) { $commandLine } else { 'N/A' }\n")
	script.WriteString("                    workingDirectory = if ($workingDirectory) { $workingDirectory } else { 'N/A' }\n")
	script.WriteString("                    owner = $owner\n")
	script.WriteString("                    username = $username\n")
	script.WriteString("                    isElevated = $isElevated\n")
	script.WriteString("                    isSuspended = $isSuspended\n")
	script.WriteString("                    creationTime = if ($creationTime) { $creationTime.ToString('yyyy-MM-dd HH:mm:ss') } else { 'N/A' }\n")
	script.WriteString("                    cpuTime = $cpuTime\n")
	script.WriteString("                    cpuPercent = 0  # Will be calculated separately\n")
	script.WriteString("                    workingSetMB = $workingSet\n")
	script.WriteString("                    privateMemoryMB = $privateMemory\n")
	script.WriteString("                    virtualMemoryMB = $virtualMemory\n")
	script.WriteString("                    pagedMemoryMB = $pagedMemory\n")
	script.WriteString("                    handleCount = $handleCount\n")
	script.WriteString("                    threadCount = $threadCount\n")
	script.WriteString("                    priority = $priority\n")
	script.WriteString("                    status = if ($isSuspended) { 'Suspended' } elseif ($proc.Responding) { 'Running' } else { 'Not Responding' }\n")
	script.WriteString("                    children = @()  # Will be populated later\n")
	script.WriteString("                }\n")
	script.WriteString("                return $procObj\n")
	script.WriteString("            } catch {\n")
	script.WriteString("                # Fallback for processes we can't fully query\n")
	script.WriteString("                $procObj = [PSCustomObject]@{\n")
	script.WriteString("                    id = $proc.Id\n")
	script.WriteString("                    name = $proc.Name\n")
	script.WriteString("                    parentId = $null\n")
	script.WriteString("                    path = if ($proc.Path) { $proc.Path } else { 'N/A' }\n")
	script.WriteString("                    commandLine = 'N/A'\n")
	script.WriteString("                    workingDirectory = 'N/A'\n")
	script.WriteString("                    owner = 'N/A'\n")
	script.WriteString("                    username = 'N/A'\n")
	script.WriteString("                    isElevated = $false\n")
	script.WriteString("                    isSuspended = -not $proc.Responding\n")
	script.WriteString("                    creationTime = if ($proc.StartTime) { $proc.StartTime.ToString('yyyy-MM-dd HH:mm:ss') } else { 'N/A' }\n")
	script.WriteString("                    cpuTime = 0\n")
	script.WriteString("                    cpuPercent = 0\n")
	script.WriteString("                    workingSetMB = if ($proc.WorkingSet64) { [Math]::Round($proc.WorkingSet64 / 1MB, 2) } else { 0 }\n")
	script.WriteString("                    privateMemoryMB = if ($proc.PrivateMemorySize64) { [Math]::Round($proc.PrivateMemorySize64 / 1MB, 2) } else { 0 }\n")
	script.WriteString("                    virtualMemoryMB = if ($proc.VirtualMemorySize64) { [Math]::Round($proc.VirtualMemorySize64 / 1MB, 2) } else { 0 }\n")
	script.WriteString("                    pagedMemoryMB = if ($proc.PagedMemorySize64) { [Math]::Round($proc.PagedMemorySize64 / 1MB, 2) } else { 0 }\n")
	script.WriteString("                    handleCount = if ($proc.HandleCount) { $proc.HandleCount } else { 0 }\n")
	script.WriteString("                    threadCount = if ($proc.Threads -and $proc.Threads.Count) { $proc.Threads.Count } else { 0 }\n")
	script.WriteString("                    priority = if ($proc.PriorityClass) { $proc.PriorityClass.ToString() } else { 'Normal' }\n")
	script.WriteString("                    status = if ($isSuspended) { 'Suspended' } elseif ($proc.Responding) { 'Running' } else { 'Not Responding' }\n")
	script.WriteString("                    children = @()\n")
	script.WriteString("                }\n")
	script.WriteString("                return $procObj\n")
	script.WriteString("            }\n")
	script.WriteString("        } | Where-Object { $_ -ne $null }\n")
	script.WriteString("        \n")
	script.WriteString("        # Calculate CPU percentage (requires two samples)\n")
	script.WriteString("        $cpuCounter = @{}\n")
	script.WriteString("        $firstSample = Get-Counter \"\\Process(*)\\% Processor Time\" -ErrorAction SilentlyContinue\n")
	script.WriteString("        Start-Sleep -Milliseconds 500\n")
	script.WriteString("        $secondSample = Get-Counter \"\\Process(*)\\% Processor Time\" -ErrorAction SilentlyContinue\n")
	script.WriteString("        \n")
	script.WriteString("        if ($firstSample -and $secondSample) {\n")
	script.WriteString("            $firstSample.CounterSamples | ForEach-Object {\n")
	script.WriteString("                $procName = $_.InstanceName\n")
	script.WriteString("                $cpuCounter[$procName] = @{ first = $_.CookedValue }\n")
	script.WriteString("            }\n")
	script.WriteString("            $secondSample.CounterSamples | ForEach-Object {\n")
	script.WriteString("                $procName = $_.InstanceName\n")
	script.WriteString("                if ($cpuCounter.ContainsKey($procName)) {\n")
	script.WriteString("                    $cpuCounter[$procName]['second'] = $_.CookedValue\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        # Verify we have processes\n")
	script.WriteString("        if ($allProcesses.Count -eq 0) {\n")
	script.WriteString("            $result['processTree'] = @{\n")
	script.WriteString("                'summary' = @{'totalProcesses' = 0; 'totalThreads' = 0; 'totalHandles' = 0; 'totalMemoryMB' = 0; 'totalCpuPercent' = 0}\n")
	script.WriteString("                'processes' = @()\n")
	script.WriteString("            }\n")
	script.WriteString("        } else {\n")
	script.WriteString("        \n")
	script.WriteString("        # Build process tree (parent-child relationships)\n")
	script.WriteString("        $processMap = @{}\n")
	script.WriteString("        $rootProcesses = @()\n")
	script.WriteString("        \n")
	script.WriteString("        # Create map of all processes\n")
	script.WriteString("        foreach ($proc in $allProcesses) {\n")
	script.WriteString("            $procName = $proc.name\n")
	script.WriteString("            if ($cpuCounter.ContainsKey($procName)) {\n")
	script.WriteString("                $cpuPercent = [Math]::Abs($cpuCounter[$procName]['second'] - $cpuCounter[$procName]['first'])\n")
	script.WriteString("                $proc.cpuPercent = [Math]::Round($cpuPercent, 2)\n")
	script.WriteString("            }\n")
	script.WriteString("            $processMap[$proc.id] = $proc\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        # Build tree structure\n")
	script.WriteString("        foreach ($proc in $allProcesses) {\n")
	script.WriteString("            if ($proc.parentId -and $processMap.ContainsKey($proc.parentId)) {\n")
	script.WriteString("                $parent = $processMap[$proc.parentId]\n")
	script.WriteString("                if ($parent.children -eq $null) {\n")
	script.WriteString("                    $parent.children = @()\n")
	script.WriteString("                }\n")
	script.WriteString("                $parent.children += $proc\n")
	script.WriteString("            } else {\n")
	script.WriteString("                $rootProcesses += $proc\n")
	script.WriteString("            }\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        # Sort processes by CPU usage (descending)\n")
	script.WriteString("        function Sort-ProcessTree($processes) {\n")
	script.WriteString("            $sorted = $processes | Sort-Object -Property cpuPercent -Descending\n")
	script.WriteString("            foreach ($proc in $sorted) {\n")
	script.WriteString("                if ($proc.children.Count -gt 0) {\n")
	script.WriteString("                    $proc.children = Sort-ProcessTree $proc.children\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("            return $sorted\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        $sortedRootProcesses = Sort-ProcessTree $rootProcesses\n")
	script.WriteString("        \n")
	script.WriteString("        # Convert to array format for JSON\n")
	script.WriteString("        function Convert-ProcessToArray($processes) {\n")
	script.WriteString("            $result = @()\n")
	script.WriteString("            foreach ($proc in $processes) {\n")
	script.WriteString("                $procArray = @{\n")
	script.WriteString("                    id = $proc.id\n")
	script.WriteString("                    name = $proc.name\n")
	script.WriteString("                    parentId = $proc.parentId\n")
	script.WriteString("                    path = $proc.path\n")
	script.WriteString("                    commandLine = $proc.commandLine\n")
	script.WriteString("                    workingDirectory = $proc.workingDirectory\n")
	script.WriteString("                    owner = $proc.owner\n")
	script.WriteString("                    username = $proc.username\n")
	script.WriteString("                    isElevated = $proc.isElevated\n")
	script.WriteString("                    isSuspended = $proc.isSuspended\n")
	script.WriteString("                    creationTime = $proc.creationTime\n")
	script.WriteString("                    cpuTime = $proc.cpuTime\n")
	script.WriteString("                    cpuPercent = $proc.cpuPercent\n")
	script.WriteString("                    workingSetMB = $proc.workingSetMB\n")
	script.WriteString("                    privateMemoryMB = $proc.privateMemoryMB\n")
	script.WriteString("                    virtualMemoryMB = $proc.virtualMemoryMB\n")
	script.WriteString("                    pagedMemoryMB = $proc.pagedMemoryMB\n")
	script.WriteString("                    handleCount = $proc.handleCount\n")
	script.WriteString("                    threadCount = $proc.threadCount\n")
	script.WriteString("                    priority = $proc.priority\n")
	script.WriteString("                    status = $proc.status\n")
	script.WriteString("                    children = if ($proc.children.Count -gt 0) { Convert-ProcessToArray $proc.children } else { @() }\n")
	script.WriteString("                }\n")
	script.WriteString("                $result += $procArray\n")
	script.WriteString("            }\n")
	script.WriteString("            return $result\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        $processTree = Convert-ProcessToArray $sortedRootProcesses\n")
	script.WriteString("        \n")
	script.WriteString("        # Get summary statistics\n")
	script.WriteString("        $totalProcesses = $allProcesses.Count\n")
	script.WriteString("        $totalThreads = ($allProcesses | Measure-Object -Property threadCount -Sum).Sum\n")
	script.WriteString("        $totalHandles = ($allProcesses | Measure-Object -Property handleCount -Sum).Sum\n")
	script.WriteString("        $totalMemoryMB = [Math]::Round(($allProcesses | Measure-Object -Property workingSetMB -Sum).Sum, 2)\n")
	script.WriteString("        $totalCpuPercent = [Math]::Round(($allProcesses | Measure-Object -Property cpuPercent -Sum).Sum, 2)\n")
	script.WriteString("        \n")
	script.WriteString("        \n")
	script.WriteString("        $result['processTree'] = @{\n")
	script.WriteString("            'summary' = @{\n")
	script.WriteString("                'totalProcesses' = $totalProcesses\n")
	script.WriteString("                'totalThreads' = $totalThreads\n")
	script.WriteString("                'totalHandles' = $totalHandles\n")
	script.WriteString("                'totalMemoryMB' = $totalMemoryMB\n")
	script.WriteString("                'totalCpuPercent' = $totalCpuPercent\n")
	script.WriteString("            }\n")
	script.WriteString("            'processes' = $processTree\n")
	script.WriteString("        }\n")
	script.WriteString("        }\n")
	script.WriteString("    } catch {\n")
	script.WriteString("        $result['processTree'] = @{\n")
	script.WriteString("            'error' = $_.Exception.Message\n")
	script.WriteString("            'summary' = @{}\n")
	script.WriteString("            'processes' = @()\n")
	script.WriteString("        }\n")
	script.WriteString("    }\n\n")
	script.WriteString("    # Event Logs (Recent Errors and Warnings)\n")
	script.WriteString("    $errorLogs = Get-EventLog -LogName System -Newest 50 -EntryType Error | Select-Object TimeGenerated, Source, Message -First 10\n")
	script.WriteString("    $warningLogs = Get-EventLog -LogName System -Newest 50 -EntryType Warning | Select-Object TimeGenerated, Source, Message -First 10\n")
	script.WriteString("    $result['eventLogs'] = @{\n")
	script.WriteString("        'recentErrors' = @($errorLogs | ForEach-Object {\n")
	script.WriteString("            @{\n")
	script.WriteString("                'timeGenerated' = $_.TimeGenerated.ToString('yyyy-MM-dd HH:mm:ss')\n")
	script.WriteString("                'source' = $_.Source\n")
	script.WriteString("                'message' = $_.Message.Substring(0, [Math]::Min(200, $_.Message.Length))\n")
	script.WriteString("            }\n")
	script.WriteString("        })\n")
	script.WriteString("        'recentWarnings' = @($warningLogs | ForEach-Object {\n")
	script.WriteString("            @{\n")
	script.WriteString("                'timeGenerated' = $_.TimeGenerated.ToString('yyyy-MM-dd HH:mm:ss')\n")
	script.WriteString("                'source' = $_.Source\n")
	script.WriteString("                'message' = $_.Message.Substring(0, [Math]::Min(200, $_.Message.Length))\n")
	script.WriteString("            }\n")
	script.WriteString("        })\n")
	script.WriteString("    }\n\n")

	script.WriteString("    # IIS Configuration (if installed)\n")
	script.WriteString("    if (Get-WindowsFeature -Name Web-Server -ErrorAction SilentlyContinue | Where-Object { $_.InstallState -eq 'Installed' }) {\n")
	script.WriteString("        try {\n")
	script.WriteString("            Import-Module WebAdministration -ErrorAction SilentlyContinue\n")
	script.WriteString("            $sites = Get-Website\n")
	script.WriteString("            $result['iis'] = @{\n")
	script.WriteString("                'installed' = $true\n")
	script.WriteString("                'sites' = @($sites | ForEach-Object {\n")
	script.WriteString("                    @{\n")
	script.WriteString("                        'name' = $_.Name\n")
	script.WriteString("                        'state' = $_.State.ToString()\n")
	script.WriteString("                        'bindings' = @($_.Bindings | ForEach-Object { $_.Protocol + '://' + $_.BindingInformation })\n")
	script.WriteString("                    }\n")
	script.WriteString("                })\n")
	script.WriteString("            }\n")
	script.WriteString("        } catch {\n")
	script.WriteString("            $result['iis'] = @{ 'installed' = $true; 'error' = $_.Exception.Message }\n")
	script.WriteString("        }\n")
	script.WriteString("    } else {\n")
	script.WriteString("        $result['iis'] = @{ 'installed' = $false }\n")
	script.WriteString("    }\n\n")

	script.WriteString("    # SQL Server Instances (if installed)\n")
	script.WriteString("    try {\n")
	script.WriteString("        $sqlInstances = Get-Service | Where-Object { $_.Name -like 'MSSQL*' -or $_.DisplayName -like '*SQL Server*' }\n")
	script.WriteString("        if ($sqlInstances) {\n")
	script.WriteString("            $result['sqlServer'] = @{\n")
	script.WriteString("                'installed' = $true\n")
	script.WriteString("                'instances' = @($sqlInstances | ForEach-Object {\n")
	script.WriteString("                    @{\n")
	script.WriteString("                        'name' = $_.Name\n")
	script.WriteString("                        'displayName' = $_.DisplayName\n")
	script.WriteString("                        'status' = $_.Status.ToString()\n")
	script.WriteString("                    }\n")
	script.WriteString("                })\n")
	script.WriteString("            }\n")
	script.WriteString("        } else {\n")
	script.WriteString("            $result['sqlServer'] = @{ 'installed' = $false }\n")
	script.WriteString("        }\n")
	script.WriteString("    } catch {\n")
	script.WriteString("        $result['sqlServer'] = @{ 'installed' = $false; 'error' = $_.Exception.Message }\n")
	script.WriteString("    }\n\n")

	script.WriteString("    # Active Directory (if domain controller)\n")
	script.WriteString("    if ($computer.DomainRole -ge 3) {\n")
	script.WriteString("        try {\n")
	script.WriteString("            Import-Module ActiveDirectory -ErrorAction SilentlyContinue\n")
	script.WriteString("            $domain = Get-ADDomain -ErrorAction SilentlyContinue\n")
	script.WriteString("            if ($domain) {\n")
	script.WriteString("                $result['activeDirectory'] = @{\n")
	script.WriteString("                    'isDomainController' = $true\n")
	script.WriteString("                    'domainName' = $domain.DNSRoot\n")
	script.WriteString("                    'domainNetBIOSName' = $domain.NetBIOSName\n")
	script.WriteString("                    'forestName' = $domain.Forest\n")
	script.WriteString("                }\n")
	script.WriteString("            }\n")
	script.WriteString("        } catch {\n")
	script.WriteString("            $result['activeDirectory'] = @{ 'isDomainController' = $true; 'error' = $_.Exception.Message }\n")
	script.WriteString("        }\n")
	script.WriteString("    } else {\n")
	script.WriteString("        $result['activeDirectory'] = @{ 'isDomainController' = $false }\n")
	script.WriteString("    }\n\n")

	script.WriteString("    Update-Progress -Step ($currentStep++) -Activity \"Collecting Certificates\" -Status \"Enumerating all certificates from all stores\"\n")
	script.WriteString("    # Certificate Inventory\n")
	script.WriteString("    try {\n")
	script.WriteString("        $allCertificates = @()\n")
	script.WriteString("        $userCertificates = @()\n")
	script.WriteString("        $trustedRootCertificates = @()\n")
	script.WriteString("        $intermediateCAs = @()\n")
	script.WriteString("        $expiredCertificates = @()\n")
	script.WriteString("        \n")
	script.WriteString("        # Get all certificate stores\n")
	script.WriteString("        $certStores = @('Cert:\\LocalMachine\\Root', 'Cert:\\LocalMachine\\CA', 'Cert:\\LocalMachine\\My', 'Cert:\\CurrentUser\\Root', 'Cert:\\CurrentUser\\CA', 'Cert:\\CurrentUser\\My')\n")
	script.WriteString("        \n")
	script.WriteString("        foreach ($storePath in $certStores) {\n")
	script.WriteString("            try {\n")
	script.WriteString("                $certificates = Get-ChildItem -Path $storePath -ErrorAction SilentlyContinue\n")
	script.WriteString("                foreach ($cert in $certificates) {\n")
	script.WriteString("                    try {\n")
	script.WriteString("                        # Get certificate object from certificate store\n")
	script.WriteString("                        $certItem = Get-Item -Path $cert.PSPath -ErrorAction SilentlyContinue\n")
	script.WriteString("                        if (-not $certItem) { continue }\n")
	script.WriteString("                        \n")
	script.WriteString("                        # Create X509Certificate2 object from certificate bytes\n")
	script.WriteString("                        try {\n")
	script.WriteString("                            $certBytes = $certItem.GetRawCertData()\n")
	script.WriteString("                            if (-not $certBytes) { continue }\n")
	script.WriteString("                            $certObj = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($certBytes)\n")
	script.WriteString("                        } catch {\n")
	script.WriteString("                            # Alternative method: use the certificate directly\n")
	script.WriteString("                            $certObj = $certItem\n")
	script.WriteString("                        }\n")
	script.WriteString("                        \n")
	script.WriteString("                        # Determine certificate type\n")
	script.WriteString("                        $isUserCert = $storePath -like '*CurrentUser*'\n")
	script.WriteString("                        $isRootCert = $storePath -like '*Root*'\n")
	script.WriteString("                        $isIntermediateCA = $storePath -like '*CA*' -and -not $isRootCert\n")
	script.WriteString("                        $isExpired = $certObj.NotAfter -lt (Get-Date)\n")
	script.WriteString("                        \n")
	script.WriteString("                        $certInfo = @{\n")
	script.WriteString("                            'subject' = if ($certObj.Subject) { $certObj.Subject } else { 'N/A' }\n")
	script.WriteString("                            'issuer' = if ($certObj.Issuer) { $certObj.Issuer } else { 'N/A' }\n")
	script.WriteString("                            'thumbprint' = if ($certObj.Thumbprint) { $certObj.Thumbprint } else { 'N/A' }\n")
	script.WriteString("                            'serialNumber' = if ($certObj.SerialNumber) { $certObj.SerialNumber } else { 'N/A' }\n")
	script.WriteString("                            'notBefore' = if ($certObj.NotBefore) { $certObj.NotBefore.ToString('yyyy-MM-dd HH:mm:ss') } else { 'N/A' }\n")
	script.WriteString("                            'notAfter' = if ($certObj.NotAfter) { $certObj.NotAfter.ToString('yyyy-MM-dd HH:mm:ss') } else { 'N/A' }\n")
	script.WriteString("                            'storeLocation' = if ($storePath -like '*LocalMachine*') { 'LocalMachine' } else { 'CurrentUser' }\n")
	script.WriteString("                            'storeName' = if ($storePath -like '*Root*') { 'Root' } elseif ($storePath -like '*CA*') { 'CA' } else { 'My' }\n")
	script.WriteString("                            'friendlyName' = if ($certObj.FriendlyName) { $certObj.FriendlyName } else { 'N/A' }\n")
	script.WriteString("                            'hasPrivateKey' = if ($certObj.HasPrivateKey) { $true } else { $false }\n")
	script.WriteString("                            'isExpired' = $isExpired\n")
	script.WriteString("                            'daysUntilExpiry' = if (-not $isExpired -and $certObj.NotAfter) { [math]::Round(($certObj.NotAfter - (Get-Date)).TotalDays) } else { 0 }\n")
	script.WriteString("                            'keyAlgorithm' = if ($certObj.SignatureAlgorithm) { $certObj.SignatureAlgorithm.FriendlyName } else { 'N/A' }\n")
	script.WriteString("                            'keySize' = if ($certObj.PublicKey) { $certObj.PublicKey.Key.KeySize } else { 'N/A' }\n")
	script.WriteString("                            'version' = if ($certObj.Version) { $certObj.Version } else { 'N/A' }\n")
	script.WriteString("                        }\n")
	script.WriteString("                        \n")
	script.WriteString("                        $allCertificates += $certInfo\n")
	script.WriteString("                        \n")
	script.WriteString("                        # Categorize certificates\n")
	script.WriteString("                        if ($isUserCert) {\n")
	script.WriteString("                            $userCertificates += $certInfo\n")
	script.WriteString("                        }\n")
	script.WriteString("                        if ($isRootCert) {\n")
	script.WriteString("                            $trustedRootCertificates += $certInfo\n")
	script.WriteString("                        }\n")
	script.WriteString("                        if ($isIntermediateCA) {\n")
	script.WriteString("                            $intermediateCAs += $certInfo\n")
	script.WriteString("                        }\n")
	script.WriteString("                        if ($isExpired) {\n")
	script.WriteString("                            $expiredCertificates += $certInfo\n")
	script.WriteString("                        }\n")
	script.WriteString("                    } catch {\n")
	script.WriteString("                        # Skip this certificate if there's an error\n")
	script.WriteString("                    }\n")
	script.WriteString("                }\n")
	script.WriteString("            } catch {\n")
	script.WriteString("                # Skip this store if there's an error\n")
	script.WriteString("            }\n")
	script.WriteString("        }\n")
	script.WriteString("        \n")
	script.WriteString("        $result['certificates'] = @{\n")
	script.WriteString("            'allCertificates' = $allCertificates\n")
	script.WriteString("            'userCertificates' = $userCertificates\n")
	script.WriteString("            'trustedRootCertificates' = $trustedRootCertificates\n")
	script.WriteString("            'intermediateCAs' = $intermediateCAs\n")
	script.WriteString("            'expiredCertificates' = $expiredCertificates\n")
	script.WriteString("            'totalCertificates' = $allCertificates.Count\n")
	script.WriteString("            'totalUserCertificates' = $userCertificates.Count\n")
	script.WriteString("            'totalTrustedRootCertificates' = $trustedRootCertificates.Count\n")
	script.WriteString("            'totalIntermediateCAs' = $intermediateCAs.Count\n")
	script.WriteString("            'totalExpiredCertificates' = $expiredCertificates.Count\n")
	script.WriteString("        }\n")
	script.WriteString("    } catch {\n")
	script.WriteString("        $result['certificates'] = @{\n")
	script.WriteString("            'allCertificates' = @()\n")
	script.WriteString("            'userCertificates' = @()\n")
	script.WriteString("            'trustedRootCertificates' = @()\n")
	script.WriteString("            'intermediateCAs' = @()\n")
	script.WriteString("            'expiredCertificates' = @()\n")
	script.WriteString("            'totalCertificates' = 0\n")
	script.WriteString("            'totalUserCertificates' = 0\n")
	script.WriteString("            'totalTrustedRootCertificates' = 0\n")
	script.WriteString("            'totalIntermediateCAs' = 0\n")
	script.WriteString("            'totalExpiredCertificates' = 0\n")
	script.WriteString("        }\n")
	script.WriteString("    }\n\n")

	script.WriteString("    # Add metadata\n")
	script.WriteString("    $result['auditDate'] = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')\n")
	script.WriteString("    $result['serverName'] = $computer.Name\n\n")

	script.WriteString("} catch {\n")
	script.WriteString("    $result['error'] = $_.Exception.Message\n")
	script.WriteString("    $result['errorDetails'] = $_.Exception.ToString()\n")
	script.WriteString("}\n\n")

	script.WriteString("Update-Progress -Step ($currentStep++) -Activity \"Finalizing\" -Status \"Converting data to JSON and saving\"\n")
	script.WriteString("Write-Host \"\"\n")
	script.WriteString("# Convert to JSON and save output\n")
	script.WriteString("$outputFile = \"WindowsServerAudit_$(Get-Date -Format 'yyyyMMdd_HHmmss').json\"\n")
	script.WriteString("$json = $result | ConvertTo-Json -Depth 10 -Compress\n")
	script.WriteString("# Use .NET method to write UTF-8 without BOM\n")
	script.WriteString("$utf8NoBom = New-Object System.Text.UTF8Encoding $false\n")
	script.WriteString("$fullPath = Join-Path (Get-Location).Path $outputFile\n")
	if encrypt {
		script.WriteString("$encryptedData = Encrypt-Data -Data $json -PublicKeyBase64 $pubKeyB64\n")
		script.WriteString("if (-not $encryptedData) {\n")
		script.WriteString("    Write-Error \"Failed to encrypt data\"\n")
		script.WriteString("    exit 1\n")
		script.WriteString("}\n")
		script.WriteString("try {\n")
		script.WriteString("    [System.IO.File]::WriteAllText($fullPath, $encryptedData, $utf8NoBom)\n")
		script.WriteString("} catch {\n")
		script.WriteString("    Write-Error \"Failed to save file: $_\"\n")
		script.WriteString("    exit 1\n")
		script.WriteString("}\n")
		script.WriteString("Write-Host \"Encrypted report data saved to: $outputFile\"\n")
	} else {
		script.WriteString("try {\n")
		script.WriteString("    [System.IO.File]::WriteAllText($fullPath, $json, $utf8NoBom)\n")
		script.WriteString("} catch {\n")
		script.WriteString("    Write-Error \"Failed to save file: $_\"\n")
		script.WriteString("    exit 1\n")
		script.WriteString("}\n")
		script.WriteString("Write-Host \"Plain report data saved to: $outputFile\"\n")
		script.WriteString("Write-Warning \"Report contains unencrypted data.\"\n")
	}
	script.WriteString("Write-Host \"File location: $(Resolve-Path $fullPath)\"\n")

	return script.String()
}

// HandleImportWindowsServerReport imports JSON data from a file
func HandleImportWindowsServerReport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse multipart form
	err := r.ParseMultipartForm(10 << 20) // 10 MB max
	if err != nil {
		http.Error(w, "Error parsing form: "+err.Error(), http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Error retrieving file: "+err.Error(), http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Check file extension
	if !strings.HasSuffix(strings.ToLower(header.Filename), ".json") {
		http.Error(w, "File must be a JSON file", http.StatusBadRequest)
		return
	}

	// Read file content
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		http.Error(w, "Error reading file: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Remove UTF-8 BOM if present
	fileBytes = bytes.TrimPrefix(fileBytes, []byte{0xEF, 0xBB, 0xBF})
	fileBytes = bytes.TrimSpace(fileBytes)

	// Get report ID from form
	reportID := r.FormValue("reportId")
	if reportID == "" {
		http.Error(w, "Report ID required", http.StatusBadRequest)
		return
	}

	rawJSON := strings.TrimSpace(string(fileBytes))

	// Parse JSON - try plain first, then encrypted
	var reportData map[string]interface{}
	var plainCandidate map[string]interface{}
	if err := json.Unmarshal([]byte(rawJSON), &plainCandidate); err == nil {
		if !utils.IsEncryptedPayload(plainCandidate) {
			reportData = plainCandidate
		}
	}

	if reportData == nil {
		// Encrypted payload path - requires private key from the report
		var privateKeyPEM sql.NullString
		err = database.DB.QueryRow(`
			SELECT private_key 
			FROM windows_server_reports 
			WHERE id = ?
		`, reportID).Scan(&privateKeyPEM)

		if err != nil {
			if err == sql.ErrNoRows {
				http.Error(w, "Report not found", http.StatusNotFound)
			} else {
				http.Error(w, "Error retrieving private key: "+err.Error(), http.StatusInternalServerError)
			}
			return
		}

		if !privateKeyPEM.Valid || privateKeyPEM.String == "" {
			http.Error(w, "Private key not found for this report. The encrypted data must be imported using the script generated for this specific report. Please regenerate the script and run it again.", http.StatusBadRequest)
			return
		}

		decryptedData, err := utils.DecryptData(rawJSON, privateKeyPEM.String)
		if err != nil {
			log.Printf("Error decrypting imported data: %v", err)
			http.Error(w, "Failed to decrypt data. The encrypted file may have been generated with a different key pair. Please ensure you are importing data from the script generated for this specific report: "+err.Error(), http.StatusBadRequest)
			return
		}

		if err := json.Unmarshal([]byte(decryptedData), &reportData); err != nil {
			http.Error(w, "Invalid JSON after decryption: "+err.Error(), http.StatusBadRequest)
			return
		}
	}

	// Convert report data to JSON string (always store as plain JSON after decryption)
	reportDataJSON, err := json.Marshal(reportData)
	if err != nil {
		http.Error(w, "Error encoding report data: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Update report with data
	_, err = database.DB.Exec(`
		UPDATE windows_server_reports 
		SET report_data = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, string(reportDataJSON), reportID)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Return success with the imported data
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    reportData,
	})
}

// migrateWindowsServerReportsTable adds missing columns to windows_server_reports table
func migrateWindowsServerReportsTable() error {
	// Check if private_key column exists
	var count int
	err := database.DB.QueryRow("SELECT COUNT(*) FROM pragma_table_info('windows_server_reports') WHERE name='private_key'").Scan(&count)
	if err != nil || count == 0 {
		// Add private_key column
		_, err = database.DB.Exec("ALTER TABLE windows_server_reports ADD COLUMN private_key TEXT")
		if err != nil && !strings.Contains(err.Error(), "duplicate column") {
			return err
		}
		log.Printf("Added private_key column to windows_server_reports table")
	}
	return nil
}
