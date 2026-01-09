export class LinuxServerAuditorPage {
    constructor() {
        this.reportData = null;
        this.reportId = null;
        this.loading = false;
        this.currentLanguage = localStorage.getItem('language') || 'en';
        this.activeView = 'overview';
        this.translations = {
            en: {
                title: 'Linux Server Audit',
                subtitle: 'Comprehensive audit report for Linux Server',
                loading: 'Loading audit report...',
                error: 'Error loading report',
                back: 'Back to List',
                systemInfo: 'System Information',
                network: 'Network Configuration',
                disks: 'Disk Information',
                packages: 'Installed Packages',
                services: 'Services',
                users: 'Users',
                groups: 'Groups',
                listeningPorts: 'Listening Ports',
                processes: 'Processes',
                noData: 'No audit data available',
                importData: 'Import Data',
                downloadScript: 'Download Script',
                hostname: 'Hostname',
                os: 'Operating System',
                kernel: 'Kernel',
                architecture: 'Architecture',
                uptime: 'Uptime',
                cpuModel: 'CPU Model',
                cpuCores: 'CPU Cores',
                memoryTotalGB: 'Total Memory (GB)',
                memoryAvailableGB: 'Available Memory (GB)',
                memoryUsedGB: 'Used Memory (GB)',
                memoryUsagePercent: 'Memory Usage (%)',
                name: 'Name',
                version: 'Version',
                status: 'Status',
                enabled: 'Enabled',
                uid: 'UID',
                gid: 'GID',
                home: 'Home',
                shell: 'Shell',
                protocol: 'Protocol',
                localAddress: 'Local Address',
                state: 'State',
                user: 'User',
                pid: 'PID',
                cpu: 'CPU %',
                mem: 'Memory %',
                command: 'Command',
                filesystem: 'Filesystem',
                size: 'Size',
                used: 'Used',
                available: 'Available',
                usePercent: 'Use %',
                mounted: 'Mounted'
            },
            fr: {
                title: 'Audit Linux Server',
                subtitle: 'Rapport d\'audit complet pour Linux Server',
                loading: 'Chargement du rapport d\'audit...',
                error: 'Erreur lors du chargement du rapport',
                back: 'Retour à la liste',
                systemInfo: 'Informations Système',
                network: 'Configuration Réseau',
                disks: 'Informations Disques',
                packages: 'Packages Installés',
                services: 'Services',
                users: 'Utilisateurs',
                groups: 'Groupes',
                listeningPorts: 'Ports en Écoute',
                processes: 'Processus',
                noData: 'Aucune donnée d\'audit disponible',
                importData: 'Importer Données',
                downloadScript: 'Télécharger Script',
                hostname: 'Nom d\'Hôte',
                os: 'Système d\'Exploitation',
                kernel: 'Noyau',
                architecture: 'Architecture',
                uptime: 'Temps de Fonctionnement',
                cpuModel: 'Modèle CPU',
                cpuCores: 'Cœurs CPU',
                memoryTotalGB: 'Mémoire Totale (Go)',
                memoryAvailableGB: 'Mémoire Disponible (Go)',
                memoryUsedGB: 'Mémoire Utilisée (Go)',
                memoryUsagePercent: 'Utilisation Mémoire (%)',
                name: 'Nom',
                version: 'Version',
                status: 'Statut',
                enabled: 'Activé',
                uid: 'UID',
                gid: 'GID',
                home: 'Domicile',
                shell: 'Shell',
                protocol: 'Protocole',
                localAddress: 'Adresse Locale',
                state: 'État',
                user: 'Utilisateur',
                pid: 'PID',
                cpu: 'CPU %',
                mem: 'Mémoire %',
                command: 'Commande',
                filesystem: 'Système de Fichiers',
                size: 'Taille',
                used: 'Utilisé',
                available: 'Disponible',
                usePercent: 'Utilisation %',
                mounted: 'Monté'
            }
        };
    }

    t(key) {
        return this.translations[this.currentLanguage][key] || key;
    }

    async render() {
        const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
        this.reportId = urlParams.get('id');

        if (this.loading) {
            return `
                <div class="page-container-full">
                    <div class="loading-container">
                        <div class="spinner"></div>
                        <p>${this.t('loading')}</p>
                    </div>
                </div>
            `;
        }

        if (!this.reportData) {
            return `
                <div class="page-container-full">
                    <input type="file" id="linux-report-file-input" accept=".json" style="display: none;" onchange="linuxServerAuditorInstance.handleFileSelect(event)">
                    <div class="reports-empty-state">
                        <i class="fab fa-linux fa-3x"></i>
                        <p>${this.t('noData')}</p>
                        <p style="margin-top: 1rem; color: #94a3b8; font-size: 0.875rem;">
                            Click "Script" to download the bash script, run it on your Linux server, then click "Import" to upload the JSON output.
                        </p>
                    </div>
                </div>
            `;
        }

        const data = this.reportData;
        const packages = data.packages || [];
        const services = data.services || [];
        const users = data.users || [];
        const groups = data.groups || [];
        const listeningPorts = data.listeningPorts || [];
        const processes = data.processes || [];
        const disks = data.disks || [];

        return `
            <div class="page-container-full file-share-auditor-layout">
                <input type="file" id="linux-report-file-input" accept=".json" style="display: none;" onchange="linuxServerAuditorInstance.handleFileSelect(event)">
                <!-- Sidebar Overlay (Mobile) -->
                <div class="file-share-auditor-sidebar-overlay" id="sidebar-overlay" onclick="linuxServerAuditorInstance.closeSidebar()"></div>
                <!-- Sidebar Navigation -->
                <div class="file-share-auditor-sidebar" id="auditor-sidebar">
                    <div class="file-share-auditor-sidebar-nav">
                        <div class="file-share-auditor-nav-item ${this.activeView === 'overview' ? 'active' : ''}" 
                             onclick="linuxServerAuditorInstance.switchView('overview')">
                            <i class="fas fa-chart-line"></i>
                            <span>Overview</span>
                        </div>
                        ${packages.length > 0 ? `
                        <div class="file-share-auditor-nav-item ${this.activeView === 'packages' ? 'active' : ''}" 
                             onclick="linuxServerAuditorInstance.switchView('packages')">
                            <i class="fas fa-box"></i>
                            <span>Packages</span>
                            <span style="margin-left: auto; color: #64748b; font-size: 0.75rem;">(${packages.length})</span>
                        </div>
                        ` : ''}
                        ${services.length > 0 ? `
                        <div class="file-share-auditor-nav-item ${this.activeView === 'services' ? 'active' : ''}" 
                             onclick="linuxServerAuditorInstance.switchView('services')">
                            <i class="fas fa-cog"></i>
                            <span>Services</span>
                            <span style="margin-left: auto; color: #64748b; font-size: 0.75rem;">(${services.length})</span>
                        </div>
                        ` : ''}
                        ${users.length > 0 ? `
                        <div class="file-share-auditor-nav-item ${this.activeView === 'users' ? 'active' : ''}" 
                             onclick="linuxServerAuditorInstance.switchView('users')">
                            <i class="fas fa-users"></i>
                            <span>Users</span>
                            <span style="margin-left: auto; color: #64748b; font-size: 0.75rem;">(${users.length})</span>
                        </div>
                        ` : ''}
                        ${groups.length > 0 ? `
                        <div class="file-share-auditor-nav-item ${this.activeView === 'groups' ? 'active' : ''}" 
                             onclick="linuxServerAuditorInstance.switchView('groups')">
                            <i class="fas fa-users-cog"></i>
                            <span>Groups</span>
                            <span style="margin-left: auto; color: #64748b; font-size: 0.75rem;">(${groups.length})</span>
                        </div>
                        ` : ''}
                        ${listeningPorts.length > 0 ? `
                        <div class="file-share-auditor-nav-item ${this.activeView === 'listening-ports' ? 'active' : ''}" 
                             onclick="linuxServerAuditorInstance.switchView('listening-ports')">
                            <i class="fas fa-network-wired"></i>
                            <span>Listening Ports</span>
                            <span style="margin-left: auto; color: #64748b; font-size: 0.75rem;">(${listeningPorts.length})</span>
                        </div>
                        ` : ''}
                        ${processes.length > 0 ? `
                        <div class="file-share-auditor-nav-item ${this.activeView === 'processes' ? 'active' : ''}" 
                             onclick="linuxServerAuditorInstance.switchView('processes')">
                            <i class="fas fa-microchip"></i>
                            <span>Processes</span>
                            <span style="margin-left: auto; color: #64748b; font-size: 0.75rem;">(${processes.length})</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                <!-- Main Content -->
                <div class="file-share-auditor-content">
                    ${this.renderView(data)}
                </div>
            </div>
        `;
    }

    renderView(data) {
        switch (this.activeView) {
            case 'overview':
                return this.renderOverviewView(data);
            case 'packages':
                return this.renderPackagesView(data.packages || []);
            case 'services':
                return this.renderServicesView(data.services || []);
            case 'users':
                return this.renderUsersView(data.users || []);
            case 'groups':
                return this.renderGroupsView(data.groups || []);
            case 'listening-ports':
                return this.renderListeningPortsView(data.listeningPorts || []);
            case 'processes':
                return this.renderProcessesView(data.processes || []);
            default:
                return this.renderOverviewView(data);
        }
    }

    renderOverviewView(data) {
        return `
            <div class="file-share-auditor-main">
                <div class="section-modern">
                    <h2 class="section-title-modern">${this.t('systemInfo')}</h2>
                    <div class="info-grid-modern">
                        <div class="info-item-modern">
                            <span class="info-label-modern">${this.t('hostname')}</span>
                            <span class="info-value-modern">${data.hostname || 'N/A'}</span>
                        </div>
                        <div class="info-item-modern">
                            <span class="info-label-modern">${this.t('os')}</span>
                            <span class="info-value-modern">${data.os || 'N/A'}</span>
                        </div>
                        <div class="info-item-modern">
                            <span class="info-label-modern">${this.t('kernel')}</span>
                            <span class="info-value-modern">${data.kernel || 'N/A'}</span>
                        </div>
                        <div class="info-item-modern">
                            <span class="info-label-modern">${this.t('architecture')}</span>
                            <span class="info-value-modern">${data.architecture || 'N/A'}</span>
                        </div>
                        <div class="info-item-modern">
                            <span class="info-label-modern">${this.t('uptime')}</span>
                            <span class="info-value-modern">${data.uptime || 'N/A'}</span>
                        </div>
                        <div class="info-item-modern">
                            <span class="info-label-modern">${this.t('cpuModel')}</span>
                            <span class="info-value-modern">${data.cpuModel || 'N/A'}</span>
                        </div>
                        <div class="info-item-modern">
                            <span class="info-label-modern">${this.t('cpuCores')}</span>
                            <span class="info-value-modern">${data.cpuCores || 'N/A'}</span>
                        </div>
                        <div class="info-item-modern">
                            <span class="info-label-modern">${this.t('memoryTotalGB')}</span>
                            <span class="info-value-modern">${data.memoryTotalGB || 'N/A'} GB</span>
                        </div>
                        <div class="info-item-modern">
                            <span class="info-label-modern">${this.t('memoryAvailableGB')}</span>
                            <span class="info-value-modern">${data.memoryAvailableGB || 'N/A'} GB</span>
                        </div>
                        <div class="info-item-modern">
                            <span class="info-label-modern">${this.t('memoryUsedGB')}</span>
                            <span class="info-value-modern">${data.memoryUsedGB || 'N/A'} GB</span>
                        </div>
                        <div class="info-item-modern">
                            <span class="info-label-modern">${this.t('memoryUsagePercent')}</span>
                            <span class="info-value-modern">${data.memoryUsagePercent || 'N/A'}%</span>
                        </div>
                    </div>
                </div>
                ${data.disks && data.disks.length > 0 ? `
                <div class="section-modern">
                    <h2 class="section-title-modern">${this.t('disks')}</h2>
                    <div class="table-container-modern">
                        <table class="table-modern">
                            <thead>
                                <tr>
                                    <th>${this.t('filesystem')}</th>
                                    <th>${this.t('size')}</th>
                                    <th>${this.t('used')}</th>
                                    <th>${this.t('available')}</th>
                                    <th>${this.t('usePercent')}</th>
                                    <th>${this.t('mounted')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.disks.map(disk => `
                                    <tr>
                                        <td>${disk.filesystem || '-'}</td>
                                        <td>${disk.size || '-'}</td>
                                        <td>${disk.used || '-'}</td>
                                        <td>${disk.available || '-'}</td>
                                        <td>${disk.usePercent || '-'}</td>
                                        <td>${disk.mounted || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }

    renderPackagesView(packages) {
        return `
            <div class="file-share-auditor-main">
                <div class="section-modern">
                    <h2 class="section-title-modern">${this.t('packages')} (${packages.length})</h2>
                    <div class="table-container-modern">
                        <table class="table-modern">
                            <thead>
                                <tr>
                                    <th>${this.t('name')}</th>
                                    <th>${this.t('version')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${packages.map(pkg => `
                                    <tr>
                                        <td>${pkg.name || '-'}</td>
                                        <td>${pkg.version || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    renderServicesView(services) {
        return `
            <div class="file-share-auditor-main">
                <div class="section-modern">
                    <h2 class="section-title-modern">${this.t('services')} (${services.length})</h2>
                    <div class="table-container-modern">
                        <table class="table-modern">
                            <thead>
                                <tr>
                                    <th>${this.t('name')}</th>
                                    <th>${this.t('status')}</th>
                                    <th>${this.t('enabled')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${services.map(service => `
                                    <tr>
                                        <td>${service.name || '-'}</td>
                                        <td>${service.status || '-'}</td>
                                        <td>${service.enabled || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    renderUsersView(users) {
        return `
            <div class="file-share-auditor-main">
                <div class="section-modern">
                    <h2 class="section-title-modern">${this.t('users')} (${users.length})</h2>
                    <div class="table-container-modern">
                        <table class="table-modern">
                            <thead>
                                <tr>
                                    <th>${this.t('name')}</th>
                                    <th>${this.t('uid')}</th>
                                    <th>${this.t('gid')}</th>
                                    <th>${this.t('home')}</th>
                                    <th>${this.t('shell')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${users.map(user => `
                                    <tr>
                                        <td>${user.name || '-'}</td>
                                        <td>${user.uid || '-'}</td>
                                        <td>${user.gid || '-'}</td>
                                        <td>${user.home || '-'}</td>
                                        <td>${user.shell || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    renderGroupsView(groups) {
        return `
            <div class="file-share-auditor-main">
                <div class="section-modern">
                    <h2 class="section-title-modern">${this.t('groups')} (${groups.length})</h2>
                    <div class="table-container-modern">
                        <table class="table-modern">
                            <thead>
                                <tr>
                                    <th>${this.t('name')}</th>
                                    <th>${this.t('gid')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${groups.map(group => `
                                    <tr>
                                        <td>${group.name || '-'}</td>
                                        <td>${group.gid || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    renderListeningPortsView(ports) {
        return `
            <div class="file-share-auditor-main">
                <div class="section-modern">
                    <h2 class="section-title-modern">${this.t('listeningPorts')} (${ports.length})</h2>
                    <div class="table-container-modern">
                        <table class="table-modern">
                            <thead>
                                <tr>
                                    <th>${this.t('protocol')}</th>
                                    <th>${this.t('localAddress')}</th>
                                    <th>${this.t('state')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${ports.map(port => `
                                    <tr>
                                        <td>${port.protocol || '-'}</td>
                                        <td>${port.localAddress || '-'}</td>
                                        <td>${port.state || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    renderProcessesView(processes) {
        return `
            <div class="file-share-auditor-main">
                <div class="section-modern">
                    <h2 class="section-title-modern">${this.t('processes')} (${processes.length})</h2>
                    <div class="table-container-modern">
                        <table class="table-modern">
                            <thead>
                                <tr>
                                    <th>${this.t('user')}</th>
                                    <th>${this.t('pid')}</th>
                                    <th>${this.t('cpu')}</th>
                                    <th>${this.t('mem')}</th>
                                    <th>${this.t('command')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${processes.map(proc => `
                                    <tr>
                                        <td>${proc.user || '-'}</td>
                                        <td>${proc.pid || '-'}</td>
                                        <td>${proc.cpu || '-'}</td>
                                        <td>${proc.mem || '-'}</td>
                                        <td>${proc.command || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    toggleSidebar() {
        const sidebar = document.getElementById('auditor-sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar && overlay) {
            sidebar.classList.toggle('sidebar-open');
            overlay.classList.toggle('show');
        }
    }

    closeSidebar() {
        const sidebar = document.getElementById('auditor-sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar && overlay) {
            sidebar.classList.remove('sidebar-open');
            overlay.classList.remove('show');
        }
    }

    switchView(view) {
        this.activeView = view;
        this.updateDisplay();
        // Close sidebar on mobile when switching views
        if (window.innerWidth <= 768) {
            this.closeSidebar();
        }
    }

    async mount() {
        window.linuxServerAuditorInstance = this;
        if (this.reportId) {
            await this.loadReport();
        }
    }

    async loadReport() {
        if (!this.reportId) return;
        this.loading = true;
        this.updateDisplay();

        try {
            const response = await fetch(`/api/linux-server-reports/get?id=${this.reportId}`);
            if (!response.ok) throw new Error('Failed to load report');
            this.reportData = await response.json();
        } catch (error) {
            console.error('Error loading report:', error);
            this.reportData = null;
        } finally {
            this.loading = false;
            this.updateDisplay();
        }
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonData = JSON.parse(e.target.result);
                this.importReport(jsonData);
            } catch (error) {
                alert('Invalid JSON file: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    async importReport(reportData) {
        if (!this.reportId) {
            alert('Report ID not found');
            return;
        }

        try {
            const response = await fetch('/api/linux-server-reports/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reportId: parseInt(this.reportId),
                    reportData: JSON.stringify(reportData)
                })
            });

            if (!response.ok) throw new Error('Failed to import report');
            
            this.reportData = reportData;
            this.updateDisplay();
            alert('Report imported successfully');
        } catch (error) {
            console.error('Error importing report:', error);
            alert('Failed to import report: ' + error.message);
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

