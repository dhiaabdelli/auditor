export class WindowsServerAuditorListPage {
    constructor() {
        this.reports = [];
        this.showCreateModal = false;
        this.loadingReports = false;
        this.currentLanguage = localStorage.getItem('language') || 'en';
        this.translations = {
            en: {
                title: 'Windows Server Inventories',
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
                languageFrench: 'French'
            },
            fr: {
                title: 'Inventaires Windows Server',
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
                ${!this.reports || this.reports.length === 0 ? `
                    <div class="reports-empty-state">
                        <i class="fas fa-server fa-3x"></i>
                        <p>${this.t('noReports')}</p>
                        <p>${this.t('createFirst')}</p>
                    </div>
                ` : `
                    <div class="reports-grid-modern">
                        ${(this.reports || []).map(report => `
                            <div class="report-card-modern" onclick="windowsServerAuditorListInstance.viewReport(${report.id})">
                                <div class="report-card-header-modern">
                                    <div class="report-card-icon-modern" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%);">
                                        <i class="fas fa-server" style="color: #3b82f6;"></i>
                                    </div>
                                    <div class="report-card-title-section">
                                        <h3 class="report-card-title-modern">${report.name}</h3>
                                        <div class="report-card-meta">
                                            <span class="report-card-server">
                                                <i class="fas fa-server" style="font-size: 0.6875rem; margin-right: 0.25rem;"></i>
                                                <span style="font-family: 'Consolas', 'Monaco', monospace; font-size: 0.75rem;">${report.serverName || 'N/A'}</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div class="report-card-body-modern">
                                    <div class="report-card-info-row">
                                        <div class="report-card-info-item">
                                            <span class="report-card-info-label">Status</span>
                                            ${report.hasData ? '<span class="report-card-status report-card-status-success"><i class="fas fa-check-circle"></i> Loaded</span>' : '<span class="report-card-status report-card-status-empty"><i class="fas fa-circle"></i> Empty</span>'}
                                        </div>
                                        <div class="report-card-info-item">
                                            <span class="report-card-info-label">Created</span>
                                            <span class="report-card-date">${new Date(report.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}

                ${this.showCreateModal ? this.renderCreateReportModal() : ''}

                <div id="report-message" class="message" style="display: none;"></div>
            </div>
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
            });
        }
    }
}


















