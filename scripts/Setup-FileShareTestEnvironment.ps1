#Requires -RunAsAdministrator
#Requires -Modules ActiveDirectory
# File Share Auditor Test Environment Setup Script (Active Directory Version)
# This script creates a comprehensive test environment with 30 AD users, 50+ folders,
# various permission misconfigurations, and SMB shares for testing the File Share Auditor

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "File Share Auditor Test Environment Setup (Active Directory)" -ForegroundColor Cyan
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

# OU for test users (will be created)
$testOUName = "FileShareAuditorTestUsers"
$testOUPath = "OU=$testOUName,$domainDN"

# Generate 30 test users
$testUsers = @()
for ($i = 1; $i -le 30; $i++) {
    $testUsers += "TestUser$i"
}

# Function to resolve SID to account name (for language independence)
function Resolve-SIDToName {
    param([string]$SID)
    
    try {
        $securityIdentifier = New-Object System.Security.Principal.SecurityIdentifier($SID)
        $ntAccount = $securityIdentifier.Translate([System.Security.Principal.NTAccount])
        return $ntAccount.Value
    } catch {
        # Fallback to well-known names
        $wellKnownNames = @{
            "S-1-1-0" = "Everyone"
            "S-1-5-32-544" = "BUILTIN\Administrators"
            "S-1-5-32-545" = "BUILTIN\Users"
            "S-1-5-18" = "NT AUTHORITY\SYSTEM"
            "S-1-5-7" = "NT AUTHORITY\ANONYMOUS LOGON"
            "S-1-5-11" = "NT AUTHORITY\Authenticated Users"
            "S-1-5-32-546" = "BUILTIN\Guests"
        }
        if ($wellKnownNames.ContainsKey($SID)) {
            return $wellKnownNames[$SID]
        }
        return $SID
    }
}

# Function to create Organizational Unit
function New-TestOU {
    param([string]$OUName, [string]$ParentPath)
    
    try {
        $ou = Get-ADOrganizationalUnit -Filter "Name -eq '$OUName'" -SearchBase $ParentPath -ErrorAction SilentlyContinue
        if ($ou) {
            Write-Host "OU $OUName already exists" -ForegroundColor Yellow
            return $ou.DistinguishedName
        }
        
        $newOU = New-ADOrganizationalUnit -Name $OUName -Path $ParentPath -ProtectedFromAccidentalDeletion $false -ErrorAction Stop
        Write-Host "Created OU: $OUName" -ForegroundColor Green
        return $newOU.DistinguishedName
    } catch {
        Write-Host "Failed to create OU $OUName : $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Function to create AD user
function New-TestUser {
    param(
        [string]$UserName,
        [string]$Password = "P@ssw0rd123!",
        [string]$OUPath
    )
    
    try {
        $user = Get-ADUser -Filter "SamAccountName -eq '$UserName'" -ErrorAction SilentlyContinue
        if ($user) {
            Write-Host "User $UserName already exists, skipping creation" -ForegroundColor Yellow
            return "$domainNetBIOS\$UserName"
        }
        
        $securePassword = ConvertTo-SecureString $Password -AsPlainText -Force
        
        $userParams = @{
            SamAccountName = $UserName
            Name = $UserName
            DisplayName = $UserName
            GivenName = "Test"
            Surname = "User$($UserName -replace 'TestUser', '')"
            UserPrincipalName = "$UserName@$($domain.DNSRoot)"
            AccountPassword = $securePassword
            Enabled = $true
            PasswordNeverExpires = $true
            Description = "Test user for File Share Auditor"
            Path = $OUPath
        }
        
        New-ADUser @userParams -ErrorAction Stop | Out-Null
        Write-Host "Created AD user: $domainNetBIOS\$UserName" -ForegroundColor Green
        return "$domainNetBIOS\$UserName"
    } catch {
        Write-Host "Failed to create AD user $UserName : $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Function to remove inherited permissions
function Remove-InheritedPermissions {
    param([string]$Path)
    
    try {
        $acl = Get-Acl -Path $Path
        $acl.SetAccessRuleProtection($true, $false)
        Set-Acl -Path $Path -AclObject $acl
    } catch {
        Write-Host "Failed to remove inherited permissions from $Path : $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Function to grant permission (supports AD accounts)
function Grant-Permission {
    param(
        [string]$Path,
        [string]$Identity,
        [string]$Rights,
        [string]$AccessType = "Allow",
        [bool]$Inherit = $true
    )
    
    try {
        $acl = Get-Acl -Path $Path
        
        # Resolve well-known SIDs to account names
        $identityToUse = $Identity
        if ($Identity -match "^S-1-") {
            $identityToUse = Resolve-SIDToName -SID $Identity
        } elseif ($Identity -match "^(Everyone|BUILTIN\\|NT AUTHORITY\\)") {
            try {
                $ntAccount = New-Object System.Security.Principal.NTAccount($Identity)
                $sid = $ntAccount.Translate([System.Security.Principal.SecurityIdentifier])
                $identityToUse = Resolve-SIDToName -SID $sid.Value
            } catch {
                # Try direct resolution
            }
        } elseif ($Identity -match "^TestUser\d+$") {
            # Convert TestUserX to DOMAIN\TestUserX format
            $identityToUse = "$domainNetBIOS\$Identity"
        }
        
        $inheritanceFlags = if ($Inherit) { "ContainerInherit,ObjectInherit" } else { "None" }
        $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
            $identityToUse,
            $Rights,
            $inheritanceFlags,
            "None",
            $AccessType
        )
        $acl.SetAccessRule($accessRule)
        Set-Acl -Path $Path -AclObject $acl
    } catch {
        Write-Host "  Failed to grant $Rights to $Identity on $Path : $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Function to create SMB share
function New-TestShare {
    param(
        [string]$ShareName,
        [string]$Path,
        [string]$Description
    )
    
    try {
        $existingShare = Get-SmbShare -Name $ShareName -ErrorAction SilentlyContinue
        if ($existingShare) {
            Remove-SmbShare -Name $ShareName -Force -ErrorAction SilentlyContinue
        }
        New-SmbShare -Name $ShareName -Path $Path -Description $Description -ErrorAction Stop | Out-Null
        return $true
    } catch {
        Write-Host "  Failed to create share '$ShareName': $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Step 1: Create OU for test users
Write-Host "Step 1: Creating Organizational Unit for test users..." -ForegroundColor Cyan
$testOU = New-TestOU -OUName $testOUName -ParentPath $domainDN
if (-not $testOU) {
    Write-Host "ERROR: Failed to create OU. Cannot continue." -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 2: Create 30 AD users
Write-Host "Step 2: Creating 30 AD users..." -ForegroundColor Cyan
$createdUsers = 0
$adUserAccounts = @()

foreach ($user in $testUsers) {
    $adAccount = New-TestUser -UserName $user -OUPath $testOU
    if ($adAccount) {
        $adUserAccounts += $adAccount
        $createdUsers++
    }
}
Write-Host "Created $createdUsers out of $($testUsers.Count) AD users" -ForegroundColor Green
Write-Host ""

# Step 3: Create comprehensive folder structure (50+ folders)
Write-Host "Step 3: Creating folder structure (50+ folders)..." -ForegroundColor Cyan

# Define folder structure with various misconfigurations
$folderStructure = @{
    # Critical misconfigurations
    "Critical\EveryoneFull" = @{ Risk = "Critical"; Permissions = @("S-1-1-0:FullControl") }
    "Critical\EveryoneFull\SubFolder1" = @{ Risk = "Critical"; Permissions = @() }
    "Critical\EveryoneFull\SubFolder2" = @{ Risk = "Critical"; Permissions = @() }
    "Critical\EveryoneFull\SubFolder3" = @{ Risk = "Critical"; Permissions = @() }
    "Critical\AnonymousAccess" = @{ Risk = "Critical"; Permissions = @("S-1-5-7:FullControl") }
    "Critical\AnonymousAccess\Data" = @{ Risk = "Critical"; Permissions = @() }
    "Critical\AnonymousAccess\Backup" = @{ Risk = "Critical"; Permissions = @() }
    "Critical\NonAdminFull" = @{ Risk = "Critical"; Permissions = @("TestUser1:FullControl", "TestUser2:FullControl") }
    "Critical\NonAdminFull\Documents" = @{ Risk = "Critical"; Permissions = @() }
    "Critical\NonAdminFull\Projects" = @{ Risk = "Critical"; Permissions = @() }
    
    # High risk misconfigurations
    "High\UsersModify" = @{ Risk = "High"; Permissions = @("S-1-5-32-545:Modify") }
    "High\UsersModify\Team1" = @{ Risk = "High"; Permissions = @() }
    "High\UsersModify\Team2" = @{ Risk = "High"; Permissions = @() }
    "High\UsersModify\Team3" = @{ Risk = "High"; Permissions = @() }
    "High\AuthenticatedWrite" = @{ Risk = "High"; Permissions = @("S-1-5-11:Write", "S-1-5-11:CreateFiles") }
    "High\AuthenticatedWrite\Uploads" = @{ Risk = "High"; Permissions = @() }
    "High\AuthenticatedWrite\Temp" = @{ Risk = "High"; Permissions = @() }
    "High\DomainUsersFull" = @{ Risk = "High"; Permissions = @("S-1-5-32-545:FullControl") }
    "High\DomainUsersFull\Shared" = @{ Risk = "High"; Permissions = @() }
    "High\DomainUsersFull\Public" = @{ Risk = "High"; Permissions = @() }
    
    # Medium risk misconfigurations
    "Medium\UsersWrite" = @{ Risk = "Medium"; Permissions = @("S-1-5-32-545:Write") }
    "Medium\UsersWrite\Folder1" = @{ Risk = "Medium"; Permissions = @() }
    "Medium\UsersWrite\Folder2" = @{ Risk = "Medium"; Permissions = @() }
    "Medium\UsersWrite\Folder3" = @{ Risk = "Medium"; Permissions = @() }
    "Medium\UsersWrite\Folder4" = @{ Risk = "Medium"; Permissions = @() }
    "Medium\MultipleUsers" = @{ Risk = "Medium"; Permissions = @("TestUser5:Modify", "TestUser6:Modify", "TestUser7:Modify") }
    "Medium\MultipleUsers\ProjectA" = @{ Risk = "Medium"; Permissions = @() }
    "Medium\MultipleUsers\ProjectB" = @{ Risk = "Medium"; Permissions = @() }
    "Medium\GuestsRead" = @{ Risk = "Medium"; Permissions = @("S-1-5-32-546:Read") }
    "Medium\GuestsRead\Public" = @{ Risk = "Medium"; Permissions = @() }
    
    # Warning misconfigurations
    "Warning\EveryoneRead" = @{ Risk = "Warning"; Permissions = @("S-1-1-0:Read") }
    "Warning\EveryoneRead\Docs" = @{ Risk = "Warning"; Permissions = @() }
    "Warning\EveryoneRead\Info" = @{ Risk = "Warning"; Permissions = @() }
    "Warning\EveryoneRead\Archive" = @{ Risk = "Warning"; Permissions = @() }
    "Warning\InheritedIssues" = @{ Risk = "Warning"; Permissions = @("S-1-5-32-545:Modify") }
    "Warning\InheritedIssues\Sub1" = @{ Risk = "Warning"; Permissions = @() }
    "Warning\InheritedIssues\Sub2" = @{ Risk = "Warning"; Permissions = @() }
    "Warning\InheritedIssues\Sub3" = @{ Risk = "Warning"; Permissions = @() }
    "Warning\InheritedIssues\Sub4" = @{ Risk = "Warning"; Permissions = @() }
    "Warning\InheritedIssues\Sub5" = @{ Risk = "Warning"; Permissions = @() }
    "Warning\InheritedIssues\Sub6" = @{ Risk = "Warning"; Permissions = @() }
    "Warning\InheritedIssues\Sub7" = @{ Risk = "Warning"; Permissions = @() }
    "Warning\InheritedIssues\Sub8" = @{ Risk = "Warning"; Permissions = @() }
    "Warning\InheritedIssues\Sub9" = @{ Risk = "Warning"; Permissions = @() }
    "Warning\InheritedIssues\Sub10" = @{ Risk = "Warning"; Permissions = @() }
    
    # Additional folders for more coverage
    "Additional\Department1" = @{ Risk = "High"; Permissions = @("S-1-5-32-545:Modify") }
    "Additional\Department1\Finance" = @{ Risk = "High"; Permissions = @() }
    "Additional\Department1\HR" = @{ Risk = "High"; Permissions = @() }
    "Additional\Department1\IT" = @{ Risk = "High"; Permissions = @() }
    "Additional\Department2" = @{ Risk = "Medium"; Permissions = @("TestUser10:Write", "TestUser11:Write") }
    "Additional\Department2\Sales" = @{ Risk = "Medium"; Permissions = @() }
    "Additional\Department2\Marketing" = @{ Risk = "Medium"; Permissions = @() }
    "Additional\Department2\Support" = @{ Risk = "Medium"; Permissions = @() }
    "Additional\Projects" = @{ Risk = "Warning"; Permissions = @("S-1-5-32-545:Read") }
    "Additional\Projects\Project1" = @{ Risk = "Warning"; Permissions = @() }
    "Additional\Projects\Project2" = @{ Risk = "Warning"; Permissions = @() }
    "Additional\Projects\Project3" = @{ Risk = "Warning"; Permissions = @() }
    "Additional\Projects\Project4" = @{ Risk = "Warning"; Permissions = @() }
    "Additional\Projects\Project5" = @{ Risk = "Warning"; Permissions = @() }
    "Additional\Shared" = @{ Risk = "High"; Permissions = @("S-1-5-11:Modify") }
    "Additional\Shared\TeamA" = @{ Risk = "High"; Permissions = @() }
    "Additional\Shared\TeamB" = @{ Risk = "High"; Permissions = @() }
    "Additional\Shared\TeamC" = @{ Risk = "High"; Permissions = @() }
    "Additional\Shared\TeamD" = @{ Risk = "High"; Permissions = @() }
    "Additional\Shared\TeamE" = @{ Risk = "High"; Permissions = @() }
    
    # Properly configured (for comparison)
    "Proper\Restricted" = @{ Risk = "Low"; Permissions = @("TestUser1:Read") }
    "Proper\Restricted\Confidential" = @{ Risk = "Low"; Permissions = @() }
    "Proper\Restricted\Private" = @{ Risk = "Low"; Permissions = @() }
    "Proper\Restricted\Secure" = @{ Risk = "Low"; Permissions = @() }
    "Proper\Restricted\Internal" = @{ Risk = "Low"; Permissions = @() }
}

# Create all folders
$createdFolders = 0
$allFolders = @()

foreach ($folderPath in $folderStructure.Keys) {
    $fullPath = Join-Path $basePath $folderPath
    if (-not (Test-Path $fullPath)) {
        New-Item -Path $fullPath -ItemType Directory -Force | Out-Null
        $createdFolders++
    }
    $allFolders += @{
        Path = $fullPath
        RelativePath = $folderPath
        Config = $folderStructure[$folderPath]
    }
}

Write-Host "Created $createdFolders folders" -ForegroundColor Green
Write-Host ""

# Step 4: Apply permissions to each folder
Write-Host "Step 4: Applying permissions to folders..." -ForegroundColor Cyan
$permissionCount = 0

foreach ($folder in $allFolders) {
    $path = $folder.Path
    $config = $folder.Config
    
    # Remove inherited permissions
    Remove-InheritedPermissions -Path $path
    
    # Always grant SYSTEM and Administrators FullControl
    Grant-Permission -Path $path -Identity "S-1-5-18" -Rights "FullControl"
    Grant-Permission -Path $path -Identity "S-1-5-32-544" -Rights "FullControl"
    $permissionCount += 2
    
    # Apply configured permissions
    foreach ($perm in $config.Permissions) {
        if ($perm -match "^(.+):(.+)$") {
            $identity = $matches[1]
            $rights = $matches[2]
            Grant-Permission -Path $path -Identity $identity -Rights $rights
            $permissionCount++
        }
    }
    
    # Add random AD user permissions for variety
    if ($config.Risk -ne "Low" -and $adUserAccounts.Count -gt 0) {
        $randomUser = $adUserAccounts | Get-Random
        $randomRights = @("Read", "Write", "Modify") | Get-Random
        Grant-Permission -Path $path -Identity $randomUser -Rights $randomRights
        $permissionCount++
    }
}

Write-Host "Applied permissions to $permissionCount entries across $($allFolders.Count) folders" -ForegroundColor Green
Write-Host ""

# Step 5: Create SMB shares for folders
Write-Host "Step 5: Creating SMB shares..." -ForegroundColor Cyan
$shareCount = 0

# Share critical folders
$shares = @(
    @{ Name = "ShareEveryoneFull"; Path = "$basePath\Critical\EveryoneFull"; Desc = "CRITICAL: Everyone Full Control" }
    @{ Name = "ShareAnonymous"; Path = "$basePath\Critical\AnonymousAccess"; Desc = "CRITICAL: Anonymous Access" }
    @{ Name = "ShareNonAdmin"; Path = "$basePath\Critical\NonAdminFull"; Desc = "CRITICAL: Non-Admin Full Control" }
    @{ Name = "ShareUsersModify"; Path = "$basePath\High\UsersModify"; Desc = "HIGH: Users Modify" }
    @{ Name = "ShareAuthWrite"; Path = "$basePath\High\AuthenticatedWrite"; Desc = "HIGH: Authenticated Write" }
    @{ Name = "ShareDomainUsers"; Path = "$basePath\High\DomainUsersFull"; Desc = "HIGH: Domain Users Full" }
    @{ Name = "ShareUsersWrite"; Path = "$basePath\Medium\UsersWrite"; Desc = "MEDIUM: Users Write" }
    @{ Name = "ShareMultipleUsers"; Path = "$basePath\Medium\MultipleUsers"; Desc = "MEDIUM: Multiple Users" }
    @{ Name = "ShareGuestsRead"; Path = "$basePath\Medium\GuestsRead"; Desc = "MEDIUM: Guests Read" }
    @{ Name = "ShareEveryoneRead"; Path = "$basePath\Warning\EveryoneRead"; Desc = "WARNING: Everyone Read" }
    @{ Name = "ShareInherited"; Path = "$basePath\Warning\InheritedIssues"; Desc = "WARNING: Inherited Issues" }
    @{ Name = "ShareDepartment1"; Path = "$basePath\Additional\Department1"; Desc = "HIGH: Department1 Modify" }
    @{ Name = "ShareDepartment2"; Path = "$basePath\Additional\Department2"; Desc = "MEDIUM: Department2 Write" }
    @{ Name = "ShareProjects"; Path = "$basePath\Additional\Projects"; Desc = "WARNING: Projects Read" }
    @{ Name = "ShareShared"; Path = "$basePath\Additional\Shared"; Desc = "HIGH: Shared Modify" }
    @{ Name = "ShareRestricted"; Path = "$basePath\Proper\Restricted"; Desc = "PROPER: Restricted Access" }
)

foreach ($share in $shares) {
    if (Test-Path $share.Path) {
        if (New-TestShare -ShareName $share.Name -Path $share.Path -Description $share.Desc) {
            $shareCount++
            
            # Grant share-level permissions
            try {
                $everyoneName = Resolve-SIDToName -SID "S-1-1-0"
                if ($share.Name -match "Everyone|Anonymous") {
                    Grant-SmbShareAccess -Name $share.Name -AccountName $everyoneName -AccessRight Full -Force -ErrorAction SilentlyContinue | Out-Null
                }
                
                $usersName = Resolve-SIDToName -SID "S-1-5-32-545"
                if ($share.Name -match "Users|Auth") {
                    Grant-SmbShareAccess -Name $share.Name -AccountName $usersName -AccessRight Change -Force -ErrorAction SilentlyContinue | Out-Null
                }
                
                $adminName = Resolve-SIDToName -SID "S-1-5-32-544"
                Grant-SmbShareAccess -Name $share.Name -AccountName $adminName -AccessRight Full -Force -ErrorAction SilentlyContinue | Out-Null
            } catch {
                # Ignore share permission errors
            }
        }
    }
}

Write-Host "Created $shareCount SMB shares" -ForegroundColor Green
Write-Host ""

# Step 6: Create additional test files
Write-Host "Step 6: Creating test files..." -ForegroundColor Cyan
$fileCount = 0
$testFiles = @(
    "$basePath\Critical\EveryoneFull\sensitive.txt",
    "$basePath\Critical\AnonymousAccess\data.txt",
    "$basePath\High\UsersModify\document.txt",
    "$basePath\Medium\UsersWrite\file.txt",
    "$basePath\Warning\EveryoneRead\info.txt"
)

foreach ($file in $testFiles) {
    $dir = Split-Path $file -Parent
    if (Test-Path $dir) {
        "Test content for $(Split-Path $file -Leaf)" | Out-File -FilePath $file -Encoding UTF8 -Force
        $fileCount++
    }
}

Write-Host "Created $fileCount test files" -ForegroundColor Green
Write-Host ""

# Step 7: Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test Environment Summary:" -ForegroundColor Cyan
Write-Host "  Domain: $domainNetBIOS ($domainDN)" -ForegroundColor White
Write-Host "  OU Created: $testOU" -ForegroundColor White
Write-Host "  AD Users Created: $createdUsers / $($testUsers.Count)" -ForegroundColor White
Write-Host "  Base Path: $basePath" -ForegroundColor White
Write-Host "  Folders Created: $createdFolders" -ForegroundColor White
Write-Host "  Permissions Applied: $permissionCount" -ForegroundColor White
Write-Host "  SMB Shares Created: $shareCount" -ForegroundColor White
Write-Host "  Test Files Created: $fileCount" -ForegroundColor White
Write-Host ""
Write-Host "Folder Structure:" -ForegroundColor Cyan
Write-Host "  Critical Risk: $basePath\Critical\" -ForegroundColor Red
Write-Host "  High Risk: $basePath\High\" -ForegroundColor Yellow
Write-Host "  Medium Risk: $basePath\Medium\" -ForegroundColor Magenta
Write-Host "  Warning: $basePath\Warning\" -ForegroundColor DarkYellow
Write-Host "  Properly Configured: $basePath\Proper\" -ForegroundColor Green
Write-Host ""
Write-Host "AD Users are in format: $domainNetBIOS\TestUserX" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now test the File Share Auditor with:" -ForegroundColor Green
Write-Host "  Example: Analyze '$basePath\Critical\EveryoneFull' to see critical issues" -ForegroundColor Cyan
Write-Host "  Example: Analyze '$basePath' to see all folders and permissions" -ForegroundColor Cyan
Write-Host ""




