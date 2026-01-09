export class ReportTemplatesPage {
    constructor() {
        this.templates = [];
        this.isEditMode = true; // Default to edit mode
        this.selectedTemplate = null;
        this.showEditor = false;
        this.activeTab = 'code'; // 'code' or 'preview'
        this.currentLanguage = localStorage.getItem('language') || 'en';
        this.searchQuery = '';
        this.filterType = 'all';
        this.filterDataSource = 'all';
        this.sortBy = 'updated';
        this.viewMode = localStorage.getItem('reportTemplatesViewMode') || 'grid';
        this.selectedTemplates = new Set();
        this.editorTab = 'content'; // 'settings', 'content', or 'variables'
        
        // Template variables for different data sources
        this.availableVariables = {
            hyperv: {
                cluster: [
                    '{{cluster.name}}', '{{cluster.nodes}}', '{{cluster.health}}', '{{cluster.quorum}}',
                    '{{cluster.totalVMs}}', '{{cluster.runningVMs}}', '{{cluster.totalMemory}}', 
                    '{{cluster.usedMemory}}', '{{cluster.totalStorage}}', '{{cluster.usedStorage}}',
                    '{{cluster.totalProcessors}}', '{{cluster.csvCount}}', '{{cluster.quorumType}}'
                ],
                hosts: [
                    '{{host.name}}', '{{host.osVersion}}', '{{host.osBuildNumber}}', '{{host.osArchitecture}}',
                    '{{host.osProductName}}', '{{host.osInstallDate}}', '{{host.state}}', '{{host.uptime}}',
                    '{{host.domain}}', '{{host.totalVm}}', '{{host.runningVm}}', '{{host.totalVProc}}',
                    '{{host.logicalProcessor}}', '{{host.socketCount}}', '{{host.totalMemory}}',
                    '{{host.usedMemory}}', '{{host.freeMemory}}', '{{host.freeMemoryPercent}}',
                    '{{host.processor.name}}', '{{host.processor.cores}}', '{{host.processor.threads}}',
                    '{{host.windowsActivation.status}}', '{{host.windowsActivation.partialProductKey}}'
                ],
                vms: [
                    '{{vm.name}}', '{{vm.generation}}', '{{vm.version}}', '{{vm.state}}', '{{vm.uptime}}',
                    '{{vm.host}}', '{{vm.vCPU}}', '{{vm.memory.startup}}', '{{vm.memory.minimum}}',
                    '{{vm.memory.maximum}}', '{{vm.integrationServices.state}}', '{{vm.integrationServices.version}}',
                    '{{vm.checkpoint.exists}}', '{{vm.checkpoint.count}}', '{{vm.replica.state}}',
                    '{{vm.replica.health}}', '{{vm.configurationPath}}'
                ],
                storage: [
                    '{{disk.name}}', '{{disk.size}}', '{{disk.allocatedSize}}', '{{disk.sizeRemaining}}',
                    '{{disk.operationalStatus}}', '{{disk.uniqueId}}', '{{disk.serialNumber}}',
                    '{{volume.name}}', '{{volume.driveLetter}}', '{{volume.size}}', '{{volume.sizeRemaining}}',
                    '{{volume.fileSystem}}', '{{volume.healthStatus}}', '{{csv.name}}', '{{csv.alias}}', '{{csv.id}}', '{{csv.size}}',
                    '{{csv.used}}', '{{csv.free}}', '{{csv.ownerNode}}', '{{csv.state}}'
                ],
                network: [
                    '{{adapter.name}}', '{{adapter.interfaceName}}', '{{adapter.status}}', '{{adapter.linkSpeed}}',
                    '{{adapter.mtu}}', '{{adapter.ipAddress}}', '{{adapter.subnetMask}}', '{{adapter.defaultGateway}}',
                    '{{adapter.dnsServers}}', '{{adapter.dhcpEnabled}}', '{{adapter.macAddress}}',
                    '{{adapter.vlanId}}', '{{adapter.dhcpGuard}}', '{{adapter.routerGuard}}',
                    '{{vswitch.name}}', '{{vswitch.type}}', '{{vswitch.notes}}', '{{vswitch.sriovEnabled}}'
                ],
                security: [
                    '{{user.name}}', '{{user.fullName}}', '{{user.description}}', '{{user.enabled}}',
                    '{{user.passwordLastSet}}', '{{user.accountExpires}}', '{{group.name}}',
                    '{{group.description}}', '{{group.members}}', '{{role.name}}', '{{role.displayName}}',
                    '{{role.installState}}', '{{role.featureType}}'
                ],
                updates: [
                    '{{update.title}}', '{{update.kbNumber}}', '{{update.installedOn}}',
                    '{{update.installer}}', '{{update.size}}', '{{update.description}}'
                ],
                mpio: [
                    '{{mpio.installed}}', '{{mpio.pathVerificationEnabled}}', '{{mpio.pdoRemovePeriod}}',
                    '{{mpio.retryCount}}', '{{mpio.retryInterval}}', '{{mpio.useCustomPathRecoveryTime}}',
                    '{{mpio.pathRecoveryInterval}}', '{{mpio.diskTimeoutValue}}', '{{mpioDisk.name}}',
                    '{{mpioDisk.size}}', '{{mpioDisk.pathCount}}', '{{mpioDisk.loadBalancePolicy}}'
                ],
                migration: [
                    '{{liveMigration.enabled}}', '{{liveMigration.maxConcurrentMigrations}}',
                    '{{liveMigration.maxConcurrentStorageMigrations}}', '{{liveMigration.authProtocol}}',
                    '{{liveMigration.performanceOption}}', '{{liveMigration.useAnyNetwork}}',
                    '{{liveMigration.networks}}'
                ],
                errors: [
                    '{{error.level}}', '{{error.source}}', '{{error.eventId}}', '{{error.timeCreated}}',
                    '{{error.message}}', '{{error.description}}', '{{systemError.level}}',
                    '{{hypervError.level}}', '{{clusterError.level}}'
                ]
            },
            ad: {
                domain: ['{{domain.name}}', '{{domain.level}}', '{{domain.controllers}}', '{{domain.sites}}'],
                users: ['{{user.name}}', '{{user.email}}', '{{user.lastLogon}}', '{{user.groups}}'],
                groups: ['{{group.name}}', '{{group.members}}', '{{group.type}}', '{{group.scope}}'],
                computers: ['{{computer.name}}', '{{computer.os}}', '{{computer.lastLogon}}', '{{computer.ou}}']
            },
            fileshare: {
                summary: [
                    '{{summary.criticalIssuesCount}}', '{{summary.warningIssuesCount}}', '{{summary.foldersAnalyzed}}',
                    '{{summary.writableSharesCount}}', '{{summary.leastPrivilegeViolationsCount}}'
                ],
                folder: [
                    '{{folder.path}}', '{{folder.relativePath}}', '{{folder.name}}', '{{folder.fileCount}}',
                    '{{folder.totalSize}}', '{{folder.permissions}}', '{{folder.criticalIssues}}', '{{folder.warningIssues}}'
                ],
                permission: [
                    '{{permission.identityReference}}', '{{permission.fileSystemRights}}', '{{permission.accessControlType}}',
                    '{{permission.isInherited}}', '{{permission.riskLevel}}'
                ],
                issue: [
                    '{{issue.level}}', '{{issue.message}}', '{{issue.folder}}', '{{issue.type}}'
                ]
            },
            system: ['{{report.date}}', '{{report.time}}', '{{report.author}}', '{{company.name}}', '{{company.logo}}']
        };
        
        // Translations
        this.translations = {
            en: {
                title: 'Reports',
                subtitle: 'Create and manage document templates for automated report generation',
                newTemplate: 'New Template',
                templateName: 'Template Name',
                templateType: 'Template Type',
                dataSource: 'Data Source',
                description: 'Description',
                author: 'Author',
                version: 'Version',
                htmlTemplate: 'HTML Template',
                pdfTemplate: 'PDF Template',
                hyperv: 'Hyper-V',
                fileshare: 'File Share',
                activeDirectory: 'Active Directory',
                mixed: 'Mixed Sources',
                save: 'Save Template',
                cancel: 'Cancel',
                edit: 'Edit',
                delete: 'Delete',
                preview: 'Preview',
                generate: 'Generate Report',
                variables: 'Available Variables',
                insertVariable: 'Insert Variable',
                templateEditor: 'Template Editor',
                livePreview: 'Live Preview',
                noTemplates: 'No templates found',
                createFirst: 'Create your first template to get started',
                templateSaved: 'Template saved successfully',
                templateDeleted: 'Template deleted successfully',
                deleteConfirm: 'Are you sure you want to delete this template?',
                loading: 'Loading templates...',
                error: 'Error loading templates',
                clusterInfo: 'Cluster Information',
                hostInfo: 'Host Information',
                vmInfo: 'Virtual Machine Information',
                storageInfo: 'Storage Information',
                domainInfo: 'Domain Information',
                userInfo: 'User Information',
                groupInfo: 'Group Information',
                computerInfo: 'Computer Information',
                systemInfo: 'System Information'
            },
            fr: {
                title: 'Rapports',
                subtitle: 'Créer et gérer des modèles de documents pour la génération automatique de rapports',
                newTemplate: 'Nouveau Modèle',
                templateName: 'Nom du Modèle',
                templateType: 'Type de Modèle',
                dataSource: 'Source de Données',
                description: 'Description',
                author: 'Auteur',
                version: 'Version',
                htmlTemplate: 'Modèle HTML',
                pdfTemplate: 'Modèle PDF',
                hyperv: 'Hyper-V',
                fileshare: 'Partage de Fichiers',
                activeDirectory: 'Active Directory',
                mixed: 'Sources Mixtes',
                save: 'Enregistrer le Modèle',
                cancel: 'Annuler',
                edit: 'Modifier',
                delete: 'Supprimer',
                preview: 'Aperçu',
                generate: 'Générer le Rapport',
                variables: 'Variables Disponibles',
                insertVariable: 'Insérer une Variable',
                templateEditor: 'Éditeur de Modèle',
                livePreview: 'Aperçu en Direct',
                noTemplates: 'Aucun modèle trouvé',
                createFirst: 'Créez votre premier modèle pour commencer',
                templateSaved: 'Modèle enregistré avec succès',
                templateDeleted: 'Modèle supprimé avec succès',
                deleteConfirm: 'Êtes-vous sûr de vouloir supprimer ce modèle?',
                loading: 'Chargement des modèles...',
                error: 'Erreur lors du chargement des modèles',
                clusterInfo: 'Informations du Cluster',
                hostInfo: 'Informations de l\'Hôte',
                vmInfo: 'Informations de Machine Virtuelle',
                storageInfo: 'Informations de Stockage',
                domainInfo: 'Informations du Domaine',
                userInfo: 'Informations Utilisateur',
                groupInfo: 'Informations de Groupe',
                computerInfo: 'Informations d\'Ordinateur',
                systemInfo: 'Informations Système'
            }
        };
    }

    t(key) {
        return this.translations[this.currentLanguage][key] || key;
    }

    setLanguage(lang) {
        this.currentLanguage = lang;
        localStorage.setItem('language', lang);
        this.updateDisplay();
    }

    async mount() {
        window.reportTemplatesInstance = this;
        await this.loadTemplates();
        this.updateDisplay();
    }

    unmount() {
        // Reset state when unmounting
        this.showEditor = false;
        this.activeTab = 'code';
        this.selectedTemplate = null;
        delete window.reportTemplatesInstance;
    }

    updateDisplay() {
        const container = document.getElementById('page-content');
        if (container) {
            container.innerHTML = this.render();
        }
    }

    async loadTemplates() {
        try {
            const response = await fetch('/api/report-templates');
            if (response.ok) {
                const templates = await response.json();
                // Parse rules JSON for each template
                this.templates = (templates || []).map(template => {
                    if (template.rules) {
                        try {
                            const rules = JSON.parse(template.rules);
                            return {
                                ...template,
                                category: rules.category || '',
                                tags: rules.tags || '',
                                status: rules.status || 'draft',
                                priority: rules.priority || 'medium',
                                notes: rules.notes || '',
                                purpose: rules.purpose || ''
                            };
                        } catch (e) {
                            console.warn('Failed to parse rules for template:', template.id, e);
                            return template;
                        }
                    }
                    return template;
                });
                console.log(`[ReportTemplates] Loaded ${this.templates.length} templates`);
            } else {
                const errorText = await response.text();
                console.error(`[ReportTemplates] Failed to load templates: ${response.status} ${response.statusText}`, errorText);
                this.templates = [];
            }
        } catch (error) {
            console.error('[ReportTemplates] Error loading templates:', error);
            this.templates = [];
        }
    }

    render() {
        let mainContent = '';
        if (this.showEditor) {
            mainContent = this.renderEditor();
        } else {
            const filteredTemplates = this.getFilteredTemplates();
            const stats = this.calculateStats();
            mainContent = `
            <div class="reports-page">
                <div class="reports-header">
                    <div class="reports-header-left">
                        <h1><i class="fas fa-file-alt"></i> ${this.t('title')}</h1>
                        <p class="reports-subtitle">${this.t('subtitle')}</p>
                    </div>
                    <div class="reports-header-actions">
                        <button class="btn btn-primary" onclick="reportTemplatesInstance.showCreateTemplate()">
                            <i class="fas fa-plus"></i> ${this.t('newTemplate')}
                        </button>
                    </div>
                </div>

                <div class="reports-content">
                    ${this.renderStatsCards(stats)}
                    ${this.renderToolbar()}
                    ${this.renderTemplatesList(filteredTemplates)}
                </div>
            </div>
            `;
        }
        
        return mainContent + this.renderPreviewModal() + this.renderTemplateDetailsModal();
    }

    renderStatsCards(stats) {
        return `
            <div class="reports-stats">
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);">
                        <i class="fas fa-file-alt"></i>
                    </div>
                    <div class="stat-info">
                        <div class="stat-value">${stats.total}</div>
                        <div class="stat-label">Total Templates</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, var(--success) 0%, #059669 100%);">
                        <i class="fas fa-code"></i>
                    </div>
                    <div class="stat-info">
                        <div class="stat-value">${stats.html}</div>
                        <div class="stat-label">HTML Templates</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, var(--secondary) 0%, #7c3aed 100%);">
                        <i class="fas fa-file-word"></i>
                    </div>
                    <div class="stat-info">
                        <div class="stat-value">${stats.docx}</div>
                        <div class="stat-label">DOCX Templates</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderToolbar() {
        const filteredCount = this.getFilteredTemplates().length;
        const hasSelection = this.selectedTemplates.size > 0;

        return `
            <div class="reports-toolbar">
                <div class="toolbar-section">
                    <div class="search-wrapper">
                        <i class="fas fa-search"></i>
                        <input type="text" 
                               class="search-input" 
                               placeholder="Search templates..." 
                               value="${this.searchQuery}"
                               oninput="reportTemplatesInstance.handleSearch(event)">
                    </div>
                    <select class="filter-select" onchange="reportTemplatesInstance.handleFilterType(event)">
                        <option value="all" ${this.filterType === 'all' ? 'selected' : ''}>All Types</option>
                        <option value="html" ${this.filterType === 'html' ? 'selected' : ''}>HTML</option>
                        <option value="docx" ${this.filterType === 'docx' ? 'selected' : ''}>DOCX</option>
                        <option value="pdf" ${this.filterType === 'pdf' ? 'selected' : ''}>PDF</option>
                    </select>
                    <select class="filter-select" onchange="reportTemplatesInstance.handleFilterDataSource(event)">
                        <option value="all" ${this.filterDataSource === 'all' ? 'selected' : ''}>All Sources</option>
                        <option value="hyperv" ${this.filterDataSource === 'hyperv' ? 'selected' : ''}>Hyper-V</option>
                        <option value="fileshare" ${this.filterDataSource === 'fileshare' ? 'selected' : ''}>File Share</option>
                        <option value="ad" ${this.filterDataSource === 'ad' ? 'selected' : ''}>Active Directory</option>
                        <option value="mixed" ${this.filterDataSource === 'mixed' ? 'selected' : ''}>Mixed</option>
                    </select>
                    <select class="filter-select" onchange="reportTemplatesInstance.handleSort(event)">
                        <option value="updated" ${this.sortBy === 'updated' ? 'selected' : ''}>Recently Updated</option>
                        <option value="created" ${this.sortBy === 'created' ? 'selected' : ''}>Recently Created</option>
                        <option value="name" ${this.sortBy === 'name' ? 'selected' : ''}>Name (A-Z)</option>
                        <option value="name-desc" ${this.sortBy === 'name-desc' ? 'selected' : ''}>Name (Z-A)</option>
                    </select>
                </div>
                <div class="toolbar-section">
                    <div class="view-toggle">
                        <button class="view-btn ${this.viewMode === 'grid' ? 'active' : ''}" 
                                onclick="reportTemplatesInstance.setViewMode('grid')" 
                                title="Grid View">
                            <i class="fas fa-th"></i>
                        </button>
                        <button class="view-btn ${this.viewMode === 'list' ? 'active' : ''}" 
                                onclick="reportTemplatesInstance.setViewMode('list')" 
                                title="List View">
                            <i class="fas fa-list"></i>
                        </button>
                    </div>
                    ${hasSelection ? `
                        <button class="btn btn-sm btn-danger" onclick="reportTemplatesInstance.bulkDelete()">
                            <i class="fas fa-trash"></i> Delete (${this.selectedTemplates.size})
                        </button>
                    ` : ''}
                    <span class="results-badge">${filteredCount} ${filteredCount === 1 ? 'template' : 'templates'}</span>
                </div>
            </div>
        `;
    }

    renderTemplatesList(templates) {
        if (!templates || templates.length === 0) {
            const hasFilters = this.searchQuery || this.filterType !== 'all' || this.filterDataSource !== 'all';
            return `
                <div class="empty-state">
                    <div class="empty-state-content">
                        <i class="fas fa-${hasFilters ? 'filter' : 'file-alt'}"></i>
                        <h3>${hasFilters ? 'No templates match your filters' : this.t('noTemplates')}</h3>
                        <p>${hasFilters ? 'Try adjusting your search or filters' : this.t('createFirst')}</p>
                        ${hasFilters ? `
                            <button class="btn btn-secondary" onclick="reportTemplatesInstance.clearFilters()">
                                <i class="fas fa-times"></i> Clear Filters
                            </button>
                        ` : `
                            <button class="btn btn-primary" onclick="reportTemplatesInstance.showCreateTemplate()">
                                <i class="fas fa-plus"></i> ${this.t('newTemplate')}
                            </button>
                        `}
                    </div>
                </div>
            `;
        }

        const containerClass = this.viewMode === 'grid' ? 'reports-grid' : 'reports-list';
        return `
            <div class="${containerClass}">
                ${templates.map(template => this.renderTemplateCard(template)).join('')}
            </div>
        `;
    }

    renderTemplateCard(template) {
        const typeIcon = template.type === 'html' ? 'fa-code' : template.type === 'docx' ? 'fa-file-word' : 'fa-file-pdf';
        const sourceIcon = template.dataSource === 'hyperv' ? 'fa-server' : 
                          template.dataSource === 'fileshare' ? 'fa-folder-open' :
                          template.dataSource === 'ad' ? 'fa-users' : 'fa-layer-group';
        
        const typeColor = template.type === 'html' ? 'var(--success)' : 
                         template.type === 'docx' ? 'var(--secondary)' : 'var(--danger)';
        
        const escapeHtml = (text) => {
            if (!text) return '';
            return String(text)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        };
        
        // Parse tags if it's a string
        const tags = template.tags ? (typeof template.tags === 'string' ? template.tags.split(',').map(t => t.trim()).filter(t => t) : []) : [];
        
        // Status badge color
        const statusColors = {
            draft: '#94a3b8',
            published: '#10b981',
            archived: '#64748b'
        };
        
        // Priority badge color
        const priorityColors = {
            low: '#10b981',
            medium: '#f59e0b',
            high: '#ef4444'
        };
        
        const statusColor = statusColors[template.status] || statusColors.draft;
        const priorityColor = priorityColors[template.priority] || priorityColors.medium;
        
        return `
            <div class="template-card" onclick="reportTemplatesInstance.openTemplateDetailsModal('${template.id}')">
                <div class="template-card-header">
                    <div class="template-icon" style="background: linear-gradient(135deg, ${typeColor}15 0%, ${typeColor}25 100%);">
                        <i class="fas ${typeIcon}" style="color: ${typeColor};"></i>
                    </div>
                    <div class="template-info">
                        <h3 class="template-name">${escapeHtml(template.name || 'Untitled Template')}</h3>
                        <div class="template-meta">
                            <span class="template-badge type-${template.type}">
                                <i class="fas ${typeIcon}"></i>
                                ${template.type.toUpperCase()}
                            </span>
                            <span class="template-badge source-${template.dataSource}">
                                <i class="fas ${sourceIcon}"></i>
                                ${this.t(template.dataSource)}
                            </span>
                            ${template.version ? `
                                <span class="template-badge">
                                    <i class="fas fa-tag"></i>
                                    v${escapeHtml(template.version)}
                                </span>
                            ` : ''}
                            ${template.status && template.status !== 'draft' ? `
                                <span class="template-badge" style="background: ${statusColor}15; color: ${statusColor}; border-color: ${statusColor}30;">
                                    <i class="fas fa-${template.status === 'published' ? 'check-circle' : 'archive'}"></i>
                                    ${template.status.charAt(0).toUpperCase() + template.status.slice(1)}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                </div>
                <div class="template-card-body">
                    <p class="template-description">${escapeHtml(template.description || 'No description provided')}</p>
                    
                    <div class="template-meta-info">
                        ${template.author ? `
                            <span class="template-meta-stat">
                                <i class="fas fa-user"></i>
                                ${escapeHtml(template.author)}
                            </span>
                        ` : ''}
                        <span class="template-meta-stat">
                            <i class="fas fa-calendar"></i>
                            ${template.updatedAt ? new Date(template.updatedAt).toLocaleDateString() : template.createdAt ? new Date(template.createdAt).toLocaleDateString() : 'N/A'}
                        </span>
                        ${template.priority && template.priority !== 'medium' ? `
                            <span class="template-meta-stat" style="color: ${priorityColor};">
                                <i class="fas fa-flag"></i>
                                ${template.priority.charAt(0).toUpperCase() + template.priority.slice(1)}
                            </span>
                        ` : ''}
                    </div>
                    
                    ${template.category || template.purpose ? `
                        <div class="template-details">
                            ${template.category ? `
                                <div class="template-detail-item">
                                    <i class="fas fa-folder" style="color: #64748b;"></i>
                                    <span>${escapeHtml(template.category)}</span>
                                </div>
                            ` : ''}
                            ${template.purpose ? `
                                <div class="template-detail-item">
                                    <i class="fas fa-bullseye" style="color: #64748b;"></i>
                                    <span>${escapeHtml(template.purpose)}</span>
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                    
                    ${tags.length > 0 ? `
                        <div class="template-tags">
                            ${tags.map(tag => `
                                <span class="template-tag">${escapeHtml(tag)}</span>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    <div class="template-footer">
                        <div class="template-actions" onclick="event.stopPropagation()">
                            <button class="btn-icon" onclick="reportTemplatesInstance.previewTemplate('${template.id}')" title="${this.t('preview')}">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-icon" onclick="reportTemplatesInstance.editTemplate('${template.id}')" title="${this.t('edit')}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon" onclick="reportTemplatesInstance.generateReport('${template.id}')" title="${this.t('generate')}">
                                <i class="fas fa-play"></i>
                            </button>
                            <button class="btn-icon btn-icon-danger" onclick="reportTemplatesInstance.deleteTemplate('${template.id}')" title="${this.t('delete')}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderEditor() {
        // Use selectedTemplate if it exists, otherwise create a default
        // But merge with selectedTemplate to preserve uploaded files
        const defaultTemplate = {
            name: '',
            type: 'html',
            dataSource: 'hyperv',
            description: '',
            content: this.getDefaultTemplate('html', 'hyperv')
        };
        
        // Always use selectedTemplate if it exists, especially for content (DOCX files)
        const template = this.selectedTemplate ? {
            ...defaultTemplate,
            ...this.selectedTemplate,
            // Always use selectedTemplate.content if it exists (for DOCX files)
            content: this.selectedTemplate.content || defaultTemplate.content
        } : defaultTemplate;
        
        // Debug log for DOCX templates
        if (template.type === 'docx') {
            console.log('Rendering DOCX editor:', {
                hasSelectedTemplate: !!this.selectedTemplate,
                hasContent: !!template.content,
                contentLength: template.content?.length || 0,
                contentPreview: template.content?.substring(0, 50) || 'none'
            });
        }

        const templateInfo = this.getTemplateInfo(template);
        const editorTab = this.editorTab || 'content';

        return `
            <div class="template-editor-page">
                <div class="template-editor-header">
                    <div class="template-editor-header-left">
                        <button class="btn-back" onclick="reportTemplatesInstance.closeEditor()" title="Back to templates">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                        <div>
                            <h1><i class="fas fa-file-alt"></i> ${template.name || 'New Template'}</h1>
                            <p class="template-editor-subtitle">
                                ${template.type === 'html' ? 'HTML Template' : template.type === 'docx' ? 'DOCX Template' : 'PDF Template'} • ${this.t(template.dataSource)}
                                ${template.version ? ` • v${template.version}` : ''}
                            </p>
                        </div>
                    </div>
                    <div class="template-editor-header-actions">
                        <button class="btn btn-secondary" onclick="reportTemplatesInstance.openPreviewModal()" title="Preview Template">
                            <i class="fas fa-eye"></i> Preview
                        </button>
                        ${template.id ? `
                            <button class="btn btn-secondary" onclick="reportTemplatesInstance.duplicateTemplate()" title="Duplicate">
                                <i class="fas fa-copy"></i> Duplicate
                            </button>
                            <button class="btn btn-secondary" onclick="reportTemplatesInstance.exportTemplate('${template.id}')" title="Export">
                                <i class="fas fa-download"></i> Export
                            </button>
                        ` : ''}
                        <button class="btn btn-success" onclick="reportTemplatesInstance.saveTemplate()">
                            <i class="fas fa-save"></i> Save
                        </button>
                    </div>
                </div>

                <div class="template-editor-layout">
                    <!-- Left Sidebar: All Settings Fields -->
                    <div class="template-editor-sidebar">
                        ${this.renderTemplateSettingsForm(template)}
                    </div>

                    <!-- Center: Content Editor -->
                    <div class="template-editor-main">
                        <div class="code-editor-wrapper">
                            <div class="code-editor-toolbar">
                                <div class="toolbar-left">
                                    <div class="content-header-title">
                                        <i class="fas ${template.type === 'docx' ? 'fa-file-word' : 'fa-code'}"></i> ${template.type === 'docx' ? 'DOCX Template File' : 'Template Content'}
                                    </div>
                                    <span class="editor-status">
                                        <i class="fas fa-circle" style="color: var(--success); font-size: 0.5rem;"></i>
                                        Ready
                                    </span>
                                </div>
                                <div class="toolbar-right">
                                    ${template.type === 'html' ? `
                                        <button class="btn btn-sm btn-secondary" onclick="reportTemplatesInstance.formatCode()" title="Format Code">
                                            <i class="fas fa-indent"></i> Format
                                        </button>
                                        <button class="btn btn-sm btn-secondary" onclick="reportTemplatesInstance.insertSampleData()" title="Insert Sample Data">
                                            <i class="fas fa-database"></i> Sample Data
                                        </button>
                                    ` : ''}
                                    <button class="btn btn-sm btn-primary" onclick="reportTemplatesInstance.openPreviewModal()" title="Open Live Preview">
                                        <i class="fas fa-eye"></i> Live Preview
                                    </button>
                                </div>
                            </div>
                            <div class="code-editor-content">
                                ${this.renderCodeEditor(template)}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Preview Modal -->
                ${this.renderPreviewModal()}
            </div>
        `;
    }

    switchEditorTab(tab) {
        this.editorTab = tab;
        this.updateDisplay();
    }

    getTemplateInfo(template) {
        const contentLength = template.content ? template.content.length : 0;
        const wordCount = template.content ? template.content.split(/\s+/).filter(w => w.length > 0).length : 0;
        const variableCount = (template.content ? (template.content.match(/\{\{[^}]+\}\}/g) || []).length : 0);
        
        return {
            contentLength: this.formatBytes(contentLength),
            wordCount: wordCount.toLocaleString(),
            variableCount: variableCount,
            lastModified: template.updatedAt ? new Date(template.updatedAt).toLocaleString() : 'Never',
            created: template.createdAt ? new Date(template.createdAt).toLocaleString() : 'Just now'
        };
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    renderEditorToolbar(template) {
        return `
            <div class="editor-toolbar">
                <div class="toolbar-section">
                    <div class="toolbar-group">
                        <span class="toolbar-label">
                            <i class="fas fa-file-alt"></i> Template Type:
                        </span>
                        <span class="toolbar-badge ${template.type}">${template.type.toUpperCase()}</span>
                    </div>
                    <div class="toolbar-group">
                        <span class="toolbar-label">
                            <i class="fas fa-database"></i> Data Source:
                        </span>
                        <span class="toolbar-badge source-${template.dataSource}">${this.t(template.dataSource)}</span>
                    </div>
                </div>
                <div class="toolbar-section">
                    <button class="btn btn-sm btn-secondary" onclick="reportTemplatesInstance.duplicateTemplate()" title="Duplicate Template">
                        <i class="fas fa-copy"></i> Duplicate
                    </button>
                    ${template.id ? `
                        <button class="btn btn-sm btn-secondary" onclick="reportTemplatesInstance.exportTemplate('${template.id}')" title="Export Template">
                            <i class="fas fa-download"></i> Export
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="reportTemplatesInstance.deleteTemplate('${template.id}')" title="Delete Template">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    renderTemplateInfoCards(info) {
        return `
            <div class="editor-info-cards">
                <div class="info-card">
                    <div class="info-icon" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">
                        <i class="fas fa-file-code"></i>
                    </div>
                    <div class="info-content">
                        <div class="info-value">${info.contentLength}</div>
                        <div class="info-label">Content Size</div>
                    </div>
                </div>
                <div class="info-card">
                    <div class="info-icon" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                        <i class="fas fa-font"></i>
                    </div>
                    <div class="info-content">
                        <div class="info-value">${info.wordCount}</div>
                        <div class="info-label">Words</div>
                    </div>
                </div>
                <div class="info-card">
                    <div class="info-icon" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);">
                        <i class="fas fa-code"></i>
                    </div>
                    <div class="info-content">
                        <div class="info-value">${info.variableCount}</div>
                        <div class="info-label">Variables</div>
                    </div>
                </div>
                <div class="info-card">
                    <div class="info-icon" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="info-content">
                        <div class="info-value-small">${info.lastModified}</div>
                        <div class="info-label">Last Modified</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderEditorSettingsTab(template) {
        return `
            <div class="template-editor-tab-content">
                ${this.renderTemplateSettingsForm(template)}
            </div>
        `;
    }

    renderEditorContentTab(template) {
        return `
            <div class="template-editor-tab-content">
                ${template.type === 'docx' ? `
                    <div class="docx-editor-wrapper">
                        ${this.renderCodeEditor(template)}
                    </div>
                ` : `
                    <div class="code-editor-wrapper">
                        <div class="code-editor-toolbar">
                            <div class="toolbar-left">
                                <span class="editor-status">
                                    <i class="fas fa-circle" style="color: var(--success); font-size: 0.5rem;"></i>
                                    Ready
                                </span>
                            </div>
                            <div class="toolbar-right">
                                <button class="btn btn-sm btn-secondary" onclick="reportTemplatesInstance.formatCode()" title="Format Code">
                                    <i class="fas fa-indent"></i> Format
                                </button>
                                <button class="btn btn-sm btn-secondary" onclick="reportTemplatesInstance.insertSampleData()" title="Insert Sample Data">
                                    <i class="fas fa-database"></i> Sample Data
                                </button>
                                <button class="btn btn-sm btn-primary" onclick="reportTemplatesInstance.openPreviewModal()" title="Open Live Preview">
                                    <i class="fas fa-eye"></i> Live Preview
                                </button>
                            </div>
                        </div>
                        <div class="code-editor-content">
                            ${this.renderCodeEditor(template)}
                        </div>
                    </div>
                `}
            </div>
        `;
    }

    renderEditorVariablesTab(dataSource) {
        return `
            <div class="template-editor-tab-content">
                ${this.renderVariablesPanel(dataSource)}
            </div>
        `;
    }

    setContentEditMode(editMode) {
        this.isEditMode = editMode;
        this.updateDisplay();
    }
    
    async analyzeDOCXContent(base64Content) {
        try {
            // Remove data URL prefix if present
            let base64Data = base64Content;
            if (base64Data.includes(',')) {
                base64Data = base64Data.split(',')[1];
            }
            
            // Decode base64 to binary string
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Load JSZip library dynamically if not available
            let JSZip;
            if (window.JSZip) {
                JSZip = window.JSZip;
            } else {
                // Load JSZip from local file
                const script = document.createElement('script');
                script.src = 'js/libs/jszip.min.js';
                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
                JSZip = window.JSZip;
            }
            
            // Parse ZIP archive
            const zip = await JSZip.loadAsync(bytes);
            
            // Extract document.xml
            const documentXmlFile = zip.file('word/document.xml');
            if (!documentXmlFile) {
                return { placeholders: 0, loops: 0, conditionals: 0 };
            }
            
            const documentXml = await documentXmlFile.async('string');
            
            // Extract placeholder count from XML
            const placeholderMatches = documentXml.match(/\{\{[^}]+\}\}/g) || [];
            const loopMatches = documentXml.match(/\{\{#each\s+[^}]+\}\}/g) || [];
            const conditionalMatches = documentXml.match(/\{\{#if\s+[^}]+\}\}/g) || [];
            
            return {
                placeholders: placeholderMatches.length,
                loops: loopMatches.length,
                conditionals: conditionalMatches.length
            };
        } catch (error) {
            console.error('Error analyzing DOCX content:', error);
            return { placeholders: 0, loops: 0, conditionals: 0 };
        }
    }
    
    renderDOCXPreview(template) {
        const content = this.selectedTemplate?.content || template.content || '';
        const hasFile = content && (
            content.startsWith('data:application/vnd.openxmlformats-officedocument.wordprocessingml.document') ||
            content.startsWith('data:application/octet-stream') ||
            (content.startsWith('data:') && content.includes('base64') && content.length > 1000)
        );
        
        if (!hasFile) {
            return `
                <div class="preview-placeholder">
                    <i class="fas fa-file-word fa-3x" style="color: #cbd5e1; margin-bottom: 1rem;"></i>
                    <p>Please upload a DOCX file to preview</p>
                </div>
            `;
        }
        
        // Calculate file size
        const base64Data = content.includes(',') ? content.split(',')[1] : content;
        const fileSizeBytes = Math.round((base64Data.length * 3) / 4);
        const fileSizeKB = (fileSizeBytes / 1024).toFixed(2);
        
        // Store content for async analysis
        const previewId = 'docx-preview-' + Date.now();
        
        // Start async analysis
        this.analyzeDOCXContent(content).then(stats => {
            const placeholderEl = document.getElementById(previewId + '-placeholders');
            const loopEl = document.getElementById(previewId + '-loops');
            const conditionalEl = document.getElementById(previewId + '-conditionals');
            
            if (placeholderEl) placeholderEl.textContent = stats.placeholders;
            if (loopEl) loopEl.textContent = stats.loops;
            if (conditionalEl) conditionalEl.textContent = stats.conditionals;
        });
        
        return `
            <div class="docx-preview-info">
                <div class="docx-preview-header">
                    <i class="fas fa-file-word fa-2x" style="color: var(--secondary); margin-bottom: 1rem;"></i>
                    <h3>DOCX Template Preview</h3>
                    <p class="docx-preview-subtitle">Generate a preview with sample data</p>
                </div>
                <div class="docx-preview-stats">
                    <div class="docx-stat-item">
                        <i class="fas fa-file-alt"></i>
                        <div>
                            <div class="docx-stat-value">${fileSizeKB} KB</div>
                            <div class="docx-stat-label">File Size</div>
                        </div>
                    </div>
                    <div class="docx-stat-item">
                        <i class="fas fa-code"></i>
                        <div>
                            <div class="docx-stat-value" id="${previewId}-placeholders">...</div>
                            <div class="docx-stat-label">Placeholders</div>
                        </div>
                    </div>
                    <div class="docx-stat-item">
                        <i class="fas fa-sync"></i>
                        <div>
                            <div class="docx-stat-value" id="${previewId}-loops">...</div>
                            <div class="docx-stat-label">Loops</div>
                        </div>
                    </div>
                    <div class="docx-stat-item">
                        <i class="fas fa-question-circle"></i>
                        <div>
                            <div class="docx-stat-value" id="${previewId}-conditionals">...</div>
                            <div class="docx-stat-label">Conditionals</div>
                        </div>
                    </div>
                </div>
                <div class="docx-preview-actions">
                    <button class="btn btn-primary" onclick="reportTemplatesInstance.generateDOCXPreview()">
                        <i class="fas fa-file-download"></i> Generate Preview DOCX
                    </button>
                    <p class="docx-preview-note">This will generate a DOCX file with sample data replacing all placeholders</p>
                </div>
            </div>
        `;
        
        return `
            <div class="docx-preview-info">
                <div class="docx-preview-header">
                    <i class="fas fa-file-word fa-2x" style="color: var(--secondary); margin-bottom: 1rem;"></i>
                    <h3>DOCX Template Preview</h3>
                    <p class="docx-preview-subtitle">Generate a preview with sample data</p>
                </div>
                <div class="docx-preview-stats">
                    <div class="docx-stat-item">
                        <i class="fas fa-file-alt"></i>
                        <div>
                            <div class="docx-stat-value">${fileSizeKB} KB</div>
                            <div class="docx-stat-label">File Size</div>
                        </div>
                    </div>
                    <div class="docx-stat-item">
                        <i class="fas fa-code"></i>
                        <div>
                            <div class="docx-stat-value">${placeholderMatches.length}</div>
                            <div class="docx-stat-label">Placeholders</div>
                        </div>
                    </div>
                    <div class="docx-stat-item">
                        <i class="fas fa-sync"></i>
                        <div>
                            <div class="docx-stat-value">${loopMatches.length}</div>
                            <div class="docx-stat-label">Loops</div>
                        </div>
                    </div>
                    <div class="docx-stat-item">
                        <i class="fas fa-question-circle"></i>
                        <div>
                            <div class="docx-stat-value">${conditionalMatches.length}</div>
                            <div class="docx-stat-label">Conditionals</div>
                        </div>
                    </div>
                </div>
                <div class="docx-preview-actions">
                    <button class="btn btn-primary" onclick="reportTemplatesInstance.generateDOCXPreview()">
                        <i class="fas fa-file-download"></i> Generate Preview DOCX
                    </button>
                    <p class="docx-preview-note">This will generate a DOCX file with sample data replacing all placeholders</p>
                </div>
            </div>
        `;
    }

    renderSidebarVariables(dataSource) {
        const variables = this.availableVariables[dataSource] || {};
        const systemVars = this.availableVariables.system;
        let html = '';

        // Helper to render variable item
        const renderVar = (v) => `
            <div class="variable-item" onclick="reportTemplatesInstance.insertVariable('${v}')" title="Click to insert">
                <span class="variable-code">${v}</span>
            </div>
        `;

        // Render data source variables
        Object.entries(variables).forEach(([category, vars]) => {
            vars.forEach(v => {
                html += renderVar(v);
            });
        });

        // Render system variables
        systemVars.forEach(v => {
            html += renderVar(v);
        });

        return html;
    }

    renderTemplateSettingsForm(template) {
        // Ensure all template properties have default values
        const safeTemplate = {
            name: (template && template.name) ? String(template.name) : '',
            type: (template && template.type) ? String(template.type) : 'html',
            dataSource: (template && template.dataSource) ? String(template.dataSource) : 'hyperv',
            description: (template && template.description) ? String(template.description) : '',
            author: (template && template.author) ? String(template.author) : '',
            version: (template && template.version) ? String(template.version) : '1.0',
            category: (template && template.category) ? String(template.category) : '',
            tags: (template && template.tags) ? String(template.tags) : '',
            status: (template && template.status) ? String(template.status) : 'draft',
            priority: (template && template.priority) ? String(template.priority) : 'medium',
            notes: (template && template.notes) ? String(template.notes) : '',
            purpose: (template && template.purpose) ? String(template.purpose) : ''
        };
        
        // Parse rules JSON if it exists
        let additionalData = {};
        if (template && template.rules) {
            try {
                additionalData = JSON.parse(template.rules);
                safeTemplate.category = additionalData.category || safeTemplate.category;
                safeTemplate.tags = additionalData.tags || safeTemplate.tags;
                safeTemplate.status = additionalData.status || safeTemplate.status;
                safeTemplate.priority = additionalData.priority || safeTemplate.priority;
                safeTemplate.notes = additionalData.notes || safeTemplate.notes;
                safeTemplate.purpose = additionalData.purpose || safeTemplate.purpose;
            } catch (e) {
                // Ignore parse errors
            }
        }
        
        // Simple HTML escape function
        const escapeHtml = (text) => {
            if (!text) return '';
            return String(text)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        };
        
        const createdDate = template && template.createdAt ? new Date(template.createdAt).toLocaleDateString() : 'N/A';
        const updatedDate = template && template.updatedAt ? new Date(template.updatedAt).toLocaleDateString() : 'N/A';
        
        return `
            <div class="template-settings-sidebar">
                <div class="settings-form-list">
                    <div class="settings-form-group">
                        <label class="settings-label">
                            Template Name <span class="required">*</span>
                        </label>
                        <input type="text" class="settings-input" id="template-name" value="${escapeHtml(safeTemplate.name)}" placeholder="Enter template name" required>
                    </div>
                    
                    <div class="settings-form-group">
                        <label class="settings-label">
                            Type <span class="required">*</span>
                        </label>
                        <select class="settings-input" id="template-type" onchange="reportTemplatesInstance.onTypeChange()" required>
                            <option value="html" ${safeTemplate.type === 'html' ? 'selected' : ''}>HTML</option>
                            <option value="docx" ${safeTemplate.type === 'docx' ? 'selected' : ''}>DOCX</option>
                            <option value="pdf" ${safeTemplate.type === 'pdf' ? 'selected' : ''}>PDF</option>
                        </select>
                    </div>
                    
                    <div class="settings-form-group">
                        <label class="settings-label">
                            Data Source <span class="required">*</span>
                        </label>
                        <select class="settings-input" id="template-source" onchange="reportTemplatesInstance.onSourceChange()" required>
                            <option value="hyperv" ${safeTemplate.dataSource === 'hyperv' ? 'selected' : ''}>Hyper-V</option>
                            <option value="fileshare" ${safeTemplate.dataSource === 'fileshare' ? 'selected' : ''}>File Share</option>
                            <option value="ad" ${safeTemplate.dataSource === 'ad' ? 'selected' : ''}>Active Directory</option>
                            <option value="mixed" ${safeTemplate.dataSource === 'mixed' ? 'selected' : ''}>Mixed</option>
                        </select>
                    </div>
                    
                    <div class="settings-form-group">
                        <label class="settings-label">
                            Category
                        </label>
                        <input type="text" class="settings-input" id="template-category" value="${escapeHtml(safeTemplate.category)}" placeholder="e.g., Infrastructure, Security">
                    </div>
                    
                    <div class="settings-form-group">
                        <label class="settings-label">
                            Author
                        </label>
                        <input type="text" class="settings-input" id="template-author" value="${escapeHtml(safeTemplate.author)}" placeholder="Author name">
                    </div>
                    
                    <div class="settings-form-group">
                        <label class="settings-label">
                            Version
                        </label>
                        <input type="text" class="settings-input" id="template-version" value="${escapeHtml(safeTemplate.version)}" placeholder="1.0">
                    </div>
                    
                    <div class="settings-form-group">
                        <label class="settings-label">
                            Status
                        </label>
                        <select class="settings-input" id="template-status">
                            <option value="draft" ${safeTemplate.status === 'draft' ? 'selected' : ''}>Draft</option>
                            <option value="published" ${safeTemplate.status === 'published' ? 'selected' : ''}>Published</option>
                            <option value="archived" ${safeTemplate.status === 'archived' ? 'selected' : ''}>Archived</option>
                        </select>
                    </div>
                    
                    <div class="settings-form-group">
                        <label class="settings-label">
                            Priority
                        </label>
                        <select class="settings-input" id="template-priority">
                            <option value="low" ${safeTemplate.priority === 'low' ? 'selected' : ''}>Low</option>
                            <option value="medium" ${safeTemplate.priority === 'medium' ? 'selected' : ''}>Medium</option>
                            <option value="high" ${safeTemplate.priority === 'high' ? 'selected' : ''}>High</option>
                        </select>
                    </div>
                    
                    <div class="settings-form-group">
                        <label class="settings-label">
                            Tags
                        </label>
                        <input type="text" class="settings-input" id="template-tags" value="${escapeHtml(safeTemplate.tags)}" placeholder="tag1, tag2, tag3">
                    </div>
                    
                    <div class="settings-form-group">
                        <label class="settings-label">
                            Purpose
                        </label>
                        <input type="text" class="settings-input" id="template-purpose" value="${escapeHtml(safeTemplate.purpose)}" placeholder="Template use case or purpose">
                    </div>
                    
                    <div class="settings-form-group">
                        <label class="settings-label">
                            Description
                        </label>
                        <textarea class="settings-input" id="template-description" rows="3" placeholder="Brief description of the template">${escapeHtml(safeTemplate.description)}</textarea>
                    </div>
                </div>
                
                <div class="settings-form-group-full">
                    <label class="settings-label">
                        <i class="fas fa-sticky-note"></i> Notes
                    </label>
                    <textarea class="settings-input" id="template-notes" rows="2" placeholder="Additional notes or comments">${escapeHtml(safeTemplate.notes)}</textarea>
                </div>
                
                ${template && template.id ? `
                    <div class="settings-info-row">
                        <div class="info-item">
                            <i class="fas fa-calendar-plus"></i>
                            <span>Created: ${createdDate}</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-calendar-edit"></i>
                            <span>Updated: ${updatedDate}</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-hashtag"></i>
                            <span>ID: ${template.id.substring(0, 8)}...</span>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderVariablesPanel(dataSource) {
        const variables = this.availableVariables[dataSource] || {};
        const systemVars = this.availableVariables.system;
        
        // Add search functionality for variables
        return `
            <div class="variables-panel">
                <div class="variables-panel-header">
                    <h4><i class="fas fa-code"></i> ${this.t('variables')}</h4>
                    <div class="variable-search-box">
                        <i class="fas fa-search"></i>
                        <input type="text" 
                               class="variable-search-input" 
                               placeholder="Search variables..." 
                               id="variable-search"
                               oninput="reportTemplatesInstance.filterVariables(event)">
                    </div>
                </div>
                
                <div class="variables-panel-content" id="variables-content">
                    ${Object.entries(variables).map(([category, vars]) => `
                        <div class="variable-category" data-category="${category}">
                            <h5>
                                <i class="fas ${this.getCategoryIcon(category)}"></i>
                                ${this.t(category + 'Info') || category}
                            </h5>
                            <div class="variable-list">
                                ${vars.map(variable => `
                                    <button class="variable-btn" 
                                            data-variable="${variable.toLowerCase()}"
                                            onclick="reportTemplatesInstance.insertVariable('${variable}')" 
                                            title="${this.t('insertVariable')}: ${variable}">
                                        <code>${variable}</code>
                                        <i class="fas fa-copy"></i>
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                    
                    <div class="variable-category" data-category="system">
                        <h5>
                            <i class="fas fa-cog"></i>
                            ${this.t('systemInfo')}
                        </h5>
                        <div class="variable-list">
                            ${systemVars.map(variable => `
                                <button class="variable-btn" 
                                        data-variable="${variable.toLowerCase()}"
                                        onclick="reportTemplatesInstance.insertVariable('${variable}')" 
                                        title="${this.t('insertVariable')}: ${variable}">
                                    <code>${variable}</code>
                                    <i class="fas fa-copy"></i>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    filterVariables(event) {
        const searchQuery = event.target.value.toLowerCase();
        const content = document.getElementById('variables-content');
        if (!content) return;

        const categories = content.querySelectorAll('.variable-category');
        categories.forEach(category => {
            const buttons = category.querySelectorAll('.variable-btn');
            let hasVisible = false;
            
            buttons.forEach(btn => {
                const variable = btn.getAttribute('data-variable') || '';
                if (variable.includes(searchQuery)) {
                    btn.style.display = 'flex';
                    hasVisible = true;
                } else {
                    btn.style.display = 'none';
                }
            });
            
            category.style.display = hasVisible ? 'block' : 'none';
        });
    }

    previewCurrentTemplate() {
        const nameEl = document.getElementById('template-name');
        const typeEl = document.getElementById('template-type');
        const dataSourceEl = document.getElementById('template-source');
        const descriptionEl = document.getElementById('template-description');
        const contentEl = document.getElementById('template-content');
        
        if (!nameEl || !typeEl || !dataSourceEl || !descriptionEl) return;
        
        const template = {
            name: nameEl.value || 'Untitled Template',
            type: typeEl.value,
            dataSource: dataSourceEl.value,
            description: descriptionEl.value || '',
            content: contentEl ? contentEl.value : (this.selectedTemplate?.content || '')
        };
        
        const previewWindow = window.open('', '_blank');
        previewWindow.document.write(this.generatePreview(template));
        previewWindow.document.close();
    }

    duplicateTemplate() {
        const nameEl = document.getElementById('template-name');
        if (nameEl) {
            nameEl.value = (nameEl.value || 'Untitled Template') + ' (Copy)';
        }
    }

    exportTemplate(id) {
        const template = this.templates.find(t => t.id === id);
        if (!template) return;
        
        const dataStr = JSON.stringify(template, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${template.name || 'template'}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    renderPreviewModal() {
        return `
            <div id="preview-modal" class="preview-modal-overlay" style="display: none;" onclick="if(event.target === this) reportTemplatesInstance.closePreviewModal()">
                <div class="preview-modal-content" onclick="event.stopPropagation()">
                    <div class="preview-modal-header">
                        <h3>
                            <i class="fas fa-eye"></i> Live Preview
                        </h3>
                        <div class="preview-modal-actions">
                            <button class="btn btn-sm btn-secondary" onclick="reportTemplatesInstance.updatePreviewModal()" title="Refresh Preview">
                                <i class="fas fa-sync-alt"></i> Refresh
                            </button>
                            <button class="btn btn-sm btn-secondary" onclick="reportTemplatesInstance.closePreviewModal()" title="Close">
                                <i class="fas fa-times"></i> Close
                            </button>
                        </div>
                    </div>
                    <div class="preview-modal-body" id="preview-modal-content">
                        <!-- Preview content will be inserted here -->
                    </div>
                </div>
            </div>
        `;
    }

    openPreviewModal() {
        const modal = document.getElementById('preview-modal');
        if (!modal) return;
        
        // Generate preview content
        const nameEl = document.getElementById('template-name');
        const typeEl = document.getElementById('template-type');
        const dataSourceEl = document.getElementById('template-source');
        const descriptionEl = document.getElementById('template-description');
        const contentEl = document.getElementById('template-content');
        
        if (!nameEl || !typeEl || !dataSourceEl || !descriptionEl) return;
        
        const template = {
            name: nameEl.value || 'Untitled Template',
            type: typeEl.value,
            dataSource: dataSourceEl.value,
            description: descriptionEl.value || '',
            content: contentEl ? contentEl.value : (this.selectedTemplate?.content || '')
        };
        
        if (template.type === 'docx') {
            const docxPreview = this.renderDOCXPreview(template);
            const modalContent = document.getElementById('preview-modal-content');
            if (modalContent) {
                modalContent.innerHTML = docxPreview;
            }
        } else {
            const previewContent = this.generatePreview(template);
            const modalContent = document.getElementById('preview-modal-content');
            if (modalContent) {
                modalContent.innerHTML = previewContent;
            }
        }
        
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    closePreviewModal() {
        const modal = document.getElementById('preview-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    updatePreviewModal() {
        const modalContent = document.getElementById('preview-modal-content');
        if (!modalContent) return;
        
        // Regenerate preview
        const nameEl = document.getElementById('template-name');
        const typeEl = document.getElementById('template-type');
        const dataSourceEl = document.getElementById('template-source');
        const descriptionEl = document.getElementById('template-description');
        const contentEl = document.getElementById('template-content');
        
        if (!nameEl || !typeEl || !dataSourceEl || !descriptionEl) return;
        
        const template = {
            name: nameEl.value || 'Untitled Template',
            type: typeEl.value,
            dataSource: dataSourceEl.value,
            description: descriptionEl.value || '',
            content: contentEl ? contentEl.value : (this.selectedTemplate?.content || '')
        };
        
        if (template.type === 'docx') {
            const docxPreview = this.renderDOCXPreview(template);
            modalContent.innerHTML = docxPreview;
        } else {
            const previewContent = this.generatePreview(template);
            modalContent.innerHTML = previewContent;
        }
    }

    renderCodeEditor(template) {
        const isDocx = template.type === 'docx';
        
        if (isDocx) {
            // Check if we have a file - check both template.content and this.selectedTemplate.content
            const content = this.selectedTemplate?.content || template.content;
            
            // More flexible check for base64 data URLs
            const hasFile = content && (
                content.startsWith('data:application/vnd.openxmlformats-officedocument.wordprocessingml.document') ||
                content.startsWith('data:application/octet-stream') ||
                (content.startsWith('data:') && content.includes('base64') && content.length > 1000) // Any data URL with base64 that's large
            );
            
            // Debug log
            console.log('renderCodeEditor - DOCX file check:', {
                hasContent: !!content,
                contentLength: content?.length || 0,
                startsWithData: content?.startsWith('data:') || false,
                hasBase64: content?.includes('base64') || false,
                hasFile: hasFile
            });
            return `
                <div class="file-upload-section">
                    <input type="file" id="docx-file-input" accept=".docx" style="display: none;" onchange="if(window.reportTemplatesInstance) { window.reportTemplatesInstance.handleDocxUpload(event); }">
                    <div class="file-upload-area" id="docx-upload-area" onclick="const input = document.getElementById('docx-file-input'); if(input) input.click();">
                        ${hasFile ? `
                            <div class="file-uploaded">
                                <i class="fas fa-file-word" style="font-size: 3rem; color: #0078d4; margin-bottom: 1rem;"></i>
                                <p><strong>DOCX file uploaded</strong></p>
                                <p class="text-muted">Click to replace with a new file</p>
                            </div>
                        ` : `
                            <div class="file-upload-placeholder">
                                <i class="fas fa-cloud-upload-alt" style="font-size: 3rem; color: #6c757d; margin-bottom: 1rem;"></i>
                                <p><strong>Upload DOCX Template</strong></p>
                                <p class="text-muted">Click here or drag and drop a .docx file</p>
                                <p class="text-muted" style="font-size: 0.85rem; margin-top: 0.5rem;">Use placeholders like {{cluster.name}} in your DOCX file. Switch to Variables tab to see all available variables.</p>
                            </div>
                        `}
                    </div>
                    ${hasFile ? `
                        <div style="margin-top: 1rem; text-align: center;">
                            <button class="btn btn-sm btn-danger" onclick="reportTemplatesInstance.removeDocxFile()">
                                <i class="fas fa-trash"></i> Remove File
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        } else {
            // Show code editor for HTML templates
            // Note: Header is already rendered in the toolbar above, so we just return the textarea
            return `
                <textarea class="code-textarea" id="template-content" placeholder="Enter your template content here...">${template.content || ''}</textarea>
            `;
        }
    }

    renderAvailableVariablesPanel() {
        const variables = this.getAvailableDOCXVariables();
        
        return `
            <div class="variables-panel" style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 1rem; max-height: calc(100vh - 200px); overflow-y: auto;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 2px solid #0078d4;">
                    <h4 style="margin: 0; color: #0078d4;">
                        <i class="fas fa-list"></i> Available Variables
                    </h4>
                </div>
                
                ${Object.entries(variables).map(([category, items]) => `
                    <div class="variable-category" style="margin-bottom: 1.5rem;">
                        <h5 style="margin: 0 0 0.75rem 0; color: #495057; font-size: 0.95rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas ${this.getCategoryIcon(category)}"></i> ${category}
                        </h5>
                        <div class="variable-list" style="display: flex; flex-direction: column; gap: 0.5rem;">
                            ${items.map(item => `
                                <div class="variable-item" style="background: white; border: 1px solid #dee2e6; border-radius: 4px; padding: 0.75rem; cursor: pointer; transition: all 0.2s;" 
                                     onclick="reportTemplatesInstance.copyVariableToClipboard('${item.example.replace(/'/g, "\\'")}')"
                                     onmouseover="this.style.borderColor='#0078d4'; this.style.boxShadow='0 2px 4px rgba(0,120,212,0.1)'"
                                     onmouseout="this.style.borderColor='#dee2e6'; this.style.boxShadow='none'">
                                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.25rem;">
                                        <code style="color: #0078d4; font-weight: 600; font-size: 0.85rem;">${item.example}</code>
                                        <i class="fas fa-copy" style="color: #6c757d; font-size: 0.75rem;"></i>
                                    </div>
                                    ${item.description ? `<div style="font-size: 0.8rem; color: #6c757d;">${item.description}</div>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
                
                <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 2px solid #dee2e6;">
                    <h5 style="margin: 0 0 0.75rem 0; color: #495057; font-size: 0.95rem; font-weight: 600;">
                        <i class="fas fa-code"></i> Template Syntax
                    </h5>
                    <div style="background: white; border: 1px solid #dee2e6; border-radius: 4px; padding: 0.75rem; font-size: 0.85rem;">
                        <div style="margin-bottom: 0.5rem;"><strong>Placeholders:</strong> <code>{{variable}}</code></div>
                        <div style="margin-bottom: 0.5rem;"><strong>Conditionals:</strong> <code>{{#if condition}}...{{else}}...{{/if}}</code></div>
                        <div><strong>Loops:</strong> <code>{{#each array}}...{{/each}}</code></div>
                    </div>
                </div>
            </div>
        `;
    }

    getCategoryIcon(category) {
        const icons = {
            'Report': 'fa-calendar-alt',
            'Cluster': 'fa-server',
            'Host': 'fa-desktop',
            'VM': 'fa-cube',
            'Storage': 'fa-hdd',
            'Network': 'fa-network-wired'
        };
        return icons[category] || 'fa-tag';
    }

    getAvailableDOCXVariables() {
        return {
            'Report': [
                { example: '{{report.date}}', description: 'Report generation date' },
                { example: '{{report.time}}', description: 'Report generation time' },
                { example: '{{report.author}}', description: 'Report author' },
                { example: '{{company.name}}', description: 'Company name' }
            ],
            'Cluster': [
                { example: '{{cluster.name}}', description: 'Cluster name' },
                { example: '{{cluster.nodes}}', description: 'Number of cluster nodes (total)' },
                { example: '{{cluster.onlineNodes}}', description: 'Number of online cluster nodes' },
                { example: '{{cluster.health}}', description: 'Cluster health status' },
                { example: '{{cluster.domain}}', description: 'Cluster domain' },
                { example: '{{cluster.totalVMs}}', description: 'Total VMs in cluster' },
                { example: '{{cluster.runningVMs}}', description: 'Running VMs count' },
                { example: '{{cluster.totalMemory}}', description: 'Total cluster memory' },
                { example: '{{cluster.usedMemory}}', description: 'Used cluster memory' },
                { example: '{{cluster.memoryPercent}}', description: 'Memory usage percentage' },
                { example: '{{cluster.totalStorage}}', description: 'Total storage capacity' },
                { example: '{{cluster.usedStorage}}', description: 'Used storage' },
                { example: '{{cluster.storagePercent}}', description: 'Storage usage percentage' },
                { example: '{{cluster.totalCSVStorage}}', description: 'Total CSV storage' },
                { example: '{{cluster.usedCSVStorage}}', description: 'Used CSV storage' },
                { example: '{{cluster.csvPercent}}', description: 'CSV usage percentage' },
                { example: '{{cluster.totalProcessors}}', description: 'Total logical processors' },
                { example: '{{cluster.totalVProc}}', description: 'Total virtual processors' },
                { example: '{{cluster.vpLpRatio}}', description: 'vP/LP ratio' },
                { example: '{{cluster.vmDensity}}', description: 'VM density (VMs per host)' },
                { example: '{{cluster.quorumType}}', description: 'Quorum type' },
                { example: '{{cluster.quorumDiskName}}', description: 'Quorum disk name' },
                { example: '{{cluster.csvCount}}', description: 'Number of CSV volumes' },
                { example: '{{cluster.quorumDiskCount}}', description: 'Number of quorum disks' },
                { example: '{{cluster.storageSpacesCount}}', description: 'Total storage spaces (quorum disks + CSV volumes)' },
                { example: '{{cluster.errorCount}}', description: 'Number of cluster errors' }
            ],
            'Host': [
                { example: '{{host.name}}', description: 'Host name' },
                { example: '{{host.osVersion}}', description: 'OS version' },
                { example: '{{host.osProductName}}', description: 'OS product name' },
                { example: '{{host.state}}', description: 'Host state' },
                { example: '{{host.domain}}', description: 'Host domain' },
                { example: '{{host.totalMemory}}', description: 'Total memory' },
                { example: '{{host.usedMemory}}', description: 'Used memory' },
                { example: '{{host.freeMemory}}', description: 'Free memory' },
                { example: '{{host.freeMemoryPercent}}', description: 'Free memory percentage' },
                { example: '{{host.totalVm}}', description: 'Total VMs on host' },
                { example: '{{host.runningVm}}', description: 'Running VMs count' },
                { example: '{{host.logicalProcessor}}', description: 'Logical processors' },
                { example: '{{host.processor.name}}', description: 'Processor name' },
                { example: '{{host.processor.cores}}', description: 'Processor cores' }
            ],
            'VM': [
                { example: '{{vm.name}}', description: 'VM name' },
                { example: '{{vm.state}}', description: 'VM state (Running, Off, etc.)' },
                { example: '{{vm.host}}', description: 'Host name' },
                { example: '{{vm.vCPU}}', description: 'Number of vCPUs' },
                { example: '{{vm.memory.startup}}', description: 'Startup memory' },
                { example: '{{vm.uptime}}', description: 'VM uptime' },
                { example: '{{vm.generation}}', description: 'VM generation' }
            ],
            'Storage': [
                { example: '{{disk.name}}', description: 'Disk name' },
                { example: '{{disk.size}}', description: 'Disk size' },
                { example: '{{volume.name}}', description: 'Volume name' },
                { example: '{{volume.driveLetter}}', description: 'Drive letter' },
                { example: '{{csv.name}}', description: 'CSV name' },
                { example: '{{csv.alias}}', description: 'CSV alias' },
                { example: '{{csv.id}}', description: 'CSV ID (GUID)' },
                { example: '{{csv.path}}', description: 'CSV path' },
                { example: '{{csv.size}}', description: 'CSV total size' },
                { example: '{{csv.used}}', description: 'CSV used space' },
                { example: '{{csv.free}}', description: 'CSV free space' },
                { example: '{{csv.usedPercent}}', description: 'CSV used percentage' },
                { example: '{{csv.freePercent}}', description: 'CSV free percentage' },
                { example: '{{csv.state}}', description: 'CSV state' },
                { example: '{{csv.ownerNode}}', description: 'CSV owner node' },
                { example: '{{csv.fileSystem}}', description: 'CSV file system' },
                { example: '{{quorumDisk.name}}', description: 'Quorum disk name' },
                { example: '{{quorumDisk.id}}', description: 'Quorum disk ID (GUID)' },
                { example: '{{quorumDisk.path}}', description: 'Quorum disk path' },
                { example: '{{quorumDisk.size}}', description: 'Quorum disk total size' },
                { example: '{{quorumDisk.allocated}}', description: 'Quorum disk allocated/used space' },
                { example: '{{quorumDisk.free}}', description: 'Quorum disk free space' },
                { example: '{{quorumDisk.allocatedPercent}}', description: 'Quorum disk allocated percentage' },
                { example: '{{quorumDisk.freePercent}}', description: 'Quorum disk free percentage' },
                { example: '{{quorumDisk.state}}', description: 'Quorum disk state' },
                { example: '{{quorumDisk.ownerNode}}', description: 'Quorum disk owner node' },
                { example: '{{quorumDisk.fileSystem}}', description: 'Quorum disk file system' },
                { example: '{{quorumDisk.resourceType}}', description: 'Quorum disk resource type' }
            ],
            'Network': [
                { example: '{{adapter.name}}', description: 'Network adapter name' },
                { example: '{{adapter.interfaceName}}', description: 'Interface name/alias' },
                { example: '{{adapter.interfaceDescription}}', description: 'Interface description' },
                { example: '{{adapter.status}}', description: 'Adapter status (Up/Down)' },
                { example: '{{adapter.linkSpeed}}', description: 'Link speed' },
                { example: '{{adapter.macAddress}}', description: 'MAC address' },
                { example: '{{adapter.mtu}}', description: 'MTU size' },
                { example: '{{adapter.ipAddress}}', description: 'IP address' },
                { example: '{{adapter.subnetMask}}', description: 'Subnet mask' },
                { example: '{{adapter.defaultGateway}}', description: 'Default gateway' },
                { example: '{{adapter.dnsServers}}', description: 'DNS servers' },
                { example: '{{adapter.dhcpEnabled}}', description: 'DHCP enabled (Yes/No)' },
                { example: '{{adapter.vlanId}}', description: 'VLAN ID' },
                { example: '{{adapter.vlanMode}}', description: 'VLAN mode (Access/Trunk/Untagged)' },
                { example: '{{adapter.isVirtual}}', description: 'Is virtual adapter' },
                { example: '{{adapter.virtualSwitch}}', description: 'Associated virtual switch name' },
                { example: '{{adapter.interfaceDescription}}', description: 'Interface description' },
                { example: '{{adapter.isTeamed}}', description: 'Is part of NIC team (Yes/No)' },
                { example: '{{adapter.teamName}}', description: 'NIC team name' },
                { example: '{{adapter.teamLoadBalancingAlgorithm}}', description: 'Team load balancing algorithm' },
                { example: '{{adapter.teamTeamingMode}}', description: 'Team teaming mode (SwitchIndependent/SwitchDependent)' },
                { example: '{{adapter.teamStatus}}', description: 'Team status' },
                { example: '{{vswitch.name}}', description: 'Virtual switch name' },
                { example: '{{vswitch.switchType}}', description: 'Switch type (External/Internal/Private)' },
                { example: '{{vswitch.iovEnabled}}', description: 'SR-IOV enabled' },
                { example: '{{vswitch.allowManagementOS}}', description: 'Management OS allowed' },
                { example: '{{vswitch.notes}}', description: 'Switch notes' },
                { example: '{{vswitch.setEnabled}}', description: 'SET (Switch Embedded Teaming) enabled' },
                { example: '{{vswitch.setLoadBalancingAlgorithm}}', description: 'SET load balancing algorithm' },
                { example: '{{adapter.isSET}}', description: 'Is part of SET team (Yes/No)' },
                { example: '{{adapter.setSwitchName}}', description: 'SET switch name' },
                { example: '{{adapter.setLoadBalancingAlgorithm}}', description: 'SET load balancing algorithm' }
            ],
            'Windows Updates': [
                { example: '{{update.kbNumber}}', description: 'KB article number (e.g., KB2267602)' },
                { example: '{{update.title}}', description: 'Update title/name' },
                { example: '{{update.size}}', description: 'Update size (e.g., 2267602 Ko)' },
                { example: '{{update.date}}', description: 'Update release date (yyyy-MM-dd)' },
                { example: '{{update.updateId}}', description: 'Update ID (GUID)' },
                { example: '{{update.hostName}}', description: 'Host name (when used in host loop)' }
            ],
            'Windows Firewall': [
                { example: '{{firewall.profile}}', description: 'Firewall profile name (Domain, Private, Public)' },
                { example: '{{firewall.profileEnabled}}', description: 'Profile enabled status (true/false)' },
                { example: '{{firewall.inboundAction}}', description: 'Default inbound action (Allow, Block, NotConfigured)' },
                { example: '{{firewall.outboundAction}}', description: 'Default outbound action (Allow, Block, NotConfigured)' },
                { example: '{{firewall.hostName}}', description: 'Host name (when used in host loop)' }
            ],
            'Virtual Machines': [
                { example: '{{vm.name}}', description: 'VM name' },
                { example: '{{vm.genVer}}', description: 'Generation and version (e.g., Gen 2 / Ver 10.0)' },
                { example: '{{vm.generation}}', description: 'VM generation (1 or 2)' },
                { example: '{{vm.version}}', description: 'VM version (e.g., 10.0)' },
                { example: '{{vm.state}}', description: 'VM state (Running, Off, Saved, etc.)' },
                { example: '{{vm.uptime}}', description: 'VM uptime (e.g., 5 Days 12:30:45)' },
                { example: '{{vm.owner}}', description: 'VM owner (host name or replica owner)' },
                { example: '{{vm.host}}', description: 'Host name where VM is running' },
                { example: '{{vm.vCPU}}', description: 'Number of virtual CPUs' },
                { example: '{{vm.vRAM}}', description: 'Virtual RAM (e.g., 4 GB)' },
                { example: '{{vm.memory.startup}}', description: 'Startup memory' },
                { example: '{{vm.memory.minimum}}', description: 'Minimum memory (if dynamic)' },
                { example: '{{vm.memory.maximum}}', description: 'Maximum memory (if dynamic)' },
                { example: '{{vm.checkpoint.exists}}', description: 'Has checkpoints (true/false)' },
                { example: '{{vm.checkpoint.count}}', description: 'Number of checkpoints' },
                { example: '{{vm.replica.state}}', description: 'Replica state (Enabled, Disabled, etc.)' },
                { example: '{{vm.replica.health}}', description: 'Replica health status' },
                { example: '{{vm.replica.mode}}', description: 'Replica mode' },
                { example: '{{vm.replica.owner}}', description: 'Replica owner (if applicable)' },
                { example: '{{#each vm.disks}}', description: 'Loop through VM disks' },
                { example: '{{#each vm.networkAdapters}}', description: 'Loop through VM network adapters' }
            ],
            'VM Network Adapters': [
                { example: '{{adapter.name}}', description: 'Adapter name' },
                { example: '{{adapter.connection}}', description: 'Connection status (Online, Offline, etc.)' },
                { example: '{{adapter.switch}}', description: 'Virtual switch name' },
                { example: '{{adapter.vlan}}', description: 'VLAN ID' },
                { example: '{{adapter.ip}}', description: 'IP addresses (comma-separated)' },
                { example: '{{adapter.macAddress}}', description: 'MAC address' },
                { example: '{{adapter.deviceType}}', description: 'Device type' }
            ],
            'VM Disks': [
                { example: '{{disk.name}}', description: 'Disk name (includes controller info)' },
                { example: '{{disk.path}}', description: 'Disk file path' },
                { example: '{{disk.controller}}', description: 'Controller type (IDE, SCSI)' },
                { example: '{{disk.controllerNumber}}', description: 'Controller number' },
                { example: '{{disk.controllerLocation}}', description: 'Controller location' },
                { example: '{{disk.controllerLocationDisplay}}', description: 'Controller location display (e.g., "0 (0:1)")' },
                { example: '{{disk.currentSize}}', description: 'Current disk size (GB)' },
                { example: '{{disk.maxSize}}', description: 'Maximum disk size (GB)' },
                { example: '{{disk.sizeDisplay}}', description: 'Size display (current / max)' },
                { example: '{{disk.type}}', description: 'Disk type (Fixed, Dynamic, etc.)' },
                { example: '{{disk.format}}', description: 'Disk format (VHD, VHDX)' },
                { example: '{{disk.isDifferencing}}', description: 'Is differencing disk (true/false)' }
            ]
        };
    }

    copyVariableToClipboard(variable) {
        // Copy to clipboard
        navigator.clipboard.writeText(variable).then(() => {
            this.showMessage(`Copied ${variable} to clipboard!`, 'success');
        }).catch(err => {
            console.error('Failed to copy:', err);
            // Fallback: select text
            const textarea = document.createElement('textarea');
            textarea.value = variable;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showMessage(`Copied ${variable} to clipboard!`, 'success');
        });
    }

    getDefaultTemplate(type, dataSource) {
        if (type === 'html' && dataSource === 'fileshare') {
            return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{reportName}} - File Share Audit Report</title>
    <style>
        :root {
            --primary-color: #0078D4; /* Microsoft Blue */
            --secondary-color: #2b579a;
            --accent-color: #00bcf2;
            --text-color: #333333;
            --light-bg: #f4f6f8;
            --border-color: #e1e1e1;
            --success-color: #107c10;
            --warning-color: #ffb900;
            --danger-color: #d13438;
        }
        
        @page {
            size: A4;
            margin: 0;
        }
        
        * {
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.5;
            color: var(--text-color);
            margin: 0;
            padding: 0;
            background-color: #525659; /* Reader background */
            -webkit-print-color-adjust: exact;
        }
        
        .container {
            width: 210mm; /* A4 width */
            margin: 0 auto;
        }
        
        /* Page Layout */
        .page {
            position: relative;
            width: 210mm;
            min-height: 297mm; /* A4 height */
            height: auto;
            padding: 20mm;
            margin: 10mm auto;
            background: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.3);
            overflow: visible;
            page-break-after: always;
        }
        
        .page-break-before {
            page-break-before: always;
            margin-top: 2rem;
        }
        
        @media print {
            body { background: none; }
            .container { width: 100%; margin: 0; }
            .page { 
                width: 100%; 
                height: auto; 
                min-height: 0;
                margin: 0; 
                padding: 15mm; 
                box-shadow: none; 
                page-break-after: always; 
                overflow: visible;
            }
            .page-break-before {
                page-break-before: always;
            }
        }

        /* Typography */
        h1, h2, h3, h4, h5, h6 {
            color: var(--secondary-color);
            margin-top: 0;
        }
        
        h1 { font-size: 2.5rem; font-weight: 300; }
        h2 { font-size: 1.8rem; margin-bottom: 1rem; border-bottom: 2px solid var(--border-color); padding-bottom: 0.5rem; }
        h3 { font-size: 1.2rem; color: var(--primary-color); margin-top: 1.5rem; margin-bottom: 0.8rem; }

        /* Cover Page */
        .cover-page {
            background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
            color: white;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        
        .cover-content {
            padding: 2rem;
        }
        
        .cover-logo { font-size: 4rem; margin-bottom: 2rem; }
        .cover-title { color: white; font-size: 3.5rem; line-height: 1.1; margin-bottom: 1rem; }
        .cover-subtitle { font-size: 1.5rem; opacity: 0.9; font-weight: 300; margin-bottom: 4rem; }
        
        .cover-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
            margin-top: auto;
            border-top: 1px solid rgba(255,255,255,0.3);
            padding-top: 2rem;
        }
        
        .cover-info h3 { color: rgba(255,255,255,0.7); font-size: 0.9rem; text-transform: uppercase; margin: 0 0 0.5rem 0; }
        .cover-info p { margin: 0; font-size: 1.2rem; font-weight: 500; }

        /* Tables */
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 1.5rem;
            font-size: 0.85rem;
        }
        
        th {
            background-color: var(--light-bg);
            color: var(--secondary-color);
            font-weight: 600;
            text-align: left;
            padding: 8px 10px;
            border-bottom: 2px solid var(--border-color);
        }
        
        td {
            padding: 6px 10px;
            border-bottom: 1px solid var(--border-color);
            vertical-align: top;
        }
        
        tr:nth-child(even) { background-color: #fafafa; }

        .label-cell { width: 25%; font-weight: 600; color: #555; background-color: #f8f9fa; }
        .value-cell { color: #333; }

        /* Status Badges */
        .status-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        .status-Ok, .status-True, .status-Up, .status-Healthy, .status-Running, .status-Enabled, .status-Yes { background-color: #dff6dd; color: var(--success-color); }
        .status-Warning, .status-Degraded { background-color: #fff4ce; color: var(--warning-color); }
        .status-Critical, .status-Error, .status-Down, .status-Failed, .status-False, .status-Disabled, .status-No, .status-Stopped { background-color: #fde7e9; color: var(--danger-color); }

        /* Footer */
        .page-footer {
            position: absolute;
            bottom: 15mm;
            left: 20mm;
            right: 20mm;
            border-top: 1px solid var(--border-color);
            padding-top: 10px;
            display: flex;
            justify-content: space-between;
            font-size: 0.8rem;
            color: #888;
        }
        
        .page-number:after { content: counter(page); }
    </style>
    
</head>
<body>
    <div class="container">
        <!-- COVER PAGE -->
        <div class="page cover-page">
            <div class="cover-content">
                <div class="cover-logo">📁</div>
                <h1 class="cover-title">File Share<br>Audit Report</h1>
                <div class="cover-subtitle">Security and Permissions Analysis for {{serverName}}</div>
                
                <div class="cover-info">
                    <div>
                        <h3>Organization</h3>
                        <p>{{company.name}}</p>
                    </div>
                    <div>
                        <h3>Date</h3>
                        <p>{{report.date}}</p>
                    </div>
                    <div>
                        <h3>Auditor</h3>
                        <p>{{report.author}}</p>
                    </div>
                    <div>
                        <h3>Reference</h3>
                        <p>AUDIT-{{serverName}}-FS</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- EXECUTIVE SUMMARY -->
        <div class="page">
            <h2>📊 Executive Summary</h2>
            <p>This comprehensive audit report provides a detailed analysis of the file share infrastructure, focusing on security permissions, access control, and potential vulnerabilities.</p>
            
            <h3>Report Overview</h3>
            <table>
                <tr>
                    <td class="label-cell">Report Name</td>
                    <td><strong>{{reportName}}</strong></td>
                    <td class="label-cell">Server</td>
                    <td>{{serverName}}</td>
                </tr>
                <tr>
                    <td class="label-cell">Folder Path</td>
                    <td>{{folderPath}}</td>
                    <td class="label-cell">Audit Date</td>
                    <td>{{report.date}}</td>
                </tr>
            </table>

            <h3>Summary Statistics</h3>
            <table>
                <thead>
                    <tr><th>Metric</th><th>Value</th><th>Status</th></tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Folders Analyzed</strong></td>
                        <td>{{summary.foldersAnalyzed}}</td>
                        <td><span class="status-badge status-Healthy">Complete</span></td>
                    </tr>
                    <tr>
                        <td><strong>Critical Issues</strong></td>
                        <td>{{summary.criticalIssuesCount}}</td>
                        <td><span class="status-badge status-{{#if summary.criticalIssuesCount}}Critical{{else}}Healthy{{/if}}">{{#if summary.criticalIssuesCount}}Critical{{else}}None{{/if}}</span></td>
                    </tr>
                    <tr>
                        <td><strong>Warning Issues</strong></td>
                        <td>{{summary.warningIssuesCount}}</td>
                        <td><span class="status-badge status-{{#if summary.warningIssuesCount}}Warning{{else}}Healthy{{/if}}">{{#if summary.warningIssuesCount}}Warnings{{else}}None{{/if}}</span></td>
                    </tr>
                </tbody>
            </table>

            <div class="page-footer">
                <span>{{company.name}} Confidential</span>
                <span class="page-number">Page </span>
            </div>
        </div>

        <!-- SHARE ENUMERATION -->
        {{#if shareEnumerationCount}}
        <div class="page">
            <h2>📂 Share Enumeration</h2>
            <p style="font-size: 0.9rem; color: #666; margin-bottom: 1rem;">({{shareEnumerationCount}} {{#if shareEnumerationIsSingular}}share{{else}}shares{{/if}})</p>
            
            <table style="table-layout: fixed; width: 100%;">
                <thead>
                    <tr>
                        <th style="width: 12%; text-align: left; padding: 0.5rem; border-bottom: 2px solid var(--border-color);">Share Name</th>
                        <th style="width: 10%; text-align: left; padding: 0.5rem; border-bottom: 2px solid var(--border-color);">Share Risk</th>
                        <th style="width: 15%; text-align: left; padding: 0.5rem; border-bottom: 2px solid var(--border-color);">UNC Path</th>
                        <th style="width: 15%; text-align: left; padding: 0.5rem; border-bottom: 2px solid var(--border-color);">Local Path</th>
                        <th style="width: 10%; text-align: left; padding: 0.5rem; border-bottom: 2px solid var(--border-color);">Hosting Server</th>
                        <th style="width: 8%; text-align: left; padding: 0.5rem; border-bottom: 2px solid var(--border-color);">Share Type</th>
                        <th style="width: 8%; text-align: left; padding: 0.5rem; border-bottom: 2px solid var(--border-color);">Offline Files</th>
                        <th style="width: 10%; text-align: left; padding: 0.5rem; border-bottom: 2px solid var(--border-color);">SMB Version</th>
                        <th style="width: 6%; text-align: left; padding: 0.5rem; border-bottom: 2px solid var(--border-color);">Encryption</th>
                        <th style="width: 6%; text-align: left; padding: 0.5rem; border-bottom: 2px solid var(--border-color);">Continuous Availability</th>
                        <th style="width: 10%; text-align: left; padding: 0.5rem; border-bottom: 2px solid var(--border-color);">Red Flags</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each shareEnumeration}}
                    <tr style="{{#if share.isCriticalRisk}}background: rgba(239, 68, 68, 0.05);{{else if share.isHighRisk}}background: rgba(245, 158, 11, 0.03);{{/if}}">
                        <td style="padding: 0.5rem; border-bottom: 1px solid var(--border-color); vertical-align: top;">
                            <strong style="color: {{#if share.isHiddenShare}}#f59e0b{{else if share.isAdminShare}}#6366f1{{else}}#333{{/if}};">
                                {{share.shareName}}
                            </strong>
                        </td>
                        <td style="padding: 0.5rem; border-bottom: 1px solid var(--border-color); vertical-align: top;">
                            {{#if share.isCriticalRisk}}
                            <span style="background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 0.25rem 0.5rem; border-radius: 3px; font-size: 0.75rem; font-weight: 600; border: 1px solid rgba(239, 68, 68, 0.4); display: inline-flex; align-items: center; gap: 0.25rem;">
                                <span>🔴</span>
                                <span>Critical</span>
                            </span>
                            {{else if share.isHighRisk}}
                            <span style="background: rgba(245, 158, 11, 0.2); color: #f59e0b; padding: 0.25rem 0.5rem; border-radius: 3px; font-size: 0.75rem; font-weight: 600; border: 1px solid rgba(245, 158, 11, 0.4); display: inline-flex; align-items: center; gap: 0.25rem;">
                                <span>🟠</span>
                                <span>High</span>
                            </span>
                            {{else if share.isMediumRisk}}
                            <span style="background: rgba(234, 179, 8, 0.2); color: #eab308; padding: 0.25rem 0.5rem; border-radius: 3px; font-size: 0.75rem; font-weight: 600; border: 1px solid rgba(234, 179, 8, 0.4); display: inline-flex; align-items: center; gap: 0.25rem;">
                                <span>🟡</span>
                                <span>Medium</span>
                            </span>
                            {{else}}
                            <span style="background: rgba(16, 185, 129, 0.2); color: #10b981; padding: 0.25rem 0.5rem; border-radius: 3px; font-size: 0.75rem; font-weight: 600; border: 1px solid rgba(16, 185, 129, 0.4); display: inline-flex; align-items: center; gap: 0.25rem;">
                                <span>🟢</span>
                                <span>Low</span>
                            </span>
                            {{/if}}
                        </td>
                        <td style="padding: 0.5rem; border-bottom: 1px solid var(--border-color); vertical-align: top; font-family: 'Consolas', 'Monaco', monospace; font-size: 0.8125rem; color: #666; word-break: break-all;">{{share.uncPath}}</td>
                        <td style="padding: 0.5rem; border-bottom: 1px solid var(--border-color); vertical-align: top; font-family: 'Consolas', 'Monaco', monospace; font-size: 0.8125rem; color: #666; word-break: break-all;">{{share.localPath}}</td>
                        <td style="padding: 0.5rem; border-bottom: 1px solid var(--border-color); vertical-align: top;">{{share.hostingServer}}</td>
                        <td style="padding: 0.5rem; border-bottom: 1px solid var(--border-color); vertical-align: top;">
                            <span style="color: {{#if share.isHiddenShare}}#f59e0b{{else if share.isAdminShare}}#6366f1{{else}}#666{{/if}};">
                                {{share.shareType}}
                            </span>
                        </td>
                        <td style="padding: 0.5rem; border-bottom: 1px solid var(--border-color); vertical-align: top;">
                            <span style="color: {{#if share.offlineFilesEnabled}}#10b981{{else}}#666{{/if}};">
                                {{#if share.offlineFilesEnabled}}Yes{{else}}No{{/if}}
                            </span>
                        </td>
                        <td style="padding: 0.5rem; border-bottom: 1px solid var(--border-color); vertical-align: top;">
                            <span style="color: {{#if share.hasSMB1}}#ef4444{{else if share.smbVersion}}#10b981{{else}}#666{{/if}};">
                                {{share.smbVersion}}
                            </span>
                        </td>
                        <td style="padding: 0.5rem; border-bottom: 1px solid var(--border-color); vertical-align: top;">
                            <span style="color: {{#if share.encryptData}}#10b981{{else}}#f59e0b{{/if}};">
                                {{#if share.encryptData}}Yes{{else}}No{{/if}}
                            </span>
                        </td>
                        <td style="padding: 0.5rem; border-bottom: 1px solid var(--border-color); vertical-align: top;">
                            <span style="color: {{#if share.continuousAvailability}}#10b981{{else}}#666{{/if}};">
                                {{#if share.continuousAvailability}}Yes{{else}}No{{/if}}
                            </span>
                        </td>
                        <td style="padding: 0.5rem; border-bottom: 1px solid var(--border-color); vertical-align: top;">
                            {{#if share.hasRedFlags}}
                            <span style="background: rgba(239, 68, 68, 0.1); color: #ef4444; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; border: 1px solid rgba(239, 68, 68, 0.3);">
                                {{share.redFlags.length}}
                            </span>
                            {{else}}
                            <span style="color: #10b981;">None</span>
                            {{/if}}
                        </td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>

            {{#each shareEnumeration}}
            {{#if share.hasRedFlags}}
            <div style="margin-top: 1.5rem; padding: 1rem; background: rgba(239, 68, 68, 0.05); border-left: 4px solid #ef4444; border-radius: 4px;">
                <h4 style="margin: 0 0 0.75rem 0; color: #ef4444; font-size: 0.95rem; font-weight: 600;">
                    Red Flags - {{share.shareName}}
                </h4>
                <ul style="margin: 0; padding-left: 1.5rem; color: #333; font-size: 0.85rem;">
                    {{#each share.redFlags}}
                    <li style="margin-bottom: 0.5rem;">{{redFlag}}</li>
                    {{/each}}
                </ul>
            </div>
            {{/if}}
            {{/each}}

            <div class="page-footer">
                <span>{{company.name}} Confidential</span>
                <span class="page-number">Page </span>
            </div>
        </div>
        {{/if}}

        {{#if groupsWithAccess}}
        {{#if groupsWithAccess.length}}
        <div class="page">
            <h2>👥 Groups with Folder Access</h2>
            <p style="font-size: 0.9rem; color: #666; margin-bottom: 1rem;">({{groupsWithAccessCount}} {{#if groupsWithAccessIsSingular}}group{{else}}groups{{/if}})</p>
            
            <table>
                <thead>
                    <tr>
                        <th style="width: 30%;">Group Name</th>
                        <th style="width: 10%;">Folders</th>
                        <th style="width: 35%;">Rights</th>
                        <th style="width: 25%;">Highest Risk</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each groupsWithAccess}}
                    <tr>
                        <td><strong>{{group.name}}</strong></td>
                        <td>{{group.totalFolders}}</td>
                        <td>{{group.rightsDisplay}}</td>
                        <td>
                            {{#if group.isCriticalRisk}}
                            <span style="color: #ef4444;">🔴 Critical</span>
                            {{else if group.isHighRisk}}
                            <span style="color: #f59e0b;">🟠 High</span>
                            {{else if group.isMediumRisk}}
                            <span style="color: #eab308;">🟡 Medium</span>
                            {{else}}
                            <span style="color: #10b981;">🟢 Low</span>
                            {{/if}}
                        </td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>

            <div class="page-footer">
                <span>{{company.name}} Confidential</span>
                <span class="page-number">Page </span>
            </div>
        </div>
        {{/if}}
        {{/if}}

        {{#if usersWithAccess}}
        {{#if usersWithAccess.length}}
        <div class="page">
            <h2>👤 Users with Folder Access</h2>
            <p style="font-size: 0.9rem; color: #666; margin-bottom: 1rem;">({{usersWithAccessCount}} {{#if usersWithAccessIsSingular}}user{{else}}users{{/if}})</p>
            
            <table>
                <thead>
                    <tr>
                        <th style="width: 30%;">User Name</th>
                        <th style="width: 10%;">Folders</th>
                        <th style="width: 35%;">Rights</th>
                        <th style="width: 25%;">Highest Risk</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each usersWithAccess}}
                    <tr>
                        <td><strong>{{user.name}}</strong></td>
                        <td>{{user.totalFolders}}</td>
                        <td>{{user.rightsDisplay}}</td>
                        <td>
                            {{#if user.isCriticalRisk}}
                            <span style="color: #ef4444;">🔴 Critical</span>
                            {{else if user.isHighRisk}}
                            <span style="color: #f59e0b;">🟠 High</span>
                            {{else if user.isMediumRisk}}
                            <span style="color: #eab308;">🟡 Medium</span>
                            {{else}}
                            <span style="color: #10b981;">🟢 Low</span>
                            {{/if}}
                        </td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>

            <div class="page-footer">
                <span>{{company.name}} Confidential</span>
                <span class="page-number">Page </span>
            </div>
        </div>
        {{/if}}
        {{/if}}

        <!-- FOLDER DETAILS -->
        {{#each folderTree}}
        <div class="page">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid var(--primary-color); padding-bottom:10px; margin-bottom:20px;">
                <h2 style="border:none; margin:0;">📁 {{folder.path}}</h2>
                {{#if folder.criticalIssues}}
                <span class="status-badge status-Critical" style="font-size:1rem; padding:5px 10px;">{{folder.criticalIssues.length}} Critical</span>
                {{else if folder.warningIssues}}
                <span class="status-badge status-Warning" style="font-size:1rem; padding:5px 10px;">{{folder.warningIssues.length}} Warnings</span>
                {{else}}
                <span class="status-badge status-Healthy" style="font-size:1rem; padding:5px 10px;">Healthy</span>
                {{/if}}
            </div>

            <h3>📋 Folder Information</h3>
            <table>
                <tr>
                    <td class="label-cell">Full Path</td>
                    <td class="value-cell" colspan="3"><strong>{{folder.path}}</strong></td>
                </tr>
                <tr>
                    <td class="label-cell">Relative Path</td>
                    <td class="value-cell">{{folder.relativePath}}</td>
                    <td class="label-cell">Folder Name</td>
                    <td class="value-cell">{{folder.name}}</td>
                </tr>
                <tr>
                    <td class="label-cell">File Count</td>
                    <td class="value-cell">{{folder.fileCount}}</td>
                    <td class="label-cell">Total Size</td>
                    <td class="value-cell">{{folder.totalSize}}</td>
                </tr>
                {{#if folder.permissions}}
                <tr>
                    <td class="label-cell">Permissions Count</td>
                    <td class="value-cell">{{folder.permissions.length}}</td>
                    <td class="label-cell">Status</td>
                    <td class="value-cell">
                        {{#if folder.criticalIssues}}
                        <span class="status-badge status-Critical">Has Critical Issues</span>
                        {{else if folder.warningIssues}}
                        <span class="status-badge status-Warning">Has Warnings</span>
                        {{else}}
                        <span class="status-badge status-Healthy">Secure</span>
                        {{/if}}
                    </td>
                </tr>
                {{/if}}
            </table>

            {{#if folder.permissions}}
            <h3>🔐 Permissions</h3>
            <table>
                <thead>
                    <tr>
                        <th style="width: 25%;">Identity</th>
                        <th style="width: 30%;">Rights</th>
                        <th style="width: 12%;">Access Type</th>
                        <th style="width: 10%;">Inherited</th>
                        <th style="width: 13%;">Risk Level</th>
                        <th style="width: 10%;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each folder.permissions}}
                    <tr>
                        <td><strong>{{permission.identityReference}}</strong></td>
                        <td>{{permission.fileSystemRights}}</td>
                        <td>{{permission.accessControlType}}</td>
                        <td><span class="status-badge status-{{permission.isInherited}}">{{#if permission.isInherited}}Yes{{else}}No{{/if}}</span></td>
                        <td><span class="status-badge status-{{permission.riskLevel}}">{{permission.riskLevel}}</span></td>
                        <td>
                            {{#if permission.misconfigurations}}
                            {{#if permission.misconfigurations.length}}
                            <span class="status-badge status-Critical">{{permission.misconfigurations.length}} Issues</span>
                            {{else}}
                            <span class="status-badge status-Healthy">OK</span>
                            {{/if}}
                            {{else}}
                            <span class="status-badge status-Healthy">OK</span>
                            {{/if}}
                        </td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>
            {{/if}}

            {{#if folder.criticalIssues}}
            <h3>⚠️ Critical Issues</h3>
            <table>
                <thead>
                    <tr>
                        <th style="width: 20%;">Type</th>
                        <th style="width: 80%;">Message</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each folder.criticalIssues}}
                    <tr>
                        <td><span class="status-badge status-Critical">{{issue.type}}</span></td>
                        <td>{{issue.message}}</td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>
            {{/if}}

            {{#if folder.warningIssues}}
            <h3>⚠️ Warning Issues</h3>
            <table>
                <thead>
                    <tr>
                        <th style="width: 20%;">Type</th>
                        <th style="width: 80%;">Message</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each folder.warningIssues}}
                    <tr>
                        <td><span class="status-badge status-Warning">{{issue.type}}</span></td>
                        <td>{{issue.message}}</td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>
            {{/if}}

            <div class="page-footer">
                <span>{{folder.path}} Audit Details</span>
                <span class="page-number">Page </span>
            </div>
        </div>
        {{/each}}

        <!-- CLOSING PAGE -->
        <div class="page" style="display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
            <div style="font-size: 5rem; margin-bottom: 2rem;">✅</div>
            <h1 style="color: var(--primary-color);">Audit Complete</h1>
            <p style="font-size: 1.2rem; color: #666; max-width: 600px;">
                The file share audit for <strong>{{serverName}}</strong> has been successfully generated.
            </p>
            
            <div style="margin-top: 4rem; width: 100%; border-top: 1px solid #eee; padding-top: 2rem;">
                <p><strong>{{company.name}}</strong></p>
                <p style="color: #888; font-size: 0.9rem;">Generated by Dhia Control Tower</p>
            </div>
            
            <div class="page-footer">
                <span>End of Report</span>
                <span>{{report.date}}</span>
            </div>
        </div>
    </div>
</body>

</html>`;
        }
        
        if (type === 'html' && dataSource === 'hyperv') {
            return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{cluster.name}} - Infrastructure Report</title>
    <style>
        :root {
            --primary-color: #0078D4; /* Microsoft Blue */
            --secondary-color: #2b579a;
            --accent-color: #00bcf2;
            --text-color: #333333;
            --light-bg: #f4f6f8;
            --border-color: #e1e1e1;
            --success-color: #107c10;
            --warning-color: #ffb900;
            --danger-color: #d13438;
        }
        
        @page {
            size: A4;
            margin: 0;
        }
        
        * {
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.5;
            color: var(--text-color);
            margin: 0;
            padding: 0;
            background-color: #525659; /* Reader background */
            -webkit-print-color-adjust: exact;
        }
        
        .container {
            width: 210mm; /* A4 width */
            margin: 0 auto;
        }
        
        /* Page Layout */
        .page {
            position: relative;
            width: 210mm;
            min-height: 297mm; /* A4 height */
            height: auto;
            padding: 20mm;
            margin: 10mm auto;
            background: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.3);
            overflow: visible;
            page-break-after: always;
        }
        
        .page-break-before {
            page-break-before: always;
            margin-top: 2rem;
        }
        
        @media print {
            body { background: none; }
            .container { width: 100%; margin: 0; }
            .page { 
                width: 100%; 
                height: auto; 
                min-height: 0;
                margin: 0; 
                padding: 15mm; 
                box-shadow: none; 
                page-break-after: always; 
                overflow: visible;
            }
            .page-break-before {
                page-break-before: always;
            }
        }

        /* Typography */
        h1, h2, h3, h4, h5, h6 {
            color: var(--secondary-color);
            margin-top: 0;
        }
        
        h1 { font-size: 2.5rem; font-weight: 300; }
        h2 { font-size: 1.8rem; margin-bottom: 1rem; border-bottom: 2px solid var(--border-color); padding-bottom: 0.5rem; }
        h3 { font-size: 1.2rem; color: var(--primary-color); margin-top: 1.5rem; margin-bottom: 0.8rem; }

        /* Cover Page */
        .cover-page {
            background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
            color: white;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        
        .cover-content {
            padding: 2rem;
        }
        
        .cover-logo { font-size: 4rem; margin-bottom: 2rem; }
        .cover-title { color: white; font-size: 3.5rem; line-height: 1.1; margin-bottom: 1rem; }
        .cover-subtitle { font-size: 1.5rem; opacity: 0.9; font-weight: 300; margin-bottom: 4rem; }
        
        .cover-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
            margin-top: auto;
            border-top: 1px solid rgba(255,255,255,0.3);
            padding-top: 2rem;
        }
        
        .cover-info h3 { color: rgba(255,255,255,0.7); font-size: 0.9rem; text-transform: uppercase; margin: 0 0 0.5rem 0; }
        .cover-info p { margin: 0; font-size: 1.2rem; font-weight: 500; }

        /* Tables */
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 1.5rem;
            font-size: 0.85rem;
        }
        
        th {
            background-color: var(--light-bg);
            color: var(--secondary-color);
            font-weight: 600;
            text-align: left;
            padding: 8px 10px;
            border-bottom: 2px solid var(--border-color);
        }
        
        td {
            padding: 6px 10px;
            border-bottom: 1px solid var(--border-color);
            vertical-align: top;
        }
        
        tr:nth-child(even) { background-color: #fafafa; }

        .label-cell { width: 25%; font-weight: 600; color: #555; background-color: #f8f9fa; }
        .value-cell { color: #333; }

        /* Status Badges */
        .status-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        .status-Ok, .status-True, .status-Up, .status-Healthy, .status-Running, .status-Enabled, .status-Yes { background-color: #dff6dd; color: var(--success-color); }
        .status-Warning, .status-Degraded { background-color: #fff4ce; color: var(--warning-color); }
        .status-Critical, .status-Error, .status-Down, .status-Failed, .status-False, .status-Disabled, .status-No, .status-Stopped { background-color: #fde7e9; color: var(--danger-color); }

        /* Footer */
        .page-footer {
            position: absolute;
            bottom: 15mm;
            left: 20mm;
            right: 20mm;
            border-top: 1px solid var(--border-color);
            padding-top: 10px;
            display: flex;
            justify-content: space-between;
            font-size: 0.8rem;
            color: #888;
        }
        
        .page-number:after { content: counter(page); }
    </style>
    
</head>
<body>
    <div class="container">
        <!-- COVER PAGE -->
        <div class="page cover-page">
            <div class="cover-content">
                <div class="cover-logo">📊</div>
                <h1 class="cover-title">Infrastructure<br>Audit Report</h1>
                <div class="cover-subtitle">Hyper-V Environment Analysis for {{cluster.name}}</div>
                
                <div class="cover-info">
                    <div>
                        <h3>Organization</h3>
                        <p>{{company.name}}</p>
                    </div>
                    <div>
                        <h3>Date</h3>
                        <p>{{report.date}}</p>
                    </div>
                    <div>
                        <h3>Auditor</h3>
                        <p>{{report.author}}</p>
                    </div>
                    <div>
                        <h3>Reference</h3>
                        <p>AUDIT-{{cluster.nodes}}-HV</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- EXECUTIVE SUMMARY -->
        <div class="page">
            <h2>📊 Executive Summary</h2>
            <p>This comprehensive audit report provides a detailed analysis of the Hyper-V infrastructure, focusing on configuration consistency, resource utilization, and health status.</p>
            
            <h3>Cluster Overview</h3>
            <table>
                <tr>
                    <td class="label-cell">Cluster Name</td>
                    <td><strong>{{cluster.name}}</strong></td>
                    <td class="label-cell">Health Status</td>
                    <td><span class="status-badge status-Healthy">{{cluster.health}}</span></td>
                </tr>
                <tr>
                    <td class="label-cell">Domain</td>
                    <td>{{cluster.domain}}</td>
                    <td class="label-cell">Nodes</td>
                    <td>{{cluster.nodes}}</td>
                </tr>
                <tr>
                    <td class="label-cell">Total VMs</td>
                    <td><strong>{{cluster.totalVMs}}</strong> ({{cluster.runningVMs}} Running)</td>
                    <td class="label-cell">VM Density</td>
                    <td>{{cluster.vmDensity}} VMs/Node</td>
                </tr>
            </table>

            <h3>Resource Utilization</h3>
            <table>
                <thead>
                    <tr><th>Resource</th><th>Total</th><th>Used</th><th>Utilization</th></tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Compute</strong></td>
                        <td>{{cluster.totalProcessors}} Logical Processors</td>
                        <td>{{cluster.totalVProc}} vCPUs</td>
                        <td>{{cluster.vpLpRatio}} Ratio</td>
                    </tr>
                    <tr>
                        <td><strong>Memory</strong></td>
                        <td>{{cluster.totalMemory}}</td>
                        <td>{{cluster.usedMemory}}</td>
                        <td>{{cluster.memoryPercent}}%</td>
                    </tr>
                    <tr>
                        <td><strong>Storage (CSV)</strong></td>
                        <td>{{cluster.totalCSVStorage}}</td>
                        <td>{{cluster.usedCSVStorage}}</td>
                        <td>{{cluster.csvPercent}}%</td>
                    </tr>
                </tbody>
            </table>

            <h3>Hyper-V Hosts</h3>
            <table>
                <thead>
                    <tr>
                        <th>Host Name</th>
                        <th>State</th>
                        <th>Uptime</th>
                        <th>Memory</th>
                        <th>CPU</th>
                        <th>VMs</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each hosts}}
                    <tr>
                        <td><strong>{{host.name}}</strong></td>
                        <td><span class="status-badge status-{{host.state}}">{{host.state}}</span></td>
                        <td>{{host.uptime}}</td>
                        <td>{{host.usedMemory}} / {{host.totalMemory}} ({{host.freeMemoryPercent}}% Free)</td>
                        <td>{{host.processor.model}}</td>
                        <td>{{host.runningVm}} / {{host.totalVm}}</td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>

            {{#if quorumDisks}}
            <h3>Quorum Disk</h3>
            <table>
                <thead>
                    <tr>
                        <th style="width: 20%;">Resource Name</th>
                        <th style="width: 25%;">Path</th>
                        <th style="width: 10%;">Total Size</th>
                        <th style="width: 10%;">Used</th>
                        <th style="width: 15%;">Free</th>
                        <th style="width: 10%;">State</th>
                        <th style="width: 10%;">Owner Node</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each quorumDisks}}
                    <tr>
                        <td style="vertical-align: top;">
                            <strong>{{quorumDisk.name}}</strong><br>
                            <span style="font-size:0.8em; color:#666">{{quorumDisk.resourceType}}</span>
                        </td>
                        <td style="vertical-align: top;">
                            {{quorumDisk.path}}<br>
                            <span style="font-size:0.8em; color:#666">{{quorumDisk.diskFileSystem}}</span>
                        </td>
                        <td>{{quorumDisk.size}}</td>
                        <td>{{quorumDisk.allocated}}</td>
                        <td>{{quorumDisk.free}} ({{quorumDisk.freePercent}}%)</td>
                        <td><span class="status-badge status-{{quorumDisk.diskOperationalStatus}}">{{quorumDisk.diskOperationalStatus}}</span></td>
                        <td>{{quorumDisk.ownerNode}}</td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>
            {{/if}}

            {{#if clusterSharedVolumes}}
            <h3>Cluster Shared Volumes (CSV)</h3>
            <table>
                <thead>
                    <tr>
                        <th style="width: 20%;">CSV Name</th>
                        <th style="width: 25%;">Path</th>
                        <th style="width: 10%;">Total Size</th>
                        <th style="width: 10%;">Used</th>
                        <th style="width: 15%;">Free</th>
                        <th style="width: 10%;">State</th>
                        <th style="width: 10%;">Owner Node</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each csvs}}
                    <tr>
                        <td style="vertical-align: top;">
                            <strong>{{csv.name}}</strong><br>
                            <span style="font-size:0.8em; color:#666">{{csv.fileSystem}}</span>
                        </td>
                        <td style="vertical-align: top;">{{csv.path}}</td>
                        <td>{{csv.size}}</td>
                        <td>{{csv.used}}</td>
                        <td>{{csv.free}} ({{csv.freePercent}}%)</td>
                        <td><span class="status-badge status-{{csv.state}}">{{csv.state}}</span></td>
                        <td>{{csv.ownerNode}}</td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>
            {{/if}}

            <div class="page-footer">
                <span>{{company.name}} Confidential</span>
                <span class="page-number">Page </span>
            </div>
        </div>

        <!-- HOST DETAILS -->
        {{#each hosts}}
        <div class="page">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid var(--primary-color); padding-bottom:10px; margin-bottom:20px;">
                <h2 style="border:none; margin:0;">🖥️ {{host.name}}</h2>
                <span class="status-badge status-{{host.state}}" style="font-size:1rem; padding:5px 10px;">{{host.state}}</span>
            </div>

            // System Information
            <h3>📋 System Information</h3>
            <table>
                <tr>
                    <td class="label-cell">Hardware</td>
                    <td>{{host.hardware.manufacturer}} {{host.hardware.model}} (SN: {{host.hardware.serialNumber}})</td>
                    <td class="label-cell">Uptime</td>
                    <td>{{host.uptime}}</td>
                </tr>
                <tr>
                    <td class="label-cell">Processor</td>
                    <td>{{host.processor.model}}</td>
                    <td class="label-cell">Memory</td>
                    <td>{{host.totalMemory}} ({{host.freeMemory}} Free)</td>
                </tr>
                <tr>
                    <td class="label-cell">Operating System</td>
                    <td>{{host.osName}} ({{host.osEdition}})</td>
                    <td class="label-cell">Version / Build</td>
                    <td>{{host.osVersion}} (Build {{host.osBuild}})</td>
                </tr>
                <tr>
                    <td class="label-cell">License Status</td>
                    <td><span class="status-badge status-{{host.activationStatus}}">{{host.licenseStatus}}</span></td>
                    <td class="label-cell">Product Key</td>
                    <td>{{host.licenseKey}}</td>
                </tr>
                <tr>
                    <td class="label-cell">Logical Procs</td>
                    <td>{{host.logicalProcessor}} ({{host.socketCount}} Sockets)</td>
                    <td class="label-cell">Core Count</td>
                    <td>{{host.processor.cores}} Cores</td>
                </tr>
            </table>

            <!-- Host Physical Disks -->
            {{#if host.disks}}
            <h3>💾 Physical Disks</h3>
            <table>
                <thead>
                    <tr>
                        <th style="width: 25%;">Name / ID</th>
                        <th style="width: 25%;">Status</th>
                        <th style="width: 25%;">Size</th>
                        <th style="width: 25%;">Details</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each host.disks}}
                    <tr>
                        <td style="vertical-align: top;">
                            <strong>Disk {{disk.number}}</strong><br>
                            <span style="font-size:0.8em; color:#666">{{disk.friendlyName}}</span>
                        </td>
                        <td style="vertical-align: top;">
                            <span class="status-badge status-{{disk.operationalStatus}}">{{disk.operationalStatus}}</span>
                        </td>
                        <td style="vertical-align: top;">
                            <div>Total: {{disk.size}}</div>
                            <div style="font-size:0.8em; color:#666">Allocated: {{disk.allocatedSize}}</div>
                            <div style="font-size:0.8em; color:#666">Unallocated: {{disk.unallocatedSize}}</div>
                        </td>
                        <td style="vertical-align: top;">
                            <div style="font-size:0.8em;">Bus: {{disk.busType}}</div>
                            <div style="font-size:0.8em;">Part: {{disk.partitionStyle}}</div>
                        </td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>
            {{/if}}

            <!-- Host Volumes -->
            {{#if host.volumes}}
            <h3>💾 Volumes</h3>
            <table>
                <thead>
                    <tr>
                        <th style="width: 25%;">Label / Drive</th>
                        <th style="width: 35%;">Path</th>
                        <th style="width: 15%;">File System</th>
                        <th style="width: 15%;">Size</th>
                        <th style="width: 10%;">Health</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each host.volumes}}
                    <tr>
                        <td>
                            <strong>{{volume.name}}</strong><br>
                            <span style="font-size:0.8em; color:#666">{{volume.driveLetter}}</span>
                        </td>
                        <td>{{volume.path}}</td>
                        <td>{{volume.fileSystem}}</td>
                        <td>
                            <div>{{volume.size}}</div>
                            <div style="font-size:0.8em; color:#666">Free: {{volume.sizeRemaining}}</div>
                        </td>
                        <td><span class="status-badge status-{{volume.healthStatus}}">{{volume.healthStatus}}</span></td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>
            {{/if}}

            <!-- Server Roles -->
            {{#if host.serverRoles}}
            <h3>🛠️ Server Roles</h3>
            <table>
                <thead>
                    <tr>
                        <th style="width: 40%;">Role Name</th>
                        <th style="width: 40%;">Display Name</th>
                        <th style="width: 20%;">Installed</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each host.serverRoles}}
                    <tr>
                        <td><strong>{{role.name}}</strong></td>
                        <td>{{role.displayName}}</td>
                        <td><span class="status-badge status-{{role.installed}}">{{#if role.installed}}Yes{{else}}No{{/if}}</span></td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>
            {{/if}}

            <!-- Windows Updates -->
            {{#if host.windowsUpdates}}
            <h3>🔄 Windows Updates</h3>
            <table>
                <thead>
                    <tr>
                        <th style="width: 20%;">HotFix ID</th>
                        <th style="width: 20%;">Installed On</th>
                        <th style="width: 40%;">Description</th>
                        <th style="width: 20%;">Installed By</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each host.windowsUpdates}}
                    <tr>
                        <td><strong>{{update.hotFixID}}</strong></td>
                        <td>{{update.installedOn}}</td>
                        <td>{{update.description}}</td>
                        <td>{{update.installedBy}}</td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>
            {{/if}}

            <!-- Network Configuration -->
            <h3>🌐 Host Networks</h3>
            {{#if host.networkAdapters}}
            <table>
                <thead>
                    <tr>
                        <th style="width: 20%;">Name / Interface</th>
                        <th style="width: 15%;">MAC / DHCP</th>
                        <th style="width: 25%;">IP Configuration</th>
                        <th style="width: 10%;">VLAN</th>
                        <th style="width: 10%;">Speed</th>
                        <th style="width: 20%;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each host.networkAdapters}}
                    <tr>
                        <td style="vertical-align: top;">
                            <strong>{{adapter.name}}</strong><br>
                            <span style="font-size:0.8em; color:#666">{{adapter.interfaceDescription}}</span>
                        </td>
                        <td style="vertical-align: top;">
                            <div style="font-family:monospace; font-size:0.9em;">{{adapter.macAddress}}</div>
                            <div style="font-size:0.8em; margin-top:2px;">
                                DHCP: {{#if adapter.dhcpEnabled}}Enabled{{else}}Disabled{{/if}}
                            </div>
                        </td>
                        <td style="vertical-align: top;">
                            {{#if adapter.ipAddress}}
                            <div><strong>IP:</strong> {{adapter.ipAddress}}</div>
                            <div style="font-size:0.8em;">Subnet: {{adapter.subnetMask}}</div>
                            {{#if adapter.defaultGateway}}<div style="font-size:0.8em;">GW: {{adapter.defaultGateway}}</div>{{/if}}
                            {{#if adapter.dnsServers}}<div style="font-size:0.8em; color:#666">DNS: {{adapter.dnsServers}}</div>{{/if}}
                            {{else}}
                            <span style="color:#999; font-style:italic;">No IP Configuration</span>
                            {{/if}}
                        </td>
                        <td>{{adapter.vlanId}}</td>
                        <td>{{adapter.linkSpeed}}</td>
                        <td><span class="status-badge status-{{adapter.status}}">{{adapter.status}}</span></td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>
            {{else}}
            <p>No network adapters found.</p>
            {{/if}}

            <!-- Virtual Switches -->
            {{#if host.virtualSwitches}}
            <h3>🔌 Virtual Switches</h3>
            <table>
                <thead>
                    <tr>
                        <th style="width: 25%;">Name</th>
                        <th style="width: 15%;">Type</th>
                        <th style="width: 30%;">Interface / Teaming</th>
                        <th style="width: 15%;">Settings</th>
                        <th style="width: 15%;">Extensions</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each host.virtualSwitches}}
                    <tr>
                        <td style="vertical-align: top;"><strong>{{vswitch.name}}</strong></td>
                        <td style="vertical-align: top;">{{vswitch.switchType}}</td>
                        <td style="vertical-align: top;">
                            {{vswitch.netAdapterInterfaceDescription}}
                            {{#if vswitch.embeddedTeamingEnabled}}
                            <div style="font-size:0.8em; color:#666; margin-top:4px;">Teaming: Enabled</div>
                            {{/if}}
                            {{#if vswitch.notes}}
                            <div style="font-size:0.8em; color:#666; margin-top:4px;">{{vswitch.notes}}</div>
                            {{/if}}
                        </td>
                        <td style="vertical-align: top;">
                            <div style="font-size:0.8em;">Mgmt OS: {{#if vswitch.allowManagementOS}}Yes{{else}}No{{/if}}</div>
                            <div style="font-size:0.8em;">IOV: {{#if vswitch.iovEnabled}}Enabled{{else}}Disabled{{/if}}</div>
                        </td>
                        <td style="vertical-align: top;">
                            {{#if vswitch.extensions}}
                            {{#each vswitch.extensions}}
                            <div style="font-size:0.8em; margin-bottom:2px;">• {{extension.name}}</div>
                            {{/each}}
                            {{else}}N/A{{/if}}
                        </td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>
            {{/if}}

            <!-- Local Users -->
            {{#if host.localUsers}}
            <h3>👤 Local Users</h3>
            <table>
                <thead>
                    <tr>
                        <th style="width: 25%;">Username</th>
                        <th style="width: 30%;">Full Name</th>
                        <th style="width: 30%;">Description</th>
                        <th style="width: 15%;">Enabled</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each host.localUsers}}
                    <tr>
                        <td><strong>{{user.name}}</strong></td>
                        <td>{{user.fullName}}</td>
                        <td>{{user.description}}</td>
                        <td><span class="status-badge status-{{user.enabled}}">{{#if user.enabled}}Yes{{else}}No{{/if}}</span></td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>
            {{/if}}

            <!-- Local Groups -->
            {{#if host.localGroups}}
            <h3>👥 Local Groups</h3>
            <table>
                <thead>
                    <tr>
                        <th style="width: 30%;">Group Name</th>
                        <th style="width: 40%;">Description</th>
                        <th style="width: 30%;">Members Count</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each host.localGroups}}
                    <tr>
                        <td><strong>{{group.name}}</strong></td>
                        <td>{{group.description}}</td>
                        <td>{{group.members.length}}</td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>
            {{/if}}

            <!-- Multipath I/O -->
            {{#if host.multipathIO.installed}}
            <h3>🔀 Multipath I/O (MPIO)</h3>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                <h4 style="margin-top: 0;">Configuration</h4>
                <table style="margin-bottom: 0;">
                    <tr>
                        <td class="label-cell">Policy</td>
                        <td>
                            {{#if host.multipathIO.dsmName}}
                                {{host.multipathIO.dsmName}}
                            {{else}}
                                N/A
                            {{/if}}
                        </td>
                        <td class="label-cell">Verification</td>
                        <td>
                            {{#if host.multipathIO.timerValues.pathVerificationPeriod}}
                                {{host.multipathIO.timerValues.pathVerificationPeriod}}s
                            {{else}}
                                N/A
                            {{/if}}
                        </td>
                    </tr>
                    <tr>
                        <td class="label-cell">Retry</td>
                        <td>
                            {{#if host.multipathIO.timerValues.retryCount}}
                                {{host.multipathIO.timerValues.retryCount}}
                            {{else}}
                                N/A
                            {{/if}}
                        </td>
                        <td class="label-cell">Interval</td>
                        <td>
                            {{#if host.multipathIO.timerValues.retryInterval}}
                                {{host.multipathIO.timerValues.retryInterval}}s
                            {{else}}
                                N/A
                            {{/if}}
                        </td>
                    </tr>
                </table>
            </div>

            {{#if host.multipathIODisks}}
            <h4>Multipath Disks ({{host.multipathIODisks.length}})</h4>
            <table>
                <thead>
                    <tr>
                        <th style="width: 40%;">Disk Name</th>
                        <th style="width: 15%;">Disk #</th>
                        <th style="width: 15%;">Size</th>
                        <th style="width: 15%;">Paths</th>
                        <th style="width: 15%;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each host.multipathIODisks}}
                    <tr>
                        <td><strong>{{mpioDisk.name}}</strong></td>
                        <td>{{mpioDisk.diskNumber}}</td>
                        <td>{{mpioDisk.formattedSize}}</td>
                        <td>{{mpioDisk.pathCount}}</td>
                        <td>
                            <span class="status-badge status-{{mpioDisk.isMultipathed}}">
                                {{#if mpioDisk.isMultipathed}}MP{{else}}SP{{/if}}
                            </span>
                        </td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>
            {{else}}
            <p>No multipath disks found.</p>
            {{/if}}
            {{/if}}

            <!-- Live Migration -->
            {{#if host.liveMigration.enabled}}
            <h3>🔄 Live Migration</h3>
            <table>
                <tr>
                    <td class="label-cell">Status</td>
                    <td><span class="status-badge status-Enabled">Enabled</span></td>
                    <td class="label-cell">Authentication</td>
                    <td>{{host.liveMigration.authProtocol}}</td>
                </tr>
                <tr>
                    <td class="label-cell">Max Concurrent</td>
                    <td>{{host.liveMigration.maxConcurrent}}</td>
                    <td class="label-cell">Max Storage</td>
                    <td>{{host.liveMigration.maxStorageConcurrent}}</td>
                </tr>
                <tr>
                    <td class="label-cell">Performance</td>
                    <td>{{host.liveMigration.performanceOption}}</td>
                    <td class="label-cell">Use Any Network</td>
                    <td>{{#if host.liveMigration.useAnyNetwork}}Yes{{else}}No{{/if}}</td>
                </tr>
            </table>

            {{#if host.liveMigration.networks}}
            <h4>Migration Networks</h4>
            <table>
                <thead>
                    <tr>
                        <th>Subnet</th>
                        <th>Priority</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each host.liveMigration.networks}}
                    <tr>
                        <td>{{migrationNetwork.subnet}}</td>
                        <td>{{migrationNetwork.priority}}</td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>
            {{/if}}
            {{/if}}

            <div class="page-footer">
                <span>{{host.name}} Audit Details</span>
                <span class="page-number">Page </span>
            </div>
        </div>
        
        <!-- VM Page -->
        {{#if host.vms}}
        <div class="page">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid var(--primary-color); padding-bottom:10px; margin-bottom:20px;">
                <h2 style="border:none; margin:0;">💻 {{host.name}} - Virtual Machines</h2>
                <span class="status-badge status-{{host.state}}" style="font-size:1rem; padding:5px 10px;">{{host.state}}</span>
            </div>
            
            <h3>Virtual Machines Overview ({{host.vms.length}})</h3>
            <table class="compact-table">
                <thead>
                    <tr>
                        <th style="width: 25%;">VM Name / Version</th>
                        <th style="width: 10%;">State</th>
                        <th style="width: 5%;">CPU</th>
                        <th style="width: 15%;">Memory (GB)</th>
                        <th style="width: 15%;">Disk Size</th>
                        <th style="width: 5%;">Gen</th>
                        <th style="width: 10%;">Replica</th>
                        <th style="width: 15%;">Checkpoints</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each host.vms}}
                    <tr>
                        <td style="vertical-align: top;">
                            <strong>{{vm.name}}</strong><br>
                            <span style="font-size:0.8em; color:#666">v{{vm.version}}</span>
                        </td>
                        <td style="vertical-align: top;"><span class="status-badge status-{{vm.state}}">{{vm.state}}</span></td>
                        <td style="vertical-align: top;">{{vm.vCPU}}</td>
                        <td style="vertical-align: top;">
                            <div>{{vm.memory.startup}}</div>
                            {{#if vm.memory.dynamic}}
                            <div style="font-size:0.8em; color:#666">Dyn: {{vm.memory.minimum}}-{{vm.memory.maximum}}</div>
                            {{/if}}
                        </td>
                        <td style="vertical-align: top;">
                             {{vm.totalDiskSize}}
                        </td>
                         <td style="vertical-align: top;">{{vm.generation}}</td>
                         <td style="vertical-align: top;">{{vm.replica.state}}</td>
                         <td style="vertical-align: top;">
                            {{#if vm.checkpoint.exists}}
                            {{vm.checkpoint.count}}
                            {{else}}
                            None
                            {{/if}}
                         </td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>

            <div class="page-footer">
                <span>{{host.name}} VM Audit</span>
                <span class="page-number">Page </span>
            </div>
        </div>
        {{/if}}
        
        {{/each}}

        <!-- CLOSING PAGE -->
        <div class="page" style="display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
            <div style="font-size: 5rem; margin-bottom: 2rem;">✅</div>
            <h1 style="color: var(--primary-color);">Audit Complete</h1>
            <p style="font-size: 1.2rem; color: #666; max-width: 600px;">
                The infrastructure audit for <strong>{{cluster.name}}</strong> has been successfully generated.
            </p>
            
            <div style="margin-top: 4rem; width: 100%; border-top: 1px solid #eee; padding-top: 2rem;">
                <p><strong>{{company.name}}</strong></p>
                <p style="color: #888; font-size: 0.9rem;">Generated by Dhia Control Tower</p>
            </div>
            
            <div class="page-footer">
                <span>End of Report</span>
                <span>{{report.date}}</span>
            </div>
        </div>
    </div>
</body>

</html>`;
        }
        
        return '';
    }

    generatePreview(template) {
        let content = template.content || '';
        
        // Replace variables with sample data
        const sampleData = {
            'cluster.name': 'PROD-CLUSTER-01',
            'cluster.nodes': '3',
            'cluster.health': 'Healthy',
            'cluster.quorum': 'Node and Disk Majority',
            'host.name': 'SRV-HV01',
            'host.os': 'Windows Server 2022',
            'host.memory': '128 GB',
            'host.cpu': 'Intel Xeon Gold 6248R',
            'host.uptime': '45 days',
            'domain.name': 'contoso.com',
            'domain.level': '2016',
            'domain.controllers': '2',
            'domain.sites': '1',
            'user.name': 'John Doe',
            'user.email': 'john.doe@contoso.com',
            'user.lastLogon': '2024-01-15 09:30:00',
            'user.groups': 'Domain Users, IT Staff',
            'report.date': new Date().toLocaleDateString(),
            'report.time': new Date().toLocaleTimeString(),
            'report.author': 'System Administrator',
            'company.name': 'Contoso Corporation'
        };
        
        Object.entries(sampleData).forEach(([key, value]) => {
            content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
        });
        
        return content;
    }

    // Event handlers
    showCreateTemplate() {
        // Initialize with default template
        this.selectedTemplate = {
            name: '',
            type: 'html',
            dataSource: 'hyperv',
            description: '',
            content: this.getDefaultTemplate('html', 'hyperv'),
            author: '',
            version: '1.0'
        };
        this.showEditor = true;
        this.activeTab = 'code';
        this.updateDisplay();
    }

    editTemplate(id) {
        this.selectedTemplate = this.templates.find(t => t.id === id);
        // Ensure selectedTemplate has all required properties including parsed rules
        if (this.selectedTemplate) {
            this.selectedTemplate = {
                name: this.selectedTemplate.name || '',
                type: this.selectedTemplate.type || 'html',
                dataSource: this.selectedTemplate.dataSource || 'hyperv',
                description: this.selectedTemplate.description || '',
                content: this.selectedTemplate.content || '',
                id: this.selectedTemplate.id,
                createdAt: this.selectedTemplate.createdAt,
                updatedAt: this.selectedTemplate.updatedAt,
                author: this.selectedTemplate.author || '',
                version: this.selectedTemplate.version || '',
                category: this.selectedTemplate.category || '',
                tags: this.selectedTemplate.tags || '',
                status: this.selectedTemplate.status || 'draft',
                priority: this.selectedTemplate.priority || 'medium',
                notes: this.selectedTemplate.notes || '',
                purpose: this.selectedTemplate.purpose || ''
            };
        }
        this.showEditor = true;
        this.activeTab = 'code';
        this.updateDisplay();
    }

    closeEditor() {
        this.showEditor = false;
        this.activeTab = 'code';
        this.selectedTemplate = null;
        this.updateDisplay();
    }

    renderTemplateDetailsModal() {
        return `
            <div id="template-details-modal" class="template-details-modal-overlay" style="display: none;" onclick="if(event.target === this) reportTemplatesInstance.closeTemplateDetailsModal()">
                <div class="template-details-modal-content" onclick="event.stopPropagation()">
                    <div class="template-details-modal-header">
                        <h3 id="template-details-title">
                            <i class="fas fa-file-alt"></i> Template Details
                        </h3>
                        <button class="btn-icon" onclick="reportTemplatesInstance.closeTemplateDetailsModal()" title="Close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="template-details-modal-body" id="template-details-content">
                        <!-- Template details will be inserted here -->
                    </div>
                    <div class="template-details-modal-footer" id="template-details-actions">
                        <!-- Action buttons will be inserted here -->
                    </div>
                </div>
            </div>
        `;
    }

    openTemplateDetailsModal(id) {
        const template = this.templates.find(t => t.id === id);
        if (!template) return;

        const modal = document.getElementById('template-details-modal');
        const modalContent = document.getElementById('template-details-content');
        const modalActions = document.getElementById('template-details-actions');
        const modalTitle = document.getElementById('template-details-title');
        
        if (!modal || !modalContent || !modalActions) return;

        const escapeHtml = (text) => {
            if (!text) return '';
            return String(text)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        };

        const typeIcon = template.type === 'html' ? 'fa-code' : template.type === 'docx' ? 'fa-file-word' : 'fa-file-pdf';
        const sourceIcon = template.dataSource === 'hyperv' ? 'fa-server' :
                          template.dataSource === 'fileshare' ? 'fa-folder-open' :
                          template.dataSource === 'ad' ? 'fa-users' : 'fa-layer-group';
        const typeColor = template.type === 'html' ? 'var(--success)' : 
                         template.type === 'docx' ? 'var(--secondary)' : 'var(--danger)';

        // Parse tags if it's a string
        const tags = template.tags ? (typeof template.tags === 'string' ? template.tags.split(',').map(t => t.trim()).filter(t => t) : []) : [];

        modalTitle.innerHTML = `<i class="fas ${typeIcon}" style="color: ${typeColor};"></i> ${escapeHtml(template.name || 'Untitled Template')}`;

        modalContent.innerHTML = `
            <div class="template-details-info">
                <div class="template-details-section">
                    <h4><i class="fas fa-info-circle"></i> Basic Information</h4>
                    <div class="template-details-grid">
                        <div class="template-detail-row">
                            <span class="detail-label">Type:</span>
                            <span class="detail-value">
                                <span class="template-badge type-${template.type}">
                                    <i class="fas ${typeIcon}"></i>
                                    ${template.type.toUpperCase()}
                                </span>
                            </span>
                        </div>
                        <div class="template-detail-row">
                            <span class="detail-label">Data Source:</span>
                            <span class="detail-value">
                                <span class="template-badge source-${template.dataSource}">
                                    <i class="fas ${sourceIcon}"></i>
                                    ${this.t(template.dataSource)}
                                </span>
                            </span>
                        </div>
                        ${template.version ? `
                            <div class="template-detail-row">
                                <span class="detail-label">Version:</span>
                                <span class="detail-value">${escapeHtml(template.version)}</span>
                            </div>
                        ` : ''}
                        ${template.author ? `
                            <div class="template-detail-row">
                                <span class="detail-label">Author:</span>
                                <span class="detail-value">${escapeHtml(template.author)}</span>
                            </div>
                        ` : ''}
                        ${template.category ? `
                            <div class="template-detail-row">
                                <span class="detail-label">Category:</span>
                                <span class="detail-value">${escapeHtml(template.category)}</span>
                            </div>
                        ` : ''}
                        ${template.purpose ? `
                            <div class="template-detail-row">
                                <span class="detail-label">Purpose:</span>
                                <span class="detail-value">${escapeHtml(template.purpose)}</span>
                            </div>
                        ` : ''}
                        ${template.status ? `
                            <div class="template-detail-row">
                                <span class="detail-label">Status:</span>
                                <span class="detail-value">${escapeHtml(template.status.charAt(0).toUpperCase() + template.status.slice(1))}</span>
                            </div>
                        ` : ''}
                        ${template.priority ? `
                            <div class="template-detail-row">
                                <span class="detail-label">Priority:</span>
                                <span class="detail-value">${escapeHtml(template.priority.charAt(0).toUpperCase() + template.priority.slice(1))}</span>
                            </div>
                        ` : ''}
                        <div class="template-detail-row">
                            <span class="detail-label">Created:</span>
                            <span class="detail-value">${template.createdAt ? new Date(template.createdAt).toLocaleString() : 'N/A'}</span>
                        </div>
                        <div class="template-detail-row">
                            <span class="detail-label">Last Updated:</span>
                            <span class="detail-value">${template.updatedAt ? new Date(template.updatedAt).toLocaleString() : 'N/A'}</span>
                        </div>
                    </div>
                </div>
                ${template.description ? `
                    <div class="template-details-section">
                        <h4><i class="fas fa-align-left"></i> Description</h4>
                        <p class="template-description-text">${escapeHtml(template.description)}</p>
                    </div>
                ` : ''}
                ${tags.length > 0 ? `
                    <div class="template-details-section">
                        <h4><i class="fas fa-tags"></i> Tags</h4>
                        <div class="template-tags">
                            ${tags.map(tag => `
                                <span class="template-tag">${escapeHtml(tag)}</span>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                ${template.notes ? `
                    <div class="template-details-section">
                        <h4><i class="fas fa-sticky-note"></i> Notes</h4>
                        <p class="template-notes-text">${escapeHtml(template.notes)}</p>
                    </div>
                ` : ''}
            </div>
        `;

        modalActions.innerHTML = `
            <div class="template-details-actions-group">
                <button class="btn btn-secondary" onclick="reportTemplatesInstance.previewTemplate('${template.id}')">
                    <i class="fas fa-eye"></i> Preview
                </button>
                <button class="btn btn-primary" onclick="reportTemplatesInstance.editTemplate('${template.id}'); reportTemplatesInstance.closeTemplateDetailsModal();">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-success" onclick="reportTemplatesInstance.generateReport('${template.id}'); reportTemplatesInstance.closeTemplateDetailsModal();">
                    <i class="fas fa-play"></i> Generate Report
                </button>
                <button class="btn btn-danger" onclick="if(confirm('Are you sure you want to delete this template?')) { reportTemplatesInstance.deleteTemplate('${template.id}'); reportTemplatesInstance.closeTemplateDetailsModal(); }">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;

        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    closeTemplateDetailsModal() {
        const modal = document.getElementById('template-details-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    switchTab(tab) {
        this.activeTab = tab;
        if (tab === 'preview') {
            // Update preview when switching to preview tab
            this.updatePreview();
        }
        this.updateDisplay();
    }
    
    onTypeChange() {
        const typeEl = document.getElementById('template-type');
        const type = typeEl ? typeEl.value : 'html';
        const source = document.getElementById('template-source')?.value || 'hyperv';
        const contentTextarea = document.getElementById('template-content');
        
        // Ensure selectedTemplate exists
        if (!this.selectedTemplate) {
            this.selectedTemplate = {
                name: '',
                type: type,
                dataSource: source,
                description: '',
                content: ''
            };
        } else {
            // Update the type in selectedTemplate
            this.selectedTemplate.type = type;
        }
        
        // Get default template for the current type and source
        const defaultContent = this.getDefaultTemplate(type, source);
        
        // For HTML templates, update content if empty or if it matches a default template
        if (type === 'html' && contentTextarea) {
            const currentContent = contentTextarea.value.trim();
            if (!currentContent || currentContent === this.getDefaultTemplate('html', source)) {
                contentTextarea.value = defaultContent;
                if (this.selectedTemplate) {
                    this.selectedTemplate.content = defaultContent;
                }
            } else {
                // Ask user if they want to replace content
                const shouldReplace = confirm(`Do you want to replace the current template content with the default template for "${type}" type and "${source}" data source?\n\nClick OK to replace, Cancel to keep current content.`);
                if (shouldReplace) {
                    contentTextarea.value = defaultContent;
                    if (this.selectedTemplate) {
                        this.selectedTemplate.content = defaultContent;
                    }
                }
            }
        } else if (type === 'docx') {
            // For DOCX, clear textarea content if it exists
            if (contentTextarea) {
                contentTextarea.value = '';
            }
        }
        
        // Update preview if preview tab is active
        if (this.activeTab === 'preview') {
            this.updatePreview();
        }
        
        // Refresh the editor to show file upload for DOCX or code editor for HTML
        this.updateDisplay();
        // Update preview after display updates
        setTimeout(() => this.updatePreview(), 100);
    }
    
    handleDocxUpload(event) {
        const file = event.target.files[0];
        if (!file) {
            console.log('No file selected');
            return;
        }
        
        if (!file.name.endsWith('.docx')) {
            alert('Please upload a .docx file');
            return;
        }
        
        console.log('File selected:', file.name, 'Size:', file.size);
        
        const reader = new FileReader();
        reader.onerror = (error) => {
            console.error('Error reading file:', error);
            alert('Error reading file. Please try again.');
        };
        
        reader.onload = (e) => {
            try {
                // Store as data URL (base64 encoded)
                const base64 = e.target.result;
                console.log('File read successfully, base64 length:', base64.length);
                
                // Ensure selectedTemplate exists with proper structure
                if (!this.selectedTemplate) {
                    const typeEl = document.getElementById('template-type');
                    const sourceEl = document.getElementById('template-source');
                    this.selectedTemplate = {
                        name: '',
                        type: typeEl ? typeEl.value : 'docx',
                        dataSource: sourceEl ? sourceEl.value : 'hyperv',
                        description: '',
                        content: ''
                    };
                }
                
                // Ensure type is docx
                this.selectedTemplate.type = 'docx';
                
                // Update the type dropdown if it exists
                const typeEl = document.getElementById('template-type');
                if (typeEl && typeEl.value !== 'docx') {
                    typeEl.value = 'docx';
                }
                
                // Store the base64 content
                this.selectedTemplate.content = base64;
                console.log('Content stored in selectedTemplate:', {
                    hasContent: !!this.selectedTemplate.content,
                    contentLength: this.selectedTemplate.content.length,
                    type: this.selectedTemplate.type
                });
                
                // Force a re-render by updating the display
                // Use requestAnimationFrame to ensure DOM is ready
                requestAnimationFrame(() => {
                    this.updateDisplay();
                    // Update preview after display updates
                    setTimeout(() => this.updatePreview(), 100);
                    console.log('Display updated after file upload');
                });
            } catch (error) {
                console.error('Error processing file:', error);
                alert('Error processing file: ' + error.message);
            }
        };
        
        reader.readAsDataURL(file);
    }
    
    removeDocxFile() {
        if (this.selectedTemplate) {
            this.selectedTemplate.content = '';
        }
        const fileInput = document.getElementById('docx-file-input');
        if (fileInput) {
            fileInput.value = '';
        }
        this.updateDisplay();
    }

    onSourceChange() {
        const source = document.getElementById('template-source').value;
        const typeEl = document.getElementById('template-type');
        const type = typeEl ? typeEl.value : 'html';
        const contentTextarea = document.getElementById('template-content');
        
        // Update the selected template's dataSource
        if (this.selectedTemplate) {
            this.selectedTemplate.dataSource = source;
        }
        
        // Only update template content if it's empty or if user confirms
        if (contentTextarea) {
            const currentContent = contentTextarea.value.trim();
            const defaultContent = this.getDefaultTemplate(type, source);
            
            // If content is empty or matches a default template, replace it
            if (!currentContent || currentContent === this.getDefaultTemplate(type, this.selectedTemplate?.dataSource || 'hyperv')) {
                contentTextarea.value = defaultContent;
                // Update the selected template's content
                if (this.selectedTemplate) {
                    this.selectedTemplate.content = defaultContent;
                }
                // Update preview if preview tab is active
                if (this.activeTab === 'preview') {
                    this.updatePreview();
                }
            } else {
                // Ask user if they want to replace content
                const shouldReplace = confirm(`Do you want to replace the current template content with the default template for "${source}"?\n\nClick OK to replace, Cancel to keep current content.`);
                if (shouldReplace) {
                    contentTextarea.value = defaultContent;
                    if (this.selectedTemplate) {
                        this.selectedTemplate.content = defaultContent;
                    }
                    if (this.activeTab === 'preview') {
                        this.updatePreview();
                    }
                }
            }
        }
        
        this.updateDisplay(); // Refresh to update variables panel
    }

    insertVariable(variable) {
        const textarea = document.getElementById('template-content');
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = textarea.value;
            
            textarea.value = text.substring(0, start) + variable + text.substring(end);
            textarea.selectionStart = textarea.selectionEnd = start + variable.length;
            textarea.focus();
            
            // Update preview
            this.updatePreview();
        }
    }

    updatePreview() {
        const previewPane = document.getElementById('template-preview-pane');
        const modalPreview = document.getElementById('preview-modal-content');
        const targetElement = previewPane || modalPreview;
        
        if (!targetElement) return;
        
        const typeEl = document.getElementById('template-type');
        const type = typeEl ? typeEl.value : 'html';
        const nameEl = document.getElementById('template-name');
        const name = nameEl ? nameEl.value : 'Untitled Template';
        
        if (type === 'docx') {
            // For DOCX, show preview info and generate button
            const content = this.selectedTemplate?.content || '';
            const hasFile = content && (
                content.startsWith('data:application/vnd.openxmlformats-officedocument.wordprocessingml.document') ||
                content.startsWith('data:application/octet-stream') ||
                (content.startsWith('data:') && content.includes('base64') && content.length > 1000)
            );
            
            if (hasFile) {
                // Extract placeholder count
                const placeholderMatches = content.match(/\{\{[^}]+\}\}/g) || [];
                const loopMatches = content.match(/\{\{#each\s+[^}]+\}\}/g) || [];
                const conditionalMatches = content.match(/\{\{#if\s+[^}]+\}\}/g) || [];
                
                // Calculate file size
                const base64Data = content.includes(',') ? content.split(',')[1] : content;
                const fileSizeBytes = Math.round((base64Data.length * 3) / 4);
                const fileSizeKB = (fileSizeBytes / 1024).toFixed(2);
                
                targetElement.innerHTML = `
                    <div class="docx-preview-info">
                        <div class="docx-preview-header">
                            <i class="fas fa-file-word fa-2x" style="color: var(--secondary); margin-bottom: 1rem;"></i>
                            <h3>DOCX Template Preview</h3>
                            <p class="docx-preview-subtitle">Generate a preview with sample data</p>
                        </div>
                        <div class="docx-preview-stats">
                            <div class="docx-stat-item">
                                <i class="fas fa-file-alt"></i>
                                <div>
                                    <div class="docx-stat-value">${fileSizeKB} KB</div>
                                    <div class="docx-stat-label">File Size</div>
                                </div>
                            </div>
                            <div class="docx-stat-item">
                                <i class="fas fa-code"></i>
                                <div>
                                    <div class="docx-stat-value">${placeholderMatches.length}</div>
                                    <div class="docx-stat-label">Placeholders</div>
                                </div>
                            </div>
                            <div class="docx-stat-item">
                                <i class="fas fa-sync"></i>
                                <div>
                                    <div class="docx-stat-value">${loopMatches.length}</div>
                                    <div class="docx-stat-label">Loops</div>
                                </div>
                            </div>
                            <div class="docx-stat-item">
                                <i class="fas fa-question-circle"></i>
                                <div>
                                    <div class="docx-stat-value">${conditionalMatches.length}</div>
                                    <div class="docx-stat-label">Conditionals</div>
                                </div>
                            </div>
                        </div>
                        <div class="docx-preview-actions">
                            <button class="btn btn-primary" onclick="reportTemplatesInstance.generateDOCXPreview()">
                                <i class="fas fa-file-download"></i> Generate Preview DOCX
                            </button>
                            <p class="docx-preview-note">This will generate a DOCX file with sample data replacing all placeholders</p>
                        </div>
                    </div>
                `;
            } else {
                targetElement.innerHTML = `
                    <div class="preview-placeholder">
                        <i class="fas fa-file-word fa-3x" style="color: #cbd5e1; margin-bottom: 1rem;"></i>
                        <p>Please upload a DOCX file to preview</p>
                    </div>
                `;
            }
        } else {
            // For HTML templates, generate normal preview
            const contentEl = document.getElementById('template-content');
            const template = {
                content: contentEl ? contentEl.value : ''
            };
            targetElement.innerHTML = this.generatePreview(template);
        }
    }
    
    async generateDOCXPreview() {
        const nameEl = document.getElementById('template-name');
        const dataSourceEl = document.getElementById('template-source');
        const content = this.selectedTemplate?.content || '';
        
        if (!content || !content.includes('base64')) {
            alert('No DOCX file uploaded');
            return;
        }
        
        const templateName = nameEl ? nameEl.value || 'preview' : 'preview';
        const dataSource = dataSourceEl ? dataSourceEl.value : 'hyperv';
        
        try {
            // Extract sample data
            const placeholders = this.extractHyperVData({});
            
            // Call backend to generate preview DOCX
            const response = await api.fetch('/api/report-templates/generate-docx-with-placeholders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    templateName: templateName + '_preview',
                    docxContent: content,
                    placeholders: placeholders,
                    reportData: {
                        cluster: {
                            name: 'PROD-CLUSTER-01',
                            nodes: 3,
                            health: 'Healthy'
                        },
                        hosts: [
                            {
                                name: 'SRV-HV01',
                                osVersion: 'Windows Server 2022',
                                vms: [
                                    { name: 'VM-01', state: 'Running' },
                                    { name: 'VM-02', state: 'Running' }
                                ]
                            }
                        ]
                    }
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to generate preview');
            }
            
            // Download the generated DOCX
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${templateName}_preview.docx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error generating DOCX preview:', error);
            alert('Failed to generate preview. Please try again.');
        }
    }

    formatCode() {
        const textarea = document.getElementById('template-content');
        if (textarea) {
            // Basic HTML formatting
            let content = textarea.value;
            content = content.replace(/></g, '>\n<');
            content = content.replace(/\n\s*\n/g, '\n');
            textarea.value = content;
        }
    }

    insertSampleData() {
        const source = document.getElementById('template-source').value;
        const type = document.getElementById('template-type').value;
        const textarea = document.getElementById('template-content');
        
        if (textarea) {
            textarea.value = this.getDefaultTemplate(type, source);
            this.updatePreview();
        }
    }

    async saveTemplate() {
        // All elements are visible in 3-column layout
        
        const nameEl = document.getElementById('template-name');
        const typeEl = document.getElementById('template-type');
        const dataSourceEl = document.getElementById('template-source');
        const descriptionEl = document.getElementById('template-description');
        const authorEl = document.getElementById('template-author');
        const versionEl = document.getElementById('template-version');
        const categoryEl = document.getElementById('template-category');
        const tagsEl = document.getElementById('template-tags');
        const statusEl = document.getElementById('template-status');
        const priorityEl = document.getElementById('template-priority');
        const notesEl = document.getElementById('template-notes');
        const purposeEl = document.getElementById('template-purpose');
        const contentEl = document.getElementById('template-content');
        
        if (!nameEl || !typeEl || !dataSourceEl || !descriptionEl) {
            alert('Form elements not found. Please refresh the page and try again.');
            return;
        }
        
        const name = nameEl.value.trim();
        const type = typeEl.value;
        const dataSource = dataSourceEl.value;
        const description = descriptionEl.value.trim();
        const author = authorEl ? authorEl.value.trim() : '';
        const version = versionEl ? versionEl.value.trim() : '1.0';
        const category = categoryEl ? categoryEl.value.trim() : '';
        const tags = tagsEl ? tagsEl.value.trim() : '';
        const status = statusEl ? statusEl.value : 'draft';
        const priority = priorityEl ? priorityEl.value : 'medium';
        const notes = notesEl ? notesEl.value.trim() : '';
        const purpose = purposeEl ? purposeEl.value.trim() : '';
        
        // Build rules JSON with additional metadata
        const rulesData = {};
        if (category) rulesData.category = category;
        if (tags) rulesData.tags = tags;
        if (status) rulesData.status = status;
        if (priority) rulesData.priority = priority;
        if (notes) rulesData.notes = notes;
        if (purpose) rulesData.purpose = purpose;
        
        const rules = Object.keys(rulesData).length > 0 ? JSON.stringify(rulesData) : '';
        let content = '';
        
        // For DOCX templates, get content from selectedTemplate (stored during file upload)
        if (type === 'docx') {
            if (this.selectedTemplate && this.selectedTemplate.content) {
                content = this.selectedTemplate.content;
            } else if (this.selectedTemplate && this.selectedTemplate.id) {
                // If editing existing template, keep existing content if no new file uploaded
                const existingTemplate = this.templates.find(t => t.id === this.selectedTemplate.id);
                if (existingTemplate && existingTemplate.content) {
                    content = existingTemplate.content;
                } else {
                    alert('Please upload a DOCX file');
                    return;
                }
            } else {
                alert('Please upload a DOCX file');
                return;
            }
        } else {
            // For HTML templates, get content from textarea
            if (!contentEl) {
                alert('Content editor not found');
                return;
            }
            content = contentEl.value;
        }
        
        if (!name || !content) {
            alert('Please fill in all required fields');
            return;
        }
        
        const template = {
            id: this.selectedTemplate?.id || Date.now().toString(),
            name,
            type,
            dataSource,
            description,
            content,
            rules: rules,
            createdAt: this.selectedTemplate?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            author: author || '',
            version: version || '1.0'
        };
        
        try {
            // If updating, URL should include ID
            const url = this.selectedTemplate && this.selectedTemplate.id
                ? `/api/report-templates/${encodeURIComponent(this.selectedTemplate.id)}`
                : '/api/report-templates';
                
            const method = this.selectedTemplate && this.selectedTemplate.id ? 'PUT' : 'POST';

            console.log(`Saving template: URL=${url}, Method=${method}`);

            const response = await api.fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(template)
            });
            
            if (response.ok) {
                const savedTemplate = await response.json();
                await this.loadTemplates();
                this.closeEditor();
                alert(`Template "${savedTemplate.name}" saved successfully!`);
            } else {
                // Handle error response
                const errorText = await response.text();
                let errorMessage = 'Error saving template';
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch (e) {
                    errorMessage = errorText || errorMessage;
                }
                console.error('Error saving template:', errorMessage);
                alert(`Error saving template: ${errorMessage}`);
            }
        } catch (error) {
            console.error('Error saving template:', error);
            alert(`Error saving template: ${error.message}`);
        }
    }

    async deleteTemplate(id, showConfirm = true) {
        if (showConfirm && !confirm(this.t('deleteConfirm'))) {
            return;
        }
        
        try {
            const response = await fetch(`/api/report-templates/${encodeURIComponent(id)}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                this.selectedTemplates.delete(id);
                await this.loadTemplates();
                this.updateDisplay();
                // Show success message if available
                if (showConfirm) {
                    const data = await response.json().catch(() => null);
                    if (data && data.message) {
                        alert(data.message);
                    }
                }
            } else {
                // Handle error response
                const errorText = await response.text();
                let errorMessage = 'Error deleting template';
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch (e) {
                    errorMessage = errorText || errorMessage;
                }
                if (showConfirm) {
                    alert(errorMessage);
                }
            }
        } catch (error) {
            console.error('Error deleting template:', error);
            if (showConfirm) {
                alert('Error deleting template: ' + error.message);
            }
        }
    }

    calculateStats() {
        const stats = {
            total: this.templates.length,
            html: 0,
            docx: 0,
            pdf: 0,
            hyperv: 0,
            ad: 0,
            mixed: 0
        };

        this.templates.forEach(template => {
            if (template.type === 'html') stats.html++;
            else if (template.type === 'docx') stats.docx++;
            else if (template.type === 'pdf') stats.pdf++;
            
            if (template.dataSource === 'hyperv') stats.hyperv++;
            else if (template.dataSource === 'ad') stats.ad++;
            else if (template.dataSource === 'mixed') stats.mixed++;
        });

        return stats;
    }

    getFilteredTemplates() {
        let filtered = [...this.templates];

        // Filter by search query
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(t => 
                t.name.toLowerCase().includes(query) ||
                (t.description && t.description.toLowerCase().includes(query)) ||
                (t.author && t.author.toLowerCase().includes(query))
            );
        }

        // Filter by type
        if (this.filterType !== 'all') {
            filtered = filtered.filter(t => t.type === this.filterType);
        }

        // Filter by data source
        if (this.filterDataSource !== 'all') {
            filtered = filtered.filter(t => t.dataSource === this.filterDataSource);
        }

        // Sort
        filtered.sort((a, b) => {
            switch (this.sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'name-desc':
                    return b.name.localeCompare(a.name);
                case 'created':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                case 'updated':
                default:
                    return new Date(b.updatedAt) - new Date(a.updatedAt);
            }
        });

        return filtered;
    }

    handleSearch(event) {
        this.searchQuery = event.target.value;
        this.updateDisplay();
    }

    handleFilterType(event) {
        this.filterType = event.target.value;
        this.updateDisplay();
    }

    handleFilterDataSource(event) {
        this.filterDataSource = event.target.value;
        this.updateDisplay();
    }

    handleSort(event) {
        this.sortBy = event.target.value;
        this.updateDisplay();
    }

    setViewMode(mode) {
        this.viewMode = mode;
        localStorage.setItem('reportTemplatesViewMode', mode);
        this.updateDisplay();
    }

    clearFilters() {
        this.searchQuery = '';
        this.filterType = 'all';
        this.filterDataSource = 'all';
        this.updateDisplay();
    }

    toggleSelection(templateId, event) {
        if (event.target.checked) {
            this.selectedTemplates.add(templateId);
        } else {
            this.selectedTemplates.delete(templateId);
        }
        this.updateDisplay();
    }

    bulkDelete() {
        if (this.selectedTemplates.size === 0) return;
        
        if (confirm(`Are you sure you want to delete ${this.selectedTemplates.size} template(s)?`)) {
            const deletePromises = Array.from(this.selectedTemplates).map(id => 
                this.deleteTemplate(id, false)
            );
            Promise.all(deletePromises).then(() => {
                this.selectedTemplates.clear();
                this.loadTemplates();
            });
        }
    }

    previewTemplate(id) {
        const template = this.templates.find(t => t.id === id);
        if (template) {
            const previewWindow = window.open('', '_blank');
            previewWindow.document.write(this.generatePreview(template));
            previewWindow.document.close();
        }
    }

    async generateReport(id) {
        const template = this.templates.find(t => t.id === id);
        if (!template) return;

        try {
            // Determine which API endpoint to use based on data source
            let apiEndpoint = '/api/hyperv-reports';
            let reportType = 'HyperV';
            let reportTypeLabel = 'Hyper-V';
            
            if (template.dataSource === 'fileshare') {
                apiEndpoint = '/api/file-share-reports';
                reportType = 'FileShare';
                reportTypeLabel = 'File Share';
            }

            // Get available reports to choose from
            const response = await fetch(apiEndpoint);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${reportTypeLabel} reports`);
            }

            const reports = await response.json();
            if (!reports || reports.length === 0) {
                alert(`No ${reportTypeLabel} reports available. Please create a ${reportTypeLabel} report first.`);
                return;
            }

            // Show modal to select which report to use
            this.showReportSelectionModal(template, reports, reportType);

        } catch (error) {
            console.error(`Error fetching ${template.dataSource} reports:`, error);
            alert(`Error fetching ${template.dataSource} reports. Please try again.`);
        }
    }

    showReportSelectionModal(template, reports, reportType = 'HyperV') {
        const reportTypeLabel = reportType === 'FileShare' ? 'File Share' : 'Hyper-V';
        const reportIcon = reportType === 'FileShare' ? 'fa-folder-open' : 'fa-server';
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content report-selection-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3><i class="fas ${reportIcon}"></i> Select ${reportTypeLabel} Report Data</h3>
                    <button class="btn-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p>Select which ${reportTypeLabel} report data to use for generating "${template.name}":</p>
                    ${reports.length > 0 ? `
                        <div class="report-list">
                            ${reports.map(report => `
                                <div class="report-option" data-report-id="${report.id}">
                                    <div class="report-info">
                                        <h4>${report.name}</h4>
                                        <p class="report-meta">
                                            <span><i class="fas fa-calendar"></i> ${new Date(report.createdAt).toLocaleDateString()}</span>
                                            ${reportType === 'HyperV' ? `<span><i class="fas fa-server"></i> ${report.clusterName || report.cluster || 'Standalone'}</span>` : ''}
                                            ${reportType === 'FileShare' ? `<span><i class="fas fa-server"></i> ${report.serverName || 'N/A'}</span>` : ''}
                                        </p>
                                    </div>
                                    <button class="btn btn-primary btn-sm" onclick="reportTemplatesInstance.generateWithReport('${template.id}', '${report.id}', '${reportType}')">
                                        <i class="fas fa-play"></i> Generate
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="report-list-empty">
                            <i class="fas fa-inbox" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 1rem;"></i>
                            <p style="color: #94a3b8; margin: 0;">No ${reportTypeLabel} reports available</p>
                        </div>
                    `}
                </div>
            </div>
        `;

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        document.body.appendChild(modal);
    }

    async generateWithReport(templateId, reportId, reportType = 'HyperV') {
        try {
            // Close the modal
            document.querySelector('.modal-overlay')?.remove();

            // Determine which API endpoint to use based on report type
            let apiEndpoint = `/api/hyperv-reports/${reportId}`;
            if (reportType === 'FileShare') {
                apiEndpoint = `/api/file-share-reports/${reportId}`;
            }

            // Fetch the specific report data
            const response = await fetch(apiEndpoint);
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Failed to fetch report data:', response.status, errorText);
                throw new Error(`Failed to fetch report data: ${response.status} ${errorText}`);
            }

            let reportData = await response.json();
            
            if (!reportData || typeof reportData !== 'object') {
                throw new Error('Invalid report data format');
            }

            // Extract reportData if it's nested (for Hyper-V)
            if (reportData.reportData && typeof reportData.reportData === 'object') {
                reportData = reportData.reportData;
            }

            const template = this.templates.find(t => t.id === templateId);
            if (!template) {
                throw new Error('Template not found');
            }

            // Create and download the report based on template type
            if (template.type === 'docx') {
                console.log('Generating DOCX report with placeholder replacement...');
                await this.downloadDOCXReportWithPlaceholders(template, reportData);
            } else if (template.type === 'pdf') {
                // PDF generation logic (if implemented client-side or server-side)
                console.log('PDF generation not fully implemented, falling back to print view');
                const generatedContent = this.populateTemplateWithData(template, reportData);
                this.downloadGeneratedReport(template, generatedContent);
            } else {
                // Default to HTML
                console.log('Generating HTML report...');
                const generatedContent = this.populateTemplateWithData(template, reportData);
                this.downloadGeneratedReport(template, generatedContent);
            }

        } catch (error) {
            console.error('Error generating report:', error);
            alert(`Error generating report: ${error.message}. Please try again.`);
        }
    }

    async downloadDOCXReport(template, htmlContent) {
        try {
            const response = await fetch('/api/report-templates/generate-docx', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    templateName: template.name,
                    htmlContent: htmlContent
                })
            });

            if (!response.ok) {
                throw new Error('Failed to generate DOCX');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${template.name}_${new Date().toISOString().split('T')[0]}.docx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            this.showMessage(`Report "${template.name}" generated as DOCX successfully!`, 'success');
        } catch (error) {
            console.error('Error downloading DOCX:', error);
            alert('Error generating DOCX report: ' + error.message);
        }
    }
    
    async downloadDOCXReportWithPlaceholders(template, reportData) {
        try {
            // Extract data for placeholder replacement
            const data = this.extractHyperVData(reportData);
            
            // Use template author if available, otherwise default
            data['report.author'] = template?.author || 'System Administrator';
            
            // Debug: Log the new variables to verify they're being set
            console.log('[DOCX] Placeholder data:', {
                storageSpacesCount: data['cluster.storageSpacesCount'],
                quorumDiskCount: data['cluster.quorumDiskCount'],
                errorCount: data['cluster.errorCount'],
                csvCount: data['cluster.csvCount'],
                author: data['report.author']
            });
            
            const response = await fetch('/api/report-templates/generate-docx-with-placeholders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    templateName: template.name,
                    docxContent: template.content, // Base64 encoded DOCX file
                    placeholders: data, // Map of placeholder keys to values
                    reportData: reportData // Full report data for loops
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to generate DOCX: ${errorText}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${template.name}_${new Date().toISOString().split('T')[0]}.docx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            this.showMessage(`Report "${template.name}" generated as DOCX successfully!`, 'success');
        } catch (error) {
            console.error('Error downloading DOCX:', error);
            alert('Error generating DOCX report: ' + error.message);
        }
    }

    populateTemplateWithData(template, reportData) {
        // Debug: Log the structure of reportData to see what we're working with
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('[ReportTemplates] populateTemplateWithData - reportData structure:', {
                hasHosts: !!reportData.hosts,
                hostsCount: reportData.hosts?.length || 0,
                firstHost: reportData.hosts?.[0] ? {
                    name: reportData.hosts[0].name,
                    hasServerRoles: !!reportData.hosts[0].serverRoles,
                    serverRolesCount: reportData.hosts[0].serverRoles?.length || 0,
                    hasDisks: !!reportData.hosts[0].disks,
                    disksCount: reportData.hosts[0].disks?.length || 0,
                    hasVolumes: !!reportData.hosts[0].volumes,
                    volumesCount: reportData.hosts[0].volumes?.length || 0,
                    hasNetworkAdapters: !!reportData.hosts[0].networkAdapters,
                    networkAdaptersCount: reportData.hosts[0].networkAdapters?.length || 0,
                    hasVirtualSwitches: !!reportData.hosts[0].virtualSwitches,
                    virtualSwitchesCount: reportData.hosts[0].virtualSwitches?.length || 0,
                    hasLocalUsers: !!reportData.hosts[0].localUsers,
                    localUsersCount: reportData.hosts[0].localUsers?.length || 0,
                    hasLocalGroups: !!reportData.hosts[0].localGroups,
                    localGroupsCount: reportData.hosts[0].localGroups?.length || 0,
                    hasWindowsUpdates: !!reportData.hosts[0].windowsUpdates,
                    windowsUpdatesCount: reportData.hosts[0].windowsUpdates?.length || 0
                } : null
            });
        }
        
        let content = template.content;

        // Extract data first to have cluster.csvCount available for conditionals
        const data = this.extractHyperVData(reportData);
        
        // Enhance reportData with File Share data if available
        if (reportData.folderAnalysis) {
            // Flatten folderAnalysis structure for easier access in templates
            if (reportData.folderAnalysis.folderTree) {
                reportData.folderTree = reportData.folderAnalysis.folderTree;
            }
            if (reportData.folderAnalysis.summary) {
                reportData.summary = reportData.folderAnalysis.summary;
                if (reportData.folderAnalysis.summary.criticalIssues) {
                    reportData.criticalIssues = reportData.folderAnalysis.summary.criticalIssues;
                }
                if (reportData.folderAnalysis.summary.warningIssues) {
                    reportData.warningIssues = reportData.folderAnalysis.summary.warningIssues;
                }
            }
            // Extract share enumeration
            if (reportData.folderAnalysis.shareEnumeration && Array.isArray(reportData.folderAnalysis.shareEnumeration)) {
                reportData.shareEnumeration = reportData.folderAnalysis.shareEnumeration;
                // Add pluralization helpers
                reportData.shareEnumerationCount = reportData.shareEnumeration.length;
                reportData.shareEnumerationIsSingular = reportData.shareEnumeration.length === 1;
            } else {
                reportData.shareEnumeration = [];
                reportData.shareEnumerationCount = 0;
                reportData.shareEnumerationIsSingular = false;
            }
        }

        // Extract groups and users with folder access for Share Enumeration
        if (reportData.folderTree && Array.isArray(reportData.folderTree)) {
            const groupsMap = new Map(); // groupName -> { folders: [], rights: Set, totalFolders: 0 }
            const usersMap = new Map(); // userName -> { folders: [], rights: Set, totalFolders: 0 }

            reportData.folderTree.forEach(folder => {
                const perms = folder.permissions || [];
                
                perms.forEach(perm => {
                    const identity = perm.identityReference || '';
                    if (!identity || identity.trim() === '') return;
                    
                    // Detect groups: BUILTIN\, NT AUTHORITY\, Domain\Group patterns, or well-known groups
                    const isGroup = identity.includes('BUILTIN\\') || 
                                   identity.includes('NT AUTHORITY\\') ||
                                   identity.includes('Everyone') ||
                                   identity.includes('Authenticated Users') ||
                                   identity.includes('Domain Users') ||
                                   identity.includes('Users') ||
                                   identity.includes('Administrators') ||
                                   identity.includes('Guests') ||
                                   identity.includes('Backup Operators') ||
                                   identity.includes('Power Users') ||
                                   (identity.includes('\\') && !identity.match(/^[A-Z]+\\[A-Za-z0-9_]+$/i)); // Domain\User pattern (not a group)
                    
                    // Skip system accounts (SYSTEM, CREATOR OWNER, etc.)
                    if (identity.includes('SYSTEM') || identity.includes('CREATOR OWNER') || identity.includes('SELF')) {
                        return;
                    }
                    
                    if (isGroup) {
                        if (!groupsMap.has(identity)) {
                            groupsMap.set(identity, { folders: [], rights: new Set(), totalFolders: 0 });
                        }
                        const groupData = groupsMap.get(identity);
                        // Avoid duplicate folders
                        const folderExists = groupData.folders.some(f => f.path === folder.path);
                        if (!folderExists) {
                            groupData.folders.push({
                                path: folder.path || '',
                                relativePath: folder.relativePath || folder.name || '',
                                rights: perm.fileSystemRights || '',
                                accessType: perm.accessControlType || '',
                                isInherited: perm.isInherited || false,
                                riskLevel: perm.riskLevel || 'Low'
                            });
                            groupData.totalFolders = groupData.folders.length;
                        }
                        groupData.rights.add(perm.fileSystemRights || '');
                    } else {
                        // Assume it's a user
                        if (!usersMap.has(identity)) {
                            usersMap.set(identity, { folders: [], rights: new Set(), totalFolders: 0 });
                        }
                        const userData = usersMap.get(identity);
                        // Avoid duplicate folders
                        const folderExists = userData.folders.some(f => f.path === folder.path);
                        if (!folderExists) {
                            userData.folders.push({
                                path: folder.path || '',
                                relativePath: folder.relativePath || folder.name || '',
                                rights: perm.fileSystemRights || '',
                                accessType: perm.accessControlType || '',
                                isInherited: perm.isInherited || false,
                                riskLevel: perm.riskLevel || 'Low'
                            });
                            userData.totalFolders = userData.folders.length;
                        }
                        userData.rights.add(perm.fileSystemRights || '');
                    }
                });
            });

            // Convert maps to sorted arrays
            reportData.groupsWithAccess = Array.from(groupsMap.entries())
                .map(([name, data]) => {
                    // Calculate highest risk level from folders
                    let highestRisk = 'Low';
                    data.folders.forEach(folder => {
                        const risk = folder.riskLevel || 'Low';
                        if (risk === 'Critical' && highestRisk !== 'Critical') {
                            highestRisk = 'Critical';
                        } else if (risk === 'High' && highestRisk !== 'Critical' && highestRisk !== 'High') {
                            highestRisk = 'High';
                        } else if (risk === 'Medium' && highestRisk === 'Low') {
                            highestRisk = 'Medium';
                        }
                    });
                    // Create rights display string
                    const rightsArray = Array.from(data.rights);
                    const rightsDisplay = rightsArray.join(', ');
                    return {
                        name,
                        totalFolders: data.totalFolders,
                        rights: rightsArray,
                        rightsCount: data.rights.size,
                        rightsDisplay,
                        folders: data.folders,
                        highestRisk
                    };
                })
                .sort((a, b) => b.totalFolders - a.totalFolders);

            reportData.usersWithAccess = Array.from(usersMap.entries())
                .map(([name, data]) => {
                    // Calculate highest risk level from folders
                    let highestRisk = 'Low';
                    data.folders.forEach(folder => {
                        const risk = folder.riskLevel || 'Low';
                        if (risk === 'Critical' && highestRisk !== 'Critical') {
                            highestRisk = 'Critical';
                        } else if (risk === 'High' && highestRisk !== 'Critical' && highestRisk !== 'High') {
                            highestRisk = 'High';
                        } else if (risk === 'Medium' && highestRisk === 'Low') {
                            highestRisk = 'Medium';
                        }
                    });
                    // Create rights display string
                    const rightsArray = Array.from(data.rights);
                    const rightsDisplay = rightsArray.join(', ');
                    return {
                        name,
                        totalFolders: data.totalFolders,
                        rights: rightsArray,
                        rightsCount: data.rights.size,
                        rightsDisplay,
                        folders: data.folders,
                        highestRisk
                    };
                })
                .sort((a, b) => b.totalFolders - a.totalFolders);
            
            // Add pluralization helpers
            reportData.groupsWithAccessCount = reportData.groupsWithAccess.length;
            reportData.groupsWithAccessIsSingular = reportData.groupsWithAccess.length === 1;
            reportData.usersWithAccessCount = reportData.usersWithAccess.length;
            reportData.usersWithAccessIsSingular = reportData.usersWithAccess.length === 1;
        }
        
        // Enhance reportData with cluster info for conditionals
        const enhancedReportData = {
            ...reportData,
            cluster: {
                name: data['cluster.name'],
                nodes: data['cluster.nodes'],
                csvCount: data['cluster.csvCount'],
                health: data['cluster.health'],
                quorumType: data['cluster.quorumType']
            }
        };

        // CRITICAL: Process loops BEFORE conditionals for nested host loops
        // Nested host loops (like {{#each host.serverRoles}}) are inside conditionals ({{#if host.serverRoles}})
        // If we process conditionals first, they might remove the nested loops before we can process them
        // So we process loops first, but skip nested host loops (they'll be processed inside the hosts loop)
        content = this.processLoops(content, reportData);
        
        // Then process conditionals ({{#if condition}}...{{/if}})
        // Use reportData (not enhancedReportData) so quorumDisks is available
        // But be careful - conditionals might contain nested loops that need to be processed first
        content = this.processConditionals(content, reportData);

        // Replace all template variables with actual data
        Object.entries(data).forEach(([key, value]) => {
            const placeholder = `{{${key}}}`;
            content = content.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 
                this.formatValue(value));
        });

        // Final pass: replace any remaining variables that might have been added during loop processing
        // This handles cases where loops add new properties (like csv.usedPercent)
        content = this.replaceRemainingVariables(content, reportData, data);
        
        // Clean up any remaining undefined template variables (only if they're clearly undefined)
        content = content.replace(/\{\{undefined[^}]*\}\}/g, '');
        // Remove any template variables that still exist (they weren't replaced, so they're undefined)
        content = content.replace(/\{\{[a-zA-Z0-9_.]+\}\}/g, '');
        
        // Final cleanup: Remove any remaining template markers that weren't processed
        // This handles cases where conditionals or loops weren't matched or processed correctly
        // Remove unmatched conditionals
        content = content.replace(/\{\{#if[^}]*\}\}/g, '');
        content = content.replace(/\{\{\/if\}\}/g, '');
        content = content.replace(/\{\{else\}\}/g, '');
        // Remove unmatched loop markers
        content = content.replace(/\{\{#each[^}]*\}\}/g, '');
        content = content.replace(/\{\{\/each\}\}/g, '');

        return content;
    }

    findBalancedConditionals(content) {
        const conditionals = [];
        const openTagRegex = /\{\{#if\s+([^}]+)\}\}/g;
        let match;
        
        while ((match = openTagRegex.exec(content)) !== null) {
            const startIndex = match.index;
            const openTag = match[0];
            const condition = match[1].trim();
            const contentStartIndex = startIndex + openTag.length;
            
            // Find matching closing tag by counting nesting levels
            let depth = 1;
            let currentIndex = contentStartIndex;
            let endIndex = -1;
            let elseIndex = -1;
            
            while (depth > 0 && currentIndex < content.length) {
                const nextOpen = content.indexOf('{{#if', currentIndex);
                const nextClose = content.indexOf('{{/if}}', currentIndex);
                const nextElse = content.indexOf('{{else}}', currentIndex);
                
                // We only care about else if it's at depth 1 (belongs to this if)
                // And it must appear before any nested if/close
                if (depth === 1 && nextElse !== -1 && 
                    (nextOpen === -1 || nextElse < nextOpen) && 
                    (nextClose === -1 || nextElse < nextClose)) {
                    elseIndex = nextElse;
                    currentIndex = nextElse + 8; // length of "{{else}}"
                    continue;
                }
                
                if (nextClose === -1) break; // Unclosed conditional
                
                if (nextOpen !== -1 && nextOpen < nextClose) {
                    // Nested if start
                    depth++;
                    currentIndex = nextOpen + 5; // length of "{{#if"
                } else {
                    // If end
                    depth--;
                    currentIndex = nextClose + 7; // length of "{{/if}}"
                    if (depth === 0) {
                        endIndex = nextClose;
                    }
                }
            }
            
            if (endIndex !== -1) {
                // Found a balanced conditional
                let ifContent, elseContent;
                if (elseIndex !== -1) {
                    ifContent = content.substring(contentStartIndex, elseIndex);
                    elseContent = content.substring(elseIndex + 8, endIndex);
                } else {
                    ifContent = content.substring(contentStartIndex, endIndex);
                    elseContent = '';
                }
                
                conditionals.push({
                    fullMatch: content.substring(startIndex, endIndex + 7),
                    condition: condition,
                    ifContent: ifContent,
                    elseContent: elseContent,
                    index: startIndex
                });
                
                // Advance regex to after this conditional
                openTagRegex.lastIndex = endIndex + 7;
            }
        }
        return conditionals;
    }

    processConditionals(content, reportData) {
        // Process {{#if condition}}...{{else}}...{{/if}} conditionals
        // Uses balanced tag matching to handle nested conditionals correctly
        let result = content;
        
        // Find all top-level conditionals
        const processedMatches = this.findBalancedConditionals(content);

        // Process matches in reverse order to maintain indices
        for (let i = processedMatches.length - 1; i >= 0; i--) {
            const { fullMatch, condition, ifContent, elseContent } = processedMatches[i];
            
            // Evaluate condition
            let conditionResult = false;
            let value = null;
            
            // CRITICAL: If condition is a nested host property (like host.serverRoles) and currentHost is not set,
            // we should preserve the conditional block (don't evaluate it) so nested loops inside can be processed later
            let shouldPreserve = false;
            if (condition.includes('.')) {
                const parts = condition.split('.');
                if (parts.length >= 2 && parts[0] === 'host' && !reportData.currentHost) {
                    // This is a host property conditional, but we're not inside a host loop yet
                    // Preserve it so nested loops inside can be processed when we're inside the hosts loop
                    shouldPreserve = true;
                }
            }
            
            // Handle different condition types
            if (condition.includes('.')) {
                // Nested property access (e.g., cluster.csvCount)
                const parts = condition.split('.');
                
                // Special handling for cluster.csvCount
                if (condition === 'cluster.csvCount') {
                    // Check cluster object first
                    if (reportData.cluster && reportData.cluster.csvCount !== undefined) {
                        value = reportData.cluster.csvCount;
                    } else {
                        // Fall back to checking clusterSharedVolumes directly
                        value = reportData.clusterSharedVolumes?.length || 0;
                    }
                } else {
                    // First, try from item context (quorumDisk, csv, host, vm) - these are set in loops
                    if (parts.length >= 2) {
                        const itemPrefix = parts[0]; // quorumDisk, csv, host, vm
                        
                        // PRIORITY: Check currentHost first for host properties (when inside host loop)
                        if (itemPrefix === 'host' && reportData.currentHost && typeof reportData.currentHost === 'object' && !Array.isArray(reportData.currentHost)) {
                            // Handle nested properties like host.multipathIO.installed
                            // Use currentHost when inside a host loop
                            let obj = reportData.currentHost;
                            for (let j = 1; j < parts.length; j++) {
                                if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
                                    obj = obj[parts[j]];
                                } else {
                                    obj = null;
                                    break;
                                }
                            }
                            value = obj;
                        } else if (itemPrefix === 'host' && reportData.host && typeof reportData.host === 'object' && !Array.isArray(reportData.host)) {
                            // Fallback to reportData.host if currentHost not available
                            let obj = reportData.host;
                            for (let j = 1; j < parts.length; j++) {
                                if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
                                    obj = obj[parts[j]];
                                } else {
                                    obj = null;
                                    break;
                                }
                            }
                            value = obj;
                        } else if (itemPrefix === 'quorumDisk' && reportData.quorumDisk && typeof reportData.quorumDisk === 'object' && !Array.isArray(reportData.quorumDisk)) {
                            // Handle nested properties like quorumDisk.diskNumber
                            let obj = reportData.quorumDisk;
                            for (let j = 1; j < parts.length; j++) {
                                if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
                                    obj = obj[parts[j]];
                                } else {
                                    obj = null;
                                    break;
                                }
                            }
                            value = obj;
                        } else if (itemPrefix === 'csv' && reportData.csv && typeof reportData.csv === 'object' && !Array.isArray(reportData.csv)) {
                            // Handle nested properties like csv.usedPercent
                            let obj = reportData.csv;
                            for (let j = 1; j < parts.length; j++) {
                                if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
                                    obj = obj[parts[j]];
                                } else {
                                    obj = null;
                                    break;
                                }
                            }
                            value = obj;
                        } else if (itemPrefix === 'vm' && reportData.vm && typeof reportData.vm === 'object' && !Array.isArray(reportData.vm)) {
                            // Handle nested properties like vm.memory.startup
                            let obj = reportData.vm;
                            for (let j = 1; j < parts.length; j++) {
                                if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
                                    obj = obj[parts[j]];
                                } else {
                                    obj = null;
                                    break;
                                }
                            }
                            value = obj;
                        }
                    }
                    
                    // If not found in item context, try from currentHost (when inside a host loop)
                    if ((value === null || value === undefined) && parts[0] === 'host' && reportData.currentHost) {
                        value = reportData.currentHost;
                        for (let j = 1; j < parts.length; j++) {
                            if (value && typeof value === 'object' && !Array.isArray(value)) {
                                value = value[parts[j]];
                            } else {
                                value = null;
                                break;
                            }
                        }
                    }
                    
                    // If not found, try direct access in reportData
                    if ((value === null || value === undefined)) {
                        value = reportData;
                        for (const part of parts) {
                            if (value && typeof value === 'object' && !Array.isArray(value)) {
                                value = value[part];
                            } else {
                                value = null;
                                break;
                            }
                        }
                    }
                    
                    // If not found, try from cluster object
                    if ((value === null || value === undefined) && parts[0] === 'cluster' && reportData.cluster) {
                        value = reportData.cluster;
                        for (let j = 1; j < parts.length; j++) {
                            if (value && typeof value === 'object') {
                                value = value[parts[j]];
                            } else {
                                value = null;
                                break;
                            }
                        }
                    }
                }
            } else {
                // Simple property access
                value = reportData[condition];
                
                // If not found, try common prefixes (quorumDisk, csv, host, vm)
                if ((value === null || value === undefined) && condition.includes('.')) {
                    const parts = condition.split('.');
                    if (parts.length === 2) {
                        const prefix = parts[0];
                        const prop = parts[1];
                        
                        // Check if prefix matches an item in context
                        if (reportData[prefix] && typeof reportData[prefix] === 'object') {
                            value = reportData[prefix][prop];
                        }
                    }
                }
            }
            
            // CRITICAL: If we need to preserve host conditionals (for nested loops), keep them as-is
            if (shouldPreserve) {
                // Don't process this conditional now - leave it for when we're inside the hosts loop
                // This preserves nested loops inside the conditional
                // Just keep the fullMatch as-is (don't replace it)
                continue; // Skip processing this conditional
            }
            
            conditionResult = this.evaluateCondition(value);

            // Replace conditional block with if content or else content
            const replacement = conditionResult ? ifContent : elseContent;
            
            // Escape special regex characters in fullMatch for safe replacement
            const escapedMatch = fullMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            result = result.replace(new RegExp(escapedMatch, 'g'), replacement);
        }

        return result;
    }

    evaluateCondition(value) {
        // Evaluate if condition is truthy
        if (value === null || value === undefined) return false;
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value !== 0 && !isNaN(value);
        if (typeof value === 'string') {
            // Empty string or special values are false
            const trimmed = value.trim();
            return trimmed.length > 0 && trimmed !== 'undefined' && trimmed !== 'null' && trimmed !== 'N/A' && trimmed !== 'n/a';
        }
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object') {
            // Empty objects are false
            const keys = Object.keys(value);
            if (keys.length === 0) return false;
            // Check if object has any non-null, non-undefined values
            return keys.some(key => {
                const val = value[key];
                return val !== null && val !== undefined && val !== '';
            });
        }
        return Boolean(value);
    }

    replaceRemainingVariables(content, reportData, extractedData) {
        // Replace variables that might have been added during loop processing
        // Look for patterns like {{csv.usedPercent}}, {{host.isClustered}}, etc.
        const variablePattern = /\{\{([a-zA-Z0-9_.]+)\}\}/g;
        let result = content;
        let match;
        const variables = new Set();

        // Find all variables
        while ((match = variablePattern.exec(content)) !== null) {
            variables.add(match[1]);
        }

        // Replace each variable
        variables.forEach(varName => {
            const parts = varName.split('.');
            let value = null;

            // Try to find the value
            if (parts[0] === 'cluster' && reportData.clusterName) {
                // Cluster data from extractedData
                const key = varName;
                if (extractedData[key]) {
                    value = extractedData[key];
                }
            } else if (parts[0] === 'csv' && reportData.clusterSharedVolumes) {
                // CSV data - this is handled in loops, skip here
                return;
            } else if (parts[0] === 'quorumDisk' || parts[0] === 'quorumDisks') {
                // Quorum disk data - this is handled in loops, skip here
                return;
            } else if (parts[0] === 'host' && reportData.hosts) {
                // Host data - this is handled in loops, skip here
                return;
            } else if (parts[0] === 'vm') {
                // VM data - this is handled in loops, skip here
                return;
            } else {
                // Try to find in reportData or extractedData
                value = reportData[varName] || extractedData[varName];
                
                // Try nested access
                if (!value && varName.includes('.')) {
                    let obj = reportData;
                    for (const part of parts) {
                        if (obj && typeof obj === 'object') {
                            obj = obj[part];
                        } else {
                            obj = null;
                            break;
                        }
                    }
                    value = obj;
                }
            }

            if (value !== null && value !== undefined) {
                const placeholder = new RegExp(`\\{\\{${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g');
                result = result.replace(placeholder, this.formatValue(value));
            }
        });

        return result;
    }

    findBalancedLoops(content) {
        const loops = [];
        const openTagRegex = /\{\{#each\s+([a-zA-Z0-9_.]+)\}\}/g;
        let match;
        
        while ((match = openTagRegex.exec(content)) !== null) {
            const startIndex = match.index;
            const openTag = match[0];
            const arrayName = match[1];
            const contentStartIndex = startIndex + openTag.length;
            
            // Find matching closing tag by counting nesting levels
            let depth = 1;
            let currentIndex = contentStartIndex;
            let endIndex = -1;
            
            while (depth > 0 && currentIndex < content.length) {
                const nextOpen = content.indexOf('{{#each', currentIndex);
                const nextClose = content.indexOf('{{/each}}', currentIndex);
                
                if (nextClose === -1) break; // Unclosed loop
                
                if (nextOpen !== -1 && nextOpen < nextClose) {
                    // Nested loop start
                    depth++;
                    currentIndex = nextOpen + 7; // length of "{{#each"
                } else {
                    // Loop end
                    depth--;
                    currentIndex = nextClose + 9; // length of "{{/each}}"
                    if (depth === 0) {
                        endIndex = nextClose;
                    }
                }
            }
            
            if (endIndex !== -1) {
                // Found a balanced loop
                loops.push({
                    fullMatch: content.substring(startIndex, endIndex + 9),
                    arrayName: arrayName,
                    loopTemplate: content.substring(contentStartIndex, endIndex),
                    index: startIndex
                });
                
                // Advance regex to after this loop to skip inner loops (they are part of content)
                openTagRegex.lastIndex = endIndex + 9;
            }
        }
        return loops;
    }

    processLoops(content, reportData) {
        // Process {{#each arrayName}}...{{/each}} loops
        // Uses balanced tag matching to handle nested loops correctly
        let result = content;
        
        // Find all top-level loops
        const processedMatches = this.findBalancedLoops(content);
        
        // Check if we're inside a hosts loop (currentHost is set)
        // If so, we should process nested host loops instead of skipping them
        const isInsideHostsLoop = !!(reportData.currentHost || reportData.host);
        
        // Find all top-level loops

        // Process matches in reverse order to maintain indices
        for (let i = processedMatches.length - 1; i >= 0; i--) {
            const { fullMatch, arrayName, loopTemplate } = processedMatches[i];
            let loopResult = '';

            // Get the array from reportData
            let array = [];
            
            // CRITICAL: Skip nested host loops (like {{#each host.serverRoles}}) ONLY in the first pass
            // When we're inside the {{#each hosts}} loop (isInsideHostsLoop = true), we should PROCESS them
            // If we process them in the first pass, currentHost won't be set and they'll fail
            if (arrayName.includes('.') && arrayName.startsWith('host.') && !isInsideHostsLoop) {
                // Don't process this loop now - leave it in the content unchanged
                // It will be processed when we're inside the hosts loop where currentHost is set
                // We must NOT use continue here - that would skip adding it to result and remove it
                // Instead, we set loopResult to the original fullMatch to preserve it
                loopResult = fullMatch;
                // Replace the match with itself (preserve it)
                result = result.replace(fullMatch, loopResult);
                continue;
            }
            
            // Handle nested property access (e.g., host.serverRoles)
            if (arrayName.includes('.')) {
                const parts = arrayName.split('.');
                if (parts.length === 2 && parts[0] === 'host') {
                    // This is a nested loop within a host context (e.g., {{#each host.serverRoles}})
                    // PRIORITY: Check currentHost first (when inside a host loop)
                    const propertyName = parts[1];
                    
                    // Try multiple ways to get the current host
                    let currentHost = reportData.currentHost || reportData.host || null;
                    
                    if (currentHost) {
                        // We're inside a host loop - use the current host's property
                        // Direct property access - check if it exists and is an array
                        const hostProperty = currentHost[propertyName];
                        if (Array.isArray(hostProperty)) {
                            // Use the array even if empty (empty check happens later)
                            array = hostProperty;
                        } else {
                            // Property doesn't exist or is not an array - return empty array
                            array = [];
                        }
                    } else if (reportData.host && typeof reportData.host === 'object' && !Array.isArray(reportData.host)) {
                        // Fallback to reportData.host if currentHost not available
                        const host = reportData.host;
                        if (propertyName === 'serverRoles') {
                            array = Array.isArray(host.serverRoles) ? host.serverRoles : [];
                        } else if (propertyName === 'windowsUpdates') {
                            array = Array.isArray(host.windowsUpdates) ? host.windowsUpdates : [];
                        } else if (propertyName === 'disks') {
                            array = Array.isArray(host.disks) ? host.disks : [];
                        } else if (propertyName === 'volumes') {
                            array = Array.isArray(host.volumes) ? host.volumes : [];
                        } else if (propertyName === 'networkAdapters') {
                            array = Array.isArray(host.networkAdapters) ? host.networkAdapters : [];
                        } else if (propertyName === 'virtualSwitches') {
                            array = Array.isArray(host.virtualSwitches) ? host.virtualSwitches : [];
                        } else if (propertyName === 'localUsers') {
                            array = Array.isArray(host.localUsers) ? host.localUsers : [];
                        } else if (propertyName === 'localGroups') {
                            array = Array.isArray(host.localGroups) ? host.localGroups : [];
                        } else if (propertyName === 'vms') {
                            array = Array.isArray(host.vms) ? host.vms : [];
                        } else if (propertyName === 'multipathIODisks') {
                            array = Array.isArray(host.multipathIODisks) ? host.multipathIODisks : [];
                        } else if (parts.length === 3 && propertyName === 'liveMigration' && parts[2] === 'networks') {
                            array = Array.isArray(host.liveMigration?.networks) ? host.liveMigration.networks : [];
                        } else {
                            // Try to access the property dynamically
                            let obj = host;
                            for (let j = 1; j < parts.length; j++) {
                                if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
                                    obj = obj[parts[j]];
                                } else {
                                    obj = null;
                                    break;
                                }
                            }
                            array = Array.isArray(obj) ? obj : [];
                        }
                    } else if (reportData.hosts) {
                        // Not inside a host loop - flatten all hosts' arrays (fallback)
                        if (propertyName === 'serverRoles') {
                            array = reportData.hosts.flatMap(host => host.serverRoles || []);
                        } else if (propertyName === 'windowsUpdates') {
                            array = reportData.hosts.flatMap(host => host.windowsUpdates || []);
                        } else if (propertyName === 'disks') {
                            array = reportData.hosts.flatMap(host => host.disks || []);
                        } else if (propertyName === 'volumes') {
                            array = reportData.hosts.flatMap(host => host.volumes || []);
                        } else if (propertyName === 'networkAdapters') {
                            array = reportData.hosts.flatMap(host => host.networkAdapters || []);
                        } else if (propertyName === 'virtualSwitches') {
                            array = reportData.hosts.flatMap(host => host.virtualSwitches || []);
                        } else if (propertyName === 'localUsers') {
                            array = reportData.hosts.flatMap(host => host.localUsers || []);
                        } else if (propertyName === 'localGroups') {
                            array = reportData.hosts.flatMap(host => host.localGroups || []);
                        } else if (propertyName === 'vms') {
                            array = reportData.hosts.flatMap(host => (host.vms || []));
                        } else if (propertyName === 'multipathIODisks') {
                            array = reportData.hosts.flatMap(host => (host.multipathIODisks || []));
                        } else if (propertyName === 'liveMigration' && parts.length === 3 && parts[2] === 'networks') {
                            array = reportData.hosts.flatMap(host => (host.liveMigration?.networks || []));
                        } else {
                            // Try to access the property dynamically
                            array = reportData.hosts.flatMap(host => {
                                let obj = host;
                                for (let j = 1; j < parts.length; j++) {
                                    if (obj && typeof obj === 'object') {
                                        obj = obj[parts[j]];
                                    } else {
                                        return [];
                                    }
                                }
                                return Array.isArray(obj) ? obj : [];
                            });
                        }
                    }
                } else {
                    // Other nested properties - try to resolve
                    let obj = reportData;
                    for (const part of parts) {
                        if (obj && typeof obj === 'object') {
                            obj = obj[part];
                        } else {
                            obj = null;
                            break;
                        }
                    }
                    array = Array.isArray(obj) ? obj : [];
                }
            } else if (arrayName === 'folderTree') {
                // File Share folder tree - check multiple possible locations
                if (reportData.folderAnalysis && reportData.folderAnalysis.folderTree) {
                    array = Array.isArray(reportData.folderAnalysis.folderTree) ? reportData.folderAnalysis.folderTree : [];
                } else if (reportData.folderTree) {
                    array = Array.isArray(reportData.folderTree) ? reportData.folderTree : [];
                } else {
                    array = [];
                }
            } else if (arrayName === 'criticalIssues') {
                // File Share critical issues
                if (reportData.folderAnalysis && reportData.folderAnalysis.summary && reportData.folderAnalysis.summary.criticalIssues) {
                    array = Array.isArray(reportData.folderAnalysis.summary.criticalIssues) ? reportData.folderAnalysis.summary.criticalIssues : [];
                } else if (reportData.criticalIssues) {
                    array = Array.isArray(reportData.criticalIssues) ? reportData.criticalIssues : [];
                } else {
                    array = [];
                }
            } else if (arrayName === 'warningIssues') {
                // File Share warning issues
                if (reportData.folderAnalysis && reportData.folderAnalysis.summary && reportData.folderAnalysis.summary.warningIssues) {
                    array = Array.isArray(reportData.folderAnalysis.summary.warningIssues) ? reportData.folderAnalysis.summary.warningIssues : [];
                } else if (reportData.warningIssues) {
                    array = Array.isArray(reportData.warningIssues) ? reportData.warningIssues : [];
                } else {
                    array = [];
                }
            } else if (arrayName === 'shareEnumeration') {
                // File Share SMB shares enumeration
                if (reportData.shareEnumeration && Array.isArray(reportData.shareEnumeration)) {
                    array = reportData.shareEnumeration;
                } else if (reportData.folderAnalysis && reportData.folderAnalysis.shareEnumeration && Array.isArray(reportData.folderAnalysis.shareEnumeration)) {
                    array = reportData.folderAnalysis.shareEnumeration;
                } else {
                    array = [];
                }
            } else if (arrayName === 'groupsWithAccess') {
                // File Share groups with folder access
                array = Array.isArray(reportData.groupsWithAccess) ? reportData.groupsWithAccess : [];
            } else if (arrayName === 'usersWithAccess') {
                // File Share users with folder access
                array = Array.isArray(reportData.usersWithAccess) ? reportData.usersWithAccess : [];
            } else if (arrayName === 'group.rights' || arrayName === 'user.rights') {
                // Nested rights loop within groups/users
                const parentItem = reportData.group || reportData.user;
                if (parentItem && Array.isArray(parentItem.rights)) {
                    // Convert strings to objects with 'right' property for template access
                    array = parentItem.rights.map(right => typeof right === 'string' ? { right } : right);
                } else {
                    array = [];
                }
            } else if (arrayName === 'group.folders' || arrayName === 'user.folders') {
                // Nested folders loop within groups/users
                const parentItem = reportData.group || reportData.user;
                if (parentItem && Array.isArray(parentItem.folders)) {
                    array = parentItem.folders;
                } else {
                    array = [];
                }
            } else if (arrayName === 'share.redFlags') {
                // Nested red flags loop within shares
                const parentItem = reportData.share;
                if (parentItem && Array.isArray(parentItem.redFlags)) {
                    array = parentItem.redFlags.map(flag => {
                        if (typeof flag === 'string') {
                            return { redFlag: flag };
                        } else if (flag && typeof flag === 'object') {
                            return { redFlag: flag.redFlag || flag.message || flag.text || flag.description || JSON.stringify(flag) };
                        }
                        return { redFlag: String(flag) };
                    });
                } else {
                    array = [];
                }
            } else if (arrayName === 'hosts' && reportData.hosts) {
                array = reportData.hosts;
            } else if (arrayName === 'vms') {
                array = this.extractAllVMs(reportData.hosts || []);
            } else if (arrayName === 'disks' && reportData.hosts) {
                array = reportData.hosts.flatMap(host => host.disks || []);
            } else if (arrayName === 'volumes' && reportData.hosts) {
                array = reportData.hosts.flatMap(host => host.volumes || []);
            } else if (arrayName === 'adapters' && reportData.hosts) {
                array = reportData.hosts.flatMap(host => host.networkAdapters || []);
            } else if (arrayName === 'networks' && reportData.hosts) {
                // Alias for networkAdapters - allows {{#each networks}} instead of {{#each host.networkAdapters}}
                array = reportData.hosts.flatMap(host => host.networkAdapters || []);
            } else if (arrayName === 'vswitches' && reportData.hosts) {
                array = reportData.hosts.flatMap(host => host.virtualSwitches || []);
            } else if (arrayName === 'serverRoles' && reportData.hosts) {
                array = reportData.hosts.flatMap(host => host.serverRoles || []);
            } else if (arrayName === 'windowsUpdates' && reportData.hosts) {
                array = reportData.hosts.flatMap(host => host.windowsUpdates || []);
            } else if (arrayName === 'localUsers' && reportData.hosts) {
                array = reportData.hosts.flatMap(host => host.localUsers || []);
            } else if (arrayName === 'localGroups' && reportData.hosts) {
                array = reportData.hosts.flatMap(host => host.localGroups || []);
            } else if (arrayName === 'multipathIODisks' && reportData.hosts) {
                array = reportData.hosts.flatMap(host => (host.multipathIODisks || []));
            } else if (arrayName === 'migrationNetworks' && reportData.hosts) {
                array = reportData.hosts.flatMap(host => (host.liveMigration?.networks || []));
            } else if (arrayName === 'quorumDisks') {
                // Check multiple possible locations for quorum disks
                let quorumDisksArray = reportData.quorumDisks || 
                                      reportData.clusterInfo?.quorumDisks || 
                                      (reportData.clusterInfo && reportData.clusterInfo.quorumDisks) ||
                                      [];
                
                array = quorumDisksArray.map(qd => {
                    // Format quorum disk sizes
                    // Quorum disk sizes are typically stored in GB (as numbers or strings)
                    let diskSizeRaw = qd.diskSize || qd.totalSize || qd.size || 0;
                    // Free space (sizeRemaining) is the most reliable value from PowerShell
                    // This comes from the volume's SizeRemaining property
                    let diskFreeSpaceRaw = qd.sizeRemaining || qd.diskFreeSpace || qd.freeSpace || qd.unallocated || qd.free || 0;
                    // Allocated size from PowerShell is the allocated space on the physical disk (partitions)
                    // But "Used" should be calculated as Size - Free Space (sizeRemaining) for volume usage
                    let diskAllocatedSizeRaw = qd.diskAllocatedSize || qd.allocatedSize || qd.allocated || qd.used || 0;
                    
                    // Store original values for percentage calculation
                    let diskSizeBytes = 0;
                    let diskAllocatedSizeBytes = 0;
                    
                    // Handle object format { value: X, unit: 'GB' }
                    if (typeof diskSizeRaw === 'object' && diskSizeRaw !== null && diskSizeRaw.value !== undefined) {
                        if (diskSizeRaw.unit === 'GB' || diskSizeRaw.unit === 'gb') {
                            diskSizeBytes = diskSizeRaw.value * 1024 * 1024 * 1024; // Convert GB to bytes
                        } else {
                            diskSizeBytes = diskSizeRaw.value;
                        }
                    }
                    // Handle string format "X GB" or "X.XX GB"
                    else if (typeof diskSizeRaw === 'string') {
                        if (diskSizeRaw.includes('GB') || diskSizeRaw.includes('gb')) {
                            const match = diskSizeRaw.match(/([\d.]+)/);
                            if (match) {
                                diskSizeBytes = parseFloat(match[1]) * 1024 * 1024 * 1024; // Convert GB to bytes
                            } else {
                                diskSizeBytes = this.parseMemoryValue(diskSizeRaw);
                            }
                        } else {
                            diskSizeBytes = this.parseMemoryValue(diskSizeRaw);
                        }
                    }
                    // Handle number - if it's less than 1000, assume it's GB, otherwise assume bytes
                    else if (typeof diskSizeRaw === 'number') {
                        if (diskSizeRaw < 1000 && diskSizeRaw > 0) {
                            diskSizeBytes = diskSizeRaw * 1024 * 1024 * 1024; // Convert GB to bytes
                        } else {
                            diskSizeBytes = diskSizeRaw; // Already in bytes
                        }
                    } else {
                        diskSizeBytes = this.parseMemoryValue(diskSizeRaw);
                    }
                    
                    // Same logic for allocated size
                    if (typeof diskAllocatedSizeRaw === 'object' && diskAllocatedSizeRaw !== null && diskAllocatedSizeRaw.value !== undefined) {
                        if (diskAllocatedSizeRaw.unit === 'GB' || diskAllocatedSizeRaw.unit === 'gb') {
                            diskAllocatedSizeBytes = diskAllocatedSizeRaw.value * 1024 * 1024 * 1024;
                        } else {
                            diskAllocatedSizeBytes = diskAllocatedSizeRaw.value;
                        }
                    } else if (typeof diskAllocatedSizeRaw === 'string') {
                        if (diskAllocatedSizeRaw.includes('GB') || diskAllocatedSizeRaw.includes('gb')) {
                            const match = diskAllocatedSizeRaw.match(/([\d.]+)/);
                            if (match) {
                                diskAllocatedSizeBytes = parseFloat(match[1]) * 1024 * 1024 * 1024;
                            } else {
                                diskAllocatedSizeBytes = this.parseMemoryValue(diskAllocatedSizeRaw);
                            }
                        } else {
                            diskAllocatedSizeBytes = this.parseMemoryValue(diskAllocatedSizeRaw);
                        }
                    } else if (typeof diskAllocatedSizeRaw === 'number') {
                        if (diskAllocatedSizeRaw < 1000 && diskAllocatedSizeRaw > 0) {
                            diskAllocatedSizeBytes = diskAllocatedSizeRaw * 1024 * 1024 * 1024;
                        } else {
                            diskAllocatedSizeBytes = diskAllocatedSizeRaw; // Already in bytes
                        }
                    } else {
                        diskAllocatedSizeBytes = this.parseMemoryValue(diskAllocatedSizeRaw);
                    }
                    
                    // Parse free space if provided directly
                    let diskFreeSpaceBytes = 0;
                    if (diskFreeSpaceRaw && diskFreeSpaceRaw !== 0) {
                        if (typeof diskFreeSpaceRaw === 'object' && diskFreeSpaceRaw !== null && diskFreeSpaceRaw.value !== undefined) {
                            if (diskFreeSpaceRaw.unit === 'GB' || diskFreeSpaceRaw.unit === 'gb') {
                                diskFreeSpaceBytes = diskFreeSpaceRaw.value * 1024 * 1024 * 1024;
                            } else {
                                diskFreeSpaceBytes = diskFreeSpaceRaw.value;
                            }
                        } else if (typeof diskFreeSpaceRaw === 'string') {
                            if (diskFreeSpaceRaw.includes('GB') || diskFreeSpaceRaw.includes('gb')) {
                                const match = diskFreeSpaceRaw.match(/([\d.]+)/);
                                if (match) {
                                    diskFreeSpaceBytes = parseFloat(match[1]) * 1024 * 1024 * 1024;
                                } else {
                                    diskFreeSpaceBytes = this.parseMemoryValue(diskFreeSpaceRaw);
                                }
                            } else {
                                diskFreeSpaceBytes = this.parseMemoryValue(diskFreeSpaceRaw);
                            }
                        } else if (typeof diskFreeSpaceRaw === 'number') {
                            if (diskFreeSpaceRaw < 1000 && diskFreeSpaceRaw > 0) {
                                diskFreeSpaceBytes = diskFreeSpaceRaw * 1024 * 1024 * 1024;
                            } else {
                                diskFreeSpaceBytes = diskFreeSpaceRaw;
                            }
                        } else {
                            diskFreeSpaceBytes = this.parseMemoryValue(diskFreeSpaceRaw);
                        }
                    }
                    
                    // For quorum disks, "Used" should be calculated from size - free space (sizeRemaining)
                    // diskAllocatedSize from PowerShell is the allocated space on the physical disk (partitions)
                    // But "Used" in the context of storage typically means used space on the volume
                    // So we calculate Used = Size - Free Space (sizeRemaining)
                    
                    // Priority: Always use sizeRemaining if available (most accurate for volume usage)
                    // If sizeRemaining was not parsed yet, try to parse it directly from qd.sizeRemaining
                    if (diskFreeSpaceBytes === 0 && qd.sizeRemaining !== undefined && qd.sizeRemaining !== null && qd.sizeRemaining !== 0) {
                        let sizeRemainingBytes = 0;
                        if (typeof qd.sizeRemaining === 'number') {
                            if (qd.sizeRemaining < 1000 && qd.sizeRemaining > 0) {
                                sizeRemainingBytes = qd.sizeRemaining * 1024 * 1024 * 1024;
                            } else {
                                sizeRemainingBytes = qd.sizeRemaining;
                            }
                        } else if (typeof qd.sizeRemaining === 'string') {
                            sizeRemainingBytes = this.parseMemoryValue(qd.sizeRemaining);
                        }
                        if (sizeRemainingBytes > 0) {
                            diskFreeSpaceBytes = sizeRemainingBytes;
                        }
                    }
                    
                    // Calculate "Used" as Size - Free Space (this is what users expect to see)
                    // This gives us the actual used space on the volume, not just allocated partitions
                    if (diskSizeBytes > 0) {
                        if (diskFreeSpaceBytes > 0) {
                            // If we have free space (sizeRemaining), calculate used as size - free
                            diskAllocatedSizeBytes = diskSizeBytes - diskFreeSpaceBytes;
                        } else if (diskAllocatedSizeBytes > 0) {
                            // If we don't have free space but have allocated, calculate free from allocated
                            diskFreeSpaceBytes = diskSizeBytes - diskAllocatedSizeBytes;
                        }
                    }
                    
                    // Ensure values are non-negative
                    if (diskFreeSpaceBytes < 0) diskFreeSpaceBytes = 0;
                    if (diskAllocatedSizeBytes < 0) diskAllocatedSizeBytes = 0;
                    if (diskAllocatedSizeBytes > diskSizeBytes) diskAllocatedSizeBytes = diskSizeBytes;
                    
                    // Calculate percentages (based on total disk size)
                    const sizePercent = diskSizeBytes > 0 ? ((diskSizeBytes / diskSizeBytes) * 100).toFixed(1) : '0.0';
                    const allocatedPercent = diskSizeBytes > 0 ? ((diskAllocatedSizeBytes / diskSizeBytes) * 100).toFixed(1) : '0.0';
                    const freePercent = diskSizeBytes > 0 ? ((diskFreeSpaceBytes / diskSizeBytes) * 100).toFixed(1) : '0.0';
                    
                    // Return all properties, including all original properties and calculated ones
                    return {
                        ...qd, // Include all original properties
                        // Size properties (formatted)
                        diskSize: this.formatBytes(diskSizeBytes),
                        diskAllocatedSize: this.formatBytes(diskAllocatedSizeBytes),
                        diskFreeSpace: this.formatBytes(diskFreeSpaceBytes),
                        // Size properties (raw bytes for calculations)
                        diskSizeBytes: diskSizeBytes,
                        diskAllocatedSizeBytes: diskAllocatedSizeBytes,
                        diskFreeSpaceBytes: diskFreeSpaceBytes,
                        // Percentages
                        sizePercent: sizePercent,
                        allocatedPercent: allocatedPercent,
                        freePercent: freePercent,
                        // Alternative property names
                        size: this.formatBytes(diskSizeBytes),
                        allocated: this.formatBytes(diskAllocatedSizeBytes),
                        free: this.formatBytes(diskFreeSpaceBytes),
                        freeSpace: this.formatBytes(diskFreeSpaceBytes),
                        // Ensure these properties are available with fallbacks
                        diskFileSystem: qd.diskFileSystem || qd.fileSystem || 'N/A',
                        resourceType: qd.resourceType || qd.type || 'N/A',
                        path: qd.path || qd.diskPath || 'N/A',
                        // Use cluster resource name (not physical disk name) for display
                        // The 'name' property is the cluster resource name (e.g., "Cluster Disk 1")
                        // The 'diskFriendlyName' is the actual physical disk name (e.g., "HPE MSA 2070 FC")
                        diskFriendlyName: qd.name || qd.diskName || qd.diskFriendlyName || 'N/A',
                        // Keep physical disk name available separately if needed
                        physicalDiskName: qd.diskFriendlyName || qd.diskName || 'N/A',
                        // Ensure all other properties are available
                        diskNumber: qd.diskNumber || qd.number || null,
                        diskSerialNumber: qd.diskSerialNumber || qd.serialNumber || qd.serial || null,
                        diskOperationalStatus: qd.diskOperationalStatus || qd.status || qd.state || 'N/A',
                        ownerNode: qd.ownerNode || qd.owner || 'N/A',
                        diskBusType: qd.diskBusType || qd.busType || 'N/A',
                        uniqueId: qd.uniqueId || qd.id || null,
                        diskPartitionStyle: qd.diskPartitionStyle || qd.partitionStyle || 'N/A'
                    };
                });
            } else if (arrayName === 'csvs' && reportData.clusterSharedVolumes) {
                array = reportData.clusterSharedVolumes.map(csv => {
                    // Calculate sizes for CSV - CSV sizes are typically in GB (as floats)
                    // Match the auditor's approach: parseFloat for direct GB values
                    let size = parseFloat(csv.size) || 0;
                    let sizeRemaining = parseFloat(csv.sizeRemaining) || 0;
                    
                    // If size is 0, try alternative properties
                    if (size === 0 && csv.totalSize) {
                        size = parseFloat(csv.totalSize) || 0;
                    }
                    if (sizeRemaining === 0 && csv.free) {
                        sizeRemaining = parseFloat(csv.free) || 0;
                    }
                    if (sizeRemaining === 0 && csv.freeSpace) {
                        sizeRemaining = parseFloat(csv.freeSpace) || 0;
                    }
                    
                    // If still 0, try parsing as memory values (bytes)
                    if (size === 0) {
                        size = this.parseMemoryValue(csv.size || csv.totalSize || 0);
                        // Convert bytes to GB for display
                        size = size / (1024 * 1024 * 1024);
                    }
                    if (sizeRemaining === 0) {
                        sizeRemaining = this.parseMemoryValue(csv.sizeRemaining || csv.free || csv.freeSpace || 0);
                        // Convert bytes to GB for display
                        sizeRemaining = sizeRemaining / (1024 * 1024 * 1024);
                    }
                    
                    // Calculate used
                    const used = size > 0 ? (size - sizeRemaining) : 0;
                    const usedPercent = size > 0 ? ((used / size) * 100).toFixed(1) : '0.0';
                    const freePercent = size > 0 ? ((sizeRemaining / size) * 100).toFixed(1) : '100.0';
                    
                    return {
                        ...csv,
                        size: `${size.toFixed(2)} GB`,
                        used: `${used.toFixed(2)} GB`,
                        free: `${sizeRemaining.toFixed(2)} GB`,
                        usedPercent: usedPercent,
                        freePercent: freePercent
                    };
                });
            } else if (arrayName === 'users' && reportData.hosts) {
                array = reportData.hosts.flatMap(host => host.localUsers || []);
            } else if (arrayName === 'groups' && reportData.hosts) {
                array = reportData.hosts.flatMap(host => host.localGroups || []);
            } else if (arrayName === 'roles' && reportData.hosts) {
                array = reportData.hosts.flatMap(host => host.serverRoles || []);
            } else if (arrayName === 'updates' && reportData.hosts) {
                array = reportData.hosts.flatMap(host => host.windowsUpdates || []);
            } else if (arrayName.endsWith('.extensions')) {
                // Handle nested arrays like vswitch.extensions
                const parentParts = arrayName.split('.');
                const parentName = parentParts[0]; // vswitch
                const childName = parentParts[1]; // extensions
                
                // We need to find the parent object in the current context
                if (reportData[parentName]) {
                    // Direct access if parent is in context
                    array = reportData[parentName][childName] || [];
                } else if (reportData.currentHost) {
                    // Try to find it via currentHost -> virtualSwitches
                    // This is complex because we don't know WHICH vswitch we are in
                    // But typically this is handled by recursive calls where the vswitch IS the context item
                    if (reportData.extensions) {
                        array = reportData.extensions;
                    }
                }
            }
            
            // If array is empty, check if we can resolve it from the context item
            if ((!array || array.length === 0) && arrayName.includes('.')) {
                 const parts = arrayName.split('.');
                 let obj = reportData;
                 for (const part of parts) {
                     if (obj && typeof obj === 'object') {
                         obj = obj[part];
                     } else {
                         obj = null;
                         break;
                     }
                 }
                 if (Array.isArray(obj)) {
                     array = obj;
                 }
            }

            // MPIO Logic - Populate if missing but paths exist in parent
            // Sometimes MPIO paths are available but not aggregated into disks
            if (arrayName === 'multipathIODisks' && array.length === 0) {
                // Check if we can find paths in the current host
                const host = reportData.currentHost || reportData.host;
                if (host && host.multipathIO && host.multipathIO.paths && Array.isArray(host.multipathIO.paths)) {
                    // We found flat paths, we need to adapt them to be "disks" for the template
                    // Group paths by disk number or ID
                    const diskMap = new Map();
                    
                    host.multipathIO.paths.forEach(path => {
                        const diskId = path.diskNumber !== undefined ? `Disk ${path.diskNumber}` : (path.instanceName || 'Unknown');
                        
                        if (!diskMap.has(diskId)) {
                            diskMap.set(diskId, {
                                name: `${path.vendorId || ''} ${path.productId || ''}`.trim() || diskId,
                                diskId: diskId,
                                pathCount: 0,
                                loadBalancePolicy: path.policy || 'N/A', // Assuming policy might be here
                                dsmName: path.dsmName || 'N/A',
                                paths: []
                            });
                        }
                        
                        const disk = diskMap.get(diskId);
                        disk.pathCount++;
                        // If policy/dsm is available on path level, use it
                        if (path.policy && disk.loadBalancePolicy === 'N/A') disk.loadBalancePolicy = path.policy;
                        if (path.dsmName && disk.dsmName === 'N/A') disk.dsmName = path.dsmName;
                        
                        // Add path details
                        disk.paths.push({
                            id: path.pathId || `Path ${disk.pathCount}`,
                            state: path.state || 'Active', // Default to Active if not specified
                            scsiAddress: path.scsiAddress || 'N/A'
                        });
                    });
                    
                    array = Array.from(diskMap.values());
                }
            }

            // If array is empty, remove the loop entirely
            if (array.length === 0) {
                // Escape special regex characters in fullMatch for safe replacement
                const escapedMatch = fullMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                result = result.replace(new RegExp(escapedMatch, 'g'), '');
                continue;
            }

            // Process each item in the array
            array.forEach((originalItem, index) => {
                // Handle case where item might be a string (for issues)
                // Convert string to object BEFORE any property access
                let item = originalItem;
                if ((arrayName === 'criticalIssues' || arrayName === 'warningIssues') && typeof originalItem === 'string') {
                    // Convert string to object for issues
                    item = {
                        level: arrayName === 'criticalIssues' ? 'Critical' : 'Warning',
                        message: originalItem,
                        folder: 'N/A',
                        type: 'N/A'
                    };
                }
                
                let itemContent = loopTemplate;
                
                // Replace item properties (e.g., {{host.name}} or {{vm.name}})
                // Improved logic to determine prefix from arrayName
                let prefix = arrayName.slice(0, -1); // Default singularization (hosts -> host)
                
                // Custom mapping for known arrays to match template variable names
                if (arrayName.startsWith('host.')) {
                    const propName = arrayName.split('.')[1];
                    if (propName === 'serverRoles') prefix = 'role';
                    else if (propName === 'windowsUpdates') prefix = 'update';
                    else if (propName === 'disks') prefix = 'disk';
                    else if (propName === 'volumes') prefix = 'volume';
                    else if (propName === 'networkAdapters') prefix = 'adapter';
                    else if (propName === 'virtualSwitches') prefix = 'vswitch';
                    else if (propName === 'localUsers') prefix = 'user';
                    else if (propName === 'localGroups') prefix = 'group';
                    else if (propName === 'vms') prefix = 'vm';
                    else if (propName === 'multipathIODisks') prefix = 'mpioDisk';
                    else if (propName === 'migrationNetworks') prefix = 'migrationNetwork';
                    // Fallback for others: remove 's'
                    else if (propName.endsWith('s')) prefix = propName.slice(0, -1);
                    else prefix = propName;
                } else if (arrayName === 'vswitch.extensions') {
                    prefix = 'extension';
                } else if (arrayName === 'group.rights' || arrayName === 'user.rights') {
                    prefix = 'right';
                } else if (arrayName === 'group.folders' || arrayName === 'user.folders') {
                    prefix = 'folder';
                } else if (arrayName === 'groupsWithAccess') {
                    prefix = 'group';
                } else if (arrayName === 'usersWithAccess') {
                    prefix = 'user';
                }
                
                // Store current item context for nested loops
                const savedCurrentHost = reportData.currentHost;
                if (arrayName === 'hosts') {
                    // CRITICAL: Only initialize arrays/objects if they don't exist
                    // DO NOT overwrite existing data - the actual data is already in item
                    // This ensures nested loops can find the data without overwriting it
                    if (!item.serverRoles) item.serverRoles = [];
                    if (!item.windowsUpdates) item.windowsUpdates = [];
                    if (!item.disks) item.disks = [];
                    if (!item.volumes) item.volumes = [];
                    if (!item.networkAdapters) item.networkAdapters = [];
                    if (!item.virtualSwitches) item.virtualSwitches = [];
                    if (!item.localUsers) item.localUsers = [];
                    if (!item.localGroups) item.localGroups = [];
                    if (!item.vms) item.vms = [];
                    if (!item.multipathIO) item.multipathIO = {};
                    if (!item.liveMigration) item.liveMigration = {};
                    if (!item.multipathIODisks) item.multipathIODisks = [];
                    if (!item.hardware) item.hardware = {};
                    
                    // Fix for Server Roles - normalize installed status
                    if (item.serverRoles && Array.isArray(item.serverRoles)) {
                        item.serverRoles.forEach(role => {
                            // Ensure installed is a boolean
                            if (role.installed === undefined) {
                                role.installed = role.installState === 'Installed' || role.installState === 1;
                            }
                            // Ensure display name
                            if (!role.displayName) role.displayName = role.name;
                        });
                    }

                    // Fix for Host Networks - ensure all fields are available
                    if (item.networkAdapters && Array.isArray(item.networkAdapters)) {
                        item.networkAdapters.forEach(adapter => {
                            // Ensure DHCP enabled string
                            adapter.dhcpEnabledStr = adapter.dhcpEnabled ? 'Enabled' : 'Disabled';
                            // Ensure DHCP enabled is boolean
                            if (adapter.dhcpEnabled === undefined || adapter.dhcpEnabled === null) {
                                adapter.dhcpEnabled = false;
                            }
                            // Ensure subnetMask, defaultGateway are strings
                            if (!adapter.subnetMask) adapter.subnetMask = 'Unknown';
                            if (!adapter.defaultGateway) adapter.defaultGateway = 'Unknown';
                            // Ensure dnsServers is formatted as string if array
                            if (Array.isArray(adapter.dnsServers) && adapter.dnsServers.length > 0) {
                                adapter.dnsServers = adapter.dnsServers.join(', ');
                            } else if (!adapter.dnsServers || adapter.dnsServers === '') {
                                adapter.dnsServers = 'Unknown';
                            }
                            // Ensure vlanMode is set (default to 'Untagged' if not set)
                            if (!adapter.vlanMode) {
                                adapter.vlanMode = 'Untagged';
                            }
                            // Ensure vlanId is set
                            if (adapter.vlanId === undefined || adapter.vlanId === null) {
                                adapter.vlanId = 0;
                            }
                            // Ensure isVirtual is boolean
                            if (adapter.isVirtual === undefined || adapter.isVirtual === null) {
                                adapter.isVirtual = false;
                            }
                            // Ensure virtualSwitch is string
                            if (!adapter.virtualSwitch) adapter.virtualSwitch = 'N/A';
                            // Ensure interfaceDescription is string
                            if (!adapter.interfaceDescription) adapter.interfaceDescription = adapter.interfaceName || 'Unknown';
                            // Ensure teaming fields are set
                            if (adapter.isTeamed === undefined || adapter.isTeamed === null) {
                                adapter.isTeamed = false;
                            }
                            if (!adapter.teamName) adapter.teamName = 'N/A';
                            if (!adapter.teamLoadBalancingAlgorithm) adapter.teamLoadBalancingAlgorithm = 'N/A';
                            if (!adapter.teamTeamingMode) adapter.teamTeamingMode = 'N/A';
                            if (!adapter.teamStatus) adapter.teamStatus = 'N/A';
                            // Ensure SET fields are set
                            if (adapter.isSET === undefined || adapter.isSET === null) {
                                adapter.isSET = false;
                            }
                            if (!adapter.setSwitchName) adapter.setSwitchName = 'N/A';
                            if (!adapter.setLoadBalancingAlgorithm) adapter.setLoadBalancingAlgorithm = 'N/A';
                        });
                    }

                    // Fix for Virtual Switches - normalize extensions
                    if (item.virtualSwitches && Array.isArray(item.virtualSwitches)) {
                        item.virtualSwitches.forEach(vswitch => {
                            if (vswitch.extensions && Array.isArray(vswitch.extensions)) {
                                vswitch.extensions = vswitch.extensions.filter(ext => ext && ext.enabled);
                                if (vswitch.extensions.length === 0) {
                                    vswitch.extensions = null;
                                }
                            }
                        });
                    }

                    // CRITICAL: Set currentHost BEFORE processing nested loops
                    // This ensures nested loops can access the host's arrays
                    reportData.currentHost = item;
                    
                    // Debug: Log the actual data
                    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                        console.log(`[processLoops] Host data for ${item.name}:`, {
                            serverRoles: item.serverRoles?.length || 0,
                            disks: item.disks?.length || 0,
                            volumes: item.volumes?.length || 0,
                            networkAdapters: item.networkAdapters?.length || 0,
                            virtualSwitches: item.virtualSwitches?.length || 0,
                            localUsers: item.localUsers?.length || 0,
                            localGroups: item.localGroups?.length || 0,
                            vms: item.vms?.length || 0
                        });
                    }
                    
                    // Fix for MPIO disks - populate from paths if empty
                    // This ensures both the multipathIODisks array AND the host.multipathIO object are populated
                    if (item.multipathIO && item.multipathIO.paths && Array.isArray(item.multipathIO.paths)) {
                        
                        // Populate global MPIO config from first path if missing
                        if (!item.multipathIO.dsmName || item.multipathIO.dsmName === 'N/A') {
                             const firstPath = item.multipathIO.paths[0];
                             if (firstPath) {
                                 // Try to find DSM name or policy on the path
                                 if (firstPath.dsmName && firstPath.dsmName !== 'N/A') {
                                     item.multipathIO.dsmName = firstPath.dsmName;
                                 } else if (firstPath.policy && firstPath.policy !== 'N/A') {
                                     // Fallback to using Policy name if DSM name is missing (e.g. Round Robin)
                                     item.multipathIO.dsmName = firstPath.policy;
                                 } else if (firstPath.loadBalancePolicyId !== undefined) {
                                     // Fallback to mapped policy ID
                                     const policies = ['Failover', 'Round Robin', 'Round Robin with Subset', 'Least Queue Depth', 'Weighted Paths', 'Least Blocks'];
                                     item.multipathIO.dsmName = policies[firstPath.loadBalancePolicyId] || 'Round Robin';
                                 }
                             }
                        }
                        
                        // Check if we have timerValues directly on multipathIO
                        // HyperVAuditor.js uses direct properties like loadBalancePolicy, pathVerificationPeriod, retryCount, retryInterval
                        // We should map these to our timerValues structure if they exist
                        if (!item.multipathIO.timerValues) {
                             item.multipathIO.timerValues = {};
                        }
                        
                        if (item.multipathIO.retryCount) item.multipathIO.timerValues.retryCount = item.multipathIO.retryCount;
                        if (item.multipathIO.retryInterval) item.multipathIO.timerValues.retryInterval = item.multipathIO.retryInterval;
                        if (item.multipathIO.pathVerificationPeriod) item.multipathIO.timerValues.pathVerificationPeriod = item.multipathIO.pathVerificationPeriod;
                        
                        // Populate multipathIODisks if empty
                        if (!item.multipathIODisks || item.multipathIODisks.length === 0) {
                            const diskMap = new Map();
                            
                            item.multipathIO.paths.forEach(path => {
                                const diskId = path.diskNumber !== undefined ? `Disk ${path.diskNumber}` : (path.instanceName || 'Unknown');
                                
                                if (!diskMap.has(diskId)) {
                                    diskMap.set(diskId, {
                                        name: `${path.vendorId || ''} ${path.productId || ''}`.trim() || diskId,
                                        diskId: diskId,
                                        diskNumber: path.diskNumber,
                                        size: path.diskSize || 0,
                                        formattedSize: path.diskSize ? `${path.diskSize} GB` : 'N/A',
                                        pathCount: path.pathCount || 0, // Initialize with existing pathCount
                                        loadBalancePolicy: path.policy || 'N/A', 
                                        dsmName: path.dsmName || item.multipathIO.dsmName || 'N/A',
                                        paths: []
                                    });
                                }
                                
                                const disk = diskMap.get(diskId);
                                
                                // Increment pathCount ONLY if the source data doesn't have it
                                // If source has pathCount, we trust it (it's likely an aggregated disk object)
                                // If source doesn't have pathCount, we count occurrences (it's a flat path list)
                                if (!path.pathCount) {
                                    disk.pathCount++;
                                } else {
                                     // If we encounter multiple entries for the same disk but they have pathCount,
                                     // we might be duplicating or merging. 
                                     // However, usually if pathCount is present, the array is already unique per disk.
                                     // But just in case, we keep the MAX pathCount seen
                                     if (path.pathCount > disk.pathCount) {
                                         disk.pathCount = path.pathCount;
                                     }
                                }

                                disk.isMultipathed = disk.pathCount > 1; 
                                
                                // Update policy if we find a valid one and current is N/A
                                if (path.policy && path.policy !== 'N/A' && disk.loadBalancePolicy === 'N/A') {
                                    disk.loadBalancePolicy = path.policy;
                                }
                                // If still N/A, try to map from LB Policy ID if available
                                if (disk.loadBalancePolicy === 'N/A' && path.loadBalancePolicyId !== undefined) {
                                    const policies = ['Failover', 'Round Robin', 'Round Robin with Subset', 'Least Queue Depth', 'Weighted Paths', 'Least Blocks'];
                                    disk.loadBalancePolicy = policies[path.loadBalancePolicyId] || 'Round Robin'; 
                                }
                                
                                if (path.dsmName && disk.dsmName === 'N/A') disk.dsmName = path.dsmName;
                                
                                disk.paths.push({
                                    id: path.pathId || `Path ${disk.paths.length + 1}`,
                                    state: path.state || (path.stateId === 4 ? 'Standby' : 'Active'), 
                                    scsiAddress: path.scsiAddress || 'N/A'
                                });
                            });
                            
                            item.multipathIODisks = Array.from(diskMap.values());
                        }
                    }

                    // Enhance host item with formatted memory and isClustered
                    // Always format memory values - check multiple possible locations
                    let totalMem = item.totalMemory || item.memory?.total || 0;
                    let usedMem = item.usedMemory || item.memory?.used || 0;
                    let freeMem = item.freeMemory || item.memory?.free || 0;
                    let freeMemPercent = item.freeMemoryPercent || item.memory?.freePercent || 0;
                    
                    // Handle object format { value: X, unit: 'GB' }
                    if (typeof totalMem === 'object' && totalMem !== null && totalMem.value !== undefined) {
                        if (totalMem.unit === 'GB' || totalMem.unit === 'gb') {
                            totalMem = totalMem.value * 1024 * 1024 * 1024; // Convert GB to bytes
                        } else {
                            totalMem = totalMem.value;
                        }
                    } else if (typeof totalMem === 'number' && totalMem < 1000) {
                        // If it's a number less than 1000, assume it's GB
                        totalMem = totalMem * 1024 * 1024 * 1024;
                    } else if (typeof totalMem === 'string' && (totalMem.includes('GB') || totalMem.includes('gb'))) {
                        // Already formatted string, parse it
                        const match = totalMem.match(/([\d.]+)/);
                        if (match) {
                            totalMem = parseFloat(match[1]) * 1024 * 1024 * 1024;
                        } else {
                            totalMem = this.parseMemoryValue(totalMem);
                        }
                    } else {
                        totalMem = this.parseMemoryValue(totalMem);
                    }
                    
                    if (typeof usedMem === 'object' && usedMem !== null && usedMem.value !== undefined) {
                        if (usedMem.unit === 'GB' || usedMem.unit === 'gb') {
                            usedMem = usedMem.value * 1024 * 1024 * 1024;
                        } else {
                            usedMem = usedMem.value;
                        }
                    } else if (typeof usedMem === 'number' && usedMem < 1000) {
                        usedMem = usedMem * 1024 * 1024 * 1024;
                    } else if (typeof usedMem === 'string' && (usedMem.includes('GB') || usedMem.includes('gb'))) {
                        const match = usedMem.match(/([\d.]+)/);
                        if (match) {
                            usedMem = parseFloat(match[1]) * 1024 * 1024 * 1024;
                        } else {
                            usedMem = this.parseMemoryValue(usedMem);
                        }
                    } else {
                        usedMem = this.parseMemoryValue(usedMem);
                    }
                    
                    if (typeof freeMem === 'object' && freeMem !== null && freeMem.value !== undefined) {
                        if (freeMem.unit === 'GB' || freeMem.unit === 'gb') {
                            freeMem = freeMem.value * 1024 * 1024 * 1024;
                        } else {
                            freeMem = freeMem.value;
                        }
                    } else if (typeof freeMem === 'number' && freeMem < 1000) {
                        freeMem = freeMem * 1024 * 1024 * 1024;
                    } else if (typeof freeMem === 'string' && (freeMem.includes('GB') || freeMem.includes('gb'))) {
                        const match = freeMem.match(/([\d.]+)/);
                        if (match) {
                            freeMem = parseFloat(match[1]) * 1024 * 1024 * 1024;
                        } else {
                            freeMem = this.parseMemoryValue(freeMem);
                        }
                    } else {
                        freeMem = this.parseMemoryValue(freeMem);
                    }
                    
                    // Format memory values (now in bytes)
                    item.totalMemory = this.formatBytes(totalMem);
                    item.usedMemory = this.formatBytes(usedMem);
                    item.freeMemory = this.formatBytes(freeMem);
                    item.freeMemoryPercent = freeMemPercent;
                    
                    // Ensure hardware object exists and has proper structure
                    if (!item.hardware) {
                        item.hardware = {};
                    }
                    // Ensure processor object exists
                    if (!item.processor) {
                        item.processor = {};
                    }
                    
                    // If hardware is an object but missing manufacturer/model, try to get from host
                    // Check multiple possible locations for manufacturer/model
                    if (!item.hardware.manufacturer || item.hardware.manufacturer === 'N/A' || item.hardware.manufacturer === '') {
                        item.hardware.manufacturer = item.manufacturer || item.hardware?.manufacturer || null;
                    }
                    if (!item.hardware.model || item.hardware.model === 'N/A' || item.hardware.model === '') {
                        item.hardware.model = item.model || item.hardware?.model || null;
                    }
                    // Format manufacturer/model for display - combine them properly
                    if (!item.hardware.manufacturer || item.hardware.manufacturer === 'N/A' || item.hardware.manufacturer === '') {
                        item.hardware.manufacturer = 'N/A';
                    }
                    if (!item.hardware.model || item.hardware.model === 'N/A' || item.hardware.model === '') {
                        item.hardware.model = null; // Set to null so conditional can handle it
                    }
                    // Create a combined display value
                    if (item.hardware.manufacturer && item.hardware.manufacturer !== 'N/A') {
                        if (item.hardware.model && item.hardware.model !== 'N/A') {
                            item.hardware.manufacturerModel = `${item.hardware.manufacturer}, ${item.hardware.model}`;
                        } else {
                            item.hardware.manufacturerModel = item.hardware.manufacturer;
                        }
                    } else {
                        item.hardware.manufacturerModel = 'N/A';
                    }
                    
                    // Populate processor model if missing
                    if (!item.processor.model || item.processor.model === 'N/A' || item.processor.model === '') {
                        item.processor.model = item.processor.name || 'N/A';
                    }
                    
                    // Ensure operating system info
                    item.os = item.os || {};
                    item.osName = item.osProductName || item.osName || item.os?.name || 'Unknown';
                    item.osVersion = item.osDisplayVersion || item.osVersion || item.os?.version || 'Unknown';
                    item.osBuild = item.osCurrentBuild || item.osBuildNumber || item.os?.build || 'Unknown';
                    item.osEdition = item.osEditionID || item.osEdition || item.os?.edition || 'Unknown';
                    
                    // Ensure license info
                    item.windowsActivation = item.windowsActivation || {};
                    item.licenseStatus = item.windowsActivation.licenseStatus || item.licenseStatus || 'Unknown';
                    item.licenseKey = item.windowsActivation.productKey || item.windowsActivation.partialProductKey || item.licenseKey || 'Unknown';
                    item.activationStatus = item.windowsActivation.status || item.activationStatus || item.licenseStatus || 'Unknown';
                    
                    // Ensure processor core count
                    // Check multiple possible locations for cores
                    if (!item.processor.cores) {
                        if (item.numberOfCores) {
                            item.processor.cores = item.numberOfCores;
                        } else if (item.processor.numberOfCores) {
                            item.processor.cores = item.processor.numberOfCores;
                        } else {
                            // Try to parse from processor name if it contains "(X cores)"
                            const nameMatch = (item.processor.name || '').match(/\((\d+)\s+cores\)/i);
                            if (nameMatch) {
                                item.processor.cores = parseInt(nameMatch[1], 10);
                            } else {
                                item.processor.cores = 'N/A';
                            }
                        }
                    }
                    
                    // Calculate virtual memory (sum of VM memory on this host)
                    let totalVmMemory = 0;
                    let usedVmMemory = 0;
                    if (item.vms && Array.isArray(item.vms)) {
                        item.vms.forEach(vm => {
                            // Parse VM memory startup value
                            let vmMem = 0;
                            if (vm.memory?.startup) {
                                const memStr = vm.memory.startup.toString();
                                const memMatch = memStr.match(/([\d.]+)\s*GB/i);
                                if (memMatch) {
                                    vmMem = parseFloat(memMatch[1]);
                                } else {
                                    vmMem = this.parseMemoryValue(memStr) / (1024 * 1024 * 1024); // Convert bytes to GB
                                }
                            } else if (vm.memoryStartup) {
                                const memStr = vm.memoryStartup.toString();
                                const memMatch = memStr.match(/([\d.]+)\s*GB/i);
                                if (memMatch) {
                                    vmMem = parseFloat(memMatch[1]);
                                } else {
                                    vmMem = this.parseMemoryValue(memStr) / (1024 * 1024 * 1024);
                                }
                            }
                            totalVmMemory += vmMem;
                            // Used memory is the same as total for VMs (startup memory)
                            usedVmMemory += vmMem;
                        });
                    }
                    // Add virtual memory to item
                    item.totalVmMemory = totalVmMemory > 0 ? `${totalVmMemory.toFixed(2)} GB` : '0 B';
                    item.usedVmMemory = usedVmMemory > 0 ? `${usedVmMemory.toFixed(2)} GB` : '0 B';
                    
                    // Ensure totalVProc is available
                    if (!item.totalVProc && item.vms && Array.isArray(item.vms)) {
                        item.totalVProc = item.vms.reduce((sum, vm) => sum + (vm.vCPU || 0), 0);
                    }
                    
                    // Determine if host is clustered
                    // Check if clusterName exists or if host has isClustered property
                    if (item.isClustered === undefined || item.isClustered === null) {
                        item.isClustered = !!(reportData.clusterName || reportData.clusterInfo || (reportData.hosts && reportData.hosts.length > 1));
                    }
                }
                
                // Handle nested object replacement recursively
                const replaceNested = (obj, prefix, template) => {
                    let result = template;
                    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return result;
                    
                    Object.keys(obj).forEach(key => {
                        const value = obj[key];
                        const placeholder = new RegExp(`\\{\\{${prefix}\\.${key}\\}\\}`, 'g');
                        
                        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                            // Recursively handle nested objects (e.g., vm.memory.startup)
                            result = replaceNested(value, `${prefix}.${key}`, result);
                            // Also replace the nested object itself if needed
                            result = result.replace(placeholder, this.formatValue(value));
                        } else {
                            // Replace simple values
                            result = result.replace(placeholder, this.formatValue(value));
                        }
                    });
                    return result;
                };

                // Process conditionals FIRST - before any replacements
                // Create item context with the item available
                const itemContext = { ...reportData };
                
                // Add the item with its prefix (e.g., 'host' for 'hosts')
                itemContext[prefix] = item;
                
                // Also add nested properties for easier access - these are the actual items
                // This allows conditionals like {{#if quorumDisk.diskNumber}} to work
                // And match the logic we used for prefix above
                if (arrayName === 'csvs') {
                    itemContext.csv = item;
                    // Ensure csv properties are formatted
                     if (typeof item.size === 'number') item.size = this.formatBytes(item.size);
                     if (typeof item.sizeRemaining === 'number') item.sizeRemaining = this.formatBytes(item.sizeRemaining);
                     // Calculate Used
                     if (item.sizeBytes && item.sizeRemainingBytes) {
                         item.used = this.formatBytes(item.sizeBytes - item.sizeRemainingBytes);
                         item.usedBytes = item.sizeBytes - item.sizeRemainingBytes;
                     } else {
                         item.used = 'N/A';
                     }
                     // Ensure other fields
                     item.path = item.path || 'N/A';
                     item.ownerNode = item.ownerNode || 'N/A';
                     item.fileSystem = item.fileSystem || item.fileSystemLabel || 'N/A';
                     item.state = item.state || 'Unknown';
                     // Map numeric states if necessary
                     if (item.state === 1 || item.state === '1') item.state = 'Offline';
                     else if (item.state === 2 || item.state === '2') item.state = 'Online';
                     else if (item.state === 3 || item.state === '3') item.state = 'Failed';
                     
                } else if (arrayName === 'folderTree') {
                    itemContext.folder = item;
                    // Ensure folder properties are available
                    item.name = item.name || item.path || 'N/A';
                    item.path = item.path || 'N/A';
                    item.relativePath = item.relativePath || '';
                    item.fileCount = item.fileCount || 0;
                    item.totalSize = item.totalSize || '0 B';
                    item.criticalIssues = item.criticalIssues || [];
                    item.warningIssues = item.warningIssues || [];
                } else if (arrayName === 'criticalIssues' || arrayName === 'warningIssues') {
                    // Item should already be converted to object at the start of the loop
                    // But ensure issue properties are available as a safety check
                    if (typeof item === 'object' && item !== null) {
                        // Ensure issue properties are available
                        item.level = item.level || (arrayName === 'criticalIssues' ? 'Critical' : 'Warning');
                        item.message = item.message || 'N/A';
                        item.folder = item.folder || item.path || 'N/A';
                        item.type = item.type || 'N/A';
                    }
                    itemContext.issue = item;
                } else if (arrayName === 'shareEnumeration') {
                    itemContext.share = item;
                    // Ensure share properties are available
                    item.shareName = item.shareName || 'N/A';
                    // Get risk level from multiple possible sources
                    const shareRisk = item.shareRisk || item.shareRiskLevel || item.highestNTFSRisk || item.riskLevel || 'Low';
                    item.shareRisk = shareRisk;
                    // Normalize risk level (case-insensitive)
                    const normalizedRisk = typeof shareRisk === 'string' ? shareRisk.toLowerCase() : 'low';
                    item.isCriticalRisk = normalizedRisk === 'critical';
                    item.isHighRisk = normalizedRisk === 'high';
                    item.isMediumRisk = normalizedRisk === 'medium';
                    item.isLowRisk = normalizedRisk === 'low' || !shareRisk;
                    item.uncPath = item.uncPath || item.unc || 'N/A';
                    item.localPath = item.localPath || item.path || 'N/A';
                    item.hostingServer = item.hostingServer || item.server || reportData.serverName || 'N/A';
                    item.shareType = item.shareType || item.type || 'Normal';
                    item.isHiddenShare = item.shareType === 'Hidden' || item.type === 'Hidden';
                    item.isAdminShare = item.shareType === 'Admin' || item.type === 'Admin';
                    item.offlineFilesEnabled = item.offlineFilesEnabled === 'Yes' || item.offlineFilesEnabled === true || item.offlineFiles === true;
                    item.smbVersion = item.smbVersion || item.smb || 'N/A';
                    item.hasSMB1 = item.smbVersion && (item.smbVersion.includes('SMB1') || item.smbVersion.indexOf('SMB1') !== -1);
                    item.encryptData = item.encryptData === 'Yes' || item.encryptData === true || item.encryptionRequired === 'Yes' || item.encryption === true;
                    item.continuousAvailability = item.continuousAvailability === 'Yes' || item.continuousAvailability === true || item.continuousAvail === true;
                    // Handle red flags - can be array of strings or array of objects
                    item.redFlags = item.redFlags || [];
                    if (Array.isArray(item.redFlags)) {
                        item.redFlags = item.redFlags.map(flag => {
                            if (typeof flag === 'string') {
                                return { redFlag: flag };
                            } else if (flag && typeof flag === 'object') {
                                return { redFlag: flag.message || flag.text || flag.description || JSON.stringify(flag) };
                            }
                            return { redFlag: String(flag) };
                        });
                    }
                    item.hasRedFlags = item.redFlags && item.redFlags.length > 0;
                } else if (arrayName === 'share.redFlags') {
                    itemContext.redFlag = item;
                    // Ensure redFlag properties are available
                    if (typeof item === 'string') {
                        itemContext.redFlag = { redFlag: item };
                    } else if (item && typeof item === 'object') {
                        item.redFlag = item.redFlag || item.message || item.text || item.description || JSON.stringify(item);
                    }
                } else if (arrayName === 'groupsWithAccess') {
                    itemContext.group = item;
                    // Ensure group properties are available
                    item.name = item.name || 'N/A';
                    item.totalFolders = item.totalFolders || 0;
                    item.rights = item.rights || [];
                    item.rightsCount = item.rightsCount || 0;
                    item.folders = item.folders || [];
                    const highestRisk = item.highestRisk || 'Low';
                    item.highestRisk = highestRisk;
                    item.isCriticalRisk = highestRisk === 'Critical';
                    item.isHighRisk = highestRisk === 'High';
                    item.isMediumRisk = highestRisk === 'Medium';
                    item.isLowRisk = highestRisk === 'Low' || !highestRisk;
                    item.rightsDisplay = item.rightsDisplay || (item.rights && Array.isArray(item.rights) ? item.rights.join(', ') : '');
                } else if (arrayName === 'usersWithAccess') {
                    itemContext.user = item;
                    // Ensure user properties are available
                    item.name = item.name || 'N/A';
                    item.totalFolders = item.totalFolders || 0;
                    item.rights = item.rights || [];
                    item.rightsCount = item.rightsCount || 0;
                    item.folders = item.folders || [];
                    const highestRisk = item.highestRisk || 'Low';
                    item.highestRisk = highestRisk;
                    item.isCriticalRisk = highestRisk === 'Critical';
                    item.isHighRisk = highestRisk === 'High';
                    item.isMediumRisk = highestRisk === 'Medium';
                    item.isLowRisk = highestRisk === 'Low' || !highestRisk;
                    item.rightsDisplay = item.rightsDisplay || (item.rights && Array.isArray(item.rights) ? item.rights.join(', ') : '');
                } else if (arrayName === 'quorumDisks') {
                    itemContext.quorumDisk = item;
                     // Ensure quorumDisk properties are formatted (already handled in previous block but good to double check)
                     // Ensure other fields
                     item.path = item.path || 'N/A';
                     item.ownerNode = item.ownerNode || 'N/A';
                     item.diskFileSystem = item.diskFileSystem || item.fileSystem || 'N/A';
                     item.resourceType = item.resourceType || 'Disk';
                     item.diskOperationalStatus = item.diskOperationalStatus || 'Unknown';
                     item.allocated = item.diskAllocatedSize || item.allocated || '0 B';
                     item.free = item.diskFreeSpace || item.free || '0 B';
                     item.size = item.diskSize || item.size || '0 B';
                     
                } else if (arrayName === 'hosts') {
                    itemContext.host = item;
                } else if (arrayName === 'vms') {
                    itemContext.vm = item;
                } else if (arrayName.startsWith('host.')) {
                     // Use the mapped variable names for nested host properties
                     if (prefix === 'role') itemContext.role = item;
                     else if (prefix === 'update') itemContext.update = item;
                     else if (prefix === 'disk') itemContext.disk = item;
                     else if (prefix === 'volume') itemContext.volume = item;
                     else if (prefix === 'adapter') itemContext.adapter = item;
                     else if (prefix === 'vswitch') itemContext.vswitch = item;
                     else if (prefix === 'user') itemContext.user = item;
                     else if (prefix === 'group') itemContext.group = item;
                     else if (prefix === 'mpioDisk') itemContext.mpioDisk = item;
                } else if (arrayName === 'vswitch.extensions') {
                    itemContext.extension = item;
                } else if (arrayName === 'serverRoles') {
                    itemContext.role = item;
                } else if (arrayName === 'windowsUpdates') {
                    itemContext.update = item;
                } else if (arrayName === 'disks') {
                    itemContext.disk = item;
                } else if (arrayName === 'volumes') {
                    itemContext.volume = item;
                } else if (arrayName === 'adapters') {
                    itemContext.adapter = item;
                } else if (arrayName === 'vswitches') {
                    itemContext.vswitch = item;
                } else if (arrayName === 'localUsers') {
                    itemContext.user = item;
                } else if (arrayName === 'localGroups') {
                    itemContext.group = item;
                } else if (arrayName === 'multipathIODisks') {
                    itemContext.mpioDisk = item;
                } else if (arrayName === 'migrationNetworks') {
                    itemContext.migrationNetwork = item;
                } else if (arrayName === 'group.rights' || (arrayName === 'groupsWithAccess' && prefix === 'group')) {
                    // Handle nested rights loop within groups
                    itemContext.right = item;
                } else if (arrayName === 'group.folders' || (arrayName === 'groupsWithAccess' && prefix === 'group')) {
                    // Handle nested folders loop within groups
                    itemContext.folder = item;
                } else if (arrayName === 'user.rights' || (arrayName === 'usersWithAccess' && prefix === 'user')) {
                    // Handle nested rights loop within users
                    itemContext.right = item;
                } else if (arrayName === 'user.folders' || (arrayName === 'usersWithAccess' && prefix === 'user')) {
                    // Handle nested folders loop within users
                    itemContext.folder = item;
                }
                
                // Create context for processing nested loops and conditionals
                // IMPORTANT: Use the same structure as HyperVAuditor
                // CRITICAL: Pass the actual reportData object (which has currentHost set) to nested loops
                const loopContext = { ...reportData };
                loopContext[prefix] = item; // e.g., loopContext.host = currentHostItem
                
                // Also add specific context variables for nested loops to match template expectations
                // This ensures {{role.name}} works inside {{#each host.serverRoles}}
                if (arrayName.startsWith('host.')) {
                    const propName = arrayName.split('.')[1];
                    if (propName === 'serverRoles') loopContext.role = item;
                    else if (propName === 'windowsUpdates') loopContext.update = item;
                    else if (propName === 'disks') loopContext.disk = item;
                    else if (propName === 'volumes') loopContext.volume = item;
                    else if (propName === 'networkAdapters') loopContext.adapter = item;
                    else if (propName === 'virtualSwitches') {
                        loopContext.vswitch = item;
                        // Special handling for vswitch extensions nested loop
                        if (item.extensions && Array.isArray(item.extensions)) {
                            // Ensure extension variable works in inner loop
                            item.extensions.forEach(ext => {
                                if (!ext.name) ext.name = ext.Id || 'Unknown Extension';
                            });
                        }
                    }
                    else if (propName === 'localUsers') loopContext.user = item;
                    else if (propName === 'localGroups') loopContext.group = item;
                    else if (propName === 'vms') loopContext.vm = item;
                    else if (propName === 'multipathIODisks') loopContext.mpioDisk = item;
                } else if (arrayName === 'vswitch.extensions') {
                    loopContext.extension = item;
                }
                
                // For hosts, ensure currentHost is set and all nested arrays are properly initialized
                if (arrayName === 'hosts') {
                    loopContext.currentHost = item; // Ensure currentHost is set for nested loops
                    loopContext.host = item; // Also set host for direct access
                    
                    // Ensure all nested arrays exist (like HyperVAuditor does)
                    if (!item.serverRoles) item.serverRoles = [];
                    if (!item.windowsUpdates) item.windowsUpdates = [];
                    if (!item.disks) item.disks = [];
                    if (!item.volumes) item.volumes = [];
                    if (!item.networkAdapters) item.networkAdapters = [];
                    if (!item.virtualSwitches) item.virtualSwitches = [];
                    if (!item.localUsers) item.localUsers = [];
                    if (!item.localGroups) item.localGroups = [];
                    if (!item.vms) item.vms = [];
                    if (!item.multipathIO) item.multipathIO = {};
                    if (!item.liveMigration) item.liveMigration = {};
                    if (!item.multipathIODisks) item.multipathIODisks = [];
                    if (!item.hardware) item.hardware = {};
                }
                
                // Normalize item properties for specific types to match template expectations
                // This ensures names and sizes are properly populated/formatted
                if (prefix === 'disk' || arrayName.endsWith('disks')) {
                    if (!item.name) item.name = item.friendlyName || 'Unknown';
                    // Ensure sizes are formatted and unallocated/allocated are calculated
                    let sizeBytes = 0;
                    if (typeof item.size === 'number') {
                        sizeBytes = item.size;
                        item.size = this.formatBytes(item.size);
                    } else if (typeof item.size === 'string') {
                        sizeBytes = this.parseMemoryValue(item.size);
                        // item.size is already string
                    }
                    
                    let allocatedBytes = 0;
                    if (typeof item.allocatedSize === 'number') {
                        allocatedBytes = item.allocatedSize;
                        item.allocatedSize = this.formatBytes(item.allocatedSize);
                    } else if (typeof item.allocatedSize === 'string') {
                        allocatedBytes = this.parseMemoryValue(item.allocatedSize);
                        // item.allocatedSize is already string
                    }
                    
                    if (typeof item.sizeRemaining === 'number') item.sizeRemaining = this.formatBytes(item.sizeRemaining);
                    
                    // Calculate unallocated
                    let unallocatedBytes = Math.max(0, sizeBytes - allocatedBytes);
                    item.unallocatedSize = this.formatBytes(unallocatedBytes);
                    item.allocatedSize = this.formatBytes(allocatedBytes); // Ensure consistent formatting
                    
                } else if (prefix === 'volume' || arrayName.endsWith('volumes')) {
                    if (!item.name) item.name = item.fileSystemLabel || item.name || 'Unknown';
                    if (typeof item.size === 'number') item.size = this.formatBytes(item.size);
                    if (typeof item.sizeRemaining === 'number') item.sizeRemaining = this.formatBytes(item.sizeRemaining);
                } else if (prefix === 'adapter' || arrayName.endsWith('networkAdapters')) {
                    // Normalization for adapters if needed
                } else if (prefix === 'vm' || arrayName.endsWith('vms')) {
                    // Normalize VM memory (assuming numbers are in GB as per HyperVAuditor)
                    if (item.memory) {
                        if (typeof item.memory.startup === 'number') item.memory.startup = item.memory.startup.toFixed(1);
                        if (typeof item.memory.minimum === 'number') item.memory.minimum = item.memory.minimum.toFixed(1);
                        if (typeof item.memory.maximum === 'number') item.memory.maximum = item.memory.maximum.toFixed(1);
                    }
                    
                    // Calculate total disk size
                    let totalSize = 0;
                    if (item.disks && Array.isArray(item.disks)) {
                        item.disks.forEach(disk => {
                             const currentSize = typeof disk.currentSize === 'number' ? disk.currentSize : 0;
                             totalSize += currentSize;
                        });
                    }
                    // Add AVHDX if available
                    const avhdxTotalSize = typeof item.avhdxTotalSize === 'number' ? item.avhdxTotalSize : 0;
                    totalSize += avhdxTotalSize;
                    
                    // Total size is in GB (assuming disk sizes are GB)
                    item.totalDiskSize = totalSize > 0 ? `${totalSize.toFixed(1)} GB` : 'N/A';
                    
                    // Ensure checkpoint count
                    if (!item.checkpoint) item.checkpoint = { count: 0, exists: false };
                    
                    // Ensure replica state
                    if (!item.replica) item.replica = { state: 'Disabled' };
                }
                
                // Process nested loops FIRST - before conditionals
                // This ensures that loops inside conditionals are processed correctly
                // CRITICAL: Pass loopContext which has currentHost set correctly
                // CRITICAL: For hosts, we MUST process nested loops like {{#each host.serverRoles}}
                let previousLoopContent = '';
                let loopIterations = 0;
                
                while (itemContent !== previousLoopContent && loopIterations < 10) {
                    previousLoopContent = itemContent;
                    // Pass loopContext which has currentHost set for nested loops
                    // This will find and process {{#each host.serverRoles}} etc.
                    
                    itemContent = this.processLoops(itemContent, loopContext);
                    loopIterations++;
                }
                
                // Now replace item properties - this fills in {{host.name}} etc.
                // Use the item directly (which has all the enhanced properties)
                itemContent = replaceNested(item, prefix, itemContent);
                
                // Process conditionals AFTER loops and property replacement
                // This ensures conditionals can evaluate properties that were just replaced
                itemContent = this.processConditionals(itemContent, loopContext);
                
                // Also replace using quorumDisk prefix for easier access
                if (arrayName === 'folderTree') {
                    itemContent = replaceNested(item, 'folder', itemContent);
                } else if (arrayName === 'criticalIssues' || arrayName === 'warningIssues') {
                    itemContent = replaceNested(item, 'issue', itemContent);
                } else if (arrayName === 'shareEnumeration') {
                    itemContent = replaceNested(item, 'share', itemContent);
                } else if (arrayName === 'share.redFlags') {
                    // For red flags loops, item is a string or object with 'redFlag' property
                    const redFlagValue = typeof item === 'string' ? item : (item.redFlag || item.message || item.text || item.description || JSON.stringify(item));
                    itemContent = itemContent.replace(/\{\{redFlag\}\}/g, redFlagValue);
                    itemContent = itemContent.replace(/\{\{redFlag\.redFlag\}\}/g, redFlagValue);
                } else if (arrayName === 'groupsWithAccess') {
                    itemContent = replaceNested(item, 'group', itemContent);
                } else if (arrayName === 'usersWithAccess') {
                    itemContent = replaceNested(item, 'user', itemContent);
                } else if (arrayName === 'group.rights' || arrayName === 'user.rights') {
                    // For rights loops, item is a string or object with 'right' property
                    const rightValue = typeof item === 'string' ? item : (item.right || item);
                    itemContent = itemContent.replace(/\{\{right\}\}/g, rightValue);
                    itemContent = itemContent.replace(/\{\{right\.right\}\}/g, rightValue);
                } else if (arrayName === 'group.folders' || arrayName === 'user.folders') {
                    // For folders loops, item is already a folder object
                    itemContent = replaceNested(item, 'folder', itemContent);
                } else if (arrayName === 'quorumDisks') {
                    itemContent = replaceNested(item, 'quorumDisk', itemContent);
                } else if (arrayName === 'csvs') {
                    itemContent = replaceNested(item, 'csv', itemContent);
                } else if (arrayName === 'hosts') {
                    itemContent = replaceNested(item, 'host', itemContent);
                } else if (arrayName === 'vms') {
                    itemContent = replaceNested(item, 'vm', itemContent);
                } else if (arrayName === 'serverRoles') {
                    itemContent = replaceNested(item, 'role', itemContent);
                } else if (arrayName === 'windowsUpdates') {
                    itemContent = replaceNested(item, 'update', itemContent);
                } else if (arrayName === 'disks') {
                    itemContent = replaceNested(item, 'disk', itemContent);
                } else if (arrayName === 'volumes') {
                    itemContent = replaceNested(item, 'volume', itemContent);
                } else if (arrayName === 'adapters') {
                    itemContent = replaceNested(item, 'adapter', itemContent);
                } else if (arrayName === 'vswitches') {
                    itemContent = replaceNested(item, 'vswitch', itemContent);
                } else if (arrayName === 'localUsers') {
                    itemContent = replaceNested(item, 'user', itemContent);
                } else if (arrayName === 'localGroups') {
                    itemContent = replaceNested(item, 'group', itemContent);
                } else if (arrayName === 'multipathIODisks') {
                    itemContent = replaceNested(item, 'mpioDisk', itemContent);
                } else if (arrayName === 'migrationNetworks') {
                    itemContent = replaceNested(item, 'migrationNetwork', itemContent);
                }
                
                // Manual replacement for quorumDisk percentages to ensure they're replaced
                if (arrayName === 'quorumDisks') {
                    // Replace percentage variables explicitly - do this multiple times to catch all instances
                    const sizePercent = item.sizePercent !== undefined && item.sizePercent !== null ? String(item.sizePercent) : '0.0';
                    const allocatedPercent = item.allocatedPercent !== undefined && item.allocatedPercent !== null ? String(item.allocatedPercent) : '0.0';
                    const freePercent = item.freePercent !== undefined && item.freePercent !== null ? String(item.freePercent) : '0.0';
                    
                    // Replace with both quorumDisk. and without prefix (in case template uses different format)
                    itemContent = itemContent.replace(/\{\{quorumDisk\.sizePercent\}\}/g, sizePercent);
                    itemContent = itemContent.replace(/\{\{quorumDisk\.allocatedPercent\}\}/g, allocatedPercent);
                    itemContent = itemContent.replace(/\{\{quorumDisk\.freePercent\}\}/g, freePercent);
                    
                    // Also replace any remaining quorumDisk variables that might not have been caught
                    Object.keys(item).forEach(key => {
                        const value = item[key];
                        if (value !== null && value !== undefined) {
                            const placeholder = new RegExp(`\\{\\{quorumDisk\\.${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g');
                            itemContent = itemContent.replace(placeholder, this.formatValue(value));
                        }
                    });
                }
                
                // Process nested loops within this item (e.g., disks inside hosts)
                // Create a new context that includes the current item for nested loops
                const nestedContext = { ...reportData };
                nestedContext[prefix] = item; // e.g., nestedContext.host = currentHostItem
                if (arrayName === 'hosts') {
                    nestedContext.currentHost = item; // Ensure currentHost is set for nested loops
                }
                
                // Additional nested loop processing (in case there are deeper nested loops)
                // This handles cases where loops are nested inside already-processed loops
                let previousLoopContent2 = '';
                let loopIterations2 = 0;
                while (itemContent !== previousLoopContent2 && loopIterations2 < 10) {
                    previousLoopContent2 = itemContent;
                    itemContent = this.processLoops(itemContent, nestedContext);
                    loopIterations2++;
                }
                
                // Process conditionals again after all nested loops (in case conditionals were inside loops)
                // Use a proper context that includes the current item variables
                const postLoopContext = { ...nestedContext };
                
                // Add specific mapped variables for conditionals (e.g. {{#if role.isInstalled}})
                if (arrayName.startsWith('host.')) {
                    const propName = arrayName.split('.')[1];
                    if (propName === 'serverRoles') postLoopContext.role = item;
                    else if (propName === 'windowsUpdates') postLoopContext.update = item;
                    else if (propName === 'disks') postLoopContext.disk = item;
                    else if (propName === 'volumes') postLoopContext.volume = item;
                    else if (propName === 'networkAdapters') postLoopContext.adapter = item;
                    else if (propName === 'virtualSwitches') {
                        postLoopContext.vswitch = item;
                        // Map extension for nested usage in post-loop conditional processing
                        if (item.extensions && Array.isArray(item.extensions)) {
                             // This is tricky because extensions is an array within vswitch
                             // We might be processing a loop over extensions here
                        }
                    }
                    else if (propName === 'localUsers') postLoopContext.user = item;
                    else if (propName === 'localGroups') postLoopContext.group = item;
                    else if (propName === 'vms') postLoopContext.vm = item;
                    else if (propName === 'multipathIODisks') postLoopContext.mpioDisk = item;
                } else if (arrayName === 'vswitch.extensions') {
                    postLoopContext.extension = item;
                }
                
                // Add legacy/standard variables
                if (arrayName === 'hosts') postLoopContext.host = item;
                else if (arrayName === 'vms') postLoopContext.vm = item;
                else if (arrayName === 'csvs') postLoopContext.csv = item;
                else if (arrayName === 'quorumDisks') postLoopContext.quorumDisk = item;

                itemContent = this.processConditionals(itemContent, postLoopContext);

                // Replace index placeholder
                itemContent = itemContent.replace(/\{\{index\}\}/g, index + 1);
                
                // Replace item properties again after conditionals/loops (in case new ones were added)
                // Use the correct prefix (mapped from arrayName)
                itemContent = replaceNested(item, prefix, itemContent);
                
                // For quorumDisks, do one more explicit replacement pass for percentages
                if (arrayName === 'quorumDisks') {
                    const sizePercent = item.sizePercent !== undefined && item.sizePercent !== null ? String(item.sizePercent) : '0.0';
                    const allocatedPercent = item.allocatedPercent !== undefined && item.allocatedPercent !== null ? String(item.allocatedPercent) : '0.0';
                    const freePercent = item.freePercent !== undefined && item.freePercent !== null ? String(item.freePercent) : '0.0';
                    
                    itemContent = itemContent.replace(/\{\{quorumDisk\.sizePercent\}\}/g, sizePercent);
                    itemContent = itemContent.replace(/\{\{quorumDisk\.allocatedPercent\}\}/g, allocatedPercent);
                    itemContent = itemContent.replace(/\{\{quorumDisk\.freePercent\}\}/g, freePercent);
                }
                
                // Clean up any remaining undefined template variables (but be careful not to remove valid ones)
                // Only remove if it's clearly a template variable that wasn't replaced
                itemContent = itemContent.replace(/\{\{undefined[^}]*\}\}/g, '');
                
                // Remove any remaining conditional markers that weren't processed
                // Do this multiple times to catch nested or complex cases
                let previousCleanupContent = '';
                let cleanupIterations = 0;
                while (itemContent !== previousCleanupContent && cleanupIterations < 10) {
                    previousCleanupContent = itemContent;
                    cleanupIterations++;
                    // Remove in order: else first, then closing, then opening
                    itemContent = itemContent.replace(/\{\{else\}\}/g, '');
                    itemContent = itemContent.replace(/\{\{\/if\}\}/g, '');
                    itemContent = itemContent.replace(/\{\{#if[^}]*\}\}/g, '');
                    // Also remove any remaining loop markers
                    itemContent = itemContent.replace(/\{\{#each[^}]*\}\}/g, '');
                    itemContent = itemContent.replace(/\{\{\/each\}\}/g, '');
                }
                
                itemContent = itemContent.replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g, (match, varName) => {
                    // Check if this variable exists in the item or reportData
                    const parts = varName.split('.');
                    let value = item;
                    if (parts[0] !== prefix) {
                        value = reportData;
                    }
                    
                    for (let i = (parts[0] === prefix ? 1 : 0); i < parts.length; i++) {
                        if (value && typeof value === 'object') {
                            value = value[parts[i]];
                        } else {
                            return ''; // Variable doesn't exist, remove it
                        }
                    }
                    
                    // Variable exists, format it
                    return this.formatValue(value);
                });
                
                // Restore original context
                reportData.currentHost = savedCurrentHost;
                
                loopResult += itemContent;
            });

            // Replace the entire loop block with the result
            result = result.replace(fullMatch, loopResult);
        }

        return result;
    }

    extractHyperVData(reportData) {
        const data = {};
        
        // System/Report metadata
        data['report.date'] = new Date().toLocaleDateString();
        data['report.time'] = new Date().toLocaleTimeString();
        // Note: report.author is set by the caller (downloadDOCXReportWithPlaceholders or populateTemplateWithData)
        data['report.author'] = 'System Administrator'; // Default, will be overridden by caller if template is available
        data['company.name'] = 'Infrastructure Report';

            // Cluster information
        if (reportData.clusterName) {
            data['cluster.name'] = reportData.clusterName;
            data['cluster.nodes'] = reportData.hosts?.length || 0;
            data['cluster.onlineNodes'] = this.calculateOnlineNodes(reportData.hosts);
            data['cluster.health'] = this.calculateClusterHealth(reportData.hosts);
            data['cluster.quorum'] = reportData.clusterInfo?.quorumType || 'N/A';
            data['cluster.quorumType'] = this.translateQuorumType(reportData.clusterInfo?.quorumType);
            data['cluster.quorumResource'] = reportData.clusterInfo?.quorumResource || null;
            
            // Get quorum disk information
            const quorumDisks = reportData.quorumDisks || reportData.clusterInfo?.quorumDisks || [];
            if (quorumDisks.length > 0) {
                const quorumDisk = quorumDisks[0]; // Use first quorum disk
                // Use cluster resource name (not physical disk name)
                data['cluster.quorumDiskName'] = quorumDisk.name || quorumDisk.diskName || quorumDisk.diskFriendlyName || 'N/A';
                if (quorumDisk.diskSize) {
                    // Format disk size
                    let size = quorumDisk.diskSize;
                    if (typeof size === 'number') {
                        if (size < 1000) {
                            size = `${size.toFixed(2)} GB`;
                        } else {
                            size = this.formatBytes(size);
                        }
                    } else if (typeof size === 'string') {
                        // Already formatted
                    } else {
                        size = this.formatBytes(this.parseMemoryValue(size));
                    }
                    data['cluster.quorumDiskSize'] = size;
                }
                data['cluster.quorumDiskOwner'] = quorumDisk.ownerNode || 'N/A';
            }
            
            data['cluster.totalVMs'] = this.calculateTotalVMs(reportData.hosts);
            data['cluster.runningVMs'] = this.calculateRunningVMs(reportData.hosts);
            data['cluster.totalMemory'] = this.calculateTotalMemory(reportData.hosts);
            data['cluster.usedMemory'] = this.calculateUsedMemory(reportData.hosts);
            data['cluster.totalStorage'] = this.calculateTotalStorage(reportData.hosts);
            data['cluster.usedStorage'] = this.calculateUsedStorage(reportData.hosts);
            // CSV Utilization (based on Cluster Shared Volumes)
            data['cluster.totalCSVStorage'] = this.calculateTotalCSVStorage(reportData.clusterSharedVolumes);
            data['cluster.usedCSVStorage'] = this.calculateUsedCSVStorage(reportData.clusterSharedVolumes);
            data['cluster.totalProcessors'] = this.calculateTotalProcessors(reportData.hosts);
            data['cluster.csvCount'] = reportData.clusterSharedVolumes?.length || 0;
            
            // Calculate quorum disk count and total storage spaces (reuse quorumDisks from above)
            data['cluster.quorumDiskCount'] = quorumDisks.length;
            data['cluster.storageSpacesCount'] = quorumDisks.length + data['cluster.csvCount'];
            
            // Calculate percentages
            const totalMemBytes = this.parseMemoryValue(data['cluster.totalMemory']);
            const usedMemBytes = this.parseMemoryValue(data['cluster.usedMemory']);
            const memoryPercent = totalMemBytes > 0 ? Math.round((usedMemBytes / totalMemBytes) * 100) : 0;
            data['cluster.memoryPercent'] = memoryPercent;
            
            const totalStorageBytes = this.parseMemoryValue(data['cluster.totalStorage']);
            const usedStorageBytes = this.parseMemoryValue(data['cluster.usedStorage']);
            const storagePercent = totalStorageBytes > 0 ? Math.round((usedStorageBytes / totalStorageBytes) * 100) : 0;
            data['cluster.storagePercent'] = storagePercent;
            
            const totalCSVBytes = this.parseMemoryValue(data['cluster.totalCSVStorage']);
            const usedCSVBytes = this.parseMemoryValue(data['cluster.usedCSVStorage']);
            const csvPercent = totalCSVBytes > 0 ? Math.round((usedCSVBytes / totalCSVBytes) * 100) : 0;
            data['cluster.csvPercent'] = csvPercent;
            
            // Calculate VM density
            const nodeCount = reportData.hosts?.length || 1;
            const vmDensity = nodeCount > 0 ? (data['cluster.totalVMs'] / nodeCount).toFixed(1) : '0.0';
            data['cluster.vmDensity'] = vmDensity;
            
            // Calculate total vProcessors and vP/LP ratio
            const allVMs = this.extractAllVMs(reportData.hosts || []);
            const totalVProc = allVMs.reduce((sum, vm) => sum + (vm.vCPU || 0), 0);
            data['cluster.totalVProc'] = totalVProc;
            const totalLP = data['cluster.totalProcessors'] || 1;
            const vpLpRatio = totalLP > 0 ? (totalVProc / totalLP).toFixed(2) : '0.00';
            data['cluster.vpLpRatio'] = vpLpRatio;
            
            // Calculate virtual memory (sum of all VM memory)
            let totalVmMemory = 0;
            let usedVmMemory = 0;
            allVMs.forEach(vm => {
                let vmMem = 0;
                if (vm.memory?.startup) {
                    const memStr = vm.memory.startup.toString();
                    const memMatch = memStr.match(/([\d.]+)\s*GB/i);
                    if (memMatch) {
                        vmMem = parseFloat(memMatch[1]);
                    } else {
                        vmMem = this.parseMemoryValue(memStr) / (1024 * 1024 * 1024);
                    }
                } else if (vm.memoryStartup) {
                    const memStr = vm.memoryStartup.toString();
                    const memMatch = memStr.match(/([\d.]+)\s*GB/i);
                    if (memMatch) {
                        vmMem = parseFloat(memMatch[1]);
                    } else {
                        vmMem = this.parseMemoryValue(memStr) / (1024 * 1024 * 1024);
                    }
                }
                totalVmMemory += vmMem;
                usedVmMemory += vmMem; // Used is same as total for startup memory
            });
            data['cluster.totalVmMemory'] = totalVmMemory > 0 ? `${totalVmMemory.toFixed(2)} GB` : '0 B';
            data['cluster.usedVmMemory'] = usedVmMemory > 0 ? `${usedVmMemory.toFixed(2)} GB` : '0 B';
            
            // Domain
            data['cluster.domain'] = reportData.clusterInfo?.domain || reportData.hosts?.[0]?.domain || 'N/A';
            
            // Cluster errors count
            data['cluster.errorCount'] = reportData.clusterErrors?.length || 0;
        } else {
            // Even if no cluster name, set csvCount if CSV exists
            data['cluster.csvCount'] = reportData.clusterSharedVolumes?.length || 0;
            data['cluster.errorCount'] = reportData.clusterErrors?.length || 0;
            
            // Set quorum disk count and storage spaces count
            const quorumDisks = reportData.quorumDisks || reportData.clusterInfo?.quorumDisks || [];
            data['cluster.quorumDiskCount'] = quorumDisks.length;
            data['cluster.storageSpacesCount'] = quorumDisks.length + data['cluster.csvCount'];
        }
        
        // Always set cluster.csvCount, errorCount, quorumDiskCount, and storageSpacesCount for conditional evaluation
        if (!data['cluster.csvCount']) {
            data['cluster.csvCount'] = reportData.clusterSharedVolumes?.length || 0;
        }
        if (data['cluster.errorCount'] === undefined) {
            data['cluster.errorCount'] = reportData.clusterErrors?.length || 0;
        }
        if (data['cluster.quorumDiskCount'] === undefined) {
            const quorumDisks = reportData.quorumDisks || reportData.clusterInfo?.quorumDisks || [];
            data['cluster.quorumDiskCount'] = quorumDisks.length;
        }
        if (data['cluster.storageSpacesCount'] === undefined) {
            data['cluster.storageSpacesCount'] = (data['cluster.quorumDiskCount'] || 0) + (data['cluster.csvCount'] || 0);
        }

        // Host information (use first host as primary example)
        if (reportData.hosts && reportData.hosts.length > 0) {
            const primaryHost = reportData.hosts[0];
            data['host.name'] = primaryHost.name || 'Unknown';
            data['host.osVersion'] = primaryHost.osVersion || 'Unknown';
            data['host.osBuildNumber'] = primaryHost.osBuildNumber || 'Unknown';
            data['host.osArchitecture'] = primaryHost.osArchitecture || 'Unknown';
            data['host.osProductName'] = primaryHost.osProductName || 'Unknown';
            data['host.osInstallDate'] = primaryHost.osInstallDate || 'Unknown';
            data['host.state'] = primaryHost.state || 'Unknown';
            data['host.uptime'] = primaryHost.uptime || 'Unknown';
            data['host.domain'] = primaryHost.domain || 'Unknown';
            data['host.totalVm'] = primaryHost.totalVm || 0;
            data['host.runningVm'] = primaryHost.runningVm || 0;
            data['host.totalVProc'] = primaryHost.totalVProc || 0;
            data['host.logicalProcessor'] = primaryHost.logicalProcessor || 0;
            data['host.socketCount'] = primaryHost.socketCount || 0;
            // Handle memory values - check multiple possible locations
            const totalMem = primaryHost.totalMemory || primaryHost.memory?.total || 0;
            const usedMem = primaryHost.usedMemory || primaryHost.memory?.used || 0;
            const freeMem = primaryHost.freeMemory || primaryHost.memory?.free || 0;
            
            data['host.totalMemory'] = this.formatBytes(this.parseMemoryValue(totalMem));
            data['host.usedMemory'] = this.formatBytes(this.parseMemoryValue(usedMem));
            data['host.freeMemory'] = this.formatBytes(this.parseMemoryValue(freeMem));
            data['host.freeMemoryPercent'] = primaryHost.freeMemoryPercent || primaryHost.memory?.freePercent || 0;
            data['host.processor.name'] = primaryHost.processor?.name || 'Unknown';
            data['host.processor.cores'] = primaryHost.processor?.cores || 0;
            data['host.processor.threads'] = primaryHost.processor?.threads || 0;
            data['host.windowsActivation.status'] = primaryHost.windowsActivation?.status || 'Unknown';
            data['host.windowsActivation.partialProductKey'] = primaryHost.windowsActivation?.partialProductKey || 'Unknown';
            
            // MPIO (Multipath I/O) information
            if (primaryHost.multipathIO) {
                const mpio = primaryHost.multipathIO;
                data['host.multipathIO.installed'] = mpio.installed ? 'Yes' : 'No';
                data['host.multipathIO.enabled'] = mpio.enabled ? 'Yes' : 'No';
                data['host.multipathIO.loadBalancePolicy'] = mpio.loadBalancePolicy || 'N/A';
                data['host.multipathIO.pathVerificationState'] = mpio.pathVerificationState || 'N/A';
                data['host.multipathIO.pathVerificationPeriod'] = mpio.pathVerificationPeriod || 0;
                data['host.multipathIO.retryCount'] = mpio.retryCount || 0;
                data['host.multipathIO.retryInterval'] = mpio.retryInterval || 0;
                data['host.multipathIO.diskTimeoutValue'] = mpio.diskTimeoutValue || 0;
                data['host.multipathIO.pDORemovePeriod'] = mpio.pDORemovePeriod || 0;
                data['host.multipathIO.deviceCount'] = mpio.devices?.length || 0;
                data['host.multipathIO.pathCount'] = mpio.paths?.length || 0;
            } else {
                data['host.multipathIO.installed'] = 'No';
                data['host.multipathIO.enabled'] = 'No';
                data['host.multipathIO.loadBalancePolicy'] = 'N/A';
                data['host.multipathIO.pathVerificationState'] = 'N/A';
                data['host.multipathIO.pathVerificationPeriod'] = 0;
                data['host.multipathIO.retryCount'] = 0;
                data['host.multipathIO.retryInterval'] = 0;
                data['host.multipathIO.diskTimeoutValue'] = 0;
                data['host.multipathIO.pDORemovePeriod'] = 0;
                data['host.multipathIO.deviceCount'] = 0;
                data['host.multipathIO.pathCount'] = 0;
            }
        }

        // VM information (use first VM as example)
        const allVMs = this.extractAllVMs(reportData.hosts || []);
        if (allVMs.length > 0) {
            const primaryVM = allVMs[0];
            data['vm.name'] = primaryVM.name || 'Unknown';
            data['vm.generation'] = primaryVM.generation || 2;
            data['vm.version'] = primaryVM.version || '10.0';
            data['vm.state'] = primaryVM.state || 'Unknown';
            data['vm.uptime'] = primaryVM.uptime || 'Unknown';
            data['vm.host'] = primaryVM.host || 'Unknown';
            data['vm.vCPU'] = primaryVM.vCPU || 0;
            data['vm.memory.startup'] = this.formatBytes(primaryVM.memory?.startup);
            data['vm.memory.minimum'] = this.formatBytes(primaryVM.memory?.minimum);
            data['vm.memory.maximum'] = this.formatBytes(primaryVM.memory?.maximum);
            data['vm.integrationServices.state'] = primaryVM.integrationServices?.state || 'Unknown';
            data['vm.integrationServices.version'] = primaryVM.integrationServices?.version || 'Unknown';
            data['vm.checkpoint.exists'] = primaryVM.checkpoint?.exists ? 'Yes' : 'No';
            data['vm.checkpoint.count'] = primaryVM.checkpoint?.count || 0;
            data['vm.replica.state'] = primaryVM.replica?.state || 'Disabled';
            data['vm.replica.health'] = primaryVM.replica?.health || 'N/A';
            data['vm.configurationPath'] = primaryVM.configurationPath || 'Unknown';
        }

        // Storage information (use first disk/volume as example)
        if (reportData.hosts && reportData.hosts.length > 0) {
            const allDisks = reportData.hosts.flatMap(host => host.disks || []);
            const allVolumes = reportData.hosts.flatMap(host => host.volumes || []);
            
            if (allDisks.length > 0) {
                const primaryDisk = allDisks[0];
                data['disk.name'] = primaryDisk.friendlyName || primaryDisk.name || 'Unknown';
                data['disk.size'] = this.formatBytes(primaryDisk.size);
                data['disk.allocatedSize'] = this.formatBytes(primaryDisk.allocatedSize);
                data['disk.sizeRemaining'] = this.formatBytes(primaryDisk.sizeRemaining);
                data['disk.operationalStatus'] = primaryDisk.operationalStatus || 'Unknown';
                data['disk.uniqueId'] = primaryDisk.uniqueId || 'Unknown';
                data['disk.serialNumber'] = primaryDisk.serialNumber || 'Unknown';
            }

            if (allVolumes.length > 0) {
                const primaryVolume = allVolumes[0];
                data['volume.name'] = primaryVolume.fileSystemLabel || primaryVolume.name || 'Unknown';
                data['volume.driveLetter'] = primaryVolume.driveLetter || 'N/A';
                data['volume.size'] = this.formatBytes(primaryVolume.size);
                data['volume.sizeRemaining'] = this.formatBytes(primaryVolume.sizeRemaining);
                data['volume.fileSystem'] = primaryVolume.fileSystem || 'Unknown';
                data['volume.healthStatus'] = primaryVolume.healthStatus || 'Unknown';
            }
        }

        // CSV information
        if (reportData.clusterSharedVolumes && reportData.clusterSharedVolumes.length > 0) {
            const primaryCSV = reportData.clusterSharedVolumes[0];
            data['csv.name'] = primaryCSV.name || 'Unknown';
            data['csv.alias'] = primaryCSV.alias || 'Unknown';
            data['csv.id'] = primaryCSV.id || primaryCSV.guid || primaryCSV.uniqueId || 'Unknown';
            data['csv.size'] = this.formatBytes(primaryCSV.size);
            data['csv.used'] = this.formatBytes(primaryCSV.used);
            data['csv.free'] = this.formatBytes(primaryCSV.free);
            data['csv.ownerNode'] = primaryCSV.ownerNode || 'Unknown';
            data['csv.state'] = primaryCSV.state || 'Unknown';
        }

        // Network information
        if (reportData.hosts && reportData.hosts.length > 0) {
            const allAdapters = reportData.hosts.flatMap(host => host.networkAdapters || []);
            const allVSwitches = reportData.hosts.flatMap(host => host.virtualSwitches || []);
            
            if (allAdapters.length > 0) {
                const primaryAdapter = allAdapters[0];
                data['adapter.name'] = primaryAdapter.name || 'Unknown';
                data['adapter.interfaceName'] = primaryAdapter.interfaceName || 'Unknown';
                data['adapter.status'] = primaryAdapter.status || 'Unknown';
                data['adapter.linkSpeed'] = primaryAdapter.linkSpeed || 'Unknown';
                data['adapter.mtu'] = primaryAdapter.mtu || 'Unknown';
                data['adapter.ipAddress'] = primaryAdapter.ipAddress || 'Unknown';
                data['adapter.subnetMask'] = primaryAdapter.subnetMask || 'Unknown';
                data['adapter.defaultGateway'] = primaryAdapter.defaultGateway || 'Unknown';
                data['adapter.dnsServers'] = Array.isArray(primaryAdapter.dnsServers) ? 
                    primaryAdapter.dnsServers.join(', ') : 'Unknown';
                data['adapter.dhcpEnabled'] = primaryAdapter.dhcpEnabled ? 'Yes' : 'No';
                data['adapter.macAddress'] = primaryAdapter.macAddress || 'Unknown';
                data['adapter.vlanId'] = primaryAdapter.vlanId || 0;
                data['adapter.vlanMode'] = primaryAdapter.vlanMode || 'Untagged';
                data['adapter.dhcpGuard'] = primaryAdapter.dhcpGuard || 'Unknown';
                data['adapter.routerGuard'] = primaryAdapter.routerGuard || 'Unknown';
                data['adapter.isVirtual'] = primaryAdapter.isVirtual ? 'Yes' : 'No';
                data['adapter.virtualSwitch'] = primaryAdapter.virtualSwitch || 'N/A';
                data['adapter.interfaceDescription'] = primaryAdapter.interfaceDescription || 'Unknown';
                data['adapter.isTeamed'] = primaryAdapter.isTeamed ? 'Yes' : 'No';
                data['adapter.teamName'] = primaryAdapter.teamName || 'N/A';
                data['adapter.teamLoadBalancingAlgorithm'] = primaryAdapter.teamLoadBalancingAlgorithm || 'N/A';
                data['adapter.teamTeamingMode'] = primaryAdapter.teamTeamingMode || 'N/A';
                data['adapter.teamStatus'] = primaryAdapter.teamStatus || 'N/A';
                data['adapter.isSET'] = primaryAdapter.isSET ? 'Yes' : 'No';
                data['adapter.setSwitchName'] = primaryAdapter.setSwitchName || 'N/A';
                data['adapter.setLoadBalancingAlgorithm'] = primaryAdapter.setLoadBalancingAlgorithm || 'N/A';
            }

            if (allVSwitches.length > 0) {
                const primaryVSwitch = allVSwitches[0];
                data['vswitch.name'] = primaryVSwitch.name || 'Unknown';
                data['vswitch.type'] = primaryVSwitch.type || 'Unknown';
                data['vswitch.notes'] = primaryVSwitch.notes || 'None';
                data['vswitch.sriovEnabled'] = primaryVSwitch.sriovEnabled ? 'Yes' : 'No';
                data['vswitch.setEnabled'] = primaryVSwitch.setEnabled || primaryVSwitch.embeddedTeamingEnabled ? 'Yes' : 'No';
                data['vswitch.setLoadBalancingAlgorithm'] = primaryVSwitch.setLoadBalancingAlgorithm || 'N/A';
            }
        }

        // Security information (users, groups, roles)
        if (reportData.hosts && reportData.hosts.length > 0) {
            const allUsers = reportData.hosts.flatMap(host => host.localUsers || []);
            const allGroups = reportData.hosts.flatMap(host => host.localGroups || []);
            const allRoles = reportData.hosts.flatMap(host => host.serverRoles || []);
            
            if (allUsers.length > 0) {
                const primaryUser = allUsers[0];
                data['user.name'] = primaryUser.name || 'Unknown';
                data['user.fullName'] = primaryUser.fullName || 'Unknown';
                data['user.description'] = primaryUser.description || 'None';
                data['user.enabled'] = primaryUser.enabled ? 'Yes' : 'No';
                data['user.passwordLastSet'] = primaryUser.passwordLastSet || 'Unknown';
                data['user.accountExpires'] = primaryUser.accountExpires || 'Never';
            }

            if (allGroups.length > 0) {
                const primaryGroup = allGroups[0];
                data['group.name'] = primaryGroup.name || 'Unknown';
                data['group.description'] = primaryGroup.description || 'None';
                data['group.members'] = primaryGroup.members?.length || 0;
            }

            if (allRoles.length > 0) {
                const primaryRole = allRoles[0];
                data['role.name'] = primaryRole.name || 'Unknown';
                data['role.displayName'] = primaryRole.displayName || 'Unknown';
                data['role.installState'] = primaryRole.installState || 'Unknown';
                data['role.featureType'] = primaryRole.featureType || 'Unknown';
            }
        }

        // Windows Updates information
        if (reportData.hosts && reportData.hosts.length > 0) {
            const allUpdates = reportData.hosts.flatMap(host => host.windowsUpdates || []);
            
            if (allUpdates.length > 0) {
                const primaryUpdate = allUpdates[0];
                data['update.title'] = primaryUpdate.title || 'Unknown';
                data['update.kbNumber'] = primaryUpdate.kbNumber || 'Unknown';
                data['update.installedOn'] = primaryUpdate.installedOn || 'Unknown';
                data['update.installer'] = primaryUpdate.installer || 'Unknown';
                data['update.size'] = this.formatBytes(primaryUpdate.size);
                data['update.description'] = primaryUpdate.description || 'None';
            }
        }

        // MPIO information
        if (reportData.hosts && reportData.hosts.length > 0) {
            const hostWithMPIO = reportData.hosts.find(host => host.multipathIO);
            if (hostWithMPIO && hostWithMPIO.multipathIO) {
                const mpio = hostWithMPIO.multipathIO;
                data['mpio.installed'] = mpio.installed ? 'Yes' : 'No';
                data['mpio.pathVerificationEnabled'] = mpio.pathVerificationEnabled ? 'Yes' : 'No';
                data['mpio.pdoRemovePeriod'] = mpio.pdoRemovePeriod || 'Unknown';
                data['mpio.retryCount'] = mpio.retryCount || 'Unknown';
                data['mpio.retryInterval'] = mpio.retryInterval || 'Unknown';
                data['mpio.useCustomPathRecoveryTime'] = mpio.useCustomPathRecoveryTime ? 'Yes' : 'No';
                data['mpio.pathRecoveryInterval'] = mpio.pathRecoveryInterval || 'Unknown';
                data['mpio.diskTimeoutValue'] = mpio.diskTimeoutValue || 'Unknown';

                if (mpio.disks && mpio.disks.length > 0) {
                    const primaryMPIODisk = mpio.disks[0];
                    data['mpioDisk.name'] = primaryMPIODisk.name || 'Unknown';
                    data['mpioDisk.size'] = this.formatBytes(primaryMPIODisk.size);
                    data['mpioDisk.pathCount'] = primaryMPIODisk.pathCount || 0;
                    data['mpioDisk.loadBalancePolicy'] = primaryMPIODisk.loadBalancePolicy || 'Unknown';
                }
            }
        }

        // Live Migration information
        if (reportData.hosts && reportData.hosts.length > 0) {
            const hostWithLM = reportData.hosts.find(host => host.liveMigration);
            if (hostWithLM && hostWithLM.liveMigration) {
                const lm = hostWithLM.liveMigration;
                data['liveMigration.enabled'] = lm.enabled ? 'Yes' : 'No';
                data['liveMigration.maxConcurrentMigrations'] = lm.maxConcurrentMigrations || 0;
                data['liveMigration.maxConcurrentStorageMigrations'] = lm.maxConcurrentStorageMigrations || 0;
                data['liveMigration.authProtocol'] = lm.authProtocol || 'Unknown';
                data['liveMigration.performanceOption'] = lm.performanceOption || 'Unknown';
                data['liveMigration.useAnyNetwork'] = lm.useAnyNetwork ? 'Yes' : 'No';
                data['liveMigration.networks'] = Array.isArray(lm.networks) ? 
                    lm.networks.join(', ') : 'None';
            }
        }

        // Error information
        if (reportData.hosts && reportData.hosts.length > 0) {
            const allSystemErrors = reportData.hosts.flatMap(host => host.systemErrors || []);
            const allHypervErrors = reportData.hosts.flatMap(host => host.hypervErrors || []);
            
            if (allSystemErrors.length > 0) {
                const primaryError = allSystemErrors[0];
                data['systemError.level'] = primaryError.level || 'Unknown';
                data['error.level'] = primaryError.level || 'Unknown';
                data['error.source'] = primaryError.source || 'Unknown';
                data['error.eventId'] = primaryError.eventId || 'Unknown';
                data['error.timeCreated'] = primaryError.timeCreated || 'Unknown';
                data['error.message'] = primaryError.message || 'Unknown';
                data['error.description'] = primaryError.description || 'None';
            }

            if (allHypervErrors.length > 0) {
                const primaryHypervError = allHypervErrors[0];
                data['hypervError.level'] = primaryHypervError.level || 'Unknown';
            }
        }

        // Cluster errors (errorCount is already set above, just set clusterError.level here)
        if (reportData.clusterErrors && reportData.clusterErrors.length > 0) {
            const primaryClusterError = reportData.clusterErrors[0];
            data['clusterError.level'] = primaryClusterError.level || 'Unknown';
        }

        return data;
    }

    // Helper methods for data calculation and formatting
    calculateOnlineNodes(hosts) {
        if (!hosts || hosts.length === 0) return 0;
        
        // Count nodes that are online based on status, clusterNodeState, and state
        const onlineNodes = hosts.filter(h => {
            // Priority: error > status > clusterNodeState > state
            
            // If there's an error, definitely offline
            if (h.error) {
                return false;
            }
            
            // Check status field first (from PowerShell script) - most reliable indicator
            if (h.status) {
                const statusLower = (h.status || '').toString().toLowerCase().trim();
                // If status is explicitly offline/down, mark as down
                if (statusLower === 'offline' || statusLower === 'down') {
                    return false;
                }
                // Otherwise, if status exists and is not offline/down, it's up
                return true;
            }
            
            // For clustered nodes, check clusterNodeState
            if (h.isClustered && h.clusterNodeState) {
                const clusterState = (h.clusterNodeState || '').toString().toLowerCase().trim();
                // Cluster node states: Up, Down, Paused, Joining, etc.
                if (clusterState === 'up' || clusterState === 'online') {
                    return true;
                }
                if (clusterState === 'down' || clusterState === 'paused' || clusterState === 'failed') {
                    return false;
                }
                // If cluster state is unknown, fall through to check state field
            }
            
            // Fall back to state field
            const state = (h.state || '').toString().toLowerCase().trim();
            return state === 'up' || state === 'online';
        }).length;
        
        return onlineNodes;
    }

    calculateClusterHealth(hosts) {
        if (!hosts || hosts.length === 0) return 'Unknown';
        const upHosts = hosts.filter(h => h.state && h.state.toLowerCase() === 'up').length;
        return upHosts === hosts.length ? 'Healthy' : 'Warning';
    }

    calculateTotalVMs(hosts) {
        return hosts?.reduce((sum, host) => sum + (host.totalVm || 0), 0) || 0;
    }

    calculateRunningVMs(hosts) {
        return hosts?.reduce((sum, host) => sum + (host.runningVm || 0), 0) || 0;
    }

    calculateTotalMemory(hosts) {
        if (!hosts || hosts.length === 0) return '0 B';
        let total = 0;
        hosts.forEach(host => {
            let mem = host.totalMemory || host.memory?.total || 0;
            
            // Handle object format { value: X, unit: 'GB' }
            if (typeof mem === 'object' && mem !== null && mem.value !== undefined) {
                if (mem.unit === 'GB' || mem.unit === 'gb') {
                    mem = mem.value * 1024 * 1024 * 1024; // Convert GB to bytes
                } else {
                    mem = mem.value;
                }
            }
            // Handle string format "X GB" or "X.XX GB"
            else if (typeof mem === 'string') {
                if (mem.includes('GB') || mem.includes('gb')) {
                    const match = mem.match(/([\d.]+)/);
                    if (match) {
                        mem = parseFloat(match[1]) * 1024 * 1024 * 1024; // Convert GB to bytes
                    } else {
                        mem = this.parseMemoryValue(mem);
                    }
                } else {
                    mem = this.parseMemoryValue(mem);
                }
            }
            // Handle number - if it's less than 1000, assume it's GB, otherwise assume bytes
            else if (typeof mem === 'number') {
                if (mem < 1000) {
                    mem = mem * 1024 * 1024 * 1024; // Convert GB to bytes
                }
            } else {
                mem = this.parseMemoryValue(mem);
            }
            
            total += mem;
        });
        return this.formatBytes(total);
    }

    calculateUsedMemory(hosts) {
        if (!hosts || hosts.length === 0) return '0 B';
        let used = 0;
        hosts.forEach(host => {
            let mem = host.usedMemory || host.memory?.used || 0;
            
            // Handle object format { value: X, unit: 'GB' }
            if (typeof mem === 'object' && mem !== null && mem.value !== undefined) {
                if (mem.unit === 'GB' || mem.unit === 'gb') {
                    mem = mem.value * 1024 * 1024 * 1024; // Convert GB to bytes
                } else {
                    mem = mem.value;
                }
            }
            // Handle string format "X GB" or "X.XX GB"
            else if (typeof mem === 'string') {
                if (mem.includes('GB') || mem.includes('gb')) {
                    const match = mem.match(/([\d.]+)/);
                    if (match) {
                        mem = parseFloat(match[1]) * 1024 * 1024 * 1024; // Convert GB to bytes
                    } else {
                        mem = this.parseMemoryValue(mem);
                    }
                } else {
                    mem = this.parseMemoryValue(mem);
                }
            }
            // Handle number - if it's less than 1000, assume it's GB, otherwise assume bytes
            else if (typeof mem === 'number') {
                if (mem < 1000) {
                    mem = mem * 1024 * 1024 * 1024; // Convert GB to bytes
                }
            } else {
                mem = this.parseMemoryValue(mem);
            }
            
            used += mem;
        });
        return this.formatBytes(used);
    }

    calculateTotalStorage(hosts) {
        if (!hosts || hosts.length === 0) return '0 B';
        let total = 0;
        const seenDisks = new Set(); // Track seen disks to avoid duplication in clusters
        
        hosts.forEach(host => {
            if (host.disks && Array.isArray(host.disks)) {
                host.disks.forEach(disk => {
                    const diskId = disk.uniqueId || disk.serialNumber || `${disk.friendlyName || disk.name}-${disk.size || 0}`;
                    if (!seenDisks.has(diskId)) {
                        seenDisks.add(diskId);
                        let size = disk.size || 0;
                        
                        // If size is a string with GB, parse it
                        if (typeof size === 'string' && size.includes('GB')) {
                            const match = size.match(/([\d.]+)/);
                            if (match) {
                                size = parseFloat(match[1]) * 1024 * 1024 * 1024; // Convert GB to bytes
                            } else {
                                size = this.parseMemoryValue(size);
                            }
                        } else {
                            size = this.parseMemoryValue(size);
                        }
                        
                        total += size;
                    }
                });
            }
        });
        return this.formatBytes(total);
    }

    calculateUsedStorage(hosts) {
        if (!hosts || hosts.length === 0) return '0 B';
        let used = 0;
        const seenVolumes = new Set(); // Track seen volumes to avoid duplication
        
        hosts.forEach(host => {
            // Calculate from volumes (more accurate for used space)
            if (host.volumes && Array.isArray(host.volumes)) {
                host.volumes.forEach(vol => {
                    const volId = vol.uniqueId || vol.path || `${vol.fileSystemLabel || vol.name}-${vol.size || 0}`;
                    if (!seenVolumes.has(volId)) {
                        seenVolumes.add(volId);
                        
                        let size = vol.size || 0;
                        let free = vol.sizeRemaining || 0;
                        
                        // Parse if strings
                        if (typeof size === 'string' && size.includes('GB')) {
                            const match = size.match(/([\d.]+)/);
                            if (match) {
                                size = parseFloat(match[1]) * 1024 * 1024 * 1024;
                            } else {
                                size = this.parseMemoryValue(size);
                            }
                        } else {
                            size = this.parseMemoryValue(size);
                        }
                        
                        if (typeof free === 'string' && free.includes('GB')) {
                            const match = free.match(/([\d.]+)/);
                            if (match) {
                                free = parseFloat(match[1]) * 1024 * 1024 * 1024;
                            } else {
                                free = this.parseMemoryValue(free);
                            }
                        } else {
                            free = this.parseMemoryValue(free);
                        }
                        
                        const volUsed = size - free;
                        if (volUsed > 0) {
                            used += volUsed;
                        }
                    }
                });
            }
        });
        return this.formatBytes(used);
    }
    
    calculateTotalCSVStorage(csvs) {
        if (!csvs || csvs.length === 0) return '0 B';
        let total = 0;
        
        csvs.forEach(csv => {
            const size = parseFloat(csv.size) || 0;
            if (size > 0) {
                total += size;
            }
        });
        
        // Convert GB to bytes for formatting
        return this.formatBytes(total * 1024 * 1024 * 1024);
    }
    
    calculateUsedCSVStorage(csvs) {
        if (!csvs || csvs.length === 0) return '0 B';
        let used = 0;
        
        csvs.forEach(csv => {
            const size = parseFloat(csv.size) || 0;
            const sizeRemaining = parseFloat(csv.sizeRemaining) || 0;
            const csvUsed = size > 0 ? (size - sizeRemaining) : 0;
            if (csvUsed > 0) {
                used += csvUsed;
            }
        });
        
        // Convert GB to bytes for formatting
        return this.formatBytes(used * 1024 * 1024 * 1024);
    }

    calculateTotalProcessors(hosts) {
        return hosts?.reduce((sum, host) => sum + (host.logicalProcessor || 0), 0) || 0;
    }

    extractAllVMs(hosts) {
        const vms = [];
        hosts?.forEach(host => {
            if (host.vms && Array.isArray(host.vms)) {
                vms.push(...host.vms.map(vm => ({ ...vm, host: host.name })));
            }
        });
        return vms;
    }

    translateQuorumType(type) {
        const types = {
            '0': 'Node Majority',
            '1': 'Node and Disk Majority',
            '2': 'Node and File Share Majority',
            '3': 'Disk Only',
            '4': 'Cloud Witness'
        };
        return types[type] || type || 'Unknown';
    }

    formatBytes(bytes) {
        // Handle null, undefined, or zero
        if (!bytes || bytes === 0 || bytes === '0' || bytes === '0 B') return '0 B';
        
        // If already a formatted string (e.g., "128 GB"), return as is
        if (typeof bytes === 'string' && /^\d+\.?\d*\s*(B|KB|MB|GB|TB)$/i.test(bytes.trim())) {
            return bytes.trim();
        }
        
        // If it's a number, format it
        if (typeof bytes === 'number') {
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
        
        // Try to parse string values (e.g., "128 GB" -> extract number and convert)
        if (typeof bytes === 'string') {
            const match = bytes.match(/([\d.]+)\s*(B|KB|MB|GB|TB)?/i);
            if (match) {
                const value = parseFloat(match[1]);
                const unit = (match[2] || 'B').toUpperCase();
                if (unit === 'B' && value > 0) {
                    const k = 1024;
                    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
                    const i = Math.floor(Math.log(value) / Math.log(k));
                    return parseFloat((value / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
                }
                return bytes; // Return original if already formatted
            }
        }
        
        return '0 B';
    }
    
    parseMemoryValue(value) {
        // Handle different memory value formats
        if (!value || value === 0) return 0;
        
        // Handle object format { value: X, unit: 'GB' }
        if (typeof value === 'object' && value !== null && value.value !== undefined) {
            const num = parseFloat(value.value);
            if (value.unit === 'GB' || value.unit === 'gb') {
                return num * 1024 * 1024 * 1024; // Convert GB to bytes
            } else if (value.unit === 'MB' || value.unit === 'mb') {
                return num * 1024 * 1024; // Convert MB to bytes
            } else if (value.unit === 'KB' || value.unit === 'kb') {
                return num * 1024; // Convert KB to bytes
            } else if (value.unit === 'TB' || value.unit === 'tb') {
                return num * 1024 * 1024 * 1024 * 1024; // Convert TB to bytes
            }
            return num; // Assume bytes if no unit
        }
        
        // Handle number - if it's less than 1000, assume it's GB (common for memory values)
        if (typeof value === 'number') {
            // If the number is less than 1000, it's likely GB (e.g., 382.76 GB)
            // If it's larger, it's likely already in bytes
            if (value < 1000 && value > 0) {
                return value * 1024 * 1024 * 1024; // Convert GB to bytes
            }
            return value; // Already in bytes
        }
        
        // Handle string format
        if (typeof value === 'string') {
            // Try to extract number from strings like "128 GB" or "128"
            const match = value.match(/([\d.]+)/);
            if (match) {
                const num = parseFloat(match[1]);
                // If it contains GB, assume it's in GB
                if (/GB/i.test(value)) {
                    return num * 1024 * 1024 * 1024; // Convert GB to bytes
                } else if (/MB/i.test(value)) {
                    return num * 1024 * 1024; // Convert MB to bytes
                } else if (/KB/i.test(value)) {
                    return num * 1024; // Convert KB to bytes
                } else if (/TB/i.test(value)) {
                    return num * 1024 * 1024 * 1024 * 1024; // Convert TB to bytes
                }
                // If no unit and number is less than 1000, assume GB
                if (num < 1000 && num > 0) {
                    return num * 1024 * 1024 * 1024; // Convert GB to bytes
                }
                // Otherwise assume bytes
                return num;
            }
        }
        return 0;
    }

    formatValue(value) {
        if (value === null || value === undefined) return 'N/A';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (Array.isArray(value)) return value.join(', ');
        return String(value);
    }

    downloadGeneratedReport(template, content) {
        const blob = new Blob([content], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${template.name}_${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        // Show success message
        this.showMessage(`Report "${template.name}" generated and downloaded successfully!`, 'success');
    }

    showMessage(message, type = 'info') {
        const alertClass = type === 'success' ? 'alert-success' : 
                          type === 'error' ? 'alert-danger' : 'alert-info';
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `alert ${alertClass}`;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            padding: 1rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            max-width: 400px;
            background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
            color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
            border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'};
        `;
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 5000);
    }
}
