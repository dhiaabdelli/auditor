export class LinuxServerAuditorPage {
    constructor() {
        this.reportData = null;
        this.reportId = null;
        this.loading = false;
        this.currentLanguage = localStorage.getItem('language') || 'en';
        this.activeView = 'overview';
        this.sidebarCollapsed = false;
        this.expandedCategories = new Set(['system', 'security']);
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

    toggleSidebar() {
        this.sidebarCollapsed = !this.sidebarCollapsed;
        this.updateDisplay();
    }

    toggleCategory(key) {
        if (this.expandedCategories.has(key)) {
            this.expandedCategories.delete(key);
        } else {
            this.expandedCategories.add(key);
        }
        this.updateDisplay();
    }

    switchView(view) {
        this.activeView = view;
        this.updateDisplay();
        // Close sidebar on mobile when switching views
        if (window.innerWidth <= 768) {
            this.closeSidebar();
        }
    }

    closeSidebar() {
        this.sidebarCollapsed = true;
        this.updateDisplay();
    }

    t(key) {
        return this.translations[this.currentLanguage][key] || key;
    }

    async render() {
        const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
        this.reportId = urlParams.get('id');

        const headerContent = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1.5rem; height: 60px; flex-shrink: 0; background: rgba(15, 23, 42, 0.2); border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                <div style="display: flex; align-items: center; gap: 1rem; min-width: 0;">
                    <button class="page-header-back-btn" onclick="linuxServerAuditorInstance.goBack()" style="background: rgba(148, 163, 184, 0.08); border: none; color: #f8fafc; border-radius: 8px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;">
                        <i class="fas fa-arrow-left" style="font-size: 0.9rem;"></i>
                    </button>
                    <div style="display: flex; align-items: center; gap: 0.875rem; overflow: hidden;">
                        <h2 style="margin: 0; font-size: 1.15rem; font-weight: 600; color: #f8fafc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${this.reportData?.name || this.t('title')}</h2>
                        <span style="font-size: 0.75rem; color: #64748b; background: rgba(148, 163, 184, 0.1); padding: 0.15rem 0.6rem; border-radius: 12px; white-space: nowrap;">${this.reportData?.hostname || 'Linux Server Audit'}</span>
                    </div>
                </div>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <button class="premium-action-btn" onclick="linuxServerAuditorInstance.loadReport()" style="height: 32px; width: 32px; padding: 0; display: flex; justify-content: center; align-items: center;">
                        <i class="fas fa-sync-alt" style="font-size: 0.75rem;"></i>
                    </button>
                    <button class="premium-action-btn" onclick="linuxServerAuditorInstance.generateScript({ encrypt: true, obfuscate: true })" style="height: 32px; padding: 0 0.75rem; font-size: 0.75rem;">
                        <i class="fas fa-code" style="font-size: 0.7rem;"></i>
                        <span>Script</span>
                    </button>
                    <button class="premium-action-btn" onclick="linuxServerAuditorInstance.generateScript({ encrypt: false, obfuscate: false })" style="height: 32px; padding: 0 0.75rem; font-size: 0.75rem;">
                        <i class="fas fa-file-alt" style="font-size: 0.7rem;"></i>
                        <span>Plain</span>
                    </button>
                    <button class="premium-action-btn" onclick="linuxServerAuditorInstance.importReport()" style="height: 32px; padding: 0 0.75rem; font-size: 0.75rem;">
                        <i class="fas fa-upload" style="font-size: 0.7rem;"></i>
                        <span>Import</span>
                    </button>
                    <button class="premium-action-btn" onclick="linuxServerAuditorInstance.deleteReport()" style="height: 32px; width: 32px; padding: 0; display: flex; justify-content: center; align-items: center; color: #ef4444; border-color: rgba(239, 68, 68, 0.2);">
                        <i class="fas fa-trash" style="font-size: 0.75rem;"></i>
                    </button>
                </div>
            </div>
        `;

        if (this.loading) {
            return `
                <div class="administration-container page-container-full">
                    <div class="loading-container" style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                        <div class="spinner"></div>
                        <p>${this.t('loading')}</p>
                    </div>
                </div>
            `;
        }

        if (!this.reportData) {
            return `
                <div class="administration-container page-container-full ${this.sidebarCollapsed ? 'sidebar-collapsed' : ''}">
                    <input type="file" id="linux-report-file-input" accept=".json" style="display: none;" onchange="linuxServerAuditorInstance.handleFileSelect(event)">
                    
                    <aside class="administration-sidebar">
                        <div class="sidebar-collapse-header">
                            <button class="collapse-btn" onclick="linuxServerAuditorInstance.toggleSidebar()">
                                <i class="fas fa-angle-double-left"></i>
                            </button>
                        </div>
                        <nav class="sidebar-nav">
                            <button class="nav-item active">
                                <i class="fas fa-chart-line"></i>
                                <span>Overview</span>
                            </button>
                        </nav>
                    </aside>

                    <main class="administration-content">
                        <div class="file-share-auditor-main">
                            ${headerContent}
                            <div class="reports-empty-state" style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 4rem 2rem;">
                                <i class="fab fa-linux fa-3x" style="margin-bottom: 1.5rem; color: #94a3b8;"></i>
                                <p style="font-size: 1.125rem; color: #f8fafc; margin-bottom: 0.5rem;">${this.t('noData')}</p>
                                <p style="color: #94a3b8; font-size: 0.875rem; text-align: center; max-width: 400px;">
                                    Click "Script" to download the bash script, run it on your Linux server, then click "Import" to upload the JSON output.
                                </p>
                            </div>
                        </div>
                    </main>
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
            <div class="administration-container page-container-full ${this.sidebarCollapsed ? 'sidebar-collapsed' : ''}">
                <input type="file" id="linux-report-file-input" accept=".json" style="display: none;" onchange="linuxServerAuditorInstance.handleFileSelect(event)">
                
                <aside class="administration-sidebar">
                    <div class="sidebar-collapse-header">
                        <button class="collapse-btn" onclick="linuxServerAuditorInstance.toggleSidebar()">
                            <i class="fas fa-angle-double-left"></i>
                        </button>
                    </div>
                    <nav class="sidebar-nav">
                        <!-- System Category -->
                        <div class="sidebar-category ${this.expandedCategories.has('system') ? 'expanded' : ''}">
                            <div class="category-header" onclick="linuxServerAuditorInstance.toggleCategory('system')">
                                <div class="category-title">
                                    <i class="fas fa-server"></i>
                                    <span>System</span>
                                </div>
                                <i class="fas fa-chevron-down arrow"></i>
                            </div>
                            <div class="category-items">
                                <button class="nav-item ${this.activeView === 'overview' ? 'active' : ''}" 
                                        onclick="linuxServerAuditorInstance.switchView('overview')">
                                    <span>Overview</span>
                                </button>
                                ${packages.length > 0 ? `
                                <button class="nav-item ${this.activeView === 'packages' ? 'active' : ''}" 
                                        onclick="linuxServerAuditorInstance.switchView('packages')">
                                    <span>Packages (${packages.length})</span>
                                </button>
                                ` : ''}
                                ${services.length > 0 ? `
                                <button class="nav-item ${this.activeView === 'services' ? 'active' : ''}" 
                                        onclick="linuxServerAuditorInstance.switchView('services')">
                                    <span>Services (${services.length})</span>
                                </button>
                                ` : ''}
                                ${processes.length > 0 ? `
                                <button class="nav-item ${this.activeView === 'processes' ? 'active' : ''}" 
                                        onclick="linuxServerAuditorInstance.switchView('processes')">
                                    <span>Processes (${processes.length})</span>
                                </button>
                                ` : ''}
                                ${disks.length > 0 ? `
                                <button class="nav-item ${this.activeView === 'disks' ? 'active' : ''}" 
                                        onclick="linuxServerAuditorInstance.switchView('disks')">
                                    <span>Disks (${disks.length})</span>
                                </button>
                                ` : ''}
                            </div>
                        </div>

                        <!-- Security Category -->
                        <div class="sidebar-category ${this.expandedCategories.has('security') ? 'expanded' : ''}">
                            <div class="category-header" onclick="linuxServerAuditorInstance.toggleCategory('security')">
                                <div class="category-title">
                                    <i class="fas fa-shield-alt"></i>
                                    <span>Security</span>
                                </div>
                                <i class="fas fa-chevron-down arrow"></i>
                            </div>
                            <div class="category-items">
                                ${users.length > 0 ? `
                                <button class="nav-item ${this.activeView === 'users' ? 'active' : ''}" 
                                        onclick="linuxServerAuditorInstance.switchView('users')">
                                    <span>Users (${users.length})</span>
                                </button>
                                ` : ''}
                                ${groups.length > 0 ? `
                                <button class="nav-item ${this.activeView === 'groups' ? 'active' : ''}" 
                                        onclick="linuxServerAuditorInstance.switchView('groups')">
                                    <span>Groups (${groups.length})</span>
                                </button>
                                ` : ''}
                                ${listeningPorts.length > 0 ? `
                                <button class="nav-item ${this.activeView === 'listening-ports' ? 'active' : ''}" 
                                        onclick="linuxServerAuditorInstance.switchView('listening-ports')">
                                    <span>Ports (${listeningPorts.length})</span>
                                </button>
                                ` : ''}
                            </div>
                        </div>
                    </nav>
                </aside>

                <main class="administration-content">
                    <div class="file-share-auditor-main">
                        ${headerContent}
                        ${this.renderView(data)}
                    </div>
                </main>
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


    async mount() {
        window.linuxServerAuditorInstance = this;
        document.body.style.overflow = 'hidden';
        if (this.reportId) {
            await this.loadReport();
        }
    }

    async unmount() {
        document.body.style.overflow = '';
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

    async updateDisplay() {
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = await this.render();
            // Set instance for event handlers
            window.linuxServerAuditorInstance = this;
            // Update page navbar title after rendering
            if (window.pageNavbarInstance) {
                window.pageNavbarInstance.updateTitle();
            }
        }
    }

    goBack() {
        if (window.appInstance) {
            window.appInstance.navigateTo('linux-server-auditor-list');
        } else {
            window.location.hash = 'linux-server-auditor-list';
        }
    }

    async deleteReport() {
        if (!this.reportId) return;
        if (!confirm('Are you sure you want to delete this report?')) return;

        try {
            const response = await fetch(`/api/linux-server-reports/delete?id=${this.reportId}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete report');
            this.goBack();
        } catch (error) {
            console.error('Error deleting report:', error);
            alert('Failed to delete report: ' + error.message);
        }
    }

    downloadAuditScript() {
        // This is a placeholder for downloading the bash script
        const bashScript = `#!/bin/bash
# Linux Server Audit Script
echo "Starting Linux Server Audit..."
# ... (rest of the script)
`;
        const blob = new Blob([bashScript], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'linux_audit.sh';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
}

