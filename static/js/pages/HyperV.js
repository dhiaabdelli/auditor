export class HyperVPage {
    constructor() {
        this.hosts = [];
        this.physicalNICs = [];
        this.vSwitchName = 'SET-Team';
    }

    async render() {
        return `
            <div class="page-container-full">
                <div class="page-header">
                    <h1 class="page-title">🖥️ Hyper-V Manager</h1>
                    <p class="page-subtitle">Configure Hyper-V networking with SET (Switch Embedded Teaming)</p>
                </div>

                <div class="config-grid">
                    <div class="config-column">
                        <div class="card card-compact">
                            <div class="card-header-compact">
                                <div class="card-header-icon-compact" style="background: linear-gradient(135deg, #3b82f615 0%, #3b82f625 100%);">
                                    <i class="fas fa-network-wired" style="color: #3b82f6;"></i>
                                </div>
                                <div>
                                    <h2 class="card-title-compact">Physical Network Adapters</h2>
                                </div>
                            </div>
                            <div class="card-body-compact">
                                <div class="form-group-compact">
                                    <label class="form-label-compact">
                                        <i class="fas fa-hashtag"></i> Number of Ports
                                    </label>
                                    <input type="number" id="num-ports" class="form-input-compact" value="4" min="2" max="16" onchange="hyperVInstance.updateAdapterNameFields()">
                                </div>

                                <div class="form-group-compact">
                                    <label class="form-label-compact">
                                        <i class="fas fa-tag"></i> Desired Names
                                    </label>
                                    <div id="adapter-name-fields" class="adapter-name-fields-compact">
                                        <!-- Dynamic fields will be generated here -->
                                    </div>
                                </div>
                                
                                <div class="form-group-compact">
                                    <label class="form-label-compact">
                                        <i class="fas fa-switch"></i> Switch Name
                                    </label>
                                    <input type="text" id="vswitch-name" class="form-input-compact" value="RV" placeholder="RV">
                                </div>
                            </div>
                        </div>

                        <div class="card card-compact">
                            <div class="card-header-compact">
                                <div class="card-header-icon-compact" style="background: linear-gradient(135deg, #10b98115 0%, #10b98125 100%);">
                                    <i class="fas fa-sliders-h" style="color: #10b981;"></i>
                                </div>
                                <div>
                                    <h2 class="card-title-compact">Load Balancing</h2>
                                </div>
                            </div>
                            <div class="card-body-compact">
                                <div class="form-group-compact">
                                    <label class="form-label-compact">
                                        <i class="fas fa-balance-scale"></i> Algorithm
                                    </label>
                                    <select id="load-balancing" class="form-input-compact">
                                        <option value="Dynamic" selected>Dynamic (Recommended)</option>
                                        <option value="HyperVPort">HyperVPort</option>
                                        <option value="TransportPorts">TransportPorts</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="config-column">
                        <div class="card card-compact vnic-card-compact">
                            <div class="card-header-compact">
                                <div class="card-header-icon-compact" style="background: linear-gradient(135deg, #8b5cf615 0%, #8b5cf625 100%);">
                                    <i class="fas fa-server" style="color: #8b5cf6;"></i>
                                </div>
                                <div>
                                    <h2 class="card-title-compact">Virtual Network Adapters</h2>
                                </div>
                            </div>
                            <div class="card-body-compact">
                                <div class="vnic-section-compact">
                                    <div class="vnic-header-compact">
                                        <i class="fas fa-cog" style="color: #3b82f6; font-size: 0.875rem;"></i>
                                        <h3 class="vnic-title-compact">Management</h3>
                                    </div>
                                    <div class="form-grid-compact">
                                        <div class="form-group-compact">
                                            <label class="form-label-small">VLAN</label>
                                            <input type="number" id="mgmt-vlan" class="form-input-compact" value="10" min="1" max="4094">
                                        </div>
                                        <div class="form-group-compact">
                                            <label class="form-label-small">IP</label>
                                            <input type="text" id="mgmt-ip" class="form-input-compact" value="172.23.10.10" placeholder="172.23.10.10">
                                        </div>
                                        <div class="form-group-compact">
                                            <label class="form-label-small">Prefix</label>
                                            <input type="number" id="mgmt-prefix" class="form-input-compact" value="24" min="1" max="32">
                                        </div>
                                        <div class="form-group-compact">
                                            <label class="form-label-small">Gateway</label>
                                            <input type="text" id="mgmt-gateway" class="form-input-compact" value="172.23.10.1" placeholder="172.23.10.1">
                                        </div>
                                    </div>
                                    <div class="form-group-compact">
                                        <label class="form-label-small">DNS</label>
                                        <input type="text" id="mgmt-dns" class="form-input-compact" value="172.23.10.5" placeholder="172.23.10.5">
                                    </div>
                                </div>

                                <div class="vnic-divider-compact"></div>

                                <div class="vnic-section-compact">
                                    <div class="vnic-header-compact">
                                        <i class="fas fa-heartbeat" style="color: #ef4444; font-size: 0.875rem;"></i>
                                        <h3 class="vnic-title-compact">Heartbeat</h3>
                                    </div>
                                    <div class="form-grid-compact">
                                        <div class="form-group-compact">
                                            <label class="form-label-small">VLAN</label>
                                            <input type="number" id="heartbeat-vlan" class="form-input-compact" value="20" min="1" max="4094">
                                        </div>
                                        <div class="form-group-compact">
                                            <label class="form-label-small">IP</label>
                                            <input type="text" id="heartbeat-ip" class="form-input-compact" value="172.23.20.10" placeholder="172.23.20.10">
                                        </div>
                                        <div class="form-group-compact">
                                            <label class="form-label-small">Prefix</label>
                                            <input type="number" id="heartbeat-prefix" class="form-input-compact" value="24" min="1" max="32">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="actions-compact">
                    <button type="button" class="btn btn-primary btn-compact" onclick="hyperVInstance.generateScript()">
                        <i class="fas fa-code"></i> Generate Script
                    </button>
                    <button type="button" class="btn btn-secondary btn-compact" onclick="hyperVInstance.downloadScript()">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>

                <div id="preview-section" class="preview-section-full" style="display: none;">
                    <div class="card">
                        <div class="card-header">
                            <h2 class="card-title">
                                <i class="fas fa-file-code"></i> Generated PowerShell Script
                            </h2>
                        </div>
                        <div class="card-body">
                            <div class="script-preview">
                                <pre id="script-content"></pre>
                            </div>
                            <div class="preview-actions">
                                <button type="button" class="btn btn-primary btn-copy" onclick="hyperVInstance.copyToClipboard()">
                                    <i class="fas fa-copy"></i> Copy to Clipboard
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="message" class="message"></div>
            </div>
        `;
    }

    async mount() {
        window.hyperVInstance = this;
        this.updateAdapterNameFields();
    }

    updateAdapterNameFields() {
        const numPorts = parseInt(document.getElementById('num-ports').value) || 2;
        const adapterNameFields = document.getElementById('adapter-name-fields');
        
        adapterNameFields.innerHTML = Array.from({ length: numPorts }, (_, index) => `
            <div class="adapter-name-field-group-compact">
                <span class="adapter-name-label-compact">${index + 1}.</span>
                <input type="text" 
                       class="form-input-compact adapter-name-input-compact" 
                       id="adapter-name-${index}" 
                       value="RV${index + 1}"
                       required>
            </div>
        `).join('');
    }

    getDesiredAdapterNames() {
        const numPorts = parseInt(document.getElementById('num-ports').value) || 2;
        const names = [];
        
        for (let i = 0; i < numPorts; i++) {
            const input = document.getElementById(`adapter-name-${i}`);
            if (input && input.value.trim()) {
                names.push(input.value.trim());
            } else {
                names.push(`RV${i + 1}`);
            }
        }
        
        return names;
    }


    showMessage(text, type) {
        const messageDiv = document.getElementById('message');
        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }

    generateScript() {
        const numPorts = parseInt(document.getElementById('num-ports').value) || 2;
        
        if (numPorts < 2) {
            this.showMessage('SET requires at least 2 physical adapters for teaming.', 'error');
            return;
        }

        const desiredNames = this.getDesiredAdapterNames();
        const vSwitchName = document.getElementById('vswitch-name').value.trim() || 'RV';
        const loadBalancing = document.getElementById('load-balancing').value;

        // Management vNIC
        const mgmtVlan = document.getElementById('mgmt-vlan').value;
        const mgmtIP = document.getElementById('mgmt-ip').value.trim();
        const mgmtPrefix = document.getElementById('mgmt-prefix').value;
        const mgmtGateway = document.getElementById('mgmt-gateway').value.trim();
        const mgmtDNS = document.getElementById('mgmt-dns').value.trim();

        // Heartbeat vNIC
        const heartbeatVlan = document.getElementById('heartbeat-vlan').value;
        const heartbeatIP = document.getElementById('heartbeat-ip').value.trim();
        const heartbeatPrefix = document.getElementById('heartbeat-prefix').value;


        let script = `# Hyper-V SET (Switch Embedded Teaming) Configuration Script\n`;
        script += `# Generated: ${new Date().toLocaleString()}\n\n`;

        script += `# Check for administrator privileges\n`;
        script += `$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)\n`;
        script += `if (-not $isAdmin) {\n`;
        script += `    Write-Host "This script requires administrator privileges. Please run as administrator." -ForegroundColor Red\n`;
        script += `    exit 1\n`;
        script += `}\n\n`;

        script += `Write-Host "Starting Hyper-V SET configuration..." -ForegroundColor Green\n\n`;

        // Step 1: List all available adapters
        script += `# Step 1: List All Available Physical Network Adapters\n`;
        script += `Write-Host "\`n=== Available Physical Network Adapters ===" -ForegroundColor Cyan\n`;
        script += `$allAdapters = Get-NetAdapter | Where-Object { $_.Status -eq "Up" -or $_.Status -eq "Disabled" } | Sort-Object Name\n`;
        script += `if ($allAdapters.Count -eq 0) {\n`;
        script += `    Write-Host "No network adapters found!" -ForegroundColor Red\n`;
        script += `    exit 1\n`;
        script += `}\n\n`;
        script += `Write-Host "\`nAvailable adapters:" -ForegroundColor Yellow\n`;
        script += `$adapterList = @()\n`;
        script += `$index = 1\n`;
        script += `foreach ($adapter in $allAdapters) {\n`;
        script += `    Write-Host "[$index] $($adapter.Name) - $($adapter.InterfaceDescription) - Status: $($adapter.Status)" -ForegroundColor White\n`;
        script += `    $adapterList += $adapter\n`;
        script += `    $index++\n`;
        script += `}\n\n`;

        // Step 2: Interactive selection and renaming
        script += `# Step 2: Select and Rename Adapters\n`;
        script += `Write-Host "\`n=== Adapter Selection and Renaming ===" -ForegroundColor Cyan\n`;
        script += `$selectedAdapters = @()\n`;
        script += `$usedAdapters = @()\n\n`;
        
        desiredNames.forEach((desiredName, index) => {
            script += `# Select adapter for: ${desiredName}\n`;
            script += `Write-Host "\`nSelect adapter for '${desiredName}' (${index + 1} of ${desiredNames.length}):" -ForegroundColor Yellow\n`;
            script += `do {\n`;
            script += `    $selection = Read-Host "Enter adapter number (1-$($allAdapters.Count))"\n`;
            script += `    $selectionNum = [int]$selection\n`;
            script += `    \n`;
            script += `    if ($selectionNum -lt 1 -or $selectionNum -gt $allAdapters.Count) {\n`;
            script += `        Write-Host "Invalid selection. Please enter a number between 1 and $($allAdapters.Count)." -ForegroundColor Red\n`;
            script += `        continue\n`;
            script += `    }\n`;
            script += `    \n`;
            script += `    $selectedAdapter = $adapterList[$selectionNum - 1]\n`;
            script += `    \n`;
            script += `    if ($usedAdapters -contains $selectedAdapter.Name) {\n`;
            script += `        Write-Host "Adapter '$($selectedAdapter.Name)' has already been selected. Please choose a different adapter." -ForegroundColor Red\n`;
            script += `        continue\n`;
            script += `    }\n`;
            script += `    \n`;
            script += `    # Rename the adapter\n`;
            script += `    Write-Host "Renaming '$($selectedAdapter.Name)' to '${desiredName}'..." -ForegroundColor Cyan\n`;
            script += `    try {\n`;
            script += `        Rename-NetAdapter -Name $selectedAdapter.Name -NewName "${desiredName}" -ErrorAction Stop\n`;
            script += `        Write-Host "Successfully renamed to '${desiredName}'" -ForegroundColor Green\n`;
            script += `        $selectedAdapters += "${desiredName}"\n`;
            script += `        $usedAdapters += $selectedAdapter.Name\n`;
            script += `        break\n`;
            script += `    } catch {\n`;
            script += `        Write-Host "Error renaming adapter: $_" -ForegroundColor Red\n`;
            script += `        Write-Host "Please try again or select a different adapter." -ForegroundColor Yellow\n`;
            script += `    }\n`;
            script += `} while ($true)\n\n`;
        });
        
        script += `Write-Host "\`nAll adapters selected and renamed successfully!" -ForegroundColor Green\n`;
        script += `Write-Host "Selected adapters: $($selectedAdapters -join ', ')" -ForegroundColor Cyan\n\n`;

        // Step 3: Remove existing vSwitch
        script += `# Step 3: Remove any existing vSwitch\n`;
        script += `Write-Host "Checking for existing virtual switches..." -ForegroundColor Yellow\n`;
        script += `$existingSwitch = Get-VMSwitch -Name "${vSwitchName}" -ErrorAction SilentlyContinue\n`;
        script += `if ($existingSwitch) {\n`;
        script += `    Write-Host "Removing existing switch: ${vSwitchName}" -ForegroundColor Yellow\n`;
        script += `    Remove-VMSwitch -Name "${vSwitchName}" -Force\n`;
        script += `    Write-Host "Existing switch removed." -ForegroundColor Green\n`;
        script += `}\n\n`;

        // Step 4: Create SET switch
        script += `# Step 4: Create SET switch using selected adapters\n`;
        script += `Write-Host "\`nCreating SET switch: ${vSwitchName}" -ForegroundColor Yellow\n`;
        const nicList = desiredNames.map(name => `"${name}"`).join(',');
        script += `New-VMSwitch -Name "${vSwitchName}" -NetAdapterName ${nicList} -EnableEmbeddedTeaming $true -AllowManagementOS $false\n`;
        script += `Write-Host "SET switch created successfully." -ForegroundColor Green\n\n`;

        // Step 5: Create vNICs
        script += `# Step 5: Create virtual network adapters (vNICs)\n`;
        script += `Write-Host "Creating virtual network adapters..." -ForegroundColor Yellow\n`;
        script += `Add-VMNetworkAdapter -ManagementOS -Name "vNIC-MGMT" -SwitchName "${vSwitchName}"\n`;
        script += `Add-VMNetworkAdapter -ManagementOS -Name "vNIC-HEARTBEAT" -SwitchName "${vSwitchName}"\n`;
        script += `Write-Host "Virtual network adapters created." -ForegroundColor Green\n\n`;

        // Step 6: Tag VLANs
        script += `# Step 6: Configure VLANs\n`;
        script += `Write-Host "Configuring VLANs..." -ForegroundColor Yellow\n`;
        
        // Management VLAN
        script += `# Management vNIC - VLAN ${mgmtVlan}\n`;
        script += `Set-VMNetworkAdapterVlan -ManagementOS -VMNetworkAdapterName "vNIC-MGMT" -Access -VlanId ${mgmtVlan}\n`;
        
        // Heartbeat VLAN
        script += `# Heartbeat vNIC - VLAN ${heartbeatVlan}\n`;
        script += `Set-VMNetworkAdapterVlan -ManagementOS -VMNetworkAdapterName "vNIC-HEARTBEAT" -Access -VlanId ${heartbeatVlan}\n`;
        script += `Write-Host "VLANs configured." -ForegroundColor Green\n\n`;

        // Step 7: Assign IP addresses
        script += `# Step 7: Configure IP addresses\n`;
        script += `Write-Host "Configuring IP addresses..." -ForegroundColor Yellow\n`;
        
        // Management IP
        if (mgmtIP) {
            script += `# Management vNIC IP configuration\n`;
            script += `$mgmtInterface = Get-NetAdapter | Where-Object { $_.Name -like "*vNIC-MGMT*" }\n`;
            script += `if ($mgmtInterface) {\n`;
            script += `    Remove-NetIPAddress -InterfaceAlias $mgmtInterface.Name -Confirm:$false -ErrorAction SilentlyContinue\n`;
            script += `    New-NetIPAddress -InterfaceAlias $mgmtInterface.Name -IPAddress "${mgmtIP}" -PrefixLength ${mgmtPrefix} -DefaultGateway "${mgmtGateway}"\n`;
            if (mgmtDNS) {
                const dnsArray = mgmtDNS.split(',').map(d => d.trim()).filter(d => d);
                script += `    Set-DnsClientServerAddress -InterfaceAlias $mgmtInterface.Name -ServerAddresses (${dnsArray.map(d => `"${d}"`).join(', ')})\n`;
            }
            script += `    Write-Host "Management IP configured: ${mgmtIP}/${mgmtPrefix}" -ForegroundColor Green\n`;
            script += `}\n\n`;
        }

        // Heartbeat IP
        if (heartbeatIP) {
            script += `# Heartbeat vNIC IP configuration (no gateway)\n`;
            script += `$heartbeatInterface = Get-NetAdapter | Where-Object { $_.Name -like "*vNIC-HEARTBEAT*" }\n`;
            script += `if ($heartbeatInterface) {\n`;
            script += `    Remove-NetIPAddress -InterfaceAlias $heartbeatInterface.Name -Confirm:$false -ErrorAction SilentlyContinue\n`;
            script += `    New-NetIPAddress -InterfaceAlias $heartbeatInterface.Name -IPAddress "${heartbeatIP}" -PrefixLength ${heartbeatPrefix}\n`;
            script += `    Write-Host "Heartbeat IP configured: ${heartbeatIP}/${heartbeatPrefix}" -ForegroundColor Green\n`;
            script += `}\n\n`;
        }

        // Step 8: Set load balancing
        script += `# Step 8: Configure SET load balancing algorithm\n`;
        script += `Write-Host "Configuring load balancing algorithm: ${loadBalancing}..." -ForegroundColor Yellow\n`;
        script += `Set-VMSwitchTeam -Name "${vSwitchName}" -LoadBalancingAlgorithm ${loadBalancing}\n`;
        script += `Write-Host "Load balancing configured." -ForegroundColor Green\n\n`;

        // Step 9: Verification
        script += `# Step 9: Verification\n`;
        script += `Write-Host "\`n=== Verification ===" -ForegroundColor Cyan\n`;
        script += `Write-Host "\`nVirtual Switches:" -ForegroundColor Yellow\n`;
        script += `Get-VMSwitch\n\n`;
        script += `Write-Host "\`nSET Team Configuration:" -ForegroundColor Yellow\n`;
        script += `Get-VMSwitchTeam\n\n`;
        script += `Write-Host "\`nVirtual Network Adapters:" -ForegroundColor Yellow\n`;
        script += `Get-VMNetworkAdapter -ManagementOS\n\n`;
        script += `Write-Host "\`nVLAN Configuration:" -ForegroundColor Yellow\n`;
        script += `Get-VMNetworkAdapterVlan -ManagementOS\n\n`;
        script += `Write-Host "\`nIP Address Configuration:" -ForegroundColor Yellow\n`;
        script += `Get-NetIPAddress | Where-Object { $_.InterfaceAlias -like "*vNIC*" } | Format-Table\n\n`;

        script += `Write-Host "\`nHyper-V SET configuration completed successfully!" -ForegroundColor Green\n`;
        script += `Write-Host "Press any key to exit..."\n`;
        script += `$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")\n`;

        document.getElementById('script-content').textContent = script;
        document.getElementById('preview-section').style.display = 'block';
        document.getElementById('preview-section').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        this.showMessage('PowerShell script generated successfully!', 'success');
    }

    downloadScript() {
        const scriptContent = document.getElementById('script-content').textContent;
        if (!scriptContent) {
            this.showMessage('Please generate the script first.', 'error');
            return;
        }

        const blob = new Blob([scriptContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hyperv-set-config-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.ps1`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        this.showMessage('Script downloaded successfully!', 'success');
    }

    copyToClipboard() {
        const scriptContent = document.getElementById('script-content').textContent;
        if (!scriptContent) {
            this.showMessage('Please generate the script first.', 'error');
            return;
        }
        navigator.clipboard.writeText(scriptContent).then(() => {
            this.showMessage('Script copied to clipboard!', 'success');
        }).catch(err => {
            this.showMessage('Failed to copy to clipboard: ' + err.message, 'error');
        });
    }
}

window.hyperVInstance = null;
