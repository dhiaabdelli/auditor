import { api } from '../utils/api.js';
import { logger } from '../utils/logger.js';

export class WinRMClientPage {
    constructor() {
        this.tabs = [];
        this.activeTabId = null;
        this._showConnectionModal = false;
    }

    async render() {
        window.winrmClientInstance = this;
        return `
            <div class="page-container-full">
                ${this._showConnectionModal ? this.renderConnectionModal() : ''}
                <div class="ssh-client-container">
                    <div class="ssh-sidebar">
                        <div class="ssh-sidebar-header">
                            <h3><i class="fas fa-code"></i> Connections</h3>
                            <div class="ssh-sidebar-actions">
                                <button class="ssh-sidebar-btn ssh-sidebar-btn-primary" onclick="window.winrmClientShowConnectionModal()">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                        </div>
                        <div class="ssh-connections-list">
                            ${this.tabs.length === 0 ? `
                                <div class="ssh-empty-connections">
                                    <i class="fas fa-server"></i>
                                    <p>No connections</p>
                                </div>
                            ` : ''}
                            ${this.tabs.map(tab => `
                                <div class="ssh-connection-item ${tab.id === this.activeTabId ? 'active' : ''}" 
                                     onclick="window.winrmClientSelectTab('${tab.id}')">
                                    <div class="ssh-connection-info">
                                        <div class="ssh-connection-title">${this.escapeHTML(tab.title)}</div>
                                        <div class="ssh-connection-details">
                                            <span>${this.escapeHTML(tab.host)}:${tab.port}</span>
                                        </div>
                                    </div>
                                    <div class="ssh-connection-status">
                                        <span class="ssh-status-indicator ${tab.connected ? 'connected' : 'disconnected'}">
                                            ${tab.connected ? '● Connected' : '○ Disconnected'}
                                        </span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="ssh-terminal-container">
                        ${this.activeTabId ? this.renderTerminal(this.activeTabId) : `
                            <div class="ssh-welcome">
                                <i class="fas fa-code"></i>
                                <h2>WinRM Client</h2>
                                <p>Create a connection to execute PowerShell commands remotely</p>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    renderConnectionModal() {
        return `
            <div class="modal-overlay" onclick="window.winrmClientCloseConnectionModal()">
                <div class="modal-container" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>New WinRM Connection</h3>
                        <button class="modal-close" onclick="window.winrmClientCloseConnectionModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Connection Name</label>
                            <input type="text" id="winrm-conn-name" class="form-input" placeholder="Windows Server">
                        </div>
                        <div class="form-group">
                            <label>Host</label>
                            <input type="text" id="winrm-conn-host" class="form-input" placeholder="192.168.1.100">
                        </div>
                        <div class="form-group">
                            <label>Port</label>
                            <input type="number" id="winrm-conn-port" class="form-input" value="5985">
                        </div>
                        <div class="form-group">
                            <label>Username</label>
                            <input type="text" id="winrm-conn-user" class="form-input" placeholder="Administrator">
                        </div>
                        <div class="form-group">
                            <label>Password</label>
                            <input type="password" id="winrm-conn-password" class="form-input">
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="winrm-conn-https"> Use HTTPS (Port 5986)
                            </label>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="window.winrmClientCloseConnectionModal()">Cancel</button>
                        <button class="btn btn-primary" onclick="window.winrmClientCreateConnection()">Connect</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderTerminal(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) return '';
        return `
            <div class="ssh-terminal" id="winrm-terminal-${tabId}">
                <div class="ssh-terminal-header">
                    <span>${this.escapeHTML(tab.title)}</span>
                    <button class="btn btn-sm btn-danger" onclick="window.winrmClientDisconnect('${tabId}')">
                        <i class="fas fa-times"></i> Disconnect
                    </button>
                </div>
                <div class="ssh-terminal-content" id="winrm-terminal-content-${tabId}"></div>
                <div class="ssh-terminal-input-container">
                    <input type="text" class="ssh-terminal-input" id="winrm-terminal-input-${tabId}" 
                           placeholder="Enter PowerShell command..." 
                           onkeydown="if(event.key === 'Enter') window.winrmClientSendCommand('${tabId}')">
                </div>
            </div>
        `;
    }

    escapeHTML(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    async mount() {
        window.winrmClientShowConnectionModal = () => {
            this._showConnectionModal = true;
            this.updateRender();
        };
        window.winrmClientCloseConnectionModal = () => {
            this._showConnectionModal = false;
            this.updateRender();
        };
        window.winrmClientCreateConnection = async () => {
            const name = document.getElementById('winrm-conn-name')?.value || 'WinRM Connection';
            const host = document.getElementById('winrm-conn-host')?.value;
            const port = parseInt(document.getElementById('winrm-conn-port')?.value || '5985');
            const user = document.getElementById('winrm-conn-user')?.value;
            const password = document.getElementById('winrm-conn-password')?.value;
            const useHTTPS = document.getElementById('winrm-conn-https')?.checked;

            if (!host || !user || !password) {
                alert('Please fill all required fields');
                return;
            }

            const tabId = `winrm-${Date.now()}`;
            const tab = { id: tabId, title: name, host, port: useHTTPS ? 5986 : port, user, password, connected: false, ws: null };
            this.tabs.push(tab);
            this.activeTabId = tabId;
            this._showConnectionModal = false;
            this.updateRender();
            await this.connectTab(tabId);
        };
        window.winrmClientSelectTab = (tabId) => {
            this.activeTabId = tabId;
            this.updateRender();
        };
        window.winrmClientDisconnect = async (tabId) => {
            const tab = this.tabs.find(t => t.id === tabId);
            if (tab?.ws) tab.ws.close();
            if (tab?.connId) {
                await api.post('/api/winrm/disconnect', { connId: tab.connId });
            }
            this.tabs = this.tabs.filter(t => t.id !== tabId);
            this.activeTabId = this.tabs.length > 0 ? this.tabs[0].id : null;
            this.updateRender();
        };
        window.winrmClientSendCommand = async (tabId) => {
            const tab = this.tabs.find(t => t.id === tabId);
            const input = document.getElementById(`winrm-terminal-input-${tabId}`);
            if (!tab?.ws || !input?.value) return;
            this.appendToTerminal(tabId, `PS> ${input.value}\n`);
            tab.ws.send(JSON.stringify({ type: 'command', command: input.value }));
            input.value = '';
        };
    }

    async connectTab(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) return;
        try {
            const response = await api.post('/api/winrm/connect', {
                host: tab.host, port: tab.port, user: tab.user, password: tab.password, useHttps: tab.port === 5986
            });
            if (!response.ok) throw new Error((await response.json()).message || 'Connection failed');
            const data = await response.json();
            tab.connId = data.connId;
            tab.connected = true;
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const ws = new WebSocket(`${protocol}//${window.location.host}/api/winrm/ws?connId=${encodeURIComponent(tab.connId)}`);
            ws.onmessage = (e) => {
                const msg = JSON.parse(e.data);
                if (msg.type === 'output') this.appendToTerminal(tabId, msg.output);
                else if (msg.type === 'error') this.appendToTerminal(tabId, `[ERROR] ${msg.message}\n`);
            };
            ws.onclose = () => { tab.connected = false; this.appendToTerminal(tabId, '\n[Connection closed]\n'); };
            tab.ws = ws;
            this.updateRender();
            document.getElementById(`winrm-terminal-input-${tabId}`)?.focus();
        } catch (error) {
            logger.error('WinRM connection error:', error);
            tab.connected = false;
            alert(`Connection failed: ${error.message}`);
            this.updateRender();
        }
    }

    appendToTerminal(tabId, text) {
        const el = document.getElementById(`winrm-terminal-content-${tabId}`);
        if (el) { el.textContent += text; el.scrollTop = el.scrollHeight; }
    }

    async updateRender() {
        document.getElementById('page-content').innerHTML = await this.render();
    }
}

