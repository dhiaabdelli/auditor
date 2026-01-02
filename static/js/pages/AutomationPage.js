import { api } from '../utils/api.js';
import { Sidebar } from '../components/Sidebar.js';

export class AutomationPage {
    constructor() {
        this.workflows = [];
        this.currentWorkflowId = null;
        this.nodes = [];
        this.connections = [];
        this.selectedNode = null;
        this.dragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.canvasOffset = { x: 0, y: 0 };
        this.isPanning = false;
        this.lastPanPoint = { x: 0, y: 0 };
        this.zoom = 1;
        this.connecting = false;
        this.connectionStart = null;
        this.tempConnectionEnd = null;
        this.nodeIdCounter = 0;
        this.workflowIdCounter = 0;
        this.viewMode = 'list'; // 'list' or 'workflow'
        this.workflowTab = 'canvas'; // 'canvas', 'executions', 'webhooks', 'schedulers'
        this.isEditing = false; // Edit mode flag
        this.executions = []; // Execution history
        this.executionStats = null; // Execution statistics
        this.webhooks = [];
        this.schedulers = [];
        this.showSchedulerModal = false;
        this.editingScheduler = null;
        this.showWebhookModal = false;
        this.editingWebhook = null;
        this.showConditionModal = false;
        this.editingConditionNode = null;
        this.showEmailModal = false;
        this.editingEmailNode = null;
        this.showExecuteCommandModal = false;
        this.editingExecuteCommandNode = null;
        
        // Bind methods for event listeners
        this.boundOnNodeDrag = this.onNodeDrag.bind(this);
        this.boundOnNodeDragEnd = this.onNodeDragEnd.bind(this);
        this.boundOnConnectionMove = this.onConnectionMove.bind(this);
        this.boundOnConnectionEnd = this.onConnectionEnd.bind(this);
        
        // Zoom save timeout
        this.zoomSaveTimeout = null;
        
        // Don't load workflows here - mount() will handle it
        this.sidebarOpen = false;
    }

    getSidebarContent() {
        return `
            <div class="automation-sidebar-content">
                <div class="sidebar-section">
                    <h3><i class="fas fa-puzzle-piece"></i> Triggers</h3>
                    <div class="node-type-list">
                        <div class="node-type-item" draggable="true" data-type="webhook" data-category="trigger">
                            <i class="fas fa-link"></i>
                            <span>Webhook</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="schedule" data-category="trigger">
                            <i class="fas fa-clock"></i>
                            <span>Schedule</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="manual" data-category="trigger">
                            <i class="fas fa-hand-pointer"></i>
                            <span>Manual Trigger</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="file-watch" data-category="trigger">
                            <i class="fas fa-file-alt"></i>
                            <span>File Watcher</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="email-trigger" data-category="trigger">
                            <i class="fas fa-inbox"></i>
                            <span>Email Trigger</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="mqtt-trigger" data-category="trigger">
                            <i class="fas fa-broadcast-tower"></i>
                            <span>MQTT Trigger</span>
                        </div>
                    </div>
                </div>

                <div class="sidebar-section">
                    <h3><i class="fas fa-globe"></i> HTTP & API</h3>
                    <div class="node-type-list">
                        <div class="node-type-item" draggable="true" data-type="http" data-category="action">
                            <i class="fas fa-globe"></i>
                            <span>HTTP Request</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="rest-api" data-category="action">
                            <i class="fas fa-cloud"></i>
                            <span>REST API</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="graphql" data-category="action">
                            <i class="fas fa-project-diagram"></i>
                            <span>GraphQL</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="soap" data-category="action">
                            <i class="fas fa-exchange-alt"></i>
                            <span>SOAP Request</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="webhook-response" data-category="action">
                            <i class="fas fa-reply"></i>
                            <span>Webhook Response</span>
                        </div>
                    </div>
                </div>

                <div class="sidebar-section">
                    <h3><i class="fas fa-database"></i> Database</h3>
                    <div class="node-type-list">
                        <div class="node-type-item" draggable="true" data-type="database" data-category="action">
                            <i class="fas fa-database"></i>
                            <span>Database Query</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="mysql" data-category="action">
                            <i class="fas fa-database"></i>
                            <span>MySQL</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="postgresql" data-category="action">
                            <i class="fas fa-database"></i>
                            <span>PostgreSQL</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="mongodb" data-category="action">
                            <i class="fas fa-database"></i>
                            <span>MongoDB</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="sqlite" data-category="action">
                            <i class="fas fa-database"></i>
                            <span>SQLite</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="redis" data-category="action">
                            <i class="fas fa-database"></i>
                            <span>Redis</span>
                        </div>
                    </div>
                </div>

                <div class="sidebar-section">
                    <h3><i class="fas fa-file"></i> File Operations</h3>
                    <div class="node-type-list">
                        <div class="node-type-item" draggable="true" data-type="read-file" data-category="action">
                            <i class="fas fa-file-alt"></i>
                            <span>Read File</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="write-file" data-category="action">
                            <i class="fas fa-file-export"></i>
                            <span>Write File</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="delete-file" data-category="action">
                            <i class="fas fa-trash"></i>
                            <span>Delete File</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="list-files" data-category="action">
                            <i class="fas fa-list"></i>
                            <span>List Files</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="move-file" data-category="action">
                            <i class="fas fa-arrows-alt"></i>
                            <span>Move File</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="copy-file" data-category="action">
                            <i class="fas fa-copy"></i>
                            <span>Copy File</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="compress" data-category="action">
                            <i class="fas fa-file-archive"></i>
                            <span>Compress</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="extract" data-category="action">
                            <i class="fas fa-file-archive"></i>
                            <span>Extract</span>
                        </div>
                    </div>
                </div>

                <div class="sidebar-section">
                    <h3><i class="fas fa-envelope"></i> Email & Messaging</h3>
                    <div class="node-type-list">
                        <div class="node-type-item" draggable="true" data-type="email" data-category="action">
                            <i class="fas fa-envelope"></i>
                            <span>Send Email</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="smtp" data-category="action">
                            <i class="fas fa-server"></i>
                            <span>SMTP</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="slack" data-category="action">
                            <i class="fab fa-slack"></i>
                            <span>Slack</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="teams" data-category="action">
                            <i class="fab fa-microsoft"></i>
                            <span>Microsoft Teams</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="discord" data-category="action">
                            <i class="fab fa-discord"></i>
                            <span>Discord</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="telegram" data-category="action">
                            <i class="fab fa-telegram"></i>
                            <span>Telegram</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="sms" data-category="action">
                            <i class="fas fa-sms"></i>
                            <span>SMS</span>
                        </div>
                    </div>
                </div>

                <div class="sidebar-section">
                    <h3><i class="fas fa-code-branch"></i> Logic & Control</h3>
                    <div class="node-type-list">
                        <div class="node-type-item" draggable="true" data-type="condition" data-category="action">
                            <i class="fas fa-code-branch"></i>
                            <span>Condition</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="merge" data-category="action">
                            <i class="fas fa-code-branch"></i>
                            <span>Merge</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="wait" data-category="action">
                            <i class="fas fa-hourglass-half"></i>
                            <span>Wait</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="stop" data-category="action">
                            <i class="fas fa-stop"></i>
                            <span>Stop</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="loop" data-category="action">
                            <i class="fas fa-redo"></i>
                            <span>Loop</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="error-handler" data-category="action">
                            <i class="fas fa-exclamation-triangle"></i>
                            <span>Error Handler</span>
                        </div>
                    </div>
                </div>

                <div class="sidebar-section">
                    <h3><i class="fas fa-exchange-alt"></i> Transform & Data</h3>
                    <div class="node-type-list">
                        <div class="node-type-item" draggable="true" data-type="transform" data-category="action">
                            <i class="fas fa-exchange-alt"></i>
                            <span>Transform Data</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="set" data-category="action">
                            <i class="fas fa-edit"></i>
                            <span>Set</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="json" data-category="action">
                            <i class="fas fa-code"></i>
                            <span>JSON</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="xml" data-category="action">
                            <i class="fas fa-code"></i>
                            <span>XML</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="csv" data-category="action">
                            <i class="fas fa-table"></i>
                            <span>CSV</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="html" data-category="action">
                            <i class="fas fa-code"></i>
                            <span>HTML</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="aggregate" data-category="action">
                            <i class="fas fa-layer-group"></i>
                            <span>Aggregate</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="filter" data-category="action">
                            <i class="fas fa-filter"></i>
                            <span>Filter</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="sort" data-category="action">
                            <i class="fas fa-sort"></i>
                            <span>Sort</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="split" data-category="action">
                            <i class="fas fa-cut"></i>
                            <span>Split</span>
                        </div>
                    </div>
                </div>

                <div class="sidebar-section">
                    <h3><i class="fas fa-code"></i> Code & Scripts</h3>
                    <div class="node-type-list">
                        <div class="node-type-item" draggable="true" data-type="script" data-category="action">
                            <i class="fas fa-code"></i>
                            <span>Code</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="function" data-category="action">
                            <i class="fas fa-function"></i>
                            <span>Function</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="python" data-category="action">
                            <i class="fab fa-python"></i>
                            <span>Python</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="javascript" data-category="action">
                            <i class="fab fa-js"></i>
                            <span>JavaScript</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="powershell" data-category="action">
                            <i class="fas fa-terminal"></i>
                            <span>PowerShell</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="bash" data-category="action">
                            <i class="fas fa-terminal"></i>
                            <span>Bash</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="execute-command" data-category="action">
                            <i class="fas fa-server"></i>
                            <span>Execute Command</span>
                        </div>
                    </div>
                </div>

                <div class="sidebar-section">
                    <h3><i class="fas fa-cloud"></i> Cloud & Services</h3>
                    <div class="node-type-list">
                        <div class="node-type-item" draggable="true" data-type="aws" data-category="action">
                            <i class="fab fa-aws"></i>
                            <span>AWS</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="azure" data-category="action">
                            <i class="fab fa-microsoft"></i>
                            <span>Azure</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="gcp" data-category="action">
                            <i class="fab fa-google"></i>
                            <span>Google Cloud</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="s3" data-category="action">
                            <i class="fas fa-cloud"></i>
                            <span>S3 Storage</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="docker" data-category="action">
                            <i class="fab fa-docker"></i>
                            <span>Docker</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="kubernetes" data-category="action">
                            <i class="fas fa-cube"></i>
                            <span>Kubernetes</span>
                        </div>
                    </div>
                </div>

                <div class="sidebar-section">
                    <h3><i class="fas fa-tools"></i> Utilities</h3>
                    <div class="node-type-list">
                        <div class="node-type-item" draggable="true" data-type="log" data-category="action">
                            <i class="fas fa-file-alt"></i>
                            <span>Log</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="notify" data-category="action">
                            <i class="fas fa-bell"></i>
                            <span>Notify</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="template" data-category="action">
                            <i class="fas fa-file-code"></i>
                            <span>Template</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="hash" data-category="action">
                            <i class="fas fa-key"></i>
                            <span>Hash</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="encrypt" data-category="action">
                            <i class="fas fa-lock"></i>
                            <span>Encrypt</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="decrypt" data-category="action">
                            <i class="fas fa-unlock"></i>
                            <span>Decrypt</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="uuid" data-category="action">
                            <i class="fas fa-fingerprint"></i>
                            <span>Generate UUID</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="random" data-category="action">
                            <i class="fas fa-dice"></i>
                            <span>Random</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="date-time" data-category="action">
                            <i class="fas fa-calendar-alt"></i>
                            <span>Date/Time</span>
                        </div>
                        <div class="node-type-item" draggable="true" data-type="regex" data-category="action">
                            <i class="fas fa-search"></i>
                            <span>Regex</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    toggleComponentsSidebar() {
        if (this.sidebarOpen) {
            if (window.sidebarInstance) {
                window.sidebarInstance.close();
            }
            // Restore overlay
            const overlay = document.getElementById('sidebar-overlay');
            if (overlay) {
                overlay.classList.remove('hide-overlay');
            }
            this.sidebarOpen = false;
        } else {
            // Hide overlay for components sidebar
            const overlay = document.getElementById('sidebar-overlay');
            if (overlay) {
                overlay.classList.add('hide-overlay');
            }
            if (window.sidebarInstance) {
                window.sidebarInstance.open({
                    title: 'Components',
                    icon: 'fa-puzzle-piece',
                    content: this.getSidebarContent(),
                    onClose: () => {
                        this.sidebarOpen = false;
                        // Restore overlay
                        if (overlay) {
                            overlay.classList.remove('hide-overlay');
                        }
                        // Re-initialize drag and drop after sidebar closes
                        setTimeout(() => this.initializeDragAndDrop(), 100);
                    }
                });
            }
            this.sidebarOpen = true;
            // Initialize drag and drop after sidebar opens
            setTimeout(() => this.initializeDragAndDrop(), 100);
        }
    }

    render() {
        if (this.viewMode === 'list') {
            return this.renderListView();
        } else {
            return this.renderWorkflowView();
        }
    }

    renderListView() {
        return `
            <div class="automation-page">
                <div class="automation-header">
                    <div class="automation-header-left">
                        <h1><i class="fas fa-project-diagram"></i> Automation Workflows</h1>
                        <p class="automation-subtitle">Manage your automated workflows</p>
                    </div>
                    <div class="automation-header-actions">
                        <button class="btn btn-primary" onclick="automationInstance.createNewWorkflow()">
                            <i class="fas fa-plus"></i> New Workflow
                        </button>
                    </div>
                </div>

                <div class="workflows-container">
                    <div class="workflows-grid" id="workflows-grid">
                        ${this.renderWorkflowsGrid()}
                    </div>
                </div>
            </div>
        `;
    }

    renderWorkflowView() {
        const workflow = this.getCurrentWorkflow();
        return `
            <div class="automation-page">
                <div class="automation-header">
                    <div class="automation-header-left">
                        <button class="btn-back" onclick="automationInstance.backToList()" title="Back to workflows">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                        <div>
                            <h1>${workflow?.name || 'Untitled Workflow'}</h1>
                            <p class="automation-subtitle">
                                ${this.isEditing ? 'Editing workflow' : 'Viewing workflow'}${this.executionStats ? ` • ${this.executionStats.totalExecutions || 0} runs` : ''}${this.executionStats?.webhookExecutions ? ` • ${this.executionStats.webhookExecutions} webhook triggers` : ''}
                            </p>
                        </div>
                    </div>
                    <div class="automation-header-actions">
                        ${!this.isEditing ? `
                        <button class="btn-workflow btn-workflow-secondary" onclick="automationInstance.runWorkflow()">
                            <i class="fas fa-play"></i>
                            <span>Run</span>
                        </button>
                        <button class="btn-workflow btn-workflow-primary" onclick="automationInstance.toggleEditMode()">
                            <i class="fas fa-edit"></i>
                            <span>Edit</span>
                        </button>
                        ` : `
                        <button class="btn-workflow btn-workflow-secondary" onclick="automationInstance.toggleEditMode()">
                            <i class="fas fa-eye"></i>
                            <span>View</span>
                        </button>
                        <button class="btn-workflow btn-workflow-success" onclick="automationInstance.saveCurrentWorkflow()">
                            <i class="fas fa-save"></i>
                            <span>Save</span>
                        </button>
                        <button class="btn-workflow btn-workflow-secondary" onclick="automationInstance.toggleComponentsSidebar()">
                            <i class="fas fa-puzzle-piece"></i>
                            <span>Components</span>
                        </button>
                        <button class="btn-workflow btn-workflow-secondary" onclick="automationInstance.clearCanvas()">
                            <i class="fas fa-eraser"></i>
                            <span>Clear</span>
                        </button>
                        `}
                        <button class="btn-workflow btn-workflow-danger" onclick="automationInstance.deleteWorkflow('${this.currentWorkflowId || ''}')">
                            <i class="fas fa-trash"></i>
                            <span>Delete</span>
                        </button>
                    </div>
                </div>

                <div class="workflow-tabs-header">
                    <button class="workflow-tab ${this.workflowTab === 'canvas' ? 'active' : ''}" onclick="automationInstance.switchTab('canvas')">
                        <i class="fas fa-project-diagram"></i> Canvas
                    </button>
                    <button class="workflow-tab ${this.workflowTab === 'executions' ? 'active' : ''}" onclick="automationInstance.switchTab('executions')">
                        <i class="fas fa-history"></i> Executions
                    </button>
                </div>

                <div class="automation-container ${this.isEditing ? 'edit-mode' : 'view-mode'}">
                    ${this.workflowTab === 'canvas' ? `
                    <div class="automation-canvas-container">
                        <div class="canvas-toolbar">
                            <button class="canvas-tool-btn" onclick="automationInstance.zoomIn()" title="Zoom In">
                                <i class="fas fa-search-plus"></i>
                            </button>
                            <button class="canvas-tool-btn" onclick="automationInstance.zoomOut()" title="Zoom Out">
                                <i class="fas fa-search-minus"></i>
                            </button>
                            <button class="canvas-tool-btn" onclick="automationInstance.fitToScreen()" title="Fit to Screen">
                                <i class="fas fa-compress"></i>
                            </button>
                            <div class="canvas-zoom-indicator" id="zoom-indicator">
                                ${Math.round(this.zoom * 100)}%
                            </div>
                        </div>
                        <div class="automation-canvas" id="automation-canvas">
                            <svg class="connections-layer" id="connections-layer">
                                <g id="connections-group"></g>
                            </svg>
                            <div class="nodes-layer" id="nodes-layer"></div>
                            <div class="canvas-grid"></div>
                        </div>
                    </div>
                    ` : ''}
                    ${this.workflowTab === 'executions' ? this.renderExecutionsTab() : ''}
                </div>
                ${this.showSchedulerModal ? this.renderSchedulerModal() : ''}
                ${this.showWebhookModal ? this.renderWebhookModal() : ''}
                ${this.showConditionModal ? this.renderConditionModal() : ''}
                ${this.showEmailModal ? this.renderEmailModal() : ''}
                ${this.showExecuteCommandModal ? this.renderExecuteCommandModal() : ''}
            </div>
        `;
    }

    getPredecessorNodes(targetNodeId) {
        // Find all nodes that come before the target node in the execution chain
        const predecessorSet = new Set();
        const visited = new Set();
        
        // Helper function to recursively find all predecessors
        const findPredecessors = (nodeId) => {
            if (visited.has(nodeId)) return;
            visited.add(nodeId);
            
            // Find all connections that target this node
            const incomingConnections = this.connections.filter(
                conn => conn.targetNodeId === nodeId
            );
            
            // For each incoming connection, add the source node and recurse
            incomingConnections.forEach(conn => {
                if (conn.sourceNodeId && conn.sourceNodeId !== targetNodeId) {
                    predecessorSet.add(conn.sourceNodeId);
                    findPredecessors(conn.sourceNodeId);
                }
            });
        };
        
        // Start from the target node and traverse backwards
        findPredecessors(targetNodeId);
        
        // Also include all trigger nodes (webhook, schedule, manual) as they are always available
        this.nodes.forEach(n => {
            if ((n.type === 'webhook' || n.type === 'schedule' || n.type === 'manual') && n.id !== targetNodeId) {
                predecessorSet.add(n.id);
            }
        });
        
        return Array.from(predecessorSet);
    }

    renderConditionModal() {
        console.log('[RENDER] Rendering condition modal');
        const node = this.editingConditionNode;
        const data = node?.data || {};

        // Parse existing values to extract node ID and field path
        const parseNodeReference = (value) => {
            if (!value) return { nodeId: '', fieldPath: '' };
            // Check if it's a variable reference like {{nodes.node-id.field}} or {{node-id.field}}
            const match = value.match(/\{\{(?:nodes\.)?([a-f0-9-]+)\.?(.*?)\}\}/);
            if (match) {
                return { nodeId: match[1], fieldPath: match[2] || '' };
            }
            // Check if it's a direct node reference without nodes. prefix
            const directMatch = value.match(/\{\{([a-f0-9-]+)\.?(.*?)\}\}/);
            if (directMatch) {
                return { nodeId: directMatch[1], fieldPath: directMatch[2] || '' };
            }
            // If it's not a variable, return as-is (for static values)
            return { nodeId: '', fieldPath: '', staticValue: value };
        };

        const value1Parsed = parseNodeReference(data.value1 || '');
        const value2Parsed = parseNodeReference(data.value2 || '');

        // Get only nodes that come before this condition node in the execution chain
        const predecessorNodeIds = node ? this.getPredecessorNodes(node.id) : [];
        const availableNodes = this.nodes
            .filter(n => n.id !== node?.id && predecessorNodeIds.includes(n.id))
            .map(n => {
                const nodeConfig = this.getNodeConfig(n.type);
                return {
                    id: n.id,
                    title: nodeConfig ? nodeConfig.title : n.type,
                    type: n.type,
                    shortId: n.id.substring(0, 8) + '...'
                };
            });

        return `
            <div class="modal-overlay" onclick="automationInstance.showConditionModal = false; automationInstance.updateView()">
                <div class="modal scheduler-modal" onclick="event.stopPropagation()" style="max-width: 900px;">
                    <div class="modal-header">
                        <h2><i class="fas fa-code-branch"></i> Configure Condition</h2>
                        <button class="modal-close" onclick="automationInstance.showConditionModal = false; automationInstance.updateView()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                            <div>
                                <div class="form-group">
                                    <label>Value 1 <span style="color: #dc3545;">*</span></label>
                                    <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                                        <select id="condition-value1-node" class="form-control" style="flex: 1;" onchange="automationInstance.updateConditionValue(1)">
                                            <option value="">-- Select Node --</option>
                                            ${availableNodes.map(n => `
                                                <option value="${n.id}" ${value1Parsed.nodeId === n.id ? 'selected' : ''}>
                                                    ${n.title} (${n.shortId})
                                                </option>
                                            `).join('')}
                                        </select>
                                    </div>
                                    <input type="text" id="condition-value1-field" class="form-control" 
                                           value="${value1Parsed.fieldPath || ''}" 
                                           placeholder="Field path (e.g., body.status, output, result)"
                                           style="${value1Parsed.nodeId ? 'display: block;' : 'display: none;'}"
                                           onchange="automationInstance.updateConditionValue(1)">
                                    <input type="text" id="condition-value1-static" class="form-control" 
                                           value="${value1Parsed.staticValue || ''}" 
                                           placeholder="Or enter static value (e.g., 100, 'success')"
                                           style="${value1Parsed.nodeId ? 'display: none;' : 'display: block;'}"
                                           onchange="automationInstance.updateConditionValue(1)">
                                    <small class="form-text text-muted">
                                        Select a node and specify the field path, or enter a static value
                                    </small>
                                </div>

                                <div class="form-group">
                                    <label>Operator</label>
                                    <select id="condition-operator" class="form-control">
                                        <option value="==" ${data.operator === '==' ? 'selected' : ''}>Equals (==)</option>
                                        <option value="!=" ${data.operator === '!=' ? 'selected' : ''}>Not Equals (!=)</option>
                                        <option value=">" ${data.operator === '>' ? 'selected' : ''}>Greater Than (>)</option>
                                        <option value=">=" ${data.operator === '>=' ? 'selected' : ''}>Greater Than or Equal (>=)</option>
                                        <option value="<" ${data.operator === '<' ? 'selected' : ''}>Less Than (<)</option>
                                        <option value="<=" ${data.operator === '<=' ? 'selected' : ''}>Less Than or Equal (<=)</option>
                                        <option value="contains" ${data.operator === 'contains' ? 'selected' : ''}>Contains</option>
                                        <option value="startsWith" ${data.operator === 'startsWith' ? 'selected' : ''}>Starts With</option>
                                        <option value="endsWith" ${data.operator === 'endsWith' ? 'selected' : ''}>Ends With</option>
                                    </select>
                                </div>

                                <div class="form-group">
                                    <label>Value 2 <span style="color: #dc3545;">*</span></label>
                                    <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                                        <select id="condition-value2-node" class="form-control" style="flex: 1;" onchange="automationInstance.updateConditionValue(2)">
                                            <option value="">-- Select Node --</option>
                                            ${availableNodes.map(n => `
                                                <option value="${n.id}" ${value2Parsed.nodeId === n.id ? 'selected' : ''}>
                                                    ${n.title} (${n.shortId})
                                                </option>
                                            `).join('')}
                                        </select>
                                    </div>
                                    <input type="text" id="condition-value2-field" class="form-control" 
                                           value="${value2Parsed.fieldPath || ''}" 
                                           placeholder="Field path (e.g., body.status, output, result)"
                                           style="${value2Parsed.nodeId ? 'display: block;' : 'display: none;'}"
                                           onchange="automationInstance.updateConditionValue(2)">
                                    <input type="text" id="condition-value2-static" class="form-control" 
                                           value="${value2Parsed.staticValue || ''}" 
                                           placeholder="Or enter static value (e.g., 100, 'success')"
                                           style="${value2Parsed.nodeId ? 'display: none;' : 'display: block;'}"
                                           onchange="automationInstance.updateConditionValue(2)">
                                    <small class="form-text text-muted">
                                        Select a node and specify the field path, or enter a static value
                                    </small>
                                </div>
                            </div>

                            <div>
                                <div class="form-group">
                                    <label>
                                        <i class="fas fa-info-circle"></i> How to Use Node References
                                    </label>
                                    <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 1rem;">
                                        <div style="font-size: 0.875rem; color: #495057; margin-bottom: 1rem;">
                                            <strong>Condition nodes must reference data from other nodes using node IDs.</strong>
                                        </div>
                                        <div style="font-size: 0.875rem; margin-bottom: 0.75rem; padding: 0.75rem; background: #e7f3ff; border-radius: 4px; border-left: 4px solid #3b82f6;">
                                            <strong>Note:</strong> Only nodes in the same execution chain that come before this condition node are shown. This ensures data is available when the condition executes.
                                        </div>
                                        <div style="font-size: 0.875rem; margin-bottom: 0.75rem;">
                                            <strong>1. Select a Node:</strong> Choose a node from the same chain (before this condition)
                                        </div>
                                        <div style="font-size: 0.875rem; margin-bottom: 0.75rem;">
                                            <strong>2. Specify Field Path:</strong> Enter the field you want to access
                                        </div>
                                        <div style="font-size: 0.875rem; margin-bottom: 0.75rem;">
                                            <strong>Examples:</strong>
                                            <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
                                                <li><code>body.status</code> - Access status from body</li>
                                                <li><code>output</code> - Access node output</li>
                                                <li><code>result</code> - Access condition result</li>
                                                <li><code>input.body.test</code> - Access nested field</li>
                                            </ul>
                                        </div>
                                        <div style="font-size: 0.875rem; margin-bottom: 0.75rem; padding: 0.75rem; background: #fff3cd; border-radius: 4px; border-left: 4px solid #ffc107;">
                                            <strong>Note:</strong> You can also enter a static value (number or text) instead of selecting a node.
                                        </div>
                                        <div style="font-size: 0.75rem; color: #6c757d; margin-top: 1rem;">
                                            The condition will be saved as: <code>{{nodes.NODE_ID.FIELD}}</code> or <code>{{NODE_ID.FIELD}}</code>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="automationInstance.showConditionModal = false; automationInstance.updateView()">Cancel</button>
                        <button class="btn btn-primary" onclick="automationInstance.saveCondition()">Save</button>
                    </div>
                </div>
            </div>
        `;
    }

    getAvailableVariables() {
        // Common variables available in workflow execution
        const variables = [
            {
                name: 'Trigger Data',
                path: 'trigger',
                example: '{{trigger}}',
                description: 'Full trigger data (webhook/scheduler)'
            },
            {
                name: 'Webhook Body',
                path: 'body',
                example: '{{body}}',
                description: 'Webhook request body'
            },
            {
                name: 'Body Field',
                path: 'body.field',
                example: '{{body.status}}',
                description: 'Access nested body fields'
            },
            {
                name: 'Headers',
                path: 'headers',
                example: '{{headers}}',
                description: 'Request headers'
            },
            {
                name: 'Header Value',
                path: 'headers.headerName',
                example: '{{headers.Content-Type}}',
                description: 'Access specific header'
            },
            {
                name: 'Query Params',
                path: 'query',
                example: '{{query}}',
                description: 'URL query parameters'
            },
            {
                name: 'Query Param',
                path: 'query.param',
                example: '{{query.id}}',
                description: 'Access specific query parameter'
            },
            {
                name: 'Webhook Path',
                path: 'webhookPath',
                example: '{{webhookPath}}',
                description: 'Webhook path identifier'
            },
            {
                name: 'Webhook ID',
                path: 'webhookId',
                example: '{{webhookId}}',
                description: 'Webhook unique ID'
            },
            {
                name: 'Method',
                path: 'method',
                example: '{{method}}',
                description: 'HTTP method (GET, POST, etc.)'
            },
            {
                name: 'Path',
                path: 'path',
                example: '{{path}}',
                description: 'Request path'
            },
            {
                name: 'Previous Node Output',
                path: 'nodeId.field',
                example: '{{node-id-123.result}}',
                description: 'Access output from any previous node in the chain'
            },
            {
                name: 'Previous Node (via nodes)',
                path: 'nodes.nodeId.field',
                example: '{{nodes.node-id-123.result}}',
                description: 'Alternative syntax to access previous node output'
            }
        ];

        return variables;
    }

    copyVariable(path, example) {
        // Copy to clipboard
        navigator.clipboard.writeText(example).then(() => {
            // Show feedback
            const input1 = document.getElementById('condition-value1');
            const input2 = document.getElementById('condition-value2');
            
            // Highlight the inputs briefly
            [input1, input2].forEach(input => {
                if (input) {
                    input.style.border = '2px solid #10b981';
                    setTimeout(() => {
                        input.style.border = '';
                    }, 1000);
                }
            });
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    }

    insertVariable(target) {
        const input = document.getElementById(`condition-${target}`);
        if (!input) return;
        
        // Show a simple prompt to enter variable
        const variable = prompt('Enter variable path (e.g., body.status or headers.Content-Type):');
        if (variable) {
            const currentValue = input.value || '';
            const cursorPos = input.selectionStart || currentValue.length;
            const newValue = currentValue.slice(0, cursorPos) + `{{${variable}}}` + currentValue.slice(cursorPos);
            input.value = newValue;
            input.focus();
            input.setSelectionRange(cursorPos + variable.length + 4, cursorPos + variable.length + 4);
        }
    }

    renderWebhookModal() {
        const webhook = this.editingWebhook;
        const isEdit = !!webhook;

        return `
            <div class="modal-overlay" onclick="automationInstance.showWebhookModal = false; automationInstance.updateView()">
                <div class="modal scheduler-modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h2><i class="fas fa-link"></i> ${isEdit ? 'Edit' : 'Create'} Webhook</h2>
                        <button class="modal-close" onclick="automationInstance.showWebhookModal = false; automationInstance.updateView()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Name</label>
                            <input type="text" id="webhook-name" class="form-control" value="${webhook?.name || ''}" placeholder="My Webhook">
                        </div>

                        <div class="form-group">
                            <label>HTTP Method</label>
                            <select id="webhook-method" class="form-control">
                                <option value="GET" ${webhook?.method === 'GET' ? 'selected' : ''}>GET</option>
                                <option value="POST" ${webhook?.method === 'POST' || !webhook ? 'selected' : ''}>POST</option>
                                <option value="PUT" ${webhook?.method === 'PUT' ? 'selected' : ''}>PUT</option>
                                <option value="DELETE" ${webhook?.method === 'DELETE' ? 'selected' : ''}>DELETE</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>Status</label>
                            ${webhook?.active === false ? `
                            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 0.75rem; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem; color: #991b1b;">
                                <i class="fas fa-exclamation-triangle"></i>
                                <span style="font-size: 0.875rem;">Webhook is stopped. Start it to enable triggering.</span>
                            </div>
                            ` : ''}
                            <div style="display: flex; gap: 0.75rem; align-items: center;">
                                <button type="button" id="webhook-start-btn" onclick="automationInstance.toggleWebhookStatus(true)" class="btn ${webhook?.active === true ? 'btn-success' : 'btn-secondary'}" style="flex: 1; padding: 0.75rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                                    <i class="fas fa-play"></i> Start
                                </button>
                                <button type="button" id="webhook-stop-btn" onclick="automationInstance.toggleWebhookStatus(false)" class="btn ${webhook?.active === false ? 'btn-danger' : 'btn-secondary'}" style="flex: 1; padding: 0.75rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                                    <i class="fas fa-stop"></i> Stop
                                </button>
                            </div>
                            <input type="hidden" id="webhook-active" value="${webhook?.active === true ? 'true' : 'false'}">
                        </div>

                        <div class="form-group" id="webhook-url-preview">
                            <label>Webhook URL</label>
                            <div style="display: flex; align-items: center; gap: 0.5rem; background: #f8fafc; padding: 0.75rem; border-radius: 6px; border: 1px solid #e2e8f0;">
                                <code class="cron-preview-code" id="webhook-url-text" style="flex: 1; margin: 0; font-size: 0.875rem; color: #1e293b;">${window.location.origin}/api/webhook/${webhook?.path ? webhook.path.replace(/^\//, '') : '[path]'}</code>
                                <button type="button" class="btn-copy" onclick="automationInstance.copyWebhookUrl('${webhook?.path ? webhook.path.replace(/^\//, '') : ''}')" title="Copy URL" style="padding: 0.5rem; background: #6366f1; color: white; border: none; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                            <small style="color: #64748b; margin-top: 0.25rem; display: block;">
                                Path: ${webhook?.path ? webhook.path.replace(/^\//, '') : 'Will be auto-generated'}
                            </small>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="automationInstance.showWebhookModal = false; automationInstance.updateView()">Cancel</button>
                        <button class="btn btn-primary" onclick="automationInstance.saveWebhook()">${isEdit ? 'Update' : 'Create'}</button>
                    </div>
                </div>
            </div>
        `;
    }


    renderSchedulerModal() {
        const scheduler = this.editingScheduler;
        const isEdit = !!scheduler;
        
        // Parse existing cron if editing
        let scheduleType = 'once';
        let dateTime = '';
        let time = '';
        let repeatType = 'daily';
        let repeatValue = '1';
        let cronExpression = '';
        
        if (scheduler) {
            cronExpression = scheduler.cronExpression || '';
            // Try to parse cron expression (6 fields: second minute hour day month day-of-week)
            const parts = cronExpression.split(' ');
            if (parts.length === 6) {
                // Check if it's a one-time schedule (specific date/time)
                if (parts[0] !== '*' && parts[1] !== '*' && parts[2] !== '*' && parts[3] !== '*' && parts[4] !== '*' && parts[5] !== '*') {
                    scheduleType = 'once';
                } else {
                    scheduleType = 'recurring';
                    // Try to determine repeat type
                    // Check for minutes: 0 */N * * * * (every N minutes at second 0)
                    if (parts.length === 6 && parts[0] === '0' && (parts[1].startsWith('*/') || parts[1] === '*') && parts[2] === '*' && parts[3] === '*' && parts[4] === '*' && parts[5] === '*') {
                        repeatType = 'minutes';
                        repeatValue = parts[1] === '*' ? '1' : parts[1].substring(2);
                    } 
                    // Check for old buggy minutes: */N * * * * * (every N seconds)
                    else if (parts.length === 6 && parts[0].startsWith('*/') && parts[1] === '*' && parts[2] === '*' && parts[3] === '*' && parts[4] === '*' && parts[5] === '*') {
                        repeatType = 'minutes';
                        repeatValue = parts[0].substring(2);
                    }
                    else if (parts.length === 6 && parts[0] === '0' && parts[2] === '*' && parts[3] === '*' && parts[4] === '*' && parts[5] === '*') {
                        repeatType = 'hourly';
                        repeatValue = parts[1].startsWith('*/') ? parts[1].substring(2) : '1';
                    } else if (parts[0] === '0' && parts[3] === '*' && parts[4] === '*' && parts[5] === '*') {
                        repeatType = 'daily';
                        repeatValue = parts[2].startsWith('*/') ? parts[2].substring(2) : '1';
                        time = `${String(parseInt(parts[2])).padStart(2, '0')}:${String(parseInt(parts[1])).padStart(2, '0')}`;
                    } else if (parts[0] === '0' && parts[4] === '*' && parts[5] !== '*') {
                        repeatType = 'weekly';
                        time = `${String(parseInt(parts[2])).padStart(2, '0')}:${String(parseInt(parts[1])).padStart(2, '0')}`;
                    } else if (parts[0] === '0' && parts[5] === '*') {
                        repeatType = 'monthly';
                        time = `${String(parseInt(parts[2])).padStart(2, '0')}:${String(parseInt(parts[1])).padStart(2, '0')}`;
                    }
                }
            }
        }

        return `
            <div class="modal-overlay" onclick="automationInstance.showSchedulerModal = false; automationInstance.updateView()">
                <div class="modal scheduler-modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h2><i class="fas fa-clock"></i> ${isEdit ? 'Edit' : 'Create'} Scheduler</h2>
                        <button class="modal-close" onclick="automationInstance.showSchedulerModal = false; automationInstance.updateView()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Name</label>
                            <input type="text" id="scheduler-name" class="form-control" value="${scheduler?.name || ''}" placeholder="My Scheduled Task">
                        </div>

                        <div class="form-group">
                            <label>Schedule Type</label>
                            <select id="schedule-type" class="form-control" onchange="automationInstance.updateSchedulerForm()">
                                <option value="once" ${scheduleType === 'once' ? 'selected' : ''}>Run Once</option>
                                <option value="recurring" ${scheduleType === 'recurring' ? 'selected' : ''}>Recurring</option>
                                <option value="manual" ${scheduleType === 'manual' ? 'selected' : ''}>Manual Cron Expression</option>
                            </select>
                        </div>

                        <div id="schedule-once-options" style="display: ${scheduleType === 'once' ? 'block' : 'none'}">
                            <div class="form-group">
                                <label>Date & Time</label>
                                <input type="datetime-local" id="scheduler-datetime" class="form-control" value="${dateTime}">
                            </div>
                        </div>

                        <div id="schedule-recurring-options" style="display: ${scheduleType === 'recurring' ? 'block' : 'none'}">
                            <div class="form-group">
                                <label>Repeat</label>
                                <select id="repeat-type" class="form-control" onchange="automationInstance.updateSchedulerForm()">
                                    <option value="minutes" ${repeatType === 'minutes' ? 'selected' : ''}>Minutes</option>
                                    <option value="hourly" ${repeatType === 'hourly' ? 'selected' : ''}>Hourly</option>
                                    <option value="daily" ${repeatType === 'daily' ? 'selected' : ''}>Daily</option>
                                    <option value="weekly" ${repeatType === 'weekly' ? 'selected' : ''}>Weekly</option>
                                    <option value="monthly" ${repeatType === 'monthly' ? 'selected' : ''}>Monthly</option>
                                </select>
                            </div>

                            <div class="form-group" id="repeat-value-group">
                                <label id="repeat-value-label">Every</label>
                                <div style="display: flex; gap: 0.5rem; align-items: center;">
                                    <input type="number" id="repeat-value" class="form-control" value="${repeatValue}" min="1" style="width: 100px;">
                                    <span id="repeat-unit">hour(s)</span>
                                </div>
                            </div>

                            <div class="form-group" id="time-group" style="display: ${repeatType === 'daily' || repeatType === 'weekly' || repeatType === 'monthly' ? 'block' : 'none'}">
                                <label>Time</label>
                                <input type="time" id="scheduler-time" class="form-control" value="${time || '00:00'}">
                            </div>

                            <div class="form-group" id="day-of-week-group" style="display: ${repeatType === 'weekly' ? 'block' : 'none'}">
                                <label>Day of Week</label>
                                <select id="day-of-week" class="form-control">
                                    <option value="0">Sunday</option>
                                    <option value="1">Monday</option>
                                    <option value="2">Tuesday</option>
                                    <option value="3">Wednesday</option>
                                    <option value="4">Thursday</option>
                                    <option value="5">Friday</option>
                                    <option value="6">Saturday</option>
                                </select>
                            </div>

                            <div class="form-group" id="day-of-month-group" style="display: ${repeatType === 'monthly' ? 'block' : 'none'}">
                                <label>Day of Month</label>
                                <input type="number" id="day-of-month" class="form-control" value="1" min="1" max="31">
                            </div>
                        </div>

                        <div id="schedule-manual-options" style="display: ${scheduleType === 'manual' ? 'block' : 'none'}">
                            <div class="form-group">
                                <label>Cron Expression</label>
                                <input type="text" id="scheduler-cron-manual" class="form-control" value="${cronExpression}" placeholder="0 * * * *">
                                <small style="color: #64748b; margin-top: 0.25rem; display: block;">
                                    Format: second minute hour day month day-of-week<br>
                                    Example: 0 0 * * * (daily at midnight)
                                </small>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Timezone</label>
                            <select id="scheduler-timezone" class="form-control">
                                <option value="UTC" ${scheduler?.timezone === 'UTC' ? 'selected' : ''}>UTC</option>
                                <option value="America/New_York">America/New_York (EST/EDT)</option>
                                <option value="America/Chicago">America/Chicago (CST/CDT)</option>
                                <option value="America/Denver">America/Denver (MST/MDT)</option>
                                <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                                <option value="Europe/London">Europe/London (GMT/BST)</option>
                                <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
                                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                                <option value="Asia/Shanghai">Asia/Shanghai (CST)</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="scheduler-active" ${scheduler?.active !== false ? 'checked' : ''}>
                                Active
                            </label>
                        </div>

                        <div class="form-group" id="cron-preview" style="display: ${scheduleType !== 'manual' ? 'block' : 'none'}">
                            <label>Cron Expression Preview</label>
                            <code class="cron-preview-code" id="cron-preview-text">-</code>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="automationInstance.showSchedulerModal = false; automationInstance.updateView()">Cancel</button>
                        <button class="btn btn-primary" onclick="automationInstance.saveScheduler()">${isEdit ? 'Update' : 'Create'}</button>
                    </div>
                </div>
            </div>
        `;
    }

    updateSchedulerForm() {
        const scheduleType = document.getElementById('schedule-type')?.value || 'once';
        const repeatType = document.getElementById('repeat-type')?.value || 'daily';
        
        // Show/hide relevant sections
        document.getElementById('schedule-once-options').style.display = scheduleType === 'once' ? 'block' : 'none';
        document.getElementById('schedule-recurring-options').style.display = scheduleType === 'recurring' ? 'block' : 'none';
        document.getElementById('schedule-manual-options').style.display = scheduleType === 'manual' ? 'block' : 'none';
        document.getElementById('cron-preview').style.display = scheduleType !== 'manual' ? 'block' : 'none';

        // Update repeat value label
        const repeatValueLabel = document.getElementById('repeat-value-label');
        const repeatUnit = document.getElementById('repeat-unit');
        const timeGroup = document.getElementById('time-group');
        const dayOfWeekGroup = document.getElementById('day-of-week-group');
        const dayOfMonthGroup = document.getElementById('day-of-month-group');

        if (scheduleType === 'recurring') {
            if (repeatType === 'minutes') {
                repeatValueLabel.textContent = 'Every';
                repeatUnit.textContent = 'minute(s)';
                timeGroup.style.display = 'none';
                dayOfWeekGroup.style.display = 'none';
                dayOfMonthGroup.style.display = 'none';
            } else if (repeatType === 'hourly') {
                repeatValueLabel.textContent = 'Every';
                repeatUnit.textContent = 'hour(s)';
                timeGroup.style.display = 'none';
                dayOfWeekGroup.style.display = 'none';
                dayOfMonthGroup.style.display = 'none';
            } else if (repeatType === 'daily') {
                repeatValueLabel.textContent = 'Every';
                repeatUnit.textContent = 'day(s)';
                timeGroup.style.display = 'block';
                dayOfWeekGroup.style.display = 'none';
                dayOfMonthGroup.style.display = 'none';
            } else if (repeatType === 'weekly') {
                repeatValueLabel.textContent = 'Every';
                repeatUnit.textContent = 'week(s)';
                timeGroup.style.display = 'block';
                dayOfWeekGroup.style.display = 'block';
                dayOfMonthGroup.style.display = 'none';
            } else if (repeatType === 'monthly') {
                repeatValueLabel.textContent = 'Every';
                repeatUnit.textContent = 'month(s)';
                timeGroup.style.display = 'block';
                dayOfWeekGroup.style.display = 'none';
                dayOfMonthGroup.style.display = 'block';
            }
        }

        // Update cron preview
        this.updateCronPreview();
    }

    updateCronPreview() {
        const scheduleType = document.getElementById('schedule-type')?.value || 'once';
        const preview = document.getElementById('cron-preview-text');
        
        if (!preview || scheduleType === 'manual') return;

        let cronExpression = '';
        
        if (scheduleType === 'once') {
            const datetime = document.getElementById('scheduler-datetime')?.value;
            if (datetime) {
                const date = new Date(datetime);
                cronExpression = `${date.getSeconds()} ${date.getMinutes()} ${date.getHours()} ${date.getDate()} ${date.getMonth() + 1} *`;
            } else {
                preview.textContent = 'Enter date and time';
                return;
            }
        } else if (scheduleType === 'recurring') {
            const repeatType = document.getElementById('repeat-type')?.value || 'daily';
            const repeatValue = parseInt(document.getElementById('repeat-value')?.value || '1');
            const time = document.getElementById('scheduler-time')?.value || '00:00';
            const [hours, minutes] = time.split(':').map(Number);

            if (repeatType === 'minutes') {
                cronExpression = `0 */${repeatValue} * * * *`;
            } else if (repeatType === 'hourly') {
                cronExpression = `0 0 */${repeatValue} * * *`;
            } else if (repeatType === 'daily') {
                cronExpression = `0 ${minutes} ${hours} */${repeatValue} * *`;
            } else if (repeatType === 'weekly') {
                const dayOfWeek = document.getElementById('day-of-week')?.value || '0';
                cronExpression = `0 ${minutes} ${hours} * * ${dayOfWeek}`;
            } else if (repeatType === 'monthly') {
                const dayOfMonth = document.getElementById('day-of-month')?.value || '1';
                cronExpression = `0 ${minutes} ${hours} ${dayOfMonth} */${repeatValue} *`;
            }
        }

        preview.textContent = cronExpression || '-';
    }

    async saveScheduler() {
        const name = document.getElementById('scheduler-name')?.value;
        if (!name) {
            alert('Please enter a name');
            return;
        }

        const scheduleType = document.getElementById('schedule-type')?.value;
        let cronExpression = '';

        if (scheduleType === 'manual') {
            cronExpression = document.getElementById('scheduler-cron-manual')?.value || '';
            if (!cronExpression) {
                alert('Please enter a cron expression');
                return;
            }
        } else if (scheduleType === 'once') {
            const datetime = document.getElementById('scheduler-datetime')?.value;
            if (!datetime) {
                alert('Please select a date and time');
                return;
            }
            const date = new Date(datetime);
            cronExpression = `${date.getSeconds()} ${date.getMinutes()} ${date.getHours()} ${date.getDate()} ${date.getMonth() + 1} *`;
        } else if (scheduleType === 'recurring') {
            const repeatType = document.getElementById('repeat-type')?.value;
            let repeatValue = parseInt(document.getElementById('repeat-value')?.value || '1');
            if (isNaN(repeatValue) || repeatValue < 1) repeatValue = 1;

            const time = document.getElementById('scheduler-time')?.value || '00:00';
            const [hours, minutes] = time.split(':').map(Number);

            if (repeatType === 'minutes') {
                cronExpression = `0 */${repeatValue} * * * *`;
            } else if (repeatType === 'hourly') {
                cronExpression = `0 0 */${repeatValue} * * *`;
            } else if (repeatType === 'daily') {
                cronExpression = `0 ${minutes} ${hours} */${repeatValue} * *`;
            } else if (repeatType === 'weekly') {
                const dayOfWeek = document.getElementById('day-of-week')?.value || '0';
                cronExpression = `0 ${minutes} ${hours} * * ${dayOfWeek}`;
            } else if (repeatType === 'monthly') {
                const dayOfMonth = document.getElementById('day-of-month')?.value || '1';
                cronExpression = `0 ${minutes} ${hours} ${dayOfMonth} */${repeatValue} *`;
            }
        }

        const timezone = document.getElementById('scheduler-timezone')?.value || 'UTC';
        const active = document.getElementById('scheduler-active')?.checked !== false;

        try {
            const url = this.editingScheduler 
                ? `/api/automation/schedulers/update?id=${this.editingScheduler.id}`
                : '/api/automation/schedulers';
            const method = this.editingScheduler ? 'PUT' : 'POST';

            const body = this.editingScheduler ? {
                name: name,
                cronExpression: cronExpression,
                active: active,
                timezone: timezone
            } : {
                workflowId: this.currentWorkflowId,
                name: name,
                cronExpression: cronExpression,
                active: active,
                timezone: timezone
            };

            const response = await api.fetch(url, {
                method: method,
                body: JSON.stringify(body)
            });

            if (response.ok) {
                const savedScheduler = await response.json();
                
                // Update node data with scheduler ID if this is a new scheduler
                if (!this.editingScheduler) {
                    const scheduleNode = this.nodes.find(n => n.type === 'schedule' && (!n.data || !n.data.schedulerId));
                    if (scheduleNode) {
                        scheduleNode.data = scheduleNode.data || {};
                        scheduleNode.data.schedulerId = savedScheduler.id;
                        await this.saveCurrentWorkflow();
                    }
                }
                
                this.showSchedulerModal = false;
                this.editingScheduler = null;
                await this.loadSchedulers();
                this.updateView();
            } else {
                const error = await response.text();
                alert('Failed to save scheduler: ' + error);
            }
        } catch (error) {
            console.error('Error saving scheduler:', error);
            alert('Failed to save scheduler');
        }
    }


    updateConditionValue(valueNum) {
        // Update the visibility of static value input based on node selection
        const nodeSelect = document.getElementById(`condition-value${valueNum}-node`);
        const fieldInput = document.getElementById(`condition-value${valueNum}-field`);
        const staticInput = document.getElementById(`condition-value${valueNum}-static`);
        
        if (nodeSelect && fieldInput && staticInput) {
            if (nodeSelect.value) {
                // Node selected - show field input, hide static input
                fieldInput.style.display = 'block';
                staticInput.style.display = 'none';
                staticInput.value = ''; // Clear static value
            } else {
                // No node selected - show static input, hide field input
                fieldInput.style.display = 'none';
                staticInput.style.display = 'block';
                fieldInput.value = ''; // Clear field path
            }
        }
    }

    async saveCondition() {
        if (!this.editingConditionNode) return;

        const operator = document.getElementById('condition-operator')?.value;
        
        // Build value1 from node selection or static value
        const value1NodeId = document.getElementById('condition-value1-node')?.value;
        const value1Field = document.getElementById('condition-value1-field')?.value?.trim();
        const value1Static = document.getElementById('condition-value1-static')?.value?.trim();
        
        let value1 = '';
        if (value1NodeId) {
            // Use node reference: {{nodes.nodeId.field}} or {{nodeId.field}}
            if (value1Field) {
                value1 = `{{nodes.${value1NodeId}.${value1Field}}}`;
            } else {
                value1 = `{{nodes.${value1NodeId}}}`;
            }
        } else if (value1Static) {
            // Use static value
            value1 = value1Static;
        }
        
        // Build value2 from node selection or static value
        const value2NodeId = document.getElementById('condition-value2-node')?.value;
        const value2Field = document.getElementById('condition-value2-field')?.value?.trim();
        const value2Static = document.getElementById('condition-value2-static')?.value?.trim();
        
        let value2 = '';
        if (value2NodeId) {
            // Use node reference: {{nodes.nodeId.field}} or {{nodeId.field}}
            if (value2Field) {
                value2 = `{{nodes.${value2NodeId}.${value2Field}}}`;
            } else {
                value2 = `{{nodes.${value2NodeId}}}`;
            }
        } else if (value2Static) {
            // Use static value
            value2 = value2Static;
        }

        // Validate that at least one value is provided
        if (!value1 || !value2) {
            alert('Please provide both Value 1 and Value 2');
            return;
        }

        // Update node data
        const nodeIndex = this.nodes.findIndex(n => n.id === this.editingConditionNode.id);
        if (nodeIndex !== -1) {
            this.nodes[nodeIndex].data = {
                ...this.nodes[nodeIndex].data,
                value1,
                operator,
                value2,
                condition: `${value1} ${operator} ${value2}` // For display/debugging
            };
            
            // Also update the local reference
            this.editingConditionNode.data = this.nodes[nodeIndex].data;
            
            await this.saveCurrentWorkflow();
        }

        this.showConditionModal = false;
        this.editingConditionNode = null;
        this.updateView();
    }

    renderEmailModal() {
        const node = this.editingEmailNode;
        const data = node?.data || {};

        return `
            <div class="modal-overlay" onclick="automationInstance.showEmailModal = false; automationInstance.updateView()">
                <div class="modal scheduler-modal" onclick="event.stopPropagation()" style="max-width: 700px;">
                    <div class="modal-header">
                        <h2><i class="fas fa-envelope"></i> Configure Email</h2>
                        <button class="modal-close" onclick="automationInstance.showEmailModal = false; automationInstance.updateView()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>To <span style="color: #dc3545;">*</span></label>
                            <input type="email" id="email-to" class="form-control" value="${data.to || ''}" placeholder="recipient@example.com or {{nodes.nodeId.email}}">
                            <small class="form-text text-muted">Recipient email address. Supports variables like {{nodes.nodeId.email}}</small>
                        </div>

                        <div class="form-group">
                            <label>From <span style="color: #dc3545;">*</span></label>
                            <input type="email" id="email-from" class="form-control" value="${data.from || ''}" placeholder="sender@example.com">
                            <small class="form-text text-muted">Sender email address</small>
                        </div>

                        <div class="form-group">
                            <label>Subject <span style="color: #dc3545;">*</span></label>
                            <input type="text" id="email-subject" class="form-control" value="${data.subject || ''}" placeholder="Email subject or {{nodes.nodeId.subject}}">
                            <small class="form-text text-muted">Email subject. Supports variables</small>
                        </div>

                        <div class="form-group">
                            <label>Body <span style="color: #dc3545;">*</span></label>
                            <textarea id="email-body" class="form-control" rows="8" placeholder="Email body (HTML supported) or {{nodes.nodeId.body}}">${data.body || ''}</textarea>
                            <small class="form-text text-muted">Email body. HTML is supported. Supports variables</small>
                        </div>

                        <div style="border-top: 1px solid #dee2e6; padding-top: 1rem; margin-top: 1rem;">
                            <h3 style="font-size: 1rem; margin-bottom: 1rem;">SMTP Settings (Optional)</h3>
                            <small class="form-text text-muted" style="margin-bottom: 1rem; display: block;">Leave empty to use default Gmail SMTP (smtp.gmail.com:587)</small>

                            <div class="form-group">
                                <label>SMTP Host</label>
                                <input type="text" id="email-smtp-host" class="form-control" value="${data.smtpHost || ''}" placeholder="smtp.gmail.com">
                            </div>

                            <div class="form-group">
                                <label>SMTP Port</label>
                                <input type="text" id="email-smtp-port" class="form-control" value="${data.smtpPort || ''}" placeholder="587">
                            </div>

                            <div class="form-group">
                                <label>SMTP Username</label>
                                <input type="text" id="email-smtp-user" class="form-control" value="${data.smtpUser || ''}" placeholder="your-email@gmail.com">
                                <small class="form-text text-muted">Required for authenticated SMTP</small>
                            </div>

                            <div class="form-group">
                                <label>SMTP Password</label>
                                <input type="password" id="email-smtp-password" class="form-control" value="${data.smtpPassword || ''}" placeholder="Your SMTP password or app password">
                                <small class="form-text text-muted">For Gmail, use an App Password instead of your regular password</small>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="automationInstance.showEmailModal = false; automationInstance.updateView()">Cancel</button>
                        <button class="btn btn-primary" onclick="automationInstance.saveEmail()">Save</button>
                    </div>
                </div>
            </div>
        `;
    }

    async saveEmail() {
        if (!this.editingEmailNode) return;

        const to = document.getElementById('email-to')?.value?.trim();
        const from = document.getElementById('email-from')?.value?.trim();
        const subject = document.getElementById('email-subject')?.value?.trim();
        const body = document.getElementById('email-body')?.value?.trim();
        const smtpHost = document.getElementById('email-smtp-host')?.value?.trim();
        const smtpPort = document.getElementById('email-smtp-port')?.value?.trim();
        const smtpUser = document.getElementById('email-smtp-user')?.value?.trim();
        const smtpPassword = document.getElementById('email-smtp-password')?.value?.trim();

        if (!to || !from || !subject || !body) {
            alert('Please fill in all required fields (To, From, Subject, Body)');
            return;
        }

        // Update node data
        const nodeIndex = this.nodes.findIndex(n => n.id === this.editingEmailNode.id);
        if (nodeIndex !== -1) {
            this.nodes[nodeIndex].data = {
                ...this.nodes[nodeIndex].data,
                to,
                from,
                subject,
                body,
                smtpHost: smtpHost || undefined,
                smtpPort: smtpPort || undefined,
                smtpUser: smtpUser || undefined,
                smtpPassword: smtpPassword || undefined,
            };
            
            // Also update the local reference
            this.editingEmailNode.data = this.nodes[nodeIndex].data;
            
            await this.saveCurrentWorkflow();
        }

        this.showEmailModal = false;
        this.editingEmailNode = null;
        this.updateView();
    }

    renderExecuteCommandModal() {
        const node = this.editingExecuteCommandNode;
        const data = node?.data || {};

        return `
            <div class="modal-overlay" onclick="automationInstance.showExecuteCommandModal = false; automationInstance.updateView()">
                <div class="modal scheduler-modal" onclick="event.stopPropagation()" style="max-width: 700px;">
                    <div class="modal-header">
                        <h2><i class="fas fa-server"></i> Configure Execute Command</h2>
                        <button class="modal-close" onclick="automationInstance.showExecuteCommandModal = false; automationInstance.updateView()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Host</label>
                            <input type="text" id="execute-command-host" class="form-control" value="${data.host || ''}" placeholder="localhost or 192.168.1.100 or {{input.host}}">
                            <small class="form-text text-muted">Hostname or IP address. Leave empty for localhost. Supports variables like {{input.host}}</small>
                        </div>

                        <div class="form-group">
                            <label>Command <span style="color: #dc3545;">*</span></label>
                            <textarea id="execute-command-command" class="form-control" rows="6" placeholder="Get-Process or ls -la or {{input.command}}">${data.command || ''}</textarea>
                            <small class="form-text text-muted">Command to execute. Supports variables like {{input.command}} or {{trigger.body}}</small>
                        </div>

                        <div class="form-group">
                            <label>Shell</label>
                            <select id="execute-command-shell" class="form-control">
                                <option value="" ${!data.shell ? 'selected' : ''}>Auto-detect (PowerShell on Windows, Bash on Linux)</option>
                                <option value="powershell" ${data.shell === 'powershell' ? 'selected' : ''}>PowerShell</option>
                                <option value="cmd" ${data.shell === 'cmd' ? 'selected' : ''}>CMD</option>
                                <option value="bash" ${data.shell === 'bash' ? 'selected' : ''}>Bash</option>
                                <option value="sh" ${data.shell === 'sh' ? 'selected' : ''}>Sh</option>
                            </select>
                            <small class="form-text text-muted">Shell type to use for command execution</small>
                        </div>

                        <div class="form-group">
                            <label>Timeout (seconds)</label>
                            <input type="number" id="execute-command-timeout" class="form-control" value="${data.timeout || '30'}" min="1" max="300" placeholder="30">
                            <small class="form-text text-muted">Maximum execution time in seconds (default: 30)</small>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="automationInstance.showExecuteCommandModal = false; automationInstance.updateView()">Cancel</button>
                        <button class="btn btn-primary" onclick="automationInstance.saveExecuteCommand()">Save</button>
                    </div>
                </div>
            </div>
        `;
    }

    async saveExecuteCommand() {
        if (!this.editingExecuteCommandNode) return;

        const host = document.getElementById('execute-command-host')?.value?.trim() || '';
        const command = document.getElementById('execute-command-command')?.value?.trim();
        const shell = document.getElementById('execute-command-shell')?.value?.trim() || '';
        const timeout = parseInt(document.getElementById('execute-command-timeout')?.value?.trim() || '30', 10);

        if (!command) {
            alert('Please enter a command to execute');
            return;
        }

        if (isNaN(timeout) || timeout < 1 || timeout > 300) {
            alert('Timeout must be between 1 and 300 seconds');
            return;
        }

        // Update node data
        const nodeIndex = this.nodes.findIndex(n => n.id === this.editingExecuteCommandNode.id);
        if (nodeIndex !== -1) {
            this.nodes[nodeIndex].data = {
                ...this.nodes[nodeIndex].data,
                host,
                command,
                shell: shell || undefined, // Only include if not empty
                timeout: timeout || 30
            };
            await this.saveCurrentWorkflow();
            await this.renderNodes();
            this.renderConnections();
        }

        this.showExecuteCommandModal = false;
        this.editingExecuteCommandNode = null;
        this.updateView();
    }

    updateView() {
        const pageContent = document.getElementById('page-content');
        if (pageContent) {
            pageContent.innerHTML = this.render();
            this.mount();
        }
    }

    async loadWebhooks() {
        if (!this.currentWorkflowId) return;

        try {
            const response = await api.fetch(`/api/automation/webhooks?workflowId=${this.currentWorkflowId}`);
            if (response.ok) {
                this.webhooks = await response.json();
            }
        } catch (error) {
            console.error('Error loading webhooks:', error);
            this.webhooks = [];
        }
    }

    async loadSchedulers() {
        if (!this.currentWorkflowId) {
            console.log('No currentWorkflowId, cannot load schedulers');
            this.schedulers = [];
            return;
        }

        try {
            const response = await api.fetch(`/api/automation/schedulers?workflowId=${this.currentWorkflowId}`);
            if (response.ok) {
                const data = await response.json();
                this.schedulers = Array.isArray(data) ? data : [];
                console.log('Loaded schedulers:', this.schedulers.length, this.schedulers);
            } else {
                console.error('Failed to load schedulers:', response.status, response.statusText);
                this.schedulers = [];
            }
        } catch (error) {
            console.error('Error loading schedulers:', error);
            this.schedulers = [];
        }
    }

    generateWebhookPath() {
        // Generate a unique path using UUID
        return this.generateUUID();
    }

    regenerateWebhookPath() {
        const newPath = this.generateWebhookPath();
        // Update URL preview
        const urlPreview = document.getElementById('webhook-url-text');
        if (urlPreview) {
            urlPreview.textContent = `${window.location.origin}/api/webhook/${newPath}`;
        }
    }

    async autoCreateWebhook(node) {
        // Auto-create webhook when node is added
        const path = this.generateWebhookPath();
        const name = `Webhook ${this.nodes.filter(n => n.type === 'webhook').length + 1}`;
        
        try {
            const response = await api.fetch('/api/automation/webhooks', {
                method: 'POST',
                body: JSON.stringify({
                    workflowId: this.currentWorkflowId,
                    name: name,
                    path: path,
                    method: 'POST',
                    active: false,
                    responseMode: 'responseNode'
                })
            });

            if (response.ok) {
                const savedWebhook = await response.json();
                
                // Store webhook ID in node data
                node.data = node.data || {};
                node.data.webhookId = savedWebhook.id;
                await this.saveCurrentWorkflow();
                
                // Reload webhooks
                await this.loadWebhooks();
                
                // Re-render nodes to show status indicator
                await this.renderNodes();
                
                // Show success message
                const toast = document.createElement('div');
                toast.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 0.75rem 1rem; border-radius: 6px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 10000; display: flex; align-items: center; gap: 0.5rem;';
                toast.innerHTML = `<i class="fas fa-check"></i> Webhook created: ${savedWebhook.path}`;
                document.body.appendChild(toast);
                setTimeout(() => {
                    toast.style.opacity = '0';
                    toast.style.transition = 'opacity 0.3s';
                    setTimeout(() => toast.remove(), 300);
                }, 3000);
            } else {
                console.error('Failed to auto-create webhook');
            }
        } catch (error) {
            console.error('Error auto-creating webhook:', error);
        }
    }

    toggleWebhookStatus(active) {
        const activeInput = document.getElementById('webhook-active');
        if (activeInput) {
            activeInput.value = active ? 'true' : 'false';
        }
        
        // Update button styles
        const startBtn = document.getElementById('webhook-start-btn');
        const stopBtn = document.getElementById('webhook-stop-btn');
        
        if (startBtn && stopBtn) {
            if (active) {
                startBtn.className = 'btn btn-success';
                stopBtn.className = 'btn btn-secondary';
            } else {
                startBtn.className = 'btn btn-secondary';
                stopBtn.className = 'btn btn-danger';
            }
        }
    }


    async saveWebhook() {
        const name = document.getElementById('webhook-name')?.value;
        if (!name) {
            alert('Please enter a name');
            return;
        }

        // Get path from webhook data or generate new one
        let path = this.editingWebhook?.path;
        
        // Remove leading slash if present
        if (path) {
            path = path.replace(/^\//, '');
        }
        
        // If no path, generate one
        if (!path) {
            path = this.generateWebhookPath();
        }

        const method = document.getElementById('webhook-method')?.value || 'POST';
        const activeInput = document.getElementById('webhook-active');
        const active = activeInput?.value === 'true';

        try {
            const url = this.editingWebhook 
                ? `/api/automation/webhooks/update?id=${this.editingWebhook.id}`
                : '/api/automation/webhooks';
            const httpMethod = this.editingWebhook ? 'PUT' : 'POST';

            const body = this.editingWebhook ? {
                name: name,
                path: path,
                method: method,
                active: active,
                responseMode: 'responseNode'
            } : {
                workflowId: this.currentWorkflowId,
                name: name,
                path: path,
                method: method,
                active: active,
                responseMode: 'responseNode'
            };

            const response = await api.fetch(url, {
                method: httpMethod,
                body: JSON.stringify(body)
            });

            if (response.ok) {
                const savedWebhook = await response.json();
                
                // Update node data with webhook ID if this is a new webhook
                if (!this.editingWebhook) {
                    const webhookNode = this.nodes.find(n => n.type === 'webhook' && (!n.data || !n.data.webhookId));
                    if (webhookNode) {
                        webhookNode.data = webhookNode.data || {};
                        webhookNode.data.webhookId = savedWebhook.id;
                        await this.saveCurrentWorkflow();
                    }
                }
                
                this.showWebhookModal = false;
                this.editingWebhook = null;
                await this.loadWebhooks();
                // Re-render nodes to update status indicators
                await this.renderNodes();
                this.updateView();
            } else {
                const error = await response.text();
                alert('Failed to save webhook: ' + error);
            }
        } catch (error) {
            console.error('Error saving webhook:', error);
            alert('Failed to save webhook');
        }
    }

    async toggleWebhook(webhookId) {
        const webhook = this.webhooks.find(w => w.id === webhookId);
        if (!webhook) return;

        try {
            const response = await api.fetch(`/api/automation/webhooks/update?id=${webhookId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    active: !webhook.active
                })
            });

            if (response.ok) {
                await this.loadWebhooks();
                // Re-render nodes to update status indicators
                await this.renderNodes();
            }
        } catch (error) {
            console.error('Error toggling webhook:', error);
        }
    }

    async toggleScheduler(schedulerId) {
        const scheduler = this.schedulers.find(s => s.id === schedulerId);
        if (!scheduler) return;

        try {
            const response = await api.fetch(`/api/automation/schedulers/update?id=${schedulerId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    active: !scheduler.active
                })
            });

            if (response.ok) {
                await this.loadSchedulers();
            }
        } catch (error) {
            console.error('Error toggling scheduler:', error);
        }
    }

    async deleteWebhook(webhookId) {
        if (!confirm('Are you sure you want to delete this webhook?')) return;

        try {
            const response = await api.fetch(`/api/automation/webhooks/delete?id=${webhookId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await this.loadWebhooks();
            }
        } catch (error) {
            console.error('Error deleting webhook:', error);
        }
    }

    async deleteScheduler(schedulerId) {
        if (!confirm('Are you sure you want to delete this scheduler?')) return;

        try {
            const response = await api.fetch(`/api/automation/schedulers/delete?id=${schedulerId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await this.loadSchedulers();
            }
        } catch (error) {
            console.error('Error deleting scheduler:', error);
        }
    }

    editWebhook(webhookId) {
        // TODO: Implement edit modal
        alert('Edit webhook functionality coming soon');
    }

    editScheduler(schedulerId) {
        const scheduler = this.schedulers.find(s => s.id === schedulerId);
        if (scheduler) {
            this.editingScheduler = scheduler;
            this.showSchedulerModal = true;
            this.updateView();
        }
    }

    copyWebhookUrl(path) {
        const url = `${window.location.origin}/api/webhook/${path || '[path]'}`;
        navigator.clipboard.writeText(url).then(() => {
            // Show a toast notification instead of alert
            const toast = document.createElement('div');
            toast.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 0.75rem 1rem; border-radius: 6px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 10000; display: flex; align-items: center; gap: 0.5rem;';
            toast.innerHTML = '<i class="fas fa-check"></i> Webhook URL copied!';
            document.body.appendChild(toast);
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transition = 'opacity 0.3s';
                setTimeout(() => toast.remove(), 300);
            }, 2000);
        }).catch(() => {
            alert('Failed to copy URL. Please copy manually: ' + url);
        });
    }


    attachSchedulerModalListeners() {
        const scheduleType = document.getElementById('schedule-type');
        const repeatType = document.getElementById('repeat-type');
        const datetime = document.getElementById('scheduler-datetime');
        const time = document.getElementById('scheduler-time');
        const repeatValue = document.getElementById('repeat-value');
        const dayOfWeek = document.getElementById('day-of-week');
        const dayOfMonth = document.getElementById('day-of-month');

        if (scheduleType) {
            scheduleType.addEventListener('change', () => this.updateSchedulerForm());
        }
        if (repeatType) {
            repeatType.addEventListener('change', () => this.updateSchedulerForm());
        }
        if (datetime) {
            datetime.addEventListener('change', () => this.updateCronPreview());
        }
        if (time) {
            time.addEventListener('change', () => this.updateCronPreview());
        }
        if (repeatValue) {
            repeatValue.addEventListener('change', () => this.updateCronPreview());
            repeatValue.addEventListener('input', () => this.updateCronPreview());
        }
        if (dayOfWeek) {
            dayOfWeek.addEventListener('change', () => this.updateCronPreview());
        }
        if (dayOfMonth) {
            dayOfMonth.addEventListener('change', () => this.updateCronPreview());
        }
    }

    async mount() {
        console.log('[MOUNT] Mount called, viewMode:', this.viewMode, 'currentTab:', this.workflowTab);
        window.automationInstance = this;
        
        // Check URL hash for workflow ID and tab
        const hash = window.location.hash.slice(1);
        if (hash.startsWith('automation/workflow/')) {
            const parts = hash.split('/');
            const workflowId = parts[2];
            const tab = parts[3] || 'canvas'; // Default to canvas if no tab specified
            
            // If URL doesn't have a tab but we're on a workflow, update URL to include default tab
            if (workflowId && this.currentWorkflowId === workflowId && !parts[3]) {
                console.log('[MOUNT] No tab in URL, adding default:', this.workflowTab || 'canvas');
                window.location.hash = `automation/workflow/${workflowId}/${this.workflowTab || 'canvas'}`;
                return; // URL change will trigger mount again
            }
            
            if (workflowId && workflowId !== this.currentWorkflowId) {
                console.log('[MOUNT] Found workflow ID in URL:', workflowId, 'tab:', tab);
                await this.openWorkflow(workflowId, tab);
                return;
            } else if (workflowId && this.currentWorkflowId === workflowId && tab && tab !== this.workflowTab) {
                // Same workflow but different tab - update without triggering openWorkflow
                console.log('[MOUNT] Switching to tab:', tab, 'without reopening workflow');
                this.workflowTab = tab;
                // Don't call rerender here, just continue with mount to load tab data
            }
        }
        
        // If in list view, always load workflows to ensure fresh data
        if (this.viewMode === 'list') {
            await this.loadWorkflows();
        }
        
        if (this.viewMode === 'workflow') {
            console.log('[MOUNT] Initializing workflow view');
            if (this.workflowTab === 'canvas') {
                console.log('[MOUNT] Initializing canvas');
                this.initializeCanvas();
                if (this.isEditing) {
                    this.initializeDragAndDrop();
                }
                // Always initialize panning (works in both edit and view mode)
                this.initializePanning();
                this.updateCanvasTransform();
                await this.renderNodes();
                console.log('[MOUNT] Canvas initialized, nodes rendered:', this.nodes.length);
                
                // Auto-save on changes (only in edit mode)
                if (this.isEditing && !this.autoSaveInterval) {
                    this.autoSaveInterval = setInterval(async () => {
                        if (this.currentWorkflowId && this.viewMode === 'workflow' && this.workflowTab === 'canvas' && this.isEditing) {
                            await this.saveCurrentWorkflow();
                        }
                    }, 30000); // Auto-save every 30 seconds
                }
            } else if (this.workflowTab === 'executions') {
                await this.loadExecutions();
                await this.loadExecutionStats();
            } else if (this.workflowTab === 'webhooks') {
                // Load webhooks if not already loaded
                if (!this.webhooks || this.webhooks.length === 0) {
                    await this.loadWebhooks();
                }
            } else if (this.workflowTab === 'schedulers') {
                // Load schedulers if not already loaded
                if (!this.schedulers || this.schedulers.length === 0) {
                    await this.loadSchedulers();
                }
            }
        }
        console.log('[MOUNT] Mount completed');
    }

    initializeCanvas() {
        const canvas = document.getElementById('automation-canvas');
        if (!canvas) return;

        // Set initial canvas size
        this.updateCanvasSize();
        window.addEventListener('resize', () => this.updateCanvasSize());
    }

    updateCanvasSize() {
        const canvas = document.getElementById('automation-canvas');
        if (!canvas) return;
        
        const container = canvas.parentElement;
        canvas.style.width = container.clientWidth + 'px';
        canvas.style.height = container.clientHeight + 'px';
        this.renderConnections();
    }

    initializeDragAndDrop() {
        // Try to find sidebar in the main sidebar component first, then fallback to inline
        const sidebar = document.querySelector('#sidebar .automation-sidebar-content') || document.querySelector('.automation-sidebar');
        if (!sidebar) return;

        // Make node types draggable
        const nodeTypes = sidebar.querySelectorAll('.node-type-item');
        nodeTypes.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    type: item.dataset.type,
                    category: item.dataset.category
                }));
            });
        });

        // Handle drop on canvas
        const canvas = document.getElementById('automation-canvas');
        if (canvas) {
            canvas.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
            });

            canvas.addEventListener('drop', (e) => {
                e.preventDefault();
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                const rect = canvas.getBoundingClientRect();
                const x = (e.clientX - rect.left - this.canvasOffset.x) / this.zoom;
                const y = (e.clientY - rect.top - this.canvasOffset.y) / this.zoom;
                this.addNode(data.type, data.category, x, y);
            });
        }
    }

    initializePanning() {
        const canvas = document.getElementById('automation-canvas');
        if (!canvas) return;

        let isPanning = false;
        let startPoint = { x: 0, y: 0 };

        canvas.addEventListener('mousedown', (e) => {
            if (e.target === canvas || e.target.classList.contains('canvas-grid')) {
                isPanning = true;
                startPoint = { x: e.clientX - this.canvasOffset.x, y: e.clientY - this.canvasOffset.y };
                canvas.style.cursor = 'grabbing';
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            if (isPanning) {
                this.canvasOffset.x = e.clientX - startPoint.x;
                this.canvasOffset.y = e.clientY - startPoint.y;
                this.updateCanvasTransform();
                // Force a re-render of connections during panning
                requestAnimationFrame(() => {
                    this.renderConnections();
                });
            }
        });

        canvas.addEventListener('mouseup', () => {
            if (isPanning) {
                this.onPanEnd();
            }
            isPanning = false;
            canvas.style.cursor = 'default';
        });

        canvas.addEventListener('mouseleave', () => {
            if (isPanning) {
                this.onPanEnd();
            }
            isPanning = false;
            canvas.style.cursor = 'default';
        });

        // Add wheel event listener for zoom
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            // Get mouse position relative to canvas
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Calculate zoom point in canvas coordinates (before zoom)
            const beforeZoomX = (mouseX - this.canvasOffset.x) / this.zoom;
            const beforeZoomY = (mouseY - this.canvasOffset.y) / this.zoom;
            
            // Update zoom
            const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
            const newZoom = Math.min(Math.max(this.zoom + zoomDelta, 0.5), 2);
            
            if (newZoom !== this.zoom) {
                this.zoom = newZoom;
                
                // Adjust offset to zoom towards mouse position
                this.canvasOffset.x = mouseX - beforeZoomX * this.zoom;
                this.canvasOffset.y = mouseY - beforeZoomY * this.zoom;
                
                this.updateCanvasTransform();
                this.updateZoomIndicator();
                
                // Debounce save to avoid too many saves during zooming
                if (this.zoomSaveTimeout) {
                    clearTimeout(this.zoomSaveTimeout);
                }
                this.zoomSaveTimeout = setTimeout(() => {
                    this.saveCurrentWorkflow();
                }, 500);
            }
        }, { passive: false });
    }

    updateCanvasTransform() {
        const nodesLayer = document.getElementById('nodes-layer');
        // Connections are handled in renderConnections via the group transform
        
        if (nodesLayer) {
            nodesLayer.style.transform = `translate(${this.canvasOffset.x}px, ${this.canvasOffset.y}px) scale(${this.zoom})`;
            nodesLayer.style.transformOrigin = '0 0';
        }
        
        // Re-render connections to update the SVG group transform
        this.renderConnections();
    }
    
    async onPanEnd() {
        // Save canvas position after panning
        await this.saveCurrentWorkflow();
    }

    async addNode(type, category, x, y) {
        console.log('[ADD NODE] Starting addNode:', { type, category, x, y });
        console.log('[ADD NODE] Current nodes before add:', this.nodes.length);
        
        if (!this.currentWorkflowId) {
            console.log('[ADD NODE] No workflow ID, creating new workflow');
            await this.createNewWorkflow();
        }
        
        let inputs = category === 'trigger' ? [] : [{ id: this.generateUUID(), name: 'Input' }];
        let outputs = [{ id: this.generateUUID(), name: 'Output' }];

        // Custom ports for specific node types
        if (type === 'condition') {
            outputs = [
                { id: `port-${this.generateUUID()}-true`, name: 'true' }, // Use stable ID suffix for logic
                { id: `port-${this.generateUUID()}-false`, name: 'false' }
            ];
        }

        const node = {
            id: this.generateUUID(),
            type,
            category,
            x,
            y,
            width: 200,
            height: 100,
            inputs,
            outputs,
            data: {},
            selected: false
        };

        console.log('[ADD NODE] Created node:', node);
        this.nodes.push(node);
        console.log('[ADD NODE] Nodes after push:', this.nodes.length);
        console.log('[ADD NODE] All nodes:', this.nodes.map(n => ({ id: n.id, type: n.type })));
        
        await this.saveCurrentWorkflow();
        await this.renderNodes();
        this.animateNodeAppearance(node.id);
        this.updateWorkflowsGrid();

        // Show saved indicator
        const saveIndicator = document.createElement('div');
        saveIndicator.className = 'save-indicator';
        saveIndicator.textContent = 'Saved';
        saveIndicator.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
            opacity: 0;
            transition: opacity 0.3s;
            z-index: 1000;
            pointer-events: none;
        `;
        document.body.appendChild(saveIndicator);
        requestAnimationFrame(() => saveIndicator.style.opacity = '1');
        setTimeout(() => {
            saveIndicator.style.opacity = '0';
            setTimeout(() => saveIndicator.remove(), 300);
        }, 2000);

        // If adding a webhook trigger, auto-create it immediately
        if (type === 'webhook') {
            await this.autoCreateWebhook(node);
        } else if (type === 'schedule') {
            setTimeout(() => {
                this.showSchedulerModal = true;
                this.editingScheduler = null;
                this.updateView();
                setTimeout(() => {
                    this.attachSchedulerModalListeners();
                }, 100);
            }, 300);
        }
        
        console.log('[ADD NODE] Completed, final nodes count:', this.nodes.length);
    }

    animateNodeAppearance(nodeId) {
        const nodeEl = document.getElementById(nodeId);
        if (nodeEl) {
            nodeEl.style.opacity = '0';
            nodeEl.style.transform = 'scale(0.5)';
            setTimeout(() => {
                nodeEl.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
                nodeEl.style.opacity = '1';
                nodeEl.style.transform = 'scale(1)';
            }, 10);
        }
    }

    async renderNodes() {
        const nodesLayer = document.getElementById('nodes-layer');
        if (!nodesLayer) return;

        // Load webhooks if we have webhook nodes and webhooks aren't loaded
        const hasWebhookNodes = this.nodes.some(n => n.type === 'webhook');
        if (hasWebhookNodes && (!this.webhooks || this.webhooks.length === 0) && this.currentWorkflowId) {
            await this.loadWebhooks();
        }

        console.log('[RENDER NODES] Rendering', this.nodes.length, 'nodes');
        nodesLayer.innerHTML = this.nodes.map(node => this.renderNode(node)).join('');
        
        // Attach event listeners
        this.nodes.forEach(node => {
            this.attachNodeListeners(node);
        });
        
        // Render connections after nodes are rendered and DOM is ready
        // Use multiple requestAnimationFrame calls and a small timeout to ensure layout is complete
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                // Small delay to ensure all port positions are calculated correctly
                setTimeout(() => {
                    this.renderConnections();
                    // Re-render once more after a brief delay to catch any late layout changes
                    setTimeout(() => {
                        this.renderConnections();
                    }, 50);
                }, 10);
            });
        });
    }

    renderNode(node) {
        const nodeConfig = this.getNodeConfig(node.type);
        
        // Get webhook status if this is a webhook node
        let webhookStatus = null;
        if (node.type === 'webhook' && node.data?.webhookId) {
            const webhook = this.webhooks.find(w => w.id === node.data.webhookId);
            if (webhook) {
                webhookStatus = webhook.active;
            }
        }
        
        // Determine node shape based on type/category
        let shapeClass = 'node-shape-square'; // default
        if (node.category === 'trigger') {
            shapeClass = 'node-shape-circle';
        } else if (node.type === 'condition') {
            shapeClass = 'node-shape-diamond'; // Diamond shape for condition/if nodes
        } else if (node.type === 'switch') {
            shapeClass = 'node-shape-hexagon';
        } else if (node.category === 'action') {
            shapeClass = 'node-shape-square';
        } else if (node.category === 'logic') {
            shapeClass = 'node-shape-diamond';
        }
        
        return `
            <div class="automation-node ${node.category} ${shapeClass}" id="${node.id}" 
                 style="left: ${node.x}px; top: ${node.y}px;"
                 data-node-id="${node.id}">
                ${node.inputs.length > 0 ? `
                <div class="node-inputs">
                    ${node.inputs.map(input => `
                        <div class="node-port node-input" data-port-id="${input.id}" data-node-id="${node.id}">
                            <div class="port-circle"></div>
                        </div>
                    `).join('')}
                </div>
                ` : ''}
                <div class="node-content-wrapper">
                    <div class="node-header" style="background: ${nodeConfig.color}">
                        <div class="node-icon">
                            <i class="${nodeConfig.icon}"></i>
                        </div>
                        ${node.type === 'webhook' && webhookStatus !== null ? `
                        <div class="node-status-indicator ${webhookStatus ? 'status-active' : 'status-inactive'}" title="${webhookStatus ? 'Webhook Active' : 'Webhook Inactive'}">
                            <div class="status-circle"></div>
                        </div>
                        ` : ''}
                        ${this.isEditing ? `
                        <button class="node-delete-btn" onclick="automationInstance.deleteNode('${node.id}')">
                            <i class="fas fa-times"></i>
                        </button>
                        ` : ''}
                    </div>
                    <div class="node-title">${nodeConfig.title}</div>
                </div>
                ${node.outputs.length > 0 ? `
                <div class="node-outputs">
                    ${node.outputs.map(output => {
                        // For condition nodes, show labels for true/false ports
                        const isConditionNode = node.type === 'condition';
                        const portLabel = isConditionNode ? (output.name === 'true' ? 'True' : 'False') : '';
                        const portClass = isConditionNode ? (output.name === 'true' ? 'port-true' : 'port-false') : '';
                        
                        return `
                        <div class="node-port node-output ${portClass}" data-port-id="${output.id}" data-node-id="${node.id}" data-port-name="${output.name}">
                            ${portLabel ? `<span class="port-label">${portLabel}</span>` : ''}
                            <div class="port-circle"></div>
                        </div>
                    `;
                    }).join('')}
                </div>
                ` : ''}
            </div>
        `;
    }

    getNodeConfig(type) {
        const configs = {
            // Triggers
            webhook: { title: 'Webhook', icon: 'fas fa-link', color: '#6366f1', description: 'Receive webhook data' },
            schedule: { title: 'Schedule', icon: 'fas fa-clock', color: '#6366f1', description: 'Trigger on schedule' },
            manual: { title: 'Manual', icon: 'fas fa-hand-pointer', color: '#6366f1', description: 'Manual trigger' },
            'file-watch': { title: 'File Watcher', icon: 'fas fa-file-alt', color: '#6366f1', description: 'Watch for file changes' },
            'email-trigger': { title: 'Email Trigger', icon: 'fas fa-inbox', color: '#6366f1', description: 'Trigger on new email' },
            'mqtt-trigger': { title: 'MQTT Trigger', icon: 'fas fa-broadcast-tower', color: '#6366f1', description: 'MQTT message trigger' },
            
            // HTTP & API
            http: { title: 'HTTP Request', icon: 'fas fa-globe', color: '#10b981', description: 'Make HTTP request' },
            'rest-api': { title: 'REST API', icon: 'fas fa-cloud', color: '#10b981', description: 'REST API call' },
            graphql: { title: 'GraphQL', icon: 'fas fa-project-diagram', color: '#10b981', description: 'GraphQL query' },
            soap: { title: 'SOAP Request', icon: 'fas fa-exchange-alt', color: '#10b981', description: 'SOAP web service' },
            'webhook-response': { title: 'Webhook Response', icon: 'fas fa-reply', color: '#10b981', description: 'Respond to webhook' },
            
            // Database
            database: { title: 'Database', icon: 'fas fa-database', color: '#3b82f6', description: 'Query database' },
            mysql: { title: 'MySQL', icon: 'fas fa-database', color: '#3b82f6', description: 'MySQL query' },
            postgresql: { title: 'PostgreSQL', icon: 'fas fa-database', color: '#3b82f6', description: 'PostgreSQL query' },
            mongodb: { title: 'MongoDB', icon: 'fas fa-database', color: '#3b82f6', description: 'MongoDB operation' },
            sqlite: { title: 'SQLite', icon: 'fas fa-database', color: '#3b82f6', description: 'SQLite query' },
            redis: { title: 'Redis', icon: 'fas fa-database', color: '#3b82f6', description: 'Redis operation' },
            
            // File Operations
            'read-file': { title: 'Read File', icon: 'fas fa-file-alt', color: '#8b5cf6', description: 'Read file content' },
            'write-file': { title: 'Write File', icon: 'fas fa-file-export', color: '#8b5cf6', description: 'Write to file' },
            'delete-file': { title: 'Delete File', icon: 'fas fa-trash', color: '#8b5cf6', description: 'Delete file' },
            'list-files': { title: 'List Files', icon: 'fas fa-list', color: '#8b5cf6', description: 'List directory files' },
            'move-file': { title: 'Move File', icon: 'fas fa-arrows-alt', color: '#8b5cf6', description: 'Move file' },
            'copy-file': { title: 'Copy File', icon: 'fas fa-copy', color: '#8b5cf6', description: 'Copy file' },
            compress: { title: 'Compress', icon: 'fas fa-file-archive', color: '#8b5cf6', description: 'Compress files' },
            extract: { title: 'Extract', icon: 'fas fa-file-archive', color: '#8b5cf6', description: 'Extract archive' },
            
            // Email & Messaging
            email: { title: 'Send Email', icon: 'fas fa-envelope', color: '#ec4899', description: 'Send email message' },
            smtp: { title: 'SMTP', icon: 'fas fa-server', color: '#ec4899', description: 'SMTP email' },
            slack: { title: 'Slack', icon: 'fab fa-slack', color: '#ec4899', description: 'Send Slack message' },
            teams: { title: 'Teams', icon: 'fab fa-microsoft', color: '#ec4899', description: 'Microsoft Teams' },
            discord: { title: 'Discord', icon: 'fab fa-discord', color: '#ec4899', description: 'Discord message' },
            telegram: { title: 'Telegram', icon: 'fab fa-telegram', color: '#ec4899', description: 'Telegram message' },
            sms: { title: 'SMS', icon: 'fas fa-sms', color: '#ec4899', description: 'Send SMS' },
            
            // Logic & Control
            condition: { title: 'Condition', icon: 'fas fa-code-branch', color: '#f59e0b', description: 'If/Else logic' },
            merge: { title: 'Merge', icon: 'fas fa-code-branch', color: '#f59e0b', description: 'Merge branches' },
            wait: { title: 'Wait', icon: 'fas fa-hourglass-half', color: '#f59e0b', description: 'Wait for time' },
            stop: { title: 'Stop', icon: 'fas fa-stop', color: '#f59e0b', description: 'Stop workflow' },
            loop: { title: 'Loop', icon: 'fas fa-redo', color: '#f59e0b', description: 'Loop items' },
            'error-handler': { title: 'Error Handler', icon: 'fas fa-exclamation-triangle', color: '#f59e0b', description: 'Handle errors' },
            
            // Transform & Data
            transform: { title: 'Transform', icon: 'fas fa-exchange-alt', color: '#06b6d4', description: 'Transform data' },
            set: { title: 'Set', icon: 'fas fa-edit', color: '#06b6d4', description: 'Set variable' },
            json: { title: 'JSON', icon: 'fas fa-code', color: '#06b6d4', description: 'JSON operations' },
            xml: { title: 'XML', icon: 'fas fa-code', color: '#06b6d4', description: 'XML operations' },
            csv: { title: 'CSV', icon: 'fas fa-table', color: '#06b6d4', description: 'CSV operations' },
            html: { title: 'HTML', icon: 'fas fa-code', color: '#06b6d4', description: 'HTML operations' },
            aggregate: { title: 'Aggregate', icon: 'fas fa-layer-group', color: '#06b6d4', description: 'Aggregate data' },
            filter: { title: 'Filter', icon: 'fas fa-filter', color: '#06b6d4', description: 'Filter items' },
            sort: { title: 'Sort', icon: 'fas fa-sort', color: '#06b6d4', description: 'Sort items' },
            split: { title: 'Split', icon: 'fas fa-cut', color: '#06b6d4', description: 'Split data' },
            
            // Code & Scripts
            script: { title: 'Code', icon: 'fas fa-code', color: '#14b8a6', description: 'Execute code' },
            function: { title: 'Function', icon: 'fas fa-function', color: '#14b8a6', description: 'Call function' },
            python: { title: 'Python', icon: 'fab fa-python', color: '#14b8a6', description: 'Python script' },
            javascript: { title: 'JavaScript', icon: 'fab fa-js', color: '#14b8a6', description: 'JavaScript code' },
            powershell: { title: 'PowerShell', icon: 'fas fa-terminal', color: '#14b8a6', description: 'PowerShell script' },
            bash: { title: 'Bash', icon: 'fas fa-terminal', color: '#14b8a6', description: 'Bash script' },
            'execute-command': { title: 'Execute Command', icon: 'fas fa-server', color: '#14b8a6', description: 'Execute command on host' },
            
            // Cloud & Services
            aws: { title: 'AWS', icon: 'fab fa-aws', color: '#f97316', description: 'AWS service' },
            azure: { title: 'Azure', icon: 'fab fa-microsoft', color: '#f97316', description: 'Azure service' },
            gcp: { title: 'Google Cloud', icon: 'fab fa-google', color: '#f97316', description: 'GCP service' },
            s3: { title: 'S3 Storage', icon: 'fas fa-cloud', color: '#f97316', description: 'S3 operation' },
            docker: { title: 'Docker', icon: 'fab fa-docker', color: '#f97316', description: 'Docker command' },
            kubernetes: { title: 'Kubernetes', icon: 'fas fa-cube', color: '#f97316', description: 'K8s operation' },
            
            // Utilities
            log: { title: 'Log', icon: 'fas fa-file-alt', color: '#64748b', description: 'Log message' },
            notify: { title: 'Notify', icon: 'fas fa-bell', color: '#64748b', description: 'Send notification' },
            template: { title: 'Template', icon: 'fas fa-file-code', color: '#64748b', description: 'Template engine' },
            hash: { title: 'Hash', icon: 'fas fa-key', color: '#64748b', description: 'Hash data' },
            encrypt: { title: 'Encrypt', icon: 'fas fa-lock', color: '#64748b', description: 'Encrypt data' },
            decrypt: { title: 'Decrypt', icon: 'fas fa-unlock', color: '#64748b', description: 'Decrypt data' },
            uuid: { title: 'Generate UUID', icon: 'fas fa-fingerprint', color: '#64748b', description: 'Generate UUID' },
            random: { title: 'Random', icon: 'fas fa-dice', color: '#64748b', description: 'Random value' },
            'date-time': { title: 'Date/Time', icon: 'fas fa-calendar-alt', color: '#64748b', description: 'Date/time operations' },
            regex: { title: 'Regex', icon: 'fas fa-search', color: '#64748b', description: 'Regex match' }
        };
        return configs[type] || { title: type, icon: 'fas fa-circle', color: '#64748b', description: 'Node' };
    }

    attachNodeListeners(node) {
        console.log('[ATTACH LISTENERS] Attaching listeners for node:', node.id);
        const nodeEl = document.getElementById(node.id);
        if (!nodeEl) {
            console.error('[ATTACH LISTENERS] Node element not found:', node.id);
            return;
        }

        // Node dragging - only on header, not on ports or status indicators
        const header = nodeEl.querySelector('.node-header');
        if (header) {
            header.addEventListener('mousedown', (e) => {
                // Don't start drag if clicking on delete button, ports, or status indicator
                if (e.target.classList.contains('node-delete-btn') ||
                    e.target.closest('.node-port') ||
                    e.target.closest('.node-status-indicator')) {
                    return;
                }
                // Don't start drag if we're connecting
                if (this.connecting) return;
                this.startNodeDrag(node.id, e);
            });
        }

        // Double-click handler for webhook/schedule/condition/email/execute-command nodes to open configuration modal
        if (node.type === 'webhook' || node.type === 'schedule' || node.type === 'condition' || node.type === 'email' || node.type === 'execute-command') {
            nodeEl.addEventListener('dblclick', (e) => {
                console.log('[NODE] Double click on node:', node.id, node.type);
                // Don't trigger on delete button, ports, or status indicator
                if (e.target.classList.contains('node-delete-btn') || 
                    e.target.closest('.node-port') ||
                    e.target.closest('.node-delete-btn') ||
                    e.target.closest('.node-status-indicator')) {
                    return;
                }
                e.stopPropagation();
                this.openNodeConfiguration(node);
            });
        }

        // Port connection
        const ports = nodeEl.querySelectorAll('.node-port');
        console.log('[ATTACH LISTENERS] Found', ports.length, 'ports for node', node.id);
        ports.forEach(port => {
            port.addEventListener('mousedown', (e) => {
                console.log('[PORT] Port mousedown:', port.className, port.dataset.portId);
                e.stopPropagation();
                e.preventDefault(); // Prevent node drag
                
                // Only allow connections in edit mode
                if (!this.isEditing) {
                    console.log('[PORT] Cannot create connections in view mode');
                    return;
                }
                
                this.startConnection(e, port);
            });
            
            // Prevent port clicks from triggering node clicks
            port.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            
            // Add hover effects
            port.addEventListener('mouseenter', () => {
                if (this.connecting && port.classList.contains('node-input')) {
                    port.classList.add('connection-target');
                }
            });
            
            port.addEventListener('mouseleave', () => {
                port.classList.remove('connection-target');
            });
        });
        console.log('[ATTACH LISTENERS] Listeners attached for node:', node.id);
    }

    async openNodeConfiguration(node) {
        console.log('[CONFIG] Opening configuration for node:', node.id, node.type);
        if (node.type === 'webhook') {
            // Check if node has a webhook ID stored
            const webhookId = node.data?.webhookId;
            if (webhookId) {
                // Load webhooks and find the one to edit
                await this.loadWebhooks();
                const webhook = this.webhooks.find(w => w.id === webhookId);
                if (webhook) {
                    this.editingWebhook = webhook;
                } else {
                    this.editingWebhook = null;
                }
            } else {
                this.editingWebhook = null;
            }
            this.showWebhookModal = true;
            this.updateView();
            setTimeout(() => {
                const pathInput = document.getElementById('webhook-path');
                if (pathInput) {
                    const updatePreview = () => {
                        const path = pathInput.value || '';
                        const urlPreview = document.getElementById('webhook-url-text');
                        if (urlPreview) {
                            urlPreview.textContent = `${window.location.origin}/api/webhook/${path || '[path]'}`;
                            // Update copy button
                            const copyBtn = urlPreview.parentElement?.querySelector('.btn-copy');
                            if (copyBtn && path) {
                                copyBtn.setAttribute('onclick', `automationInstance.copyWebhookUrl('${path}')`);
                            }
                        }
                        
                        // Update or create path display section
                        let pathDisplaySection = document.querySelector('.webhook-path-display');
                        if (path) {
                            if (!pathDisplaySection) {
                                // Create path display section
                                const formGroup = document.createElement('div');
                                formGroup.className = 'form-group webhook-path-display';
                                formGroup.innerHTML = `
                                    <label>Webhook Path (Direct)</label>
                                    <div style="display: flex; align-items: center; gap: 0.5rem; background: #f8fafc; padding: 0.75rem; border-radius: 6px; border: 1px solid #e2e8f0;">
                                        <code style="flex: 1; margin: 0; font-size: 0.875rem; color: #1e293b; font-weight: 500;">${path}</code>
                                        <button type="button" onclick="navigator.clipboard.writeText('${path}').then(() => { const btn = event.target; btn.innerHTML = '<i class=\\'fas fa-check\\'></i>'; setTimeout(() => btn.innerHTML = '<i class=\\'fas fa-copy\\'></i>', 2000); })" title="Copy Path" style="padding: 0.5rem; background: #6366f1; color: white; border: none; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; min-width: 36px;">
                                            <i class="fas fa-copy"></i>
                                        </button>
                                    </div>
                                `;
                                const urlPreviewGroup = document.getElementById('webhook-url-preview');
                                if (urlPreviewGroup && urlPreviewGroup.parentElement) {
                                    urlPreviewGroup.parentElement.insertBefore(formGroup, urlPreviewGroup);
                                }
                                pathDisplaySection = formGroup;
                            } else {
                                // Update existing path display
                                const codeEl = pathDisplaySection.querySelector('code');
                                const copyBtn = pathDisplaySection.querySelector('button');
                                if (codeEl) codeEl.textContent = path;
                                if (copyBtn) {
                                    copyBtn.setAttribute('onclick', `navigator.clipboard.writeText('${path}').then(() => { const btn = event.target; btn.innerHTML = '<i class=\\'fas fa-check\\'></i>'; setTimeout(() => btn.innerHTML = '<i class=\\'fas fa-copy\\'></i>', 2000); })`);
                                }
                            }
                        } else if (pathDisplaySection) {
                            pathDisplaySection.remove();
                        }
                    };
                    
                    pathInput.addEventListener('input', updatePreview);
                    pathInput.addEventListener('change', updatePreview);
                    // Initial update if path already exists
                    if (pathInput.value) {
                        updatePreview();
                    }
                }
            }, 100);
        } else if (node.type === 'schedule') {
            // Check if node has a scheduler ID stored
            const schedulerId = node.data?.schedulerId;
            if (schedulerId) {
                // Load schedulers and find the one to edit
                await this.loadSchedulers();
                const scheduler = this.schedulers.find(s => s.id === schedulerId);
                if (scheduler) {
                    this.editingScheduler = scheduler;
                } else {
                    this.editingScheduler = null;
                }
            } else {
                this.editingScheduler = null;
            }
            this.showSchedulerModal = true;
            this.updateView();
            setTimeout(() => {
                this.attachSchedulerModalListeners();
            }, 100);
        } else if (node.type === 'execute-command') {
            console.log('[CONFIG] Opening execute command modal');
            this.editingExecuteCommandNode = node;
            this.showExecuteCommandModal = true;
            this.updateView();
        } else if (node.type === 'condition') {
            console.log('[CONFIG] Opening condition modal');
            this.editingConditionNode = node;
            this.showConditionModal = true;
            this.updateView();
        } else if (node.type === 'email') {
            console.log('[CONFIG] Opening email modal');
            this.editingEmailNode = node;
            this.showEmailModal = true;
            this.updateView();
        }
    }

    startNodeDrag(nodeId, e) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (!node) return;

        this.selectedNode = node;
        const nodeEl = document.getElementById(nodeId);
        const rect = nodeEl.getBoundingClientRect();
        const canvasRect = document.getElementById('automation-canvas').getBoundingClientRect();
        
        this.dragOffset = {
            x: (e.clientX - canvasRect.left - this.canvasOffset.x) / this.zoom - node.x,
            y: (e.clientY - canvasRect.top - this.canvasOffset.y) / this.zoom - node.y
        };

        // Track initial mouse position to detect actual dragging vs clicking
        this.dragStartPos = { x: e.clientX, y: e.clientY };
        this.dragStarted = false; // Flag to track if actual dragging has started

        document.addEventListener('mousemove', this.boundOnNodeDrag);
        document.addEventListener('mouseup', this.boundOnNodeDragEnd);
    }

    onNodeDrag(e) {
        if (!this.selectedNode) return;

        // Check if mouse has moved enough to consider it a drag (not just a click)
        if (!this.dragStarted && this.dragStartPos) {
            const dx = Math.abs(e.clientX - this.dragStartPos.x);
            const dy = Math.abs(e.clientY - this.dragStartPos.y);
            // Only start dragging if mouse moved more than 5 pixels
            if (dx > 5 || dy > 5) {
                this.dragging = true;
                this.dragStarted = true;
                
                // Disable transitions during drag for performance
                const nodeEl = document.getElementById(this.selectedNode.id);
                if (nodeEl) {
                    nodeEl.style.transition = 'none';
                }
            } else {
                return; // Still just a click, don't move the node
            }
        }

        if (!this.dragging) return;

        const canvas = document.getElementById('automation-canvas');
        const rect = canvas.getBoundingClientRect();
        
        // Update model data
        this.selectedNode.x = (e.clientX - rect.left - this.canvasOffset.x) / this.zoom - this.dragOffset.x;
        this.selectedNode.y = (e.clientY - rect.top - this.canvasOffset.y) / this.zoom - this.dragOffset.y;
        
        // Use requestAnimationFrame for smooth rendering
        if (this.dragRafId) return;
        
        this.dragRafId = requestAnimationFrame(() => {
            const nodeEl = document.getElementById(this.selectedNode.id);
            if (nodeEl) {
                nodeEl.style.left = this.selectedNode.x + 'px';
                nodeEl.style.top = this.selectedNode.y + 'px';
            }
            
            // Update connections efficiently
            this.renderConnections();
            this.dragRafId = null;
        });
    }

    async onNodeDragEnd() {
        const wasDragging = this.dragging;
        this.dragging = false;
        this.dragStarted = false;
        this.dragStartPos = null;
        
        if (wasDragging && this.selectedNode) {
            // Re-enable transitions
            const nodeEl = document.getElementById(this.selectedNode.id);
            if (nodeEl) {
                nodeEl.style.transition = '';
            }
            
            // Force re-render connections after drag ends to ensure they're correct
            requestAnimationFrame(() => {
                this.renderConnections();
            });
            
            // Save after drag ends
            await this.saveCurrentWorkflow();
        }
        
        this.selectedNode = null;
        document.removeEventListener('mousemove', this.boundOnNodeDrag);
        document.removeEventListener('mouseup', this.boundOnNodeDragEnd);
    }

    startConnection(e, portEl) {
        console.log('[CONNECTION] startConnection called', { portEl: portEl.className });
        e.stopPropagation();
        
        // Only allow connections in edit mode
        if (!this.isEditing) {
            console.log('[CONNECTION] Cannot create connections in view mode');
            return;
        }
        
        const portType = portEl.classList.contains('node-output') ? 'output' : 'input';
        
        console.log('[CONNECTION] Port type:', portType);
        
        // Only allow starting connections from output ports
        if (portType !== 'output') {
            console.log('[CONNECTION] Cannot start from input port');
            return;
        }
        
        this.connecting = true;
        this.connectionStart = {
            nodeId: portEl.dataset.nodeId,
            portId: portEl.dataset.portId,
            element: portEl
        };
        
        console.log('[CONNECTION] Connection started:', {
            nodeId: this.connectionStart.nodeId,
            portId: this.connectionStart.portId
        });
        
        // Add visual feedback
        portEl.classList.add('connecting');
        document.body.style.cursor = 'crosshair';
        
        // Add mouse move and mouse up listeners
        const canvas = document.getElementById('automation-canvas');
        if (canvas) {
            console.log('[CONNECTION] Adding event listeners to canvas');
            canvas.addEventListener('mousemove', this.boundOnConnectionMove);
            canvas.addEventListener('mouseup', this.boundOnConnectionEnd);
        } else {
            console.error('[CONNECTION] Canvas not found!');
        }
    }

    onConnectionMove(e) {
        if (!this.connecting || !this.connectionStart) return;
        
        const canvas = document.getElementById('automation-canvas');
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        this.tempConnectionEnd = {
            x: (e.clientX - rect.left - this.canvasOffset.x) / this.zoom,
            y: (e.clientY - rect.top - this.canvasOffset.y) / this.zoom
        };
        
        this.renderConnections();
        this.renderTempConnection();
    }

    onConnectionEnd(e) {
        console.log('[CONNECTION] onConnectionEnd called');
        
        if (!this.connecting || !this.connectionStart) {
            console.log('[CONNECTION] Not connecting or no connection start, cleaning up');
            this.cleanupConnection();
            return;
        }
        
        e.preventDefault();
        e.stopPropagation();
        
        // Find the target element under the mouse
        const element = document.elementFromPoint(e.clientX, e.clientY);
        if (!element) {
            console.log('[CONNECTION] No element found at drop point');
            this.cleanupConnection();
            return;
        }

        console.log('[CONNECTION] Element at drop point:', element.className, element.tagName);

        // Try to find a target port or node
        // Check if the element itself is a port, or if it's inside a port (like port-circle)
        let targetPort = element.closest('.node-port');
        
        // If closest didn't work and we're on a port-circle or port-label, try parent directly
        if (!targetPort && (element.classList.contains('port-circle') || element.classList.contains('port-label'))) {
            // port-circle is a direct child of .node-port, so parent should be the port
            targetPort = element.parentElement;
            // Verify it's actually a port
            if (targetPort && !targetPort.classList.contains('node-port')) {
                // If parent isn't the port, try closest from parent
                targetPort = targetPort.closest('.node-port');
            }
        }
        
        const targetNode = element.closest('.automation-node');

        // If dropped on a node but not a port, try to find the first input port
        if (!targetPort && targetNode) {
            console.log('[CONNECTION] Dropped on node body, looking for input port');
            targetPort = targetNode.querySelector('.node-port.node-input');
            console.log('[CONNECTION] Found node, looking for input port:', targetPort ? 'found' : 'not found');
            
            // If still no port found, check if it's a trigger node
            if (!targetPort) {
                const nodeData = this.nodes.find(n => n.id === targetNode.id);
                if (nodeData && nodeData.category === 'trigger') {
                    console.log('[CONNECTION] Dropped on trigger node - trigger nodes have no input ports');
                    const toast = document.createElement('div');
                    toast.textContent = 'Cannot connect to trigger node - trigger nodes have no input ports';
                    toast.style.cssText = `
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        background: #ef4444;
                        color: white;
                        padding: 12px 20px;
                        border-radius: 6px;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                        z-index: 10000;
                        font-size: 14px;
                        opacity: 0;
                        transition: opacity 0.3s;
                    `;
                    document.body.appendChild(toast);
                    requestAnimationFrame(() => toast.style.opacity = '1');
                    setTimeout(() => {
                        toast.style.opacity = '0';
                        setTimeout(() => toast.remove(), 300);
                    }, 3000);
                }
            }
        }

        // If dropped on a port that is NOT an input (e.g. output port), try to find the input port on the same node
        // This helps when users drop "near" the node or on the wrong port but intend to connect to the node
        if (targetPort && !targetPort.classList.contains('node-input')) {
             console.log('[CONNECTION] Dropped on non-input port, looking for input port on same node');
             const node = targetPort.closest('.automation-node');
             if (node) {
                 console.log('[CONNECTION] Found node:', node.id);
                 
                 // Debug: Check all ports in the node
                 const allPorts = node.querySelectorAll('.node-port');
                 console.log('[CONNECTION] All ports in node:', Array.from(allPorts).map(p => ({
                     className: p.className,
                     portId: p.dataset.portId,
                     isInput: p.classList.contains('node-input'),
                     isOutput: p.classList.contains('node-output')
                 })));
                 
                 // Find input port - must be a .node-port with .node-input class (not .node-inputs container)
                 const inputPort = node.querySelector('.node-port.node-input');
                 console.log('[CONNECTION] Input port search result:', inputPort ? {
                     className: inputPort.className,
                     portId: inputPort.dataset.portId,
                     nodeId: inputPort.dataset.nodeId
                 } : 'null');
                 
                 // Also check the node data to see if it should have inputs
                 const nodeData = this.nodes.find(n => n.id === node.id);
                 console.log('[CONNECTION] Node data:', nodeData ? {
                     id: nodeData.id,
                     type: nodeData.type,
                     category: nodeData.category,
                     inputs: nodeData.inputs,
                     inputsCount: nodeData.inputs?.length || 0
                 } : 'null');
                 
                 if (inputPort) {
                     console.log('[CONNECTION] Switching from output port to input port');
                     targetPort = inputPort;
                 } else {
                     console.log('[CONNECTION] No input port found on this node (might be a trigger node)');
                     // If this is a trigger node with no inputs, we can't connect to it
                     // Clear the target port so the connection fails gracefully
                     targetPort = null;
                     
                     // Show a helpful message
                     const nodeData = this.nodes.find(n => n.id === node.id);
                     if (nodeData && nodeData.category === 'trigger') {
                         console.log('[CONNECTION] Cannot connect to trigger node - trigger nodes have no input ports');
                         // Optionally show a toast notification
                         const toast = document.createElement('div');
                         toast.textContent = 'Cannot connect to trigger node - trigger nodes have no input ports';
                         toast.style.cssText = `
                             position: fixed;
                             top: 20px;
                             right: 20px;
                             background: #ef4444;
                             color: white;
                             padding: 12px 20px;
                             border-radius: 6px;
                             box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                             z-index: 10000;
                             font-size: 14px;
                             opacity: 0;
                             transition: opacity 0.3s;
                         `;
                         document.body.appendChild(toast);
                         requestAnimationFrame(() => toast.style.opacity = '1');
                         setTimeout(() => {
                             toast.style.opacity = '0';
                             setTimeout(() => toast.remove(), 300);
                         }, 3000);
                     }
                 }
             } else {
                 console.log('[CONNECTION] Could not find parent node');
             }
        }
        
        console.log('[CONNECTION] Final target port:', targetPort ? {
            className: targetPort.className,
            portId: targetPort.dataset.portId,
            nodeId: targetPort.dataset.nodeId,
            isInput: targetPort.classList.contains('node-input'),
            element: targetPort
        } : 'null');
        
        if (targetPort && targetPort.classList.contains('node-input')) {
            const targetNodeId = targetPort.dataset.nodeId;
            const targetPortId = targetPort.dataset.portId;
            const sourceNodeId = this.connectionStart.nodeId;
            const sourcePortId = this.connectionStart.portId;
            
            console.log('[CONNECTION] Connection attempt:', {
                source: { nodeId: sourceNodeId, portId: sourcePortId },
                target: { nodeId: targetNodeId, portId: targetPortId }
            });
            
            // Don't allow self-connections
            if (sourceNodeId !== targetNodeId) {
                // Check if connection already exists
                const exists = this.connections.some(c => 
                    c.sourceNodeId === sourceNodeId && 
                    c.sourcePortId === sourcePortId &&
                    c.targetNodeId === targetNodeId &&
                    c.targetPortId === targetPortId
                );
                
                if (!exists) {
                    console.log('[CONNECTION] Creating new connection');
                    // Create new connection
                    const newConnection = {
                        id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        sourceNodeId: sourceNodeId,
                        sourcePortId: sourcePortId,
                        targetNodeId: targetNodeId,
                        targetPortId: targetPortId
                    };
                    
                    this.connections.push(newConnection);
                    console.log('[CONNECTION] Connection added, total connections:', this.connections.length);
                    console.log('[CONNECTION] All connections:', this.connections.map(c => ({
                        id: c.id,
                        from: `${c.sourceNodeId}:${c.sourcePortId}`,
                        to: `${c.targetNodeId}:${c.targetPortId}`
                    })));
                    
                    // Render immediately to show the link
                    this.renderConnections();
                    
                    // Save and show feedback
                    this.saveCurrentWorkflow().then(() => {
                        console.log('[CONNECTION] Connection saved successfully');
                        // Optional: Add a subtle visual cue that save completed
                        const saveIndicator = document.createElement('div');
                        saveIndicator.className = 'save-indicator';
                        saveIndicator.textContent = 'Saved';
                        saveIndicator.style.cssText = `
                            position: fixed;
                            bottom: 20px;
                            right: 20px;
                            background: #10b981;
                            color: white;
                            padding: 8px 16px;
                            border-radius: 4px;
                            font-size: 14px;
                            opacity: 0;
                            transition: opacity 0.3s;
                            z-index: 1000;
                            pointer-events: none;
                        `;
                        document.body.appendChild(saveIndicator);
                        
                        // Fade in
                        requestAnimationFrame(() => saveIndicator.style.opacity = '1');
                        
                        // Fade out and remove
                        setTimeout(() => {
                            saveIndicator.style.opacity = '0';
                            setTimeout(() => saveIndicator.remove(), 300);
                        }, 2000);
                    }).catch(err => {
                        console.error('[CONNECTION] Auto-save failed:', err);
                    });
                } else {
                    console.log('[CONNECTION] Connection already exists, skipping');
                }
            } else {
                console.log('[CONNECTION] Self-connection not allowed');
            }
        } else {
            console.log('[CONNECTION] No valid input port found at drop point');
        }
        
        // Clean up
        this.cleanupConnection();
    }

    cleanupConnection() {
        this.connecting = false;
        this.connectionStart = null;
        this.tempConnectionEnd = null;
        document.body.style.cursor = '';
        
        // Remove visual feedback
        document.querySelectorAll('.node-port.connecting').forEach(port => {
            port.classList.remove('connecting');
        });
        
        // Remove temporary connection line
        const svg = document.getElementById('connections-layer');
        if (svg) {
            const tempPath = svg.querySelector('.temp-connection');
            if (tempPath) {
                tempPath.remove();
            }
        }
        
        // Remove event listeners
        document.removeEventListener('mousemove', this.boundOnConnectionMove);
        document.removeEventListener('mouseup', this.boundOnConnectionEnd);
    }

    renderTempConnection() {
        if (!this.connectionStart || !this.tempConnectionEnd) {
            return;
        }
        
        const svg = document.getElementById('connections-layer');
        if (!svg) {
            return;
        }
        
        // Get or create the group
        let group = document.getElementById('connections-group');
        if (!group) {
            group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.id = 'connections-group';
            svg.appendChild(group);
            // Apply current transform
            group.setAttribute('transform', `translate(${this.canvasOffset.x}, ${this.canvasOffset.y}) scale(${this.zoom})`);
        }
        
        // Remove existing temp connection
        const existing = group.querySelector('.temp-connection') || svg.querySelector('.temp-connection');
        if (existing) {
            existing.remove();
        }
        
        // Get source port position
        const sourcePort = this.connectionStart.element;
        const sourceNode = this.nodes.find(n => n.id === this.connectionStart.nodeId);
        if (!sourceNode || !sourcePort) {
            return;
        }
        
        const sourceRect = sourcePort.getBoundingClientRect();
        const canvasRect = document.getElementById('automation-canvas').getBoundingClientRect();
        const sourceX = (sourceRect.left + sourceRect.width / 2 - canvasRect.left - this.canvasOffset.x) / this.zoom;
        const sourceY = (sourceRect.top + sourceRect.height / 2 - canvasRect.top - this.canvasOffset.y) / this.zoom;
        
        // Create temporary connection path
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const pathData = this.createBezierPath(sourceX, sourceY, this.tempConnectionEnd.x, this.tempConnectionEnd.y);
        path.setAttribute('d', pathData);
        path.setAttribute('stroke', '#6366f1');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('stroke-dasharray', '5,5');
        path.setAttribute('fill', 'none');
        path.setAttribute('class', 'temp-connection');
        path.setAttribute('opacity', '0.6');
        
        // Append to GROUP, not SVG
        group.appendChild(path);
    }

    renderConnections() {
        // console.log('[RENDER CONNECTIONS] Starting, connections:', this.connections.length);
        const svg = document.getElementById('connections-layer');
        if (!svg) return;

        // Create or get the group for transforming connections
        let group = document.getElementById('connections-group');
        if (!group) {
            group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.id = 'connections-group';
            svg.appendChild(group);
            
            // Move any existing paths into the group
            const existingPaths = Array.from(svg.querySelectorAll('.connection-line'));
            existingPaths.forEach(path => group.appendChild(path));
        }

        // Apply transform to the GROUP, not the SVG
        group.setAttribute('transform', `translate(${this.canvasOffset.x}, ${this.canvasOffset.y}) scale(${this.zoom})`);
        
        // Reset SVG transform
        svg.style.transform = 'none';
        svg.style.transformOrigin = '0 0';
        svg.removeAttribute('viewBox');
        svg.removeAttribute('preserveAspectRatio');
        
        // Ensure SVG fills the canvas container
        const canvas = document.getElementById('automation-canvas');
        if (canvas) {
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            svg.style.width = '100%';
            svg.style.height = '100%';
            svg.style.position = 'absolute';
            svg.style.top = '0';
            svg.style.left = '0';
            svg.style.overflow = 'visible';
        }

        // Map current connections by ID for diffing
        const connectionMap = new Map();
        this.connections.forEach(conn => connectionMap.set(conn.id, conn));

        // 1. Update or remove existing connection paths (inside group)
        const existingPaths = Array.from(group.querySelectorAll('.connection-line'));
        existingPaths.forEach(path => {
            const id = path.getAttribute('data-connection-id');
            const conn = connectionMap.get(id);
            
            if (conn) {
                // Update existing connection path
                const pathData = this.getConnectionPathData(conn);
                if (pathData) {
                    path.setAttribute('d', pathData);
                }
                connectionMap.delete(id); // Mark as processed
            } else {
                // Remove connection that no longer exists
                path.remove();
            }
        });

        // 2. Create new paths for remaining connections
        connectionMap.forEach(conn => {
            const path = this.createConnectionPath(conn);
            if (path && path.getAttribute('d')) {
                group.appendChild(path); // Append to GROUP
            }
        });

        // 3. Handle temp connection (ensure it's on top and in group)
        const tempConnection = svg.querySelector('.temp-connection');
        if (tempConnection) {
            if (tempConnection.parentElement !== group) {
                group.appendChild(tempConnection);
            }
            // Ensure it's last (on top)
            group.appendChild(tempConnection);
        }
    }

    createConnectionPath(connection) {
        // console.log('[CREATE PATH] Creating path for connection:', connection);
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        
        const pathData = this.getConnectionPathData(connection);
        
        if (!pathData) {
            return path; // Return empty path if calculation failed
        }

        path.setAttribute('d', pathData);
        path.setAttribute('stroke', '#6366f1');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        path.setAttribute('class', 'connection-line');
        path.setAttribute('data-connection-id', connection.id);
        
        // Make connections clickable for deletion (only in edit mode)
        if (this.isEditing) {
            path.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Delete this connection?')) {
                    this.connections = this.connections.filter(c => c.id !== connection.id);
                    this.saveCurrentWorkflow();
                    this.renderConnections();
                }
            });
        }

        return path;
    }

    getConnectionPathData(connection) {
        // console.log('[GET PATH] Connection:', connection.id, 'from', connection.sourceNodeId, 'to', connection.targetNodeId);
        
        const sourceNodeEl = document.getElementById(connection.sourceNodeId);
        const targetNodeEl = document.getElementById(connection.targetNodeId);
        
        if (!sourceNodeEl || !targetNodeEl) {
            // console.warn('[GET PATH] Nodes not found:', connection.sourceNodeId, connection.targetNodeId);
            return null;
        }

        // Find the port circle element (more reliable than just the port container)
        const sourcePort = sourceNodeEl.querySelector(`[data-port-id="${connection.sourcePortId}"] .port-circle`) || 
                          sourceNodeEl.querySelector(`[data-port-id="${connection.sourcePortId}"]`);
        const targetPort = targetNodeEl.querySelector(`[data-port-id="${connection.targetPortId}"] .port-circle`) || 
                          targetNodeEl.querySelector(`[data-port-id="${connection.targetPortId}"]`);
        
        if (!sourcePort || !targetPort) {
            // console.warn('[GET PATH] Ports not found:', connection.sourcePortId, connection.targetPortId);
            return null;
        }
        
        // console.log('[GET PATH] Found ports for connection:', connection.id);

        const canvas = document.getElementById('automation-canvas');
        if (!canvas) return null;
        
        // Use requestAnimationFrame to ensure DOM is fully updated
        const canvasRect = canvas.getBoundingClientRect();
        const sourcePortRect = sourcePort.getBoundingClientRect();
        const targetPortRect = targetPort.getBoundingClientRect();
        
        // Check if rects are valid (have dimensions and are in viewport)
        if (sourcePortRect.width === 0 || sourcePortRect.height === 0 || 
            targetPortRect.width === 0 || targetPortRect.height === 0) {
            return null; // Ports not yet laid out
        }
        
        // Calculate positions relative to canvas, accounting for transform
        // The SVG coordinates are in the canvas coordinate space (before transform)
        const sourceX = (sourcePortRect.left + sourcePortRect.width / 2 - canvasRect.left - this.canvasOffset.x) / this.zoom;
        const sourceY = (sourcePortRect.top + sourcePortRect.height / 2 - canvasRect.top - this.canvasOffset.y) / this.zoom;
        
        const targetX = (targetPortRect.left + targetPortRect.width / 2 - canvasRect.left - this.canvasOffset.x) / this.zoom;
        const targetY = (targetPortRect.top + targetPortRect.height / 2 - canvasRect.top - this.canvasOffset.y) / this.zoom;
        
        // Validate coordinates are reasonable (not NaN or Infinity)
        if (!isFinite(sourceX) || !isFinite(sourceY) || !isFinite(targetX) || !isFinite(targetY)) {
            // console.warn('[CONNECTION] Invalid coordinates for connection:', connection.id, { sourceX, sourceY, targetX, targetY });
            return null;
        }

        const pathData = this.createBezierPath(sourceX, sourceY, targetX, targetY);
        // console.log('[GET PATH] Created path:', pathData);
        return pathData;
    }

    createBezierPath(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const cp1x = x1 + dx * 0.5;
        const cp2x = x1 + dx * 0.5;
        return `M ${x1} ${y1} C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x2} ${y2}`;
    }

    async deleteNode(nodeId) {
        // Only allow deletion in edit mode
        if (!this.isEditing) {
            return;
        }
        
        // Find the node before deleting it
        const node = this.nodes.find(n => n.id === nodeId);
        
        // If it's a webhook node, delete the associated webhook from database
        if (node && node.type === 'webhook' && node.data?.webhookId) {
            try {
                const webhookId = node.data.webhookId;
                console.log('[DELETE NODE] Deleting associated webhook:', webhookId);
                
                const response = await api.fetch(`/api/automation/webhooks/delete?id=${webhookId}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    console.log('[DELETE NODE] Webhook deleted successfully');
                    // Reload webhooks list to reflect the deletion
                    await this.loadWebhooks();
                } else {
                    console.warn('[DELETE NODE] Failed to delete webhook, but continuing with node deletion');
                }
            } catch (error) {
                console.error('[DELETE NODE] Error deleting webhook:', error);
                // Continue with node deletion even if webhook deletion fails
            }
        }
        
        // If it's a schedule node, delete the associated scheduler from database
        if (node && node.type === 'schedule' && node.data?.schedulerId) {
            try {
                const schedulerId = node.data.schedulerId;
                console.log('[DELETE NODE] Deleting associated scheduler:', schedulerId);
                
                const response = await api.fetch(`/api/automation/schedulers/delete?id=${schedulerId}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    console.log('[DELETE NODE] Scheduler deleted successfully');
                    // Reload schedulers list to reflect the deletion
                    await this.loadSchedulers();
                } else {
                    console.warn('[DELETE NODE] Failed to delete scheduler, but continuing with node deletion');
                }
            } catch (error) {
                console.error('[DELETE NODE] Error deleting scheduler:', error);
                // Continue with node deletion even if scheduler deletion fails
            }
        }
        
        // Remove the node and its connections
        this.nodes = this.nodes.filter(n => n.id !== nodeId);
        this.connections = this.connections.filter(c => 
            c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId
        );
        await this.saveCurrentWorkflow();
        await this.renderNodes();
        this.renderConnections();
        this.updateWorkflowsGrid();
    }

    async zoomIn() {
        this.zoom = Math.min(this.zoom + 0.1, 2);
        this.updateCanvasTransform();
        this.updateZoomIndicator();
        await this.saveCurrentWorkflow();
    }

    async zoomOut() {
        this.zoom = Math.max(this.zoom - 0.1, 0.5);
        this.updateCanvasTransform();
        this.updateZoomIndicator();
        await this.saveCurrentWorkflow();
    }

    async resetZoom() {
        this.zoom = 1;
        this.canvasOffset = { x: 0, y: 0 };
        this.updateCanvasTransform();
        this.updateZoomIndicator();
        await this.saveCurrentWorkflow();
    }

    async fitToScreen() {
        if (this.nodes.length === 0) {
            this.resetZoom();
            return;
        }

        const padding = 50; // pixels padding around the content
        
        // Calculate bounding box of all nodes
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        this.nodes.forEach(node => {
            let width = 200; // Default approximation
            let height = 100;
            
            const el = document.getElementById(node.id);
            if (el) {
                width = el.offsetWidth || width;
                height = el.offsetHeight || height;
            }
            
            if (node.x < minX) minX = node.x;
            if (node.y < minY) minY = node.y;
            if (node.x + width > maxX) maxX = node.x + width;
            if (node.y + height > maxY) maxY = node.y + height;
        });
        
        if (minX === Infinity) return;
        
        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        
        // Get container dimensions
        const container = document.getElementById('automation-canvas');
        if (!container) return;
        
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // Calculate zoom to fit
        const availableWidth = containerWidth - (padding * 2);
        const availableHeight = containerHeight - (padding * 2);
        
        let newZoom = Math.min(availableWidth / contentWidth, availableHeight / contentHeight);
        
        // Clamp zoom to reasonable limits (e.g. don't zoom in too much if content is small)
        newZoom = Math.min(Math.max(newZoom, 0.1), 1); 
        
        // Calculate center of content
        const contentCenterX = minX + contentWidth / 2;
        const contentCenterY = minY + contentHeight / 2;
        
        // Calculate center of container
        const containerCenterX = containerWidth / 2;
        const containerCenterY = containerHeight / 2;
        
        // Calculate offset to center content
        // Offset = CenterTarget - CenterSource * Zoom
        this.zoom = newZoom;
        this.canvasOffset = {
            x: containerCenterX - contentCenterX * newZoom,
            y: containerCenterY - contentCenterY * newZoom
        };
        
        this.updateCanvasTransform();
        this.updateZoomIndicator();
        await this.saveCurrentWorkflow();
    }

    updateZoomIndicator() {
        const indicator = document.getElementById('zoom-indicator');
        if (indicator) {
            indicator.textContent = `${Math.round(this.zoom * 100)}%`;
        }
    }

    renderWorkflowsGrid() {
        if (!this.workflows || this.workflows.length === 0) {
            return `
                <div class="workflows-empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-project-diagram"></i>
                    </div>
                    <h2>No Workflows Yet</h2>
                    <p>Create your first automation workflow to get started</p>
                    <button class="btn btn-primary" onclick="automationInstance.createNewWorkflow()">
                        <i class="fas fa-plus"></i> Create Workflow
                    </button>
                </div>
            `;
        }

        return this.workflows.map(workflow => `
            <div class="workflow-card" onclick="automationInstance.openWorkflow('${workflow.id}')">
                <div class="workflow-card-header">
                    <div class="workflow-card-icon">
                        <i class="fas fa-project-diagram"></i>
                    </div>
                    <div class="workflow-card-actions">
                        <button class="workflow-card-action" onclick="event.stopPropagation(); automationInstance.renameWorkflow('${workflow.id}')" title="Rename">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="workflow-card-action" onclick="event.stopPropagation(); automationInstance.deleteWorkflow('${workflow.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="workflow-card-body">
                    <h3 class="workflow-card-name">${workflow.name}</h3>
                    <div class="workflow-card-stats">
                        <span class="workflow-stat">
                            <i class="fas fa-puzzle-piece"></i>
                            ${workflow.nodeCount || 0} nodes
                        </span>
                        <span class="workflow-stat">
                            <i class="fas fa-link"></i>
                            ${workflow.connectionCount || 0} connections
                        </span>
                    </div>
                </div>
                <div class="workflow-card-footer">
                    <span class="workflow-card-date">Updated ${this.formatDate(workflow.updatedAt || workflow.createdAt)}</span>
                    <button class="workflow-card-open">
                        Open <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderWorkflowsList() {
        if (this.workflows.length === 0) {
            return `
                <div class="workflows-empty">
                    <i class="fas fa-inbox"></i>
                    <p>No workflows yet</p>
                    <p class="workflows-empty-hint">Click + to create one</p>
                </div>
            `;
        }
        
        return this.workflows.map(workflow => `
            <div class="workflow-item ${workflow.id === this.currentWorkflowId ? 'active' : ''}" 
                 onclick="automationInstance.switchWorkflow('${workflow.id}')">
                <div class="workflow-item-content">
                    <div class="workflow-item-icon">
                        <i class="fas fa-project-diagram"></i>
                    </div>
                    <div class="workflow-item-info">
                        <div class="workflow-item-name">${workflow.name}</div>
                        <div class="workflow-item-meta">
                            ${workflow.nodes?.length || 0} nodes • ${this.formatDate(workflow.updatedAt || workflow.createdAt)}
                        </div>
                    </div>
                </div>
                <div class="workflow-item-actions">
                    <button class="workflow-action-btn" onclick="event.stopPropagation(); automationInstance.renameWorkflow('${workflow.id}')" title="Rename">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="workflow-action-btn" onclick="event.stopPropagation(); automationInstance.deleteWorkflow('${workflow.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    async loadWorkflows() {
        try {
            const response = await api.fetch('/api/automation/workflows');
            
            if (!response.ok) {
                throw new Error('Failed to load workflows');
            }
            
            const workflowsData = await response.json();
            this.workflows = Array.isArray(workflowsData) ? workflowsData : [];
            
            console.log('Loaded workflows:', this.workflows.length, this.workflows);
            
            // Update the grid if we're in list view
            if (this.viewMode === 'list') {
                this.updateWorkflowsGrid();
            }
        } catch (error) {
            console.error('Error loading workflows:', error);
            this.workflows = [];
            // Still update grid to show empty state
            if (this.viewMode === 'list') {
                this.updateWorkflowsGrid();
            }
        }
    }

    async saveWorkflows() {
        // This method is kept for compatibility but workflows are saved individually
        // No bulk save needed
    }

    async createNewWorkflow() {
        try {
            // Ensure workflows array is initialized
            if (!this.workflows) {
                this.workflows = [];
            }
            
            // Reload workflows list to get accurate count
            await this.loadWorkflows();
            
            const response = await api.fetch('/api/automation/workflows', {
                method: 'POST',
                body: JSON.stringify({
                    name: `Workflow ${(this.workflows?.length || 0) + 1}`,
                    nodes: [],
                    connections: [],
                    canvasOffsetX: 0,
                    canvasOffsetY: 0,
                    zoom: 1
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to create workflow');
            }
            
            const workflow = await response.json();
            if (!this.workflows) {
                this.workflows = [];
            }
            this.workflows.push(workflow);
            this.openWorkflow(workflow.id);
        } catch (error) {
            console.error('Error creating workflow:', error);
            alert('Failed to create workflow. Please try again.');
        }
    }

    async openWorkflow(workflowId, tab = 'canvas') {
        console.log('[OPEN WORKFLOW] Opening workflow:', workflowId, 'tab:', tab);
        
        // If already on this workflow and just switching tabs, use switchTab instead
        if (this.currentWorkflowId === workflowId && this.viewMode === 'workflow' && this.workflowTab !== tab) {
            console.log('[OPEN WORKFLOW] Already on workflow, switching tab only');
            this.switchTab(tab);
            return;
        }
        
        // Save current workflow before switching
        const previousWorkflowId = this.currentWorkflowId;
        const previousViewMode = this.viewMode;
        
        if (previousWorkflowId && previousWorkflowId !== workflowId && previousViewMode === 'workflow') {
            console.log('[OPEN WORKFLOW] Saving current workflow before switch');
            await this.saveCurrentWorkflow();
        }
        
        // Switch to workflow view immediately to prevent flashing list view
        this.currentWorkflowId = workflowId;
        this.viewMode = 'workflow';
        this.workflowTab = tab; // Set the tab immediately
        this.isEditing = false;
        
        // Update URL with workflow ID and tab
        window.location.hash = `automation/workflow/${workflowId}/${tab}`;
        
        // Show loading state immediately
        const pageContent = document.getElementById('page-content');
        if (pageContent) {
            pageContent.innerHTML = `
                <div class="automation-page">
                    <div class="automation-loading">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Loading workflow...</p>
                    </div>
                </div>
            `;
        }
        
        try {
            const response = await api.fetch(`/api/automation/workflows/get?id=${workflowId}`);
            
            if (!response.ok) {
                throw new Error('Failed to load workflow');
            }
            
            const data = await response.json();
            const workflow = data.workflow;
            
            console.log('[OPEN WORKFLOW] Loaded workflow data:', {
                workflowId: workflow.id,
                workflowName: workflow.name,
                nodesCount: data.nodes?.length || 0,
                connectionsCount: data.connections?.length || 0
            });
            
            // Update or add workflow to workflows array so getCurrentWorkflow() can find it
            const existingIndex = this.workflows.findIndex(w => w.id === workflow.id);
            if (existingIndex >= 0) {
                // Update existing workflow
                this.workflows[existingIndex] = workflow;
            } else {
                // Add new workflow to array
                this.workflows.push(workflow);
            }
            
            // URL hash already set earlier with tab included, don't update it again
            
            // Convert database nodes to frontend format
            this.nodes = (data.nodes || []).map(node => ({
                id: node.id,
                type: node.type,
                category: node.category,
                x: node.x,
                y: node.y,
                width: node.width,
                height: node.height,
                data: node.data ? (typeof node.data === 'string' ? JSON.parse(node.data) : node.data) : {},
                inputs: node.inputs || [],
                outputs: node.outputs || [],
                selected: false
            }));
            
            console.log('[OPEN WORKFLOW] Loaded nodes:', this.nodes.length);
            console.log('[OPEN WORKFLOW] Nodes details:', this.nodes.map(n => ({ id: n.id, type: n.type })));
            
            // Convert database connections to frontend format
            this.connections = (data.connections || []).map(conn => ({
                id: conn.id,
                sourceNodeId: conn.sourceNodeId,
                sourcePortId: conn.sourcePortId,
                targetNodeId: conn.targetNodeId,
                targetPortId: conn.targetPortId
            }));
            
            console.log('[OPEN WORKFLOW] Loaded connections:', this.connections.length);
            
            this.canvasOffset = { x: workflow.canvasOffsetX || 0, y: workflow.canvasOffsetY || 0 };
            this.zoom = workflow.zoom || 1;
            this.workflowTab = tab; // Set to requested tab
            
            // Load webhooks and schedulers
            await this.loadWebhooks();
            await this.loadSchedulers();
            
            // Load executions and stats
            await this.loadExecutions();
            await this.loadExecutionStats();
            
            // Re-render the page with actual content
            if (pageContent) {
                pageContent.innerHTML = this.render();
                this.mount();
            }
            
            console.log('[OPEN WORKFLOW] Workflow opened successfully');
        } catch (error) {
            console.error('[OPEN WORKFLOW] Error loading workflow:', error);
            alert('Failed to load workflow. Please try again.');
            // Go back to list view on error
            this.backToList();
        }
    }

    async backToList() {
        // Clear autosave interval when leaving workflow view
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
        
        // Save current workflow before leaving
        if (this.currentWorkflowId && this.isEditing) {
            await this.saveCurrentWorkflow();
        }
        
        this.viewMode = 'list';
        this.currentWorkflowId = null;
        this.workflowTab = 'canvas'; // Reset to default tab
        this.isEditing = false;
        
        // Update URL hash
        window.location.hash = 'automation';
        
        // Reload workflows list
        await this.loadWorkflows();
        
        // Re-render the page
        const pageContent = document.getElementById('page-content');
        if (pageContent) {
            pageContent.innerHTML = this.render();
            this.mount();
        }
    }

    switchWorkflow(workflowId) {
        // Legacy method - redirects to openWorkflow
        this.openWorkflow(workflowId);
    }

    async saveCurrentWorkflow() {
        if (!this.currentWorkflowId) {
            console.log('[AUTOSAVE] No current workflow ID, skipping save');
            return;
        }
        
        const workflow = this.getCurrentWorkflow();
        if (!workflow) {
            console.log('[AUTOSAVE] No workflow found in local list, skipping save');
            // Clear autosave interval if workflow doesn't exist locally
            if (this.autoSaveInterval) {
                clearInterval(this.autoSaveInterval);
                this.autoSaveInterval = null;
            }
            return;
        }
        
        try {
            console.log('[AUTOSAVE] Starting save for workflow:', this.currentWorkflowId);
            console.log('[AUTOSAVE] Current nodes count:', this.nodes.length);
            console.log('[AUTOSAVE] Current connections count:', this.connections.length);
            console.log('[AUTOSAVE] Nodes:', this.nodes.map(n => ({ id: n.id, type: n.type, x: n.x, y: n.y })));
            
            // Convert nodes to request format
            const nodes = this.nodes.map(node => ({
                id: node.id,
                type: node.type,
                category: node.category,
                x: node.x,
                y: node.y,
                width: node.width,
                height: node.height,
                data: node.data || {},
                inputs: node.inputs || [],
                outputs: node.outputs || []
            }));
            
            console.log('[AUTOSAVE] Prepared nodes for save:', nodes.length);
            console.log('[AUTOSAVE] Prepared nodes:', nodes.map(n => ({ id: n.id, type: n.type })));
            
            // Convert connections to request format
            const connections = this.connections.map(conn => ({
                id: conn.id,
                sourceNodeId: conn.sourceNodeId,
                sourcePortId: conn.sourcePortId,
                targetNodeId: conn.targetNodeId,
                targetPortId: conn.targetPortId
            }));
            
            console.log('[AUTOSAVE] Prepared connections for save:', connections.length);
            
            const payload = {
                name: workflow.name,
                nodes: nodes,
                connections: connections,
                canvasOffsetX: this.canvasOffset.x,
                canvasOffsetY: this.canvasOffset.y,
                zoom: this.zoom
            };
            
            console.log('[AUTOSAVE] Sending payload:', {
                name: payload.name,
                nodesCount: payload.nodes.length,
                connectionsCount: payload.connections.length,
                canvasOffset: { x: payload.canvasOffsetX, y: payload.canvasOffsetY },
                zoom: payload.zoom
            });
            
            const response = await api.fetch(`/api/automation/workflows/update?id=${this.currentWorkflowId}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('[AUTOSAVE] Save failed:', response.status, errorText);
                
                // If workflow doesn't exist, clear autosave and reset state
                if (response.status === 404 || response.status === 500 || errorText.includes('does not exist')) {
                    console.log('[AUTOSAVE] Workflow no longer exists, clearing autosave and resetting state');
                    if (this.autoSaveInterval) {
                        clearInterval(this.autoSaveInterval);
                        this.autoSaveInterval = null;
                    }
                    // Reset to list view if workflow was deleted
                    if (this.viewMode === 'workflow') {
                        this.viewMode = 'list';
                        this.currentWorkflowId = null;
                        this.isEditing = false;
                        await this.loadWorkflows();
                        this.updateView();
                    }
                    return; // Don't throw error, just silently handle it
                }
                
                throw new Error(`Failed to save workflow: ${response.status} ${errorText}`);
            }
            
            // Update local workflow data
            const updated = await response.json();
            console.log('[AUTOSAVE] Save successful, response:', updated);
            console.log('[AUTOSAVE] Saved nodes count:', updated.nodes?.length || 'N/A');
            
            const index = this.workflows.findIndex(w => w.id === this.currentWorkflowId);
            if (index !== -1) {
                this.workflows[index] = { ...this.workflows[index], ...updated };
            }
            
            console.log('[AUTOSAVE] Save completed successfully');
        } catch (error) {
            console.error('[AUTOSAVE] Error saving workflow:', error);
            console.error('[AUTOSAVE] Error stack:', error.stack);
            
            // Show error toast
            const toast = document.createElement('div');
            toast.textContent = 'Failed to save workflow changes';
            toast.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #ef4444;
                color: white;
                padding: 12px 20px;
                border-radius: 6px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                z-index: 10000;
                font-size: 14px;
                opacity: 0;
                transition: opacity 0.3s;
            `;
            document.body.appendChild(toast);
            requestAnimationFrame(() => toast.style.opacity = '1');
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
    }

    async renameWorkflow(workflowId) {
        const workflow = this.workflows.find(w => w.id === workflowId);
        if (!workflow) return;
        
        const newName = prompt('Enter new workflow name:', workflow.name);
        if (newName && newName.trim()) {
            try {
                const response = await api.fetch(`/api/automation/workflows/update?id=${workflowId}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        name: newName.trim(),
                        nodes: [],
                        connections: [],
                        canvasOffsetX: workflow.canvasOffsetX || 0,
                        canvasOffsetY: workflow.canvasOffsetY || 0,
                        zoom: workflow.zoom || 1
                    })
                });
                
                if (!response.ok) {
                    throw new Error('Failed to rename workflow');
                }
                
                const updated = await response.json();
                workflow.name = updated.name;
                workflow.updatedAt = updated.updatedAt;
                
                if (this.viewMode === 'list') {
                    this.updateWorkflowsGrid();
                } else if (this.currentWorkflowId === workflowId) {
                    // Update header if we're viewing this workflow
                    const pageContent = document.getElementById('page-content');
                    if (pageContent) {
                        pageContent.innerHTML = this.render();
                        this.mount();
                    }
                }
            } catch (error) {
                console.error('Error renaming workflow:', error);
                alert('Failed to rename workflow. Please try again.');
            }
        }
    }

    async deleteWorkflow(workflowId) {
        if (!confirm('Are you sure you want to delete this workflow?')) {
            return;
        }
        
        try {
            const response = await api.fetch(`/api/automation/workflows/delete?id=${workflowId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete workflow');
            }
            
            this.workflows = this.workflows.filter(w => w.id !== workflowId);
            
            // Clear autosave interval if deleting the current workflow
            if (this.currentWorkflowId === workflowId) {
                if (this.autoSaveInterval) {
                    clearInterval(this.autoSaveInterval);
                    this.autoSaveInterval = null;
                }
                // Go back to list view
                this.backToList();
            } else {
                // Update the view
                if (this.viewMode === 'list') {
                    const pageContent = document.getElementById('page-content');
                    if (pageContent) {
                        pageContent.innerHTML = this.render();
                        this.mount();
                    }
                }
            }
        } catch (error) {
            console.error('Error deleting workflow:', error);
            alert('Failed to delete workflow. Please try again.');
        }
    }

    getCurrentWorkflow() {
        return this.workflows.find(w => w.id === this.currentWorkflowId);
    }

    updateWorkflowsList() {
        const list = document.getElementById('workflows-list');
        if (list) {
            list.innerHTML = this.renderWorkflowsList();
        }
    }

    updateWorkflowsGrid() {
        const grid = document.getElementById('workflows-grid');
        if (grid) {
            grid.innerHTML = this.renderWorkflowsGrid();
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    }

    async saveWorkflow() {
        await this.saveCurrentWorkflow();
        this.updateWorkflowsGrid();
        // Show feedback
        const btn = event?.target;
        if (btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Saved!';
            btn.style.background = '#10b981';
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '';
            }, 2000);
        }
    }

    runWorkflow() {
        const workflow = this.getCurrentWorkflow();
        if (!workflow) {
            alert('No workflow selected');
            return;
        }
        
        if (this.nodes.length === 0) {
            alert('Workflow is empty. Add some nodes first.');
            return;
        }
        
        console.log('Running workflow:', workflow.name);
        console.log('Nodes:', this.nodes);
        console.log('Connections:', this.connections);
        
        // TODO: Implement workflow execution
        alert(`Running workflow: ${workflow.name}\n\nBackend integration pending.\n\nThis workflow has ${this.nodes.length} nodes and ${this.connections.length} connections.`);
    }

    async clearCanvas() {
        if (confirm('Clear all nodes and connections?')) {
            this.nodes = [];
            this.connections = [];
            await this.saveCurrentWorkflow();
            this.renderNodes();
            this.renderConnections();
            this.updateWorkflowsGrid();
        }
    }

    switchTab(tab) {
        // Don't switch if already on this tab
        if (this.workflowTab === tab) {
            console.log('[SWITCH TAB] Already on tab:', tab);
            return;
        }
        
        console.log('[SWITCH TAB] Switching from', this.workflowTab, 'to', tab);
        this.workflowTab = tab;
        
        // Update URL with current workflow and new tab
        if (this.currentWorkflowId) {
            window.location.hash = `automation/workflow/${this.currentWorkflowId}/${tab}`;
        }
        
        this.updateView();
        // Mount will be called by updateView, but we need to ensure proper initialization
        setTimeout(() => {
            this.mount();
        }, 100);
    }

    toggleEditMode() {
        this.isEditing = !this.isEditing;
        if (this.isEditing) {
            // Enable editing features
            this.initializeDragAndDrop();
            this.initializePanning();
        } else {
            // Disable editing features - save before switching to view mode
            this.saveCurrentWorkflow();
        }
        this.updateView();
        // Re-render connections after mode switch to ensure correct positioning
        setTimeout(() => {
            this.renderConnections();
        }, 100);
    }

    async loadExecutions() {
        if (!this.currentWorkflowId) return;
        
        try {
            const response = await api.fetch(`/api/automation/executions?workflowId=${this.currentWorkflowId}`);
            if (response.ok) {
                const data = await response.json();
                this.executions = Array.isArray(data) ? data : [];
                console.log('[LOAD EXECUTIONS] Loaded', this.executions.length, 'executions');
            } else {
                // If response is not ok, set empty array
                this.executions = [];
            }
        } catch (error) {
            console.error('Error loading executions:', error);
            this.executions = []; // Set empty array on error
        }
    }

    async loadExecutionStats() {
        if (!this.currentWorkflowId) return;
        
        try {
            const response = await api.fetch(`/api/automation/executions/stats?workflowId=${this.currentWorkflowId}`);
            if (response.ok) {
                this.executionStats = await response.json();
                console.log('[LOAD STATS] Execution stats:', this.executionStats);
            }
        } catch (error) {
            console.error('Error loading execution stats:', error);
        }
    }

    renderExecutionsTab() {
        if (!this.executions || this.executions.length === 0) {
            return `
                <div class="executions-empty">
                    <i class="fas fa-history"></i>
                    <p>No executions yet</p>
                    <p class="executions-empty-hint">Workflow executions will appear here</p>
                </div>
            `;
        }

        return `
            <div class="executions-container">
                <div class="executions-stats">
                    ${this.executionStats ? `
                    <div class="stat-card">
                        <div class="stat-value">${this.executionStats.totalExecutions || 0}</div>
                        <div class="stat-label">Total Runs</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${this.executionStats.webhookExecutions || 0}</div>
                        <div class="stat-label">Webhook Triggers</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${this.executionStats.successCount || 0}</div>
                        <div class="stat-label">Successful</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${this.executionStats.errorCount || 0}</div>
                        <div class="stat-label">Errors</div>
                    </div>
                    ` : ''}
                </div>
                <div class="executions-table-container">
                    <table class="executions-table">
                        <thead>
                            <tr>
                                <th>Status</th>
                                <th>Trigger</th>
                                <th>Nodes</th>
                                <th>Progress</th>
                                <th>Time</th>
                                <th>Duration</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                    ${this.executions.map(exec => {
                        const startedAt = new Date(exec.startedAt);
                        const finishedAt = exec.finishedAt ? new Date(exec.finishedAt) : null;
                        const duration = finishedAt ? Math.round((finishedAt - startedAt) / 1000) : null;
                        
                        let statusClass = 'status-running';
                        let statusIcon = 'fa-clock';
                        if (exec.status === 'success') {
                            statusClass = 'status-success';
                            statusIcon = 'fa-check-circle';
                        } else if (exec.status === 'error') {
                            statusClass = 'status-error';
                            statusIcon = 'fa-exclamation-circle';
                        }
                        
                        // Calculate node execution stats - use saved totalNodes from execution data
                        let totalNodes = 0;
                        let executedCount = 0;
                        let executionData = null;
                        
                        if (exec.data) {
                            try {
                                executionData = JSON.parse(exec.data);
                                // Use saved totalNodes from execution time, fallback to current nodes count
                                totalNodes = executionData.totalNodes || this.nodes.length;
                                let executedNodes = executionData.executedNodes || [];
                                const nodesData = executionData.nodes || {};
                                
                                // If executedNodes array is empty but nodes object has data, extract node IDs from nodes object
                                if (executedNodes.length === 0 && Object.keys(nodesData).length > 0) {
                                    executedNodes = Object.keys(nodesData);
                                }
                                executedCount = executedNodes.length;
                            } catch (e) {
                                // Fallback to current nodes count if parsing fails
                                totalNodes = this.nodes.length;
                            }
                        } else {
                            totalNodes = this.nodes.length;
                        }
                        
                        const executionPercentage = totalNodes > 0 ? Math.round((executedCount / totalNodes) * 100) : 0;
                        const executionId = exec.id;
                        
                        return `
                            <tr class="execution-row" data-execution-id="${executionId}">
                                <td>
                                    <div class="execution-status ${statusClass}">
                                        <i class="fas ${statusIcon}"></i>
                                        <span>${exec.status}</span>
                                    </div>
                                </td>
                                <td>
                                    <div class="execution-trigger">
                                        <i class="fas fa-${exec.triggerType === 'webhook' ? 'link' : exec.triggerType === 'scheduler' ? 'clock' : 'hand-pointer'}"></i>
                                        <span>${exec.triggerType || 'manual'}</span>
                                    </div>
                                </td>
                                <td>
                                    <div class="execution-nodes-cell">
                                        <strong>${executedCount}</strong> / ${totalNodes}
                                        <span class="nodes-percentage-badge">${executionPercentage}%</span>
                                    </div>
                                </td>
                                <td>
                                    <div class="execution-progress-cell">
                                        <div class="progress-bar-small">
                                            <div class="progress-fill-small" style="width: ${executionPercentage}%"></div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div class="execution-time-cell">
                                        ${startedAt.toLocaleString()}
                                    </div>
                                </td>
                                <td>
                                    ${duration !== null ? `<span class="execution-duration-badge">${duration}s</span>` : '<span class="execution-duration-badge">-</span>'}
                                </td>
                                <td>
                                    <button class="execution-expand-btn" onclick="automationInstance.toggleExecutionDetails('${executionId}')">
                                        <i class="fas fa-chevron-down"></i>
                                    </button>
                                </td>
                            </tr>
                            <tr class="execution-details-row" id="execution-details-${executionId}" style="display: none;">
                                <td colspan="7">
                                    ${exec.data ? (() => {
                                        try {
                                            if (!executionData) {
                                                executionData = JSON.parse(exec.data);
                                            }
                                            let executedNodes = executionData.executedNodes || [];
                                            const nodesData = executionData.nodes || {};
                                            const triggerData = executionData.trigger || {};
                                            
                                            // If executedNodes array is empty but nodes object has data, extract node IDs from nodes object
                                            if (executedNodes.length === 0 && Object.keys(nodesData).length > 0) {
                                                executedNodes = Object.keys(nodesData);
                                            }
                                            
                                            // Get node configs for display
                                            const self = this;
                                            const getNodeTitle = (nodeId) => {
                                                const node = self.nodes.find(n => n.id === nodeId);
                                                if (node) {
                                                    const config = self.getNodeConfig(node.type);
                                                    return config ? config.title : node.type;
                                                }
                                                return nodeId;
                                            };
                                            
                                            const getNodeIcon = (nodeType) => {
                                                const config = self.getNodeConfig(nodeType);
                                                return config ? config.icon : 'fa-circle';
                                            };
                                            
                                            const getNodeColor = (nodeType) => {
                                                const config = self.getNodeConfig(nodeType);
                                                return config ? config.color : '#64748b';
                                            };
                                            
                                            return `
                                                <div class="execution-data">
                                                    <div class="execution-data-header">
                                                        <h3 class="execution-data-title">
                                                            <i class="fas fa-list"></i>
                                                            Execution Details
                                                        </h3>
                                                    </div>
                                                    <details open class="execution-section">
                                                        <summary class="execution-section-header">
                                                            <div class="section-header-content">
                                                                <i class="fas fa-play-circle"></i>
                                                                <span>Executed Nodes</span>
                                                                <span class="section-badge">${executedNodes.length}</span>
                                                            </div>
                                                        </summary>
                                                        <div class="executed-nodes-list">
                                                            ${executedNodes.length > 0 ? executedNodes.map((nodeId, index) => {
                                                                const nodeOutput = nodesData[nodeId];
                                                                const node = self.nodes.find(n => n.id === nodeId);
                                                                const nodeType = node ? node.type : 'unknown';
                                                                const nodeTitle = getNodeTitle(nodeId);
                                                                const nodeIcon = getNodeIcon(nodeType);
                                                                const nodeColor = getNodeColor(nodeType);
                                                                
                                                                // Check if node has error
                                                                const hasError = nodeOutput && nodeOutput.error;
                                                                const hasSuccess = nodeOutput && nodeOutput.success !== false;
                                                                
                                                                return `
                                                                    <div class="executed-node-item ${hasError ? 'node-error' : hasSuccess ? 'node-success' : ''}">
                                                                        <div class="executed-node-header">
                                                                            <div class="executed-node-info">
                                                                                <div class="executed-node-icon" style="background: ${nodeColor}20; color: ${nodeColor};">
                                                                                    <i class="fas ${nodeIcon}"></i>
                                                                                </div>
                                                                                <div class="executed-node-details">
                                                                                    <div class="executed-node-title-row">
                                                                                        <span class="executed-node-number">#${index + 1}</span>
                                                                                        <span class="executed-node-title">${nodeTitle}</span>
                                                                                        <span class="executed-node-type-badge">${nodeType}</span>
                                                                                        ${hasError ? '<span class="node-error-badge"><i class="fas fa-exclamation-triangle"></i> Error</span>' : ''}
                                                                                        ${hasSuccess && !hasError ? '<span class="node-success-badge"><i class="fas fa-check"></i> Success</span>' : ''}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        ${nodeOutput ? `
                                                                        <div class="executed-node-data">
                                                                            <details class="node-data-details">
                                                                                <summary class="node-data-summary">
                                                                                    <i class="fas fa-code"></i>
                                                                                    <span>View Output Data</span>
                                                                                </summary>
                                                                                <div class="node-output-container">
                                                                                    <pre class="executed-node-output">${JSON.stringify(nodeOutput, null, 2)}</pre>
                                                                                </div>
                                                                            </details>
                                                                        </div>
                                                                        ` : ''}
                                                                    </div>
                                                                `;
                                                            }).filter(html => html !== '').join('') : '<div class="no-nodes-message"><i class="fas fa-info-circle"></i> No nodes executed</div>'}
                                                        </div>
                                                    </details>
                                                    <details class="execution-section">
                                                        <summary class="execution-section-header">
                                                            <div class="section-header-content">
                                                                <i class="fas fa-bolt"></i>
                                                                <span>Trigger Data</span>
                                                            </div>
                                                        </summary>
                                                        <div class="trigger-data-container">
                                                            <pre class="execution-data-pre">${JSON.stringify(triggerData, null, 2)}</pre>
                                                        </div>
                                                    </details>
                                                    <details class="execution-section">
                                                        <summary class="execution-section-header">
                                                            <div class="section-header-content">
                                                                <i class="fas fa-database"></i>
                                                                <span>Full Execution Context</span>
                                                            </div>
                                                        </summary>
                                                        <div class="execution-context-container">
                                                            <pre class="execution-data-pre">${JSON.stringify(executionData, null, 2)}</pre>
                                                        </div>
                                                    </details>
                                                </div>
                                            `;
                                        } catch (e) {
                                            // Fallback to old format if parsing fails
                                            return `
                                                <div class="execution-data">
                                                    <details>
                                                        <summary>View Data</summary>
                                                        <pre>${JSON.stringify(JSON.parse(exec.data), null, 2)}</pre>
                                                    </details>
                                                </div>
                                            `;
                                        }
                                    })() : '<div class="execution-data"><p>No execution data available</p></div>'}
                                </td>
                            </tr>
                        `;
                    }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    toggleExecutionDetails(executionId) {
        const detailsRow = document.getElementById(`execution-details-${executionId}`);
        const expandBtn = document.querySelector(`[data-execution-id="${executionId}"] .execution-expand-btn i`);
        
        if (detailsRow) {
            const isVisible = detailsRow.style.display !== 'none';
            detailsRow.style.display = isVisible ? 'none' : 'table-row';
            
            if (expandBtn) {
                expandBtn.classList.toggle('fa-chevron-down');
                expandBtn.classList.toggle('fa-chevron-up');
            }
        }
    }

    generateUUID() {
        if (window.crypto && window.crypto.randomUUID) {
            return window.crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}

// Global instance
window.automationInstance = null;

