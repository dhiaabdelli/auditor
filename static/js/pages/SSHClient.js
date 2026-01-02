export class SSHClientPage {
    constructor() {
        this.tabs = [];
        this.activeTabId = null;
        this.connections = new Map();
        this._showConnectionModal = false;
        this._showSettingsModal = false;
        this.savedConnections = [];
        this.showEditModal = false;
        this.editingConnection = null;
        this.encryptionKey = null; // Auto-generated encryption key
        this.menuContext = null; // { id, type: 'tab' | 'saved' }
    }

    async render() {
        // Ensure instance is always set before rendering
        window.sshClientInstance = this;
        return `
            <div class="page-container-full">
                ${this._showConnectionModal ? this.renderConnectionModal() : ''}
                ${this.showEditModal ? this.renderEditConnectionModal() : ''}
                ${this.renderConnectionMenu()}

                <div class="ssh-client-container">
                    <div class="ssh-sidebar">
                        <div class="ssh-sidebar-header">
                            <h3><i class="fas fa-terminal"></i> Connections</h3>
                            <div class="ssh-sidebar-actions">
                                <button class="ssh-sidebar-btn ssh-sidebar-btn-primary" onclick="window.sshClientShowConnectionModal()" title="New Connection">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                        </div>
                        <div class="ssh-connections-list">
                            ${this.tabs.length === 0 && (!this.savedConnections || this.savedConnections.length === 0) ? `
                                <div class="ssh-empty-connections">
                                    <i class="fas fa-server"></i>
                                    <p>No connections</p>
                                    <p class="ssh-empty-hint">Click <i class="fas fa-plus"></i> to create one</p>
                                </div>
                            ` : ''}
                            ${this.tabs.map(tab => `
                                <div class="ssh-connection-item ${tab.id === this.activeTabId ? 'active' : ''}" 
                                     data-tab-id="${tab.id}"
                                     onclick="window.sshClientSelectTab('${tab.id}')"
                                     ondblclick="window.sshClientConnectTab('${tab.id}')"
                                     oncontextmenu="event.preventDefault(); window.sshClientShowConnectionMenu(event, '${tab.id}', 'tab')">
                                    <div class="ssh-connection-info">
                                        <div class="ssh-connection-title">${this.escapeHTML(tab.title)}</div>
                                        <div class="ssh-connection-details">
                                            ${tab.host ? `<span>${this.escapeHTML(tab.host)}</span>` : ''}
                                            ${tab.username ? `<span>${this.escapeHTML(tab.username)}</span>` : ''}
                                        </div>
                                    </div>
                                    <div class="ssh-connection-actions">
                                        <div class="ssh-connection-status">
                                            <span class="ssh-status-indicator ${tab.connected ? 'connected' : tab.connecting ? 'connecting' : 'disconnected'}">
                                                ${tab.connected ? '● Connected' : tab.connecting ? '<i class="fas fa-spinner fa-spin"></i> Connecting...' : '○ Disconnected'}
                                            </span>
                                        </div>
                                        <button class="ssh-connection-menu-btn" onclick="event.stopPropagation(); window.sshClientShowConnectionMenu(event, '${tab.id}', 'tab')" title="Menu">
                                            <i class="fas fa-ellipsis-v"></i>
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                            ${(this.savedConnections || []).filter(conn => !this.tabs.find(t => t.connectionId === conn.id)).map(conn => `
                                <div class="ssh-connection-item ssh-connection-item-saved" 
                                     data-connection-id="${conn.id}"
                                     ondblclick="window.sshClientConnectFromSaved('${conn.id}')"
                                     oncontextmenu="event.preventDefault(); window.sshClientShowConnectionMenu(event, '${conn.id}', 'saved')">
                                    <div class="ssh-connection-info">
                                        <div class="ssh-connection-title">${this.escapeHTML(conn.name || `${conn.username}@${conn.host}`)}</div>
                                        <div class="ssh-connection-details">
                                            ${conn.host ? `<span>${this.escapeHTML(conn.host)}</span>` : ''}
                                            ${conn.username ? `<span>${this.escapeHTML(conn.username)}</span>` : ''}
                                        </div>
                                    </div>
                                    <div class="ssh-connection-actions">
                                        <div class="ssh-connection-status">
                                            <span class="ssh-status-indicator disconnected">
                                                ○ Saved
                                            </span>
                                        </div>
                                        <button class="ssh-connection-menu-btn" onclick="event.stopPropagation(); window.sshClientShowConnectionMenu(event, '${conn.id}', 'saved')" title="Menu">
                                            <i class="fas fa-ellipsis-v"></i>
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="ssh-terminal-container">
                        ${this.activeTabId ? this.renderTerminal(this.activeTabId) : `
                            <div class="ssh-welcome">
                                <i class="fas fa-server"></i>
                                <h2>SSH Client</h2>
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
            <div class="modal-overlay" onclick="window.sshClientCloseConnectionModal()">
                <div class="modal-container" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>New SSH Connection</h3>
                        <button class="modal-close" onclick="window.sshClientCloseConnectionModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Connection Name</label>
                            <input type="text" id="conn-name" class="form-input" placeholder="My Server">
                        </div>
                        <div class="form-group">
                            <label>Host</label>
                            <input type="text" id="conn-host" class="form-input" placeholder="192.168.1.100 or hostname">
                        </div>
                        <div class="form-group">
                            <label>Port</label>
                            <input type="number" id="conn-port" class="form-input" value="22">
                        </div>
                        <div class="form-group">
                            <label>Username</label>
                            <input type="text" id="conn-username" class="form-input" placeholder="root">
                        </div>
                        <div class="form-group">
                            <label>Password</label>
                            <input type="password" id="conn-password" class="form-input" placeholder="Leave empty to use key">
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="conn-save" checked> Save connection (encrypted)
                            </label>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="window.sshClientCloseConnectionModal()">Cancel</button>
                        <button class="btn btn-primary" onclick="window.sshClientCreateConnection()">Connect</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderSettingsModal() {
        return `
            <div class="modal-overlay" onclick="window.sshClientCloseSettingsModal()">
                <div class="modal-container" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>Saved Connections</h3>
                        <button class="modal-close" onclick="window.sshClientCloseSettingsModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        ${this.savedConnections.length === 0 ? `
                            <p>No saved connections</p>
                        ` : `
                            <div class="saved-connections-list">
                                ${this.savedConnections.map(conn => `
                                    <div class="saved-connection-item">
                                        <div class="connection-info">
                                            <strong>${conn.name}</strong>
                                            <span>${conn.host}:${conn.port}</span>
                                        </div>
                                        <div class="connection-actions">
                                            <button class="btn btn-sm btn-primary" onclick="window.sshClientConnectFromSaved('${conn.id}')">
                                                <i class="fas fa-play"></i> Connect
                                            </button>
                                            <button class="btn btn-sm btn-secondary" onclick="window.sshClientShowEditConnectionModal('${conn.id}')">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="btn btn-sm btn-danger" onclick="window.sshClientDeleteSavedConnection('${conn.id}')">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        `}
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="window.sshClientCloseSettingsModal()">Close</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderEditConnectionModal() {
        if (!this.editingConnection) return '';
        const conn = this.editingConnection;
        return `
            <div class="modal-overlay" onclick="window.sshClientCloseEditConnectionModal()">
                <div class="modal-container" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>Edit Connection</h3>
                        <button class="modal-close" onclick="window.sshClientCloseEditConnectionModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Connection Name</label>
                            <input type="text" id="edit-conn-name" class="form-input" value="${this.escapeHTML(conn.name || '')}">
                        </div>
                        <div class="form-group">
                            <label>Host</label>
                            <input type="text" id="edit-conn-host" class="form-input" value="${this.escapeHTML(conn.host || '')}">
                        </div>
                        <div class="form-group">
                            <label>Port</label>
                            <input type="number" id="edit-conn-port" class="form-input" value="${conn.port || 22}">
                        </div>
                        <div class="form-group">
                            <label>Username</label>
                            <input type="text" id="edit-conn-username" class="form-input" value="${this.escapeHTML(conn.username || '')}">
                        </div>
                        <div class="form-group">
                            <label>Password (leave blank to keep current)</label>
                            <input type="password" id="edit-conn-password" class="form-input" placeholder="••••••••">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="window.sshClientCloseEditConnectionModal()">Cancel</button>
                        <button class="btn btn-primary" onclick="window.sshClientUpdateConnection()">Save Changes</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderTerminal(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) return '';

        return `
            <div class="ssh-terminal" id="terminal-${tabId}">
                <div class="terminal-output-container">
                    <div class="terminal-output" id="output-${tabId}">
                        ${this.processOutputWithCommands(tab.output || '')}
                    </div>
                </div>
                <div class="terminal-input-separator"></div>
                <div class="terminal-input-wrapper">
                    <span class="terminal-input-label">${tab.prompt || (tab.connected ? '' : '○')}</span>
                    <input type="text" class="terminal-input" id="input-${tabId}" 
                           onkeypress="if(event.key==='Enter') sshClientInstance.sendCommand('${tabId}')"
                           onkeydown="sshClientInstance.handleKeyDown(event, '${tabId}')"
                           ${!tab.connected ? 'disabled' : ''}
                           placeholder="${tab.connected ? 'Enter command...' : 'Not connected'}">
                </div>
            </div>
        `;
    }

    async mount() {
        // Set instance immediately - this is critical for onclick handlers
        window.sshClientInstance = this;
        
        // Set up global wrapper functions for onclick handlers
        this.setupWrapperFunctions();
        
        // Initialize encryption key (auto-generated, no user input needed)
        await this.initializeEncryptionKey();
        
        // Load saved connections (for connection templates only, not active sessions)
        await this.loadSavedConnections();
        
        // Clear any active tabs on mount - connections don't persist
        this.tabs = [];
        this.activeTabId = null;
        this.connections.clear();
        
        // Ensure instance is always set
        window.sshClientInstance = this;
        
        // Re-render to show loaded saved connections
        await this.updateDisplay();
    }

    /**
     * Initialize encryption key automatically (no master password needed)
     */
    async initializeEncryptionKey() {
        if (!window.CryptoJS) {
            console.error('CryptoJS library not loaded');
            return;
        }

        // Try to get existing key from localStorage
        let storedKey = localStorage.getItem('ssh_encryption_key');
        let storedSalt = localStorage.getItem('ssh_encryption_salt');

        if (storedKey && storedSalt) {
            // Use existing key
            this.encryptionKey = storedKey;
        } else {
            // Generate new key based on browser fingerprint
            // This ensures the key is consistent for this browser/device
            const fingerprint = this.getBrowserFingerprint();
            const salt = CryptoJS.lib.WordArray.random(128/8);
            const key = CryptoJS.PBKDF2(fingerprint, salt, {
                keySize: 256/32,
                iterations: 10000
            });
            
            this.encryptionKey = key.toString();
            localStorage.setItem('ssh_encryption_key', this.encryptionKey);
            localStorage.setItem('ssh_encryption_salt', salt.toString());
        }
    }

    /**
     * Get browser fingerprint for key derivation
     */
    getBrowserFingerprint() {
        // Create a consistent fingerprint from browser characteristics
        const components = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset().toString(),
            navigator.platform
        ];
        return components.join('|');
    }

    /**
     * Encrypt data using AES
     */
    encryptData(data, key) {
        if (!window.CryptoJS) {
            throw new Error('CryptoJS library not loaded');
        }
        const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
        return encrypted;
    }

    /**
     * Decrypt data using AES
     */
    decryptData(encryptedData, key) {
        if (!window.CryptoJS) {
            throw new Error('CryptoJS library not loaded');
        }
        try {
            const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
            const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
            if (!decryptedStr) {
                throw new Error('Decryption failed - invalid password or corrupted data');
            }
            return JSON.parse(decryptedStr);
        } catch (error) {
            throw new Error('Failed to decrypt: ' + error.message);
        }
    }



    async loadSavedConnections() {
        if (!this.encryptionKey) {
            // Wait for encryption key to be initialized
            await this.initializeEncryptionKey();
        }
        try {
            const encryptedData = localStorage.getItem('ssh_connections_encrypted');
            if (!encryptedData) {
                this.savedConnections = [];
                return;
            }
            
            // Try to decrypt with auto-generated key
            try {
                this.savedConnections = this.decryptData(encryptedData, this.encryptionKey);
                this.restoreTabsFromSavedConnections();
            } catch (error) {
                // If decryption fails, try to migrate old password-protected data
                // Try to decrypt with browser fingerprint (for old data)
                try {
                    const fingerprint = this.getBrowserFingerprint();
                    const salt = localStorage.getItem('ssh_encryption_salt') || localStorage.getItem('ssh_connections_salt');
                    if (salt) {
                        const saltWordArray = CryptoJS.enc.Hex.parse(salt);
                        const key = CryptoJS.PBKDF2(fingerprint, saltWordArray, {
                            keySize: 256/32,
                            iterations: 10000
                        }).toString();
                        this.savedConnections = this.decryptData(encryptedData, key);
                        // Migrate to new key
                        this.encryptionKey = key;
                        await this.saveConnectionsToStorage();
                        this.restoreTabsFromSavedConnections();
                    } else {
                        // No salt, try direct decryption with fingerprint
                        const key = CryptoJS.PBKDF2(fingerprint, '', {
                            keySize: 256/32,
                            iterations: 10000
                        }).toString();
                        this.savedConnections = this.decryptData(encryptedData, key);
                        this.encryptionKey = key;
                        await this.saveConnectionsToStorage();
                        this.restoreTabsFromSavedConnections();
                    }
                } catch (migrateError) {
                    console.error('Error loading/migrating connections:', migrateError);
                    // If all decryption attempts fail, start fresh
                    this.savedConnections = [];
                    localStorage.removeItem('ssh_connections_encrypted');
                    localStorage.removeItem('ssh_connections_salt');
                }
            }
        } catch (error) {
            console.error('Error loading connections:', error);
            this.savedConnections = [];
        }
    }

    async saveConnectionsToStorage() {
        if (!this.encryptionKey) {
            // Initialize encryption key if not set
            await this.initializeEncryptionKey();
        }
        try {
            const encrypted = this.encryptData(this.savedConnections, this.encryptionKey);
            localStorage.setItem('ssh_connections_encrypted', encrypted);
        } catch (error) {
            console.error('Error saving connections:', error);
            alert('Failed to save connections: ' + error.message);
        }
    }


    restoreTabsFromSavedConnections() {
        const savedTabs = (this.savedConnections || []).map(conn => {
            let existing = this.tabs.find(t => t.connectionId === conn.id);
            if (!existing) {
                existing = this.tabs.find(t =>
                    !t.connectionId &&
                    t.title === (conn.name || `${conn.username}@${conn.host}`) &&
                    t.host === conn.host &&
                    t.username === conn.username &&
                    (t.port || 22) === (conn.port || 22)
                );
            }
            if (existing) {
                return {
                    ...existing,
                    title: conn.name || existing.title,
                    host: conn.host,
                    port: conn.port || existing.port,
                    username: conn.username || existing.username,
                    password: conn.password || existing.password || '',
                };
            }
            return this.createTabFromConnection(conn);
        });

        const unsavedTabs = this.tabs.filter(tab => !tab.connectionId);
        this.tabs = [...savedTabs, ...unsavedTabs];

        if (this.tabs.length > 0 && !this.activeTabId) {
            this.activeTabId = this.tabs[0].id;
        } else if (this.activeTabId && !this.tabs.some(tab => tab.id === this.activeTabId)) {
            this.activeTabId = this.tabs[0]?.id || null;
        }
    }


    async showConnectionModal() {
        this._showConnectionModal = true;
        await this.updateDisplay();
    }

    async closeConnectionModal() {
        this._showConnectionModal = false;
        await this.updateDisplay();
    }

    async showSettingsModal() {
        this._showSettingsModal = true;
        await this.updateDisplay();
    }

    async closeSettingsModal() {
        this._showSettingsModal = false;
        await this.updateDisplay();
    }

    async showEditConnectionModal(id) {
        const conn = this.savedConnections.find(c => String(c.id) === String(id));
        if (!conn) return;
        this.editingConnection = { ...conn };
        this.showEditModal = true;
        await this.updateDisplay();
    }

    async closeEditConnectionModal() {
        this.showEditModal = false;
        this.editingConnection = null;
        await this.updateDisplay();
    }

    async createConnection() {
        const name = document.getElementById('conn-name')?.value;
        const host = document.getElementById('conn-host')?.value;
        const port = parseInt(document.getElementById('conn-port')?.value) || 22;
        const username = document.getElementById('conn-username')?.value;
        const password = document.getElementById('conn-password')?.value;
        const save = document.getElementById('conn-save')?.checked;

        if (!name || !host || !username) {
            alert('Please fill in all required fields');
            return;
        }

        // Create tab
        const tabId = 'tab-' + Date.now();
        const tab = {
            id: tabId,
            title: name,
            host: host,
            port: port,
            username: username,
            password: password,
            connected: false,
            connecting: false,
            output: '',
            prompt: '',
            connectionId: null,
            shouldReconnect: true,
            reconnectAttempts: 0,
            reconnectTimer: null,
            manualClose: false,
            hasConnected: false
        };
        this.tabs.push(tab);
        this.activeTabId = tabId;

        // Save connection if requested
        if (save) {
            await this.saveConnection(tab, password);
        }

        await this.closeConnectionModal();
        await this.updateDisplay();
        
        // Connect
        await this.connect(tabId);
    }

    async saveConnection(connection, password) {
        if (!this.encryptionKey) {
            // Initialize encryption key if not set
            await this.initializeEncryptionKey();
        }
        
        try {
            // Generate unique ID if not exists
            const connectionId = connection.connectionId || 'conn-' + Date.now();
            
            const connData = {
                id: connectionId,
                name: connection.title,
                host: connection.host,
                port: connection.port,
                username: connection.username,
                password: password // Will be encrypted in storage
            };
            
            // Check if connection already exists
            const existingIndex = this.savedConnections.findIndex(c => c.id === connectionId);
            if (existingIndex >= 0) {
                this.savedConnections[existingIndex] = connData;
            } else {
                this.savedConnections.push(connData);
            }
            
            // Update connection ID in tab
            const tab = this.tabs.find(t => t.id === connection.id);
            if (tab) {
                tab.connectionId = connectionId;
            }
            
            // Save to encrypted storage
            await this.saveConnectionsToStorage();
        } catch (error) {
            console.error('Error saving connection:', error);
            alert('Failed to save connection: ' + error.message);
        }
    }

    async connectFromSaved(connectionId) {
        const conn = this.savedConnections.find(c => String(c.id) === String(connectionId));
        if (!conn) {
            console.error('Connection not found:', connectionId);
            return;
        }

        // Close settings modal first
        await this.closeSettingsModal();
        
        // Check if tab already exists and is connected
        let tab = this.tabs.find(t => t.connectionId === conn.id);
        if (tab && tab.connected) {
            // Tab already exists and is connected, just switch to it
            this.activeTabId = tab.id;
            await this.updateDisplay();
            return;
        }

        // Create new tab or use existing
        if (!tab) {
            tab = this.createTabFromConnection(conn);
            this.tabs.push(tab);
        }
        
        this.activeTabId = tab.id;
        await this.updateDisplay();
        
        // Wait a bit for DOM to be ready, then connect
        setTimeout(() => {
            this.connect(tab.id);
        }, 100);
    }

    createTabFromConnection(conn) {
        return {
            id: `tab-${conn.id || Date.now()}`,
            connectionId: conn.id || null,
            title: conn.name || `${conn.username}@${conn.host}`,
            host: conn.host,
            port: conn.port || 22,
            username: conn.username,
            password: conn.password || '',
            connected: false,
            connecting: false,
            output: conn.output || '',
            prompt: '',
            shouldReconnect: true,
            reconnectAttempts: 0,
            reconnectTimer: null,
            manualClose: false,
            hasConnected: false
        };
    }

    extractPrompt(output) {
        if (!output) return '';
        
        // Clean ANSI codes first to extract prompt from clean text
        const cleanOutput = this.cleanOutput(output);
        
        // Look for common prompt patterns at the end of output:
        // user@host:path $ 
        // user@host:path # 
        // [user@host path]$ 
        // user@host path$ 
        
        // Get the last few lines to find the most recent prompt
        const lines = cleanOutput.split('\n');
        const lastLines = lines.slice(-5).join('\n'); // Check last 5 lines
        
        // Pattern 1: user@host:path $ (most common) - look for this pattern
        const pattern1 = /([a-zA-Z0-9_-]+@[a-zA-Z0-9_.-]+:[~\/\w]+)\s+[#$]\s*$/m;
        let match = lastLines.match(pattern1);
        if (match) {
            return match[0].trim();
        }
        
        // Pattern 2: [user@host path]$ 
        const pattern2 = /\[([a-zA-Z0-9_-]+@[a-zA-Z0-9_.-]+)\s+[~\/\w]+\]\s*[#$]\s*$/m;
        match = lastLines.match(pattern2);
        if (match) {
            return match[0].trim();
        }
        
        // Pattern 3: user@host path$ 
        const pattern3 = /([a-zA-Z0-9_-]+@[a-zA-Z0-9_.-]+)\s+[~\/\w]+\s*[#$]\s*$/m;
        match = lastLines.match(pattern3);
        if (match) {
            return match[0].trim();
        }

        return '';
    }

    reconnect(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab || !tab.host) return;
        
        tab.shouldReconnect = true;
        tab.manualClose = false;
        tab.reconnectAttempts = 0;
        if (tab.reconnectTimer) {
            clearTimeout(tab.reconnectTimer);
            tab.reconnectTimer = null;
        }
        
        // Clear the reconnect button by updating output
        const outputEl = document.getElementById(`output-${tabId}`);
        if (outputEl) {
            // Remove reconnect button from output
            const reconnectContainer = outputEl.querySelector('.terminal-reconnect-container');
            if (reconnectContainer) {
                reconnectContainer.remove();
            }
        }
        
        // Connect
        this.connect(tabId);
    }

    disconnect(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) return;
        
        tab.shouldReconnect = false;
        tab.manualClose = true;
        if (tab.reconnectTimer) {
            clearTimeout(tab.reconnectTimer);
            tab.reconnectTimer = null;
        }
        
        const ws = this.connections.get(tabId);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'disconnect' }));
            ws.close();
        } else {
            this.handleConnectionClosed(tabId);
        }
    }

    async connect(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) return;
        
        // Clear any pending reconnect attempts before starting a new one
        if (tab.reconnectTimer) {
            clearTimeout(tab.reconnectTimer);
            tab.reconnectTimer = null;
        }
        tab.manualClose = false;
        tab.shouldReconnect = true;

        try {
            const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
            // Get JWT token from localStorage
            const token = localStorage.getItem('jwt_token');
            // Build WebSocket URL with token as query parameter
            let wsUrl = `${protocol}://${window.location.host}/api/ssh/ws`;
            if (token) {
                wsUrl += `?api_key=${encodeURIComponent(token)}`;
            }
            const ws = new WebSocket(wsUrl);
            
            const outputEl = document.getElementById(`output-${tabId}`);
            const inputEl = document.getElementById(`input-${tabId}`);

            let authSent = false;
            let authCompleted = false;

            ws.onopen = () => {
                this.connections.set(tabId, ws);
                // If token was in URL, we're already authenticated, send connect immediately
                if (token) {
                    authCompleted = true;
                    ws.send(JSON.stringify({
                        type: 'connect',
                        host: tab.host,
                        port: tab.port,
                        user: tab.username,
                        password: tab.password || '',
                        sessionID: tab.id // Use tab ID as unique session identifier
                    }));
                } else {
                    // No token in URL, send auth message first
                    const authToken = localStorage.getItem('jwt_token');
                    if (authToken) {
                        authSent = true;
                        ws.send(JSON.stringify({
                            type: 'auth',
                            token: authToken
                        }));
                    } else {
                        this.appendOutput(tabId, 'Error: No authentication token found\n');
                        tab.connected = false;
                        this.updateConnectionStatus(tabId);
                        ws.close();
                    }
                }
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    
                    // Handle authentication response
                    if (message.type === 'auth') {
                        if (message.status === 'success') {
                            // Authentication successful, now send connection request
                            authCompleted = true;
                            ws.send(JSON.stringify({
                                type: 'connect',
                                host: tab.host,
                                port: tab.port,
                                user: tab.username,
                                password: tab.password || ''
                            }));
                        } else if (message.status === 'error') {
                            this.appendOutput(tabId, `Authentication failed: ${message.message || message.data || 'Unknown error'}\n`);
                            tab.connected = false;
                            this.updateConnectionStatus(tabId);
                            ws.close();
                            return;
                        }
                        return; // Don't process auth messages further
                    }
                    
                    switch (message.type) {
                        case 'connected':
                            tab.connected = true;
                            tab.connecting = false;
                            tab.hasConnected = true;
                            tab.reconnectAttempts = 0;
                            if (tab.reconnectTimer) {
                                clearTimeout(tab.reconnectTimer);
                                tab.reconnectTimer = null;
                            }
                            // Remove reconnect overlay when connected
                            const outputElConnected = document.getElementById(`output-${tabId}`);
                            if (outputElConnected) {
                                const reconnectWrapper = outputElConnected.querySelector('.terminal-reconnect-wrapper');
                                if (reconnectWrapper) {
                                    reconnectWrapper.remove();
                                }
                            }
                            // Wait a bit for the prompt to appear in the output, then extract it
                            setTimeout(() => {
                                if (tab.output) {
                                    const newPrompt = this.extractPrompt(tab.output);
                                    if (newPrompt && !tab.prompt) {
                                        tab.prompt = newPrompt;
                                        this.updateConnectionStatus(tabId);
                                    }
                                }
                            }, 200);
                            // Update connection status without full re-render to preserve WebSocket
                            this.updateConnectionStatus(tabId);
                            // Focus input after connection
                            setTimeout(() => {
                                const inputEl = document.getElementById(`input-${tabId}`);
                                if (inputEl) inputEl.focus();
                            }, 100);
                            break;
                        case 'history':
                            if (!tab.output || tab.output.length === 0) {
                                tab.output = '';
                                this.appendOutput(tabId, message.data || '');
                            }
                            break;
                        case 'output':
                            this.appendOutput(tabId, message.data);
                            break;
                        case 'error':
                            this.appendOutput(tabId, `Error: ${message.data}\n`);
                            tab.connected = false;
                            tab.connecting = false;
                            this.updateConnectionStatus(tabId);
                            break;
                        case 'disconnected':
                            tab.connected = false;
                            tab.connecting = false;
                            this.appendOutput(tabId, (message.data || '\nDisconnected') + '\n');
                            this.connections.delete(tabId);
                            this.updateConnectionStatus(tabId);
                            break;
                        default:
                            console.warn('Unknown SSH message type', message);
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error, event.data);
                }
            };

            ws.onerror = (error) => {
                console.error('SSH WS error', error);
                tab.connected = false;
                tab.connecting = false;
                this.appendOutput(tabId, 'Connection error\n');
                this.updateConnectionStatus(tabId);
            };

            ws.onclose = () => {
                tab.connecting = false;
                if (tab.connected) {
                    this.appendOutput(tabId, '\nDisconnected\n');
                } else if (tab.connecting) {
                    this.appendOutput(tabId, 'Connection closed\n');
                }
                tab.connected = false;
                this.connections.delete(tabId);
                this.updateConnectionStatus(tabId);
                this.handleConnectionClosed(tabId);
            };

        } catch (error) {
            tab.connecting = false;
            tab.connected = false;
            this.appendOutput(tabId, 'Failed to connect: ' + error.message + '\n');
            this.updateConnectionStatus(tabId);
        }
    }

    handleConnectionClosed(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) return;
        tab.connecting = false;
        if (tab.manualClose) {
            tab.manualClose = false;
            return;
        }
        if (!tab.shouldReconnect || !tab.host || !tab.hasConnected) {
            return;
        }
        
        tab.reconnectAttempts = (tab.reconnectAttempts || 0) + 1;
        const delay = Math.min(5000, tab.reconnectAttempts * 1000);
        
        this.appendOutput(tabId, `Attempting to reconnect in ${(delay / 1000).toFixed(1)}s...\n`);
        
        tab.reconnectTimer = setTimeout(() => {
            this.connect(tabId);
        }, delay);
    }

    handleKeyDown(event, tabId) {
        // Handle Ctrl+C (interrupt signal)
        if (event.ctrlKey && (event.key === 'c' || event.key === 'C' || event.keyCode === 67)) {
            event.preventDefault();
            this.sendControlChar(tabId, '\x03'); // Ctrl+C (SIGINT)
            return;
        }
        // Handle Ctrl+D (EOF signal)
        if (event.ctrlKey && (event.key === 'd' || event.key === 'D' || event.keyCode === 68)) {
            event.preventDefault();
            this.sendControlChar(tabId, '\x04'); // Ctrl+D (EOF)
            return;
        }
        // Handle Ctrl+Z (suspend signal)
        if (event.ctrlKey && (event.key === 'z' || event.key === 'Z' || event.keyCode === 90)) {
            event.preventDefault();
            this.sendControlChar(tabId, '\x1a'); // Ctrl+Z (SIGTSTP)
            return;
        }
    }

    sendControlChar(tabId, char) {
        const ws = this.connections.get(tabId);
        if (ws && ws.readyState === WebSocket.OPEN) {
            // Send control character directly to stdin
            ws.send(JSON.stringify({ type: 'control', data: char }));
        } else {
            this.appendOutput(tabId, 'Error: Not connected to SSH session\n');
        }
    }

    sendCommand(tabId) {
        const inputEl = document.getElementById(`input-${tabId}`);
        const command = inputEl.value;
        if (!command) return;

        const ws = this.connections.get(tabId);
        if (ws && ws.readyState === WebSocket.OPEN) {
            // Store the command to display it nicely
            const tab = this.tabs.find(t => t.id === tabId);
            if (tab) {
                if (!tab.commands) tab.commands = [];
                tab.commands.push({
                    command: command,
                    timestamp: Date.now()
                });
            }
            
            // Clear input immediately
            inputEl.value = '';
            // Send command - server will echo it back with the prompt
            ws.send(JSON.stringify({ type: 'command', data: command }));
        } else {
            this.appendOutput(tabId, 'Error: Not connected to SSH session\n');
        }
    }

    appendOutput(tabId, text) {
        if (!text) return;
        // Clean non-color ANSI codes but keep color codes
        const cleanedText = this.cleanNonColorAnsi(text);
        const tab = this.tabs.find(t => t.id === tabId);
        if (tab) {
            // Store full output for prompt extraction (with color codes)
            tab.output = (tab.output || '') + cleanedText;
            
            // Extract prompt from output - try to extract it every time we get new output
            const newPrompt = this.extractPrompt(tab.output);
            if (newPrompt) {
                // Update prompt if we found a new one or if we didn't have one before
                if (!tab.prompt || newPrompt !== tab.prompt) {
                    tab.prompt = newPrompt;
                    // Update the prompt label in the UI
                    const labelEl = document.querySelector(`#terminal-${tabId} .terminal-input-label`);
                    if (labelEl) {
                        labelEl.textContent = newPrompt;
                    }
                }
            }
            
            // Process output - keep all lines including prompts (don't remove prompts)
            // Process the output with ANSI colors directly
            const coloredOutput = this.processOutputWithCommands(tab.output || '');
            
            // Update DOM immediately if element exists
            const outputEl = document.getElementById(`output-${tabId}`);
            if (outputEl) {
                // Remove reconnect overlay if connection is active
                if (tab.connected) {
                    const reconnectWrapper = outputEl.querySelector('.terminal-reconnect-wrapper');
                    if (reconnectWrapper) {
                        reconnectWrapper.remove();
                    }
                }
                outputEl.innerHTML = coloredOutput; // Use innerHTML to display colors
                outputEl.scrollTop = outputEl.scrollHeight;
            } else {
                // If element doesn't exist yet, it will be restored on next render
                console.warn(`Output element not found for tab ${tabId}, will restore on render`);
            }
        }
    }

    removePromptsFromOutput(output, currentPrompt, tabId) {
        if (!output) return output;
        
        const tab = this.tabs.find(t => t.id === tabId);
        const commands = tab?.commands || [];
        let commandIndex = 0;
        
        // Clean ANSI codes for comparison (but keep prompts in output)
        const cleanPrompt = currentPrompt ? this.cleanOutput(currentPrompt) : '';
        
        // Split into lines
        const lines = output.split('\n');
        const processedLines = [];
        let lastWasEmpty = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Clean ANSI codes from line for comparison
            const cleanLine = this.cleanOutput(line);
            const trimmed = cleanLine.trim();
            
            // Check if line contains the prompt followed by a command (e.g., "dhia@mynas:~ $ pwd")
            // Just track command index, but keep the line as-is
            if (cleanPrompt) {
                const promptWithCommand = new RegExp(`^\\s*${this.escapeRegex(cleanPrompt)}\\s+(.+)$`);
                const commandMatch = trimmed.match(promptWithCommand);
                
                if (commandMatch && commandIndex < commands.length) {
                    commandIndex++;
                }
            }
            
            // Keep all lines including prompts - don't filter them out
            processedLines.push(line);
            lastWasEmpty = (trimmed === '');
        }
        
        // Clean up multiple consecutive empty lines (max 2)
        const cleanedLines = [];
        let emptyCount = 0;
        for (const line of processedLines) {
            const trimmed = this.cleanOutput(line).trim();
            if (trimmed === '') {
                emptyCount++;
                if (emptyCount <= 2) {
                    cleanedLines.push(line);
                }
            } else {
                emptyCount = 0;
                cleanedLines.push(line);
            }
        }
        
        return cleanedLines.join('\n');
    }


    renderConnectionMenu() {
        return `
            <div class="ssh-connection-menu" id="ssh-connection-menu" style="display: none;">
                <div class="ssh-menu-item" onclick="window.sshClientMenuConnect()">
                    <i class="fas fa-plug"></i>
                    <span>Connect</span>
                </div>
                <div class="ssh-menu-item" onclick="window.sshClientMenuReconnect()">
                    <i class="fas fa-redo"></i>
                    <span>Reconnect</span>
                </div>
                <div class="ssh-menu-item" onclick="window.sshClientMenuDisconnect()">
                    <i class="fas fa-unlink"></i>
                    <span>Disconnect</span>
                </div>
                <div class="ssh-menu-divider"></div>
                <div class="ssh-menu-item" onclick="window.sshClientMenuEdit()">
                    <i class="fas fa-edit"></i>
                    <span>Edit</span>
                </div>
                <div class="ssh-menu-item" onclick="window.sshClientMenuDelete()">
                    <i class="fas fa-trash"></i>
                    <span>Delete</span>
                </div>
                <div class="ssh-menu-divider"></div>
                <div class="ssh-menu-item" onclick="window.sshClientMenuClose()">
                    <i class="fas fa-times"></i>
                    <span>Close</span>
                </div>
            </div>
        `;
    }
    
    showConnectionMenu(event, id, type) {
        const menu = document.getElementById('ssh-connection-menu');
        if (!menu) return;
        
        // Store current menu context
        this.menuContext = { id, type };
        
        // Position menu
        menu.style.display = 'block';
        menu.style.left = event.clientX + 'px';
        menu.style.top = event.clientY + 'px';
        
        // Update menu items based on connection state
        const tab = type === 'tab' ? this.tabs.find(t => t.id === id) : null;
        const conn = type === 'saved' ? this.savedConnections.find(c => String(c.id) === String(id)) : null;
        
        // Show/hide menu items based on context
        const menuItems = menu.querySelectorAll('.ssh-menu-item');
        const connectItem = Array.from(menuItems).find(item => item.querySelector('.fa-plug'));
        const reconnectItem = Array.from(menuItems).find(item => item.querySelector('.fa-redo'));
        const disconnectItem = Array.from(menuItems).find(item => item.querySelector('.fa-unlink'));
        const editItem = Array.from(menuItems).find(item => item.querySelector('.fa-edit'));
        const deleteItem = Array.from(menuItems).find(item => item.querySelector('.fa-trash'));
        const closeItem = Array.from(menuItems).find(item => item.querySelector('.fa-times'));
        
        if (type === 'tab') {
            // For active tabs
            if (connectItem) connectItem.style.display = tab && !tab.connected ? 'flex' : 'none';
            if (reconnectItem) reconnectItem.style.display = tab && !tab.connected && tab.host ? 'flex' : 'none';
            if (disconnectItem) disconnectItem.style.display = tab && tab.connected ? 'flex' : 'none';
            if (editItem) editItem.style.display = tab && tab.connectionId ? 'flex' : 'none';
            if (deleteItem) deleteItem.style.display = tab && tab.connectionId ? 'flex' : 'none';
            if (closeItem) closeItem.style.display = 'flex';
        } else {
            // For saved connections
            if (connectItem) connectItem.style.display = 'flex';
            if (reconnectItem) reconnectItem.style.display = 'none';
            if (disconnectItem) disconnectItem.style.display = 'none';
            if (editItem) editItem.style.display = 'flex';
            if (deleteItem) deleteItem.style.display = 'flex';
            if (closeItem) closeItem.style.display = 'none';
        }
        
        // Close menu when clicking outside
        const closeMenu = (e) => {
            if (!menu.contains(e.target) && e.target !== event.target) {
                menu.style.display = 'none';
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    }
    
    hideConnectionMenu() {
        const menu = document.getElementById('ssh-connection-menu');
        if (menu) {
            menu.style.display = 'none';
        }
        this.menuContext = null;
    }

    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    updateConnectionStatus(tabId) {
        // Update connection status in tab object and update UI without full re-render
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) return;

        // Update status indicator in sidebar connection item
        const sidebarItem = document.querySelector(`.ssh-connection-item[data-tab-id="${tabId}"]`);
        if (sidebarItem) {
            const sidebarStatusEl = sidebarItem.querySelector('.ssh-status-indicator');
            if (sidebarStatusEl) {
                if (tab.connected) {
                    sidebarStatusEl.innerHTML = '● Connected';
                    sidebarStatusEl.className = 'ssh-status-indicator connected';
                } else if (tab.connecting) {
                    sidebarStatusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
                    sidebarStatusEl.className = 'ssh-status-indicator connecting';
                } else {
                    sidebarStatusEl.innerHTML = '○ Disconnected';
                    sidebarStatusEl.className = 'ssh-status-indicator disconnected';
                }
            }

            // Update disconnect button visibility in sidebar
            const disconnectBtn = sidebarItem.querySelector('.ssh-connection-disconnect');
            if (disconnectBtn) {
                if (tab.connected) {
                    disconnectBtn.style.display = 'flex';
                } else {
                    disconnectBtn.style.display = 'none';
                }
            } else if (tab.connected) {
                // Create disconnect button if it doesn't exist and connection is active
                const actionsEl = sidebarItem.querySelector('.ssh-connection-actions');
                if (actionsEl) {
                    const closeBtn = actionsEl.querySelector('.ssh-connection-close');
                    if (closeBtn) {
                        const newDisconnectBtn = document.createElement('button');
                        newDisconnectBtn.className = 'ssh-connection-disconnect';
                        newDisconnectBtn.title = 'Disconnect';
                        newDisconnectBtn.onclick = (e) => {
                            e.stopPropagation();
                            window.sshClientDisconnect(tabId);
                        };
                        newDisconnectBtn.innerHTML = '<i class="fas fa-plug"></i>';
                        actionsEl.insertBefore(newDisconnectBtn, closeBtn);
                    }
                }
            }
        }

        // Update input field disabled state and placeholder
        const inputEl = document.getElementById(`input-${tabId}`);
        if (inputEl) {
            inputEl.disabled = !tab.connected;
            inputEl.placeholder = tab.connected ? 'Enter command...' : tab.connecting ? 'Connecting...' : 'Not connected';
        }

        // Update prompt label - re-extract if not set
        if (!tab.prompt && tab.output && tab.connected) {
            tab.prompt = this.extractPrompt(tab.output);
        }
        const labelEl = document.querySelector(`#terminal-${tabId} .terminal-input-label`);
        if (labelEl) {
            if (tab.connected) {
                labelEl.textContent = tab.prompt || '';
            } else if (tab.connecting) {
                labelEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            } else {
                labelEl.textContent = '○';
            }
        }

        // Update connection item active state in sidebar (already handled above)

        // Update disconnect button disabled state
        const disconnectBtn = document.querySelector(`#terminal-${tabId} .terminal-action-button`);
        if (disconnectBtn) {
            disconnectBtn.disabled = !tab.connected;
        }
    }

    async selectTab(tabId) {
        this.activeTabId = tabId;
        await this.updateDisplay();
        // Ensure the terminal output is visible and scrolled to bottom after tab switch
        setTimeout(() => {
            const outputEl = document.getElementById(`output-${tabId}`);
            if (outputEl) {
                outputEl.scrollTop = outputEl.scrollHeight;
            }
        }, 50);
    }

    async closeTab(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (tab) {
            tab.shouldReconnect = false;
            tab.manualClose = true;
            if (tab.reconnectTimer) {
                clearTimeout(tab.reconnectTimer);
                tab.reconnectTimer = null;
            }
        }
        const ws = this.connections.get(tabId);
        if (ws) {
            ws.close();
        }
        this.tabs = this.tabs.filter(t => t.id !== tabId);
        this.connections.delete(tabId);
        if (this.activeTabId === tabId) {
            this.activeTabId = this.tabs.length > 0 ? this.tabs[0].id : null;
        }
        await this.updateDisplay();
    }

    async deleteSavedConnection(id) {
        if (!confirm('Are you sure you want to delete this saved connection?')) return;

        try {
            // Remove from saved connections
            this.savedConnections = this.savedConnections.filter(c => String(c.id) !== String(id));
            
            // Remove associated tab if exists
            const tab = this.tabs.find(t => t.connectionId === id);
            if (tab) {
                // Disconnect if connected
                if (tab.connected) {
                    await this.disconnect(tab.id);
                }
                // Remove tab
                this.tabs = this.tabs.filter(t => t.id !== tab.id);
                if (this.activeTabId === tab.id) {
                    this.activeTabId = this.tabs[0]?.id || null;
                }
            }
            
            // Save to encrypted storage
            await this.saveConnectionsToStorage();
            await this.updateDisplay();
        } catch (error) {
            console.error('Error deleting connection:', error);
            alert('Failed to delete connection: ' + error.message);
        }
    }

    async updateConnection() {
        if (!this.encryptionKey) {
            await this.initializeEncryptionKey();
        }
        if (!this.encryptionKey) {
            console.error('Cannot update connection: encryption key not available');
            return;
        }
        if (!this.editingConnection) return;
        const name = document.getElementById('edit-conn-name')?.value?.trim();
        const host = document.getElementById('edit-conn-host')?.value?.trim();
        const port = parseInt(document.getElementById('edit-conn-port')?.value, 10) || 22;
        const username = document.getElementById('edit-conn-username')?.value?.trim();
        const passwordInput = document.getElementById('edit-conn-password')?.value;
        const password = passwordInput ? passwordInput : this.editingConnection.password || '';

        if (!name || !host || !username) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            // Find and update connection
            const connIndex = this.savedConnections.findIndex(c => String(c.id) === String(this.editingConnection.id));
            if (connIndex >= 0) {
                this.savedConnections[connIndex] = {
                    ...this.savedConnections[connIndex],
                    name,
                    host,
                    port,
                    username,
                    password
                };
            }
            
            // Update associated tab if exists
            const tab = this.tabs.find(t => t.connectionId === this.editingConnection.id);
            if (tab) {
                tab.title = name;
                tab.host = host;
                tab.port = port;
                tab.username = username;
                tab.password = password;
            }
            
            // Save to encrypted storage
            await this.saveConnectionsToStorage();
            this.showEditModal = false;
            this.editingConnection = null;
            await this.updateDisplay();
        } catch (error) {
            console.error('Error updating connection:', error);
            alert('Failed to update connection: ' + error.message);
        }
    }

    async updateDisplay() {
        const content = document.getElementById('page-content');
        if (content) {
            // Set instance BEFORE rendering to ensure it's available
            window.sshClientInstance = this;
            // Re-set wrapper functions in case updateDisplay is called before mount completes
            this.setupWrapperFunctions();
            const html = await this.render();
            content.innerHTML = html;
            // Ensure instance is set again after re-render (safety measure)
            window.sshClientInstance = this;
            // Re-set wrapper functions after HTML is inserted
            this.setupWrapperFunctions();
            // Restore output and connection status for all tabs after re-render
            this.restoreTabsAfterRender();
            // Use requestAnimationFrame to ensure DOM is ready
            requestAnimationFrame(() => {
                window.sshClientInstance = this;
                this.setupWrapperFunctions();
                this.restoreTabsAfterRender();
            });
        }
    }

    restoreTabsAfterRender() {
        // Restore output and connection status for all tabs after re-render
        // Only restore if tabs exist (don't clear on every render)
        this.tabs.forEach(tab => {
            // Check if WebSocket connection still exists and update status
            const ws = this.connections.get(tab.id);
            if (ws && ws.readyState === WebSocket.OPEN) {
                tab.connected = true;
            } else if (ws && (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING)) {
                tab.connected = false;
                this.connections.delete(tab.id);
            } else if (!ws && tab.host) {
                // No WebSocket but we have connection info - disconnected
                tab.connected = false;
            }
            
            // Only restore output for the active tab (since only active tab's terminal is rendered)
            if (tab.id === this.activeTabId) {
                const outputEl = document.getElementById(`output-${tab.id}`);
                if (outputEl) {
                    // Always render existing output for active tab
                    const processedOutput = this.processOutputWithCommands(tab.output || '');
                    outputEl.innerHTML = processedOutput;
                    outputEl.scrollTop = outputEl.scrollHeight;
                    
                    // Remove any reconnect overlay if it exists (no longer used)
                    const existingReconnect = outputEl.querySelector('.terminal-reconnect-wrapper');
                    if (existingReconnect) {
                        existingReconnect.remove();
                    }
                }
            }
            // Re-extract prompt from output if not already set
            if (tab.output && !tab.prompt) {
                tab.prompt = this.extractPrompt(tab.output);
            }
            this.updateConnectionStatus(tab.id);
        });
    }
    
    setupWrapperFunctions() {
        // Set up global wrapper functions for onclick handlers
        window.sshClientShowConnectionModal = () => {
            if (window.sshClientInstance) {
                window.sshClientInstance.showConnectionModal();
            }
        };
        window.sshClientShowSettingsModal = () => {
            if (window.sshClientInstance) {
                window.sshClientInstance.showSettingsModal();
            }
        };
        window.sshClientCloseConnectionModal = () => {
            if (window.sshClientInstance) {
                window.sshClientInstance.closeConnectionModal();
            }
        };
        window.sshClientCloseSettingsModal = () => {
            if (window.sshClientInstance) {
                window.sshClientInstance.closeSettingsModal();
            }
        };
        window.sshClientCreateConnection = () => {
            if (window.sshClientInstance) {
                window.sshClientInstance.createConnection();
            }
        };
        window.sshClientSelectTab = (tabId) => {
            if (window.sshClientInstance) {
                window.sshClientInstance.selectTab(tabId);
            }
        };
        window.sshClientConnectTab = (tabId) => {
            if (window.sshClientInstance) {
                const tab = window.sshClientInstance.tabs.find(t => t.id === tabId);
                if (tab && !tab.connected && !tab.connecting) {
                    window.sshClientInstance.connect(tabId);
                }
            }
        };
        window.sshClientDisconnect = (tabId) => {
            if (window.sshClientInstance) {
                window.sshClientInstance.disconnect(tabId);
            }
        };
        window.sshClientCloseTab = (tabId) => {
            if (window.sshClientInstance) {
                window.sshClientInstance.closeTab(tabId);
            }
        };
        window.sshClientConnectFromSaved = (id) => {
            if (window.sshClientInstance) {
                window.sshClientInstance.connectFromSaved(id);
            }
        };
        window.sshClientDeleteConnection = (id) => {
            if (window.sshClientInstance) {
                window.sshClientInstance.deleteSavedConnection(id);
            }
        };
        window.sshClientEditConnection = (id) => {
            if (window.sshClientInstance) {
                window.sshClientInstance.showEditConnectionModal(id);
            }
        };
        window.sshClientShowEditConnectionModal = (id) => {
            if (window.sshClientInstance) {
                window.sshClientInstance.showEditConnectionModal(id);
            }
        };
        window.sshClientCloseEditConnectionModal = () => {
            if (window.sshClientInstance) {
                window.sshClientInstance.closeEditConnectionModal();
            }
        };
        window.sshClientUpdateConnection = () => {
            if (window.sshClientInstance) {
                window.sshClientInstance.updateConnection();
            }
        };
        window.sshClientReconnect = (tabId) => {
            if (window.sshClientInstance) {
                window.sshClientInstance.reconnect(tabId);
            }
        };
        window.sshClientShowConnectionMenu = (event, id, type) => {
            if (window.sshClientInstance) {
                window.sshClientInstance.showConnectionMenu(event, id, type);
            }
        };
        window.sshClientMenuConnect = () => {
            if (window.sshClientInstance && window.sshClientInstance.menuContext) {
                const { id, type } = window.sshClientInstance.menuContext;
                window.sshClientInstance.hideConnectionMenu();
                if (type === 'saved') {
                    window.sshClientInstance.connectFromSaved(id);
                } else {
                    const tab = window.sshClientInstance.tabs.find(t => t.id === id);
                    if (tab && !tab.connected) {
                        window.sshClientInstance.connect(id);
                    }
                }
            }
        };
        window.sshClientMenuReconnect = () => {
            if (window.sshClientInstance && window.sshClientInstance.menuContext) {
                const { id } = window.sshClientInstance.menuContext;
                window.sshClientInstance.hideConnectionMenu();
                window.sshClientInstance.reconnect(id);
            }
        };
        window.sshClientMenuDisconnect = () => {
            if (window.sshClientInstance && window.sshClientInstance.menuContext) {
                const { id } = window.sshClientInstance.menuContext;
                window.sshClientInstance.hideConnectionMenu();
                window.sshClientInstance.disconnect(id);
            }
        };
        window.sshClientMenuEdit = () => {
            if (window.sshClientInstance && window.sshClientInstance.menuContext) {
                const { id, type } = window.sshClientInstance.menuContext;
                window.sshClientInstance.hideConnectionMenu();
                if (type === 'saved') {
                    window.sshClientInstance.showEditConnectionModal(id);
                } else {
                    const tab = window.sshClientInstance.tabs.find(t => t.id === id);
                    if (tab && tab.connectionId) {
                        window.sshClientInstance.showEditConnectionModal(tab.connectionId);
                    }
                }
            }
        };
        window.sshClientMenuDelete = () => {
            if (window.sshClientInstance && window.sshClientInstance.menuContext) {
                const { id, type } = window.sshClientInstance.menuContext;
                window.sshClientInstance.hideConnectionMenu();
                if (type === 'saved') {
                    window.sshClientInstance.deleteSavedConnection(id);
                } else {
                    const tab = window.sshClientInstance.tabs.find(t => t.id === id);
                    if (tab && tab.connectionId) {
                        window.sshClientInstance.deleteSavedConnection(tab.connectionId);
                    }
                }
            }
        };
        window.sshClientMenuClose = () => {
            if (window.sshClientInstance && window.sshClientInstance.menuContext) {
                const { id } = window.sshClientInstance.menuContext;
                window.sshClientInstance.hideConnectionMenu();
                window.sshClientInstance.closeTab(id);
            }
        };
    }
    
    escapeHTML(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;');
    }
    
    cleanOutput(str) {
        if (!str) return '';
        // Remove all ANSI codes (for text-only operations)
        return str
            .replace(/\u001b\[[0-9;?]*[ -\/]*[@-~]/g, '')
            .replace(/\u001b\][^\u0007]*\u0007/g, '')
            .replace(/\u001b[()#][0-9A-Za-z]/g, '')
            .replace(/\u0007/g, '')
            .replace(/\r/g, '');
    }

    cleanNonColorAnsi(str) {
        if (!str) return '';
        // Remove non-color ANSI codes but keep SGR (color) codes
        let cleaned = str
            .replace(/\u001b\][^\u0007]*\u0007/g, '') // Remove OSC sequences
            .replace(/\u001b\[[?][0-9;]*[hl]/g, '') // Remove bracketed paste mode and other mode codes
            .replace(/\u001b\[[0-9;]*[HJ]/g, '') // Remove cursor position codes
            .replace(/\u001b\[[0-9;]*[K]/g, '') // Remove erase line codes
            .replace(/\u001b\[[0-9;]*[ABCDEFG]/g, '') // Remove cursor movement codes
            .replace(/\u001b\[[0-9;]*[r]/g, '') // Remove scroll region codes
            .replace(/\u001b\[[0-9;]*[sSu]/g, '') // Remove save/restore cursor codes
            .replace(/\u001b\[[0-9;]*[f]/g, '') // Remove cursor position codes (alternative)
            .replace(/\u001b[()#][0-9A-Za-z]/g, '') // Remove other escape sequences
            .replace(/\u0007/g, '') // Remove bell
            .replace(/\r/g, ''); // Remove carriage returns
        
        // Also remove bracketed paste mode codes that might appear as literal text (if escape was stripped)
        cleaned = cleaned.replace(/\[[?]2004[hl]/g, '');
        
        // Keep \u001b\[...m sequences (SGR codes for colors)
        return cleaned;
    }

    processOutputWithCommands(output) {
        if (!output) return '';
        
        // Process entire output as one unit to preserve color state across lines
        // This ensures ANSI color codes work correctly
        return this.ansiToHtml(output);
    }

    ansiToHtml(str) {
        if (!str) return '';
        
        // ANSI color code mapping - enhanced with more vibrant colors
        const colors = {
            // Standard foreground colors - more vibrant
            '30': '#1e293b', '31': '#ef4444', '32': '#10b981', '33': '#f59e0b',
            '34': '#3b82f6', '35': '#a855f7', '36': '#06b6d4', '37': '#f1f5f9',
            // Bright foreground colors - enhanced
            '90': '#64748b', '91': '#f87171', '92': '#34d399', '93': '#fbbf24',
            '94': '#60a5fa', '95': '#c084fc', '96': '#22d3ee', '97': '#ffffff',
            // Background colors - enhanced
            '40': '#0f172a', '41': '#7f1d1d', '42': '#064e3b', '43': '#78350f',
            '44': '#1e3a8a', '45': '#581c87', '46': '#164e63', '47': '#334155',
        };
        
        let html = '';
        let currentStyle = {
            color: '#ffffff', // Default to white
            backgroundColor: null,
            bold: false,
            dim: false,
            italic: false,
            underline: false,
            strikethrough: false
        };
        
        // Track open spans to ensure proper closing
        let openSpanCount = 0;
        let previousStyle = null;
        
        // Process ANSI codes - need to escape HTML in text parts, not in ANSI codes
        const ansiRegex = /\u001b\[([0-9;]*)([a-zA-Z])/g;
        let lastIndex = 0;
        let match;
        const parts = [];
        
        // Split string into text and ANSI code parts
        while ((match = ansiRegex.exec(str)) !== null) {
            if (match.index > lastIndex) {
                parts.push({ type: 'text', content: str.substring(lastIndex, match.index) });
            }
            parts.push({ type: 'ansi', codes: match[1], command: match[2] });
            lastIndex = match.index + match[0].length;
        }
        
        if (lastIndex < str.length) {
            parts.push({ type: 'text', content: str.substring(lastIndex) });
        }
        
        // Process each part
        for (const part of parts) {
            if (part.type === 'text') {
                // Escape HTML and apply current style
                const escaped = this.escapeHTML(part.content);
                const styled = this.applyStyle(escaped, currentStyle);
                html += styled;
                
                // Track if we opened a span
                if (styled.startsWith('<span')) {
                    openSpanCount++;
                }
            } else if (part.type === 'ansi' && part.command === 'm') {
                // Process SGR (Select Graphic Rendition) command
                const codes = part.codes.split(';').filter(c => c !== '');
                
                // Close existing span before applying new style
                if (openSpanCount > 0) {
                    html += '</span>';
                    openSpanCount--;
                }
                
                for (let i = 0; i < codes.length; i++) {
                    const code = codes[i];
                    
                    if (code === '0' || code === '') {
                        // Reset all - default to white
                        currentStyle = {
                            color: '#ffffff', // Default to white
                            backgroundColor: null,
                            bold: false,
                            dim: false,
                            italic: false,
                            underline: false,
                            strikethrough: false
                        };
                    } else if (code === '1') {
                        currentStyle.bold = true;
                    } else if (code === '2') {
                        currentStyle.dim = true;
                    } else if (code === '3') {
                        currentStyle.italic = true;
                    } else if (code === '4') {
                        currentStyle.underline = true;
                    } else if (code === '9') {
                        currentStyle.strikethrough = true;
                    } else if (code === '22') {
                        currentStyle.bold = false;
                        currentStyle.dim = false;
                    } else if (code === '23') {
                        currentStyle.italic = false;
                    } else if (code === '24') {
                        currentStyle.underline = false;
                    } else if (code === '29') {
                        currentStyle.strikethrough = false;
                    } else if (code >= '30' && code <= '37') {
                        currentStyle.color = colors[code];
                    } else if (code >= '90' && code <= '97') {
                        currentStyle.color = colors[code];
                    } else if (code >= '40' && code <= '47') {
                        currentStyle.backgroundColor = colors[code];
                    } else if (code === '39') {
                        currentStyle.color = '#ffffff'; // Reset to white (default foreground)
                    } else if (code === '49') {
                        currentStyle.backgroundColor = null;
                    } else if (code.startsWith('38;5;') || code.startsWith('48;5;')) {
                        // 256-color mode
                        const colorCode = code.split(';')[2];
                        if (code.startsWith('38')) {
                            currentStyle.color = this.get256Color(colorCode);
                        } else {
                            currentStyle.backgroundColor = this.get256Color(colorCode);
                        }
                    } else if (code.startsWith('38;2;') || code.startsWith('48;2;')) {
                        // True color mode (RGB)
                        const parts = code.split(';');
                        if (parts.length >= 5) {
                            const r = parseInt(parts[2]);
                            const g = parseInt(parts[3]);
                            const b = parseInt(parts[4]);
                            const rgb = `rgb(${r},${g},${b})`;
                            if (code.startsWith('38')) {
                                currentStyle.color = rgb;
                            } else {
                                currentStyle.backgroundColor = rgb;
                            }
                        }
                    }
                }
            }
        }
        
        // Close any remaining open spans at the end
        if (openSpanCount > 0) {
            html += '</span>'.repeat(openSpanCount);
        }
        
        return html || this.escapeHTML(str);
    }

    applyStyle(text, style) {
        if (!text) return '';
        
        const styles = [];
        if (style.color) styles.push(`color: ${style.color}`);
        if (style.backgroundColor) styles.push(`background-color: ${style.backgroundColor}`);
        if (style.bold) styles.push('font-weight: bold');
        if (style.dim) styles.push('opacity: 0.5');
        if (style.italic) styles.push('font-style: italic');
        if (style.underline) styles.push('text-decoration: underline');
        if (style.strikethrough) styles.push('text-decoration: line-through');
        
        if (styles.length === 0) return text;
        
        return `<span style="${styles.join('; ')}">${text}</span>`;
    }

    get256Color(code) {
        // Simplified 256-color palette - return closest standard color
        const num = parseInt(code);
        if (num < 16) {
            const colors = ['#000000', '#800000', '#008000', '#808000', '#000080', '#800080', '#008080', '#c0c0c0',
                          '#808080', '#ff0000', '#00ff00', '#ffff00', '#0000ff', '#ff00ff', '#00ffff', '#ffffff'];
            return colors[num] || '#ffffff';
        }
        return '#ffffff';
    }
    
    attachEventListeners() {
        // Re-attach any event listeners that might have been lost during re-render
        // This is a safety measure, but onclick handlers should work with the instance
    }
}

