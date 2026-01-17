
export class WifiManagerPage {
    constructor() {
        this.refreshInterval = null;
        this.data = null;
        this.showPassword = false;
    }

    async render() {
        return `
            <div class="page-container-full" style="padding: 0;">
                <div class="content-padding" style="padding: 0 0.75rem;">
                    <!-- Upstream Connection (Client Mode) -->
                    <div id="upstream-section" class="compact-summary-section" style="margin-bottom: 0.75rem; display: none;">
                        <div class="compact-summary-header" style="margin-bottom: 0.5rem; padding-bottom: 0.375rem;">
                            <h2 class="compact-section-title" style="font-size: 0.875rem;">
                                <i class="fas fa-link" style="color: #10b981;"></i>
                                Upstream Connection (Client)
                                <span class="status-badge" id="upstream-status" style="font-size: 0.65rem; padding: 0.1rem 0.4rem;">Checking...</span>
                            </h2>
                        </div>
                        <div class="compact-summary-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
                            <div class="compact-stat-card stat-success">
                                <div class="stat-icon" style="width: 28px; height: 28px; font-size: 0.875rem;"><i class="fas fa-broadcast-tower"></i></div>
                                <div class="stat-content">
                                    <div class="stat-label" style="font-size: 0.6rem;">Connected To</div>
                                    <div class="stat-value" id="upstream-ssid" style="font-size: 0.9375rem;">--</div>
                                    <div class="stat-detail" id="upstream-bssid" style="font-size: 0.65rem;">BSSID: --</div>
                                </div>
                            </div>
                            <div class="compact-stat-card stat-servers">
                                <div class="stat-icon" style="width: 28px; height: 28px; font-size: 0.875rem;"><i class="fas fa-signal"></i></div>
                                <div class="stat-content">
                                    <div class="stat-label" style="font-size: 0.6rem;">Signal / Freq</div>
                                    <div class="stat-value" id="upstream-signal" style="font-size: 0.9375rem;">-- dBm</div>
                                    <div class="stat-detail" id="upstream-freq" style="font-size: 0.65rem;">Freq: -- MHz</div>
                                </div>
                            </div>
                            <div class="compact-stat-card stat-vms">
                                <div class="stat-icon" style="width: 28px; height: 28px; font-size: 0.875rem;"><i class="fas fa-tachometer-alt"></i></div>
                                <div class="stat-content">
                                    <div class="stat-label" style="font-size: 0.6rem;">Link Speed</div>
                                    <div class="stat-value" id="upstream-bitrate" style="font-size: 0.9375rem;">-- Mbps</div>
                                    <div class="stat-detail" style="font-size: 0.65rem;">TX Rate</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- AP Summary Grid -->
                    <div class="compact-summary-section" style="margin-bottom: 0.75rem;">
                        <div class="compact-summary-header" style="margin-bottom: 0.5rem; padding-bottom: 0.375rem;">
                            <h2 class="compact-section-title" style="font-size: 0.875rem;">
                                <i class="fas fa-satellite-dish" style="color: #3b82f6;"></i>
                                Access Point Status
                            </h2>
                        </div>
                        <div class="compact-summary-grid">
                            <div class="compact-stat-card stat-servers">
                                <div class="stat-icon" style="width: 32px; height: 32px; font-size: 0.9375rem;"><i class="fas fa-network-wired"></i></div>
                                <div class="stat-content">
                                    <div class="stat-label" style="font-size: 0.65rem;">Network (SSID)</div>
                                    <div class="stat-value" id="ap-ssid" style="font-size: 1rem;">--</div>
                                    <div style="display: flex; align-items: center; gap: 6px; margin-top: 2px;">
                                        <span id="ap-password" style="font-family: monospace; color: #94a3b8; letter-spacing: 0.5px; font-size: 0.7rem;">••••••••</span>
                                        <button onclick="wifiManagerInstance.togglePassword()" style="background: none; border: none; color: #3b82f6; cursor: pointer; padding: 0;">
                                            <i id="password-toggle-icon" class="fas fa-eye" style="font-size: 0.65rem;"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div class="compact-stat-card stat-success">
                                <div class="stat-icon" style="width: 32px; height: 32px; font-size: 0.9375rem;"><i class="fas fa-sliders-h"></i></div>
                                <div class="stat-content">
                                    <div class="stat-label" style="font-size: 0.65rem;">Mode / Channel</div>
                                    <div class="stat-value" id="ap-band" style="font-size: 1rem;">--</div>
                                    <div class="stat-detail" id="ap-protocol" style="font-size: 0.7rem;">Protocol: --</div>
                                </div>
                            </div>

                            <div class="compact-stat-card stat-vms">
                                <div class="stat-icon" style="width: 32px; height: 32px; font-size: 0.9375rem;"><i class="fas fa-users"></i></div>
                                <div class="stat-content">
                                    <div class="stat-label" style="font-size: 0.65rem;">Active Clients</div>
                                    <div class="stat-value" id="total-clients" style="font-size: 1rem;">0</div>
                                    <div class="stat-detail" style="font-size: 0.7rem;"><span class="status-indicator status-online" style="width: 6px; height: 6px;"></span> Online</div>
                                </div>
                            </div>

                            <div class="compact-stat-card stat-storage">
                                <div class="stat-icon" style="width: 32px; height: 32px; font-size: 0.9375rem;"><i class="fas fa-exchange-alt"></i></div>
                                <div class="stat-content">
                                    <div class="stat-label" style="font-size: 0.65rem;">Bandwidth Usage</div>
                                    <div class="stat-value" id="bandwidth-total" style="font-size: 1rem;">0 MB</div>
                                    <div class="stat-detail" id="ap-interface" style="font-size: 0.7rem;">Intf: --</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Connected Devices Section (Auditor Style) -->
                    <div class="compact-table-section" style="margin-top: 1.25rem;">
                        <div class="section-header-compact">
                            <div style="display: flex; align-items: center; gap: 0.75rem;">
                                <div class="card-header-icon-compact" style="background: rgba(59, 130, 246, 0.15); width: 28px; height: 28px; border-radius: 4px;">
                                    <i class="fas fa-users" style="color: #60a5fa; font-size: 0.8125rem;"></i>
                                </div>
                                <div class="section-title-compact">
                                    Connected Devices
                                    <span style="margin-left: 0.5rem; font-size: 0.6875rem; color: #94a3b8; font-weight: normal; opacity: 0.8;">
                                        Real-time wireless station monitoring
                                    </span>
                                </div>
                            </div>
                            <div id="client-count-badge" style="background: rgba(59, 130, 246, 0.2); color: #60a5fa; padding: 0.125rem 0.625rem; border-radius: 6px; font-size: 0.7rem; font-weight: 600; border: 1px solid rgba(59, 130, 246, 0.3);">
                                0 Clients
                            </div>
                        </div>
                        <div class="table-wrapper-compact">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th style="width: 25%;">Device Information</th>
                                        <th style="width: 14%;">Network Address</th>
                                        <th style="width: 14%;">Physical Address</th>
                                        <th style="width: 16%;">Signal Strength</th>
                                        <th style="width: 18%;">Throughput</th>
                                        <th style="width: 10%;">Uptime</th>
                                        <th style="width: 3%; text-align: center;">Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="clients-tbody">
                                    <tr>
                                        <td colspan="7" style="text-align: center; padding: 4rem; color: #94a3b8;">
                                            <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
                                                <i class="fas fa-circle-notch fa-spin" style="font-size: 1.5rem; color: #3b82f6; opacity: 0.5;"></i>
                                                <div style="font-size: 0.8125rem; letter-spacing: 0.025em;">Scanning wireless environment...</div>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getDeviceIcon(vendor) {
        if (!vendor) return 'fa-laptop';
        const v = vendor.toLowerCase();
        if (v.includes('apple')) return 'fa-mobile-alt';
        if (v.includes('sams') || v.includes('google') || v.includes('android')) return 'fa-mobile-alt';
        if (v.includes('intel') || v.includes('dell') || v.includes('hp')) return 'fa-laptop';
        if (v.includes('asus') || v.includes('gigabyte')) return 'fa-desktop';
        if (v.includes('tplink') || v.includes('cisco') || v.includes('ubiquiti')) return 'fa-network-wired';
        return 'fa-laptop';
    }

    async mount() {
        window.wifiManagerInstance = this;
        await this.loadData();

        // Auto refresh every 5s
        this.refreshInterval = setInterval(() => this.loadData(), 5000);
    }

    unmount() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }

    async loadData() {
        try {
            const response = await fetch('/api/wifi/status');
            if (response.ok) {
                this.data = await response.json();
                this.updateUI();
            } else {
                console.error("Failed to load Wifi status");
            }
        } catch (e) {
            console.error("Error loading Wifi status", e);
        }
    }

    togglePassword() {
        this.showPassword = !this.showPassword;
        this.updatePasswordDisplay();
    }

    updatePasswordDisplay() {
        const passElem = document.getElementById('ap-password');
        const iconElem = document.getElementById('password-toggle-icon');
        if (!passElem || !this.data) return;

        if (this.showPassword) {
            passElem.textContent = this.data.password || 'No Password';
            passElem.style.letterSpacing = 'normal';
            iconElem.className = 'fas fa-eye-slash';
        } else {
            passElem.textContent = '••••••••';
            passElem.style.letterSpacing = '1px';
            iconElem.className = 'fas fa-eye';
        }
    }

    updateUI() {
        if (!this.data) return;

        // Update Dashboard
        document.getElementById('ap-ssid').textContent = this.data.ssid || 'Unknown';
        this.updatePasswordDisplay();
        document.getElementById('ap-interface').textContent = `Interface: ${this.data.interface}`;
        document.getElementById('ap-band').textContent = this.data.band || '--';
        document.getElementById('ap-protocol').textContent = `${this.data.protocol} (Ch ${this.data.channel})`;
        document.getElementById('total-clients').textContent = this.data.totalClients;

        // Update Upstream Status
        const upstreamSection = document.getElementById('upstream-section');
        if (this.data.linkStatus && this.data.linkStatus.connected) {
            upstreamSection.style.display = 'block';
            document.getElementById('upstream-ssid').textContent = this.data.linkStatus.ssid || 'Unknown';
            document.getElementById('upstream-bssid').textContent = `BSSID: ${this.data.linkStatus.bssid || '--'}`;
            document.getElementById('upstream-signal').textContent = `${this.data.linkStatus.signal} dBm`;
            document.getElementById('upstream-freq').textContent = `Freq: ${this.data.linkStatus.freq} MHz`;
            document.getElementById('upstream-bitrate').textContent = `${this.data.linkStatus.bitrate} Mbps`;

            const statusBadge = document.getElementById('upstream-status');
            statusBadge.className = 'status-badge status-online';
            statusBadge.textContent = 'Connected';
            statusBadge.style.fontSize = '0.65rem';
            statusBadge.style.padding = '0.1rem 0.4rem';
        } else if (upstreamSection) {
            upstreamSection.style.display = 'block'; // Keep it visible but show disconnected
            document.getElementById('upstream-ssid').textContent = '--';
            document.getElementById('upstream-bssid').textContent = 'Not connected';
            document.getElementById('upstream-signal').textContent = '--';
            document.getElementById('upstream-freq').textContent = '--';
            document.getElementById('upstream-bitrate').textContent = '0 Mbps';

            const statusBadge = document.getElementById('upstream-status');
            statusBadge.className = 'status-badge status-offline';
            statusBadge.textContent = 'Disconnected';
            statusBadge.style.fontSize = '0.65rem';
            statusBadge.style.padding = '0.1rem 0.4rem';
        }

        const totalBadge = document.getElementById('client-count-badge');
        if (totalBadge) totalBadge.textContent = `${this.data.totalClients} Client${this.data.totalClients !== 1 ? 's' : ''}`;

        // Traffic Estimate
        const rxMb = (this.data.trafficRx / 1024 / 1024).toFixed(1);
        const txMb = (this.data.trafficTx / 1024 / 1024).toFixed(1);
        document.getElementById('bandwidth-total').textContent = `${rxMb} / ${txMb} MB`;

        // Update Clients Table
        const tbody = document.getElementById('clients-tbody');
        if (!tbody) return;

        if (this.data.clients.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #94a3b8;">No clients connected</td></tr>`;
            return;
        }

        tbody.innerHTML = this.data.clients.map(client => {
            let signalClass = 'status-online';
            if (client.signal < -70) signalClass = 'status-warning';
            if (client.signal < -80) signalClass = 'status-critical';

            const deviceIcon = this.getDeviceIcon(client.vendor);

            return `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(59, 130, 246, 0.1); display: flex; align-items: center; justify-content: center; color: #60a5fa; flex-shrink: 0; border: 1px solid rgba(59, 130, 246, 0.2);">
                                <i class="fas ${deviceIcon}" style="font-size: 0.875rem;"></i>
                            </div>
                            <div style="min-width: 0;">
                                <div style="font-weight: 600; color: #f1f5f9; font-size: 0.8125rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${client.hostname}</div>
                                <div style="font-size: 0.6875rem; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${client.vendor || 'Generic Device'}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div style="display: flex; flex-direction: column; gap: 2px;">
                            <code style="color: #60a5fa; font-size: 0.75rem; font-weight: 600; background: rgba(59, 130, 246, 0.1); padding: 0.125rem 0.375rem; border-radius: 4px; width: fit-content;">${client.ip}</code>
                        </div>
                    </td>
                    <td><code style="font-size: 0.75rem; color: #94a3b8; font-family: 'JetBrains Mono', monospace;">${client.mac}</code></td>
                    <td>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <div style="display: flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 600; color: #e2e8f0; white-space: nowrap;">
                                <i class="fas fa-rss" style="font-size: 0.625rem; transform: rotate(-45deg); color: ${signalClass === 'status-online' ? '#10b981' : signalClass === 'status-warning' ? '#f59e0b' : '#ef4444'}"></i>
                                ${client.signal} <span style="font-size: 0.625rem; color: #64748b; font-weight: normal;">dBm</span>
                            </div>
                            <div style="width: 80px; height: 3px; background: #334155; border-radius: 2px; overflow: hidden;">
                                <div style="width: ${Math.min(100, Math.max(0, (client.signal + 100) * 2))}%; height: 100%; background: ${signalClass === 'status-online' ? '#10b981' : signalClass === 'status-warning' ? '#f59e0b' : '#ef4444'}; transition: width 0.3s ease;"></div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <div style="display: flex; flex-direction: column; gap: 1px; white-space: nowrap;">
                                <div style="font-size: 0.7rem; color: #10b981; display: flex; align-items: center; gap: 4px; font-weight: 600;">
                                    <i class="fas fa-arrow-up" style="font-size: 0.6rem;"></i> ${client.txBitrate} <span style="font-size: 0.6rem; color: #64748b; font-weight: normal;">Mbps</span>
                                </div>
                                <div style="font-size: 0.7rem; color: #3b82f6; display: flex; align-items: center; gap: 4px; font-weight: 600;">
                                    <i class="fas fa-arrow-down" style="font-size: 0.6rem;"></i> ${client.rxBitrate} <span style="font-size: 0.6rem; color: #64748b; font-weight: normal;">Mbps</span>
                                </div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 6px; color: #94a3b8; font-size: 0.75rem;">
                            <i class="far fa-clock" style="font-size: 0.6875rem; color: #64748b;"></i>
                            <span>${this.formatTime(client.connectedTime)}</span>
                        </div>
                    </td>
                    <td style="text-align: center;">
                        <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                            <button class="btn btn-icon btn-compact" 
                                    onclick="wifiManagerInstance.kickClient('${client.mac}', '${client.hostname}')" 
                                    title="Kick (Force Disconnect Once)"
                                    style="color: #f59e0b; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2); padding: 0.25rem; width: 24px; height: 24px; border-radius: 4px; transition: all 0.2s;">
                                <i class="fas fa-user-slash" style="font-size: 0.75rem;"></i>
                            </button>
                            <button class="btn btn-icon btn-compact" 
                                    onclick="wifiManagerInstance.blockClient('${client.mac}', '${client.hostname}')" 
                                    title="Block & Kick (Kick to Death / Permanent)"
                                    style="color: #ef4444; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); padding: 0.25rem; width: 24px; height: 24px; border-radius: 4px; transition: all 0.2s;">
                                <i class="fas fa-ban" style="font-size: 0.75rem;"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    formatTime(seconds) {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        return `${Math.floor(seconds / 3600)}h`;
    }

    async kickClient(mac, hostname) {
        if (!confirm(`Are you sure you want to kick "${hostname || mac}"? \nThis will force the device to disconnect from the WiFi.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/wifi/kick?mac=${encodeURIComponent(mac)}`, {
                method: 'POST'
            });

            if (response.ok) {
                // Show success feedback
                const btn = event.currentTarget || document.activeElement;
                if (btn && btn.tagName === 'BUTTON') {
                    const originalHTML = btn.innerHTML;
                    btn.innerHTML = '<i class="fas fa-check"></i>';
                    btn.style.color = '#10b981';
                    btn.style.background = 'rgba(16, 185, 129, 0.1)';
                    btn.style.borderColor = 'rgba(16, 185, 129, 0.2)';

                    setTimeout(() => {
                        btn.innerHTML = originalHTML;
                        btn.style.color = '#ef4444';
                        btn.style.background = 'rgba(239, 68, 68, 0.1)';
                        btn.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                    }, 2000);
                }

                // Refresh the list after a short delay
                setTimeout(() => this.loadData(), 1000);
            } else {
                const error = await response.text();
                alert(`Failed to kick client: ${error}`);
            }
        } catch (error) {
            console.error('Error kicking client:', error);
            alert('Error communicating with the server.');
        }
    }

    async blockClient(mac, hostname) {
        if (!confirm(`ARE YOU SURE you want to BLOCK "${hostname || mac}" PERMANENTLY? \nThis device will be blacklisted and will NOT be able to reconnect until manually unblocked.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/wifi/block?mac=${encodeURIComponent(mac)}`, {
                method: 'POST'
            });

            const result = await response.json();

            if (response.ok) {
                // Show success feedback
                const btn = event.currentTarget || document.activeElement;
                if (btn && btn.tagName === 'BUTTON') {
                    const originalHTML = btn.innerHTML;
                    btn.innerHTML = '<i class="fas fa-check"></i>';
                    btn.style.color = '#10b981';
                    btn.style.background = 'rgba(16, 185, 129, 0.1)';
                    btn.style.borderColor = 'rgba(16, 185, 129, 0.2)';

                    setTimeout(() => {
                        btn.innerHTML = originalHTML;
                        btn.style.color = '#ef4444';
                        btn.style.background = 'rgba(239, 68, 68, 0.1)';
                        btn.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                    }, 2000);
                }

                // Refresh the list
                setTimeout(() => this.loadData(), 1000);
            } else {
                alert(`Failed to block client: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error blocking client:', error);
            alert('Error communicating with the server.');
        }
    }
}
