export class HyperVAuditorPage {
    constructor() {
        this.reports = [];
        this.selectedReport = null;
        this.clusterName = '';
        this.hosts = [];
        this.vms = [];
        this.volumes = [];
        this.clusterInfo = {};
        this.clusterSharedVolumes = [];
        this.clusterDisks = [];
        this.quorumDisks = [];
        this.language = 'en'; // 'en' or 'fr'
        this.showCreateModal = false;
        this.showFeatureDetailsModal = false;
        this.selectedFeature = null;
        this.showErrorsModalFlag = false;
        this.selectedErrorsModal = null;
        this.showUpdatesModalFlag = false;
        this.selectedUpdatesModal = null;
        this.showGroupMembersModalFlag = false;
        this.selectedGroupModal = null;
        // Modal state for large lists (drivers, applications, services)
        this.showDriversModalFlag = false;
        this.selectedDriversModal = null; // { hostName, hostIndex, page }
        this.showApplicationsModalFlag = false;
        this.selectedApplicationsModal = null; // { hostName, hostIndex, page }
        this.showServicesModalFlag = false;
        this.selectedServicesModal = null; // { hostName, hostIndex, page }
        this.loadingReports = false;
        this.overview = {
            upNodes: 0,
            totalNodes: 0,
            totalLP: 0,
            usedMemory: { value: 0, unit: 'GB' },
            totalMemory: { value: 0, unit: 'GB' },
            usedStorage: { value: 0, unit: 'GB' },
            totalStorage: { value: 0, unit: 'GB' },
            runningVm: 0,
            totalVm: 0,
            totalVProc: 0,
            usedVmMemory: { value: 0, unit: 'GB' },
            totalVmMemory: { value: 0, unit: 'GB' },
            usedVmVHD: { value: 0, unit: 'GB' },
            totalVmVHD: { value: 0, unit: 'GB' }
        };
        this.filters = {
            search: '',
            state: 'all',
            host: 'all',
            sortBy: 'name',
            sortOrder: 'asc',
            expandedRows: new Set()
        };
        this.refreshInterval = null;
        
        // Translations
        this.translations = {
            en: {
                title: 'Hyper-V Auditor',
                subtitle: 'Advanced audit and analytics for Hyper-V clusters and hosts',
                summary: 'Summary',
                configuration: 'Configuration',
                targetType: 'Target Type',
                clusterName: 'Cluster Name',
                hostNames: 'Host Name(s)',
                reportMode: 'Report Mode',
                fullReport: 'Full Report',
                highlightsOnly: 'Highlights Only',
                generateReport: 'Generate Report',
                clear: 'Clear',
                language: 'Language',
                languageLabel: 'Language',
                languageEnglish: 'English',
                languageFrench: 'French',
                clusterOverview: 'Cluster Overview',
                physicalResources: 'Physical Resources',
                virtualResources: 'Virtual Resources',
                nodes: 'Nodes',
                logicalProcessors: 'Logical Processors',
                physicalMemory: 'Physical Memory',
                physicalStorage: 'Physical Storage',
                virtualMachines: 'Virtual Machines',
                activeVProcessors: 'Active vProcessors',
                virtualMemory: 'Virtual Memory',
                virtualStorage: 'Virtual Storage',
                hyperVHosts: 'Hyper-V Hosts',
                server: 'Server',
                hardwareInfo: 'Hardware Information',
                systemInfo: 'System Information',
                systemErrors: 'System Errors',
                virtualMachines: 'Virtual Machines',
                manufacturer: 'Manufacturer',
                model: 'Model',
                serialNumber: 'Serial Number',
                processor: 'Processor',
                totalMemory: 'Total Memory',
                checkpoints: 'Checkpoints',
                replica: 'Replica',
                disksVolumes: 'Disks/Volumes',
                volumeName: 'Name',
                volumeState: 'State',
                volumeUsage: 'Usage',
                volumeOwner: 'Owner',
                volumeFileSystem: 'File System',
                storageUtilization: 'Storage Utilization',
                totalSize: 'Total Size',
                upLabel: 'Up',
                ownerLabel: 'Owner',
                generationVersion: 'Gen/Ver',
                network: 'Network',
                volumeLabel: 'Label / CSV Path',
                none: 'None',
                disabled: 'Disabled',
                memoryServices: 'Memory & Services',
                startupRam: 'Startup',
                minRam: 'Min',
                maxRam: 'Max',
                assignedRam: 'Assigned',
                fragmentation: 'Fragmentation',
                hostname: 'Hostname',
                manufacturerModel: 'Manufacturer / Model',
                osVersion: 'OS Version',
                domain: 'Domain',
                processorsLabel: 'Processors',
                memoryLabel: 'Memory',
                vmCount: 'VMs',
                noErrors: 'No system errors found',
                vmName: 'VM Name',
                state: 'State',
                uptime: 'Uptime',
                vCPU: 'vCPU',
                vRAM: 'vRAM',
                networkAdapters: 'Network Adapters',
                hostNetworks: 'Host Networks',
                adapterName: 'Adapter Name',
                switch: 'Switch',
                vlan: 'VLAN',
                ipAddress: 'IP Address',
                connection: 'Connection',
                disks: 'Disks',
                diskName: 'Disk Name',
                size: 'Size',
                type: 'Type',
                used: 'Used',
                free: 'Free',
                total: 'Total',
                running: 'Running',
                totalVMs: 'Total VMs',
                errors: 'Errors',
                serverRoles: 'Server Roles',
                localUsers: 'Local Users',
                localGroups: 'Local Groups',
                userName: 'User Name',
                fullName: 'Full Name',
                description: 'Description',
                enabled: 'Enabled',
                disabled: 'Disabled',
                lastLogon: 'Last Logon',
                passwordLastSet: 'Password Last Set',
                groupName: 'Group Name',
                members: 'Members',
                memberCount: 'Member Count',
                search: 'Search...',
                export: 'Export',
                autoRefresh: 'Auto Refresh',
                scriptButton: 'Script',
                plainScriptButton: 'Plain Script',
                importButton: 'Import',
                loadingReport: 'Loading report...',
                windowsUpdates: 'Windows Updates',
                kbNumber: 'KB Number',
                installedOn: 'Installed On',
                installedBy: 'Installed By',
                // Table and section titles
                physicalDisks: 'Physical Disks',
                clusterSharedVolumes: 'Cluster Shared Volumes (CSV)',
                quorumDisk: 'Quorum Disk',
                clusterMetadata: 'Cluster Metadata',
                clusterErrors: 'Cluster Errors',
                hypervErrors: 'Hyper-V Errors',
                // Status and labels
                quorumDiskLabel: 'QUORUM DISK',
                noMembersAssigned: 'No members assigned',
                hostDetails: 'Host Details',
                csvs: 'CSVs',
                quorum: 'Quorum',
                // Column headers
                diskName: 'Disk Name',
                totalSize: 'Total Size',
                allocated: 'Allocated',
                unallocated: 'Unallocated',
                usage: 'Usage',
                owner: 'Owner',
                busType: 'Bus Type',
                csvName: 'CSV Name',
                ownerNode: 'Owner Node',
                fileSystem: 'File System',
                resourceName: 'Resource Name',
                resourceType: 'Resource Type',
                time: 'Time',
                message: 'Message',
                source: 'Source',
                level: 'Level',
                viewAllErrors: 'View All',
                details: 'Details',
                close: 'Close'
            },
            fr: {
                title: 'Auditeur Hyper-V',
                subtitle: 'Inventaires et analyses avancés pour les clusters et hôtes Hyper-V',
                summary: 'Résumé',
                configuration: 'Configuration',
                targetType: 'Type de Cible',
                clusterName: 'Nom du Cluster',
                hostNames: 'Nom(s) d\'Hôte(s)',
                reportMode: 'Mode de Rapport',
                fullReport: 'Rapport Complet',
                highlightsOnly: 'Points Saillants Seulement',
                generateReport: 'Générer le Rapport',
                clear: 'Effacer',
                language: 'Langue',
                languageLabel: 'Langue',
                languageEnglish: 'Anglais',
                languageFrench: 'Français',
                clusterOverview: 'Vue d\'Ensemble du Cluster',
                physicalResources: 'Ressources Physiques',
                virtualResources: 'Ressources Virtuelles',
                nodes: 'Nœuds',
                logicalProcessors: 'Processeurs Logiques',
                physicalMemory: 'Mémoire Physique',
                physicalStorage: 'Stockage Physique',
                virtualMachines: 'Machines Virtuelles',
                activeVProcessors: 'vProcesseurs Actifs',
                virtualMemory: 'Mémoire Virtuelle',
                virtualStorage: 'Stockage Virtuel',
                hyperVHosts: 'Hôtes Hyper-V',
                server: 'Serveur',
                hardwareInfo: 'Informations Matérielles',
                systemErrors: 'Erreurs Système',
                virtualMachines: 'Machines Virtuelles',
                manufacturer: 'Fabricant',
                model: 'Modèle',
                serialNumber: 'Numéro de Série',
                processor: 'Processeur',
                totalMemory: 'Mémoire Totale',
                checkpoints: 'Points de Contrôle',
                replica: 'Réplica',
                disksVolumes: 'Disques/Volumes',
                volumeName: 'Nom',
                volumeState: 'État',
                volumeUsage: 'Utilisation',
                volumeOwner: 'Propriétaire',
                volumeFileSystem: 'Système de Fichiers',
                storageUtilization: 'Utilisation du Stockage',
                totalSize: 'Taille Totale',
                upLabel: 'Actif',
                ownerLabel: 'Propriétaire',
                generationVersion: 'Gen/Ver',
                network: 'Réseau',
                volumeLabel: 'Libellé / Chemin CSV',
                none: 'Aucun',
                disabled: 'Désactivé',
                memoryServices: 'Mémoire & Services',
                startupRam: 'Démarrage',
                minRam: 'Min',
                maxRam: 'Max',
                assignedRam: 'Assignée',
                fragmentation: 'Fragmentation',
                hostname: 'Nom d\'Hôte',
                manufacturerModel: 'Fabricant / Modèle',
                osVersion: 'Version OS',
                domain: 'Domaine',
                processorsLabel: 'Processeurs',
                memoryLabel: 'Mémoire',
                vmCount: 'VMs',
                noErrors: 'Aucune erreur système trouvée',
                vmName: 'Nom de la VM',
                state: 'État',
                uptime: 'Temps de Fonctionnement',
                vCPU: 'vCPU',
                vRAM: 'vRAM',
                networkAdapters: 'Adaptateurs Réseau',
                hostNetworks: 'Réseaux Hôte',
                adapterName: 'Nom de l\'Adaptateur',
                switch: 'Commutateur',
                vlan: 'VLAN',
                ipAddress: 'Adresse IP',
                connection: 'Connexion',
                disks: 'Disques',
                diskName: 'Nom du Disque',
                size: 'Taille',
                type: 'Type',
                used: 'Utilisé',
                free: 'Libre',
                total: 'Total',
                running: 'En Cours',
                totalVMs: 'Total VMs',
                errors: 'Erreurs',
                serverRoles: 'Rôles Serveur',
                localUsers: 'Utilisateurs Locaux',
                localGroups: 'Groupes Locaux',
                userName: 'Nom d\'Utilisateur',
                fullName: 'Nom Complet',
                description: 'Description',
                enabled: 'Activé',
                disabled: 'Désactivé',
                lastLogon: 'Dernière Connexion',
                passwordLastSet: 'Mot de Passe Modifié',
                groupName: 'Nom du Groupe',
                members: 'Membres',
                memberCount: 'Nombre de Membres',
                search: 'Rechercher...',
                export: 'Exporter',
                autoRefresh: 'Actualisation Automatique',
                scriptButton: 'Script',
                plainScriptButton: 'Script Simple',
                importButton: 'Importer',
                loadingReport: 'Chargement du rapport...',
                windowsUpdates: 'Mises à Jour Windows',
                kbNumber: 'Numéro KB',
                installedOn: 'Installé Le',
                installedBy: 'Installé Par',
                // Table and section titles
                physicalDisks: 'Disques Physiques',
                clusterSharedVolumes: 'Volumes Partagés de Cluster (CSV)',
                quorumDisk: 'Disque Quorum',
                clusterMetadata: 'Métadonnées du Cluster',
                clusterErrors: 'Erreurs du Cluster',
                hypervErrors: 'Erreurs Hyper-V',
                // Status and labels
                quorumDiskLabel: 'DISQUE QUORUM',
                noMembersAssigned: 'Aucun membre assigné',
                hostDetails: 'Détails de l\'Hôte',
                csvs: 'CSVs',
                quorum: 'Quorum',
                // Column headers
                diskName: 'Nom du Disque',
                totalSize: 'Taille Totale',
                allocated: 'Alloué',
                unallocated: 'Non Alloué',
                usage: 'Utilisation',
                owner: 'Propriétaire',
                busType: 'Type de Bus',
                csvName: 'Nom CSV',
                ownerNode: 'Nœud Propriétaire',
                fileSystem: 'Système de Fichiers',
                resourceName: 'Nom de la Ressource',
                resourceType: 'Type de Ressource',
                time: 'Heure',
                message: 'Message',
                source: 'Source',
                level: 'Niveau',
                viewAllErrors: 'Voir Tout',
                details: 'Détails',
                close: 'Fermer'
            }
        };
    }

    t(key) {
        return this.translations[this.language][key] || key;
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
        
        const normalized = value.toString().trim().toLowerCase();
        const statusMap = {
            en: {
                running: 'Running',
                stopped: 'Stopped',
                paused: 'Paused',
                saved: 'Saved',
                starting: 'Starting',
                stopping: 'Stopping',
                up: 'Up',
                down: 'Down',
                unknown: 'Unknown',
                online: 'Online',
                offline: 'Offline',
                connected: 'Connected',
                disconnected: 'Disconnected',
                warning: 'Warning',
                healthy: 'Healthy',
                degraded: 'Degraded',
                failed: 'Failed',
                error: 'Error',
                disabled: 'Disabled',
                standby: 'Standby',
                'in-progress': 'In Progress',
                inherited: 'Inherited',
                initializing: 'Initializing',
                pending: 'Pending',
                'online pending': 'Online Pending',
                'offline pending': 'Offline Pending'
            },
            fr: {
                running: 'En cours',
                stopped: 'Arrêté',
                paused: 'En pause',
                saved: 'Sauvegardé',
                starting: 'Démarrage',
                stopping: 'Arrêt en cours',
                up: 'Actif',
                down: 'Inactif',
                unknown: 'Inconnu',
                online: 'En ligne',
                offline: 'Hors ligne',
                connected: 'Connecté',
                disconnected: 'Déconnecté',
                warning: 'Avertissement',
                healthy: 'Sain',
                degraded: 'Dégradé',
                failed: 'Échec',
                error: 'Erreur',
                disabled: 'Désactivé',
                standby: 'Veille',
                'in-progress': 'En cours',
                inherited: 'Hérité',
                initializing: 'Initialisation',
                pending: 'En attente',
                'online pending': 'En ligne en attente',
                'offline pending': 'Hors ligne en attente'
            }
        };
        return statusMap[this.language]?.[normalized] || value;
    }

    translateQuorumType(value) {
        if (!value && value !== 0) return 'N/A';
        
        const quorumTypeMap = {
            0: 'Node Majority',
            1: 'Node and Disk Majority',
            2: 'Node and File Share Majority',
            3: 'Disk Only',
            4: 'Cloud Witness',
            5: 'Unknown'
        };
        
        const numValue = parseInt(value);
        if (!isNaN(numValue) && quorumTypeMap[numValue]) {
            return quorumTypeMap[numValue];
        }
        
        return value;
    }

    async render() {
        const reportId = this.getReportIdFromURL();
        
        return `
            <div class="page-container-full">
                <div class="page-header">
                    <div class="page-header-content">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <button class="btn btn-icon" onclick="window.appInstance.navigateTo('hyperv-auditor-list')">
                                <i class="fas fa-arrow-left"></i>
                            </button>
                            <div>
                                <h1 class="page-title">📊 ${this.selectedReport ? this.selectedReport.name : this.t('title')}</h1>
                                <p class="page-subtitle">${this.t('subtitle')}</p>
                            </div>
                        </div>
                        <div class="page-header-actions">
                            ${this.selectedReport ? `
                                <button type="button" class="btn btn-sm btn-primary" onclick="hyperVAuditorInstance.generateScript()" title="${this.t('scriptButton')}">
                                    <i class="fas fa-code"></i> <span class="btn-text">${this.t('scriptButton')}</span>
                                </button>
                                <button type="button" class="btn btn-sm btn-secondary" onclick="hyperVAuditorInstance.generateScript({ encrypt: false, obfuscate: false })" title="${this.t('plainScriptButton')}">
                                    <i class="fas fa-file-alt"></i> <span class="btn-text">${this.t('plainScriptButton')}</span>
                                </button>
                                <button type="button" class="btn btn-sm btn-success" onclick="hyperVAuditorInstance.importReport()" title="${this.t('importButton')}">
                                    <i class="fas fa-upload"></i> <span class="btn-text">${this.t('importButton')}</span>
                                </button>
                                <input type="file" id="report-file-input" accept=".json" style="display: none;" onchange="hyperVAuditorInstance.handleFileSelect(event)">
                            ` : ''}
                            <div class="language-selector-compact">
                                <select id="language-select" class="language-select-compact" onchange="hyperVAuditorInstance.setLanguage(this.value)">
                                    <option value="en" ${this.language === 'en' ? 'selected' : ''}">🇺🇸 EN</option>
                                    <option value="fr" ${this.language === 'fr' ? 'selected' : ''}">🇫🇷 FR</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                ${!this.selectedReport ? `
                    <div class="card">
                        <div class="card-body">
                            <div class="empty-state">
                                <i class="fas fa-spinner fa-spin" style="font-size: 3rem; color: var(--gray-light); margin-bottom: 1rem;"></i>
                                <p>${this.t('loadingReport')}</p>
                            </div>
                        </div>
                    </div>
                ` : this.renderReportDetails()}

                <div id="report-message" class="message" style="display: none;"></div>
                
                ${this.showFeatureDetailsModal ? this.renderFeatureDetailsModal() : ''}
                ${this.showErrorsModalFlag ? this.renderErrorsModal() : ''}
                ${this.showUpdatesModalFlag ? this.renderUpdatesModal() : ''}
                ${this.showGroupMembersModalFlag ? this.renderGroupMembersModal() : ''}
            </div>
        `;
    }

    getReportIdFromURL() {
        // Try to get from appInstance URL params first
        if (window.appInstance && window.appInstance.urlParams) {
            const id = window.appInstance.urlParams.get('id');
            if (id) {
                return parseInt(id);
            }
        }
        // Fallback: parse from hash directly
        const hash = window.location.hash;
        const match = hash.match(/[?&]id=(\d+)/);
        return match ? parseInt(match[1]) : null;
    }

    renderReportDetails() {
        return `
            ${!this.clusterName && this.hosts.length > 0 ? this.renderSummary() : ''}
            ${this.clusterName ? this.renderClusterOverview() : ''}
            ${this.hosts.length > 0 ? this.renderHostsTable() : ''}
            ${this.clusterName ? this.renderCSVTable() : ''}
            ${this.clusterName ? this.renderQuorumTable() : ''}
            ${this.clusterName ? this.renderAllVMsByHost() : ''}
            ${this.hosts.length > 0 ? this.renderServerSections() : ''}
            ${this.showDriversModalFlag ? this.renderDriversModal() : ''}
            ${this.showApplicationsModalFlag ? this.renderApplicationsModal() : ''}
            ${this.showServicesModalFlag ? this.renderServicesModal() : ''}
        `;
    }

    renderCreateReportModal() {
        return `
            <div class="modal-overlay" onclick="hyperVAuditorInstance.closeCreateModal()">
                <div class="modal-container" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>Create New Report</h3>
                        <button class="modal-close" onclick="hyperVAuditorInstance.closeCreateModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Report Name</label>
                            <input type="text" id="new-report-name" class="form-input" placeholder="e.g., Production Cluster Report">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Target Type</label>
                            <select id="new-target-type" class="form-input" onchange="hyperVAuditorInstance.updateNewTargetType()">
                                <option value="cluster">Hyper-V Cluster</option>
                                <option value="host">Standalone Host</option>
                            </select>
                        </div>
                        <div class="form-group" id="new-cluster-group">
                            <label class="form-label">Cluster Name</label>
                            <input type="text" id="new-cluster-name" class="form-input" placeholder="HvCluster1">
                        </div>
                        <div class="form-group" id="new-host-group" style="display: none;">
                            <label class="form-label">Host Names (comma-separated)</label>
                            <input type="text" id="new-host-names" class="form-input" placeholder="Host1,Host2,Host3">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="hyperVAuditorInstance.closeCreateModal()">Cancel</button>
                        <button class="btn btn-primary" onclick="hyperVAuditorInstance.createReport()">Create Report</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderFeatureDetailsModal() {
        if (!this.selectedFeature) return '';
        
        const role = this.selectedFeature.role;
        const featureType = role.featureType || 'Feature';
        const typeIcon = featureType === 'Role' ? 'fa-server' : 
                        featureType === 'Role Service' ? 'fa-cog' : 'fa-puzzle-piece';
        const typeClass = featureType.toLowerCase().replace(/\s+/g, '-');
        
        return `
            <div class="modal-overlay" onclick="hyperVAuditorInstance.closeFeatureModal()">
                <div class="modal-container modal-compact" onclick="event.stopPropagation()">
                    <div class="modal-header-compact">
                        <div class="modal-title-section">
                            <div class="modal-icon-compact feature-icon-${typeClass}">
                                <i class="fas ${typeIcon}"></i>
                            </div>
                            <div class="modal-title-info">
                                <h3>${role.displayName || role.name || 'Feature Details'}</h3>
                                <div class="modal-subtitle">
                                    <span class="feature-type-pill feature-type-${typeClass}">
                                        <i class="fas ${typeIcon}"></i> ${featureType}
                                    </span>
                                    <span class="feature-host-pill">
                                        <i class="fas fa-server"></i> ${this.selectedFeature.host}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button class="modal-close-compact" onclick="hyperVAuditorInstance.closeFeatureModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body-compact">
                        <div class="feature-info-compact">
                            <div class="feature-info-row">
                                <span class="feature-info-label"><i class="fas fa-tag"></i> Name</span>
                                <span class="feature-info-value">${role.name || 'N/A'}</span>
                            </div>
                            <div class="feature-info-row">
                                <span class="feature-info-label"><i class="fas fa-toggle-on"></i> Status</span>
                                <span class="status-badge status-online">${role.installState || 'Installed'}</span>
                            </div>
                            ${role.path ? `
                            <div class="feature-info-row">
                                <span class="feature-info-label"><i class="fas fa-folder"></i> Path</span>
                                <span class="feature-info-value feature-path-compact">${role.path}</span>
                            </div>
                            ` : ''}
                        </div>
                        ${role.description ? `
                        <div class="feature-description-compact">
                            <div class="feature-description-header">
                                <i class="fas fa-align-left"></i>
                                <span>Description</span>
                            </div>
                            <div class="feature-description-text">${role.description}</div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderErrorsModal() {
        if (!this.showErrorsModalFlag || !this.selectedErrorsModal) return '';
        
        const { type, title, hostIndex, page } = this.selectedErrorsModal;
        let errors = [];
        let badgeClass = '';
        let iconClass = 'fa-exclamation-triangle';
        let errorClass = '';
        
        // Get the appropriate errors based on type
        if (type === 'cluster') {
            errors = this.clusterErrors || [];
            badgeClass = 'cluster-badge';
            errorClass = 'cluster-error';
        } else if (type === 'system' && hostIndex !== null) {
            errors = this.hosts[hostIndex]?.systemErrors || [];
            badgeClass = '';
            errorClass = '';
        } else if (type === 'hyperv' && hostIndex !== null) {
            errors = this.hosts[hostIndex]?.hypervErrors || [];
            badgeClass = 'hyperv-badge';
            iconClass = 'fa-server';
            errorClass = 'hyperv-error';
        }
        
        // Pagination (matching Installed Drivers pattern)
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(errors.length / pageSize));
        const currentPage = Math.min(Math.max(page || 0, 0), totalPages - 1);
        const start = currentPage * pageSize;
        const pageItems = errors.slice(start, start + pageSize);
        
        return `
            <div class="modal-overlay" onclick="hyperVAuditorInstance.closeErrorsModal()">
                <div class="modal-container modal-wide" onclick="event.stopPropagation()">
                    <div class="modal-header-compact">
                        <div class="modal-title-section">
                            <div class="modal-icon-compact error-icon-compact">
                                <i class="fas ${iconClass}"></i>
                            </div>
                            <div class="modal-title-info">
                            <h3>${title}</h3>
                                <p class="modal-description">${errors.length} ${errors.length === 1 ? 'error' : 'errors'} total</p>
                        </div>
                        </div>
                        <button class="modal-close-compact" onclick="hyperVAuditorInstance.closeErrorsModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body-compact">
                        <div class="errors-list-modern" id="errors-modal-list">
                            ${pageItems.length > 0 ? pageItems.map(error => `
                                <div class="error-item-modern ${errorClass}">
                                    <i class="fas fa-exclamation-circle error-item-modern-icon"></i>
                                    <div class="error-item-modern-content">
                                        <div class="error-item-modern-message">${error.message}</div>
                                        <div class="error-item-modern-details">
                                            <span class="error-item-modern-time"><i class="fas fa-clock"></i> ${error.time}</span>
                                            ${error.source ? `<span class="error-item-modern-source"><i class="fas fa-tag"></i> ${error.source}</span>` : ''}
                                            ${error.level ? `<span class="error-item-modern-level"><i class="fas fa-info-circle"></i> ${error.level}</span>` : ''}
                                            ${error.logName ? `<span class="error-item-modern-log"><i class="fas fa-book"></i> ${
                                                type === 'cluster' ? error.logName.replace('Microsoft-Windows-FailoverClustering', 'Cluster') :
                                                type === 'hyperv' ? error.logName.replace('Microsoft-Windows-Hyper-V-', 'HV-') :
                                                error.logName
                                            }</span>` : ''}
                                            ${error.node ? `<span class="error-item-modern-node"><i class="fas fa-server"></i> ${error.node}</span>` : ''}
                                        </div>
                                    </div>
                                </div>
                            `).join('') : '<div class="empty-state">No errors found</div>'}
                        </div>
                        ${totalPages > 1 ? `
                        <div class="modal-pagination">
                            <button id="errors-prev-btn" class="btn btn-secondary btn-xs" onclick="hyperVAuditorInstance.changeErrorsPage(-1)" ${currentPage === 0 ? 'disabled' : ''}>
                                <i class="fas fa-chevron-left"></i> Previous
                            </button>
                            <span id="errors-modal-page" class="modal-page-indicator">Page ${currentPage + 1} of ${totalPages}</span>
                            <button id="errors-next-btn" class="btn btn-secondary btn-xs" onclick="hyperVAuditorInstance.changeErrorsPage(1)" ${currentPage === totalPages - 1 ? 'disabled' : ''}>
                                Next <i class="fas fa-chevron-right"></i>
                            </button>
                    </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderUpdatesModal() {
        if (!this.showUpdatesModalFlag || !this.selectedUpdatesModal) return '';
        
        const { hostName, hostIndex } = this.selectedUpdatesModal;
        const updates = this.hosts[hostIndex]?.windowsUpdates || [];
        
        return `
            <div class="modal-overlay" onclick="hyperVAuditorInstance.closeUpdatesModal()">
                <div class="modal-container modal-wide" onclick="event.stopPropagation()">
                    <div class="modal-header-compact">
                        <div class="modal-title-section">
                            <div class="modal-icon-compact">
                                <i class="fas fa-download"></i>
                            </div>
                            <div class="modal-title-info">
                                <h3>Windows Updates - ${hostName}</h3>
                                <p class="modal-description">${updates.length} updates installed</p>
                            </div>
                        </div>
                        <button class="modal-close-compact" onclick="hyperVAuditorInstance.closeUpdatesModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body-compact">
                        <div class="updates-modal-grid">
                            ${updates.map(update => `
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
                                            ${update.description || 'No description available'}
                                        </div>
                                        ${update.installedBy && update.installedBy !== 'N/A' ? `
                                        <div class="update-installer">
                                            <i class="fas fa-user"></i>
                                            <span>Installed by: ${update.installedBy}</span>
                                        </div>
                                        ` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderDriversModal() {
        if (!this.showDriversModalFlag || !this.selectedDriversModal) return '';

        const { hostName, hostIndex, page } = this.selectedDriversModal;
        const drivers = this.hosts[hostIndex]?.drivers || [];
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(drivers.length / pageSize));
        const currentPage = Math.min(Math.max(page || 0, 0), totalPages - 1);
        const start = currentPage * pageSize;
        const pageItems = drivers.slice(start, start + pageSize);

        return `
            <div class="modal-overlay" onclick="hyperVAuditorInstance.closeDriversModal()">
                <div class="modal-container modal-wide" onclick="event.stopPropagation()">
                    <div class="modal-header-compact">
                        <div class="modal-title-section">
                            <div class="modal-icon-compact">
                                <i class="fas fa-microchip"></i>
                            </div>
                            <div class="modal-title-info">
                                <h3>Installed Drivers - ${hostName}</h3>
                                <p class="modal-description">${drivers.length} drivers total</p>
                            </div>
                        </div>
                        <button class="modal-close-compact" onclick="hyperVAuditorInstance.closeDriversModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body-compact">
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th>Class Description</th>
                                        <th>Provider Name</th>
                                        <th>Driver Version</th>
                                        <th>Version Date</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody id="drivers-modal-body">
                                    ${pageItems.map(driver => `
                                    <tr>
                                        <td>${driver.classDescription || 'N/A'}</td>
                                        <td>${driver.providerName || 'N/A'}</td>
                                        <td>${driver.driverVersion || 'N/A'}</td>
                                        <td>${driver.versionDate || 'N/A'}</td>
                                        <td><span class="status-badge status-${driver.status === 'OK' ? 'online' : 'warning'}">${driver.status || 'Unknown'}</span></td>
                                    </tr>
                                    `).join('')}
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
                            <button id="drivers-prev-btn" class="btn btn-secondary btn-xs" onclick="hyperVAuditorInstance.changeDriversPage(-1)" ${currentPage === 0 ? 'disabled' : ''}>
                                <i class="fas fa-chevron-left"></i> Previous
                            </button>
                            <span id="drivers-modal-page" class="modal-page-indicator">Page ${currentPage + 1} of ${totalPages}</span>
                            <button id="drivers-next-btn" class="btn btn-secondary btn-xs" onclick="hyperVAuditorInstance.changeDriversPage(1)" ${currentPage === totalPages - 1 ? 'disabled' : ''}>
                                Next <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderApplicationsModal() {
        if (!this.showApplicationsModalFlag || !this.selectedApplicationsModal) return '';

        const { hostName, hostIndex, page } = this.selectedApplicationsModal;
        const apps = this.hosts[hostIndex]?.installedApplications || [];
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(apps.length / pageSize));
        const currentPage = Math.min(Math.max(page || 0, 0), totalPages - 1);
        const start = currentPage * pageSize;
        const pageItems = apps.slice(start, start + pageSize);

        return `
            <div class="modal-overlay" onclick="hyperVAuditorInstance.closeApplicationsModal()">
                <div class="modal-container modal-wide" onclick="event.stopPropagation()">
                    <div class="modal-header-compact">
                        <div class="modal-title-section">
                            <div class="modal-icon-compact">
                                <i class="fas fa-box"></i>
                            </div>
                            <div class="modal-title-info">
                                <h3>Installed Applications - ${hostName}</h3>
                                <p class="modal-description">${apps.length} applications total</p>
                            </div>
                        </div>
                        <button class="modal-close-compact" onclick="hyperVAuditorInstance.closeApplicationsModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body-compact">
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th>Application Name</th>
                                        <th>Publisher</th>
                                        <th>Version</th>
                                        <th>Install Date</th>
                                    </tr>
                                </thead>
                                <tbody id="applications-modal-body">
                                    ${pageItems.map(app => `
                                    <tr>
                                        <td>${app.applicationName || 'N/A'}</td>
                                        <td>${app.publisher || 'N/A'}</td>
                                        <td>${app.version || 'N/A'}</td>
                                        <td>${app.installDate || 'N/A'}</td>
                                    </tr>
                                    `).join('')}
                                    ${pageItems.length === 0 ? `
                                    <tr>
                                        <td colspan="4" style="text-align:center; color:#64748b; font-style:italic;">No applications to display</td>
                                    </tr>
                                    ` : ''}
                                </tbody>
                            </table>
                        </div>
                        ${totalPages > 1 ? `
                        <div class="modal-pagination">
                            <button id="applications-prev-btn" class="btn btn-secondary btn-xs" onclick="hyperVAuditorInstance.changeApplicationsPage(-1)" ${currentPage === 0 ? 'disabled' : ''}>
                                <i class="fas fa-chevron-left"></i> Previous
                            </button>
                            <span id="applications-modal-page" class="modal-page-indicator">Page ${currentPage + 1} of ${totalPages}</span>
                            <button id="applications-next-btn" class="btn btn-secondary btn-xs" onclick="hyperVAuditorInstance.changeApplicationsPage(1)" ${currentPage === totalPages - 1 ? 'disabled' : ''}>
                                Next <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderServicesModal() {
        if (!this.showServicesModalFlag || !this.selectedServicesModal) return '';

        const { hostName, hostIndex, page } = this.selectedServicesModal;
        const services = this.hosts[hostIndex]?.services || [];
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(services.length / pageSize));
        const currentPage = Math.min(Math.max(page || 0, 0), totalPages - 1);
        const start = currentPage * pageSize;
        const pageItems = services.slice(start, start + pageSize);

        return `
            <div class="modal-overlay" onclick="hyperVAuditorInstance.closeServicesModal()">
                <div class="modal-container modal-wide" onclick="event.stopPropagation()">
                    <div class="modal-header-compact">
                        <div class="modal-title-section">
                            <div class="modal-icon-compact">
                                <i class="fas fa-cogs"></i>
                            </div>
                            <div class="modal-title-info">
                                <h3>Services - ${hostName}</h3>
                                <p class="modal-description">${services.length} services total</p>
                            </div>
                        </div>
                        <button class="modal-close-compact" onclick="hyperVAuditorInstance.closeServicesModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body-compact">
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th>Display Name</th>
                                        <th>Short Name</th>
                                        <th>Status</th>
                                        <th>Start Type</th>
                                    </tr>
                                </thead>
                                <tbody id="services-modal-body">
                                    ${pageItems.map(service => `
                                    <tr>
                                        <td>${service.displayName || 'N/A'}</td>
                                        <td><code style="background: #0f172a; color: #94a3b8; border: 1px solid #334155; padding: 0.125rem 0.375rem; border-radius: 3px; font-size: 0.75rem;">${service.shortName || 'N/A'}</code></td>
                                        <td><span class="status-badge status-${service.status === 'Running' ? 'online' : service.status === 'Stopped' ? 'offline' : 'warning'}">${service.status || 'Unknown'}</span></td>
                                        <td>${service.startType || 'N/A'}</td>
                                    </tr>
                                    `).join('')}
                                    ${pageItems.length === 0 ? `
                                    <tr>
                                        <td colspan="4" style="text-align:center; color:#64748b; font-style:italic;">No services to display</td>
                                    </tr>
                                    ` : ''}
                                </tbody>
                            </table>
                        </div>
                        ${totalPages > 1 ? `
                        <div class="modal-pagination">
                            <button id="services-prev-btn" class="btn btn-secondary btn-xs" onclick="hyperVAuditorInstance.changeServicesPage(-1)" ${currentPage === 0 ? 'disabled' : ''}>
                                <i class="fas fa-chevron-left"></i> Previous
                            </button>
                            <span id="services-modal-page" class="modal-page-indicator">Page ${currentPage + 1} of ${totalPages}</span>
                            <button id="services-next-btn" class="btn btn-secondary btn-xs" onclick="hyperVAuditorInstance.changeServicesPage(1)" ${currentPage === totalPages - 1 ? 'disabled' : ''}>
                                Next <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderGroupMembersModal() {
        if (!this.showGroupMembersModalFlag || !this.selectedGroupModal) return '';
        
        const { name, members, description } = this.selectedGroupModal;
        
        return `
            <div class="modal-overlay" onclick="hyperVAuditorInstance.closeGroupMembersModal()">
                <div class="modal-container modal-compact" onclick="event.stopPropagation()">
                    <div class="modal-header-compact">
                        <div class="modal-title-section">
                            <div class="modal-icon-compact">
                                <i class="fas fa-users"></i>
                            </div>
                            <div class="modal-title-info">
                                <h3>${name}</h3>
                                ${description && description !== '-' ? `<p class="modal-description">${description}</p>` : ''}
                            </div>
                        </div>
                        <button class="modal-close-compact" onclick="hyperVAuditorInstance.closeGroupMembersModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body-compact">
                        <div class="modal-section-header">
                            <i class="fas fa-user"></i>
                            <span>${members.length} ${members.length === 1 ? 'Member' : 'Members'}</span>
                        </div>
                        ${members.length > 0 ? `
                            <div class="modal-list-compact">
                                ${members.map(member => `
                                    <div class="modal-list-item">
                                        <i class="fas fa-user-circle"></i>
                                        <span>${member}</span>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <div class="modal-empty-state">
                                <i class="fas fa-users-slash"></i>
                                        <span>${this.t('noMembersAssigned')}</span>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    renderSummary() {
        const ov = this.overview;
        const memoryPercent = ov.totalMemory.value > 0 ? (ov.usedMemory.value / ov.totalMemory.value) * 100 : 0;
        const storagePercent = ov.totalStorage.value > 0 ? (ov.usedStorage.value / ov.totalStorage.value) * 100 : 0;
        const totalErrors = this.hosts.reduce((sum, host) => sum + (host.systemErrors?.length || 0), 0);

        return `
            <div class="compact-summary-section">
                <div class="compact-summary-grid">
                    <div class="compact-stat-card stat-servers">
                        <div class="stat-icon"><i class="fas fa-server"></i></div>
                        <div class="stat-content">
                            <div class="stat-value">${this.hosts.length}</div>
                            <div class="stat-label">${this.t('server')}${this.hosts.length > 1 ? 's' : ''}</div>
                        </div>
                    </div>
                    <div class="compact-stat-card stat-vms">
                        <div class="stat-icon"><i class="fas fa-cube"></i></div>
                        <div class="stat-content">
                            <div class="stat-value">${ov.totalVm}</div>
                            <div class="stat-label">${this.t('totalVMs')}</div>
                            <div class="stat-detail">${ov.runningVm} ${this.t('running')}</div>
                        </div>
                    </div>
                    <div class="compact-stat-card ${totalErrors > 0 ? 'stat-errors' : 'stat-success'}">
                        <div class="stat-icon"><i class="fas ${totalErrors > 0 ? 'fa-exclamation-triangle' : 'fa-check-circle'}"></i></div>
                        <div class="stat-content">
                            <div class="stat-value">${totalErrors}</div>
                            <div class="stat-label">${this.t('errors')}</div>
                        </div>
                    </div>
                    <div class="compact-stat-card stat-memory">
                        <div class="stat-icon"><i class="fas fa-memory"></i></div>
                        <div class="stat-content">
                            <div class="stat-value">${ov.usedMemory.value.toFixed(1)}<span class="stat-unit">/${ov.totalMemory.value.toFixed(1)} GB</span></div>
                            <div class="stat-label">${this.t('physicalMemory')}</div>
                            <div class="stat-progress">
                                <div class="stat-progress-bar" style="width: ${memoryPercent}%; background: ${memoryPercent >= 90 ? '#ef4444' : memoryPercent >= 75 ? '#f59e0b' : '#10b981'};"></div>
                                <span class="stat-progress-text">${Math.round(memoryPercent)}%</span>
                            </div>
                        </div>
                    </div>
                    <div class="compact-stat-card stat-storage">
                        <div class="stat-icon"><i class="fas fa-hdd"></i></div>
                        <div class="stat-content">
                            <div class="stat-value">${ov.usedStorage.value.toFixed(1)}<span class="stat-unit">/${ov.totalStorage.value.toFixed(1)} GB</span></div>
                            <div class="stat-label">${this.t('physicalStorage')}</div>
                            <div class="stat-progress">
                                <div class="stat-progress-bar" style="width: ${storagePercent}%; background: ${storagePercent >= 90 ? '#ef4444' : storagePercent >= 75 ? '#f59e0b' : '#10b981'};"></div>
                                <span class="stat-progress-text">${Math.round(storagePercent)}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderClusterOverview() {
        if (!this.clusterName && !this.clusterInfo) return '';
        
        const ov = this.overview;
        const totalVProc = this.vms.reduce((sum, vm) => sum + (vm.vCPU || 0), 0);
        const vpLpRatio = ov.totalLP > 0 ? (totalVProc / ov.totalLP).toFixed(2) : '0.00';
        const clusterInfo = this.clusterInfo || {};
        const csvCount = Array.isArray(this.clusterSharedVolumes) ? this.clusterSharedVolumes.length : 0;
        const quorumDiskCount = Array.isArray(this.quorumDisks) ? this.quorumDisks.length : 0;
        const clusterDiskCount = (Array.isArray(this.clusterDisks) ? this.clusterDisks.length : 0) + quorumDiskCount;
        const healthPercent = ov.totalNodes > 0 ? Math.round((ov.upNodes / ov.totalNodes) * 100) : 0;
        const healthLabel = healthPercent >= 95 ? this.t('healthy') || 'Excellent' :
            healthPercent >= 80 ? this.t('warning') || 'Stable' :
            this.t('error') || 'Attention';
        const memoryPercent = ov.totalMemory.value > 0 ? (ov.usedMemory.value / ov.totalMemory.value) * 100 : 0;
        const storagePercent = ov.totalStorage.value > 0 ? (ov.usedStorage.value / ov.totalStorage.value) * 100 : 0;
        const vmDensity = ov.totalNodes > 0 ? (ov.totalVm / ov.totalNodes).toFixed(1) : '0.0';
        const csvUtil = this.clusterSharedVolumes?.reduce((acc, csv) => {
            const size = parseFloat(csv.size) || 0;
            const used = size - (parseFloat(csv.sizeRemaining) || 0);
            acc.total += size;
            acc.used += used > 0 ? used : 0;
            return acc;
        }, { total: 0, used: 0 }) || { total: 0, used: 0 };
        const csvPercent = csvUtil.total > 0 ? Math.round((csvUtil.used / csvUtil.total) * 100) : 0;
        
        return `
            <section class="cluster-overview-modern">
                <div class="cluster-header-card">
                    <div class="cluster-header-left">
                        <div class="cluster-icon-wrapper">
                            <i class="fas fa-layer-group"></i>
                        </div>
                        <div class="cluster-info-main">
                            <h2 class="cluster-name-modern">${this.clusterName || clusterInfo.name || 'Hyper-V Cluster'}</h2>
                            <div class="cluster-meta-compact">
                                ${clusterInfo.domain ? `<span><i class="fas fa-globe"></i> ${clusterInfo.domain}</span>` : ''}
                                <span><i class="fas fa-server"></i> ${ov.totalNodes || 0} ${this.t('nodes')}</span>
                                <span class="${healthPercent === 100 ? 'status-healthy' : healthPercent >= 75 ? 'status-good' : healthPercent >= 50 ? 'status-warning' : 'status-critical'}">
                                    <i class="fas ${healthPercent === 100 ? 'fa-check-circle' : healthPercent >= 50 ? 'fa-exclamation-triangle' : 'fa-times-circle'}"></i>
                                    ${ov.upNodes}/${ov.totalNodes} ${this.t('upLabel')}
                                </span>
                            </div>
                        </div>
                    </div>
                    ${this.clusterErrors && this.clusterErrors.length > 0 ? `
                    <div class="cluster-header-right">
                        <button class="cluster-errors-btn" onclick="hyperVAuditorInstance.showErrorsModal('cluster', 'Cluster Errors')">
                            <i class="fas fa-exclamation-triangle"></i>
                            <span class="error-count">${this.clusterErrors.length}</span>
                            <span class="error-label">Cluster Errors</span>
                        </button>
                    </div>
                    ` : ''}
                </div>

                <div class="cluster-overview-stats cluster-metrics-grid">
                    <div class="cluster-metric-card stat-card">
                        <div class="stat-card-label">${this.t('virtualMachines')}</div>
                        <div class="stat-card-value">${ov.totalVm}</div>
                        <div class="stat-card-hint">${ov.runningVm} ${this.t('running')}</div>
                    </div>
                    <div class="cluster-metric-card stat-card">
                        <div class="stat-card-label">${this.t('activeVProcessors')}</div>
                        <div class="stat-card-value">${totalVProc}</div>
                        <div class="stat-card-hint">vP/LP ${vpLpRatio}</div>
                    </div>
                    <div class="cluster-metric-card stat-card">
                        <div class="stat-card-label">${this.t('virtualMemory')}</div>
                        <div class="stat-card-value">${ov.totalVmMemory.value.toFixed(1)}<span> GB</span></div>
                        <div class="stat-card-hint">${ov.usedVmMemory.value.toFixed(1)} ${this.t('used')}</div>
                    </div>
                    <div class="cluster-metric-card stat-card">
                        <div class="stat-card-label">VM / Host</div>
                        <div class="stat-card-value">${vmDensity}</div>
                        <div class="stat-card-hint">${ov.totalNodes || 0} ${this.t('nodes')}</div>
                    </div>
                </div>

                <div class="cluster-metrics-grid">
                    <div class="cluster-metric-card">
                        <div class="metric-header">
                            <span>${this.t('physicalMemory')}</span>
                            <strong>${ov.totalMemory.value.toFixed(1)} GB</strong>
                        </div>
                        <div class="metric-progress">
                            <div class="metric-progress-bar" style="width:${memoryPercent}%"></div>
                        </div>
                        <div class="metric-footer">
                            <span>${ov.usedMemory.value.toFixed(1)} GB ${this.t('used')}</span>
                            <span>${Math.round(memoryPercent)}%</span>
                        </div>
                    </div>
                    <div class="cluster-metric-card">
                        <div class="metric-header">
                            <span>${this.t('physicalStorage')}</span>
                            <strong>${ov.totalStorage.value.toFixed(1)} GB</strong>
                        </div>
                        <div class="metric-progress warning">
                            <div class="metric-progress-bar" style="width:${storagePercent}%"></div>
                        </div>
                        <div class="metric-footer">
                            <span>${ov.usedStorage.value.toFixed(1)} GB ${this.t('used')}</span>
                            <span>${Math.round(storagePercent)}%</span>
                        </div>
                    </div>
                    <div class="cluster-metric-card">
                        <div class="metric-header">
                            <span>CSV Utilization</span>
                            <strong>${csvUtil.total.toFixed(1)} GB</strong>
                        </div>
                        <div class="metric-progress accent">
                            <div class="metric-progress-bar" style="width:${csvPercent}%"></div>
                        </div>
                        <div class="metric-footer">
                            <span>${csvUtil.used.toFixed(1)} GB ${this.t('used')}</span>
                            <span>${csvPercent}%</span>
                        </div>
                    </div>
                    <div class="cluster-metric-card soft">
                        <div class="metric-header">
                            <span>Cluster Storage</span>
                            <strong>${quorumDiskCount + csvCount}</strong>
                        </div>
                        <div class="metric-tags">
                            ${quorumDiskCount > 0 ? `<span><i class="fas fa-shield-alt"></i> ${quorumDiskCount} ${this.t('quorum')}</span>` : ''}
                            <span><i class="fas fa-layer-group"></i> ${csvCount} ${this.t('csvs')}</span>
                        </div>
                        <div class="metric-footer">
                            <span>${this.t('virtualStorage')}</span>
                            <span>${ov.totalVmVHD.value.toFixed(1)} GB</span>
                        </div>
                    </div>
                </div>

                <div class="cluster-system-grid">
                    <div class="cluster-system-card">
                        <div class="system-card-header">
                            <i class="fas fa-network-wired"></i>
                            <span>${this.t('physicalResources')}</span>
                        </div>
                        <div class="system-card-content">
                            <div class="system-pill">
                                <strong>${ov.totalNodes}</strong>
                                <span>${this.t('nodes')}</span>
                            </div>
                            <div class="system-pill">
                                <strong>${ov.totalLP}</strong>
                                <span>${this.t('logicalProcessors')}</span>
                            </div>
                            <div class="system-pill">
                                <strong>${ov.totalVm}</strong>
                                <span>${this.t('virtualMachines')}</span>
                            </div>
                            <div class="system-pill">
                                <strong>${totalVProc}</strong>
                                <span>${this.t('activeVProcessors')}</span>
                            </div>
                        </div>
                    </div>
                    <div class="cluster-system-card">
                        <div class="system-card-header">
                            <i class="fas fa-info-circle"></i>
                            <span>${this.t('clusterMetadata')}</span>
                        </div>
                        <div class="system-card-meta">
                            ${clusterInfo.domain ? `<div><span>Domain</span><strong>${clusterInfo.domain}</strong></div>` : ''}
                            ${clusterInfo.state ? `<div><span>Status</span><strong>${clusterInfo.state}</strong></div>` : ''}
                            ${clusterInfo.quorumType ? `<div><span>Quorum Type</span><strong>${this.translateQuorumType(clusterInfo.quorumType)}</strong></div>` : ''}
                            ${clusterInfo.quorumResource ? `<div><span>${this.t('quorumDisk')}</span><strong>${clusterInfo.quorumResource}</strong></div>` : ''}
                            <div><span>VM Density</span><strong>${vmDensity} VM / Host</strong></div>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    renderHostsTable() {
        return `
            <div class="compact-table-section">
                <div class="section-header-compact">
                    <h3 class="section-title-compact"><i class="fas fa-server"></i> ${this.t('hyperVHosts')}</h3>
                </div>
                <div class="table-wrapper-compact">
                    <table class="table-compact">
                        <thead>
                            <tr>
                                <th><i class="fas fa-server"></i> ${this.t('hostname')}</th>
                                <th><i class="fas fa-industry"></i> ${this.t('manufacturerModel')}</th>
                                <th><i class="fas fa-windows"></i> ${this.t('osVersion')}</th>
                                <th><i class="fas fa-heartbeat"></i> ${this.t('state')}</th>
                                <th><i class="fas fa-clock"></i> ${this.t('uptime')}</th>
                                <th><i class="fas fa-network-wired"></i> ${this.t('domain')}</th>
                                <th><i class="fas fa-desktop"></i> ${this.t('vmCount')}</th>
                                <th><i class="fas fa-microchip"></i> ${this.t('processorsLabel')}</th>
                                <th><i class="fas fa-memory"></i> ${this.t('memoryLabel')}</th>
                            </tr>
                        </thead>
                        <tbody>
                                ${this.hosts.map(host => {
                                    // Processor info
                                    let processorInfo = 'N/A';
                                    if (host.processor) {
                                        const manufacturer = host.processor.manufacturer || '';
                                        const name = host.processor.name || 'N/A';
                                        const clockSpeed = host.processor.maxClockSpeed ? `${host.processor.maxClockSpeed} GHz` : '';
                                        processorInfo = [manufacturer, name, clockSpeed].filter(Boolean).join(' ') || 'N/A';
                                    } else if (host.hardware?.processor) {
                                        processorInfo = host.hardware.processor;
                                    }
                                    
                                    const logicalProcessor = host.logicalProcessor || 0;
                                    const socketCount = host.socketCount || 0;
                                    const hyperThreading = host.processor?.hyperThreading ? 
                                        `<span class="tooltip-trigger" title="Hyper-Threading: Enabled">HT</span>` : '';
                                    
                                    // Memory info - handle both number and string formats
                                    let memTotal = 'N/A';
                                    let memUsed = 'N/A';
                                    let memFree = 'N/A';
                                    
                                    if (typeof host.memory?.total === 'number') {
                                        memTotal = host.memory.total.toFixed(1);
                                    } else if (typeof host.totalMemory === 'number') {
                                        memTotal = host.totalMemory.toFixed(1);
                                    } else if (host.totalMemory) {
                                        // Parse string like "31.15 GB" or just "31.15"
                                        const memMatch = host.totalMemory.toString().match(/([\d.]+)/);
                                        if (memMatch) {
                                            memTotal = parseFloat(memMatch[1]).toFixed(1);
                                        }
                                    }
                                    
                                    if (typeof host.memory?.used === 'number') {
                                        memUsed = host.memory.used.toFixed(1);
                                    } else if (typeof host.usedMemory === 'number') {
                                        memUsed = host.usedMemory.toFixed(1);
                                    } else if (host.usedMemory) {
                                        const memMatch = host.usedMemory.toString().match(/([\d.]+)/);
                                        if (memMatch) {
                                            memUsed = parseFloat(memMatch[1]).toFixed(1);
                                        }
                                    }
                                    
                                    if (typeof host.memory?.free === 'number') {
                                        memFree = host.memory.free.toFixed(1);
                                    } else if (typeof host.freeMemory === 'number') {
                                        memFree = host.freeMemory.toFixed(1);
                                    } else if (host.freeMemory) {
                                        const memMatch = host.freeMemory.toString().match(/([\d.]+)/);
                                        if (memMatch) {
                                            memFree = parseFloat(memMatch[1]).toFixed(1);
                                        }
                                    }
                                    
                                    const isClustered = host.isClustered ? 'Clustered' : 'Standalone';
                                    // For clustered nodes, show clusterNodeState if available and not Unknown
                                    // If Unknown but host is online, show status instead
                                    let clusterStateInfo = '';
                                    if (host.isClustered) {
                                        if (host.clusterNodeState && host.clusterNodeState !== 'Unknown') {
                                            clusterStateInfo = ` • ${host.clusterNodeState}`;
                                        } else if (host.status && host.status !== 'offline') {
                                            // Show status if cluster state is unknown but host is online
                                            clusterStateInfo = ` • ${host.status.charAt(0).toUpperCase() + host.status.slice(1)}`;
                                        } else if (host.state && host.state !== 'Down') {
                                            clusterStateInfo = ` • ${host.state}`;
                                        }
                                    }
                                    
                                    return `
                                        <tr>
                                            <td>
                                                <strong>${host.name}</strong><br>
                                                <small>${isClustered}${clusterStateInfo}</small>
                                            </td>
                                            <td>
                                                ${host.hardware?.manufacturer || 'N/A'}, ${host.hardware?.model || 'N/A'}
                                            </td>
                                            <td>${host.osVersion || 'N/A'}</td>
                                            <td>
                                                ${(() => {
                                                    // Priority: error > status > clusterNodeState > state
                                                    let hostStatus = 'up';
                                                    
                                                    // If there's an error, definitely offline
                                                    if (host.error) {
                                                        hostStatus = 'offline';
                                                    }
                                                    // Check status field (from PowerShell script)
                                                    else if (host.status) {
                                                        hostStatus = host.status.toLowerCase();
                                                    }
                                                    // For clustered nodes, check clusterNodeState
                                                    else if (host.isClustered && host.clusterNodeState) {
                                                        const clusterState = host.clusterNodeState.toLowerCase();
                                                        if (clusterState === 'down' || clusterState === 'paused' || clusterState === 'failed') {
                                                            hostStatus = 'offline';
                                                        } else {
                                                            hostStatus = clusterState;
                                                        }
                                                    }
                                                    // Fall back to state field
                                                    else if (host.state) {
                                                        const stateLower = host.state.toLowerCase();
                                                        hostStatus = (stateLower === 'down') ? 'offline' : stateLower;
                                                    }
                                                    
                                                    const statusClass = hostStatus;
                                                    const statusText = hostStatus === 'offline' ? 'Offline' : this.translateStatus(hostStatus);
                                                    const errorTooltip = host.error ? ` title="Error: ${host.error.replace(/"/g, '&quot;')}"` : '';
                                                    return `<span class="status-badge status-${statusClass}"${errorTooltip}>${statusText}</span>`;
                                                })()}
                                            </td>
                                            <td>${host.uptime || 'N/A'}</td>
                                            <td>${host.domain || 'N/A'}</td>
                                            <td>
                                                <strong>${host.totalVm || 0}</strong> ${this.t('total')}<br>
                                                <small>${host.runningVm || 0} ${this.translateStatus('Running')}</small>
                                            </td>
                                            <td>
                                                ${logicalProcessor > 0 ? `
                                                <div class="tooltip-trigger" title="Sockets: ${socketCount}&#10;Logical: ${logicalProcessor}${host.processor?.hyperThreading ? '&#10;Hyper-Threading: Enabled' : ''}">
                                                    ${logicalProcessor} LP
                                                    ${socketCount > 0 ? ` (${socketCount} Sockets)` : ''}
                                                    ${hyperThreading}
                                                </div>
                                                ` : '<span class="text-muted">N/A</span>'}
                                                ${processorInfo !== 'N/A' ? ` <small>${processorInfo}</small>` : ''}
                                            </td>
                                            <td>
                                                ${memTotal !== 'N/A' ? `<strong>${memTotal} GB</strong> ${this.t('total')}` : '<strong>N/A</strong>'}
                                                ${(() => {
                                                    const parts = [];
                                                    if (memUsed !== 'N/A') parts.push(`${memUsed} GB ${this.t('used')}`);
                                                    if (memFree !== 'N/A') parts.push(`${memFree} GB ${this.t('free')}`);
                                                    return parts.length ? `<br><small>${parts.join(', ')}</small>` : '';
                                                })()}
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                </div>
            </div>
        `;
    }

    renderDisksTable() {
        const allDisks = [];
        
        // Add quorum physical disks (showing the actual physical disk, not the volume)
        if (this.quorumDisks && Array.isArray(this.quorumDisks)) {
            this.quorumDisks.forEach(qd => {
                if (qd.diskFriendlyName || qd.diskSize) {
                    allDisks.push({
                        name: qd.diskFriendlyName || `Disk ${qd.diskNumber || 'N/A'}`,
                        label: 'Quorum Physical Disk',
                        size: qd.diskSize || 0,
                        allocated: qd.diskAllocatedSize || 0,
                        unallocated: (qd.diskSize || 0) - (qd.diskAllocatedSize || 0),
                        state: qd.diskOperationalStatus || 'N/A',
                        usage: qd.diskPartitionStyle || 'Quorum',
                        owner: qd.ownerNode || 'N/A',
                        busType: qd.diskBusType || 'N/A',
                        host: qd.ownerNode || 'Cluster',
                        isClustered: true,
                        isQuorum: true,
                        uniqueId: qd.uniqueId || qd.diskSerialNumber || null
                    });
                }
            });
        }
        
        // Add cluster disks
        if (this.clusterDisks && Array.isArray(this.clusterDisks)) {
            this.clusterDisks.forEach(cd => {
                allDisks.push({
                    name: cd.name || 'N/A',
                    label: cd.description || 'N/A',
                    size: 0,
                    allocated: 0,
                    unallocated: 0,
                    state: cd.state || 'N/A',
                    usage: 'Clustered Disk',
                    owner: cd.ownerNode || 'N/A',
                    busType: 'N/A',
                    host: cd.ownerNode || 'Cluster',
                    isClustered: true,
                    isQuorum: false,
                    uniqueId: cd.id || cd.name || null
                });
            });
        }
        
        // Add host disks
        this.hosts.forEach(host => {
            if (host.disks && Array.isArray(host.disks)) {
                host.disks.forEach(disk => {
                    allDisks.push({
                        name: disk.friendlyName || `Disk ${disk.number || 'N/A'}`,
                        label: disk.friendlyName || `Physical Disk ${disk.number || 'N/A'}`,
                        size: disk.size || 0,
                        allocated: disk.allocatedSize || 0,
                        unallocated: (disk.size || 0) - (disk.allocatedSize || 0),
                        state: disk.operationalStatus || 'N/A',
                        usage: disk.partitionStyle || 'N/A',
                        owner: host.name,
                        busType: disk.busType || 'N/A',
                        host: host.name,
                        isClustered: host.isClustered || false,
                        isQuorum: false,
                        uniqueId: disk.uniqueId || disk.serialNumber || null
                    });
                });
            }
        });
        
        // Deduplicate disks by uniqueId
        const diskMap = new Map();
        allDisks.forEach(disk => {
            const key = disk.uniqueId || `${disk.name}-${disk.size || 0}`;
            if (!diskMap.has(key)) {
                diskMap.set(key, {
                    ...disk,
                    owners: new Set(disk.owner ? [disk.owner] : [])
                });
            } else {
                const group = diskMap.get(key);
                if (disk.owner) {
                    group.owners.add(disk.owner);
                }
                group.isClustered = group.isClustered || disk.isClustered;
                if (!group.label && disk.label) group.label = disk.label;
                if (!group.busType && disk.busType) group.busType = disk.busType;
            }
        });
        
        const deduplicatedDisks = Array.from(diskMap.values()).map(group => {
            const owners = group.owners;
            const aggregated = { ...group };
            aggregated.owner = owners && owners.size ? Array.from(owners).join(', ') : aggregated.owner;
            delete aggregated.owners;
            return aggregated;
        });
        
        if (deduplicatedDisks.length === 0) return '';
        
        return `
            <div class="compact-table-section">
                <div class="section-header-compact">
                    <h3 class="section-title-compact"><i class="fas fa-hdd"></i> ${this.t('physicalDisks')}</h3>
                </div>
                <div class="table-wrapper-compact">
                    <table class="table-compact">
                        <thead>
                            <tr>
                                <th><i class="fas fa-hdd"></i> ${this.t('diskName')}</th>
                                <th><i class="fas fa-tag"></i> ${this.t('label')}</th>
                                <th><i class="fas fa-database"></i> ${this.t('totalSize')}</th>
                                <th><i class="fas fa-chart-pie"></i> ${this.t('allocated')}</th>
                                <th><i class="fas fa-inbox"></i> ${this.t('unallocated')}</th>
                                <th><i class="fas fa-heartbeat"></i> ${this.t('state')}</th>
                                <th><i class="fas fa-tasks"></i> ${this.t('usage')}</th>
                                <th><i class="fas fa-server"></i> ${this.t('owner')}</th>
                                <th><i class="fas fa-plug"></i> ${this.t('busType')}</th>
                            </tr>
                        </thead>
                        <tbody>
                                ${deduplicatedDisks.map(disk => {
                                    const sizeTooltip = `Total: ${disk.size.toFixed(2)} GB&#10;Allocated: ${disk.allocated.toFixed(2)} GB&#10;Unallocated: ${disk.unallocated.toFixed(2)} GB`;
                                    return `
                                        <tr${disk.isQuorum ? ' class="quorum-disk-row"' : ''}>
                                            <td>
                                                ${disk.isQuorum ? '<i class="fas fa-shield-alt" style="color: #3b82f6; margin-right: 0.5rem;"></i>' : ''}
                                                <strong>${disk.name}</strong>
                                                ${disk.uniqueId ? `<br><small class="text-muted" style="font-size: 0.7rem;">${disk.uniqueId}</small>` : ''}
                                                ${disk.isClustered ? '<br><small>Clustered</small>' : ''}
                                                ${disk.isQuorum ? `<br><span class="quorum-badge">${this.t('quorumDiskLabel')}</span>` : ''}
                                            </td>
                                            <td>
                                                <div class="tooltip-trigger" title="${disk.label}">
                                                    ${disk.label.length > 40 ? disk.label.substring(0, 40) + '...' : disk.label}
                                                </div>
                                            </td>
                                            <td>
                                                <div class="tooltip-trigger" title="${sizeTooltip}">
                                                    <strong>${disk.size.toFixed(2)} GB</strong>
                                                </div>
                                            </td>
                                            <td>${disk.allocated.toFixed(2)} GB</td>
                                            <td>${disk.unallocated.toFixed(2)} GB</td>
                                            <td>
                                                <span class="status-badge status-${String(disk.state || 'unknown').toLowerCase().replace(/\s+/g, '-')}">${this.translateStatus(disk.state || 'Unknown')}</span>
                                            </td>
                                            <td>${disk.usage}</td>
                                            <td>${disk.owner}</td>
                                            <td>${disk.busType}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                </div>
            </div>
        `;
    }

    renderCSVTable() {
        if (!this.clusterSharedVolumes || !Array.isArray(this.clusterSharedVolumes) || this.clusterSharedVolumes.length === 0) {
            return '';
        }

        return `
            <div class="compact-table-section">
                <div class="section-header-compact">
                    <h3 class="section-title-compact"><i class="fas fa-layer-group"></i> ${this.t('clusterSharedVolumes')}</h3>
                </div>
                <div class="table-wrapper-compact">
                    <table class="table-compact">
                        <thead>
                            <tr>
                                <th><i class="fas fa-layer-group"></i> ${this.t('csvName')}</th>
                                <th><i class="fas fa-folder"></i> ${this.t('path')}</th>
                                <th><i class="fas fa-database"></i> ${this.t('totalSize')}</th>
                                <th><i class="fas fa-chart-pie"></i> ${this.t('used')}</th>
                                <th><i class="fas fa-inbox"></i> ${this.t('free')}</th>
                                <th><i class="fas fa-heartbeat"></i> ${this.t('state')}</th>
                                <th><i class="fas fa-server"></i> ${this.t('ownerNode')}</th>
                                <th><i class="fas fa-file-alt"></i> ${this.t('fileSystem')}</th>
                            </tr>
                        </thead>
                        <tbody>
                                ${this.clusterSharedVolumes.map(csv => {
                                    const size = parseFloat(csv.size) || 0;
                                    const sizeRemaining = parseFloat(csv.sizeRemaining) || 0;
                                    const used = size - sizeRemaining;
                                    const freePercent = size > 0 ? ((sizeRemaining / size) * 100).toFixed(1) : 0;
                                    const usedPercent = size > 0 ? ((used / size) * 100).toFixed(1) : 0;
                                    const sizeTooltip = `Total: ${size.toFixed(2)} GB&#10;Used: ${used.toFixed(2)} GB (${usedPercent}%)&#10;Free: ${sizeRemaining.toFixed(2)} GB (${freePercent}%)`;
                                    
                                    return `
                                        <tr>
                                            <td>
                                                <strong>${csv.name || 'N/A'}</strong>
                                                ${csv.id ? `<br><small class="text-muted" style="font-size: 0.7rem;">${csv.id}</small>` : ''}
                                            </td>
                                            <td>
                                                <div class="tooltip-trigger" title="${csv.path || 'N/A'}">
                                                    ${csv.path ? (csv.path.length > 50 ? csv.path.substring(0, 50) + '...' : csv.path) : 'N/A'}
                                                </div>
                                            </td>
                                            <td>
                                                <div class="tooltip-trigger" title="${sizeTooltip}">
                                                    <strong>${size.toFixed(2)} GB</strong>
                                                </div>
                                            </td>
                                            <td>
                                                <span style="color: #dc2626;">${used.toFixed(2)} GB</span>
                                                <br><small class="text-muted">${usedPercent}%</small>
                                            </td>
                                            <td>
                                                <span style="color: #16a34a;">${sizeRemaining.toFixed(2)} GB</span>
                                                <br><small class="text-muted">${freePercent}%</small>
                                            </td>
                                            <td>
                                                <span class="status-badge status-${String(csv.state || 'unknown').toLowerCase().replace(/\s+/g, '-')}">${this.translateStatus(csv.state || 'Unknown')}</span>
                                            </td>
                                            <td>${csv.ownerNode || 'N/A'}</td>
                                            <td>${csv.fileSystem || 'N/A'}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                </div>
            </div>
        `;
    }

    renderQuorumTable() {
        if (!this.quorumDisks || !Array.isArray(this.quorumDisks) || this.quorumDisks.length === 0) {
            return '';
        }

        return `
            <div class="compact-table-section">
                <div class="section-header-compact">
                    <h3 class="section-title-compact"><i class="fas fa-shield-alt"></i> ${this.t('quorumDisk')}</h3>
                </div>
                <div class="table-wrapper-compact">
                    <table class="table-compact">
                        <thead>
                            <tr>
                                <th><i class="fas fa-shield-alt"></i> ${this.t('resourceName')}</th>
                                <th><i class="fas fa-folder"></i> ${this.t('path')}</th>
                                <th><i class="fas fa-database"></i> ${this.t('totalSize')}</th>
                                <th><i class="fas fa-chart-pie"></i> ${this.t('used')}</th>
                                <th><i class="fas fa-inbox"></i> ${this.t('free')}</th>
                                <th><i class="fas fa-heartbeat"></i> ${this.t('state')}</th>
                                <th><i class="fas fa-server"></i> ${this.t('ownerNode')}</th>
                                <th><i class="fas fa-file-alt"></i> ${this.t('fileSystem')}</th>
                                <th><i class="fas fa-cog"></i> ${this.t('resourceType')}</th>
                            </tr>
                        </thead>
                        <tbody>
                                ${this.quorumDisks.map(quorum => {
                                    const size = parseFloat(quorum.size) || 0;
                                    const sizeRemaining = parseFloat(quorum.sizeRemaining) || 0;
                                    const used = size - sizeRemaining;
                                    const freePercent = size > 0 ? ((sizeRemaining / size) * 100).toFixed(1) : 0;
                                    const usedPercent = size > 0 ? ((used / size) * 100).toFixed(1) : 0;
                                    const sizeTooltip = `Total: ${size.toFixed(2)} GB&#10;Used: ${used.toFixed(2)} GB (${usedPercent}%)&#10;Free: ${sizeRemaining.toFixed(2)} GB (${freePercent}%)`;
                                    
                                    return `
                                        <tr class="quorum-disk-row">
                                            <td>
                                                <strong><i class="fas fa-shield-alt" style="color: #3b82f6; margin-right: 0.5rem;"></i>${quorum.name || 'N/A'}</strong>
                                                ${quorum.id ? `<br><small class="text-muted" style="font-size: 0.7rem;">${quorum.id}</small>` : ''}
                                                ${quorum.diskGuid && quorum.diskGuid !== 'N/A' ? `<br><small class="text-muted" style="font-size: 0.65rem;" title="Disk GUID">${quorum.diskGuid}</small>` : ''}
                                            </td>
                                            <td>
                                                <div class="tooltip-trigger" title="${quorum.path || 'N/A'}">
                                                    ${quorum.path && quorum.path !== 'N/A' ? (quorum.path.length > 50 ? quorum.path.substring(0, 50) + '...' : quorum.path) : 'N/A'}
                                                </div>
                                                ${quorum.uniqueId && quorum.uniqueId !== 'N/A' ? `<br><small class="text-muted" style="font-size: 0.65rem;" title="Unique ID">${quorum.uniqueId.length > 40 ? quorum.uniqueId.substring(0, 40) + '...' : quorum.uniqueId}</small>` : ''}
                                            </td>
                                            <td>
                                                <div class="tooltip-trigger" title="${sizeTooltip}">
                                                    <strong>${size > 0 ? size.toFixed(2) + ' GB' : 'N/A'}</strong>
                                                </div>
                                            </td>
                                            <td>
                                                ${size > 0 ? `
                                                    <span style="color: #dc2626;">${used.toFixed(2)} GB</span>
                                                    <br><small class="text-muted">${usedPercent}%</small>
                                                ` : '<span class="text-muted">N/A</span>'}
                                            </td>
                                            <td>
                                                ${size > 0 ? `
                                                    <span style="color: #16a34a;">${sizeRemaining.toFixed(2)} GB</span>
                                                    <br><small class="text-muted">${freePercent}%</small>
                                                ` : '<span class="text-muted">N/A</span>'}
                                            </td>
                                            <td>
                                                <span class="status-badge status-${String(quorum.state || 'unknown').toLowerCase().replace(/\s+/g, '-')}">${this.translateStatus(quorum.state || 'Unknown')}</span>
                                            </td>
                                            <td>
                                                <strong>${quorum.ownerNode || 'N/A'}</strong>
                                                ${quorum.ownerGroup && typeof quorum.ownerGroup === 'string' ? `<br><small class="text-muted">${quorum.ownerGroup}</small>` : ''}
                                            </td>
                                            <td>${quorum.fileSystem && quorum.fileSystem !== 'N/A' ? quorum.fileSystem : 'N/A'}</td>
                                            <td>
                                                <span class="resource-type-badge">${quorum.resourceType || 'Physical Disk'}</span>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                </div>
            </div>
        `;
    }


    renderVolumesTable() {
        const allVolumes = [];
        
        // Add host volumes (exclude CSVs - they have their own table now)
        this.hosts.forEach(host => {
            if (host.volumes && Array.isArray(host.volumes)) {
                host.volumes.forEach(vol => {
                    allVolumes.push({
                        name: vol.fileSystemLabel || vol.driveLetter || 'N/A',
                        label: vol.driveLetter ? `${vol.driveLetter}:` : vol.fileSystemLabel || 'N/A',
                        size: vol.size || 0,
                        sizeRemaining: vol.sizeRemaining || 0,
                        used: (vol.size || 0) - (vol.sizeRemaining || 0),
                        state: vol.healthStatus || 'N/A',
                        usage: 'Logical Partition',
                        owner: host.name,
                        fileSystem: vol.fileSystem || 'N/A',
                        host: host.name,
                        isCSV: false,
                        uniqueId: vol.uniqueId || vol.path || null
                    });
                });
            }
        });
        
        // Deduplicate volumes by uniqueId
        const volumeMap = new Map();
        allVolumes.forEach(volume => {
            const key = volume.uniqueId || `${volume.name}-${volume.size || 0}`;
            if (!volumeMap.has(key)) {
                volumeMap.set(key, {
                    ...volume,
                    owners: new Set(volume.owner ? [volume.owner] : [])
                });
            } else {
                const group = volumeMap.get(key);
                if (volume.owner) {
                    group.owners.add(volume.owner);
                }
                group.isCSV = group.isCSV || volume.isCSV;
            }
        });
        
        const deduplicatedVolumes = Array.from(volumeMap.values()).map(group => {
            const owners = group.owners;
            const aggregated = { ...group };
            aggregated.owner = owners && owners.size ? Array.from(owners).join(', ') : aggregated.owner;
            delete aggregated.owners;
            return aggregated;
        });
        
        if (deduplicatedVolumes.length === 0) return '';
        
        return `
            <div class="compact-table-section">
                <div class="section-header-compact">
                    <h3 class="section-title-compact"><i class="fas fa-folder"></i> ${this.t('disksVolumes')}</h3>
                </div>
                <div class="table-wrapper-compact">
                    <table class="table-compact">
                        <thead>
                            <tr>
                                <th><i class="fas fa-folder"></i> ${this.t('volumeName')}</th>
                                <th><i class="fas fa-tag"></i> ${this.t('volumeLabel')}</th>
                                <th><i class="fas fa-database"></i> ${this.t('totalSize')}</th>
                                <th><i class="fas fa-chart-pie"></i> ${this.t('used')}</th>
                                <th><i class="fas fa-inbox"></i> ${this.t('free')}</th>
                                <th><i class="fas fa-heartbeat"></i> ${this.t('state')}</th>
                                <th><i class="fas fa-tasks"></i> ${this.t('volumeUsage')}</th>
                                <th><i class="fas fa-server"></i> ${this.t('volumeOwner')}</th>
                                <th><i class="fas fa-file-alt"></i> ${this.t('volumeFileSystem')}</th>
                            </tr>
                        </thead>
                        <tbody>
                                ${deduplicatedVolumes.map(vol => {
                                    const sizeTooltip = `Total: ${vol.size.toFixed(2)} GB&#10;Used: ${vol.used.toFixed(2)} GB&#10;Free: ${vol.sizeRemaining.toFixed(2)} GB`;
                                    const freePercent = vol.size > 0 ? ((vol.sizeRemaining / vol.size) * 100).toFixed(1) : 0;
                                    return `
                                        <tr>
                                            <td>
                                                <strong>${vol.name}</strong>
                                                ${vol.uniqueId ? `<br><small class="text-muted" style="font-size: 0.7rem;">${vol.uniqueId}</small>` : ''}
                                                ${vol.isCSV ? '<br><small>CSV</small>' : ''}
                                            </td>
                                            <td>
                                                <div class="tooltip-trigger" title="${vol.label}">
                                                    ${vol.label.length > 40 ? vol.label.substring(0, 40) + '...' : vol.label}
                                                </div>
                                            </td>
                                            <td>
                                                <div class="tooltip-trigger" title="${sizeTooltip}">
                                                    <strong>${vol.size.toFixed(2)} GB</strong>
                                                </div>
                                            </td>
                                            <td>${vol.used.toFixed(2)} GB</td>
                                            <td>${vol.sizeRemaining.toFixed(2)} GB (${freePercent}% ${this.t('free').toLowerCase()})</td>
                                            <td>
                                            <span class="status-badge status-${String(vol.state || 'unknown').toLowerCase().replace(/\s+/g, '-')}">${this.translateStatus(vol.state || 'Unknown')}</span>
                                            </td>
                                            <td>${vol.usage}</td>
                                            <td>${vol.owner}</td>
                                            <td>${vol.fileSystem}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                </div>
            </div>
        `;
    }

    renderAllVMsByHost() {
        // Only show for clusters
        if (!this.clusterName || this.vms.length === 0) return '';
        
        return `
            <div class="compact-table-section all-vms-table-section">
                <div class="section-header-compact">
                    <h3 class="section-title-compact"><i class="fas fa-cube"></i> All Virtual Machines</h3>
                </div>
                <div class="table-wrapper-compact">
                    <table class="table-compact">
                        <thead>
                            <tr>
                                <th><i class="fas fa-cube"></i> ${this.t('vmName')}</th>
                                <th><i class="fas fa-code-branch"></i> ${this.t('generationVersion')}</th>
                                <th><i class="fas fa-power-off"></i> ${this.t('state')}</th>
                                <th><i class="fas fa-clock"></i> ${this.t('uptime')}</th>
                                <th><i class="fas fa-server"></i> ${this.t('ownerLabel')}</th>
                                <th><i class="fas fa-microchip"></i> ${this.t('vCPU')}</th>
                                <th><i class="fas fa-memory"></i> ${this.t('vRAM')}</th>
                                <th><i class="fas fa-camera"></i> ${this.t('checkpoints')}</th>
                                <th><i class="fas fa-sync"></i> ${this.t('replica')}</th>
                                <th><i class="fas fa-hdd"></i> ${this.t('disks')}</th>
                                <th><i class="fas fa-network-wired"></i> ${this.t('network')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.vms.map((vm, vmIndex) => {
                                const memStartup = typeof vm.memory?.startup === 'number' ? `${vm.memory.startup.toFixed(1)} GB` : (vm.memory?.startup || 'N/A');
                                const memMin = typeof vm.memory?.min === 'number' ? `${vm.memory.min.toFixed(1)} GB` : (vm.memory?.min || '');
                                const memMax = typeof vm.memory?.max === 'number' ? `${vm.memory.max.toFixed(1)} GB` : (vm.memory?.max || '');
                                const memAssigned = typeof vm.memory?.assigned === 'number' ? `${vm.memory.assigned.toFixed(1)} GB` : (vm.memory?.assigned || '');
                                const checkpointExists = vm.checkpoint?.exists || false;
                                const checkpointCount = vm.checkpoint?.count || 0;
                                
                                const replicaState = vm.replica?.state || 'Disabled';
                                const replicaHealth = vm.replica?.health || 'N/A';
                                const replicaMode = vm.replica?.mode || 'N/A';
                                
                                const rowId = `all-vm-${vmIndex}`;
                                
                                return `
                                <tr class="data-row ${this.filters.expandedRows.has(rowId) ? 'expanded' : ''}" 
                                    onclick="hyperVAuditorInstance.toggleRow('${rowId}')">
                                    <td>
                                        <div class="row-header">
                                            <strong>${vm.name || 'N/A'}</strong>
                                            <i class="fas fa-chevron-${this.filters.expandedRows.has(rowId) ? 'down' : 'right'} expand-icon"></i>
                                        </div>
                                        ${vm.configurationXmlPath ? `<div><small class="text-muted"><i class="fas fa-file-code"></i> Config</small></div>` : ''}
                                    </td>
                                    <td>
                                        <span class="text-muted">Gen${vm.generation || 'N/A'}</span><br>
                                        <small>v${vm.version || 'N/A'}</small>
                                    </td>
                                    <td>
                                        <span class="vm-state-text vm-state-${(vm.state || 'unknown').toLowerCase()}">${this.translateStatus(vm.state || 'Unknown')}</span>
                                    </td>
                                    <td>
                                        <div class="uptime-display">
                                            <i class="fas fa-clock"></i> ${vm.uptime || 'N/A'}
                                        </div>
                                    </td>
                                    <td>${vm.host || 'N/A'}</td>
                                    <td>
                                        <span class="vm-vcpu-text">${vm.vCPU || 'N/A'}</span>
                                    </td>
                                    <td>
                                        <div class="memory-display">
                                            <div class="memory-text-small">${memStartup}</div>
                                            ${memAssigned && memAssigned !== 'N/A' ? `<small class="text-muted">(${memAssigned})</small>` : ''}
                                        </div>
                                    </td>
                                    <td>
                                        ${checkpointExists ? 
                                            `<span class="checkpoint-count-text"><i class="fas fa-camera"></i> ${checkpointCount}</span>` : 
                                            `<span class="text-muted">${this.t('none')}</span>`
                                        }
                                    </td>
                                    <td>
                                        ${replicaState !== 'Disabled' ? 
                                            `<span class="replica-state-text replica-${(replicaHealth || 'unknown').toLowerCase()}">${this.translateStatus(replicaState)}</span>` : 
                                            `<span class="text-muted">${this.t('disabled')}</span>`
                                        }
                                    </td>
                                    <td>
                                        ${(() => {
                                            let totalSize = 0;
                                            let totalMaxSize = 0;
                                            if (vm.disks && Array.isArray(vm.disks)) {
                                                vm.disks.forEach(disk => {
                                                    const currentSize = typeof disk.currentSize === 'number' ? disk.currentSize : 0;
                                                    const maxSize = typeof disk.maxSize === 'number' ? disk.maxSize : 0;
                                                    totalSize += currentSize;
                                                    totalMaxSize += maxSize;
                                                });
                                            }
                                            
                                            const avhdxTotalSize = typeof vm.avhdxTotalSize === 'number' ? vm.avhdxTotalSize : 0;
                                            const totalWithAvhdx = totalSize + avhdxTotalSize;
                                            
                                            const totalSizeText = totalWithAvhdx > 0 ? `${totalWithAvhdx.toFixed(1)} GB` : (totalSize > 0 ? `${totalSize.toFixed(1)} GB` : 'N/A');
                                            const diskCount = vm.disks && Array.isArray(vm.disks) ? vm.disks.length : 0;
                                            
                                            return `
                                                <div class="disk-total-display">
                                                    <div class="disk-total-size">
                                                        <i class="fas fa-hdd"></i>
                                                        <span class="disk-total-value">${totalSizeText}</span>
                                                        ${avhdxTotalSize > 0 ? `<span class="disk-avhdx-indicator">+</span>` : ''}
                                                    </div>
                                                    <div class="disk-total-count">${diskCount} disk${diskCount !== 1 ? 's' : ''}</div>
                                                </div>
                                            `;
                                        })()}
                                    </td>
                                    <td>
                                        ${(() => {
                                            const adapterCount = vm.networkAdapters && Array.isArray(vm.networkAdapters) ? vm.networkAdapters.length : 0;
                                            const connectedCount = vm.networkAdapters && Array.isArray(vm.networkAdapters) ? vm.networkAdapters.filter(a => a.connection === 'Connected').length : 0;
                                            
                                            return adapterCount > 0 ? `
                                                <div class="network-count-display">
                                                    <i class="fas fa-network-wired"></i>
                                                    <span class="network-count-value">${adapterCount}</span>
                                                    ${connectedCount > 0 ? `<span class="network-connected-indicator">(${connectedCount})</span>` : ''}
                                                </div>
                                            ` : '<span class="text-muted">N/A</span>';
                                        })()}
                                    </td>
                                </tr>
                                ${this.filters.expandedRows.has(rowId) ? `
                                <tr class="expanded-row">
                                    <td colspan="11">
                                        <div class="expanded-content-compact">
                                            <div class="vm-config-grid-compact">
                                                <!-- Network Adapters Details -->
                                                <div class="vm-config-section-compact">
                                                    <div class="vm-config-header-compact">
                                                        <i class="fas fa-network-wired"></i>
                                                        <span>${this.t('networkAdapters')}</span>
                                                    </div>
                                                    <div class="vm-config-body-compact">
                                                        ${vm.networkAdapters && Array.isArray(vm.networkAdapters) ? vm.networkAdapters.map(adapter => `
                                                            <div class="vm-config-item-compact">
                                                                <div class="vm-config-item-header-compact">
                                                                    <span class="vm-config-item-name-compact">${adapter.name || 'N/A'}</span>
                                                                    <span class="vm-config-item-status-compact ${adapter.connection === 'Connected' ? 'status-connected' : 'status-disconnected'}">${this.translateStatus(adapter.connection || 'Unknown')}</span>
                                                                </div>
                                                                <div class="vm-config-item-details-compact">
                                                                    <span class="vm-config-detail-compact"><i class="fas fa-ethernet"></i> ${adapter.switch || 'N/A'}</span>
                                                                    ${adapter.vlan && adapter.vlan !== 'N/A' ? `<span class="vm-config-detail-compact"><i class="fas fa-tag"></i> VLAN ${adapter.vlan}</span>` : ''}
                                                                    ${(() => {
                                                                        let ipDisplay = '';
                                                                        if (adapter.ipAddresses && Array.isArray(adapter.ipAddresses) && adapter.ipAddresses.length > 0) {
                                                                            const ipList = adapter.ipAddresses.map(ipInfo => {
                                                                                if (typeof ipInfo === 'string') {
                                                                                    return ipInfo;
                                                                                } else if (ipInfo.ip) {
                                                                                    return ipInfo.prefixLength ? `${ipInfo.ip}/${ipInfo.prefixLength}` : ipInfo.ip;
                                                                                }
                                                                                return '';
                                                                            }).filter(Boolean);
                                                                            if (ipList.length > 0) {
                                                                                ipDisplay = ipList.join(', ');
                                                                            }
                                                                        } else if (adapter.ip && adapter.ip !== 'N/A') {
                                                                            ipDisplay = adapter.ip;
                                                                        }
                                                                        return ipDisplay ? `<span class="vm-config-detail-compact"><i class="fas fa-network-wired"></i> <strong>${ipDisplay}</strong></span>` : '';
                                                                    })()}
                                                                    ${adapter.macAddress ? `<span class="vm-config-detail-compact"><i class="fas fa-fingerprint"></i> ${adapter.macAddress}</span>` : ''}
                                                                    ${adapter.deviceType ? `<span class="vm-config-detail-compact"><i class="fas fa-desktop"></i> ${adapter.deviceType}</span>` : ''}
                                                                </div>
                                                            </div>
                                                        `).join('') : '<div class="vm-config-item-compact"><span class="text-muted">No network adapters</span></div>'}
                                                    </div>
                                                </div>
                                                <!-- Disks Details -->
                                                <div class="vm-config-section-compact">
                                                    <div class="vm-config-header-compact">
                                                        <i class="fas fa-hdd"></i>
                                                        <span>${this.t('disks')}</span>
                                                    </div>
                                                    <div class="vm-config-body-compact">
                                                        ${vm.disks && Array.isArray(vm.disks) && vm.disks.length > 0 ? vm.disks.map(disk => {
                                                            const diskSize = typeof disk.currentSize === 'number' ? `${disk.currentSize.toFixed(1)} GB` : (disk.currentSize || 'N/A');
                                                            const diskMax = typeof disk.maxSize === 'number' ? `${disk.maxSize.toFixed(1)} GB` : (disk.maxSize || 'N/A');
                                                            return `
                                                            <div class="vm-config-item-compact ${disk.fileExists === false ? 'disk-missing' : ''}">
                                                                <div class="vm-config-item-header-compact">
                                                                    <span class="vm-config-item-name-compact">${disk.name || 'N/A'}</span>
                                                                    <div class="vm-config-item-badges-compact">
                                                                        ${disk.isDifferencing ? '<span class="vm-config-badge-compact badge-diff">Diff</span>' : ''}
                                                                        ${disk.fileExists === false ? '<span class="vm-config-badge-compact badge-missing">⚠ Missing</span>' : ''}
                                                                        <span class="vm-config-badge-compact badge-type">${disk.type || disk.diskType || 'N/A'}</span>
                                                                    </div>
                                                                </div>
                                                                <div class="vm-config-item-details-compact">
                                                                    <span class="vm-config-detail-compact"><i class="fas fa-hdd"></i> ${diskSize} / ${diskMax}</span>
                                                                    ${disk.format ? `<span class="vm-config-detail-compact"><i class="fas fa-file"></i> ${disk.format}</span>` : ''}
                                                                    ${disk.controller ? `<span class="vm-config-detail-compact"><i class="fas fa-server"></i> ${disk.controller}${disk.controllerNumber !== undefined ? ` (${disk.controllerNumber}:${disk.controllerLocation})` : ''}</span>` : ''}
                                                                    ${disk.fragmentationPercent !== undefined ? `<span class="vm-config-detail-compact"><i class="fas fa-chart-pie"></i> ${disk.fragmentationPercent.toFixed(2)}% ${this.t('fragmentation')}</span>` : ''}
                                                                </div>
                                                                ${disk.path && disk.path !== 'Pass-through' ? `<div class="vm-config-path-compact"><i class="fas fa-folder"></i> ${disk.path}</div>` : ''}
                                                            </div>
                                                        `;
                                                        }).join('') : '<div class="vm-config-item-compact"><span class="text-muted">No disks</span></div>'}
                                                    </div>
                                                </div>
                                                <!-- Memory & Integration Services -->
                                                <div class="vm-config-section-compact">
                                                    <div class="vm-config-header-compact">
                                                        <i class="fas fa-memory"></i>
                                                        <span>${this.t('memoryServices')}</span>
                                                    </div>
                                                    <div class="vm-config-body-compact">
                                                        <div class="vm-config-item-compact">
                                                            <div class="vm-config-item-details-compact">
                                                                <span class="vm-config-detail-compact"><i class="fas fa-play"></i> ${this.t('startupRam')}: ${memStartup}</span>
                                                                ${memMin ? `<span class="vm-config-detail-compact"><i class="fas fa-arrow-down"></i> ${this.t('minRam')}: ${memMin}</span>` : ''}
                                                                ${memMax ? `<span class="vm-config-detail-compact"><i class="fas fa-arrow-up"></i> ${this.t('maxRam')}: ${memMax}</span>` : ''}
                                                                ${memAssigned ? `<span class="vm-config-detail-compact"><i class="fas fa-check"></i> ${this.t('assignedRam')}: ${memAssigned}</span>` : ''}
                                                            </div>
                                                        </div>
                                                        ${vm.integrationServices ? `
                                                        <div class="vm-config-item-compact">
                                                            <div class="vm-config-item-details-compact">
                                                                ${(() => {
                                                                    const state = vm.integrationServices.state || 'N/A';
                                                                    let icon = 'fa-check-circle';
                                                                    let icsClass = 'ics-uptodate';
                                                                    if (state === 'UpdateRequired') {
                                                                        icon = 'fa-exclamation-triangle';
                                                                        icsClass = 'ics-updaterequired';
                                                                    } else if (state === 'MayBeRequired') {
                                                                        icon = 'fa-question-circle';
                                                                        icsClass = 'ics-mayberequired';
                                                                    } else if (state === 'NotDetected') {
                                                                        icon = 'fa-times-circle';
                                                                        icsClass = 'ics-notdetected';
                                                                    }
                                                                    return `<span class="vm-config-detail-compact"><i class="fas ${icon}"></i> <span class="${icsClass}">ICS: ${state}</span></span><span class="vm-config-detail-compact"><i class="fas fa-code-branch"></i> v${vm.integrationServices.version || 'N/A'}</span>`;
                                                                })()}
                                                            </div>
                                                        </div>
                                                        ` : ''}
                                                    </div>
                                                </div>
                                                <!-- Checkpoints -->
                                                ${vm.checkpoint && checkpointExists ? `
                                                <div class="vm-config-section-compact">
                                                    <div class="vm-config-header-compact">
                                                        <i class="fas fa-camera"></i>
                                                        <span>${this.t('checkpoints')} (${checkpointCount})</span>
                                                    </div>
                                                    <div class="vm-config-body-compact">
                                                        ${vm.checkpoint.chain && vm.checkpoint.chain.length > 0 ? vm.checkpoint.chain.map((cp, cpIndex) => {
                                                            const totalDiskSize = cp.disks && cp.disks.length > 0 ? 
                                                                cp.disks.reduce((sum, d) => sum + (typeof d.currentSize === 'number' ? d.currentSize : 0), 0) : 0;
                                                            return `
                                                            <div class="vm-config-item-compact">
                                                                <div class="vm-config-item-header-compact">
                                                                    <span class="vm-config-item-name-compact"><i class="fas fa-camera"></i> ${cp.name}</span>
                                                                    <div class="vm-config-item-badges-compact">
                                                                        <span class="vm-config-badge-compact badge-time">${cp.creationTime}</span>
                                                                        ${totalDiskSize > 0 ? `<span class="vm-config-badge-compact badge-size">${totalDiskSize.toFixed(1)} GB</span>` : ''}
                                                                    </div>
                                                                </div>
                                                                ${cp.disks && Array.isArray(cp.disks) && cp.disks.length > 0 ? `
                                                                <div class="vm-config-item-details-compact">
                                                                    ${cp.disks.map((disk, diskIdx) => {
                                                                        const diskSize = typeof disk.currentSize === 'number' ? disk.currentSize.toFixed(1) : 
                                                                            (typeof disk.currentSize === 'string' ? disk.currentSize.replace(' GB', '') : 'N/A');
                                                                        const diskMax = typeof disk.maxSize === 'number' ? disk.maxSize.toFixed(1) : 
                                                                            (typeof disk.maxSize === 'string' ? disk.maxSize.replace(' GB', '') : 'N/A');
                                                                        const diskName = disk.name || disk.path || `Disk ${diskIdx + 1}`;
                                                                        return `<span class="vm-config-detail-compact"><i class="fas fa-hdd"></i> ${diskName}: ${diskSize}/${diskMax} GB</span>`;
                                                                    }).join('')}
                                                                </div>
                                                                ` : ''}
                                                            </div>
                                                            `;
                                                        }).join('') : ''}
                                                    </div>
                                                </div>
                                                ` : ''}
                                                <!-- Replica -->
                                                ${vm.replica && vm.replica.state !== 'Disabled' ? `
                                                <div class="vm-config-section-compact">
                                                    <div class="vm-config-header-compact">
                                                        <i class="fas fa-sync"></i>
                                                        <span>${this.t('replica')}</span>
                                                    </div>
                                                    <div class="vm-config-body-compact">
                                                        <div class="vm-config-item-compact">
                                                            <div class="vm-config-item-details-compact">
                                                                <span class="vm-config-detail-compact"><i class="fas fa-info-circle"></i> ${this.translateStatus(replicaState)}</span>
                                                                <span class="vm-config-detail-compact"><i class="fas fa-heartbeat"></i> ${this.translateStatus(replicaHealth)}</span>
                                                                <span class="vm-config-detail-compact"><i class="fas fa-cog"></i> ${replicaMode}</span>
                                                                ${vm.replica.frequency ? `<span class="vm-config-detail-compact"><i class="fas fa-clock"></i> ${vm.replica.frequency}s</span>` : ''}
                                                                ${vm.replica.lastReplicationTime ? `<span class="vm-config-detail-compact"><i class="fas fa-calendar"></i> ${vm.replica.lastReplicationTime}</span>` : ''}
                                                                ${vm.replica.replicaServer ? `<span class="vm-config-detail-compact"><i class="fas fa-server"></i> ${vm.replica.replicaServer}</span>` : ''}
                                                                ${vm.replica.primaryServer ? `<span class="vm-config-detail-compact"><i class="fas fa-server"></i> Primary: ${vm.replica.primaryServer}</span>` : ''}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                ` : ''}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                                ` : ''}
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                </div>
            </div>
        `;
    }

    renderServerSections() {
        const sectionHeader = this.hosts.length > 0 ? `
            <div class="hosts-section-divider">
                <div class="divider-line"></div>
                <div class="divider-content">
                    <i class="fas fa-server"></i>
                    <h2>Host Details</h2>
                    <span class="host-count-badge">${this.hosts.length} ${this.hosts.length === 1 ? 'Host' : 'Hosts'}</span>
                </div>
                <div class="divider-line"></div>
            </div>
        ` : '';
        
        return sectionHeader + this.hosts.map((host, hostIndex) => {
            const hostVMs = this.vms.filter(vm => vm.host === host.name);
            const hostErrors = host.systemErrors || [];
            const hypervErrors = host.hypervErrors || [];
            const totalErrors = hostErrors.length + hypervErrors.length;
            
            // Check if host is offline - Priority: error > status > clusterNodeState > state
            let hostStatus = 'online';
            if (host.error) {
                hostStatus = 'offline';
            } else if (host.status) {
                hostStatus = host.status.toLowerCase();
            } else if (host.isClustered && host.clusterNodeState) {
                const clusterState = host.clusterNodeState.toLowerCase();
                if (clusterState === 'down' || clusterState === 'paused' || clusterState === 'failed') {
                    hostStatus = 'offline';
                } else {
                    hostStatus = clusterState;
                }
            } else if (host.state) {
                const stateLower = host.state.toLowerCase();
                hostStatus = (stateLower === 'down') ? 'offline' : stateLower;
            }
            const isOffline = hostStatus === 'offline';
            
            return `
                <div class="server-card-wrapper ${isOffline ? 'server-offline' : ''}">
                    <div class="server-header-modern">
                        <div class="server-header-left-section">
                            <div class="server-icon-modern">
                                <i class="fas fa-server"></i>
                                ${hostVMs.length > 0 ? `<span class="vm-count-bubble">${hostVMs.length}</span>` : ''}
                            </div>
                            <div class="server-title-group">
                                <div style="display: flex; align-items: center; gap: 0.75rem;">
                                    <h3 class="server-title-modern">${host.name}</h3>
                                    ${(() => {
                                        // Priority: error > status > clusterNodeState > state
                                        let hostStatus = 'online';
                                        if (host.error) {
                                            hostStatus = 'offline';
                                        } else if (host.status) {
                                            hostStatus = host.status.toLowerCase();
                                        } else if (host.isClustered && host.clusterNodeState) {
                                            const clusterState = host.clusterNodeState.toLowerCase();
                                            if (clusterState === 'down' || clusterState === 'paused' || clusterState === 'failed') {
                                                hostStatus = 'offline';
                                            } else {
                                                hostStatus = clusterState;
                                            }
                                        } else if (host.state) {
                                            const stateLower = host.state.toLowerCase();
                                            hostStatus = (stateLower === 'down') ? 'offline' : stateLower;
                                        }
                                        const statusClass = hostStatus;
                                        const statusText = hostStatus === 'offline' ? 'Offline' : (hostStatus === 'online' ? 'Online' : this.translateStatus(hostStatus));
                                        const errorTooltip = host.error ? ` title="Server is offline. Error: ${host.error.replace(/"/g, '&quot;')}"` : '';
                                        return `<span class="status-badge status-${statusClass}"${errorTooltip} style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">${statusText}</span>`;
                                    })()}
                                </div>
                                <div class="server-meta-modern">
                                    <span class="server-meta-item" title="${host.osVersionString || host.osVersion || 'Unknown'}">
                                        <i class="fas fa-desktop"></i> 
                                        ${host.osVersionString || host.osVersion || 'Unknown'}
                                    </span>
                                    <span class="server-meta-item"><i class="fas fa-clock"></i> ${host.uptime || 'N/A'}</span>
                                    <span class="server-meta-item"><i class="fas fa-network-wired"></i> ${host.domain || 'N/A'}</span>
                                    ${host.error ? `<span class="server-meta-item" style="color: #dc2626;" title="${host.error.replace(/"/g, '&quot;')}"><i class="fas fa-exclamation-circle"></i> Error</span>` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="server-header-right-section">
                            ${totalErrors > 0 ? `
                                <div class="server-errors-group">
                                    ${hostErrors.length > 0 ? `
                                    <button class="server-error-btn system-error-btn" onclick="hyperVAuditorInstance.showErrorsModal('system', 'System Errors - ${host.name}', ${hostIndex})">
                                        <i class="fas fa-exclamation-triangle"></i>
                                        <span class="error-count">${hostErrors.length}</span>
                                        <span class="error-type">System</span>
                                    </button>
                                    ` : ''}
                                    ${hypervErrors.length > 0 ? `
                                    <button class="server-error-btn hyperv-error-btn" onclick="hyperVAuditorInstance.showErrorsModal('hyperv', 'Hyper-V Errors - ${host.name}', ${hostIndex})">
                                        <i class="fas fa-server"></i>
                                        <span class="error-count">${hypervErrors.length}</span>
                                        <span class="error-type">Hyper-V</span>
                                    </button>
                                    ` : ''}
                                </div>
                            ` : ''}
                            ${hostVMs.length > 0 ? `
                                <div class="server-stat-badge vm-badge">
                                    <i class="fas fa-cube"></i>
                                    <div class="badge-content">
                                        <div class="badge-value">${hostVMs.length}</div>
                                        <div class="badge-label">VMs</div>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                <div class="server-section-modern">
                    <div class="server-content-modern">
                        <!-- Hardware Information -->
                        <div class="hardware-section-modern">
                            <h4 class="section-subtitle-modern">
                                <i class="fas fa-microchip"></i> ${this.t('hardwareInfo')}
                            </h4>
                            <div class="hardware-grid-modern">
                                <div class="hardware-item-modern">
                                    <i class="fas fa-industry hardware-icon-modern"></i>
                                    <div class="hardware-info-modern">
                                        <span class="hardware-label-modern">${this.t('manufacturer')}</span>
                                        <span class="hardware-value-modern">${host.hardware?.manufacturer || 'N/A'}</span>
                                    </div>
                                </div>
                                <div class="hardware-item-modern">
                                    <i class="fas fa-tag hardware-icon-modern"></i>
                                    <div class="hardware-info-modern">
                                        <span class="hardware-label-modern">${this.t('model')}</span>
                                        <span class="hardware-value-modern">${host.hardware?.model || 'N/A'}</span>
                                    </div>
                                </div>
                                <div class="hardware-item-modern">
                                    <i class="fas fa-barcode hardware-icon-modern"></i>
                                    <div class="hardware-info-modern">
                                        <span class="hardware-label-modern">${this.t('serialNumber')}</span>
                                        <span class="hardware-value-modern">${host.hardware?.serialNumber || 'N/A'}</span>
                                    </div>
                                </div>
                                <div class="hardware-item-modern">
                                    <i class="fas fa-microchip hardware-icon-modern"></i>
                                    <div class="hardware-info-modern">
                                        <span class="hardware-label-modern">${this.t('processor')}</span>
                                        <span class="hardware-value-modern">${host.hardware?.processor || `${host.logicalProcessor || 0} cores`}</span>
                                    </div>
                                </div>
                                <div class="hardware-item-modern">
                                    <i class="fas fa-memory hardware-icon-modern"></i>
                                    <div class="hardware-info-modern">
                                        <span class="hardware-label-modern">${this.t('totalMemory')}</span>
                                        <span class="hardware-value-modern">${host.totalMemory || (host.hardware?.totalMemory ? `${host.hardware.totalMemory} GB` : 'N/A')}</span>
                                    </div>
                                </div>
                                ${host.logicalProcessor ? `
                                <div class="hardware-item-modern">
                                    <i class="fas fa-cogs hardware-icon-modern"></i>
                                    <div class="hardware-info-modern">
                                        <span class="hardware-label-modern">${this.t('logicalProcessors')}</span>
                                        <span class="hardware-value-modern">${host.logicalProcessor}</span>
                                    </div>
                                </div>
                                ` : ''}
                            </div>
                        </div>

                        <!-- System Information -->
                        <div class="hardware-section-modern">
                            <h4 class="section-subtitle-modern">
                                <i class="fas fa-info-circle"></i> ${this.t('systemInfo')}
                            </h4>
                            <div class="hardware-grid-modern">
                                <!-- Operating System -->
                                ${host.osVersionString || host.osVersion ? `
                                <div class="hardware-item-modern">
                                    <i class="fab fa-windows hardware-icon-modern"></i>
                                    <div class="hardware-info-modern">
                                        <span class="hardware-label-modern">Operating System</span>
                                        <span class="hardware-value-modern">${host.osVersionString || host.osVersion}</span>
                                    </div>
                                </div>
                                ` : ''}
                                
                                <!-- Build Number -->
                                ${host.osFullBuild || host.osBuildNumber ? `
                                <div class="hardware-item-modern">
                                    <i class="fas fa-code-branch hardware-icon-modern"></i>
                                    <div class="hardware-info-modern">
                                        <span class="hardware-label-modern">Build Number</span>
                                        <span class="hardware-value-modern">${host.osFullBuild || host.osBuildNumber}</span>
                                    </div>
                                </div>
                                ` : ''}
                                
                                <!-- Architecture -->
                                ${host.osArchitecture ? `
                                <div class="hardware-item-modern">
                                    <i class="fas fa-microchip hardware-icon-modern"></i>
                                    <div class="hardware-info-modern">
                                        <span class="hardware-label-modern">Architecture</span>
                                        <span class="hardware-value-modern">${host.osArchitecture}</span>
                                    </div>
                                </div>
                                ` : ''}
                                
                                <!-- Edition -->
                                ${host.osEditionID || host.osProductName ? `
                                <div class="hardware-item-modern">
                                    <i class="fas fa-award hardware-icon-modern"></i>
                                    <div class="hardware-info-modern">
                                        <span class="hardware-label-modern">Edition</span>
                                        <span class="hardware-value-modern">${host.osEditionID || host.osProductName}</span>
                                    </div>
                                </div>
                                ` : ''}
                                
                                <!-- Install Date -->
                                ${host.osInstallDate ? `
                                <div class="hardware-item-modern">
                                    <i class="fas fa-calendar-alt hardware-icon-modern"></i>
                                    <div class="hardware-info-modern">
                                        <span class="hardware-label-modern">Install Date</span>
                                        <span class="hardware-value-modern">${(() => {
                                            try {
                                                let dateStr = host.osInstallDate;
                                                if (typeof dateStr === 'string' && dateStr.match(/^\/Date\((\d+)\)\/$/)) {
                                                    const timestamp = parseInt(dateStr.match(/^\/Date\((\d+)\)\/$/)[1]);
                                                    const date = new Date(timestamp);
                                                    return date.toLocaleDateString();
                                                }
                                                const date = new Date(dateStr);
                                                return isNaN(date.getTime()) ? dateStr : date.toLocaleDateString();
                                            } catch (e) {
                                                return host.osInstallDate;
                                            }
                                        })()}</span>
                                    </div>
                                </div>
                                ` : ''}
                                
                                <!-- Activation Status -->
                                ${host.windowsActivation ? `
                                <div class="hardware-item-modern">
                                    <i class="fas fa-key hardware-icon-modern"></i>
                                    <div class="hardware-info-modern">
                                        <span class="hardware-label-modern">Activation Status</span>
                                        <span class="hardware-value-modern">
                                            ${(() => {
                                                const status = host.windowsActivation.licenseStatus || 'Unknown';
                                                const isActivated = host.windowsActivation.isActivated;
                                                const statusLower = status.toLowerCase();
                                                
                                                // Determine status type for better styling
                                                let statusType = 'warning';
                                                if (isActivated === true || statusLower.includes('licensed') || statusLower.includes('activated')) {
                                                    statusType = 'success';
                                                } else if (isActivated === false || statusLower.includes('unlicensed') || statusLower.includes('non-genuine') || statusLower.includes('inactive')) {
                                                    statusType = 'error';
                                                } else if (statusLower.includes('grace') || statusLower.includes('notification')) {
                                                    statusType = 'warning';
                                                }
                                                
                                                return `<span class="activation-status activation-${statusType}">${status}</span>`;
                                            })()}
                                        </span>
                                    </div>
                                </div>
                                ` : ''}
                                
                                <!-- Product Key -->
                                ${host.windowsActivation && host.windowsActivation.productKey && host.windowsActivation.productKey !== 'N/A' ? `
                                <div class="hardware-item-modern">
                                    <i class="fas fa-fingerprint hardware-icon-modern"></i>
                                    <div class="hardware-info-modern">
                                        <span class="hardware-label-modern">Product Key</span>
                                        <span class="hardware-value-modern system-product-key">${host.windowsActivation.productKey}</span>
                                    </div>
                                </div>
                                ` : ''}
                                
                                <!-- KMS Server -->
                                ${host.windowsActivation && host.windowsActivation.kmsServer ? `
                                <div class="hardware-item-modern">
                                    <i class="fas fa-server hardware-icon-modern"></i>
                                    <div class="hardware-info-modern">
                                        <span class="hardware-label-modern">KMS Server</span>
                                        <span class="hardware-value-modern">
                                            ${host.windowsActivation.kmsServer}${host.windowsActivation.kmsPort ? `:${host.windowsActivation.kmsPort}` : ''}
                                        </span>
                                    </div>
                                </div>
                                ` : ''}
                            </div>
                        </div>

                        <!-- Server Roles -->
                        ${host.serverRoles && host.serverRoles.length > 0 ? `
                        <div class="roles-section-modern">
                            <h4 class="section-subtitle-modern">
                                <i class="fas fa-layer-group"></i> ${this.t('serverRoles')}
                                <span class="role-count-badge-modern">${host.serverRoles.length}</span>
                            </h4>
                            <div class="roles-grid-modern">
                                ${host.serverRoles.map((role, roleIndex) => {
                                    const featureType = role.featureType || 'Feature';
                                    const typeClass = featureType.toLowerCase().replace(/\s+/g, '-');
                                    const typeIcon = featureType === 'Role' ? 'fa-server' : 
                                                    featureType === 'Role Service' ? 'fa-cog' : 'fa-puzzle-piece';
                                    const roleId = `role-${hostIndex}-${roleIndex}`;
                                    return `
                                    <div class="role-item-modern role-type-${typeClass}" onclick="hyperVAuditorInstance.showFeatureModal(${hostIndex}, ${roleIndex})" style="cursor: pointer;">
                                        <div class="role-header-modern">
                                            <i class="fas ${typeIcon} role-type-icon"></i>
                                            <div class="role-name-modern">${role.displayName || role.name || 'Unknown'}</div>
                                        </div>
                                        ${role.description ? `<div class="role-description-modern">${role.description.length > 80 ? role.description.substring(0, 80) + '...' : role.description}</div>` : ''}
                                        <div class="role-type-label">${featureType}</div>
                                    </div>
                                `;
                                }).join('')}
                            </div>
                        </div>
                        ` : ''}

                        <!-- Host Networks -->
                        ${Array.isArray(host.networkAdapters) && host.networkAdapters.some(adapter => adapter && (adapter.name || adapter.interfaceName || adapter.interfaceDescription || adapter.isSET || adapter.isTeamed)) ? `
                        <div class="host-network-section-modern">
                            <h4 class="section-subtitle-modern">
                                <i class="fas fa-network-wired"></i> ${this.t('hostNetworks')}
                                <span class="network-count-badge-modern">${host.networkAdapters.filter(adapter => adapter && (adapter.name || adapter.interfaceName || adapter.interfaceDescription || adapter.isSET || adapter.isTeamed)).length}</span>
                            </h4>
                            <div class="network-adapters-grid">
                                ${host.networkAdapters.filter(adapter => adapter && (adapter.name || adapter.interfaceName || adapter.interfaceDescription || adapter.isSET || adapter.isTeamed)).map(adapter => {
                                    // Ensure boolean values for display
                                    const isSET = adapter.isSET === true || adapter.isSET === 'true' || adapter.isSET === 1;
                                    const isTeamed = adapter.isTeamed === true || adapter.isTeamed === 'true' || adapter.isTeamed === 1;
                                    const isVirtual = adapter.isVirtual === true || adapter.isVirtual === 'true' || adapter.isVirtual === 1;
                                    
                                    return `
                                    <div class="network-adapter-card ${isVirtual ? 'virtual-adapter' : ''} ${adapter.status === 'Up' ? 'adapter-up' : 'adapter-down'} ${isSET ? 'set-adapter' : ''} ${isTeamed && !isSET ? 'teamed-adapter' : ''}">
                                        <div class="adapter-card-header">
                                            <div class="adapter-icon ${isVirtual ? 'virtual-icon' : isSET ? 'set-icon' : isTeamed ? 'team-icon' : 'physical-icon'}">
                                                <i class="fas ${isVirtual ? 'fa-cloud' : isSET ? 'fa-sitemap' : isTeamed ? 'fa-link' : 'fa-ethernet'}"></i>
                                            </div>
                                            <div class="adapter-title-group">
                                                <div class="adapter-name">
                                                    ${adapter.name || adapter.interfaceName || adapter.interfaceDescription || 'NIC'}
                                                    ${isVirtual ? '<span class="virtual-badge-mini">Virtual</span>' : ''}
                                                    ${isSET ? '<span class="set-badge-mini">SET</span>' : ''}
                                                    ${isTeamed && !isSET ? '<span class="team-badge-mini">Team</span>' : ''}
                                                </div>
                                                <div class="adapter-interface">${adapter.interfaceName || adapter.interfaceDescription || adapter.name || 'N/A'}</div>
                                            </div>
                                            <div class="adapter-status-indicator ${adapter.status === 'Up' ? 'status-up' : 'status-down'}">
                                                <i class="fas fa-circle"></i>
                                            </div>
                                        </div>
                                        <div class="adapter-card-body">
                                            <div class="adapter-info-row">
                                                ${adapter.ipAddress ? `<span class="info-pill"><i class="fas fa-network-wired"></i>${adapter.ipAddress}</span>` : ''}
                                                ${adapter.macAddress ? `<span class="info-pill"><i class="fas fa-barcode"></i>${adapter.macAddress}</span>` : ''}
                                            </div>
                                            <div class="adapter-info-row">
                                                ${adapter.linkSpeed ? `<span class="info-pill"><i class="fas fa-tachometer-alt"></i>${adapter.linkSpeed}</span>` : ''}
                                                ${adapter.mtu ? `<span class="info-pill"><i class="fas fa-expand-arrows-alt"></i>MTU: ${adapter.mtu}</span>` : ''}
                                                ${adapter.duplexMode && adapter.duplexMode !== 'N/A' ? `<span class="info-pill"><i class="fas fa-arrows-alt-h"></i>${adapter.duplexMode}</span>` : ''}
                                            </div>
                                            ${(adapter.ipAddress && adapter.subnetMask && adapter.subnetMask !== 'Unknown') || adapter.defaultGateway || (adapter.dnsServers && adapter.dnsServers !== 'Unknown') || adapter.dhcpEnabled !== undefined ? `
                                            <div class="adapter-ip-config">
                                                ${adapter.ipAddress && adapter.subnetMask && adapter.subnetMask !== 'Unknown' ? `
                                                <div class="adapter-ip-item">
                                                    <span class="adapter-ip-label"><i class="fas fa-network-wired"></i> Subnet:</span>
                                                    <span class="adapter-ip-value">${adapter.subnetMask}</span>
                                                </div>
                                                ` : ''}
                                                ${adapter.defaultGateway && adapter.defaultGateway !== 'Unknown' ? `
                                                <div class="adapter-ip-item">
                                                    <span class="adapter-ip-label"><i class="fas fa-route"></i> Gateway:</span>
                                                    <span class="adapter-ip-value">${adapter.defaultGateway}</span>
                                                </div>
                                                ` : ''}
                                                ${adapter.dnsServers && adapter.dnsServers !== 'Unknown' ? `
                                                <div class="adapter-ip-item">
                                                    <span class="adapter-ip-label"><i class="fas fa-server"></i> DNS:</span>
                                                    <span class="adapter-ip-value">${adapter.dnsServers}</span>
                                                </div>
                                                ` : ''}
                                                ${adapter.dhcpEnabled !== undefined ? `
                                                <div class="adapter-ip-item">
                                                    <span class="adapter-ip-label"><i class="fas fa-toggle-${adapter.dhcpEnabled ? 'on' : 'off'}"></i> DHCP:</span>
                                                    <span class="adapter-ip-value ${adapter.dhcpEnabled ? 'dhcp-enabled' : 'dhcp-disabled'}">${adapter.dhcpEnabled ? 'Enabled' : 'Disabled'}</span>
                                                </div>
                                                ` : ''}
                                            </div>
                                            ` : ''}
                                            ${adapter.virtualSwitch ? `
                                            <div class="adapter-vswitch">
                                                <i class="fas fa-network-wired"></i>
                                                <span>${adapter.virtualSwitch}</span>
                                            </div>
                                            ` : ''}
                                            ${(isTeamed || isSET) ? `
                                            <div class="adapter-teaming-info ${isSET ? 'set-info' : 'team-info'}">
                                                <div class="teaming-header">
                                                    <div class="adapter-team-badge ${isSET ? 'set-badge' : 'team-badge'}">
                                                        <i class="fas ${isSET ? 'fa-sitemap' : 'fa-link'}"></i>
                                                        <span>${isSET ? 'SET Team' : 'NIC Team'}</span>
                                                    </div>
                                                </div>
                                                <div class="teaming-details-grid">
                                                    ${isSET ? `
                                                    ${adapter.setSwitchName && adapter.setSwitchName !== 'N/A' ? `
                                                    <div class="teaming-detail-item">
                                                        <span class="vm-config-badge-compact badge-type">
                                                        <i class="fas fa-network-wired"></i>
                                                            <span>Switch: ${adapter.setSwitchName}</span>
                                                        </span>
                                                    </div>
                                                    ` : ''}
                                                    ${adapter.setLoadBalancingAlgorithm && adapter.setLoadBalancingAlgorithm !== 'N/A' ? `
                                                    <div class="teaming-detail-item">
                                                        <span class="vm-config-badge-compact badge-type">
                                                        <i class="fas fa-balance-scale"></i>
                                                            <span>Load Balancing: ${adapter.setLoadBalancingAlgorithm}</span>
                                                        </span>
                                                    </div>
                                                    ` : ''}
                                                    ` : isTeamed ? `
                                                    ${adapter.teamName && adapter.teamName !== 'N/A' ? `
                                                    <div class="teaming-detail-item">
                                                        <span class="vm-config-badge-compact badge-type">
                                                        <i class="fas fa-users"></i>
                                                            <span>Team Name: ${adapter.teamName}</span>
                                                        </span>
                                                    </div>
                                                    ` : ''}
                                                    ${adapter.teamLoadBalancingAlgorithm && adapter.teamLoadBalancingAlgorithm !== 'N/A' ? `
                                                    <div class="teaming-detail-item">
                                                        <span class="vm-config-badge-compact badge-type">
                                                        <i class="fas fa-balance-scale"></i>
                                                            <span>Load Balancing: ${adapter.teamLoadBalancingAlgorithm}</span>
                                                        </span>
                                                    </div>
                                                    ` : ''}
                                                    ${adapter.teamTeamingMode && adapter.teamTeamingMode !== 'N/A' ? `
                                                    <div class="teaming-detail-item">
                                                        <span class="vm-config-badge-compact badge-type">
                                                        <i class="fas fa-cog"></i>
                                                            <span>RV: ${adapter.teamTeamingMode}</span>
                                                        </span>
                                                    </div>
                                                    ` : ''}
                                                    ${adapter.teamStatus && adapter.teamStatus !== 'N/A' ? `
                                                    <div class="teaming-detail-item">
                                                        <span class="vm-config-badge-compact badge-type team-status-${adapter.teamStatus.toLowerCase()}">
                                                            <i class="fas fa-circle status-icon"></i>
                                                            <span>Status: ${adapter.teamStatus}</span>
                                                        </span>
                                                    </div>
                                                    ` : ''}
                                                    ` : ''}
                                                </div>
                                            </div>
                                            ` : ''}
                                            ${(adapter.vlanMode && adapter.vlanMode !== 'Untagged') || (adapter.isVirtual && (adapter.dhcpGuard || adapter.routerGuard || adapter.bandwidthMin || adapter.bandwidthMax)) ? `
                                            <div class="adapter-advanced-compact">
                                                ${adapter.vlanMode && adapter.vlanMode !== 'Untagged' ? `<span class="advanced-pill vlan-pill"><i class="fas fa-tag"></i>VLAN ${adapter.vlanId || 0} (${adapter.vlanMode})</span>` : ''}
                                                ${adapter.dhcpGuard && adapter.dhcpGuard !== 'Off' ? `<span class="advanced-pill"><i class="fas fa-shield-alt"></i>DHCP Guard</span>` : ''}
                                                ${adapter.routerGuard && adapter.routerGuard !== 'Off' ? `<span class="advanced-pill"><i class="fas fa-shield-alt"></i>Router Guard</span>` : ''}
                                                ${adapter.bandwidthMin > 0 || adapter.bandwidthMax > 0 ? `<span class="advanced-pill"><i class="fas fa-gauge"></i>BW: ${adapter.bandwidthMin || 0}-${adapter.bandwidthMax || '∞'} Mbps</span>` : ''}
                                            </div>
                                            ` : ''}
                                            ${adapter.bindings && adapter.bindings.length > 0 ? `
                                            <div class="adapter-bindings-compact">
                                                <i class="fas fa-plug"></i>
                                                <span>${adapter.bindings.length} protocol${adapter.bindings.length > 1 ? 's' : ''}</span>
                                                <div class="bindings-tooltip">
                                                    ${adapter.bindings.slice(0, 5).map(b => b.displayName || b.componentID).join(', ')}
                                                    ${adapter.bindings.length > 5 ? ` +${adapter.bindings.length - 5} more` : ''}
                                                </div>
                                            </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                `;
                                }).join('')}
                            </div>
                        </div>
                        ` : ''}

                        <!-- Host Disks -->
                        ${this.renderHostDisks(host)}
                        
                        <!-- Host Volumes -->
                        ${this.renderHostVolumes(host)}

                        <!-- Multipath I/O (MPIO) -->
                        ${host.multipathIO && host.multipathIO.installed ? `
                        <div class="multipath-section-compact">
                            <h4 class="section-subtitle-modern">
                                <i class="fas fa-route"></i> Multipath I/O (MPIO)
                                <span class="mpio-status-badge mpio-status-${host.multipathIO.enabled ? 'enabled' : 'installed'}">
                                    <i class="fas fa-${host.multipathIO.enabled ? 'check-circle' : 'download'}"></i>
                                    ${host.multipathIO.enabled ? 'Enabled' : 'Installed'}
                                </span>
                            </h4>
                            ${host.multipathIO.enabled ? `
                            <!-- MPIO Compact Overview -->
                            <div class="mpio-compact-overview">
                                <!-- Configuration Summary -->
                                <div class="mpio-compact-card">
                                    <div class="mpio-compact-header">
                                        <i class="fas fa-cogs"></i>
                                        <span>Configuration</span>
                                    </div>
                                    <div class="mpio-compact-content">
                                        ${host.multipathIO.loadBalancePolicy && host.multipathIO.loadBalancePolicy !== 'N/A' && host.multipathIO.loadBalancePolicy !== 'None' && host.multipathIO.loadBalancePolicy !== 'Not Configured' ? `<span class="mpio-compact-item"><strong>Policy:</strong> ${host.multipathIO.loadBalancePolicy}</span>` : host.multipathIO.loadBalancePolicy === 'None' ? `<span class="mpio-compact-item mpio-policy-none"><strong>Policy:</strong> <em>None (Default)</em></span>` : host.multipathIO.loadBalancePolicy === 'Not Configured' ? `<span class="mpio-compact-item mpio-policy-none"><strong>Policy:</strong> <em>Not Configured</em></span>` : ''}
                                        ${host.multipathIO.pathVerificationPeriod ? `<span class="mpio-compact-item"><strong>Verification:</strong> ${host.multipathIO.pathVerificationPeriod}s</span>` : ''}
                                        ${host.multipathIO.retryCount ? `<span class="mpio-compact-item"><strong>Retry:</strong> ${host.multipathIO.retryCount}</span>` : ''}
                                        ${host.multipathIO.retryInterval ? `<span class="mpio-compact-item"><strong>Interval:</strong> ${host.multipathIO.retryInterval}s</span>` : ''}
                                        ${host.multipathIO.diskTimeoutValue ? `<span class="mpio-compact-item"><strong>Timeout:</strong> ${host.multipathIO.diskTimeoutValue}s</span>` : ''}
                                        ${host.multipathIO.pDORemovePeriod ? `<span class="mpio-compact-item"><strong>PDO Remove:</strong> ${host.multipathIO.pDORemovePeriod}s</span>` : ''}
                                    </div>
                                </div>
                                
                                <!-- Devices Summary -->
                                ${host.multipathIO.devices && host.multipathIO.devices.length > 0 ? `
                                <div class="mpio-compact-card">
                                    <div class="mpio-compact-header">
                                        <i class="fas fa-microchip"></i>
                                        <span>Devices (${host.multipathIO.devices.length})</span>
                                    </div>
                                    <div class="mpio-compact-content">
                                        ${host.multipathIO.devices.map(device => `
                                            <span class="mpio-compact-item">
                                                <strong>${device.vendorId || 'N/A'}</strong> ${device.productId || 'N/A'}
                                                ${device.revision ? ` (${device.revision})` : ''}
                                            </span>
                                        `).join('')}
                                    </div>
                                </div>
                                ` : ''}
                                
                                <!-- Multipath Disks -->
                                ${host.multipathIO.paths && host.multipathIO.paths.length > 0 ? `
                                <div class="mpio-compact-card mpio-overview-disks-card">
                                    <div class="mpio-compact-header">
                                        <i class="fas fa-hdd"></i>
                                        <span>Multipath Disks (${host.multipathIO.paths.length})</span>
                                    </div>
                                    <div class="mpio-compact-content mpio-disks-content">
                                        ${host.multipathIO.paths.map(path => `
                                            <div class="mpio-disk-compact-item">
                                                <div class="mpio-disk-compact-main">
                                                    <i class="fas fa-hdd"></i>
                                                    <span class="mpio-disk-compact-name">
                                                        <strong>${path.vendorId || 'N/A'}</strong> ${path.productId || 'N/A'}
                                                    </span>
                                                    <span class="mpio-disk-compact-details">
                                                        Disk ${path.diskNumber !== undefined ? path.diskNumber : 'N/A'} • 
                                                        ${path.diskSize ? `${path.diskSize} GB` : 'N/A'} • 
                                                        <span class="mpio-paths-compact">${path.pathCount || 'N/A'} path${(path.pathCount && path.pathCount !== 1) ? 's' : ''}</span>
                                                    </span>
                                                    <span class="mpio-badge-compact ${path.isMultipathed ? 'mpio-badge-mp' : 'mpio-badge-sp'}">
                                                        ${path.isMultipathed ? 'MP' : 'SP'}
                                                    </span>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                                ` : ''}
                            </div>
                            ` : `
                            <div class="multipath-not-enabled">
                                <i class="fas fa-info-circle"></i>
                                <span>MPIO is installed but not configured or enabled</span>
                            </div>
                            `}
                        </div>
                        ` : ''}

                        <!-- Live Migration Settings -->
                        ${host.liveMigration && host.liveMigration.enabled ? `
                        <div class="livemigration-section-compact">
                            <div class="livemigration-header-compact">
                                <div class="livemigration-title-group">
                                    <i class="fas fa-exchange-alt"></i>
                                    <span>Live Migration</span>
                                    <span class="livemigration-status-badge livemigration-enabled">
                                        <i class="fas fa-check-circle"></i>
                                        Enabled
                                    </span>
                                </div>
                            </div>
                            <div class="livemigration-grid-compact">
                                <!-- Configuration Card -->
                                <div class="livemigration-card-compact">
                                    <div class="livemigration-card-header">
                                        <i class="fas fa-cogs"></i>
                                        <span>Configuration</span>
                                    </div>
                                    <div class="livemigration-card-content">
                                        <div class="livemigration-item-compact">
                                            <span class="livemigration-label">Concurrent:</span>
                                            <span class="livemigration-value">${host.liveMigration.maxConcurrent || 0}</span>
                                        </div>
                                        <div class="livemigration-item-compact">
                                            <span class="livemigration-label">Storage:</span>
                                            <span class="livemigration-value">${host.liveMigration.maxStorageConcurrent || 0}</span>
                                        </div>
                                        <div class="livemigration-item-compact">
                                            <span class="livemigration-label">Auth:</span>
                                            <span class="livemigration-value">${host.liveMigration.authProtocol || 'N/A'}</span>
                                        </div>
                                        <div class="livemigration-item-compact">
                                            <span class="livemigration-label">Performance:</span>
                                            <span class="livemigration-value">${host.liveMigration.performanceOption || 'N/A'}</span>
                                        </div>
                                        <div class="livemigration-item-compact">
                                            <span class="livemigration-label">Any Network:</span>
                                            <span class="livemigration-value livemigration-${host.liveMigration.useAnyNetwork ? 'yes' : 'no'}">${host.liveMigration.useAnyNetwork ? 'Yes' : 'No'}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Migration Networks Card -->
                                ${host.liveMigration.networks && host.liveMigration.networks.length > 0 ? `
                                <div class="livemigration-card-compact">
                                    <div class="livemigration-card-header">
                                        <i class="fas fa-network-wired"></i>
                                        <span>Networks (${host.liveMigration.networks.length})</span>
                                    </div>
                                    <div class="livemigration-card-content">
                                        ${host.liveMigration.networks.map(network => `
                                            <div class="livemigration-network-compact">
                                                <div class="livemigration-network-main">
                                                    <i class="fas fa-globe"></i>
                                                    <span class="livemigration-network-subnet">${network.subnet}</span>
                                                </div>
                                                <span class="livemigration-network-priority">P${network.priority}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        ` : ''}

                        <!-- Virtual Switches -->
                        ${host.virtualSwitches && host.virtualSwitches.length > 0 ? `
                        <div class="vswitches-section-compact">
                            <div class="vswitches-header-compact">
                                <div class="vswitches-title-group">
                                    <i class="fas fa-network-wired"></i>
                                    <span>Virtual Switches</span>
                                    <span class="vswitch-count-pill">${host.virtualSwitches.length}</span>
                                </div>
                            </div>
                            <div class="vswitches-grid-compact">
                                ${host.virtualSwitches.map(vswitch => `
                                    <div class="vswitch-card-compact">
                                        <div class="vswitch-card-header">
                                            <div class="vswitch-name-group">
                                                <i class="fas fa-sitemap"></i>
                                                <span class="vswitch-name">${vswitch.name || 'N/A'}</span>
                                                <span class="vswitch-type-badge vswitch-type-${(vswitch.switchType || 'unknown').toLowerCase()}">${vswitch.switchType || 'Unknown'}</span>
                                            </div>
                                            ${vswitch.notes ? `<div class="vswitch-notes-compact"><i class="fas fa-sticky-note"></i> ${vswitch.notes}</div>` : ''}
                                        </div>
                                        <div class="vswitch-card-body">
                                            <!-- Configuration Summary -->
                                            <div class="vswitch-config-compact">
                                                <div class="vswitch-config-row">
                                                    <span class="vswitch-config-label">SR-IOV:</span>
                                                    <span class="vswitch-config-value vswitch-${vswitch.iovEnabled ? 'enabled' : 'disabled'}">${vswitch.iovEnabled ? 'Enabled' : 'Disabled'}</span>
                                                </div>
                                                <div class="vswitch-config-row">
                                                    <span class="vswitch-config-label">Mgmt OS:</span>
                                                    <span class="vswitch-config-value vswitch-${vswitch.allowManagementOS ? 'enabled' : 'disabled'}">${vswitch.allowManagementOS ? 'Allowed' : 'Blocked'}</span>
                                                </div>
                                                ${vswitch.embeddedTeamingEnabled !== undefined ? `
                                                <div class="vswitch-config-row">
                                                    <span class="vswitch-config-label">Teaming:</span>
                                                    <span class="vswitch-config-value vswitch-${vswitch.embeddedTeamingEnabled ? 'enabled' : 'disabled'}">${vswitch.embeddedTeamingEnabled ? 'Enabled' : 'Disabled'}</span>
                                                </div>
                                                ` : ''}
                                                <div class="vswitch-config-row">
                                                    <span class="vswitch-config-label">Bandwidth Mode:</span>
                                                    <span class="vswitch-config-value">${vswitch.bandwidthReservationMode || 'N/A'}</span>
                                                </div>
                                                ${vswitch.bandwidthPercentage !== undefined && vswitch.bandwidthPercentage > 0 ? `
                                                <div class="vswitch-config-row">
                                                    <span class="vswitch-config-label">Bandwidth %:</span>
                                                    <span class="vswitch-config-value vswitch-percentage">${vswitch.bandwidthPercentage}%</span>
                                                </div>
                                                ` : ''}
                                                <div class="vswitch-config-row">
                                                    <span class="vswitch-config-label">Default BW:</span>
                                                    <span class="vswitch-config-value">${vswitch.defaultFlowMinimumBandwidthAbsolute || 0} Mbps</span>
                                                </div>
                                                <div class="vswitch-config-row">
                                                    <span class="vswitch-config-label">Default Weight:</span>
                                                    <span class="vswitch-config-value">${vswitch.defaultFlowMinimumBandwidthWeight || 0}</span>
                                                </div>
                                            </div>
                                            
                                            <!-- Network Adapter Info (for External switches) -->
                                            ${vswitch.switchType === 'External' && (vswitch.netAdapterName || vswitch.netAdapterInterfaceDescription) ? `
                                            <div class="vswitch-adapter-compact">
                                                <div class="vswitch-adapter-header">
                                                    <i class="fas fa-ethernet"></i>
                                                    <span>Network Adapter</span>
                                                </div>
                                                <div class="vswitch-adapter-content">
                                                    ${vswitch.netAdapterName ? `
                                                    <div class="vswitch-adapter-row">
                                                        <span class="vswitch-adapter-label">Name:</span>
                                                        <span class="vswitch-adapter-value">${vswitch.netAdapterName}</span>
                                                    </div>
                                                    ` : ''}
                                                    ${vswitch.netAdapterInterfaceDescription ? `
                                                    <div class="vswitch-adapter-row">
                                                        <span class="vswitch-adapter-label">Description:</span>
                                                        <span class="vswitch-adapter-value vswitch-adapter-desc">${vswitch.netAdapterInterfaceDescription}</span>
                                                    </div>
                                                    ` : ''}
                                                </div>
                                            </div>
                                            ` : ''}
                                            
                                            <!-- Extensions Details -->
                                            ${vswitch.extensions && vswitch.extensions.length > 0 ? `
                                            <div class="vswitch-extensions-compact">
                                                <div class="vswitch-extensions-header">
                                                    <i class="fas fa-puzzle-piece"></i>
                                                    <span>Extensions (${vswitch.extensions.length})</span>
                                                </div>
                                                <div class="vswitch-extensions-detailed">
                                                    ${vswitch.extensions.map(ext => `
                                                        <div class="vswitch-extension-detailed ${ext.enabled ? 'ext-enabled' : 'ext-disabled'}">
                                                            <div class="ext-main-info">
                                                                <div class="ext-status-icon">
                                                                    <i class="fas ${ext.enabled ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                                                                </div>
                                                                <div class="ext-info">
                                                                    <div class="ext-name">${ext.name || 'Unknown Extension'}</div>
                                                                    <div class="ext-details">
                                                                        ${ext.vendor ? `<span class="ext-vendor">${ext.vendor}</span>` : ''}
                                                                        ${ext.version ? `<span class="ext-version">v${ext.version}</span>` : ''}
                                                                        <span class="ext-status">${ext.enabled ? 'Active' : 'Inactive'}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    `).join('')}
                                                </div>
                                            </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}

                        ${host.localUsers && host.localUsers.length > 0 ? `
                        <div class="users-section-modern">
                            <h4 class="section-subtitle-modern">
                                <i class="fas fa-users"></i> ${this.t('localUsers')}
                                <span class="role-count-badge-modern">${host.localUsers.length}</span>
                            </h4>
                            <div class="users-grid-modern">
                                ${host.localUsers.map(user => `
                                    <div class="user-card-modern ${user.enabled ? 'user-active' : 'user-inactive'}">
                                        <div class="user-card-header">
                                            <div class="user-avatar-modern ${user.enabled ? 'avatar-active' : 'avatar-inactive'}">
                                                <i class="fas fa-user"></i>
                                                <div class="user-status-dot ${user.enabled ? 'dot-active' : 'dot-inactive'}"></div>
                                            </div>
                                            <div class="user-header-info">
                                                <div class="user-name-modern">${user.name || 'N/A'}</div>
                                                ${user.fullName && user.fullName !== '-' ? `<div class="user-fullname-modern">${user.fullName}</div>` : ''}
                                            </div>
                                        </div>
                                        ${user.description && user.description !== '-' ? `
                                        <div class="user-card-body">
                                            <div class="user-description-modern">
                                                <i class="fas fa-info-circle"></i>
                                                <span>${user.description}</span>
                                            </div>
                                        </div>
                                        ` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}

                        ${host.localGroups && host.localGroups.length > 0 ? `
                        <div class="groups-section-modern">
                            <h4 class="section-subtitle-modern">
                                <i class="fas fa-users-cog"></i> ${this.t('localGroups')}
                                <span class="role-count-badge-modern">${host.localGroups.length}</span>
                            </h4>
                            <div class="groups-grid-modern">
                                ${host.localGroups.map((group, groupIndex) => {
                                    const members = Array.isArray(group.members) ? group.members : [];
                                    return `
                                    <div class="group-card-modern" onclick="hyperVAuditorInstance.showGroupMembersModal('${group.name}', ${JSON.stringify(members).replace(/"/g, '&quot;')}, '${(group.description || '').replace(/'/g, "\\'")}')">
                                        <div class="group-card-header">
                                            <div class="group-icon-modern">
                                                <i class="fas fa-users"></i>
                                                <div class="group-member-count">${members.length}</div>
                                            </div>
                                            <div class="group-header-info">
                                                <div class="group-name-modern">${group.name || 'N/A'}</div>
                                                ${group.description && group.description !== '-' ? `<div class="group-description-modern" title="${group.description}">${group.description}</div>` : ''}
                                            </div>
                                        </div>
                                        <div class="group-card-footer">
                                            ${members.length > 0 ? `
                                                <div class="group-footer-content">
                                                    <span class="members-count-label">
                                                        <i class="fas fa-user"></i>
                                                        ${members.length} ${members.length === 1 ? 'Member' : 'Members'}
                                                    </span>
                                                    <span class="view-details-link">
                                                        <i class="fas fa-info-circle"></i>
                                                        ${this.t('details')}
                                                    </span>
                                                </div>
                                            ` : `
                                                <div class="group-footer-content">
                                                    <span class="group-no-members-compact">
                                                        <i class="fas fa-users-slash"></i>
                                                        <span>No members</span>
                                                    </span>
                                                    <span class="view-details-link">
                                                        <i class="fas fa-info-circle"></i>
                                                        ${this.t('details')}
                                                    </span>
                                                </div>
                                            `}
                                        </div>
                                    </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                        ` : ''}

                        <!-- Missing Windows Updates -->
                        ${host.missingUpdates && host.missingUpdates.length > 0 ? `
                        <div class="hardware-section-modern">
                            <h4 class="section-subtitle-modern">
                                <i class="fas fa-download"></i> Missing Windows Updates
                                <span class="update-count-pill">${host.missingUpdates.length}</span>
                            </h4>
                            <div class="table-container-modern">
                                <table class="table-compact">
                                    <thead>
                                        <tr>
                                            <th>KB Article</th>
                                            <th>Name</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${host.missingUpdates.map(update => `
                                        <tr>
                                            <td><strong>${update.kbNumber || 'N/A'}</strong></td>
                                            <td>${update.title || 'N/A'}</td>
                                        </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        ` : ''}

                        <!-- Windows Firewall -->
                        ${host.windowsFirewall && host.windowsFirewall.length > 0 ? `
                        <div class="hardware-section-modern">
                            <h4 class="section-subtitle-modern">
                                <i class="fas fa-shield-alt"></i> Windows Firewall
                            </h4>
                            <div class="table-container-modern">
                                <table class="table-compact">
                                    <thead>
                                        <tr>
                                            <th>Profile</th>
                                            <th>Profile Enabled</th>
                                            <th>Inbound Action</th>
                                            <th>Outbound Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${host.windowsFirewall.map(fw => `
                                        <tr>
                                            <td><strong>${fw.profile || 'N/A'}</strong></td>
                                            <td><span class="status-badge status-${fw.profileEnabled ? 'online' : 'offline'}">${fw.profileEnabled ? 'Enabled' : 'Disabled'}</span></td>
                                            <td>${fw.inboundAction || 'N/A'}</td>
                                            <td>${fw.outboundAction || 'N/A'}</td>
                                        </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        ` : ''}

                        <!-- Installed Drivers -->
                        ${host.drivers && host.drivers.length > 0 ? `
                        <div class="hardware-section-modern">
                            <h4 class="section-subtitle-modern">
                                <i class="fas fa-microchip"></i> Installed Drivers
                                <span class="update-count-pill">${host.drivers.length}</span>
                                ${host.drivers.length > 20 ? `
                                <button class="view-all-btn-compact" onclick="hyperVAuditorInstance.showDriversModal('${host.name}', ${hostIndex})">
                                    View all (${host.drivers.length}) <i class="fas fa-chevron-right"></i>
                                </button>
                                ` : ''}
                            </h4>
                            <div class="table-container-modern">
                                <table class="table-compact">
                                    <thead>
                                        <tr>
                                            <th>Class Description</th>
                                            <th>Provider Name</th>
                                            <th>Driver Version</th>
                                            <th>Version Date</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${host.drivers.slice(0, 20).map(driver => `
                                        <tr>
                                            <td>${driver.classDescription || 'N/A'}</td>
                                            <td>${driver.providerName || 'N/A'}</td>
                                            <td>${driver.driverVersion || 'N/A'}</td>
                                            <td>${driver.versionDate || 'N/A'}</td>
                                            <td><span class="status-badge status-${driver.status === 'OK' ? 'online' : 'warning'}">${driver.status || 'Unknown'}</span></td>
                                        </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        ` : ''}

                        <!-- Installed Applications -->
                        ${host.installedApplications && host.installedApplications.length > 0 ? `
                        <div class="hardware-section-modern">
                            <h4 class="section-subtitle-modern">
                                <i class="fas fa-box"></i> Installed Applications
                                <span class="update-count-pill">${host.installedApplications.length}</span>
                                ${host.installedApplications.length > 20 ? `
                                <button class="view-all-btn-compact" onclick="hyperVAuditorInstance.showApplicationsModal('${host.name}', ${hostIndex})">
                                    View all (${host.installedApplications.length}) <i class="fas fa-chevron-right"></i>
                                </button>
                                ` : ''}
                            </h4>
                            <div class="table-container-modern">
                                <table class="table-compact">
                                    <thead>
                                        <tr>
                                            <th>Application Name</th>
                                            <th>Publisher</th>
                                            <th>Version</th>
                                            <th>Install Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${host.installedApplications.slice(0, 20).map(app => `
                                        <tr>
                                            <td>${app.applicationName || 'N/A'}</td>
                                            <td>${app.publisher || 'N/A'}</td>
                                            <td>${app.version || 'N/A'}</td>
                                            <td>${app.installDate || 'N/A'}</td>
                                        </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        ` : ''}

                        <!-- Services -->
                        ${host.services && host.services.length > 0 ? `
                        <div class="hardware-section-modern">
                            <h4 class="section-subtitle-modern">
                                <i class="fas fa-cogs"></i> Services
                                <span class="update-count-pill">${host.services.length}</span>
                                ${host.services.length > 20 ? `
                                <button class="view-all-btn-compact" onclick="hyperVAuditorInstance.showServicesModal('${host.name}', ${hostIndex})">
                                    View all (${host.services.length}) <i class="fas fa-chevron-right"></i>
                                </button>
                                ` : ''}
                            </h4>
                            <div class="table-container-modern">
                                <table class="table-compact">
                                    <thead>
                                        <tr>
                                            <th>Display Name</th>
                                            <th>Short Name</th>
                                            <th>Status</th>
                                            <th>Start Type</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${host.services.slice(0, 20).map(service => `
                                        <tr>
                                            <td>${service.displayName || 'N/A'}</td>
                                            <td><code style="background: #0f172a; color: #94a3b8; border: 1px solid #334155; padding: 0.125rem 0.375rem; border-radius: 3px; font-size: 0.75rem;">${service.shortName || 'N/A'}</code></td>
                                            <td><span class="status-badge status-${service.status === 'Running' ? 'online' : service.status === 'Stopped' ? 'offline' : 'warning'}">${service.status || 'Unknown'}</span></td>
                                            <td>${service.startType || 'N/A'}</td>
                                        </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        ` : ''}

                        <!-- Windows Updates -->
                        ${host.windowsUpdates && Array.isArray(host.windowsUpdates) && host.windowsUpdates.length > 0 ? `
                        <div class="updates-section-compact">
                            <div class="updates-header-compact">
                                <div class="updates-title-group">
                                    <i class="fas fa-download"></i>
                                    <span>${this.t('windowsUpdates')}</span>
                                    <span class="update-count-pill">${host.windowsUpdates.length}</span>
                                </div>
                                ${host.windowsUpdates.length > 10 ? `
                                    <button class="view-all-btn-compact" onclick="hyperVAuditorInstance.showUpdatesModal('${host.name}', ${hostIndex})">
                                        View All <i class="fas fa-chevron-right"></i>
                                    </button>
                                ` : ''}
                            </div>
                            <div class="updates-grid-compact">
                                ${host.windowsUpdates.slice(0, 10).map(update => `
                                    <div class="update-card-compact">
                                        <div class="update-card-header">
                                            <div class="update-kb-badge">
                                                <i class="fas fa-shield-alt"></i>
                                                <span>${update.hotFixID || 'N/A'}</span>
                                            </div>
                                            <div class="update-date-badge">
                                                <i class="fas fa-calendar-alt"></i>
                                                <span>${update.installedOn || 'N/A'}</span>
                                            </div>
                                        </div>
                                        <div class="update-card-body">
                                            <div class="update-description">
                                                ${(update.description || 'N/A').length > 80 ? 
                                                    (update.description || 'N/A').substring(0, 80) + '...' : 
                                                    (update.description || 'N/A')
                                                }
                                            </div>
                                            ${update.installedBy && update.installedBy !== 'N/A' ? `
                                            <div class="update-installer">
                                                <i class="fas fa-user"></i>
                                                <span>${update.installedBy}</span>
                                            </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}

                        <!-- Virtual Machines Table -->
                        <div class="vm-section-modern">
                            <h4 class="section-subtitle-modern">
                                <i class="fas fa-cube"></i> ${this.t('virtualMachines')}
                                <span class="vm-count-badge-modern">${hostVMs.length}</span>
                            </h4>
                            <div class="table-container-modern">
                                <table class="data-table-modern compact-table">
                                    <thead>
                                        <tr>
                                            <th>${this.t('vmName')}</th>
                                            <th>${this.t('generationVersion')}</th>
                                            <th>${this.t('state')}</th>
                                            <th>${this.t('uptime')}</th>
                                            <th>${this.t('ownerLabel')}</th>
                                            <th>${this.t('vCPU')}</th>
                                            <th>${this.t('vRAM')}</th>
                                            <th>${this.t('checkpoints')}</th>
                                            <th>${this.t('replica')}</th>
                                            <th>${this.t('disks')}</th>
                                            <th>${this.t('network')}</th>
                                        </tr>
                                    </thead>
                                    <tbody id="vm-table-${hostIndex}">
                                        ${hostVMs.map((vm, vmIndex) => {
                                            const memStartup = typeof vm.memory?.startup === 'number' ? `${vm.memory.startup.toFixed(1)} GB` : (vm.memory?.startup || 'N/A');
                                            const memMin = typeof vm.memory?.min === 'number' ? `${vm.memory.min.toFixed(1)} GB` : (vm.memory?.min || '');
                                            const memMax = typeof vm.memory?.max === 'number' ? `${vm.memory.max.toFixed(1)} GB` : (vm.memory?.max || '');
                                            const memAssigned = typeof vm.memory?.assigned === 'number' ? `${vm.memory.assigned.toFixed(1)} GB` : (vm.memory?.assigned || '');
                                            const checkpointExists = vm.checkpoint?.exists || false;
                                            const checkpointCount = vm.checkpoint?.count || 0;
                                            
                                            const replicaState = vm.replica?.state || 'Disabled';
                                            const replicaHealth = vm.replica?.health || 'N/A';
                                            
                                            return `
                                            <tr class="data-row ${this.filters.expandedRows.has(`vm-${hostIndex}-${vmIndex}`) ? 'expanded' : ''}" 
                                                onclick="hyperVAuditorInstance.toggleRow('vm-${hostIndex}-${vmIndex}')">
                                                <td>
                                                    <div class="row-header">
                                                        <strong>${vm.name}</strong>
                                                        <i class="fas fa-chevron-${this.filters.expandedRows.has(`vm-${hostIndex}-${vmIndex}`) ? 'down' : 'right'} expand-icon"></i>
                                                    </div>
                                                    ${vm.configurationXmlPath ? `<div><small class="text-muted"><i class="fas fa-file-code"></i> Config</small></div>` : ''}
                                                </td>
                                                <td>
                                                    <span class="text-muted">Gen${vm.generation}</span><br>
                                                    <small>v${vm.version}</small>
                                                </td>
                                                <td>
                                                    <span class="vm-state-text vm-state-${vm.state.toLowerCase()}">${this.translateStatus(vm.state)}</span>
                                                </td>
                                                <td>
                                                    <div class="uptime-display">
                                                        <i class="fas fa-clock"></i> ${vm.uptime}
                                                    </div>
                                                </td>
                                                <td>${vm.host}</td>
                                                <td>
                                                    <span class="vm-vcpu-text">${vm.vCPU}</span>
                                                </td>
                                                <td>
                                                    <div class="memory-display">
                                                        <div class="memory-text-small">${memStartup}</div>
                                                        ${memAssigned ? `<small class="text-muted">(${memAssigned})</small>` : ''}
                                                    </div>
                                                </td>
                                                <td>
                                                        ${checkpointExists ? 
                                                            `<span class="checkpoint-count-text"><i class="fas fa-camera"></i> ${checkpointCount}</span>` : 
                                                            `<span class="text-muted">${this.t('none')}</span>`
                                                    }
                                                </td>
                                                <td>
                                                    ${replicaState !== 'Disabled' ? 
                                                        `<span class="replica-state-text replica-${replicaHealth.toLowerCase()}">${this.translateStatus(replicaState)}</span>` : 
                                                        `<span class="text-muted">${this.t('disabled')}</span>`
                                                    }
                                                </td>
                                                <td>
                                                    ${(() => {
                                                        // Calculate total disk size (base disks + AVHDX)
                                                        let totalSize = 0;
                                                        let totalMaxSize = 0;
                                                        vm.disks.forEach(disk => {
                                                            const currentSize = typeof disk.currentSize === 'number' ? disk.currentSize : 0;
                                                            const maxSize = typeof disk.maxSize === 'number' ? disk.maxSize : 0;
                                                            totalSize += currentSize;
                                                            totalMaxSize += maxSize;
                                                        });
                                                        
                                                        // Add AVHDX total size if available
                                                        const avhdxTotalSize = typeof vm.avhdxTotalSize === 'number' ? vm.avhdxTotalSize : 0;
                                                        const totalWithAvhdx = totalSize + avhdxTotalSize;
                                                        
                                                        const totalSizeText = totalWithAvhdx > 0 ? `${totalWithAvhdx.toFixed(1)} GB` : (totalSize > 0 ? `${totalSize.toFixed(1)} GB` : 'N/A');
                                                        const totalMaxText = totalMaxSize > 0 ? `${totalMaxSize.toFixed(1)} GB` : 'N/A';
                                                        const diskCount = vm.disks.length;
                                                        
                                                        return `
                                                            <div class="disk-total-display">
                                                                <div class="disk-total-size">
                                                                    <i class="fas fa-hdd"></i>
                                                                    <span class="disk-total-value">${totalSizeText}</span>
                                                                    ${avhdxTotalSize > 0 ? `<span class="disk-avhdx-indicator">+</span>` : ''}
                                                                </div>
                                                                <div class="disk-total-count">${diskCount} disk${diskCount !== 1 ? 's' : ''}</div>
                                                            </div>
                                                        `;
                                                    })()}
                                                </td>
                                                <td>
                                                    ${(() => {
                                                        const adapterCount = vm.networkAdapters ? vm.networkAdapters.length : 0;
                                                        const connectedCount = vm.networkAdapters ? vm.networkAdapters.filter(a => a.connection === 'Connected').length : 0;
                                                        
                                                        return `
                                                            <div class="network-count-display">
                                                                <i class="fas fa-network-wired"></i>
                                                                <span class="network-count-value">${adapterCount}</span>
                                                                ${connectedCount > 0 ? `<span class="network-connected-indicator">(${connectedCount})</span>` : ''}
                                                            </div>
                                                        `;
                                                    })()}
                                                </td>
                                            </tr>
                                            ${this.filters.expandedRows.has(`vm-${hostIndex}-${vmIndex}`) ? `
                                            <tr class="expanded-row">
                                                <td colspan="11">
                                                    <div class="expanded-content-compact">
                                                        <div class="vm-config-grid-compact">
                                                            <!-- Network Adapters Details -->
                                                            <div class="vm-config-section-compact">
                                                                <div class="vm-config-header-compact">
                                                                    <i class="fas fa-network-wired"></i>
                                                                    <span>${this.t('networkAdapters')}</span>
                                                                </div>
                                                                <div class="vm-config-body-compact">
                                                                    ${vm.networkAdapters.map(adapter => `
                                                                        <div class="vm-config-item-compact">
                                                                            <div class="vm-config-item-header-compact">
                                                                                <span class="vm-config-item-name-compact">${adapter.name}</span>
                                                                                <span class="vm-config-item-status-compact ${adapter.connection === 'Connected' ? 'status-connected' : 'status-disconnected'}">${this.translateStatus(adapter.connection || 'Unknown')}</span>
                                                                            </div>
                                                                            <div class="vm-config-item-details-compact">
                                                                                <span class="vm-config-detail-compact"><i class="fas fa-ethernet"></i> ${adapter.switch || 'N/A'}</span>
                                                                                ${adapter.vlan && adapter.vlan !== 'N/A' ? `<span class="vm-config-detail-compact"><i class="fas fa-tag"></i> VLAN ${adapter.vlan}</span>` : ''}
                                                                                ${(() => {
                                                                                    // Display IP addresses - prefer ipAddresses array if available, fallback to ip
                                                                                    let ipDisplay = '';
                                                                                    if (adapter.ipAddresses && Array.isArray(adapter.ipAddresses) && adapter.ipAddresses.length > 0) {
                                                                                        const ipList = adapter.ipAddresses.map(ipInfo => {
                                                                                            if (typeof ipInfo === 'string') {
                                                                                                return ipInfo;
                                                                                            } else if (ipInfo.ip) {
                                                                                                return ipInfo.prefixLength ? `${ipInfo.ip}/${ipInfo.prefixLength}` : ipInfo.ip;
                                                                                            }
                                                                                            return '';
                                                                                        }).filter(Boolean);
                                                                                        if (ipList.length > 0) {
                                                                                            ipDisplay = ipList.join(', ');
                                                                                        }
                                                                                    } else if (adapter.ip && adapter.ip !== 'N/A') {
                                                                                        ipDisplay = adapter.ip;
                                                                                    }
                                                                                    return ipDisplay ? `<span class="vm-config-detail-compact"><i class="fas fa-network-wired"></i> <strong>${ipDisplay}</strong></span>` : '';
                                                                                })()}
                                                                                ${adapter.macAddress ? `<span class="vm-config-detail-compact"><i class="fas fa-fingerprint"></i> ${adapter.macAddress}</span>` : ''}
                                                                                ${adapter.deviceType ? `<span class="vm-config-detail-compact"><i class="fas fa-desktop"></i> ${adapter.deviceType}</span>` : ''}
                                                                            </div>
                                                                        </div>
                                                                    `).join('')}
                                                                </div>
                                                            </div>
                                                            <!-- Disks Details -->
                                                            <div class="vm-config-section-compact">
                                                                <div class="vm-config-header-compact">
                                                                    <i class="fas fa-hdd"></i>
                                                                    <span>${this.t('disks')}</span>
                                                                </div>
                                                                <div class="vm-config-body-compact">
                                                                    ${vm.disks.map(disk => {
                                                                        const diskSize = typeof disk.currentSize === 'number' ? `${disk.currentSize.toFixed(1)} GB` : (disk.currentSize || 'N/A');
                                                                        const diskMax = typeof disk.maxSize === 'number' ? `${disk.maxSize.toFixed(1)} GB` : (disk.maxSize || 'N/A');
                                                                        return `
                                                                        <div class="vm-config-item-compact ${disk.fileExists === false ? 'disk-missing' : ''}">
                                                                            <div class="vm-config-item-header-compact">
                                                                                <span class="vm-config-item-name-compact">${disk.name || 'N/A'}</span>
                                                                                <div class="vm-config-item-badges-compact">
                                                                                    ${disk.isDifferencing ? '<span class="vm-config-badge-compact badge-diff">Diff</span>' : ''}
                                                                                    ${disk.fileExists === false ? '<span class="vm-config-badge-compact badge-missing">⚠ Missing</span>' : ''}
                                                                                    <span class="vm-config-badge-compact badge-type">${disk.type || disk.diskType || 'N/A'}</span>
                                                                                </div>
                                                                            </div>
                                                                            <div class="vm-config-item-details-compact">
                                                                                <span class="vm-config-detail-compact"><i class="fas fa-hdd"></i> ${diskSize} / ${diskMax}</span>
                                                                                ${disk.format ? `<span class="vm-config-detail-compact"><i class="fas fa-file"></i> ${disk.format}</span>` : ''}
                                                                                ${disk.controller ? `<span class="vm-config-detail-compact"><i class="fas fa-server"></i> ${disk.controller}${disk.controllerNumber !== undefined ? ` (${disk.controllerNumber}:${disk.controllerLocation})` : ''}</span>` : ''}
                                                                                ${disk.fragmentationPercent !== undefined ? `<span class="vm-config-detail-compact"><i class="fas fa-chart-pie"></i> ${disk.fragmentationPercent.toFixed(2)}% ${this.t('fragmentation')}</span>` : ''}
                                                                            </div>
                                                                            ${disk.path && disk.path !== 'Pass-through' ? `<div class="vm-config-path-compact"><i class="fas fa-folder"></i> ${disk.path}</div>` : ''}
                                                                        </div>
                                                                    `;
                                                                    }).join('')}
                                                                </div>
                                                            </div>
                                                            <!-- Memory & Integration Services -->
                                                            <div class="vm-config-section-compact">
                                                                <div class="vm-config-header-compact">
                                                                    <i class="fas fa-memory"></i>
                                                                    <span>${this.t('memoryServices')}</span>
                                                                </div>
                                                                <div class="vm-config-body-compact">
                                                                    <div class="vm-config-item-compact">
                                                                        <div class="vm-config-item-details-compact">
                                                                            <span class="vm-config-detail-compact"><i class="fas fa-play"></i> ${this.t('startupRam')}: ${memStartup}</span>
                                                                            ${memMin ? `<span class="vm-config-detail-compact"><i class="fas fa-arrow-down"></i> ${this.t('minRam')}: ${memMin}</span>` : ''}
                                                                            ${memMax ? `<span class="vm-config-detail-compact"><i class="fas fa-arrow-up"></i> ${this.t('maxRam')}: ${memMax}</span>` : ''}
                                                                            ${memAssigned ? `<span class="vm-config-detail-compact"><i class="fas fa-check"></i> ${this.t('assignedRam')}: ${memAssigned}</span>` : ''}
                                                                        </div>
                                                                    </div>
                                                                    ${vm.integrationServices ? `
                                                                    <div class="vm-config-item-compact">
                                                                        <div class="vm-config-item-details-compact">
                                                                            ${(() => {
                                                                                const state = vm.integrationServices.state || 'N/A';
                                                                                let icon = 'fa-check-circle';
                                                                                let icsClass = 'ics-uptodate';
                                                                                if (state === 'UpdateRequired') {
                                                                                    icon = 'fa-exclamation-triangle';
                                                                                    icsClass = 'ics-updaterequired';
                                                                                } else if (state === 'MayBeRequired') {
                                                                                    icon = 'fa-question-circle';
                                                                                    icsClass = 'ics-mayberequired';
                                                                                } else if (state === 'NotDetected') {
                                                                                    icon = 'fa-times-circle';
                                                                                    icsClass = 'ics-notdetected';
                                                                                }
                                                                                return `<span class="vm-config-detail-compact"><i class="fas ${icon}"></i> <span class="${icsClass}">ICS: ${state}</span></span><span class="vm-config-detail-compact"><i class="fas fa-code-branch"></i> v${vm.integrationServices.version || 'N/A'}</span>`;
                                                                            })()}
                                                                        </div>
                                                                    </div>
                                                                    ` : ''}
                                                                </div>
                                                            </div>
                                                            <!-- Checkpoints -->
                                                            ${vm.checkpoint && checkpointExists ? `
                                                            <div class="vm-config-section-compact">
                                                                <div class="vm-config-header-compact">
                                                                    <i class="fas fa-camera"></i>
                                                                    <span>${this.t('checkpoints')} (${checkpointCount})</span>
                                                                </div>
                                                                <div class="vm-config-body-compact">
                                                                    ${vm.checkpoint.chain && vm.checkpoint.chain.length > 0 ? vm.checkpoint.chain.map((cp, cpIndex) => {
                                                                        const totalDiskSize = cp.disks && cp.disks.length > 0 ? 
                                                                            cp.disks.reduce((sum, d) => sum + (typeof d.currentSize === 'number' ? d.currentSize : 0), 0) : 0;
                                                                        return `
                                                                        <div class="vm-config-item-compact">
                                                                            <div class="vm-config-item-header-compact">
                                                                                <span class="vm-config-item-name-compact"><i class="fas fa-camera"></i> ${cp.name}</span>
                                                                                <div class="vm-config-item-badges-compact">
                                                                                    <span class="vm-config-badge-compact badge-time">${cp.creationTime}</span>
                                                                                    ${totalDiskSize > 0 ? `<span class="vm-config-badge-compact badge-size">${totalDiskSize.toFixed(1)} GB</span>` : ''}
                                                                                </div>
                                                                            </div>
                                                                            ${cp.disks && Array.isArray(cp.disks) && cp.disks.length > 0 ? `
                                                                            <div class="vm-config-item-details-compact">
                                                                                ${cp.disks.map((disk, diskIdx) => {
                                                                                    const diskSize = typeof disk.currentSize === 'number' ? disk.currentSize.toFixed(1) : 
                                                                                        (typeof disk.currentSize === 'string' ? disk.currentSize.replace(' GB', '') : 'N/A');
                                                                                    const diskMax = typeof disk.maxSize === 'number' ? disk.maxSize.toFixed(1) : 
                                                                                        (typeof disk.maxSize === 'string' ? disk.maxSize.replace(' GB', '') : 'N/A');
                                                                                    const diskName = disk.name || disk.path || `Disk ${diskIdx + 1}`;
                                                                                    return `<span class="vm-config-detail-compact"><i class="fas fa-hdd"></i> ${diskName}: ${diskSize}/${diskMax} GB</span>`;
                                                                                }).join('')}
                                                                            </div>
                                                                            ` : ''}
                                                                        </div>
                                                                        `;
                                                                    }).join('') : ''}
                                                                </div>
                                                            </div>
                                                            ` : ''}
                                                            <!-- Replica -->
                                                            ${vm.replica && vm.replica.state !== 'Disabled' ? `
                                                            <div class="vm-config-section-compact">
                                                                <div class="vm-config-header-compact">
                                                                    <i class="fas fa-sync"></i>
                                                                    <span>${this.t('replica')}</span>
                                                                </div>
                                                                <div class="vm-config-body-compact">
                                                                    <div class="vm-config-item-compact">
                                                                        <div class="vm-config-item-details-compact">
                                                                        <span class="vm-config-detail-compact"><i class="fas fa-info-circle"></i> ${this.translateStatus(replicaState)}</span>
                                                                        <span class="vm-config-detail-compact"><i class="fas fa-heartbeat"></i> ${this.translateStatus(replicaHealth)}</span>
                                                                            <span class="vm-config-detail-compact"><i class="fas fa-cog"></i> ${replicaMode}</span>
                                                                            ${vm.replica.frequency ? `<span class="vm-config-detail-compact"><i class="fas fa-clock"></i> ${vm.replica.frequency}s</span>` : ''}
                                                                            ${vm.replica.lastReplicationTime ? `<span class="vm-config-detail-compact"><i class="fas fa-calendar"></i> ${vm.replica.lastReplicationTime}</span>` : ''}
                                                                            ${vm.replica.replicaServer ? `<span class="vm-config-detail-compact"><i class="fas fa-server"></i> ${vm.replica.replicaServer}</span>` : ''}
                                                                            ${vm.replica.primaryServer ? `<span class="vm-config-detail-compact"><i class="fas fa-server"></i> Primary: ${vm.replica.primaryServer}</span>` : ''}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            ` : ''}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                            ` : ''}
                                        `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                </div>
            `;
        }).join('');
    }

    renderHostDisks(host) {
        if (!host.disks || !Array.isArray(host.disks) || host.disks.length === 0) {
            return '';
        }

        return `
            <div class="host-disks-section-compact">
                <div class="host-disks-header-compact">
                    <div class="host-disks-title-group">
                        <i class="fas fa-hdd"></i>
                        <span>Physical Disks</span>
                        <span class="disk-count-pill">${host.disks.length}</span>
                    </div>
                </div>
                <div class="host-disks-grid-compact">
                    ${host.disks.map(disk => {
                        const totalSizeGB = typeof disk.size === 'number' ? disk.size : 
                            (typeof disk.size === 'string' ? parseFloat(disk.size.replace(/[^\d.]/g, '')) : 0);
                        const allocatedGB = typeof disk.allocatedSize === 'number' ? disk.allocatedSize : 
                            (typeof disk.allocatedSize === 'string' ? parseFloat(disk.allocatedSize.replace(/[^\d.]/g, '')) : 0);
                        
                        const unallocatedGB = Math.max(0, totalSizeGB - allocatedGB);
                        const unallocatedPercent = totalSizeGB > 0 ? (unallocatedGB / totalSizeGB) * 100 : 0;
                        const allocatedPercent = totalSizeGB > 0 ? (allocatedGB / totalSizeGB) * 100 : 0;
                        
                        return `
                            <div class="disk-card-compact">
                                <div class="disk-card-header">
                                    <div class="disk-name-group">
                                        <i class="fas fa-hdd"></i>
                                        <div class="disk-info">
                                            <div class="disk-name">${disk.friendlyName || `Disk ${disk.number || 'N/A'}`}</div>
                                            ${disk.uniqueId || disk.serialNumber ? `<div class="disk-id">${disk.uniqueId || disk.serialNumber}</div>` : ''}
                                        </div>
                                    </div>
                                    <div class="disk-status-badge status-${(disk.operationalStatus || 'unknown').toLowerCase()}">
                                        <i class="fas ${disk.operationalStatus === 'Online' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                                        ${this.translateStatus(disk.operationalStatus) || 'Unknown'}
                                    </div>
                                </div>
                                <div class="disk-card-body">
                                    <div class="disk-size-info">
                                        <div class="disk-size-main">
                                            <span class="disk-size-label">Total Size</span>
                                            <span class="disk-size-value">${totalSizeGB.toFixed(2)} GB</span>
                                        </div>
                                        <div class="disk-usage-bar">
                                            <div class="usage-bar-track">
                                                <div class="usage-bar-fill" style="width: ${allocatedPercent}%; background: ${unallocatedPercent >= 25 ? '#10b981' : unallocatedPercent >= 10 ? '#f59e0b' : '#ef4444'};"></div>
                                            </div>
                                            <div class="usage-bar-labels">
                                                <span class="usage-allocated">${allocatedGB.toFixed(1)} GB allocated</span>
                                                <span class="usage-unallocated">${unallocatedGB.toFixed(1)} GB unallocated</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    renderHostVolumes(host) {
        if (!host.volumes || !Array.isArray(host.volumes) || host.volumes.length === 0) {
            return '';
        }

        return `
            <div class="host-volumes-section-compact">
                <div class="host-volumes-header-compact">
                    <div class="host-volumes-title-group">
                        <i class="fas fa-database"></i>
                        <span>Volumes</span>
                        <span class="volume-count-pill">${host.volumes.length}</span>
                    </div>
                </div>
                <div class="host-volumes-grid-compact">
                    ${host.volumes.map(volume => {
                        const totalSizeGB = typeof volume.size === 'number' ? volume.size : 
                            (typeof volume.size === 'string' ? parseFloat(volume.size.replace(/[^\d.]/g, '')) : 0);
                        const freeSizeGB = typeof volume.sizeRemaining === 'number' ? volume.sizeRemaining : 
                            (typeof volume.sizeRemaining === 'string' ? parseFloat(volume.sizeRemaining.replace(/[^\d.]/g, '')) : 0);
                        const usedSizeGB = totalSizeGB - freeSizeGB;
                        const freePercent = totalSizeGB > 0 ? (freeSizeGB / totalSizeGB) * 100 : 0;
                        const usedPercent = totalSizeGB > 0 ? (usedSizeGB / totalSizeGB) * 100 : 0;
                        
                        return `
                            <div class="volume-card-compact">
                                <div class="volume-card-header">
                                    <div class="volume-name-group">
                                        <i class="fas ${volume.driveLetter ? 'fa-folder' : 'fa-database'}"></i>
                                        <div class="volume-info">
                                            <div class="volume-name">${volume.fileSystemLabel || volume.driveLetter || 'Volume'}</div>
                                            ${volume.driveLetter || volume.fileSystem ? `<div class="volume-drive-fs">
                                                ${volume.driveLetter ? `<span class="volume-drive">${volume.driveLetter}:</span>` : ''}
                                                ${volume.fileSystem ? `<span class="volume-fs">${volume.fileSystem}</span>` : ''}
                                            </div>` : ''}
                                        </div>
                                    </div>
                                    <div class="volume-status-badge status-${(volume.healthStatus || 'unknown').toLowerCase()}">
                                        <i class="fas ${volume.healthStatus === 'Healthy' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                                        ${this.translateStatus(volume.healthStatus) || 'Unknown'}
                                    </div>
                                </div>
                                <div class="volume-card-body">
                                    <div class="volume-size-info">
                                        <div class="volume-size-main">
                                            <span class="volume-size-label">Total Size</span>
                                            <span class="volume-size-value">${totalSizeGB.toFixed(2)} GB</span>
                                        </div>
                                        <div class="volume-usage-bar">
                                            <div class="usage-bar-track">
                                                <div class="usage-bar-fill" style="width: ${usedPercent}%; background: ${freePercent >= 25 ? '#10b981' : freePercent >= 10 ? '#f59e0b' : '#ef4444'};"></div>
                                            </div>
                                            <div class="usage-bar-labels">
                                                <span class="usage-used">${usedSizeGB.toFixed(1)} GB used</span>
                                                <span class="usage-free">${freeSizeGB.toFixed(1)} GB free (${freePercent.toFixed(1)}%)</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    renderVolumesSection() {
        const filteredVolumes = this.getFilteredVolumes();
        return `
            <div class="card" style="margin-bottom: 1.5rem;">
                <div class="card-header">
                    <h2 class="card-title">
                        <i class="fas fa-hdd"></i> ${this.t('disksVolumes')}
                        <span class="badge-count">${filteredVolumes.length} / ${this.volumes.length}</span>
                    </h2>
                </div>
                <div class="card-body">
                    <div class="table-container">
                        <table class="data-table data-table-advanced">
                            <thead>
                                <tr>
                                    <th>${this.t('volumeName')}</th>
                                    <th>${this.t('volumeState')}</th>
                                    <th>${this.t('volumeUsage')}</th>
                                    <th>${this.t('volumeOwner')}</th>
                                    <th>${this.t('storageUtilization')}</th>
                                    <th>${this.t('totalSize')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filteredVolumes.map(volume => `
                                    <tr>
                                        <td>
                                            <strong>${volume.name}</strong>
                                            <br><span class="text-muted">${volume.diskName}</span>
                                        </td>
                                        <td>
                                            <span class="status-badge status-${volume.state.toLowerCase()}">${this.translateStatus(volume.state)}</span>
                                        </td>
                                        <td>
                                            <span class="usage-badge">${volume.usage}</span>
                                        </td>
                                        <td>${volume.owner}</td>
                                        <td>
                                            <div class="storage-display">
                                                <div class="storage-bar">
                                                    <div class="storage-used" style="width: ${100 - volume.freePercent}%; background: ${volume.freePercent >= 25 ? '#10b981' : volume.freePercent >= 10 ? '#f59e0b' : '#ef4444'};"></div>
                                                </div>
                                                <div class="storage-text">
                                                    <span>${volume.usedSize}</span> / ${volume.totalSize}
                                                    <span class="storage-percent">(${volume.freePercent}% ${this.t('free').toLowerCase()})</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <strong>${volume.totalSize}</strong>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    setLanguage(lang) {
        this.language = lang;
        this.updateDisplay();
    }

    filterServerVMs(hostIndex, searchTerm) {
        const table = document.getElementById(`vm-table-${hostIndex}`);
        if (!table) return;
        
        const rows = table.getElementsByTagName('tr');
        const search = searchTerm.toLowerCase();
        
        for (let row of rows) {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(search) ? '' : 'none';
        }
    }

    getFilteredVolumes() {
        let filtered = [...this.volumes];
        return filtered;
    }

    toggleRow(rowId) {
        if (this.filters.expandedRows.has(rowId)) {
            this.filters.expandedRows.delete(rowId);
        } else {
            this.filters.expandedRows.add(rowId);
        }
        this.updateDisplay();
    }

    toggleAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
            this.showMessage('Auto refresh disabled', 'info');
        } else {
            this.refreshInterval = setInterval(() => {
                this.generateReport();
            }, 30000);
            this.showMessage('Auto refresh enabled (30s interval)', 'success');
        }
        this.updateDisplay();
    }

    exportReport(format) {
        this.showMessage(`Exporting report as ${format.toUpperCase()}...`, 'info');
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

    async generateScript(options = {}) {
        const { encrypt = true, obfuscate = true } = options;
        if (!this.selectedReport) {
            this.showMessage('Please select a report first', 'error');
            return;
        }

        this.showMessage(encrypt ? 'Generating script...' : 'Generating plain script...', 'info');

        try {
            const response = await fetch('/api/hyperv-reports/generate-script', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reportId: this.selectedReport.id ? parseInt(this.selectedReport.id) : null,
                    targetType: this.selectedReport.targetType,
                    cluster: this.selectedReport.clusterName || '',
                    hosts: this.selectedReport.hostNames ? this.selectedReport.hostNames.split(',').map(h => h.trim()) : [],
                    encrypt,
                    obfuscate
                })
            });

            if (!response.ok) {
                throw new Error('Failed to generate script');
            }

            const data = await response.json();
            
            // Create a blob and download
            const blob = new Blob([data.script], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `HyperVAuditor-${this.selectedReport.name.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.ps1`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            this.showMessage(encrypt ? 'Script generated and downloaded successfully!' : 'Plain script generated successfully!', 'success');
        } catch (error) {
            this.showMessage('Error generating script: ' + error.message, 'error');
        }
    }

    importReport() {
        document.getElementById('report-file-input').click();
    }

    async handleFileSelect(event) {
        if (!this.selectedReport) {
            this.showMessage('Please select a report first', 'error');
            return;
        }

        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.json')) {
            this.showMessage('Please select a JSON file', 'error');
            return;
        }

        this.showMessage('Importing report data...', 'info');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('reportId', this.selectedReport.id);

        try {
            const response = await fetch('/api/hyperv-reports/import', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to import report data');
            }

            const result = await response.json();
            if (result.success && result.data) {
                this.loadImportedData(result.data);
                // Reload reports to update hasData status
                await this.loadReports();
                // Update display and reselect the current report
                this.updateDisplay();
                await this.selectReport(this.selectedReport.id);
                this.showMessage('Report data imported successfully!', 'success');
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error) {
            this.showMessage('Error importing report: ' + error.message, 'error');
        }

        // Reset file input
        event.target.value = '';
    }

    loadImportedData(data) {
        // Clear existing data
        this.clusterName = data.clusterName || '';
        this.hosts = [];
        this.vms = [];
        this.volumes = [];
        this.clusterInfo = data.clusterInfo || {};
        this.clusterSharedVolumes = Array.isArray(data.clusterSharedVolumes) ? data.clusterSharedVolumes : [];
        this.clusterDisks = Array.isArray(data.clusterDisks) ? data.clusterDisks : [];
        this.quorumDisks = Array.isArray(data.quorumDisks) ? data.quorumDisks : [];
        this.clusterErrors = Array.isArray(data.clusterErrors) ? data.clusterErrors : [];

        // Load hosts data
        if (data.hosts && Array.isArray(data.hosts)) {
            this.hosts = data.hosts.map(host => ({
                name: host.name || 'Unknown',
                osVersion: host.osVersion || 'Unknown',
                osVersionString: host.osVersionString,
                osVersionNumber: host.osVersionNumber,
                osBuildNumber: host.osBuildNumber,
                osFullBuild: host.osFullBuild,
                osArchitecture: host.osArchitecture,
                osEditionID: host.osEditionID,
                osProductName: host.osProductName,
                osInstallDate: host.osInstallDate,
                osServicePack: host.osServicePack,
                osDisplayVersion: host.osDisplayVersion,
                osReleaseId: host.osReleaseId,
                osCurrentBuild: host.osCurrentBuild,
                osUBR: host.osUBR,
                windowsActivation: host.windowsActivation,
                missingUpdates: Array.isArray(host.missingUpdates) ? host.missingUpdates : [],
                drivers: Array.isArray(host.drivers) ? host.drivers : [],
                installedApplications: Array.isArray(host.installedApplications) ? host.installedApplications : [],
                services: Array.isArray(host.services) ? host.services : [],
                windowsFirewall: Array.isArray(host.windowsFirewall) ? host.windowsFirewall : [],
                // Check status first (from PowerShell script), prioritize 'offline' over any state value
                status: host.status || (host.error ? 'offline' : (host.state === 'Down' ? 'offline' : (host.state ? host.state.toLowerCase() : 'online'))),
                // If status is offline or error exists, set state to Down; otherwise use state or default to Up
                state: (host.status === 'offline' || host.error || host.state === 'Down') ? 'Down' : (host.state || 'Up'), // Fallback for compatibility
                error: host.error || null, // Preserve error message
                uptime: host.uptime || 'N/A',
                domain: host.domain || 'N/A',
                totalVm: host.totalVm || 0,
                runningVm: host.runningVm || 0,
                totalVProc: host.totalVProc || 0,
                vpLpRatio: host.vpLpRatio || 'N/A',
                logicalProcessor: (host.logicalProcessor !== null && host.logicalProcessor !== undefined) ? host.logicalProcessor : 0,
                socketCount: host.socketCount || 0,
                processor: host.processor || {},
                memory: host.memory || {},
                usedMemory: host.memory?.used || host.usedMemory || null,
                freeMemory: host.memory?.free || host.freeMemory || null,
                totalMemory: host.memory?.total || host.totalMemory || (host.hardware && host.hardware.totalMemory ? host.hardware.totalMemory : null),
                freeMemoryPercent: host.memory?.freePercent || host.freeMemoryPercent || 0,
                hardware: host.hardware || {},
                disks: host.disks || [],
                volumes: host.volumes || [],
                systemErrors: Array.isArray(host.systemErrors) ? host.systemErrors : [],
                serverRoles: Array.isArray(host.serverRoles) ? host.serverRoles : [],
                localUsers: Array.isArray(host.localUsers) ? host.localUsers : [],
                localGroups: Array.isArray(host.localGroups) ? host.localGroups : [],
                networkAdapters: Array.isArray(host.networkAdapters) ? host.networkAdapters.map(adapter => {
                    // Ensure boolean values are properly converted
                    const isTeamed = adapter.isTeamed === true || adapter.isTeamed === 'true' || adapter.isTeamed === 1;
                    const isSET = adapter.isSET === true || adapter.isSET === 'true' || adapter.isSET === 1;
                    const isVirtual = adapter.isVirtual === true || adapter.isVirtual === 'true' || adapter.isVirtual === 1;
                    
                    return {
                        name: adapter.name || '',
                        interfaceName: adapter.interfaceName || adapter.interfaceDescription || '',
                        interfaceDescription: adapter.interfaceDescription || adapter.interfaceName || '',
                        status: adapter.status || adapter.state || 'Unknown',
                        state: adapter.state || adapter.status || 'Unknown',
                        ipAddress: adapter.ipAddress || '',
                        macAddress: adapter.macAddress || '',
                        linkSpeed: adapter.linkSpeed || '',
                        mtu: adapter.mtu || null,
                        duplexMode: adapter.duplexMode || 'N/A',
                        isVirtual: isVirtual,
                        virtualSwitch: adapter.virtualSwitch || '',
                        vlanMode: adapter.vlanMode || 'Untagged',
                        vlanId: adapter.vlanId || 0,
                        dhcpGuard: adapter.dhcpGuard || 'Off',
                        routerGuard: adapter.routerGuard || 'Off',
                        bandwidthMin: adapter.bandwidthMin || 0,
                        bandwidthMax: adapter.bandwidthMax || 0,
                        bindings: Array.isArray(adapter.bindings) ? adapter.bindings : [],
                        // New IP configuration fields
                        subnetMask: adapter.subnetMask || null,
                        defaultGateway: adapter.defaultGateway || null,
                        dnsServers: adapter.dnsServers || null,
                        dhcpEnabled: adapter.dhcpEnabled !== undefined ? (adapter.dhcpEnabled === true || adapter.dhcpEnabled === 'true' || adapter.dhcpEnabled === 1) : null,
                        // NIC Teaming fields
                        isTeamed: isTeamed,
                        teamName: adapter.teamName || null,
                        teamLoadBalancingAlgorithm: adapter.teamLoadBalancingAlgorithm || null,
                        teamTeamingMode: adapter.teamTeamingMode || null,
                        teamStatus: adapter.teamStatus || null,
                        // Hyper-V SET fields
                        isSET: isSET,
                        setSwitchName: adapter.setSwitchName || null,
                        setLoadBalancingAlgorithm: adapter.setLoadBalancingAlgorithm || null
                    };
                }) : [],
                windowsUpdates: Array.isArray(host.windowsUpdates) ? host.windowsUpdates : [],
                multipathIO: host.multipathIO || {},
                liveMigration: host.liveMigration || {},
                virtualSwitches: Array.isArray(host.virtualSwitches) ? host.virtualSwitches : [],
                hypervErrors: Array.isArray(host.hypervErrors) ? host.hypervErrors : [],
                isClustered: host.isClustered || false,
                clusterNodeState: host.clusterNodeState || null // Preserve cluster node state from PowerShell script
            }));

            // Load VMs from all hosts
            data.hosts.forEach(host => {
                if (host.vms && Array.isArray(host.vms)) {
                    this.vms = this.vms.concat(host.vms.map(vm => ({
                        name: vm.name || 'Unknown',
                        generation: vm.generation || 2,
                        version: vm.version || 10.0,
                        state: vm.state || 'Unknown',
                        uptime: vm.uptime || 'N/A',
                        host: host.name || 'Unknown',
                        configurationPath: vm.configurationPath || 'N/A',
                        configurationXmlPath: vm.configurationXmlPath || 'N/A',
                        vCPU: vm.vCPU || 0,
                        memory: vm.memory || { startup: 0 },
                        integrationServices: vm.integrationServices || { state: 'N/A', version: 'N/A' },
                        checkpoint: vm.checkpoint ? {
                            exists: vm.checkpoint.exists || false,
                            count: vm.checkpoint.count || 0,
                            chain: (vm.checkpoint.chain || []).map(cp => ({
                                name: cp.name || 'Unknown',
                                id: cp.id || '',
                                creationTime: cp.creationTime || '',
                                parentSnapshotId: cp.parentSnapshotId || null,
                                disks: cp.disks || []
                            }))
                        } : { exists: false, count: 0, chain: [] },
                        replica: vm.replica || { state: 'Disabled', health: 'N/A', mode: 'N/A' },
                        networkAdapters: vm.networkAdapters || [],
                        disks: vm.disks || []
                    })));
                }
            });
        }

        // Add cluster shared volumes and cluster disks
        if (this.clusterSharedVolumes && Array.isArray(this.clusterSharedVolumes)) {
            this.volumes = this.volumes.concat(this.clusterSharedVolumes.map(csv => ({
                ...csv,
                isCSV: true,
                type: 'Cluster Shared Volume'
            })));
        }

        // Calculate overview
        this.calculateOverview();

        // Debug: Log new data fields
        if (this.hosts && this.hosts.length > 0) {
            this.hosts.forEach((host, index) => {
                console.log(`Host ${index} (${host.name}):`, {
                    missingUpdates: host.missingUpdates?.length || 0,
                    drivers: host.drivers?.length || 0,
                    installedApplications: host.installedApplications?.length || 0,
                    services: host.services?.length || 0,
                    windowsFirewall: host.windowsFirewall?.length || 0
                });
                // Debug: Check raw data
                console.log(`Host ${index} raw data:`, {
                    hasMissingUpdates: !!host.missingUpdates,
                    missingUpdatesType: typeof host.missingUpdates,
                    missingUpdatesIsArray: Array.isArray(host.missingUpdates),
                    missingUpdatesValue: host.missingUpdates,
                    hasDrivers: !!host.drivers,
                    driversType: typeof host.drivers,
                    driversIsArray: Array.isArray(host.drivers),
                    driversValue: host.drivers,
                    hasInstalledApplications: !!host.installedApplications,
                    installedApplicationsType: typeof host.installedApplications,
                    installedApplicationsIsArray: Array.isArray(host.installedApplications),
                    installedApplicationsValue: host.installedApplications
                });
            });
        }

        this.updateDisplay();
    }

    calculateOverview() {
        const totalNodes = this.hosts.length;
        // Check status first, then fall back to state, also consider clusterNodeState for clustered nodes
        const upNodes = this.hosts.filter(h => {
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
        const parseGB = (value) => {
            if (typeof value === 'number' && !isNaN(value)) {
                return value;
            }
            if (typeof value === 'string') {
                const match = value.match(/([\d.]+)/);
                if (match) {
                    return parseFloat(match[1]);
                }
            }
            return 0;
        };
        
        let totalLP = 0;
        let totalMemory = 0;
        let usedMemory = 0;
        let totalStorage = 0;
        let usedStorage = 0;
        let totalVm = 0;
        let runningVm = 0;
        let totalVProc = 0;
        let totalVmMemory = 0;
        let usedVmMemory = 0;
        let totalVmVHD = 0;
        let usedVmVHD = 0;
        const seenDisks = new Set(); // Track seen disks to avoid duplication in clusters
        const seenVolumes = new Set(); // Track seen volumes to avoid duplication in clusters

        this.hosts.forEach(host => {
            totalLP += host.logicalProcessor || 0;
            
            // Parse memory - handle both string and number formats
            if (typeof host.totalMemory === 'number') {
                totalMemory += host.totalMemory;
            } else if (typeof host.memory?.total === 'number') {
                totalMemory += host.memory.total;
            } else {
                const memMatch = (host.totalMemory || '0 GB').toString().match(/([\d.]+)\s*GB/i);
                if (memMatch) {
                    totalMemory += parseFloat(memMatch[1]);
                }
            }
            
            if (typeof host.usedMemory === 'number') {
                usedMemory += host.usedMemory;
            } else if (typeof host.memory?.used === 'number') {
                usedMemory += host.memory.used;
            } else {
                const usedMemMatch = (host.usedMemory || '0 GB').toString().match(/([\d.]+)\s*GB/i);
                if (usedMemMatch) {
                    usedMemory += parseFloat(usedMemMatch[1]);
                }
            }

            totalVm += host.totalVm || 0;
            runningVm += host.runningVm || 0;
            totalVProc += host.totalVProc || 0;

            // Storage from disks (deduplicate to avoid counting same disk multiple times in clusters)
            if (Array.isArray(host.disks) && host.disks.length > 0) {
                host.disks.forEach(disk => {
                    const size = parseGB(disk.size);
                    // Only add if we haven't seen this disk before (deduplicate by uniqueId or serialNumber)
                    const diskId = disk.uniqueId || disk.serialNumber || `${disk.friendlyName}-${size}`;
                    if (!seenDisks.has(diskId)) {
                        seenDisks.add(diskId);
                        totalStorage += size;
                    }
                });
            }
            
            // Calculate used storage from volumes (also deduplicate)
            if (Array.isArray(host.volumes) && host.volumes.length > 0) {
                host.volumes.forEach(vol => {
                    const size = parseGB(vol.size);
                    const free = parseGB(vol.sizeRemaining);
                    const volId = vol.uniqueId || vol.path || `${vol.fileSystemLabel}-${size}`;
                    
                    if (!seenVolumes.has(volId)) {
                        seenVolumes.add(volId);
                        if (size > 0 && free >= 0) {
                            const used = size - free;
                            usedStorage += used > 0 ? used : 0;
                        }
                    }
                });
            }
        });

        this.vms.forEach(vm => {
            // Parse VM memory - handle both string and number formats
            if (typeof vm.memory?.startup === 'number') {
                totalVmMemory += vm.memory.startup;
            } else {
                const vmMemMatch = (vm.memory?.startup || '0 GB').toString().match(/([\d.]+)\s*GB/i);
                if (vmMemMatch) {
                    totalVmMemory += parseFloat(vmMemMatch[1]);
                }
            }
            
            if (typeof vm.memory?.assigned === 'number') {
                usedVmMemory += vm.memory.assigned;
            } else if (typeof vm.memory?.startup === 'number') {
                usedVmMemory += vm.memory.startup;
            } else {
                const vmUsedMemMatch = (vm.memory?.assigned || vm.memory?.startup || '0 GB').toString().match(/([\d.]+)\s*GB/i);
                if (vmUsedMemMatch) {
                    usedVmMemory += parseFloat(vmUsedMemMatch[1]);
                }
            }
            
            totalVProc += vm.vCPU || 0;
            
            // Parse VM disk sizes
            if (vm.disks && Array.isArray(vm.disks)) {
                vm.disks.forEach(disk => {
                    if (typeof disk.currentSize === 'number') {
                        usedVmVHD += disk.currentSize;
                    } else {
                        const usedDiskMatch = (disk.currentSize || '0 GB').toString().match(/([\d.]+)\s*GB/i);
                        if (usedDiskMatch) {
                            usedVmVHD += parseFloat(usedDiskMatch[1]);
                        }
                    }
                    if (typeof disk.maxSize === 'number') {
                        totalVmVHD += disk.maxSize;
                    } else {
                        const diskMatch = (disk.maxSize || '0 GB').toString().match(/([\d.]+)\s*GB/i);
                        if (diskMatch) {
                            totalVmVHD += parseFloat(diskMatch[1]);
                        }
                    }
                });
            }
        });

        this.overview = {
            upNodes: upNodes,
            totalNodes: totalNodes,
            totalLP: totalLP,
            usedMemory: { value: Math.round(usedMemory), unit: 'GB' },
            totalMemory: { value: Math.round(totalMemory), unit: 'GB' },
            usedStorage: { value: Math.round(usedStorage), unit: 'GB' },
            totalStorage: { value: Math.round(totalStorage), unit: 'GB' },
            runningVm: runningVm,
            totalVm: totalVm,
            totalVProc: totalVProc,
            usedVmMemory: { value: Math.round(usedVmMemory), unit: 'GB' },
            totalVmMemory: { value: Math.round(totalVmMemory), unit: 'GB' },
            usedVmVHD: { value: Math.round(usedVmVHD), unit: 'GB' },
            totalVmVHD: { value: Math.round(totalVmVHD), unit: 'GB' }
        };
    }

    async generateReport() {
        // This method is kept for backward compatibility but now redirects to import
        this.showMessage('Please use "Import Report Data" to load data from the generated script', 'info');
    }

    loadSampleClusterData() {
        this.overview = {
            upNodes: 3,
            totalNodes: 4,
            totalLP: 48,
            usedMemory: { value: 256, unit: 'GB' },
            totalMemory: { value: 512, unit: 'GB' },
            usedStorage: { value: 2048, unit: 'GB' },
            totalStorage: { value: 4096, unit: 'GB' },
            runningVm: 15,
            totalVm: 20,
            totalVProc: 60,
            usedVmMemory: { value: 128, unit: 'GB' },
            totalVmMemory: { value: 256, unit: 'GB' },
            usedVmVHD: { value: 1024, unit: 'GB' },
            totalVmVHD: { value: 2048, unit: 'GB' }
        };

        this.hosts = [
            {
                name: 'HVNODE01',
                osVersion: 'Windows Server 2022',
                state: 'Up',
                uptime: '45 Days 12:30:15',
                domain: 'domain.corp',
                totalVm: 7,
                runningVm: 5,
                totalVProc: 20,
                vpLpRatio: '1.25',
                logicalProcessor: 16,
                socketCount: 2,
                usedMemory: '64 GB',
                freeMemory: '64 GB',
                totalMemory: '128 GB',
                freeMemoryPercent: 50,
                hardware: {
                    manufacturer: 'Dell Inc.',
                    model: 'PowerEdge R740',
                    serialNumber: 'ABC123456789',
                    processor: 'Intel Xeon Gold 6248R (16 cores)'
                },
                systemErrors: [
                    {
                        message: 'High memory usage detected',
                        time: '2025-01-20 14:30:00',
                        source: 'System Monitor'
                    },
                    {
                        message: 'Disk I/O warning on Volume1',
                        time: '2025-01-20 13:15:00',
                        source: 'Storage Monitor'
                    }
                ]
            },
            {
                name: 'HVNODE02',
                osVersion: 'Windows Server 2022',
                state: 'Up',
                uptime: '45 Days 12:28:42',
                domain: 'domain.corp',
                totalVm: 7,
                runningVm: 5,
                totalVProc: 20,
                vpLpRatio: '1.25',
                logicalProcessor: 16,
                socketCount: 2,
                usedMemory: '64 GB',
                freeMemory: '64 GB',
                totalMemory: '128 GB',
                freeMemoryPercent: 50,
                hardware: {
                    manufacturer: 'Dell Inc.',
                    model: 'PowerEdge R740',
                    serialNumber: 'XYZ987654321',
                    processor: 'Intel Xeon Gold 6248R (16 cores)'
                },
                systemErrors: []
            },
            {
                name: 'HVNODE03',
                osVersion: 'Windows Server 2022',
                state: 'Up',
                uptime: '45 Days 12:25:10',
                domain: 'domain.corp',
                totalVm: 6,
                runningVm: 5,
                totalVProc: 20,
                vpLpRatio: '1.25',
                logicalProcessor: 16,
                socketCount: 2,
                usedMemory: '64 GB',
                freeMemory: '64 GB',
                totalMemory: '128 GB',
                freeMemoryPercent: 50,
                hardware: {
                    manufacturer: 'HP Enterprise',
                    model: 'ProLiant DL380 Gen10',
                    serialNumber: 'HP123456789',
                    processor: 'Intel Xeon Silver 4214 (12 cores)'
                },
                systemErrors: [
                    {
                        message: 'Network adapter link down',
                        time: '2025-01-20 10:00:00',
                        source: 'Network Monitor'
                    }
                ]
            }
        ];

        this.volumes = [
            {
                name: 'C:\\ClusterStorage\\Volume1',
                diskName: 'Cluster Disk 1',
                state: 'Online',
                usage: 'CSV',
                owner: 'HVNODE01',
                busType: 'SAS',
                fileSystem: 'NTFS',
                activeVHD: { count: 5, size: '500 GB / 1 TB' },
                usedSize: '750 GB',
                freeSize: '250 GB',
                totalSize: '1 TB',
                freePercent: 25
            },
            {
                name: 'C:\\ClusterStorage\\Volume2',
                diskName: 'Cluster Disk 2',
                state: 'Online',
                usage: 'CSV',
                owner: 'HVNODE02',
                busType: 'SAS',
                fileSystem: 'NTFS',
                activeVHD: { count: 3, size: '300 GB / 800 GB' },
                usedSize: '600 GB',
                freeSize: '200 GB',
                totalSize: '800 GB',
                freePercent: 25
            }
        ];

        this.vms = [
            {
                name: 'VM-DC01',
                generation: 2,
                version: 10.0,
                state: 'Running',
                uptime: '45 Days 12:00:00',
                host: 'HVNODE01',
                vCPU: 4,
                memory: {
                    startup: '8 GB',
                    min: '4 GB',
                    max: '16 GB',
                    assigned: '8 GB'
                },
                integrationServices: {
                    state: 'UpToDate',
                    version: '10.0.19041.1'
                },
                checkpoint: {
                    exists: false,
                    count: 0
                },
                replica: {
                    state: 'Disabled',
                    health: 'N/A'
                },
                networkAdapters: [
                    {
                        name: 'Synthetic Network Adapter',
                        connection: 'Connected',
                        ip: '192.168.1.10',
                        switch: 'vSwitch-MGMT',
                        vlan: '10',
                        macAddress: '00-15-5D-01-02-03'
                    },
                    {
                        name: 'Synthetic Network Adapter 2',
                        connection: 'Connected',
                        ip: '192.168.1.11',
                        switch: 'vSwitch-VM',
                        vlan: '30',
                        macAddress: '00-15-5D-01-02-04'
                    }
                ],
                disks: [
                    {
                        name: 'VM-DC01.vhdx',
                        currentSize: '120 GB',
                        maxSize: '200 GB',
                        type: 'Dynamic',
                        controller: 'SCSI'
                    }
                ]
            },
            {
                name: 'VM-SQL01',
                generation: 2,
                version: 10.0,
                state: 'Running',
                uptime: '30 Days 08:15:30',
                host: 'HVNODE02',
                vCPU: 8,
                memory: {
                    startup: '32 GB',
                    min: '16 GB',
                    max: '64 GB',
                    assigned: '32 GB'
                },
                integrationServices: {
                    state: 'UpToDate',
                    version: '10.0.19041.1'
                },
                checkpoint: {
                    exists: true,
                    count: 2
                },
                replica: {
                    state: 'Disabled',
                    health: 'N/A'
                },
                networkAdapters: [
                    {
                        name: 'Synthetic Network Adapter',
                        connection: 'Connected',
                        ip: '192.168.1.20',
                        switch: 'vSwitch-MGMT',
                        vlan: '10',
                        macAddress: '00-15-5D-02-02-03'
                    }
                ],
                disks: [
                    {
                        name: 'VM-SQL01.vhdx',
                        currentSize: '500 GB',
                        maxSize: '1 TB',
                        type: 'Dynamic',
                        controller: 'SCSI'
                    }
                ]
            },
            {
                name: 'VM-WEB01',
                generation: 2,
                version: 10.0,
                state: 'Running',
                uptime: '20 Days 05:30:00',
                host: 'HVNODE01',
                vCPU: 2,
                memory: {
                    startup: '4 GB',
                    min: '2 GB',
                    max: '8 GB',
                    assigned: '4 GB'
                },
                integrationServices: {
                    state: 'UpToDate',
                    version: '10.0.19041.1'
                },
                checkpoint: {
                    exists: false,
                    count: 0
                },
                replica: {
                    state: 'Disabled',
                    health: 'N/A'
                },
                networkAdapters: [
                    {
                        name: 'Synthetic Network Adapter',
                        connection: 'Connected',
                        ip: '192.168.1.30',
                        switch: 'vSwitch-VM',
                        vlan: '30',
                        macAddress: '00-15-5D-03-02-03'
                    }
                ],
                disks: [
                    {
                        name: 'VM-WEB01.vhdx',
                        currentSize: '80 GB',
                        maxSize: '200 GB',
                        type: 'Dynamic',
                        controller: 'SCSI'
                    }
                ]
            }
        ];
    }

    loadSampleHostData(hostNames) {
        this.overview = {
            upNodes: 0,
            totalNodes: 0,
            totalLP: 0,
            usedMemory: { value: 0, unit: 'GB' },
            totalMemory: { value: 0, unit: 'GB' },
            usedStorage: { value: 0, unit: 'GB' },
            totalStorage: { value: 0, unit: 'GB' },
            runningVm: 0,
            totalVm: 0,
            totalVProc: 0,
            usedVmMemory: { value: 0, unit: 'GB' },
            totalVmMemory: { value: 0, unit: 'GB' },
            usedVmVHD: { value: 0, unit: 'GB' },
            totalVmVHD: { value: 0, unit: 'GB' }
        };

        this.hosts = hostNames.map(name => ({
            name: name.toUpperCase(),
            osVersion: 'Windows Server 2022',
            state: 'Up',
            uptime: '30 Days 10:20:15',
            domain: 'domain.corp',
            totalVm: 5,
            runningVm: 4,
            totalVProc: 16,
            vpLpRatio: '1.0',
            logicalProcessor: 16,
            socketCount: 2,
            usedMemory: '64 GB',
            freeMemory: '64 GB',
            totalMemory: '128 GB',
            freeMemoryPercent: 50,
            hardware: {
                manufacturer: 'Dell Inc.',
                model: 'PowerEdge R740',
                serialNumber: 'SN' + Math.random().toString(36).substr(2, 9).toUpperCase(),
                processor: 'Intel Xeon Gold 6248R (16 cores)'
            },
            systemErrors: []
        }));

        this.volumes = [];
        this.vms = [];
    }

    clearReport() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        this.clusterName = '';
        this.hosts = [];
        this.vms = [];
        this.volumes = [];
        this.filters.expandedRows.clear();
        this.overview = {
            upNodes: 0,
            totalNodes: 0,
            totalLP: 0,
            usedMemory: { value: 0, unit: 'GB' },
            totalMemory: { value: 0, unit: 'GB' },
            usedStorage: { value: 0, unit: 'GB' },
            totalStorage: { value: 0, unit: 'GB' },
            runningVm: 0,
            totalVm: 0,
            totalVProc: 0,
            usedVmMemory: { value: 0, unit: 'GB' },
            totalVmMemory: { value: 0, unit: 'GB' },
            usedVmVHD: { value: 0, unit: 'GB' },
            totalVmVHD: { value: 0, unit: 'GB' }
        };
        this.updateDisplay();
    }

    showMessage(text, type = 'info') {
        const messageEl = document.getElementById('report-message');
        if (messageEl) {
            messageEl.textContent = text;
            messageEl.className = `message message-${type}`;
            messageEl.style.display = 'block';
            setTimeout(() => {
                messageEl.style.display = 'none';
            }, 5000);
        }
    }

    async updateDisplay() {
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = await this.render();
            // Set instance but don't call mount() to avoid reloading reports
            window.hyperVAuditorInstance = this;
        }
    }

    async mount() {
        window.hyperVAuditorInstance = this;
        const reportId = this.getReportIdFromURL();
        if (reportId) {
            await this.loadReportById(reportId);
        } else {
            // If no report ID in URL, redirect to list
            if (window.appInstance) {
                window.appInstance.navigateTo('hyperv-auditor-list');
            } else {
                // Fallback: use window.location directly
                window.location.hash = 'hyperv-auditor-list';
            }
        }
    }

    async loadReportById(id) {
        try {
            const response = await fetch(`/api/hyperv-reports/get?id=${id}`);
            if (!response.ok) throw new Error('Failed to load report');
            const report = await response.json();
            this.selectedReport = report;
            if (report.reportData) {
                this.loadImportedData(report.reportData);
            }
            this.updateDisplay();
        } catch (error) {
            console.error('Error loading report:', error);
            this.showMessage('Failed to load report', 'error');
        }
    }

    async loadReports() {
        // Prevent multiple simultaneous calls
        if (this.loadingReports) {
            return;
        }
        
        this.loadingReports = true;
        try {
            const response = await fetch('/api/hyperv-reports');
            if (!response.ok) {
                throw new Error('Failed to load reports');
            }
            const reports = await response.json();
            this.reports = reports || [];
            
            // Update display after loading reports
            // Use requestAnimationFrame to avoid updating during render
            requestAnimationFrame(() => {
                const content = document.getElementById('page-content');
                if (content) {
                    // Only update if the page content exists and we're on the hyperv-auditor page
                    const currentHash = window.location.hash.slice(1);
                    if (currentHash === 'hyperv-auditor' || currentHash === '') {
                        this.updateDisplay();
                    }
                }
            });
        } catch (error) {
            console.error('Error loading reports:', error);
            this.showMessage('Error loading reports: ' + error.message, 'error');
        } finally {
            this.loadingReports = false;
        }
    }

    showCreateReportModal() {
        this.showCreateModal = true;
        this.lockBodyScroll();
        this.updateDisplay();
    }

    closeCreateModal() {
        this.showCreateModal = false;
        this.unlockBodyScroll();
        this.updateDisplay();
    }

    showFeatureModal(hostIndex, roleIndex) {
        const host = this.hosts[hostIndex];
        if (!host || !host.serverRoles || !host.serverRoles[roleIndex]) return;
        
        this.selectedFeature = {
            host: host.name,
            role: host.serverRoles[roleIndex]
        };
        this.showFeatureDetailsModal = true;
        this.lockBodyScroll();
        this.updateDisplay();
    }

    closeFeatureModal() {
        this.showFeatureDetailsModal = false;
        this.selectedFeature = null;
        this.unlockBodyScroll();
        this.updateDisplay();
    }

    lockBodyScroll() {
        document.body.classList.add('modal-open');
    }

    unlockBodyScroll() {
        document.body.classList.remove('modal-open');
    }

    showErrorsModal(errorType, title, hostIndex = null) {
        this.selectedErrorsModal = {
            type: errorType,
            title: title,
            hostIndex: hostIndex,
            page: 0
        };
        this.showErrorsModalFlag = true;
        this.lockBodyScroll();
        this.updateDisplay();
    }

    changeErrorsPage(delta) {
        if (!this.selectedErrorsModal) return;
        const { type, hostIndex } = this.selectedErrorsModal;
        let errors = [];
        
        // Get the appropriate errors based on type
        if (type === 'cluster') {
            errors = this.clusterErrors || [];
        } else if (type === 'system' && hostIndex !== null) {
            errors = this.hosts[hostIndex]?.systemErrors || [];
        } else if (type === 'hyperv' && hostIndex !== null) {
            errors = this.hosts[hostIndex]?.hypervErrors || [];
        }
        
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(errors.length / pageSize));
        let page = this.selectedErrorsModal.page || 0;
        page = Math.min(Math.max(page + delta, 0), totalPages - 1);
        this.selectedErrorsModal.page = page;
        this.updateErrorsModalPage();
    }

    updateErrorsModalPage() {
        if (!this.selectedErrorsModal) return;
        const { type, hostIndex, page } = this.selectedErrorsModal;
        let errors = [];
        let errorClass = '';
        
        // Get the appropriate errors based on type
        if (type === 'cluster') {
            errors = this.clusterErrors || [];
            errorClass = 'cluster-error';
        } else if (type === 'system' && hostIndex !== null) {
            errors = this.hosts[hostIndex]?.systemErrors || [];
            errorClass = '';
        } else if (type === 'hyperv' && hostIndex !== null) {
            errors = this.hosts[hostIndex]?.hypervErrors || [];
            errorClass = 'hyperv-error';
        }
        
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(errors.length / pageSize));
        const currentPage = Math.min(Math.max(page || 0, 0), totalPages - 1);
        const start = currentPage * pageSize;
        const pageItems = errors.slice(start, start + pageSize);
        
        const errorsList = document.getElementById('errors-modal-list');
        const pageSpan = document.getElementById('errors-modal-page');
        const prevBtn = document.getElementById('errors-prev-btn');
        const nextBtn = document.getElementById('errors-next-btn');
        
        if (!errorsList || !pageSpan) {
            // Fallback: re-render if elements are missing
            this.updateDisplay();
            return;
        }
        
        // Update errors list
        errorsList.innerHTML = pageItems.length > 0 ? pageItems.map(error => `
            <div class="error-item-modern ${errorClass}">
                <i class="fas fa-exclamation-circle error-item-modern-icon"></i>
                <div class="error-item-modern-content">
                    <div class="error-item-modern-message">${error.message}</div>
                    <div class="error-item-modern-details">
                        <span class="error-item-modern-time"><i class="fas fa-clock"></i> ${error.time}</span>
                        ${error.source ? `<span class="error-item-modern-source"><i class="fas fa-tag"></i> ${error.source}</span>` : ''}
                        ${error.level ? `<span class="error-item-modern-level"><i class="fas fa-info-circle"></i> ${error.level}</span>` : ''}
                        ${error.logName ? `<span class="error-item-modern-log"><i class="fas fa-book"></i> ${
                            type === 'cluster' ? error.logName.replace('Microsoft-Windows-FailoverClustering', 'Cluster') :
                            type === 'hyperv' ? error.logName.replace('Microsoft-Windows-Hyper-V-', 'HV-') :
                            error.logName
                        }</span>` : ''}
                        ${error.node ? `<span class="error-item-modern-node"><i class="fas fa-server"></i> ${error.node}</span>` : ''}
                    </div>
                </div>
            </div>
        `).join('') : '<div class="empty-state">No errors found</div>';
        
        // Update pagination
        if (pageSpan) {
            pageSpan.textContent = `Page ${currentPage + 1} of ${totalPages}`;
        }
        if (prevBtn) {
            prevBtn.disabled = currentPage === 0;
        }
        if (nextBtn) {
            nextBtn.disabled = currentPage === totalPages - 1;
        }
        
        // Scroll to top of errors list
        if (errorsList) {
            errorsList.scrollTop = 0;
        }
    }

    closeErrorsModal() {
        this.showErrorsModalFlag = false;
        this.selectedErrorsModal = null;
        this.unlockBodyScroll();
        this.updateDisplay();
    }

    showUpdatesModal(hostName, hostIndex) {
        this.selectedUpdatesModal = {
            hostName: hostName,
            hostIndex: hostIndex
        };
        this.showUpdatesModalFlag = true;
        this.lockBodyScroll();
        this.updateDisplay();
    }

    closeUpdatesModal() {
        this.showUpdatesModalFlag = false;
        this.selectedUpdatesModal = null;
        this.unlockBodyScroll();
        this.updateDisplay();
    }

    showDriversModal(hostName, hostIndex) {
        this.selectedDriversModal = {
            hostName: hostName,
            hostIndex: hostIndex,
            page: 0
        };
        this.showDriversModalFlag = true;
        this.lockBodyScroll();
        this.updateDisplay();
    }

    changeDriversPage(delta) {
        if (!this.selectedDriversModal) return;
        const hostIndex = this.selectedDriversModal.hostIndex;
        const drivers = this.hosts[hostIndex]?.drivers || [];
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

    showApplicationsModal(hostName, hostIndex) {
        this.selectedApplicationsModal = {
            hostName: hostName,
            hostIndex: hostIndex,
            page: 0
        };
        this.showApplicationsModalFlag = true;
        this.lockBodyScroll();
        this.updateDisplay();
    }

    changeApplicationsPage(delta) {
        if (!this.selectedApplicationsModal) return;
        const hostIndex = this.selectedApplicationsModal.hostIndex;
        const apps = this.hosts[hostIndex]?.installedApplications || [];
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(apps.length / pageSize));
        let page = this.selectedApplicationsModal.page || 0;
        page = Math.min(Math.max(page + delta, 0), totalPages - 1);
        this.selectedApplicationsModal.page = page;
        this.updateApplicationsModalPage();
    }

    closeApplicationsModal() {
        this.showApplicationsModalFlag = false;
        this.selectedApplicationsModal = null;
        this.unlockBodyScroll();
        this.updateDisplay();
    }

    showServicesModal(hostName, hostIndex) {
        this.selectedServicesModal = {
            hostName: hostName,
            hostIndex: hostIndex,
            page: 0
        };
        this.showServicesModalFlag = true;
        this.lockBodyScroll();
        this.updateDisplay();
    }

    changeServicesPage(delta) {
        if (!this.selectedServicesModal) return;
        const hostIndex = this.selectedServicesModal.hostIndex;
        const services = this.hosts[hostIndex]?.services || [];
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

    updateDriversModalPage() {
        if (!this.selectedDriversModal) return;
        const hostIndex = this.selectedDriversModal.hostIndex;
        const drivers = this.hosts[hostIndex]?.drivers || [];
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
            // Fallback: re-render if elements are missing
            this.updateDisplay();
            return;
        }

        tbody.innerHTML = pageItems.map(driver => `
            <tr>
                <td>${driver.classDescription || 'N/A'}</td>
                <td>${driver.providerName || 'N/A'}</td>
                <td>${driver.driverVersion || 'N/A'}</td>
                <td>${driver.versionDate || 'N/A'}</td>
                <td><span class="status-badge status-${driver.status === 'OK' ? 'online' : 'warning'}">${driver.status || 'Unknown'}</span></td>
            </tr>
        `).join('') + (pageItems.length === 0 ? `
            <tr>
                <td colspan="5" style="text-align:center; color:#64748b; font-style:italic;">No drivers to display</td>
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

    updateApplicationsModalPage() {
        if (!this.selectedApplicationsModal) return;
        const hostIndex = this.selectedApplicationsModal.hostIndex;
        const apps = this.hosts[hostIndex]?.installedApplications || [];
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(apps.length / pageSize));
        const currentPage = Math.min(Math.max(this.selectedApplicationsModal.page || 0, 0), totalPages - 1);
        const start = currentPage * pageSize;
        const pageItems = apps.slice(start, start + pageSize);

        const tbody = document.getElementById('applications-modal-body');
        const pageSpan = document.getElementById('applications-modal-page');
        const prevBtn = document.getElementById('applications-prev-btn');
        const nextBtn = document.getElementById('applications-next-btn');

        if (!tbody || !pageSpan) {
            this.updateDisplay();
            return;
        }

        tbody.innerHTML = pageItems.map(app => `
            <tr>
                <td>${app.applicationName || 'N/A'}</td>
                <td>${app.publisher || 'N/A'}</td>
                <td>${app.version || 'N/A'}</td>
                <td>${app.installDate || 'N/A'}</td>
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

    updateServicesModalPage() {
        if (!this.selectedServicesModal) return;
        const hostIndex = this.selectedServicesModal.hostIndex;
        const services = this.hosts[hostIndex]?.services || [];
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(services.length / pageSize));
        const currentPage = Math.min(Math.max(this.selectedServicesModal.page || 0, 0), totalPages - 1);
        const start = currentPage * pageSize;
        const pageItems = services.slice(start, start + pageSize);

        const tbody = document.getElementById('services-modal-body');
        const pageSpan = document.getElementById('services-modal-page');
        const prevBtn = document.getElementById('services-prev-btn');
        const nextBtn = document.getElementById('services-next-btn');

        if (!tbody || !pageSpan) {
            this.updateDisplay();
            return;
        }

        tbody.innerHTML = pageItems.map(service => `
            <tr>
                <td>${service.displayName || 'N/A'}</td>
                <td><code style="background: #0f172a; color: #94a3b8; border: 1px solid #334155; padding: 0.125rem 0.375rem; border-radius: 3px; font-size: 0.75rem;">${service.shortName || 'N/A'}</code></td>
                <td><span class="status-badge status-${service.status === 'Running' ? 'online' : service.status === 'Stopped' ? 'offline' : 'warning'}">${service.status || 'Unknown'}</span></td>
                <td>${service.startType || 'N/A'}</td>
            </tr>
        `).join('') + (pageItems.length === 0 ? `
            <tr>
                <td colspan="4" style="text-align:center; color:#64748b; font-style:italic;">No services to display</td>
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

    showGroupMembersModal(groupName, members, description) {
        this.selectedGroupModal = {
            name: groupName,
            members: members,
            description: description
        };
        this.showGroupMembersModalFlag = true;
        this.lockBodyScroll();
        this.updateDisplay();
    }

    closeGroupMembersModal() {
        this.showGroupMembersModalFlag = false;
        this.selectedGroupModal = null;
        this.unlockBodyScroll();
        this.updateDisplay();
    }

    updateNewTargetType() {
        const targetType = document.getElementById('new-target-type').value;
        const clusterGroup = document.getElementById('new-cluster-group');
        const hostGroup = document.getElementById('new-host-group');
        
        if (targetType === 'cluster') {
            clusterGroup.style.display = 'block';
            hostGroup.style.display = 'none';
        } else {
            clusterGroup.style.display = 'none';
            hostGroup.style.display = 'block';
        }
    }

    async createReport() {
        const name = document.getElementById('new-report-name').value.trim();
        const targetType = document.getElementById('new-target-type').value;
        const clusterName = document.getElementById('new-cluster-name').value.trim();
        const hostNames = document.getElementById('new-host-names').value.trim();

        if (!name) {
            this.showMessage('Please enter a report name', 'error');
            return;
        }

        if (targetType === 'cluster' && !clusterName) {
            this.showMessage('Please enter a cluster name', 'error');
            return;
        }

        if (targetType === 'host' && !hostNames) {
            this.showMessage('Please enter at least one host name', 'error');
            return;
        }

        try {
            const response = await fetch('/api/hyperv-reports', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name,
                    targetType: targetType,
                    cluster: clusterName,
                    hosts: targetType === 'host' ? hostNames.split(',').map(h => h.trim()) : []
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create report');
            }

            this.showCreateModal = false;
            await this.loadReports();
            this.showMessage('Report created successfully!', 'success');
        } catch (error) {
            this.showMessage('Error creating report: ' + error.message, 'error');
        }
    }

    async selectReport(reportId) {
        try {
            const response = await fetch(`/api/hyperv-reports/get?id=${reportId}`);
            if (!response.ok) {
                throw new Error('Failed to load report');
            }
            this.selectedReport = await response.json();
            
            // Load report data if available
            if (this.selectedReport.reportData) {
                this.loadImportedData(this.selectedReport.reportData);
            } else {
                // Clear existing data
                this.clusterName = '';
                this.hosts = [];
                this.vms = [];
                this.volumes = [];
            }
            
            this.updateDisplay();
        } catch (error) {
            this.showMessage('Error loading report: ' + error.message, 'error');
        }
    }

    async deleteReport(reportId) {
        if (!confirm('Are you sure you want to delete this report?')) {
            return;
        }

        try {
            const response = await fetch(`/api/hyperv-reports?id=${reportId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete report');
            }

            if (this.selectedReport?.id === reportId) {
                this.selectedReport = null;
                this.clusterName = '';
                this.hosts = [];
                this.vms = [];
                this.volumes = [];
            }

            // Ensure reports is initialized before loading
            if (!this.reports) {
                this.reports = [];
            }
            
            await this.loadReports();
            // Update display after loading reports
            this.updateDisplay();
            this.showMessage('Report deleted successfully!', 'success');
        } catch (error) {
            this.showMessage('Error deleting report: ' + error.message, 'error');
        }
    }
}
