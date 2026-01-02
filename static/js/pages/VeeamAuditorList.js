export class VeeamAuditorListPage {
    constructor() {
        this.reports = [];
        this.showCreateModal = false;
        this.loadingReports = false;
        this.currentLanguage = localStorage.getItem('language') || 'en';
        this.translations = {
            en: {
                title: 'Veeam Backup & Replication Audits',
                subtitle: 'Manage and view your Veeam audits',
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
                enterServerName: 'Enter server name (e.g., VBR-SERVER01 or VBR-SERVER01.domain.com)',
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
                title: 'Audits Veeam Backup & Replication',
                subtitle: 'Gérer et visualiser vos audits Veeam',
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
                enterServerName: 'Entrez le nom du serveur (ex: VBR-SERVER01 ou VBR-SERVER01.domain.com)',
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
                <div class="page-header">
                    <div class="page-header-content">
                        <div>
                            <h1 class="page-title">☁️ ${this.t('title')}</h1>
                            <p class="page-subtitle">${this.t('subtitle')}</p>
                        </div>
                        <div class="page-header-actions">
                            <button class="btn btn-secondary btn-sm" onclick="veeamAuditorListInstance.showCreateReportModal()">
                                <i class="fas fa-plus"></i> ${this.t('newReport')}
                            </button>
                        </div>
                    </div>
                </div>

                ${!this.reports || this.reports.length === 0 ? `
                    <div class="reports-empty-state">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <p>${this.t('noReports')}</p>
                        <p>${this.t('createFirst')}</p>
                    </div>
                ` : `
                    <div class="reports-table-wrapper">
                        <table class="reports-table-compact">
                            <thead>
                                <tr>
                                    <th>${this.t('name')}</th>
                                    <th>${this.t('server')}</th>
                                    <th>${this.t('status')}</th>
                                    <th>${this.t('created')}</th>
                                    <th>${this.t('actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(this.reports || []).map(report => `
                                    <tr class="reports-table-row">
                                        <td>
                                            <div class="reports-table-name">
                                                <i class="fas fa-cloud-upload-alt"></i>
                                                <strong>${report.name}</strong>
                                            </div>
                                        </td>
                                        <td>
                                            <span>${report.serverName || 'N/A'}</span>
                                        </td>
                                        <td>
                                            ${report.hasData ? '<span class="reports-table-status reports-table-status-success"><i class="fas fa-check-circle"></i> Loaded</span>' : '<span class="reports-table-status reports-table-status-empty"><i class="fas fa-circle"></i> Empty</span>'}
                                        </td>
                                        <td>
                                            <span class="reports-table-date">${new Date(report.createdAt).toLocaleDateString()}</span>
                                        </td>
                                        <td>
                                            <div class="reports-table-actions" onclick="event.stopPropagation()">
                                                <button class="reports-table-action-btn reports-table-action-view" onclick="veeamAuditorListInstance.viewReport(${report.id})" title="${this.t('view')}">
                                                    <i class="fas fa-eye"></i>
                                                </button>
                                                <button class="reports-table-action-btn reports-table-action-delete" onclick="veeamAuditorListInstance.deleteReport(${report.id})" title="${this.t('delete')}">
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
            <div class="modal-overlay" onclick="veeamAuditorListInstance.closeCreateModal()">
                <div class="modal-container" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>${this.t('newReport')}</h3>
                        <button class="modal-close" onclick="veeamAuditorListInstance.closeCreateModal()">
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
                            <small style="color: #94a3b8; font-size: 0.75rem;">Enter the Veeam Backup & Replication server name (e.g., VBR-SERVER01 or VBR-SERVER01.domain.com)</small>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="veeamAuditorListInstance.closeCreateModal()">${this.t('cancel')}</button>
                        <button class="btn btn-primary" onclick="veeamAuditorListInstance.createNewReport()">${this.t('create')}</button>
                    </div>
                </div>
            </div>
        `;
    }

    async mount() {
        window.veeamAuditorListInstance = this;
        if (!this.loadingReports && (!this.reports || this.reports.length === 0)) {
            await this.loadReports();
        }
    }

    async loadReports() {
        if (this.loadingReports) return;
        this.loadingReports = true;

        try {
            const response = await fetch('/api/veeam-reports');
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
            window.appInstance.navigateTo(`veeam-auditor-details?id=${id}`);
        } else {
            window.location.hash = `veeam-auditor-details?id=${id}`;
            window.location.reload();
        }
    }

    showCreateReportModal() {
        this.showCreateModal = true;
        this.updateDisplay();
        setTimeout(() => {
            const nameInput = document.getElementById('report-name');
            if (nameInput) {
                nameInput.focus();
            }
        }, 100);
    }

    closeCreateModal() {
        this.showCreateModal = false;
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
            const response = await fetch('/api/veeam-reports', {
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
            const response = await fetch(`/api/veeam-reports/delete?id=${id}`, {
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

