import { api } from '../utils/api.js';
import { logger } from '../utils/logger.js';

export class TelnetClientPage {
    constructor() {
        this.tabs = [];
        this.activeTabId = null;
        this.connections = new Map();
        this._showConnectionModal = false;
    }

    async render() {
        window.telnetClientInstance = this;
        return `
            <div class="page-container-full">
                ${this._showConnectionModal ? this.renderConnectionModal() : ''}

                <div class="ssh-client-container">
                    <div class="ssh-sidebar">
                        <div class="ssh-sidebar-header">
                            <h3><i class="fas fa-network-wired"></i> Connections</h3>
                            <div class="ssh-sidebar-actions">
                                <button class="ssh-sidebar-btn ssh-sidebar-btn-primary" onclick="window.telnetClientShowConnectionModal()" title="New Connection">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                        </div>
                        <div class="ssh-connections-list">
                            ${this.tabs.length === 0 ? `
                                <div class="ssh-empty-connections">
                                    <i class="fas fa-server"></i>
                                    <p>No connections</p>
                                    <p class="ssh-empty-hint">Click <i class="fas fa-plus"></i> to create one</p>
                                </div>
                            ` : ''}
                            ${this.tabs.map(tab => `
                                <div class="ssh-connection-item ${tab.id === this.activeTabId ? 'active' : ''}" 
                                     data-tab-id="${tab.id}"
                                     onclick="window.telnetClientSelectTab('${tab.id}')">
                                    <div class="ssh-connection-info">
                                        <div class="ssh-connection-title">${this.escapeHTML(tab.title)}</div>
                                        <div class="ssh-connection-details">
                                            <span>${this.escapeHTML(tab.host)}:${tab.port}</span>
                                        </div>
                                    </div>
                                    <div class="ssh-connection-actions">
                                        <div class="ssh-connection-status">
                                            <span class="ssh-status-indicator ${tab.connected ? 'connected' : tab.connecting ? 'connecting' : 'disconnected'}">
                                                ${tab.connected ? '● Connected' : tab.connecting ? '<i class="fas fa-spinner fa-spin"></i> Connecting...' : '○ Disconnected'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="ssh-terminal-container">
                        ${this.activeTabId ? this.renderTerminal(this.activeTabId) : `
                            <div class="ssh-welcome">
                                <i class="fas fa-network-wired"></i>
                                <h2>Telnet Client</h2>
                                <p>Select a connection from the sidebar or create a new one to get started</p>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    renderConnectionModal() {
        return `
            <div class="modal-overlay" onclick="window.telnetClientCloseConnectionModal()">
                <div class="modal-container" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>New Telnet Connection</h3>
                        <button class="modal-close" onclick="window.telnetClientCloseConnectionModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Connection Name</label>
                            <input type="text" id="telnet-conn-name" class="form-input" placeholder="My Server">
                        </div>
                        <div class="form-group">
                            <label>Host</label>
                            <input type="text" id="telnet-conn-host" class="form-input" placeholder="192.168.1.100">
                        </div>
                        <div class="form-group">
                            <label>Port</label>
                            <input type="number" id="telnet-conn-port" class="form-input" value="23">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="window.telnetClientCloseConnectionModal()">Cancel</button>
                        <button class="btn btn-primary" onclick="window.telnetClientCreateConnection()">Connect</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderTerminal(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) return '';

        return `
            <div class="ssh-terminal" id="telnet-terminal-${tabId}">
                <div class="ssh-terminal-header">
                    <span>${this.escapeHTML(tab.title)}</span>
                    <button class="btn btn-sm btn-danger" onclick="window.telnetClientDisconnect('${tabId}')">
                        <i class="fas fa-times"></i> Disconnect
                    </button>
                </div>
                <div class="ssh-terminal-content" id="telnet-terminal-content-${tabId}"></div>
                <div class="ssh-terminal-input-container">
                    <input type="text" class="ssh-terminal-input" id="telnet-terminal-input-${tabId}" 
                           placeholder="Type command and press Enter..." 
                           onkeydown="if(event.key === 'Enter') window.telnetClientSendInput('${tabId}')">
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
        // Setup global functions
        window.telnetClientShowConnectionModal = async () => {
            this._showConnectionModal = true;
            document.getElementById('page-content').innerHTML = await this.render();
        };

        window.telnetClientCloseConnectionModal = async () => {
            this._showConnectionModal = false;
            document.getElementById('page-content').innerHTML = await this.render();
        };

        window.telnetClientCreateConnection = async () => {
            const name = document.getElementById('telnet-conn-name')?.value || 'Telnet Connection';
            const host = document.getElementById('telnet-conn-host')?.value;
            const port = parseInt(document.getElementById('telnet-conn-port')?.value || '23');

            if (!host) {
                alert('Please enter a host');
                return;
            }

            const tabId = `telnet-${Date.now()}`;
            const tab = {
                id: tabId,
                title: name,
                host: host,
                port: port,
                connected: false,
                connecting: true,
                ws: null
            };

            this.tabs.push(tab);
            this.activeTabId = tabId;
            this._showConnectionModal = false;

            document.getElementById('page-content').innerHTML = await this.render();
            await this.connectTab(tabId);
        };

        window.telnetClientSelectTab = async (tabId) => {
            this.activeTabId = tabId;
            document.getElementById('page-content').innerHTML = await this.render();
        };

        window.telnetClientDisconnect = async (tabId) => {
            const tab = this.tabs.find(t => t.id === tabId);
            if (tab && tab.ws) {
                tab.ws.close();
            }

            const response = await api.post('/api/telnet/disconnect', { connId: tab.connId });
            if (response.ok) {
                this.tabs = this.tabs.filter(t => t.id !== tabId);
                if (this.activeTabId === tabId) {
                    this.activeTabId = this.tabs.length > 0 ? this.tabs[0].id : null;
                }
                document.getElementById('page-content').innerHTML = await this.render();
            }
        };

        window.telnetClientSendInput = (tabId) => {
            const tab = this.tabs.find(t => t.id === tabId);
            const input = document.getElementById(`telnet-terminal-input-${tabId}`);
            if (tab && tab.ws && input && input.value) {
                tab.ws.send(JSON.stringify({ type: 'input', data: input.value }));
                this.appendToTerminal(tabId, input.value);
                input.value = '';
            }
        };
    }

    async connectTab(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) return;

        try {
            const response = await api.post('/api/telnet/connect', {
                host: tab.host,
                port: tab.port
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Connection failed');
            }

            const data = await response.json();
            tab.connId = data.connId;
            tab.connecting = false;
            tab.connected = true;

            // Connect WebSocket
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/ws/telnet?connId=${encodeURIComponent(tab.connId)}`;
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                logger.debug('Telnet WebSocket connected');
            };

            ws.onmessage = (event) => {
                const msg = JSON.parse(event.data);
                if (msg.type === 'output') {
                    this.appendToTerminal(tabId, msg.data);
                } else if (msg.type === 'error') {
                    this.appendToTerminal(tabId, `\n[ERROR] ${msg.message}\n`);
                }
            };

            ws.onerror = (error) => {
                logger.error('Telnet WebSocket error:', error);
                this.appendToTerminal(tabId, '\n[ERROR] WebSocket connection error\n');
            };

            ws.onclose = () => {
                logger.debug('Telnet WebSocket closed');
                tab.connected = false;
                this.appendToTerminal(tabId, '\n[Connection closed]\n');
            };

            tab.ws = ws;
            document.getElementById('page-content').innerHTML = await this.render();
            document.getElementById(`telnet-terminal-input-${tabId}`)?.focus();
        } catch (error) {
            logger.error('Telnet connection error:', error);
            tab.connecting = false;
            tab.connected = false;
            alert(`Connection failed: ${error.message}`);
            document.getElementById('page-content').innerHTML = await this.render();
        }
    }

    appendToTerminal(tabId, text) {
        const terminalContent = document.getElementById(`telnet-terminal-content-${tabId}`);
        if (terminalContent) {
            terminalContent.textContent += text;
            terminalContent.scrollTop = terminalContent.scrollHeight;
        }
    }
}

