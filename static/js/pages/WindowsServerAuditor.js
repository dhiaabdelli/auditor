export class WindowsServerAuditorPage {
    constructor() {
        this.reportData = null;
        this.reportId = null;
        this.loading = false;
        this.currentLanguage = localStorage.getItem('language') || 'en';
        this.showServicesModalFlag = false;
        this.selectedServicesModal = null; // { page }
        this.showSoftwareModalFlag = false;
        this.selectedSoftwareModal = null; // { page }
        this.showDriversModalFlag = false;
        this.selectedDriversModal = null; // { page }
        this.showWindowsUpdatesModalFlag = false;
        this.selectedWindowsUpdatesModal = null; // { page }
        this.showMissingUpdatesModalFlag = false;
        this.selectedMissingUpdatesModal = null; // { page }
        this.showRolesModalFlag = false;
        this.selectedRolesModal = null; // { page }
        this.showFeaturesModalFlag = false;
        this.selectedFeaturesModal = null; // { page }
        this.showAllTasksModalFlag = false;
        this.selectedAllTasksModal = null;
        this.showFailedTasksModalFlag = false;
        this.selectedFailedTasksModal = null;
        this.showTempEnvironmentModalFlag = false;
        this.showDirectoryHealthModalFlag = false;
        this.showPathOrderAnalysisModalFlag = false;
        this.showPathHygieneChecksModalFlag = false;
        this.showGroupMembersModalFlag = false;
        this.selectedGroupModal = null;
        this.showEventLogModalFlag = false;
        this.eventLogModalType = null; // 'system' or 'application'
        this.eventLogFilter = 'all'; // 'all', '24h', '7d', '15d', '30d'
        this.selectedEventLogModal = null; // { page }
        this.showEventDetailsModalFlag = false;
        this.selectedEventDetails = null; // { event, type }
        this.showProcessTreeModalFlag = false;
        this.selectedProcessTreeModal = null; // { page }
        this.translations = {
            en: {
                title: 'Windows Server Audit',
                subtitle: 'Comprehensive audit report for Windows Server',
                loading: 'Loading audit report...',
                error: 'Error loading report',
                back: 'Back to List',
                systemInfo: 'System Information',
                rolesAndFeatures: 'Roles & Features',
                services: 'Services',
                network: 'Network Configuration',
                disks: 'Disk Information',
                memory: 'Memory Information',
                software: 'Installed Software',
                windowsUpdates: 'Windows Updates',
                missingUpdates: 'Missing Windows Updates',
                security: 'Security Settings',
                eventLogs: 'Event Logs',
                iis: 'IIS Configuration',
                sqlServer: 'SQL Server',
                activeDirectory: 'Active Directory',
                computerName: 'Computer Name',
                domain: 'Domain',
                domainRole: 'Domain Role',
                manufacturer: 'Manufacturer',
                model: 'Model',
                osName: 'OS Name',
                osVersion: 'OS Version',
                osBuild: 'OS Build',
                osArchitecture: 'OS Architecture',
                installDate: 'Install Date',
                lastBootTime: 'Last Boot Time',
                totalPhysicalMemory: 'Total Physical Memory',
                biosVersion: 'BIOS Version',
                biosManufacturer: 'BIOS Manufacturer',
                installedRoles: 'Installed Roles',
                installedFeatures: 'Installed Features',
                totalCount: 'Total Count',
                total: 'Total',
                running: 'Running',
                stopped: 'Stopped',
                name: 'Name',
                displayName: 'Display Name',
                status: 'Status',
                startType: 'Start Type',
                adapters: 'Network Adapters',
                interfaceDescription: 'Interface Description',
                linkSpeed: 'Link Speed',
                macAddress: 'MAC Address',
                ipAddresses: 'IP Addresses',
                dnsServers: 'DNS Servers',
                deviceId: 'Device ID',
                volumeName: 'Volume Name',
                fileSystem: 'File System',
                sizeGB: 'Size (GB)',
                freeSpaceGB: 'Free Space (GB)',
                usedSpaceGB: 'Used Space (GB)',
                percentFree: 'Percent Free',
                totalSizeGB: 'Total Size (GB)',
                totalFreeGB: 'Total Free (GB)',
                modules: 'Memory Modules',
                capacityGB: 'Capacity (GB)',
                speed: 'Speed',
                partNumber: 'Part Number',
                applications: 'Applications',
                version: 'Version',
                vendor: 'Vendor',
                firewallProfiles: 'Firewall Profiles',
                antivirus: 'Antivirus',
                antivirusProducts: 'Antivirus Products',
                enabled: 'Enabled',
                recentErrors: 'Recent Errors',
                productName: 'Product Name',
                productState: 'Product State',
                lastUpdate: 'Last Update',
                provider: 'Provider',
                realTimeProtection: 'Real-Time Protection',
                signaturesUpToDate: 'Signatures Up to Date',
                recentWarnings: 'Recent Warnings',
                timeGenerated: 'Time Generated',
                source: 'Source',
                message: 'Message',
                installed: 'Installed',
                sites: 'Sites',
                state: 'State',
                bindings: 'Bindings',
                instances: 'Instances',
                isDomainController: 'Is Domain Controller',
                domainName: 'Domain Name',
                domainNetBIOSName: 'Domain NetBIOS Name',
                forestName: 'Forest Name',
                auditDate: 'Audit Date',
                serverName: 'Server Name',
                serverAddress: 'Server Address',
                noData: 'No audit data available',
                runAudit: 'Run Audit',
                refreshing: 'Refreshing...'
            },
            fr: {
                title: 'Audit Windows Server',
                subtitle: 'Rapport d\'audit complet pour Windows Server',
                loading: 'Chargement du rapport d\'audit...',
                error: 'Erreur lors du chargement du rapport',
                back: 'Retour à la liste',
                systemInfo: 'Informations Système',
                rolesAndFeatures: 'Rôles et Fonctionnalités',
                services: 'Services',
                network: 'Configuration Réseau',
                disks: 'Informations Disques',
                memory: 'Informations Mémoire',
                software: 'Logiciels Installés',
                security: 'Paramètres de Sécurité',
                eventLogs: 'Journaux d\'Événements',
                iis: 'Configuration IIS',
                sqlServer: 'SQL Server',
                activeDirectory: 'Active Directory',
                computerName: 'Nom de l\'Ordinateur',
                domain: 'Domaine',
                domainRole: 'Rôle du Domaine',
                manufacturer: 'Fabricant',
                model: 'Modèle',
                osName: 'Nom OS',
                osVersion: 'Version OS',
                osBuild: 'Build OS',
                osArchitecture: 'Architecture OS',
                installDate: 'Date d\'Installation',
                lastBootTime: 'Dernier Démarrage',
                totalPhysicalMemory: 'Mémoire Physique Totale',
                biosVersion: 'Version BIOS',
                biosManufacturer: 'Fabricant BIOS',
                installedRoles: 'Rôles Installés',
                installedFeatures: 'Fonctionnalités Installées',
                totalCount: 'Nombre Total',
                total: 'Total',
                running: 'En Cours',
                stopped: 'Arrêté',
                name: 'Nom',
                displayName: 'Nom d\'Affichage',
                status: 'Statut',
                startType: 'Type de Démarrage',
                adapters: 'Adaptateurs Réseau',
                interfaceDescription: 'Description Interface',
                linkSpeed: 'Vitesse de Lien',
                macAddress: 'Adresse MAC',
                ipAddresses: 'Adresses IP',
                dnsServers: 'Serveurs DNS',
                deviceId: 'ID Périphérique',
                volumeName: 'Nom du Volume',
                fileSystem: 'Système de Fichiers',
                sizeGB: 'Taille (Go)',
                freeSpaceGB: 'Espace Libre (Go)',
                usedSpaceGB: 'Espace Utilisé (Go)',
                percentFree: 'Pourcentage Libre',
                totalSizeGB: 'Taille Totale (Go)',
                totalFreeGB: 'Total Libre (Go)',
                modules: 'Modules Mémoire',
                capacityGB: 'Capacité (Go)',
                speed: 'Vitesse',
                partNumber: 'Numéro de Pièce',
                applications: 'Applications',
                version: 'Version',
                vendor: 'Fournisseur',
                firewallProfiles: 'Profils Pare-feu',
                enabled: 'Activé',
                recentErrors: 'Erreurs Récentes',
                recentWarnings: 'Avertissements Récents',
                timeGenerated: 'Heure Générée',
                source: 'Source',
                message: 'Message',
                installed: 'Installé',
                sites: 'Sites',
                state: 'État',
                bindings: 'Liaisons',
                instances: 'Instances',
                isDomainController: 'Est Contrôleur de Domaine',
                domainName: 'Nom de Domaine',
                domainNetBIOSName: 'Nom NetBIOS du Domaine',
                forestName: 'Nom de la Forêt',
                auditDate: 'Date d\'Audit',
                serverName: 'Nom du Serveur',
                serverAddress: 'Adresse du Serveur',
                noData: 'Aucune donnée d\'audit disponible',
                runAudit: 'Exécuter Audit',
                refreshing: 'Actualisation...'
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
                    <div class="page-header">
                        <div class="page-header-content">
                            <div>
                                <h1 class="page-title">🖥️ ${this.t('title')}</h1>
                                <p class="page-subtitle">${this.t('loading')}</p>
                            </div>
                        </div>
                    </div>
                    <div class="loading-container">
                        <div class="spinner"></div>
                    </div>
                </div>
            `;
        }

        if (!this.reportData) {
            return `
                <div class="page-container-full">
                    <div class="page-header">
                        <div class="page-header-content">
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <button class="btn btn-icon" onclick="windowsServerAuditorInstance.goBack()">
                                    <i class="fas fa-arrow-left"></i>
                                </button>
                                <div>
                                    <h1 class="page-title">🖥️ ${this.t('title')}</h1>
                                    <p class="page-subtitle">${this.t('subtitle')}</p>
                                </div>
                            </div>
                            <div class="page-header-actions">
                                <button type="button" class="btn btn-sm btn-primary" onclick="windowsServerAuditorInstance.generateScript({ encrypt: true, obfuscate: true })" title="Script">
                                    <i class="fas fa-code"></i> <span class="btn-text">Script</span>
                                </button>
                                <button type="button" class="btn btn-sm btn-secondary" onclick="windowsServerAuditorInstance.generateScript({ encrypt: false, obfuscate: false })" title="Plain Script">
                                    <i class="fas fa-file-alt"></i> <span class="btn-text">Plain Script</span>
                                </button>
                                <button type="button" class="btn btn-sm btn-success" onclick="windowsServerAuditorInstance.importReport()" title="Import">
                                    <i class="fas fa-upload"></i> <span class="btn-text">Import</span>
                                </button>
                                <input type="file" id="report-file-input" accept=".json" style="display: none;" onchange="windowsServerAuditorInstance.handleFileSelect(event)">
                            </div>
                        </div>
                    </div>
                    <div class="reports-empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>${this.t('noData')}</p>
                        <p style="margin-top: 1rem; color: #94a3b8; font-size: 0.875rem;">
                            Click "Script" to download the PowerShell script, run it on your server, then click "Import" to upload the JSON output.
                        </p>
                    </div>
                </div>
            `;
        }

        const data = this.reportData;
        const systemInfo = data.systemInfo || {};
        const rolesAndFeatures = data.rolesAndFeatures || {};
        const services = data.services || {};
        const network = data.network || {};
        const disks = data.disks || {};
        const memory = data.memory || {};
        const software = data.software || {};
        const security = data.security || {};
        const eventLogs = data.eventLogs || {};
        const iis = data.iis || {};
        const sqlServer = data.sqlServer || {};
        const activeDirectory = data.activeDirectory || {};
        const drivers = data.drivers || [];
        const windowsUpdates = data.windowsUpdates || [];
        const missingUpdates = data.missingUpdates || [];
        const windowsUpdatesSummary = data.windowsUpdatesSummary || {};
        const localUsersSummary = data.localUsersSummary || {};
        const eventLogOverview = data.eventLogOverview || {};
        const crashAnalysis = data.crashAnalysis || {};
        const processTree = data.processTree || {};
        const environmentPaths = data.environmentPaths || {};
        const scheduledTasks = data.scheduledTasks || {};
        const physicalDisks = data.physicalDisks || [];
        const volumes = data.volumes || [];
        const iscsi = data.iscsi || {};
        const iscsiSessions = iscsi.sessions || [];
        const iscsiConnections = iscsi.connections || [];
        const iscsiDisks = iscsi.disks || [];
        const shutdowns = data.shutdowns || [];
        const localGroups = data.localGroups || [];
        const raidControllers = data.raidControllers || [];

        return `
            <div class="page-container-full">
                <div class="page-header">
                    <div class="page-header-content">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <button class="btn btn-icon" onclick="windowsServerAuditorInstance.goBack()">
                                <i class="fas fa-arrow-left"></i>
                            </button>
                            <div>
                                <h1 class="page-title">🖥️ ${this.t('title')}</h1>
                                <p class="page-subtitle">${systemInfo.computerName || data.serverName || 'Windows Server'}</p>
                            </div>
                        </div>
                        <div class="page-header-actions">
                            <button type="button" class="btn btn-sm btn-primary" onclick="windowsServerAuditorInstance.generateScript({ encrypt: true, obfuscate: true })" title="Script">
                                <i class="fas fa-code"></i> <span class="btn-text">Script</span>
                            </button>
                            <button type="button" class="btn btn-sm btn-secondary" onclick="windowsServerAuditorInstance.generateScript({ encrypt: false, obfuscate: false })" title="Plain Script">
                                <i class="fas fa-file-alt"></i> <span class="btn-text">Plain Script</span>
                            </button>
                            <button type="button" class="btn btn-sm btn-success" onclick="windowsServerAuditorInstance.importReport()" title="Import">
                                <i class="fas fa-upload"></i> <span class="btn-text">Import</span>
                            </button>
                            <input type="file" id="report-file-input" accept=".json" style="display: none;" onchange="windowsServerAuditorInstance.handleFileSelect(event)">
                        </div>
                    </div>
                </div>

                <div class="audit-content">
                    <!-- Dashboard Header: Host Overview -->
                    <div class="audit-dashboard-header">
                        <div class="dashboard-hero-icon">
                            <i class="fas fa-server"></i>
                        </div>
                        <div class="dashboard-hero-info">
                            <h1 class="dashboard-hero-title">
                                ${systemInfo.computerName || 'Windows Server'}
                                ${systemInfo.fqdn ? `<span class="hero-badge badge-primary"><i class="fas fa-globe"></i> ${systemInfo.fqdn}</span>` : ''}
                            </h1>
                            <div class="dashboard-hero-badges">
                                ${systemInfo.domain ? `<span class="hero-badge"><i class="fas fa-network-wired"></i> ${systemInfo.domain}</span>` : ''}
                                ${systemInfo.vmOrPhysical ? `<span class="hero-badge"><i class="fas ${systemInfo.isVM ? 'fa-cloud' : 'fa-server'}"></i> ${systemInfo.vmOrPhysical}</span>` : ''}
                                ${systemInfo.hypervisor && systemInfo.hypervisor !== 'Physical' ? `<span class="hero-badge"><i class="fas fa-cube"></i> ${systemInfo.hypervisor}</span>` : ''}
                                ${systemInfo.serverCore !== undefined ? `<span class="hero-badge"><i class="fas fa-terminal"></i> ${systemInfo.serverCore ? 'Server Core' : 'Desktop Experience'}</span>` : ''}
                            </div>
                        </div>
                        <div class="dashboard-hero-stats">
                            ${systemInfo.uptime ? `
                            <div class="hero-stat-item">
                                <span class="hero-stat-label">Uptime</span>
                                <span class="hero-stat-value">${systemInfo.uptime.split(',')[0]}</span>
                            </div>
                            ` : ''}
                            ${systemInfo.lastBootTime ? `
                            <div class="hero-stat-item">
                                <span class="hero-stat-label">Last Reboot</span>
                                <span class="hero-stat-value">${(() => {
                                    try {
                                        let dateStr = systemInfo.lastBootTime;
                                        if (typeof dateStr === 'string' && dateStr.match(/^\/Date\((\d+)\)\/$/)) {
                                            const timestamp = parseInt(dateStr.match(/^\/Date\((\d+)\)\/$/)[1]);
                                            return new Date(timestamp).toLocaleDateString();
                                        }
                                        const date = new Date(dateStr);
                                        return isNaN(date.getTime()) ? dateStr : date.toLocaleDateString();
                                    } catch (e) { return 'N/A'; }
                                })()}</span>
                            </div>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Dashboard Grid: Hardware & OS -->
                    <div class="audit-dashboard-grid">
                        <!-- Hardware Panel -->
                        <div class="dashboard-panel">
                            <div class="dashboard-panel-header">
                                <div class="dashboard-panel-icon icon-purple">
                                    <i class="fas fa-microchip"></i>
                                </div>
                                <h3 class="dashboard-panel-title">Hardware Specification</h3>
                            </div>
                            <div class="dashboard-panel-body modern-data-list">
                                ${systemInfo.manufacturer ? `
                                <div class="data-row">
                                    <div class="data-label-group">
                                        <i class="fas fa-industry data-icon"></i>
                                        <span class="data-label">Manufacturer</span>
                                    </div>
                                    <span class="data-value">${systemInfo.manufacturer}</span>
                                </div>
                                ` : ''}
                                ${systemInfo.model ? `
                                <div class="data-row">
                                    <div class="data-label-group">
                                        <i class="fas fa-tag data-icon"></i>
                                        <span class="data-label">Model</span>
                                    </div>
                                    <span class="data-value">${systemInfo.model}</span>
                                </div>
                                ` : ''}
                                ${systemInfo.biosVersion ? `
                                <div class="data-row">
                                    <div class="data-label-group">
                                        <i class="fas fa-code data-icon"></i>
                                        <span class="data-label">BIOS / Firmware</span>
                                    </div>
                                    <span class="data-value">${systemInfo.biosManufacturer || ''} ${systemInfo.biosVersion}</span>
                                </div>
                                ` : ''}
                                ${systemInfo.processor ? `
                                <div class="data-row">
                                    <div class="data-label-group">
                                        <i class="fas fa-microchip data-icon"></i>
                                        <span class="data-label">CPU</span>
                                    </div>
                                    <div style="text-align: right;">
                                        <div class="data-value">${systemInfo.processor}</div>
                                        <div style="font-size: 0.75rem; color: #94a3b8;">
                                            ${systemInfo.numberOfCores || '?'} Cores, ${systemInfo.numberOfLogicalProcessors || '?'} Logical
                                        </div>
                                    </div>
                                </div>
                                ` : ''}
                                ${systemInfo.totalPhysicalMemory ? `
                                <div class="data-row">
                                    <div class="data-label-group">
                                        <i class="fas fa-memory data-icon"></i>
                                        <span class="data-label">Memory</span>
                                    </div>
                                    <div style="text-align: right;">
                                        ${(() => {
                                            const totalGB = systemInfo.totalPhysicalMemory || 0;
                                            const usagePercent = systemInfo.memoryUsagePercent !== undefined && systemInfo.memoryUsagePercent !== null ? systemInfo.memoryUsagePercent : 0;
                                            const usedGB = (totalGB * usagePercent / 100).toFixed(2);
                                            const freeGB = (totalGB - parseFloat(usedGB)).toFixed(2);
                                            return `
                                            <div class="data-value">${totalGB} GB</div>
                                            <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 2px;">
                                                Free: ${freeGB} GB | Used: ${usedGB} GB | ${usagePercent.toFixed(1)}%
                                            </div>
                                            ${systemInfo.memorySlots && systemInfo.memorySlots !== 'N/A' && systemInfo.memorySlots !== 'N/A (VM)' ? `
                                            <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 2px;">
                                                Slots: ${systemInfo.memorySlots}
                                            </div>
                                            ` : ''}
                                            ${systemInfo.memorySpeed && systemInfo.memorySpeed !== 'N/A' ? `
                                            <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 2px;">
                                                ${systemInfo.memorySpeed} MHz ${systemInfo.memoryType && systemInfo.memoryType !== 'Unknown' ? `(${systemInfo.memoryType})` : ''}
                                            </div>
                                            ` : ''}
                                            `;
                                        })()}
                                    </div>
                                </div>
                                ` : ''}
                                ${systemInfo.numaEnabled !== undefined ? `
                                <div class="data-row">
                                    <div class="data-label-group">
                                        <i class="fas fa-sitemap data-icon"></i>
                                        <span class="data-label">NUMA</span>
                                    </div>
                                    <span class="data-value">${systemInfo.numaEnabled ? 'Enabled' : 'Disabled'}</span>
                                </div>
                                ` : ''}
                                ${systemInfo.powerPlan ? `
                                <div class="data-row">
                                    <div class="data-label-group">
                                        <i class="fas fa-bolt data-icon"></i>
                                        <span class="data-label">Power Plan</span>
                                    </div>
                                    <span class="data-value">${systemInfo.powerPlan}</span>
                                </div>
                                ` : ''}
                                ${systemInfo.serialNumber ? `
                                <div class="data-row">
                                    <div class="data-label-group">
                                        <i class="fas fa-barcode data-icon"></i>
                                        <span class="data-label">Serial Number</span>
                                    </div>
                                    <span class="data-value">${systemInfo.serialNumber}</span>
                                </div>
                                ` : ''}
                                ${systemInfo.secureBoot ? `
                                <div class="data-row">
                                    <div class="data-label-group">
                                        <i class="fas fa-shield-alt data-icon"></i>
                                        <span class="data-label">Secure Boot</span>
                                    </div>
                                    <span class="data-value" style="color: ${systemInfo.secureBoot === 'Enabled' ? '#34d399' : '#94a3b8'}">
                                        ${systemInfo.secureBoot}
                                    </span>
                                </div>
                                ` : ''}
                                ${systemInfo.virtualizationSupported !== undefined ? `
                                <div class="data-row">
                                    <div class="data-label-group">
                                        <i class="fas fa-server data-icon"></i>
                                        <span class="data-label">Virtualization Support</span>
                                    </div>
                                    <span class="data-value" style="color: ${systemInfo.virtualizationSupported ? '#34d399' : '#ef4444'}">
                                        ${systemInfo.virtualizationSupported ? 'Yes' : 'No'}
                                    </span>
                                </div>
                                ` : ''}
                                ${systemInfo.virtualizationEnabled !== undefined ? `
                                <div class="data-row">
                                    <div class="data-label-group">
                                        <i class="fas fa-cog data-icon"></i>
                                        <span class="data-label">Virtualization Enabled in Firmware</span>
                                    </div>
                                    <span class="data-value" style="color: ${systemInfo.virtualizationEnabled ? '#34d399' : '#ef4444'}">
                                        ${systemInfo.virtualizationEnabled ? 'Yes' : 'No'}
                                    </span>
                                </div>
                                ` : ''}
                            </div>
                        </div>

                        <!-- Operating System Panel -->
                        <div class="dashboard-panel">
                            <div class="dashboard-panel-header">
                                <div class="dashboard-panel-icon icon-blue">
                                    <i class="fab fa-windows"></i>
                                </div>
                                <h3 class="dashboard-panel-title">Operating System</h3>
                            </div>
                            <div class="dashboard-panel-body modern-data-list">
                                ${systemInfo.osName ? `
                                <div class="data-row">
                                    <div class="data-label-group">
                                        <i class="fab fa-windows data-icon"></i>
                                        <span class="data-label">Edition</span>
                                    </div>
                                    <span class="data-value">${systemInfo.osName}</span>
                                </div>
                                ` : ''}
                                ${systemInfo.osVersion ? `
                                <div class="data-row">
                                    <div class="data-label-group">
                                        <i class="fas fa-code-branch data-icon"></i>
                                        <span class="data-label">Version</span>
                                    </div>
                                    <span class="data-value">${systemInfo.osVersion} (Build ${systemInfo.osBuild || 'N/A'})</span>
                                </div>
                                ` : ''}
                                ${systemInfo.osArchitecture ? `
                                <div class="data-row">
                                    <div class="data-label-group">
                                        <i class="fas fa-microchip data-icon"></i>
                                        <span class="data-label">Architecture</span>
                                    </div>
                                    <span class="data-value">${systemInfo.osArchitecture}</span>
                                </div>
                                ` : ''}
                                ${systemInfo.powershellVersion ? `
                                <div class="data-row">
                                    <div class="data-label-group">
                                        <i class="fab fa-microsoft data-icon"></i>
                                        <span class="data-label">PowerShell Version</span>
                                    </div>
                                    <span class="data-value">${systemInfo.powershellVersion}</span>
                                </div>
                                ` : ''}
                                ${systemInfo.installDate ? `
                                <div class="data-row">
                                    <div class="data-label-group">
                                        <i class="fas fa-calendar-alt data-icon"></i>
                                        <span class="data-label">Install Date</span>
                                    </div>
                                    <span class="data-value">${(() => {
                                        try {
                                            let dateStr = systemInfo.installDate;
                                            if (typeof dateStr === 'string' && dateStr.match(/^\/Date\((\d+)\)\/$/)) {
                                                const timestamp = parseInt(dateStr.match(/^\/Date\((\d+)\)\/$/)[1]);
                                                return new Date(timestamp).toLocaleDateString();
                                            }
                                            const date = new Date(dateStr);
                                            return isNaN(date.getTime()) ? dateStr : date.toLocaleDateString();
                                        } catch (e) { return systemInfo.installDate; }
                                    })()}</span>
                                </div>
                                ` : ''}
                                ${systemInfo.timezone ? `
                                <div class="data-row">
                                    <div class="data-label-group">
                                        <i class="fas fa-clock data-icon"></i>
                                        <span class="data-label">Time Zone</span>
                                    </div>
                                    <span class="data-value">${systemInfo.timezone}</span>
                                </div>
                                ` : ''}
                                ${systemInfo.licenseType ? `
                                <div class="data-row">
                                    <div class="data-label-group">
                                        <i class="fas fa-key data-icon"></i>
                                        <span class="data-label">License</span>
                                    </div>
                                    <div style="text-align: right;">
                                        <div class="data-value">${systemInfo.licenseType}</div>
                                        ${systemInfo.partialProductKey ? `<div style="font-size: 0.75rem; color: #94a3b8; margin-top: 4px;">Key: ...${systemInfo.partialProductKey}</div>` : ''}
                                        ${systemInfo.originalProductKey ? `<div style="font-size: 0.75rem; color: #94a3b8; margin-top: 4px;">OEM Key: ${systemInfo.originalProductKey}</div>` : ''}
                                    </div>
                                </div>
                                ` : ''}
                                ${systemInfo.activationStatus ? `
                                <div class="data-row">
                                    <div class="data-label-group">
                                        <i class="fas fa-check-circle data-icon"></i>
                                        <span class="data-label">License Status</span>
                                    </div>
                                    <span class="data-value" style="color: ${systemInfo.activationStatus === 'Licensed' ? '#34d399' : '#ef4444'}">
                                        ${systemInfo.activationStatus}
                                    </span>
                                </div>
                                ` : ''}
                                ${systemInfo.lastRebootReason ? `
                                <div class="data-row">
                                    <div class="data-label-group">
                                        <i class="fas fa-redo data-icon"></i>
                                        <span class="data-label">Last Reboot Reason</span>
                                    </div>
                                    <span class="data-value">${systemInfo.lastRebootReason}</span>
                                </div>
                                ` : ''}
                                ${systemInfo.unexpectedShutdowns !== undefined && systemInfo.unexpectedShutdowns !== null ? `
                                <div class="data-row">
                                    <div class="data-label-group">
                                        <i class="fas fa-exclamation-triangle data-icon"></i>
                                        <span class="data-label">Unexpected Shutdowns</span>
                                    </div>
                                    <span class="data-value" style="color: ${systemInfo.unexpectedShutdowns > 0 ? '#ef4444' : '#34d399'}">
                                        ${systemInfo.unexpectedShutdowns}
                                    </span>
                                </div>
                                ` : ''}
                                ${systemInfo.hasBugChecks !== undefined ? `
                                <div class="data-row">
                                    <div class="data-label-group">
                                        <i class="fas fa-bug data-icon"></i>
                                        <span class="data-label">BugCheck / BSOD</span>
                                    </div>
                                    <span class="data-value" style="color: ${systemInfo.hasBugChecks ? '#ef4444' : '#34d399'}">
                                        ${systemInfo.hasBugChecks ? 'Yes' : 'No'}
                                    </span>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>

                    <!-- BugCheck / BSOD Details -->
                    ${systemInfo.bugChecks && systemInfo.bugChecks.length > 0 ? `
                    <div class="hardware-section-modern">
                        <h4 class="section-subtitle-modern">
                            <i class="fas fa-bug"></i> BugCheck / BSOD History (Last 10)
                            <span class="update-count-pill" style="background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3);">${systemInfo.bugChecks.length}</span>
                        </h4>
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th>Timestamp</th>
                                        <th>BugCheck Code</th>
                                        <th>Parameter 1</th>
                                        <th>Parameter 2</th>
                                        <th>Parameter 3</th>
                                        <th>Parameter 4</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${systemInfo.bugChecks.map(bugCheck => `
                                        <tr style="background: rgba(239, 68, 68, 0.05); border-left: 3px solid rgba(239, 68, 68, 0.5);">
                                            <td>${bugCheck.timestamp || 'N/A'}</td>
                                            <td><strong style="color: #ef4444;">${bugCheck.code || 'N/A'}</strong></td>
                                            <td>${bugCheck.parameter1 || 'N/A'}</td>
                                            <td>${bugCheck.parameter2 || 'N/A'}</td>
                                            <td>${bugCheck.parameter3 || 'N/A'}</td>
                                            <td>${bugCheck.parameter4 || 'N/A'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    ` : ''}

                    <!-- Shutdown History -->
                    ${shutdowns && shutdowns.length > 0 ? `
                    <div class="hardware-section-modern">
                        <h4 class="section-subtitle-modern">
                            <i class="fas fa-power-off"></i> Shutdown History
                            <span class="update-count-pill">${shutdowns.length}</span>
                        </h4>
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>Type</th>
                                        <th>Process</th>
                                        <th>User</th>
                                        <th>Reason</th>
                                        <th>Comment</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${shutdowns.map(shutdown => `
                                        <tr>
                                            <td>${shutdown.time || 'N/A'}</td>
                                            <td>
                                                <span class="status-badge status-${shutdown.type === 'Shutdown' ? 'offline' : 'warning'}">
                                                    ${shutdown.type || 'N/A'}
                                                </span>
                                            </td>
                                            <td>${shutdown.process || 'N/A'}</td>
                                            <td>${shutdown.user && shutdown.user !== 'N/A' ? shutdown.user : '-'}</td>
                                            <td>${shutdown.reason || 'N/A'}</td>
                                            <td>${shutdown.comment && shutdown.comment !== 'N/A' ? shutdown.comment : '-'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    ` : ''}

                    <!-- Windows Updates -->
                    ${windowsUpdatesSummary.installedKBCount !== undefined || windowsUpdatesSummary.missingCumulativeCount !== undefined ? `
                    <div class="hardware-section-modern">
                        <h4 class="section-subtitle-modern">
                            <i class="fas fa-download"></i> 4. Windows Updates
                            ${windowsUpdatesSummary.rebootPending ? `
                            <span class="reboot-required-badge">
                                <i class="fas fa-exclamation-triangle"></i> Reboot Required
                            </span>
                            ` : ''}
                        </h4>
                        <div class="hardware-grid-modern">
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern icon-blue">
                                    <i class="fas fa-check-circle"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">Installed KBs</div>
                                    <div class="hardware-value-modern">${windowsUpdatesSummary.installedKBCount || 0}</div>
                                </div>
                            </div>
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern icon-purple">
                                    <i class="fas fa-calendar"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">Last Installed Update Date</div>
                                    <div class="hardware-value-modern">${windowsUpdatesSummary.lastInstalledUpdateDate || 'N/A'}</div>
                                </div>
                            </div>
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern icon-orange">
                                    <i class="fas fa-exclamation-triangle"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">Missing Updates (Cumulative only)</div>
                                    <div class="hardware-value-modern" style="color: ${(windowsUpdatesSummary.missingCumulativeCount || 0) > 0 ? '#f59e0b' : '#34d399'}">
                                        ${windowsUpdatesSummary.missingCumulativeCount || 0}
                                    </div>
                                </div>
                            </div>
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern" style="background: linear-gradient(135deg, ${windowsUpdatesSummary.rebootPending ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)'} 0%, ${windowsUpdatesSummary.rebootPending ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'} 100%); border: 1px solid ${windowsUpdatesSummary.rebootPending ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}; color: ${windowsUpdatesSummary.rebootPending ? '#ef4444' : '#10b981'};">
                                    <i class="fas ${windowsUpdatesSummary.rebootPending ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">Reboot Pending</div>
                                    <div class="hardware-value-modern" style="color: ${windowsUpdatesSummary.rebootPending ? '#ef4444' : '#10b981'}">
                                        ${windowsUpdatesSummary.rebootPending ? 'Yes' : 'No'}
                                    </div>
                                </div>
                            </div>
                        </div>
                        ${(windowsUpdates || []).length > 0 ? `
                        <div style="margin-top: 1rem;">
                            <div class="table-container-modern">
                                <table class="table-compact">
                                    <thead>
                                        <tr>
                                            <th>KB Number</th>
                                            <th>Description</th>
                                            <th>Installed On</th>
                                            <th>Installed By</th>
                                            <th>Update Source</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${windowsUpdates.slice(0, 20).map(update => {
                                            const updateSource = update.updateSource || 'Microsoft';
                                            const isWSUS = updateSource === 'WSUS';
                                            return `
                                            <tr>
                                                <td><strong>${update.hotFixID || update.kbNumber || 'N/A'}</strong></td>
                                                <td>${update.description || 'N/A'}</td>
                                                <td>${update.installedOn || 'N/A'}</td>
                                                <td>${update.installedBy || 'N/A'}</td>
                                                <td>
                                                    <span style="color: ${isWSUS ? '#3b82f6' : '#10b981'}; font-weight: 600;">
                                                        ${isWSUS ? '<i class="fas fa-server"></i> ' : '<i class="fas fa-cloud"></i> '}
                                                        ${updateSource}
                                                    </span>
                                                </td>
                                            </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                            ${windowsUpdates.length > 20 ? `
                            <button class="view-all-btn-compact" onclick="windowsServerAuditorInstance.showWindowsUpdatesModal()" style="margin-top: 0.5rem;">
                                View all installed KBs (${windowsUpdates.length}) <i class="fas fa-chevron-right"></i>
                            </button>
                            ` : ''}
                        </div>
                        ` : ''}
                        ${(missingUpdates || []).length > 0 ? `
                        <div style="margin-top: 1rem;">
                            <div class="table-container-modern">
                                <table class="table-compact">
                                    <thead>
                                        <tr>
                                            <th>KB Number</th>
                                            <th>Title</th>
                                            <th>Size</th>
                                            <th>Date</th>
                                            <th>Update Source</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${missingUpdates.slice(0, 20).map(update => {
                                            const updateSource = update.updateSource || 'Microsoft';
                                            const isWSUS = updateSource === 'WSUS';
                                            return `
                                            <tr>
                                                <td><strong>${update.kbNumber || 'N/A'}</strong></td>
                                                <td>${update.title || 'N/A'}</td>
                                                <td>${update.size || 'N/A'}</td>
                                                <td>${update.date || 'N/A'}</td>
                                                <td>
                                                    <span style="color: ${isWSUS ? '#3b82f6' : '#10b981'}; font-weight: 600;">
                                                        ${isWSUS ? '<i class="fas fa-server"></i> ' : '<i class="fas fa-cloud"></i> '}
                                                        ${updateSource}
                                                    </span>
                                                </td>
                                            </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                            ${missingUpdates.length > 20 ? `
                            <button class="view-all-btn-compact" onclick="windowsServerAuditorInstance.showMissingUpdatesModal()" style="margin-top: 0.5rem;">
                                View all missing updates (${missingUpdates.length}) <i class="fas fa-chevron-right"></i>
                            </button>
                            ` : ''}
                        </div>
                        ` : ''}
                    </div>
                    ` : ''}

                    <!-- Local Users & Groups -->
                    ${localUsersSummary.localUsersCount !== undefined ? `
                    <div class="hardware-section-modern">
                        <h4 class="section-subtitle-modern">
                            <i class="fas fa-users"></i> Local Users & Groups
                        </h4>
                        <div class="hardware-grid-modern">
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern icon-blue">
                                    <i class="fas fa-user"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">Local Users Count</div>
                                    <div class="hardware-value-modern">${localUsersSummary.localUsersCount || 0}</div>
                                </div>
                            </div>
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern icon-orange">
                                    <i class="fas fa-user-slash"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">Disabled Local Accounts</div>
                                    <div class="hardware-value-modern" style="color: ${(localUsersSummary.disabledLocalAccountsCount || 0) > 0 ? '#f59e0b' : '#34d399'}">
                                        ${localUsersSummary.disabledLocalAccountsCount || 0}
                                    </div>
                                </div>
                            </div>
                        </div>
                        ${(localUsersSummary.localUsers || []).length > 0 ? `
                        <div style="margin-top: 1rem;">
                            <div class="table-container-modern">
                                <table class="table-compact">
                                    <thead>
                                        <tr>
                                            <th>User Name</th>
                                            <th>Full Name</th>
                                            <th>Description</th>
                                            <th>Status</th>
                                            <th>Last Logon</th>
                                            <th>Password Expires</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${(localUsersSummary.localUsers || []).map(user => `
                                            <tr>
                                                <td><strong>${user.name || 'N/A'}</strong></td>
                                                <td>${user.fullName || 'N/A'}</td>
                                                <td>${user.description || 'N/A'}</td>
                                                <td>
                                                    <span style="color: ${user.enabled ? '#34d399' : '#ef4444'};">
                                                        <i class="fas fa-circle" style="font-size: 0.5rem; margin-right: 0.25rem;"></i>
                                                        ${user.enabled ? 'Enabled' : 'Disabled'}
                                                    </span>
                                                </td>
                                                <td>${user.lastLogon && user.lastLogon !== 'Never' ? user.lastLogon : 'Never'}</td>
                                                <td>${(() => {
                                                    try {
                                                        const dateStr = user.passwordExpires;
                                                        if (!dateStr || dateStr === 'N/A' || dateStr === 'Never') {
                                                            return dateStr || 'Never';
                                                        }
                                                        // Handle .NET JSON date format: /Date(timestamp)/
                                                        if (typeof dateStr === 'string' && dateStr.match(/^\/Date\((\d+)\)\/$/)) {
                                                            const timestamp = parseInt(dateStr.match(/^\/Date\((\d+)\)\/$/)[1]);
                                                            const date = new Date(timestamp);
                                                            return isNaN(date.getTime()) ? dateStr : date.toLocaleDateString();
                                                        }
                                                        // Try parsing as regular date
                                                        const date = new Date(dateStr);
                                                        return isNaN(date.getTime()) ? dateStr : date.toLocaleDateString();
                                                    } catch (e) {
                                                        return user.passwordExpires || 'Never';
                                                    }
                                                })()}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    ` : ''}

                    <!-- Local Groups -->
                    ${localGroups && localGroups.length > 0 ? `
                    <div class="hardware-section-modern">
                        <h4 class="section-subtitle-modern">
                            <i class="fas fa-users-cog"></i> Local Groups
                            <span class="role-count-badge-modern">${localGroups.length}</span>
                        </h4>
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th>Group Name</th>
                                        <th>Description</th>
                                        <th>Members</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${localGroups.map((group, groupIndex) => {
                                        const members = Array.isArray(group.members) ? group.members : [];
                                        return `
                                        <tr style="cursor: pointer;" onclick="windowsServerAuditorInstance.showGroupMembersModal('${(group.name || '').replace(/'/g, "\\'")}', ${JSON.stringify(members).replace(/"/g, '&quot;')}, '${(group.description || '').replace(/'/g, "\\'")}')">
                                            <td><strong>${group.name || 'N/A'}</strong></td>
                                            <td>${group.description && group.description !== '-' ? group.description : '-'}</td>
                                            <td>
                                                <span style="color: ${members.length > 0 ? '#34d399' : '#94a3b8'};">
                                                    <i class="fas fa-${members.length > 0 ? 'user' : 'users-slash'}"></i>
                                                    ${members.length} ${members.length === 1 ? 'Member' : 'Members'}
                                                </span>
                                            </td>
                                        </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    ` : ''}

                    <!-- Event Log Overview -->
                    ${eventLogOverview.systemErrors24h !== undefined || eventLogOverview.appErrors24h !== undefined ? `
                    <div class="hardware-section-modern">
                        <h4 class="section-subtitle-modern">
                            <i class="fas fa-clipboard-list"></i> Event Log Overview
                            ${eventLogOverview.oldestLogDays !== undefined && eventLogOverview.oldestLogDays !== 'N/A' ? `
                            <span style="font-size: 0.75rem; font-weight: normal; color: #94a3b8; margin-left: 0.5rem;">
                                (Retention: ${eventLogOverview.oldestLogDays} days)
                            </span>
                            ` : ''}
                        </h4>
                        
                        <!-- Summary Stats -->
                        <div class="hardware-grid-modern">
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern" style="background: linear-gradient(135deg, ${(eventLogOverview.systemErrors24h || 0) > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)'} 0%, ${(eventLogOverview.systemErrors24h || 0) > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'} 100%); border: 1px solid ${(eventLogOverview.systemErrors24h || 0) > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}; color: ${(eventLogOverview.systemErrors24h || 0) > 0 ? '#ef4444' : '#10b981'};">
                                    <i class="fas fa-exclamation-circle"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">System Errors</div>
                                    <div class="hardware-value-modern" style="font-size: 0.8125rem; display: flex; gap: 0.75rem; flex-wrap: wrap;">
                                        <span>24h: <strong style="color: ${(eventLogOverview.systemErrors24h || 0) > 0 ? '#ef4444' : '#34d399'}">${eventLogOverview.systemErrors24h || 0}</strong></span>
                                        <span>7d: <strong style="color: ${(eventLogOverview.systemErrors7d || 0) > 0 ? '#f59e0b' : '#34d399'}">${eventLogOverview.systemErrors7d || 0}</strong></span>
                                        <span>30d: <strong style="color: ${(eventLogOverview.systemErrors30d || 0) > 0 ? '#f59e0b' : '#94a3b8'}">${eventLogOverview.systemErrors30d || 0}</strong></span>
                                    </div>
                                </div>
                            </div>
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern" style="background: linear-gradient(135deg, ${(eventLogOverview.appErrors24h || 0) > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)'} 0%, ${(eventLogOverview.appErrors24h || 0) > 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)'} 100%); border: 1px solid ${(eventLogOverview.appErrors24h || 0) > 0 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}; color: ${(eventLogOverview.appErrors24h || 0) > 0 ? '#f59e0b' : '#10b981'};">
                                    <i class="fas fa-bug"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">Application Errors</div>
                                    <div class="hardware-value-modern" style="font-size: 0.8125rem; display: flex; gap: 0.75rem; flex-wrap: wrap;">
                                        <span>24h: <strong style="color: ${(eventLogOverview.appErrors24h || 0) > 0 ? '#ef4444' : '#34d399'}">${eventLogOverview.appErrors24h || 0}</strong></span>
                                        <span>7d: <strong style="color: ${(eventLogOverview.appErrors7d || 0) > 0 ? '#f59e0b' : '#34d399'}">${eventLogOverview.appErrors7d || 0}</strong></span>
                                        <span>30d: <strong style="color: ${(eventLogOverview.appErrors30d || 0) > 0 ? '#f59e0b' : '#94a3b8'}">${eventLogOverview.appErrors30d || 0}</strong></span>
                                    </div>
                                </div>
                            </div>
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern" style="background: linear-gradient(135deg, ${(eventLogOverview.criticalEventsCount || 0) > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)'} 0%, ${(eventLogOverview.criticalEventsCount || 0) > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'} 100%); border: 1px solid ${(eventLogOverview.criticalEventsCount || 0) > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}; color: ${(eventLogOverview.criticalEventsCount || 0) > 0 ? '#ef4444' : '#10b981'};">
                                    <i class="fas fa-exclamation-triangle"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">Critical Events</div>
                                    <div class="hardware-value-modern" style="color: ${(eventLogOverview.criticalEventsCount || 0) > 0 ? '#ef4444' : '#34d399'}">
                                        ${eventLogOverview.criticalEventsCount || 0}
                                    </div>
                                </div>
                            </div>
                            ${eventLogOverview.oldestLogDays !== undefined && eventLogOverview.oldestLogDays !== 'N/A' ? `
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern icon-blue">
                                    <i class="fas fa-clock"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">Log Retention</div>
                                    <div class="hardware-value-modern">${eventLogOverview.oldestLogDays} days</div>
                                </div>
                            </div>
                            ` : ''}
                        </div>

                        <!-- System Errors Table -->
                        ${(eventLogOverview.systemErrors || []).length > 0 ? `
                        <div style="margin-top: 1.5rem; margin-bottom: 1.5rem;">
                            <h5 style="color: #e2e8f0; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
                                <span style="display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="fas fa-exclamation-circle" style="color: #ef4444;"></i> System Errors
                                </span>
                                <button onclick="windowsServerAuditorInstance.openEventLogModal('system')" style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); color: #60a5fa; padding: 0.25rem 0.75rem; border-radius: 0.375rem; font-size: 0.75rem; cursor: pointer; transition: all 0.2s;">
                                    <i class="fas fa-external-link-alt"></i> View All (${(eventLogOverview.systemErrors || []).length})
                                </button>
                            </h5>
                            <div class="table-container-modern">
                                <table class="table-compact">
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Source</th>
                                            <th>Level</th>
                                            <th>ID</th>
                                            <th>Message</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${(eventLogOverview.systemErrors || []).slice(0, 20).map((error, index) => {
                                            const errorData = {
                                                time: error.time || 'N/A',
                                                source: error.source || 'N/A',
                                                level: error.level || 'Error',
                                                id: error.id || 'N/A',
                                                message: error.message || 'N/A'
                                            };
                                            const errorJson = encodeURIComponent(JSON.stringify(errorData));
                                            return `
                                            <tr onclick="windowsServerAuditorInstance.openEventDetailsModalFromString(decodeURIComponent('${errorJson}'), 'system')" style="cursor: pointer; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='rgba(59, 130, 246, 0.1)'" onmouseout="this.style.backgroundColor='transparent'">
                                                <td>${error.time || 'N/A'}</td>
                                                <td>${error.source || 'N/A'}</td>
                                                <td><span style="color: #ef4444;">${error.level || 'Error'}</span></td>
                                                <td>${error.id || 'N/A'}</td>
                                                <td style="max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(error.message || '').replace(/"/g, '&quot;')}">${error.message || 'N/A'}</td>
                                            </tr>
                                        `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        ` : ''}

                        <!-- Application Errors Table -->
                        ${(eventLogOverview.appErrors || []).length > 0 ? `
                        <div style="margin-bottom: 1.5rem;">
                            <h5 style="color: #e2e8f0; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
                                <span style="display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="fas fa-bug" style="color: #f59e0b;"></i> Application Errors
                                </span>
                                <button onclick="windowsServerAuditorInstance.openEventLogModal('application')" style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); color: #60a5fa; padding: 0.25rem 0.75rem; border-radius: 0.375rem; font-size: 0.75rem; cursor: pointer; transition: all 0.2s;">
                                    <i class="fas fa-external-link-alt"></i> View All (${(eventLogOverview.appErrors || []).length})
                                </button>
                            </h5>
                            <div class="table-container-modern">
                                <table class="table-compact">
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Source</th>
                                            <th>Level</th>
                                            <th>ID</th>
                                            <th>Message</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${(eventLogOverview.appErrors || []).slice(0, 20).map((error, index) => {
                                            const errorData = {
                                                time: error.time || 'N/A',
                                                source: error.source || 'N/A',
                                                level: error.level || 'Error',
                                                id: error.id || 'N/A',
                                                message: error.message || 'N/A'
                                            };
                                            const errorJson = encodeURIComponent(JSON.stringify(errorData));
                                            return `
                                            <tr onclick="windowsServerAuditorInstance.openEventDetailsModalFromString(decodeURIComponent('${errorJson}'), 'application')" style="cursor: pointer; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='rgba(59, 130, 246, 0.1)'" onmouseout="this.style.backgroundColor='transparent'">
                                                <td>${error.time || 'N/A'}</td>
                                                <td>${error.source || 'N/A'}</td>
                                                <td><span style="color: #f59e0b;">${error.level || 'Error'}</span></td>
                                                <td>${error.id || 'N/A'}</td>
                                                <td style="max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(error.message || '').replace(/"/g, '&quot;')}">${error.message || 'N/A'}</td>
                                            </tr>
                                        `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        ` : ''}

                        <!-- Critical Events Table -->
                        ${(eventLogOverview.criticalEvents || []).length > 0 ? `
                        <div style="margin-bottom: 1.5rem;">
                            <h5 style="color: #e2e8f0; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i> Critical Events (Showing ${(eventLogOverview.criticalEvents || []).length} of ${eventLogOverview.criticalEventsCount || 0})
                            </h5>
                            <div class="table-container-modern">
                                <table class="table-compact">
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Source</th>
                                            <th>Level</th>
                                            <th>ID</th>
                                            <th>Message</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${(eventLogOverview.criticalEvents || []).slice(0, 20).map(error => `
                                            <tr>
                                                <td>${error.time || 'N/A'}</td>
                                                <td>${error.source || 'N/A'}</td>
                                                <td><span style="color: #ef4444; font-weight: 600;">${error.level || 'Critical'}</span></td>
                                                <td>${error.id || 'N/A'}</td>
                                                <td style="max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(error.message || '').replace(/"/g, '&quot;')}">${error.message || 'N/A'}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                            ${(eventLogOverview.criticalEvents || []).length > 20 ? `
                            <div style="margin-top: 0.5rem; font-size: 0.75rem; color: #94a3b8;">
                                Showing first 20 of ${(eventLogOverview.criticalEvents || []).length} critical events
                            </div>
                            ` : ''}
                        </div>
                        ` : ''}
                    </div>
                    ` : ''}

                    <!-- Crash & BSOD Analysis -->
                    ${crashAnalysis && (crashAnalysis.crashes || []).length > 0 ? `
                    <div class="hardware-section-modern">
                        <h4 class="section-subtitle-modern">
                            <i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i> Crash & BSOD Analysis
                            ${(() => {
                                const realCrashes = (crashAnalysis.crashes || []).filter(c => c.type !== 'CleanReboot').length;
                                const cleanReboots = (crashAnalysis.crashes || []).filter(c => c.type === 'CleanReboot').length;
                                return `
                                <span class="update-count-pill" style="background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3);">${realCrashes} real crashes</span>
                                ${cleanReboots > 0 ? `<span class="update-count-pill" style="background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); margin-left: 0.5rem;">${cleanReboots} clean reboots</span>` : ''}
                                `;
                            })()}
                        </h4>
                        
                        <!-- Crash Type Summary -->
                        ${crashAnalysis.crashTypes ? `
                        <div class="hardware-grid-modern" style="margin-bottom: 1.5rem;">
                            ${crashAnalysis.crashTypes.BSOD > 0 ? `
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern" style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.2) 100%); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444;">
                                    <i class="fas fa-skull"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">BSOD</div>
                                    <div class="hardware-value-modern" style="color: #ef4444; font-weight: 600;">${crashAnalysis.crashTypes.BSOD}</div>
                                </div>
                            </div>
                            ` : ''}
                            ${crashAnalysis.crashTypes.PowerLoss > 0 ? `
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern" style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.2) 100%); border: 1px solid rgba(245, 158, 11, 0.3); color: #f59e0b;">
                                    <i class="fas fa-plug"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">Power Loss</div>
                                    <div class="hardware-value-modern" style="color: #f59e0b; font-weight: 600;">${crashAnalysis.crashTypes.PowerLoss}</div>
                                </div>
                            </div>
                            ` : ''}
                            ${crashAnalysis.crashTypes.KernelHang > 0 ? `
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern" style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.2) 100%); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444;">
                                    <i class="fas fa-hourglass-half"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">Kernel Hang</div>
                                    <div class="hardware-value-modern" style="color: #ef4444; font-weight: 600;">${crashAnalysis.crashTypes.KernelHang}</div>
                                </div>
                            </div>
                            ` : ''}
                            ${crashAnalysis.crashTypes.WatchdogReset > 0 ? `
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern" style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.2) 100%); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444;">
                                    <i class="fas fa-clock"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">Watchdog Reset</div>
                                    <div class="hardware-value-modern" style="color: #ef4444; font-weight: 600;">${crashAnalysis.crashTypes.WatchdogReset}</div>
                                </div>
                            </div>
                            ` : ''}
                            ${crashAnalysis.crashTypes.CleanReboot > 0 ? `
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.2) 100%); border: 1px solid rgba(16, 185, 129, 0.3); color: #10b981;">
                                    <i class="fas fa-power-off"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">Clean Reboot</div>
                                    <div class="hardware-value-modern" style="color: #10b981; font-weight: 600;">${crashAnalysis.crashTypes.CleanReboot}</div>
                                </div>
                            </div>
                            ` : ''}
                        </div>
                        ` : ''}

                        <!-- Dump File Info -->
                        ${crashAnalysis.dumpInfo && Object.keys(crashAnalysis.dumpInfo).length > 0 ? `
                        <div style="margin-bottom: 1.5rem; padding: 1rem; background: rgba(15, 23, 42, 0.5); border-radius: 0.5rem; border: 1px solid rgba(59, 130, 246, 0.1);">
                            <h5 style="color: #e2e8f0; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-file-archive" style="color: #60a5fa;"></i> Dump File Configuration
                            </h5>
                            <div style="display: grid; grid-template-columns: 200px 1fr; gap: 0.5rem; font-size: 0.8125rem;">
                                <div style="color: #94a3b8;">Dump Enabled:</div>
                                <div style="color: #e2e8f0;">${crashAnalysis.dumpInfo.dumpEnabled === true ? '<span style="color: #10b981;">Yes</span>' : '<span style="color: #ef4444;">No</span>'}</div>
                                
                                ${crashAnalysis.dumpInfo.dumpType ? `
                                <div style="color: #94a3b8;">Dump Type:</div>
                                <div style="color: #e2e8f0;">${crashAnalysis.dumpInfo.dumpType}</div>
                                ` : ''}
                                
                                ${crashAnalysis.dumpInfo.dumpFileCount !== undefined ? `
                                <div style="color: #94a3b8;">Dump Files Found:</div>
                                <div style="color: #e2e8f0;">${crashAnalysis.dumpInfo.dumpFileCount} ${crashAnalysis.dumpInfo.dumpFileCount === 0 ? '<span style="color: #f59e0b; margin-left: 0.5rem;">⚠️ No dumps available</span>' : ''}</div>
                                ` : ''}
                                
                                ${crashAnalysis.dumpInfo.latestDump ? `
                                <div style="color: #94a3b8;">Latest Dump:</div>
                                <div style="color: #e2e8f0;">${crashAnalysis.dumpInfo.latestDump}</div>
                                ` : ''}
                            </div>
                        </div>
                        ` : ''}

                        <!-- Real Crashes Table -->
                        ${(() => {
                            const realCrashes = (crashAnalysis.crashes || []).filter(c => c.type !== 'CleanReboot');
                            return realCrashes.length > 0 ? `
                        <div style="margin-bottom: 1.5rem;">
                            <h5 style="color: #e2e8f0; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i> Real Crashes (${realCrashes.length})
                            </h5>
                            <div class="table-container-modern">
                                <table class="table-compact">
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Type</th>
                                            <th>BugCheck Code</th>
                                            <th>Meaning</th>
                                            <th>Faulting Module</th>
                                            <th>Details</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${realCrashes.slice(0, 20).map(crash => {
                                            const typeColor = crash.type === 'BSOD' || crash.type === 'KernelHang' || crash.type === 'WatchdogReset' ? '#ef4444' : '#f59e0b';
                                            return `
                                            <tr>
                                                <td>${crash.time || 'N/A'}</td>
                                                <td><span style="color: ${typeColor}; font-weight: 600;">${crash.type || 'Unknown'}</span></td>
                                                <td style="font-family: 'Consolas', 'Monaco', monospace;">${crash.bugCheckCode || 'N/A'}</td>
                                                <td>${crash.bugCheckMeaning || 'N/A'}</td>
                                                <td style="font-family: 'Consolas', 'Monaco', monospace;">${crash.faultingModule || 'N/A'}</td>
                                                <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(crash.message || '').replace(/"/g, '&quot;')}">${crash.message || 'N/A'}</td>
                                            </tr>
                                        `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        ` : '';
                        })()}

                        <!-- Clean Reboots Table -->
                        ${(() => {
                            const cleanReboots = (crashAnalysis.crashes || []).filter(c => c.type === 'CleanReboot');
                            return cleanReboots.length > 0 ? `
                        <div style="margin-bottom: 1.5rem;">
                            <h5 style="color: #e2e8f0; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-power-off" style="color: #10b981;"></i> Clean Reboots (${cleanReboots.length}) - Normal Operations
                            </h5>
                            <div class="table-container-modern">
                                <table class="table-compact">
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Reason</th>
                                            <th>User</th>
                                            <th>Details</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${cleanReboots.slice(0, 10).map(crash => {
                                            // Extract reason from message
                                            let reason = 'N/A';
                                            let user = 'N/A';
                                            if (crash.message) {
                                                const reasonMatch = crash.message.match(/raison suivante[^:]*:\s*([^C]+?)\s*Code/);
                                                if (reasonMatch) reason = reasonMatch[1].trim();
                                                const userMatch = crash.message.match(/utilisateur\s+([^\\s]+)/);
                                                if (userMatch) user = userMatch[1];
                                            }
                                            return `
                                            <tr>
                                                <td>${crash.time || 'N/A'}</td>
                                                <td style="color: #10b981;">${reason}</td>
                                                <td>${user}</td>
                                                <td style="max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(crash.message || '').replace(/"/g, '&quot;')}">${crash.message || 'N/A'}</td>
                                            </tr>
                                        `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        ` : '';
                        })()}

                        <!-- WHEA Events -->
                        <div style="margin-bottom: 1.5rem;">
                            <h5 style="color: #e2e8f0; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-microchip" style="color: #f59e0b;"></i> Hardware Errors (WHEA) - ${(crashAnalysis.wheaEvents || []).length} events
                            </h5>
                            <div class="table-container-modern">
                                <table class="table-compact">
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Type</th>
                                            <th>Event ID</th>
                                            <th>Message</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${(crashAnalysis.wheaEvents || []).length > 0 ? (crashAnalysis.wheaEvents || []).slice(0, 10).map(whea => `
                                            <tr>
                                                <td>${whea.time || 'N/A'}</td>
                                                <td><span style="color: #f59e0b; font-weight: 600;">${whea.type || 'Unknown'}</span></td>
                                                <td>${whea.eventId || 'N/A'}</td>
                                                <td style="max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(whea.message || '').replace(/"/g, '&quot;')}">${whea.message || 'N/A'}</td>
                                            </tr>
                                        `).join('') : `
                                            <tr>
                                                <td colspan="4" style="text-align: center; color: #94a3b8; font-style: italic; padding: 2rem;">
                                                    <i class="fas fa-check-circle" style="color: #10b981; margin-right: 0.5rem;"></i>No hardware errors detected
                                                </td>
                                            </tr>
                                        `}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Pre-Crash Indicators -->
                        <div style="margin-bottom: 1.5rem;">
                            <h5 style="color: #e2e8f0; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-search" style="color: #60a5fa;"></i> Pre-Crash Indicators - ${(crashAnalysis.preCrashIndicators || []).length} events
                            </h5>
                            <div class="table-container-modern">
                                <table class="table-compact">
                                    <thead>
                                        <tr>
                                            <th>Crash Time</th>
                                            <th>Crash Type</th>
                                            <th>Indicator Time</th>
                                            <th>Indicator Type</th>
                                            <th>Event ID</th>
                                            <th>Message</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${(crashAnalysis.preCrashIndicators || []).length > 0 ? (crashAnalysis.preCrashIndicators || []).slice(0, 15).map(indicator => `
                                            <tr>
                                                <td>${indicator.crashTime || 'N/A'}</td>
                                                <td><span style="color: #ef4444;">${indicator.crashType || 'Unknown'}</span></td>
                                                <td>${indicator.indicatorTime || 'N/A'}</td>
                                                <td><span style="color: #f59e0b;">${indicator.indicatorType || 'Unknown'}</span></td>
                                                <td>${indicator.eventId || 'N/A'}</td>
                                                <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(indicator.message || '').replace(/"/g, '&quot;')}">${indicator.message || 'N/A'}</td>
                                            </tr>
                                        `).join('') : `
                                            <tr>
                                                <td colspan="6" style="text-align: center; color: #94a3b8; font-style: italic; padding: 2rem;">
                                                    <i class="fas fa-check-circle" style="color: #10b981; margin-right: 0.5rem;"></i>No pre-crash indicators found
                                                </td>
                                            </tr>
                                        `}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Memory Issues -->
                        <div style="margin-bottom: 1.5rem;">
                            <h5 style="color: #e2e8f0; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-memory" style="color: #ef4444;"></i> Memory Exhaustion Events - ${(crashAnalysis.memoryIssues || []).length} events
                            </h5>
                            <div class="table-container-modern">
                                <table class="table-compact">
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Type</th>
                                            <th>Event ID</th>
                                            <th>Message</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${(crashAnalysis.memoryIssues || []).length > 0 ? (crashAnalysis.memoryIssues || []).slice(0, 10).map(mem => `
                                            <tr>
                                                <td>${mem.time || 'N/A'}</td>
                                                <td><span style="color: #ef4444; font-weight: 600;">${mem.type || 'Unknown'}</span></td>
                                                <td>${mem.eventId || 'N/A'}</td>
                                                <td style="max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(mem.message || '').replace(/"/g, '&quot;')}">${mem.message || 'N/A'}</td>
                                            </tr>
                                        `).join('') : `
                                            <tr>
                                                <td colspan="4" style="text-align: center; color: #94a3b8; font-style: italic; padding: 2rem;">
                                                    <i class="fas fa-check-circle" style="color: #10b981; margin-right: 0.5rem;"></i>No memory exhaustion events detected
                                                </td>
                                            </tr>
                                        `}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Hyper-V Events -->
                        <div style="margin-bottom: 1.5rem;">
                            <h5 style="color: #e2e8f0; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-server" style="color: #60a5fa;"></i> Hyper-V Events - ${(crashAnalysis.hypervEvents || []).length} events
                            </h5>
                            <div class="table-container-modern">
                                <table class="table-compact">
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Level</th>
                                            <th>Event ID</th>
                                            <th>Message</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${(crashAnalysis.hypervEvents || []).length > 0 ? (crashAnalysis.hypervEvents || []).slice(0, 10).map(hv => `
                                            <tr>
                                                <td>${hv.time || 'N/A'}</td>
                                                <td><span style="color: ${hv.level === 'Critical' || hv.level === 'Error' ? '#ef4444' : '#f59e0b'}; font-weight: 600;">${hv.level || 'Unknown'}</span></td>
                                                <td>${hv.eventId || 'N/A'}</td>
                                                <td style="max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(hv.message || '').replace(/"/g, '&quot;')}">${hv.message || 'N/A'}</td>
                                            </tr>
                                        `).join('') : `
                                            <tr>
                                                <td colspan="4" style="text-align: center; color: #94a3b8; font-style: italic; padding: 2rem;">
                                                    <i class="fas fa-check-circle" style="color: #10b981; margin-right: 0.5rem;"></i>No Hyper-V errors detected
                                                </td>
                                            </tr>
                                        `}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    ` : ''}

                    <!-- Process Tree -->
                    ${processTree && processTree.processes ? `
                    <div class="hardware-section-modern">
                        <h4 class="section-subtitle-modern">
                            <i class="fas fa-sitemap" style="color: #8b5cf6;"></i> Process Tree
                            ${processTree.summary ? `
                            <span class="update-count-pill" style="background: rgba(139, 92, 246, 0.2); color: #8b5cf6; border: 1px solid rgba(139, 92, 246, 0.3);">${processTree.summary.totalProcesses || 0} processes</span>
                            ` : ''}
                        </h4>
                        
                        ${processTree.summary ? `
                        <!-- Summary Cards -->
                        <div class="hardware-grid-modern" style="margin-bottom: 1.5rem;">
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern" style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.2) 100%); border: 1px solid rgba(139, 92, 246, 0.3); color: #8b5cf6;">
                                    <i class="fas fa-cogs"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">Total Processes</div>
                                    <div class="hardware-value-modern">${processTree.summary.totalProcesses || 0}</div>
                                </div>
                            </div>
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.2) 100%); border: 1px solid rgba(59, 130, 246, 0.3); color: #3b82f6;">
                                    <i class="fas fa-code-branch"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">Total Threads</div>
                                    <div class="hardware-value-modern">${processTree.summary.totalThreads || 0}</div>
                                </div>
                            </div>
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.2) 100%); border: 1px solid rgba(16, 185, 129, 0.3); color: #10b981;">
                                    <i class="fas fa-hand-pointer"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">Total Handles</div>
                                    <div class="hardware-value-modern">${processTree.summary.totalHandles || 0}</div>
                                </div>
                            </div>
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern" style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.2) 100%); border: 1px solid rgba(245, 158, 11, 0.3); color: #f59e0b;">
                                    <i class="fas fa-memory"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">Total Memory</div>
                                    <div class="hardware-value-modern">${(processTree.summary.totalMemoryMB || 0).toFixed(2)} MB</div>
                                </div>
                            </div>
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern" style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.2) 100%); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444;">
                                    <i class="fas fa-microchip"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">Total CPU</div>
                                    <div class="hardware-value-modern">${(processTree.summary.totalCpuPercent || 0).toFixed(2)}%</div>
                                </div>
                            </div>
                        </div>
                        ` : ''}

                        <!-- Process Tree View -->
                        ${(processTree.processes || []).length > 15 ? `
                        <div style="display: flex; justify-content: flex-end; margin-bottom: 0.75rem;">
                            <button onclick="windowsServerAuditorInstance.openProcessTreeModal()" class="btn btn-sm btn-secondary">
                                <i class="fas fa-external-link-alt" style="margin-right: 0.25rem;"></i>View All (${(processTree.processes || []).length})
                            </button>
                        </div>
                        ` : ''}
                        <div style="background: rgba(15, 23, 42, 0.5); border-radius: 0.5rem; border: 1px solid #334155; padding: 0; width: 100%;">
                            <div class="process-tree-header" style="display: grid; grid-template-columns: 30px minmax(150px, 1fr) minmax(200px, 2fr) 80px 80px minmax(120px, 1fr) 80px 100px 120px 100px 100px minmax(100px, 1fr) 120px; gap: 0.5rem; padding: 0.75rem; background: rgba(30, 41, 59, 0.8); border-bottom: 1px solid #334155; font-size: 0.75rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; width: 100%;">
                                <div></div>
                                <div>Process Name</div>
                                <div>Path</div>
                                <div>PID</div>
                                <div>PPID</div>
                                <div>Username</div>
                                <div>Elevated</div>
                                <div>CPU %</div>
                                <div>Memory</div>
                                <div>Threads</div>
                                <div>Handles</div>
                                <div>Status</div>
                                <div>Priority</div>
                            </div>
                            <div id="process-tree-container" style="max-height: 800px; overflow-y: auto; font-family: 'Consolas', 'Monaco', monospace; font-size: 0.8125rem; width: 100%;">
                                ${this.renderProcessTree((processTree.processes || []).slice(0, 15), 0)}
                                ${(processTree.processes || []).length > 15 ? `
                                <div style="padding: 1rem; text-align: center; color: #94a3b8; font-style: italic;">
                                    Showing first 15 of ${(processTree.processes || []).length} processes
                                </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    ` : processTree.error ? `
                    <div class="hardware-section-modern">
                        <h4 class="section-subtitle-modern">
                            <i class="fas fa-sitemap" style="color: #8b5cf6;"></i> Process Tree
                        </h4>
                        <div style="padding: 2rem; text-align: center; color: #ef4444;">
                            <i class="fas fa-exclamation-triangle" style="margin-right: 0.5rem;"></i>Error loading process tree: ${processTree.error}
                        </div>
                    </div>
                    ` : ''}

                    <!-- Environment Variables & Paths -->
                    ${environmentPaths && environmentPaths.summary ? `
                    <div class="hardware-section-modern">
                        <h4 class="section-subtitle-modern">
                            <i class="fas fa-code-branch"></i> Environment Variables & Paths
                        </h4>
                        
                        <!-- Summary Cards -->
                        <div class="hardware-grid-modern" style="margin-bottom: 1.5rem;">
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern icon-blue">
                                    <i class="fas fa-ruler"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">System PATH Length</div>
                                    <div class="hardware-value-modern">${environmentPaths.summary.systemPathLength || 0} chars</div>
                                </div>
                            </div>
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern icon-purple">
                                    <i class="fas fa-server"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">System PATH Entries</div>
                                    <div class="hardware-value-modern">${environmentPaths.summary.systemPathEntriesCount || 0}</div>
                                </div>
                            </div>
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern icon-green">
                                    <i class="fas fa-user"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">User PATH Entries</div>
                                    <div class="hardware-value-modern">${environmentPaths.summary.userPathEntriesCount || 0}</div>
                                </div>
                            </div>
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern icon-orange">
                                    <i class="fas fa-list-ol"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">Total PATH Entries</div>
                                    <div class="hardware-value-modern">${environmentPaths.summary.totalPathEntries || 0}</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- PATH Health Status -->
                        <div style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.8) 100%); border: 1px solid #334155; border-radius: 0.75rem; padding: 1rem; margin-bottom: 1.5rem;">
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                                <h5 style="color: #e2e8f0; font-size: 0.875rem; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="fas fa-heartbeat" style="color: #10b981;"></i> PATH Health Status
                                </h5>
                                <span style="font-size: 0.875rem; font-weight: 600; ${environmentPaths.summary.overallPathHealth && environmentPaths.summary.overallPathHealth.includes('Critical') ? 'color: #ef4444;' : environmentPaths.summary.overallPathHealth && environmentPaths.summary.overallPathHealth.includes('Attention') ? 'color: #f59e0b;' : 'color: #10b981;'}">
                                    ${environmentPaths.summary.overallPathHealth || 'Unknown'}
                                </span>
                            </div>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem;">
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="fas fa-${environmentPaths.summary.hasDuplicatePathEntries ? 'times-circle' : 'check-circle'}" style="color: ${environmentPaths.summary.hasDuplicatePathEntries ? '#ef4444' : '#10b981'}; font-size: 0.875rem;"></i>
                                    <span style="color: #94a3b8; font-size: 0.8125rem;">Duplicate Entries</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="fas fa-${environmentPaths.summary.hasEmptyPathEntries ? 'times-circle' : 'check-circle'}" style="color: ${environmentPaths.summary.hasEmptyPathEntries ? '#ef4444' : '#10b981'}; font-size: 0.875rem;"></i>
                                    <span style="color: #94a3b8; font-size: 0.8125rem;">Empty Entries</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="fas fa-${environmentPaths.summary.hasRelativePathEntries ? 'times-circle' : 'check-circle'}" style="color: ${environmentPaths.summary.hasRelativePathEntries ? '#ef4444' : '#10b981'}; font-size: 0.875rem;"></i>
                                    <span style="color: #94a3b8; font-size: 0.8125rem;">Relative Paths</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="fas fa-${environmentPaths.summary.hasUncPaths ? 'exclamation-triangle' : 'check-circle'}" style="color: ${environmentPaths.summary.hasUncPaths ? '#f59e0b' : '#10b981'}; font-size: 0.875rem;"></i>
                                    <span style="color: #94a3b8; font-size: 0.8125rem;">UNC Paths</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="fas fa-${environmentPaths.summary.hasNonExistentPathEntries ? 'times-circle' : 'check-circle'}" style="color: ${environmentPaths.summary.hasNonExistentPathEntries ? '#ef4444' : '#10b981'}; font-size: 0.875rem;"></i>
                                    <span style="color: #94a3b8; font-size: 0.8125rem;">Non-existent Entries</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="fas fa-${environmentPaths.summary.hasTempInPath ? 'exclamation-triangle' : 'check-circle'}" style="color: ${environmentPaths.summary.hasTempInPath ? '#ef4444' : '#10b981'}; font-size: 0.875rem;"></i>
                                    <span style="color: #94a3b8; font-size: 0.8125rem;">TEMP in PATH</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- System PATH Analysis -->
                        ${(environmentPaths.systemPathAnalysis || []).length > 0 ? `
                        <div style="margin-bottom: 1.5rem;">
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                                <h5 style="color: #e2e8f0; font-size: 0.875rem; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="fas fa-server" style="color: #3b82f6;"></i> System PATH
                                </h5>
                                <span style="color: #94a3b8; font-size: 0.75rem;">${(environmentPaths.systemPathAnalysis || []).length} entries</span>
                            </div>
                            <div class="table-container-modern">
                                <table class="table-compact">
                                    <thead>
                                        <tr>
                                            <th>Path</th>
                                            <th style="width: 100px;">Status</th>
                                            <th style="width: 80px;">Exists</th>
                                            <th style="width: 120px;">Writable</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${(environmentPaths.systemPathAnalysis || []).map(path => `
                                            <tr>
                                                <td style="font-family: 'Consolas', 'Monaco', monospace; color: #e2e8f0;">${path.path || 'N/A'}</td>
                                                <td>
                                                    ${path.status === 'Critical' ? `
                                                    <span class="status-badge" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border-color: rgba(239, 68, 68, 0.3);">
                                                        <i class="fas fa-times-circle"></i> Critical
                                                    </span>
                                                    ` : path.status === 'Warning' ? `
                                                    <span class="status-badge" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; border-color: rgba(245, 158, 11, 0.3);">
                                                        <i class="fas fa-exclamation-triangle"></i> Warning
                                                    </span>
                                                    ` : `
                                                    <span class="status-badge" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border-color: rgba(16, 185, 129, 0.3);">
                                                        <i class="fas fa-check-circle"></i> OK
                                                    </span>
                                                    `}
                                                </td>
                                                <td style="color: #94a3b8;">
                                                    <span style="color: ${path.exists ? '#10b981' : '#ef4444'};">
                                                        <i class="fas fa-${path.exists ? 'check' : 'times'}"></i> ${path.exists ? 'Yes' : 'No'}
                                                    </span>
                                                </td>
                                                <td style="color: #94a3b8;">
                                                    ${path.writableByNonAdmins !== undefined ? `
                                                    <span style="color: ${path.writableByNonAdmins ? '#f59e0b' : '#10b981'};">
                                                        <i class="fas fa-${path.writableByNonAdmins ? 'exclamation-triangle' : 'lock'}"></i> ${path.writableByNonAdmins ? 'Yes' : 'No'}
                                                    </span>
                                                    ` : '<span style="color: #64748b;">N/A</span>'}
                                                </td>
                                            </tr>
                                            ${(path.flags || []).length > 0 ? `
                                            <tr>
                                                <td colspan="4" style="padding-top: 0; padding-bottom: 0.5rem;">
                                                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-left: 0;">
                                                        ${(path.flags || []).map(flag => `
                                                            <span style="display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.125rem 0.375rem; background: rgba(51, 65, 85, 0.5); border: 1px solid #475569; border-radius: 4px; color: #94a3b8; font-size: 0.6875rem;">
                                                                <i class="fas fa-flag"></i> ${flag}
                                                            </span>
                                                        `).join('')}
                                                    </div>
                                                </td>
                                            </tr>
                                            ` : ''}
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        ` : ''}
                        
                        <!-- User PATH Analysis -->
                        ${(environmentPaths.userPathAnalysis || []).length > 0 ? `
                        <div style="margin-bottom: 1.5rem;">
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                                <h5 style="color: #e2e8f0; font-size: 0.875rem; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="fas fa-user" style="color: #10b981;"></i> User PATH
                                </h5>
                                <span style="color: #94a3b8; font-size: 0.75rem;">${(environmentPaths.userPathAnalysis || []).length} entries</span>
                            </div>
                            <div class="table-container-modern">
                                <table class="table-compact">
                                    <thead>
                                        <tr>
                                            <th>Path</th>
                                            <th style="width: 100px;">Status</th>
                                            <th style="width: 80px;">Exists</th>
                                            <th style="width: 120px;">Writable</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${(environmentPaths.userPathAnalysis || []).map(path => `
                                            <tr>
                                                <td style="font-family: 'Consolas', 'Monaco', monospace; color: #e2e8f0;">${path.path || 'N/A'}</td>
                                                <td>
                                                    ${path.status === 'Warning' ? `
                                                    <span class="status-badge" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; border-color: rgba(245, 158, 11, 0.3);">
                                                        <i class="fas fa-exclamation-triangle"></i> Warning
                                                    </span>
                                                    ` : `
                                                    <span class="status-badge" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border-color: rgba(16, 185, 129, 0.3);">
                                                        <i class="fas fa-check-circle"></i> OK
                                                    </span>
                                                    `}
                                                </td>
                                                <td style="color: #94a3b8;">
                                                    <span style="color: ${path.exists ? '#10b981' : '#ef4444'};">
                                                        <i class="fas fa-${path.exists ? 'check' : 'times'}"></i> ${path.exists ? 'Yes' : 'No'}
                                                    </span>
                                                </td>
                                                <td style="color: #94a3b8;">
                                                    ${path.writableByUser !== undefined ? `
                                                    <span style="color: ${path.writableByUser ? '#f59e0b' : '#10b981'};">
                                                        <i class="fas fa-${path.writableByUser ? 'exclamation-triangle' : 'lock'}"></i> ${path.writableByUser ? 'Yes' : 'No'}
                                                    </span>
                                                    ` : '<span style="color: #64748b;">N/A</span>'}
                                                </td>
                                            </tr>
                                            ${(path.flags || []).length > 0 ? `
                                            <tr>
                                                <td colspan="4" style="padding-top: 0; padding-bottom: 0.5rem;">
                                                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-left: 0;">
                                                        ${(path.flags || []).map(flag => `
                                                            <span style="display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.125rem 0.375rem; background: rgba(51, 65, 85, 0.5); border: 1px solid #475569; border-radius: 4px; color: #94a3b8; font-size: 0.6875rem;">
                                                                <i class="fas fa-flag"></i> ${flag}
                                                            </span>
                                                        `).join('')}
                                                    </div>
                                                </td>
                                            </tr>
                                            ` : ''}
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        ` : ''}
                        
                        <!-- PATH Order Analysis & Hygiene -->
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                            ${environmentPaths.pathOrderAnalysis ? `
                            <div style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.8) 100%); border: 1px solid #334155; border-radius: 0.75rem; padding: 1rem;">
                                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                                    <h5 style="color: #e2e8f0; font-size: 0.875rem; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                                        <i class="fas fa-sort-amount-down" style="color: #8b5cf6;"></i> PATH Order Analysis
                                    </h5>
                                    <button class="view-all-btn-compact" onclick="windowsServerAuditorInstance.showPathOrderAnalysisModal()" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">
                                        View Details <i class="fas fa-chevron-right"></i>
                                    </button>
                                </div>
                                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; background: rgba(15, 23, 42, 0.5); border-radius: 0.5rem;">
                                        <span style="color: #94a3b8; font-size: 0.8125rem;">System32 First</span>
                                        <span style="color: ${environmentPaths.pathOrderAnalysis.system32FirstInPath ? '#10b981' : '#ef4444'}; font-weight: 600; font-size: 0.8125rem;">
                                            <i class="fas fa-${environmentPaths.pathOrderAnalysis.system32FirstInPath ? 'check' : 'times'}"></i> ${environmentPaths.pathOrderAnalysis.system32FirstInPath ? 'Yes' : 'No'}
                                        </span>
                                    </div>
                                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; background: rgba(15, 23, 42, 0.5); border-radius: 0.5rem;">
                                        <span style="color: #94a3b8; font-size: 0.8125rem;">User Precedes System</span>
                                        <span style="color: ${environmentPaths.pathOrderAnalysis.userPathPrecedesSystemPath ? '#f59e0b' : '#10b981'}; font-weight: 600; font-size: 0.8125rem;">
                                            <i class="fas fa-${environmentPaths.pathOrderAnalysis.userPathPrecedesSystemPath ? 'exclamation-triangle' : 'check'}"></i> ${environmentPaths.pathOrderAnalysis.userPathPrecedesSystemPath ? 'Yes' : 'No'}
                                        </span>
                                    </div>
                                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; background: rgba(15, 23, 42, 0.5); border-radius: 0.5rem;">
                                        <span style="color: #94a3b8; font-size: 0.8125rem;">Shadowing Risk</span>
                                        <span style="color: ${environmentPaths.pathOrderAnalysis.executableShadowingRisk ? '#f59e0b' : '#10b981'}; font-weight: 600; font-size: 0.8125rem;">
                                            <i class="fas fa-${environmentPaths.pathOrderAnalysis.executableShadowingRisk ? 'exclamation-triangle' : 'check'}"></i> ${environmentPaths.pathOrderAnalysis.executableShadowingRisk ? 'Yes' : 'No'}
                                        </span>
                                    </div>
                                    ${environmentPaths.pathOrderAnalysis.shadowingExample ? `
                                    <div style="margin-top: 0.5rem; padding: 0.75rem; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 0.5rem;">
                                        <div style="color: #fbbf24; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.5rem;">Shadowing Example:</div>
                                        <div style="font-family: 'Consolas', 'Monaco', monospace; font-size: 0.75rem; color: #e2e8f0; margin-bottom: 0.25rem;">${environmentPaths.pathOrderAnalysis.shadowingExample.shadowing || 'N/A'}</div>
                                        <div style="color: #94a3b8; font-size: 0.75rem; text-align: center; margin: 0.25rem 0;">↓ shadows ↓</div>
                                        <div style="font-family: 'Consolas', 'Monaco', monospace; font-size: 0.75rem; color: #e2e8f0;">${environmentPaths.pathOrderAnalysis.shadowingExample.shadowed || 'N/A'}</div>
                                    </div>
                                    ` : ''}
                                </div>
                            </div>
                            ` : ''}
                            
                            ${environmentPaths.pathHygieneChecks ? `
                            <div style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.8) 100%); border: 1px solid #334155; border-radius: 0.75rem; padding: 1rem;">
                                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                                    <h5 style="color: #e2e8f0; font-size: 0.875rem; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                                        <i class="fas fa-shield-alt" style="color: #10b981;"></i> PATH Hygiene Checks
                                    </h5>
                                    <button class="view-all-btn-compact" onclick="windowsServerAuditorInstance.showPathHygieneChecksModal()" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">
                                        View Details <i class="fas fa-chevron-right"></i>
                                    </button>
                                </div>
                                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; background: rgba(15, 23, 42, 0.5); border-radius: 0.5rem;">
                                        <span style="color: #94a3b8; font-size: 0.8125rem;">Duplicate Entries</span>
                                        <span style="color: ${environmentPaths.pathHygieneChecks.hasDuplicatePathEntries ? '#ef4444' : '#10b981'}; font-weight: 600; font-size: 0.8125rem;">
                                            <i class="fas fa-${environmentPaths.pathHygieneChecks.hasDuplicatePathEntries ? 'times' : 'check'}"></i> ${environmentPaths.pathHygieneChecks.hasDuplicatePathEntries ? 'Yes' : 'No'}
                                        </span>
                                    </div>
                                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; background: rgba(15, 23, 42, 0.5); border-radius: 0.5rem;">
                                        <span style="color: #94a3b8; font-size: 0.8125rem;">Trailing Spaces</span>
                                        <span style="color: ${environmentPaths.pathHygieneChecks.hasTrailingSpaces ? '#ef4444' : '#10b981'}; font-weight: 600; font-size: 0.8125rem;">
                                            <i class="fas fa-${environmentPaths.pathHygieneChecks.hasTrailingSpaces ? 'times' : 'check'}"></i> ${environmentPaths.pathHygieneChecks.hasTrailingSpaces ? 'Yes' : 'No'}
                                        </span>
                                    </div>
                                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; background: rgba(15, 23, 42, 0.5); border-radius: 0.5rem;">
                                        <span style="color: #94a3b8; font-size: 0.8125rem;">Invalid Characters</span>
                                        <span style="color: ${environmentPaths.pathHygieneChecks.hasInvalidChars ? '#ef4444' : '#10b981'}; font-weight: 600; font-size: 0.8125rem;">
                                            <i class="fas fa-${environmentPaths.pathHygieneChecks.hasInvalidChars ? 'times' : 'check'}"></i> ${environmentPaths.pathHygieneChecks.hasInvalidChars ? 'Yes' : 'No'}
                                        </span>
                                    </div>
                                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; background: rgba(15, 23, 42, 0.5); border-radius: 0.5rem;">
                                        <span style="color: #94a3b8; font-size: 0.8125rem;">Relative Paths</span>
                                        <span style="color: ${environmentPaths.pathHygieneChecks.hasRelativePathEntries ? '#ef4444' : '#10b981'}; font-weight: 600; font-size: 0.8125rem;">
                                            <i class="fas fa-${environmentPaths.pathHygieneChecks.hasRelativePathEntries ? 'times' : 'check'}"></i> ${environmentPaths.pathHygieneChecks.hasRelativePathEntries ? 'Yes' : 'No'}
                                        </span>
                                    </div>
                                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; background: rgba(15, 23, 42, 0.5); border-radius: 0.5rem;">
                                        <span style="color: #94a3b8; font-size: 0.8125rem;">Root Drive Paths</span>
                                        <span style="color: ${environmentPaths.pathHygieneChecks.hasRootDrivePaths ? '#ef4444' : '#10b981'}; font-weight: 600; font-size: 0.8125rem;">
                                            <i class="fas fa-${environmentPaths.pathHygieneChecks.hasRootDrivePaths ? 'times' : 'check'}"></i> ${environmentPaths.pathHygieneChecks.hasRootDrivePaths ? 'Yes' : 'No'}
                                        </span>
                                    </div>
                                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; background: rgba(15, 23, 42, 0.5); border-radius: 0.5rem;">
                                        <span style="color: #94a3b8; font-size: 0.8125rem;">TEMP in PATH</span>
                                        <span style="color: ${environmentPaths.pathHygieneChecks.hasTempInPath ? '#ef4444' : '#10b981'}; font-weight: 600; font-size: 0.8125rem;">
                                            <i class="fas fa-${environmentPaths.pathHygieneChecks.hasTempInPath ? 'exclamation-triangle' : 'check'}"></i> ${environmentPaths.pathHygieneChecks.hasTempInPath ? 'Yes' : 'No'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            ` : ''}
                        </div>
                        
                        <!-- TEMP & TMP Environment & Directory Health -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                            ${environmentPaths.tempConfig ? `
                            <div style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.8) 100%); border: 1px solid #334155; border-radius: 0.75rem; padding: 1rem;">
                                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                                    <h5 style="color: #e2e8f0; font-size: 0.875rem; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                                        <i class="fas fa-thermometer-half" style="color: #f59e0b;"></i> TEMP & TMP Environment
                                    </h5>
                                    <button class="view-all-btn-compact" onclick="windowsServerAuditorInstance.showTempEnvironmentModal()" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">
                                        View Details <i class="fas fa-chevron-right"></i>
                                    </button>
                                </div>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.75rem;">
                                    <div style="padding: 0.5rem; background: rgba(15, 23, 42, 0.5); border-radius: 0.5rem;">
                                        <div style="color: #94a3b8; font-size: 0.8125rem;">
                                            <span style="margin-right: 0.5rem;">TEMP Directory:</span>
                                            <span style="font-family: 'Consolas', 'Monaco', monospace; color: #e2e8f0;">${environmentPaths.tempConfig.tempDirectory || 'N/A'}</span>
                                        </div>
                                    </div>
                                    <div style="padding: 0.5rem; background: rgba(15, 23, 42, 0.5); border-radius: 0.5rem;">
                                        <div style="color: #94a3b8; font-size: 0.8125rem;">
                                            <span style="margin-right: 0.5rem;">TMP Directory:</span>
                                            <span style="font-family: 'Consolas', 'Monaco', monospace; color: #e2e8f0;">${environmentPaths.tempConfig.tmpDirectory || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; background: rgba(15, 23, 42, 0.5); border-radius: 0.5rem;">
                                        <span style="color: #94a3b8; font-size: 0.8125rem;">TEMP and TMP Match</span>
                                        <span style="color: ${environmentPaths.tempConfig.tempTmpMatch ? '#10b981' : '#f59e0b'}; font-weight: 600; font-size: 0.8125rem;">
                                            <i class="fas fa-${environmentPaths.tempConfig.tempTmpMatch ? 'check' : 'times'}"></i> ${environmentPaths.tempConfig.tempTmpMatch ? 'Yes' : 'No'}
                                        </span>
                                    </div>
                                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; background: rgba(15, 23, 42, 0.5); border-radius: 0.5rem;">
                                        <span style="color: #94a3b8; font-size: 0.8125rem;">On System Drive</span>
                                        <span style="color: ${environmentPaths.tempConfig.tempOnSystemDrive ? '#10b981' : '#64748b'}; font-weight: 600; font-size: 0.8125rem;">
                                            <i class="fas fa-${environmentPaths.tempConfig.tempOnSystemDrive ? 'check' : 'times'}"></i> ${environmentPaths.tempConfig.tempOnSystemDrive ? 'Yes' : 'No'}
                                        </span>
                                    </div>
                                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; background: rgba(15, 23, 42, 0.5); border-radius: 0.5rem;">
                                        <span style="color: #94a3b8; font-size: 0.8125rem;">On Network Share</span>
                                        <span style="color: ${environmentPaths.tempConfig.tempOnNetworkShare ? '#f59e0b' : '#10b981'}; font-weight: 600; font-size: 0.8125rem;">
                                            <i class="fas fa-${environmentPaths.tempConfig.tempOnNetworkShare ? 'exclamation-triangle' : 'check'}"></i> ${environmentPaths.tempConfig.tempOnNetworkShare ? 'Yes' : 'No'}
                                        </span>
                                    </div>
                            </div>
                            ` : ''}
                            
                            ${environmentPaths.tempHealth ? `
                            <div style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.8) 100%); border: 1px solid #334155; border-radius: 0.75rem; padding: 1rem;">
                                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                                    <h5 style="color: #e2e8f0; font-size: 0.875rem; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                                        <i class="fas fa-heartbeat" style="color: #10b981;"></i> Directory Health
                                    </h5>
                                    <button class="view-all-btn-compact" onclick="windowsServerAuditorInstance.showDirectoryHealthModal()" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">
                                        View Details <i class="fas fa-chevron-right"></i>
                                    </button>
                                </div>
                                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; background: rgba(15, 23, 42, 0.5); border-radius: 0.5rem;">
                                        <span style="color: #94a3b8; font-size: 0.8125rem;">
                                            <i class="fas fa-hdd" style="color: #34d399; margin-right: 0.5rem;"></i>Free Space
                                        </span>
                                        <span style="color: #e2e8f0; font-weight: 600; font-size: 0.8125rem;">${environmentPaths.tempHealth.freeSpace || 'N/A'}</span>
                                    </div>
                                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; background: rgba(15, 23, 42, 0.5); border-radius: 0.5rem;">
                                        <span style="color: #94a3b8; font-size: 0.8125rem;">
                                            <i class="fas fa-file" style="color: #60a5fa; margin-right: 0.5rem;"></i>File Count
                                        </span>
                                        <span style="color: #e2e8f0; font-weight: 600; font-size: 0.8125rem;">${environmentPaths.tempHealth.fileCount || 0}</span>
                                    </div>
                                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; background: rgba(15, 23, 42, 0.5); border-radius: 0.5rem;">
                                        <span style="color: #94a3b8; font-size: 0.8125rem;">
                                            <i class="fas fa-clock" style="color: ${(environmentPaths.tempHealth.oldestFileAge || 0) > 90 ? '#fbbf24' : '#34d399'}; margin-right: 0.5rem;"></i>Oldest File Age
                                        </span>
                                        <span style="color: ${(environmentPaths.tempHealth.oldestFileAge || 0) > 90 ? '#fbbf24' : '#34d399'}; font-weight: 600; font-size: 0.8125rem;">${environmentPaths.tempHealth.oldestFileAge || 0} days</span>
                                    </div>
                                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; background: rgba(15, 23, 42, 0.5); border-radius: 0.5rem;">
                                        <span style="color: #94a3b8; font-size: 0.8125rem;">
                                            <i class="fas fa-${environmentPaths.tempHealth.writableByEveryone ? 'unlock' : 'lock'}" style="color: ${environmentPaths.tempHealth.writableByEveryone ? '#f87171' : '#34d399'}; margin-right: 0.5rem;"></i>Writable by Everyone
                                        </span>
                                        <span style="color: ${environmentPaths.tempHealth.writableByEveryone ? '#f87171' : '#34d399'}; font-weight: 600; font-size: 0.8125rem;">
                                            <i class="fas fa-${environmentPaths.tempHealth.writableByEveryone ? 'exclamation-triangle' : 'check'}"></i> ${environmentPaths.tempHealth.writableByEveryone ? 'Yes' : 'No'}
                                        </span>
                                    </div>
                                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; background: rgba(15, 23, 42, 0.5); border-radius: 0.5rem;">
                                        <span style="color: #94a3b8; font-size: 0.8125rem;">
                                            <i class="fas fa-${environmentPaths.tempHealth.cleanupRecommended ? 'exclamation-triangle' : 'check-circle'}" style="color: ${environmentPaths.tempHealth.cleanupRecommended ? '#fbbf24' : '#34d399'}; margin-right: 0.5rem;"></i>Cleanup Recommended
                                        </span>
                                        <span style="color: ${environmentPaths.tempHealth.cleanupRecommended ? '#fbbf24' : '#34d399'}; font-weight: 600; font-size: 0.8125rem;">
                                            <i class="fas fa-${environmentPaths.tempHealth.cleanupRecommended ? 'exclamation-triangle' : 'check'}"></i> ${environmentPaths.tempHealth.cleanupRecommended ? 'Yes' : 'No'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            ` : ''}
                        </div>
                        
                        <!-- Environment Variables -->
                        ${environmentPaths.environmentVariables ? `
                        <div style="margin-bottom: 1.5rem;">
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                                <h5 style="color: #e2e8f0; font-size: 0.875rem; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="fas fa-list" style="color: #8b5cf6;"></i> Environment Variables
                                    <span style="color: #94a3b8; font-size: 0.75rem; font-weight: normal; margin-left: 0.5rem;">
                                        System: ${environmentPaths.environmentVariables.totalSystemVariables || 0} | User: ${environmentPaths.environmentVariables.totalUserVariables || 0}
                                    </span>
                                </h5>
                            </div>
                            
                            ${(environmentPaths.environmentVariables.systemVariables || []).length > 0 ? `
                            <div style="margin-bottom: 1rem;">
                                <h6 style="color: #e2e8f0; font-size: 0.8125rem; font-weight: 600; margin: 0 0 0.5rem 0; display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="fas fa-server" style="color: #60a5fa;"></i> System Variables (${(environmentPaths.environmentVariables.systemVariables || []).length})
                                </h6>
                                <div class="table-container-modern">
                                    <table class="table-compact">
                                        <thead>
                                            <tr>
                                                <th style="width: 200px;">Variable Name</th>
                                                <th>Value</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${(environmentPaths.environmentVariables.systemVariables || []).slice(0, 50).map(variable => `
                                                <tr>
                                                    <td style="color: #94a3b8; font-family: 'Consolas', 'Monaco', monospace; font-size: 0.8125rem;">${variable.name || 'N/A'}</td>
                                                    <td style="color: #e2e8f0; font-family: 'Consolas', 'Monaco', monospace; font-size: 0.8125rem; word-break: break-all;">${variable.value || 'N/A'}</td>
                                                </tr>
                                            `).join('')}
                                            ${(environmentPaths.environmentVariables.systemVariables || []).length > 50 ? `
                                                <tr>
                                                    <td colspan="2" style="text-align: center; color: #64748b; font-style: italic; padding: 1rem;">
                                                        Showing first 50 of ${(environmentPaths.environmentVariables.systemVariables || []).length} system variables
                                                    </td>
                                                </tr>
                                            ` : ''}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            ` : ''}
                            
                            ${(environmentPaths.environmentVariables.userVariables || []).length > 0 ? `
                            <div>
                                <h6 style="color: #e2e8f0; font-size: 0.8125rem; font-weight: 600; margin: 0 0 0.5rem 0; display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="fas fa-user" style="color: #34d399;"></i> User Variables (${(environmentPaths.environmentVariables.userVariables || []).length})
                                </h6>
                                <div class="table-container-modern">
                                    <table class="table-compact">
                                        <thead>
                                            <tr>
                                                <th style="width: 200px;">Variable Name</th>
                                                <th>Value</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${(environmentPaths.environmentVariables.userVariables || []).slice(0, 50).map(variable => `
                                                <tr>
                                                    <td style="color: #94a3b8; font-family: 'Consolas', 'Monaco', monospace; font-size: 0.8125rem;">${variable.name || 'N/A'}</td>
                                                    <td style="color: #e2e8f0; font-family: 'Consolas', 'Monaco', monospace; font-size: 0.8125rem; word-break: break-all;">${variable.value || 'N/A'}</td>
                                                </tr>
                                            `).join('')}
                                            ${(environmentPaths.environmentVariables.userVariables || []).length > 50 ? `
                                                <tr>
                                                    <td colspan="2" style="text-align: center; color: #64748b; font-style: italic; padding: 1rem;">
                                                        Showing first 50 of ${(environmentPaths.environmentVariables.userVariables || []).length} user variables
                                                    </td>
                                                </tr>
                                            ` : ''}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            ` : ''}
                        </div>
                        ` : ''}
                        
                        <!-- Findings Summary -->
                        ${environmentPaths.findings && ((environmentPaths.findings.critical || []).length > 0 || (environmentPaths.findings.warning || []).length > 0 || (environmentPaths.findings.info || []).length > 0) ? `
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                            <div style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.8) 100%); border: 1px solid #334155; border-radius: 0.75rem; padding: 1rem;">
                                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                                    <h5 style="color: #e2e8f0; font-size: 0.875rem; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                                        <i class="fas fa-search" style="color: #8b5cf6;"></i> Findings Summary
                                    </h5>
                                </div>
                                ${(environmentPaths.findings.critical || []).length > 0 ? `
                                <div style="margin-bottom: ${((environmentPaths.findings.warning || []).length > 0 || (environmentPaths.findings.info || []).length > 0) ? '1rem' : '0'};">
                                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                        <i class="fas fa-times-circle" style="color: #ef4444;"></i>
                                        <span style="color: #ef4444; font-weight: 600; font-size: 0.875rem;">Critical (${environmentPaths.findings.critical.length})</span>
                                    </div>
                                    <div style="display: flex; flex-direction: column; gap: 0.375rem; margin-left: 1.5rem;">
                                        ${(environmentPaths.findings.critical || []).map(finding => `
                                            <div style="display: flex; align-items: flex-start; gap: 0.5rem; padding: 0.5rem; background: rgba(239, 68, 68, 0.1); border-left: 2px solid #ef4444; border-radius: 0.25rem;">
                                                <i class="fas fa-circle" style="color: #ef4444; font-size: 0.5rem; margin-top: 0.375rem;"></i>
                                                <span style="color: #e2e8f0; font-size: 0.8125rem; flex: 1;">${finding}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                                ` : ''}
                                ${(environmentPaths.findings.warning || []).length > 0 ? `
                                <div style="margin-bottom: ${(environmentPaths.findings.info || []).length > 0 ? '1rem' : '0'};">
                                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                        <i class="fas fa-exclamation-triangle" style="color: #f59e0b;"></i>
                                        <span style="color: #f59e0b; font-weight: 600; font-size: 0.875rem;">Warnings (${environmentPaths.findings.warning.length})</span>
                                    </div>
                                    <div style="display: flex; flex-direction: column; gap: 0.375rem; margin-left: 1.5rem;">
                                        ${(environmentPaths.findings.warning || []).map(finding => `
                                            <div style="display: flex; align-items: flex-start; gap: 0.5rem; padding: 0.5rem; background: rgba(245, 158, 11, 0.1); border-left: 2px solid #f59e0b; border-radius: 0.25rem;">
                                                <i class="fas fa-circle" style="color: #f59e0b; font-size: 0.5rem; margin-top: 0.375rem;"></i>
                                                <span style="color: #e2e8f0; font-size: 0.8125rem; flex: 1;">${finding}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                                ` : ''}
                                ${(environmentPaths.findings.info || []).length > 0 ? `
                                <div>
                                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                        <i class="fas fa-info-circle" style="color: #94a3b8;"></i>
                                        <span style="color: #94a3b8; font-weight: 600; font-size: 0.875rem;">Informational (${environmentPaths.findings.info.length})</span>
                                    </div>
                                    <div style="display: flex; flex-direction: column; gap: 0.375rem; margin-left: 1.5rem;">
                                        ${(environmentPaths.findings.info || []).map(finding => `
                                            <div style="display: flex; align-items: flex-start; gap: 0.5rem; padding: 0.5rem; background: rgba(148, 163, 184, 0.1); border-left: 2px solid #94a3b8; border-radius: 0.25rem;">
                                                <i class="fas fa-circle" style="color: #94a3b8; font-size: 0.5rem; margin-top: 0.375rem;"></i>
                                                <span style="color: #e2e8f0; font-size: 0.8125rem; flex: 1;">${finding}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        ` : ''}
                    ` : ''}

                    <!-- Scheduled Tasks -->
                    ${scheduledTasks.totalTasks !== undefined ? `
                    <div class="hardware-section-modern">
                        <h4 class="section-subtitle-modern">
                            <i class="fas fa-clock"></i> Scheduled Tasks (Inventory)
                            <span style="color: #94a3b8; font-size: 0.75rem; font-weight: normal; margin-left: 0.5rem;">Often forgotten, very useful.</span>
                        </h4>
                        
                        <!-- Summary Cards -->
                        <div class="hardware-grid-modern" style="margin-bottom: 1.5rem;">
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern icon-blue">
                                    <i class="fas fa-list"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">Total Scheduled Tasks</div>
                                    <div class="hardware-value-modern">${scheduledTasks.totalTasks || 0}</div>
                                </div>
                            </div>
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern icon-green">
                                    <i class="fas fa-check-circle"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">Enabled Tasks</div>
                                    <div class="hardware-value-modern">${scheduledTasks.enabledTasks || 0}</div>
                                </div>
                            </div>
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern icon-gray">
                                    <i class="fas fa-ban"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">Disabled Tasks</div>
                                    <div class="hardware-value-modern">${scheduledTasks.disabledTasks || 0}</div>
                                </div>
                            </div>
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern icon-red">
                                    <i class="fas fa-exclamation-triangle"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">Failed Tasks</div>
                                    <div class="hardware-value-modern">${scheduledTasks.failedTasksCount || 0}</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- All Tasks Table -->
                        ${(scheduledTasks.allTasks || []).length > 0 ? `
                        <div style="margin-bottom: 1.5rem;">
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                                <h5 style="color: #e2e8f0; font-size: 0.875rem; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="fas fa-list" style="color: #3b82f6;"></i> All Scheduled Tasks
                                </h5>
                                ${(scheduledTasks.allTasks || []).length > 20 ? `
                                <button class="view-all-btn-compact" onclick="windowsServerAuditorInstance.showAllTasksModal()">
                                    View all (${(scheduledTasks.allTasks || []).length}) <i class="fas fa-chevron-right"></i>
                                </button>
                                ` : ''}
                            </div>
                            <div class="table-container-modern">
                                <table class="table-compact">
                                    <thead>
                                        <tr>
                                            <th>Task Name</th>
                                            <th style="width: 120px;">State</th>
                                            <th style="width: 180px;">Last Run Time</th>
                                            <th style="width: 120px;">Last Result</th>
                                            <th style="width: 180px;">Next Run Time</th>
                                            <th style="width: 100px;">Missed Runs</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${(scheduledTasks.allTasks || []).slice(0, 20).map(task => {
                                            const flags = [];
                                            if (task.runsAsSystem) {
                                                flags.push({ icon: 'fa-shield-alt', color: '#3b82f6', tooltip: 'Runs as SYSTEM' });
                                            }
                                            if (task.runsPowerShellOrCmd) {
                                                flags.push({ icon: task.actionType === 'PowerShell' ? 'fa-terminal' : 'fa-window-maximize', color: '#f59e0b', tooltip: `Runs ${task.actionType || 'PowerShell/CMD'}` });
                                            }
                                            if (task.hasStoredCredentials) {
                                                flags.push({ icon: 'fa-key', color: '#ef4444', tooltip: `Stored credentials: ${task.storedUserName || 'N/A'}` });
                                            }
                                            return `
                                            <tr>
                                                <td>
                                                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                                                        <div style="font-weight: 600; color: #e2e8f0;">${task.taskName || 'N/A'}</div>
                                                        ${flags.length > 0 ? flags.map(flag => `
                                                            <span class="task-flag" data-tooltip="${flag.tooltip}" style="display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.125rem 0.375rem; background: rgba(${flag.color === '#3b82f6' ? '59, 130, 246' : flag.color === '#f59e0b' ? '245, 158, 11' : '239, 68, 68'}, 0.15); border: 1px solid rgba(${flag.color === '#3b82f6' ? '59, 130, 246' : flag.color === '#f59e0b' ? '245, 158, 11' : '239, 68, 68'}, 0.3); border-radius: 4px; color: ${flag.color}; font-size: 0.6875rem; cursor: help;">
                                                                <i class="fas ${flag.icon}"></i>
                                                            </span>
                                                        `).join('') : ''}
                                                    </div>
                                                    ${task.taskPath && task.taskPath !== '\\' ? `
                                                    <div style="font-size: 0.75rem; color: #64748b; font-family: 'Consolas', 'Monaco', monospace;">${task.taskPath}</div>
                                                    ` : ''}
                                                    ${task.actionCommand ? `
                                                    <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 0.25rem; font-family: 'Consolas', 'Monaco', monospace; word-break: break-all;">
                                                        <i class="fas fa-code" style="margin-right: 0.25rem;"></i>${task.actionCommand}
                                                    </div>
                                                    ` : ''}
                                                    ${task.hasStoredCredentials && task.storedUserName ? `
                                                    <div style="font-size: 0.75rem; color: #f87171; margin-top: 0.25rem;">
                                                        <i class="fas fa-user" style="margin-right: 0.25rem;"></i>User: ${task.storedUserName}
                                                    </div>
                                                    ` : ''}
                                                </td>
                                                <td>
                                                    <span class="status-badge status-${task.state === 'Running' || task.state === 'Ready' ? 'online' : 'offline'}">
                                                        ${task.state || 'Unknown'}
                                                    </span>
                                                </td>
                                                <td style="color: #94a3b8;">${task.lastRunTime || 'Never'}</td>
                                                <td>
                                                    ${task.lastTaskResult !== undefined && task.lastTaskResult !== 0 ? `
                                                    <span style="color: #ef4444; font-weight: 600;">
                                                        <i class="fas fa-times-circle"></i> 0x${task.lastTaskResult.toString(16).toUpperCase()}
                                                    </span>
                                                    ` : task.lastTaskResult === 0 ? `
                                                    <span style="color: #10b981;">
                                                        <i class="fas fa-check-circle"></i> Success
                                                    </span>
                                                    ` : '<span style="color: #64748b;">N/A</span>'}
                                                </td>
                                                <td style="color: #94a3b8;">${task.nextRunTime || 'N/A'}</td>
                                                <td>
                                                    ${task.numberOfMissedRuns > 0 ? `
                                                    <span style="color: #f59e0b; font-weight: 600;">
                                                        <i class="fas fa-exclamation-triangle"></i> ${task.numberOfMissedRuns}
                                                    </span>
                                                    ` : '<span style="color: #64748b;">0</span>'}
                                                </td>
                                            </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    ` : ''}

                    <!-- Drivers -->
                    ${drivers.length > 0 ? `
                    <div class="hardware-section-modern">
                        <h4 class="section-subtitle-modern">
                            <i class="fas fa-microchip"></i> 5. Drivers
                            <span class="update-count-pill">${drivers.length}</span>
                            ${drivers.length > 20 ? `
                            <button class="view-all-btn-compact" onclick="windowsServerAuditorInstance.showDriversModal()">
                                View all (${drivers.length}) <i class="fas fa-chevron-right"></i>
                            </button>
                            ` : ''}
                        </h4>
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th>Device class</th>
                                        <th>Provider</th>
                                        <th>Version</th>
                                        <th>Date</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${drivers.slice(0, 20).map(driver => {
                                        // Check if driver is older than 3 years
                                        let isOldDriver = false;
                                        let dateDisplay = 'N/A';
                                        if (driver.versionDate && driver.versionDate !== 'N/A') {
                                            try {
                                                // Handle different date formats
                                                let driverDate;
                                                if (typeof driver.versionDate === 'string') {
                                                    // Try parsing as ISO date or other formats
                                                    driverDate = new Date(driver.versionDate);
                                                } else if (driver.versionDate instanceof Date) {
                                                    driverDate = driver.versionDate;
                                                } else {
                                                    driverDate = new Date(driver.versionDate);
                                                }
                                                
                                                if (!isNaN(driverDate.getTime())) {
                                                    const threeYearsAgo = new Date();
                                                    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
                                                    isOldDriver = driverDate < threeYearsAgo;
                                                    dateDisplay = driverDate.toLocaleDateString();
                                                }
                                            } catch (e) {
                                                dateDisplay = driver.versionDate;
                                            }
                                        }
                                        
                                        return `
                                        <tr class="${isOldDriver ? 'old-driver-row' : ''}">
                                            <td>
                                                ${driver.classDescription || driver.name || 'N/A'}
                                                ${isOldDriver ? '<span class="old-driver-flag" title="Driver is older than 3 years"><i class="fas fa-exclamation-triangle"></i></span>' : ''}
                                            </td>
                                            <td>${driver.providerName || 'N/A'}</td>
                                            <td>${driver.driverVersion || 'N/A'}</td>
                                            <td>${dateDisplay}</td>
                                            <td><span class="status-badge status-${driver.status === 'OK' || driver.status === 'Running' ? 'online' : 'warning'}">${driver.status || 'Unknown'}</span></td>
                                        </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    ` : ''}

                    <!-- Installed Applications -->
                    ${(software.applications || []).length > 0 ? `
                    <div class="hardware-section-modern">
                        <h4 class="section-subtitle-modern">
                            <i class="fas fa-box"></i> 6. Installed Applications
                            <span class="update-count-pill">${(software.applications || []).length}</span>
                            ${(software.applications || []).length > 20 ? `
                            <button class="view-all-btn-compact" onclick="windowsServerAuditorInstance.showSoftwareModal()">
                                View all (${(software.applications || []).length}) <i class="fas fa-chevron-right"></i>
                            </button>
                            ` : ''}
                        </h4>
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Publisher</th>
                                        <th>Version</th>
                                        <th>Install date</th>
                                        <th>32-bit vs 64-bit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${software.applications.slice(0, 20).map(app => `
                                    <tr>
                                        <td>${app.name || 'N/A'}</td>
                                        <td>${app.vendor || app.publisher || 'N/A'}</td>
                                        <td>${app.version || 'N/A'}</td>
                                        <td>${(() => {
                                            if (!app.installDate) return 'N/A';
                                            try {
                                                let dateStr = app.installDate;
                                                // Handle .NET JSON date format: /Date(timestamp)/
                                                if (typeof dateStr === 'string' && dateStr.match(/^\/Date\((\d+)\)\/$/)) {
                                                    const timestamp = parseInt(dateStr.match(/^\/Date\((\d+)\)\/$/)[1]);
                                                    const date = new Date(timestamp);
                                                    return date.toLocaleDateString();
                                                }
                                                const date = new Date(dateStr);
                                                return isNaN(date.getTime()) ? dateStr : date.toLocaleDateString();
                                            } catch (e) {
                                                return app.installDate;
                                            }
                                        })()}</td>
                                        <td>
                                            ${app.architecture && app.architecture !== 'N/A' ? `
                                            <span class="status-badge" style="background: ${app.architecture === '64-bit' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)'}; color: ${app.architecture === '64-bit' ? '#34d399' : '#60a5fa'}; border-color: ${app.architecture === '64-bit' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'};">
                                                ${app.architecture}
                                            </span>
                                            ` : '<span style="color: #64748b;">N/A</span>'}
                                        </td>
                                    </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    ` : ''}

                    <!-- Services -->
                    ${(services.services || []).length > 0 ? `
                    <div class="hardware-section-modern">
                        <h4 class="section-subtitle-modern">
                            <i class="fas fa-cogs"></i> 7. Services
                            <span class="update-count-pill">${(services.services || []).length}</span>
                            ${(services.services || []).length > 20 ? `
                            <button class="view-all-btn-compact" onclick="windowsServerAuditorInstance.showServicesModal()">
                                View all (${(services.services || []).length}) <i class="fas fa-chevron-right"></i>
                            </button>
                            ` : ''}
                        </h4>
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th>Service name</th>
                                        <th>Startup type</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${(() => {
                                        // Sort services: flagged first, then others
                                        const sortedServices = [...(services.services || [])].sort((a, b) => {
                                            const aIsRunning = a.status === 'Running' || a.status === 'running';
                                            const aIsStopped = a.status === 'Stopped' || a.status === 'stopped';
                                            const aIsAutomatic = a.startType === 'Automatic' || a.startType === 'automatic';
                                            const aIsDisabled = a.startType === 'Disabled' || a.startType === 'disabled';
                                            const aShouldFlag = (aIsAutomatic && aIsStopped) || (aIsDisabled && aIsRunning);
                                            
                                            const bIsRunning = b.status === 'Running' || b.status === 'running';
                                            const bIsStopped = b.status === 'Stopped' || b.status === 'stopped';
                                            const bIsAutomatic = b.startType === 'Automatic' || b.startType === 'automatic';
                                            const bIsDisabled = b.startType === 'Disabled' || b.startType === 'disabled';
                                            const bShouldFlag = (bIsAutomatic && bIsStopped) || (bIsDisabled && bIsRunning);
                                            
                                            // Flagged services come first
                                            if (aShouldFlag && !bShouldFlag) return -1;
                                            if (!aShouldFlag && bShouldFlag) return 1;
                                            return 0;
                                        });
                                        
                                        return sortedServices.slice(0, 20).map(service => {
                                            const isRunning = service.status === 'Running' || service.status === 'running';
                                            const isStopped = service.status === 'Stopped' || service.status === 'stopped';
                                            const isAutomatic = service.startType === 'Automatic' || service.startType === 'automatic';
                                            const isDisabled = service.startType === 'Disabled' || service.startType === 'disabled';
                                            
                                            // Flag only: Automatic + Stopped OR Disabled + Running
                                            const shouldFlag = (isAutomatic && isStopped) || (isDisabled && isRunning);
                                            
                                            return `
                                            <tr class="${shouldFlag ? 'flagged-service-row' : ''}">
                                                <td>
                                                    ${service.displayName || service.name || 'N/A'}
                                                    ${shouldFlag ? `
                                                    <span class="service-flag" data-tooltip="${isAutomatic && isStopped ? 'Service is set to Automatic but is Stopped' : 'Service is Disabled but is Running'}" title="${isAutomatic && isStopped ? 'Service is set to Automatic but is Stopped' : 'Service is Disabled but is Running'}">
                                                        <i class="fas fa-exclamation-triangle"></i>
                                                    </span>
                                                    ` : ''}
                                                </td>
                                                <td>${service.startType || 'N/A'}</td>
                                                <td><span class="status-badge status-${isRunning ? 'online' : isStopped ? 'offline' : 'warning'}">${service.status || 'Unknown'}</span></td>
                                            </tr>
                                            `;
                                        }).join('');
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    ` : ''}

                    <!-- Network Configuration -->
                    ${(network.adapters || []).length > 0 ? `
                    <div class="hardware-section-modern">
                        <h4 class="section-subtitle-modern">
                            <i class="fas fa-network-wired"></i> 8. Network Configuration
                            <span class="update-count-pill">${(network.adapters || []).length}</span>
                        </h4>
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th>Network adapter</th>
                                        <th>Physical ID</th>
                                        <th>Status</th>
                                        <th>MAC address</th>
                                        <th>Speed</th>
                                        <th>MTU</th>
                                        <th>IP addresses</th>
                                        <th>Gateway</th>
                                        <th>DNS servers</th>
                                        <th>DNS suffix</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${network.adapters.map(adapter => {
                                        const ipAddresses = adapter.ipAddresses && Array.isArray(adapter.ipAddresses) ? adapter.ipAddresses : (adapter.ipAddresses ? [adapter.ipAddresses] : []);
                                        const dnsServers = adapter.dnsServers && Array.isArray(adapter.dnsServers) ? adapter.dnsServers : (adapter.dnsServers ? [adapter.dnsServers] : []);
                                        const isUp = adapter.status === 'Up' || adapter.status === 'Connected' || adapter.status === 'Enabled';
                                        const statusText = adapter.status || 'Unknown';
                                        const adapterName = adapter.name || adapter.interfaceDescription || 'N/A';
                                        const adapterDescription = adapter.interfaceDescription && adapter.name && adapter.interfaceDescription !== adapter.name ? adapter.interfaceDescription : null;
                                        return `
                                        <tr>
                                            <td>
                                                <div style="display: flex; flex-direction: column;">
                                                    <span>${adapterName}</span>
                                                    ${adapterDescription ? `<span style="font-size: 0.7rem; color: #94a3b8; margin-top: 2px;">${adapterDescription}</span>` : ''}
                                                </div>
                                            </td>
                                            <td>${adapter.interfaceIndex !== null && adapter.interfaceIndex !== undefined ? adapter.interfaceIndex : 'N/A'}</td>
                                            <td><span class="status-badge status-${isUp ? 'online' : 'offline'}">${statusText}</span></td>
                                            <td>${adapter.macAddress || 'N/A'}</td>
                                            <td>${adapter.linkSpeed || 'N/A'}</td>
                                            <td>${adapter.mtu || 'N/A'}</td>
                                            <td>${ipAddresses.length > 0 ? ipAddresses.join(', ') : 'N/A'}</td>
                                            <td>${adapter.gateway || 'N/A'}</td>
                                            <td>${dnsServers.length > 0 ? dnsServers.join(', ') : 'N/A'}</td>
                                            <td>${adapter.dnsSuffix || 'N/A'}</td>
                                        </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    ` : ''}

                    <!-- Network Time Protocol (NTP) -->
                    ${data.ntp ? `
                    <div class="hardware-section-modern">
                        <h4 class="section-subtitle-modern">
                            <i class="fas fa-clock"></i> 9. Network Time Protocol (NTP)
                        </h4>
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th>Setting</th>
                                        <th>Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${data.ntp.serviceStatus ? `
                                    <tr>
                                        <td><strong>Windows Time Service Status</strong></td>
                                        <td>
                                            <span class="status-badge status-${data.ntp.serviceStatus === 'Running' ? 'online' : 'offline'}">
                                                ${data.ntp.serviceStatus}
                                            </span>
                                            ${data.ntp.serviceStartType && data.ntp.serviceStartType !== 'N/A' ? ` (${data.ntp.serviceStartType})` : ''}
                                        </td>
                                    </tr>
                                    ` : ''}
                                    ${data.ntp.timeSourceType ? `
                                    <tr>
                                        <td><strong>Time Source Type</strong></td>
                                        <td>${data.ntp.timeSourceType}</td>
                                    </tr>
                                    ` : ''}
                                    ${data.ntp.ntpServer && data.ntp.ntpServer !== 'N/A' ? `
                                    <tr>
                                        <td><strong>NTP Server</strong></td>
                                        <td>${data.ntp.ntpServer}</td>
                                    </tr>
                                    ` : ''}
                                    ${data.ntp.syncStatus && data.ntp.syncStatus !== 'Unknown' ? `
                                    <tr>
                                        <td><strong>Synchronization Status</strong></td>
                                        <td>
                                            <span class="status-badge status-${data.ntp.syncStatus === 'Synchronized' ? 'online' : 'offline'}">
                                                ${data.ntp.syncStatus}
                                            </span>
                                        </td>
                                    </tr>
                                    ` : ''}
                                    ${data.ntp.timeSource && data.ntp.timeSource !== 'N/A' ? `
                                    <tr>
                                        <td><strong>Time Source</strong></td>
                                        <td>${data.ntp.timeSource}</td>
                                    </tr>
                                    ` : ''}
                                    ${data.ntp.lastSyncTime && data.ntp.lastSyncTime !== 'N/A' ? `
                                    <tr>
                                        <td><strong>Last Successful Sync Time</strong></td>
                                        <td>${data.ntp.lastSyncTime}</td>
                                    </tr>
                                    ` : ''}
                                    ${data.ntp.stratum && data.ntp.stratum !== 'N/A' ? `
                                    <tr>
                                        <td><strong>Stratum</strong></td>
                                        <td>${data.ntp.stratum}</td>
                                    </tr>
                                    ` : ''}
                                    ${data.ntp.pollInterval && data.ntp.pollInterval !== 'N/A' ? `
                                    <tr>
                                        <td><strong>Poll Interval</strong></td>
                                        <td>${data.ntp.pollInterval}</td>
                                    </tr>
                                    ` : ''}
                                    ${data.ntp.peers && Array.isArray(data.ntp.peers) && data.ntp.peers.length > 0 ? `
                                    <tr>
                                        <td><strong>NTP Peers</strong></td>
                                        <td>
                                            ${data.ntp.peers.map(peer => `
                                                <div style="margin-bottom: 0.5rem;">
                                                    <strong>${peer.peer || 'Unknown'}</strong>
                                                    ${peer.stratum ? ` - Stratum: ${peer.stratum}` : ''}
                                                    ${peer.timeSource ? ` - Source: ${peer.timeSource}` : ''}
                                                </div>
                                            `).join('')}
                                        </td>
                                    </tr>
                                    ` : ''}
                                    ${data.ntp.error ? `
                                    <tr>
                                        <td><strong>Error</strong></td>
                                        <td style="color: #ef4444;">${data.ntp.error}</td>
                                    </tr>
                                    ` : ''}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    ` : ''}

                    <!-- Firewall -->
                    ${(security.firewallProfiles || []).length > 0 ? `
                    <div class="hardware-section-modern">
                        <h4 class="section-subtitle-modern">
                            <i class="fas fa-shield-alt"></i> 10. Firewall (High Level Only)
                            <span class="update-count-pill">${(security.firewallProfiles || []).length}</span>
                        </h4>
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th>Profile</th>
                                        <th>Enabled</th>
                                        <th>Default inbound action</th>
                                        <th>Default outbound action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${security.firewallProfiles.map(profile => `
                                    <tr>
                                        <td>${profile.name || 'N/A'}</td>
                                        <td><span class="status-badge status-${profile.enabled ? 'online' : 'offline'}">${profile.enabled ? 'Enabled' : 'Disabled'}</span></td>
                                        <td>${profile.defaultInboundAction || 'N/A'}</td>
                                        <td>${profile.defaultOutboundAction || 'N/A'}</td>
                                    </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    ` : ''}

                    <!-- Antivirus -->
                    ${(security.antivirus || []).length > 0 ? `
                    <div class="hardware-section-modern">
                        <h4 class="section-subtitle-modern">
                            <i class="fas fa-shield-virus"></i> ${this.t('antivirus')}
                            <span class="update-count-pill">${(security.antivirus || []).length}</span>
                        </h4>
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th>${this.t('productName')}</th>
                                        <th>${this.t('provider')}</th>
                                        <th>${this.t('productState')}</th>
                                        <th>${this.t('enabled')}</th>
                                        <th>${this.t('version')}</th>
                                        <th>Engine Version</th>
                                        <th>${this.t('lastUpdate')}</th>
                                        <th>${this.t('realTimeProtection')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${security.antivirus.map(av => `
                                    <tr>
                                        <td><strong>${av.displayName || av.name || 'N/A'}</strong></td>
                                        <td>${av.provider || 'N/A'}</td>
                                        <td><span class="status-badge status-${av.productState === 'On' || av.productState === 'Enabled' ? 'online' : (av.productState === 'Off' || av.productState === 'Disabled' ? 'offline' : 'warning')}">${av.productState || 'N/A'}</span></td>
                                        <td><span class="status-badge status-${av.enabled === true || av.enabled === 'true' ? 'online' : 'offline'}">${av.enabled === true || av.enabled === 'true' ? 'Yes' : (av.enabled === false || av.enabled === 'false' ? 'No' : 'Unknown')}</span></td>
                                        <td>${av.version || 'N/A'}</td>
                                        <td>${av.engineVersion || 'N/A'}</td>
                                        <td>${av.lastUpdate || 'N/A'}</td>
                                        <td>${av.isUpToDate === true || av.isUpToDate === 'true' ? '<span class="status-badge status-online">Yes</span>' : (av.isUpToDate === false || av.isUpToDate === 'false' ? '<span class="status-badge status-offline">No</span>' : 'N/A')}</td>
                                    </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    ` : ''}

                    <!-- Disks -->
                    ${physicalDisks.length > 0 ? `
                    <div class="hardware-section-modern">
                        <h4 class="section-subtitle-modern">
                            <i class="fas fa-hdd"></i> 11. Disks
                            <span class="update-count-pill">${physicalDisks.length}</span>
                        </h4>
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th>Disk name</th>
                                        <th>Disk ID</th>
                                        <th>Size</th>
                                        <th>Allocated</th>
                                        <th>Unallocated</th>
                                        <th>Partition style</th>
                                        <th>SMART Status</th>
                                        <th>Temperature</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${physicalDisks.map(disk => {
                                        const totalSizeGB = typeof disk.size === 'number' ? disk.size : (typeof disk.size === 'string' ? parseFloat(disk.size.replace(/[^\d.]/g, '')) : 0);
                                        // Handle allocatedSize - it might be missing in older imports
                                        let allocatedGB = 0;
                                        if (disk.allocatedSize !== null && disk.allocatedSize !== undefined) {
                                            allocatedGB = typeof disk.allocatedSize === 'number' ? disk.allocatedSize : (typeof disk.allocatedSize === 'string' ? parseFloat(disk.allocatedSize.replace(/[^\d.]/g, '')) : 0);
                                        }
                                        const unallocatedGB = Math.max(0, totalSizeGB - allocatedGB);
                                        const diskName = disk.friendlyName || disk.name || (disk.number !== null && disk.number !== undefined ? `Disk ${disk.number}` : 'N/A');
                                        const diskId = disk.uniqueId || disk.serialNumber || 'N/A';
                                        const smartStatus = disk.smartStatus || disk.healthStatus || 'N/A';
                                        const isHealthy = smartStatus === 'Healthy' || smartStatus === 'OK';
                                        const temperature = disk.temperature || 'N/A';
                                        const tempValue = typeof temperature === 'number' ? temperature : (typeof temperature === 'string' && temperature !== 'N/A' ? parseFloat(temperature) : null);
                                        const tempColor = tempValue !== null && tempValue > 0 ? (tempValue > 70 ? '#ef4444' : tempValue > 50 ? '#f59e0b' : '#10b981') : '#94a3b8';
                                        return `
                                        <tr>
                                            <td>${diskName}</td>
                                            <td>${diskId}</td>
                                            <td>${totalSizeGB > 0 ? `${totalSizeGB.toFixed(2)} GB` : 'N/A'}</td>
                                            <td>${allocatedGB > 0 ? `${allocatedGB.toFixed(2)} GB` : (allocatedGB === 0 && totalSizeGB > 0 ? '0.00 GB' : 'N/A')}</td>
                                            <td>${unallocatedGB > 0 ? `${unallocatedGB.toFixed(2)} GB` : (unallocatedGB === 0 && totalSizeGB > 0 ? '0.00 GB' : 'N/A')}</td>
                                            <td>${disk.partitionStyle || 'N/A'}</td>
                                            <td>
                                                <span class="status-badge status-${isHealthy ? 'online' : 'offline'}">
                                                    ${smartStatus}
                                                </span>
                                            </td>
                                            <td style="color: ${tempColor};">
                                                ${tempValue !== null && tempValue > 0 ? `${tempValue}°C` : temperature}
                                            </td>
                                        </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    ` : ''}

                    <!-- RAID Controller Health -->
                    ${raidControllers.length > 0 ? `
                    <div class="hardware-section-modern">
                        <h4 class="section-subtitle-modern">
                            <i class="fas fa-server"></i> RAID Controller Health
                            <span class="update-count-pill">${raidControllers.length}</span>
                        </h4>
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Description</th>
                                        <th>Manufacturer</th>
                                        <th>Status</th>
                                        <th>Operational Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${raidControllers.map(controller => {
                                        const isHealthy = controller.status === 'OK' || controller.operationalStatus === 'OK' || controller.status === 'Degraded' || controller.operationalStatus === 'Degraded';
                                        const status = controller.operationalStatus || controller.status || 'N/A';
                                        return `
                                        <tr>
                                            <td>${controller.name || 'N/A'}</td>
                                            <td style="color: #94a3b8;">${controller.description || 'N/A'}</td>
                                            <td style="color: #94a3b8;">${controller.manufacturer || 'N/A'}</td>
                                            <td>
                                                <span class="status-badge status-${isHealthy ? 'online' : 'offline'}">
                                                    ${controller.status || 'N/A'}
                                                </span>
                                            </td>
                                            <td>
                                                <span class="status-badge status-${isHealthy ? 'online' : 'offline'}">
                                                    ${status}
                                                </span>
                                            </td>
                                        </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    ` : ''}

                    <!-- Volumes -->
                    ${volumes.length > 0 ? `
                    <div class="hardware-section-modern">
                        <h4 class="section-subtitle-modern">
                            <i class="fas fa-database"></i> 12. Volumes
                            <span class="update-count-pill">${volumes.length}</span>
                        </h4>
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th>Drive letter</th>
                                        <th>File system</th>
                                        <th>Size</th>
                                        <th>Used</th>
                                        <th>Free</th>
                                        <th>Free space %</th>
                                        <th>BitLocker status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${volumes.map(volume => {
                                        const size = volume.size || 0;
                                        const sizeRemaining = volume.sizeRemaining || 0;
                                        const used = size - sizeRemaining;
                                        const freeSpacePercent = size > 0 ? ((sizeRemaining / size) * 100).toFixed(1) : '0.0';
                                        const isLowSpace = parseFloat(freeSpacePercent) < 15;
                                        let bitLockerStatus = 'N/A';
                                        if (volume.bitLockerStatus && volume.bitLockerStatus !== 'N/A') {
                                            bitLockerStatus = volume.bitLockerStatus;
                                        } else if (volume.driveLetter) {
                                            // If drive letter exists but BitLocker status is N/A, it might not be encrypted or BitLocker not available
                                            bitLockerStatus = 'Not Encrypted';
                                        }
                                        return `
                                        <tr class="${isLowSpace ? 'low-space-row' : ''}">
                                            <td>
                                                ${volume.driveLetter ? `${volume.driveLetter}:` : (volume.fileSystemLabel || 'N/A')}
                                                ${isLowSpace ? `
                                                <span class="low-space-flag" data-tooltip="Free space is less than 15%" title="Free space is less than 15%">
                                                    <i class="fas fa-exclamation-triangle"></i>
                                                </span>
                                                ` : ''}
                                            </td>
                                            <td>${volume.fileSystem || 'N/A'}</td>
                                            <td>${size > 0 ? `${size.toFixed(2)} GB` : 'N/A'}</td>
                                            <td>${used > 0 ? `${used.toFixed(2)} GB` : (used === 0 && size > 0 ? '0.00 GB' : 'N/A')}</td>
                                            <td>${sizeRemaining > 0 ? `${sizeRemaining.toFixed(2)} GB` : (sizeRemaining === 0 && size > 0 ? '0.00 GB' : 'N/A')}</td>
                                            <td>
                                                <span style="color: ${isLowSpace ? '#ef4444' : parseFloat(freeSpacePercent) < 25 ? '#f59e0b' : '#10b981'}; font-weight: ${isLowSpace ? '600' : 'normal'};">
                                                    ${freeSpacePercent}%
                                                </span>
                                            </td>
                                            <td>${bitLockerStatus}</td>
                                        </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    ` : ''}

                    <!-- iSCSI Connections and Disks -->
                    ${iscsi.totalSessions > 0 || iscsi.totalConnections > 0 || iscsi.totalDisks > 0 ? `
                    <div class="hardware-section-modern">
                        <h4 class="section-subtitle-modern">
                            <i class="fas fa-network-wired"></i> iSCSI Connections and Disks
                            ${iscsi.totalSessions > 0 ? `<span class="update-count-pill" style="background: rgba(59, 130, 246, 0.2); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.3);">${iscsi.totalSessions} Sessions</span>` : ''}
                            ${iscsi.totalConnections > 0 ? `<span class="update-count-pill" style="background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);">${iscsi.totalConnections} Connections</span>` : ''}
                            ${iscsi.totalDisks > 0 ? `<span class="update-count-pill" style="background: rgba(139, 92, 246, 0.2); color: #8b5cf6; border: 1px solid rgba(139, 92, 246, 0.3);">${iscsi.totalDisks} Disks</span>` : ''}
                        </h4>
                        
                        ${iscsiSessions.length > 0 ? `
                        <div style="margin-bottom: 1.5rem;">
                            <h5 style="color: #e2e8f0; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-link" style="color: #3b82f6;"></i> iSCSI Sessions (${iscsiSessions.length})
                            </h5>
                            <div class="table-container-modern">
                                <table class="table-compact">
                                    <thead>
                                        <tr>
                                            <th>Target Name</th>
                                            <th>Target Node Address</th>
                                            <th>Initiator Node Address</th>
                                            <th>Connected</th>
                                            <th>Persistent</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${iscsiSessions.map(session => `
                                            <tr>
                                                <td style="font-family: 'Consolas', 'Monaco', monospace; color: #e2e8f0;">${session.targetName || 'N/A'}</td>
                                                <td style="font-family: 'Consolas', 'Monaco', monospace; color: #94a3b8;">${session.targetNodeAddress || 'N/A'}</td>
                                                <td style="font-family: 'Consolas', 'Monaco', monospace; color: #94a3b8;">${session.initiatorNodeAddress || 'N/A'}</td>
                                                <td>
                                                    <span class="status-badge status-${session.isConnected ? 'online' : 'offline'}">
                                                        ${session.isConnected ? 'Yes' : 'No'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span class="status-badge status-${session.isPersistent ? 'online' : 'offline'}">
                                                        ${session.isPersistent ? 'Yes' : 'No'}
                                                    </span>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        ` : ''}
                        
                        ${iscsiConnections.length > 0 ? `
                        <div style="margin-bottom: 1.5rem;">
                            <h5 style="color: #e2e8f0; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-plug" style="color: #10b981;"></i> iSCSI Connections (${iscsiConnections.length})
                            </h5>
                            <div class="table-container-modern">
                                <table class="table-compact">
                                    <thead>
                                        <tr>
                                            <th>Target Name</th>
                                            <th>Initiator Address</th>
                                            <th>Target Address</th>
                                            <th>Initiator Port</th>
                                            <th>Target Port</th>
                                            <th>Connection State</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${iscsiConnections.map(conn => `
                                            <tr>
                                                <td style="font-family: 'Consolas', 'Monaco', monospace; color: #e2e8f0;">${conn.targetName || 'N/A'}</td>
                                                <td style="font-family: 'Consolas', 'Monaco', monospace; color: #94a3b8;">${conn.initiatorAddress || 'N/A'}</td>
                                                <td style="font-family: 'Consolas', 'Monaco', monospace; color: #94a3b8;">${conn.targetAddress || 'N/A'}</td>
                                                <td style="color: #94a3b8;">${conn.initiatorPort || 'N/A'}</td>
                                                <td style="color: #94a3b8;">${conn.targetPort || 'N/A'}</td>
                                                <td>
                                                    <span class="status-badge status-${conn.connectionState === 'Connected' || conn.connectionState === 'LoggedIn' ? 'online' : 'offline'}">
                                                        ${conn.connectionState || 'N/A'}
                                                    </span>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        ` : ''}
                        
                        ${iscsiDisks.length > 0 ? `
                        <div style="margin-bottom: 1.5rem;">
                            <h5 style="color: #e2e8f0; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-hdd" style="color: #8b5cf6;"></i> iSCSI Disks (${iscsiDisks.length})
                            </h5>
                            <div class="table-container-modern">
                                <table class="table-compact">
                                    <thead>
                                        <tr>
                                            <th>Disk Name</th>
                                            <th>Model</th>
                                            <th>Size</th>
                                            <th>Allocated</th>
                                            <th>Unallocated</th>
                                            <th>Partition Style</th>
                                            <th>Health Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${iscsiDisks.map(disk => {
                                            const totalSizeGB = typeof disk.size === 'number' ? disk.size : (typeof disk.size === 'string' ? parseFloat(disk.size.replace(/[^\d.]/g, '')) : 0);
                                            let allocatedGB = 0;
                                            if (disk.allocatedSize !== null && disk.allocatedSize !== undefined) {
                                                allocatedGB = typeof disk.allocatedSize === 'number' ? disk.allocatedSize : (typeof disk.allocatedSize === 'string' ? parseFloat(disk.allocatedSize.replace(/[^\d.]/g, '')) : 0);
                                            }
                                            const unallocatedGB = Math.max(0, totalSizeGB - allocatedGB);
                                            const diskName = disk.friendlyName || disk.name || (disk.number !== null && disk.number !== undefined ? `Disk ${disk.number}` : 'N/A');
                                            return `
                                            <tr>
                                                <td>${diskName}</td>
                                                <td>${disk.model || 'N/A'}</td>
                                                <td>${totalSizeGB > 0 ? `${totalSizeGB.toFixed(2)} GB` : 'N/A'}</td>
                                                <td>${allocatedGB > 0 ? `${allocatedGB.toFixed(2)} GB` : (allocatedGB === 0 && totalSizeGB > 0 ? '0.00 GB' : 'N/A')}</td>
                                                <td>${unallocatedGB > 0 ? `${unallocatedGB.toFixed(2)} GB` : (unallocatedGB === 0 && totalSizeGB > 0 ? '0.00 GB' : 'N/A')}</td>
                                                <td>${disk.partitionStyle || 'N/A'}</td>
                                                <td>
                                                    <span class="status-badge status-${disk.healthStatus === 'Healthy' ? 'online' : 'offline'}">
                                                        ${disk.healthStatus || 'N/A'}
                                                    </span>
                                                </td>
                                            </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    ` : ''}

                    <!-- Roles -->
                    ${(rolesAndFeatures.installedRoles || []).length > 0 ? `
                    <div class="hardware-section-modern">
                        <h4 class="section-subtitle-modern">
                            <i class="fas fa-server"></i> 12. Roles
                            <span class="update-count-pill">${(rolesAndFeatures.installedRoles || []).length}</span>
                            ${(rolesAndFeatures.installedRoles || []).length > 20 ? `
                            <button class="view-all-btn-compact" onclick="windowsServerAuditorInstance.showRolesModal()">
                                View all (${(rolesAndFeatures.installedRoles || []).length}) <i class="fas fa-chevron-right"></i>
                            </button>
                            ` : ''}
                        </h4>
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th>Role name</th>
                                        <th>Installed (Yes/No)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rolesAndFeatures.installedRoles.slice(0, 20).map(role => {
                                        const roleName = typeof role === 'string' ? role : (role.name || role.displayName || 'Unknown');
                                        const isInstalled = typeof role === 'object' ? (role.installed !== false) : true;
                                        return `
                                        <tr>
                                            <td>${roleName}</td>
                                            <td><span class="status-badge status-${isInstalled ? 'online' : 'offline'}">${isInstalled ? 'Yes' : 'No'}</span></td>
                                        </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    ` : ''}

                    <!-- Features -->
                    ${(rolesAndFeatures.installedFeatures || []).length > 0 ? `
                    <div class="hardware-section-modern">
                        <h4 class="section-subtitle-modern">
                            <i class="fas fa-puzzle-piece"></i> 13. Features
                            <span class="update-count-pill">${(rolesAndFeatures.installedFeatures || []).length}</span>
                            ${(rolesAndFeatures.installedFeatures || []).length > 20 ? `
                            <button class="view-all-btn-compact" onclick="windowsServerAuditorInstance.showFeaturesModal()">
                                View all (${(rolesAndFeatures.installedFeatures || []).length}) <i class="fas fa-chevron-right"></i>
                            </button>
                            ` : ''}
                        </h4>
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th>Feature name</th>
                                        <th>Installed (Yes/No)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rolesAndFeatures.installedFeatures.slice(0, 20).map(feature => {
                                        const featureName = typeof feature === 'string' ? feature : (feature.name || feature.displayName || 'Unknown');
                                        const isInstalled = typeof feature === 'object' ? (feature.installed !== false) : true;
                                        return `
                                        <tr>
                                            <td>${featureName}</td>
                                            <td><span class="status-badge status-${isInstalled ? 'online' : 'offline'}">${isInstalled ? 'Yes' : 'No'}</span></td>
                                        </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    ` : ''}

                    <!-- IIS -->
                    ${iis.installed ? `
                        <div class="audit-section">
                            <h2 class="audit-section-title"><i class="fas fa-globe"></i> ${this.t('iis')}</h2>
                            ${(iis.sites || []).length > 0 ? `
                                <div class="audit-table-wrapper">
                                    <table class="audit-table">
                                        <thead>
                                            <tr>
                                                <th>${this.t('name')}</th>
                                                <th>${this.t('state')}</th>
                                                <th>${this.t('bindings')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${iis.sites.map(site => `
                                                <tr>
                                                    <td>${site.name}</td>
                                                    <td><span class="status-badge status-${site.state.toLowerCase()}">${site.state}</span></td>
                                                    <td>${(site.bindings || []).join(', ')}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            ` : '<p>No IIS sites configured</p>'}
                        </div>
                    ` : ''}

                    <!-- SQL Server -->
                    ${sqlServer.installed ? `
                        <div class="audit-section">
                            <h2 class="audit-section-title"><i class="fas fa-database"></i> ${this.t('sqlServer')}</h2>
                            ${(sqlServer.instances || []).length > 0 ? `
                                <div class="audit-table-wrapper">
                                    <table class="audit-table">
                                        <thead>
                                            <tr>
                                                <th>${this.t('name')}</th>
                                                <th>${this.t('displayName')}</th>
                                                <th>${this.t('status')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${sqlServer.instances.map(instance => `
                                                <tr>
                                                    <td>${instance.name}</td>
                                                    <td>${instance.displayName}</td>
                                                    <td><span class="status-badge status-${instance.status.toLowerCase()}">${instance.status}</span></td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            ` : '<p>No SQL Server instances found</p>'}
                        </div>
                    ` : ''}

                    <!-- Active Directory -->
                    ${activeDirectory.isDomainController ? `
                        <div class="audit-section">
                            <h2 class="audit-section-title"><i class="fas fa-sitemap"></i> ${this.t('activeDirectory')}</h2>
                            <div class="audit-grid">
                                <div class="audit-item">
                                    <span class="audit-label">${this.t('isDomainController')}:</span>
                                    <span class="audit-value">Yes</span>
                                </div>
                                ${activeDirectory.domainName ? `
                                    <div class="audit-item">
                                        <span class="audit-label">${this.t('domainName')}:</span>
                                        <span class="audit-value">${activeDirectory.domainName}</span>
                                    </div>
                                ` : ''}
                                ${activeDirectory.domainNetBIOSName ? `
                                    <div class="audit-item">
                                        <span class="audit-label">${this.t('domainNetBIOSName')}:</span>
                                        <span class="audit-value">${activeDirectory.domainNetBIOSName}</span>
                                    </div>
                                ` : ''}
                                ${activeDirectory.forestName ? `
                                    <div class="audit-item">
                                        <span class="audit-label">${this.t('forestName')}:</span>
                                        <span class="audit-value">${activeDirectory.forestName}</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
            ${this.showServicesModalFlag ? this.renderServicesModal() : ''}
            ${this.showSoftwareModalFlag ? this.renderSoftwareModal() : ''}
            ${this.showDriversModalFlag ? this.renderDriversModal() : ''}
            ${this.showWindowsUpdatesModalFlag ? this.renderWindowsUpdatesModal() : ''}
            ${this.showMissingUpdatesModalFlag ? this.renderMissingUpdatesModal() : ''}
            ${this.showRolesModalFlag ? this.renderRolesModal() : ''}
            ${this.showFeaturesModalFlag ? this.renderFeaturesModal() : ''}
            ${this.showAllTasksModalFlag ? this.renderAllTasksModal() : ''}
            ${this.showFailedTasksModalFlag ? this.renderFailedTasksModal() : ''}
            ${this.showTempEnvironmentModalFlag ? this.renderTempEnvironmentModal() : ''}
            ${this.showDirectoryHealthModalFlag ? this.renderDirectoryHealthModal() : ''}
            ${this.showPathOrderAnalysisModalFlag ? this.renderPathOrderAnalysisModal() : ''}
            ${this.showPathHygieneChecksModalFlag ? this.renderPathHygieneChecksModal() : ''}
            ${this.showGroupMembersModalFlag ? this.renderGroupMembersModal() : ''}
            ${this.showEventLogModalFlag ? this.renderEventLogModal() : ''}
            ${this.showEventDetailsModalFlag ? this.renderEventDetailsModal() : ''}
            ${this.showProcessTreeModalFlag ? this.renderProcessTreeModal() : ''}
        `;
    }

    renderServicesModal() {
        if (!this.showServicesModalFlag || !this.selectedServicesModal) return '';

        const services = (this.reportData?.services?.services || []);
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(services.length / pageSize));
        const currentPage = Math.min(Math.max(this.selectedServicesModal.page || 0, 0), totalPages - 1);
        const start = currentPage * pageSize;
        const pageItems = services.slice(start, start + pageSize);

        return `
            <div class="modal-overlay" onclick="windowsServerAuditorInstance.closeServicesModal()">
                <div class="modal-container modal-wide" onclick="event.stopPropagation()">
                    <div class="modal-header-compact">
                        <div class="modal-title-section">
                            <div class="modal-icon-compact">
                                <i class="fas fa-cogs"></i>
                            </div>
                            <div class="modal-title-info">
                                <h3>Services</h3>
                                <p class="modal-description">${services.length} services total</p>
                            </div>
                        </div>
                        <button class="modal-close-compact" onclick="windowsServerAuditorInstance.closeServicesModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body-compact">
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th>Service name</th>
                                        <th>Startup type</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody id="services-modal-body">
                                    ${pageItems.map(service => {
                                        const isRunning = service.status === 'Running' || service.status === 'running';
                                        const isStopped = service.status === 'Stopped' || service.status === 'stopped';
                                        const isAutomatic = service.startType === 'Automatic' || service.startType === 'automatic';
                                        const isDisabled = service.startType === 'Disabled' || service.startType === 'disabled';
                                        
                                        // Flag only: Automatic + Stopped OR Disabled + Running
                                        const shouldFlag = (isAutomatic && isStopped) || (isDisabled && isRunning);
                                        
                                        return `
                                        <tr class="${shouldFlag ? 'flagged-service-row' : ''}">
                                            <td>
                                                ${service.displayName || service.name || 'N/A'}
                                                ${shouldFlag ? `
                                                <span class="service-flag" data-tooltip="${isAutomatic && isStopped ? 'Service is set to Automatic but is Stopped' : 'Service is Disabled but is Running'}" title="${isAutomatic && isStopped ? 'Service is set to Automatic but is Stopped' : 'Service is Disabled but is Running'}">
                                                    <i class="fas fa-exclamation-triangle"></i>
                                                </span>
                                                ` : ''}
                                            </td>
                                            <td>${service.startType || 'N/A'}</td>
                                            <td><span class="status-badge status-${isRunning ? 'online' : isStopped ? 'offline' : 'warning'}">${service.status || 'Unknown'}</span></td>
                                        </tr>
                                        `;
                                    }).join('')}
                                    ${pageItems.length === 0 ? `
                                    <tr>
                                        <td colspan="3" style="text-align:center; color:#64748b; font-style:italic;">No services to display</td>
                                    </tr>
                                    ` : ''}
                                </tbody>
                            </table>
                        </div>
                        ${totalPages > 1 ? `
                        <div class="modal-pagination">
                            <button id="services-prev-btn" class="btn btn-secondary btn-xs" onclick="windowsServerAuditorInstance.changeServicesPage(-1)" ${currentPage === 0 ? 'disabled' : ''}>
                                <i class="fas fa-chevron-left"></i> Previous
                            </button>
                            <span id="services-modal-page" class="modal-page-indicator">Page ${currentPage + 1} of ${totalPages}</span>
                            <button id="services-next-btn" class="btn btn-secondary btn-xs" onclick="windowsServerAuditorInstance.changeServicesPage(1)" ${currentPage === totalPages - 1 ? 'disabled' : ''}>
                                Next <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderSoftwareModal() {
        if (!this.showSoftwareModalFlag || !this.selectedSoftwareModal) return '';

        const applications = (this.reportData?.software?.applications || []);
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(applications.length / pageSize));
        const currentPage = Math.min(Math.max(this.selectedSoftwareModal.page || 0, 0), totalPages - 1);
        const start = currentPage * pageSize;
        const pageItems = applications.slice(start, start + pageSize);

        return `
            <div class="modal-overlay" onclick="windowsServerAuditorInstance.closeSoftwareModal()">
                <div class="modal-container modal-wide" onclick="event.stopPropagation()">
                    <div class="modal-header-compact">
                        <div class="modal-title-section">
                            <div class="modal-icon-compact">
                                <i class="fas fa-box"></i>
                            </div>
                            <div class="modal-title-info">
                                <h3>Installed Software</h3>
                                <p class="modal-description">${applications.length} applications total</p>
                            </div>
                        </div>
                        <button class="modal-close-compact" onclick="windowsServerAuditorInstance.closeSoftwareModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body-compact">
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Publisher</th>
                                        <th>Version</th>
                                        <th>Install date</th>
                                        <th>32-bit vs 64-bit</th>
                                    </tr>
                                </thead>
                                <tbody id="software-modal-body">
                                    ${pageItems.map(app => `
                                    <tr>
                                        <td>${app.name || 'N/A'}</td>
                                        <td>${app.vendor || app.publisher || 'N/A'}</td>
                                        <td>${app.version || 'N/A'}</td>
                                        <td>${(() => {
                                            if (!app.installDate) return 'N/A';
                                            try {
                                                let dateStr = app.installDate;
                                                // Handle .NET JSON date format: /Date(timestamp)/
                                                if (typeof dateStr === 'string' && dateStr.match(/^\/Date\((\d+)\)\/$/)) {
                                                    const timestamp = parseInt(dateStr.match(/^\/Date\((\d+)\)\/$/)[1]);
                                                    const date = new Date(timestamp);
                                                    return date.toLocaleDateString();
                                                }
                                                const date = new Date(dateStr);
                                                return isNaN(date.getTime()) ? dateStr : date.toLocaleDateString();
                                            } catch (e) {
                                                return app.installDate;
                                            }
                                        })()}</td>
                                        <td>
                                            ${app.architecture && app.architecture !== 'N/A' ? `
                                            <span class="status-badge" style="background: ${app.architecture === '64-bit' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)'}; color: ${app.architecture === '64-bit' ? '#34d399' : '#60a5fa'}; border-color: ${app.architecture === '64-bit' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'};">
                                                ${app.architecture}
                                            </span>
                                            ` : '<span style="color: #64748b;">N/A</span>'}
                                        </td>
                                    </tr>
                                    `).join('')}
                                    ${pageItems.length === 0 ? `
                                    <tr>
                                        <td colspan="5" style="text-align:center; color:#64748b; font-style:italic;">No applications to display</td>
                                    </tr>
                                    ` : ''}
                                </tbody>
                            </table>
                        </div>
                        ${totalPages > 1 ? `
                        <div class="modal-pagination">
                            <button id="software-prev-btn" class="btn btn-secondary btn-xs" onclick="windowsServerAuditorInstance.changeSoftwarePage(-1)" ${currentPage === 0 ? 'disabled' : ''}>
                                <i class="fas fa-chevron-left"></i> Previous
                            </button>
                            <span id="software-modal-page" class="modal-page-indicator">Page ${currentPage + 1} of ${totalPages}</span>
                            <button id="software-next-btn" class="btn btn-secondary btn-xs" onclick="windowsServerAuditorInstance.changeSoftwarePage(1)" ${currentPage === totalPages - 1 ? 'disabled' : ''}>
                                Next <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderDriversModal() {
        if (!this.showDriversModalFlag || !this.selectedDriversModal) return '';

        const drivers = (this.reportData?.drivers || []);
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(drivers.length / pageSize));
        const currentPage = Math.min(Math.max(this.selectedDriversModal.page || 0, 0), totalPages - 1);
        const start = currentPage * pageSize;
        const pageItems = drivers.slice(start, start + pageSize);

        return `
            <div class="modal-overlay" onclick="windowsServerAuditorInstance.closeDriversModal()">
                <div class="modal-container modal-wide" onclick="event.stopPropagation()">
                    <div class="modal-header-compact">
                        <div class="modal-title-section">
                            <div class="modal-icon-compact">
                                <i class="fas fa-microchip"></i>
                            </div>
                            <div class="modal-title-info">
                                <h3>Installed Drivers</h3>
                                <p class="modal-description">${drivers.length} drivers total</p>
                            </div>
                        </div>
                        <button class="modal-close-compact" onclick="windowsServerAuditorInstance.closeDriversModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body-compact">
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th>Device class</th>
                                        <th>Provider</th>
                                        <th>Version</th>
                                        <th>Date</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody id="drivers-modal-body">
                                    ${pageItems.map(driver => {
                                        // Check if driver is older than 3 years
                                        let isOldDriver = false;
                                        let dateDisplay = 'N/A';
                                        if (driver.versionDate && driver.versionDate !== 'N/A') {
                                            try {
                                                // Handle different date formats
                                                let driverDate;
                                                if (typeof driver.versionDate === 'string') {
                                                    // Try parsing as ISO date or other formats
                                                    driverDate = new Date(driver.versionDate);
                                                } else if (driver.versionDate instanceof Date) {
                                                    driverDate = driver.versionDate;
                                                } else {
                                                    driverDate = new Date(driver.versionDate);
                                                }
                                                
                                                if (!isNaN(driverDate.getTime())) {
                                                    const threeYearsAgo = new Date();
                                                    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
                                                    isOldDriver = driverDate < threeYearsAgo;
                                                    dateDisplay = driverDate.toLocaleDateString();
                                                }
                                            } catch (e) {
                                                dateDisplay = driver.versionDate;
                                            }
                                        }
                                        
                                        return `
                                        <tr class="${isOldDriver ? 'old-driver-row' : ''}">
                                            <td>
                                                ${driver.classDescription || driver.name || 'N/A'}
                                                ${isOldDriver ? '<span class="old-driver-flag" title="Driver is older than 3 years"><i class="fas fa-exclamation-triangle"></i></span>' : ''}
                                            </td>
                                            <td>${driver.providerName || 'N/A'}</td>
                                            <td>${driver.driverVersion || 'N/A'}</td>
                                            <td>${dateDisplay}</td>
                                            <td><span class="status-badge status-${driver.status === 'OK' || driver.status === 'Running' ? 'online' : 'warning'}">${driver.status || 'Unknown'}</span></td>
                                        </tr>
                                        `;
                                    }).join('')}
                                    ${pageItems.length === 0 ? `
                                    <tr>
                                        <td colspan="5" style="text-align:center; color:#64748b; font-style:italic;">No drivers to display</td>
                                    </tr>
                                    ` : ''}
                                </tbody>
                            </table>
                        </div>
                        ${totalPages > 1 ? `
                        <div class="modal-pagination">
                            <button id="drivers-prev-btn" class="btn btn-secondary btn-xs" onclick="windowsServerAuditorInstance.changeDriversPage(-1)" ${currentPage === 0 ? 'disabled' : ''}>
                                <i class="fas fa-chevron-left"></i> Previous
                            </button>
                            <span id="drivers-modal-page" class="modal-page-indicator">Page ${currentPage + 1} of ${totalPages}</span>
                            <button id="drivers-next-btn" class="btn btn-secondary btn-xs" onclick="windowsServerAuditorInstance.changeDriversPage(1)" ${currentPage === totalPages - 1 ? 'disabled' : ''}>
                                Next <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    async mount() {
        window.windowsServerAuditorInstance = this;
        const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
        this.reportId = urlParams.get('id');

        if (this.reportId) {
            await this.loadReport();
        }
    }

    async loadReport() {
        if (!this.reportId) return;

        this.loading = true;
        this.updateDisplay();

        try {
            const response = await fetch(`/api/windows-server-reports/${this.reportId}`);
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

    async generateScript(options = {}) {
        const { encrypt = true, obfuscate = true } = options;
        if (!this.reportId) {
            this.showMessage('Please select a report first', 'error');
            return;
        }

        this.showMessage(encrypt ? 'Generating script...' : 'Generating plain script...', 'info');

        try {
            const response = await fetch('/api/windows-server-reports/generate-script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reportId: this.reportId ? parseInt(this.reportId) : null,
                    encrypt,
                    obfuscate
                })
            });

            if (!response.ok) throw new Error('Failed to generate script');
            
            const data = await response.json();
            
            // Create a blob and download
            const blob = new Blob([data.script], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const reportName = this.reportData?.serverName || 'WindowsServer';
            const scriptType = encrypt ? 'Encrypted' : 'Plain';
            a.download = `WindowsServerAudit-${scriptType}-${reportName.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.ps1`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            this.showMessage(encrypt ? 'Script generated and downloaded successfully!' : 'Plain script generated successfully!', 'success');
        } catch (error) {
            console.error('Error generating script:', error);
            this.showMessage('Error generating script: ' + error.message, 'error');
        }
    }

    importReport() {
        const fileInput = document.getElementById('report-file-input');
        if (fileInput) {
            fileInput.click();
        }
    }

    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!this.reportId) {
            this.showMessage('Please select a report first', 'error');
            return;
        }

        this.showMessage('Importing report data...', 'info');

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('reportId', this.reportId);

            const response = await fetch('/api/windows-server-reports/import', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = 'Failed to import report';
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error || errorMessage;
                } catch {
                    errorMessage = errorText || errorMessage;
                }
                throw new Error(errorMessage);
            }

            const result = await response.json();
            this.showMessage('Report imported successfully!', 'success');
            
            // Reload the report data
            await this.loadReport();
        } catch (error) {
            console.error('Error importing report:', error);
            this.showMessage('Error importing report: ' + error.message, 'error');
        } finally {
            // Reset file input
            event.target.value = '';
        }
    }

    goBack() {
        if (window.appInstance) {
            window.appInstance.navigateTo('windows-server-auditor-list');
        } else {
            window.location.hash = 'windows-server-auditor-list';
            window.location.reload();
        }
    }

    showMessage(message, type) {
        // Use global notification system if available
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    lockBodyScroll() {
        document.body.classList.add('modal-open');
    }

    unlockBodyScroll() {
        document.body.classList.remove('modal-open');
    }

    showServicesModal() {
        this.selectedServicesModal = {
            page: 0
        };
        this.showServicesModalFlag = true;
        this.lockBodyScroll();
        this.updateDisplay();
    }

    changeServicesPage(delta) {
        if (!this.selectedServicesModal) return;
        const services = (this.reportData?.services?.services || []);
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(services.length / pageSize));
        let page = this.selectedServicesModal.page || 0;
        page = Math.min(Math.max(page + delta, 0), totalPages - 1);
        this.selectedServicesModal.page = page;
        this.updateServicesModalPage();
    }

    closeServicesModal() {
        this.showServicesModalFlag = false;
        this.selectedServicesModal = null;
        this.unlockBodyScroll();
        this.updateDisplay();
    }

    updateServicesModalPage() {
        if (!this.selectedServicesModal) return;
        
        // Sort services: flagged first, then others
        const allServices = [...(this.reportData?.services?.services || [])];
        const sortedServices = allServices.sort((a, b) => {
            const aIsRunning = a.status === 'Running' || a.status === 'running';
            const aIsStopped = a.status === 'Stopped' || a.status === 'stopped';
            const aIsAutomatic = a.startType === 'Automatic' || a.startType === 'automatic';
            const aIsDisabled = a.startType === 'Disabled' || a.startType === 'disabled';
            const aShouldFlag = (aIsAutomatic && aIsStopped) || (aIsDisabled && aIsRunning);
            
            const bIsRunning = b.status === 'Running' || b.status === 'running';
            const bIsStopped = b.status === 'Stopped' || b.status === 'stopped';
            const bIsAutomatic = b.startType === 'Automatic' || b.startType === 'automatic';
            const bIsDisabled = b.startType === 'Disabled' || b.startType === 'disabled';
            const bShouldFlag = (bIsAutomatic && bIsStopped) || (bIsDisabled && bIsRunning);
            
            // Flagged services come first
            if (aShouldFlag && !bShouldFlag) return -1;
            if (!aShouldFlag && bShouldFlag) return 1;
            return 0;
        });
        
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(sortedServices.length / pageSize));
        const currentPage = Math.min(Math.max(this.selectedServicesModal.page || 0, 0), totalPages - 1);
        const start = currentPage * pageSize;
        const pageItems = sortedServices.slice(start, start + pageSize);

        const tbody = document.getElementById('services-modal-body');
        const pageSpan = document.getElementById('services-modal-page');
        const prevBtn = document.getElementById('services-prev-btn');
        const nextBtn = document.getElementById('services-next-btn');

        if (!tbody || !pageSpan) {
            this.updateDisplay();
            return;
        }

        tbody.innerHTML = pageItems.map(service => {
            const isRunning = service.status === 'Running' || service.status === 'running';
            const isStopped = service.status === 'Stopped' || service.status === 'stopped';
            const isAutomatic = service.startType === 'Automatic' || service.startType === 'automatic';
            const isDisabled = service.startType === 'Disabled' || service.startType === 'disabled';
            
            // Flag only: Automatic + Stopped OR Disabled + Running
            const shouldFlag = (isAutomatic && isStopped) || (isDisabled && isRunning);
            
            return `
            <tr class="${shouldFlag ? 'flagged-service-row' : ''}">
                <td>
                    ${service.displayName || service.name || 'N/A'}
                    ${shouldFlag ? `
                    <span class="service-flag" data-tooltip="${isAutomatic && isStopped ? 'Service is set to Automatic but is Stopped' : 'Service is Disabled but is Running'}" title="${isAutomatic && isStopped ? 'Service is set to Automatic but is Stopped' : 'Service is Disabled but is Running'}">
                        <i class="fas fa-exclamation-triangle"></i>
                    </span>
                    ` : ''}
                </td>
                <td>${service.startType || 'N/A'}</td>
                <td><span class="status-badge status-${isRunning ? 'online' : isStopped ? 'offline' : 'warning'}">${service.status || 'Unknown'}</span></td>
            </tr>
            `;
        }).join('') + (pageItems.length === 0 ? `
            <tr>
                <td colspan="3" style="text-align:center; color:#64748b; font-style:italic;">No services to display</td>
            </tr>
        ` : '');

        pageSpan.textContent = `Page ${currentPage + 1} of ${totalPages}`;
        if (prevBtn) prevBtn.disabled = currentPage === 0;
        if (nextBtn) nextBtn.disabled = currentPage === totalPages - 1;
        const container = tbody.closest('.table-container-modern');
        if (container) {
            container.scrollTop = 0;
        }
    }

    showSoftwareModal() {
        this.selectedSoftwareModal = {
            page: 0
        };
        this.showSoftwareModalFlag = true;
        this.lockBodyScroll();
        this.updateDisplay();
    }

    changeSoftwarePage(delta) {
        if (!this.selectedSoftwareModal) return;
        const applications = (this.reportData?.software?.applications || []);
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(applications.length / pageSize));
        let page = this.selectedSoftwareModal.page || 0;
        page = Math.min(Math.max(page + delta, 0), totalPages - 1);
        this.selectedSoftwareModal.page = page;
        this.updateSoftwareModalPage();
    }

    closeSoftwareModal() {
        this.showSoftwareModalFlag = false;
        this.selectedSoftwareModal = null;
        this.unlockBodyScroll();
        this.updateDisplay();
    }

    updateSoftwareModalPage() {
        if (!this.selectedSoftwareModal) return;
        const applications = (this.reportData?.software?.applications || []);
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(applications.length / pageSize));
        const currentPage = Math.min(Math.max(this.selectedSoftwareModal.page || 0, 0), totalPages - 1);
        const start = currentPage * pageSize;
        const pageItems = applications.slice(start, start + pageSize);

        const tbody = document.getElementById('software-modal-body');
        const pageSpan = document.getElementById('software-modal-page');
        const prevBtn = document.getElementById('software-prev-btn');
        const nextBtn = document.getElementById('software-next-btn');

        if (!tbody || !pageSpan) {
            this.updateDisplay();
            return;
        }

        tbody.innerHTML = pageItems.map(app => `
            <tr>
                <td>${app.name || 'N/A'}</td>
                <td>${app.vendor || app.publisher || 'N/A'}</td>
                <td>${app.version || 'N/A'}</td>
                <td>${(() => {
                    if (!app.installDate) return 'N/A';
                    try {
                        let dateStr = app.installDate;
                        // Handle .NET JSON date format: /Date(timestamp)/
                        if (typeof dateStr === 'string' && dateStr.match(/^\/Date\((\d+)\)\/$/)) {
                            const timestamp = parseInt(dateStr.match(/^\/Date\((\d+)\)\/$/)[1]);
                            const date = new Date(timestamp);
                            return date.toLocaleDateString();
                        }
                        const date = new Date(dateStr);
                        return isNaN(date.getTime()) ? dateStr : date.toLocaleDateString();
                    } catch (e) {
                        return app.installDate;
                    }
                })()}</td>
            </tr>
        `).join('') + (pageItems.length === 0 ? `
            <tr>
                <td colspan="4" style="text-align:center; color:#64748b; font-style:italic;">No applications to display</td>
            </tr>
        ` : '');

        pageSpan.textContent = `Page ${currentPage + 1} of ${totalPages}`;
        if (prevBtn) prevBtn.disabled = currentPage === 0;
        if (nextBtn) nextBtn.disabled = currentPage === totalPages - 1;
        const container = tbody.closest('.table-container-modern');
        if (container) {
            container.scrollTop = 0;
        }
    }

    showDriversModal() {
        this.selectedDriversModal = {
            page: 0
        };
        this.showDriversModalFlag = true;
        this.lockBodyScroll();
        this.updateDisplay();
    }

    changeDriversPage(delta) {
        if (!this.selectedDriversModal) return;
        const drivers = (this.reportData?.drivers || []);
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(drivers.length / pageSize));
        let page = this.selectedDriversModal.page || 0;
        page = Math.min(Math.max(page + delta, 0), totalPages - 1);
        this.selectedDriversModal.page = page;
        this.updateDriversModalPage();
    }

    closeDriversModal() {
        this.showDriversModalFlag = false;
        this.selectedDriversModal = null;
        this.unlockBodyScroll();
        this.updateDisplay();
    }

    updateDriversModalPage() {
        if (!this.selectedDriversModal) return;
        const drivers = (this.reportData?.drivers || []);
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(drivers.length / pageSize));
        const currentPage = Math.min(Math.max(this.selectedDriversModal.page || 0, 0), totalPages - 1);
        const start = currentPage * pageSize;
        const pageItems = drivers.slice(start, start + pageSize);

        const tbody = document.getElementById('drivers-modal-body');
        const pageSpan = document.getElementById('drivers-modal-page');
        const prevBtn = document.getElementById('drivers-prev-btn');
        const nextBtn = document.getElementById('drivers-next-btn');

        if (!tbody || !pageSpan) {
            this.updateDisplay();
            return;
        }

        tbody.innerHTML = pageItems.map(driver => `
            <tr>
                <td>${driver.classDescription || driver.name || 'N/A'}</td>
                <td>${driver.providerName || 'N/A'}</td>
                <td>${driver.driverVersion || 'N/A'}</td>
                <td>${driver.versionDate || 'N/A'}</td>
                <td><span class="status-badge status-${driver.status === 'OK' || driver.status === 'Running' ? 'online' : 'warning'}">${driver.status || 'Unknown'}</span></td>
            </tr>
        `).join('') + (pageItems.length === 0 ? `
            <tr>
                <td colspan="3" style="text-align:center; color:#64748b; font-style:italic;">No drivers to display</td>
            </tr>
        ` : '');

        pageSpan.textContent = `Page ${currentPage + 1} of ${totalPages}`;
        if (prevBtn) prevBtn.disabled = currentPage === 0;
        if (nextBtn) nextBtn.disabled = currentPage === totalPages - 1;
        const container = tbody.closest('.table-container-modern');
        if (container) {
            container.scrollTop = 0;
        }
    }

    showWindowsUpdatesModal() {
        this.selectedWindowsUpdatesModal = {
            page: 0
        };
        this.showWindowsUpdatesModalFlag = true;
        this.lockBodyScroll();
        this.updateDisplay();
    }

    changeWindowsUpdatesPage(delta) {
        if (!this.selectedWindowsUpdatesModal) return;
        const updates = (this.reportData?.windowsUpdates || []);
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(updates.length / pageSize));
        let page = this.selectedWindowsUpdatesModal.page || 0;
        page = Math.min(Math.max(page + delta, 0), totalPages - 1);
        this.selectedWindowsUpdatesModal.page = page;
        this.updateWindowsUpdatesModalPage();
    }

    closeWindowsUpdatesModal() {
        this.showWindowsUpdatesModalFlag = false;
        this.selectedWindowsUpdatesModal = null;
        this.unlockBodyScroll();
        this.updateDisplay();
    }

    updateWindowsUpdatesModalPage() {
        if (!this.selectedWindowsUpdatesModal) return;
        const updates = (this.reportData?.windowsUpdates || []);
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(updates.length / pageSize));
        const currentPage = Math.min(Math.max(this.selectedWindowsUpdatesModal.page || 0, 0), totalPages - 1);
        const start = currentPage * pageSize;
        const pageItems = updates.slice(start, start + pageSize);

        const grid = document.getElementById('windows-updates-modal-body');
        const pageSpan = document.getElementById('windows-updates-modal-page');
        const prevBtn = document.getElementById('windows-updates-prev-btn');
        const nextBtn = document.getElementById('windows-updates-next-btn');

        if (!grid || !pageSpan) {
            this.updateDisplay();
            return;
        }

        grid.innerHTML = pageItems.map(update => `
            <div class="update-modal-card">
                <div class="update-modal-header">
                    <div class="update-kb-badge">
                        <i class="fas fa-shield-alt"></i>
                        <span>${update.hotFixID || 'N/A'}</span>
                    </div>
                    <div class="update-date-badge">
                        <i class="fas fa-calendar-alt"></i>
                        <span>${update.installedOn || 'N/A'}</span>
                    </div>
                </div>
                <div class="update-modal-body">
                    <div class="update-description-full">
                        ${update.description || 'N/A'}
                    </div>
                    ${update.installedBy && update.installedBy !== 'N/A' ? `
                    <div class="update-installer">
                        <i class="fas fa-user"></i>
                        <span>${update.installedBy}</span>
                    </div>
                    ` : ''}
                    ${update.updateSource ? `
                    <div class="update-installer" style="margin-top: 0.5rem;">
                        <i class="fas ${update.updateSource === 'WSUS' ? 'fa-server' : 'fa-cloud'}"></i>
                        <span style="color: ${update.updateSource === 'WSUS' ? '#3b82f6' : '#10b981'}; font-weight: 600;">${update.updateSource}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `).join('') + (pageItems.length === 0 ? `
            <div style="grid-column: 1 / -1; text-align: center; color: #64748b; font-style: italic; padding: 2rem;">
                No updates to display
            </div>
        ` : '');

        pageSpan.textContent = `Page ${currentPage + 1} of ${totalPages}`;
        if (prevBtn) prevBtn.disabled = currentPage === 0;
        if (nextBtn) nextBtn.disabled = currentPage === totalPages - 1;
        if (grid) {
            grid.scrollTop = 0;
        }
    }

    renderWindowsUpdatesModal() {
        if (!this.showWindowsUpdatesModalFlag || !this.selectedWindowsUpdatesModal) return '';
        const updates = (this.reportData?.windowsUpdates || []);
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(updates.length / pageSize));
        const currentPage = Math.min(Math.max(this.selectedWindowsUpdatesModal.page || 0, 0), totalPages - 1);
        const start = currentPage * pageSize;
        const pageItems = updates.slice(start, start + pageSize);

        return `
            <div class="modal-overlay" onclick="windowsServerAuditorInstance.closeWindowsUpdatesModal()">
                <div class="modal-compact modal-wide" onclick="event.stopPropagation()">
                    <div class="modal-header-compact">
                        <h3>
                            <i class="fas fa-download"></i>
                            ${this.t('windowsUpdates')}
                            <span class="update-count-pill">${updates.length}</span>
                        </h3>
                        <button class="modal-close-compact" onclick="windowsServerAuditorInstance.closeWindowsUpdatesModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body-compact">
                        <div class="updates-modal-grid" id="windows-updates-modal-body">
                            ${pageItems.map(update => `
                                <div class="update-modal-card">
                                    <div class="update-modal-header">
                                        <div class="update-kb-badge">
                                            <i class="fas fa-shield-alt"></i>
                                            <span>${update.hotFixID || 'N/A'}</span>
                                        </div>
                                        <div class="update-date-badge">
                                            <i class="fas fa-calendar-alt"></i>
                                            <span>${update.installedOn || 'N/A'}</span>
                                        </div>
                                    </div>
                                    <div class="update-modal-body">
                                        <div class="update-description-full">
                                            ${update.description || 'N/A'}
                                        </div>
                                        ${update.installedBy && update.installedBy !== 'N/A' ? `
                                        <div class="update-installer">
                                            <i class="fas fa-user"></i>
                                            <span>${update.installedBy}</span>
                                        </div>
                                        ` : ''}
                                        ${update.updateSource ? `
                                        <div class="update-installer" style="margin-top: 0.5rem;">
                                            <i class="fas ${update.updateSource === 'WSUS' ? 'fa-server' : 'fa-cloud'}"></i>
                                            <span style="color: ${update.updateSource === 'WSUS' ? '#3b82f6' : '#10b981'}; font-weight: 600;">${update.updateSource}</span>
                                        </div>
                                        ` : ''}
                                    </div>
                                </div>
                            `).join('')}
                            ${pageItems.length === 0 ? `
                                <div style="grid-column: 1 / -1; text-align: center; color: #64748b; font-style: italic; padding: 2rem;">
                                    No updates to display
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="modal-pagination">
                        <button id="windows-updates-prev-btn" class="pagination-btn" onclick="windowsServerAuditorInstance.changeWindowsUpdatesPage(-1)" ${currentPage === 0 ? 'disabled' : ''}>
                            <i class="fas fa-chevron-left"></i> Previous
                        </button>
                        <span id="windows-updates-modal-page" class="pagination-info">Page ${currentPage + 1} of ${totalPages}</span>
                        <button id="windows-updates-next-btn" class="pagination-btn" onclick="windowsServerAuditorInstance.changeWindowsUpdatesPage(1)" ${currentPage === totalPages - 1 ? 'disabled' : ''}>
                            Next <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    showMissingUpdatesModal() {
        this.selectedMissingUpdatesModal = {
            page: 0
        };
        this.showMissingUpdatesModalFlag = true;
        this.lockBodyScroll();
        this.updateDisplay();
    }

    changeMissingUpdatesPage(delta) {
        if (!this.selectedMissingUpdatesModal) return;
        const updates = (this.reportData?.missingUpdates || []);
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(updates.length / pageSize));
        let page = this.selectedMissingUpdatesModal.page || 0;
        page = Math.min(Math.max(page + delta, 0), totalPages - 1);
        this.selectedMissingUpdatesModal.page = page;
        this.updateMissingUpdatesModalPage();
    }

    closeMissingUpdatesModal() {
        this.showMissingUpdatesModalFlag = false;
        this.selectedMissingUpdatesModal = null;
        this.unlockBodyScroll();
        this.updateDisplay();
    }

    renderRolesModal() {
        if (!this.showRolesModalFlag || !this.selectedRolesModal) return '';

        const roles = (this.reportData?.rolesAndFeatures?.installedRoles || []);
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(roles.length / pageSize));
        const currentPage = Math.min(Math.max(this.selectedRolesModal.page || 0, 0), totalPages - 1);
        const start = currentPage * pageSize;
        const pageItems = roles.slice(start, start + pageSize);

        return `
            <div class="modal-overlay" onclick="windowsServerAuditorInstance.closeRolesModal()">
                <div class="modal-container modal-wide" onclick="event.stopPropagation()">
                    <div class="modal-header-compact">
                        <div class="modal-title-section">
                            <div class="modal-icon-compact">
                                <i class="fas fa-server"></i>
                            </div>
                            <div class="modal-title-info">
                                <h3>Roles</h3>
                                <p class="modal-description">${roles.length} roles total</p>
                            </div>
                        </div>
                        <button class="modal-close-compact" onclick="windowsServerAuditorInstance.closeRolesModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body-compact">
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th>Role name</th>
                                        <th>Installed (Yes/No)</th>
                                    </tr>
                                </thead>
                                <tbody id="roles-modal-body">
                                    ${pageItems.map(role => {
                                        const roleName = typeof role === 'string' ? role : (role.name || role.displayName || 'Unknown');
                                        const isInstalled = typeof role === 'object' ? (role.installed !== false) : true;
                                        return `
                                        <tr>
                                            <td>${roleName}</td>
                                            <td><span class="status-badge status-${isInstalled ? 'online' : 'offline'}">${isInstalled ? 'Yes' : 'No'}</span></td>
                                        </tr>
                                        `;
                                    }).join('')}
                                    ${pageItems.length === 0 ? `
                                    <tr>
                                        <td colspan="2" style="text-align:center; color:#64748b; font-style:italic;">No roles to display</td>
                                    </tr>
                                    ` : ''}
                                </tbody>
                            </table>
                        </div>
                        ${totalPages > 1 ? `
                        <div class="modal-pagination">
                            <button id="roles-prev-btn" class="btn btn-secondary btn-xs" onclick="windowsServerAuditorInstance.changeRolesPage(-1)" ${currentPage === 0 ? 'disabled' : ''}>
                                <i class="fas fa-chevron-left"></i> Previous
                            </button>
                            <span id="roles-modal-page" class="modal-page-indicator">Page ${currentPage + 1} of ${totalPages}</span>
                            <button id="roles-next-btn" class="btn btn-secondary btn-xs" onclick="windowsServerAuditorInstance.changeRolesPage(1)" ${currentPage === totalPages - 1 ? 'disabled' : ''}>
                                Next <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderFeaturesModal() {
        if (!this.showFeaturesModalFlag || !this.selectedFeaturesModal) return '';

        const features = (this.reportData?.rolesAndFeatures?.installedFeatures || []);
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(features.length / pageSize));
        const currentPage = Math.min(Math.max(this.selectedFeaturesModal.page || 0, 0), totalPages - 1);
        const start = currentPage * pageSize;
        const pageItems = features.slice(start, start + pageSize);

        return `
            <div class="modal-overlay" onclick="windowsServerAuditorInstance.closeFeaturesModal()">
                <div class="modal-container modal-wide" onclick="event.stopPropagation()">
                    <div class="modal-header-compact">
                        <div class="modal-title-section">
                            <div class="modal-icon-compact">
                                <i class="fas fa-puzzle-piece"></i>
                            </div>
                            <div class="modal-title-info">
                                <h3>Features</h3>
                                <p class="modal-description">${features.length} features total</p>
                            </div>
                        </div>
                        <button class="modal-close-compact" onclick="windowsServerAuditorInstance.closeFeaturesModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body-compact">
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th>Feature name</th>
                                        <th>Installed (Yes/No)</th>
                                    </tr>
                                </thead>
                                <tbody id="features-modal-body">
                                    ${pageItems.map(feature => {
                                        const featureName = typeof feature === 'string' ? feature : (feature.name || feature.displayName || 'Unknown');
                                        const isInstalled = typeof feature === 'object' ? (feature.installed !== false) : true;
                                        return `
                                        <tr>
                                            <td>${featureName}</td>
                                            <td><span class="status-badge status-${isInstalled ? 'online' : 'offline'}">${isInstalled ? 'Yes' : 'No'}</span></td>
                                        </tr>
                                        `;
                                    }).join('')}
                                    ${pageItems.length === 0 ? `
                                    <tr>
                                        <td colspan="2" style="text-align:center; color:#64748b; font-style:italic;">No features to display</td>
                                    </tr>
                                    ` : ''}
                                </tbody>
                            </table>
                        </div>
                        ${totalPages > 1 ? `
                        <div class="modal-pagination">
                            <button id="features-prev-btn" class="btn btn-secondary btn-xs" onclick="windowsServerAuditorInstance.changeFeaturesPage(-1)" ${currentPage === 0 ? 'disabled' : ''}>
                                <i class="fas fa-chevron-left"></i> Previous
                            </button>
                            <span id="features-modal-page" class="modal-page-indicator">Page ${currentPage + 1} of ${totalPages}</span>
                            <button id="features-next-btn" class="btn btn-secondary btn-xs" onclick="windowsServerAuditorInstance.changeFeaturesPage(1)" ${currentPage === totalPages - 1 ? 'disabled' : ''}>
                                Next <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    showRolesModal() {
        this.selectedRolesModal = {
            page: 0
        };
        this.showRolesModalFlag = true;
        this.lockBodyScroll();
        this.updateDisplay();
    }

    changeRolesPage(delta) {
        if (!this.selectedRolesModal) return;
        const roles = (this.reportData?.rolesAndFeatures?.installedRoles || []);
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(roles.length / pageSize));
        let page = this.selectedRolesModal.page || 0;
        page = Math.min(Math.max(page + delta, 0), totalPages - 1);
        this.selectedRolesModal.page = page;
        this.updateRolesModalPage();
    }

    closeRolesModal() {
        this.showRolesModalFlag = false;
        this.selectedRolesModal = null;
        this.unlockBodyScroll();
        this.updateDisplay();
    }

    updateRolesModalPage() {
        if (!this.selectedRolesModal) return;
        const roles = (this.reportData?.rolesAndFeatures?.installedRoles || []);
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(roles.length / pageSize));
        const currentPage = Math.min(Math.max(this.selectedRolesModal.page || 0, 0), totalPages - 1);
        const start = currentPage * pageSize;
        const pageItems = roles.slice(start, start + pageSize);

        const tbody = document.getElementById('roles-modal-body');
        const pageSpan = document.getElementById('roles-modal-page');
        const prevBtn = document.getElementById('roles-prev-btn');
        const nextBtn = document.getElementById('roles-next-btn');

        if (!tbody || !pageSpan) {
            this.updateDisplay();
            return;
        }

        tbody.innerHTML = pageItems.map(role => {
            const roleName = typeof role === 'string' ? role : (role.name || role.displayName || 'Unknown');
            const isInstalled = typeof role === 'object' ? (role.installed !== false) : true;
            return `
            <tr>
                <td>${roleName}</td>
                <td><span class="status-badge status-${isInstalled ? 'online' : 'offline'}">${isInstalled ? 'Yes' : 'No'}</span></td>
            </tr>
            `;
        }).join('');

        pageSpan.textContent = `Page ${currentPage + 1} of ${totalPages}`;
        if (prevBtn) prevBtn.disabled = currentPage === 0;
        if (nextBtn) nextBtn.disabled = currentPage === totalPages - 1;
    }

    showFeaturesModal() {
        this.selectedFeaturesModal = {
            page: 0
        };
        this.showFeaturesModalFlag = true;
        this.lockBodyScroll();
        this.updateDisplay();
    }

    changeFeaturesPage(delta) {
        if (!this.selectedFeaturesModal) return;
        const features = (this.reportData?.rolesAndFeatures?.installedFeatures || []);
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(features.length / pageSize));
        let page = this.selectedFeaturesModal.page || 0;
        page = Math.min(Math.max(page + delta, 0), totalPages - 1);
        this.selectedFeaturesModal.page = page;
        this.updateFeaturesModalPage();
    }

    closeFeaturesModal() {
        this.showFeaturesModalFlag = false;
        this.selectedFeaturesModal = null;
        this.unlockBodyScroll();
        this.updateDisplay();
    }

    updateFeaturesModalPage() {
        if (!this.selectedFeaturesModal) return;
        const features = (this.reportData?.rolesAndFeatures?.installedFeatures || []);
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(features.length / pageSize));
        const currentPage = Math.min(Math.max(this.selectedFeaturesModal.page || 0, 0), totalPages - 1);
        const start = currentPage * pageSize;
        const pageItems = features.slice(start, start + pageSize);

        const tbody = document.getElementById('features-modal-body');
        const pageSpan = document.getElementById('features-modal-page');
        const prevBtn = document.getElementById('features-prev-btn');
        const nextBtn = document.getElementById('features-next-btn');

        if (!tbody || !pageSpan) {
            this.updateDisplay();
            return;
        }

        tbody.innerHTML = pageItems.map(feature => {
            const featureName = typeof feature === 'string' ? feature : (feature.name || feature.displayName || 'Unknown');
            const isInstalled = typeof feature === 'object' ? (feature.installed !== false) : true;
            return `
            <tr>
                <td>${featureName}</td>
                <td><span class="status-badge status-${isInstalled ? 'online' : 'offline'}">${isInstalled ? 'Yes' : 'No'}</span></td>
            </tr>
            `;
        }).join('');

        pageSpan.textContent = `Page ${currentPage + 1} of ${totalPages}`;
        if (prevBtn) prevBtn.disabled = currentPage === 0;
        if (nextBtn) nextBtn.disabled = currentPage === totalPages - 1;
    }

    updateMissingUpdatesModalPage() {
        if (!this.selectedMissingUpdatesModal) return;
        const updates = (this.reportData?.missingUpdates || []);
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(updates.length / pageSize));
        const currentPage = Math.min(Math.max(this.selectedMissingUpdatesModal.page || 0, 0), totalPages - 1);
        const start = currentPage * pageSize;
        const pageItems = updates.slice(start, start + pageSize);

        const tbody = document.getElementById('missing-updates-modal-body');
        const pageSpan = document.getElementById('missing-updates-modal-page');
        const prevBtn = document.getElementById('missing-updates-prev-btn');
        const nextBtn = document.getElementById('missing-updates-next-btn');

        if (!tbody || !pageSpan) {
            this.updateDisplay();
            return;
        }

        tbody.innerHTML = pageItems.map(update => {
            const updateSource = update.updateSource || 'Microsoft';
            const isWSUS = updateSource === 'WSUS';
            return `
            <tr>
                <td><strong>${update.kbNumber || 'N/A'}</strong></td>
                <td>${update.title || 'N/A'}</td>
                <td>${update.size || 'N/A'}</td>
                <td>${update.date || 'N/A'}</td>
                <td>
                    <span style="color: ${isWSUS ? '#3b82f6' : '#10b981'}; font-weight: 600;">
                        ${isWSUS ? '<i class="fas fa-server"></i> ' : '<i class="fas fa-cloud"></i> '}
                        ${updateSource}
                    </span>
                </td>
            </tr>
            `;
        }).join('') + (pageItems.length === 0 ? `
            <tr>
                <td colspan="5" style="text-align:center; color:#64748b; font-style:italic;">No missing updates to display</td>
            </tr>
        ` : '');

        pageSpan.textContent = `Page ${currentPage + 1} of ${totalPages}`;
        if (prevBtn) prevBtn.disabled = currentPage === 0;
        if (nextBtn) nextBtn.disabled = currentPage === totalPages - 1;
        const container = tbody.closest('.table-container-modern');
        if (container) {
            container.scrollTop = 0;
        }
    }

    renderMissingUpdatesModal() {
        if (!this.showMissingUpdatesModalFlag || !this.selectedMissingUpdatesModal) return '';
        const updates = (this.reportData?.missingUpdates || []);
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(updates.length / pageSize));
        const currentPage = Math.min(Math.max(this.selectedMissingUpdatesModal.page || 0, 0), totalPages - 1);
        const start = currentPage * pageSize;
        const pageItems = updates.slice(start, start + pageSize);

        return `
            <div class="modal-overlay" onclick="windowsServerAuditorInstance.closeMissingUpdatesModal()">
                <div class="modal-compact" onclick="event.stopPropagation()">
                    <div class="modal-header-compact">
                        <h3>
                            <i class="fas fa-exclamation-triangle"></i>
                            ${this.t('missingUpdates')}
                            <span class="update-count-pill">${updates.length}</span>
                        </h3>
                        <button class="modal-close-compact" onclick="windowsServerAuditorInstance.closeMissingUpdatesModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body-compact">
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th>KB Article</th>
                                        <th>Title</th>
                                        <th>Size</th>
                                        <th>Date</th>
                                        <th>Update Source</th>
                                    </tr>
                                </thead>
                                <tbody id="missing-updates-modal-body">
                                    ${pageItems.map(update => {
                                        const updateSource = update.updateSource || 'Microsoft';
                                        const isWSUS = updateSource === 'WSUS';
                                        return `
                                    <tr>
                                        <td><strong>${update.kbNumber || 'N/A'}</strong></td>
                                        <td>${update.title || 'N/A'}</td>
                                        <td>${update.size || 'N/A'}</td>
                                        <td>${update.date || 'N/A'}</td>
                                        <td>
                                            <span style="color: ${isWSUS ? '#3b82f6' : '#10b981'}; font-weight: 600;">
                                                ${isWSUS ? '<i class="fas fa-server"></i> ' : '<i class="fas fa-cloud"></i> '}
                                                ${updateSource}
                                            </span>
                                        </td>
                                    </tr>
                                    `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-pagination">
                        <button id="missing-updates-prev-btn" class="pagination-btn" onclick="windowsServerAuditorInstance.changeMissingUpdatesPage(-1)" ${currentPage === 0 ? 'disabled' : ''}>
                            <i class="fas fa-chevron-left"></i> Previous
                        </button>
                        <span id="missing-updates-modal-page" class="pagination-info">Page ${currentPage + 1} of ${totalPages}</span>
                        <button id="missing-updates-next-btn" class="pagination-btn" onclick="windowsServerAuditorInstance.changeMissingUpdatesPage(1)" ${currentPage === totalPages - 1 ? 'disabled' : ''}>
                            Next <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    translateStatus(value) {
        if (!value && value !== 0) return 'N/A';
        
        // Handle numeric cluster resource states
        const numericStateMap = {
            0: 'Inherited',
            1: 'Initializing',
            2: 'Online',
            3: 'Offline',
            4: 'Failed',
            5: 'Pending',
            6: 'Online Pending',
            7: 'Offline Pending'
        };
        
        // Check if it's a numeric state
        const numValue = parseInt(value);
        if (!isNaN(numValue) && numericStateMap[numValue]) {
            value = numericStateMap[numValue];
        }
        
        // Convert to string and normalize
        const strValue = String(value).trim();
        
        // Common status mappings
        const statusMap = {
            'online': 'Online',
            'offline': 'Offline',
            'running': 'Running',
            'stopped': 'Stopped',
            'healthy': 'Healthy',
            'unhealthy': 'Unhealthy',
            'warning': 'Warning',
            'error': 'Error',
            'failed': 'Failed',
            'pending': 'Pending',
            'enabled': 'Enabled',
            'disabled': 'Disabled',
            'connected': 'Connected',
            'disconnected': 'Disconnected',
            'up': 'Up',
            'down': 'Down'
        };
        
        const lowerValue = strValue.toLowerCase();
        if (statusMap[lowerValue]) {
            return statusMap[lowerValue];
        }
        
        // Capitalize first letter of each word
        return strValue.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
    }

    updateDisplay() {
        const content = document.getElementById('page-content');
        if (content) {
            this.render().then(html => {
                content.innerHTML = html;
            });
        }
    }

    // All Tasks Modal
    showAllTasksModal() {
        this.selectedAllTasksModal = { page: 0 };
        this.showAllTasksModalFlag = true;
        this.lockBodyScroll();
        this.updateDisplay();
    }

    closeAllTasksModal() {
        this.showAllTasksModalFlag = false;
        this.selectedAllTasksModal = null;
        this.unlockBodyScroll();
        this.updateDisplay();
    }

    renderAllTasksModal() {
        if (!this.showAllTasksModalFlag) return '';
        const scheduledTasks = this.reportData?.scheduledTasks || {};
        const allTasks = scheduledTasks.allTasks || [];
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(allTasks.length / pageSize));
        const currentPage = Math.min(Math.max((this.selectedAllTasksModal?.page || 0), 0), totalPages - 1);
        const start = currentPage * pageSize;
        const pageItems = allTasks.slice(start, start + pageSize);

        return `
            <div class="modal-overlay" onclick="windowsServerAuditorInstance.closeAllTasksModal()">
                <div class="modal-container modal-wide" onclick="event.stopPropagation()">
                    <div class="modal-header-compact">
                        <div class="modal-title-section">
                            <div class="modal-icon-compact">
                                <i class="fas fa-list"></i>
                            </div>
                            <div class="modal-title-info">
                                <h3>All Scheduled Tasks</h3>
                                <p class="modal-description">${allTasks.length} tasks total</p>
                            </div>
                        </div>
                        <button class="modal-close-compact" onclick="windowsServerAuditorInstance.closeAllTasksModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body-compact">
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th>Task Name</th>
                                        <th style="width: 120px;">State</th>
                                        <th style="width: 180px;">Last Run Time</th>
                                        <th style="width: 120px;">Last Result</th>
                                        <th style="width: 180px;">Next Run Time</th>
                                        <th style="width: 100px;">Missed Runs</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${pageItems.map(task => {
                                        const flags = [];
                                        if (task.runsAsSystem) {
                                            flags.push({ icon: 'fa-shield-alt', color: '#3b82f6', tooltip: 'Runs as SYSTEM' });
                                        }
                                        if (task.runsPowerShellOrCmd) {
                                            flags.push({ icon: task.actionType === 'PowerShell' ? 'fa-terminal' : 'fa-window-maximize', color: '#f59e0b', tooltip: `Runs ${task.actionType || 'PowerShell/CMD'}` });
                                        }
                                        if (task.hasStoredCredentials) {
                                            flags.push({ icon: 'fa-key', color: '#ef4444', tooltip: `Stored credentials: ${task.storedUserName || 'N/A'}` });
                                        }
                                        return `
                                        <tr>
                                            <td>
                                                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                                                    <div style="font-weight: 600; color: #e2e8f0;">${task.taskName || 'N/A'}</div>
                                                    ${flags.length > 0 ? flags.map(flag => `
                                                        <span class="task-flag" data-tooltip="${flag.tooltip}" style="display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.125rem 0.375rem; background: rgba(${flag.color === '#3b82f6' ? '59, 130, 246' : flag.color === '#f59e0b' ? '245, 158, 11' : '239, 68, 68'}, 0.15); border: 1px solid rgba(${flag.color === '#3b82f6' ? '59, 130, 246' : flag.color === '#f59e0b' ? '245, 158, 11' : '239, 68, 68'}, 0.3); border-radius: 4px; color: ${flag.color}; font-size: 0.6875rem; cursor: help;">
                                                            <i class="fas ${flag.icon}"></i>
                                                        </span>
                                                    `).join('') : ''}
                                                </div>
                                                ${task.taskPath && task.taskPath !== '\\' ? `
                                                <div style="font-size: 0.75rem; color: #64748b; font-family: 'Consolas', 'Monaco', monospace;">${task.taskPath}</div>
                                                ` : ''}
                                                ${task.actionCommand ? `
                                                <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 0.25rem; font-family: 'Consolas', 'Monaco', monospace; word-break: break-all;">
                                                    <i class="fas fa-code" style="margin-right: 0.25rem;"></i>${task.actionCommand}
                                                </div>
                                                ` : ''}
                                                ${task.hasStoredCredentials && task.storedUserName ? `
                                                <div style="font-size: 0.75rem; color: #f87171; margin-top: 0.25rem;">
                                                    <i class="fas fa-user" style="margin-right: 0.25rem;"></i>User: ${task.storedUserName}
                                                </div>
                                                ` : ''}
                                            </td>
                                            <td>
                                                <span class="status-badge status-${task.state === 'Running' || task.state === 'Ready' ? 'online' : 'offline'}">
                                                    ${task.state || 'Unknown'}
                                                </span>
                                            </td>
                                            <td style="color: #94a3b8;">${task.lastRunTime || 'Never'}</td>
                                            <td>
                                                ${task.lastTaskResult !== undefined && task.lastTaskResult !== 0 ? `
                                                <span style="color: #ef4444; font-weight: 600;">
                                                    <i class="fas fa-times-circle"></i> 0x${task.lastTaskResult.toString(16).toUpperCase()}
                                                </span>
                                                ` : task.lastTaskResult === 0 ? `
                                                <span style="color: #10b981;">
                                                    <i class="fas fa-check-circle"></i> Success
                                                </span>
                                                ` : '<span style="color: #64748b;">N/A</span>'}
                                            </td>
                                            <td style="color: #94a3b8;">${task.nextRunTime || 'N/A'}</td>
                                            <td>
                                                ${task.numberOfMissedRuns > 0 ? `
                                                <span style="color: #f59e0b; font-weight: 600;">
                                                    <i class="fas fa-exclamation-triangle"></i> ${task.numberOfMissedRuns}
                                                </span>
                                                ` : '<span style="color: #64748b;">0</span>'}
                                            </td>
                                        </tr>
                                        `;
                                    }).join('')}
                                    ${pageItems.length === 0 ? `
                                        <tr>
                                            <td colspan="6" style="text-align: center; color: #64748b; font-style: italic; padding: 2rem;">No tasks to display</td>
                                        </tr>
                                    ` : ''}
                                </tbody>
                            </table>
                        </div>
                        ${totalPages > 1 ? `
                        <div class="modal-pagination">
                            <button class="btn btn-sm btn-secondary" onclick="windowsServerAuditorInstance.changeAllTasksPage(-1)" ${currentPage === 0 ? 'disabled' : ''}>
                                <i class="fas fa-chevron-left"></i> Previous
                            </button>
                            <span class="modal-page-info">Page ${currentPage + 1} of ${totalPages}</span>
                            <button class="btn btn-sm btn-secondary" onclick="windowsServerAuditorInstance.changeAllTasksPage(1)" ${currentPage === totalPages - 1 ? 'disabled' : ''}>
                                Next <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    changeAllTasksPage(delta) {
        if (!this.selectedAllTasksModal) return;
        const scheduledTasks = this.reportData?.scheduledTasks || {};
        const allTasks = scheduledTasks.allTasks || [];
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(allTasks.length / pageSize));
        let page = this.selectedAllTasksModal.page || 0;
        page = Math.min(Math.max(page + delta, 0), totalPages - 1);
        this.selectedAllTasksModal.page = page;
        this.updateDisplay();
    }

    // Failed Tasks Modal
    showFailedTasksModal() {
        this.selectedFailedTasksModal = { page: 0 };
        this.showFailedTasksModalFlag = true;
        this.lockBodyScroll();
        this.updateDisplay();
    }

    closeFailedTasksModal() {
        this.showFailedTasksModalFlag = false;
        this.selectedFailedTasksModal = null;
        this.unlockBodyScroll();
        this.updateDisplay();
    }

    renderFailedTasksModal() {
        if (!this.showFailedTasksModalFlag) return '';
        const scheduledTasks = this.reportData?.scheduledTasks || {};
        const failedTasks = scheduledTasks.failedTasks || [];
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(failedTasks.length / pageSize));
        const currentPage = Math.min(Math.max((this.selectedFailedTasksModal?.page || 0), 0), totalPages - 1);
        const start = currentPage * pageSize;
        const pageItems = failedTasks.slice(start, start + pageSize);

        return `
            <div class="modal-overlay" onclick="windowsServerAuditorInstance.closeFailedTasksModal()">
                <div class="modal-container modal-wide" onclick="event.stopPropagation()">
                    <div class="modal-header-compact">
                        <div class="modal-title-section">
                            <div class="modal-icon-compact" style="background: rgba(239, 68, 68, 0.15); color: #f87171;">
                                <i class="fas fa-exclamation-circle"></i>
                            </div>
                            <div class="modal-title-info">
                                <h3>Failed Tasks</h3>
                                <p class="modal-description">${failedTasks.length} failed tasks</p>
                            </div>
                        </div>
                        <button class="modal-close-compact" onclick="windowsServerAuditorInstance.closeFailedTasksModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body-compact">
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th>Task Name</th>
                                        <th style="width: 120px;">State</th>
                                        <th style="width: 180px;">Last Run Time</th>
                                        <th style="width: 120px;">Last Result</th>
                                        <th style="width: 180px;">Next Run Time</th>
                                        <th style="width: 100px;">Missed Runs</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${pageItems.map(task => {
                                        const flags = [];
                                        if (task.runsAsSystem) {
                                            flags.push({ icon: 'fa-shield-alt', color: '#3b82f6', tooltip: 'Runs as SYSTEM' });
                                        }
                                        if (task.runsPowerShellOrCmd) {
                                            flags.push({ icon: task.actionType === 'PowerShell' ? 'fa-terminal' : 'fa-window-maximize', color: '#f59e0b', tooltip: `Runs ${task.actionType || 'PowerShell/CMD'}` });
                                        }
                                        if (task.hasStoredCredentials) {
                                            flags.push({ icon: 'fa-key', color: '#ef4444', tooltip: `Stored credentials: ${task.storedUserName || 'N/A'}` });
                                        }
                                        return `
                                        <tr>
                                            <td>
                                                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                                                    <div style="font-weight: 600; color: #e2e8f0;">${task.taskName || 'N/A'}</div>
                                                    ${flags.length > 0 ? flags.map(flag => `
                                                        <span class="task-flag" data-tooltip="${flag.tooltip}" style="display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.125rem 0.375rem; background: rgba(${flag.color === '#3b82f6' ? '59, 130, 246' : flag.color === '#f59e0b' ? '245, 158, 11' : '239, 68, 68'}, 0.15); border: 1px solid rgba(${flag.color === '#3b82f6' ? '59, 130, 246' : flag.color === '#f59e0b' ? '245, 158, 11' : '239, 68, 68'}, 0.3); border-radius: 4px; color: ${flag.color}; font-size: 0.6875rem; cursor: help;">
                                                            <i class="fas ${flag.icon}"></i>
                                                        </span>
                                                    `).join('') : ''}
                                                </div>
                                                ${task.taskPath && task.taskPath !== '\\' ? `
                                                <div style="font-size: 0.75rem; color: #64748b; font-family: 'Consolas', 'Monaco', monospace;">${task.taskPath}</div>
                                                ` : ''}
                                                ${task.actionCommand ? `
                                                <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 0.25rem; font-family: 'Consolas', 'Monaco', monospace; word-break: break-all;">
                                                    <i class="fas fa-code" style="margin-right: 0.25rem;"></i>${task.actionCommand}
                                                </div>
                                                ` : ''}
                                                ${task.hasStoredCredentials && task.storedUserName ? `
                                                <div style="font-size: 0.75rem; color: #f87171; margin-top: 0.25rem;">
                                                    <i class="fas fa-user" style="margin-right: 0.25rem;"></i>User: ${task.storedUserName}
                                                </div>
                                                ` : ''}
                                            </td>
                                            <td>
                                                <span class="status-badge status-${task.state === 'Running' || task.state === 'Ready' ? 'online' : 'offline'}">
                                                    ${task.state || 'Unknown'}
                                                </span>
                                            </td>
                                            <td style="color: #94a3b8;">${task.lastRunTime || 'Never'}</td>
                                            <td>
                                                <span style="color: #ef4444; font-weight: 600;">
                                                    <i class="fas fa-times-circle"></i> ${task.lastTaskResult !== undefined ? `0x${task.lastTaskResult.toString(16).toUpperCase()}` : 'N/A'}
                                                </span>
                                            </td>
                                            <td style="color: #94a3b8;">${task.nextRunTime || 'N/A'}</td>
                                            <td>
                                                ${task.numberOfMissedRuns > 0 ? `
                                                <span style="color: #f59e0b; font-weight: 600;">
                                                    <i class="fas fa-exclamation-triangle"></i> ${task.numberOfMissedRuns}
                                                </span>
                                                ` : '<span style="color: #64748b;">0</span>'}
                                            </td>
                                        </tr>
                                        `;
                                    }).join('')}
                                    ${pageItems.length === 0 ? `
                                        <tr>
                                            <td colspan="6" style="text-align: center; color: #64748b; font-style: italic; padding: 2rem;">No failed tasks to display</td>
                                        </tr>
                                    ` : ''}
                                </tbody>
                            </table>
                        </div>
                        ${totalPages > 1 ? `
                        <div class="modal-pagination">
                            <button class="btn btn-sm btn-secondary" onclick="windowsServerAuditorInstance.changeFailedTasksPage(-1)" ${currentPage === 0 ? 'disabled' : ''}>
                                <i class="fas fa-chevron-left"></i> Previous
                            </button>
                            <span class="modal-page-info">Page ${currentPage + 1} of ${totalPages}</span>
                            <button class="btn btn-sm btn-secondary" onclick="windowsServerAuditorInstance.changeFailedTasksPage(1)" ${currentPage === totalPages - 1 ? 'disabled' : ''}>
                                Next <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    changeFailedTasksPage(delta) {
        if (!this.selectedFailedTasksModal) return;
        const scheduledTasks = this.reportData?.scheduledTasks || {};
        const failedTasks = scheduledTasks.failedTasks || [];
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(failedTasks.length / pageSize));
        let page = this.selectedFailedTasksModal.page || 0;
        page = Math.min(Math.max(page + delta, 0), totalPages - 1);
        this.selectedFailedTasksModal.page = page;
        this.updateDisplay();
    }

    // TEMP & TMP Environment Modal
    showTempEnvironmentModal() {
        this.showTempEnvironmentModalFlag = true;
        this.lockBodyScroll();
        this.updateDisplay();
    }

    closeTempEnvironmentModal() {
        this.showTempEnvironmentModalFlag = false;
        this.unlockBodyScroll();
        this.updateDisplay();
    }

    renderTempEnvironmentModal() {
        if (!this.showTempEnvironmentModalFlag) return '';
        const environmentPaths = this.reportData?.environmentPaths || {};
        const tempConfig = environmentPaths.tempConfig || {};

        return `
            <div class="modal-overlay" onclick="windowsServerAuditorInstance.closeTempEnvironmentModal()">
                <div class="modal-container modal-wide" onclick="event.stopPropagation()">
                    <div class="modal-header-compact">
                        <div class="modal-title-section">
                            <div class="modal-icon-compact" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24;">
                                <i class="fas fa-thermometer-half"></i>
                            </div>
                            <div class="modal-title-info">
                                <h3>TEMP & TMP Environment</h3>
                                <p class="modal-description">Temporary directory configuration</p>
                            </div>
                        </div>
                        <button class="modal-close-compact" onclick="windowsServerAuditorInstance.closeTempEnvironmentModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body-compact">
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th style="width: 250px;">Property</th>
                                        <th>Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style="color: #94a3b8;">TEMP Directory</td>
                                        <td style="font-family: 'Consolas', 'Monaco', monospace; color: #e2e8f0; font-weight: 600;">${tempConfig.tempDirectory || 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #94a3b8;">TMP Directory</td>
                                        <td style="font-family: 'Consolas', 'Monaco', monospace; color: #e2e8f0; font-weight: 600;">${tempConfig.tmpDirectory || 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #94a3b8;">TEMP and TMP Match</td>
                                        <td>
                                            <span style="color: ${tempConfig.tempTmpMatch ? '#10b981' : '#f59e0b'}; font-weight: 600;">
                                                <i class="fas fa-${tempConfig.tempTmpMatch ? 'check' : 'times'}"></i> ${tempConfig.tempTmpMatch ? 'Yes' : 'No'}
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="color: #94a3b8;">On System Drive</td>
                                        <td>
                                            <span style="color: ${tempConfig.tempOnSystemDrive ? '#10b981' : '#64748b'}; font-weight: 600;">
                                                <i class="fas fa-${tempConfig.tempOnSystemDrive ? 'check' : 'times'}"></i> ${tempConfig.tempOnSystemDrive ? 'Yes' : 'No'}
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="color: #94a3b8;">On Network Share</td>
                                        <td>
                                            <span style="color: ${tempConfig.tempOnNetworkShare ? '#f59e0b' : '#10b981'}; font-weight: 600;">
                                                <i class="fas fa-${tempConfig.tempOnNetworkShare ? 'exclamation-triangle' : 'check'}"></i> ${tempConfig.tempOnNetworkShare ? 'Yes' : 'No'}
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Directory Health Modal
    showDirectoryHealthModal() {
        this.showDirectoryHealthModalFlag = true;
        this.lockBodyScroll();
        this.updateDisplay();
    }

    closeDirectoryHealthModal() {
        this.showDirectoryHealthModalFlag = false;
        this.unlockBodyScroll();
        this.updateDisplay();
    }

    renderDirectoryHealthModal() {
        if (!this.showDirectoryHealthModalFlag) return '';
        const environmentPaths = this.reportData?.environmentPaths || {};
        const tempHealth = environmentPaths.tempHealth || {};

        return `
            <div class="modal-overlay" onclick="windowsServerAuditorInstance.closeDirectoryHealthModal()">
                <div class="modal-container modal-wide" onclick="event.stopPropagation()">
                    <div class="modal-header-compact">
                        <div class="modal-title-section">
                            <div class="modal-icon-compact" style="background: rgba(16, 185, 129, 0.15); color: #34d399;">
                                <i class="fas fa-heartbeat"></i>
                            </div>
                            <div class="modal-title-info">
                                <h3>Directory Health</h3>
                                <p class="modal-description">TEMP directory health metrics</p>
                            </div>
                        </div>
                        <button class="modal-close-compact" onclick="windowsServerAuditorInstance.closeDirectoryHealthModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body-compact">
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th style="width: 250px;">Property</th>
                                        <th>Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style="color: #94a3b8;">
                                            <i class="fas fa-hdd" style="color: #34d399; margin-right: 0.5rem;"></i>Free Space
                                        </td>
                                        <td style="color: #e2e8f0; font-weight: 600;">${tempHealth.freeSpace || 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #94a3b8;">
                                            <i class="fas fa-file" style="color: #60a5fa; margin-right: 0.5rem;"></i>File Count
                                        </td>
                                        <td style="color: #e2e8f0; font-weight: 600;">${tempHealth.fileCount || 0}</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #94a3b8;">
                                            <i class="fas fa-clock" style="color: ${(tempHealth.oldestFileAge || 0) > 90 ? '#fbbf24' : '#34d399'}; margin-right: 0.5rem;"></i>Oldest File Age
                                        </td>
                                        <td style="color: ${(tempHealth.oldestFileAge || 0) > 90 ? '#fbbf24' : '#34d399'}; font-weight: 600;">${tempHealth.oldestFileAge || 0} days</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #94a3b8;">
                                            <i class="fas fa-${tempHealth.writableByEveryone ? 'unlock' : 'lock'}" style="color: ${tempHealth.writableByEveryone ? '#f87171' : '#34d399'}; margin-right: 0.5rem;"></i>Writable by Everyone
                                        </td>
                                        <td style="color: ${tempHealth.writableByEveryone ? '#f87171' : '#34d399'}; font-weight: 600;">
                                            <i class="fas fa-${tempHealth.writableByEveryone ? 'exclamation-triangle' : 'check'}"></i> ${tempHealth.writableByEveryone ? 'Yes' : 'No'}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="color: #94a3b8;">
                                            <i class="fas fa-${tempHealth.cleanupRecommended ? 'exclamation-triangle' : 'check-circle'}" style="color: ${tempHealth.cleanupRecommended ? '#fbbf24' : '#34d399'}; margin-right: 0.5rem;"></i>Cleanup Recommended
                                        </td>
                                        <td style="color: ${tempHealth.cleanupRecommended ? '#fbbf24' : '#34d399'}; font-weight: 600;">
                                            <i class="fas fa-${tempHealth.cleanupRecommended ? 'exclamation-triangle' : 'check'}"></i> ${tempHealth.cleanupRecommended ? 'Yes' : 'No'}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // PATH Order Analysis Modal
    showPathOrderAnalysisModal() {
        this.showPathOrderAnalysisModalFlag = true;
        this.lockBodyScroll();
        this.updateDisplay();
    }

    closePathOrderAnalysisModal() {
        this.showPathOrderAnalysisModalFlag = false;
        this.unlockBodyScroll();
        this.updateDisplay();
    }

    renderPathOrderAnalysisModal() {
        if (!this.showPathOrderAnalysisModalFlag) return '';
        const environmentPaths = this.reportData?.environmentPaths || {};
        const pathOrderAnalysis = environmentPaths.pathOrderAnalysis || {};

        return `
            <div class="modal-overlay" onclick="windowsServerAuditorInstance.closePathOrderAnalysisModal()">
                <div class="modal-container modal-wide" onclick="event.stopPropagation()">
                    <div class="modal-header-compact">
                        <div class="modal-title-section">
                            <div class="modal-icon-compact" style="background: rgba(139, 92, 246, 0.15); color: #a78bfa;">
                                <i class="fas fa-sort-amount-down"></i>
                            </div>
                            <div class="modal-title-info">
                                <h3>PATH Order Analysis</h3>
                                <p class="modal-description">PATH ordering and shadowing analysis</p>
                            </div>
                        </div>
                        <button class="modal-close-compact" onclick="windowsServerAuditorInstance.closePathOrderAnalysisModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body-compact">
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th style="width: 250px;">Property</th>
                                        <th>Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style="color: #94a3b8;">System32 First in PATH</td>
                                        <td>
                                            <span style="color: ${pathOrderAnalysis.system32FirstInPath ? '#10b981' : '#ef4444'}; font-weight: 600;">
                                                <i class="fas fa-${pathOrderAnalysis.system32FirstInPath ? 'check' : 'times'}"></i> ${pathOrderAnalysis.system32FirstInPath ? 'Yes' : 'No'}
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="color: #94a3b8;">User PATH Precedes System PATH</td>
                                        <td>
                                            <span style="color: ${pathOrderAnalysis.userPathPrecedesSystemPath ? '#f59e0b' : '#10b981'}; font-weight: 600;">
                                                <i class="fas fa-${pathOrderAnalysis.userPathPrecedesSystemPath ? 'exclamation-triangle' : 'check'}"></i> ${pathOrderAnalysis.userPathPrecedesSystemPath ? 'Yes' : 'No'}
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="color: #94a3b8;">Executable Shadowing Risk</td>
                                        <td>
                                            <span style="color: ${pathOrderAnalysis.executableShadowingRisk ? '#f59e0b' : '#10b981'}; font-weight: 600;">
                                                <i class="fas fa-${pathOrderAnalysis.executableShadowingRisk ? 'exclamation-triangle' : 'check'}"></i> ${pathOrderAnalysis.executableShadowingRisk ? 'Yes' : 'No'}
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        ${pathOrderAnalysis.shadowingExample ? `
                        <div style="margin-top: 1rem; padding: 1rem; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 0.5rem;">
                            <div style="color: #fbbf24; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.75rem;">Shadowing Example:</div>
                            <div style="font-family: 'Consolas', 'Monaco', monospace; font-size: 0.875rem; color: #e2e8f0; margin-bottom: 0.5rem; padding: 0.5rem; background: rgba(15, 23, 42, 0.5); border-radius: 0.25rem;">${pathOrderAnalysis.shadowingExample.shadowing || 'N/A'}</div>
                            <div style="color: #94a3b8; font-size: 0.75rem; text-align: center; margin: 0.5rem 0;">
                                <i class="fas fa-arrow-down"></i> shadows <i class="fas fa-arrow-down"></i>
                            </div>
                            <div style="font-family: 'Consolas', 'Monaco', monospace; font-size: 0.875rem; color: #e2e8f0; padding: 0.5rem; background: rgba(15, 23, 42, 0.5); border-radius: 0.25rem;">${pathOrderAnalysis.shadowingExample.shadowed || 'N/A'}</div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    // PATH Hygiene Checks Modal
    showPathHygieneChecksModal() {
        this.showPathHygieneChecksModalFlag = true;
        this.lockBodyScroll();
        this.updateDisplay();
    }

    closePathHygieneChecksModal() {
        this.showPathHygieneChecksModalFlag = false;
        this.unlockBodyScroll();
        this.updateDisplay();
    }

    renderPathHygieneChecksModal() {
        if (!this.showPathHygieneChecksModalFlag) return '';
        const environmentPaths = this.reportData?.environmentPaths || {};
        const pathHygieneChecks = environmentPaths.pathHygieneChecks || {};

        return `
            <div class="modal-overlay" onclick="windowsServerAuditorInstance.closePathHygieneChecksModal()">
                <div class="modal-container modal-wide" onclick="event.stopPropagation()">
                    <div class="modal-header-compact">
                        <div class="modal-title-section">
                            <div class="modal-icon-compact" style="background: rgba(16, 185, 129, 0.15); color: #34d399;">
                                <i class="fas fa-shield-alt"></i>
                            </div>
                            <div class="modal-title-info">
                                <h3>PATH Hygiene Checks</h3>
                                <p class="modal-description">PATH entry validation and hygiene</p>
                            </div>
                        </div>
                        <button class="modal-close-compact" onclick="windowsServerAuditorInstance.closePathHygieneChecksModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body-compact">
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th style="width: 250px;">Property</th>
                                        <th>Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style="color: #94a3b8;">Duplicate Entries</td>
                                        <td>
                                            <span style="color: ${pathHygieneChecks.hasDuplicatePathEntries ? '#ef4444' : '#10b981'}; font-weight: 600;">
                                                <i class="fas fa-${pathHygieneChecks.hasDuplicatePathEntries ? 'times' : 'check'}"></i> ${pathHygieneChecks.hasDuplicatePathEntries ? 'Yes' : 'No'}
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="color: #94a3b8;">Trailing Spaces</td>
                                        <td>
                                            <span style="color: ${pathHygieneChecks.hasTrailingSpaces ? '#ef4444' : '#10b981'}; font-weight: 600;">
                                                <i class="fas fa-${pathHygieneChecks.hasTrailingSpaces ? 'times' : 'check'}"></i> ${pathHygieneChecks.hasTrailingSpaces ? 'Yes' : 'No'}
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="color: #94a3b8;">Invalid Characters</td>
                                        <td>
                                            <span style="color: ${pathHygieneChecks.hasInvalidChars ? '#ef4444' : '#10b981'}; font-weight: 600;">
                                                <i class="fas fa-${pathHygieneChecks.hasInvalidChars ? 'times' : 'check'}"></i> ${pathHygieneChecks.hasInvalidChars ? 'Yes' : 'No'}
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="color: #94a3b8;">Relative Paths</td>
                                        <td>
                                            <span style="color: ${pathHygieneChecks.hasRelativePathEntries ? '#ef4444' : '#10b981'}; font-weight: 600;">
                                                <i class="fas fa-${pathHygieneChecks.hasRelativePathEntries ? 'times' : 'check'}"></i> ${pathHygieneChecks.hasRelativePathEntries ? 'Yes' : 'No'}
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="color: #94a3b8;">Root Drive Paths</td>
                                        <td>
                                            <span style="color: ${pathHygieneChecks.hasRootDrivePaths ? '#ef4444' : '#10b981'}; font-weight: 600;">
                                                <i class="fas fa-${pathHygieneChecks.hasRootDrivePaths ? 'times' : 'check'}"></i> ${pathHygieneChecks.hasRootDrivePaths ? 'Yes' : 'No'}
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="color: #94a3b8;">TEMP in PATH</td>
                                        <td>
                                            <span style="color: ${pathHygieneChecks.hasTempInPath ? '#ef4444' : '#10b981'}; font-weight: 600;">
                                                <i class="fas fa-${pathHygieneChecks.hasTempInPath ? 'exclamation-triangle' : 'check'}"></i> ${pathHygieneChecks.hasTempInPath ? 'Yes' : 'No'}
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    showGroupMembersModal(groupName, members, description) {
        this.selectedGroupModal = { name: groupName, members: members, description: description, page: 0 };
        this.showGroupMembersModalFlag = true;
        this.updateDisplay();
    }

    closeGroupMembersModal() {
        this.showGroupMembersModalFlag = false;
        this.selectedGroupModal = null;
        this.updateDisplay();
    }

    setGroupMembersModalPage(page) {
        if (this.selectedGroupModal) {
            this.selectedGroupModal.page = page;
            this.updateDisplay();
        }
    }

    renderGroupMembersModal() {
        if (!this.showGroupMembersModalFlag || !this.selectedGroupModal) return '';
        
        const { name, members, description } = this.selectedGroupModal;
        const membersArray = Array.isArray(members) ? members : [];
        const pageSize = 50;
        const totalPages = Math.max(1, Math.ceil(membersArray.length / pageSize));
        const currentPage = Math.min(Math.max(this.selectedGroupModal.page || 0, 0), totalPages - 1);
        const start = currentPage * pageSize;
        const pageItems = membersArray.slice(start, start + pageSize);
        
        return `
            <div class="modal-overlay" onclick="windowsServerAuditorInstance.closeGroupMembersModal()">
                <div class="modal-container modal-wide" onclick="event.stopPropagation()">
                    <div class="modal-header-compact">
                        <div class="modal-title-section">
                            <div class="modal-icon-compact" style="background: rgba(16, 185, 129, 0.15); color: #34d399;">
                                <i class="fas fa-users"></i>
                            </div>
                            <div class="modal-title-info">
                                <h3>${name}</h3>
                                <p class="modal-description">${description && description !== '-' ? description : 'Group Members'} • ${membersArray.length} ${membersArray.length === 1 ? 'member' : 'members'} total</p>
                            </div>
                        </div>
                        <button class="modal-close-compact" onclick="windowsServerAuditorInstance.closeGroupMembersModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body-compact" style="display: flex; flex-direction: column; max-height: 70vh;">
                        ${membersArray.length > 0 ? `
                            <div class="table-container-modern" style="flex: 1; overflow-y: auto; margin-bottom: 1rem;">
                                <table class="table-compact">
                                    <thead style="position: sticky; top: 0; z-index: 10; background: #1e293b;">
                                        <tr>
                                            <th style="width: 50px;">#</th>
                                            <th>Member Name</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${pageItems.map((member, index) => `
                                            <tr>
                                                <td style="color: #94a3b8; text-align: center;">${start + index + 1}</td>
                                                <td>
                                                    <i class="fas fa-user-circle" style="color: #34d399; margin-right: 0.5rem;"></i>
                                                    ${member}
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                            ${totalPages > 1 ? `
                                <div class="modal-pagination" style="border-top: 1px solid #334155; padding-top: 1rem; margin-top: auto;">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <div style="color: #94a3b8; font-size: 0.875rem;">
                                            Showing ${start + 1}-${Math.min(start + pageSize, membersArray.length)} of ${membersArray.length} members
                                        </div>
                                        <div style="display: flex; gap: 0.5rem; align-items: center;">
                                            <button class="btn-icon" onclick="windowsServerAuditorInstance.setGroupMembersModalPage(${Math.max(0, currentPage - 1)})" ${currentPage === 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                                                <i class="fas fa-chevron-left"></i>
                                            </button>
                                            <span style="color: #e2e8f0; font-size: 0.875rem; min-width: 80px; text-align: center;">
                                                Page ${currentPage + 1} of ${totalPages}
                                            </span>
                                            <button class="btn-icon" onclick="windowsServerAuditorInstance.setGroupMembersModalPage(${Math.min(totalPages - 1, currentPage + 1)})" ${currentPage >= totalPages - 1 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                                                <i class="fas fa-chevron-right"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                        ` : `
                            <div class="modal-empty-state" style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 3rem;">
                                <i class="fas fa-users-slash" style="font-size: 3rem; color: #94a3b8; margin-bottom: 1rem;"></i>
                                <span style="color: #94a3b8; font-size: 1rem;">No members assigned to this group</span>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    openEventLogModal(type) {
        this.selectedEventLogModal = { page: 0 };
        this.showEventLogModalFlag = true;
        this.eventLogModalType = type; // 'system' or 'application'
        this.eventLogFilter = 'all';
        this.updateDisplay();
    }

    closeEventLogModal() {
        this.showEventLogModalFlag = false;
        this.eventLogModalType = null;
        this.eventLogFilter = 'all';
        this.selectedEventLogModal = null;
        this.updateDisplay();
    }

    setEventLogFilter(filter) {
        this.eventLogFilter = filter;
        this.selectedEventLogModal = { page: 0 }; // Reset to first page when filter changes
        this.updateDisplay();
    }

    changeEventLogPage(delta) {
        if (!this.selectedEventLogModal) return;
        const eventLogOverview = this.reportData?.eventLogOverview || {};
        const allEvents = this.eventLogModalType === 'system' 
            ? (eventLogOverview.systemErrors || [])
            : (eventLogOverview.appErrors || []);
        
        // Filter events based on selected period
        let filteredEvents = allEvents;
        const now = new Date();
        
        if (this.eventLogFilter !== 'all') {
            const hours = this.eventLogFilter === '24h' ? 24 : 
                         this.eventLogFilter === '7d' ? 24 * 7 :
                         this.eventLogFilter === '15d' ? 24 * 15 : 24 * 30;
            const cutoffTime = new Date(now.getTime() - hours * 60 * 60 * 1000);
            
            filteredEvents = allEvents.filter(event => {
                if (!event.time) return false;
                const eventTime = new Date(event.time);
                return eventTime >= cutoffTime;
            });
        }
        
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
        let page = this.selectedEventLogModal.page || 0;
        page = Math.min(Math.max(page + delta, 0), totalPages - 1);
        this.selectedEventLogModal.page = page;
        this.updateEventLogModalPage();
    }

    updateEventLogModalPage() {
        if (!this.selectedEventLogModal || !this.eventLogModalType) return;
        
        const eventLogOverview = this.reportData?.eventLogOverview || {};
        const allEvents = this.eventLogModalType === 'system' 
            ? (eventLogOverview.systemErrors || [])
            : (eventLogOverview.appErrors || []);
        
        // Filter events based on selected period
        let filteredEvents = allEvents;
        const now = new Date();
        
        if (this.eventLogFilter !== 'all') {
            const hours = this.eventLogFilter === '24h' ? 24 : 
                         this.eventLogFilter === '7d' ? 24 * 7 :
                         this.eventLogFilter === '15d' ? 24 * 15 : 24 * 30;
            const cutoffTime = new Date(now.getTime() - hours * 60 * 60 * 1000);
            
            filteredEvents = allEvents.filter(event => {
                if (!event.time) return false;
                const eventTime = new Date(event.time);
                return eventTime >= cutoffTime;
            });
        }
        
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
        const currentPage = Math.min(Math.max(this.selectedEventLogModal.page || 0, 0), totalPages - 1);
        const start = currentPage * pageSize;
        const pageItems = filteredEvents.slice(start, start + pageSize);
        
        const eventColor = this.eventLogModalType === 'system' ? '#ef4444' : '#f59e0b';
        
        const tbody = document.getElementById('event-log-modal-body');
        const pageInfo = document.getElementById('event-log-modal-page-info');
        const prevBtn = document.getElementById('event-log-prev-btn');
        const nextBtn = document.getElementById('event-log-next-btn');
        const paginationContainer = document.getElementById('event-log-pagination');
        
        if (!tbody) {
            this.updateDisplay();
            return;
        }
        
        // Update table body
        if (pageItems.length > 0) {
            tbody.innerHTML = pageItems.map((error, index) => {
                const errorData = {
                    time: error.time || 'N/A',
                    source: error.source || 'N/A',
                    level: error.level || 'Error',
                    id: error.id || 'N/A',
                    message: error.message || 'N/A'
                };
                const errorJson = encodeURIComponent(JSON.stringify(errorData));
                return `
                <tr onclick="windowsServerAuditorInstance.openEventDetailsModalFromString(decodeURIComponent('${errorJson}'), '${this.eventLogModalType}')" style="cursor: pointer; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='rgba(59, 130, 246, 0.1)'" onmouseout="this.style.backgroundColor='transparent'">
                    <td>${error.time || 'N/A'}</td>
                    <td>${error.source || 'N/A'}</td>
                    <td><span style="color: ${eventColor};">${error.level || 'Error'}</span></td>
                    <td>${error.id || 'N/A'}</td>
                    <td style="max-width: 500px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(error.message || '').replace(/"/g, '&quot;')}">${error.message || 'N/A'}</td>
                </tr>
            `;
            }).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #64748b; font-style: italic; padding: 2rem;">No events found for the selected period</td></tr>';
        }
        
        // Update pagination
        if (pageInfo) {
            pageInfo.textContent = `Page ${currentPage + 1} of ${totalPages}`;
        }
        
        if (prevBtn) {
            prevBtn.disabled = currentPage === 0;
        }
        
        if (nextBtn) {
            nextBtn.disabled = currentPage === totalPages - 1;
        }
        
        // Show/hide pagination
        if (paginationContainer) {
            if (totalPages > 1) {
                paginationContainer.style.display = 'flex';
            } else {
                paginationContainer.style.display = 'none';
            }
        }
        
        // Update modal description
        const modalDescription = document.querySelector('.modal-description');
        if (modalDescription) {
            modalDescription.textContent = `${filteredEvents.length} events (${allEvents.length} total)`;
        }
    }

    renderEventLogModal() {
        if (!this.showEventLogModalFlag || !this.eventLogModalType) return '';

        const eventLogOverview = this.reportData?.eventLogOverview || {};
        const allEvents = this.eventLogModalType === 'system' 
            ? (eventLogOverview.systemErrors || [])
            : (eventLogOverview.appErrors || []);

        // Filter events based on selected period
        let filteredEvents = allEvents;
        const now = new Date();
        
        if (this.eventLogFilter !== 'all') {
            const hours = this.eventLogFilter === '24h' ? 24 : 
                         this.eventLogFilter === '7d' ? 24 * 7 :
                         this.eventLogFilter === '15d' ? 24 * 15 : 24 * 30;
            const cutoffTime = new Date(now.getTime() - hours * 60 * 60 * 1000);
            
            filteredEvents = allEvents.filter(event => {
                if (!event.time) return false;
                const eventTime = new Date(event.time);
                return eventTime >= cutoffTime;
            });
        }

        // Pagination
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
        const currentPage = Math.min(Math.max((this.selectedEventLogModal?.page || 0), 0), totalPages - 1);
        const start = currentPage * pageSize;
        const pageItems = filteredEvents.slice(start, start + pageSize);

        const eventTypeLabel = this.eventLogModalType === 'system' ? 'System Errors' : 'Application Errors';
        const eventIcon = this.eventLogModalType === 'system' ? 'fa-exclamation-circle' : 'fa-bug';
        const eventColor = this.eventLogModalType === 'system' ? '#ef4444' : '#f59e0b';

        return `
            <div class="modal-overlay" onclick="windowsServerAuditorInstance.closeEventLogModal()">
                <div class="modal-container modal-wide" onclick="event.stopPropagation()">
                    <div class="modal-header-compact">
                        <div class="modal-title-section">
                            <div class="modal-icon-compact" style="color: ${eventColor};">
                                <i class="fas ${eventIcon}"></i>
                            </div>
                            <div class="modal-title-info">
                                <h3>${eventTypeLabel}</h3>
                                <p class="modal-description">${filteredEvents.length} events (${allEvents.length} total)</p>
                            </div>
                        </div>
                        <button class="modal-close-compact" onclick="windowsServerAuditorInstance.closeEventLogModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body-compact">
                        <!-- Filter Buttons - Compact Design -->
                        <div style="display: flex; gap: 0.25rem; justify-content: flex-end; padding: 0.375rem;">
                            <button onclick="windowsServerAuditorInstance.setEventLogFilter('all')" 
                                class="event-log-filter-btn ${this.eventLogFilter === 'all' ? 'active' : ''}"
                                style="background: ${this.eventLogFilter === 'all' ? 'rgba(59, 130, 246, 0.2)' : 'transparent'}; 
                                       border: 1px solid ${this.eventLogFilter === 'all' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.15)'}; 
                                       color: ${this.eventLogFilter === 'all' ? '#60a5fa' : '#94a3b8'}; 
                                       padding: 0.25rem 0.625rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: ${this.eventLogFilter === 'all' ? '600' : '500'}; cursor: pointer; transition: all 0.2s; white-space: nowrap; line-height: 1.2;">
                                <i class="fas fa-list" style="margin-right: 0.25rem; font-size: 0.6875rem;"></i>All
                            </button>
                            <button onclick="windowsServerAuditorInstance.setEventLogFilter('24h')" 
                                class="event-log-filter-btn ${this.eventLogFilter === '24h' ? 'active' : ''}"
                                style="background: ${this.eventLogFilter === '24h' ? 'rgba(59, 130, 246, 0.2)' : 'transparent'}; 
                                       border: 1px solid ${this.eventLogFilter === '24h' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.15)'}; 
                                       color: ${this.eventLogFilter === '24h' ? '#60a5fa' : '#94a3b8'}; 
                                       padding: 0.25rem 0.625rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: ${this.eventLogFilter === '24h' ? '600' : '500'}; cursor: pointer; transition: all 0.2s; white-space: nowrap; line-height: 1.2;">
                                <i class="fas fa-clock" style="margin-right: 0.25rem; font-size: 0.6875rem;"></i>24h
                            </button>
                            <button onclick="windowsServerAuditorInstance.setEventLogFilter('7d')" 
                                class="event-log-filter-btn ${this.eventLogFilter === '7d' ? 'active' : ''}"
                                style="background: ${this.eventLogFilter === '7d' ? 'rgba(59, 130, 246, 0.2)' : 'transparent'}; 
                                       border: 1px solid ${this.eventLogFilter === '7d' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.15)'}; 
                                       color: ${this.eventLogFilter === '7d' ? '#60a5fa' : '#94a3b8'}; 
                                       padding: 0.25rem 0.625rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: ${this.eventLogFilter === '7d' ? '600' : '500'}; cursor: pointer; transition: all 0.2s; white-space: nowrap; line-height: 1.2;">
                                <i class="fas fa-calendar-day" style="margin-right: 0.25rem; font-size: 0.6875rem;"></i>7d
                            </button>
                            <button onclick="windowsServerAuditorInstance.setEventLogFilter('15d')" 
                                class="event-log-filter-btn ${this.eventLogFilter === '15d' ? 'active' : ''}"
                                style="background: ${this.eventLogFilter === '15d' ? 'rgba(59, 130, 246, 0.2)' : 'transparent'}; 
                                       border: 1px solid ${this.eventLogFilter === '15d' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.15)'}; 
                                       color: ${this.eventLogFilter === '15d' ? '#60a5fa' : '#94a3b8'}; 
                                       padding: 0.25rem 0.625rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: ${this.eventLogFilter === '15d' ? '600' : '500'}; cursor: pointer; transition: all 0.2s; white-space: nowrap; line-height: 1.2;">
                                <i class="fas fa-calendar-week" style="margin-right: 0.25rem; font-size: 0.6875rem;"></i>15d
                            </button>
                            <button onclick="windowsServerAuditorInstance.setEventLogFilter('30d')" 
                                class="event-log-filter-btn ${this.eventLogFilter === '30d' ? 'active' : ''}"
                                style="background: ${this.eventLogFilter === '30d' ? 'rgba(59, 130, 246, 0.2)' : 'transparent'}; 
                                       border: 1px solid ${this.eventLogFilter === '30d' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.15)'}; 
                                       color: ${this.eventLogFilter === '30d' ? '#60a5fa' : '#94a3b8'}; 
                                       padding: 0.25rem 0.625rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: ${this.eventLogFilter === '30d' ? '600' : '500'}; cursor: pointer; transition: all 0.2s; white-space: nowrap; line-height: 1.2;">
                                <i class="fas fa-calendar" style="margin-right: 0.25rem; font-size: 0.6875rem;"></i>30d
                            </button>
                        </div>

                        <!-- Events Table -->
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>Source</th>
                                        <th>Level</th>
                                        <th>ID</th>
                                        <th>Message</th>
                                    </tr>
                                </thead>
                                <tbody id="event-log-modal-body">
                                    ${pageItems.length > 0 ? pageItems.map(error => {
                                        const errorData = {
                                            time: error.time || 'N/A',
                                            source: error.source || 'N/A',
                                            level: error.level || 'Error',
                                            id: error.id || 'N/A',
                                            message: error.message || 'N/A'
                                        };
                                        const errorJson = encodeURIComponent(JSON.stringify(errorData));
                                        return `
                                        <tr onclick="windowsServerAuditorInstance.openEventDetailsModalFromString(decodeURIComponent('${errorJson}'), '${this.eventLogModalType}')" style="cursor: pointer; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='rgba(59, 130, 246, 0.1)'" onmouseout="this.style.backgroundColor='transparent'">
                                            <td>${error.time || 'N/A'}</td>
                                            <td>${error.source || 'N/A'}</td>
                                            <td><span style="color: ${eventColor};">${error.level || 'Error'}</span></td>
                                            <td>${error.id || 'N/A'}</td>
                                            <td style="max-width: 500px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(error.message || '').replace(/"/g, '&quot;')}">${error.message || 'N/A'}</td>
                                        </tr>
                                    `;
                                    }).join('') : `
                                        <tr>
                                            <td colspan="5" style="text-align: center; color: #64748b; font-style: italic; padding: 2rem;">No events found for the selected period</td>
                                        </tr>
                                    `}
                                </tbody>
                            </table>
                        </div>
                        ${totalPages > 1 ? `
                        <div class="modal-pagination" id="event-log-pagination">
                            <button id="event-log-prev-btn" class="btn btn-sm btn-secondary" onclick="windowsServerAuditorInstance.changeEventLogPage(-1)" ${currentPage === 0 ? 'disabled' : ''}>
                                <i class="fas fa-chevron-left"></i> Previous
                            </button>
                            <span class="modal-page-info" id="event-log-modal-page-info">Page ${currentPage + 1} of ${totalPages}</span>
                            <button id="event-log-next-btn" class="btn btn-sm btn-secondary" onclick="windowsServerAuditorInstance.changeEventLogPage(1)" ${currentPage === totalPages - 1 ? 'disabled' : ''}>
                                Next <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                        ` : `
                        <div class="modal-pagination" id="event-log-pagination" style="display: none;">
                            <button id="event-log-prev-btn" class="btn btn-sm btn-secondary" onclick="windowsServerAuditorInstance.changeEventLogPage(-1)">
                                <i class="fas fa-chevron-left"></i> Previous
                            </button>
                            <span class="modal-page-info" id="event-log-modal-page-info">Page 1 of 1</span>
                            <button id="event-log-next-btn" class="btn btn-sm btn-secondary" onclick="windowsServerAuditorInstance.changeEventLogPage(1)">
                                Next <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    openEventDetailsModal(event, type) {
        this.selectedEventDetails = { event, type };
        this.showEventDetailsModalFlag = true;
        // Close the Event Log modal when opening details
        this.showEventLogModalFlag = false;
        this.updateDisplay();
    }

    openEventDetailsModalFromString(eventJsonString, type) {
        try {
            const event = JSON.parse(eventJsonString);
            this.openEventDetailsModal(event, type);
        } catch (e) {
            console.error('Error parsing event data:', e);
            console.error('Event JSON string:', eventJsonString);
        }
    }

    closeEventDetailsModal() {
        this.showEventDetailsModalFlag = false;
        this.selectedEventDetails = null;
        // Reopen the Event Log modal if it was open before
        if (this.eventLogModalType) {
            this.showEventLogModalFlag = true;
        }
        this.updateDisplay();
    }

    renderEventDetailsModal() {
        if (!this.showEventDetailsModalFlag || !this.selectedEventDetails) return '';

        const { event, type } = this.selectedEventDetails;
        const eventTypeLabel = type === 'system' ? 'System Error' : 'Application Error';
        const eventIcon = type === 'system' ? 'fa-exclamation-circle' : 'fa-bug';
        const eventColor = type === 'system' ? '#ef4444' : '#f59e0b';

        return `
            <div class="modal-overlay" onclick="windowsServerAuditorInstance.closeEventDetailsModal()">
                <div class="modal-container modal-wide" onclick="event.stopPropagation()">
                    <div class="modal-header-compact">
                        <div class="modal-title-section">
                            <div class="modal-icon-compact" style="color: ${eventColor};">
                                <i class="fas ${eventIcon}"></i>
                            </div>
                            <div class="modal-title-info">
                                <h3>${eventTypeLabel} Details</h3>
                                <p class="modal-description">Event ID: ${event.id || 'N/A'}</p>
                            </div>
                        </div>
                        <button class="modal-close-compact" onclick="windowsServerAuditorInstance.closeEventDetailsModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body-compact">
                        <div style="display: flex; flex-direction: column; gap: 1rem;">
                            <div style="padding: 1rem; background: rgba(15, 23, 42, 0.5); border-radius: 0.5rem; border: 1px solid rgba(59, 130, 246, 0.1);">
                                <div style="display: grid; grid-template-columns: 150px 1fr; gap: 0.75rem; align-items: start;">
                                    <div style="color: #94a3b8; font-size: 0.875rem; font-weight: 600;">Time:</div>
                                    <div style="color: #e2e8f0; font-size: 0.875rem;">${event.time || 'N/A'}</div>
                                    
                                    <div style="color: #94a3b8; font-size: 0.875rem; font-weight: 600;">Source:</div>
                                    <div style="color: #e2e8f0; font-size: 0.875rem;">${event.source || 'N/A'}</div>
                                    
                                    <div style="color: #94a3b8; font-size: 0.875rem; font-weight: 600;">Level:</div>
                                    <div style="color: ${eventColor}; font-size: 0.875rem; font-weight: 600;">${event.level || 'Error'}</div>
                                    
                                    <div style="color: #94a3b8; font-size: 0.875rem; font-weight: 600;">Event ID:</div>
                                    <div style="color: #e2e8f0; font-size: 0.875rem; font-family: 'Consolas', 'Monaco', monospace;">${event.id || 'N/A'}</div>
                                    
                                    <div style="color: #94a3b8; font-size: 0.875rem; font-weight: 600;">Message:</div>
                                    <div style="color: #e2e8f0; font-size: 0.875rem; white-space: pre-wrap; word-wrap: break-word; max-height: 400px; overflow-y: auto; padding: 0.75rem; background: rgba(0, 0, 0, 0.2); border-radius: 0.375rem; font-family: 'Consolas', 'Monaco', monospace; line-height: 1.5;">${event.message || 'N/A'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderProcessTree(processes, depth = 0, parentPath = []) {
        if (!processes || processes.length === 0) {
            return '<div style="color: #64748b; font-style: italic; padding: 1rem; text-align: center;">No processes found</div>';
        }

        let html = '';
        const maxDepth = 10;

        processes.forEach((proc, index) => {
            const isLast = index === processes.length - 1;
            const hasChildren = proc.children && proc.children.length > 0;
            const currentPath = [...parentPath, index];
            
            // Build tree connector
            let treeConnector = '';
            for (let i = 0; i < depth; i++) {
                const isLastInPath = i === depth - 1;
                const isLastInParent = currentPath[i] === (processes.length - 1);
                if (isLastInPath) {
                    treeConnector += isLast ? '└─' : '├─';
                } else {
                    // Check if parent path indicates this branch should continue
                    const parentIsLast = i < parentPath.length && parentPath[i] === (processes.length - 1);
                    treeConnector += parentIsLast ? '   ' : '│  ';
                }
            }
            
            // Color coding
            const cpuColor = proc.cpuPercent > 50 ? '#ef4444' : proc.cpuPercent > 20 ? '#f59e0b' : proc.cpuPercent > 5 ? '#3b82f6' : '#10b981';
            const memoryColor = proc.workingSetMB > 1000 ? '#ef4444' : proc.workingSetMB > 500 ? '#f59e0b' : '#10b981';
            
            // Format memory
            const memoryDisplay = proc.workingSetMB >= 1024 
                ? `${(proc.workingSetMB / 1024).toFixed(2)} GB` 
                : `${(proc.workingSetMB || 0).toFixed(2)} MB`;
            
            // Format username (extract from owner if needed)
            const username = proc.username && proc.username !== 'N/A' ? proc.username : (proc.owner && proc.owner !== 'N/A' ? proc.owner.split('\\').pop() : '-');
            const isElevated = proc.isElevated === true || proc.isElevated === 'True';
            
            // Determine status color based on status
            let statusColor = '#10b981'; // Default green
            if (proc.status === 'Suspended') {
                statusColor = '#f59e0b'; // Orange for suspended
            } else if (proc.status === 'Not Responding') {
                statusColor = '#ef4444'; // Red for not responding
            } else if (proc.status === 'Running') {
                statusColor = '#10b981'; // Green for running
            }
            
            html += `
                <div class="process-tree-row" data-pid="${proc.id}" data-depth="${depth}" style="display: grid; grid-template-columns: 30px minmax(150px, 1fr) minmax(200px, 2fr) 80px 80px minmax(120px, 1fr) 80px 100px 120px 100px 100px minmax(100px, 1fr) 120px; gap: 0.5rem; padding: 0.5rem 0.75rem; border-bottom: 1px solid rgba(51, 65, 85, 0.3); transition: background-color 0.2s; align-items: center; width: 100%;" onmouseover="this.style.backgroundColor='rgba(59, 130, 246, 0.08)'" onmouseout="this.style.backgroundColor='transparent'">
                    <div style="color: #64748b; font-size: 0.75rem; font-family: 'Consolas', 'Monaco', monospace; user-select: none;">${treeConnector || ''}</div>
                    <div style="color: #e2e8f0; font-weight: 500; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fas fa-cube" style="color: #60a5fa; font-size: 0.75rem;"></i>
                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${proc.name || 'N/A'}">${proc.name || 'N/A'}</span>
                    </div>
                    <div style="color: #94a3b8; font-family: 'Consolas', 'Monaco', monospace; font-size: 0.75rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${proc.path || 'N/A'}">${proc.path || '-'}</div>
                    <div style="color: #8b5cf6; font-weight: 600; font-family: 'Consolas', 'Monaco', monospace;">${proc.id}</div>
                    <div style="color: #60a5fa; font-weight: 500; font-family: 'Consolas', 'Monaco', monospace;">${proc.parentId || '-'}</div>
                    <div style="color: #94a3b8; font-family: 'Consolas', 'Monaco', monospace; font-size: 0.75rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${proc.owner || 'N/A'}">${username}</div>
                    <div style="color: ${isElevated ? '#ef4444' : '#10b981'}; font-weight: 600; font-size: 0.75rem; text-align: center;">
                        ${isElevated ? '<i class="fas fa-shield-alt" title="Elevated/Admin"></i>' : '-'}
                    </div>
                    <div style="color: ${cpuColor}; font-weight: 600; font-family: 'Consolas', 'Monaco', monospace;">${(proc.cpuPercent || 0).toFixed(2)}%</div>
                    <div style="color: ${memoryColor}; font-family: 'Consolas', 'Monaco', monospace;">${memoryDisplay}</div>
                    <div style="color: #94a3b8; font-family: 'Consolas', 'Monaco', monospace;">${proc.threadCount || 0}</div>
                    <div style="color: #94a3b8; font-family: 'Consolas', 'Monaco', monospace;">${proc.handleCount || 0}</div>
                    <div style="color: ${statusColor}; font-size: 0.75rem;">
                        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${statusColor}; margin-right: 0.375rem;"></span>
                        ${proc.status || 'Unknown'}
                    </div>
                    <div style="color: #64748b; font-size: 0.75rem;">${proc.priority || 'N/A'}</div>
                </div>
            `;
            
            // Render children recursively
            if (hasChildren && depth < maxDepth) {
                html += this.renderProcessTree(proc.children, depth + 1, currentPath);
            } else if (hasChildren && depth >= maxDepth) {
                html += `
                    <div style="display: grid; grid-template-columns: 30px minmax(150px, 1fr) minmax(200px, 2fr) 80px 80px minmax(120px, 1fr) 80px 100px 120px 100px 100px minmax(100px, 1fr) 120px; gap: 0.5rem; padding: 0.5rem 0.75rem; color: #64748b; font-style: italic; font-size: 0.75rem; width: 100%;">
                        <div style="color: #64748b; font-family: 'Consolas', 'Monaco', monospace;">${'│  '.repeat(depth)}└─</div>
                        <div><i class="fas fa-ellipsis-h" style="margin-right: 0.25rem;"></i>${proc.children.length} child process(es) (max depth reached)</div>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                    </div>
                `;
            }
        });

        return html;
    }

    openProcessTreeModal() {
        this.showProcessTreeModalFlag = true;
        this.selectedProcessTreeModal = { page: 0 };
        this.updateDisplay();
    }

    closeProcessTreeModal() {
        this.showProcessTreeModalFlag = false;
        this.selectedProcessTreeModal = null;
        this.updateDisplay();
    }

    changeProcessTreePage(delta) {
        if (!this.selectedProcessTreeModal) return;
        const totalProcesses = (this.reportData?.processTree?.processes || []).length;
        const pageSize = 20;
        const totalPages = Math.ceil(totalProcesses / pageSize);
        const newPage = this.selectedProcessTreeModal.page + delta;
        if (newPage >= 0 && newPage < totalPages) {
            this.selectedProcessTreeModal.page = newPage;
            this.updateProcessTreeModalPage();
        }
    }

    updateProcessTreeModalPage() {
        const modalBody = document.getElementById('process-tree-modal-body');
        const modalPagination = document.getElementById('process-tree-modal-pagination');
        if (!modalBody || !this.selectedProcessTreeModal) return;

        const allProcesses = this.reportData?.processTree?.processes || [];
        const pageSize = 20;
        const currentPage = this.selectedProcessTreeModal.page;
        const totalPages = Math.ceil(allProcesses.length / pageSize);
        const startIndex = currentPage * pageSize;
        const endIndex = Math.min(startIndex + pageSize, allProcesses.length);
        const pageProcesses = allProcesses.slice(startIndex, endIndex);

        modalBody.innerHTML = this.renderProcessTree(pageProcesses, 0);

        if (modalPagination) {
            const prevBtn = document.getElementById('process-tree-prev-btn');
            const nextBtn = document.getElementById('process-tree-next-btn');
            const pageInfo = document.getElementById('process-tree-modal-page-info');
            
            if (prevBtn) prevBtn.disabled = currentPage === 0;
            if (nextBtn) nextBtn.disabled = currentPage === totalPages - 1;
            if (pageInfo) pageInfo.textContent = `Page ${currentPage + 1} of ${totalPages}`;
        }
    }

    renderProcessTreeModal() {
        if (!this.showProcessTreeModalFlag) return '';

        const allProcesses = this.reportData?.processTree?.processes || [];
        const pageSize = 20;
        const currentPage = this.selectedProcessTreeModal?.page || 0;
        const totalPages = Math.ceil(allProcesses.length / pageSize);
        const startIndex = currentPage * pageSize;
        const endIndex = Math.min(startIndex + pageSize, allProcesses.length);
        const pageProcesses = allProcesses.slice(startIndex, endIndex);

        return `
            <div class="modal-overlay" onclick="windowsServerAuditorInstance.closeProcessTreeModal()">
                <div class="modal-container modal-wide" onclick="event.stopPropagation()">
                    <div class="modal-header-compact">
                        <div class="modal-title-section">
                            <div class="modal-icon-compact" style="color: #8b5cf6;">
                                <i class="fas fa-sitemap"></i>
                            </div>
                            <div class="modal-title-info">
                                <h3>Process Tree</h3>
                                <p class="modal-description">All processes (${allProcesses.length} total)</p>
                            </div>
                        </div>
                        <button class="modal-close-compact" onclick="windowsServerAuditorInstance.closeProcessTreeModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body-compact">
                        <div style="background: rgba(15, 23, 42, 0.5); border-radius: 0.5rem; border: 1px solid #334155; padding: 0; width: 100%;">
                            <div class="process-tree-header" style="display: grid; grid-template-columns: 30px minmax(150px, 1fr) minmax(200px, 2fr) 80px 80px minmax(120px, 1fr) 80px 100px 120px 100px 100px minmax(100px, 1fr) 120px; gap: 0.5rem; padding: 0.75rem; background: rgba(30, 41, 59, 0.8); border-bottom: 1px solid #334155; font-size: 0.75rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; width: 100%;">
                                <div></div>
                                <div>Process Name</div>
                                <div>Path</div>
                                <div>PID</div>
                                <div>PPID</div>
                                <div>Username</div>
                                <div>Elevated</div>
                                <div>CPU %</div>
                                <div>Memory</div>
                                <div>Threads</div>
                                <div>Handles</div>
                                <div>Status</div>
                                <div>Priority</div>
                            </div>
                            <div id="process-tree-modal-body" style="max-height: 600px; overflow-y: auto; font-family: 'Consolas', 'Monaco', monospace; font-size: 0.8125rem; width: 100%;">
                                ${this.renderProcessTree(pageProcesses, 0)}
                            </div>
                        </div>
                        ${totalPages > 1 ? `
                        <div class="modal-pagination" id="process-tree-modal-pagination">
                            <button id="process-tree-prev-btn" class="btn btn-sm btn-secondary" onclick="windowsServerAuditorInstance.changeProcessTreePage(-1)" ${currentPage === 0 ? 'disabled' : ''}>
                                <i class="fas fa-chevron-left"></i> Previous
                            </button>
                            <span class="modal-page-info" id="process-tree-modal-page-info">Page ${currentPage + 1} of ${totalPages}</span>
                            <button id="process-tree-next-btn" class="btn btn-sm btn-secondary" onclick="windowsServerAuditorInstance.changeProcessTreePage(1)" ${currentPage === totalPages - 1 ? 'disabled' : ''}>
                                Next <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                        ` : `
                        <div class="modal-pagination" id="process-tree-modal-pagination" style="display: none;">
                            <button id="process-tree-prev-btn" class="btn btn-sm btn-secondary" onclick="windowsServerAuditorInstance.changeProcessTreePage(-1)">
                                <i class="fas fa-chevron-left"></i> Previous
                            </button>
                            <span class="modal-page-info" id="process-tree-modal-page-info">Page 1 of 1</span>
                            <button id="process-tree-next-btn" class="btn btn-sm btn-secondary" onclick="windowsServerAuditorInstance.changeProcessTreePage(1)">
                                Next <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                        `}
                    </div>
                </div>
            </div>
        `;
    }
}



















