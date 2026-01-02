import { api } from '../utils/api.js';
import { logger } from '../utils/logger.js';

export class FTPClientPage {
    constructor() {
        this.connections = [];
        this.activeConnectionId = null;
        this.currentPath = '/';
        this.files = [];
        this.loading = false;
        this._showConnectionModal = false;
        this.savedConnections = [];
        this.menuContext = null;
    }

    async render() {
        window.ftpClientInstance = this;
        return `
            <div class="page-container-full">
                ${this._showConnectionModal ? this.renderConnectionModal() : ''}
                
                <div class="sftp-client-container">
                    <div class="sftp-sidebar">
                        <div class="sftp-sidebar-header ssh-sidebar-header">
                            <h3><i class="fas fa-folder-open"></i> FTP Connections</h3>
                            <div class="ssh-sidebar-actions">
                                <button class="ssh-sidebar-btn ssh-sidebar-btn-primary" onclick="window.ftpClientShowConnectionModal()" title="New Connection">
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
                <i class="fas fa-folder-open"></i>
                <h2>FTP Client</h2>
                <p>Select a connection from the sidebar or create a new one to get started</p>
            </div>
        `;
    }

    renderConnectionsList() {
        return this.connections.map(conn => `
            <div class="sftp-connection-item ${conn.id === this.activeConnectionId ? 'active' : ''}" 
                 onclick="window.ftpClientSelectConnection('${conn.id}')"
                 style="padding: 10px; margin: 5px 0; cursor: pointer; border: 1px solid #ddd; border-radius: 4px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${this.escapeHTML(conn.name || `${conn.user}@${conn.host}`)}</strong><br>
                        <small>${this.escapeHTML(conn.host)}:${conn.port}</small>
                    </div>
                    <div>
                        <span class="ssh-status-indicator ${conn.connected ? 'connected' : 'disconnected'}">
                            ${conn.connected ? '● Connected' : '○ Disconnected'}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderConnectionModal() {
        return `
            <div class="modal-overlay" onclick="window.ftpClientCloseConnectionModal()">
                <div class="modal-container" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>New FTP Connection</h3>
                        <button class="modal-close" onclick="window.ftpClientCloseConnectionModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Connection Name</label>
                            <input type="text" id="ftp-conn-name" class="form-input" placeholder="My FTP Server">
                        </div>
                        <div class="form-group">
                            <label>Host</label>
                            <input type="text" id="ftp-conn-host" class="form-input" placeholder="ftp.example.com">
                        </div>
                        <div class="form-group">
                            <label>Port</label>
                            <input type="number" id="ftp-conn-port" class="form-input" value="21">
                        </div>
                        <div class="form-group">
                            <label>Username</label>
                            <input type="text" id="ftp-conn-user" class="form-input" placeholder="anonymous">
                        </div>
                        <div class="form-group">
                            <label>Password</label>
                            <input type="password" id="ftp-conn-password" class="form-input" placeholder="Leave empty for anonymous">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="window.ftpClientCloseConnectionModal()">Cancel</button>
                        <button class="btn btn-primary" onclick="window.ftpClientCreateConnection()">Connect</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderFileBrowser() {
        return `
            <div class="sftp-file-browser">
                <div class="sftp-toolbar">
                    <div class="sftp-path-bar">
                        <button class="btn btn-sm" onclick="window.ftpClientNavigateUp()" ${this.currentPath === '/' ? 'disabled' : ''}>
                            <i class="fas fa-arrow-up"></i>
                        </button>
                        <input type="text" class="sftp-path-input" id="ftp-path-input" value="${this.escapeHTML(this.currentPath)}" 
                               onkeydown="if(event.key === 'Enter') window.ftpClientNavigateToPath()">
                        <button class="btn btn-sm" onclick="window.ftpClientRefresh()">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                    </div>
                    <div class="sftp-toolbar-actions">
                        <button class="btn btn-sm btn-primary" onclick="window.ftpClientUploadFile()">
                            <i class="fas fa-upload"></i> Upload
                        </button>
                        <button class="btn btn-sm" onclick="window.ftpClientCreateFolder()">
                            <i class="fas fa-folder-plus"></i> New Folder
                        </button>
                    </div>
                </div>
                <div class="sftp-file-list">
                    ${this.loading ? `
                        <div style="text-align: center; padding: 50px;">
                            <i class="fas fa-spinner fa-spin"></i> Loading...
                        </div>
                    ` : this.renderFileList()}
                </div>
            </div>
        `;
    }

    renderFileList() {
        if (this.files.length === 0) {
            return `
                <div style="text-align: center; padding: 50px; color: #666;">
                    <i class="fas fa-folder-open"></i>
                    <p>No files in this directory</p>
                </div>
            `;
        }

        return `
            <table class="table" style="width: 100%;">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Size</th>
                        <th>Type</th>
                        <th>Modified</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.files.map(file => `
                        <tr class="${file.isDir ? 'sftp-dir' : 'sftp-file'}" 
                            ondblclick="window.ftpClientOpenItem('${this.escapeForAttribute(file.path)}', ${file.isDir})">
                            <td>
                                <i class="fas ${file.isDir ? 'fa-folder' : 'fa-file'}"></i>
                                ${this.escapeHTML(file.name)}
                            </td>
                            <td>${file.isDir ? '-' : this.formatFileSize(file.size)}</td>
                            <td>${this.escapeHTML(file.type)}</td>
                            <td>${this.formatDate(file.time)}</td>
                            <td>
                                <div class="sftp-file-actions">
                                    ${!file.isDir ? `
                                        <button class="btn btn-sm" onclick="event.stopPropagation(); window.ftpClientDownload('${this.escapeForAttribute(file.path)}')">
                                            <i class="fas fa-download"></i>
                                        </button>
                                    ` : ''}
                                    <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); window.ftpClientDelete('${this.escapeForAttribute(file.path)}', ${file.isDir})">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    escapeHTML(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    escapeForAttribute(str) {
        return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }

    formatFileSize(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    formatDate(dateStr) {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            return date.toLocaleString();
        } catch {
            return dateStr;
        }
    }

    async mount() {
        window.ftpClientShowConnectionModal = () => {
            this._showConnectionModal = true;
            this.updateRender();
        };

        window.ftpClientCloseConnectionModal = () => {
            this._showConnectionModal = false;
            this.updateRender();
        };

        window.ftpClientCreateConnection = async () => {
            const name = document.getElementById('ftp-conn-name')?.value || 'FTP Connection';
            const host = document.getElementById('ftp-conn-host')?.value;
            const port = parseInt(document.getElementById('ftp-conn-port')?.value || '21');
            const user = document.getElementById('ftp-conn-user')?.value || 'anonymous';
            const password = document.getElementById('ftp-conn-password')?.value || '';

            if (!host) {
                alert('Please enter a host');
                return;
            }

            try {
                const response = await api.post('/api/ftp/connect', {
                    host, port, user, password, passive: true
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Connection failed');
                }

                const data = await response.json();
                const conn = {
                    id: data.connId,
                    name,
                    host,
                    port,
                    user,
                    connId: data.connId,
                    connected: true
                };

                this.connections.push(conn);
                this.activeConnectionId = conn.id;
                this._showConnectionModal = false;
                await this.loadFiles();
                this.updateRender();
            } catch (error) {
                alert(`Connection failed: ${error.message}`);
            }
        };

        window.ftpClientSelectConnection = async (id) => {
            this.activeConnectionId = id;
            this.currentPath = '/';
            await this.loadFiles();
            this.updateRender();
        };

        window.ftpClientNavigateUp = async () => {
            if (this.currentPath === '/') return;
            const parts = this.currentPath.split('/').filter(p => p);
            parts.pop();
            this.currentPath = parts.length > 0 ? '/' + parts.join('/') : '/';
            await this.loadFiles();
            this.updateRender();
        };

        window.ftpClientNavigateToPath = async () => {
            const path = document.getElementById('ftp-path-input')?.value || '/';
            this.currentPath = path;
            await this.loadFiles();
            this.updateRender();
        };

        window.ftpClientRefresh = async () => {
            await this.loadFiles();
            this.updateRender();
        };

        window.ftpClientOpenItem = async (path, isDir) => {
            if (isDir) {
                this.currentPath = path;
                await this.loadFiles();
                this.updateRender();
            }
        };

        window.ftpClientDownload = async (path) => {
            const conn = this.connections.find(c => c.id === this.activeConnectionId);
            if (!conn) return;

            try {
                const response = await api.post('/api/ftp/download', {
                    connId: conn.connId,
                    path: path
                });

                if (!response.ok) throw new Error('Download failed');

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = path.split('/').pop();
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            } catch (error) {
                alert(`Download failed: ${error.message}`);
            }
        };

        window.ftpClientUploadFile = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const conn = this.connections.find(c => c.id === this.activeConnectionId);
                if (!conn) return;

                const formData = new FormData();
                formData.append('file', file);
                formData.append('connId', conn.connId);
                formData.append('path', this.currentPath);

                try {
                    const response = await api.fetch('/api/ftp/upload', {
                        method: 'POST',
                        body: formData
                    });

                    if (!response.ok) throw new Error('Upload failed');
                    await this.loadFiles();
                    this.updateRender();
                } catch (error) {
                    alert(`Upload failed: ${error.message}`);
                }
            };
            input.click();
        };

        window.ftpClientCreateFolder = async () => {
            const name = prompt('Enter folder name:');
            if (!name) return;

            const conn = this.connections.find(c => c.id === this.activeConnectionId);
            if (!conn) return;

            const path = this.currentPath === '/' ? `/${name}` : `${this.currentPath}/${name}`;

            try {
                const response = await api.post('/api/ftp/mkdir', {
                    connId: conn.connId,
                    path: path
                });

                if (!response.ok) throw new Error('Failed to create folder');
                await this.loadFiles();
                this.updateRender();
            } catch (error) {
                alert(`Failed to create folder: ${error.message}`);
            }
        };

        window.ftpClientDelete = async (path, isDir) => {
            if (!confirm(`Are you sure you want to delete ${isDir ? 'folder' : 'file'} "${path.split('/').pop()}"?`)) {
                return;
            }

            const conn = this.connections.find(c => c.id === this.activeConnectionId);
            if (!conn) return;

            try {
                const response = await api.post('/api/ftp/delete', {
                    connId: conn.connId,
                    path: path
                });

                if (!response.ok) throw new Error('Delete failed');
                await this.loadFiles();
                this.updateRender();
            } catch (error) {
                alert(`Delete failed: ${error.message}`);
            }
        };
    }

    async loadFiles() {
        const conn = this.connections.find(c => c.id === this.activeConnectionId);
        if (!conn) return;

        this.loading = true;
        this.updateRender();

        try {
            const response = await api.post('/api/ftp/list', {
                connId: conn.connId,
                path: this.currentPath
            });

            if (!response.ok) throw new Error('Failed to list files');

            const data = await response.json();
            this.files = (data.files || []).map(file => ({
                name: file.name,
                size: file.size || 0,
                type: file.type || (file.isDir ? 'Directory' : 'File'),
                time: file.time || '',
                isDir: file.isDir || false,
                path: this.currentPath === '/' ? `/${file.name}` : `${this.currentPath}/${file.name}`
            }));
        } catch (error) {
            logger.error('Failed to load files:', error);
            this.files = [];
        } finally {
            this.loading = false;
        }
    }

    async updateRender() {
        document.getElementById('page-content').innerHTML = await this.render();
        if (this.activeConnectionId) {
            document.getElementById('ftp-path-input')?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    window.ftpClientNavigateToPath();
                }
            });
        }
    }
}
