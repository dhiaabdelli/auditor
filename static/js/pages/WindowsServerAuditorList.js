export class WindowsServerAuditorListPage {
    constructor() {
        this.reports = [];
        this.showCreateModal = false;
        this.loadingReports = false;
        this.searchQuery = '';
        this.sortField = 'createdAt';
        this.sortOrder = 'desc';
        this.currentLanguage = localStorage.getItem('language') || 'en';
        this.translations = {
            en: {
                title: 'Windows Server Audits',
                subtitle: 'Manage and view your Windows Server audits',
                newReport: 'New Audit',
                noReports: 'No audits created yet',
                createFirst: 'Click "New Audit" to create your first audit',
                name: 'Name',
                server: 'Server',
                address: 'Address',
                status: 'Status',
                created: 'Created',
                actions: 'Actions',
                import: 'Import',
                view: 'View',
                delete: 'Delete',
                audit: 'Run Audit',
                reportName: 'Audit Name',
                enterReportName: 'Enter audit name',
                serverName: 'Server Name',
                enterServerName: 'Enter server name (e.g., SERVER01 or SERVER01.domain.com)',
                create: 'Create',
                cancel: 'Cancel',
                pleaseEnterName: 'Please enter an audit name',
                pleaseEnterServer: 'Please enter a server name',
                reportCreated: 'Audit created successfully',
                failedToCreate: 'Failed to create audit',
                confirmDelete: 'Are you sure you want to delete this audit?',
                reportDeleted: 'Audit deleted successfully',
                failedToDelete: 'Failed to delete audit',
                failedToLoad: 'Failed to load audits',
                auditing: 'Auditing...',
                auditSuccess: 'Audit completed successfully',
                auditFailed: 'Audit failed',
                language: 'Language',
                languageLabel: 'Language',
                languageEnglish: 'English',
                languageFrench: 'French',
                search: 'Search audits...'
            },
            fr: {
                title: 'Audits Windows Server',
                subtitle: 'Gérer et visualiser vos audits Windows Server',
                newReport: 'Nouvel Audit',
                noReports: 'Aucun audit créé',
                createFirst: 'Cliquez sur "Nouvel Audit" pour créer votre premier audit',
                name: 'Nom',
                server: 'Serveur',
                address: 'Adresse',
                status: 'Statut',
                created: 'Créé',
                actions: 'Actions',
                import: 'Importer',
                view: 'Voir',
                delete: 'Supprimer',
                audit: 'Exécuter Audit',
                reportName: 'Nom de l\'Audit',
                enterReportName: 'Entrez le nom de l\'audit',
                serverName: 'Nom du Serveur',
                enterServerName: 'Entrez le nom du serveur (ex: SERVER01 ou SERVER01.domain.com)',
                create: 'Créer',
                cancel: 'Annuler',
                pleaseEnterName: 'Veuillez entrer un nom d\'audit',
                pleaseEnterServer: 'Veuillez entrer un nom de serveur',
                reportCreated: 'Audit créé avec succès',
                failedToCreate: 'Échec de la création de l\'audit',
                confirmDelete: 'Êtes-vous sûr de vouloir supprimer cet audit ?',
                reportDeleted: 'Audit supprimé avec succès',
                failedToDelete: 'Échec de la suppression de l\'audit',
                failedToLoad: 'Échec du chargement des audits',
                auditing: 'Audit en cours...',
                auditSuccess: 'Audit terminé avec succès',
                auditFailed: 'Échec de l\'audit',
                language: 'Langue',
                languageLabel: 'Langue',
                languageEnglish: 'Anglais',
                languageFrench: 'Français',
                search: 'Rechercher...'
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
                (report.serverName && report.serverName.toLowerCase().includes(this.searchQuery));
            return matchesSearch;
        });

        return filtered.sort((a, b) => {
            let valA = a[this.sortField];
            let valB = b[this.sortField];

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
                    <i class="fas fa-server fa-3x"></i>
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
                    <p>No results found matching your search</p>
                </div>
            `;
        }

        return `
            <div style="flex: 1; overflow: auto; min-height: 0; border-radius: 6px;">
                <table class="audit-table-v2 compact-mode" style="font-size: 0.75rem; width: 100%; border-collapse: collapse; border-spacing: 0; table-layout: fixed;">
                    <thead>
                        <tr>
                            <th onclick="windowsServerAuditorListInstance.handleSort('name')" style="width: 35%; padding: 0.75rem 0.5rem; cursor: pointer; user-select: none; position: sticky; top: 0; background: #0f172a; z-index: 10; border-bottom: 2px solid rgba(255, 255, 255, 0.1); text-align: left;">
                                ${this.t('name')} ${this.sortField === 'name' ? `<i class="fas fa-sort-${this.sortOrder === 'asc' ? 'up' : 'down'}" style="margin-left: 0.25rem;"></i>` : ''}
                            </th>
                            <th onclick="windowsServerAuditorListInstance.handleSort('serverName')" style="width: 30%; padding: 0.75rem 0.5rem; cursor: pointer; user-select: none; position: sticky; top: 0; background: #0f172a; z-index: 10; border-bottom: 2px solid rgba(255, 255, 255, 0.1); text-align: left;">
                                ${this.t('server')} ${this.sortField === 'serverName' ? `<i class="fas fa-sort-${this.sortOrder === 'asc' ? 'up' : 'down'}" style="margin-left: 0.25rem;"></i>` : ''}
                            </th>
                            <th style="width: 15%; padding: 0.75rem 0.5rem; position: sticky; top: 0; background: #0f172a; z-index: 10; border-bottom: 2px solid rgba(255, 255, 255, 0.1); text-align: left;">
                                ${this.t('status')}
                            </th>
                            <th onclick="windowsServerAuditorListInstance.handleSort('createdAt')" style="width: 12%; padding: 0.75rem 0.5rem; cursor: pointer; user-select: none; position: sticky; top: 0; background: #0f172a; z-index: 10; border-bottom: 2px solid rgba(255, 255, 255, 0.1); text-align: left;">
                                ${this.t('created')} ${this.sortField === 'createdAt' ? `<i class="fas fa-sort-${this.sortOrder === 'asc' ? 'up' : 'down'}" style="margin-left: 0.25rem;"></i>` : ''}
                            </th>
                            <th style="width: 12%; padding: 0.75rem 0.5rem; text-align: right; position: sticky; top: 0; background: #0f172a; z-index: 10; border-bottom: 2px solid rgba(255, 255, 255, 0.1);">${this.t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredReports.map(report => `
                            <tr onclick="windowsServerAuditorListInstance.viewReport(${report.id})" style="cursor: pointer;">
                                <td style="padding: 0.35rem 0.5rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                    <span style="font-weight: 600;">${report.name}</span>
                                </td>
                                <td style="padding: 0.35rem 0.5rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                    <span style="color: #94a3b8;">
                                        <i class="fas fa-server" style="margin-right: 0.375rem; font-size: 0.75rem; opacity: 0.5;"></i>
                                        ${report.serverName || 'N/A'}
                                    </span>
                                </td>
                                <td style="padding: 0.35rem 0.5rem;">
                                    ${report.hasData ? '<span style="color: #10b981;">Loaded</span>' : '<span style="color: #64748b;">Empty</span>'}
                                </td>
                                <td style="padding: 0.35rem 0.5rem;">
                                    <span style="font-family: monospace; color: #94a3b8;">${new Date(report.createdAt).toLocaleDateString()}</span>
                                </td>
                                <td style="padding: 0.35rem 0.5rem; text-align: right; white-space: nowrap;">
                                    <button class="premium-action-btn" style="display: inline-flex; width: 24px; height: 24px; padding: 0; justify-content: center; font-size: 0.75rem;" onclick="event.stopPropagation(); windowsServerAuditorListInstance.triggerImport(${report.id})" title="${this.t('import')}">
                                        <i class="fas fa-upload"></i>
                                    </button>
                                    <button class="premium-action-btn" style="display: inline-flex; width: 24px; height: 24px; padding: 0; justify-content: center; color: #ef4444; border-color: rgba(239, 68, 68, 0.2); font-size: 0.75rem;" onclick="event.stopPropagation(); windowsServerAuditorListInstance.deleteReport(${report.id})" title="${this.t('delete')}">
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
                <input type="file" id="windows-server-list-file-input" style="display: none" onchange="windowsServerAuditorListInstance.handleFileSelect(event)">
                <div style="padding: 1.5rem; display: flex; flex-direction: column; height: 100%; box-sizing: border-box;">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; flex-shrink: 0; gap: 1rem;">
                        <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1;">
                            <div style="position: relative; flex: 0 1 300px;">
                                <i class="fas fa-search" style="position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: #64748b; font-size: 0.8rem;"></i>
                                <input type="text" 
                                       placeholder="${this.t('search')}" 
                                       value="${this.searchQuery}"
                                       oninput="windowsServerAuditorListInstance.handleSearch(this.value)"
                                       style="width: 100%; padding: 0 0.75rem 0 2.25rem; background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; color: white; font-size: 0.75rem; outline: none; height: 32px;">
                            </div>
                        </div>
                        
                        <div style="display: flex; gap: 0.5rem; flex-shrink: 0;">
                            <button class="premium-action-btn" onclick="windowsServerAuditorListInstance.loadReports()" style="width: 32px; height: 32px; padding: 0; display: flex; justify-content: center; align-items: center;" title="Refresh">
                                <i class="fas fa-sync-alt ${this.loadingReports ? 'fa-spin' : ''}" style="font-size: 0.75rem;"></i>
                            </button>
                            
                            <button class="premium-action-btn primary" onclick="windowsServerAuditorListInstance.showCreateReportModal()" style="padding: 0 0.6rem; font-size: 0.75rem; height: 32px;">
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
            <div class="modal-overlay" onclick="windowsServerAuditorListInstance.closeCreateModal()">
                <div class="modal-container" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>${this.t('newReport')}</h3>
                        <button class="modal-close" onclick="windowsServerAuditorListInstance.closeCreateModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>${this.t('reportName')}</label>
                            <input type="text" id="report-name" class="form-input" placeholder="${this.t('enterReportName')}" required>
                        </div>
                        <div class="form-group">
                            <label>${this.t('serverName')}</label>
                            <input type="text" id="server-name" class="form-input" placeholder="${this.t('enterServerName')}" required>
                            <small style="color: #94a3b8; font-size: 0.75rem;">Enter the server name (e.g., SERVER01 or SERVER01.domain.com)</small>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="windowsServerAuditorListInstance.closeCreateModal()">${this.t('cancel')}</button>
                        <button class="btn btn-primary" onclick="windowsServerAuditorListInstance.createNewReport()">${this.t('create')}</button>
                    </div>
                </div>
            </div>
        `;
    }

    async mount() {
        window.windowsServerAuditorListInstance = this;
        if (!this.loadingReports && (!this.reports || this.reports.length === 0)) {
            await this.loadReports();
        }
    }

    async loadReports() {
        if (this.loadingReports) return;
        this.loadingReports = true;
        this.updateDisplay();

        try {
            const response = await fetch('/api/windows-server-reports');
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
            window.appInstance.navigateTo(`windows-server-auditor-details?id=${id}`);
        } else {
            window.location.hash = `windows-server-auditor-details?id=${id}`;
            window.location.reload();
        }
    }


    showCreateReportModal() {
        this.showCreateModal = true;
        this.updateDisplay();
        // Focus on the first input after modal is rendered
        setTimeout(() => {
            const nameInput = document.getElementById('report-name');
            if (nameInput) {
                nameInput.focus();
            }
        }, 100);
    }

    closeCreateModal() {
        this.showCreateModal = false;
        // Clear form fields when closing
        setTimeout(() => {
            const nameInput = document.getElementById('report-name');
            const serverNameInput = document.getElementById('server-name');

            if (nameInput) nameInput.value = '';
            if (serverNameInput) serverNameInput.value = '';
        }, 50);
        this.updateDisplay();
    }

    async createNewReport() {
        const name = document.getElementById('report-name')?.value?.trim();
        const serverName = document.getElementById('server-name')?.value?.trim();

        if (!name) {
            this.showMessage(this.t('pleaseEnterName'), 'error');
            const nameInput = document.getElementById('report-name');
            if (nameInput) nameInput.focus();
            return;
        }

        if (!serverName) {
            this.showMessage(this.t('pleaseEnterServer'), 'error');
            const serverNameInput = document.getElementById('server-name');
            if (serverNameInput) serverNameInput.focus();
            return;
        }

        try {
            const response = await fetch('/api/windows-server-reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    serverName
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = 'Failed to create audit';
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error || errorMessage;
                } catch {
                    errorMessage = errorText || errorMessage;
                }
                throw new Error(errorMessage);
            }

            this.closeCreateModal();
            await this.loadReports();
            this.showMessage(this.t('reportCreated'), 'success');
        } catch (error) {
            console.error('Error creating audit:', error);
            this.showMessage(this.t('failedToCreate') + ': ' + error.message, 'error');
        }
    }

    async deleteReport(id) {
        if (!confirm(this.t('confirmDelete'))) return;

        try {
            const response = await fetch(`/api/windows-server-reports/delete?id=${id}`, {
                method: 'GET'
            });

            if (!response.ok) throw new Error('Failed to delete audit');

            await this.loadReports();
            this.showMessage(this.t('reportDeleted'), 'success');
        } catch (error) {
            console.error('Error deleting audit:', error);
            this.showMessage(this.t('failedToDelete'), 'error');
        }
    }

    triggerImport(reportId) {
        this.importingReportId = reportId;
        const fileInput = document.getElementById('windows-server-list-file-input');
        if (fileInput) {
            fileInput.click();
        }
    }

    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file || !this.importingReportId) return;

        this.showMessage('Importing report...', 'info');

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('reportId', this.importingReportId);

            const response = await fetch('/api/windows-server-reports/import', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Failed to import report');

            await this.loadReports();
            this.showMessage('Report imported successfully', 'success');
        } catch (error) {
            console.error('Error importing report:', error);
            this.showMessage('Failed to import report: ' + error.message, 'error');
        } finally {
            this.importingReportId = null;
            event.target.value = '';
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


















