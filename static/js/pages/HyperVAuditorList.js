export class HyperVAuditorListPage {
    constructor() {
        // Set instance IMMEDIATELY so inline event handlers work
        window.hyperVAuditorListInstance = this;

        this.reports = [];
        this.showCreateModal = false;
        this.loadingReports = false;
        this.searchQuery = '';
        this.filterType = 'all';
        this.sortField = 'createdAt';
        this.sortOrder = 'desc';
        const storedMode = localStorage.getItem('hyperv-auditor-view-mode');
        this.viewMode = ['table', 'compact'].includes(storedMode) ? storedMode : 'table';
        this.currentLanguage = localStorage.getItem('language') || 'en';
        this.translations = {
            en: {
                title: 'Hyper-V Audits',
                subtitle: 'Manage and view your Hyper-V audits',
                newReport: 'New Report',
                noReports: 'No reports created yet',
                createFirst: 'Click "New Report" to create your first report',
                name: 'Name',
                type: 'Type',
                target: 'Target',
                status: 'Status',
                created: 'Created',
                actions: 'Actions',
                import: 'Import',
                cluster: 'Cluster',
                host: 'Host',
                view: 'View',
                delete: 'Delete',
                reportName: 'Report Name',
                enterReportName: 'Enter report name',
                targetType: 'Target Type',
                clusterName: 'Cluster Name',
                enterClusterName: 'Enter cluster name',
                hostNames: 'Host Names',
                enterHostNames: 'Enter host names (one per line)',
                create: 'Create',
                cancel: 'Cancel',
                pleaseEnterName: 'Please enter a report name',
                pleaseEnterCluster: 'Please enter a cluster name',
                pleaseEnterHosts: 'Please enter at least one host name',
                reportCreated: 'Report created successfully',
                failedToCreate: 'Failed to create report',
                confirmDelete: 'Are you sure you want to delete this report?',
                reportDeleted: 'Report deleted successfully',
                failedToDelete: 'Failed to delete report',
                failedToLoad: 'Failed to load reports',
                language: 'Language',
                languageLabel: 'Language',
                languageEnglish: 'English',
                languageFrench: 'French',
                search: 'Search reports...',
                all: 'All Types'
            },
            fr: {
                title: 'Audits Hyper-V',
                subtitle: 'Gérer et visualiser vos audits Hyper-V',
                newReport: 'Nouveau Rapport',
                noReports: 'Aucun rapport créé',
                createFirst: 'Cliquez sur "Nouveau Rapport" pour créer votre premier rapport',
                name: 'Nom',
                type: 'Type',
                target: 'Cible',
                status: 'Statut',
                created: 'Créé',
                actions: 'Actions',
                import: 'Importer',
                cluster: 'Cluster',
                host: 'Hôte',
                view: 'Voir',
                delete: 'Supprimer',
                reportName: 'Nom du Rapport',
                enterReportName: 'Entrez le nom du rapport',
                targetType: 'Type de Cible',
                clusterName: 'Nom du Cluster',
                enterClusterName: 'Entrez le nom du cluster',
                hostNames: 'Noms des Hôtes',
                enterHostNames: 'Entrez les noms des hôtes (un par ligne)',
                create: 'Créer',
                cancel: 'Annuler',
                pleaseEnterName: 'Veuillez entrer un nom de rapport',
                pleaseEnterCluster: 'Veuillez entrer un nom de cluster',
                pleaseEnterHosts: 'Veuillez entrer au moins un nom d\'hôte',
                reportCreated: 'Rapport créé avec succès',
                failedToCreate: 'Échec de la création du rapport',
                confirmDelete: 'Êtes-vous sûr de vouloir supprimer ce rapport ?',
                reportDeleted: 'Rapport supprimé avec succès',
                failedToDelete: 'Échec de la suppression du rapport',
                failedToLoad: 'Échec du chargement des rapports',
                language: 'Langue',
                languageLabel: 'Langue',
                languageEnglish: 'Anglais',
                languageFrench: 'Français',
                search: 'Rechercher...',
                all: 'Tous les types'
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

    handleSearch(query) {
        this.searchQuery = query.toLowerCase();
        this.updateDisplay();
    }

    handleFilterType(type) {
        this.filterType = type;
        this.updateDisplay();
    }

    handleSort(field) {
        if (this.sortField === field) {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = field;
            this.sortOrder = 'asc';
        }
        this.updateDisplay();
    }

    getFilteredReports() {
        let filtered = (this.reports || []).filter(report => {
            const matchesSearch = !this.searchQuery ||
                report.name.toLowerCase().includes(this.searchQuery) ||
                (report.clusterName && report.clusterName.toLowerCase().includes(this.searchQuery)) ||
                (report.hostNames && report.hostNames.toLowerCase().includes(this.searchQuery));

            const matchesType = this.filterType === 'all' || report.targetType === this.filterType;

            return matchesSearch && matchesType;
        });

        return filtered.sort((a, b) => {
            let valA, valB;

            if (this.sortField === 'target') {
                valA = a.targetType === 'cluster' ? (a.clusterName || '') : (a.hostNames || '');
                valB = b.targetType === 'cluster' ? (b.clusterName || '') : (b.hostNames || '');
            } else if (this.sortField === 'status') {
                valA = a.hasData ? 1 : 0;
                valB = b.hasData ? 1 : 0;
            } else {
                valA = a[this.sortField];
                valB = b[this.sortField];
            }

            if (this.sortField === 'createdAt') {
                valA = new Date(valA).getTime();
                valB = new Date(valB).getTime();
            } else if (typeof valA === 'string') {
                valA = (valA || '').toLowerCase();
                valB = (valB || '').toLowerCase();
            }

            if (valA < valB) return this.sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return this.sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }



    renderReportsContent() {
        if (!this.reports || this.reports.length === 0) {
            return `
                <div class="reports-empty-state" style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                    <i class="fas fa-file-alt fa-3x"></i>
                    <p>${this.t('noReports')}</p>
                    <p>${this.t('createFirst')}</p>
                </div>
            `;
        }
        return this.renderReportsList();
    }

    renderReportsList() {
        const filteredReports = this.getFilteredReports();

        if (filteredReports.length === 0 && this.reports.length > 0) {
            return `
                <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #64748b;">
                    <i class="fas fa-search fa-2x" style="margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p>No results found matching your filters</p>
                </div>
            `;
        }

        return `
            <div style="flex: 1; overflow: auto; min-height: 0; border-radius: 6px;">
                <table class="audit-table-v2 compact-mode" style="font-size: 0.75rem; width: 100%; border-collapse: collapse; border-spacing: 0; table-layout: fixed;">
                    <thead>
                        <tr>
                            <th onclick="hyperVAuditorListInstance.handleSort('name')" style="width: 25%; padding: 0.75rem 0.5rem; cursor: pointer; user-select: none; position: sticky; top: 0; background: #0f172a; z-index: 10; border-bottom: 2px solid rgba(255, 255, 255, 0.1); text-align: left;">
                                ${this.t('name')} ${this.sortField === 'name' ? `<i class="fas fa-sort-${this.sortOrder === 'asc' ? 'up' : 'down'}" style="margin-left: 0.25rem;"></i>` : ''}
                            </th>
                            <th onclick="hyperVAuditorListInstance.handleSort('target')" style="width: 25%; padding: 0.75rem 0.5rem; cursor: pointer; user-select: none; position: sticky; top: 0; background: #0f172a; z-index: 10; border-bottom: 2px solid rgba(255, 255, 255, 0.1); text-align: left;">
                                ${this.t('target')} ${this.sortField === 'target' ? `<i class="fas fa-sort-${this.sortOrder === 'asc' ? 'up' : 'down'}" style="margin-left: 0.25rem;"></i>` : ''}
                            </th>
                            <th onclick="hyperVAuditorListInstance.handleSort('targetType')" style="width: 15%; padding: 0.75rem 0.5rem; cursor: pointer; user-select: none; position: sticky; top: 0; background: #0f172a; z-index: 10; border-bottom: 2px solid rgba(255, 255, 255, 0.1); text-align: left;">
                                ${this.t('type')} ${this.sortField === 'targetType' ? `<i class="fas fa-sort-${this.sortOrder === 'asc' ? 'up' : 'down'}" style="margin-left: 0.25rem;"></i>` : ''}
                            </th>
                            <th onclick="hyperVAuditorListInstance.handleSort('status')" style="width: 12%; padding: 0.75rem 0.5rem; cursor: pointer; user-select: none; position: sticky; top: 0; background: #0f172a; z-index: 10; border-bottom: 2px solid rgba(255, 255, 255, 0.1); text-align: left;">
                                ${this.t('status')} ${this.sortField === 'status' ? `<i class="fas fa-sort-${this.sortOrder === 'asc' ? 'up' : 'down'}" style="margin-left: 0.25rem;"></i>` : ''}
                            </th>
                            <th onclick="hyperVAuditorListInstance.handleSort('createdAt')" style="width: 15%; padding: 0.75rem 0.5rem; cursor: pointer; user-select: none; position: sticky; top: 0; background: #0f172a; z-index: 10; border-bottom: 2px solid rgba(255, 255, 255, 0.1); text-align: left;">
                                ${this.t('created')} ${this.sortField === 'createdAt' ? `<i class="fas fa-sort-${this.sortOrder === 'asc' ? 'up' : 'down'}" style="margin-left: 0.25rem;"></i>` : ''}
                            </th>
                            <th style="width: 12%; padding: 0.75rem 0.5rem; text-align: right; position: sticky; top: 0; background: #0f172a; z-index: 10; border-bottom: 2px solid rgba(255, 255, 255, 0.1);">${this.t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredReports.map(report => `
                            <tr onclick="hyperVAuditorListInstance.viewReport(${report.id})" style="cursor: pointer;">
                                <td style="padding: 0.35rem 0.5rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                    <span style="font-weight: 600;">${report.name}</span>
                                </td>
                                <td style="padding: 0.35rem 0.5rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                    <span style="color: #94a3b8;">
                                        ${report.targetType === 'cluster' && report.clusterName ? report.clusterName : report.hostNames || 'N/A'}
                                    </span>
                                </td>
                                <td style="padding: 0.35rem 0.5rem;">
                                    <span style="color: #60a5fa;">
                                        ${report.targetType === 'cluster' ? this.t('cluster') : this.t('host')}
                                    </span>
                                </td>
                                <td style="padding: 0.35rem 0.5rem;">
                                    ${report.hasData ? '<span style="color: #10b981;">Loaded</span>' : '<span style="color: #64748b;">Empty</span>'}
                                </td>
                                <td style="padding: 0.35rem 0.5rem;">
                                    <span style="font-family: monospace; color: #94a3b8;">${new Date(report.createdAt).toLocaleDateString()}</span>
                                </td>
                                <td style="padding: 0.35rem 0.5rem; text-align: right; white-space: nowrap;">
                                    <button class="premium-action-btn" style="display: inline-flex; width: 24px; height: 24px; padding: 0; justify-content: center; font-size: 0.75rem;" onclick="event.stopPropagation(); hyperVAuditorListInstance.triggerImport(${report.id})" title="${this.t('import')}">
                                        <i class="fas fa-upload"></i>
                                    </button>
                                    <button class="premium-action-btn" style="display: inline-flex; width: 24px; height: 24px; padding: 0; justify-content: center; color: #ef4444; border-color: rgba(239, 68, 68, 0.2); font-size: 0.75rem;" onclick="event.stopPropagation(); hyperVAuditorListInstance.deleteReport(${report.id})" title="${this.t('delete')}">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }



    async render() {
        return `
            <div class="page-container-full" style="height: calc(100vh - 120px); overflow: hidden; display: flex; flex-direction: column;">
                <input type="file" id="hyperv-list-file-input" style="display: none" onchange="hyperVAuditorListInstance.handleFileSelect(event)">
                <div style="padding: 1.5rem; display: flex; flex-direction: column; height: 100%; box-sizing: border-box;">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; flex-shrink: 0; gap: 1rem;">
                        <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1;">
                            <div style="position: relative; flex: 0 1 300px;">
                                <i class="fas fa-search" style="position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: #64748b; font-size: 0.8rem;"></i>
                                <input type="text" 
                                       placeholder="${this.t('search')}" 
                                       value="${this.searchQuery}"
                                       oninput="hyperVAuditorListInstance.handleSearch(this.value)"
                                       style="width: 100%; padding: 0 0.75rem 0 2.25rem; background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; color: white; font-size: 0.75rem; outline: none; height: 32px;">
                            </div>
                            
                            <div style="position: relative;">
                                <select onchange="hyperVAuditorListInstance.handleFilterType(this.value)"
                                        style="padding: 0 2rem 0 0.75rem; background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; color: white; font-size: 0.75rem; outline: none; cursor: pointer; appearance: none; min-width: 120px; height: 32px;">
                                    <option value="all" ${this.filterType === 'all' ? 'selected' : ''}>${this.t('all')}</option>
                                    <option value="host" ${this.filterType === 'host' ? 'selected' : ''}>${this.t('host')}</option>
                                    <option value="cluster" ${this.filterType === 'cluster' ? 'selected' : ''}>${this.t('cluster')}</option>
                                </select>
                                <i class="fas fa-chevron-down" style="position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); color: #64748b; font-size: 0.65rem; pointer-events: none;"></i>
                            </div>
                        </div>
                        
                        <div style="display: flex; gap: 0.5rem; flex-shrink: 0;">
                            <button class="premium-action-btn" onclick="hyperVAuditorListInstance.loadReports()" style="width: 32px; height: 32px; padding: 0; display: flex; justify-content: center; align-items: center;" title="Refresh">
                                <i class="fas fa-sync-alt ${this.loadingReports ? 'fa-spin' : ''}" style="font-size: 0.75rem;"></i>
                            </button>
                            
                            <button class="premium-action-btn primary" onclick="hyperVAuditorListInstance.showCreateReportModal()" style="padding: 0 0.6rem; font-size: 0.75rem; height: 32px;">
                                <i class="fas fa-plus" style="font-size: 0.7rem;"></i>
                                <span>${this.t('newReport')}</span>
                            </button>
                        </div>
                    </div>

                    <div id="reports-dynamic-content" style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
                        ${this.renderReportsContent()}
                    </div>
                </div>
            </div>

            <div id="modal-dynamic-content">
                ${this.showCreateModal ? this.renderCreateReportModal() : ''}
            </div>

            <div id="report-message" class="message" style="display: none;"></div>
        `;
    }

    renderCreateReportModal() {
        return `
            <div class="modal-overlay" onclick="hyperVAuditorListInstance.closeCreateModal()">
                <div class="modal-container" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>${this.t('newReport')}</h3>
                        <button class="modal-close" onclick="hyperVAuditorListInstance.closeCreateModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>${this.t('reportName')}</label>
                            <input type="text" id="report-name" class="form-input" placeholder="${this.t('enterReportName')}" required>
                        </div>
                        <div class="form-group">
                            <label>${this.t('targetType')}</label>
                            <select id="target-type" class="form-input" onchange="hyperVAuditorListInstance.updateTargetType()">
                                <option value="host">${this.t('host')}</option>
                                <option value="cluster">${this.t('cluster')}</option>
                            </select>
                        </div>
                        <div id="cluster-group" class="form-group" style="display: none;">
                            <label>${this.t('clusterName')}</label>
                            <input type="text" id="cluster-name" class="form-input" placeholder="${this.t('enterClusterName')}">
                        </div>
                        <div id="host-group" class="form-group">
                            <label>${this.t('hostNames')}</label>
                            <input type="text" id="host-names" class="form-input" placeholder="${this.t('enterHostNames')}">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="hyperVAuditorListInstance.closeCreateModal()">${this.t('cancel')}</button>
                        <button class="btn btn-primary" onclick="hyperVAuditorListInstance.createNewReport()">${this.t('create')}</button>
                    </div>
                </div>
            </div>
        `;
    }

    async mount() {
        if (!this.loadingReports && (!this.reports || this.reports.length === 0)) {
            await this.loadReports();
        }
    }

    async loadReports() {
        if (this.loadingReports) return;
        this.loadingReports = true;
        this.updateDisplay();

        try {
            const response = await fetch('/api/hyperv-reports');
            if (!response.ok) throw new Error('Failed to load reports');
            const data = await response.json();
            this.reports = Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Error loading reports:', error);
            this.reports = [];
            this.showMessage(this.t('failedToLoad'), 'error');
        } finally {
            this.loadingReports = false;
            this.updateDisplay();
        }
    }

    viewReport(id) {
        if (window.appInstance) {
            window.appInstance.navigateTo(`hyperv-auditor-details?id=${id}`);
        } else {
            // Fallback if appInstance not available
            window.location.hash = `hyperv-auditor-details?id=${id}`;
            window.location.reload();
        }
    }

    showCreateReportModal() {
        this.showCreateModal = true;
        this.updateDisplay();
    }

    closeCreateModal() {
        this.showCreateModal = false;
        this.updateDisplay();
    }

    async createNewReport() {
        const name = document.getElementById('report-name')?.value;
        const targetType = document.getElementById('target-type')?.value;
        const clusterName = document.getElementById('cluster-name')?.value;
        const hostNames = document.getElementById('host-names')?.value;

        if (!name) {
            this.showMessage(this.t('pleaseEnterName'), 'error');
            return;
        }

        if (targetType === 'cluster' && !clusterName) {
            this.showMessage(this.t('pleaseEnterCluster'), 'error');
            return;
        }

        if (targetType === 'host' && !hostNames) {
            this.showMessage(this.t('pleaseEnterHosts'), 'error');
            return;
        }

        try {
            const response = await fetch('/api/hyperv-reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    targetType,
                    clusterName: targetType === 'cluster' ? clusterName : '',
                    hostNames: targetType === 'host' ? hostNames : ''
                })
            });

            if (!response.ok) throw new Error('Failed to create report');

            this.closeCreateModal();
            await this.loadReports();
            this.showMessage(this.t('reportCreated'), 'success');
        } catch (error) {
            console.error('Error creating report:', error);
            this.showMessage(this.t('failedToCreate'), 'error');
        }
    }

    async deleteReport(id) {
        if (!confirm(this.t('confirmDelete'))) return;

        try {
            const response = await fetch(`/api/hyperv-reports?id=${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete report');

            await this.loadReports();
            this.showMessage(this.t('reportDeleted'), 'success');
        } catch (error) {
            console.error('Error deleting report:', error);
            this.showMessage(this.t('failedToDelete'), 'error');
        }
    }

    triggerImport(reportId) {
        this.importingReportId = reportId;
        const fileInput = document.getElementById('hyperv-list-file-input');
        if (fileInput) {
            fileInput.click();
        }
    }

    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file || !this.importingReportId) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const jsonData = JSON.parse(e.target.result);
                await this.importReportData(this.importingReportId, jsonData);
            } catch (error) {
                this.showMessage('Invalid JSON file: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset input
    }

    async importReportData(reportId, reportData) {
        try {
            const response = await fetch('/api/hyperv-reports/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reportId: parseInt(reportId),
                    reportData: JSON.stringify(reportData)
                })
            });

            if (!response.ok) throw new Error('Failed to import report');

            await this.loadReports();
            this.showMessage('Report imported successfully', 'success');
        } catch (error) {
            console.error('Error importing report:', error);
            this.showMessage('Failed to import report', 'error');
        } finally {
            this.importingReportId = null;
        }
    }

    updateTargetType() {
        const targetType = document.getElementById('target-type').value;
        const clusterGroup = document.getElementById('cluster-group');
        const hostGroup = document.getElementById('host-group');

        if (targetType === 'cluster') {
            clusterGroup.style.display = 'block';
            hostGroup.style.display = 'none';
        } else {
            clusterGroup.style.display = 'none';
            hostGroup.style.display = 'block';
        }
    }

    showMessage(message, type) {
        const messageEl = document.getElementById('report-message');
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `message message-${type}`;
            messageEl.style.display = 'block';
            setTimeout(() => {
                messageEl.style.display = 'none';
            }, 3000);
        }
    }

    updateDisplay() {
        const dynamicContent = document.getElementById('reports-dynamic-content');
        if (dynamicContent) {
            dynamicContent.innerHTML = this.renderReportsContent();
        }

        const modalContent = document.getElementById('modal-dynamic-content');
        if (modalContent) {
            modalContent.innerHTML = this.showCreateModal ? this.renderCreateReportModal() : '';
        }

        if (!dynamicContent && !modalContent) {
            const content = document.getElementById('page-content');
            if (content) {
                this.render().then(html => {
                    content.innerHTML = html;
                });
            }
        }
    }
}

