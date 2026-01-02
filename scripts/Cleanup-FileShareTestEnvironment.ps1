#Requires -RunAsAdministrator
#Requires -Modules ActiveDirectory
# File Share Auditor Test Environment Cleanup Script (Active Directory Version)
# This script removes all test users, folders, shares, and files created by Setup-FileShareTestEnvironment.ps1

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "File Share Auditor Test Environment Cleanup (Active Directory)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if ActiveDirectory module is available
if (-not (Get-Module -ListAvailable -Name ActiveDirectory)) {
    Write-Host "ERROR: ActiveDirectory module is not available. Please install RSAT-AD-PowerShell feature." -ForegroundColor Red
    Write-Host "Install with: Install-WindowsFeature RSAT-AD-PowerShell" -ForegroundColor Yellow
    exit 1
}

Import-Module ActiveDirectory -ErrorAction Stop

# Get current domain
try {
    $domain = Get-ADDomain
    $domainDN = $domain.DistinguishedName
    $domainNetBIOS = $domain.NetBIOSName
    Write-Host "Connected to domain: $domainNetBIOS ($domainDN)" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to connect to Active Directory domain: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Base directory for test shares
$basePath = "C:\TestShares"

# OU for test users
$testOUName = "FileShareAuditorTestUsers"
$testOUPath = "OU=$testOUName,$domainDN"

# Generate 30 test users
$testUsers = @()
for ($i = 1; $i -le 30; $i++) {
    $testUsers += "TestUser$i"
}

# Step 1: Remove SMB shares
Write-Host "Step 1: Removing SMB shares..." -ForegroundColor Cyan
$shareNames = @(
    "ShareEveryoneFull",
    "ShareAnonymous",
    "ShareNonAdmin",
    "ShareUsersModify",
    "ShareAuthWrite",
    "ShareDomainUsers",
    "ShareUsersWrite",
    "ShareMultipleUsers",
    "ShareGuestsRead",
    "ShareEveryoneRead",
    "ShareInherited",
    "ShareDepartment1",
    "ShareDepartment2",
    "ShareProjects",
    "ShareShared",
    "ShareRestricted"
)

$removedShares = 0
foreach ($shareName in $shareNames) {
    try {
        $share = Get-SmbShare -Name $shareName -ErrorAction SilentlyContinue
        if ($share) {
            Remove-SmbShare -Name $shareName -Force -ErrorAction Stop
            Write-Host "  Removed share: $shareName" -ForegroundColor Green
            $removedShares++
        }
    } catch {
        Write-Host "  Failed to remove share '$shareName': $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host "Removed $removedShares SMB shares" -ForegroundColor Green
Write-Host ""

# Step 2: Remove folder structure
Write-Host "Step 2: Removing folder structure..." -ForegroundColor Cyan
if (Test-Path $basePath) {
    try {
        # Remove all files and folders recursively
        Remove-Item -Path $basePath -Recurse -Force -ErrorAction Stop
        Write-Host "Removed folder structure: $basePath" -ForegroundColor Green
    } catch {
        Write-Host "Failed to remove folder structure: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Attempting to remove individual folders..." -ForegroundColor Yellow
        
        # Try to remove folders individually
        $folders = @(
            "$basePath\Critical",
            "$basePath\High",
            "$basePath\Medium",
            "$basePath\Warning",
            "$basePath\Additional",
            "$basePath\Proper"
        )
        
        foreach ($folder in $folders) {
            if (Test-Path $folder) {
                try {
                    Remove-Item -Path $folder -Recurse -Force -ErrorAction Stop
                    Write-Host "  Removed: $folder" -ForegroundColor Green
                } catch {
                    Write-Host "  Failed to remove: $folder - $($_.Exception.Message)" -ForegroundColor Red
                }
            }
        }
        
        # Try to remove base path again
        if (Test-Path $basePath) {
            try {
                Remove-Item -Path $basePath -Recurse -Force -ErrorAction Stop
                Write-Host "Removed base path: $basePath" -ForegroundColor Green
            } catch {
                Write-Host "Warning: Could not fully remove $basePath. Some files may be in use." -ForegroundColor Yellow
            }
        }
    }
} else {
    Write-Host "Folder structure does not exist: $basePath" -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Remove AD users
Write-Host "Step 3: Removing AD users..." -ForegroundColor Cyan
$removedUsers = 0
foreach ($user in $testUsers) {
    try {
        $adUser = Get-ADUser -Filter "SamAccountName -eq '$user'" -ErrorAction SilentlyContinue
        if ($adUser) {
            Remove-ADUser -Identity $adUser.DistinguishedName -Confirm:$false -ErrorAction Stop
            Write-Host "  Removed AD user: $domainNetBIOS\$user" -ForegroundColor Green
            $removedUsers++
        } else {
            Write-Host "  AD user does not exist: $user" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  Failed to remove AD user '$user': $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host "Removed $removedUsers out of $($testUsers.Count) AD users" -ForegroundColor Green
Write-Host ""

# Step 4: Remove OU
Write-Host "Step 4: Removing Organizational Unit..." -ForegroundColor Cyan
try {
    $ou = Get-ADOrganizationalUnit -Filter "Name -eq '$testOUName'" -SearchBase $domainDN -ErrorAction SilentlyContinue
    if ($ou) {
        # First, ensure OU is not protected
        Set-ADOrganizationalUnit -Identity $ou.DistinguishedName -ProtectedFromAccidentalDeletion $false -ErrorAction SilentlyContinue
        
        # Remove OU (this will fail if users still exist in it)
        Remove-ADOrganizationalUnit -Identity $ou.DistinguishedName -Confirm:$false -Recursive -ErrorAction Stop
        Write-Host "Removed OU: $testOUName" -ForegroundColor Green
    } else {
        Write-Host "OU does not exist: $testOUName" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Failed to remove OU '$testOUName': $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Note: OU may still contain objects. Please remove manually if needed." -ForegroundColor Yellow
}
Write-Host ""

# Step 5: Cleanup summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cleanup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Cleanup Summary:" -ForegroundColor Cyan
Write-Host "  SMB Shares Removed: $removedShares" -ForegroundColor White
Write-Host "  Folder Structure: $basePath" -ForegroundColor White
if (Test-Path $basePath) {
    Write-Host "    Status: Still exists (some files may be in use)" -ForegroundColor Yellow
} else {
    Write-Host "    Status: Removed successfully" -ForegroundColor Green
}
Write-Host "  AD Users Removed: $removedUsers / $($testUsers.Count)" -ForegroundColor White
Write-Host "  OU Status: $testOUName" -ForegroundColor White
Write-Host ""
Write-Host "Note: If some items could not be removed, they may be in use." -ForegroundColor Yellow
Write-Host "      You may need to:" -ForegroundColor Yellow
Write-Host "      - Close any open file handles" -ForegroundColor Yellow
Write-Host "      - Log out users with active sessions" -ForegroundColor Yellow
Write-Host "      - Remove OU manually if it still contains objects" -ForegroundColor Yellow
Write-Host "      - Restart the computer if necessary" -ForegroundColor Yellow
Write-Host ""








