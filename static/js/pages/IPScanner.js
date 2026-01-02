export class IPScannerPage {
    constructor() {
        this.isScanning = false;
        this.scanResults = [];
        this.ws = null;
        this.scannedCount = 0;
        this.totalIPs = 0;
    }

    async render() {
        return `
            <div class="page-container-full">
                <div class="ip-scanner-full-container">
                <div class="ip-scanner-split">
                    <div class="ip-scanner-form">
                        <div class="ip-scanner-form-header">
                            <h3><i class="fas fa-cog"></i> Configuration</h3>
                        </div>
                        <div class="ip-scanner-form-content">
                            <div class="form-group">
                            <label for="ip-range">IP Range</label>
                            <input 
                                type="text" 
                                id="ip-range" 
                                class="form-input" 
                                placeholder="192.168.1.0/24 or 192.168.1.1-192.168.1.254"
                                value="192.168.1.0/24"
                            >
                            <small class="form-help">Enter CIDR notation (e.g., 192.168.1.0/24) or range (e.g., 192.168.1.1-192.168.1.254)</small>
                        </div>

                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="scan-ports" checked>
                                Scan Ports
                            </label>
                        </div>

                        <div class="form-group" id="ports-group">
                            <label for="ports">Ports to Scan</label>
                            <input 
                                type="text" 
                                id="ports" 
                                class="form-input" 
                                placeholder="22,80,443,3389 or 1-1000"
                                value="22,23,80,135,139,443,445,3389,5985,5986"
                            >
                            <small class="form-help">Comma-separated ports or ranges (e.g., 22,80,443 or 1-1000)</small>
                        </div>

                        <div class="form-group">
                            <label for="timeout">Timeout (seconds)</label>
                            <input 
                                type="number" 
                                id="timeout" 
                                class="form-input" 
                                min="1" 
                                max="5" 
                                value="1"
                            >
                        </div>

                        <div class="form-spacer"></div>
                        
                        <div class="form-actions-bottom">
                            <button 
                                type="button" 
                                class="btn btn-primary" 
                                id="start-scan-btn"
                                onclick="ipScannerInstance.startScan()"
                            >
                                <i class="fas fa-play"></i> Start Scan
                            </button>
                            <button 
                                type="button" 
                                class="btn btn-secondary" 
                                id="stop-scan-btn"
                                onclick="ipScannerInstance.stopScan()"
                                style="display: none;"
                            >
                                <i class="fas fa-stop"></i> Stop Scan
                            </button>
                            <button 
                                type="button" 
                                class="btn btn-secondary" 
                                id="clear-btn"
                                onclick="ipScannerInstance.clearResults()"
                                style="display: none;"
                            >
                                <i class="fas fa-trash"></i> Clear
                            </button>
                            <button 
                                type="button" 
                                class="btn btn-secondary" 
                                id="export-btn"
                                onclick="ipScannerInstance.exportResults()"
                                style="display: none;"
                            >
                                <i class="fas fa-download"></i> Export
                            </button>
                        </div>
                        </div>
                    </div>

                    <div class="ip-scanner-results">
                        <div class="results-header" id="results-header" style="display: none;">
                            <div class="results-header-left">
                                <div class="results-header-top">
                                    <h3>Scan Results</h3>
                                    <div class="results-stats" id="results-stats">
                                        <span>Total: <strong id="total-count">0</strong></span>
                                        <span>Online: <strong id="online-count" style="color: #10b981;">0</strong></span>
                                        <span>Offline: <strong id="offline-count" style="color: #ef4444;">0</strong></span>
                                    </div>
                                </div>
                                <div class="scan-status-inline" id="scan-status-inline" style="display: none;">
                                    <span class="scan-status-text" id="scan-status-text">Scanning...</span>
                                </div>
                                <div class="scan-progress-inline" id="scan-progress-inline" style="display: none;">
                                    <div class="progress-bar">
                                        <div class="progress-fill" id="progress-fill"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="results-empty" id="results-empty">
                            <div class="empty-icon-wrapper">
                                <i class="fas fa-search-location"></i>
                            </div>
                            <h3>No Scan Results</h3>
                            <p>Start a scan to discover active hosts on your network.</p>
                            <div class="empty-features">
                                <div class="empty-feature">
                                    <i class="fas fa-check-circle"></i>
                                    <span>Discover active IPs</span>
                                </div>
                                <div class="empty-feature">
                                    <i class="fas fa-check-circle"></i>
                                    <span>Check open ports</span>
                                </div>
                                <div class="empty-feature">
                                    <i class="fas fa-check-circle"></i>
                                    <span>Get hostnames</span>
                                </div>
                            </div>
                        </div>
                        <div class="results-table-container" id="results-table-container" style="display: none;">
                            <table class="table-compact" id="results-table">
                                <thead>
                                    <tr>
                                        <th>IP Address</th>
                                        <th>Status</th>
                                        <th>Hostname</th>
                                        <th>Open Ports</th>
                                    </tr>
                                </thead>
                                <tbody id="results-tbody">
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                </div>
            </div>
        `;
    }

    mount() {
        // Toggle ports input visibility
        const scanPortsCheckbox = document.getElementById('scan-ports');
        const portsGroup = document.getElementById('ports-group');
        
        if (scanPortsCheckbox) {
            scanPortsCheckbox.addEventListener('change', () => {
                if (portsGroup) {
                    portsGroup.style.display = scanPortsCheckbox.checked ? 'block' : 'none';
                }
            });
        }
    }

    startScan() {
        if (this.isScanning) {
            return;
        }

        const ipRange = document.getElementById('ip-range').value.trim();
        if (!ipRange) {
            alert('Please enter an IP range');
            return;
        }

        const scanPorts = document.getElementById('scan-ports').checked;
        const ports = document.getElementById('ports').value.trim();
        const timeout = parseInt(document.getElementById('timeout').value) || 1;

        this.isScanning = true;
        this.scanResults = [];
        this.scannedCount = 0;
        this.totalIPs = 0;

        // Update UI
        document.getElementById('start-scan-btn').style.display = 'none';
        document.getElementById('stop-scan-btn').style.display = 'inline-block';
        document.getElementById('clear-btn').style.display = 'none';
        document.getElementById('export-btn').style.display = 'none';
        document.getElementById('results-empty').style.display = 'none';
        document.getElementById('results-header').style.display = 'flex';
        document.getElementById('scan-status-inline').style.display = 'flex';
        document.getElementById('scan-progress-inline').style.display = 'block';
        document.getElementById('results-table-container').style.display = 'block';
        document.getElementById('results-tbody').innerHTML = '';

        // Build WebSocket URL
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/network/ip-scanner`;
        
        // Create WebSocket connection
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            // Send scan parameters
            const initMsg = {
                range: ipRange,
                timeout: timeout,
                scanPorts: scanPorts,
                ports: ports || ''
            };
            this.ws.send(JSON.stringify(initMsg));
        };
        
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                if (data.type === 'start') {
                    this.totalIPs = data.total;
                    this.updateScanStatus(`Scanning ${this.totalIPs} IPs... (0 done - 0%)`);
                    this.updateProgress(0);
                } else if (data.type === 'done') {
                    this.stopScan();
                } else if (data.type === 'stopped') {
                    this.stopScan();
                } else if (data.type === 'error') {
                    alert(`Error: ${data.error}`);
                    this.stopScan();
                } else if (data.ip) {
                    // Result for a single IP
                    this.scanResults.push(data);
                    this.scannedCount++;
                    this.updateResults();
                    const percentage = (this.scannedCount / this.totalIPs) * 100;
                    this.updateScanStatus(`Scanning ${this.totalIPs} IPs... (${this.scannedCount} done - ${Math.round(percentage)}%)`);
                    this.updateProgress(percentage);
                }
            } catch (e) {
                console.error('Error parsing WebSocket message:', e, 'Data:', event.data);
            }
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            alert('WebSocket connection error. Please check your connection.');
            this.stopScan();
        };
        
        this.ws.onclose = () => {
            if (this.isScanning) {
                console.log('WebSocket closed');
                this.stopScan();
            }
        };
    }

    stopScan() {
        this.isScanning = false;
        
        // Send stop message to server
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'stop' }));
        }
        
        // Close WebSocket connection
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        document.getElementById('start-scan-btn').style.display = 'inline-block';
        document.getElementById('stop-scan-btn').style.display = 'none';
        document.getElementById('scan-status-inline').style.display = 'none';
        document.getElementById('scan-progress-inline').style.display = 'none';
        
        // Show Clear and Export buttons after scan is done
        if (this.scanResults.length > 0) {
            document.getElementById('clear-btn').style.display = 'flex';
            document.getElementById('export-btn').style.display = 'flex';
        } else {
            document.getElementById('clear-btn').style.display = 'none';
            document.getElementById('export-btn').style.display = 'none';
        }
    }

    clearResults() {
        if (this.isScanning) {
            if (!confirm('Stop current scan and clear results?')) {
                return;
            }
            this.stopScan();
        }

        this.scanResults = [];
        this.scannedCount = 0;
        this.totalIPs = 0;
        document.getElementById('results-empty').style.display = 'flex';
        document.getElementById('results-header').style.display = 'none';
        document.getElementById('results-table-container').style.display = 'none';
        this.updateResults();
        this.updateProgress(0);
    }

    updateProgress(percentage) {
        const progressFill = document.getElementById('progress-fill');
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
    }

    updateScanStatus(text) {
        const scanStatusText = document.getElementById('scan-status-text');
        if (scanStatusText) {
            scanStatusText.textContent = text;
        }
    }

    // Helper function to convert IP address to numeric value for sorting
    ipToNumber(ip) {
        const parts = ip.split('.');
        if (parts.length !== 4) return 0;
        return parseInt(parts[0]) * 256 * 256 * 256 +
               parseInt(parts[1]) * 256 * 256 +
               parseInt(parts[2]) * 256 +
               parseInt(parts[3]);
    }

    updateResults() {
        const tbody = document.getElementById('results-tbody');
        if (!tbody) return;

        // Sort results: online first, then by IP (numeric order)
        const sortedResults = [...this.scanResults].sort((a, b) => {
            // First, sort by status: online first
            if (a.status === 'online' && b.status !== 'online') return -1;
            if (a.status !== 'online' && b.status === 'online') return 1;
            // Then, sort by IP address numerically
            return this.ipToNumber(a.ip) - this.ipToNumber(b.ip);
        });

        tbody.innerHTML = sortedResults.map(result => {
                const statusBadge = result.status === 'online' 
                    ? '<span class="badge badge-success">Online</span>'
                    : '<span class="badge badge-danger">Offline</span>';
                
                const portsDisplay = result.ports && result.ports.length > 0
                    ? result.ports.map(p => `<span class="port-badge">${p}</span>`).join('')
                    : '<span class="text-muted">-</span>';

                return `
                    <tr>
                        <td><strong>${result.ip}</strong></td>
                        <td>${statusBadge}</td>
                        <td>${result.hostname || '<span class="text-muted">-</span>'}</td>
                        <td>${portsDisplay}</td>
                    </tr>
                `;
        }).join('');

        // Update stats
        const onlineCount = sortedResults.filter(r => r.status === 'online').length;
        const offlineCount = sortedResults.filter(r => r.status === 'offline').length;

        const totalCountEl = document.getElementById('total-count');
        const onlineCountEl = document.getElementById('online-count');
        const offlineCountEl = document.getElementById('offline-count');

        if (totalCountEl) totalCountEl.textContent = sortedResults.length;
        if (onlineCountEl) onlineCountEl.textContent = onlineCount;
        if (offlineCountEl) offlineCountEl.textContent = offlineCount;
    }

    exportResults() {
        if (this.scanResults.length === 0) {
            alert('No results to export');
            return;
        }

        // Convert to CSV
        const headers = ['IP Address', 'Status', 'Hostname', 'Open Ports'];
        const rows = this.scanResults.map(r => [
            r.ip,
            r.status,
            r.hostname || '',
            r.ports ? r.ports.join(',') : ''
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // Download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ip-scan-results-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
}

// Global instance
window.ipScannerInstance = null;

