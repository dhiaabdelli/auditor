export class NetworkConfigPage {
    constructor() {
        this.configCount = 1;
    }

    async render() {
        return `
            <div class="page-container">
                <div class="page-header">
                    <h1 class="page-title">🌐 Network Config Generator</h1>
                    <p class="page-subtitle">Generate network configuration scripts and commands</p>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Network Configuration</h2>
                    </div>
                    <div class="card-body">
                        <div class="form-section">
                            <div class="form-group">
                                <label class="form-label">Adapter Name</label>
                                <input type="text" class="form-input" id="adapter-name" placeholder="e.g., Ethernet, Wi-Fi">
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">IP Address</label>
                                <input type="text" class="form-input" id="ip-address" placeholder="e.g., 192.168.1.100">
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Subnet Mask</label>
                                <input type="text" class="form-input" id="subnet-mask" placeholder="e.g., 255.255.255.0">
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Default Gateway</label>
                                <input type="text" class="form-input" id="gateway" placeholder="e.g., 192.168.1.1">
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">DNS Servers (comma-separated)</label>
                                <input type="text" class="form-input" id="dns-servers" placeholder="e.g., 8.8.8.8, 8.8.4.4">
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Script Type</label>
                            <select class="form-input" id="script-type">
                                <option value="powershell">PowerShell</option>
                                <option value="batch">Batch Script</option>
                                <option value="netsh">Netsh Commands</option>
                            </select>
                        </div>

                        <div class="actions">
                            <button type="button" class="btn btn-primary" onclick="networkConfigInstance.generateScript()">
                                <i class="fas fa-code"></i> Generate Script
                            </button>
                            <button type="button" class="btn btn-secondary" onclick="networkConfigInstance.downloadScript()">
                                <i class="fas fa-download"></i> Download Script
                            </button>
                        </div>
                    </div>
                </div>

                <div id="preview-section" class="preview-section" style="display: none;">
                    <h2>Generated Script Preview</h2>
                    <div class="script-preview">
                        <pre id="script-content"></pre>
                    </div>
                    <button type="button" class="btn btn-primary btn-copy" onclick="networkConfigInstance.copyToClipboard()">
                        <i class="fas fa-copy"></i> Copy to Clipboard
                    </button>
                </div>

                <div id="message" class="message"></div>
            </div>
        `;
    }

    async mount() {
        window.networkConfigInstance = this;
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
        const adapterName = document.getElementById('adapter-name').value.trim();
        const ipAddress = document.getElementById('ip-address').value.trim();
        const subnetMask = document.getElementById('subnet-mask').value.trim();
        const gateway = document.getElementById('gateway').value.trim();
        const dnsServers = document.getElementById('dns-servers').value.trim();
        const scriptType = document.getElementById('script-type').value;

        if (!adapterName) {
            this.showMessage('Please enter an adapter name.', 'error');
            return;
        }

        let script = '';

        if (scriptType === 'powershell') {
            script = `# Network Configuration Script - PowerShell\n`;
            script += `# Generated: ${new Date().toLocaleString()}\n\n`;
            script += `# Check for administrator privileges\n`;
            script += `$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)\n`;
            script += `if (-not $isAdmin) {\n`;
            script += `    Write-Host "This script requires administrator privileges." -ForegroundColor Red\n`;
            script += `    exit 1\n`;
            script += `}\n\n`;
            script += `$adapterName = "${adapterName}"\n`;
            script += `$adapter = Get-NetAdapter -Name $adapterName -ErrorAction SilentlyContinue\n\n`;
            script += `if (-not $adapter) {\n`;
            script += `    Write-Host "Adapter '$adapterName' not found!" -ForegroundColor Red\n`;
            script += `    exit 1\n`;
            script += `}\n\n`;
            
            if (ipAddress && subnetMask) {
                script += `# Configure IP Address\n`;
                script += `Remove-NetIPAddress -InterfaceAlias $adapterName -Confirm:$false -ErrorAction SilentlyContinue\n`;
                script += `New-NetIPAddress -InterfaceAlias $adapterName -IPAddress "${ipAddress}" -PrefixLength ${this.getPrefixLength(subnetMask)} -DefaultGateway "${gateway || '0.0.0.0'}"\n\n`;
            }
            
            if (dnsServers) {
                script += `# Configure DNS Servers\n`;
                const dnsArray = dnsServers.split(',').map(s => s.trim()).filter(s => s);
                script += `Set-DnsClientServerAddress -InterfaceAlias $adapterName -ServerAddresses (${dnsArray.map(d => `"${d}"`).join(', ')})\n\n`;
            }
            
            script += `Write-Host "Network configuration completed!" -ForegroundColor Green\n`;
        } else if (scriptType === 'batch') {
            script = `@echo off\n`;
            script += `REM Network Configuration Script - Batch\n`;
            script += `REM Generated: ${new Date().toLocaleString()}\n\n`;
            script += `set ADAPTER_NAME=${adapterName}\n\n`;
            
            if (ipAddress && subnetMask && gateway) {
                script += `REM Configure IP Address\n`;
                script += `netsh interface ip set address name="%ADAPTER_NAME%" static ${ipAddress} ${subnetMask} ${gateway}\n\n`;
            }
            
            if (dnsServers) {
                script += `REM Configure DNS Servers\n`;
                const dnsArray = dnsServers.split(',').map(s => s.trim()).filter(s => s);
                script += `netsh interface ip set dns name="%ADAPTER_NAME%" static ${dnsArray[0]}\n`;
                if (dnsArray.length > 1) {
                    script += `netsh interface ip add dns name="%ADAPTER_NAME%" ${dnsArray[1]} index=2\n`;
                }
                script += `\n`;
            }
            
            script += `echo Network configuration completed!\npause\n`;
        } else { // netsh
            script = `REM Network Configuration - Netsh Commands\n`;
            script += `REM Generated: ${new Date().toLocaleString()}\n\n`;
            
            if (ipAddress && subnetMask && gateway) {
                script += `netsh interface ip set address name="${adapterName}" static ${ipAddress} ${subnetMask} ${gateway}\n`;
            }
            
            if (dnsServers) {
                const dnsArray = dnsServers.split(',').map(s => s.trim()).filter(s => s);
                script += `netsh interface ip set dns name="${adapterName}" static ${dnsArray[0]}\n`;
                if (dnsArray.length > 1) {
                    script += `netsh interface ip add dns name="${adapterName}" ${dnsArray[1]} index=2\n`;
                }
            }
        }

        document.getElementById('script-content').textContent = script;
        document.getElementById('preview-section').style.display = 'block';
        document.getElementById('preview-section').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        this.showMessage('Script generated successfully!', 'success');
    }

    getPrefixLength(subnetMask) {
        const parts = subnetMask.split('.').map(Number);
        let prefix = 0;
        for (let part of parts) {
            prefix += part.toString(2).split('1').length - 1;
        }
        return prefix;
    }

    downloadScript() {
        const scriptContent = document.getElementById('script-content').textContent;
        if (!scriptContent) {
            this.showMessage('Please generate the script first.', 'error');
            return;
        }

        const scriptType = document.getElementById('script-type').value;
        const extension = scriptType === 'powershell' ? 'ps1' : 'bat';
        
        const blob = new Blob([scriptContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `network-config-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.${extension}`;
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

window.networkConfigInstance = null;

