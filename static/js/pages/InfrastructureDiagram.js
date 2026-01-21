import { Sidebar } from '../components/Sidebar.js';

export class InfrastructureDiagramPage {
    constructor() {
        this.canvas = null;
        this.selectedTool = 'select';
        this.selectedConnectionType = 'network'; // 'network' or 'fiber'
        this.components = [];
        this.connections = [];
        this.selectedComponent = null;
        this.selectedConnection = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.connectionPaths = []; // Store connection paths for click detection
        this.diagrams = [];
        this.currentDiagram = null;
        this.currentDiagramId = null;
        this.viewMode = 'list'; // 'list' or 'editor'
        this.showSaveModal = false;
        this.showLoadModal = false;
        this.showDeviceTemplateModal = false;
        this.editingTemplate = null;
        this.showTemplateForm = false; // Track if template form is showing
        this.deviceTemplates = []; // Store device templates
        this.deviceImages = {}; // Cache loaded images
        this.availableImages = []; // Available device images
        this.selectedImagePath = ''; // Currently selected image path
        this.showImageBrowser = false; // Show/hide image browser
        this.hoverDeleteButtonComponent = null; // Track which component's delete button is hovered
        this.hoverDeleteButtonConnection = null; // Track which connection's delete button is hovered
        this.searchQuery = '';
        this.sortBy = 'updated'; // 'name', 'created', 'updated'
        // Zoom and pan
        this.zoom = 1.0;
        this.canvasOffset = { x: 0, y: 0 };
        this.isPanning = false;
        this.panStart = { x: 0, y: 0 };
        // Port-based connections (like Automation)
        this.connecting = false;
        this.connectionStart = null; // { componentId, portId, port }
        this.tempConnectionEnd = null; // { x, y }
        this.portSize = 4; // Size of port circles
        this.portsPerSide = 6; // Number of ports per side
        this.portSpacing = 20; // Spacing between ports
        this.showPortsDistance = 50; // Show ports when mouse is within this distance
        this.hoveredComponent = null; // Component currently hovered
        this.hoveredPort = null; // Port currently hovered
    }

    async render() {
        if (this.viewMode === 'list') {
            return this.renderListView();
        } else {
            return this.renderEditorView();
        }
    }

    renderListView() {
        const filteredDiagrams = this.getFilteredDiagrams();

        return `
            <div class="page-container-full">
                <div class="page-header">
                    <div class="page-header-content">
                        <div>
                            <h1 class="page-title">🏗️ Infrastructure Diagrams</h1>
                            <p class="page-subtitle">Create and manage infrastructure diagrams</p>
                        </div>
                        <div class="page-header-actions">
                            <button class="btn btn-sm btn-primary" onclick="infraDiagramInstance.createNewDiagram()">
                                <i class="fas fa-plus"></i> <span class="btn-text">New Diagram</span>
                            </button>
                            <button class="btn btn-sm btn-secondary" onclick="infraDiagramInstance.showDeviceTemplateModal = true; infraDiagramInstance.updateDisplay()">
                                <i class="fas fa-cog"></i> <span class="btn-text">Device Templates</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="diagrams-list-container" style="padding: 1rem;">
                    <div style="display: flex; gap: 1rem; margin-bottom: 1rem; align-items: center;">
                        <div style="flex: 1; position: relative;">
                            <input type="text" 
                                   id="diagram-search" 
                                   class="form-control" 
                                   placeholder="Search diagrams..." 
                                   value="${this.escapeHtml(this.searchQuery)}"
                                   oninput="infraDiagramInstance.searchQuery = this.value; infraDiagramInstance.updateDisplay()"
                                   style="padding-left: 2.5rem;">
                            <i class="fas fa-search" style="position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: var(--text-muted);"></i>
                        </div>
                        <select id="diagram-sort" class="form-control" style="width: auto;" onchange="infraDiagramInstance.sortBy = this.value; infraDiagramInstance.updateDisplay()">
                            <option value="updated" ${this.sortBy === 'updated' ? 'selected' : ''}>Last Updated</option>
                            <option value="created" ${this.sortBy === 'created' ? 'selected' : ''}>Date Created</option>
                            <option value="name" ${this.sortBy === 'name' ? 'selected' : ''}>Name</option>
                        </select>
                    </div>

                    ${filteredDiagrams.length === 0 ? `
                        <div class="workflows-empty-state">
                            <div class="empty-state-icon">
                                <i class="fas fa-project-diagram"></i>
                            </div>
                            <h2>No Diagrams Yet</h2>
                            <p>Create your first infrastructure diagram to get started</p>
                            <button class="btn btn-primary" onclick="infraDiagramInstance.createNewDiagram()">
                                <i class="fas fa-plus"></i> Create Diagram
                            </button>
                        </div>
                    ` : `
                        <div class="workflows-grid">
                            ${filteredDiagrams.map(diagram => `
                                <div class="workflow-card" onclick="infraDiagramInstance.openDiagram(${diagram.id})">
                                    <div class="workflow-card-header">
                                        <div class="workflow-card-icon">
                                            <i class="fas fa-project-diagram"></i>
                                        </div>
                                        <div class="workflow-card-actions">
                                            <button class="workflow-card-action" onclick="event.stopPropagation(); infraDiagramInstance.renameDiagram(${diagram.id})" title="Rename">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="workflow-card-action" onclick="event.stopPropagation(); infraDiagramInstance.deleteDiagram(${diagram.id})" title="Delete">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div class="workflow-card-body">
                                        <h3 class="workflow-card-name">${this.escapeHtml(diagram.name)}</h3>
                                        <div class="workflow-card-stats">
                                            <span class="workflow-stat">
                                                <i class="fas fa-calendar"></i>
                                                ${this.formatDate(diagram.createdAt || diagram.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                    <div class="workflow-card-footer">
                                        <span class="workflow-card-date">Updated ${this.formatDate(diagram.updatedAt || diagram.updated_at)}</span>
                                        <button class="workflow-card-open">
                                            Open <i class="fas fa-arrow-right"></i>
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>

                ${this.showDeviceTemplateModal ? this.renderDeviceTemplateModal() : ''}
            </div>
        `;
    }

    renderEditorView() {
        return `
            <div class="page-container-full" style="padding: 0; margin: 0; width: 100%; max-width: 100%;">
                <div class="page-header" style="padding: 0.75rem 1rem; margin: 0;">
                    <div class="page-header-content">
                        <div>
                            <button class="btn-back" onclick="infraDiagramInstance.backToList()" title="Back to diagrams">
                                <i class="fas fa-arrow-left"></i>
                            </button>
                            <div style="margin-left: 0.75rem;">
                                <h1 class="page-title">🏗️ ${this.currentDiagram ? this.escapeHtml(this.currentDiagram.name) : 'New Diagram'}</h1>
                                <p class="page-subtitle">Build your infrastructure diagram</p>
                            </div>
                        </div>
                        <div class="page-header-actions">
                            <button class="btn btn-sm btn-secondary" onclick="infraDiagramInstance.toggleToolbarSidebar()" title="Toggle Toolbar">
                                <i class="fas fa-bars"></i> <span class="btn-text">Toolbar</span>
                            </button>
                            <button class="btn btn-sm btn-secondary" onclick="infraDiagramInstance.showDeviceTemplateModal = true; infraDiagramInstance.updateDisplay()">
                                <i class="fas fa-cog"></i> <span class="btn-text">Device Templates</span>
                            </button>
                            <button class="btn btn-sm btn-primary" onclick="infraDiagramInstance.saveCurrentDiagram()">
                                <i class="fas fa-save"></i> <span class="btn-text">Save</span>
                            </button>
                            <button class="btn btn-sm btn-success" onclick="infraDiagramInstance.clearCanvas()">
                                <i class="fas fa-trash"></i> <span class="btn-text">Clear</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="diagram-editor-container">
                    <div class="diagram-canvas-wrapper">
                        <div class="canvas-toolbar">
                            <button class="canvas-tool-btn" onclick="infraDiagramInstance.zoomOut()" title="Zoom Out">
                                <i class="fas fa-search-minus"></i>
                            </button>
                            <div class="canvas-zoom-indicator" id="zoom-indicator">
                                ${Math.round(this.zoom * 100)}%
                            </div>
                            <button class="canvas-tool-btn" onclick="infraDiagramInstance.zoomIn()" title="Zoom In">
                                <i class="fas fa-search-plus"></i>
                            </button>
                            <button class="canvas-tool-btn" onclick="infraDiagramInstance.resetZoom()" title="Reset Zoom">
                                <i class="fas fa-expand-arrows-alt"></i>
                            </button>
                        </div>
                        <canvas id="infra-diagram-canvas" width="2000" height="2000"></canvas>
                    </div>
                </div>

                ${this.showDeviceTemplateModal ? this.renderDeviceTemplateModal() : ''}
            </div>
        `;
    }

    renderSaveModal() {
        return `
            <div class="modal-overlay" onclick="infraDiagramInstance.closeSaveModal()">
                <div class="modal-container" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>Save Diagram</h3>
                        <button class="modal-close" onclick="infraDiagramInstance.closeSaveModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Diagram Name</label>
                            <input type="text" id="diagram-name" class="form-input" placeholder="Enter diagram name" required>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="infraDiagramInstance.closeSaveModal()">Cancel</button>
                        <button class="btn btn-primary" onclick="infraDiagramInstance.saveDiagram()">Save</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderDiagramsList() {
        if (this.diagrams.length === 0) {
            return '';
        }

        return `
            <div class="diagrams-sidebar">
                <div class="diagrams-sidebar-header">
                    <h3>Saved Diagrams</h3>
                    <button class="btn btn-sm btn-secondary" onclick="infraDiagramInstance.toggleDiagramsList()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="diagrams-sidebar-body">
                    <div class="diagrams-list">
                        ${this.diagrams.map(diagram => `
                            <div class="diagram-item" onclick="infraDiagramInstance.loadDiagram(${diagram.id})">
                                <i class="fas fa-project-diagram"></i>
                                <div class="diagram-item-info">
                                    <span class="diagram-item-name">${this.escapeHtml(diagram.name)}</span>
                                    <span class="diagram-item-date">${this.formatDate(diagram.createdAt || diagram.created_at)}</span>
                                </div>
                                <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); infraDiagramInstance.deleteDiagram(${diagram.id})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    renderLoadModal() {
        return `
            <div class="modal-overlay" onclick="infraDiagramInstance.closeLoadModal()">
                <div class="modal-container" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>Load Diagram</h3>
                        <button class="modal-close" onclick="infraDiagramInstance.closeLoadModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        ${this.diagrams.length === 0 ? `
                            <div class="empty-diagrams">
                                <i class="fas fa-project-diagram"></i>
                                <p>No saved diagrams yet</p>
                                <p class="empty-diagrams-hint">Create a diagram and save it to see it here</p>
                            </div>
                        ` : `
                            <div class="diagrams-list">
                                ${this.diagrams.map(diagram => `
                                    <div class="diagram-item" onclick="infraDiagramInstance.loadDiagram(${diagram.id})">
                                        <i class="fas fa-project-diagram"></i>
                                        <div class="diagram-item-info">
                                            <span class="diagram-item-name">${this.escapeHtml(diagram.name)}</span>
                                            <span class="diagram-item-date">${this.formatDate(diagram.createdAt || diagram.created_at)}</span>
                                        </div>
                                        <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); infraDiagramInstance.deleteDiagram(${diagram.id})">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                `).join('')}
                            </div>
                        `}
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="infraDiagramInstance.closeLoadModal()">Close</button>
                    </div>
                </div>
            </div>
        `;
    }

    toggleDiagramsList() {
        this.showDiagramsList = !this.showDiagramsList;
        this.updateDisplay();
    }

    getToolbarContent() {
        return `
            <div class="diagram-toolbar">
                <div class="toolbar-section">
                    <div class="toolbar-section-header">
                        <h4><i class="fas fa-mouse-pointer"></i> Selection Tools</h4>
                    </div>
                    <div class="toolbar-section-items">
                        <button class="tool-btn ${this.selectedTool === 'select' ? 'active' : ''}" 
                                onclick="infraDiagramInstance.selectTool('select')" 
                                title="Select and move components">
                            <i class="fas fa-mouse-pointer"></i>
                            <span>Select & Move</span>
                        </button>
                        <button class="tool-btn ${this.selectedTool === 'connect' ? 'active' : ''}" 
                                onclick="infraDiagramInstance.selectTool('connect')" 
                                title="Connect components">
                            <i class="fas fa-project-diagram"></i>
                            <span>Connect Components</span>
                        </button>
                    </div>
                </div>

                <div class="toolbar-section">
                    <div class="toolbar-section-header">
                        <h4><i class="fas fa-plug"></i> Connection Type</h4>
                    </div>
                    <div class="toolbar-section-items">
                        <button class="tool-btn ${this.selectedConnectionType === 'network' ? 'active' : ''}" 
                                onclick="infraDiagramInstance.selectConnectionType('network')" 
                                title="Ethernet/Network connection">
                            <i class="fas fa-network-wired"></i>
                            <span>Network</span>
                        </button>
                        <button class="tool-btn ${this.selectedConnectionType === 'fiber' ? 'active' : ''}" 
                                onclick="infraDiagramInstance.selectConnectionType('fiber')" 
                                title="Fiber optic connection">
                            <i class="fas fa-stream"></i>
                            <span>Fiber Optic</span>
                        </button>
                    </div>
                </div>

                <div class="toolbar-section">
                    <div class="toolbar-section-header">
                        <h4><i class="fas fa-cube"></i> Basic Components</h4>
                    </div>
                    <div class="toolbar-section-items">
                        <button class="tool-btn" onclick="infraDiagramInstance.addComponent('box')" title="Add a generic box component">
                            <i class="fas fa-square"></i>
                            <span>Generic Box</span>
                        </button>
                        <button class="tool-btn" onclick="infraDiagramInstance.addComponent('vm')" title="Add a virtual machine">
                            <i class="fas fa-cube"></i>
                            <span>Virtual Machine</span>
                        </button>
                    </div>
                </div>

                ${(() => {
                // Group templates by category
                const categories = {
                    server: [],
                    san: [],
                    others: []
                };

                (this.deviceTemplates || []).forEach(template => {
                    const category = template.category || (template.type === 'server' ? 'server' : template.type === 'san' ? 'san' : 'others');
                    if (categories[category]) {
                        categories[category].push(template);
                    } else {
                        categories.others.push(template);
                    }
                });

                const categoryLabels = {
                    server: 'Servers',
                    san: 'SAN',
                    others: 'Others'
                };

                const categoryIcons = {
                    server: 'fa-server',
                    san: 'fa-database',
                    others: 'fa-cube'
                };

                return Object.keys(categories).map(category => {
                    const templates = categories[category];

                    return `
                            <div class="toolbar-section">
                                <div class="toolbar-section-header">
                                    <h4><i class="fas ${categoryIcons[category]}"></i> ${categoryLabels[category]}</h4>
                                </div>
                                <div class="toolbar-section-items">
                                    ${templates.length === 0 ? `
                                        <div class="toolbar-empty-state">
                                            <i class="fas fa-inbox"></i>
                                            <div class="empty-title">No ${categoryLabels[category].toLowerCase()}</div>
                                            <div class="empty-hint">Create templates first</div>
                                        </div>
                                    ` : templates.map(template => `
                                        <button class="tool-btn" 
                                                onclick="infraDiagramInstance.addComponentFromTemplate(${template.id})" 
                                                title="${this.escapeHtml(template.name)}">
                                            ${template.imagePath ? `
                                                <img src="${template.imagePath}" alt="${this.escapeHtml(template.name)}">
                                            ` : `
                                                <i class="fas fa-server"></i>
                                            `}
                                            <span>${this.escapeHtml(template.name)}</span>
                                        </button>
                                    `).join('')}
                                </div>
                            </div>
                        `;
                }).join('');
            })()}
            </div>
        `;
    }

    toggleToolbarSidebar() {
        if (this.sidebarOpen) {
            if (window.sidebarInstance) {
                window.sidebarInstance.close();
            }
            this.sidebarOpen = false;
        } else {
            if (window.sidebarInstance) {
                window.sidebarInstance.open({
                    title: 'Diagram Tools',
                    icon: 'fa-tools',
                    content: this.getToolbarContent(),
                    onClose: () => {
                        this.sidebarOpen = false;
                    }
                });
            }
            this.sidebarOpen = true;
        }
    }

    formatDate(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return dateString;
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    renderDeviceTemplateModal() {
        return `
            <div class="modal-overlay" onclick="infraDiagramInstance.showDeviceTemplateModal = false; infraDiagramInstance.updateDisplay()">
                <div class="modal-container" onclick="event.stopPropagation()" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
                    <div class="modal-header">
                        <h3><i class="fas fa-cog"></i> Device Templates</h3>
                        <button class="modal-close" onclick="infraDiagramInstance.showDeviceTemplateModal = false; infraDiagramInstance.updateDisplay()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div style="margin-bottom: 1rem;">
                            <button class="btn btn-primary" onclick="infraDiagramInstance.showCreateTemplateForm()">
                                <i class="fas fa-plus"></i> Create New Template
                            </button>
                        </div>
                        
                        <div id="template-list-container" style="display: ${this.showTemplateForm ? 'none' : 'block'};">
                            ${this.renderTemplateList()}
                        </div>
                        
                        <div id="template-form-container" style="display: ${this.showTemplateForm ? 'block' : 'none'};">
                            ${this.renderTemplateForm()}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="infraDiagramInstance.showDeviceTemplateModal = false; infraDiagramInstance.updateDisplay()">Close</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderTemplateList() {
        if (!this.deviceTemplates || !Array.isArray(this.deviceTemplates) || this.deviceTemplates.length === 0) {
            return `
                <div class="empty-diagrams">
                    <i class="fas fa-server"></i>
                    <p>No device templates yet</p>
                    <p class="empty-diagrams-hint">Create templates to use custom device images in your diagrams</p>
                </div>
            `;
        }

        // Group templates by category
        const categories = {
            server: [],
            san: [],
            others: []
        };

        (this.deviceTemplates || []).forEach(template => {
            const category = template.category || (template.type === 'server' ? 'server' : template.type === 'san' ? 'san' : 'others');
            if (categories[category]) {
                categories[category].push(template);
            } else {
                categories.others.push(template);
            }
        });

        const categoryLabels = {
            server: 'Servers',
            san: 'SAN',
            others: 'Others'
        };

        const categoryIcons = {
            server: 'fa-server',
            san: 'fa-database',
            others: 'fa-cube'
        };

        return Object.keys(categories).map(category => {
            const templates = categories[category];
            if (templates.length === 0) return '';

            return `
                <div style="margin-bottom: 2rem;">
                    <h4 style="margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid var(--header-border); display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fas ${categoryIcons[category]}"></i>
                        ${categoryLabels[category]}
                        <span style="font-size: 0.875rem; font-weight: normal; color: var(--text-muted);">(${templates.length})</span>
                    </h4>
                    <div class="templates-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem;">
                        ${templates.map(template => `
                            <div class="template-card" style="border: 1px solid var(--header-border); border-radius: 8px; padding: 1rem; background: var(--card-bg);">
                                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                                    <div>
                                        <strong>${this.escapeHtml(template.name)}</strong>
                                        <div style="font-size: 0.75rem; color: #64748b; margin-top: 0.25rem;">
                                            ${template.type} - ${template.vendor}
                                        </div>
                                    </div>
                                    <div style="display: flex; gap: 0.25rem;">
                                        <button class="btn btn-sm" onclick="infraDiagramInstance.editTemplate(${template.id})" title="Edit">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn btn-sm btn-danger" onclick="infraDiagramInstance.deleteTemplate(${template.id})" title="Delete">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                                ${template.imagePath ? `
                                    <div style="margin: 0.5rem 0; text-align: center;">
                                        <img src="${template.imagePath}" alt="${this.escapeHtml(template.name)}" 
                                             style="max-width: 100%; max-height: 100px; border: 1px solid #e2e8f0; border-radius: 4px;"
                                             onerror="this.style.display='none'">
                                    </div>
                                ` : ''}
                                <div style="font-size: 0.75rem; color: #64748b;">
                                    ${template.ports ? template.ports.length : 0} ports, 
                                    ${template.connectors ? template.connectors.length : 0} connectors
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    renderTemplateForm() {
        const template = this.editingTemplate || {
            name: '',
            category: 'server',
            type: 'server',
            vendor: 'generic',
            imagePath: '',
            width: 120,
            height: 80,
            ports: [],
            connectors: [],
            metadata: {}
        };

        // Set default category based on type if not set
        if (!template.category) {
            if (template.type === 'server') {
                template.category = 'server';
            } else if (template.type === 'san') {
                template.category = 'san';
            } else {
                template.category = 'others';
            }
        }

        // Use selectedImagePath if available (for new templates or when user selects a new image)
        // Otherwise use template.imagePath (for editing existing templates)
        // Initialize selectedImagePath from template if not already set
        if (!this.selectedImagePath && template.imagePath) {
            this.selectedImagePath = template.imagePath;
        }
        const currentImagePath = this.selectedImagePath || template.imagePath || '';

        return `
            <div style="background: var(--bg); padding: 1rem; border-radius: 8px;">
                <h4 style="margin-top: 0;">${this.editingTemplate ? 'Edit' : 'Create'} Device Template</h4>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div>
                        <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Name *</label>
                        <input type="text" id="template-name" class="form-control" value="${this.escapeHtml(template.name)}" placeholder="e.g., Dell PowerEdge R740">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Category *</label>
                        <select id="template-category" class="form-control">
                            <option value="server" ${template.category === 'server' ? 'selected' : ''}>Server</option>
                            <option value="san" ${template.category === 'san' ? 'selected' : ''}>SAN</option>
                            <option value="others" ${template.category === 'others' ? 'selected' : ''}>Others</option>
                        </select>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div>
                        <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Vendor *</label>
                        <select id="template-vendor" class="form-control">
                            <option value="generic" ${template.vendor === 'generic' ? 'selected' : ''}>Generic</option>
                            <option value="dell" ${template.vendor === 'dell' ? 'selected' : ''}>Dell</option>
                            <option value="hp" ${template.vendor === 'hp' ? 'selected' : ''}>HP</option>
                            <option value="cisco" ${template.vendor === 'cisco' ? 'selected' : ''}>Cisco</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Type *</label>
                        <select id="template-type" class="form-control">
                            <option value="server" ${template.type === 'server' ? 'selected' : ''}>Server</option>
                            <option value="switch" ${template.type === 'switch' ? 'selected' : ''}>Switch</option>
                            <option value="san" ${template.type === 'san' ? 'selected' : ''}>SAN</option>
                            <option value="rack" ${template.type === 'rack' ? 'selected' : ''}>Rack</option>
                            <option value="firewall" ${template.type === 'firewall' ? 'selected' : ''}>Firewall</option>
                            <option value="router" ${template.type === 'router' ? 'selected' : ''}>Router</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Width (px)</label>
                        <input type="number" id="template-width" class="form-control" value="${template.width || 120}" min="50" max="500">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Height (px)</label>
                        <input type="number" id="template-height" class="form-control" value="${template.height || 80}" min="50" max="500">
                    </div>
                </div>

                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Device Image *</label>
                    <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem;">
                        <input type="hidden" id="template-image-path" value="${this.escapeHtml(currentImagePath)}">
                        <div id="selected-image-preview" style="flex: 1; min-height: 80px; border: 2px dashed #cbd5e1; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: #f8fafc;">
                            ${currentImagePath ? `
                                <div style="text-align: center;">
                                    <img src="${currentImagePath}" alt="Preview" style="max-width: 150px; max-height: 80px; object-fit: contain; border-radius: 4px;">
                                    <div style="margin-top: 0.25rem; font-size: 0.75rem; color: #64748b;">${this.escapeHtml(currentImagePath)}</div>
                                </div>
                            ` : `
                                <div style="text-align: center; color: #94a3b8;">
                                    <i class="fas fa-image" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                                    <div>No image selected</div>
                                </div>
                            `}
                        </div>
                        <button type="button" class="btn btn-secondary" onclick="infraDiagramInstance.toggleImageBrowser()">
                            <i class="fas fa-folder-open"></i> Browse
                        </button>
                    </div>
                    ${this.showImageBrowser ? this.renderImageBrowser() : ''}
                </div>

                <div style="margin-bottom: 1rem;">
                    <h5 style="margin-bottom: 0.5rem;">Ports</h5>
                    <div id="ports-list" style="margin-bottom: 0.5rem;">
                        ${template.ports && template.ports.length > 0 ? template.ports.map((port, idx) => this.renderPortForm(port, idx)).join('') : ''}
                    </div>
                    <button type="button" class="btn btn-sm" onclick="infraDiagramInstance.addPortForm()">
                        <i class="fas fa-plus"></i> Add Port
                    </button>
                </div>

                <div style="margin-bottom: 1rem;">
                    <h5 style="margin-bottom: 0.5rem;">Connectors</h5>
                    <div id="connectors-list" style="margin-bottom: 0.5rem;">
                        ${template.connectors && template.connectors.length > 0 ? template.connectors.map((conn, idx) => this.renderConnectorForm(conn, idx)).join('') : ''}
                    </div>
                    <button type="button" class="btn btn-sm" onclick="infraDiagramInstance.addConnectorForm()">
                        <i class="fas fa-plus"></i> Add Connector
                    </button>
                </div>

                <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                    <button class="btn btn-primary" onclick="infraDiagramInstance.saveTemplate()">
                        <i class="fas fa-save"></i> Save Template
                    </button>
                    <button class="btn btn-secondary" onclick="infraDiagramInstance.cancelTemplateForm()">
                        Cancel
                    </button>
                </div>
            </div>
        `;
    }

    renderPortForm(port = {}, index = 0) {
        return `
            <div class="port-form-item" style="border: 1px solid #e2e8f0; border-radius: 4px; padding: 0.75rem; margin-bottom: 0.5rem; background: white;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <strong>Port ${index + 1}</strong>
                    <button type="button" class="btn btn-sm btn-danger" onclick="infraDiagramInstance.removePortForm(this)">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; margin-bottom: 0.5rem;">
                    <div>
                        <label style="font-size: 0.75rem;">ID</label>
                        <input type="text" class="form-control form-control-sm port-id" value="${this.escapeHtml(port.id || '')}" placeholder="eth0">
                    </div>
                    <div>
                        <label style="font-size: 0.75rem;">Type</label>
                        <select class="form-control form-control-sm port-type">
                            <option value="ethernet" ${port.type === 'ethernet' ? 'selected' : ''}>Ethernet</option>
                            <option value="fc" ${port.type === 'fc' ? 'selected' : ''}>FC</option>
                            <option value="serial" ${port.type === 'serial' ? 'selected' : ''}>Serial</option>
                            <option value="usb" ${port.type === 'usb' ? 'selected' : ''}>USB</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-size: 0.75rem;">Name</label>
                        <input type="text" class="form-control form-control-sm port-name" value="${this.escapeHtml(port.name || '')}" placeholder="Ethernet 0">
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; margin-bottom: 0.5rem;">
                    <div>
                        <label style="font-size: 0.75rem;">X (0-1)</label>
                        <input type="number" class="form-control form-control-sm port-x" value="${port.x || 0}" step="0.01" min="0" max="1">
                    </div>
                    <div>
                        <label style="font-size: 0.75rem;">Y (0-1)</label>
                        <input type="number" class="form-control form-control-sm port-y" value="${port.y || 0}" step="0.01" min="0" max="1">
                    </div>
                    <div>
                        <label style="font-size: 0.75rem;">Width</label>
                        <input type="number" class="form-control form-control-sm port-width" value="${port.width || 0.03}" step="0.01" min="0" max="1">
                    </div>
                    <div>
                        <label style="font-size: 0.75rem;">Height</label>
                        <input type="number" class="form-control form-control-sm port-height" value="${port.height || 0.04}" step="0.01" min="0" max="1">
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                    <div>
                        <label style="font-size: 0.75rem;">Side</label>
                        <select class="form-control form-control-sm port-side">
                            <option value="front" ${port.side === 'front' ? 'selected' : ''}>Front</option>
                            <option value="back" ${port.side === 'back' ? 'selected' : ''}>Back</option>
                            <option value="left" ${port.side === 'left' ? 'selected' : ''}>Left</option>
                            <option value="right" ${port.side === 'right' ? 'selected' : ''}>Right</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-size: 0.75rem;">Color</label>
                        <input type="color" class="form-control form-control-sm port-color" value="${port.color || '#00ff00'}">
                    </div>
                </div>
            </div>
        `;
    }

    renderConnectorForm(connector = {}, index = 0) {
        return `
            <div class="connector-form-item" style="border: 1px solid #e2e8f0; border-radius: 4px; padding: 0.75rem; margin-bottom: 0.5rem; background: white;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <strong>Connector ${index + 1}</strong>
                    <button type="button" class="btn btn-sm btn-danger" onclick="infraDiagramInstance.removeConnectorForm(this)">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem;">
                    <div>
                        <label style="font-size: 0.75rem;">ID</label>
                        <input type="text" class="form-control form-control-sm connector-id" value="${this.escapeHtml(connector.id || '')}" placeholder="power1">
                    </div>
                    <div>
                        <label style="font-size: 0.75rem;">Type</label>
                        <select class="form-control form-control-sm connector-type">
                            <option value="power" ${connector.type === 'power' ? 'selected' : ''}>Power</option>
                            <option value="network" ${connector.type === 'network' ? 'selected' : ''}>Network</option>
                            <option value="fiber" ${connector.type === 'fiber' ? 'selected' : ''}>Fiber</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-size: 0.75rem;">X (0-1)</label>
                        <input type="number" class="form-control form-control-sm connector-x" value="${connector.x || 0}" step="0.01" min="0" max="1">
                    </div>
                    <div>
                        <label style="font-size: 0.75rem;">Y (0-1)</label>
                        <input type="number" class="form-control form-control-sm connector-y" value="${connector.y || 0}" step="0.01" min="0" max="1">
                    </div>
                </div>
            </div>
        `;
    }

    showCreateTemplateForm() {
        this.editingTemplate = null;
        this.showTemplateForm = true;
        // Update display without closing modal
        const modalBody = document.querySelector('.modal-body');
        if (modalBody) {
            modalBody.innerHTML = `
                <div style="margin-bottom: 1rem;">
                    <button class="btn btn-primary" onclick="infraDiagramInstance.showCreateTemplateForm()">
                        <i class="fas fa-plus"></i> Create New Template
                    </button>
                </div>
                
                <div id="template-list-container" style="display: none;">
                    ${this.renderTemplateList()}
                </div>
                
                <div id="template-form-container" style="display: block;">
                    ${this.renderTemplateForm()}
                </div>
            `;
        }
    }

    async editTemplate(id) {
        if (!this.deviceTemplates || !Array.isArray(this.deviceTemplates)) {
            return;
        }
        this.editingTemplate = this.deviceTemplates.find(t => t.id === id);
        this.showTemplateForm = true;
        this.showImageBrowser = false;
        this.selectedImagePath = this.editingTemplate?.imagePath || '';
        await this.loadAvailableImages();
        // Update display without closing modal
        const modalBody = document.querySelector('.modal-body');
        if (modalBody) {
            modalBody.innerHTML = `
                <div style="margin-bottom: 1rem;">
                    <button class="btn btn-primary" onclick="infraDiagramInstance.showCreateTemplateForm()">
                        <i class="fas fa-plus"></i> Create New Template
                    </button>
                </div>
                
                <div id="template-list-container" style="display: none;">
                    ${this.renderTemplateList()}
                </div>
                
                <div id="template-form-container" style="display: block;">
                    ${this.renderTemplateForm()}
                </div>
            `;
        }
    }

    cancelTemplateForm() {
        this.editingTemplate = null;
        this.showTemplateForm = false;
        this.showImageBrowser = false;
        this.selectedImagePath = '';
        // Update display without closing modal
        const modalBody = document.querySelector('.modal-body');
        if (modalBody) {
            modalBody.innerHTML = `
                <div style="margin-bottom: 1rem;">
                    <button class="btn btn-primary" onclick="infraDiagramInstance.showCreateTemplateForm()">
                        <i class="fas fa-plus"></i> Create New Template
                    </button>
                </div>
                
                <div id="template-list-container" style="display: block;">
                    ${this.renderTemplateList()}
                </div>
                
                <div id="template-form-container" style="display: none;">
                    ${this.renderTemplateForm()}
                </div>
            `;
        }
    }

    addPortForm() {
        const portsList = document.getElementById('ports-list');
        const index = portsList.querySelectorAll('.port-form-item').length;
        const portForm = document.createElement('div');
        portForm.innerHTML = this.renderPortForm({}, index);
        portsList.appendChild(portForm);
    }

    removePortForm(button) {
        button.closest('.port-form-item').remove();
    }

    addConnectorForm() {
        const connectorsList = document.getElementById('connectors-list');
        const index = connectorsList.querySelectorAll('.connector-form-item').length;
        const connectorForm = document.createElement('div');
        connectorForm.innerHTML = this.renderConnectorForm({}, index);
        connectorsList.appendChild(connectorForm);
    }

    removeConnectorForm(button) {
        button.closest('.connector-form-item').remove();
    }

    async toggleImageBrowser() {
        this.showImageBrowser = !this.showImageBrowser;
        if (this.showImageBrowser && this.availableImages.length === 0) {
            await this.loadAvailableImages();
        }
        // Update form to show/hide browser
        const formContainer = document.getElementById('template-form-container');
        if (formContainer) {
            const formHTML = this.renderTemplateForm();
            formContainer.innerHTML = formHTML;
        }
    }

    async loadAvailableImages() {
        try {
            const response = await api.fetch('/api/device-images');
            if (response.ok) {
                this.availableImages = await response.json();
            } else {
                this.availableImages = [];
            }
        } catch (error) {
            console.error('Error loading available images:', error);
            this.availableImages = [];
        }
    }

    selectImage(imagePath) {
        this.selectedImagePath = imagePath;
        const hiddenInput = document.getElementById('template-image-path');
        if (hiddenInput) {
            hiddenInput.value = imagePath;
        }
        // Update preview
        const preview = document.getElementById('selected-image-preview');
        if (preview) {
            preview.innerHTML = `
                <div style="text-align: center;">
                    <img src="${imagePath}" alt="Preview" style="max-width: 150px; max-height: 80px; object-fit: contain; border-radius: 4px;">
                    <div style="margin-top: 0.25rem; font-size: 0.75rem; color: #64748b;">${this.escapeHtml(imagePath)}</div>
                </div>
            `;
        }
        this.showImageBrowser = false;
        // Update form to hide browser
        const formContainer = document.getElementById('template-form-container');
        if (formContainer) {
            const formHTML = this.renderTemplateForm();
            formContainer.innerHTML = formHTML;
        }
    }

    renderImageBrowser() {
        if (this.availableImages.length === 0) {
            return `
                <div style="border: 2px dashed #cbd5e1; border-radius: 8px; padding: 2rem; text-align: center; background: #f8fafc;">
                    <i class="fas fa-folder-open" style="font-size: 2rem; color: #94a3b8; margin-bottom: 0.5rem;"></i>
                    <div style="color: #64748b;">No images found in /images/devices/ folder</div>
                    <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 0.5rem;">
                        Place your device images in the <code>static/images/devices/</code> folder
                    </div>
                </div>
            `;
        }

        return `
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; background: white; max-height: 400px; overflow-y: auto;">
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 1rem;">
                    ${this.availableImages.map(imgPath => `
                        <div class="image-selector-item" 
                             onclick="infraDiagramInstance.selectImage('${this.escapeHtml(imgPath)}')"
                             style="cursor: pointer; border: 2px solid ${this.selectedImagePath === imgPath ? '#3b82f6' : '#e2e8f0'}; border-radius: 8px; padding: 0.5rem; background: ${this.selectedImagePath === imgPath ? '#eff6ff' : '#f8fafc'}; transition: all 0.2s;">
                            <img src="${this.escapeHtml(imgPath)}" 
                                 alt="${this.escapeHtml(imgPath)}" 
                                 style="width: 100%; height: 80px; object-fit: contain; border-radius: 4px; margin-bottom: 0.25rem;">
                            <div style="font-size: 0.65rem; color: #64748b; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;" title="${this.escapeHtml(imgPath)}">
                                ${this.escapeHtml(imgPath.split('/').pop())}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    async saveTemplate() {
        const name = document.getElementById('template-name').value.trim();
        const category = document.getElementById('template-category').value;
        const type = document.getElementById('template-type').value;
        const vendor = document.getElementById('template-vendor').value;
        const imagePath = document.getElementById('template-image-path').value.trim();
        const width = parseInt(document.getElementById('template-width').value);
        const height = parseInt(document.getElementById('template-height').value);

        if (!name || !imagePath) {
            alert('Name and Image Path are required');
            return;
        }

        // Collect ports
        const ports = Array.from(document.querySelectorAll('.port-form-item')).map(item => ({
            id: item.querySelector('.port-id').value.trim(),
            type: item.querySelector('.port-type').value,
            name: item.querySelector('.port-name').value.trim(),
            x: parseFloat(item.querySelector('.port-x').value),
            y: parseFloat(item.querySelector('.port-y').value),
            width: parseFloat(item.querySelector('.port-width').value),
            height: parseFloat(item.querySelector('.port-height').value),
            side: item.querySelector('.port-side').value,
            color: item.querySelector('.port-color').value
        })).filter(p => p.id && p.name);

        // Collect connectors
        const connectors = Array.from(document.querySelectorAll('.connector-form-item')).map(item => ({
            id: item.querySelector('.connector-id').value.trim(),
            type: item.querySelector('.connector-type').value,
            name: item.querySelector('.connector-id').value.trim(),
            x: parseFloat(item.querySelector('.connector-x').value),
            y: parseFloat(item.querySelector('.connector-y').value),
            side: 'back'
        })).filter(c => c.id);

        const template = {
            name,
            category,
            type,
            vendor,
            imagePath,
            width,
            height,
            ports,
            connectors,
            metadata: {}
        };

        try {
            const url = this.editingTemplate
                ? '/api/device-templates/update'
                : '/api/device-templates';

            const body = this.editingTemplate
                ? { ...template, id: this.editingTemplate.id }
                : template;

            const response = await api.fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                await this.loadDeviceTemplates();
                await this.preloadDeviceImages();
                this.editingTemplate = null;
                this.showTemplateForm = false;
                // Update modal content without closing it
                const modalBody = document.querySelector('.modal-body');
                if (modalBody && this.showDeviceTemplateModal) {
                    modalBody.innerHTML = `
                        <div style="margin-bottom: 1rem;">
                            <button class="btn btn-primary" onclick="infraDiagramInstance.showCreateTemplateForm()">
                                <i class="fas fa-plus"></i> Create New Template
                            </button>
                        </div>
                        
                        <div id="template-list-container" style="display: block;">
                            ${this.renderTemplateList()}
                        </div>
                        
                        <div id="template-form-container" style="display: none;">
                            ${this.renderTemplateForm()}
                        </div>
                    `;
                }
                alert('Template saved successfully!');
            } else {
                const error = await response.text();
                alert('Error saving template: ' + error);
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }

    async deleteTemplate(id) {
        if (!confirm('Are you sure you want to delete this template?')) {
            return;
        }

        try {
            const response = await api.fetch('/api/device-templates/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id })
            });

            if (response.ok) {
                await this.loadDeviceTemplates();
                // Update modal content if modal is open
                if (this.showDeviceTemplateModal) {
                    const modalBody = document.querySelector('.modal-body');
                    if (modalBody) {
                        modalBody.innerHTML = `
                            <div style="margin-bottom: 1rem;">
                                <button class="btn btn-primary" onclick="infraDiagramInstance.showCreateTemplateForm()">
                                    <i class="fas fa-plus"></i> Create New Template
                                </button>
                            </div>
                            
                            <div id="template-list-container" style="display: ${this.showTemplateForm ? 'none' : 'block'};">
                                ${this.renderTemplateList()}
                            </div>
                            
                            <div id="template-form-container" style="display: ${this.showTemplateForm ? 'block' : 'none'};">
                                ${this.showTemplateForm ? this.renderTemplateForm() : ''}
                            </div>
                        `;
                    }
                }
                alert('Template deleted successfully!');
            } else {
                const error = await response.text();
                alert('Error deleting template: ' + error);
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }

    async mount() {
        window.infraDiagramInstance = this;
        await this.loadDiagrams();
        await this.loadDeviceTemplates();

        // Check if we're opening a specific diagram (from URL or state)
        const urlParams = new URLSearchParams(window.location.search);
        const diagramId = urlParams.get('id');
        if (diagramId) {
            await this.openDiagram(parseInt(diagramId));
        } else {
            this.viewMode = 'list';
            this.updateDisplay();
        }
    }

    getFilteredDiagrams() {
        let filtered = [...this.diagrams];

        // Apply search filter
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(d =>
                d.name.toLowerCase().includes(query)
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (this.sortBy) {
                case 'name':
                    return (a.name || '').localeCompare(b.name || '');
                case 'created':
                    return new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0);
                case 'updated':
                default:
                    return new Date(b.updatedAt || b.updated_at || 0) - new Date(a.updatedAt || a.updated_at || 0);
            }
        });

        return filtered;
    }

    async createNewDiagram() {
        this.currentDiagramId = null;
        this.currentDiagram = null;
        this.components = [];
        this.connections = [];
        this.viewMode = 'editor';
        this.updateDisplay();
        // Wait for DOM to update, then init canvas
        setTimeout(() => {
            this.initCanvas();
            // Open sidebar after rendering
            if (window.sidebarInstance && !this.sidebarOpen) {
                this.toggleToolbarSidebar();
            }
        }, 100);
    }

    async openDiagram(id) {
        try {
            const response = await api.fetch(`/api/infrastructure-diagrams/get?id=${id}`);
            if (response.ok) {
                const diagram = await response.json();
                this.currentDiagramId = diagram.id;
                this.currentDiagram = diagram;
                this.components = diagram.components || [];
                this.connections = diagram.connections || [];

                // Restore template references for components
                this.components.forEach(component => {
                    if (component.templateId && !component.template) {
                        component.template = (this.deviceTemplates || []).find(t => t.id === component.templateId);
                    }
                });

                this.viewMode = 'editor';
                this.updateDisplay();
                // Wait for DOM to update, then init canvas
                setTimeout(() => {
                    this.initCanvas();
                    // Open sidebar after rendering
                    if (window.sidebarInstance && !this.sidebarOpen) {
                        this.toggleToolbarSidebar();
                    }
                }, 100);
            } else {
                alert('Error loading diagram');
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }

    backToList() {
        this.viewMode = 'list';
        this.currentDiagramId = null;
        this.currentDiagram = null;
        this.components = [];
        this.connections = [];
        this.updateDisplay();
    }

    async saveCurrentDiagram() {
        let name = this.currentDiagram ? this.currentDiagram.name : null;
        if (!name) {
            name = prompt('Enter diagram name:');
            if (!name) return;
        }

        const diagramData = {
            name: name,
            components: this.components,
            connections: this.connections
        };

        // Include ID if updating existing diagram
        if (this.currentDiagramId) {
            diagramData.id = this.currentDiagramId;
        }

        try {
            const response = await api.fetch('/api/infrastructure-diagrams', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(diagramData)
            });

            if (response.ok) {
                const result = await response.json();
                if (!this.currentDiagramId && result.id) {
                    this.currentDiagramId = result.id;
                }
                // Update current diagram name
                if (this.currentDiagram) {
                    this.currentDiagram.name = name;
                } else {
                    this.currentDiagram = { name: name };
                }
                await this.loadDiagrams();
                alert('Diagram saved successfully!');
            } else {
                const error = await response.text();
                alert('Error saving diagram: ' + error);
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }

    async renameDiagram(id) {
        const diagram = this.diagrams.find(d => d.id === id);
        if (!diagram) return;

        const newName = prompt('Enter new diagram name:', diagram.name);
        if (!newName || newName === diagram.name) return;

        // Load the diagram, update the name, and save it
        try {
            const response = await api.fetch(`/api/infrastructure-diagrams/get?id=${id}`);
            if (response.ok) {
                const diagramData = await response.json();
                diagramData.name = newName;

                const saveResponse = await api.fetch('/api/infrastructure-diagrams', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        id: id,
                        name: newName,
                        components: diagramData.components,
                        connections: diagramData.connections
                    })
                });

                if (saveResponse.ok) {
                    await this.loadDiagrams();
                    this.updateDisplay();
                } else {
                    alert('Error renaming diagram');
                }
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }

    async loadDeviceTemplates() {
        try {
            const response = await api.fetch('/api/device-templates');
            if (response.ok) {
                const templates = await response.json();
                this.deviceTemplates = Array.isArray(templates) ? templates : [];
                // Preload device images
                await this.preloadDeviceImages();
            } else {
                this.deviceTemplates = [];
            }
        } catch (error) {
            console.error('Error loading device templates:', error);
            this.deviceTemplates = [];
        }
    }

    async preloadDeviceImages() {
        if (!this.deviceTemplates || !Array.isArray(this.deviceTemplates)) {
            return;
        }
        const imagePromises = this.deviceTemplates.map(template => {
            return new Promise((resolve) => {
                if (template.imagePath && !this.deviceImages[template.imagePath]) {
                    const img = new Image();
                    img.onload = () => {
                        this.deviceImages[template.imagePath] = img;
                        resolve();
                    };
                    img.onerror = () => {
                        console.warn(`Failed to load image: ${template.imagePath}`);
                        resolve();
                    };
                    img.src = template.imagePath;
                } else {
                    resolve();
                }
            });
        });
        await Promise.all(imagePromises);
    }

    getDeviceTemplate(type) {
        if (!this.deviceTemplates || !Array.isArray(this.deviceTemplates)) {
            return null;
        }
        // Try to find exact match first (e.g., 'server-dell')
        let template = this.deviceTemplates.find(t =>
            `${t.type}-${t.vendor}` === type ||
            `${t.type}-${t.vendor.toLowerCase()}` === type.toLowerCase()
        );

        // Fallback to type match (e.g., 'server-generic')
        if (!template) {
            const parts = type.split('-');
            if (parts.length > 1) {
                template = this.deviceTemplates.find(t =>
                    t.type === parts[0] && t.vendor === 'generic'
                );
            }
        }

        return template || null;
    }

    initCanvas() {
        this.canvas = document.getElementById('infra-diagram-canvas');
        if (!this.canvas) return;

        const ctx = this.canvas.getContext('2d');

        // Resize canvas to match wrapper size
        this.resizeCanvas();

        // Set up canvas event listeners
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

        // Initialize panning
        this.initializePanning();

        // Update container height based on footer state
        this.updateContainerHeight();
        // Listen for footer state changes
        this.setupFooterListener();

        this.redraw();
    }

    resizeCanvas() {
        if (!this.canvas) return;

        const wrapper = this.canvas.parentElement;
        if (!wrapper) return;

        // Set canvas size to match wrapper
        this.canvas.width = wrapper.clientWidth;
        this.canvas.height = wrapper.clientHeight;

        // Redraw after resize
        this.redraw();
    }

    updateContainerHeight() {
        const container = document.querySelector('.diagram-editor-container');
        if (!container) return;

        const header = document.querySelector('.app-header');
        const footer = document.querySelector('.app-footer');

        if (!header || !footer) return;

        const headerHeight = header.offsetHeight || 80;
        const footerTabs = footer.querySelector('.footer-tabs');
        const footerPanel = footer.querySelector('.footer-panel');

        const footerTabsHeight = footerTabs ? footerTabs.offsetHeight : 40;
        const isFooterExpanded = footerPanel && footerPanel.classList.contains('expanded');

        // When footer is expanded, it goes over the container
        // So we keep the bottom at tabs height
        const bottom = footerTabsHeight;
        const height = `calc(100vh - ${headerHeight}px - ${footerTabsHeight}px)`;

        container.style.top = `${headerHeight}px`;
        container.style.bottom = `${bottom}px`;
        container.style.height = height;

        // Resize canvas after container height update
        setTimeout(() => this.resizeCanvas(), 0);
    }

    setupFooterListener() {
        // Remove existing listener if any
        if (this.footerObserver) {
            this.footerObserver.disconnect();
        }

        const footer = document.querySelector('.app-footer');
        if (!footer) return;

        // Use MutationObserver to watch for footer panel expansion
        this.footerObserver = new MutationObserver(() => {
            this.updateContainerHeight();
        });

        const footerPanel = footer.querySelector('.footer-panel');
        if (footerPanel) {
            this.footerObserver.observe(footerPanel, {
                attributes: true,
                attributeFilter: ['class']
            });
        }

        // Also listen for window resize
        if (!this.resizeHandler) {
            this.resizeHandler = () => {
                this.updateContainerHeight();
                this.resizeCanvas();
            };
            window.addEventListener('resize', this.resizeHandler);
        }
    }

    initializePanning() {
        if (!this.canvas) return;

        // Panning is handled in handleMouseDown, handleMouseMove, handleMouseUp
        // This method is here for consistency with AutomationPage structure
    }

    handleWheel(e) {
        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        // Get mouse position in world coordinates before zoom
        const worldX = (screenX - this.canvasOffset.x) / this.zoom;
        const worldY = (screenY - this.canvasOffset.y) / this.zoom;

        // Zoom step
        const zoomStep = 0.1;
        const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
        const newZoom = Math.max(0.5, Math.min(2.0, this.zoom + delta));

        if (Math.abs(newZoom - this.zoom) > 0.001) {
            // Adjust offset to zoom towards mouse position
            this.canvasOffset.x = screenX - worldX * newZoom;
            this.canvasOffset.y = screenY - worldY * newZoom;
            this.zoom = newZoom;

            this.updateZoomIndicator();
            this.redraw();
        }
    }

    zoomIn() {
        this.zoom = Math.min(this.zoom + 0.1, 2.0);
        this.updateZoomIndicator();
        this.redraw();
    }

    zoomOut() {
        this.zoom = Math.max(this.zoom - 0.1, 0.5);
        this.updateZoomIndicator();
        this.redraw();
    }

    resetZoom() {
        this.zoom = 1.0;
        this.canvasOffset = { x: 0, y: 0 };
        this.updateZoomIndicator();
        this.redraw();
    }

    updateZoomIndicator() {
        const indicator = document.getElementById('zoom-indicator');
        if (indicator) {
            indicator.textContent = `${Math.round(this.zoom * 100)}%`;
        }
    }

    selectTool(tool) {
        this.selectedTool = tool;
        this.selectedComponent = null;
        // Update sidebar content to reflect active state
        if (window.sidebarInstance && this.sidebarOpen) {
            window.sidebarInstance.update({
                content: this.getToolbarContent()
            });
        }
        this.redraw();
    }

    /**
     * Generate ports for a component
     */
    generatePorts(component) {
        const width = component.width || 120;
        const height = component.height || 80;
        const ports = [];

        // Top side ports
        for (let i = 0; i < this.portsPerSide; i++) {
            const x = component.x + (width / (this.portsPerSide + 1)) * (i + 1);
            const y = component.y;
            ports.push({
                id: `port-${component.id}-top-${i}`,
                side: 'top',
                index: i,
                x: x,
                y: y,
                componentId: component.id
            });
        }

        // Bottom side ports
        for (let i = 0; i < this.portsPerSide; i++) {
            const x = component.x + (width / (this.portsPerSide + 1)) * (i + 1);
            const y = component.y + height;
            ports.push({
                id: `port-${component.id}-bottom-${i}`,
                side: 'bottom',
                index: i,
                x: x,
                y: y,
                componentId: component.id
            });
        }

        // Left side ports
        for (let i = 0; i < this.portsPerSide; i++) {
            const x = component.x;
            const y = component.y + (height / (this.portsPerSide + 1)) * (i + 1);
            ports.push({
                id: `port-${component.id}-left-${i}`,
                side: 'left',
                index: i,
                x: x,
                y: y,
                componentId: component.id
            });
        }

        // Right side ports
        for (let i = 0; i < this.portsPerSide; i++) {
            const x = component.x + width;
            const y = component.y + (height / (this.portsPerSide + 1)) * (i + 1);
            ports.push({
                id: `port-${component.id}-right-${i}`,
                side: 'right',
                index: i,
                x: x,
                y: y,
                componentId: component.id
            });
        }

        return ports;
    }

    /**
     * Get all ports for a component
     */
    getComponentPorts(componentId) {
        const component = this.components.find(c => c.id === componentId);
        if (!component) return [];

        if (!component.ports || component.ports.length === 0) {
            component.ports = this.generatePorts(component);
        }

        // Update port positions based on current component position
        const width = component.width || 120;
        const height = component.height || 80;

        component.ports.forEach(port => {
            if (port.side === 'top') {
                port.x = component.x + (width / (this.portsPerSide + 1)) * (port.index + 1);
                port.y = component.y;
            } else if (port.side === 'bottom') {
                port.x = component.x + (width / (this.portsPerSide + 1)) * (port.index + 1);
                port.y = component.y + height;
            } else if (port.side === 'left') {
                port.x = component.x;
                port.y = component.y + (height / (this.portsPerSide + 1)) * (port.index + 1);
            } else if (port.side === 'right') {
                port.x = component.x + width;
                port.y = component.y + (height / (this.portsPerSide + 1)) * (port.index + 1);
            }
        });

        return component.ports;
    }

    /**
     * Get port at world coordinates
     */
    getPortAt(worldX, worldY) {
        for (const component of this.components) {
            const ports = this.getComponentPorts(component.id);
            for (const port of ports) {
                const dist = Math.sqrt((worldX - port.x) ** 2 + (worldY - port.y) ** 2);
                if (dist <= this.portSize + 3) {
                    return port;
                }
            }
        }
        return null;
    }

    addComponentFromTemplate(templateId) {
        const template = (this.deviceTemplates || []).find(t => t.id === templateId);
        if (!template) {
            alert('Template not found');
            return;
        }

        // Create component using template
        const component = {
            id: Date.now(),
            type: `template-${templateId}`,
            x: 100 + Math.random() * 200,
            y: 100 + Math.random() * 200,
            width: template.width || 120,
            height: template.height || 80,
            label: template.name,
            color: '#6b7280',
            templateId: template.id,
            template: template,
            ports: [] // Will be generated
        };
        // Generate ports for the component
        component.ports = this.generatePorts(component);
        this.components.push(component);
        this.redraw();
    }

    addComponent(type, options = {}) {
        let template = null;
        let componentType = type;

        // Check if it's a template-based component
        if (type.startsWith('template-')) {
            const templateId = parseInt(type.replace('template-', ''));
            template = (this.deviceTemplates || []).find(t => t.id === templateId);
        } else {
            // Try to get template for legacy types (for backward compatibility)
            template = this.getDeviceTemplate(type);
        }

        const component = {
            id: Date.now(),
            type: componentType,
            x: 100 + Math.random() * 200,
            y: 100 + Math.random() * 200,
            width: template ? (template.width || 120) : (type === 'box' ? 120 : 120),
            height: template ? (template.height || 80) : (type === 'box' ? 80 : 80),
            label: this.getComponentLabel(type),
            color: this.getComponentColor(type),
            templateId: template ? template.id : null,
            template: template || null,
            ports: [] // Will be generated on first access
        };
        // Generate ports for the component
        component.ports = this.generatePorts(component);
        this.components.push(component);
        this.redraw();
    }

    getComponentLabel(type) {
        // Check if it's a template-based component
        if (type.startsWith('template-')) {
            const templateId = parseInt(type.replace('template-', ''));
            const template = (this.deviceTemplates || []).find(t => t.id === templateId);
            return template ? template.name : type;
        }

        const labels = {
            'box': 'Box',
            'vm': 'VM'
        };
        return labels[type] || type;
    }

    getComponentColor(type) {
        // Template-based components use gray color (they'll use their image)
        if (type.startsWith('template-')) {
            return '#6b7280';
        }

        const colors = {
            'box': '#3b82f6',
            'vm': '#10b981'
        };
        return colors[type] || '#6b7280';
    }

    getComponentIcon(type) {
        const icons = {
            'server-dell': '\uf233', // Server icon
            'server-hp': '\uf233',
            'server-cisco': '\uf233',
            'server-generic': '\uf233',
            'vm': '\uf1b2', // Cube icon
            'san-dell': '\uf1c0', // Database icon
            'san-hp': '\uf1c0',
            'san-cisco': '\uf1c0',
            'san-generic': '\uf1c0',
            'switch-cisco': '\uf6ff', // Network icon
            'switch-dell': '\uf6ff',
            'switch-hp': '\uf6ff',
            'switch-generic': '\uf6ff',
            'rack': '\uf233',
            'firewall': '\uf3ed', // Shield icon
            'router': '\uf6ff',
            'loadbalancer': '\uf24e' // Balance scale icon
        };
        return icons[type] || '\uf1b2';
    }

    getComponentVendor(type) {
        if (type.includes('dell')) return 'Dell';
        if (type.includes('hp')) return 'HP';
        if (type.includes('cisco')) return 'Cisco';
        return '';
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        // Convert screen coordinates to world coordinates
        const worldX = (screenX - this.canvasOffset.x) / this.zoom;
        const worldY = (screenY - this.canvasOffset.y) / this.zoom;
        const x = worldX;
        const y = worldY;

        // Check if clicking on delete button first (prevent dragging)
        if (this.selectedComponent) {
            const component = this.selectedComponent;
            const template = component.template || (component.templateId ? (this.deviceTemplates || []).find(t => t.id === component.templateId) : null);
            const imgWidth = component.width || (template ? template.width : 120) || 120;
            const deleteBtnSize = 28;
            const deleteBtnX = component.x + imgWidth - deleteBtnSize / 2 - 5;
            const deleteBtnY = component.y - deleteBtnSize / 2 + 5;
            const distance = Math.sqrt(Math.pow(x - deleteBtnX, 2) + Math.pow(y - deleteBtnY, 2));

            if (distance <= deleteBtnSize / 2) {
                // Clicked on delete button - prevent dragging
                e.stopPropagation();
                return;
            }
        }

        // Check for port click first (before component selection) - like Automation
        // Ports are visible when connecting, hovering, or selected
        if (this.connecting || this.hoveredComponent || this.selectedComponent || this.selectedTool === 'connect') {
            const clickedPort = this.getPortAt(x, y);
            if (clickedPort) {
                e.preventDefault();
                e.stopPropagation();
                this.startConnection(clickedPort);
                this.isDragging = true; // Enable dragging for connection line
                return;
            }
        }

        // Check if clicking on empty space for panning
        if (this.selectedTool === 'select' && e.button === 0) {
            const component = this.getComponentAt(x, y);

            if (!component && !this.isDragging) {
                // Start panning on empty space
                this.isPanning = true;
                this.panStart.x = screenX - this.canvasOffset.x;
                this.panStart.y = screenY - this.canvasOffset.y;
                this.canvas.style.cursor = 'grabbing';
                e.preventDefault();
                return;
            }
        }

        if (this.selectedTool === 'select') {
            // Find component at click position
            const component = this.getComponentAt(x, y);
            if (component) {
                this.selectedComponent = component;
                this.isDragging = true;
                this.dragOffset.x = x - component.x;
                this.dragOffset.y = y - component.y;
            } else {
                this.selectedComponent = null;
            }
        } else if (this.selectedTool === 'connect') {
            // Start connection
            const component = this.getComponentAt(x, y);
            if (component) {
                this.connectionStart = component;
            }
        }

        this.redraw();
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        // Handle panning
        if (this.isPanning) {
            this.canvasOffset.x = screenX - this.panStart.x;
            this.canvasOffset.y = screenY - this.panStart.y;
            this.redraw();
            return;
        }

        // Convert screen coordinates to world coordinates
        const worldX = (screenX - this.canvasOffset.x) / this.zoom;
        const worldY = (screenY - this.canvasOffset.y) / this.zoom;
        const x = worldX;
        const y = worldY;

        // Handle connection dragging (like Automation)
        if (this.connecting && this.connectionStart) {
            this.tempConnectionEnd = {
                x: worldX,
                y: worldY
            };
            this.redraw();
            return;
        }

        // Check which component is hovered (for showing ports)
        let hoveredComponent = null;
        let hoveredPort = null;
        for (const component of this.components) {
            const width = component.width || 120;
            const height = component.height || 80;
            if (worldX >= component.x - this.showPortsDistance &&
                worldX <= component.x + width + this.showPortsDistance &&
                worldY >= component.y - this.showPortsDistance &&
                worldY <= component.y + height + this.showPortsDistance) {
                hoveredComponent = component;
                // Check if hovering over a port
                const ports = this.getComponentPorts(component.id);
                for (const port of ports) {
                    const distance = Math.sqrt(Math.pow(worldX - port.x, 2) + Math.pow(worldY - port.y, 2));
                    if (distance <= this.portSize + 5) {
                        hoveredPort = port;
                        break;
                    }
                }
                break;
            }
        }

        // Check if hovering over delete button
        if (this.selectedComponent && !this.isDragging) {
            const component = this.selectedComponent;
            const template = component.template || (component.templateId ? (this.deviceTemplates || []).find(t => t.id === component.templateId) : null);
            const imgWidth = component.width || (template ? template.width : 120) || 120;
            const deleteBtnSize = 28;
            const deleteBtnX = component.x + imgWidth - deleteBtnSize / 2 - 5;
            const deleteBtnY = component.y - deleteBtnSize / 2 + 5;
            const distance = Math.sqrt(Math.pow(x - deleteBtnX, 2) + Math.pow(y - deleteBtnY, 2));

            if (distance <= deleteBtnSize / 2) {
                this.hoverDeleteButtonComponent = component;
            } else {
                this.hoverDeleteButtonComponent = null;
            }
        }

        // Update hovered component and port
        const componentChanged = this.hoveredComponent?.id !== hoveredComponent?.id;
        const portChanged = this.hoveredPort?.id !== hoveredPort?.id;

        if (componentChanged) {
            this.hoveredComponent = hoveredComponent;
            this.redraw(); // Redraw to show/hide all ports for the component
        }
        if (portChanged) {
            this.hoveredPort = hoveredPort;
            if (hoveredPort || this.hoveredPort) {
                this.redraw(); // Redraw to highlight/unhighlight port
            }
        }

        // Update cursor style
        if (this.isPanning) {
            this.canvas.style.cursor = 'grabbing';
        } else if (this.hoverDeleteButtonComponent) {
            this.canvas.style.cursor = 'pointer';
        } else if (this.connecting) {
            this.canvas.style.cursor = 'crosshair';
        } else if (hoveredPort) {
            this.canvas.style.cursor = 'pointer';
        } else {
            this.canvas.style.cursor = this.selectedTool === 'select' ? 'grab' : 'crosshair';
        }

        if (this.isDragging && this.selectedComponent && !this.connecting) {
            this.selectedComponent.x = x - this.dragOffset.x;
            this.selectedComponent.y = y - this.dragOffset.y;
            this.redraw();
        }
    }

    handleMouseUp(e) {
        // Stop panning
        if (this.isPanning) {
            this.isPanning = false;
            this.canvas.style.cursor = this.selectedTool === 'select' ? 'grab' : 'crosshair';
        }

        // Handle connection end (like Automation)
        if (this.connecting && this.connectionStart) {
            const rect = this.canvas.getBoundingClientRect();
            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;
            const worldX = (screenX - this.canvasOffset.x) / this.zoom;
            const worldY = (screenY - this.canvasOffset.y) / this.zoom;

            const targetPort = this.getPortAt(worldX, worldY);
            if (targetPort) {
                // Completing a connection
                if (this.connectionStart.componentId !== targetPort.componentId ||
                    this.connectionStart.portId !== targetPort.id) {
                    // Create connection between ports
                    this.connections.push({
                        id: Date.now() + Math.random(),
                        fromComponent: this.connectionStart.componentId,
                        fromPort: this.connectionStart.portId,
                        toComponent: targetPort.componentId,
                        toPort: targetPort.id,
                        type: this.selectedConnectionType || 'network'
                    });
                    this.saveCurrentDiagram();
                }
            }
            this.cleanupConnection();
            this.isDragging = false;
        }

        if (this.selectedTool === 'connect' && this.connectionStart) {
            const rect = this.canvas.getBoundingClientRect();
            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;
            const worldX = (screenX - this.canvasOffset.x) / this.zoom;
            const worldY = (screenY - this.canvasOffset.y) / this.zoom;
            const target = this.getComponentAt(worldX, worldY);

            if (target && target !== this.connectionStart) {
                // Allow multiple connections between same components
                this.connections.push({
                    from: this.connectionStart.id,
                    to: target.id,
                    type: this.selectedConnectionType || 'network',
                    id: Date.now() + Math.random() // Unique ID for each connection
                });
            }
            this.connectionStart = null;
        }

        this.isDragging = false;
        this.redraw();
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        // Convert screen coordinates to world coordinates
        const worldX = (screenX - this.canvasOffset.x) / this.zoom;
        const worldY = (screenY - this.canvasOffset.y) / this.zoom;
        const x = worldX;
        const y = worldY;

        // Check if clicking on delete button
        if (this.selectedComponent) {
            const component = this.selectedComponent;
            const template = component.template || (component.templateId ? (this.deviceTemplates || []).find(t => t.id === component.templateId) : null);
            const imgWidth = component.width || (template ? template.width : 120) || 120;
            const deleteBtnSize = 28;
            const deleteBtnX = component.x + imgWidth - deleteBtnSize / 2 - 5;
            const deleteBtnY = component.y - deleteBtnSize / 2 + 5;
            const distance = Math.sqrt(Math.pow(x - deleteBtnX, 2) + Math.pow(y - deleteBtnY, 2));

            if (distance <= deleteBtnSize / 2) {
                // Clicked on delete button
                e.stopPropagation();
                e.preventDefault();
                this.deleteComponent(component.id);
                this.hoverDeleteButtonComponent = null;
                return;
            }
        }

        // Check if clicking on connection delete button
        if (this.connectionDeleteButtons && this.selectedTool === 'select') {
            for (const btn of this.connectionDeleteButtons) {
                const distance = Math.sqrt(Math.pow(x - btn.x, 2) + Math.pow(y - btn.y, 2));
                if (distance <= btn.size / 2) {
                    this.deleteConnection(btn.connection.id);
                    this.hoverDeleteButtonConnection = null;
                    return;
                }
            }
        }

        // Check if clicking on a connection
        if (this.selectedTool === 'select' && this.connectionPaths) {
            const clickedConnection = this.getConnectionAt(x, y);
            if (clickedConnection) {
                if (e.ctrlKey || e.metaKey) {
                    // Delete connection on Ctrl/Cmd + click
                    this.deleteConnection(clickedConnection.id);
                } else {
                    // Select connection
                    this.selectedConnection = clickedConnection;
                    this.selectedComponent = null;
                }
                this.redraw();
                return;
            }
        }

        // Port clicks are handled in handleMouseDown, not here

        if (this.selectedTool === 'select') {
            const component = this.getComponentAt(x, y);
            if (component) {
                this.selectedComponent = component;
                this.selectedConnection = null;
            } else {
                this.selectedComponent = null;
                this.selectedConnection = null;
                // Don't cancel connection on empty space click - allow dragging
            }
        }

        // Cancel connection on empty space click (not during drag)
        if (!this.isDragging && this.connecting && !this.getComponentAt(x, y)) {
            this.cleanupConnection();
        }

        // Handle component selection/deletion with Ctrl+Click
        if (e.ctrlKey && this.selectedComponent) {
            this.deleteComponent(this.selectedComponent.id);
        }

        this.redraw();
    }

    getConnectionAt(x, y) {
        if (!this.connectionPaths) return null;

        const clickTolerance = 10; // Pixels

        for (const pathData of this.connectionPaths) {
            const path = pathData.pathData || pathData.points;
            if (!path) continue;

            // Handle simple paths
            if (path && path.type === 'simple') {
                // Check both segments of the L-shape
                const { start, corner, end } = path;

                // Check first segment (start to corner)
                const A1 = x - start.x;
                const B1 = y - start.y;
                const C1 = corner.x - start.x;
                const D1 = corner.y - start.y;
                const dot1 = A1 * C1 + B1 * D1;
                const lenSq1 = C1 * C1 + D1 * D1;
                let param1 = lenSq1 !== 0 ? dot1 / lenSq1 : -1;
                param1 = Math.max(0, Math.min(1, param1));
                const projX1 = start.x + param1 * C1;
                const projY1 = start.y + param1 * D1;
                const dist1 = Math.sqrt((x - projX1) ** 2 + (y - projY1) ** 2);
                if (dist1 <= clickTolerance) {
                    return pathData.connection;
                }

                // Check second segment (corner to end)
                const A2 = x - corner.x;
                const B2 = y - corner.y;
                const C2 = end.x - corner.x;
                const D2 = end.y - corner.y;
                const dot2 = A2 * C2 + B2 * D2;
                const lenSq2 = C2 * C2 + D2 * D2;
                let param2 = lenSq2 !== 0 ? dot2 / lenSq2 : -1;
                param2 = Math.max(0, Math.min(1, param2));
                const projX2 = corner.x + param2 * C2;
                const projY2 = corner.y + param2 * D2;
                const dist2 = Math.sqrt((x - projX2) ** 2 + (y - projY2) ** 2);
                if (dist2 <= clickTolerance) {
                    return pathData.connection;
                }
            } else if (Array.isArray(path) && path.length >= 2) {
                // Handle array of points
                for (let i = 0; i < path.length - 1; i++) {
                    const p1 = path[i];
                    const p2 = path[i + 1];

                    // Calculate distance from point to line segment
                    const A = x - p1.x;
                    const B = y - p1.y;
                    const C = p2.x - p1.x;
                    const D = p2.y - p1.y;

                    const dot = A * C + B * D;
                    const lenSq = C * C + D * D;
                    let param = -1;

                    if (lenSq !== 0) {
                        param = dot / lenSq;
                    }

                    let xx, yy;

                    if (param < 0) {
                        xx = p1.x;
                        yy = p1.y;
                    } else if (param > 1) {
                        xx = p2.x;
                        yy = p2.y;
                    } else {
                        xx = p1.x + param * C;
                        yy = p1.y + param * D;
                    }

                    const dx = x - xx;
                    const dy = y - yy;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance <= clickTolerance) {
                        return pathData.connection;
                    }
                }
            }
        }

        return null;
    }

    deleteConnection(connectionId) {
        this.connections = this.connections.filter(c => c.id !== connectionId);
        if (this.selectedConnection?.id === connectionId) {
            this.selectedConnection = null;
        }
        this.redraw();
    }

    getComponentAt(x, y) {
        for (let i = this.components.length - 1; i >= 0; i--) {
            const comp = this.components[i];
            if (x >= comp.x && x <= comp.x + comp.width &&
                y >= comp.y && y <= comp.y + comp.height) {
                return comp;
            }
        }
        return null;
    }

    deleteComponent(id) {
        this.components = this.components.filter(c => c.id !== id);
        this.connections = this.connections.filter(c => c.from !== id && c.to !== id);
        if (this.selectedComponent?.id === id) {
            this.selectedComponent = null;
        }
        this.redraw();
    }

    redraw() {
        if (!this.canvas) return;

        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Clear connection paths and delete buttons for click detection
        this.connectionPaths = [];
        this.connectionDeleteButtons = [];

        // Apply zoom and pan transform
        ctx.save();
        ctx.translate(this.canvasOffset.x, this.canvasOffset.y);
        ctx.scale(this.zoom, this.zoom);

        // Draw grid
        this.drawGrid(ctx);

        // Draw connections individually (no grouping)
        // Group by from/to pairs only for offset calculation
        const connectionGroups = new Map();
        this.connections.forEach(conn => {
            // Handle port-based connections
            if (conn.fromPort && conn.toPort) {
                const key = `${conn.fromComponent}-${conn.toComponent}-${conn.fromPort}-${conn.toPort}`;
                if (!connectionGroups.has(key)) {
                    connectionGroups.set(key, []);
                }
                connectionGroups.get(key).push(conn);
            } else {
                // Legacy connections
                const key = `${conn.from}-${conn.to}`;
                if (!connectionGroups.has(key)) {
                    connectionGroups.set(key, []);
                }
                connectionGroups.get(key).push(conn);
            }
        });

        // Draw each connection individually with proper spacing
        connectionGroups.forEach((conns, key) => {
            // Sort connections by creation order
            conns.sort((a, b) => (a.id || 0) - (b.id || 0));

            // Draw each connection with sequential offset
            conns.forEach((conn, index) => {
                // Center connections around 0, spacing them evenly
                const totalConns = conns.length;
                const adjustedIndex = index - (totalConns - 1) / 2;
                this.drawConnection(ctx, conn, adjustedIndex, totalConns, index + 1, null, 0);
            });
        });

        // Draw temporary connection line while dragging (like Automation)
        if (this.connecting && this.connectionStart && this.tempConnectionEnd) {
            const fromComponent = this.components.find(c => c.id === this.connectionStart.componentId);
            if (fromComponent) {
                const ports = this.getComponentPorts(fromComponent.id);
                const fromPort = ports.find(p => p.id === this.connectionStart.portId);
                if (fromPort) {
                    const connectionType = this.selectedConnectionType || 'network';
                    const styles = {
                        network: {
                            color: '#6366f1',
                            lineWidth: 2,
                            dashPattern: [5, 5]
                        },
                        fiber: {
                            color: '#6366f1',
                            lineWidth: 2,
                            dashPattern: [5, 5]
                        }
                    };
                    const style = styles[connectionType] || styles.network;

                    // Draw temporary connection as boxes (like final connections)
                    const boxWidth = 5; // Reduced from 8
                    const halfWidth = boxWidth / 2;
                    ctx.fillStyle = style.color;
                    ctx.strokeStyle = this.darkenColor(style.color, 0.2);
                    ctx.lineWidth = 1;
                    ctx.setLineDash([]);
                    ctx.globalAlpha = 0.6;

                    const pathData = this.createLShapedPath(
                        { x: fromPort.x, y: fromPort.y },
                        { x: this.tempConnectionEnd.x, y: this.tempConnectionEnd.y },
                        20, 0, 0, 0,
                        fromPort.side, // Pass the source port side
                        null // No destination side for temporary connection
                    );

                    if (pathData.type === 'triple') {
                        // Triple path for top/bottom: start -> down/up -> up/down -> horizontal -> end
                        const { start, corner1, corner2, corner3, end } = pathData;

                        // First segment: from start to corner1 (vertical into component)
                        const v1StartY = Math.min(start.y, corner1.y);
                        const v1EndY = Math.max(start.y, corner1.y);
                        const v1Length = v1EndY - v1StartY;
                        if (v1Length > 0) {
                            ctx.fillRect(start.x - halfWidth, v1StartY, boxWidth, v1Length);
                            ctx.strokeRect(start.x - halfWidth, v1StartY, boxWidth, v1Length);
                        }

                        // Second segment: from corner1 to corner2 (vertical away from component)
                        const v2StartY = Math.min(corner1.y, corner2.y);
                        const v2EndY = Math.max(corner1.y, corner2.y);
                        const v2Length = v2EndY - v2StartY;
                        if (v2Length > 0) {
                            ctx.fillRect(corner1.x - halfWidth, v2StartY, boxWidth, v2Length);
                            ctx.strokeRect(corner1.x - halfWidth, v2StartY, boxWidth, v2Length);
                        }

                        // Third segment: from corner2 to corner3 (horizontal)
                        const h3StartX = Math.min(corner2.x, corner3.x);
                        const h3EndX = Math.max(corner2.x, corner3.x);
                        const h3Length = h3EndX - h3StartX;
                        if (h3Length > 0) {
                            ctx.fillRect(h3StartX, corner2.y - halfWidth, h3Length, boxWidth);
                            ctx.strokeRect(h3StartX, corner2.y - halfWidth, h3Length, boxWidth);
                        }

                        // Fourth segment: from corner3 to end (vertical to destination)
                        const v4StartY = Math.min(corner3.y, end.y);
                        const v4EndY = Math.max(corner3.y, end.y);
                        const v4Length = v4EndY - v4StartY;
                        if (v4Length > 0) {
                            ctx.fillRect(end.x - halfWidth, v4StartY, boxWidth, v4Length);
                            ctx.strokeRect(end.x - halfWidth, v4StartY, boxWidth, v4Length);
                        }
                    } else if (pathData.type === 'double') {
                        // Double L-shape for temporary connection
                        const { start, corner1, corner2, end } = pathData;

                        // First segment
                        const dx1 = corner1.x - start.x;
                        const dy1 = corner1.y - start.y;
                        if (Math.abs(dx1) > Math.abs(dy1)) {
                            const h1StartX = Math.min(start.x, corner1.x);
                            const h1EndX = Math.max(start.x, corner1.x);
                            const h1Length = h1EndX - h1StartX;
                            if (h1Length > 0) {
                                ctx.fillRect(h1StartX, start.y - halfWidth, h1Length, boxWidth);
                                ctx.strokeRect(h1StartX, start.y - halfWidth, h1Length, boxWidth);
                            }
                        } else {
                            const v1StartY = Math.min(start.y, corner1.y);
                            const v1EndY = Math.max(start.y, corner1.y);
                            const v1Length = v1EndY - v1StartY;
                            if (v1Length > 0) {
                                ctx.fillRect(start.x - halfWidth, v1StartY, boxWidth, v1Length);
                                ctx.strokeRect(start.x - halfWidth, v1StartY, boxWidth, v1Length);
                            }
                        }

                        // Second segment
                        const dx2 = corner2.x - corner1.x;
                        const dy2 = corner2.y - corner1.y;
                        if (Math.abs(dx2) > Math.abs(dy2)) {
                            const h2StartX = Math.min(corner1.x, corner2.x);
                            const h2EndX = Math.max(corner1.x, corner2.x);
                            const h2Length = h2EndX - h2StartX;
                            if (h2Length > 0) {
                                ctx.fillRect(h2StartX, corner1.y - halfWidth, h2Length, boxWidth);
                                ctx.strokeRect(h2StartX, corner1.y - halfWidth, h2Length, boxWidth);
                            }
                        } else {
                            const v2StartY = Math.min(corner1.y, corner2.y);
                            const v2EndY = Math.max(corner1.y, corner2.y);
                            const v2Length = v2EndY - v2StartY;
                            if (v2Length > 0) {
                                ctx.fillRect(corner1.x - halfWidth, v2StartY, boxWidth, v2Length);
                                ctx.strokeRect(corner1.x - halfWidth, v2StartY, boxWidth, v2Length);
                            }
                        }

                        // Third segment
                        const dx3 = end.x - corner2.x;
                        const dy3 = end.y - corner2.y;
                        if (Math.abs(dx3) > Math.abs(dy3)) {
                            const h3StartX = Math.min(corner2.x, end.x);
                            const h3EndX = Math.max(corner2.x, end.x);
                            const h3Length = h3EndX - h3StartX;
                            if (h3Length > 0) {
                                ctx.fillRect(h3StartX, end.y - halfWidth, h3Length, boxWidth);
                                ctx.strokeRect(h3StartX, end.y - halfWidth, h3Length, boxWidth);
                            }
                        } else {
                            const v3StartY = Math.min(corner2.y, end.y);
                            const v3EndY = Math.max(corner2.y, end.y);
                            const v3Length = v3EndY - v3StartY;
                            if (v3Length > 0) {
                                ctx.fillRect(end.x - halfWidth, v3StartY, boxWidth, v3Length);
                                ctx.strokeRect(end.x - halfWidth, v3StartY, boxWidth, v3Length);
                            }
                        }
                    } else if (pathData.type === 'simple') {
                        // Legacy simple L-shape support
                        const { start, corner, end } = pathData;
                        const dx = end.x - start.x;
                        const dy = end.y - start.y;
                        const isHorizontalFirst = Math.abs(dx) > Math.abs(dy);

                        if (isHorizontalFirst) {
                            const h1StartX = Math.min(start.x, corner.x);
                            const h1EndX = Math.max(start.x, corner.x);
                            const h1Length = h1EndX - h1StartX;
                            if (h1Length > 0) {
                                ctx.fillRect(h1StartX, start.y - halfWidth, h1Length, boxWidth);
                                ctx.strokeRect(h1StartX, start.y - halfWidth, h1Length, boxWidth);
                            }

                            const vStartY = Math.min(start.y, end.y);
                            const vEndY = Math.max(start.y, end.y);
                            const vLength = vEndY - vStartY;
                            if (vLength > 0) {
                                ctx.fillRect(corner.x - halfWidth, vStartY, boxWidth, vLength);
                                ctx.strokeRect(corner.x - halfWidth, vStartY, boxWidth, vLength);
                            }

                            const h2StartX = Math.min(corner.x, end.x);
                            const h2EndX = Math.max(corner.x, end.x);
                            const h2Length = h2EndX - h2StartX;
                            if (h2Length > 0) {
                                ctx.fillRect(h2StartX, end.y - halfWidth, h2Length, boxWidth);
                                ctx.strokeRect(h2StartX, end.y - halfWidth, h2Length, boxWidth);
                            }
                        } else {
                            const v1StartY = Math.min(start.y, corner.y);
                            const v1EndY = Math.max(start.y, corner.y);
                            const v1Length = v1EndY - v1StartY;
                            if (v1Length > 0) {
                                ctx.fillRect(start.x - halfWidth, v1StartY, boxWidth, v1Length);
                                ctx.strokeRect(start.x - halfWidth, v1StartY, boxWidth, v1Length);
                            }

                            const hStartX = Math.min(start.x, end.x);
                            const hEndX = Math.max(start.x, end.x);
                            const hLength = hEndX - hStartX;
                            if (hLength > 0) {
                                ctx.fillRect(hStartX, corner.y - halfWidth, hLength, boxWidth);
                                ctx.strokeRect(hStartX, corner.y - halfWidth, hLength, boxWidth);
                            }

                            const v2StartY = Math.min(corner.y, end.y);
                            const v2EndY = Math.max(corner.y, end.y);
                            const v2Length = v2EndY - v2StartY;
                            if (v2Length > 0) {
                                ctx.fillRect(end.x - halfWidth, v2StartY, boxWidth, v2Length);
                                ctx.strokeRect(end.x - halfWidth, v2StartY, boxWidth, v2Length);
                            }
                        }
                    }

                    ctx.globalAlpha = 1.0;
                }
            }
        }

        // Draw components
        this.components.forEach(component => {
            this.drawComponent(ctx, component);
        });

        // Restore transform
        ctx.restore();
    }

    drawGrid(ctx) {
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1 / this.zoom; // Scale line width with zoom
        const gridSize = 20;

        // Calculate visible area in world coordinates
        // Convert screen bounds to world coordinates
        const worldTopLeftX = -this.canvasOffset.x / this.zoom;
        const worldTopLeftY = -this.canvasOffset.y / this.zoom;
        const worldBottomRightX = (this.canvas.width - this.canvasOffset.x) / this.zoom;
        const worldBottomRightY = (this.canvas.height - this.canvasOffset.y) / this.zoom;

        // Add padding to ensure grid extends beyond visible area
        const padding = gridSize * 2;
        const startX = Math.floor((worldTopLeftX - padding) / gridSize) * gridSize;
        const endX = Math.ceil((worldBottomRightX + padding) / gridSize) * gridSize;
        const startY = Math.floor((worldTopLeftY - padding) / gridSize) * gridSize;
        const endY = Math.ceil((worldBottomRightY + padding) / gridSize) * gridSize;

        // Draw vertical grid lines
        for (let x = startX; x <= endX; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
            ctx.stroke();
        }

        // Draw horizontal grid lines
        for (let y = startY; y <= endY; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
            ctx.stroke();
        }
    }

    drawComponent(ctx, component) {
        const isSelected = this.selectedComponent?.id === component.id;

        // Get template - check if component has template stored, or look it up
        let template = component.template;
        if (!template && component.templateId) {
            template = (this.deviceTemplates || []).find(t => t.id === component.templateId);
        }
        if (!template) {
            // Fallback to legacy lookup by type
            template = this.getDeviceTemplate(component.type);
        }

        let img = null;
        if (template && template.imagePath) {
            // Try to get image from cache
            img = this.deviceImages[template.imagePath];

            // If image not loaded yet, try to load it
            if (!img) {
                const newImg = new Image();
                newImg.onload = () => {
                    this.deviceImages[template.imagePath] = newImg;
                    this.redraw(); // Redraw once image loads
                };
                newImg.onerror = () => {
                    console.warn(`Failed to load image: ${template.imagePath}`);
                };
                newImg.src = template.imagePath;
            }
        }

        // Draw shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        if (img && template && img.complete && img.naturalWidth > 0) {
            // Draw device image
            const imgWidth = component.width || template.width || 120;
            const imgHeight = component.height || template.height || 80;

            // Reset shadow before drawing image
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            // Draw image with border
            ctx.drawImage(img, component.x, component.y, imgWidth, imgHeight);

            // Selection border removed for cleaner template appearance

            // Draw delete button when selected
            if (isSelected) {
                const deleteBtnSize = 28;
                const deleteBtnX = component.x + imgWidth - deleteBtnSize / 2 - 5;
                const deleteBtnY = component.y - deleteBtnSize / 2 + 5;
                const isHovered = this.hoverDeleteButtonComponent?.id === component.id;

                // Draw delete button shadow
                ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                ctx.shadowBlur = 4;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 2;

                // Draw delete button background (darker when hovered)
                ctx.fillStyle = isHovered ? '#dc2626' : '#ef4444';
                ctx.beginPath();
                ctx.arc(deleteBtnX, deleteBtnY, deleteBtnSize / 2, 0, Math.PI * 2);
                ctx.fill();

                // Reset shadow
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;

                // Draw delete button border
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2.5;
                ctx.stroke();

                // Draw X icon
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3;
                ctx.beginPath();
                const iconSize = 10;
                ctx.moveTo(deleteBtnX - iconSize / 2, deleteBtnY - iconSize / 2);
                ctx.lineTo(deleteBtnX + iconSize / 2, deleteBtnY + iconSize / 2);
                ctx.moveTo(deleteBtnX + iconSize / 2, deleteBtnY - iconSize / 2);
                ctx.lineTo(deleteBtnX - iconSize / 2, deleteBtnY + iconSize / 2);
                ctx.stroke();
            }

            // Draw label below image
            if (component.label) {
                ctx.fillStyle = '#1f2937';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText(component.label, component.x + imgWidth / 2, component.y + imgHeight + 5);
            }

            // Draw ports
            if (template.ports && template.ports.length > 0) {
                template.ports.forEach(port => {
                    const portX = component.x + (port.x * imgWidth);
                    const portY = component.y + (port.y * imgHeight);
                    const portW = (port.width || 0.02) * imgWidth;
                    const portH = (port.height || 0.02) * imgHeight;

                    // Draw port indicator
                    ctx.fillStyle = port.color || '#00ff00';
                    ctx.fillRect(portX - portW / 2, portY - portH / 2, portW, portH);

                    // Draw port border
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(portX - portW / 2, portY - portH / 2, portW, portH);
                });
            }

            // Draw connectors
            if (template.connectors && template.connectors.length > 0) {
                template.connectors.forEach(connector => {
                    const connX = component.x + (connector.x * imgWidth);
                    const connY = component.y + (connector.y * imgHeight);

                    // Draw connector indicator (small circle)
                    ctx.fillStyle = '#ff6600';
                    ctx.beginPath();
                    ctx.arc(connX, connY, 3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                });
            }
        } else {
            // Fallback to original rectangle drawing if no template/image
            const gradient = ctx.createLinearGradient(
                component.x, component.y,
                component.x + component.width, component.y + component.height
            );
            gradient.addColorStop(0, component.color);
            gradient.addColorStop(1, this.darkenColor(component.color, 0.2));
            ctx.fillStyle = gradient;
            ctx.fillRect(component.x, component.y, component.width, component.height);

            // Draw border
            ctx.strokeStyle = isSelected ? '#3b82f6' : '#1f2937';
            ctx.lineWidth = isSelected ? 3 : 2;
            ctx.strokeRect(component.x, component.y, component.width, component.height);

            // Draw vendor badge
            const vendor = this.getComponentVendor(component.type);
            if (vendor) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.font = 'bold 10px Arial';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.fillText(vendor, component.x + 5, component.y + 5);
            }

            // Draw icon
            ctx.fillStyle = '#ffffff';
            ctx.font = '28px FontAwesome';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const icon = this.getComponentIcon(component.type);
            ctx.fillText(icon, component.x + component.width / 2, component.y + component.height / 2 - 8);
        }

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Draw label below the component (only if not already drawn for template components)
        if (!template || !img || !img.complete || img.naturalWidth === 0) {
            ctx.fillStyle = '#1e293b';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            const componentHeight = component.height || (template ? template.height : 80);
            const labelY = component.y + componentHeight + 5;
            const labelLines = this.wrapText(ctx, component.label, component.width - 10);
            labelLines.forEach((line, index) => {
                ctx.fillText(line, component.x + (component.width || 120) / 2, labelY + (index * 12));
            });

            // Draw delete button when selected (for non-template components)
            if (isSelected) {
                const deleteBtnSize = 28;
                const deleteBtnX = component.x + component.width - deleteBtnSize / 2 - 5;
                const deleteBtnY = component.y - deleteBtnSize / 2 + 5;
                const isHovered = this.hoverDeleteButtonComponent?.id === component.id;

                // Draw delete button shadow
                ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                ctx.shadowBlur = 4;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 2;

                // Draw delete button background (darker when hovered)
                ctx.fillStyle = isHovered ? '#dc2626' : '#ef4444';
                ctx.beginPath();
                ctx.arc(deleteBtnX, deleteBtnY, deleteBtnSize / 2, 0, Math.PI * 2);
                ctx.fill();

                // Reset shadow
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;

                // Draw delete button border
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2.5;
                ctx.stroke();

                // Draw X icon
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3;
                ctx.beginPath();
                const iconSize = 10;
                ctx.moveTo(deleteBtnX - iconSize / 2, deleteBtnY - iconSize / 2);
                ctx.lineTo(deleteBtnX + iconSize / 2, deleteBtnY + iconSize / 2);
                ctx.moveTo(deleteBtnX + iconSize / 2, deleteBtnY - iconSize / 2);
                ctx.lineTo(deleteBtnX - iconSize / 2, deleteBtnY + iconSize / 2);
                ctx.stroke();
            }
        }

        // Draw ports when component is hovered, selected, or when connecting
        // Show ALL ports for the component, not just the one being hovered
        const shouldShowPorts = this.hoveredComponent?.id === component.id ||
            this.selectedComponent?.id === component.id ||
            this.connecting ||
            this.connectionStart?.componentId === component.id;

        if (shouldShowPorts) {
            const ports = this.getComponentPorts(component.id);
            // Draw ALL ports for this component
            ports.forEach(port => {
                const isConnectingFrom = this.connectionStart &&
                    this.connectionStart.componentId === port.componentId &&
                    this.connectionStart.portId === port.id;
                const isHovered = this.hoveredPort?.id === port.id;
                const isConnecting = this.connecting && port.componentId === component.id;

                // Port circle - smaller size
                ctx.fillStyle = isConnectingFrom ? '#3b82f6' : (isHovered ? '#60a5fa' : '#6b7280');
                ctx.beginPath();
                ctx.arc(port.x, port.y, this.portSize, 0, Math.PI * 2);
                ctx.fill();

                // Port border - thinner for smaller ports
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = isHovered || isConnectingFrom ? 2 : 1.5;
                ctx.stroke();

                // Highlight when connecting and hovering
                if (isConnecting && isHovered && !isConnectingFrom) {
                    ctx.strokeStyle = '#10b981';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            });
        }
    }

    darkenColor(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - Math.round(255 * amount));
        const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - Math.round(255 * amount));
        const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - Math.round(255 * amount));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    wrapText(ctx, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        words.forEach(word => {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        });
        if (currentLine) {
            lines.push(currentLine);
        }
        return lines.length > 0 ? lines : [text];
    }


    selectConnectionType(type) {
        this.selectedConnectionType = type;
        // Update sidebar content to reflect active state
        if (window.sidebarInstance && this.sidebarOpen) {
            window.sidebarInstance.update({
                content: this.getToolbarContent()
            });
        }
        // Update button active states immediately without full re-render
        const allButtons = document.querySelectorAll('.toolbar-section-items .tool-btn');
        allButtons.forEach(btn => {
            const onclick = btn.getAttribute('onclick');
            if (onclick && onclick.includes('selectConnectionType')) {
                if (onclick.includes(`'${type}'`)) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            }
        });
    }

    drawConnection(ctx, connection, index = 0, totalConnections = 1, labelIndex = 1, connectionTypeGroup = null, typeGap = 0) {
        // Handle port-based connections
        if (connection.fromPort && connection.toPort) {
            const fromComponent = this.components.find(c => c.id === connection.fromComponent);
            const toComponent = this.components.find(c => c.id === connection.toComponent);

            if (!fromComponent || !toComponent) return;

            const fromPorts = this.getComponentPorts(fromComponent.id);
            const toPorts = this.getComponentPorts(toComponent.id);
            const fromPort = fromPorts.find(p => p.id === connection.fromPort);
            const toPort = toPorts.find(p => p.id === connection.toPort);

            if (!fromPort || !toPort) return;

            // Draw connection from port to port
            const connectionType = connection.type || 'network';
            const styles = {
                network: {
                    color: '#4b5563',
                    lineWidth: 2,
                    dashPattern: []
                },
                fiber: {
                    color: '#6b7280',
                    lineWidth: 2,
                    dashPattern: [6, 3]
                }
            };
            const style = styles[connectionType] || styles.network;

            // Use port side information to determine routing direction
            // Check if path intersects any components and route around them
            const allComponents = this.components.filter(c =>
                c.id !== fromComponent.id && c.id !== toComponent.id
            );

            // Create path with port side information
            let pathData = this.createLShapedPath(
                { x: fromPort.x, y: fromPort.y },
                { x: toPort.x, y: toPort.y },
                20, 0, 0, 0,
                fromPort.side, // Pass the source port side
                toPort.side    // Pass the destination port side
            );

            // Check if path intersects any components and adjust if needed
            const margin = 10;
            const blocking = allComponents.filter(comp => {
                if (pathData.type === 'triple') {
                    const { start, corner1, corner2, corner3, end } = pathData;
                    return this.lineIntersectsRect(start.x, start.y, corner1.x, corner1.y, comp, margin) ||
                        this.lineIntersectsRect(corner1.x, corner1.y, corner2.x, corner2.y, comp, margin) ||
                        this.lineIntersectsRect(corner2.x, corner2.y, corner3.x, corner3.y, comp, margin) ||
                        this.lineIntersectsRect(corner3.x, corner3.y, end.x, end.y, comp, margin);
                } else if (pathData.type === 'double') {
                    const { start, corner1, corner2, end } = pathData;
                    return this.lineIntersectsRect(start.x, start.y, corner1.x, corner1.y, comp, margin) ||
                        this.lineIntersectsRect(corner1.x, corner1.y, corner2.x, corner2.y, comp, margin) ||
                        this.lineIntersectsRect(corner2.x, corner2.y, end.x, end.y, comp, margin);
                }
                return false;
            });

            // If path intersects components, increase the offset to route around
            if (blocking.length > 0) {
                const increasedOffset = 30; // Larger offset to go around components
                if (pathData.type === 'triple') {
                    if (fromPort.side === 'top' || fromPort.side === 'bottom') {
                        // For top/bottom, increase vertical offset
                        const verticalOffset = fromPort.side === 'top' ? increasedOffset : -increasedOffset;
                        pathData.corner2.y = fromPort.y + verticalOffset;
                        pathData.corner3.y = pathData.corner2.y;
                    }
                } else if (pathData.type === 'double') {
                    if (fromPort.side === 'top' || fromPort.side === 'bottom') {
                        // For top/bottom, increase vertical offset
                        const verticalOffset = fromPort.side === 'top' ? increasedOffset : -increasedOffset;
                        pathData.corner1.y = fromPort.y + verticalOffset;
                        pathData.corner2.y = pathData.corner1.y;
                    } else if (fromPort.side === 'left' || fromPort.side === 'right') {
                        // For left/right, increase horizontal offset
                        const horizontalOffset = fromPort.side === 'right' ? increasedOffset : -increasedOffset;
                        pathData.corner1.x = fromPort.x + horizontalOffset;
                        pathData.corner2.x = pathData.corner1.x;
                    }
                }
            }

            this.renderConnectionPath(ctx, pathData, style, connection);

            // Store path for interaction
            if (!this.connectionPaths) {
                this.connectionPaths = [];
            }
            this.connectionPaths.push({
                connection: connection,
                points: pathData,
                type: connectionType,
                pathData: pathData
            });
            return;
        }

        // Legacy connection handling (for backward compatibility)
        const from = this.components.find(c => c.id === connection.from);
        const to = this.components.find(c => c.id === connection.to);

        if (!from || !to) return;

        const connectionType = connection.type || 'network';

        // Connection styling - clean and minimal
        const styles = {
            network: {
                color: '#4b5563',
                lineWidth: 2,
                dashPattern: []
            },
            fiber: {
                color: '#6b7280',
                lineWidth: 2,
                dashPattern: [6, 3]
            }
        };
        const style = styles[connectionType] || styles.network;

        // Ensure width and height are valid numbers
        const fromWidth = from.width || 120;
        const fromHeight = from.height || 80;
        const toWidth = to.width || 120;
        const toHeight = to.height || 80;

        // Calculate component centers
        const fromCenterX = from.x + fromWidth / 2;
        const fromCenterY = from.y + fromHeight / 2;
        const toCenterX = to.x + toWidth / 2;
        const toCenterY = to.y + toHeight / 2;

        const dx = toCenterX - fromCenterX;
        const dy = toCenterY - fromCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) return;

        // Calculate spacing for multiple connections between same components
        const offsetSpacing = 25; // Spacing between individual connections
        const currentOffset = index * offsetSpacing;

        // Calculate perpendicular vector for offset
        const perpX = -dy / distance;
        const perpY = dx / distance;

        // Determine best connection points using smart port selection
        const connectionPoints = this.calculateConnectionPoints(
            from, to, dx, dy, currentOffset, perpX, perpY
        );

        const startPoint = connectionPoints.start;
        const endPoint = connectionPoints.end;

        // Calculate optimal routing path with offset to maintain separation throughout
        const pathPoints = this.calculateOptimalPath(
            startPoint, endPoint, from, to, this.components, currentOffset, perpX, perpY
        );

        // Draw the connection
        this.renderConnectionPath(ctx, pathPoints, style, connection);

        // Store path for interaction
        if (!this.connectionPaths) {
            this.connectionPaths = [];
        }
        this.connectionPaths.push({
            connection: connection,
            points: pathPoints,
            type: connectionType,
            pathData: pathPoints
        });
    }

    /**
     * Calculate optimal connection points on components
     */
    calculateConnectionPoints(from, to, dx, dy, offset, perpX, perpY) {
        // Ensure width and height are valid numbers
        const fromWidth = from.width || 120;
        const fromHeight = from.height || 80;
        const toWidth = to.width || 120;
        const toHeight = to.height || 80;

        // Calculate component centers
        const fromCenterX = from.x + fromWidth / 2;
        const fromCenterY = from.y + fromHeight / 2;
        const toCenterX = to.x + toWidth / 2;
        const toCenterY = to.y + toHeight / 2;

        // Determine alignment type - more strict threshold
        const isVertical = Math.abs(dx) < Math.abs(dy) * 0.3;

        // Inset to account for transparent areas in images - connect inside the visible component
        const inset = 15; // Distance from edge to start connection inside component

        let startX, startY, endX, endY;

        if (isVertical) {
            // Vertical alignment - always use TOP edge (not inside component)
            if (dy > 0) {
                // To is below from - exit from TOP edge of from, enter at TOP edge of to
                startX = fromCenterX + perpX * offset;
                // Clamp to component width bounds
                startX = Math.max(from.x + inset, Math.min(from.x + fromWidth - inset, startX));
                startY = from.y; // TOP edge (not inside)

                endX = toCenterX + perpX * offset;
                // Clamp to component width bounds
                endX = Math.max(to.x + inset, Math.min(to.x + toWidth - inset, endX));
                endY = to.y; // TOP edge (not inside)
            } else {
                // To is above from - exit from TOP edge of from, enter at TOP edge of to
                startX = fromCenterX + perpX * offset;
                // Clamp to component width bounds
                startX = Math.max(from.x + inset, Math.min(from.x + fromWidth - inset, startX));
                startY = from.y; // TOP edge (not inside)

                endX = toCenterX + perpX * offset;
                // Clamp to component width bounds
                endX = Math.max(to.x + inset, Math.min(to.x + toWidth - inset, endX));
                endY = to.y; // TOP edge (not inside)
            }
        } else {
            // Horizontal alignment - exit from side, enter at top/bottom
            if (dx > 0) {
                // To is to the right of from - exit from inside right of from
                startX = from.x + fromWidth - inset; // Inside right edge
                startY = fromCenterY + perpY * offset;
                // Clamp to component height bounds (with inset)
                startY = Math.max(from.y + inset, Math.min(from.y + fromHeight - inset, startY));

                // Enter at top or bottom of destination (prefer top if destination is below, bottom if above)
                endX = toCenterX + perpX * offset;
                // Clamp to component width bounds (with inset)
                endX = Math.max(to.x + inset, Math.min(to.x + toWidth - inset, endX));

                // Choose top or bottom based on vertical position
                if (dy > 0) {
                    // Destination is below - enter at top
                    endY = to.y + inset; // Inside top edge
                } else {
                    // Destination is above - enter at bottom
                    endY = to.y + toHeight - inset; // Inside bottom edge
                }
            } else {
                // To is to the left of from - exit from inside left of from
                startX = from.x + inset; // Inside left edge
                startY = fromCenterY + perpY * offset;
                // Clamp to component height bounds (with inset)
                startY = Math.max(from.y + inset, Math.min(from.y + fromHeight - inset, startY));

                // Enter at top or bottom of destination (prefer top if destination is below, bottom if above)
                endX = toCenterX + perpX * offset;
                // Clamp to component width bounds (with inset)
                endX = Math.max(to.x + inset, Math.min(to.x + toWidth - inset, endX));

                // Choose top or bottom based on vertical position
                if (dy > 0) {
                    // Destination is below - enter at top
                    endY = to.y + inset; // Inside top edge
                } else {
                    // Destination is above - enter at bottom
                    endY = to.y + toHeight - inset; // Inside bottom edge
                }
            }
        }

        return {
            start: { x: startX, y: startY },
            end: { x: endX, y: endY }
        };
    }

    /**
     * Calculate optimal routing path - smart but simple
     */
    calculateOptimalPath(start, end, fromComp, toComp, allComponents, offset = 0, perpX = 0, perpY = 0, fromSide = null, toSide = null) {
        const margin = 30;

        // Check if direct line is clear
        const blocking = allComponents.filter(comp =>
            comp.id !== fromComp.id && comp.id !== toComp.id &&
            this.lineIntersectsRect(start.x, start.y, end.x, end.y, comp, margin)
        );

        // If no obstacles, use double L-shape with port side information
        if (blocking.length === 0) {
            return this.createLShapedPath(start, end, 20, offset, perpX, perpY, fromSide, toSide);
        }

        // Route around obstacles with simplified paths
        // For now, use the port-based path even with obstacles
        return this.createLShapedPath(start, end, 20, offset, perpX, perpY, fromSide, toSide);
    }

    /**
     * Check if component is in the path between two points
     */
    isInPath(comp, start, end, margin) {
        const minX = Math.min(start.x, end.x) - margin;
        const maxX = Math.max(start.x, end.x) + margin;
        const minY = Math.min(start.y, end.y) - margin;
        const maxY = Math.max(start.y, end.y) + margin;

        const compLeft = comp.x - margin;
        const compRight = comp.x + comp.width + margin;
        const compTop = comp.y - margin;
        const compBottom = comp.y + comp.height + margin;

        return !(compRight < minX || compLeft > maxX || compBottom < minY || compTop > maxY);
    }

    /**
     * Create a double L-shaped path (Z/N shape) with two corners
     * From side: vertical -> horizontal -> vertical (up/down based on destination)
     * From top/bottom: horizontal -> vertical (up/down based on source) -> horizontal
     */
    createLShapedPath(start, end, minBend, offset = 0, perpX = 0, perpY = 0, fromSide = null, toSide = null) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;

        // Apply offset to create parallel paths
        const offsetX = perpX * offset;
        const offsetY = perpY * offset;

        // Determine if connection is from side (left/right) or top/bottom
        // Use port side information if available, otherwise fall back to position-based detection
        let isFromSide;
        if (fromSide) {
            isFromSide = (fromSide === 'left' || fromSide === 'right');
        } else {
            isFromSide = Math.abs(dx) > Math.abs(dy);
        }

        if (isFromSide) {
            // From side (left/right): vertical -> horizontal -> vertical
            // First: go vertical from source (up if destination is above, down if below)
            // Use a larger distance - go further before turning
            const verticalDistance = Math.abs(dy) * 0.7; // 70% of vertical distance - go up/down more
            const corner1 = {
                x: start.x + offsetX,
                y: start.y + (dy > 0 ? verticalDistance : -verticalDistance) + offsetY
            };

            // Second: go horizontal toward destination (at the same Y as corner1)
            const corner2 = {
                x: end.x + offsetX,
                y: corner1.y + offsetY
            };

            return {
                type: 'double',
                start: start,
                corner1: corner1,
                corner2: corner2,
                end: end
            };
        } else {
            // From top/bottom: go horizontally first (L-shape), then down/up to destination
            // Always start from top edge, go horizontally, then vertically to destination
            const minHorizontalOffset = 40; // Minimum distance to go horizontally before turning
            const horizontalDistance = Math.abs(dx);

            // If components are directly above/below (dx is very small), use a fixed offset
            // Otherwise, use a percentage of the horizontal distance
            let horizontalOffset;
            if (horizontalDistance < 10) {
                // Components are directly above/below - use fixed offset
                horizontalOffset = minHorizontalOffset;
            } else {
                // Use at least 50% of horizontal distance, but not less than minimum
                horizontalOffset = Math.max(minHorizontalOffset, horizontalDistance * 0.5);
            }

            // Determine direction: go right if destination is to the right, left if to the left
            // If destination is directly above/below (dx ≈ 0), go right by default
            const goRight = dx > 0 || (Math.abs(dx) < 10);

            // First corner: go horizontally from top edge (L-shape)
            // This creates the horizontal segment of the L
            const corner1 = {
                x: start.x + (goRight ? horizontalOffset : -horizontalOffset) + offsetX,
                y: start.y + offsetY // Stay at top edge level
            };

            // Second corner: go horizontally to align with destination X, then vertical
            // This ensures we have a full horizontal run before turning vertical
            let corner2X = end.x + offsetX;
            // If corner1 and corner2 would be too close, extend corner2 further
            const minHorizontalSegment = 20; // Minimum horizontal segment length
            if (Math.abs(corner2X - corner1.x) < minHorizontalSegment) {
                // Extend the horizontal segment
                corner2X = corner1.x + (goRight ? minHorizontalSegment : -minHorizontalSegment);
            }
            const corner2 = {
                x: corner2X,
                y: corner1.y + offsetY // Stay at same Y level (top edge level)
            };

            return {
                type: 'double',
                start: start,
                corner1: corner1,
                corner2: corner2,
                end: end
            };
        }
    }

    /**
     * Route around obstacles with simple L-shaped paths
     */
    routeAroundObstacles(start, end, obstacles, margin, minBend, offset = 0, perpX = 0, perpY = 0) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const offsetX = perpX * offset;
        const offsetY = perpY * offset;

        // Find the bounding box of all obstacles
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        obstacles.forEach(obs => {
            minX = Math.min(minX, obs.x - margin);
            maxX = Math.max(maxX, obs.x + obs.width + margin);
            minY = Math.min(minY, obs.y - margin);
            maxY = Math.max(maxY, obs.y + obs.height + margin);
        });

        const strategies = [];

        // Strategy 1: Route above - simple L-shape
        if (dy !== 0 && start.y > minY) {
            const routeY = minY - 30;
            const path1 = {
                type: 'simple',
                start: start,
                corner: { x: start.x + offsetX, y: routeY + offsetY },
                end: end
            };
            if (this.isSimplePathClear(path1, obstacles, margin)) {
                strategies.push({ path: path1, cost: this.simplePathCost(path1) });
            }
        }

        // Strategy 2: Route below - simple L-shape
        if (dy !== 0 && end.y < maxY) {
            const routeY = maxY + 30;
            const path2 = {
                type: 'simple',
                start: start,
                corner: { x: start.x + offsetX, y: routeY + offsetY },
                end: end
            };
            if (this.isSimplePathClear(path2, obstacles, margin)) {
                strategies.push({ path: path2, cost: this.simplePathCost(path2) });
            }
        }

        // Strategy 3: Route left - simple L-shape
        if (dx !== 0 && start.x > minX) {
            const routeX = minX - 30;
            const path3 = {
                type: 'simple',
                start: start,
                corner: { x: routeX + offsetX, y: start.y + offsetY },
                end: end
            };
            if (this.isSimplePathClear(path3, obstacles, margin)) {
                strategies.push({ path: path3, cost: this.simplePathCost(path3) });
            }
        }

        // Strategy 4: Route right - simple L-shape
        if (dx !== 0 && end.x < maxX) {
            const routeX = maxX + 30;
            const path4 = {
                type: 'simple',
                start: start,
                corner: { x: routeX + offsetX, y: start.y + offsetY },
                end: end
            };
            if (this.isSimplePathClear(path4, obstacles, margin)) {
                strategies.push({ path: path4, cost: this.simplePathCost(path4) });
            }
        }

        // Select shortest clear path
        if (strategies.length > 0) {
            strategies.sort((a, b) => a.cost - b.cost);
            return strategies[0].path;
        }

        // Fallback: simple L-shaped path
        return this.createLShapedPath(start, end, minBend, offset, perpX, perpY);
    }

    /**
     * Check if simple path is clear of obstacles
     */
    isSimplePathClear(pathData, obstacles, margin) {
        if (pathData.type === 'triple') {
            const { start, corner1, corner2, corner3, end } = pathData;
            // Check all four segments
            for (const obs of obstacles) {
                if (this.lineIntersectsRect(start.x, start.y, corner1.x, corner1.y, obs, margin) ||
                    this.lineIntersectsRect(corner1.x, corner1.y, corner2.x, corner2.y, obs, margin) ||
                    this.lineIntersectsRect(corner2.x, corner2.y, corner3.x, corner3.y, obs, margin) ||
                    this.lineIntersectsRect(corner3.x, corner3.y, end.x, end.y, obs, margin)) {
                    return false;
                }
            }
            return true;
        } else if (pathData.type === 'double') {
            const { start, corner1, corner2, end } = pathData;
            // Check all three segments
            for (const obs of obstacles) {
                if (this.lineIntersectsRect(start.x, start.y, corner1.x, corner1.y, obs, margin) ||
                    this.lineIntersectsRect(corner1.x, corner1.y, corner2.x, corner2.y, obs, margin) ||
                    this.lineIntersectsRect(corner2.x, corner2.y, end.x, end.y, obs, margin)) {
                    return false;
                }
            }
            return true;
        } else if (pathData.type === 'simple') {
            const { start, corner, end } = pathData;
            // Check first segment (start to corner)
            for (const obs of obstacles) {
                if (this.lineIntersectsRect(start.x, start.y, corner.x, corner.y, obs, margin)) {
                    return false;
                }
            }
            // Check second segment (corner to end)
            for (const obs of obstacles) {
                if (this.lineIntersectsRect(corner.x, corner.y, end.x, end.y, obs, margin)) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }

    /**
     * Calculate cost of simple path
     */
    simplePathCost(pathData) {
        if (pathData.type !== 'simple') return Infinity;
        const { start, corner, end } = pathData;
        const d1 = Math.sqrt((corner.x - start.x) ** 2 + (corner.y - start.y) ** 2);
        const d2 = Math.sqrt((end.x - corner.x) ** 2 + (end.y - corner.y) ** 2);
        return d1 + d2;
    }

    /**
     * Check if path is clear of obstacles
     */
    isPathClear(path, obstacles, margin) {
        for (let i = 0; i < path.length - 1; i++) {
            const p1 = path[i];
            const p2 = path[i + 1];

            for (const obs of obstacles) {
                if (this.lineIntersectsRect(p1.x, p1.y, p2.x, p2.y, obs, margin)) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Check if line segment intersects rectangle
     */
    lineIntersectsRect(x1, y1, x2, y2, rect, margin) {
        const left = rect.x - margin;
        const right = rect.x + rect.width + margin;
        const top = rect.y - margin;
        const bottom = rect.y + rect.height + margin;

        // Liang-Barsky algorithm
        let t0 = 0, t1 = 1;
        const dx = x2 - x1;
        const dy = y2 - y1;

        const p = [-dx, dx, -dy, dy];
        const q = [x1 - left, right - x1, y1 - top, bottom - y1];

        for (let i = 0; i < 4; i++) {
            if (p[i] === 0) {
                if (q[i] < 0) return false;
            } else {
                const r = q[i] / p[i];
                if (p[i] < 0) {
                    t0 = Math.max(t0, r);
                } else {
                    t1 = Math.min(t1, r);
                }
            }
        }

        return t0 < t1;
    }

    /**
     * Calculate path cost (total length)
     */
    pathCost(path) {
        let cost = 0;
        for (let i = 0; i < path.length - 1; i++) {
            const dx = path[i + 1].x - path[i].x;
            const dy = path[i + 1].y - path[i].y;
            cost += Math.sqrt(dx * dx + dy * dy);
        }
        return cost;
    }

    /**
     * Render connection path with smooth curves
     */
    renderConnectionPath(ctx, pathData, style, connection) {
        if (!pathData) return;

        // Set style - box connections
        const isSelected = this.selectedConnection && this.selectedConnection.id === connection.id;
        const boxWidth = 5; // Width of the connection box (reduced from 8)
        const halfWidth = boxWidth / 2;

        ctx.fillStyle = isSelected ? '#ef4444' : style.color;
        ctx.strokeStyle = isSelected ? '#dc2626' : this.darkenColor(style.color, 0.2);
        ctx.lineWidth = 1;
        ctx.setLineDash([]); // No dashes for boxes

        // Draw boxes along the path
        if (pathData.type === 'triple') {
            // Triple path for top/bottom: start -> down/up -> up/down -> horizontal -> end
            const { start, corner1, corner2, corner3, end } = pathData;

            // First segment: from start to corner1 (vertical into component)
            const v1StartY = Math.min(start.y, corner1.y);
            const v1EndY = Math.max(start.y, corner1.y);
            const v1Length = v1EndY - v1StartY;
            if (v1Length > 0) {
                ctx.fillRect(start.x - halfWidth, v1StartY, boxWidth, v1Length);
                ctx.strokeRect(start.x - halfWidth, v1StartY, boxWidth, v1Length);
            }

            // Second segment: from corner1 to corner2 (vertical away from component)
            const v2StartY = Math.min(corner1.y, corner2.y);
            const v2EndY = Math.max(corner1.y, corner2.y);
            const v2Length = v2EndY - v2StartY;
            if (v2Length > 0) {
                ctx.fillRect(corner1.x - halfWidth, v2StartY, boxWidth, v2Length);
                ctx.strokeRect(corner1.x - halfWidth, v2StartY, boxWidth, v2Length);
            }

            // Third segment: from corner2 to corner3 (horizontal)
            const h3StartX = Math.min(corner2.x, corner3.x);
            const h3EndX = Math.max(corner2.x, corner3.x);
            const h3Length = h3EndX - h3StartX;
            if (h3Length > 0) {
                ctx.fillRect(h3StartX, corner2.y - halfWidth, h3Length, boxWidth);
                ctx.strokeRect(h3StartX, corner2.y - halfWidth, h3Length, boxWidth);
            }

            // Fourth segment: from corner3 to end (vertical to destination)
            const v4StartY = Math.min(corner3.y, end.y);
            const v4EndY = Math.max(corner3.y, end.y);
            const v4Length = v4EndY - v4StartY;
            if (v4Length > 0) {
                ctx.fillRect(end.x - halfWidth, v4StartY, boxWidth, v4Length);
                ctx.strokeRect(end.x - halfWidth, v4StartY, boxWidth, v4Length);
            }
        } else if (pathData.type === 'double') {
            // Double L-shape (Z/N shape) with two corners
            const { start, corner1, corner2, end } = pathData;

            // First segment: from start to corner1
            const dx1 = corner1.x - start.x;
            const dy1 = corner1.y - start.y;
            if (Math.abs(dx1) > Math.abs(dy1)) {
                // Horizontal segment
                const h1StartX = Math.min(start.x, corner1.x);
                const h1EndX = Math.max(start.x, corner1.x);
                const h1Length = h1EndX - h1StartX;
                if (h1Length > 0) {
                    ctx.fillRect(h1StartX, start.y - halfWidth, h1Length, boxWidth);
                    ctx.strokeRect(h1StartX, start.y - halfWidth, h1Length, boxWidth);
                }
            } else {
                // Vertical segment
                const v1StartY = Math.min(start.y, corner1.y);
                const v1EndY = Math.max(start.y, corner1.y);
                const v1Length = v1EndY - v1StartY;
                if (v1Length > 0) {
                    ctx.fillRect(start.x - halfWidth, v1StartY, boxWidth, v1Length);
                    ctx.strokeRect(start.x - halfWidth, v1StartY, boxWidth, v1Length);
                }
            }

            // Second segment: from corner1 to corner2
            const dx2 = corner2.x - corner1.x;
            const dy2 = corner2.y - corner1.y;
            if (Math.abs(dx2) > Math.abs(dy2)) {
                // Horizontal segment
                const h2StartX = Math.min(corner1.x, corner2.x);
                const h2EndX = Math.max(corner1.x, corner2.x);
                const h2Length = h2EndX - h2StartX;
                if (h2Length > 0) {
                    ctx.fillRect(h2StartX, corner1.y - halfWidth, h2Length, boxWidth);
                    ctx.strokeRect(h2StartX, corner1.y - halfWidth, h2Length, boxWidth);
                }
            } else {
                // Vertical segment
                const v2StartY = Math.min(corner1.y, corner2.y);
                const v2EndY = Math.max(corner1.y, corner2.y);
                const v2Length = v2EndY - v2StartY;
                if (v2Length > 0) {
                    ctx.fillRect(corner1.x - halfWidth, v2StartY, boxWidth, v2Length);
                    ctx.strokeRect(corner1.x - halfWidth, v2StartY, boxWidth, v2Length);
                }
            }

            // Third segment: from corner2 to end
            const dx3 = end.x - corner2.x;
            const dy3 = end.y - corner2.y;
            if (Math.abs(dx3) > Math.abs(dy3)) {
                // Horizontal segment
                const h3StartX = Math.min(corner2.x, end.x);
                const h3EndX = Math.max(corner2.x, end.x);
                const h3Length = h3EndX - h3StartX;
                if (h3Length > 0) {
                    ctx.fillRect(h3StartX, end.y - halfWidth, h3Length, boxWidth);
                    ctx.strokeRect(h3StartX, end.y - halfWidth, h3Length, boxWidth);
                }
            } else {
                // Vertical segment
                const v3StartY = Math.min(corner2.y, end.y);
                const v3EndY = Math.max(corner2.y, end.y);
                const v3Length = v3EndY - v3StartY;
                if (v3Length > 0) {
                    ctx.fillRect(end.x - halfWidth, v3StartY, boxWidth, v3Length);
                    ctx.strokeRect(end.x - halfWidth, v3StartY, boxWidth, v3Length);
                }
            }
        } else if (pathData.type === 'simple') {
            // Legacy simple L-shape support
            const { start, corner, end } = pathData;
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const isHorizontalFirst = Math.abs(dx) > Math.abs(dy);

            if (isHorizontalFirst) {
                const h1StartX = Math.min(start.x, corner.x);
                const h1EndX = Math.max(start.x, corner.x);
                const h1Length = h1EndX - h1StartX;
                if (h1Length > 0) {
                    ctx.fillRect(h1StartX, start.y - halfWidth, h1Length, boxWidth);
                    ctx.strokeRect(h1StartX, start.y - halfWidth, h1Length, boxWidth);
                }

                const vStartY = Math.min(start.y, end.y);
                const vEndY = Math.max(start.y, end.y);
                const vLength = vEndY - vStartY;
                if (vLength > 0) {
                    ctx.fillRect(corner.x - halfWidth, vStartY, boxWidth, vLength);
                    ctx.strokeRect(corner.x - halfWidth, vStartY, boxWidth, vLength);
                }

                const h2StartX = Math.min(corner.x, end.x);
                const h2EndX = Math.max(corner.x, end.x);
                const h2Length = h2EndX - h2StartX;
                if (h2Length > 0) {
                    ctx.fillRect(h2StartX, end.y - halfWidth, h2Length, boxWidth);
                    ctx.strokeRect(h2StartX, end.y - halfWidth, h2Length, boxWidth);
                }
            } else {
                const v1StartY = Math.min(start.y, corner.y);
                const v1EndY = Math.max(start.y, corner.y);
                const v1Length = v1EndY - v1StartY;
                if (v1Length > 0) {
                    ctx.fillRect(start.x - halfWidth, v1StartY, boxWidth, v1Length);
                    ctx.strokeRect(start.x - halfWidth, v1StartY, boxWidth, v1Length);
                }

                const hStartX = Math.min(start.x, end.x);
                const hEndX = Math.max(start.x, end.x);
                const hLength = hEndX - hStartX;
                if (hLength > 0) {
                    ctx.fillRect(hStartX, corner.y - halfWidth, hLength, boxWidth);
                    ctx.strokeRect(hStartX, corner.y - halfWidth, hLength, boxWidth);
                }

                const v2StartY = Math.min(corner.y, end.y);
                const v2EndY = Math.max(corner.y, end.y);
                const v2Length = v2EndY - v2StartY;
                if (v2Length > 0) {
                    ctx.fillRect(end.x - halfWidth, v2StartY, boxWidth, v2Length);
                    ctx.strokeRect(end.x - halfWidth, v2StartY, boxWidth, v2Length);
                }
            }
        } else if (Array.isArray(pathData)) {
            // Fallback for old array format - draw boxes for each segment
            for (let i = 0; i < pathData.length - 1; i++) {
                const p1 = pathData[i];
                const p2 = pathData[i + 1];
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;

                if (Math.abs(dx) > Math.abs(dy)) {
                    // Horizontal segment
                    const startX = Math.min(p1.x, p2.x);
                    const length = Math.abs(dx);
                    ctx.fillRect(startX, p1.y - halfWidth, length, boxWidth);
                    ctx.strokeRect(startX, p1.y - halfWidth, length, boxWidth);
                } else {
                    // Vertical segment
                    const startY = Math.min(p1.y, p2.y);
                    const length = Math.abs(dy);
                    ctx.fillRect(p1.x - halfWidth, startY, boxWidth, length);
                    ctx.strokeRect(p1.x - halfWidth, startY, boxWidth, length);
                }
            }
        }

        // Draw delete button on hover
        if (this.hoverDeleteButtonConnection && this.hoverDeleteButtonConnection.id === connection.id) {
            let midPoint;
            if (pathData && pathData.type === 'simple') {
                // Use the corner point as the midpoint
                midPoint = pathData.corner;
            } else if (Array.isArray(pathData) && pathData.length > 1) {
                const midIndex = Math.floor(pathData.length / 2);
                midPoint = pathData[midIndex];
            }

            if (midPoint) {
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.arc(midPoint.x, midPoint.y, 12, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(midPoint.x - 4, midPoint.y);
                ctx.lineTo(midPoint.x + 4, midPoint.y);
                ctx.stroke();
            }
        }
    }

    calculatePathLength(pathPoints) {
        let length = 0;
        for (let i = 0; i < pathPoints.length - 1; i++) {
            const dx = pathPoints[i + 1].x - pathPoints[i].x;
            const dy = pathPoints[i + 1].y - pathPoints[i].y;
            length += Math.sqrt(dx * dx + dy * dy);
        }
        return length;
    }

    drawConnectionTypeLabel(ctx, from, to, connectionType, count, offset) {
        const fromX = from.x + from.width / 2;
        const fromY = from.y + from.height / 2;
        const toX = to.x + to.width / 2;
        const toY = to.y + to.height / 2;

        const dx = toX - fromX;
        const dy = toY - fromY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Calculate perpendicular vector for offset
        const perpX = -dy / distance;
        const perpY = dx / distance;

        // Calculate label position (middle point between components, offset perpendicularly)
        const midX = (fromX + toX) / 2;
        const midY = (fromY + toY) / 2;
        const labelX = midX + perpX * offset;
        const labelY = midY + perpY * offset;

        // Connection styling based on type
        const styles = {
            network: {
                color: '#3b82f6',
                lineWidth: 2.5,
                dashPattern: []
            },
            fiber: {
                color: '#f59e0b',
                lineWidth: 3,
                dashPattern: [8, 4]
            }
        };

        const style = styles[connectionType] || styles.network;
        const labelPrefix = connectionType === 'fiber' ? 'Fiber Channel' : 'Ethernet';
        const labelText = `${labelPrefix} (${count})`;

        // Calculate rotation angle based on connection direction
        const angle = Math.atan2(dy, dx);

        // Draw label background
        ctx.save();
        ctx.translate(labelX, labelY);
        ctx.rotate(angle);

        ctx.font = 'bold 11px Arial';
        const textMetrics = ctx.measureText(labelText);
        const textWidth = textMetrics.width;
        const textHeight = 14;
        const padding = 6;

        // Draw background rectangle with rounded corners
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.strokeStyle = style.color;
        ctx.lineWidth = 2;
        const rectX = -textWidth / 2 - padding;
        const rectY = -textHeight / 2 - padding;
        const rectW = textWidth + padding * 2;
        const rectH = textHeight + padding * 2;
        const radius = 4;
        ctx.beginPath();
        ctx.moveTo(rectX + radius, rectY);
        ctx.lineTo(rectX + rectW - radius, rectY);
        ctx.quadraticCurveTo(rectX + rectW, rectY, rectX + rectW, rectY + radius);
        ctx.lineTo(rectX + rectW, rectY + rectH - radius);
        ctx.quadraticCurveTo(rectX + rectW, rectY + rectH, rectX + rectW - radius, rectY + rectH);
        ctx.lineTo(rectX + radius, rectY + rectH);
        ctx.quadraticCurveTo(rectX, rectY + rectH, rectX, rectY + rectH - radius);
        ctx.lineTo(rectX, rectY + radius);
        ctx.quadraticCurveTo(rectX, rectY, rectX + radius, rectY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw text
        ctx.fillStyle = style.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, 0, 0);

        ctx.restore();
    }

    calculatePathLength(pathPoints) {
        let length = 0;
        for (let i = 0; i < pathPoints.length - 1; i++) {
            const dx = pathPoints[i + 1].x - pathPoints[i].x;
            const dy = pathPoints[i + 1].y - pathPoints[i].y;
            length += Math.sqrt(dx * dx + dy * dy);
        }
        return length;
    }

    drawConnectionTypeLabel(ctx, from, to, connectionType, count, offset) {
        const fromX = from.x + from.width / 2;
        const fromY = from.y + from.height / 2;
        const toX = to.x + to.width / 2;
        const toY = to.y + to.height / 2;

        const dx = toX - fromX;
        const dy = toY - fromY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Calculate perpendicular vector for offset
        const perpX = -dy / distance;
        const perpY = dx / distance;

        // Calculate label position (middle point between components, offset perpendicularly)
        const midX = (fromX + toX) / 2;
        const midY = (fromY + toY) / 2;
        const labelX = midX + perpX * offset;
        const labelY = midY + perpY * offset;

        // Connection styling based on type
        const styles = {
            network: {
                color: '#3b82f6',
                lineWidth: 2.5,
                dashPattern: []
            },
            fiber: {
                color: '#f59e0b',
                lineWidth: 3,
                dashPattern: [8, 4]
            }
        };

        const style = styles[connectionType] || styles.network;
        const labelPrefix = connectionType === 'fiber' ? 'Fiber Channel' : 'Ethernet';
        const labelText = `${labelPrefix} (${count})`;

        // Calculate rotation angle based on connection direction
        let rotationAngle = Math.atan2(dy, dx);
        // Rotate 90 degrees to make text perpendicular to connection
        rotationAngle += Math.PI / 2;

        // Save context state
        ctx.save();

        // Rotate context for vertical text
        ctx.translate(labelX, labelY);
        ctx.rotate(rotationAngle);

        // Draw label background
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const metrics = ctx.measureText(labelText);
        const labelPadding = 6;
        const labelWidth = metrics.width + labelPadding * 2;
        const labelHeight = 18;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.strokeStyle = style.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Draw rounded rectangle
        const rx = 5;
        const x = -labelWidth / 2;
        const y = -labelHeight / 2;
        ctx.moveTo(x + rx, y);
        ctx.lineTo(x + labelWidth - rx, y);
        ctx.quadraticCurveTo(x + labelWidth, y, x + labelWidth, y + rx);
        ctx.lineTo(x + labelWidth, y + labelHeight - rx);
        ctx.quadraticCurveTo(x + labelWidth, y + labelHeight, x + labelWidth - rx, y + labelHeight);
        ctx.lineTo(x + rx, y + labelHeight);
        ctx.quadraticCurveTo(x, y + labelHeight, x, y + labelHeight - rx);
        ctx.lineTo(x, y + rx);
        ctx.quadraticCurveTo(x, y, x + rx, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw label text
        ctx.fillStyle = style.color;
        ctx.fillText(labelText, 0, 0);

        // Restore context state
        ctx.restore();
    }

    clearCanvas() {
        if (confirm('Are you sure you want to clear the diagram?')) {
            this.components = [];
            this.connections = [];
            this.selectedComponent = null;
            this.redraw();
        }
    }

    showSaveModal() {
        this.showSaveModal = true;
        this.updateDisplay();
    }

    closeSaveModal() {
        this.showSaveModal = false;
        this.updateDisplay();
    }

    showLoadModal() {
        this.showLoadModal = true;
        this.loadDiagrams().then(() => this.updateDisplay());
    }

    closeLoadModal() {
        this.showLoadModal = false;
        this.updateDisplay();
    }

    async saveDiagram() {
        const name = document.getElementById('diagram-name')?.value;
        if (!name) {
            alert('Please enter a diagram name');
            return;
        }

        const diagramData = {
            name: name,
            components: this.components,
            connections: this.connections,
            createdAt: new Date().toISOString()
        };

        try {
            const response = await fetch('/api/infrastructure-diagrams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(diagramData)
            });

            if (!response.ok) throw new Error('Failed to save diagram');

            this.closeSaveModal();
            await this.loadDiagrams();
            alert('Diagram saved successfully!');
        } catch (error) {
            console.error('Error saving diagram:', error);
            alert('Failed to save diagram');
        }
    }

    async loadDiagrams() {
        try {
            const response = await api.fetch('/api/infrastructure-diagrams');
            if (!response.ok) throw new Error('Failed to load diagrams');
            const data = await response.json();
            this.diagrams = Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Error loading diagrams:', error);
            this.diagrams = [];
        }
    }

    async loadDiagram(id) {
        await this.openDiagram(id);
    }

    async deleteDiagram(id) {
        if (!confirm('Are you sure you want to delete this diagram?')) return;

        try {
            const response = await api.fetch('/api/infrastructure-diagrams/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(error);
            }

            await this.loadDiagrams();
            if (this.currentDiagramId === id) {
                this.backToList();
            } else {
                this.updateDisplay();
            }
        } catch (error) {
            console.error('Error deleting diagram:', error);
            alert('Failed to delete diagram: ' + error.message);
        }
    }

    async updateDisplay() {
        const content = document.getElementById('page-content');
        if (content) {
            const html = await this.render();
            content.innerHTML = html;
            this.initCanvas();
        }
    }

    startConnection(port) {
        // Start connection from port (like Automation)
        console.log('[CONNECTION] Starting connection from port:', port);
        this.connecting = true;
        this.connectionStart = {
            componentId: port.componentId,
            portId: port.id,
            port: port
        };
        this.tempConnectionEnd = null; // Will be set on first mouse move
        this.canvas.style.cursor = 'crosshair';
        this.redraw();
    }

    cleanupConnection() {
        // Clean up connection state (like Automation)
        this.connecting = false;
        this.connectionStart = null;
        this.tempConnectionEnd = null;
        this.canvas.style.cursor = this.selectedTool === 'select' ? 'grab' : 'crosshair';
        this.redraw();
    }

    destroy() {
        // Clean up footer observer
        if (this.footerObserver) {
            this.footerObserver.disconnect();
            this.footerObserver = null;
        }

        // Remove resize listener
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }

        // Clean up connection state
        this.cleanupConnection();
    }
}

