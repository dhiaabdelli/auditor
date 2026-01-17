export class Footer {
    constructor() {
        this.activeTab = 'console'; // console, tasks, connections
        this.isExpanded = false;
        this.consoleMessages = [];
        this.tasks = []; // Simple todo tasks
        this.backgroundTasks = []; // Background tasks with progress
        this.workflows = []; // Running workflows
        this.connections = [];
        this.consoleWS = null;
        this.workflowWS = null; // WebSocket for workflow updates
        this.isConnected = false;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;
        this.currentPrompt = '> ';
        this.isResizing = false;
        this.startY = 0;
        this.startHeight = 300;
        this.currentHeight = 300;

        // Bind methods for event listeners
        this.boundResize = this.resize.bind(this);
        this.boundStopResize = this.stopResize.bind(this);

        // Connect to workflow WebSocket
        this.connectWorkflowWebSocket();
    }

    render() {
        // Only show active tab when footer is expanded
        const showActive = this.isExpanded;

        return `
            <footer class="app-footer" style="height: auto">
                <div class="footer-resize-handle" onmousedown="footerInstance.startResize(event)"></div>
                <div class="footer-tabs">
                    <button class="footer-tab ${showActive && this.activeTab === 'console' ? 'active' : ''}" data-tab="console" onclick="footerInstance.setActiveTab('console')">
                        <i class="fas fa-terminal"></i>
                        <span>Console</span>
                    </button>
                    <button class="footer-tab ${showActive && this.activeTab === 'tasks' ? 'active' : ''}" data-tab="tasks" onclick="footerInstance.setActiveTab('tasks')">
                        <i class="fas fa-tasks"></i>
                        <span>Tasks</span>
                        ${(this.tasks.length + this.workflows.length + this.backgroundTasks.length) > 0 ? `<span class="footer-badge">${this.tasks.length + this.workflows.length + this.backgroundTasks.length}</span>` : ''}
                    </button>
                    <button class="footer-tab ${showActive && this.activeTab === 'connections' ? 'active' : ''}" data-tab="connections" onclick="footerInstance.setActiveTab('connections')">
                        <i class="fas fa-plug"></i>
                        <span>Connections</span>
                        ${this.connections.length > 0 ? `<span class="footer-badge">${this.connections.length}</span>` : ''}
                    </button>
                    <button class="footer-toggle" onclick="footerInstance.toggleExpand()">
                        <i class="fas fa-chevron-${this.isExpanded ? 'down' : 'up'}"></i>
                    </button>
                </div>
                
                <div class="footer-panel ${this.isExpanded ? 'expanded' : ''}" style="height: ${this.isExpanded ? this.currentHeight + 'px' : '0'}; max-height: none;">
                    ${this.renderConsole()}
                    ${this.renderTasks()}
                    ${this.renderConnections()}
                </div>
            </footer>
        `;
    }

    renderConsole() {
        if (this.activeTab !== 'console') return '';

        return `
            <div class="footer-console">
                <div class="console-header">
                    <h4><i class="fas fa-terminal"></i> Console</h4>
                    <div class="console-actions">
                        <button class="console-btn" onclick="footerInstance.clearConsole()" title="Clear console">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="console-messages" id="console-messages">
                    ${this.consoleMessages.length === 0 ? `
                        <div class="console-empty">
                            <i class="fas fa-comment-dots"></i>
                            <p>No messages yet. Console messages will appear here.</p>
                        </div>
                    ` : this.consoleMessages.map(msg => `
                        <div class="console-message ${msg.type || 'info'}">
                            <span class="console-content">${this.colorizeConsoleOutput(msg.content, msg.type)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="console-input-container">
                    <span class="console-prompt">${this.currentPrompt}</span>
                    <input 
                        type="text" 
                        class="console-input" 
                        id="console-input"
                        placeholder="Type a terminal command..."
                        onkeydown="footerInstance.handleConsoleInput(event)"
                    />
                    <button class="console-send-btn" onclick="footerInstance.sendConsoleMessage()" title="Send command">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                    <div class="console-status ${this.isConnected ? 'connected' : 'disconnected'}" title="${this.isConnected ? 'Connected' : 'Disconnected'}">
                        <span class="status-dot"></span>
                    </div>
                </div>
            </div>
        `;
    }

    renderTasks() {
        if (this.activeTab !== 'tasks') return '';

        return `
            <div class="footer-tasks">
                <div class="tasks-header">
                    <h4><i class="fas fa-tasks"></i> Tasks</h4>
                    <button class="tasks-add-btn" onclick="footerInstance.addTask()" title="Add new task">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <div class="tasks-list" id="tasks-list">
                    ${this.backgroundTasks.length > 0 ? `
                        <div class="background-tasks-section">
                            ${this.backgroundTasks.map((task, index) => `
                                <div class="background-task-item ${task.status === 'completed' ? 'completed' : task.status === 'failed' ? 'error' : task.status === 'cancelled' ? 'cancelled' : 'running'}" data-task-id="${task.id}">
                                    <div class="background-task-icon">
                                        <i class="fas fa-${task.status === 'completed' ? 'check-circle' : task.status === 'failed' ? 'exclamation-circle' : task.status === 'cancelled' ? 'ban' : 'spinner fa-spin'}"></i>
                                    </div>
                                    <div class="background-task-info">
                                        <div class="background-task-name">${this.escapeHtml(task.name)}</div>
                                        <div class="background-task-details">
                                            <div class="background-task-progress">
                                                <div class="background-task-progress-bar">
                                                    <div class="background-task-progress-fill" style="width: ${task.progress || 0}%"></div>
                                                </div>
                                                <span class="background-task-progress-text">${task.progress || 0}%</span>
                                            </div>
                                            <div class="background-task-message">${this.escapeHtml(task.message || '')}</div>
                                        </div>
                                    </div>
                                    ${task.status === 'running' || task.status === 'pending' ? `
                                        <button class="background-task-cancel" onclick="footerInstance.cancelBackgroundTask('${task.id}')" title="Cancel task">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    ${this.workflows.length > 0 ? `
                        <div class="workflows-section">
                            <div class="workflows-header">
                                <h5><i class="fas fa-project-diagram"></i> Running Workflows</h5>
                            </div>
                            ${this.workflows.map((workflow, index) => `
                                <div class="workflow-item ${workflow.status === 'success' ? 'completed' : workflow.status === 'error' ? 'error' : 'running'}" data-execution-id="${workflow.executionId}">
                                    <div class="workflow-icon">
                                        <i class="fas fa-${workflow.status === 'success' ? 'check-circle' : workflow.status === 'error' ? 'exclamation-circle' : 'spinner fa-spin'}"></i>
                                    </div>
                                    <div class="workflow-info">
                                        <div class="workflow-name">${this.escapeHtml(workflow.workflowName)}</div>
                                        <div class="workflow-details">
                                            <span class="workflow-trigger">${this.escapeHtml(workflow.triggerType)}</span>
                                            ${workflow.progress !== undefined ? `
                                                <div class="workflow-progress">
                                                    <div class="workflow-progress-bar">
                                                        <div class="workflow-progress-fill" style="width: ${workflow.progress}%"></div>
                                                    </div>
                                                    <span class="workflow-progress-text">${workflow.progress}%</span>
                                                </div>
                                            ` : ''}
                                            <div class="workflow-message">${this.escapeHtml(workflow.message || '')}</div>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    ${this.tasks.length > 0 || this.workflows.length > 0 || this.backgroundTasks.length > 0 ? '' : `
                        <div class="tasks-empty">
                            <i class="fas fa-clipboard-list"></i>
                            <p>No tasks yet. Click the + button to add a new task.</p>
                        </div>
                    `}
                    ${this.tasks.length > 0 ? `
                        <div class="tasks-section">
                            <div class="tasks-header-section">
                                <h5><i class="fas fa-check-square"></i> Personal Tasks</h5>
                            </div>
                            ${this.tasks.map((task, index) => `
                                <div class="task-item ${task.completed ? 'completed' : ''}" data-index="${index}">
                                    <input 
                                        type="checkbox" 
                                        class="task-checkbox" 
                                        ${task.completed ? 'checked' : ''}
                                        onchange="footerInstance.toggleTask(${index})"
                                    />
                                    <span class="task-text">${this.escapeHtml(task.text)}</span>
                                    <button class="task-delete" onclick="footerInstance.deleteTask(${index})" title="Delete task">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    renderConnections() {
        if (this.activeTab !== 'connections') return '';

        return `
            <div class="footer-connections">
                <div class="connections-header">
                    <h4><i class="fas fa-plug"></i> Active Connections</h4>
                    <button class="connections-refresh-btn" onclick="footerInstance.refreshConnections()" title="Refresh connections">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>
                <div class="connections-list" id="connections-list">
                    ${this.connections.length === 0 ? `
                        <div class="connections-empty">
                            <i class="fas fa-network-wired"></i>
                            <p>No active connections. Connections will appear here when established.</p>
                        </div>
                    ` : this.connections.map((conn, index) => `
                        <div class="connection-item" data-index="${index}">
                            <div class="connection-icon">
                                <i class="fas fa-${conn.type === 'ssh' ? 'terminal' : conn.type === 'ftp' ? 'folder-open' : 'plug'}"></i>
                            </div>
                            <div class="connection-info">
                                <span class="connection-name">${this.escapeHtml(conn.name)}</span>
                                <span class="connection-details">${this.escapeHtml(conn.details)}</span>
                            </div>
                            <div class="connection-status ${conn.status}">
                                <span class="status-dot"></span>
                                <span>${conn.status}</span>
                            </div>
                            <button class="connection-disconnect" onclick="footerInstance.disconnect(${index})" title="Disconnect">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    setActiveTab(tab) {
        const wasConsole = this.activeTab === 'console';
        const wasExpanded = this.isExpanded;
        const wasSameTab = this.activeTab === tab;

        // Always expand footer when clicking a tab (if not already expanded)
        if (!this.isExpanded) {
            this.isExpanded = true;
        }

        // Switch to the clicked tab
        this.activeTab = tab;

        // Connect to Console when switching to console tab
        if (tab === 'console' && !wasConsole) {
            this.connectConsole();
        }
        // Disconnect when switching away from console tab
        else if (wasConsole && tab !== 'console') {
            if (this.consoleWS) {
                this.consoleWS.close();
                this.consoleWS = null;
                this.isConnected = false;
            }
        }

        // Update body padding if expansion state changed
        if (this.isExpanded !== wasExpanded) {
            if (this.isExpanded) {
                const footerHeight = this.currentHeight + 50; // approx tabs + padding
                document.body.style.paddingBottom = (footerHeight + 50) + 'px';
            } else {
                document.body.style.paddingBottom = '50px';
            }
        }

        this.update();
    }

    toggleExpand() {
        this.isExpanded = !this.isExpanded;

        // When collapsing, disconnect Console if console was active
        if (!this.isExpanded && this.activeTab === 'console') {
            if (this.consoleWS) {
                this.consoleWS.close();
                this.consoleWS = null;
                this.isConnected = false;
            }
        }

        this.update();
        // Adjust body padding when footer expands/collapses
        if (this.isExpanded) {
            const footerHeight = this.currentHeight + 50; // approx tabs + padding
            document.body.style.paddingBottom = (footerHeight + 50) + 'px';

            // Reconnect Console if console tab is active
            if (this.activeTab === 'console') {
                this.connectConsole();
            }
        } else {
            document.body.style.paddingBottom = '50px';
        }
    }

    colorizeConsoleOutput(text, type) {
        if (!text) return '';

        let html = this.escapeHtml(text);
        const replacements = [];
        const pushReplacement = (str) => {
            replacements.push(str);
            return `__R${replacements.length - 1}__`;
        };

        // Colorize based on type first
        if (type === 'command') {
            // Command prompts - green color
            html = html.replace(/^(PS[^>]*>)/, (match) => {
                return pushReplacement(`<span style="color: #34d399; font-weight: 600;">${match}</span>`);
            });
            // Colorize cmdlets in commands
            html = html.replace(/([A-Z][a-z]+-[A-Z][a-zA-Z]+)/g, (match) => {
                return pushReplacement(`<span style="color: #34d399; font-weight: 500;">${match}</span>`);
            });
            // Colorize parameters
            html = html.replace(/(-[a-zA-Z]+)/g, (match) => {
                return pushReplacement(`<span style="color: #60a5fa;">${match}</span>`);
            });
            // Colorize variables
            html = html.replace(/(\$[a-zA-Z_][a-zA-Z0-9_]*)/g, (match) => {
                return pushReplacement(`<span style="color: #fbbf24;">${match}</span>`);
            });
        } else if (type === 'error') {
            // Error messages - highlight error keywords
            html = html.replace(/(Error|Exception|Failed|Cannot|Access denied|Permission denied|at line|At line)/gi, (match) => {
                return pushReplacement(`<span style="color: #f87171; font-weight: 600;">${match}</span>`);
            });
            // Highlight error codes
            html = html.replace(/(0x[0-9A-Fa-f]+|\d{4,})/g, (match) => {
                return pushReplacement(`<span style="color: #fca5a5;">${match}</span>`);
            });
        } else if (type === 'output' || type === 'info' || type === 'success') {
            // 1. Match paths (high priority)
            html = html.replace(/([A-Z]:\\[^\s<>]+|\\\\[^\s<>]+)/gi, (match) => {
                return pushReplacement(`<span style="color: #fbbf24;">${match}</span>`);
            });

            // 2. Match URLs
            html = html.replace(/(https?:\/\/[^\s<>]+)/gi, (match) => {
                return pushReplacement(`<span style="color: #60a5fa;">${match}</span>`);
            });

            // 3. Match quoted strings
            html = html.replace(/(["'])((?:(?=(\\?))\3.)*?)\1/g, (match) => {
                return pushReplacement(`<span style="color: #34d399;">${match}</span>`);
            });

            // 4. Match PowerShell cmdlets
            html = html.replace(/([A-Z][a-z]+-[A-Z][a-zA-Z]+)/g, (match) => {
                return pushReplacement(`<span style="color: #34d399; font-weight: 500;">${match}</span>`);
            });

            // 5. Match PowerShell variables
            html = html.replace(/(\$[a-zA-Z_][a-zA-Z0-9_]*)/g, (match) => {
                return pushReplacement(`<span style="color: #fbbf24;">${match}</span>`);
            });

            // 6. Match Status
            html = html.replace(/\b(Success|OK|Completed|Running|Stopped|Enabled|Disabled)\b/gi, (match) => {
                return pushReplacement(`<span style="color: #10b981; font-weight: 500;">${match}</span>`);
            });

            // 7. Match Numbers (excluding those in hex colors if any remain)
            html = html.replace(/(?<!#)\b(\d+\.?\d*)\b/g, (match) => {
                return pushReplacement(`<span style="color: #60a5fa;">${match}</span>`);
            });

            // 8. Match Booleans
            html = html.replace(/\b(True|False|$true|$false)\b/gi, (match) => {
                return pushReplacement(`<span style="color: #a78bfa;">${match}</span>`);
            });

            // 9. Match Operators
            html = html.replace(/(\|\s*|&&|\|\||-eq|-ne|-lt|-gt|-le|-ge|-like|-notlike|-match|-notmatch|-contains|-notcontains|-and|-or|-not)/g, (match) => {
                return pushReplacement(`<span style="color: #f59e0b;">${match}</span>`);
            });
        } else if (type === 'warning') {
            // Warning messages
            html = html.replace(/(Warning|WARN|Caution)/gi, (match) => {
                return pushReplacement(`<span style="color: #fbbf24; font-weight: 600;">${match}</span>`);
            });
        }

        // Restore replacements
        replacements.forEach((val, idx) => {
            html = html.replace(`__R${idx}__`, val);
        });

        return html;
    }

    addConsoleMessage(content, type = 'info') {
        this.consoleMessages.push({
            content,
            type,
            time: new Date().toLocaleTimeString()
        });
        // Keep only last 100 messages
        if (this.consoleMessages.length > 100) {
            this.consoleMessages.shift();
        }

        // Update DOM directly if possible to avoid full re-render
        const messagesContainer = document.getElementById('console-messages');
        if (messagesContainer) {
            const msg = this.consoleMessages[this.consoleMessages.length - 1];
            const msgDiv = document.createElement('div');
            msgDiv.className = `console-message ${msg.type || 'info'}`;

            // Colorize the content
            const colorizedContent = this.colorizeConsoleOutput(msg.content, msg.type);

            msgDiv.innerHTML = `
                <span class="console-content">${colorizedContent}</span>
            `;
            messagesContainer.appendChild(msgDiv);

            // Auto-scroll to bottom
            setTimeout(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 10);
        } else {
            // Fallback to full update if container not found
            this.update();
        }
    }

    clearConsole() {
        this.consoleMessages = [];
        this.update();
    }

    handleConsoleInput(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.sendConsoleMessage();
        }
    }

    sendConsoleMessage() {
        const input = document.getElementById('console-input');
        if (!input) return;

        const message = input.value.trim();
        if (!message) return;

        // Clear input
        input.value = '';

        // Send command to Console WebSocket
        if (this.consoleWS && this.isConnected) {
            this.consoleWS.send(JSON.stringify({
                type: 'command',
                command: message
            }));
        } else {
            this.addConsoleMessage('Not connected to Console. Attempting to reconnect...', 'warning');
            this.connectConsole();
            // Try again after a short delay
            setTimeout(() => {
                if (this.consoleWS && this.isConnected) {
                    this.consoleWS.send(JSON.stringify({
                        type: 'command',
                        command: message
                    }));
                } else {
                    this.addConsoleMessage('Failed to connect. Please try again.', 'error');
                }
            }, 1000);
        }
    }

    addTask(text) {
        const taskText = prompt('Enter task description:');
        if (taskText && taskText.trim()) {
            this.tasks.push({
                text: taskText.trim(),
                completed: false,
                createdAt: new Date().toISOString()
            });
            this.update();
        }
    }

    toggleTask(index) {
        if (this.tasks[index]) {
            this.tasks[index].completed = !this.tasks[index].completed;
            this.update();
        }
    }

    deleteTask(index) {
        if (confirm('Delete this task?')) {
            this.tasks.splice(index, 1);
            this.update();
        }
    }

    refreshConnections() {
        // TODO: Fetch from backend when implemented
        this.update();
    }

    disconnect(index) {
        if (this.connections[index]) {
            const conn = this.connections[index];
            if (confirm(`Disconnect from ${conn.name}?`)) {
                // TODO: Send disconnect request to backend
                this.connections.splice(index, 1);
                this.update();
            }
        }
    }

    update() {
        const footer = document.querySelector('.app-footer');
        if (footer) {
            footer.innerHTML = this.render();
            this.mount();
        }
    }

    startResize(e) {
        if (!this.isExpanded) return;
        this.isResizing = true;
        this.startY = e.clientY;
        const panel = document.querySelector('.footer-panel');
        this.startHeight = panel ? panel.offsetHeight : 300;

        document.addEventListener('mousemove', this.boundResize);
        document.addEventListener('mouseup', this.boundStopResize);
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none'; // Prevent selection while dragging
    }

    resize(e) {
        if (!this.isResizing) return;

        const deltaY = this.startY - e.clientY;
        let newHeight = this.startHeight + deltaY;

        // Limits
        if (newHeight < 100) newHeight = 100;
        if (newHeight > window.innerHeight - 100) newHeight = window.innerHeight - 100;

        this.currentHeight = newHeight;

        const footer = document.querySelector('.app-footer');
        const panel = document.querySelector('.footer-panel');
        const consoleEl = document.querySelector('.footer-console');
        const tasksEl = document.querySelector('.footer-tasks');
        const connectionsEl = document.querySelector('.footer-connections');

        if (footer) footer.style.height = 'auto'; // Let footer grow automatically
        if (panel) panel.style.height = newHeight + 'px';
        if (consoleEl) consoleEl.style.height = '100%';
        if (tasksEl) tasksEl.style.height = '100%';
        if (connectionsEl) connectionsEl.style.height = '100%';

        // Adjust body padding
        // Calculate actual footer height or estimate
        const footerHeight = newHeight + 50; // approx tabs + padding
        document.body.style.paddingBottom = (footerHeight + 50) + 'px';
    }

    stopResize() {
        this.isResizing = false;
        document.removeEventListener('mousemove', this.boundResize);
        document.removeEventListener('mouseup', this.boundStopResize);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';

        // Re-scroll console to bottom
        if (this.activeTab === 'console') {
            const messagesContainer = document.getElementById('console-messages');
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }
    }

    mount() {
        // Connect to Console WebSocket if console tab is active
        if (this.activeTab === 'console') {
            this.connectConsole();
        }

        // Focus console input if console tab is active
        if (this.activeTab === 'console' && this.isExpanded) {
            const input = document.getElementById('console-input');
            if (input) {
                // Don't auto-focus, let user click
            }
        }
    }

    connectConsole() {
        // Prevent multiple simultaneous connection attempts or reconnecting if already connected
        if (this.isConnecting || (this.consoleWS && (this.consoleWS.readyState === WebSocket.CONNECTING || this.consoleWS.readyState === WebSocket.OPEN))) {
            return;
        }

        // Close existing connection if any (only if not OPEN/CONNECTING)
        if (this.consoleWS) {
            this.consoleWS.close();
            this.consoleWS = null;
        }

        // Get authentication token
        const token = localStorage.getItem('jwt_token') || localStorage.getItem('api_key');
        if (!token) {
            this.addConsoleMessage('Error: No authentication token found', 'error');
            return;
        }

        // Determine WebSocket URL
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/powershell`;

        this.isConnecting = true;
        this.isConnected = false;

        try {
            this.consoleWS = new WebSocket(wsUrl);

            this.consoleWS.onopen = () => {
                this.isConnecting = false;
                this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
                // Send authentication message
                this.consoleWS.send(JSON.stringify({
                    type: 'auth',
                    token: token
                }));
            };

            this.consoleWS.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    this.handleConsoleMessage(msg);
                } catch (err) {
                    console.error('Error parsing Console message:', err);
                }
            };

            this.consoleWS.onerror = (error) => {
                this.isConnecting = false;
                console.error('Console WebSocket error:', error);
                const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/powershell`;
                console.error('WebSocket URL:', wsUrl);
                console.error('WebSocket readyState:', this.consoleWS?.readyState);
                // Only show error message once, not on every error event
                if (!this.isConnected) {
                    this.addConsoleMessage(`WebSocket connection error. Check if server is running.`, 'error');
                }
                this.isConnected = false;
            };

            this.consoleWS.onclose = (event) => {
                this.isConnecting = false;
                const wasConnected = this.isConnected;
                this.isConnected = false;

                if (this.activeTab === 'console') {
                    // Only show message if we were actually connected
                    if (wasConnected) {
                        const reason = event.code === 1006 ? 'Connection closed abnormally' : 'Connection closed';
                        this.addConsoleMessage(`Console connection closed: ${reason} (code: ${event.code})`, 'warning');
                    }

                    // Attempt to reconnect only if:
                    // 1. It wasn't a normal close (code 1000)
                    // 2. We haven't exceeded max reconnect attempts
                    // 3. We're still on console tab
                    // 4. We're not already connecting
                    if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts && !this.isConnecting) {
                        this.reconnectAttempts++;
                        const delay = this.reconnectDelay * this.reconnectAttempts; // Exponential backoff
                        setTimeout(() => {
                            if (this.activeTab === 'console' && !this.isConnected && !this.isConnecting) {
                                this.connectConsole();
                            }
                        }, delay);
                    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                        this.addConsoleMessage('Max reconnection attempts reached. Please refresh the page.', 'error');
                    }
                }
            };
        } catch (err) {
            this.isConnecting = false;
            console.error('Error creating Console WebSocket:', err);
            this.addConsoleMessage(`Error connecting to Console: ${err.message}`, 'error');
        }
    }

    connectWorkflowWebSocket() {
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/ws/workflows`;

            this.workflowWS = new WebSocket(wsUrl);

            this.workflowWS.onopen = () => {
                console.log('Workflow WebSocket connected');
            };

            this.workflowWS.onmessage = (event) => {
                try {
                    let messageData = event.data;

                    // Try to parse as single JSON object first
                    try {
                        const data = JSON.parse(messageData);
                        this.handleWorkflowMessage(data);
                        return;
                    } catch (e) {
                        // If single parse fails, try to extract first valid JSON object
                        // Find the first complete JSON object by counting braces
                        let braceCount = 0;
                        let startIndex = -1;
                        let endIndex = -1;

                        for (let i = 0; i < messageData.length; i++) {
                            if (messageData[i] === '{') {
                                if (startIndex === -1) {
                                    startIndex = i;
                                }
                                braceCount++;
                            } else if (messageData[i] === '}') {
                                braceCount--;
                                if (braceCount === 0 && startIndex !== -1) {
                                    endIndex = i;
                                    break;
                                }
                            }
                        }

                        if (startIndex !== -1 && endIndex !== -1) {
                            try {
                                const jsonStr = messageData.substring(startIndex, endIndex + 1);
                                const data = JSON.parse(jsonStr);
                                this.handleWorkflowMessage(data);
                                return;
                            } catch (parseErr) {
                                // Failed to parse extracted JSON
                            }
                        }

                        // If no valid JSON found, log and skip silently
                        // Don't spam console with warnings for malformed messages
                    }
                } catch (err) {
                    // Silent error handling - don't log to avoid console spam
                }
            };

            this.workflowWS.onerror = (error) => {
                console.error('Workflow WebSocket error:', error);
            };

            this.workflowWS.onclose = () => {
                console.log('Workflow WebSocket closed, reconnecting...');
                // Reconnect after delay
                setTimeout(() => {
                    if (this.workflowWS?.readyState === WebSocket.CLOSED) {
                        this.connectWorkflowWebSocket();
                    }
                }, 3000);
            };
        } catch (err) {
            console.error('Error creating workflow WebSocket:', err);
        }
    }

    handleWorkflowMessage(msg) {
        switch (msg.type) {
            case 'workflow_update':
                this.updateWorkflow(msg);
                break;
            case 'workflow_removed':
                this.removeWorkflow(msg.executionId);
                break;
            case 'task_update':
                this.updateBackgroundTask(msg);
                break;
        }
    }

    updateWorkflow(workflowData) {
        const index = this.workflows.findIndex(w => w.executionId === workflowData.executionId);

        const workflow = {
            executionId: workflowData.executionId,
            workflowId: workflowData.workflowId,
            workflowName: workflowData.workflowName || 'Unknown Workflow',
            triggerType: workflowData.triggerType || 'unknown',
            status: workflowData.status || 'running',
            progress: workflowData.progress || 0,
            message: workflowData.message || '',
            startedAt: workflowData.startedAt,
            finishedAt: workflowData.finishedAt
        };

        if (index >= 0) {
            this.workflows[index] = workflow;
        } else {
            this.workflows.push(workflow);
        }

        // Remove if finished (after a delay)
        if (workflow.status === 'success' || workflow.status === 'error') {
            setTimeout(() => {
                this.removeWorkflow(workflow.executionId);
            }, 5000); // Remove after 5 seconds
        }

        this.update();
    }

    removeWorkflow(executionId) {
        this.workflows = this.workflows.filter(w => w.executionId !== executionId);
        this.update();
    }

    updateBackgroundTask(taskData) {
        const index = this.backgroundTasks.findIndex(t => t.id === taskData.taskId);

        const task = {
            id: taskData.taskId,
            name: taskData.name || 'Unknown Task',
            description: taskData.description || '',
            status: taskData.status || 'pending',
            progress: taskData.progress || 0,
            message: taskData.message || '',
            createdAt: taskData.createdAt,
            startedAt: taskData.startedAt,
            finishedAt: taskData.finishedAt,
            error: taskData.error || '',
            metadata: taskData.metadata || {},
            removeTimeout: null // Store timeout ID to prevent duplicates
        };

        // Check if task already exists and get its current state
        const existingTask = index >= 0 ? this.backgroundTasks[index] : null;
        const wasCompleted = existingTask && existingTask.status === 'completed';
        const isNowCompleted = task.status === 'completed';

        // Clear existing timeout if task already exists
        if (existingTask && existingTask.removeTimeout) {
            clearTimeout(existingTask.removeTimeout);
        }

        // Remove if finished (after a delay)
        // Speedtest tasks are removed immediately when completed
        const isSpeedtestTask = (task.metadata && task.metadata.type === 'speedtest') ||
            (task.name && task.name.toLowerCase() === 'speedtest');

        // Debug: Log task info
        if (task.status === 'completed') {
            console.log('Task completed:', {
                id: task.id,
                name: task.name,
                metadata: task.metadata,
                isSpeedtestTask: isSpeedtestTask,
                wasCompleted: wasCompleted,
                isNowCompleted: isNowCompleted
            });
        }

        // Only set timeout if task just became completed (not if it was already completed)
        const justBecameCompleted = isNowCompleted && !wasCompleted;
        const justBecameFailed = task.status === 'failed' && existingTask && existingTask.status !== 'failed';
        const justBecameCancelled = task.status === 'cancelled' && existingTask && existingTask.status !== 'cancelled';

        // Always set timeout for completed tasks, but only once
        if (task.status === 'completed' && justBecameCompleted) {
            if (isSpeedtestTask) {
                // Remove speedtest tasks immediately when completed
                console.log('Setting timeout to remove speedtest task:', task.id, task.name);
                task.removeTimeout = setTimeout(() => {
                    console.log('Removing speedtest task now:', task.id);
                    this.removeBackgroundTask(task.id);
                }, 2000); // Remove after 2 seconds
            } else {
                // Other tasks removed after 5 seconds
                task.removeTimeout = setTimeout(() => {
                    this.removeBackgroundTask(task.id);
                }, 5000);
            }
        } else if ((task.status === 'failed' || task.status === 'cancelled') &&
            (justBecameFailed || justBecameCancelled)) {
            // Failed or cancelled tasks removed after 5 seconds
            task.removeTimeout = setTimeout(() => {
                this.removeBackgroundTask(task.id);
            }, 5000);
        }

        if (index >= 0) {
            this.backgroundTasks[index] = task;
        } else {
            this.backgroundTasks.push(task);
        }

        this.update();
    }

    removeBackgroundTask(taskId) {
        console.log('removeBackgroundTask called for:', taskId);
        const beforeCount = this.backgroundTasks.length;
        this.backgroundTasks = this.backgroundTasks.filter(t => {
            if (t.id === taskId) {
                console.log('Removing task:', t.id, t.name, t.status);
                return false;
            }
            return true;
        });
        const afterCount = this.backgroundTasks.length;
        console.log(`Tasks: ${beforeCount} -> ${afterCount} (removed ${beforeCount - afterCount})`);
        this.update();
    }

    async cancelBackgroundTask(taskId) {
        try {
            // secure fetch will automatically add authentication
            const response = await fetch('/api/tasks/cancel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ taskId })
            });

            if (!response.ok) {
                throw new Error('Failed to cancel task');
            }
        } catch (error) {
            console.error('Error cancelling task:', error);
        }
    }

    handleConsoleMessage(msg) {
        switch (msg.type) {
            case 'auth':
                if (msg.status === 'success') {
                    this.isConnected = true;
                    this.reconnectAttempts = 0; // Reset on successful auth
                    // Don't add message here - welcome message will come from server
                } else {
                    this.isConnected = false;
                    this.addConsoleMessage(`Authentication failed: ${msg.message || 'Unknown error'}`, 'error');
                }
                break;
            case 'command':
                // Command prompt - colorize as command
                const commandContent = msg.content || '';
                if (commandContent.trim()) {
                    this.addConsoleMessage(commandContent, 'command');
                }
                break;
            case 'output':
                const content = msg.content || '';
                if (content.trim()) {
                    this.addConsoleMessage(content, 'output');
                }
                break;
            case 'error':
                const errorContent = msg.content || '';
                if (errorContent.trim()) {
                    this.addConsoleMessage(errorContent, 'error');
                }
                break;
            case 'prompt':
                this.currentPrompt = msg.content || '> ';
                // Update prompt in UI if console is visible
                const promptEl = document.querySelector('.console-prompt');
                if (promptEl) {
                    promptEl.textContent = this.currentPrompt;
                }
                break;
            case 'pong':
                // Ping response, do nothing
                break;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global instance
window.footerInstance = null;
