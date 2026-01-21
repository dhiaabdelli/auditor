export class NetworkInterfacesPage {
    constructor() {
        this.refreshInterval = null;
    }

    render() {
        return `
            <div class="page-container-full network-interfaces-layout" style="display: flex; flex-direction: column; height: 100%; overflow: hidden;">
                <div class="network-interfaces-main" style="flex: 1; overflow-y: auto;">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; border-bottom: 1px solid rgba(148, 163, 184, 0.1); background: var(--card-bg);">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <i class="fas fa-network-wired" style="font-size: 1.25rem; color: #3b82f6;"></i>
                            <h2 style="margin: 0; font-size: 1.25rem; color: #f8fafc;">Network Interfaces</h2>
                        </div>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="page-action-btn" onclick="networkInterfacesInstance.loadData()">
                                <i class="fas fa-sync-alt"></i>
                                <span>Refresh</span>
                            </button>
                        </div>
                    </div>
                    <div class="network-interfaces-content">
                        <table id="interface-table" style="width: 100%; border-collapse: collapse; table-layout: fixed;">
                            <thead>
                                <tr style="color: #94a3b8; font-size: 0.55rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
                                    <th style="position: sticky; top: 0; background: #1e293b; z-index: 10; padding: 0.25rem 0.4rem; text-align: left; width: 20%; box-shadow: 0 1px 0 rgba(148, 163, 184, 0.2);">Interface</th>
                                    <th style="position: sticky; top: 0; background: #1e293b; z-index: 10; padding: 0.25rem 0.4rem; text-align: left; width: 8%; box-shadow: 0 1px 0 rgba(148, 163, 184, 0.2);">Type</th>
                                    <th style="position: sticky; top: 0; background: #1e293b; z-index: 10; padding: 0.25rem 0.4rem; text-align: left; width: 14%; box-shadow: 0 1px 0 rgba(148, 163, 184, 0.2);">IP Address</th>
                                    <th style="position: sticky; top: 0; background: #1e293b; z-index: 10; padding: 0.25rem 0.4rem; text-align: left; width: 14%; box-shadow: 0 1px 0 rgba(148, 163, 184, 0.2);">MAC Address</th>
                                    <th style="position: sticky; top: 0; background: #1e293b; z-index: 10; padding: 0.25rem 0.4rem; text-align: right; width: 6%; box-shadow: 0 1px 0 rgba(148, 163, 184, 0.2);">MTU</th>
                                    <th style="position: sticky; top: 0; background: #1e293b; z-index: 10; padding: 0.25rem 0.4rem; text-align: right; width: 18%; box-shadow: 0 1px 0 rgba(148, 163, 184, 0.2);">Traffic</th>
                                    <th style="position: sticky; top: 0; background: #1e293b; z-index: 10; padding: 0.25rem 0.4rem; text-align: center; width: 8%; box-shadow: 0 1px 0 rgba(148, 163, 184, 0.2);">Status</th>
                                    <th style="position: sticky; top: 0; background: #1e293b; z-index: 10; padding: 0.25rem 0.4rem; text-align: right; width: 12%; box-shadow: 0 1px 0 rgba(148, 163, 184, 0.2);">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="interface-tbody">
                                <!-- Table rows injected by JS -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    async mount() {
        window.networkInterfacesInstance = this;

        await this.loadData();
        this.refreshInterval = setInterval(() => this.loadData(), 3000);
    }

    unmount() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    async loadData() {
        try {
            const response = await fetch('/api/network/interfaces');
            const netData = await response.ok ? await response.json() : null;
            this.updateInterfaceStatus(netData);
        } catch (error) {
            console.error('Error loading network data:', error);
        }
    }

    async refreshInterfaces() {
        await this.loadData();
    }

    formatBytes(bytes, decimals = 1) {
        if (!+bytes) return '0 B';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    updateInterfaceStatus(netData) {
        const tbody = document.getElementById('interface-tbody');
        if (!tbody || !netData || !netData.interfaces) return;

        // Sort: Up first, then by name
        const interfaces = netData.interfaces.sort((a, b) => {
            if (a.status === 'UP' && b.status !== 'UP') return -1;
            if (a.status !== 'UP' && b.status === 'UP') return 1;
            return a.name.localeCompare(b.name);
        });

        tbody.innerHTML = interfaces.map(iface => {
            const isUp = iface.status === 'UP';
            const statusColor = isUp ? '#10b981' : '#ef4444';
            const iconClass = iface.type === 'wireless' || iface.name.includes('wlan') || iface.name.includes('wifi') ? 'fa-wifi' :
                iface.type === 'ethernet' || iface.name.includes('eth') || iface.name.includes('enp') ? 'fa-ethernet' : 'fa-network-wired';

            return `
                <tr style="
                    background: rgba(30, 41, 59, 0.4);
                    transition: all 0.2s;
                " onmouseover="this.style.background='rgba(51, 65, 85, 0.5)'" onmouseout="this.style.background='rgba(30, 41, 59, 0.4)'">
                    <td style="padding: 0.2rem 0.4rem; border-bottom: 1px solid rgba(148, 163, 184, 0.05);">
                        <div style="display: flex; align-items: center; gap: 0.4rem;">
                            <div style="
                                width: 22px; height: 22px; 
                                border-radius: 5px; 
                                background: ${isUp ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; 
                                display: flex; align-items: center; justify-content: center;
                                color: ${statusColor};
                            ">
                                <i class="fas ${iconClass}" style="font-size: 0.7rem;"></i>
                            </div>
                            <span style="font-weight: 600; font-size: 0.7rem; color: #f1f5f9;">${iface.name}</span>
                        </div>
                    </td>
                    
                    <td style="padding: 0.2rem 0.4rem; border-bottom: 1px solid rgba(148, 163, 184, 0.05);">
                        <span style="font-size: 0.6rem; color: #94a3b8; text-transform: uppercase; background: rgba(148, 163, 184, 0.1); padding: 0.1rem 0.3rem; border-radius: 3px; font-weight: 600;">
                            ${iface.type || 'Unknown'}
                        </span>
                    </td>
                    
                    <td style="padding: 0.2rem 0.4rem; border-bottom: 1px solid rgba(148, 163, 184, 0.05);">
                        <span style="font-size: 0.7rem; color: #cbd5e1; font-family: 'JetBrains Mono', monospace;">
                            ${iface.ip || 'No IP'}
                        </span>
                    </td>
                    
                    <td style="padding: 0.2rem 0.4rem; border-bottom: 1px solid rgba(148, 163, 184, 0.05);">
                        <span style="font-size: 0.65rem; color: #94a3b8; font-family: 'JetBrains Mono', monospace;">
                            ${iface.mac || 'N/A'}
                        </span>
                    </td>

                    <td style="padding: 0.2rem 0.4rem; text-align: right; border-bottom: 1px solid rgba(148, 163, 184, 0.05);">
                        <span style="font-size: 0.65rem; color: #94a3b8; font-family: 'JetBrains Mono', monospace;">
                            ${iface.mtu || '-'}
                        </span>
                    </td>

                    <td style="padding: 0.2rem 0.4rem; border-bottom: 1px solid rgba(148, 163, 184, 0.05);">
                         <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0px; line-height: 1.1;">
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <i class="fas fa-arrow-down" style="font-size: 0.5rem; color: #10b981; opacity: 0.8;"></i>
                                <span style="font-size: 0.6rem; font-family: 'JetBrains Mono', monospace; color: #cbd5e1;">${this.formatBytes(iface.rxBytes || 0)}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <i class="fas fa-arrow-up" style="font-size: 0.5rem; color: #3b82f6; opacity: 0.8;"></i>
                                <span style="font-size: 0.6rem; font-family: 'JetBrains Mono', monospace; color: #94a3b8;">${this.formatBytes(iface.txBytes || 0)}</span>
                            </div>
                        </div>
                    </td>
                    
                    <td style="padding: 0.2rem 0.4rem; text-align: center; border-bottom: 1px solid rgba(148, 163, 184, 0.05);">
                        <div style="display: inline-flex; align-items: center; gap: 0.2rem; padding: 0.15rem 0.4rem; background: ${isUp ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; border-radius: 4px;">
                            <div style="
                                width: 5px; height: 5px; 
                                border-radius: 50%; 
                                background: ${statusColor};
                                box-shadow: 0 0 6px ${statusColor};
                                animation: ${isUp ? 'pulse 2s infinite' : 'none'};
                            "></div>
                            <span style="font-size: 0.6rem; font-weight: 700; color: ${statusColor}; letter-spacing: 0.02em;">
                                ${iface.status}
                            </span>
                        </div>
                    </td>
                    
                    <td style="padding: 0.2rem 0.4rem; text-align: right; border-bottom: 1px solid rgba(148, 163, 184, 0.05);">
                        <div style="display: flex; gap: 0.2rem; justify-content: flex-end;">
                            <button onclick="window.networkInterfacesInstance.toggleInterfaceState('${iface.name}', ${!isUp})" style="
                                padding: 0.25rem 0.5rem;
                                background: ${isUp ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)'};
                                color: ${isUp ? '#ef4444' : '#10b981'};
                                border: 1px solid ${isUp ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'};
                                border-radius: 4px;
                                font-size: 0.65rem;
                                font-weight: 700;
                                cursor: pointer;
                                transition: all 0.2s;
                                text-transform: uppercase;
                            " onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                                <i class="fas fa-power-off" style="margin-right: 0.2rem; font-size: 0.6rem;"></i>${isUp ? 'Off' : 'On'}
                            </button>
                            <button onclick="window.networkInterfacesInstance.openConfigModal('${iface.name}')" style="
                                padding: 0.25rem 0.5rem;
                                background: rgba(96, 165, 250, 0.1);
                                color: #60a5fa;
                                border: 1px solid rgba(96, 165, 250, 0.3);
                                border-radius: 4px;
                                font-size: 0.65rem;
                                font-weight: 700;
                                cursor: pointer;
                                transition: all 0.2s;
                                text-transform: uppercase;
                            " onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                                <i class="fas fa-cog" style="margin-right: 0.2rem; font-size: 0.6rem;"></i>Config
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async toggleInterfaceState(ifaceName, enable) {
        try {
            const state = enable ? 'up' : 'down';
            const response = await fetch('/api/network/interface/state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ interface: ifaceName, state: state })
            });

            if (response.ok) {
                await this.loadData();
                console.log(`Interface ${ifaceName} ${state === 'up' ? 'enabled' : 'disabled'} successfully`);
            } else {
                const error = await response.text();
                alert(`Failed to ${enable ? 'enable' : 'disable'} interface: ${error}`);
            }
        } catch (error) {
            console.error('Error toggling interface state:', error);
            alert('Network control failed. This feature is only available on Linux systems.');
        }
    }

    openConfigModal(ifaceName) {
        const modalHTML = `
            <div id="config-modal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 9999;">
                <div style="background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 16px; padding: 2rem; max-width: 500px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h2 style="margin: 0; font-size: 1.25rem; font-weight: 700; color: #f1f5f9;">Configure ${ifaceName}</h2>
                        <button onclick="document.getElementById('config-modal').remove()" style="background: transparent; border: none; color: #94a3b8; font-size: 1.5rem; cursor: pointer; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 6px; transition: background 0.2s;" onmouseover="this.style.background='rgba(148, 163, 184, 0.1)'" onmouseout="this.style.background='transparent'">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <form id="interface-config-form" style="display: flex; flex-direction: column; gap: 1rem;">
                        <div>
                            <label style="display: block; font-size: 0.75rem; font-weight: 600; color: #94a3b8; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">IP Address</label>
                            <input type="text" id="config-ip" placeholder="192.168.1.100" style="width: 100%; padding: 0.75rem; background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 8px; color: #f1f5f9; font-size: 0.9rem; font-family: 'JetBrains Mono', monospace;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.75rem; font-weight: 600; color: #94a3b8; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Subnet Mask</label>
                            <input type="text" id="config-mask" placeholder="255.255.255.0" style="width: 100%; padding: 0.75rem; background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 8px; color: #f1f5f9; font-size: 0.9rem; font-family: 'JetBrains Mono', monospace;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.75rem; font-weight: 600; color: #94a3b8; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Gateway</label>
                            <input type="text" id="config-gateway" placeholder="192.168.1.1" style="width: 100%; padding: 0.75rem; background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 8px; color: #f1f5f9; font-size: 0.9rem; font-family: 'JetBrains Mono', monospace;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.75rem; font-weight: 600; color: #94a3b8; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">DNS Servers (comma-separated)</label>
                            <input type="text" id="config-dns" placeholder="8.8.8.8, 1.1.1.1" style="width: 100%; padding: 0.75rem; background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 8px; color: #f1f5f9; font-size: 0.9rem; font-family: 'JetBrains Mono', monospace;">
                        </div>
                        
                        <div style="display: flex; gap: 0.75rem; margin-top: 1rem;">
                            <button type="button" onclick="window.networkInterfacesInstance.saveInterfaceConfig('${ifaceName}')" style="flex: 1; padding: 0.75rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(102, 126, 234, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.3)'">
                                <i class="fas fa-save" style="margin-right: 0.5rem;"></i>Apply Configuration
                            </button>
                            <button type="button" onclick="document.getElementById('config-modal').remove()" style="flex: 0.3; padding: 0.75rem; background: rgba(148, 163, 184, 0.1); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 8px; font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(148, 163, 184, 0.2)'" onmouseout="this.style.background='rgba(148, 163, 184, 0.1)'">
                                Cancel
                            </button>
                        </div>
                    </form>
                    
                    <div style="margin-top: 1.5rem; padding: 1rem; background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 8px; display: flex; gap: 0.75rem; align-items: start;">
                        <i class="fas fa-exclamation-triangle" style="color: #fbbf24; font-size: 1rem; margin-top: 0.1rem;"></i>
                        <div style="font-size: 0.75rem; color: #fbbf24; line-height: 1.5;">
                            <strong>Note:</strong> Changing network configuration may temporarily disconnect your connection. This feature is only available on Linux systems with appropriate permissions.
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    async saveInterfaceConfig(ifaceName) {
        const ip = document.getElementById('config-ip').value;
        const mask = document.getElementById('config-mask').value;
        const gateway = document.getElementById('config-gateway').value;
        const dns = document.getElementById('config-dns').value;

        if (!ip || !mask) {
            alert('IP Address and Subnet Mask are required');
            return;
        }

        try {
            const response = await fetch('/api/network/interface/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    interface: ifaceName,
                    ip: ip,
                    netmask: mask,
                    gateway: gateway,
                    dns: dns.split(',').map(d => d.trim()).filter(d => d)
                })
            });

            if (response.ok) {
                alert(`Configuration applied to ${ifaceName} successfully`);
                document.getElementById('config-modal').remove();
                await this.loadData();
            } else {
                const error = await response.text();
                alert(`Failed to apply configuration: ${error}`);
            }
        } catch (error) {
            console.error('Error saving interface config:', error);
            alert('Failed to save configuration. This feature is only available on Linux systems.');
        }
    }

    unmount() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }

        // Cleanup Page Navbar
        const navbar = document.getElementById('page-navbar');
        if (navbar) {
            navbar.style.display = 'none';
            navbar.innerHTML = '';
        }
    }
}
