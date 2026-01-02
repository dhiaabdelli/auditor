import { Sidebar } from '../components/Sidebar.js';

export class ActivityLogPage {
    constructor() {
        this.logs = [];
        this.sessions = [];
        this.sessionStats = null;
        this.stats = null;
        this.currentPage = 1;
        this.pageSize = 50;
        this.totalPages = 1;
        this.total = 0;
        this.view = 'logs'; // 'logs' or 'sessions' - determined by route
        this.refreshInterval = null; // Store interval ID to clear it
        this.abortController = null; // Abort controller for cancelling requests
        this.filters = {
            eventType: '',
            method: '',
            path: '',
            ipAddress: '',
            statusCode: '',
            search: '',
            startDate: '',
            endDate: ''
        };
        this.sessionFilters = {
            status: '',
            ipAddress: ''
        };
        this.selectedLog = null;
        this.showDetailsModal = false;
    }

    async render() {
        return `
            <div class="page-container-full">
                <div class="page-header">
                    <div class="page-header-content">
                        <div>
                            <h1 class="page-title">📋 Activity Log</h1>
                            <p class="page-subtitle">Monitor API calls, logins, and system events in real-time</p>
                        </div>
                        <div class="page-header-actions">
                            <button class="btn btn-secondary" onclick="activityLogInstance.refreshStats()" title="Refresh Statistics">
                                <i class="fas fa-sync-alt"></i> Refresh Stats
                            </button>
                            <button class="btn btn-danger" onclick="activityLogInstance.showDeleteModal()" title="Delete Logs">
                                <i class="fas fa-trash"></i> Delete Logs
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Statistics Cards -->
                <div class="api-audit-stats" id="api-audit-stats"></div>

                <!-- Filters -->
                <div class="api-audit-filters">
                    <div class="filter-row">
                        <div class="filter-group">
                            <label>Event Type</label>
                            <select id="filter-event-type" class="form-control" onchange="activityLogInstance.filters.eventType = this.value; activityLogInstance.loadLogs()">
                                <option value="">All Events</option>
                                <option value="API_CALL">API Calls</option>
                                <option value="LOGIN">Logins</option>
                                <option value="LOGIN_FAILED">Failed Logins</option>
                                <option value="LOGOUT">Logouts</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label>Method</label>
                            <select id="filter-method" class="form-control" onchange="activityLogInstance.filters.method = this.value; activityLogInstance.loadLogs()">
                                <option value="">All Methods</option>
                                <option value="GET">GET</option>
                                <option value="POST">POST</option>
                                <option value="PUT">PUT</option>
                                <option value="DELETE">DELETE</option>
                                <option value="PATCH">PATCH</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label>Status Code</label>
                            <input type="text" id="filter-status" class="form-control" placeholder="e.g., 200, 404" 
                                   onchange="activityLogInstance.filters.statusCode = this.value; activityLogInstance.loadLogs()">
                        </div>
                        <div class="filter-group">
                            <label>IP Address</label>
                            <input type="text" id="filter-ip" class="form-control" placeholder="Filter by IP" 
                                   onchange="activityLogInstance.filters.ipAddress = this.value; activityLogInstance.loadLogs()">
                        </div>
                        <div class="filter-group">
                            <label>Path</label>
                            <input type="text" id="filter-path" class="form-control" placeholder="Filter by path" 
                                   onchange="activityLogInstance.filters.path = this.value; activityLogInstance.loadLogs()">
                        </div>
                    </div>
                    <div class="filter-row">
                        <div class="filter-group" style="flex: 2;">
                            <label>Search</label>
                            <input type="text" id="filter-search" class="form-control" placeholder="Search in path, IP, request/response body..." 
                                   onchange="activityLogInstance.filters.search = this.value; activityLogInstance.loadLogs()">
                        </div>
                        <div class="filter-group">
                            <label>Start Date</label>
                            <input type="datetime-local" id="filter-start-date" class="form-control" 
                                   onchange="activityLogInstance.filters.startDate = this.value; activityLogInstance.loadLogs()">
                        </div>
                        <div class="filter-group">
                            <label>End Date</label>
                            <input type="datetime-local" id="filter-end-date" class="form-control" 
                                   onchange="activityLogInstance.filters.endDate = this.value; activityLogInstance.loadLogs()">
                        </div>
                        <div class="filter-group">
                            <label>&nbsp;</label>
                            <button class="btn btn-secondary" onclick="activityLogInstance.clearFilters()">
                                <i class="fas fa-times"></i> Clear
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Logs Table -->
                <div class="api-audit-logs-container" id="logs-container" style="display: ${this.view === 'logs' ? 'block' : 'none'};">
                    <table class="api-audit-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Time</th>
                                <th>Event Type</th>
                                <th>Method</th>
                                <th>Path</th>
                                <th>IP Address</th>
                                <th>Status</th>
                                <th>Response Time</th>
                                <th>Session ID</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="api-audit-logs-tbody">
                            <tr>
                                <td colspan="10" style="text-align: center; padding: 2rem;">
                                    <i class="fas fa-spinner fa-spin"></i> Loading logs...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Sessions Table -->
                <div class="api-audit-logs-container" id="sessions-container" style="display: ${this.view === 'sessions' ? 'block' : 'none'};">
                    <div class="api-audit-filters" style="margin-bottom: 1rem;">
                        <div class="filter-row">
                            <div class="filter-group">
                                <label>Status</label>
                                <select id="filter-session-status" class="form-control" onchange="activityLogInstance.sessionFilters.status = this.value; activityLogInstance.loadSessions()">
                                    <option value="">All Status</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                            <div class="filter-group">
                                <label>IP Address</label>
                                <input type="text" id="filter-session-ip" class="form-control" placeholder="Filter by IP" 
                                       onchange="activityLogInstance.sessionFilters.ipAddress = this.value; activityLogInstance.loadSessions()">
                            </div>
                        </div>
                    </div>
                    <table class="api-audit-table">
                        <thead>
                            <tr>
                                <th>Session ID</th>
                                <th>IP Address</th>
                                <th>User Agent</th>
                                <th>Login Time</th>
                                <th>Last Activity</th>
                                <th>Logout Time</th>
                                <th>Duration</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody id="sessions-tbody">
                            <tr>
                                <td colspan="8" style="text-align: center; padding: 2rem;">
                                    <i class="fas fa-spinner fa-spin"></i> Loading sessions...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Pagination -->
                <div class="api-audit-pagination" id="api-audit-pagination"></div>
                <div class="api-audit-pagination" id="sessions-pagination" style="display: none;"></div>
            </div>

            <!-- Details Modal -->
            <div class="modal" id="api-audit-details-modal" style="display: none;">
                <div class="modal-content" style="max-width: 90vw; max-height: 90vh; overflow-y: auto;">
                    <div class="modal-header">
                        <h2>API Call Details</h2>
                        <button class="modal-close" onclick="activityLogInstance.closeDetailsModal()">&times;</button>
                    </div>
                    <div class="modal-body" id="api-audit-details-content"></div>
                </div>
            </div>

            <!-- Delete Modal -->
            <div class="modal" id="api-audit-delete-modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Delete API Audit Logs</h2>
                        <button class="modal-close" onclick="activityLogInstance.closeDeleteModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Choose an option:</p>
                        <div style="margin: 1rem 0;">
                            <label>
                                <input type="radio" name="delete-option" value="all" checked> Delete all logs
                            </label>
                        </div>
                        <div style="margin: 1rem 0;">
                            <label>
                                <input type="radio" name="delete-option" value="older"> Delete logs older than
                                <input type="number" id="delete-days" min="1" value="30" style="width: 80px; margin-left: 0.5rem;"> days
                            </label>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="activityLogInstance.closeDeleteModal()">Cancel</button>
                        <button class="btn btn-danger" onclick="activityLogInstance.deleteLogs()">Delete</button>
                    </div>
                </div>
            </div>
        `;
    }

    async mount() {
        window.activityLogInstance = this;
        
        // Determine view from current page route
        const currentPage = window.appInstance?.currentPage || 'activity-log';
        const newView = currentPage === 'activity-log-sessions' ? 'sessions' : 'logs';
        
        // Clear existing refresh interval if view is changing
        if (this.view !== newView && this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        
        // Cancel any in-flight requests when switching views
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        
        this.view = newView;
        
        // Show/hide containers based on view
        const logsContainer = document.getElementById('logs-container');
        const sessionsContainer = document.getElementById('sessions-container');
        const logsPagination = document.getElementById('api-audit-pagination');
        const sessionsPagination = document.getElementById('sessions-pagination');
        
        if (this.view === 'logs') {
            if (logsContainer) logsContainer.style.display = 'block';
            if (sessionsContainer) sessionsContainer.style.display = 'none';
            if (logsPagination) logsPagination.style.display = 'flex';
            if (sessionsPagination) sessionsPagination.style.display = 'none';
            // Load stats first, then logs
            await this.loadStats();
            await this.loadLogs();
        } else {
            if (logsContainer) logsContainer.style.display = 'none';
            if (sessionsContainer) sessionsContainer.style.display = 'block';
            if (logsPagination) logsPagination.style.display = 'none';
            if (sessionsPagination) sessionsPagination.style.display = 'flex';
            // Load session stats first, then sessions
            await this.loadSessionStats();
            await this.loadSessions();
        }
        
        // Setup event listeners after view is set
        this.setupEventListeners();
    }

    refreshStats() {
        // Refresh stats based on current view
        if (this.view === 'logs') {
            this.loadStats();
            this.loadLogs();
        } else {
            this.loadSessionStats();
            this.loadSessions();
        }
    }

    setupEventListeners() {
        // Clear any existing interval
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        // Auto-refresh every 5 seconds - only refresh the current view
        this.refreshInterval = setInterval(() => {
            if (!this.showDetailsModal && document.getElementById('api-audit-stats')) {
                // Get current view from the page (in case it changed)
                const currentPage = window.appInstance?.currentPage || 'activity-log';
                const currentView = currentPage === 'activity-log-sessions' ? 'sessions' : 'logs';
                
                // Only refresh if we're still on the same view
                if (currentView === this.view) {
                    this.refreshStats();
                }
            }
        }, 5000);
    }

    async loadSessionStats() {
        // Only load if we're on the sessions view
        if (this.view !== 'sessions') return;
        
        // Cancel any in-flight requests
        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();
        
        try {
            const response = await fetch('/api/sessions/stats', {
                signal: this.abortController.signal
            });
            
            // Check if we're still on sessions view (might have switched during fetch)
            if (this.view !== 'sessions') return;
            
            if (!response.ok) throw new Error('Failed to load session stats');
            this.sessionStats = await response.json();
            
            // Only render if we're still on sessions view (prevent race conditions)
            if (this.view === 'sessions') {
                this.renderSessionStats();
            }
        } catch (error) {
            // Ignore abort errors (user switched tabs)
            if (error.name === 'AbortError') {
                return;
            }
            console.error('Error loading session stats:', error);
        }
    }

    renderSessionStats() {
        // Only render if we're on the sessions view
        if (this.view !== 'sessions') return;
        
        const container = document.getElementById('api-audit-stats');
        if (!container || !this.sessionStats) return;

        container.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon" style="background: #3b82f6;">
                    <i class="fas fa-users"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${this.sessionStats.totalSessions?.toLocaleString() || 0}</div>
                    <div class="stat-label">Total Sessions</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: #10b981;">
                    <i class="fas fa-user-check"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${this.sessionStats.activeSessions?.toLocaleString() || 0}</div>
                    <div class="stat-label">Active Sessions</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: #8b5cf6;">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${Math.round((this.sessionStats.avgDurationSeconds || 0) / 60)}m</div>
                    <div class="stat-label">Avg Duration</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: #f59e0b;">
                    <i class="fas fa-hourglass-half"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${this.sessionStats.last24h?.toLocaleString() || 0}</div>
                    <div class="stat-label">Last 24 Hours</div>
                </div>
            </div>
        `;
    }

    async loadSessions() {
        // Only load if we're on the sessions view
        if (this.view !== 'sessions') return;
        
        // Cancel any in-flight requests
        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();
        
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                pageSize: this.pageSize,
                ...Object.fromEntries(Object.entries(this.sessionFilters).filter(([_, v]) => v !== ''))
            });

            const response = await fetch(`/api/sessions?${params}`, {
                signal: this.abortController.signal
            });
            
            // Check if we're still on sessions view (might have switched during fetch)
            if (this.view !== 'sessions') return;
            
            if (!response.ok) throw new Error('Failed to load sessions');
            const data = await response.json();
            
            // Check again after async operation
            if (this.view !== 'sessions') return;
            
            this.sessions = data.sessions || [];
            this.total = data.total || 0;
            this.totalPages = data.totalPages || 1;
            
            this.renderSessions();
            this.renderSessionsPagination();
        } catch (error) {
            // Ignore abort errors (user switched tabs) - these are expected when switching views
            if (error.name === 'AbortError' || error.message?.includes('aborted')) {
                return;
            }
            
            // Only show error if we're still on sessions view
            if (this.view !== 'sessions') return;
            
            // Only log real errors (not aborted requests)
            console.error('Error loading sessions:', error);
            const tbody = document.getElementById('sessions-tbody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; padding: 2rem; color: #ef4444;">
                            <i class="fas fa-exclamation-triangle"></i> Error loading sessions: ${error.message}
                        </td>
                    </tr>
                `;
            }
        } finally {
            // Clear abort controller if request completed (not aborted)
            if (this.abortController && !this.abortController.signal.aborted) {
                this.abortController = null;
            }
        }
    }

    renderSessions() {
        const tbody = document.getElementById('sessions-tbody');
        if (!tbody) return;

        if (this.sessions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 2rem;">
                        No sessions found
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.sessions.map(session => {
            const statusColor = session.status === 'active' ? '#10b981' : '#6b7280';
            
            // Parse dates safely
            let loginDate;
            try {
                loginDate = new Date(session.loginAt);
                if (isNaN(loginDate.getTime())) {
                    loginDate = new Date();
                }
            } catch (e) {
                loginDate = new Date();
            }
            
            let lastActivityDate;
            try {
                lastActivityDate = new Date(session.lastActivity);
                if (isNaN(lastActivityDate.getTime())) {
                    lastActivityDate = new Date();
                }
            } catch (e) {
                lastActivityDate = new Date();
            }
            
            // Handle logout date - now it's a string or null
            let logoutDateStr = '-';
            let logoutDate = null;
            if (session.logoutAt) {
                let logoutTimeStr = null;
                if (typeof session.logoutAt === 'string') {
                    logoutTimeStr = session.logoutAt;
                } else if (session.logoutAt && typeof session.logoutAt === 'object') {
                    // Handle if it's still an object somehow
                    logoutTimeStr = session.logoutAt.Time || session.logoutAt.time || null;
                }
                
                if (logoutTimeStr) {
                    try {
                        logoutDate = new Date(logoutTimeStr);
                        if (!isNaN(logoutDate.getTime())) {
                            logoutDateStr = logoutDate.toLocaleString();
                        }
                    } catch (e) {
                        logoutDateStr = '-';
                    }
                }
            }
            
            // Calculate duration
            let duration = '-';
            if (session.status === 'active') {
                // For active sessions, calculate from login to now
                const now = Date.now();
                const loginTime = loginDate.getTime();
                if (!isNaN(loginTime)) {
                    const seconds = Math.floor((now - loginTime) / 1000);
                    duration = this.formatDuration(seconds);
                }
            } else if (session.durationSeconds !== null && session.durationSeconds !== undefined) {
                // For inactive sessions, use stored duration (now it's a number or null)
                let seconds = null;
                if (typeof session.durationSeconds === 'number') {
                    seconds = session.durationSeconds;
                } else if (typeof session.durationSeconds === 'string') {
                    seconds = parseInt(session.durationSeconds);
                } else if (session.durationSeconds && typeof session.durationSeconds === 'object') {
                    // Handle if it's still an object somehow
                    seconds = session.durationSeconds.Int64 || session.durationSeconds.int64 || null;
                    if (seconds === null) {
                        seconds = parseInt(session.durationSeconds);
                    }
                }
                
                if (seconds !== null && !isNaN(seconds) && seconds >= 0) {
                    duration = this.formatDuration(seconds);
                }
            } else if (logoutDate && !isNaN(logoutDate.getTime())) {
                // Fallback: calculate from login to logout
                const loginTime = loginDate.getTime();
                const logoutTime = logoutDate.getTime();
                if (!isNaN(loginTime) && !isNaN(logoutTime)) {
                    const seconds = Math.floor((logoutTime - loginTime) / 1000);
                    duration = this.formatDuration(seconds);
                }
            }
            
            return `
                <tr>
                    <td style="font-family: monospace; font-size: 0.75rem;">${this.escapeHtml(session.id)}</td>
                    <td>${this.escapeHtml(session.ipAddress || 'N/A')}</td>
                    <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${this.escapeHtml(session.userAgent || '')}">${this.escapeHtml(session.userAgent || 'N/A')}</td>
                    <td>${loginDate.toLocaleString()}</td>
                    <td>${lastActivityDate.toLocaleString()}</td>
                    <td>${logoutDateStr}</td>
                    <td>${duration}</td>
                    <td><span class="status-badge" style="background: ${statusColor}">${session.status}</span></td>
                </tr>
            `;
        }).join('');
    }

    getSessionIdString(sessionId) {
        if (!sessionId) return '-';
        if (typeof sessionId === 'string') {
            return this.escapeHtml(sessionId);
        }
        if (typeof sessionId === 'object') {
            // Handle sql.NullString format
            if (sessionId.String !== undefined) {
                return this.escapeHtml(sessionId.String);
            }
            if (sessionId.Valid && sessionId.String) {
                return this.escapeHtml(sessionId.String);
            }
        }
        return '-';
    }

    formatDuration(seconds) {
        if (!seconds || isNaN(seconds) || seconds < 0) return '-';
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
        }
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }

    renderSessionsPagination() {
        const container = document.getElementById('sessions-pagination');
        if (!container) return;

        if (this.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `
            <div class="pagination">
                <button class="btn btn-sm" ${this.currentPage === 1 ? 'disabled' : ''} 
                        onclick="activityLogInstance.currentPage = 1; activityLogInstance.loadSessions()">
                    <i class="fas fa-angle-double-left"></i>
                </button>
                <button class="btn btn-sm" ${this.currentPage === 1 ? 'disabled' : ''} 
                        onclick="activityLogInstance.currentPage--; activityLogInstance.loadSessions()">
                    <i class="fas fa-angle-left"></i>
                </button>
                <span style="margin: 0 1rem;">
                    Page ${this.currentPage} of ${this.totalPages} (${this.total} total)
                </span>
                <button class="btn btn-sm" ${this.currentPage === this.totalPages ? 'disabled' : ''} 
                        onclick="activityLogInstance.currentPage++; activityLogInstance.loadSessions()">
                    <i class="fas fa-angle-right"></i>
                </button>
                <button class="btn btn-sm" ${this.currentPage === this.totalPages ? 'disabled' : ''} 
                        onclick="activityLogInstance.currentPage = activityLogInstance.totalPages; activityLogInstance.loadSessions()">
                    <i class="fas fa-angle-double-right"></i>
                </button>
            </div>
        `;
    }

    async loadStats() {
        // Only load if we're on the logs view
        if (this.view !== 'logs') return;
        
        // Cancel any in-flight requests
        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();
        
        try {
            const response = await fetch('/api/audit/stats', {
                signal: this.abortController.signal
            });
            
            // Check if we're still on logs view (might have switched during fetch)
            if (this.view !== 'logs') return;
            
            if (!response.ok) throw new Error('Failed to load stats');
            this.stats = await response.json();
            
            // Only render if we're still on logs view (prevent race conditions)
            if (this.view === 'logs') {
                this.renderStats();
            }
        } catch (error) {
            // Ignore abort errors (user switched tabs)
            if (error.name === 'AbortError') {
                return;
            }
            console.error('Error loading stats:', error);
        }
    }

    renderStats() {
        // Only render if we're on the logs view
        if (this.view !== 'logs') return;
        
        const container = document.getElementById('api-audit-stats');
        if (!container || !this.stats) return;

        const statusColors = {
            '2': '#10b981',
            '3': '#3b82f6',
            '4': '#f59e0b',
            '5': '#ef4444'
        };

        container.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon" style="background: #3b82f6;">
                    <i class="fas fa-exchange-alt"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${this.stats.totalRequests?.toLocaleString() || 0}</div>
                    <div class="stat-label">Total Requests</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: #10b981;">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${Math.round(this.stats.avgResponseTime || 0)}ms</div>
                    <div class="stat-label">Avg Response Time</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: #8b5cf6;">
                    <i class="fas fa-hourglass-half"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${this.stats.last24h?.toLocaleString() || 0}</div>
                    <div class="stat-label">Last 24 Hours</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: #f59e0b;">
                    <i class="fas fa-chart-bar"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${Object.keys(this.stats.byMethod || {}).length}</div>
                    <div class="stat-label">HTTP Methods</div>
                </div>
            </div>
        `;
    }

    async loadLogs() {
        // Only load if we're on the logs view
        if (this.view !== 'logs') return;
        
        // Cancel any in-flight requests
        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();
        
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                pageSize: this.pageSize,
                ...Object.fromEntries(Object.entries(this.filters).filter(([_, v]) => v !== ''))
            });

            const response = await fetch(`/api/audit/logs?${params}`, {
                signal: this.abortController.signal
            });
            
            // Check if we're still on logs view (might have switched during fetch)
            if (this.view !== 'logs') return;
            
            if (!response.ok) {
                // Try to get error message from response
                let errorMessage = `Failed to load logs (${response.status})`;
                try {
                    // Clone response to read it without consuming the body
                    const responseClone = response.clone();
                    const text = await responseClone.text();
                    try {
                        const errorData = JSON.parse(text);
                        if (errorData.error || errorData.message) {
                            errorMessage = errorData.error || errorData.message;
                        } else if (text) {
                            errorMessage = text;
                        }
                    } catch (e) {
                        // If JSON parsing fails, use the text as error message
                        if (text) {
                            errorMessage = text;
                        }
                    }
                } catch (e) {
                    // If reading fails, use status text
                    errorMessage = `Failed to load logs: ${response.status} ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }
            
            let data;
            try {
                data = await response.json();
            } catch (e) {
                // If JSON parsing fails, try to get error from response
                const text = await response.text();
                throw new Error(`Invalid response format: ${text.substring(0, 100)}`);
            }
            
            // Check again after async operation
            if (this.view !== 'logs') return;
            
            this.logs = data.logs || [];
            this.total = data.total || 0;
            this.totalPages = data.totalPages || 1;
            
            this.renderLogs();
            this.renderPagination();
        } catch (error) {
            // Ignore abort errors (user switched tabs) - these are expected when switching views
            if (error.name === 'AbortError' || error.message?.includes('aborted')) {
                return;
            }
            
            // Only show error if we're still on logs view
            if (this.view !== 'logs') return;
            
            // Only log real errors (not aborted requests)
            console.error('Error loading logs:', error);
            const tbody = document.getElementById('api-audit-logs-tbody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="9" style="text-align: center; padding: 2rem; color: #ef4444;">
                            <i class="fas fa-exclamation-triangle"></i> Error loading logs: ${error.message}
                        </td>
                    </tr>
                `;
            }
        } finally {
            // Clear abort controller if request completed (not aborted)
            if (this.abortController && !this.abortController.signal.aborted) {
                this.abortController = null;
            }
        }
    }

    renderLogs() {
        const tbody = document.getElementById('api-audit-logs-tbody');
        if (!tbody) return;

        if (this.logs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 2rem;">
                        No logs found
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.logs.map(log => {
            const statusColor = this.getStatusColor(log.responseStatus);
            const date = new Date(log.createdAt);
            const eventTypeBadge = this.getEventTypeBadge(log.eventType || 'API_CALL');
            
            return `
                <tr onclick="activityLogInstance.showLogDetails(${log.id})" style="cursor: pointer;">
                    <td>${log.id}</td>
                    <td>${date.toLocaleString()}</td>
                    <td>${eventTypeBadge}</td>
                    <td>${log.method ? `<span class="method-badge method-${log.method.toLowerCase()}">${log.method}</span>` : '-'}</td>
                    <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${log.path || ''}">${this.escapeHtml(log.path || log.eventDescription || 'N/A')}</td>
                    <td>${this.escapeHtml(log.ipAddress || 'N/A')}</td>
                    <td><span class="status-badge" style="background: ${statusColor}">${log.responseStatus || 'N/A'}</span></td>
                    <td>${log.responseTimeMs !== null && log.responseTimeMs !== undefined ? log.responseTimeMs + 'ms' : '-'}</td>
                    <td style="font-family: monospace; font-size: 0.75rem;">${log.sessionId ? this.escapeHtml(log.sessionId) : '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); activityLogInstance.showLogDetails(${log.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    getStatusColor(status) {
        if (!status) return '#6b7280';
        if (status >= 200 && status < 300) return '#10b981';
        if (status >= 300 && status < 400) return '#3b82f6';
        if (status >= 400 && status < 500) return '#f59e0b';
        if (status >= 500) return '#ef4444';
        return '#6b7280';
    }

    getEventTypeBadge(eventType) {
        const badges = {
            'API_CALL': '<span class="event-badge event-api" style="background: #3b82f6; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">API Call</span>',
            'LOGIN': '<span class="event-badge event-login" style="background: #10b981; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">Login</span>',
            'LOGIN_FAILED': '<span class="event-badge event-login-failed" style="background: #ef4444; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">Login Failed</span>',
            'LOGOUT': '<span class="event-badge event-logout" style="background: #f59e0b; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">Logout</span>',
        };
        return badges[eventType] || `<span class="event-badge" style="background: #6b7280; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${eventType}</span>`;
    }

    renderPagination() {
        const container = document.getElementById('api-audit-pagination');
        if (!container) return;

        if (this.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `
            <div class="pagination">
                <button class="btn btn-sm" ${this.currentPage === 1 ? 'disabled' : ''} 
                        onclick="activityLogInstance.currentPage = 1; activityLogInstance.loadLogs()">
                    <i class="fas fa-angle-double-left"></i>
                </button>
                <button class="btn btn-sm" ${this.currentPage === 1 ? 'disabled' : ''} 
                        onclick="activityLogInstance.currentPage--; activityLogInstance.loadLogs()">
                    <i class="fas fa-angle-left"></i>
                </button>
                <span style="margin: 0 1rem;">
                    Page ${this.currentPage} of ${this.totalPages} (${this.total} total)
                </span>
                <button class="btn btn-sm" ${this.currentPage === this.totalPages ? 'disabled' : ''} 
                        onclick="activityLogInstance.currentPage++; activityLogInstance.loadLogs()">
                    <i class="fas fa-angle-right"></i>
                </button>
                <button class="btn btn-sm" ${this.currentPage === this.totalPages ? 'disabled' : ''} 
                        onclick="activityLogInstance.currentPage = activityLogInstance.totalPages; activityLogInstance.loadLogs()">
                    <i class="fas fa-angle-double-right"></i>
                </button>
            </div>
        `;
    }

    async showLogDetails(logId) {
        const log = this.logs.find(l => l.id === logId);
        if (!log) return;

        this.selectedLog = log;
        this.showDetailsModal = true;
        document.getElementById('api-audit-details-modal').style.display = 'flex';

        const content = document.getElementById('api-audit-details-content');
        content.innerHTML = `
            <div class="log-details-section">
                <h3>Event Information</h3>
                <table class="details-table">
                    <tr><td><strong>Event Type:</strong></td><td>${this.getEventTypeBadge(log.eventType || 'API_CALL')}</td></tr>
                    ${log.method ? `<tr><td><strong>Method:</strong></td><td><span class="method-badge method-${log.method.toLowerCase()}">${log.method}</span></td></tr>` : ''}
                    ${log.path ? `<tr><td><strong>Path:</strong></td><td>${this.escapeHtml(log.path)}</td></tr>` : ''}
                    ${log.eventDescription ? `<tr><td><strong>Description:</strong></td><td>${this.escapeHtml(log.eventDescription)}</td></tr>` : ''}
                    <tr><td><strong>IP Address:</strong></td><td>${this.escapeHtml(log.ipAddress || 'N/A')}</td></tr>
                    <tr><td><strong>User Agent:</strong></td><td>${this.escapeHtml(log.userAgent || 'N/A')}</td></tr>
                    <tr><td><strong>Timestamp:</strong></td><td>${new Date(log.createdAt).toLocaleString()}</td></tr>
                </table>
            </div>

            <div class="log-details-section">
                <h3>Request Headers</h3>
                <pre class="code-block">${JSON.stringify(log.requestHeaders || {}, null, 2)}</pre>
            </div>

            <div class="log-details-section">
                <h3>Request Body</h3>
                <pre class="code-block">${this.formatBody(log.requestBody)}</pre>
            </div>

            <div class="log-details-section">
                <h3>Response Information</h3>
                <table class="details-table">
                    <tr><td><strong>Status:</strong></td><td><span class="status-badge" style="background: ${this.getStatusColor(log.responseStatus)}">${log.responseStatus}</span></td></tr>
                    <tr><td><strong>Response Time:</strong></td><td>${log.responseTimeMs}ms</td></tr>
                </table>
            </div>

            <div class="log-details-section">
                <h3>Response Body</h3>
                <pre class="code-block">${this.formatBody(log.responseBody)}</pre>
            </div>
        `;
    }

    formatBody(body) {
        if (!body) return '(empty)';
        try {
            const parsed = JSON.parse(body);
            return JSON.stringify(parsed, null, 2);
        } catch {
            return this.escapeHtml(body);
        }
    }

    closeDetailsModal() {
        this.showDetailsModal = false;
        document.getElementById('api-audit-details-modal').style.display = 'none';
    }

    showDeleteModal() {
        document.getElementById('api-audit-delete-modal').style.display = 'flex';
    }

    closeDeleteModal() {
        document.getElementById('api-audit-delete-modal').style.display = 'none';
    }

    async deleteLogs() {
        const option = document.querySelector('input[name="delete-option"]:checked').value;
        let url = '/api/audit/logs';
        
        if (option === 'older') {
            const days = document.getElementById('delete-days').value;
            url += `?olderThan=${days}`;
        }

        try {
            const response = await fetch(url, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete logs');
            const data = await response.json();
            alert(`Successfully deleted ${data.rowsDeleted} log(s)`);
            this.closeDeleteModal();
            this.loadLogs();
            if (this.view === 'logs') {
                this.loadStats();
            }
        } catch (error) {
            alert('Error deleting logs: ' + error.message);
        }
    }

    clearFilters() {
        this.filters = {
            eventType: '',
            method: '',
            path: '',
            ipAddress: '',
            statusCode: '',
            search: '',
            startDate: '',
            endDate: ''
        };
        document.getElementById('filter-event-type').value = '';
        document.getElementById('filter-method').value = '';
        document.getElementById('filter-status').value = '';
        document.getElementById('filter-ip').value = '';
        document.getElementById('filter-path').value = '';
        document.getElementById('filter-search').value = '';
        document.getElementById('filter-start-date').value = '';
        document.getElementById('filter-end-date').value = '';
        this.currentPage = 1;
        this.loadLogs();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    cleanup() {
        // Cleanup if needed
    }
}

