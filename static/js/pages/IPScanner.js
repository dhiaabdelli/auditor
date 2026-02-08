export class IPScannerPage {
    constructor() {
        this.isScanning = false;
        this.scanResults = [];
        this.ws = null;
        this.scannedCount = 0;
        this.totalIPs = 0;
    }

    async render() {
        // Ensure global instance is available for onclick handlers
        window.ipScannerInstance = this;

        return `
            <div class="page-container-full">
                <div class="ip-scanner-full-container">
                    
                    <!-- Header -->
                    <div class="ip-scanner-header">
                        <div class="header-progress-bar"><div class="header-progress-fill" id="progress-fill"></div></div>
                        <div class="ip-scanner-header-left">
                            <h3><i class="fas fa-network-wired"></i> IP Scanner</h3>
                            <div class="ip-scanner-controls">
                                <input type="text" id="ip-range" class="ip-scanner-input" placeholder="IP Range (e.g. 192.168.1.0/24)" value="192.168.1.0/24" style="width: 160px;" title="IP Range / CIDR">
                                
                                <select id="scan-method" class="ip-scanner-input" title="Scan Method" style="width: 120px;">
                                    <option value="connect">Connect Scan</option>
                                    <option value="syn">SYN Scan</option>
                                </select>
                                
                                <label class="ip-checkbox-wrapper" title="ICMP Discovery">
                                    <input type="checkbox" id="icmp-discovery" checked>
                                    <span>ICMP</span>
                                </label>

                                <select id="port-range" class="ip-scanner-input" title="Port Range" style="width: 140px;">
                                    <option value="1024">First 1024 Ports</option>
                                    <option value="all">All Ports (1-65535)</option>
                                </select>
                            </div>
                        </div>
                        <div class="ip-scanner-header-right">
                            <span id="scan-status-badge" class="ip-scanner-status-badge stopped">
                                <i class="fas fa-circle"></i> Ready
                            </span>
                             <div class="btn-group">
                                <button id="start-scan-btn" class="btn btn-sm btn-primary" onclick="window.ipScannerInstance.startScan()">
                                    <i class="fas fa-play"></i> Start
                                </button>
                                <button id="stop-scan-btn" class="btn btn-sm btn-danger" onclick="window.ipScannerInstance.stopScan()" style="display: none;">
                                     <i class="fas fa-stop"></i> Stop
                                </button>
                                <button id="clear-btn" class="btn btn-sm btn-secondary" onclick="window.ipScannerInstance.clearResults()" style="display: none;" title="Clear Results">
                                    <i class="fas fa-trash"></i>
                                </button>
                                <button id="export-btn" class="btn btn-sm btn-secondary" onclick="window.ipScannerInstance.exportResults()" style="display: none;" title="Export CSV">
                                    <i class="fas fa-download"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Content Area -->
                    <div class="ip-scanner-content-area">
                         <div class="results-table-container" id="results-table-container" style="display: none;">
                             <div class="ip-scanner-results-scroll">
                                <table class="table-compact" id="results-table">
                                    <thead>
                                        <tr>
                                            <th>IP Address</th>
                                            <th>Status</th>
                                            <th>Hostname</th>
                                            <th>MAC Address</th>
                                            <th>Open Ports</th>
                                        </tr>
                                    </thead>
                                    <tbody id="results-tbody">
                                    </tbody>
                                </table>
                             </div>
                             
                             <div style="padding: 4px 12px; background: var(--card-bg); border-top: 1px solid var(--header-border); font-size: 11px; color: var(--text-muted); display: flex; gap: 15px; border-bottom: 1px solid var(--header-border);">
                                <span>Total: <strong id="total-count">0</strong></span>
                                <span>Online: <strong id="online-count" style="color: #10b981;">0</strong></span>
                             </div>
                        </div>
                        
                        <div class="results-empty" id="results-empty">
                             <div class="empty-icon-wrapper">
                                <i class="fas fa-search-location"></i>
                            </div>
                            <h3>Ready to Scan</h3>
                            <p>Enter an IP range and click Start to discover network devices.</p>
                        </div>
                    </div>
                </div>

                <!-- Banner Modal -->
                <div class="ip-scanner-modal-overlay" id="banner-modal" onclick="if(event.target === this) window.ipScannerInstance.closeBannerModal()">
                    <div class="ip-scanner-modal">
                        <div class="ip-scanner-modal-header">
                            <h3 id="modal-title">Service Banner</h3>
                            <button class="ip-scanner-modal-close" onclick="window.ipScannerInstance.closeBannerModal()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="ip-scanner-modal-body" id="modal-body">
                            <!-- Content -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    mount() {
        // No mounting logic needed
    }

    showBannerModal(ip, port) {
        const result = this.scanResults.find(r => r.ip === ip);
        const banner = result && result.banners ? result.banners[port] : 'No banner data available';

        const modal = document.getElementById('banner-modal');
        const title = document.getElementById('modal-title');
        const body = document.getElementById('modal-body');

        if (modal && title && body) {
            title.innerHTML = `<i class="fas fa-info-circle"></i> Service on ${ip}:${port}`;
            body.innerHTML = `
                <div style="margin-bottom: 8px; color: var(--text-muted);">Decoded Banner:</div>
                <div class="banner-content">${this.escapeHtml(banner)}</div>
            `;
            modal.classList.add('active');
        }
    }

    closeBannerModal() {
        const modal = document.getElementById('banner-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    startScan() {
        if (this.isScanning) return;

        const ipRange = document.getElementById('ip-range').value.trim();
        if (!ipRange) {
            alert('Please enter an IP range');
            return;
        }

        const timeout = 1;
        const scanMethod = document.getElementById('scan-method').value;
        const icmpDiscovery = document.getElementById('icmp-discovery').checked;
        const portRange = document.getElementById('port-range').value;

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
        document.getElementById('results-table-container').style.display = 'flex';
        document.getElementById('results-table-container').style.flexDirection = 'column';

        document.getElementById('results-tbody').innerHTML = '';

        this.updateScanStatus('Initializing...', 'scanning');
        this.updateProgress(0);

        // Build WebSocket URL
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/network/ip-scanner`;

        // Create WebSocket connection
        this.ws = new WebSocket(wsUrl);

        // Keep alive interval
        this.pingInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000);

        this.ws.onopen = () => {
            // Send scan parameters
            const initMsg = {
                range: ipRange,
                timeout: timeout,
                scanPorts: true,
                ports: '',
                scanMethod: scanMethod,
                bannerGrabbing: true,
                icmpDiscovery: icmpDiscovery,
                portRange: portRange
            };
            this.ws.send(JSON.stringify(initMsg));
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'start') {
                    this.totalIPs = data.total;
                    this.updateScanStatus(`Scanning ${this.totalIPs} IPs...`, 'scanning');
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
                    const percentage = this.totalIPs > 0 ? (this.scannedCount / this.totalIPs) * 100 : 0;
                    this.updateScanStatus(`Scanning... ${Math.floor(percentage)}%`, 'scanning');
                    this.updateProgress(percentage);
                }
            } catch (e) {
                console.error('Error parsing WebSocket message:', e, 'Data:', event.data);
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.stopScan();
        };

        this.ws.onclose = () => {
            if (this.isScanning) {
                this.stopScan();
            }
        };
    }

    stopScan() {
        this.isScanning = false;

        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }

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

        this.updateScanStatus('Ready', 'stopped');
        this.updateProgress(0);

        // Show Clear and Export buttons after scan is done
        if (this.scanResults.length > 0) {
            document.getElementById('clear-btn').style.display = 'inline-block';
            document.getElementById('export-btn').style.display = 'inline-block';
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
        document.getElementById('results-table-container').style.display = 'none';

        const totalCountEl = document.getElementById('total-count');
        const onlineCountEl = document.getElementById('online-count');
        if (totalCountEl) totalCountEl.textContent = '0';
        if (onlineCountEl) onlineCountEl.textContent = '0';

        this.updateProgress(0);
        this.updateScanStatus('Ready', 'stopped');
    }

    updateProgress(percentage) {
        const progressFill = document.getElementById('progress-fill');
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
    }

    updateScanStatus(text, type) {
        const badge = document.getElementById('scan-status-badge');
        if (badge) {
            badge.innerHTML = `<i class="fas fa-circle"></i> ${text}`;
            // Preserve base class, remove old type, add new type
            badge.className = `ip-scanner-status-badge ${type}`;
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
                ? '<span style="color:#10b981; font-weight:600;">Online</span>'
                : '<span style="color:#ef4444;">Offline</span>';

            const portsDisplay = result.ports && result.ports.length > 0
                ? result.ports.map(p => {
                    let banner = '';
                    let hasBanner = false;
                    if (result.banners && result.banners[p]) {
                        banner = result.banners[p].replace(/"/g, '&quot;');
                        hasBanner = true;
                    }

                    // Modified to be clickable for modal
                    if (hasBanner) {
                        return `<span class="port-badge has-banner" onclick="window.ipScannerInstance.showBannerModal('${result.ip}', ${p})" title="Click to view banner">${p}</span>`;
                    } else {
                        return `<span class="port-badge">${p}</span>`;
                    }
                }).join('')
                : '<span class="text-muted">-</span>';

            return `
                    <tr>
                        <td><strong>${result.ip}</strong></td>
                        <td>${statusBadge}</td>
                        <td>${result.hostname || '<span class="text-muted">-</span>'}</td>
                        <td class="text-muted" style="font-size: 11px;">${result.mac || '-'}</td>
                        <td>${portsDisplay}</td>
                    </tr>
                `;
        }).join('');

        // Update stats
        const onlineCount = sortedResults.filter(r => r.status === 'online').length;

        const totalCountEl = document.getElementById('total-count');
        const onlineCountEl = document.getElementById('online-count');

        if (totalCountEl) totalCountEl.textContent = sortedResults.length;
        if (onlineCountEl) onlineCountEl.textContent = onlineCount;
    }

    exportResults() {
        if (this.scanResults.length === 0) {
            alert('No results to export');
            return;
        }

        // Convert to CSV
        const headers = ['IP Address', 'Status', 'Hostname', 'MAC Address', 'Open Ports', 'Banners'];
        const rows = this.scanResults.map(r => [
            r.ip,
            r.status,
            r.hostname || '',
            r.mac || '',
            r.ports ? r.ports.join(';') : '',
            r.banners ? JSON.stringify(r.banners).replace(/"/g, '""') : ''
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
