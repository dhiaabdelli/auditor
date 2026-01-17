export class HyperVPage {
    constructor() {
        this.hosts = [];
        this.physicalNICs = [];
        this.vSwitchName = 'SET-Team';
    }

    async render() {
        return `
            <div class="page-container-full" style="padding: 0;">
                <div class="content-padding" style="padding: 1.25rem;">
                    <!-- Configuration Section Grid -->
                    <div class="config-grid">
                        <!-- Left Column: Physical & Logic -->
                        <div class="config-column">
                            <!-- Physical Adapters Section -->
                            <div class="compact-table-section">
                                <div class="section-header-compact">
                                    <div class="section-title-compact">
                                        <div class="card-header-icon-compact" style="background: rgba(59, 130, 246, 0.15);">
                                            <i class="fas fa-network-wired" style="color: #60a5fa;"></i>
                                        </div>
                                        <span>Physical Network Adapters</span>
                                    </div>
                                </div>
                                <div class="card-body-compact" style="padding: 0 0.5rem;">
                                    <div class="form-group-compact">
                                        <label class="form-label-compact">
                                            <i class="fas fa-file-alt"></i> Source Audit Report
                                        </label>
                                        <select id="report-select" class="form-input-compact" onchange="hyperVInstance.handleReportChange()">
                                            <option value="">-- Manual Entry --</option>
                                        </select>
                                        <small class="form-hint">Select a previous audit to fetch physical adapters automatically</small>
                                    </div>

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
                                            <i class="fas fa-project-diagram"></i> Switch Name
                                        </label>
                                        <input type="text" id="vswitch-name" class="form-input-compact" value="RV" placeholder="RV">
                                    </div>

                                    <div id="available-adapters-section" class="form-group-compact" style="display: none; margin-top: 1rem;">
                                        <label class="form-label-compact">
                                            <i class="fas fa-info-circle"></i> Available Adapters in Report
                                        </label>
                                        <div id="available-adapters-list" class="available-adapters-list-compact">
                                            <!-- Will be populated from report -->
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Load Balancing Section -->
                            <div class="compact-table-section" style="margin-top: 1.5rem;">
                                <div class="section-header-compact">
                                    <div class="section-title-compact">
                                        <div class="card-header-icon-compact" style="background: rgba(16, 185, 129, 0.15);">
                                            <i class="fas fa-balance-scale" style="color: #34d399;"></i>
                                        </div>
                                        <span>Load Balancing</span>
                                    </div>
                                </div>
                                <div class="card-body-compact" style="padding: 0 0.5rem;">
                                    <div class="form-group-compact">
                                        <label class="form-label-compact">
                                            <i class="fas fa-microchip"></i> Algorithm
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

                        <!-- Right Column: Virtual NICs -->
                        <div class="config-column">
                            <div class="compact-table-section">
                                <div class="section-header-compact">
                                    <div class="section-title-compact">
                                        <div class="card-header-icon-compact" style="background: rgba(139, 92, 246, 0.15);">
                                            <i class="fas fa-vial" style="color: #a78bfa;"></i>
                                        </div>
                                        <span>Virtual Network Adapters (vNICs)</span>
                                    </div>
                                </div>
                                <div class="card-body-compact" style="padding: 0 0.5rem;">
                                    <div class="vnic-section-compact">
                                        <div class="vnic-header-compact">
                                            <i class="fas fa-cog" style="color: #3b82f6; font-size: 0.8125rem;"></i>
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
                                            <i class="fas fa-heartbeat" style="color: #ef4444; font-size: 0.8125rem;"></i>
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

                    <div class="actions-compact" style="margin: 2rem 0; display: flex; justify-content: center; gap: 1rem;">
                        <button type="button" class="btn btn-primary" style="padding: 0.625rem 2rem; border-radius: 8px; font-weight: 600; font-size: 0.875rem; display: flex; align-items: center; gap: 0.75rem; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);" onclick="hyperVInstance.generateScript()">
                            <i class="fas fa-code"></i> Generate Full PowerShell Script
                        </button>
                        <button type="button" class="btn btn-secondary" style="padding: 0.625rem 2rem; border-radius: 8px; font-weight: 600; font-size: 0.875rem; display: flex; align-items: center; gap: 0.75rem;" onclick="hyperVInstance.downloadScript()">
                            <i class="fas fa-download"></i> Download .ps1
                        </button>
                    </div>

                    <div id="preview-section" class="preview-section-full" style="display: none;">
                        <div class="compact-table-section">
                            <div class="section-header-compact">
                                <div class="section-title-compact">
                                    <div class="card-header-icon-compact" style="background: rgba(245, 158, 11, 0.15);">
                                        <i class="fas fa-terminal" style="color: #fbbf24;"></i>
                                    </div>
                                    <span>Script Preview</span>
                                </div>
                                <button type="button" class="btn btn-secondary btn-compact" onclick="hyperVInstance.copyToClipboard()">
                                    <i class="fas fa-copy"></i> Copy
                                </button>
                            </div>
                            <div class="table-wrapper-compact" style="background: #0f172a; border-color: #1e293b;">
                                <div class="script-preview" style="padding: 1.25rem;">
                                    <pre id="script-content" style="margin: 0; font-family: 'Cascadia Code', 'Fira Code', monospace; font-size: 0.8125rem; color: #e2e8f0; line-height: 1.5;"></pre>
                                </div>
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
        await this.loadReports();
    }

    async loadReports() {
        try {
            const response = await fetch('/api/hyperv-reports');
            if (!response.ok) throw new Error('Failed to fetch reports');
            const reports = await response.json();

            const select = document.getElementById('report-select');
            if (!select) return;

            // Keep only the first option
            select.innerHTML = '<option value="">-- Manual Entry --</option>';

            reports.forEach(report => {
                if (report.hasData) {
                    const option = document.createElement('option');
                    option.value = report.id;
                    option.textContent = `${report.name} (${new Date(report.createdAt).toLocaleDateString()})`;
                    select.appendChild(option);
                }
            });
        } catch (error) {
            console.error('Error loading reports:', error);
            this.showMessage('Failed to load audit reports', 'error');
        }
    }

    async handleReportChange() {
        const reportId = document.getElementById('report-select').value;
        if (!reportId) {
            this.physicalNICs = [];
            const section = document.getElementById('available-adapters-section');
            if (section) section.style.display = 'none';
            this.updateAdapterNameFields();
            return;
        }

        try {
            const response = await fetch(`/api/hyperv-reports/get?id=${reportId}`);
            if (!response.ok) throw new Error('Failed to fetch report details');
            const report = await response.json();

            if (report.reportData && report.reportData.network && report.reportData.network.adapters) {
                this.physicalNICs = report.reportData.network.adapters.filter(a => !a.isVirtual);
                this.showMessage(`Found ${this.physicalNICs.length} physical adapters in report`, 'success');

                // Show available adapters section
                const section = document.getElementById('available-adapters-section');
                const list = document.getElementById('available-adapters-list');
                if (section && list) {
                    section.style.display = 'block';
                    list.innerHTML = this.physicalNICs.map(nic => `
                        <div class="adapter-info-item-compact">
                            <i class="fas fa-network-wired ${nic.status === 'Up' ? 'status-online' : 'status-offline'}" style="font-size: 0.75rem;"></i>
                            <div class="adapter-info-content">
                                <div class="adapter-info-name">${nic.name}</div>
                                <div class="adapter-info-desc">${nic.description}</div>
                            </div>
                            <div class="adapter-info-status">${nic.status}</div>
                        </div>
                    `).join('');
                }

                // Update num ports if we have adapters
                if (this.physicalNICs.length > 0) {
                    const numPortsInput = document.getElementById('num-ports');
                    numPortsInput.value = Math.min(this.physicalNICs.length, 16);
                    this.updateAdapterNameFields();
                }
            } else {
                const section = document.getElementById('available-adapters-section');
                if (section) section.style.display = 'none';
                this.showMessage('No network adapter data found in this report', 'warning');
            }
        } catch (error) {
            console.error('Error fetching report details:', error);
            const section = document.getElementById('available-adapters-section');
            if (section) section.style.display = 'none';
            this.showMessage('Failed to load report data', 'error');
        }
    }

    updateAdapterNameFields() {
        const numPorts = parseInt(document.getElementById('num-ports').value) || 2;
        const adapterNameFields = document.getElementById('adapter-name-fields');

        adapterNameFields.innerHTML = Array.from({ length: numPorts }, (_, index) => {
            const suggestedName = this.physicalNICs[index] ? this.physicalNICs[index].name : `RV${index + 1}`;
            const description = this.physicalNICs[index] ? this.physicalNICs[index].description : '';

            return `
                <div class="adapter-name-field-group-compact">
                    <span class="adapter-name-label-compact">${index + 1}.</span>
                    <div style="flex: 1;">
                        <input type="text" 
                               class="form-input-compact adapter-name-input-compact" 
                               id="adapter-name-${index}" 
                               value="${suggestedName}"
                               title="${description}"
                               required>
                        ${description ? `<small class="form-hint" style="margin-top: 2px;">${description}</small>` : ''}
                    </div>
                </div>
            `;
        }).join('');
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
        script += `# Generated: ${new Date().toLocaleString()}\n`;
        script += `# vSwitch Name: ${vSwitchName}\n`;
        script += `# Load Balancing: ${loadBalancing}\n\n`;

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
        script += `$index = 1\n`;
        script += `foreach ($adapter in $allAdapters) {\n`;
        script += `    Write-Host "[$index] $($adapter.Name) - $($adapter.InterfaceDescription) - Status: $($adapter.Status)" -ForegroundColor White\n`;
        script += `    $index++\n`;
        script += `}\n\n`;

        // Step 2: Interactive selection and renaming
        script += `# Step 2: Select and Rename Adapters\n`;
        script += `Write-Host "\`n=== Adapter Selection and Renaming ===" -ForegroundColor Cyan\n`;
        script += `$selectedAdapters = @()\n`;
        script += `$usedAdapters = @()\n\n`;

        desiredNames.forEach((desiredName, index) => {
            const nicInReport = this.physicalNICs[index];
            const originalName = nicInReport ? nicInReport.name : '';
            const description = nicInReport ? nicInReport.description : '';

            script += `# Selection for: ${desiredName}\n`;
            script += `Write-Host "\`n--- Port ${index + 1}: ${desiredName} ---" -ForegroundColor Yellow\n`;

            if (originalName || description) {
                script += `# Attempting auto-match from report data\n`;
                script += `$autoMatch = $null\n`;
                if (originalName) {
                    script += `$autoMatch = $allAdapters | Where-Object { $_.Name -eq "${originalName}" -and $usedAdapters -notcontains $_.Name }\n`;
                }
                if (description) {
                    script += `if (-not $autoMatch) { $autoMatch = $allAdapters | Where-Object { $_.InterfaceDescription -eq "${description}" -and $usedAdapters -notcontains $_.Name } }\n`;
                }

                script += `if ($autoMatch) {\n`;
                script += `    Write-Host "Found matching adapter: $($autoMatch.Name) ($($autoMatch.InterfaceDescription))" -ForegroundColor Gray\n`;
                script += `    $selectionNum = $allAdapters.IndexOf($autoMatch) + 1\n`;
                script += `    $confirm = Read-Host "Use this adapter? (Y/n) [Detected from report]"\n`;
                script += `    if ($confirm -eq "" -or $confirm -eq "y") {\n`;
                script += `        $selection = $selectionNum\n`;
                script += `    } else {\n`;
                script += `        $selection = Read-Host "Enter adapter number manually"\n`;
                script += `    }\n`;
                script += `} else {\n`;
                script += `    $selection = Read-Host "No match found. Enter adapter number for '${desiredName}'"\n`;
                script += `}\n`;
            } else {
                script += `$selection = Read-Host "Enter adapter number for '${desiredName}'"\n`;
            }

            script += `do {\n`;
            script += `    $selectionNum = [int]$selection\n`;
            script += `    if ($selectionNum -lt 1 -or $selectionNum -gt $allAdapters.Count) {\n`;
            script += `        Write-Host "Invalid selection. Enter 1-$($allAdapters.Count)." -ForegroundColor Red\n`;
            script += `        $selection = Read-Host "Enter adapter number"\n`;
            script += `        continue\n`;
            script += `    }\n`;
            script += `    \n`;
            script += `    $targetAdapter = $allAdapters[$selectionNum - 1]\n`;
            script += `    if ($usedAdapters -contains $targetAdapter.Name) {\n`;
            script += `        Write-Host "Adapter already selected. Choose another." -ForegroundColor Red\n`;
            script += `        $selection = Read-Host "Enter adapter number"\n`;
            script += `        continue\n`;
            script += `    }\n`;
            script += `    \n`;
            script += `    # Rename logic\n`;
            script += `    if ($targetAdapter.Name -eq "${desiredName}") {\n`;
            script += `        Write-Host "Adapter already named '${desiredName}', skipping rename." -ForegroundColor Gray\n`;
            script += `        $selectedAdapters += "${desiredName}"\n`;
            script += `        $usedAdapters += $targetAdapter.Name\n`;
            script += `        break\n`;
            script += `    }\n`;
            script += `    \n`;
            script += `    Write-Host "Renaming '$($targetAdapter.Name)' to '${desiredName}'..." -ForegroundColor Cyan\n`;
            script += `    try {\n`;
            script += `        Rename-NetAdapter -Name $targetAdapter.Name -NewName "${desiredName}" -ErrorAction Stop\n`;
            script += `        $selectedAdapters += "${desiredName}"\n`;
            script += `        $usedAdapters += $targetAdapter.Name\n`;
            script += `        break\n`;
            script += `    } catch {\n`;
            script += `        Write-Host "Error: $_" -ForegroundColor Red\n`;
            script += `        $selection = Read-Host "Select a different adapter number"\n`;
            script += `    }\n`;
            script += `} while ($true)\n\n`;
        });

        script += `Write-Host "\`nAll adapters successfully identified and named." -ForegroundColor Green\n\n`;

        // Step 3: Remove existing vSwitch
        script += `# Step 3: Ensure vSwitch ${vSwitchName} is ready\n`;
        script += `Write-Host "Checking for existing vSwitch: ${vSwitchName}..." -ForegroundColor Yellow\n`;
        script += `$existingSwitch = Get-VMSwitch -Name "${vSwitchName}" -ErrorAction SilentlyContinue\n`;
        script += `if ($existingSwitch) {\n`;
        script += `    Write-Host "Removing existing switch to re-create with teaming..." -ForegroundColor Yellow\n`;
        script += `    Remove-VMSwitch -Name "${vSwitchName}" -Force\n`;
        script += `}\n\n`;

        // Step 4: Create SET switch
        script += `# Step 4: Create SET switch\n`;
        script += `Write-Host "Creating SET switch with Embedded Teaming..." -ForegroundColor Yellow\n`;
        const nicList = desiredNames.map(name => `"${name}"`).join(',');
        script += `New-VMSwitch -Name "${vSwitchName}" -NetAdapterName ${nicList} -EnableEmbeddedTeaming $true -AllowManagementOS $false\n`;
        script += `Write-Host "vSwitch created successfully." -ForegroundColor Green\n\n`;

        // Step 5: Create vNICs
        script += `# Step 5: Create Management and Heartbeat vNICs\n`;
        script += `Add-VMNetworkAdapter -ManagementOS -Name "vNIC-MGMT" -SwitchName "${vSwitchName}"\n`;
        script += `Add-VMNetworkAdapter -ManagementOS -Name "vNIC-HEARTBEAT" -SwitchName "${vSwitchName}"\n`;

        // Step 6: Tag VLANs
        script += `# Step 6: Tag VLANs\n`;
        script += `Set-VMNetworkAdapterVlan -ManagementOS -VMNetworkAdapterName "vNIC-MGMT" -Access -VlanId ${mgmtVlan}\n`;
        script += `Set-VMNetworkAdapterVlan -ManagementOS -VMNetworkAdapterName "vNIC-HEARTBEAT" -Access -VlanId ${heartbeatVlan}\n`;

        // Step 7: Assign IPs
        script += `# Step 7: Configure IP Addresses\n`;
        if (mgmtIP) {
            script += `$mgmtNIC = Get-NetAdapter | Where-Object { $_.Name -like "*vNIC-MGMT*" }\n`;
            script += `New-NetIPAddress -InterfaceAlias $mgmtNIC.Name -IPAddress "${mgmtIP}" -PrefixLength ${mgmtPrefix} -DefaultGateway "${mgmtGateway}"\n`;
            if (mgmtDNS) {
                const dnsArray = mgmtDNS.split(',').map(d => d.trim()).filter(d => d);
                script += `Set-DnsClientServerAddress -InterfaceAlias $mgmtNIC.Name -ServerAddresses @(${dnsArray.map(d => `"${d}"`).join(', ')})\n`;
            }
        }
        if (heartbeatIP) {
            script += `$hbNIC = Get-NetAdapter | Where-Object { $_.Name -like "*vNIC-HEARTBEAT*" }\n`;
            script += `New-NetIPAddress -InterfaceAlias $hbNIC.Name -IPAddress "${heartbeatIP}" -PrefixLength ${heartbeatPrefix}\n`;
        }

        // Step 8: Load Balancing
        script += `# Step 8: Finalize Team Load Balancing\n`;
        script += `Set-VMSwitchTeam -Name "${vSwitchName}" -LoadBalancingAlgorithm ${loadBalancing}\n`;

        script += `Write-Host "\`nHyper-V SET Teams configuration completed!" -ForegroundColor Green\n`;
        script += `Write-Host "Press any key to closing..."\n`;
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
