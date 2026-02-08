# Get-RDPLoginHistory.ps1
# Retrieves login history for RDP sessions from the Security Event Log

param (
    [int]$Days = 30
)

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

    Write-Host "Querying Security Event Log for RDP logons (LogonType 10) in the last $Days days..."

    # tailored for performance by using FilterHashtable
    $Events = Get-WinEvent -FilterHashtable $Filter -ErrorAction Stop

    $RDPLogons = @()

    foreach ($Event in $Events) {
        # Convert the event to XML to easily access properties
        $Xml = [xml]$Event.ToXml()
        $EventData = $Xml.Event.EventData.Data

        # Extract LogonType
        # Note: The position of LogonType varies, but it's usually named "LogonType"
        $LogonType = ($EventData | Where-Object { $_.Name -eq 'LogonType' }).'#text'

        if ($LogonType -eq '10') {
            # Extract other relevant fields
            $User = ($EventData | Where-Object { $_.Name -eq 'TargetUserName' }).'#text'
            $Domain = ($EventData | Where-Object { $_.Name -eq 'TargetDomainName' }).'#text'
            $SourceIP = ($EventData | Where-Object { $_.Name -eq 'IpAddress' }).'#text'
            $LogonGuid = ($EventData | Where-Object { $_.Name -eq 'LogonGuid' }).'#text'

            $RDPLogons += [PSCustomObject]@{
                Time = $Event.TimeCreated
                User = "$Domain\$User"
                SourceIP = $SourceIP
                LogonType = $LogonType
                EventID = $Event.Id
            }
        }
    }

    if ($RDPLogons.Count -eq 0) {
        Write-Host "No RDP login events found in the last $Days days." -ForegroundColor Yellow
    } else {
        Write-Host "Found $($RDPLogons.Count) RDP login events." -ForegroundColor Green
        return $RDPLogons | Sort-Object Time -Descending
    }

} catch {
    Write-Error "Failed to retrieve RDP login history: $_"
}
