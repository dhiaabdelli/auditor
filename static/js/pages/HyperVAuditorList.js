export class HyperVAuditorListPage {
    constructor() {
        this.reports = [];
        this.showCreateModal = false;
        this.loadingReports = false;
        this.currentLanguage = localStorage.getItem('language') || 'en';
        this.translations = {
            en: {
                title: 'Hyper-V Inventories',
                subtitle: 'Manage and view your Hyper-V inventories',
                newReport: 'New Report',
                noReports: 'No reports created yet',
                createFirst: 'Click "New Report" to create your first report',
                name: 'Name',
                type: 'Type',
                target: 'Target',
                status: 'Status',
                created: 'Created',
                actions: 'Actions',
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
                languageFrench: 'French'
            },
            fr: {
                title: 'Inventaires Hyper-V',
                subtitle: 'Gérer et visualiser vos inventaires Hyper-V',
                newReport: 'Nouveau Rapport',
                noReports: 'Aucun rapport créé',
                createFirst: 'Cliquez sur "Nouveau Rapport" pour créer votre premier rapport',
                name: 'Nom',
                type: 'Type',
                target: 'Cible',
                status: 'Statut',
                created: 'Créé',
                actions: 'Actions',
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
                languageFrench: 'Français'
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

    async render() {
        return `
            <div class="page-container-full">
                <div class="page-header">
                    <div class="page-header-content">
                        <div>
                            <h1 class="page-title">📊 ${this.t('title')}</h1>
                            <p class="page-subtitle">${this.t('subtitle')}</p>
                        </div>
                        <div class="page-header-actions">
                            <button class="btn btn-secondary btn-sm" onclick="hyperVAuditorListInstance.showCreateReportModal()">
                                <i class="fas fa-plus"></i> ${this.t('newReport')}
                            </button>
                        </div>
                    </div>
                </div>

                ${!this.reports || this.reports.length === 0 ? `
                    <div class="reports-empty-state">
                        <i class="fas fa-file-alt"></i>
                        <p>${this.t('noReports')}</p>
                        <p>${this.t('createFirst')}</p>
                    </div>
                ` : `
                    <div class="reports-table-wrapper">
                        <table class="reports-table-compact">
                            <thead>
                                <tr>
                                    <th>${this.t('name')}</th>
                                    <th>${this.t('type')}</th>
                                    <th>${this.t('target')}</th>
                                    <th>${this.t('status')}</th>
                                    <th>${this.t('created')}</th>
                                    <th>${this.t('actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(this.reports || []).map(report => `
                                    <tr class="reports-table-row" 
                                        onclick="hyperVAuditorListInstance.viewReport(${report.id})">
                                        <td>
                                            <div class="reports-table-name">
                                                <i class="fas fa-file-alt"></i>
                                                <strong>${report.name}</strong>
                                            </div>
                                        </td>
                                        <td>
                                            <span class="reports-table-type">${report.targetType === 'cluster' ? this.t('cluster') : this.t('host')}</span>
                                        </td>
                                        <td>
                                            ${report.targetType === 'cluster' && report.clusterName ? `
                                                <span>${report.clusterName}</span>
                                            ` : report.hostNames ? `
                                                <span>${report.hostNames}</span>
                                            ` : '<span class="reports-table-na">N/A</span>'}
                                        </td>
                                        <td>
                                            ${report.hasData ? '<span class="reports-table-status reports-table-status-success"><i class="fas fa-check-circle"></i> Loaded</span>' : '<span class="reports-table-status reports-table-status-empty"><i class="fas fa-circle"></i> Empty</span>'}
                                        </td>
                                        <td>
                                            <span class="reports-table-date">${new Date(report.createdAt).toLocaleDateString()}</span>
                                        </td>
                                        <td>
                                            <div class="reports-table-actions" onclick="event.stopPropagation()">
                                                <button class="reports-table-action-btn reports-table-action-view" onclick="hyperVAuditorListInstance.viewReport(${report.id})" title="${this.t('view')}">
                                                    <i class="fas fa-eye"></i>
                                                </button>
                                                <button class="reports-table-action-btn reports-table-action-delete" onclick="hyperVAuditorListInstance.deleteReport(${report.id})" title="${this.t('delete')}">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `}

                ${this.showCreateModal ? this.renderCreateReportModal() : ''}

                <div id="report-message" class="message" style="display: none;"></div>
            </div>
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
        window.hyperVAuditorListInstance = this;
        if (!this.loadingReports && (!this.reports || this.reports.length === 0)) {
            await this.loadReports();
        }
    }

    async loadReports() {
        if (this.loadingReports) return;
        this.loadingReports = true;

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
            // Update display without calling mount to avoid infinite loop
            const content = document.getElementById('page-content');
            if (content) {
                this.render().then(html => {
                    content.innerHTML = html;
                });
            }
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
        const content = document.getElementById('page-content');
        if (content) {
            this.render().then(html => {
                content.innerHTML = html;
                // Don't call mount() here to avoid infinite loop
                // mount() is called by app.js after render
            });
        }
    }
}

