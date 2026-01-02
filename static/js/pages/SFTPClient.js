export class SFTPClientPage {
    constructor() {
        this.connections = [];
        this.activeConnectionId = null;
        this.currentPath = '/';
        this.files = [];
        this.loading = false;
        this._showConnectionModal = false;
        this.savedConnections = [];
        this.sortBy = 'type'; // 'name', 'size', 'date', 'type'
        this.sortOrder = 'asc'; // 'asc', 'desc'
        this.menuContext = null; // { path, name, isDir }
        this.wsConnections = new Map(); // Map of connection ID to WebSocket
        this.encryptionKey = null;
        this.connectionMenuContext = null; // { connectionId }
        this._onConnectionMenuOutsideClick = (event) => {
            const menu = document.getElementById('sftp-connection-menu');
            if (menu && !menu.contains(event.target)) {
                this.hideConnectionMenu();
            }
        };
    }

    async render() {
        window.sftpClientInstance = this;
        return `
            <div class="page-container-full">
                ${this._showConnectionModal ? this.renderConnectionModal() : ''}
                ${this.renderConnectionMenu()}
                
                <div class="sftp-client-container">
                    <div class="sftp-sidebar">
                        <div class="sftp-sidebar-header ssh-sidebar-header">
                            <h3><i class="fas fa-folder-open"></i> SFTP Connections</h3>
                            <div class="ssh-sidebar-actions">
                                <button class="ssh-sidebar-btn ssh-sidebar-btn-primary" onclick="window.sftpClientShowConnectionModal()" title="New Connection">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                        </div>
                        <div class="sftp-connections-list">
                            ${this.connections.length === 0 ? `
                                <div class="sftp-empty-connections">
                                    <i class="fas fa-server"></i>
                                    <p>No connections</p>
                                    <p class="sftp-empty-hint">Click <i class="fas fa-plus"></i> to create one</p>
                                </div>
                            ` : ''}
                                ${this.renderConnectionsList()}
                        </div>
                    </div>
                    
                    <div class="sftp-main">
                        ${this.activeConnectionId ? this.renderFileBrowser() : this.renderWelcome()}
                    </div>
                </div>
            </div>
        `;
    }

    renderWelcome() {
        return `
            <div class="sftp-welcome">
                <i class="fas fa-cloud-upload-alt"></i>
                <h2>SFTP Client</h2>
                <p>Select a connection from the sidebar or create a new one to get started</p>
            </div>
        `;
    }

    renderConnectionMenu() {
        return `
            <div class="ssh-connection-menu sftp-connection-menu" id="sftp-connection-menu" style="display: none;">
                <div class="ssh-menu-item" id="sftp-conn-menu-connect" onclick="window.sftpClientMenuConnect()">
                    <i class="fas fa-plug"></i>
                    <span>Connect</span>
                </div>
                <div class="ssh-menu-item" id="sftp-conn-menu-disconnect" onclick="window.sftpClientMenuDisconnect()">
                    <i class="fas fa-times"></i>
                    <span>Disconnect</span>
                </div>
                <div class="ssh-menu-divider"></div>
                <div class="ssh-menu-item" onclick="window.sftpClientMenuEdit()">
                    <i class="fas fa-edit"></i>
                    <span>Edit</span>
                </div>
                <div class="ssh-menu-item" onclick="window.sftpClientMenuDeleteConnection()">
                    <i class="fas fa-trash"></i>
                    <span>Delete</span>
                </div>
            </div>
        `;
    }

    renderConnectionsList() {
        const active = this.connections.filter(c => c.connected);
        const saved = this.connections.filter(c => !c.connected);
        const ordered = [...active, ...saved];
        if (!ordered.length) return '';

        return ordered.map(conn => `
            <div class="ssh-connection-item sftp-connection-item ${conn.id === this.activeConnectionId ? 'active' : ''}" 
                 onclick="window.sftpClientSelectConnection('${conn.id}')"
                 ondblclick="window.sftpClientConnectFromSaved('${conn.id}')"
                 oncontextmenu="event.preventDefault(); window.sftpClientShowConnectionMenu(event, '${conn.id}')">
                <div class="ssh-connection-info">
                    <div class="ssh-connection-title">${this.escapeHTML(conn.name || `${conn.user}@${conn.host}`)}</div>
                    <div class="ssh-connection-details">
                        <span>${this.escapeHTML(conn.host)}</span>
                        <span>${this.escapeHTML(conn.user)}</span>
                    </div>
                </div>
                <div class="ssh-connection-actions">
                    <div class="ssh-connection-status">
                        <span class="ssh-status-indicator ${conn.connected ? 'connected' : 'disconnected'}">
                            ${conn.connected ? '● Connected' : '○ Saved'}
                        </span>
                    </div>
                    ${conn.connected ? `
                        <button class="ssh-connection-menu-btn sftp-connection-disconnect" onclick="event.stopPropagation(); window.sftpClientDisconnect('${conn.id}')" title="Disconnect">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : `
                        <button class="ssh-connection-menu-btn sftp-connection-connect" onclick="event.stopPropagation(); window.sftpClientConnectFromSaved('${conn.id}')" title="Connect">
                            <i class="fas fa-plug"></i>
                        </button>
                    `}
                    <button class="ssh-connection-menu-btn" onclick="event.stopPropagation(); window.sftpClientShowConnectionMenu(event, '${conn.id}')" title="Menu">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderFileBrowser() {
        const conn = this.connections.find(c => c.id === this.activeConnectionId);
        if (!conn) return this.renderWelcome();

        return `
            <div class="sftp-file-browser">
                <div class="sftp-toolbar">
                    <div class="sftp-path-bar">
                        <button class="sftp-btn sftp-btn-icon" onclick="window.sftpClientGoHome()" title="Home">
                            <i class="fas fa-home"></i>
                        </button>
                        <button class="sftp-btn sftp-btn-icon" onclick="window.sftpClientGoUp()" title="Up">
                            <i class="fas fa-arrow-up"></i>
                        </button>
                        <input type="text" class="sftp-path-input" id="sftp-path-input" 
                               value="${this.escapeHTML(this.currentPath)}"
                               onkeypress="if(event.key==='Enter') window.sftpClientNavigatePath(event.target.value)">
                        <button class="sftp-btn sftp-btn-icon" onclick="window.sftpClientRefresh()" title="Refresh">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                    </div>
                    <div class="sftp-toolbar-actions">
                        <select class="sftp-sort-select" id="sftp-sort-select" onchange="window.sftpClientChangeSort()">
                            <option value="name-asc">Name (A-Z)</option>
                            <option value="name-desc">Name (Z-A)</option>
                            <option value="type-asc">Type (Folders First)</option>
                            <option value="type-desc">Type (Files First)</option>
                            <option value="size-asc">Size (Smallest First)</option>
                            <option value="size-desc">Size (Largest First)</option>
                            <option value="date-asc">Date (Oldest First)</option>
                            <option value="date-desc">Date (Newest First)</option>
                        </select>
                        <button class="sftp-btn sftp-btn-primary" onclick="window.sftpClientShowUploadDialog()">
                            <i class="fas fa-upload"></i> Upload
                        </button>
                        <button class="sftp-btn sftp-btn-primary" onclick="window.sftpClientShowMkdirDialog()">
                            <i class="fas fa-folder-plus"></i> New Folder
                        </button>
                    </div>
                </div>
                
                ${this.renderFileMenu()}
                
                <div class="sftp-files-container">
                    ${this.loading ? `
                        <div class="sftp-loading">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>Loading...</p>
                        </div>
                    ` : `
                        <div class="sftp-files-list">
                            ${this.files.length === 0 ? `
                                <div class="sftp-empty-files">
                                    <i class="fas fa-folder-open"></i>
                                    <p>No files or folders</p>
                                </div>
                            ` : `
                                <table class="sftp-files-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Size</th>
                                            <th>Modified</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${this.getSortedFiles().map(file => {
                                            // Escape the path properly for use in onclick attribute (preserve / characters)
                                            const escapedPath = this.escapeForAttribute(file.path);
                                            const escapedName = this.escapeHTML(file.name);
                                            const escapedNameAttr = this.escapeForAttribute(file.name);
                                            console.log('[SFTP Debug] Rendering file:', file.name, 'path:', file.path, 'escapedPath:', escapedPath);
                                            return `
                                            <tr class="sftp-file-row ${file.isDir ? 'sftp-dir' : 'sftp-file'}" 
                                                onclick="window.sftpClientOpenItem('${escapedPath}', ${file.isDir})"
                                                oncontextmenu="event.preventDefault(); window.sftpClientShowFileMenu(event, '${escapedPath}', '${escapedNameAttr}', ${file.isDir})">
                                                <td>
                                                    <i class="fas ${file.isDir ? 'fa-folder' : 'fa-file'}"></i>
                                                    ${escapedName}
                                                </td>
                                                <td>${file.isDir ? '-' : this.formatFileSize(file.size)}</td>
                                                <td>${this.formatDate(file.modTime)}</td>
                                                <td>
                                                    <div class="sftp-file-actions">
                                                        <button class="sftp-action-btn sftp-menu-btn" onclick="event.stopPropagation(); window.sftpClientShowFileMenu(event, '${escapedPath}', '${escapedNameAttr}', ${file.isDir})" title="Menu">
                                                            <i class="fas fa-ellipsis-v"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            `}
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    renderFileMenu() {
        return `
            <div class="sftp-file-menu" id="sftp-file-menu" style="display: none;">
                <div class="sftp-menu-item" onclick="window.sftpClientMenuDownload()" id="sftp-menu-download" style="display: none;">
                    <i class="fas fa-download"></i>
                    <span>Download</span>
                </div>
                <div class="sftp-menu-item" onclick="window.sftpClientMenuOpen()" id="sftp-menu-open" style="display: none;">
                    <i class="fas fa-folder-open"></i>
                    <span>Open</span>
                </div>
                <div class="sftp-menu-divider"></div>
                <div class="sftp-menu-item" onclick="window.sftpClientMenuRename()">
                    <i class="fas fa-edit"></i>
                    <span>Rename</span>
                </div>
                <div class="sftp-menu-item" onclick="window.sftpClientMenuDelete()">
                    <i class="fas fa-trash"></i>
                    <span>Delete</span>
                </div>
            </div>
        `;
    }

    showConnectionMenu(event, connectionId) {
        const menu = document.getElementById('sftp-connection-menu');
        if (!menu) return;

        this.connectionMenuContext = { connectionId };

        const conn = this.connections.find(c => c.id === connectionId);
        const connectItem = document.getElementById('sftp-conn-menu-connect');
        const disconnectItem = document.getElementById('sftp-conn-menu-disconnect');

        if (conn && conn.connected) {
            if (connectItem) connectItem.style.display = 'none';
            if (disconnectItem) disconnectItem.style.display = 'flex';
        } else {
            if (connectItem) connectItem.style.display = 'flex';
            if (disconnectItem) disconnectItem.style.display = 'none';
        }

        menu.style.display = 'block';
        menu.style.left = `${event.clientX}px`;
        menu.style.top = `${event.clientY}px`;

        document.addEventListener('click', this._onConnectionMenuOutsideClick);
    }

    hideConnectionMenu() {
        const menu = document.getElementById('sftp-connection-menu');
        if (menu) {
            menu.style.display = 'none';
        }
        this.connectionMenuContext = null;
        document.removeEventListener('click', this._onConnectionMenuOutsideClick);
    }

    async menuConnect() {
        if (!this.connectionMenuContext) return;
        const { connectionId } = this.connectionMenuContext;
        this.hideConnectionMenu();
        await this.connectFromSaved(connectionId);
    }

    async menuDisconnect() {
        if (!this.connectionMenuContext) return;
        const { connectionId } = this.connectionMenuContext;
        this.hideConnectionMenu();
        await this.disconnect(connectionId);
    }

    async menuEdit() {
        if (!this.connectionMenuContext) return;
        const { connectionId } = this.connectionMenuContext;
        this.hideConnectionMenu();

        const conn = this.connections.find(c => c.id === connectionId);
        if (!conn) return;

        // Open the connection modal pre-filled for editing
        this._editingConnectionId = connectionId;
        this._showConnectionModal = true;

        await this.updateDisplay();

        // Prefill form fields
        const nameInput = document.getElementById('sftp-conn-name');
        const hostInput = document.getElementById('sftp-conn-host');
        const portInput = document.getElementById('sftp-conn-port');
        const userInput = document.getElementById('sftp-conn-user');
        const passInput = document.getElementById('sftp-conn-password');

        if (nameInput) nameInput.value = conn.name || '';
        if (hostInput) hostInput.value = conn.host || '';
        if (portInput) portInput.value = conn.port || 22;
        if (userInput) userInput.value = conn.user || '';
        if (passInput) passInput.value = conn.password || '';
    }

    async menuDeleteConnection() {
        if (!this.connectionMenuContext) return;
        const { connectionId } = this.connectionMenuContext;
        this.hideConnectionMenu();

        if (!confirm('Are you sure you want to delete this SFTP connection?')) {
            return;
        }

        try {
            const res = await fetch(`/api/sftp/connections?id=${encodeURIComponent(connectionId)}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeaders()
                }
            });

            if (!res.ok) {
                let msg = 'Failed to delete connection';
                try {
                    const text = await res.text();
                    if (text) {
                        msg = text;
                    }
                } catch (_) {}
                alert(msg);
                return;
            }

            // Remove from local lists
            this.connections = this.connections.filter(c => c.id !== connectionId);
            this.savedConnections = this.savedConnections.filter(c => c.id !== connectionId);

            if (this.activeConnectionId === connectionId) {
                this.activeConnectionId = null;
                this.files = [];
                this.currentPath = '/';
            }

            await this.updateDisplay();
        } catch (error) {
            console.error('Error deleting SFTP connection:', error);
            alert('Failed to delete connection: ' + error.message);
        }
    }

    renderConnectionModal() {
        return `
            <div class="sftp-modal-overlay" onclick="window.sftpClientCloseConnectionModal()">
                <div class="sftp-modal" onclick="event.stopPropagation()">
                    <div class="sftp-modal-header">
                        <h3>New SFTP Connection</h3>
                        <button class="sftp-modal-close" onclick="window.sftpClientCloseConnectionModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="sftp-modal-body">
                        <form id="sftp-connection-form" onsubmit="window.sftpClientCreateConnection(event)">
                            <div class="sftp-form-group">
                                <label>Connection Name</label>
                                <input type="text" id="sftp-conn-name" placeholder="My Server" required>
                            </div>
                            <div class="sftp-form-group">
                                <label>Host</label>
                                <input type="text" id="sftp-conn-host" placeholder="192.168.1.100" required>
                            </div>
                            <div class="sftp-form-group">
                                <label>Port</label>
                                <input type="number" id="sftp-conn-port" value="22" required>
                            </div>
                            <div class="sftp-form-group">
                                <label>Username</label>
                                <input type="text" id="sftp-conn-user" placeholder="user" required>
                            </div>
                            <div class="sftp-form-group">
                                <label>Password</label>
                                <input type="password" id="sftp-conn-password" placeholder="password" required>
                            </div>
                            <div class="sftp-form-actions">
                                <button type="button" class="sftp-btn" onclick="window.sftpClientCloseConnectionModal()">Cancel</button>
                                <button type="submit" class="sftp-btn sftp-btn-primary">Connect</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
    }

    async mount() {
        window.sftpClientInstance = this;
        this.setupWrapperFunctions();

        // Load saved connections from backend
        await this.loadSavedConnections();

        await this.updateDisplay();
    }

    async loadSavedConnections() {
        try {
            const res = await fetch('/api/sftp/connections', {
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeaders()
                }
            });
            if (!res.ok) {
                const msg = await res.text();
                console.error('Failed to load saved connections:', msg);
                this.savedConnections = [];
                return;
            }
            const data = await res.json();
            this.savedConnections = data.connections || [];

            // Restore saved connections to connections list (as disconnected)
            this.savedConnections.forEach(saved => {
                const exists = this.connections.find(c => c.id === saved.id);
                if (!exists) {
                    this.connections.push({
                        id: saved.id,
                        name: saved.name,
                        host: saved.host,
                        port: saved.port,
                        user: saved.user,
                        password: saved.password || '',
                        connected: false,
                        connID: null
                    });
                }
            });
        } catch (error) {
            console.error('Error loading connections:', error);
            this.savedConnections = [];
        }
    }

    async saveConnection(connection) {
        try {
            const res = await fetch('/api/sftp/connections', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeaders()
                },
                body: JSON.stringify({ connection })
            });
            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || 'Failed to save connection');
            }
            const data = await res.json();
            const saved = data.connection || connection;

            // Update in-memory lists
            const existingIndex = this.savedConnections.findIndex(c => c.id === saved.id);
            if (existingIndex >= 0) {
                this.savedConnections[existingIndex] = saved;
            } else {
                this.savedConnections.push(saved);
            }

            const existingConn = this.connections.find(c => c.id === saved.id);
            if (existingConn) {
                existingConn.name = saved.name;
                existingConn.host = saved.host;
                existingConn.port = saved.port;
                existingConn.user = saved.user;
                existingConn.password = saved.password;
            } else {
                this.connections.push({
                    ...saved,
                    connected: false,
                    connID: null
                });
            }
        } catch (error) {
            console.error('Error saving connection:', error);
            alert('Failed to save connection: ' + error.message);
        }
    }

    setupWrapperFunctions() {
        window.sftpClientShowConnectionModal = () => this.showConnectionModal();
        window.sftpClientCloseConnectionModal = () => this.closeConnectionModal();
        window.sftpClientCreateConnection = (e) => this.createConnection(e);
        window.sftpClientSelectConnection = (id) => this.selectConnection(id);
        window.sftpClientGoHome = () => this.navigateToPath('/');
        window.sftpClientGoUp = () => this.goUp();
        window.sftpClientNavigatePath = (path) => this.navigateToPath(path);
        window.sftpClientRefresh = () => this.loadFiles();
        window.sftpClientOpenItem = (path, isDir) => this.openItem(path, isDir);
        window.sftpClientDownload = (path) => this.downloadFile(path);
        window.sftpClientRename = (path, name) => this.renameItem(path, name);
        window.sftpClientDelete = (path, name, isDir) => this.deleteItem(path, name, isDir);
        window.sftpClientShowUploadDialog = () => this.showUploadDialog();
        window.sftpClientShowMkdirDialog = () => this.showMkdirDialog();
        window.sftpClientChangeSort = () => this.changeSort();
        window.sftpClientShowFileMenu = (event, path, name, isDir) => this.showFileMenu(event, path, name, isDir);
        window.sftpClientMenuDownload = () => this.menuDownload();
        window.sftpClientMenuOpen = () => this.menuOpen();
        window.sftpClientMenuRename = () => this.menuRename();
        window.sftpClientMenuDelete = () => this.menuDelete();
        window.sftpClientConnectFromSaved = (id) => this.connectFromSaved(id);
        window.sftpClientDisconnect = (id) => this.disconnect(id);
        window.sftpClientShowConnectionMenu = (event, id) => this.showConnectionMenu(event, id);
        window.sftpClientMenuConnect = () => this.menuConnect();
        window.sftpClientMenuDisconnect = () => this.menuDisconnect();
        window.sftpClientMenuEdit = () => this.menuEdit();
        window.sftpClientMenuDeleteConnection = () => this.menuDeleteConnection();
    }

    async connectFromSaved(connectionId) {
        const conn = this.connections.find(c => c.id === connectionId);
        if (!conn) {
            console.error('Connection not found:', connectionId);
            return;
        }

        if (conn.connected) {
            // Already connected, just select it
            await this.selectConnection(connectionId);
            return;
        }

        // Connect to saved connection
        await this.selectConnection(connectionId);
        await this.connect(connectionId);
    }

    async updateDisplay() {
        const content = document.getElementById('page-content');
        if (content) {
            window.sftpClientInstance = this;
            this.setupWrapperFunctions();
            const html = await this.render();
            content.innerHTML = html;
            window.sftpClientInstance = this;
            this.setupWrapperFunctions();
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

    async createConnection(e) {
        e.preventDefault();
        const name = document.getElementById('sftp-conn-name').value;
        const host = document.getElementById('sftp-conn-host').value;
        const port = parseInt(document.getElementById('sftp-conn-port').value) || 22;
        const user = document.getElementById('sftp-conn-user').value;
        const password = document.getElementById('sftp-conn-password').value;

        let connId = this._editingConnectionId || `sftp-${Date.now()}`;
        let conn;

        if (this._editingConnectionId) {
            conn = this.connections.find(c => c.id === this._editingConnectionId);
            if (!conn) {
                // Fallback: create new if not found
                conn = {
                    id: connId,
                    connected: false,
                    connID: null
                };
                this.connections.push(conn);
            }
            conn.name = name;
            conn.host = host;
            conn.port = port;
            conn.user = user;
            conn.password = password;
        } else {
            conn = {
                id: connId,
                name,
                host,
                port,
                user,
                password,
                connected: false,
                connID: null
            };
            this.connections.push(conn);
        }

        await this.saveConnection(conn);

        // Clear editing state
        this._editingConnectionId = null;
        
        // Clear form
        document.getElementById('sftp-conn-name').value = '';
        document.getElementById('sftp-conn-host').value = '';
        document.getElementById('sftp-conn-port').value = '22';
        document.getElementById('sftp-conn-user').value = '';
        document.getElementById('sftp-conn-password').value = '';
        
        await this.closeConnectionModal();

        await this.selectConnection(conn.id);
        await this.connect(conn.id);
    }

    async selectConnection(id) {
        this.activeConnectionId = id;
        await this.updateDisplay();
        const conn = this.connections.find(c => c.id === id);
        if (conn && conn.connected) {
            await this.loadFiles();
        }
    }

    async disconnect(connId) {
        const conn = this.connections.find(c => c.id === connId);
        if (!conn) return;

        const ws = this.wsConnections.get(connId);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'disconnect' }));
            ws.close();
        }
        this.wsConnections.delete(connId);
        conn.connected = false;
        conn.connID = null;

        // If this was the active connection, clear active state and file list
        if (this.activeConnectionId === connId) {
            this.activeConnectionId = null;
            this.files = [];
            this.currentPath = '/';
        }

        await this.updateDisplay();
    }

    async connect(connId) {
        const conn = this.connections.find(c => c.id === connId);
        if (!conn) return;

        // Close existing WebSocket if any
        const existingWs = this.wsConnections.get(connId);
        if (existingWs) {
            existingWs.close();
            this.wsConnections.delete(connId);
        }

        try {
            const token = localStorage.getItem('jwt_token');
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            let wsUrl = `${protocol}//${window.location.host}/api/sftp/ws`;
            if (token) {
                wsUrl += `?token=${encodeURIComponent(token)}`;
            }

            const ws = new WebSocket(wsUrl);
            this.wsConnections.set(connId, ws);

            ws.onopen = () => {
                // Send connect message
                ws.send(JSON.stringify({
                    type: 'connect',
                    host: conn.host,
                    port: conn.port,
                    user: conn.user,
                    password: conn.password,
                    sessionID: connId
                }));
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    this.handleWebSocketMessage(connId, msg);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            ws.onerror = (error) => {
                console.error('SFTP WS error:', error);
                alert('Connection error occurred');
                conn.connected = false;
                this.wsConnections.delete(connId);
                this.updateDisplay();
            };

            ws.onclose = () => {
                conn.connected = false;
                this.wsConnections.delete(connId);
                this.updateDisplay();
            };

        } catch (error) {
            alert('Failed to connect: ' + error.message);
            conn.connected = false;
            await this.updateDisplay();
        }
    }

    handleWebSocketMessage(connId, msg) {
        const conn = this.connections.find(c => c.id === connId);
        if (!conn) return;

        switch (msg.type) {
            case 'auth_required':
                // Send auth token
                const token = localStorage.getItem('jwt_token');
                const ws = this.wsConnections.get(connId);
                if (ws && token) {
                    ws.send(JSON.stringify({ type: 'auth', token }));
                }
                break;

            case 'auth':
                if (msg.status === 'success') {
                    // Already connected, send connect message
                    const ws2 = this.wsConnections.get(connId);
                    if (ws2) {
                        ws2.send(JSON.stringify({
                            type: 'connect',
                            host: conn.host,
                            port: conn.port,
                            user: conn.user,
                            password: conn.password,
                            sessionID: connId
                        }));
                    }
                } else {
                    alert('Authentication failed: ' + (msg.message || 'Unknown error'));
                    conn.connected = false;
                    this.updateDisplay();
                }
                break;

            case 'connected':
                conn.connID = msg.connID;
                conn.connected = true;
                // Reset to root path when connected
                this.currentPath = '/';
                this.updateDisplay();
                // Small delay to ensure connection is fully established
                setTimeout(() => {
                    this.loadFiles();
                }, 100);
                break;

            case 'error':
                console.log('[SFTP Debug] Error received:', msg.message);
                alert('Error: ' + (msg.message || 'Unknown error'));
                if (msg.message && msg.message.includes('Connection failed')) {
                    conn.connected = false;
                    this.updateDisplay();
                }
                break;

            case 'list':
                console.log('[SFTP Debug] Received list response:');
                console.log('[SFTP Debug] - Path from server:', msg.path);
                console.log('[SFTP Debug] - Number of files:', msg.files ? msg.files.length : 0);
                console.log('[SFTP Debug] - Files:', msg.files);
                console.log('[SFTP Debug] - Current path before update:', this.currentPath);
                this.files = msg.files || [];
                this.currentPath = msg.path || '/';
                console.log('[SFTP Debug] - Current path after update:', this.currentPath);
                this.updateSortSelector();
                this.loading = false;
                this.updateDisplay();
                break;

            case 'download_start':
                // File download started
                this.downloadFileName = msg.fileName;
                this.downloadFileSize = msg.size;
                this.downloadFileChunks = [];
                break;

            case 'download_chunk':
                // Accumulate chunks
                if (this.downloadFileChunks) {
                    // Convert hex string back to bytes
                    const bytes = new Uint8Array(msg.data.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
                    this.downloadFileChunks.push(bytes);
                }
                break;

            case 'download_complete':
                // Combine all chunks and download
                if (this.downloadFileChunks && this.downloadFileChunks.length > 0) {
                    const totalLength = this.downloadFileChunks.reduce((sum, chunk) => sum + chunk.length, 0);
                    const combined = new Uint8Array(totalLength);
                    let offset = 0;
                    for (const chunk of this.downloadFileChunks) {
                        combined.set(chunk, offset);
                        offset += chunk.length;
                    }
                    const blob = new Blob([combined]);
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = this.downloadFileName || 'download';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                    this.downloadFileChunks = null;
                }
                break;

            case 'upload_complete':
                alert('File uploaded successfully');
                this.loadFiles();
                break;

            case 'delete_complete':
                this.loadFiles();
                break;

            case 'mkdir_complete':
                this.loadFiles();
                break;

            case 'rename_complete':
                this.loadFiles();
                break;

            case 'disconnected':
                conn.connected = false;
                this.wsConnections.delete(connId);
                this.updateDisplay();
                break;
        }
    }

    async loadFiles() {
        const conn = this.connections.find(c => c.id === this.activeConnectionId);
        if (!conn || !conn.connected) {
            console.log('[SFTP Debug] loadFiles: Not connected or no active connection');
            return;
        }

        const ws = this.wsConnections.get(this.activeConnectionId);
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            alert('Not connected to server');
            return;
        }

        this.loading = true;
        await this.updateDisplay();

        // Ensure path is valid - default to root if empty or invalid
        const path = this.currentPath && this.currentPath.trim() !== '' ? this.currentPath : '/';
        console.log('[SFTP Debug] loadFiles: Sending list request with path:', path);
        console.log('[SFTP Debug] loadFiles: this.currentPath =', this.currentPath);
        console.log('[SFTP Debug] loadFiles: Active connection ID:', this.activeConnectionId);
        
        ws.send(JSON.stringify({
            type: 'list',
            path: path
        }));
    }

    getSortedFiles() {
        const files = [...this.files];
        
        files.sort((a, b) => {
            let comparison = 0;
            
            switch (this.sortBy) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'size':
                    comparison = (a.size || 0) - (b.size || 0);
                    break;
                case 'date':
                    const dateA = new Date(a.modTime).getTime();
                    const dateB = new Date(b.modTime).getTime();
                    comparison = dateA - dateB;
                    break;
                case 'type':
                    // Folders first (isDir = true comes before isDir = false)
                    if (a.isDir !== b.isDir) {
                        comparison = a.isDir ? -1 : 1;
                    } else {
                        comparison = a.name.localeCompare(b.name);
                    }
                    break;
            }
            
            // Apply sort order
            if (this.sortOrder === 'desc') {
                comparison = -comparison;
            }
            
            return comparison;
        });
        
        return files;
    }

    changeSort() {
        const select = document.getElementById('sftp-sort-select');
        if (!select) return;
        
        const [sortBy, sortOrder] = select.value.split('-');
        this.sortBy = sortBy;
        this.sortOrder = sortOrder;
        this.updateDisplay();
    }

    updateSortSelector() {
        const select = document.getElementById('sftp-sort-select');
        if (select) {
            select.value = `${this.sortBy}-${this.sortOrder}`;
        }
    }

    async navigateToPath(path) {
        console.log('[SFTP Debug] navigateToPath called with path:', path);
        console.log('[SFTP Debug] Current path before change:', this.currentPath);
        this.currentPath = path;
        console.log('[SFTP Debug] Current path after change:', this.currentPath);
        await this.loadFiles();
    }

    goUp() {
        if (this.currentPath === '/') return;
        const parts = this.currentPath.split('/').filter(p => p);
        parts.pop();
        const newPath = parts.length > 0 ? '/' + parts.join('/') : '/';
        console.log('[SFTP Debug] goUp: currentPath =', this.currentPath, ', newPath =', newPath);
        this.navigateToPath(newPath);
    }

    openItem(filePath, isDir) {
        console.log('[SFTP Debug] openItem called with path:', filePath, ', isDir:', isDir);
        console.log('[SFTP Debug] Current path:', this.currentPath);
        
        // Normalize path - replace backslashes with forward slashes (in case Windows paths got in)
        filePath = filePath.replace(/\\/g, '/');
        
        if (isDir) {
            // Path should already be absolute from the backend, but verify
            if (!filePath.startsWith('/')) {
                // If path is relative, make it absolute by joining with current path
                const fullPath = this.currentPath === '/' ? `/${filePath}` : `${this.currentPath}/${filePath}`;
                console.log('[SFTP Debug] Path was relative, converted to absolute:', fullPath);
                filePath = fullPath;
            }
            console.log('[SFTP Debug] Opening directory, navigating to:', filePath);
            this.navigateToPath(filePath);
        } else {
            // For files, download on click
            console.log('[SFTP Debug] Opening file, downloading:', filePath);
            this.downloadFile(filePath);
        }
    }

    showFileMenu(event, path, name, isDir) {
        const menu = document.getElementById('sftp-file-menu');
        if (!menu) return;
        
        // Store menu context
        this.menuContext = { path, name, isDir };
        
        // Position menu
        menu.style.display = 'block';
        menu.style.left = event.clientX + 'px';
        menu.style.top = event.clientY + 'px';
        
        // Show/hide menu items based on file type
        const downloadItem = document.getElementById('sftp-menu-download');
        const openItem = document.getElementById('sftp-menu-open');
        
        if (downloadItem) {
            downloadItem.style.display = !isDir ? 'flex' : 'none';
        }
        if (openItem) {
            openItem.style.display = isDir ? 'flex' : 'none';
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

    hideFileMenu() {
        const menu = document.getElementById('sftp-file-menu');
        if (menu) {
            menu.style.display = 'none';
        }
        this.menuContext = null;
    }

    menuDownload() {
        if (this.menuContext && !this.menuContext.isDir) {
            const path = this.menuContext.path;
            this.hideFileMenu();
            this.downloadFile(path);
        }
    }

    menuOpen() {
        if (this.menuContext && this.menuContext.isDir) {
            const path = this.menuContext.path;
            this.hideFileMenu();
            this.navigateToPath(path);
        }
    }

    menuRename() {
        if (this.menuContext) {
            const path = this.menuContext.path;
            const name = this.menuContext.name;
            this.hideFileMenu();
            this.renameItem(path, name);
        }
    }

    menuDelete() {
        if (this.menuContext) {
            const path = this.menuContext.path;
            const name = this.menuContext.name;
            const isDir = this.menuContext.isDir;
            this.hideFileMenu();
            this.deleteItem(path, name, isDir);
        }
    }

    async downloadFile(path) {
        const conn = this.connections.find(c => c.id === this.activeConnectionId);
        if (!conn || !conn.connected) return;

        const ws = this.wsConnections.get(this.activeConnectionId);
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            alert('Not connected to server');
            return;
        }

        ws.send(JSON.stringify({
            type: 'download',
            path: path
        }));
    }

    async renameItem(path, oldName) {
        const newName = prompt('Enter new name:', oldName);
        if (!newName || newName === oldName) return;

        const conn = this.connections.find(c => c.id === this.activeConnectionId);
        if (!conn || !conn.connected) return;

        const ws = this.wsConnections.get(this.activeConnectionId);
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            alert('Not connected to server');
            return;
        }

        const newPath = path.substring(0, path.length - oldName.length) + newName;

        ws.send(JSON.stringify({
            type: 'rename',
            oldPath: path,
            newPath: newPath
        }));
    }

    async deleteItem(filePath, name, isDir) {
        if (!confirm(`Are you sure you want to delete ${isDir ? 'folder' : 'file'} "${name}"?`)) return;

        const conn = this.connections.find(c => c.id === this.activeConnectionId);
        if (!conn || !conn.connected) {
            alert('Not connected');
            return;
        }

        const ws = this.wsConnections.get(this.activeConnectionId);
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            alert('Not connected to server');
            return;
        }

        // Normalize path - replace backslashes with forward slashes
        filePath = filePath.replace(/\\/g, '/');
        console.log('[SFTP Debug] deleteItem: Deleting path:', filePath, 'isDir:', isDir);

        ws.send(JSON.stringify({
            type: 'delete',
            path: filePath
        }));
    }


    showUploadDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.onchange = async (e) => {
            const files = Array.from(e.target.files);
            for (const file of files) {
                await this.uploadFile(file);
            }
        };
        input.click();
    }

    async uploadFile(file) {
        const conn = this.connections.find(c => c.id === this.activeConnectionId);
        if (!conn || !conn.connected) return;

        const ws = this.wsConnections.get(this.activeConnectionId);
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            alert('Not connected to server');
            return;
        }

        // Read file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        
        // Split into chunks (32KB each)
        const chunkSize = 32 * 1024;
        const totalChunks = Math.ceil(bytes.length / chunkSize);
        const remotePath = this.currentPath === '/' ? `/${file.name}` : `${this.currentPath}/${file.name}`;

        for (let i = 0; i < totalChunks; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, bytes.length);
            const chunk = bytes.slice(start, end);
            
            // Convert to hex string
            const hexString = Array.from(chunk).map(b => b.toString(16).padStart(2, '0')).join('');

            ws.send(JSON.stringify({
                type: 'upload',
                path: remotePath,
                fileName: file.name,
                data: hexString,
                chunkIndex: i,
                totalChunks: totalChunks
            }));
        }
    }

    async showMkdirDialog() {
        const name = prompt('Enter folder name:');
        if (!name) return;

        const conn = this.connections.find(c => c.id === this.activeConnectionId);
        if (!conn || !conn.connected) return;

        const ws = this.wsConnections.get(this.activeConnectionId);
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            alert('Not connected to server');
            return;
        }

        const newPath = this.currentPath === '/' ? `/${name}` : `${this.currentPath}/${name}`;

        ws.send(JSON.stringify({
            type: 'mkdir',
            path: newPath
        }));
    }

    getAuthHeaders() {
        const token = localStorage.getItem('jwt_token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString();
    }

    escapeHTML(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    escapeForAttribute(str) {
        if (!str) return '';
        // Escape single quotes, double quotes, and backslashes for use in HTML attributes
        return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }
}

