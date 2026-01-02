import { api } from '../utils/api.js';
import { logger } from '../utils/logger.js';

export class DatabaseClientPage {
    constructor() {
        this.connections = [];
        this.activeConnectionId = null;
        this.tables = [];
        this.queryResults = null;
        this._showConnectionModal = false;
        this.currentQuery = '';
    }

    async render() {
        window.databaseClientInstance = this;
        return `
            <div class="page-container-full">
                ${this._showConnectionModal ? this.renderConnectionModal() : ''}
                <div class="sftp-client-container">
                    <div class="sftp-sidebar">
                        <div class="sftp-sidebar-header ssh-sidebar-header">
                            <h3><i class="fas fa-database"></i> SQL Connections</h3>
                            <div class="ssh-sidebar-actions">
                                <button class="ssh-sidebar-btn ssh-sidebar-btn-primary" onclick="window.databaseClientShowConnectionModal()" title="New Connection">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                        </div>
                        <div class="sftp-connections-list">
                            ${this.connections.length === 0 ? `
                                <div class="sftp-empty-connections">
                                    <i class="fas fa-database"></i>
                                    <p>No connections</p>
                                    <p class="sftp-empty-hint">Click <i class="fas fa-plus"></i> to create one</p>
                                </div>
                            ` : ''}
                            ${this.renderConnectionsList()}
                        </div>
                        ${this.activeConnectionId ? this.renderTablesSidebar() : ''}
                    </div>
                    <div class="sftp-main">
                        ${this.activeConnectionId ? this.renderQueryInterface() : this.renderWelcome()}
                    </div>
                </div>
            </div>
        `;
    }

    renderWelcome() {
        return `
            <div class="sftp-welcome">
                <i class="fas fa-database"></i>
                <h2>SQL Client</h2>
                <p>Connect to MySQL, PostgreSQL, or SQL Server databases</p>
                <p style="color: #666; margin-top: 10px;">Select a connection from the sidebar or create a new one to get started</p>
            </div>
        `;
    }

    renderConnectionsList() {
        return this.connections.map(conn => `
            <div class="sftp-connection-item ${conn.id === this.activeConnectionId ? 'active' : ''}" 
                 onclick="window.databaseClientSelectConnection('${conn.id}')"
                 style="padding: 10px; margin: 5px 0; cursor: pointer; border: 1px solid #ddd; border-radius: 4px; background: ${conn.id === this.activeConnectionId ? '#f0f7ff' : '#fff'};">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                        <strong style="display: block; margin-bottom: 4px;">${this.escapeHTML(conn.name)}</strong>
                        <small style="color: #666; font-size: 12px;">
                            <i class="fas fa-${this.getDatabaseIcon(conn.type)}"></i> ${this.escapeHTML(conn.type.toUpperCase())} - ${this.escapeHTML(conn.host)}
                        </small>
                    </div>
                    <div>
                        <span class="ssh-status-indicator connected">
                            ● Connected
                        </span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderTablesSidebar() {
        return `
            <div style="margin-top: 20px; border-top: 1px solid #ddd; padding-top: 20px;">
                <h4 style="margin-bottom: 10px; font-size: 14px; color: #666;">
                    <i class="fas fa-table"></i> Tables
                </h4>
                <div style="max-height: 400px; overflow-y: auto;">
                    ${this.tables.length === 0 ? `
                        <p style="color: #999; font-size: 12px; padding: 10px;">No tables found</p>
                    ` : this.tables.map(table => `
                        <div class="database-table-item" 
                             onclick="window.databaseClientSelectTable('${this.escapeForAttribute(table)}')"
                             style="padding: 8px; margin: 3px 0; cursor: pointer; border-radius: 4px; font-size: 13px;"
                             onmouseover="this.style.background='#f5f5f5'"
                             onmouseout="this.style.background='transparent'">
                            <i class="fas fa-table" style="margin-right: 8px; color: #666;"></i>
                            ${this.escapeHTML(table)}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderConnectionModal() {
        return `
            <div class="modal-overlay" onclick="window.databaseClientCloseConnectionModal()">
                <div class="modal-container" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>New SQL Connection</h3>
                        <button class="modal-close" onclick="window.databaseClientCloseConnectionModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Connection Name</label>
                            <input type="text" id="db-conn-name" class="form-input" placeholder="My Database">
                        </div>
                        <div class="form-group">
                            <label>Database Type</label>
                            <select id="db-conn-type" class="form-input" onchange="window.databaseClientUpdatePort()">
                                <option value="mysql">MySQL</option>
                                <option value="postgres">PostgreSQL</option>
                                <option value="mssql">SQL Server</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Host</label>
                            <input type="text" id="db-conn-host" class="form-input" placeholder="localhost">
                        </div>
                        <div class="form-group">
                            <label>Port</label>
                            <input type="number" id="db-conn-port" class="form-input" placeholder="Auto (3306/5432/1433)">
                        </div>
                        <div class="form-group">
                            <label>Database Name</label>
                            <input type="text" id="db-conn-database" class="form-input" placeholder="database_name">
                        </div>
                        <div class="form-group">
                            <label>Username</label>
                            <input type="text" id="db-conn-user" class="form-input" placeholder="root">
                        </div>
                        <div class="form-group">
                            <label>Password</label>
                            <input type="password" id="db-conn-password" class="form-input">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="window.databaseClientCloseConnectionModal()">Cancel</button>
                        <button class="btn btn-primary" onclick="window.databaseClientCreateConnection()">Connect</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderQueryInterface() {
        return `
            <div style="display: flex; flex-direction: column; height: 100%;">
                <div style="flex: 1; display: flex; flex-direction: column; min-height: 0;">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">SQL Query</label>
                        <textarea id="db-query-input" class="form-input" 
                                  style="width: 100%; height: 150px; font-family: 'Courier New', monospace; font-size: 14px; padding: 10px;" 
                                  placeholder="SELECT * FROM table_name LIMIT 100;">${this.escapeHTML(this.currentQuery)}</textarea>
                        <div style="margin-top: 10px; display: flex; gap: 10px;">
                            <button class="btn btn-primary" onclick="window.databaseClientExecuteQuery()">
                                <i class="fas fa-play"></i> Execute Query
                            </button>
                            <button class="btn btn-secondary" onclick="window.databaseClientListTables()">
                                <i class="fas fa-sync-alt"></i> Refresh Tables
                            </button>
                            <button class="btn btn-secondary" onclick="window.databaseClientClearQuery()">
                                <i class="fas fa-eraser"></i> Clear
                            </button>
                        </div>
                    </div>
                    ${this.queryResults ? this.renderQueryResults() : ''}
                </div>
            </div>
        `;
    }

    renderQueryResults() {
        if (!this.queryResults || !this.queryResults.rows) return '';
        return `
            <div style="flex: 1; overflow: auto; border: 1px solid #ddd; border-radius: 4px; background: #fff;">
                <div style="padding: 15px; border-bottom: 1px solid #ddd; background: #f8f9fa;">
                    <strong>Query Results</strong>
                    <span style="color: #666; margin-left: 10px;">${this.queryResults.count} row(s)</span>
                </div>
                <div style="overflow-x: auto;">
                    <table class="table" style="width: 100%; margin: 0;">
                        <thead style="background: #f8f9fa; position: sticky; top: 0;">
                            <tr>
                                ${this.queryResults.columns.map(col => `<th style="padding: 10px; border-bottom: 2px solid #ddd;">${this.escapeHTML(col)}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${this.queryResults.rows.map((row, idx) => `
                                <tr style="border-bottom: 1px solid #eee;" ${idx % 2 === 0 ? 'style="background: #fafafa;"' : ''}>
                                    ${this.queryResults.columns.map(col => 
                                        `<td style="padding: 10px; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${this.escapeHTML(String(row[col] || ''))}">${this.escapeHTML(String(row[col] || ''))}</td>`
                                    ).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    getDatabaseIcon(type) {
        const icons = {
            'mysql': 'database',
            'postgres': 'database',
            'postgresql': 'database',
            'mssql': 'server',
            'sqlserver': 'server'
        };
        return icons[type.toLowerCase()] || 'database';
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

    async mount() {
        window.databaseClientShowConnectionModal = () => {
            this._showConnectionModal = true;
            this.updateRender();
        };

        window.databaseClientCloseConnectionModal = () => {
            this._showConnectionModal = false;
            this.updateRender();
        };

        window.databaseClientUpdatePort = () => {
            const type = document.getElementById('db-conn-type')?.value;
            const portInput = document.getElementById('db-conn-port');
            if (portInput) {
                const defaultPorts = {
                    'mysql': 3306,
                    'postgres': 5432,
                    'mssql': 1433
                };
                portInput.placeholder = `Default: ${defaultPorts[type] || 'Auto'}`;
            }
        };

        window.databaseClientCreateConnection = async () => {
            const name = document.getElementById('db-conn-name')?.value || 'SQL Connection';
            const type = document.getElementById('db-conn-type')?.value || 'mysql';
            const host = document.getElementById('db-conn-host')?.value || 'localhost';
            const port = parseInt(document.getElementById('db-conn-port')?.value || '0');
            const database = document.getElementById('db-conn-database')?.value;
            const user = document.getElementById('db-conn-user')?.value;
            const password = document.getElementById('db-conn-password')?.value;

            if (!host || !database || !user || !password) {
                alert('Please fill all required fields');
                return;
            }

            try {
                const response = await api.post('/api/database/connect', {
                    type, host, port, database, user, password
                });
                if (!response.ok) throw new Error((await response.json()).message || 'Connection failed');
                const data = await response.json();
                const conn = { id: data.connId, name, type, host, port, database, user, connId: data.connId };
                this.connections.push(conn);
                this.activeConnectionId = conn.id;
                this._showConnectionModal = false;
                await this.loadTables();
                this.updateRender();
            } catch (error) {
                alert(`Connection failed: ${error.message}`);
            }
        };

        window.databaseClientSelectConnection = async (id) => {
            this.activeConnectionId = id;
            this.queryResults = null;
            this.currentQuery = '';
            await this.loadTables();
            this.updateRender();
        };

        window.databaseClientExecuteQuery = async () => {
            const conn = this.connections.find(c => c.id === this.activeConnectionId);
            const query = document.getElementById('db-query-input')?.value?.trim();
            if (!conn || !query) {
                alert('Please enter a SQL query');
                return;
            }

            this.currentQuery = query;
            try {
                const response = await api.post('/api/database/query', { connId: conn.connId, query });
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Query failed');
                }
                this.queryResults = await response.json();
                this.updateRender();
            } catch (error) {
                alert(`Query failed: ${error.message}`);
            }
        };

        window.databaseClientListTables = async () => {
            await this.loadTables();
            this.updateRender();
        };

        window.databaseClientSelectTable = (tableName) => {
            const input = document.getElementById('db-query-input');
            if (input) {
                input.value = `SELECT * FROM ${tableName} LIMIT 100;`;
                this.currentQuery = input.value;
            }
        };

        window.databaseClientClearQuery = () => {
            const input = document.getElementById('db-query-input');
            if (input) {
                input.value = '';
                this.currentQuery = '';
            }
            this.queryResults = null;
            this.updateRender();
        };
    }

    async loadTables() {
        const conn = this.connections.find(c => c.id === this.activeConnectionId);
        if (!conn) return;
        try {
            const response = await api.post('/api/database/tables', { connId: conn.connId });
            if (response.ok) {
                const data = await response.json();
                this.tables = data.tables || [];
            }
        } catch (error) {
            logger.error('Failed to load tables:', error);
            this.tables = [];
        }
    }

    async updateRender() {
        document.getElementById('page-content').innerHTML = await this.render();
    }
}
