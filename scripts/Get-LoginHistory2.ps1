# Get-LoginHistory.ps1
# Retrieves login history for all session types from the Security Event Log

param (
    [int]$Days
)

# Custom color scheme
$HeaderColor = "Cyan"
$UserColor = "Green"
$RDPColor = "Yellow"
$InteractiveColor = "Cyan"
$NetworkColor = "Gray"
$SystemColor = "DarkGray"

# Ask for Days if not provided
if (-not $Days) {
    Write-Host "Please enter the number of days to check for login history:" -ForegroundColor $HeaderColor -NoNewline
    $Days = Read-Host " "
    if (-not $Days) { $Days = 30; Write-Host "Defaulting to 30 days." -ForegroundColor DarkGray }
}

# Hash table to map LogonType to description
$LogonTypes = @{
    '0' = 'System'
    '2' = 'Interactive (Local)'
    '3' = 'Network'
    '4' = 'Batch'
    '5' = 'Service'
    '7' = 'Unlock'
    '8' = 'NetworkCleartext'
    '9' = 'NewCredentials'
    '10' = 'RemoteInteractive (RDP)'
    '11' = 'CachedInteractive'
}

try {
    # Calculate the start date
    $StartDate = (Get-Date).AddDays(-$Days)

    # Define the filter for Get-WinEvent
    $Filter = @{
        LogName = 'Security'
        ID = 4624
        StartTime = $StartDate
    }

    Write-Host "`nQuerying Security Event Log for all successful logons (Event ID 4624) in the last $Days days..." -ForegroundColor $HeaderColor

    $Events = Get-WinEvent -FilterHashtable $Filter -ErrorAction Stop

    $LoginHistory = @()

    foreach ($Event in $Events) {
        $Xml = [xml]$Event.ToXml()
        $EventData = $Xml.Event.EventData.Data
        $GetData = { param($Name) ($EventData | Where-Object { $_.Name -eq $Name }).'#text' }

        $LogonType = &$GetData 'LogonType'
        $User = &$GetData 'TargetUserName'
        $Domain = &$GetData 'TargetDomainName'
        $SourceIP = &$GetData 'IpAddress'
        $LogonGuid = &$GetData 'LogonGuid'
        
        $LogonTypeDesc = if ($LogonTypes.ContainsKey($LogonType)) { $LogonTypes[$LogonType] } else { "Unknown ($LogonType)" }

        $LoginHistory += [PSCustomObject]@{
            Time = $Event.TimeCreated
            User = "$Domain\$User"
            SourceIP = $SourceIP
            LogonType = $LogonType
            LogonTypeDesc = $LogonTypeDesc
            EventID = $Event.Id
        }
    }

    if ($LoginHistory.Count -eq 0) {
        Write-Host "No login events found in the last $Days days." -ForegroundColor Yellow
    } else {
        Write-Host "`nFound $($LoginHistory.Count) login events.`n" -ForegroundColor Green
        
        # Display Header
        Write-Host ("{0,-25} {1,-30} {2,-30} {3,-20}" -f "Time", "User", "Logon Type", "Source IP") -ForegroundColor White -BackgroundColor DarkBlue
        Write-Host ("-" * 105) -ForegroundColor DarkGray

        # Display Rows with Colors
        foreach ($Record in ($LoginHistory | Sort-Object Time -Descending)) {
            $RowColor = $NetworkColor
            
            switch ($Record.LogonType) {
                '2' { $RowColor = $InteractiveColor }
                '10' { $RowColor = $RDPColor }
                '0' { $RowColor = $SystemColor }
                '5' { $RowColor = $SystemColor }
            }
            
            # Format the output line
            $TimeStr = $Record.Time.ToString("yyyy-MM-dd HH:mm:ss")
            $UserStr = if ($Record.User.Length -gt 28) { $Record.User.Substring(0, 25) + "..." } else { $Record.User }
            
            Write-Host ("{0,-25} {1,-30} {2,-30} {3,-20}" -f $TimeStr, $UserStr, $Record.LogonTypeDesc, $Record.SourceIP) -ForegroundColor $RowColor
        }
        
        Write-Host "`nDone." -ForegroundColor $HeaderColor
    }

} catch {
    Write-Error "Failed to retrieve login history: $_"
}

