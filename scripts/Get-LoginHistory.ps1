# Get-LoginHistory.ps1
# Retrieves login history for all session types from the Security Event Log

param (
    [int]$Days = 30
)

# Hash table to map LogonType to description
# Reference: https://docs.microsoft.com/en-us/windows/security/threat-protection/auditing/event-4624
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
    # Event ID 4624: An account was successfully logged on
    $Filter = @{
        LogName = 'Security'
        ID = 4624
        StartTime = $StartDate
    }

    Write-Host "Querying Security Event Log for all successful logons (Event ID 4624) in the last $Days days..."

    # Tailored for performance by using FilterHashtable
    $Events = Get-WinEvent -FilterHashtable $Filter -ErrorAction Stop

    $LoginHistory = @()

    foreach ($Event in $Events) {
        # Convert the event to XML to easily access properties
        $Xml = [xml]$Event.ToXml()
        $EventData = $Xml.Event.EventData.Data

        # Helper function to get named data
        $GetData = { param($Name) ($EventData | Where-Object { $_.Name -eq $Name }).'#text' }

        $LogonType = &$GetData 'LogonType'
        
        # Skip system accounts if desired (optional, keeping everything as requested)
        # $Attributes = ($EventData | Where-Object { $_.Name -eq 'TargetUserName' }).'#text'
        # if ($Attributes -match 'SYSTEM|NETWORK SERVICE|LOCAL SERVICE') { continue }

        $User = &$GetData 'TargetUserName'
        $Domain = &$GetData 'TargetDomainName'
        $SourceIP = &$GetData 'IpAddress'
        $LogonGuid = &$GetData 'LogonGuid'
        
        # Get description for LogonType
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
        Write-Host "Found $($LoginHistory.Count) login events." -ForegroundColor Green
        return $LoginHistory | Sort-Object Time -Descending
    }

} catch {
    Write-Error "Failed to retrieve login history: $_"
}
