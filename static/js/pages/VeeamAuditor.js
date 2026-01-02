export class VeeamAuditorPage {
    constructor() {
        this.reportData = null;
        this.reportId = null;
        this.loading = false;
        this.currentLanguage = localStorage.getItem('language') || 'en';
        this.translations = {
            en: {
                title: 'Veeam Backup & Replication Audit',
                subtitle: 'Comprehensive audit report for Veeam Backup & Replication',
                loading: 'Loading audit report...',
                error: 'Error loading report',
                back: 'Back to List',
                noData: 'No audit data available',
                installed: 'Installed',
                version: 'Version',
                connected: 'Connected',
                server: 'Server',
                mfaEnabled: 'MFA Enabled',
                licenseInformation: 'License Information',
                databaseConfiguration: 'Database Configuration',
                backupJobs: 'Backup Jobs',
                repositories: 'Repositories',
                sobrs: 'Scale-Out Backup Repositories',
                proxies: 'Proxies',
                wanAccelerators: 'WAN Accelerators',
                managedServers: 'Managed Servers',
                licensedTo: 'Licensed To',
                edition: 'Edition',
                type: 'Type',
                status: 'Status',
                expirationDate: 'Expiration Date',
                licensedSockets: 'Licensed Sockets',
                usedSockets: 'Used Sockets',
                licensedInstances: 'Licensed Instances',
                usedInstances: 'Used Instances',
                name: 'Name',
                scheduled: 'Scheduled',
                restorePoints: 'Restore Points',
                algorithm: 'Algorithm',
                compression: 'Compression',
                deduplication: 'Deduplication',
                totalSpace: 'Total Space (GB)',
                freeSpace: 'Free Space (GB)',
                policyType: 'Policy Type',
                perVMBackup: 'Per-VM Backup',
                capacityTier: 'Capacity Tier',
                encryption: 'Encryption',
                host: 'Host',
                cores: 'Cores',
                cpuCount: 'CPU Count',
                ram: 'RAM (bytes)',
                auditDate: 'Audit Date',
                serverName: 'Server Name',
                serverAddress: 'Server Address',
                runAudit: 'Run Audit',
                refreshing: 'Refreshing...'
            },
            fr: {
                title: 'Audit Veeam Backup & Replication',
                subtitle: 'Rapport d\'audit complet pour Veeam Backup & Replication',
                loading: 'Chargement du rapport d\'audit...',
                error: 'Erreur lors du chargement du rapport',
                back: 'Retour à la liste',
                noData: 'Aucune donnée d\'audit disponible',
                installed: 'Installé',
                version: 'Version',
                connected: 'Connecté',
                server: 'Serveur',
                mfaEnabled: 'MFA Activé',
                licenseInformation: 'Informations de Licence',
                databaseConfiguration: 'Configuration de la Base de Données',
                backupJobs: 'Tâches de Sauvegarde',
                repositories: 'Dépôts',
                sobrs: 'Dépôts de Sauvegarde Scale-Out',
                proxies: 'Proxies',
                wanAccelerators: 'Accélérateurs WAN',
                managedServers: 'Serveurs Gérés',
                licensedTo: 'Sous Licence Pour',
                edition: 'Édition',
                type: 'Type',
                status: 'Statut',
                expirationDate: 'Date d\'Expiration',
                licensedSockets: 'Sockets Sous Licence',
                usedSockets: 'Sockets Utilisés',
                licensedInstances: 'Instances Sous Licence',
                usedInstances: 'Instances Utilisées',
                name: 'Nom',
                scheduled: 'Planifié',
                restorePoints: 'Points de Restauration',
                algorithm: 'Algorithme',
                compression: 'Compression',
                deduplication: 'Déduplication',
                totalSpace: 'Espace Total (GB)',
                freeSpace: 'Espace Libre (GB)',
                policyType: 'Type de Politique',
                perVMBackup: 'Sauvegarde Par-VM',
                capacityTier: 'Niveau de Capacité',
                encryption: 'Chiffrement',
                host: 'Hôte',
                cores: 'Cœurs',
                cpuCount: 'Nombre de CPU',
                ram: 'RAM (octets)',
                auditDate: 'Date d\'Audit',
                serverName: 'Nom du Serveur',
                serverAddress: 'Adresse du Serveur',
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
                                <h1 class="page-title">☁️ ${this.t('title')}</h1>
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
                                <button class="btn btn-icon" onclick="veeamAuditorInstance.goBack()">
                                    <i class="fas fa-arrow-left"></i>
                                </button>
                                <div>
                                    <h1 class="page-title">☁️ ${this.t('title')}</h1>
                                    <p class="page-subtitle">${this.t('subtitle')}</p>
                                </div>
                            </div>
                            <div class="page-header-actions">
                                <button type="button" class="btn btn-sm btn-primary" onclick="veeamAuditorInstance.generateScript({ encrypt: true, obfuscate: true })" title="Script">
                                    <i class="fas fa-code"></i> <span class="btn-text">Script</span>
                                </button>
                                <button type="button" class="btn btn-sm btn-secondary" onclick="veeamAuditorInstance.generateScript({ encrypt: false, obfuscate: false })" title="Plain Script">
                                    <i class="fas fa-file-alt"></i> <span class="btn-text">Plain Script</span>
                                </button>
                                <button type="button" class="btn btn-sm btn-success" onclick="veeamAuditorInstance.importReport()" title="Import">
                                    <i class="fas fa-upload"></i> <span class="btn-text">Import</span>
                                </button>
                                <input type="file" id="veeam-report-file-input" accept=".json" style="display: none;" onchange="veeamAuditorInstance.handleFileSelect(event)">
                            </div>
                        </div>
                    </div>
                    <div class="reports-empty-state">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <p>${this.t('noData')}</p>
                        <p style="margin-top: 1rem; color: #94a3b8; font-size: 0.875rem;">
                            Click "Script" to download the PowerShell script, run it on your Veeam server, then click "Import" to upload the JSON output.
                        </p>
                    </div>
                </div>
            `;
        }

        const data = this.reportData;
        const veeam = data.veeam || {};

        return `
            <div class="page-container-full">
                <div class="page-header">
                    <div class="page-header-content">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <button class="btn btn-icon" onclick="veeamAuditorInstance.goBack()">
                                <i class="fas fa-arrow-left"></i>
                            </button>
                            <div>
                                <h1 class="page-title">☁️ ${this.t('title')}</h1>
                                <p class="page-subtitle">${data.serverName || 'Veeam Backup & Replication'}</p>
                            </div>
                        </div>
                        <div class="page-header-actions">
                            <button type="button" class="btn btn-sm btn-primary" onclick="veeamAuditorInstance.generateScript({ encrypt: true, obfuscate: true })" title="Script">
                                <i class="fas fa-code"></i> <span class="btn-text">Script</span>
                            </button>
                            <button type="button" class="btn btn-sm btn-secondary" onclick="veeamAuditorInstance.generateScript({ encrypt: false, obfuscate: false })" title="Plain Script">
                                <i class="fas fa-file-alt"></i> <span class="btn-text">Plain Script</span>
                            </button>
                            <button type="button" class="btn btn-sm btn-success" onclick="veeamAuditorInstance.importReport()" title="Import">
                                <i class="fas fa-upload"></i> <span class="btn-text">Import</span>
                            </button>
                            <input type="file" id="veeam-report-file-input" accept=".json" style="display: none;" onchange="veeamAuditorInstance.handleFileSelect(event)">
                        </div>
                    </div>
                </div>

                <div class="audit-content" style="padding: 0; margin: 0; width: 100%; max-width: 100%;">
                    ${veeam.installed !== false ? `
                            
                            ${veeam.error ? `
                                <div style="padding: 1rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 0.5rem; color: #ef4444; margin-bottom: 1rem;">
                                    <i class="fas fa-exclamation-triangle" style="margin-right: 0.5rem;"></i><strong>Error:</strong> ${veeam.error}
                                </div>
                            ` : ''}
                            

                            ${veeam.backupServerInfo && veeam.backupServerInfo.systemInventory && Object.keys(veeam.backupServerInfo.systemInventory).length > 0 ? `
                                <div style="margin-top: 1.5rem; width: 100%; max-width: 100%;">
                                    <h2 style="color: #e2e8f0; font-size: 1rem; margin-bottom: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                                        <i class="fas fa-desktop" style="color: #8b5cf6;"></i>Hardware & Operating System
                                    </h2>
                                    
                                    <div style="background: #1e293b; border-radius: 0.5rem; padding: 1rem; border: 1px solid #334155;">
                                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.875rem;">
                                            ${veeam.backupServerInfo.systemInventory.name ? `
                                                <div>
                                                    <div style="color: #94a3b8; font-size: 0.7rem; font-weight: 500; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.5px;">Name</div>
                                                    <div style="color: #e2e8f0; font-size: 0.85rem; font-weight: 500;">${veeam.backupServerInfo.systemInventory.name}</div>
                                                </div>
                                            ` : ''}
                                            ${veeam.backupServerInfo.systemInventory.manufacturer ? `
                                                <div>
                                                    <div style="color: #94a3b8; font-size: 0.7rem; font-weight: 500; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.5px;">Manufacturer</div>
                                                    <div style="color: #e2e8f0; font-size: 0.85rem;">${veeam.backupServerInfo.systemInventory.manufacturer}</div>
                                                </div>
                                            ` : ''}
                                            ${veeam.backupServerInfo.systemInventory.model ? `
                                                <div>
                                                    <div style="color: #94a3b8; font-size: 0.7rem; font-weight: 500; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.5px;">Model</div>
                                                    <div style="color: #e2e8f0; font-size: 0.85rem;">${veeam.backupServerInfo.systemInventory.model}</div>
                                                </div>
                                            ` : ''}
                                            ${veeam.backupServerInfo.systemInventory.serialNumber ? `
                                                <div>
                                                    <div style="color: #94a3b8; font-size: 0.7rem; font-weight: 500; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.5px;">Serial Number</div>
                                                    <div style="color: #e2e8f0; font-size: 0.85rem; font-family: monospace;">${veeam.backupServerInfo.systemInventory.serialNumber}</div>
                                                </div>
                                            ` : ''}
                                            ${veeam.backupServerInfo.systemInventory.biosType ? `
                                                <div>
                                                    <div style="color: #94a3b8; font-size: 0.7rem; font-weight: 500; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.5px;">BIOS Type</div>
                                                    <div style="color: #e2e8f0; font-size: 0.85rem;">${veeam.backupServerInfo.systemInventory.biosType}</div>
                                                </div>
                                            ` : ''}
                                            ${veeam.backupServerInfo.systemInventory.biosVersion ? `
                                                <div>
                                                    <div style="color: #94a3b8; font-size: 0.7rem; font-weight: 500; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.5px;">BIOS Version</div>
                                                    <div style="color: #e2e8f0; font-size: 0.85rem;">${veeam.backupServerInfo.systemInventory.biosVersion}</div>
                                                </div>
                                            ` : ''}
                                            ${veeam.backupServerInfo.systemInventory.windowsProductName ? `
                                                <div>
                                                    <div style="color: #94a3b8; font-size: 0.7rem; font-weight: 500; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.5px;">Windows Product</div>
                                                    <div style="color: #e2e8f0; font-size: 0.85rem;">${veeam.backupServerInfo.systemInventory.windowsProductName}</div>
                                                </div>
                                            ` : ''}
                                            ${veeam.backupServerInfo.systemInventory.windowsCurrentVersion ? `
                                                <div>
                                                    <div style="color: #94a3b8; font-size: 0.7rem; font-weight: 500; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.5px;">Windows Version</div>
                                                    <div style="color: #e2e8f0; font-size: 0.85rem;">${veeam.backupServerInfo.systemInventory.windowsCurrentVersion}</div>
                                                </div>
                                            ` : ''}
                                            ${veeam.backupServerInfo.systemInventory.windowsBuildNumber ? `
                                                <div>
                                                    <div style="color: #94a3b8; font-size: 0.7rem; font-weight: 500; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.5px;">Build Number</div>
                                                    <div style="color: #e2e8f0; font-size: 0.85rem;">${veeam.backupServerInfo.systemInventory.windowsBuildNumber}</div>
                                                </div>
                                            ` : ''}
                                            ${veeam.backupServerInfo.systemInventory.windowsInstallType ? `
                                                <div>
                                                    <div style="color: #94a3b8; font-size: 0.7rem; font-weight: 500; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.5px;">Install Type</div>
                                                    <div style="color: #e2e8f0; font-size: 0.85rem;">${veeam.backupServerInfo.systemInventory.windowsInstallType}</div>
                                                </div>
                                            ` : ''}
                                            ${veeam.backupServerInfo.systemInventory.activeDirectoryDomain ? `
                                                <div>
                                                    <div style="color: #94a3b8; font-size: 0.7rem; font-weight: 500; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.5px;">Domain</div>
                                                    <div style="color: #e2e8f0; font-size: 0.85rem;">${veeam.backupServerInfo.systemInventory.activeDirectoryDomain}</div>
                                                </div>
                                            ` : ''}
                                            ${veeam.backupServerInfo.systemInventory.windowsInstallationDate ? `
                                                <div>
                                                    <div style="color: #94a3b8; font-size: 0.7rem; font-weight: 500; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.5px;">Installation Date</div>
                                                    <div style="color: #e2e8f0; font-size: 0.85rem;">${veeam.backupServerInfo.systemInventory.windowsInstallationDate}</div>
                                                </div>
                                            ` : ''}
                                            ${veeam.backupServerInfo.systemInventory.timeZone ? `
                                                <div>
                                                    <div style="color: #94a3b8; font-size: 0.7rem; font-weight: 500; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.5px;">Time Zone</div>
                                                    <div style="color: #e2e8f0; font-size: 0.85rem;">${veeam.backupServerInfo.systemInventory.timeZone}</div>
                                                </div>
                                            ` : ''}
                                            ${veeam.backupServerInfo.systemInventory.licenseType ? `
                                                <div>
                                                    <div style="color: #94a3b8; font-size: 0.7rem; font-weight: 500; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.5px;">License Type</div>
                                                    <div style="color: #e2e8f0; font-size: 0.85rem;">${veeam.backupServerInfo.systemInventory.licenseType}</div>
                                                </div>
                                            ` : ''}
                                            ${veeam.backupServerInfo.systemInventory.partialProductKey ? `
                                                <div>
                                                    <div style="color: #94a3b8; font-size: 0.7rem; font-weight: 500; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.5px;">Product Key</div>
                                                    <div style="color: #e2e8f0; font-size: 0.85rem; font-family: monospace;">${veeam.backupServerInfo.systemInventory.partialProductKey}</div>
                                                </div>
                                            ` : ''}
                                            ${veeam.backupServerInfo.systemInventory.processorManufacturer ? `
                                                <div>
                                                    <div style="color: #94a3b8; font-size: 0.7rem; font-weight: 500; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.5px;">Processor Manufacturer</div>
                                                    <div style="color: #e2e8f0; font-size: 0.85rem;">${veeam.backupServerInfo.systemInventory.processorManufacturer}</div>
                                                </div>
                                            ` : ''}
                                            ${veeam.backupServerInfo.systemInventory.processorModel ? `
                                                <div>
                                                    <div style="color: #94a3b8; font-size: 0.7rem; font-weight: 500; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.5px;">Processor Model</div>
                                                    <div style="color: #e2e8f0; font-size: 0.85rem;">${veeam.backupServerInfo.systemInventory.processorModel}</div>
                                                </div>
                                            ` : ''}
                                            ${veeam.backupServerInfo.systemInventory.numberOfCpuCores !== undefined && veeam.backupServerInfo.systemInventory.numberOfCpuCores !== null ? `
                                                <div>
                                                    <div style="color: #94a3b8; font-size: 0.7rem; font-weight: 500; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.5px;">CPU Cores</div>
                                                    <div style="color: #8b5cf6; font-size: 0.85rem; font-weight: 600;">${veeam.backupServerInfo.systemInventory.numberOfCpuCores}</div>
                                                </div>
                                            ` : ''}
                                            ${veeam.backupServerInfo.systemInventory.numberOfLogicalCores !== undefined && veeam.backupServerInfo.systemInventory.numberOfLogicalCores !== null ? `
                                                <div>
                                                    <div style="color: #94a3b8; font-size: 0.7rem; font-weight: 500; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.5px;">Logical Cores</div>
                                                    <div style="color: #8b5cf6; font-size: 0.85rem; font-weight: 600;">${veeam.backupServerInfo.systemInventory.numberOfLogicalCores}</div>
                                                </div>
                                            ` : ''}
                                            ${veeam.backupServerInfo.systemInventory.physicalMemoryGB !== undefined && veeam.backupServerInfo.systemInventory.physicalMemoryGB !== null ? `
                                                <div>
                                                    <div style="color: #94a3b8; font-size: 0.7rem; font-weight: 500; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.5px;">Physical Memory</div>
                                                    <div style="color: #10b981; font-size: 0.85rem; font-weight: 600;">${veeam.backupServerInfo.systemInventory.physicalMemoryGB} GB</div>
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                            ` : ''}

                            ${veeam.backupServerInfo && veeam.backupServerInfo.localDisks && Array.isArray(veeam.backupServerInfo.localDisks) && veeam.backupServerInfo.localDisks.length > 0 ? `
                                <div style="margin-top: 1.5rem; width: 100%; max-width: 100%;">
                                    <h2 style="color: #e2e8f0; font-size: 1rem; margin-bottom: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                                        <i class="fas fa-server" style="color: #8b5cf6;"></i>Local Disks
                                    </h2>
                                    <div class="audit-table-wrapper" style="width: 100%; max-width: 100%; margin: 0; padding: 0; overflow-x: auto;">
                                        <table class="audit-table" style="width: 100%; min-width: 100%; table-layout: auto; font-size: 0.8rem;">
                                            <thead>
                                                <tr>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Disk Number</th>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Model</th>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Serial Number</th>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Partition Style</th>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Disk Size</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${veeam.backupServerInfo.localDisks
                                                    .slice()
                                                    .sort((a, b) => {
                                                        const numA = a.diskNumber !== undefined && a.diskNumber !== null ? Number(a.diskNumber) : -1;
                                                        const numB = b.diskNumber !== undefined && b.diskNumber !== null ? Number(b.diskNumber) : -1;
                                                        return numA - numB;
                                                    })
                                                    .map(disk => `
                                                    <tr>
                                                        <td style="padding: 0.4rem;">${disk.diskNumber !== undefined && disk.diskNumber !== null ? disk.diskNumber : 'N/A'}</td>
                                                        <td style="padding: 0.4rem;">${disk.model || 'N/A'}</td>
                                                        <td style="padding: 0.4rem;">${disk.serialNumber || 'N/A'}</td>
                                                        <td style="padding: 0.4rem;">${disk.partitionStyle || 'N/A'}</td>
                                                        <td style="padding: 0.4rem;">${disk.diskSize !== undefined && disk.diskSize !== null ? disk.diskSize + ' GB' : 'N/A'}</td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ` : ''}

                            ${veeam.backupServerInfo && veeam.backupServerInfo.hostVolumes && Array.isArray(veeam.backupServerInfo.hostVolumes) && veeam.backupServerInfo.hostVolumes.length > 0 ? `
                                <div style="margin-top: 1.5rem; width: 100%; max-width: 100%;">
                                    <h2 style="color: #e2e8f0; font-size: 1rem; margin-bottom: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                                        <i class="fas fa-folder" style="color: #8b5cf6;"></i>Host Volumes
                                    </h2>
                                    <div class="audit-table-wrapper" style="width: 100%; max-width: 100%; margin: 0; padding: 0; overflow-x: auto;">
                                        <table class="audit-table" style="width: 100%; min-width: 100%; table-layout: auto; font-size: 0.8rem;">
                                            <thead>
                                                <tr>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Drive Letter</th>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">File System Label</th>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">File System</th>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Usage</th>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Size / Free Space</th>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Health Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${veeam.backupServerInfo.hostVolumes.map(volume => {
                                                    const size = volume.size || 0;
                                                    const freeSpace = volume.freeSpace || 0;
                                                    const usedSpace = size - freeSpace;
                                                    const usedPercent = size > 0 ? Math.round((usedSpace / size) * 100) : 0;
                                                    
                                                    // Convert numeric health status to text
                                                    let healthStatusText = 'N/A';
                                                    let healthColor = '#ef4444';
                                                    let bgColor = 'rgba(239, 68, 68, 0.1)';
                                                    let borderColor = '#ef444440';
                                                    
                                                    if (volume.healthStatus !== undefined && volume.healthStatus !== null) {
                                                        const healthStatus = String(volume.healthStatus);
                                                        if (healthStatus === '0' || healthStatus.toLowerCase() === 'healthy') {
                                                            healthStatusText = 'Healthy';
                                                            healthColor = '#10b981';
                                                            bgColor = 'rgba(16, 185, 129, 0.1)';
                                                            borderColor = '#10b98140';
                                                        } else if (healthStatus === '1' || healthStatus.toLowerCase() === 'warning') {
                                                            healthStatusText = 'Warning';
                                                            healthColor = '#f59e0b';
                                                            bgColor = 'rgba(245, 158, 11, 0.1)';
                                                            borderColor = '#f59e0b40';
                                                        } else if (healthStatus === '2' || healthStatus.toLowerCase() === 'unhealthy') {
                                                            healthStatusText = 'Unhealthy';
                                                            healthColor = '#ef4444';
                                                            bgColor = 'rgba(239, 68, 68, 0.1)';
                                                            borderColor = '#ef444440';
                                                        } else {
                                                            healthStatusText = healthStatus;
                                                        }
                                                    }
                                                    
                                                    return `
                                                    <tr>
                                                        <td style="padding: 0.4rem;">
                                                            <span style="font-weight: 600;">${volume.driveLetter || 'N/A'}</span>
                                                        </td>
                                                        <td style="padding: 0.4rem;">${volume.fileSystemLabel || 'N/A'}</td>
                                                        <td style="padding: 0.4rem;">${volume.fileSystem || 'N/A'}</td>
                                                        <td style="padding: 0.4rem;">
                                                            <div style="display: flex; flex-direction: column; gap: 0.25rem; min-width: 120px;">
                                                                <div style="display: flex; justify-content: space-between; font-size: 0.7rem;">
                                                                    <span style="color: #94a3b8;">Used</span>
                                                                    <span style="color: #e2e8f0; font-weight: 500;">${usedPercent}%</span>
                                                                </div>
                                                                <div style="width: 100%; height: 6px; background: rgba(100, 116, 139, 0.2); border-radius: 3px; overflow: hidden;">
                                                                    <div style="width: ${usedPercent}%; height: 100%; background: linear-gradient(90deg, #3b82f6, #2563eb); transition: width 0.3s;"></div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style="padding: 0.4rem;">
                                                            <div style="display: flex; flex-direction: column; gap: 0.15rem; font-size: 0.75rem;">
                                                                <div>
                                                                    <span style="color: #94a3b8;">Total: </span>
                                                                    <span style="color: #e2e8f0; font-weight: 500;">${size.toFixed(1)} GB</span>
                                                                </div>
                                                                <div>
                                                                    <span style="color: #94a3b8;">Free: </span>
                                                                    <span style="color: #10b981; font-weight: 500;">${freeSpace.toFixed(1)} GB</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style="padding: 0.4rem;">
                                                            <span style="display: inline-block; padding: 0.15rem 0.35rem; border-radius: 0.25rem; font-size: 0.65rem; font-weight: 500; color: ${healthColor}; background-color: ${bgColor}; border: 1px solid ${borderColor};">
                                                                ${healthStatusText}
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

                            ${veeam.backupServerInfo && veeam.backupServerInfo.networkAdapters && Array.isArray(veeam.backupServerInfo.networkAdapters) && veeam.backupServerInfo.networkAdapters.length > 0 ? `
                                <div style="margin-top: 1.5rem; width: 100%; max-width: 100%;">
                                    <h2 style="color: #e2e8f0; font-size: 1rem; margin-bottom: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                                        <i class="fas fa-network-wired" style="color: #8b5cf6;"></i>Network Adapters
                                    </h2>
                                    <div class="audit-table-wrapper" style="width: 100%; max-width: 100%; margin: 0; padding: 0; overflow-x: auto;">
                                        <table class="audit-table" style="width: 100%; min-width: 100%; table-layout: auto; font-size: 0.8rem;">
                                            <thead>
                                                <tr>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Adapter Name</th>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Adapter Description</th>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Mac Address</th>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Link Speed</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${veeam.backupServerInfo.networkAdapters.map(adapter => `
                                                    <tr>
                                                        <td style="padding: 0.4rem;">${adapter.adapterName || 'N/A'}</td>
                                                        <td style="padding: 0.4rem;">${adapter.adapterDescription || 'N/A'}</td>
                                                        <td style="padding: 0.4rem;">${adapter.macAddress || 'N/A'}</td>
                                                        <td style="padding: 0.4rem;">${adapter.linkSpeed || 'N/A'}</td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ` : ''}

                            ${veeam.backupServerInfo && veeam.backupServerInfo.ipAddresses && Array.isArray(veeam.backupServerInfo.ipAddresses) && veeam.backupServerInfo.ipAddresses.length > 0 ? `
                                <div style="margin-top: 1.5rem; width: 100%; max-width: 100%;">
                                    <h2 style="color: #e2e8f0; font-size: 1rem; margin-bottom: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                                        <i class="fas fa-globe" style="color: #8b5cf6;"></i>IP Address
                                    </h2>
                                    <div class="audit-table-wrapper" style="width: 100%; max-width: 100%; margin: 0; padding: 0; overflow-x: auto;">
                                        <table class="audit-table" style="width: 100%; min-width: 100%; table-layout: auto; font-size: 0.8rem;">
                                            <thead>
                                                <tr>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Interface Name</th>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Interface Description</th>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">IPv4 Addresses</th>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Subnet Mask</th>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">IPv4 Gateway</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${veeam.backupServerInfo.ipAddresses.map(ip => `
                                                    <tr>
                                                        <td style="padding: 0.4rem;">${ip.interfaceName || 'N/A'}</td>
                                                        <td style="padding: 0.4rem;">${ip.interfaceDescription || 'N/A'}</td>
                                                        <td style="padding: 0.4rem;">${ip.ipv4Address || 'N/A'}</td>
                                                        <td style="padding: 0.4rem;">${ip.subnetMask || 'N/A'}</td>
                                                        <td style="padding: 0.4rem;">${ip.ipv4Gateway || 'N/A'}</td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ` : ''}

                            ${veeam.infrastructureStats ? `
                                <div style="margin-top: 1.5rem; width: 100%; max-width: 100%;">
                                    <h2 style="color: #e2e8f0; font-size: 1rem; margin-bottom: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                                        <i class="fas fa-chart-bar" style="color: #8b5cf6;"></i>Infrastructure Statistics
                                    </h2>
                                    <div class="audit-table-wrapper" style="width: 100%; max-width: 100%; margin: 0; padding: 0; overflow-x: auto;">
                                        <table class="audit-table" style="width: 100%; min-width: 100%; table-layout: auto; font-size: 0.75rem;">
                                            <tbody>
                                                <tr>
                                                    <td style="padding: 0.3rem 0.4rem; color: #94a3b8; width: 50%;"><i class="fas fa-network-wired" style="color: #8b5cf6; margin-right: 0.3rem; font-size: 0.7rem;"></i>Backup Proxies</td>
                                                    <td style="padding: 0.3rem 0.4rem; color: #e2e8f0; font-weight: 600; text-align: right;">${veeam.infrastructureStats.backupProxies || veeam.infrastructureStats.BackupProxies || 0}</td>
                                                    <td style="padding: 0.3rem 0.4rem; color: #94a3b8; width: 50%;"><i class="fas fa-server" style="color: #8b5cf6; margin-right: 0.3rem; font-size: 0.7rem;"></i>Managed Servers</td>
                                                    <td style="padding: 0.3rem 0.4rem; color: #e2e8f0; font-weight: 600; text-align: right;">${veeam.infrastructureStats.managedServers || veeam.infrastructureStats.ManagedServers || 0}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 0.3rem 0.4rem; color: #94a3b8;"><i class="fas fa-hdd" style="color: #8b5cf6; margin-right: 0.3rem; font-size: 0.7rem;"></i>Backup Repositories</td>
                                                    <td style="padding: 0.3rem 0.4rem; color: #e2e8f0; font-weight: 600; text-align: right;">${veeam.infrastructureStats.backupRepositories || veeam.infrastructureStats.BackupRepositories || 0}</td>
                                                    <td style="padding: 0.3rem 0.4rem; color: #94a3b8;"><i class="fas fa-layer-group" style="color: #8b5cf6; margin-right: 0.3rem; font-size: 0.7rem;"></i>SOBR Repositories</td>
                                                    <td style="padding: 0.3rem 0.4rem; color: #e2e8f0; font-weight: 600; text-align: right;">${veeam.infrastructureStats.sobrRepositories || veeam.infrastructureStats.SOBRRepositories || 0}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 0.3rem 0.4rem; color: #94a3b8;"><i class="fas fa-cloud" style="color: #8b5cf6; margin-right: 0.3rem; font-size: 0.7rem;"></i>Object Repository</td>
                                                    <td style="padding: 0.3rem 0.4rem; color: #e2e8f0; font-weight: 600; text-align: right;">${veeam.infrastructureStats.objectRepository || veeam.infrastructureStats.ObjectRepository || 0}</td>
                                                    <td style="padding: 0.3rem 0.4rem; color: #94a3b8;"><i class="fas fa-tachometer-alt" style="color: #8b5cf6; margin-right: 0.3rem; font-size: 0.7rem;"></i>WAN Accelerator</td>
                                                    <td style="padding: 0.3rem 0.4rem; color: #e2e8f0; font-weight: 600; text-align: right;">${veeam.infrastructureStats.wanAccelerator || veeam.infrastructureStats.WANAccelerator || 0}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 0.3rem 0.4rem; color: #94a3b8;"><i class="fas fa-cloud-upload-alt" style="color: #8b5cf6; margin-right: 0.3rem; font-size: 0.7rem;"></i>Cloud Service Providers</td>
                                                    <td style="padding: 0.3rem 0.4rem; color: #e2e8f0; font-weight: 600; text-align: right;">${veeam.infrastructureStats.cloudServiceProviders || veeam.infrastructureStats.CloudServiceProviders || 0}</td>
                                                    <td style="padding: 0.3rem 0.4rem; color: #94a3b8;"><i class="fas fa-cubes" style="color: #8b5cf6; margin-right: 0.3rem; font-size: 0.7rem;"></i>SureBackup App Group</td>
                                                    <td style="padding: 0.3rem 0.4rem; color: #e2e8f0; font-weight: 600; text-align: right;">${veeam.infrastructureStats.sureBackupApplicationGroup || veeam.infrastructureStats.SureBackupApplicationGroup || 0}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 0.3rem 0.4rem; color: #94a3b8;"><i class="fas fa-flask" style="color: #8b5cf6; margin-right: 0.3rem; font-size: 0.7rem;"></i>SureBackup Virtual Lab</td>
                                                    <td style="padding: 0.3rem 0.4rem; color: #e2e8f0; font-weight: 600; text-align: right;">${veeam.infrastructureStats.sureBackupVirtualLab || veeam.infrastructureStats.SureBackupVirtualLab || 0}</td>
                                                    <td style="padding: 0.3rem 0.4rem; color: #94a3b8;"><i class="fas fa-map-marker-alt" style="color: #8b5cf6; margin-right: 0.3rem; font-size: 0.7rem;"></i>Locations</td>
                                                    <td style="padding: 0.3rem 0.4rem; color: #e2e8f0; font-weight: 600; text-align: right;">${veeam.infrastructureStats.locations || veeam.infrastructureStats.Locations || 0}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 0.3rem 0.4rem; color: #94a3b8;"><i class="fas fa-id-card" style="color: #8b5cf6; margin-right: 0.3rem; font-size: 0.7rem;"></i>Instance Licenses</td>
                                                    <td style="padding: 0.3rem 0.4rem; color: #e2e8f0; font-weight: 600; text-align: right;">${(veeam.infrastructureStats.instanceLicensesTotal || veeam.infrastructureStats.InstanceLicensesTotal || 0)}/${(veeam.infrastructureStats.instanceLicensesUsed || veeam.infrastructureStats.InstanceLicensesUsed || 0)}</td>
                                                    <td style="padding: 0.3rem 0.4rem; color: #94a3b8;"><i class="fas fa-microchip" style="color: #8b5cf6; margin-right: 0.3rem; font-size: 0.7rem;"></i>Socket Licenses</td>
                                                    <td style="padding: 0.3rem 0.4rem; color: #e2e8f0; font-weight: 600; text-align: right;">${(veeam.infrastructureStats.socketLicensesTotal || veeam.infrastructureStats.SocketLicensesTotal || 0)}/${(veeam.infrastructureStats.socketLicensesUsed || veeam.infrastructureStats.SocketLicensesUsed || 0)}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 0.3rem 0.4rem; color: #94a3b8;"><i class="fas fa-database" style="color: #8b5cf6; margin-right: 0.3rem; font-size: 0.7rem;"></i>Capacity Licenses</td>
                                                    <td style="padding: 0.3rem 0.4rem; color: #e2e8f0; font-weight: 600; text-align: right;" colspan="3">${(veeam.infrastructureStats.capacityLicensesTotal || veeam.infrastructureStats.CapacityLicensesTotal || 0)}TB/${(veeam.infrastructureStats.capacityLicensesUsed || veeam.infrastructureStats.CapacityLicensesUsed || 0)}TB</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ` : ''}

                            ${veeam.backupServerInfo ? `
                                <div style="margin-top: 1.5rem; width: 100%; max-width: 100%;">
                                    <h2 style="color: #e2e8f0; font-size: 1rem; margin-bottom: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                                        <i class="fas fa-server" style="color: #8b5cf6;"></i>Backup Server Info
                                    </h2>
                                    <div style="background: #1e293b; border-radius: 0.5rem; padding: 0.75rem; border: 1px solid #334155;">
                                        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                                            ${veeam.backupServerInfo.name ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.75rem; font-weight: 500;">Server Name</span>
                                                    <span style="color: #e2e8f0; font-size: 0.8rem; font-weight: 500;">${veeam.backupServerInfo.name}</span>
                                                </div>
                                            ` : ''}
                                            ${veeam.backupServerInfo.isDomainJoined !== undefined && veeam.backupServerInfo.isDomainJoined !== null ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.75rem; font-weight: 500;">Domain Joined</span>
                                                    <span style="color: ${(veeam.backupServerInfo.isDomainJoined === true || veeam.backupServerInfo.isDomainJoined === 'true') ? '#10b981' : '#64748b'}; font-size: 0.8rem;">
                                                        ${(veeam.backupServerInfo.isDomainJoined === true || veeam.backupServerInfo.isDomainJoined === 'true') ? 'Yes' : 'No'}
                                                    </span>
                                                </div>
                                            ` : ''}
                                            ${veeam.backupServerInfo.version ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.75rem; font-weight: 500;">Version</span>
                                                    <span style="color: #e2e8f0; font-size: 0.8rem;">${veeam.backupServerInfo.version}</span>
                                                </div>
                                            ` : ''}
                                            ${veeam.backupServerInfo.databaseType ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.75rem; font-weight: 500;">Database Type</span>
                                                    <span style="color: #e2e8f0; font-size: 0.8rem;">${veeam.backupServerInfo.databaseType}</span>
                                                </div>
                                            ` : ''}
                                            ${veeam.backupServerInfo.databaseName ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.75rem; font-weight: 500;">Database Name</span>
                                                    <span style="color: #e2e8f0; font-size: 0.8rem;">${veeam.backupServerInfo.databaseName}</span>
                                                </div>
                                            ` : ''}
                                            ${veeam.backupServerInfo.databaseServer ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.75rem; font-weight: 500;">Database Server</span>
                                                    <span style="color: #e2e8f0; font-size: 0.8rem;">${veeam.backupServerInfo.databaseServer}</span>
                                                </div>
                                            ` : ''}
                                            ${veeam.backupServerInfo.databasePort ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.75rem; font-weight: 500;">Database Port</span>
                                                    <span style="color: #e2e8f0; font-size: 0.8rem;">${veeam.backupServerInfo.databasePort}</span>
                                                </div>
                                            ` : ''}
                                            ${veeam.backupServerInfo.backupServerPort ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.75rem; font-weight: 500;">Backup Server Port</span>
                                                    <span style="color: #e2e8f0; font-size: 0.8rem;">${veeam.backupServerInfo.backupServerPort}</span>
                                                </div>
                                            ` : ''}
                                            ${veeam.backupServerInfo.secureConnectionsPort ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.75rem; font-weight: 500;">Secure Connections Port</span>
                                                    <span style="color: #e2e8f0; font-size: 0.8rem;">${veeam.backupServerInfo.secureConnectionsPort}</span>
                                                </div>
                                            ` : ''}
                                            ${veeam.backupServerInfo.cloudServerPort ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.75rem; font-weight: 500;">Cloud Server Port</span>
                                                    <span style="color: #e2e8f0; font-size: 0.8rem;">${veeam.backupServerInfo.cloudServerPort}</span>
                                                </div>
                                            ` : ''}
                                            ${veeam.backupServerInfo.cloudServicePort ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.75rem; font-weight: 500;">Cloud Service Port</span>
                                                    <span style="color: #e2e8f0; font-size: 0.8rem;">${veeam.backupServerInfo.cloudServicePort}</span>
                                                </div>
                                            ` : ''}
                                            ${veeam.backupServerInfo.installPath ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.75rem; font-weight: 500;">Install Path</span>
                                                    <span style="color: #e2e8f0; font-size: 0.8rem; text-align: right; word-break: break-all; max-width: 60%;">${veeam.backupServerInfo.installPath}</span>
                                                </div>
                                            ` : ''}
                                            ${veeam.backupServerInfo.auditLogsPath ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.75rem; font-weight: 500;">Audit Logs Path</span>
                                                    <span style="color: #e2e8f0; font-size: 0.8rem; text-align: right; word-break: break-all; max-width: 60%;">${veeam.backupServerInfo.auditLogsPath}</span>
                                                </div>
                                            ` : ''}
                                            ${veeam.backupServerInfo.compressOldAuditLogs !== undefined && veeam.backupServerInfo.compressOldAuditLogs !== null ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.75rem; font-weight: 500;">Compress Old Audit Logs</span>
                                                    <span style="color: ${(veeam.backupServerInfo.compressOldAuditLogs === true || veeam.backupServerInfo.compressOldAuditLogs === 'true') ? '#10b981' : '#64748b'}; font-size: 0.8rem;">
                                                        ${(veeam.backupServerInfo.compressOldAuditLogs === true || veeam.backupServerInfo.compressOldAuditLogs === 'true') ? 'Yes' : 'No'}
                                                    </span>
                                                </div>
                                            ` : ''}
                                            ${veeam.backupServerInfo.fipsCompliantMode ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.75rem; font-weight: 500;">FIPS Compliant Mode</span>
                                                    <span style="color: #e2e8f0; font-size: 0.8rem;">${veeam.backupServerInfo.fipsCompliantMode}</span>
                                                </div>
                                            ` : ''}
                                            ${veeam.backupServerInfo.linuxHostAuth ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.75rem; font-weight: 500;">Linux Host Authentication</span>
                                                    <span style="color: #e2e8f0; font-size: 0.8rem;">${veeam.backupServerInfo.linuxHostAuth}</span>
                                                </div>
                                            ` : ''}
                                            ${veeam.backupServerInfo.loggingLevel ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0;">
                                                    <span style="color: #94a3b8; font-size: 0.75rem; font-weight: 500;">Logging Level</span>
                                                    <span style="color: #e2e8f0; font-size: 0.8rem;">${veeam.backupServerInfo.loggingLevel}</span>
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                            ` : ''}

                            ${veeam.license ? `
                                <div style="margin-top: 1.5rem; width: 100%; max-width: 100%;">
                                    <h3 style="color: #e2e8f0; font-size: 1rem; margin-bottom: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                                        <i class="fas fa-info-circle" style="color: #f59e0b;"></i>Installed License Information
                                    </h3>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                                        <div class="audit-table-wrapper" style="width: 100%; max-width: 100%; margin: 0; padding: 0; overflow-x: auto;">
                                            <table class="audit-table" style="width: 100%; min-width: 100%; table-layout: auto; font-size: 0.8rem;">
                                                <tbody>
                                                <tr>
                                                    <td style="padding: 0.4rem; font-weight: 600; color: #94a3b8; width: 200px;">Licensed To</td>
                                                    <td style="padding: 0.4rem;">${veeam.license.licensedTo || 'N/A'}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 0.4rem; font-weight: 600; color: #94a3b8;">Edition</td>
                                                    <td style="padding: 0.4rem;">${veeam.license.edition || 'N/A'}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 0.4rem; font-weight: 600; color: #94a3b8;">Type</td>
                                                    <td style="padding: 0.4rem;">${veeam.license.type || 'N/A'}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 0.4rem; font-weight: 600; color: #94a3b8;">Status</td>
                                                    <td style="padding: 0.4rem;">
                                                        <span style="display: inline-block; padding: 0.15rem 0.35rem; border-radius: 0.25rem; font-size: 0.65rem; font-weight: 500; color: ${veeam.license.status && veeam.license.status.toLowerCase() === 'valid' ? '#10b981' : '#f59e0b'}; background-color: ${veeam.license.status && veeam.license.status.toLowerCase() === 'valid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)'}; border: 1px solid ${veeam.license.status && veeam.license.status.toLowerCase() === 'valid' ? '#10b98140' : '#f59e0b40'};">
                                                            ${veeam.license.status || 'N/A'}
                                                        </span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 0.4rem; font-weight: 600; color: #94a3b8;">Expiration Date</td>
                                                    <td style="padding: 0.4rem;">${veeam.license.expirationDate && veeam.license.expirationDate !== 'N/A' ? veeam.license.expirationDate : 'N/A'}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 0.4rem; font-weight: 600; color: #94a3b8;">Support Id</td>
                                                    <td style="padding: 0.4rem;">${veeam.license.supportId && veeam.license.supportId !== 'N/A' ? veeam.license.supportId : 'N/A'}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 0.4rem; font-weight: 600; color: #94a3b8;">Support Expiration Date</td>
                                                    <td style="padding: 0.4rem;">${veeam.license.supportExpirationDate && veeam.license.supportExpirationDate !== 'N/A' ? veeam.license.supportExpirationDate : '--'}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 0.4rem; font-weight: 600; color: #94a3b8;">Auto Update Enabled</td>
                                                    <td style="padding: 0.4rem;">${(veeam.license.autoUpdateEnabled === true || veeam.license.autoUpdateEnabled === 'true' || veeam.license.autoUpdateEnabled === 'True') ? '<span style="color: #10b981;"><i class="fas fa-check-circle" style="color: #10b981;"></i> Yes</span>' : (veeam.license.autoUpdateEnabled === false || veeam.license.autoUpdateEnabled === 'false' || veeam.license.autoUpdateEnabled === 'False') ? '<span style="color: #64748b;"><i class="fas fa-times-circle" style="color: #64748b;"></i> No</span>' : 'N/A'}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 0.4rem; font-weight: 600; color: #94a3b8;">Free Agent Instance</td>
                                                    <td style="padding: 0.4rem;">${(veeam.license.freeAgentInstance === true || veeam.license.freeAgentInstance === 'true' || veeam.license.freeAgentInstance === 'True') ? '<span style="color: #10b981;"><i class="fas fa-check-circle" style="color: #10b981;"></i> Yes</span>' : (veeam.license.freeAgentInstance === false || veeam.license.freeAgentInstance === 'false' || veeam.license.freeAgentInstance === 'False') ? '<span style="color: #64748b;"><i class="fas fa-times-circle" style="color: #64748b;"></i> No</span>' : 'N/A'}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 0.4rem; font-weight: 600; color: #94a3b8;">Cloud Connect</td>
                                                    <td style="padding: 0.4rem;"><span class="status-badge status-${veeam.license.cloudConnectEnabled && veeam.license.cloudConnectEnabled !== 'Disabled' ? 'success' : 'warning'}">${veeam.license.cloudConnectEnabled || 'Disabled'}</span></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <div style="background: linear-gradient(145deg, #1e293b, #0f172a); border-radius: 0.75rem; padding: 1rem; border: 1px solid rgba(148, 163, 184, 0.1); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                                        <h3 style="color: #f8fafc; font-size: 0.95rem; margin-bottom: 0.75rem; font-weight: 600; border-bottom: 1px solid rgba(148, 163, 184, 0.1); padding-bottom: 0.5rem;">Instance License Usage</h3>
                                        <div style="position: relative; width: 100%; height: 300px;">
                                            <canvas id="instancesChart" style="width: 100%; height: 100%; display: block;"></canvas>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}

                            ${veeam.configBackup ? `
                                <div style="margin-top: 1rem; width: 100%; max-width: 100%;">
                                    <h2 style="color: #e2e8f0; font-size: 0.9rem; margin-bottom: 0.5rem; font-weight: 600; display: flex; align-items: center; gap: 0.4rem;">
                                        <i class="fas fa-database" style="color: #8b5cf6; font-size: 0.85rem;"></i>Configuration Backup
                                    </h2>
                                    <div style="background: #1e293b; border-radius: 0.4rem; padding: 0.5rem; border: 1px solid #334155;">
                                        <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                                            ${veeam.configBackup.name ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.7rem; font-weight: 500;">Name</span>
                                                    <span style="color: #e2e8f0; font-size: 0.75rem; font-weight: 500;">${veeam.configBackup.name}</span>
                                                </div>
                                            ` : ''}
                                            ${veeam.configBackup.enabled !== undefined && veeam.configBackup.enabled !== null ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.7rem; font-weight: 500;">Enabled</span>
                                                    <span style="color: ${(veeam.configBackup.enabled === true || veeam.configBackup.enabled === 'true' || veeam.configBackup.enabled === 'True') ? '#10b981' : '#64748b'}; font-size: 0.75rem;">
                                                        ${(veeam.configBackup.enabled === true || veeam.configBackup.enabled === 'true' || veeam.configBackup.enabled === 'True') ? 'Yes' : 'No'}
                                                    </span>
                                                </div>
                                            ` : ''}
                                            ${veeam.configBackup.scheduleType ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.7rem; font-weight: 500;">Schedule Type</span>
                                                    <span style="color: #e2e8f0; font-size: 0.75rem;">${veeam.configBackup.scheduleType}</span>
                                                </div>
                                            ` : ''}
                                            ${veeam.configBackup.restorePointsToKeep ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.7rem; font-weight: 500;">Restore Points To Keep</span>
                                                    <span style="color: #e2e8f0; font-size: 0.75rem;">${veeam.configBackup.restorePointsToKeep}</span>
                                                </div>
                                            ` : ''}
                                            ${veeam.configBackup.encrypted !== undefined && veeam.configBackup.encrypted !== null ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.7rem; font-weight: 500;">Encryption Enabled</span>
                                                    <span style="color: ${(veeam.configBackup.encrypted === true || veeam.configBackup.encrypted === 'true' || veeam.configBackup.encrypted === 'True' || String(veeam.configBackup.encrypted).toLowerCase() === 'true') ? '#10b981' : '#64748b'}; font-size: 0.75rem;">
                                                        ${(veeam.configBackup.encrypted === true || veeam.configBackup.encrypted === 'true' || veeam.configBackup.encrypted === 'True' || String(veeam.configBackup.encrypted).toLowerCase() === 'true') ? 'Yes' : 'No'}
                                                    </span>
                                                </div>
                                            ` : ''}
                                            ${veeam.configBackup.nextRun ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.7rem; font-weight: 500;">Next Run</span>
                                                    <span style="color: #e2e8f0; font-size: 0.75rem;">${veeam.configBackup.nextRun}</span>
                                                </div>
                                            ` : ''}
                                            ${veeam.configBackup.target ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.7rem; font-weight: 500;">Target</span>
                                                    <span style="color: #e2e8f0; font-size: 0.75rem;">${veeam.configBackup.target}</span>
                                                </div>
                                            ` : ''}
                                            ${veeam.configBackup.lastResult ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0;">
                                                    <span style="color: #94a3b8; font-size: 0.7rem; font-weight: 500;">Last Result</span>
                                                    <span style="color: #e2e8f0; font-size: 0.75rem;">${veeam.configBackup.lastResult}</span>
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                            ` : ''}

                            ${veeam.tlsCertificate ? `
                                <div style="margin-top: 1rem; width: 100%; max-width: 100%;">
                                    <h2 style="color: #e2e8f0; font-size: 0.9rem; margin-bottom: 0.5rem; font-weight: 600; display: flex; align-items: center; gap: 0.4rem;">
                                        <i class="fas fa-certificate" style="color: #8b5cf6; font-size: 0.85rem;"></i>Backup Server TLS Certificate
                                    </h2>
                                    <div style="background: #1e293b; border-radius: 0.4rem; padding: 0.5rem; border: 1px solid #334155;">
                                        <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                                            ${veeam.tlsCertificate.friendlyName ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.7rem; font-weight: 500;">Friendly Name</span>
                                                    <span style="color: #e2e8f0; font-size: 0.75rem; font-weight: 500;">${veeam.tlsCertificate.friendlyName}</span>
                                                </div>
                                            ` : ''}
                                            ${veeam.tlsCertificate.subjectName ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.7rem; font-weight: 500;">Subject Name</span>
                                                    <span style="color: #e2e8f0; font-size: 0.75rem;">${veeam.tlsCertificate.subjectName}</span>
                                                </div>
                                            ` : ''}
                                            ${veeam.tlsCertificate.issuerName ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.7rem; font-weight: 500;">Issuer Name</span>
                                                    <span style="color: #e2e8f0; font-size: 0.75rem;">${veeam.tlsCertificate.issuerName}</span>
                                                </div>
                                            ` : ''}
                                            ${veeam.tlsCertificate.expirationDate ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.7rem; font-weight: 500;">Expiration Date</span>
                                                    <span style="color: #e2e8f0; font-size: 0.75rem;">${veeam.tlsCertificate.expirationDate}</span>
                                                </div>
                                            ` : ''}
                                            ${veeam.tlsCertificate.issuedDate ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.7rem; font-weight: 500;">Issued Date</span>
                                                    <span style="color: #e2e8f0; font-size: 0.75rem;">${veeam.tlsCertificate.issuedDate}</span>
                                                </div>
                                            ` : ''}
                                            ${veeam.tlsCertificate.thumbprint ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.7rem; font-weight: 500;">Thumbprint</span>
                                                    <span style="color: #e2e8f0; font-size: 0.7rem; font-family: monospace; word-break: break-all; text-align: right; max-width: 60%;">${veeam.tlsCertificate.thumbprint}</span>
                                                </div>
                                            ` : ''}
                                            ${veeam.tlsCertificate.serialNumber ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0;">
                                                    <span style="color: #94a3b8; font-size: 0.7rem; font-weight: 500;">Serial Number</span>
                                                    <span style="color: #e2e8f0; font-size: 0.7rem; font-family: monospace; word-break: break-all; text-align: right; max-width: 60%;">${veeam.tlsCertificate.serialNumber}</span>
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                            ` : ''}

                            ${veeam.emailNotification ? `
                                <div style="margin-top: 1.5rem; width: 100%; max-width: 100%;">
                                    <h2 style="color: #e2e8f0; font-size: 1rem; margin-bottom: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                                        <i class="fas fa-envelope" style="color: #06b6d4;"></i>Email Notification
                                    </h2>
                                    <div style="background: #1e293b; border-radius: 0.5rem; padding: 0.75rem; border: 1px solid #334155;">
                                        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                                            ${veeam.emailNotification.emailRecipient ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.75rem; font-weight: 500;">Email Recipient</span>
                                                    <span style="color: #e2e8f0; font-size: 0.8rem; font-weight: 500;">${veeam.emailNotification.emailRecipient}</span>
                                                </div>
                                            ` : ''}
                                            ${veeam.emailNotification.emailSender ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.75rem; font-weight: 500;">Email Sender</span>
                                                    <span style="color: #e2e8f0; font-size: 0.8rem;">${veeam.emailNotification.emailSender}</span>
                                                </div>
                                            ` : ''}
                                            ${veeam.emailNotification.smtpServer ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.75rem; font-weight: 500;">SMTP Server</span>
                                                    <span style="color: #e2e8f0; font-size: 0.8rem;">
                                                        ${veeam.emailNotification.smtpServer}
                                                        ${veeam.emailNotification.smtpType && veeam.emailNotification.smtpType !== 'N/A' ? ` <span style="color: #06b6d4; font-size: 0.75rem;">(${veeam.emailNotification.smtpType})</span>` : ''}
                                                    </span>
                                                </div>
                                            ` : ''}
                                            ${veeam.emailNotification.emailSubject ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.75rem; font-weight: 500;">Email Subject</span>
                                                    <span style="color: #e2e8f0; font-size: 0.8rem;">${veeam.emailNotification.emailSubject}</span>
                                                </div>
                                            ` : ''}
                                            ${veeam.emailNotification.sslEnabled !== undefined && veeam.emailNotification.sslEnabled !== null ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.75rem; font-weight: 500;">SSL Enabled</span>
                                                    <span style="color: ${(veeam.emailNotification.sslEnabled === true || veeam.emailNotification.sslEnabled === 'true' || veeam.emailNotification.sslEnabled === 'True' || veeam.emailNotification.sslEnabled === 'Yes') ? '#10b981' : '#64748b'}; font-size: 0.8rem;">
                                                        ${(veeam.emailNotification.sslEnabled === true || veeam.emailNotification.sslEnabled === 'true' || veeam.emailNotification.sslEnabled === 'True' || veeam.emailNotification.sslEnabled === 'Yes') ? 'Yes' : 'No'}
                                                    </span>
                                                </div>
                                            ` : ''}
                                            ${veeam.emailNotification.authEnabled !== undefined && veeam.emailNotification.authEnabled !== null ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.75rem; font-weight: 500;">Auth Enabled</span>
                                                    <span style="color: ${(veeam.emailNotification.authEnabled === true || veeam.emailNotification.authEnabled === 'true' || veeam.emailNotification.authEnabled === 'True' || veeam.emailNotification.authEnabled === 'Yes') ? '#10b981' : '#64748b'}; font-size: 0.8rem;">
                                                        ${(veeam.emailNotification.authEnabled === true || veeam.emailNotification.authEnabled === 'true' || veeam.emailNotification.authEnabled === 'True' || veeam.emailNotification.authEnabled === 'Yes') ? 'Yes' : 'No'}
                                                    </span>
                                                </div>
                                            ` : ''}
                                            ${veeam.emailNotification.credentials ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.75rem; font-weight: 500;">Credentials</span>
                                                    <span style="color: #e2e8f0; font-size: 0.8rem;">${veeam.emailNotification.credentials}</span>
                                                </div>
                                            ` : ''}
                                            ${veeam.emailNotification.dailyReportsTime ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.75rem; font-weight: 500;">Daily Reports Time</span>
                                                    <span style="color: #e2e8f0; font-size: 0.8rem;">${veeam.emailNotification.dailyReportsTime}</span>
                                                </div>
                                            ` : ''}
                                            ${veeam.emailNotification.enabled !== undefined && veeam.emailNotification.enabled !== null ? `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                    <span style="color: #94a3b8; font-size: 0.75rem; font-weight: 500;">Enabled</span>
                                                    <span style="color: ${(veeam.emailNotification.enabled === true || veeam.emailNotification.enabled === 'true' || veeam.emailNotification.enabled === 'True' || veeam.emailNotification.enabled === 'Yes') ? '#10b981' : '#64748b'}; font-size: 0.8rem;">
                                                        ${(veeam.emailNotification.enabled === true || veeam.emailNotification.enabled === 'true' || veeam.emailNotification.enabled === 'True' || veeam.emailNotification.enabled === 'Yes') ? 'Yes' : 'No'}
                                                    </span>
                                                </div>
                                            ` : ''}
                                            
                                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0;">
                                                <span style="color: #94a3b8; font-size: 0.75rem; font-weight: 500;">Notify On</span>
                                                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: flex-end;">
                                                    <span style="font-size: 0.75rem; padding: 0.15rem 0.4rem; border-radius: 0.25rem; background: ${(veeam.emailNotification.notifyOnSuccess === true || veeam.emailNotification.notifyOnSuccess === 'true' || veeam.emailNotification.notifyOnSuccess === 'True') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(100, 116, 139, 0.1)'}; color: ${(veeam.emailNotification.notifyOnSuccess === true || veeam.emailNotification.notifyOnSuccess === 'true' || veeam.emailNotification.notifyOnSuccess === 'True') ? '#10b981' : '#64748b'}; border: 1px solid ${(veeam.emailNotification.notifyOnSuccess === true || veeam.emailNotification.notifyOnSuccess === 'true' || veeam.emailNotification.notifyOnSuccess === 'True') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)'};">Success</span>
                                                    <span style="font-size: 0.75rem; padding: 0.15rem 0.4rem; border-radius: 0.25rem; background: ${(veeam.emailNotification.notifyOnWarning === true || veeam.emailNotification.notifyOnWarning === 'true' || veeam.emailNotification.notifyOnWarning === 'True') ? 'rgba(245, 158, 11, 0.1)' : 'rgba(100, 116, 139, 0.1)'}; color: ${(veeam.emailNotification.notifyOnWarning === true || veeam.emailNotification.notifyOnWarning === 'true' || veeam.emailNotification.notifyOnWarning === 'True') ? '#f59e0b' : '#64748b'}; border: 1px solid ${(veeam.emailNotification.notifyOnWarning === true || veeam.emailNotification.notifyOnWarning === 'true' || veeam.emailNotification.notifyOnWarning === 'True') ? 'rgba(245, 158, 11, 0.2)' : 'rgba(100, 116, 139, 0.2)'};">Warning</span>
                                                    <span style="font-size: 0.75rem; padding: 0.15rem 0.4rem; border-radius: 0.25rem; background: ${(veeam.emailNotification.notifyOnFailure === true || veeam.emailNotification.notifyOnFailure === 'true' || veeam.emailNotification.notifyOnFailure === 'True') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(100, 116, 139, 0.1)'}; color: ${(veeam.emailNotification.notifyOnFailure === true || veeam.emailNotification.notifyOnFailure === 'true' || veeam.emailNotification.notifyOnFailure === 'True') ? '#ef4444' : '#64748b'}; border: 1px solid ${(veeam.emailNotification.notifyOnFailure === true || veeam.emailNotification.notifyOnFailure === 'true' || veeam.emailNotification.notifyOnFailure === 'True') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(100, 116, 139, 0.2)'};">Failure</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}

                            ${veeam.complianceSummary && veeam.complianceTable ? `
                                <div style="margin-top: 1.5rem; width: 100%; max-width: 100%;">
                                    <h2 style="color: #e2e8f0; font-size: 1rem; margin-bottom: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                                        <i class="fas fa-shield-alt" style="color: #10b981;"></i>Security & Compliance
                                    </h2>
                                    
                                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
                                        <div style="background: linear-gradient(145deg, #1e293b, #0f172a); border-radius: 0.75rem; padding: 1rem; border: 1px solid rgba(148, 163, 184, 0.1); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                                            <h3 style="color: #f8fafc; font-size: 0.95rem; margin-bottom: 0.75rem; font-weight: 600; border-bottom: 1px solid rgba(148, 163, 184, 0.1); padding-bottom: 0.5rem;">Best Practices</h3>
                                            <div style="position: relative; width: 100%; height: 200px;">
                                                <canvas id="complianceChart" style="width: 100%; height: 100%; display: block;"></canvas>
                                            </div>
                                        </div>
                                        <div style="background: linear-gradient(145deg, #1e293b, #0f172a); border-radius: 0.75rem; padding: 1rem; border: 1px solid rgba(148, 163, 184, 0.1); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                                            <h3 style="color: #f8fafc; font-size: 0.95rem; margin-bottom: 0.75rem; font-weight: 600; border-bottom: 1px solid rgba(148, 163, 184, 0.1); padding-bottom: 0.5rem;">Summary</h3>
                                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;">
                                                <div style="padding: 0.5rem; background: rgba(16, 185, 129, 0.1); border-radius: 0.375rem; border: 1px solid rgba(16, 185, 129, 0.3);">
                                                    <div style="color: #94a3b8; font-size: 0.7rem; margin-bottom: 0.25rem;">Passed</div>
                                                    <div style="color: #10b981; font-size: 1.1rem; font-weight: 600;">${veeam.complianceSummary.passed || 0}</div>
                                                </div>
                                                <div style="padding: 0.5rem; background: rgba(239, 68, 68, 0.1); border-radius: 0.375rem; border: 1px solid rgba(239, 68, 68, 0.3);">
                                                    <div style="color: #94a3b8; font-size: 0.7rem; margin-bottom: 0.25rem;">Not Implemented</div>
                                                    <div style="color: #ef4444; font-size: 1.1rem; font-weight: 600;">${veeam.complianceSummary.notImplemented || 0}</div>
                                                </div>
                                                <div style="padding: 0.5rem; background: rgba(59, 130, 246, 0.1); border-radius: 0.375rem; border: 1px solid rgba(59, 130, 246, 0.3);">
                                                    <div style="color: #94a3b8; font-size: 0.7rem; margin-bottom: 0.25rem;">Unable to Detect</div>
                                                    <div style="color: #3b82f6; font-size: 1.1rem; font-weight: 600;">${veeam.complianceSummary.unableToDetect || 0}</div>
                                                </div>
                                                <div style="padding: 0.5rem; background: rgba(245, 158, 11, 0.1); border-radius: 0.375rem; border: 1px solid rgba(245, 158, 11, 0.3);">
                                                    <div style="color: #94a3b8; font-size: 0.7rem; margin-bottom: 0.25rem;">Suppressed</div>
                                                    <div style="color: #f59e0b; font-size: 1.1rem; font-weight: 600;">${veeam.complianceSummary.suppressed || 0}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="audit-table-wrapper" style="width: 100%; max-width: 100%; margin: 0; padding: 0; overflow-x: auto;">
                                        <table class="audit-table" style="width: 100%; min-width: 100%; table-layout: auto; font-size: 0.8rem;">
                                            <thead>
                                                <tr>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Best Practice</th>
                                                    <th style="padding: 0.4rem; text-align: center; width: 140px; font-size: 0.8rem;">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${Array.isArray(veeam.complianceTable) && veeam.complianceTable.length > 0 ? veeam.complianceTable.map(item => {
                                                    let statusColor = '#94a3b8'; // Default gray
                                                    let bgColor = 'rgba(148, 163, 184, 0.1)';
                                                    if (item.status === 'Passed') {
                                                        statusColor = '#10b981'; // Green
                                                        bgColor = 'rgba(16, 185, 129, 0.1)';
                                                    } else if (item.status === 'Not Implemented') {
                                                        statusColor = '#ef4444'; // Red
                                                        bgColor = 'rgba(239, 68, 68, 0.1)';
                                                    } else if (item.status === 'Suppressed') {
                                                        statusColor = '#f59e0b'; // Orange
                                                        bgColor = 'rgba(245, 158, 11, 0.1)';
                                                    } else if (item.status === 'Unable to detect' || item.status === 'Unable to Detect') {
                                                        statusColor = '#3b82f6'; // Blue
                                                        bgColor = 'rgba(59, 130, 246, 0.1)';
                                                    }
                                                    return `
                                                    <tr>
                                                        <td style="padding: 0.4rem;">${item.bestPractice || 'N/A'}</td>
                                                        <td style="padding: 0.4rem; text-align: center;">
                                                            <span style="display: inline-block; padding: 0.15rem 0.35rem; border-radius: 0.25rem; font-size: 0.65rem; font-weight: 500; color: ${statusColor}; background-color: ${bgColor}; border: 1px solid ${statusColor}40;">${item.status || 'N/A'}</span>
                                                        </td>
                                                    </tr>
                                                `;
                                                }).join('') : '<tr><td colspan="2" style="padding: 0.4rem; text-align: center;">No compliance data available</td></tr>'}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ` : ''}

                            ${veeam.jobInfo ? `
                                <div style="margin-top: 1.5rem; width: 100%; max-width: 100%;">
                                    <h2 style="color: #e2e8f0; font-size: 1rem; margin-bottom: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                                        <i class="fas fa-tasks" style="color: #8b5cf6;"></i>Jobs Summary
                                    </h2>
                                    
                                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
                                        <div style="background: linear-gradient(145deg, #1e293b, #0f172a); border-radius: 0.75rem; padding: 1rem; border: 1px solid rgba(148, 163, 184, 0.1); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                                            <h3 style="color: #f8fafc; font-size: 0.95rem; margin-bottom: 0.75rem; font-weight: 600; border-bottom: 1px solid rgba(148, 163, 184, 0.1); padding-bottom: 0.5rem;">Jobs Latest Result</h3>
                                            <div style="position: relative; width: 100%; height: 200px;">
                                                <canvas id="jobsResultChart" style="width: 100%; height: 100%; display: block;"></canvas>
                                            </div>
                                        </div>
                                        <div style="background: linear-gradient(145deg, #1e293b, #0f172a); border-radius: 0.75rem; padding: 1rem; border: 1px solid rgba(148, 163, 184, 0.1); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                                            <h3 style="color: #f8fafc; font-size: 0.95rem; margin-bottom: 0.75rem; font-weight: 600; border-bottom: 1px solid rgba(148, 163, 184, 0.1); padding-bottom: 0.5rem;">Session Statistics</h3>
                                            <div style="position: relative; width: 100%; height: 200px;">
                                                <canvas id="sessionStatsChart" style="width: 100%; height: 100%; display: block;"></canvas>
                                            </div>
                                        </div>
                                        <div style="background: linear-gradient(145deg, #1e293b, #0f172a); border-radius: 0.75rem; padding: 1rem; border: 1px solid rgba(148, 163, 184, 0.1); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                                            <h3 style="color: #f8fafc; font-size: 0.95rem; margin-bottom: 0.75rem; font-weight: 600; border-bottom: 1px solid rgba(148, 163, 184, 0.1); padding-bottom: 0.5rem;">Backup & Data Sizes</h3>
                                            <div style="position: relative; width: 100%; height: 200px;">
                                                <canvas id="backupSizesChart" style="width: 100%; height: 100%; display: block;"></canvas>
                                            </div>
                                        </div>
                                    </div>
                                    
                            ${veeam.jobSessionSummary && Array.isArray(veeam.jobSessionSummary) && veeam.jobSessionSummary.length > 0 ? `
                                <div style="margin-top: 1.5rem; width: 100%; max-width: 100%;">
                                    <h2 style="color: #e2e8f0; font-size: 1rem; margin-bottom: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                                        <i class="fas fa-chart-line" style="color: #8b5cf6;"></i>Job Session Summary (14 Days)
                                    </h2>
                                    <div class="audit-table-wrapper" style="width: 100%; max-width: 100%; margin: 0; padding: 0; overflow-x: auto;">
                                        <table class="audit-table" style="width: 100%; min-width: 100%; table-layout: auto; font-size: 0.75rem;">
                                            <thead>
                                                <tr>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.75rem;">Job Name</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.75rem;">Items</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.75rem;">Min Time (min)</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.75rem;">Max Time (min)</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.75rem;">Avg Time (min)</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.75rem;">Total Sessions</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.75rem;">Fails</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.75rem;">Retries</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.75rem;">Success Rate %</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.75rem;">Avg Backup Size (TB)</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.75rem;">Max Backup Size (TB)</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.75rem;">Avg Data Size (TB)</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.75rem;">Max Data Size (TB)</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.75rem;">Avg Change Rate %</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.75rem;">Wait for Res. Count</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.75rem;">Max Wait (dd.hh:mm:ss)</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.75rem;">Avg Wait (dd.hh:mm:ss)</th>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.75rem;">Job Type</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${(() => {
                                                    // Helper function to convert HH:MM:SS to seconds
                                                    const timeToSeconds = (timeStr) => {
                                                        if (!timeStr || timeStr === '0' || timeStr === 'N/A' || timeStr === '00:00' || timeStr === '00:00:00') return 0;
                                                        if (typeof timeStr === 'string' && timeStr.match(/^\d{2}:\d{2}:\d{2}$/)) {
                                                            const parts = timeStr.split(':');
                                                            const hours = parseInt(parts[0]) || 0;
                                                            const mins = parseInt(parts[1]) || 0;
                                                            const secs = parseInt(parts[2]) || 0;
                                                            return hours * 3600 + mins * 60 + secs;
                                                        }
                                                        // Fallback: try to parse as minutes
                                                        const num = parseFloat(timeStr);
                                                        return isNaN(num) ? 0 : Math.round(num * 60);
                                                    };
                                                    
                                                    // Helper function to convert seconds to HH:MM:SS
                                                    const secondsToTime = (seconds) => {
                                                        if (seconds <= 0) return '00:00:00';
                                                        const hours = Math.floor(seconds / 3600);
                                                        const mins = Math.floor((seconds % 3600) / 60);
                                                        const secs = seconds % 60;
                                                        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                                                    };
                                                    
                                                    // Calculate totals
                                                    const totals = {
                                                        items: 0,
                                                        minTimeSeconds: 0,  // Sum of all min times
                                                        maxTimeSeconds: 0,  // Sum of all max times
                                                        avgTimeSeconds: 0,  // Sum of all avg times
                                                        totalSessions: 0,
                                                        fails: 0,
                                                        retries: 0,
                                                        avgBackupSize: 0,
                                                        maxBackupSize: 0,
                                                        avgDataSize: 0,
                                                        maxDataSize: 0,
                                                        avgChangeRate: 0,
                                                        waitCount: 0
                                                    };
                                                    
                                                    // Collect all individual values for proper calculations
                                                    const allAvgChangeRates = [];
                                                    
                                                    veeam.jobSessionSummary.forEach(job => {
                                                        // Sum items (total count of all items across all jobs)
                                                        totals.items += job.Items || 0;
                                                        
                                                        // Sum sessions, fails, retries, waitCount (these are totals)
                                                        totals.totalSessions += job.TotalSessions || 0;
                                                        totals.fails += job.Fails || 0;
                                                        totals.retries += job.Retries || 0;
                                                        totals.waitCount += job.WaitCount || 0;
                                                        
                                                        // For Times: sum all values (not min/max/avg)
                                                        const minTimeSec = timeToSeconds(job.MinTime);
                                                        const maxTimeSec = timeToSeconds(job.MaxTime);
                                                        const avgTimeSec = timeToSeconds(job.AvgTime);
                                                        
                                                        totals.minTimeSeconds += minTimeSec;
                                                        totals.maxTimeSeconds += maxTimeSec;
                                                        totals.avgTimeSeconds += avgTimeSec;
                                                        
                                                        // For Backup/Data Sizes: sum all values (not max or avg)
                                                        totals.maxBackupSize += job.MaxBackupSize || 0;
                                                        totals.maxDataSize += job.MaxDataSize || 0;
                                                        totals.avgBackupSize += job.AvgBackupSize || 0;
                                                        totals.avgDataSize += job.AvgDataSize || 0;
                                                        
                                                        // Collect avg values for simple average calculation (sum all, then divide by count)
                                                        // Include all values, even if 0
                                                        allAvgChangeRates.push(job.AvgChangeRate || 0);
                                                    });
                                                    
                                                    // Note: Times and Backup/Data Sizes are already summed above
                                                    
                                                    // Calculate simple averages: sum all values, then divide by count
                                                    // Always calculate if we have any jobs
                                                    if (allAvgChangeRates.length > 0) {
                                                        const sumAvgChangeRate = allAvgChangeRates.reduce((sum, val) => sum + val, 0);
                                                        totals.avgChangeRate = sumAvgChangeRate / allAvgChangeRates.length;
                                                    }
                                                    
                                                    const totalSuccessRate = totals.totalSessions > 0 ? 
                                                        ((totals.totalSessions - totals.fails) / totals.totalSessions * 100).toFixed(2) : 0;
                                                    
                                                    // Format job rows (Total will be added at the end)
                                                    const jobRows = veeam.jobSessionSummary.map((job, index) => {
                                                        const successRate = job.SuccessRate || 0;
                                                        const successRateColor = successRate >= 95 ? '#10b981' : successRate >= 80 ? '#f59e0b' : '#ef4444';
                                                        const successRateBg = successRate >= 95 ? 'rgba(16, 185, 129, 0.1)' : successRate >= 80 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)';
                                                        
                                                        // Time values are already in HH:MM:SS format from backend
                                                        const formatTime = (time) => {
                                                            if (!time || time === '0' || time === 'N/A' || time === '00:00') return '00:00:00';
                                                            // If it's already in HH:MM:SS format, return as is
                                                            if (typeof time === 'string' && time.match(/^\d{2}:\d{2}:\d{2}$/)) {
                                                                return time;
                                                            }
                                                            // Fallback: try to parse as minutes and convert
                                                            const num = parseFloat(time);
                                                            if (isNaN(num)) return '00:00:00';
                                                            const totalSeconds = Math.round(num * 60);
                                                            const hours = Math.floor(totalSeconds / 3600);
                                                            const mins = Math.floor((totalSeconds % 3600) / 60);
                                                            const secs = totalSeconds % 60;
                                                            return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                                                        };
                                                        
                                                        return `
                                                            <tr style="cursor: pointer;" onclick="window.veeamAuditorPage.showJobSessionsModal(${index})" onmouseover="this.style.backgroundColor='rgba(59, 130, 246, 0.1)'" onmouseout="this.style.backgroundColor=''">
                                                                <td style="padding: 0.4rem;">${job.JobName || 'N/A'}</td>
                                                                <td style="padding: 0.4rem; text-align: center;">${job.Items || 0}</td>
                                                                <td style="padding: 0.4rem; text-align: center;">${formatTime(job.MinTime)}</td>
                                                                <td style="padding: 0.4rem; text-align: center;">${formatTime(job.MaxTime)}</td>
                                                                <td style="padding: 0.4rem; text-align: center;">${formatTime(job.AvgTime)}</td>
                                                                <td style="padding: 0.4rem; text-align: center;">${job.TotalSessions || 0}</td>
                                                                <td style="padding: 0.4rem; text-align: center;">${job.Fails || 0}</td>
                                                                <td style="padding: 0.4rem; text-align: center;">${job.Retries || 0}</td>
                                                                <td style="padding: 0.4rem; text-align: center;">
                                                                    <span style="display: inline-block; padding: 0.15rem 0.35rem; border-radius: 0.25rem; font-size: 0.65rem; font-weight: 500; color: ${successRateColor}; background-color: ${successRateBg}; border: 1px solid ${successRateColor}40;">
                                                                        ${successRate.toFixed(2)}
                                                                    </span>
                                                                </td>
                                                                <td style="padding: 0.4rem; text-align: center;">${(job.AvgBackupSize || 0).toFixed(4)}</td>
                                                                <td style="padding: 0.4rem; text-align: center;">${(job.MaxBackupSize || 0).toFixed(4)}</td>
                                                                <td style="padding: 0.4rem; text-align: center;">${(job.AvgDataSize || 0).toFixed(4)}</td>
                                                                <td style="padding: 0.4rem; text-align: center;">${(job.MaxDataSize || 0).toFixed(4)}</td>
                                                                <td style="padding: 0.4rem; text-align: center;">${(job.AvgChangeRate || 0).toFixed(2)}</td>
                                                                <td style="padding: 0.4rem; text-align: center;">${job.WaitCount || 0}</td>
                                                                <td style="padding: 0.4rem; text-align: center;">${job.MaxWait || '00.00:00:00'}</td>
                                                                <td style="padding: 0.4rem; text-align: center;">${job.AvgWait || '00.00:00:00'}</td>
                                                                <td style="padding: 0.4rem;">${job.JobType || 'N/A'}</td>
                                                            </tr>
                                                        `;
                                                    }).join('');
                                                    
                                                    // Format totals row (at the end)
                                                    // For "Avg" columns, show weighted average
                                                    // For "Max" columns, show global maximum
                                                    // For totals, show sum
                                                    const totalsRow = `
                                                        <tr style="background: rgba(59, 130, 246, 0.1); font-weight: 600;">
                                                            <td style="padding: 0.4rem;">Total</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${totals.items}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${totals.minTimeSeconds > 0 ? secondsToTime(totals.minTimeSeconds) : '00:00:00'}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${totals.maxTimeSeconds > 0 ? secondsToTime(totals.maxTimeSeconds) : '00:00:00'}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${totals.avgTimeSeconds > 0 ? secondsToTime(Math.round(totals.avgTimeSeconds)) : '00:00:00'}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${totals.totalSessions}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${totals.fails}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${totals.retries}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${totalSuccessRate}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${totals.avgBackupSize.toFixed(4)}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${totals.maxBackupSize.toFixed(4)}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${totals.avgDataSize.toFixed(4)}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${totals.maxDataSize.toFixed(4)}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${totals.avgChangeRate.toFixed(2)}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${totals.waitCount}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">--</td>
                                                            <td style="padding: 0.4rem; text-align: center;">--</td>
                                                            <td style="padding: 0.4rem;">--</td>
                                                        </tr>
                                                    `;
                                                    
                                                    return jobRows + totalsRow;
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ` : ''}
                                    
                                    ${(() => {
                                        // Helper function to format boolean values
                                        const formatBoolean = (value) => {
                                            // Check if value is explicitly set (not null/undefined)
                                            if (value === null || value === undefined) return 'N/A';
                                            if (value === true || value === 'true' || value === 'True' || value === 1 || value === '1') return 'Yes';
                                            if (value === false || value === 'false' || value === 'False' || value === 0 || value === '0') return 'No';
                                            return 'N/A';
                                        };
                                        
                                        // Helper function to render regular job row (non-tape)
                                        const renderJobRow = (job, jobType) => {
                                            const isEnabled = (job.IsEnabled === true || job.IsEnabled === 'true' || job.IsEnabled === 'True' || job.IsEnabled === 1) ||
                                                             (job.JobIsEnabled === true || job.JobIsEnabled === 'true' || job.JobIsEnabled === 'True' || job.JobIsEnabled === 1) ||
                                                             (job.Enabled === true || job.Enabled === 'true' || job.Enabled === 'True' || job.Enabled === 1) ||
                                                             (job.IsScheduleEnabled === true || job.IsScheduleEnabled === 'true' || job.IsScheduleEnabled === 'True' || job.IsScheduleEnabled === 1);
                                            
                                            let lastResult = job.LastResult || job.lastResult || job.LastRunResult || job.Result || job.LastSessionResult || 'None';
                                            if (typeof lastResult === 'number') {
                                                if (lastResult === 0) lastResult = 'Success';
                                                else if (lastResult === 1) lastResult = 'Warning';
                                                else if (lastResult === 2) lastResult = 'Failed';
                                                else lastResult = 'None';
                                            }
                                            if (typeof lastResult === 'string') {
                                                lastResult = lastResult.trim();
                                                if (lastResult === '' || lastResult === 'N/A' || lastResult === 'null' || lastResult === 'undefined' || lastResult === 'None') {
                                                    lastResult = 'None';
                                                }
                                            }
                                            let resultColor = '#94a3b8';
                                            let resultBg = 'rgba(148, 163, 184, 0.1)';
                                            const lastResultLower = String(lastResult).toLowerCase();
                                            if (lastResultLower === 'success' || lastResultLower === 'ok' || lastResultLower === '0') {
                                                resultColor = '#10b981';
                                                resultBg = 'rgba(16, 185, 129, 0.1)';
                                                lastResult = 'Success';
                                            } else if (lastResultLower === 'warning' || lastResultLower === '1') {
                                                resultColor = '#f59e0b';
                                                resultBg = 'rgba(245, 158, 11, 0.1)';
                                                lastResult = 'Warning';
                                            } else if (lastResultLower === 'failed' || lastResultLower === 'error' || lastResultLower === '2') {
                                                resultColor = '#ef4444';
                                                resultBg = 'rgba(239, 68, 68, 0.1)';
                                                lastResult = 'Failed';
                                            } else {
                                                lastResult = 'None';
                                            }
                                            
                                            // Get all job properties
                                            const repository = job.Repository || job.repository || 'N/A';
                                            const sourceSize = job.SourceSize || job.sourceSize || 'N/A';
                                            const retentionScheme = job.RetentionScheme || job.retentionScheme || 'N/A';
                                            const restorePoints = job.RestorePoints || job.restorePoints || 'N/A';
                                            const encrypted = formatBoolean(job.Encrypted || job.encrypted);
                                            const compressionLevel = job.CompressionLevel || job.compressionLevel || 'N/A';
                                            const blockSize = job.BlockSize || job.blockSize || 'N/A';
                                            const gfsEnabled = formatBoolean(job.GfsEnabled || job.gfsEnabled);
                                            const gfsRetention = job.GfsRetention || job.gfsRetention || 'N/A';
                                            const activeFullEnabled = formatBoolean(job.ActiveFullEnabled || job.activeFullEnabled);
                                            // Check multiple property name variations for SyntheticFullEnabled
                                            let syntheticFullEnabledValue = null;
                                            if (job.hasOwnProperty('SyntheticFullEnabled')) {
                                                syntheticFullEnabledValue = job.SyntheticFullEnabled;
                                            } else if (job.hasOwnProperty('syntheticFullEnabled')) {
                                                syntheticFullEnabledValue = job.syntheticFullEnabled;
                                            } else if (job.hasOwnProperty('SyntheticFull')) {
                                                syntheticFullEnabledValue = job.SyntheticFull;
                                            } else if (job.hasOwnProperty('syntheticFull')) {
                                                syntheticFullEnabledValue = job.syntheticFull;
                                            }
                                            const syntheticFullEnabled = formatBoolean(syntheticFullEnabledValue);
                                            const backupChainType = job.BackupChainType || job.backupChainType || 'N/A';
                                            const indexingEnabled = formatBoolean(job.IndexingEnabled || job.indexingEnabled);
                                            
                                            // Encode job data for click handler
                                            const jobData = encodeURIComponent(JSON.stringify(job));
                                            
                                            return `
                                                <tr style="cursor: pointer;" data-job-data="${jobData.replace(/"/g, '&quot;')}" onclick="if(window.veeamAuditorPage){window.veeamAuditorPage.showJobDetails(this.getAttribute('data-job-data'))}" onmouseover="this.style.backgroundColor='rgba(59, 130, 246, 0.1)'" onmouseout="this.style.backgroundColor=''">
                                                    <td style="padding: 0.4rem;">${job.Name || job.name || 'N/A'}</td>
                                                    <td style="padding: 0.4rem;">${repository}</td>
                                                    <td style="padding: 0.4rem;">${sourceSize}</td>
                                                    <td style="padding: 0.4rem;">${retentionScheme}</td>
                                                    <td style="padding: 0.4rem;">${restorePoints}</td>
                                                    <td style="padding: 0.4rem;">${encrypted}</td>
                                                    <td style="padding: 0.4rem;">${jobType}</td>
                                                    <td style="padding: 0.4rem;">${compressionLevel}</td>
                                                    <td style="padding: 0.4rem;">${blockSize}</td>
                                                    <td style="padding: 0.4rem;">${gfsEnabled}</td>
                                                    <td style="padding: 0.4rem;">${gfsRetention}</td>
                                                    <td style="padding: 0.4rem;">${activeFullEnabled}</td>
                                                    <td style="padding: 0.4rem;">${syntheticFullEnabled}</td>
                                                    <td style="padding: 0.4rem;">${backupChainType}</td>
                                                    <td style="padding: 0.4rem;">${indexingEnabled}</td>
                                                    <td style="padding: 0.4rem;">
                                                        <span style="display: inline-block; padding: 0.15rem 0.35rem; border-radius: 0.25rem; font-size: 0.65rem; font-weight: 500; color: ${resultColor}; background-color: ${resultBg}; border: 1px solid ${resultColor}40;">
                                                            ${lastResult}
                                                        </span>
                                                    </td>
                                                </tr>
                                            `;
                                        };
                                        
                                        // Helper function to render tape job row
                                        const renderTapeJobRow = (job, jobType) => {
                                            const isEnabled = (job.IsEnabled === true || job.IsEnabled === 'true' || job.IsEnabled === 'True' || job.IsEnabled === 1) ||
                                                             (job.JobIsEnabled === true || job.JobIsEnabled === 'true' || job.JobIsEnabled === 'True' || job.JobIsEnabled === 1) ||
                                                             (job.Enabled === true || job.Enabled === 'true' || job.Enabled === 'True' || job.Enabled === 1) ||
                                                             (job.IsScheduleEnabled === true || job.IsScheduleEnabled === 'true' || job.IsScheduleEnabled === 'True' || job.IsScheduleEnabled === 1);
                                            
                                            let lastResult = job.LastResult || job.lastResult || job.LastRunResult || job.Result || job.LastSessionResult || 'None';
                                            if (typeof lastResult === 'number') {
                                                if (lastResult === 0) lastResult = 'Success';
                                                else if (lastResult === 1) lastResult = 'Warning';
                                                else if (lastResult === 2) lastResult = 'Failed';
                                                else lastResult = 'None';
                                            }
                                            if (typeof lastResult === 'string') {
                                                lastResult = lastResult.trim();
                                                if (lastResult === '' || lastResult === 'N/A' || lastResult === 'null' || lastResult === 'undefined' || lastResult === 'None') {
                                                    lastResult = 'None';
                                                }
                                            }
                                            let resultColor = '#94a3b8';
                                            let resultBg = 'rgba(148, 163, 184, 0.1)';
                                            const lastResultLower = String(lastResult).toLowerCase();
                                            if (lastResultLower === 'success' || lastResultLower === 'ok' || lastResultLower === '0') {
                                                resultColor = '#10b981';
                                                resultBg = 'rgba(16, 185, 129, 0.1)';
                                                lastResult = 'Success';
                                            } else if (lastResultLower === 'warning' || lastResultLower === '1') {
                                                resultColor = '#f59e0b';
                                                resultBg = 'rgba(245, 158, 11, 0.1)';
                                                lastResult = 'Warning';
                                            } else if (lastResultLower === 'failed' || lastResultLower === 'error' || lastResultLower === '2') {
                                                resultColor = '#ef4444';
                                                resultBg = 'rgba(239, 68, 68, 0.1)';
                                                lastResult = 'Failed';
                                            } else {
                                                lastResult = 'None';
                                            }
                                            
                                            const isScheduleEnabled = (job.IsScheduleEnabled === true || job.IsScheduleEnabled === 'true' || job.IsScheduleEnabled === 'True' || job.IsScheduleEnabled === 1) ||
                                                                       (job.isScheduleEnabled === true || job.isScheduleEnabled === 'true' || job.isScheduleEnabled === 'True' || job.isScheduleEnabled === 1);
                                            const nextRun = job.NextRun || job.nextRun || job.NextRunTime || (job.ScheduleOptions && job.ScheduleOptions.NextRun) || null;
                                            const hasNextRun = nextRun && nextRun !== 'N/A' && nextRun !== null && nextRun !== '' && nextRun !== 'null' && nextRun !== 'undefined' && nextRun !== '0001-01-01 00:00:00';
                                            
                                            // Get tape job specific properties
                                            const mediaPoolFull = job.MediaPoolFull || job.mediaPoolFull || job.MediaPool || job.mediaPool || 'N/A';
                                            const incrementalEnabled = formatBoolean(job.IncrementalEnabled || job.incrementalEnabled);
                                            const mediaPoolIncremental = job.MediaPoolIncremental || job.mediaPoolIncremental || 'N/A';
                                            const hardwareCompression = formatBoolean(job.HardwareCompression || job.hardwareCompression);
                                            const ejectMedium = formatBoolean(job.EjectMedium || job.ejectMedium);
                                            const exportMediaSet = formatBoolean(job.ExportMediaSet || job.exportMediaSet);
                                            const jobIsEnabled = formatBoolean(isEnabled);
                                            
                                            // Encode job data for click handler
                                            const jobData = encodeURIComponent(JSON.stringify(job));
                                            
                                            return `
                                                <tr style="cursor: pointer;" data-job-data="${jobData.replace(/"/g, '&quot;')}" onclick="if(window.veeamAuditorPage){window.veeamAuditorPage.showJobDetails(this.getAttribute('data-job-data'))}" onmouseover="this.style.backgroundColor='rgba(59, 130, 246, 0.1)'" onmouseout="this.style.backgroundColor=''">
                                                    <td style="padding: 0.4rem;">${job.Name || job.name || 'N/A'}</td>
                                                    <td style="padding: 0.4rem;">${mediaPoolFull}</td>
                                                    <td style="padding: 0.4rem;">${incrementalEnabled}</td>
                                                    <td style="padding: 0.4rem;">${mediaPoolIncremental}</td>
                                                    <td style="padding: 0.4rem;">${hardwareCompression}</td>
                                                    <td style="padding: 0.4rem;">${ejectMedium}</td>
                                                    <td style="padding: 0.4rem;">${exportMediaSet}</td>
                                                    <td style="padding: 0.4rem;">${jobIsEnabled}</td>
                                                    <td style="padding: 0.4rem;">${hasNextRun ? nextRun : 'N/A'}</td>
                                                    <td style="padding: 0.4rem;">
                                                        <span style="display: inline-block; padding: 0.15rem 0.35rem; border-radius: 0.25rem; font-size: 0.65rem; font-weight: 500; color: ${resultColor}; background-color: ${resultBg}; border: 1px solid ${resultColor}40;">
                                                            ${lastResult}
                                                        </span>
                                                    </td>
                                                </tr>
                                            `;
                                        };
                                        
                                        // Group jobs by type
                                        const jobGroups = {
                                            'Backup Jobs': [],
                                            'Replica Jobs': [],
                                            'File Copy Jobs': [],
                                            'Backup Copy Jobs': [],
                                            'File Backup Jobs': [],
                                            'Tape Jobs': []
                                        };
                                        
                                        if (veeam.jobInfo.backupJobs && Array.isArray(veeam.jobInfo.backupJobs)) {
                                            veeam.jobInfo.backupJobs.forEach(job => {
                                                let jobType = job.JobType || job.jobType || 'N/A';
                                                if (jobType === 'Hyper-V Backup' || jobType === 'VMware Backup') {
                                                    jobGroups['Backup Jobs'].push({ job, jobType });
                                                } else {
                                                    jobGroups['Backup Jobs'].push({ job, jobType });
                                                }
                                            });
                                        }
                                        if (veeam.jobInfo.replicaJobs && Array.isArray(veeam.jobInfo.replicaJobs)) {
                                            veeam.jobInfo.replicaJobs.forEach(job => {
                                                jobGroups['Replica Jobs'].push({ job, jobType: 'Replica' });
                                            });
                                        }
                                        if (veeam.jobInfo.fileCopyJobs && Array.isArray(veeam.jobInfo.fileCopyJobs)) {
                                            veeam.jobInfo.fileCopyJobs.forEach(job => {
                                                jobGroups['File Copy Jobs'].push({ job, jobType: 'File Copy' });
                                            });
                                        }
                                        if (veeam.jobInfo.backupCopyJobs && Array.isArray(veeam.jobInfo.backupCopyJobs)) {
                                            veeam.jobInfo.backupCopyJobs.forEach(job => {
                                                jobGroups['Backup Copy Jobs'].push({ job, jobType: 'Backup Copy' });
                                            });
                                        }
                                        if (veeam.jobInfo.fileBackupJobs && Array.isArray(veeam.jobInfo.fileBackupJobs)) {
                                            veeam.jobInfo.fileBackupJobs.forEach(job => {
                                                jobGroups['File Backup Jobs'].push({ job, jobType: 'File Backup' });
                                            });
                                        }
                                        if (veeam.jobInfo.tapeJobs && Array.isArray(veeam.jobInfo.tapeJobs)) {
                                            veeam.jobInfo.tapeJobs.forEach(job => {
                                                jobGroups['Tape Jobs'].push({ job, jobType: 'Tape' });
                                            });
                                        }
                                        
                                        // Render tables for each job type
                                        let tablesHtml = '';
                                        Object.keys(jobGroups).forEach(groupName => {
                                            const jobs = jobGroups[groupName];
                                            if (jobs.length === 0) return;
                                            
                                            // Use different headers and render function for tape jobs
                                            const isTapeJobs = groupName === 'Tape Jobs';
                                            
                                            const headers = isTapeJobs ? `
                                                <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Job Name</th>
                                                <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Media Pool - Full</th>
                                                <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Incremental Enabled</th>
                                                <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Media Pool - Incremental</th>
                                                <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Hardware Compression</th>
                                                <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Eject Medium</th>
                                                <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Export Media Set</th>
                                                <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Job Is Enabled</th>
                                                <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Next Run</th>
                                                <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Last Result</th>
                                            ` : `
                                                <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Name</th>
                                                <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Repository</th>
                                                <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Source Size</th>
                                                <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Retention Scheme</th>
                                                <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Restore Points</th>
                                                <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Encrypted</th>
                                                <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Job Type</th>
                                                <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Compression Level</th>
                                                <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Block Size</th>
                                                <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">GFS Enabled</th>
                                                <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">GFS Retention</th>
                                                <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Active Full Enabled</th>
                                                <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Synthetic Full Enabled</th>
                                                <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Backup Chain Type</th>
                                                <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Indexing Enabled</th>
                                                <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Last Result</th>
                                            `;
                                            
                                            tablesHtml += `
                                                <div style="margin-bottom: 1.5rem;">
                                                    <h3 style="color: #e2e8f0; font-size: 0.9rem; margin-bottom: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                                                        <i class="fas fa-list" style="color: #8b5cf6;"></i>${groupName} (${jobs.length})
                                                    </h3>
                                                    <div class="audit-table-wrapper" style="width: 100%; max-width: 100%; margin: 0; padding: 0; overflow-x: auto;">
                                                        <table class="audit-table" style="width: 100%; min-width: 100%; table-layout: auto; font-size: 0.8rem;">
                                                            <thead>
                                                                <tr>
                                                                    ${headers}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                ${jobs.map(({ job, jobType }) => isTapeJobs ? renderTapeJobRow(job, jobType) : renderJobRow(job, jobType)).join('')}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            `;
                                        });
                                        
                                        return tablesHtml || '<div style="padding: 1rem; text-align: center; color: #94a3b8;">No jobs found</div>';
                                    })()}
                                </div>
                            ` : ''}

                            ${veeam.managedServers && Array.isArray(veeam.managedServers) && veeam.managedServers.length > 0 ? `
                                <div style="margin-top: 1.5rem; width: 100%; max-width: 100%;">
                                    <h2 style="color: #e2e8f0; font-size: 1rem; margin-bottom: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                                        <i class="fas fa-server" style="color: #8b5cf6;"></i>Managed Server Info
                                    </h2>
                                    <div class="audit-table-wrapper" style="width: 100%; max-width: 100%; margin: 0; padding: 0; overflow-x: auto;">
                                        <table class="audit-table" style="width: 100%; min-width: 100%; table-layout: auto; font-size: 0.75rem;">
                                            <thead>
                                                <tr>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.75rem;">Name</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.75rem;">Cores</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.75rem;">RAM</th>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.75rem;">Type</th>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.75rem;">OS Info</th>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.75rem;">API Version</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.75rem;">Protected VMs</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.75rem;">Not Protected VMs</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.75rem;">Total VMs</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.75rem;">Is Proxy</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.75rem;">Is Repo</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.75rem;">Is WAN Acc.</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.75rem;">Is Unavailable</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${veeam.managedServers.map(server => {
                                                    const isProxy = server.isProxy === true || server.isProxy === 'true' || server.isProxy === 'True' || server.isProxy === 1;
                                                    const isRepo = server.isRepo === true || server.isRepo === 'true' || server.isRepo === 'True' || server.isRepo === 1;
                                                    const isWANAcc = server.isWANAcc === true || server.isWANAcc === 'true' || server.isWANAcc === 'True' || server.isWANAcc === 1;
                                                    const isUnavailable = server.isUnavailable === true || server.isUnavailable === 'true' || server.isUnavailable === 'True' || server.isUnavailable === 1;
                                                    
                                                    const formatBoolean = (value) => {
                                                        if (value === true || value === 'true' || value === 'True' || value === 1) return '<i class="fas fa-check-circle" style="color: #10b981;"></i>';
                                                        return '<i class="fas fa-times-circle" style="color: #64748b;"></i>';
                                                    };
                                                    
                                                    const cores = server.cores || server.Cores || 0;
                                                    const ram = server.ram || server.RAM || 0;
                                                    const ramDisplay = ram > 0 ? `${ram} GB` : '0';
                                                    
                                                    return `
                                                        <tr>
                                                            <td style="padding: 0.4rem;">${server.name || server.Name || 'N/A'}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${cores}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${ramDisplay}</td>
                                                            <td style="padding: 0.4rem;">${server.type || server.Type || 'N/A'}</td>
                                                            <td style="padding: 0.4rem;">${server.osInfo || server.OSInfo || server.OsInfo || ''}</td>
                                                            <td style="padding: 0.4rem;">${server.apiVersion || server.ApiVersion || ''}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${server.protectedVMs || server.ProtectedVMs || 0}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${server.notProtectedVMs || server.NotProtectedVMs || 0}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${server.totalVMs || server.TotalVMs || 0}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${formatBoolean(isProxy)}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${formatBoolean(isRepo)}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${formatBoolean(isWANAcc)}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${formatBoolean(isUnavailable)}</td>
                                                        </tr>
                                                    `;
                                                }).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ` : ''}

                            ${veeam.repositories && Array.isArray(veeam.repositories) && veeam.repositories.length > 0 ? `
                                <div style="margin-top: 1.5rem; width: 100%; max-width: 100%;">
                                    <h2 style="color: #e2e8f0; font-size: 1rem; margin-bottom: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                                        <i class="fas fa-database" style="color: #8b5cf6;"></i>Standalone Repository Details
                                    </h2>
                                    <div class="audit-table-wrapper" style="width: 100%; max-width: 100%; margin: 0; padding: 0; overflow-x: auto;">
                                        <table class="audit-table" style="width: 100%; min-width: 100%; table-layout: auto; font-size: 0.7rem;">
                                            <thead>
                                                <tr>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.7rem;">Name</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.7rem;">Job Count</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.7rem;">Set Tasks</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.7rem;">Cores</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.7rem;">RAM</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.7rem;">Auto Gateway</th>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.7rem;">Host</th>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.7rem;">Path</th>
                                                    <th style="padding: 0.4rem; text-align: right; font-size: 0.7rem;">Free Space (TB)</th>
                                                    <th style="padding: 0.4rem; text-align: right; font-size: 0.7rem;">Total Space (TB)</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.7rem;">Free Space %</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.7rem;">Per-VM</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.7rem;">DeCompress</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.7rem;">Align Blocks</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.7rem;">Rotated Drives</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.7rem;">Use Immutability</th>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.7rem;">Type</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${veeam.repositories.map(repo => {
                                                    const formatBoolean = (value) => {
                                                        if (value === true || value === 'true' || value === 'True' || value === 1) return '<i class="fas fa-check-circle" style="color: #10b981;"></i>';
                                                        return '<i class="fas fa-times-circle" style="color: #64748b;"></i>';
                                                    };
                                                    
                                                    const formatWarning = (value) => {
                                                        if (value === true || value === 'true' || value === 'True' || value === 1) return '<i class="fas fa-exclamation-triangle" style="color: #f59e0b;"></i>';
                                                        return '<i class="fas fa-check-circle" style="color: #10b981;"></i>';
                                                    };
                                                    
                                                    const freeSpaceGB = repo.CachedFreeSpaceGB || repo.cachedFreeSpaceGB || 0;
                                                    const totalSpaceGB = repo.CachedTotalSpaceGB || repo.cachedTotalSpaceGB || 0;
                                                    const freeSpaceTB = freeSpaceGB > 0 ? (freeSpaceGB / 1024).toFixed(2) : '0.00';
                                                    const totalSpaceTB = totalSpaceGB > 0 ? (totalSpaceGB / 1024).toFixed(2) : '0.00';
                                                    const freeSpacePercent = repo.FreeSpacePercent || repo.freeSpacePercent || 0;
                                                    
                                                    const jobCount = repo.JobCount || repo.jobCount || 0;
                                                    const setTasks = repo.SetTasks || repo.setTasks || 0;
                                                    const cores = repo.Cores || repo.cores || 0;
                                                    const ram = repo.Ram || repo.ram || 0;
                                                    const ramDisplay = ram > 0 ? `${ram} GB` : '0';
                                                    
                                                    const host = repo.Host || repo.host || 'N/A';
                                                    const path = repo.Path || repo.path || 'N/A';
                                                    const type = repo.Type || repo.type || 'N/A';
                                                    
                                                    const autoGateway = formatBoolean(repo.AutoGateway || repo.autoGateway);
                                                    const perVM = formatWarning(repo.PerVM || repo.perVM);
                                                    const decompress = formatBoolean(repo.Decompress || repo.decompress);
                                                    const alignBlocks = formatBoolean(repo.AlignBlocks || repo.alignBlocks);
                                                    const rotatedDrives = formatBoolean(repo.RotatedDrives || repo.rotatedDrives);
                                                    const useImmutability = formatBoolean(repo.UseImmutability || repo.useImmutability);
                                                    
                                                    return `
                                                        <tr>
                                                            <td style="padding: 0.4rem;">${repo.Name || repo.name || 'N/A'}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${jobCount}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${setTasks}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${cores}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${ramDisplay}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${autoGateway}</td>
                                                            <td style="padding: 0.4rem;">${host}</td>
                                                            <td style="padding: 0.4rem;">${path}</td>
                                                            <td style="padding: 0.4rem; text-align: right;">${freeSpaceTB}</td>
                                                            <td style="padding: 0.4rem; text-align: right;">${totalSpaceTB}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${freeSpacePercent}%</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${perVM}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${decompress}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${alignBlocks}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${rotatedDrives}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${useImmutability}</td>
                                                            <td style="padding: 0.4rem;">${type}</td>
                                                        </tr>
                                                    `;
                                                }).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ` : ''}

                            ${veeam.sobrs && Array.isArray(veeam.sobrs) && veeam.sobrs.length > 0 ? `
                                <div style="margin-top: 1.5rem; width: 100%; max-width: 100%;">
                                    <h2 style="color: #e2e8f0; font-size: 1rem; margin-bottom: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                                        <i class="fas fa-layer-group" style="color: #8b5cf6;"></i>SOBR Details
                                    </h2>
                                    <div class="audit-table-wrapper" style="width: 100%; max-width: 100%; margin: 0; padding: 0; overflow-x: auto;">
                                        <table class="audit-table" style="width: 100%; min-width: 100%; table-layout: auto; font-size: 0.7rem;">
                                            <thead>
                                                <tr>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.7rem;">Name</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.7rem;">Extents</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.7rem;">Job Count</th>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.7rem;">Policy</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.7rem;">Capacity Tier</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.7rem;">Copy</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.7rem;">Move</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.7rem;">Archive Tier</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.7rem;">Per-Machine</th>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.7rem;">CapTier Type</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.7rem;">Immutable</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.7rem;">Immutable Period</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.7rem;">Size Limit Enabled</th>
                                                    <th style="padding: 0.4rem; text-align: right; font-size: 0.7rem;">Size Limit</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${veeam.sobrs.map(sobr => {
                                                    const formatBoolean = (value) => {
                                                        if (value === true || value === 'true' || value === 'True' || value === 1) return '<i class="fas fa-check-circle" style="color: #10b981;"></i>';
                                                        return '<i class="fas fa-times-circle" style="color: #64748b;"></i>';
                                                    };
                                                    
                                                    const extents = sobr.Extents || sobr.extents || 0;
                                                    const jobCount = sobr.JobCount || sobr.jobCount || 0;
                                                    const policy = sobr.Policy || sobr.policy || 'N/A';
                                                    const capacityTier = formatBoolean(sobr.CapacityTier || sobr.capacityTier);
                                                    const copy = formatBoolean(sobr.Copy || sobr.copy);
                                                    const move = formatBoolean(sobr.Move || sobr.move);
                                                    const archiveTier = formatBoolean(sobr.ArchiveTier || sobr.archiveTier);
                                                    const perMachine = formatBoolean(sobr.PerMachine || sobr.perMachine);
                                                    const capTierType = sobr.CapTierType || sobr.capTierType || '';
                                                    const immutable = formatBoolean(sobr.Immutable || sobr.immutable);
                                                    const immutablePeriod = sobr.ImmutablePeriod || sobr.immutablePeriod || '';
                                                    const sizeLimitEnabled = formatBoolean(sobr.SizeLimitEnabled || sobr.sizeLimitEnabled);
                                                    const sizeLimit = sobr.SizeLimit || sobr.sizeLimit || '';
                                                    
                                                    return `
                                                        <tr>
                                                            <td style="padding: 0.4rem;">${sobr.Name || sobr.name || 'N/A'}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${extents}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${jobCount}</td>
                                                            <td style="padding: 0.4rem;">${policy}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${capacityTier}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${copy}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${move}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${archiveTier}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${perMachine}</td>
                                                            <td style="padding: 0.4rem;">${capTierType}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${immutable}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${immutablePeriod}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${sizeLimitEnabled}</td>
                                                            <td style="padding: 0.4rem; text-align: right;">${sizeLimit}</td>
                                                        </tr>
                                                    `;
                                                }).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ` : ''}

                            ${veeam.sobrExtents && Array.isArray(veeam.sobrExtents) && veeam.sobrExtents.length > 0 ? `
                                <div style="margin-top: 1.5rem; width: 100%; max-width: 100%;">
                                    <h2 style="color: #e2e8f0; font-size: 1rem; margin-bottom: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                                        <i class="fas fa-sitemap" style="color: #8b5cf6;"></i>SOBR Extent Details
                                    </h2>
                                    <div class="audit-table-wrapper" style="width: 100%; max-width: 100%; margin: 0; padding: 0; overflow-x: auto;">
                                        <table class="audit-table" style="width: 100%; min-width: 100%; table-layout: auto; font-size: 0.7rem;">
                                            <thead>
                                                <tr>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.7rem;">Name</th>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.7rem;">SOBR</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.7rem;">Set Tasks</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.7rem;">Cores</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.7rem;">RAM</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.7rem;">Auto Gateway</th>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.7rem;">Host</th>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.7rem;">Path</th>
                                                    <th style="padding: 0.4rem; text-align: right; font-size: 0.7rem;">Free Space (TB)</th>
                                                    <th style="padding: 0.4rem; text-align: right; font-size: 0.7rem;">Total Space (TB)</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.7rem;">Free Space %</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.7rem;">DeCompress</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.7rem;">Align Blocks</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.7rem;">Rotated Drives</th>
                                                    <th style="padding: 0.4rem; text-align: center; font-size: 0.7rem;">Use Immutability</th>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.7rem;">Type</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${veeam.sobrExtents.map(extent => {
                                                    const formatBoolean = (value) => {
                                                        if (value === true || value === 'true' || value === 'True' || value === 1) return '<i class="fas fa-check-circle" style="color: #10b981;"></i>';
                                                        return '<i class="fas fa-times-circle" style="color: #64748b;"></i>';
                                                    };
                                                    
                                                    const freeSpaceGB = extent.FreeSpaceGB || extent.freeSpaceGB || 0;
                                                    const totalSpaceGB = extent.TotalSpaceGB || extent.totalSpaceGB || 0;
                                                    const freeSpaceTB = freeSpaceGB > 0 ? (freeSpaceGB / 1024).toFixed(2) : '0.00';
                                                    const totalSpaceTB = totalSpaceGB > 0 ? (totalSpaceGB / 1024).toFixed(2) : '0.00';
                                                    const freeSpacePercent = extent.FreeSpacePercent || extent.freeSpacePercent || 0;
                                                    
                                                    const setTasks = extent.SetTasks || extent.setTasks || 0;
                                                    const cores = extent.Cores || extent.cores || 0;
                                                    const ram = extent.Ram || extent.ram || 0;
                                                    const ramDisplay = ram > 0 ? `${ram} GB` : '0';
                                                    
                                                    const sobr = extent.SOBR || extent.sobr || 'N/A';
                                                    const host = extent.Host || extent.host || 'N/A';
                                                    const path = extent.Path || extent.path || 'N/A';
                                                    const type = extent.Type || extent.type || 'N/A';
                                                    
                                                    const autoGateway = formatBoolean(extent.AutoGateway || extent.autoGateway);
                                                    const decompress = formatBoolean(extent.Decompress || extent.decompress);
                                                    const alignBlocks = formatBoolean(extent.AlignBlocks || extent.alignBlocks);
                                                    const rotatedDrives = formatBoolean(extent.RotatedDrives || extent.rotatedDrives);
                                                    const useImmutability = formatBoolean(extent.UseImmutability || extent.useImmutability);
                                                    
                                                    return `
                                                        <tr>
                                                            <td style="padding: 0.4rem;">${extent.Name || extent.name || 'N/A'}</td>
                                                            <td style="padding: 0.4rem;">${sobr}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${setTasks}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${cores}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${ramDisplay}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${autoGateway}</td>
                                                            <td style="padding: 0.4rem;">${host}</td>
                                                            <td style="padding: 0.4rem;">${path}</td>
                                                            <td style="padding: 0.4rem; text-align: right;">${freeSpaceTB}</td>
                                                            <td style="padding: 0.4rem; text-align: right;">${totalSpaceTB}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${freeSpacePercent}%</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${decompress}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${alignBlocks}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${rotatedDrives}</td>
                                                            <td style="padding: 0.4rem; text-align: center;">${useImmutability}</td>
                                                            <td style="padding: 0.4rem;">${type}</td>
                                                        </tr>
                                                    `;
                                                }).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ` : ''}

                            <div id="jobDetailsModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.8); z-index: 10000; overflow-y: auto;">
                                <div style="position: relative; max-width: 90%; width: 1200px; margin: 2rem auto; background: #1e293b; border-radius: 0.5rem; border: 1px solid #334155; padding: 1.5rem;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                                        <h2 style="color: #e2e8f0; font-size: 1.25rem; font-weight: 600; margin: 0;">Job Details</h2>
                                        <button onclick="document.getElementById('jobDetailsModal').style.display='none'" style="background: #334155; border: 1px solid #475569; color: #e2e8f0; padding: 0.5rem 1rem; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem;">Close</button>
                                    </div>
                                    <div id="jobDetailsContent" style="color: #e2e8f0;"></div>
                                </div>
                            </div>

                            ${veeam.servicesStatus && Array.isArray(veeam.servicesStatus) && veeam.servicesStatus.length > 0 ? `
                                <div style="margin-top: 1.5rem; width: 100%; max-width: 100%;">
                                    <h3 style="color: #e2e8f0; font-size: 1rem; margin-bottom: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                                        <i class="fas fa-cogs" style="color: #8b5cf6;"></i>HealthCheck - Services Status
                                    </h3>
                                    <div class="audit-table-wrapper" style="width: 100%; max-width: 100%; margin: 0; padding: 0; overflow-x: auto;">
                                        <table class="audit-table" style="width: 100%; min-width: 100%; table-layout: auto; font-size: 0.8rem;">
                                            <thead>
                                                <tr>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Display Name</th>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Short Name</th>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${veeam.servicesStatus.map(service => {
                                                    const isRunning = service.status && service.status.toLowerCase() === 'running';
                                                    const statusColor = isRunning ? '#10b981' : '#ef4444';
                                                    const bgColor = isRunning ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
                                                    const borderColor = isRunning ? '#10b98140' : '#ef444440';
                                                    return `
                                                    <tr>
                                                        <td style="padding: 0.4rem;">${service.displayName || 'N/A'}</td>
                                                        <td style="padding: 0.4rem;">${service.shortName || 'N/A'}</td>
                                                        <td style="padding: 0.4rem;">
                                                            <span style="display: inline-block; padding: 0.15rem 0.35rem; border-radius: 0.25rem; font-size: 0.65rem; font-weight: 500; color: ${statusColor}; background-color: ${bgColor}; border: 1px solid ${borderColor};">
                                                                ${service.status || 'N/A'}
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

                            ${veeam.enterpriseManager ? `
                                <div style="margin-top: 1.5rem; width: 100%; max-width: 100%;">
                                    <h3 style="color: #e2e8f0; font-size: 1rem; margin-bottom: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                                        <i class="fas fa-server" style="color: #06b6d4;"></i>Enterprise Manager Information
                                    </h3>
                                    <div class="audit-table-wrapper" style="width: 100%; max-width: 100%; margin: 0; padding: 0; overflow-x: auto;">
                                        <table class="audit-table" style="width: 100%; min-width: 100%; table-layout: auto; font-size: 0.8rem;">
                                            <thead>
                                                <tr>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Server Name</th>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Server URL</th>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Skip License Push</th>
                                                    <th style="padding: 0.4rem; text-align: left; font-size: 0.8rem;">Is Connected</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td style="padding: 0.4rem;">${veeam.enterpriseManager.serverName || 'N/A'}</td>
                                                    <td style="padding: 0.4rem;">${veeam.enterpriseManager.serverUrl || 'N/A'}</td>
                                                    <td style="padding: 0.4rem;">${(veeam.enterpriseManager.skipLicensePush === true || veeam.enterpriseManager.skipLicensePush === 'true' || veeam.enterpriseManager.skipLicensePush === 'True') ? '<span style="color: #10b981;"><i class="fas fa-check-circle" style="color: #10b981;"></i> Yes</span>' : (veeam.enterpriseManager.skipLicensePush === false || veeam.enterpriseManager.skipLicensePush === 'false' || veeam.enterpriseManager.skipLicensePush === 'False') ? '<span style="color: #64748b;"><i class="fas fa-times-circle" style="color: #64748b;"></i> No</span>' : 'N/A'}</td>
                                                    <td style="padding: 0.4rem;">
                                                        <span class="status-badge status-${(veeam.enterpriseManager.isConnected === true || veeam.enterpriseManager.isConnected === 'true' || veeam.enterpriseManager.isConnected === 'True' || veeam.enterpriseManager.isConnected === 'Yes') ? 'success' : 'error'}" style="font-size: 0.7rem; padding: 0.2rem 0.4rem;">
                                                            ${(veeam.enterpriseManager.isConnected === true || veeam.enterpriseManager.isConnected === 'true' || veeam.enterpriseManager.isConnected === 'True' || veeam.enterpriseManager.isConnected === 'Yes') ? 'Yes' : (veeam.enterpriseManager.isConnected === false || veeam.enterpriseManager.isConnected === 'false' || veeam.enterpriseManager.isConnected === 'False' || veeam.enterpriseManager.isConnected === 'No') ? 'No' : veeam.enterpriseManager.isConnected || 'N/A'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ` : ''}

                            ${veeam.securityCredentials && Array.isArray(veeam.securityCredentials) && veeam.securityCredentials.length > 0 ? `
                                <div style="margin-top: 1.5rem; width: 100%; max-width: 100%;">
                                    <h3 style="color: #e2e8f0; font-size: 1rem; margin-bottom: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                                        <i class="fas fa-key" style="color: #f59e0b;"></i>Security Credentials
                                    </h3>
                                    <p style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 0.75rem;">The following table provides information about the credentials managed by Veeam Backup & Replication.</p>
                                    <div class="audit-table-wrapper" style="width: 100%; max-width: 100%; margin: 0; padding: 0; overflow-x: auto;">
                                        <table class="audit-table" style="width: 100%; min-width: 100%; table-layout: auto; font-size: 0.8rem;">
                                            <thead>
                                                <tr>
                                                    <th style="padding: 0.5rem; text-align: left; font-size: 0.8rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Name</th>
                                                    <th style="padding: 0.5rem; text-align: left; font-size: 0.8rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Description</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${veeam.securityCredentials.map(cred => `
                                                    <tr>
                                                        <td style="padding: 0.5rem; color: #e2e8f0;">${cred.name || 'N/A'}</td>
                                                        <td style="padding: 0.5rem; color: #e2e8f0;">${cred.description || 'N/A'}</td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ` : ''}






                            ${veeam.tapeJobs && veeam.tapeJobs.total !== undefined && veeam.tapeJobs.total > 0 ? `
                                <div style="margin-top: 1.5rem; width: 100%; max-width: 100%;">
                                    <h3 style="color: #e2e8f0; font-size: 1rem; margin-bottom: 0.75rem; font-weight: 600;">
                                        <i class="fas fa-tape" style="margin-right: 0.5rem; color: #f59e0b;"></i>Tape Jobs (${veeam.tapeJobs.total})
                                    </h3>
                                    ${veeam.tapeJobs.jobList && veeam.tapeJobs.jobList.length > 0 ? `
                                        <div class="audit-table-wrapper">
                                            <table class="audit-table">
                                                <thead>
                                                    <tr>
                                                        <th>${this.t('name')}</th>
                                                        <th>Status</th>
                                                        <th>Last Run</th>
                                                        <th>${this.t('scheduled')}</th>
                                                        <th>Next Run</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${veeam.tapeJobs.jobList.map(job => {
                                                        const statusColor = job.LastSessionStatus === 'Success' ? 'success' : 
                                                                          job.LastSessionStatus === 'Warning' ? 'warning' : 
                                                                          job.LastSessionStatus === 'Failed' || job.LastSessionStatus === 'Error' ? 'error' : 
                                                                          job.LastSessionStatus === 'Running' ? 'info' : 'secondary';
                                                        return `
                                                        <tr>
                                                            <td><strong>${job.Name || 'N/A'}</strong></td>
                                                            <td>
                                                                <span class="status-badge status-${statusColor}">
                                                                    ${job.LastSessionStatus === 'Success' ? '<i class="fas fa-check-circle"></i> ' : 
                                                                      job.LastSessionStatus === 'Warning' ? '<i class="fas fa-exclamation-triangle"></i> ' : 
                                                                      job.LastSessionStatus === 'Failed' || job.LastSessionStatus === 'Error' ? '<i class="fas fa-times-circle"></i> ' : 
                                                                      job.LastSessionStatus === 'Running' ? '<i class="fas fa-spinner fa-spin"></i> ' : 
                                                                      '<i class="fas fa-circle"></i> '}
                                                                    ${job.LastSessionStatus || 'Never Run'}
                                                                </span>
                                                            </td>
                                                            <td>${job.LastSessionTime && job.LastSessionTime !== 'N/A' ? job.LastSessionTime : '<span style="color: #64748b;">Never</span>'}</td>
                                                            <td><span class="status-badge status-${job.ScheduleEnabled ? 'success' : 'warning'}">${job.ScheduleEnabled ? 'Yes' : 'No'}</span></td>
                                                            <td>${job.NextRun && job.NextRun !== 'N/A' ? job.NextRun : '<span style="color: #64748b;">N/A</span>'}</td>
                                                        </tr>
                                                    `;
                                                    }).join('')}
                                                </tbody>
                                            </table>
                                        </div>
                                    ` : '<p>No tape jobs found</p>'}
                                </div>
                            ` : ''}


                            ${veeam.sobrs && veeam.sobrs.length > 0 ? `
                                <div style="margin-top: 1.5rem; width: 100%; max-width: 100%;">
                                    <h3 style="color: #e2e8f0; font-size: 1rem; margin-bottom: 0.75rem; font-weight: 600;">
                                        <i class="fas fa-layer-group" style="margin-right: 0.5rem; color: #f59e0b;"></i>${this.t('sobrs')} (${veeam.sobrs.length})
                                    </h3>
                                    <div class="audit-table-wrapper" style="width: 100%; max-width: 100%; margin: 0; padding: 0; overflow-x: auto;">
                                        <table class="audit-table" style="width: 100%; min-width: 100%; table-layout: auto;">
                                            <thead>
                                                <tr>
                                                    <th>${this.t('name')}</th>
                                                    <th>${this.t('policyType')}</th>
                                                    <th>${this.t('perVMBackup')}</th>
                                                    <th>${this.t('capacityTier')}</th>
                                                    <th>${this.t('encryption')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${veeam.sobrs.map(sobr => `
                                                    <tr>
                                                        <td>${sobr.Name || 'N/A'}</td>
                                                        <td>${sobr.PolicyType || 'N/A'}</td>
                                                        <td><span class="status-badge status-${sobr.UsePerVMBackupFiles ? 'success' : 'warning'}">${sobr.UsePerVMBackupFiles ? 'Yes' : 'No'}</span></td>
                                                        <td><span class="status-badge status-${sobr.EnableCapacityTier ? 'success' : 'warning'}">${sobr.EnableCapacityTier ? 'Yes' : 'No'}</span></td>
                                                        <td><span class="status-badge status-${sobr.EncryptionEnabled ? 'success' : 'warning'}">${sobr.EncryptionEnabled ? 'Yes' : 'No'}</span></td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ` : ''}


                            ${veeam.wanAccelerators && veeam.wanAccelerators.length > 0 ? `
                                <div style="margin-top: 1.5rem; width: 100%; max-width: 100%;">
                                    <h3 style="color: #e2e8f0; font-size: 1rem; margin-bottom: 0.75rem; font-weight: 600;">
                                        <i class="fas fa-tachometer-alt" style="margin-right: 0.5rem; color: #ec4899;"></i>${this.t('wanAccelerators')} (${veeam.wanAccelerators.length})
                                    </h3>
                                    <div class="audit-table-wrapper" style="width: 100%; max-width: 100%; margin: 0; padding: 0; overflow-x: auto;">
                                        <table class="audit-table" style="width: 100%; min-width: 100%; table-layout: auto;">
                                            <thead>
                                                <tr>
                                                    <th>${this.t('name')}</th>
                                                    <th>${this.t('host')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${veeam.wanAccelerators.map(wan => `
                                                    <tr>
                                                        <td>${wan.Name || 'N/A'}</td>
                                                        <td>${wan.Host || 'N/A'}</td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ` : ''}

                    ` : `
                        <div style="padding: 1rem; text-align: center; color: #94a3b8;">
                            <i class="fas fa-info-circle" style="margin-right: 0.5rem;"></i>Veeam Backup & Replication is not installed on this server.
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    async mount() {
        window.veeamAuditorInstance = this;
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
            const response = await fetch(`/api/veeam-reports/${this.reportId}`);
            if (!response.ok) throw new Error('Failed to load report');
            this.reportData = await response.json();
        } catch (error) {
            console.error('Error loading report:', error);
            this.showMessage('Failed to load report: ' + error.message, 'error');
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
            const response = await fetch('/api/veeam-reports/generate-script', {
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
            const reportName = this.reportData?.serverName || 'Veeam';
            const scriptType = encrypt ? 'Encrypted' : 'Plain';
            a.download = `VeeamAudit-${scriptType}-${reportName.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.ps1`;
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
        const fileInput = document.getElementById('veeam-report-file-input');
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

            const response = await fetch('/api/veeam-reports/import', {
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
            window.appInstance.navigateTo('veeam-auditor-list');
        } else {
            window.location.hash = 'veeam-auditor-list';
            window.location.reload();
        }
    }

    showMessage(message, type) {
        const messageEl = document.getElementById('veeam-message');
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `message message-${type}`;
            messageEl.style.display = 'block';
            setTimeout(() => {
                messageEl.style.display = 'none';
            }, 3000);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    updateDisplay() {
        const content = document.getElementById('page-content');
        if (content) {
            this.render().then(html => {
                content.innerHTML = html;
                // Draw charts after rendering
                setTimeout(() => {
                    this.drawComplianceChart();
                    this.drawJobsResultChart();
                    this.drawSessionStatsChart();
                    this.drawBackupSizesChart();
                    
                    // Redraw charts on window resize/zoom with debounce
                    let resizeTimeout;
                    const redrawCharts = () => {
                        clearTimeout(resizeTimeout);
                        resizeTimeout = setTimeout(() => {
                            this.drawComplianceChart();
                            this.drawJobsResultChart();
                            this.drawSessionStatsChart();
                            this.drawBackupSizesChart();
                        }, 150);
                    };
                    
                    // Use ResizeObserver for better performance
                    if (window.ResizeObserver) {
                        const chartsContainer = document.getElementById('page-content');
                        if (chartsContainer) {
                            const resizeObserver = new ResizeObserver(() => {
                                redrawCharts();
                            });
                            resizeObserver.observe(chartsContainer);
                            
                            // Also observe each canvas container individually
                            const canvasIds = ['complianceChart', 'jobsResultChart', 'sessionStatsChart', 'backupSizesChart'];
                            canvasIds.forEach(id => {
                                const canvas = document.getElementById(id);
                                if (canvas && canvas.parentElement) {
                                    resizeObserver.observe(canvas.parentElement);
                                }
                            });
                        }
                    } else {
                        // Fallback to window resize event
                        window.addEventListener('resize', redrawCharts);
                    }
                }, 100);
                setTimeout(() => {
                    this.drawInstancesChart();
                }, 200);
                
                // Make showJobDetails available globally
                window.veeamAuditorPage = this;
            });
        }
    }
    
    drawComplianceChart() {
        const canvas = document.getElementById('complianceChart');
        if (!canvas) return;
        
        const complianceSummary = this.reportData?.veeam?.complianceSummary;
        if (!complianceSummary) return;
        
        const container = canvas.parentElement;
        if (!container) return;
        
        const dpr = window.devicePixelRatio || 1;
        
        // Use 100% width to prevent layout thrashing
        canvas.style.width = '100%';
        canvas.style.height = '200px';
        
        const rect = canvas.getBoundingClientRect();
        const width = rect.width;
        
        canvas.width = width * dpr;
        canvas.height = 200 * dpr;
        
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        const height = 200;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Data - order matches the image: Passed, Unable to detect, Not Implemented, Suppressed
        const data = [
            { label: 'Passed', value: complianceSummary.passed || 0, color: '#10b981' },
            { label: 'Unable to detect', value: complianceSummary.unableToDetect || 0, color: '#fbbf24' },
            { label: 'Not Implemented', value: complianceSummary.notImplemented || 0, color: '#f87171' },
            { label: 'Suppressed', value: complianceSummary.suppressed || 0, color: '#94a3b8' }
        ];
        
        // Find max value for scaling
        const maxValue = Math.max(...data.map(d => d.value), 1);
        
        // Chart dimensions
        const padding = { top: 15, right: 15, bottom: 45, left: 35 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;
        const barWidth = Math.max(30, (chartWidth / data.length) - 8);
        const barSpacing = 8;
        
        // Draw bars
        data.forEach((item, index) => {
            const barHeight = (item.value / maxValue) * chartHeight;
            const x = padding.left + index * (barWidth + barSpacing) + barSpacing / 2;
            const y = padding.top + chartHeight - barHeight;
            
            // Draw bar
            ctx.fillStyle = item.color;
            ctx.fillRect(x, y, barWidth, barHeight);
            
            // Draw value label on top of bar
            if (item.value > 0) {
                ctx.fillStyle = '#e2e8f0';
                ctx.font = 'bold 11px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(item.value.toString(), x + barWidth / 2, y - 3);
            }
            
            // Draw label below bar
            ctx.fillStyle = '#cbd5e1';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            const labelY = padding.top + chartHeight + 8;
            // Split long labels
            const words = item.label.split(' ');
            if (words.length > 2) {
                ctx.fillText(words.slice(0, 2).join(' '), x + barWidth / 2, labelY);
                ctx.fillText(words.slice(2).join(' '), x + barWidth / 2, labelY + 12);
            } else {
                ctx.fillText(item.label, x + barWidth / 2, labelY);
            }
        });
        
        // Draw Y-axis
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, padding.top + chartHeight);
        ctx.stroke();
        
        // Draw Y-axis grid lines
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 0.5;
        ctx.setLineDash([2, 2]);
        const ySteps = 5;
        for (let i = 0; i <= ySteps; i++) {
            const y = padding.top + chartHeight - (i / ySteps) * chartHeight;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + chartWidth, y);
            ctx.stroke();
        }
        ctx.setLineDash([]);
        
        // Draw Y-axis labels
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px Arial';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 0; i <= ySteps; i++) {
            const value = Math.round((maxValue / ySteps) * i);
            const y = padding.top + chartHeight - (i / ySteps) * chartHeight;
            ctx.fillText(value.toString(), padding.left - 8, y);
        }
        
        // Draw Y-axis title
        ctx.save();
        ctx.translate(15, padding.top + chartHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Count', 0, 0);
        ctx.restore();
    }
    
    calculateTotalSize(jobs) {
        if (!jobs || jobs.length === 0) return '0 B';
        
        let totalBytes = 0;
        jobs.forEach(job => {
            if (job.SourceSize && job.SourceSize !== 'N/A') {
                const sizeStr = job.SourceSize.toUpperCase();
                const match = sizeStr.match(/([\d.]+)\s*(TB|GB|MB|KB|B)/);
                if (match) {
                    const value = parseFloat(match[1]);
                    const unit = match[2];
                    switch(unit) {
                        case 'TB': totalBytes += value * 1024 * 1024 * 1024 * 1024; break;
                        case 'GB': totalBytes += value * 1024 * 1024 * 1024; break;
                        case 'MB': totalBytes += value * 1024 * 1024; break;
                        case 'KB': totalBytes += value * 1024; break;
                        case 'B': totalBytes += value; break;
                    }
                }
            }
        });
        
        if (totalBytes >= 1024 * 1024 * 1024 * 1024) {
            return `${(totalBytes / (1024 * 1024 * 1024 * 1024)).toFixed(2)} TB`;
        } else if (totalBytes >= 1024 * 1024 * 1024) {
            return `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
        } else if (totalBytes >= 1024 * 1024) {
            return `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
        } else if (totalBytes >= 1024) {
            return `${(totalBytes / 1024).toFixed(2)} KB`;
        } else {
            return `${totalBytes} B`;
        }
    }
    
    drawInstancesChart() {
        const canvas = document.getElementById('instancesChart');
        if (!canvas) {
            return;
        }
        
        const license = this.reportData?.veeam?.license;
        if (!license) {
            return;
        }
        
        const container = canvas.parentElement;
        if (!container) {
            return;
        }
        
        // Wait for container to have dimensions
        const rect = container.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            setTimeout(() => this.drawInstancesChart(), 100);
            return;
        }
        
        const dpr = window.devicePixelRatio || 1;
        
        // Use 100% width/height to prevent layout thrashing
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        
        const canvasRect = canvas.getBoundingClientRect();
        const width = canvasRect.width;
        const height = canvasRect.height || 300;
        
        if (width <= 0 || height <= 0) return;
        
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Data
        const instancesCapacity = license.licensedInstances || 0;
        const usedInstances = license.usedInstances || 0;
        const newInstances = license.newInstances || 0;
        const rentalInstances = license.rentalInstances || 0;
        
        const data = [
            { label: 'Instances Capacity', value: instancesCapacity, color: '#3b82f6' },
            { label: 'Used Instances', value: usedInstances, color: '#10b981' },
            { label: 'New Instances', value: newInstances, color: '#f59e0b' },
            { label: 'Rental Instances', value: rentalInstances, color: '#8b5cf6' }
        ];
        
        // Find max value for scaling
        const maxValue = Math.max(...data.map(d => d.value), 1);
        
        // Chart dimensions
        const padding = { top: 20, right: 20, bottom: 40, left: 50 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;
        const barWidth = Math.max(40, (chartWidth / data.length) - 10);
        const barSpacing = 10;
        
        // Draw grid lines
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
        ctx.lineWidth = 1;
        const gridLines = 5;
        for (let i = 0; i <= gridLines; i++) {
            const y = padding.top + (chartHeight / gridLines) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + chartWidth, y);
            ctx.stroke();
            
            // Y-axis labels
            const value = maxValue - (maxValue / gridLines) * i;
            ctx.fillStyle = '#94a3b8';
            ctx.font = '10px Arial';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(Math.round(value).toString(), padding.left - 10, y);
        }
        
        // Draw bars
        data.forEach((item, index) => {
            const barHeight = (item.value / maxValue) * chartHeight;
            const x = padding.left + index * (barWidth + barSpacing) + barSpacing / 2;
            const y = padding.top + chartHeight - barHeight;
            
            // Draw bar
            ctx.fillStyle = item.color;
            ctx.fillRect(x, y, barWidth, barHeight);
            
            // Draw bar border with same color as bar (darker shade)
            const borderColor = item.color;
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, barWidth, barHeight);
            
            // Draw value on top of bar
            if (item.value > 0) {
                ctx.fillStyle = '#e2e8f0';
                ctx.font = 'bold 11px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(item.value.toString(), x + barWidth / 2, y - 5);
            }
            
            // Draw label below bar
            ctx.fillStyle = '#94a3b8';
            ctx.font = '9px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            const labelY = padding.top + chartHeight + 5;
            // Split long labels
            const words = item.label.split(' ');
            words.forEach((word, wordIndex) => {
                ctx.fillText(word, x + barWidth / 2, labelY + (wordIndex * 12));
            });
        });
        
        // Draw Y-axis label
        ctx.save();
        ctx.translate(15, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Instances', 0, 0);
        ctx.restore();
    }
    
    drawJobsResultChart() {
        const canvas = document.getElementById('jobsResultChart');
        if (!canvas) return;
        
        const veeam = this.reportData?.veeam;
        if (!veeam || !veeam.jobInfo) return;
        
        // Collect all jobs
        const allJobs = [];
        if (veeam.jobInfo.backupJobs && Array.isArray(veeam.jobInfo.backupJobs)) {
            allJobs.push(...veeam.jobInfo.backupJobs);
        }
        if (veeam.jobInfo.replicaJobs && Array.isArray(veeam.jobInfo.replicaJobs)) {
            allJobs.push(...veeam.jobInfo.replicaJobs);
        }
        if (veeam.jobInfo.fileCopyJobs && Array.isArray(veeam.jobInfo.fileCopyJobs)) {
            allJobs.push(...veeam.jobInfo.fileCopyJobs);
        }
        if (veeam.jobInfo.backupCopyJobs && Array.isArray(veeam.jobInfo.backupCopyJobs)) {
            allJobs.push(...veeam.jobInfo.backupCopyJobs);
        }
        if (veeam.jobInfo.fileBackupJobs && Array.isArray(veeam.jobInfo.fileBackupJobs)) {
            allJobs.push(...veeam.jobInfo.fileBackupJobs);
        }
        if (veeam.jobInfo.tapeJobs && Array.isArray(veeam.jobInfo.tapeJobs)) {
            allJobs.push(...veeam.jobInfo.tapeJobs);
        }
        
        // Count job results
        const resultCounts = { Success: 0, Warning: 0, Failed: 0, None: 0 };
        allJobs.forEach(job => {
            const lastResult = job.LastResult || job.lastResult || job.LastRunResult || 'None';
            if (lastResult === 'Success' || lastResult === 'Ok' || lastResult === 'success' || lastResult === 'Success' || lastResult === 0) {
                resultCounts.Success++;
            } else if (lastResult === 'Warning' || lastResult === 'warning' || lastResult === 'Warning' || lastResult === 1) {
                resultCounts.Warning++;
            } else if (lastResult === 'Failed' || lastResult === 'Error' || lastResult === 'failed' || lastResult === 'error' || lastResult === 'Failed' || lastResult === 2) {
                resultCounts.Failed++;
            } else {
                resultCounts.None++;
            }
        });
        
        const ctx = canvas.getContext('2d');
        
        // Get device pixel ratio for high DPI displays
        const dpr = window.devicePixelRatio || 1;
        
        // Use 100% width to fill container and prevent infinite growth loop
        canvas.style.width = '100%';
        canvas.style.height = '200px';
        
        // Get the actual display width from the canvas itself
        const rect = canvas.getBoundingClientRect();
        const displayWidth = Math.max(300, rect.width || canvas.clientWidth || 400);
        const displayHeight = 200;
        
        // Set internal canvas size accounting for device pixel ratio
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        
        // Scale context to account for device pixel ratio
        ctx.scale(dpr, dpr);
        
        // Enable better text rendering
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        
        const chartData = [
            { label: 'Success', value: resultCounts.Success, color: '#10b981' },
            { label: 'Warning', value: resultCounts.Warning, color: '#f59e0b' },
            { label: 'Failed', value: resultCounts.Failed, color: '#ef4444' },
            { label: 'None', value: resultCounts.None, color: '#64748b' }
        ];
        
        const maxValue = Math.max(...chartData.map(d => d.value), 1);
        // Calculate bar width and spacing to use available width better
        const minPadding = 20;
        const availableWidth = Math.max(300, displayWidth - (minPadding * 2)); // Ensure minimum width
        const totalBarSpacing = (chartData.length - 1) * 20; // 20px spacing between bars
        const calculatedBarWidth = (availableWidth - totalBarSpacing) / chartData.length;
        const barWidth = Math.max(40, Math.min(80, calculatedBarWidth)); // Min 40px, max 80px
        const barSpacing = 20;
        const chartHeight = 120;
        const chartWidth = chartData.length * barWidth + totalBarSpacing;
        // Ensure chartWidth doesn't exceed available space
        const maxChartWidth = displayWidth - (minPadding * 2);
        const finalChartWidth = Math.min(chartWidth, maxChartWidth);
        const padding = { top: 30, right: minPadding, bottom: 50, left: minPadding };
        
        // Calculate horizontal offset to center the chart - use full width
        // Center the chart within the available space
        const availableSpace = displayWidth - padding.left - padding.right;
        const chartOffsetX = Math.max(0, (availableSpace - finalChartWidth) / 2);
        const adjustedLeft = padding.left + chartOffsetX;
        
        // Clear canvas with transparent background
        ctx.clearRect(0, 0, displayWidth, displayHeight);
        
        // Draw grid lines
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        for (let i = 0; i <= 5; i++) {
            const y = padding.top + (chartHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(adjustedLeft, y);
            ctx.lineTo(adjustedLeft + finalChartWidth, y);
            ctx.stroke();
        }
        
        // Draw bars with better quality
        chartData.forEach((item, index) => {
            const x = adjustedLeft + index * (barWidth + barSpacing);
            const barHeight = (item.value / maxValue) * chartHeight;
            const y = padding.top + chartHeight - barHeight;
            
            // Draw bar with gradient for better appearance
            const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
            gradient.addColorStop(0, item.color);
            const darkerColor = this.darkenColor(item.color, 0.2);
            gradient.addColorStop(1, darkerColor);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, barWidth, barHeight);
            
            // Draw bar border
            ctx.strokeStyle = item.color;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, barWidth, barHeight);
            
            // Draw value on top with better font
            if (item.value > 0) {
                ctx.fillStyle = '#e2e8f0';
                ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(item.value.toString(), x + barWidth / 2, y - 8);
            }
            
            // Draw label with better font
            ctx.fillStyle = '#94a3b8';
            ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textBaseline = 'top';
            ctx.fillText(item.label, x + barWidth / 2, padding.top + chartHeight + 10);
        });
        
        // Draw axes with better quality
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(adjustedLeft, padding.top);
        ctx.lineTo(adjustedLeft, padding.top + chartHeight);
        ctx.lineTo(adjustedLeft + finalChartWidth, padding.top + chartHeight);
        ctx.stroke();
        
        // Draw Y-axis labels with better font
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 0; i <= 5; i++) {
            const value = (maxValue / 5) * i;
            const y = padding.top + chartHeight - (i / 5) * chartHeight;
            ctx.fillText(Math.round(value).toString(), adjustedLeft - 15, y);
        }
        
        // Draw Y-axis label
        ctx.save();
        ctx.translate(20, padding.top + chartHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Count', 0, 0);
        ctx.restore();
    }
    
    drawSessionStatsChart() {
        const canvas = document.getElementById('sessionStatsChart');
        if (!canvas) return;
        
        const veeam = this.reportData?.veeam;
        if (!veeam || !veeam.jobSessionSummary || !Array.isArray(veeam.jobSessionSummary) || veeam.jobSessionSummary.length === 0) {
            // Draw empty state
            const ctx = canvas.getContext('2d');
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            const displayWidth = rect.width || 400;
            const displayHeight = 200;
            canvas.width = displayWidth * dpr;
            canvas.height = displayHeight * dpr;
            canvas.style.width = displayWidth + 'px';
            canvas.style.height = displayHeight + 'px';
            ctx.scale(dpr, dpr);
            ctx.clearRect(0, 0, displayWidth, displayHeight);
            ctx.fillStyle = '#64748b';
            ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('No session data available', displayWidth / 2, displayHeight / 2);
            return;
        }
        
        // Calculate totals from jobSessionSummary
        const totals = {
            totalSessions: 0,
            fails: 0,
            retries: 0,
            successRate: 0
        };
        
        veeam.jobSessionSummary.forEach(job => {
            totals.totalSessions += job.TotalSessions || 0;
            totals.fails += job.Fails || 0;
            totals.retries += job.Retries || 0;
        });
        
        // Calculate success rate
        if (totals.totalSessions > 0) {
            totals.successRate = ((totals.totalSessions - totals.fails) / totals.totalSessions * 100);
        }
        
        const ctx = canvas.getContext('2d');
        
        // Get device pixel ratio for high DPI displays
        const dpr = window.devicePixelRatio || 1;
        
        // Use 100% width to fill container and prevent infinite growth loop
        canvas.style.width = '100%';
        canvas.style.height = '200px';
        
        // Get the actual display width from the canvas itself
        const rect = canvas.getBoundingClientRect();
        const displayWidth = Math.max(300, rect.width || canvas.clientWidth || 400);
        const displayHeight = 200;
        
        // Set internal canvas size accounting for device pixel ratio
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        
        // Scale context to account for device pixel ratio
        ctx.scale(dpr, dpr);
        
        // Enable better text rendering
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        
        const chartData = [
            { label: 'Total Sessions', value: totals.totalSessions, color: '#3b82f6' },
            { label: 'Fails', value: totals.fails, color: '#ef4444' },
            { label: 'Retries', value: totals.retries, color: '#f59e0b' },
            { label: 'Success Rate %', value: totals.successRate, color: '#10b981' }
        ];
        
        const maxValue = Math.max(...chartData.map(d => d.value), 1);
        // Calculate bar width and spacing to use available width better
        const minPadding = 20;
        const availableWidth = Math.max(300, displayWidth - (minPadding * 2)); // Ensure minimum width
        const totalBarSpacing = (chartData.length - 1) * 20; // 20px spacing between bars
        const calculatedBarWidth = (availableWidth - totalBarSpacing) / chartData.length;
        const barWidth = Math.max(40, Math.min(80, calculatedBarWidth)); // Min 40px, max 80px
        const barSpacing = 20;
        const chartHeight = 120;
        const chartWidth = chartData.length * barWidth + totalBarSpacing;
        // Ensure chartWidth doesn't exceed available space
        const maxChartWidth = displayWidth - (minPadding * 2);
        const finalChartWidth = Math.min(chartWidth, maxChartWidth);
        const padding = { top: 30, right: minPadding, bottom: 50, left: minPadding };
        
        // Calculate horizontal offset to center the chart - use full width
        // Center the chart within the available space
        const availableSpace = displayWidth - padding.left - padding.right;
        const chartOffsetX = Math.max(0, (availableSpace - finalChartWidth) / 2);
        const adjustedLeft = padding.left + chartOffsetX;
        
        // Clear canvas with transparent background
        ctx.clearRect(0, 0, displayWidth, displayHeight);
        
        // Draw grid lines
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        for (let i = 0; i <= 5; i++) {
            const y = padding.top + (chartHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(adjustedLeft, y);
            ctx.lineTo(adjustedLeft + finalChartWidth, y);
            ctx.stroke();
        }
        
        // Draw bars with better quality
        chartData.forEach((item, index) => {
            const x = adjustedLeft + index * (barWidth + barSpacing);
            const barHeight = (item.value / maxValue) * chartHeight;
            const y = padding.top + chartHeight - barHeight;
            
            // Draw bar with gradient for better appearance
            const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
            gradient.addColorStop(0, item.color);
            const darkerColor = this.darkenColor(item.color, 0.2);
            gradient.addColorStop(1, darkerColor);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, barWidth, barHeight);
            
            // Draw bar border
            ctx.strokeStyle = item.color;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, barWidth, barHeight);
            
            // Draw value on top with better font
            if (item.value > 0) {
                ctx.fillStyle = '#e2e8f0';
                ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                // Format value: for Success Rate, show percentage, otherwise show number
                const displayValue = item.label === 'Success Rate %' 
                    ? totals.successRate.toFixed(1) + '%' 
                    : item.value.toString();
                ctx.fillText(displayValue, x + barWidth / 2, y - 8);
            }
            
            // Draw label with better font
            ctx.fillStyle = '#94a3b8';
            ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textBaseline = 'top';
            // Wrap label if too long
            const label = item.label;
            const labelY = padding.top + chartHeight + 10;
            if (label.length > 12) {
                const words = label.split(' ');
                if (words.length > 1) {
                    ctx.fillText(words[0], x + barWidth / 2, labelY);
                    ctx.fillText(words.slice(1).join(' '), x + barWidth / 2, labelY + 15);
                } else {
                    ctx.fillText(label, x + barWidth / 2, labelY);
                }
            } else {
                ctx.fillText(label, x + barWidth / 2, labelY);
            }
        });
        
        // Draw axes with better quality
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(adjustedLeft, padding.top);
        ctx.lineTo(adjustedLeft, padding.top + chartHeight);
        ctx.lineTo(adjustedLeft + finalChartWidth, padding.top + chartHeight);
        ctx.stroke();
        
        // Draw Y-axis labels with better font
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 0; i <= 5; i++) {
            const value = (maxValue / 5) * i;
            const y = padding.top + chartHeight - (i / 5) * chartHeight;
            // Format value: if maxValue is > 100, show as number, otherwise show as percentage for Success Rate
            const displayValue = maxValue > 100 ? Math.round(value).toString() : value.toFixed(1);
            ctx.fillText(displayValue, Math.max(5, adjustedLeft - 8), y);
        }
        
        // Draw Y-axis label
        ctx.save();
        ctx.translate(10, padding.top + chartHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Value', 0, 0);
        ctx.restore();
    }
    
    drawBackupSizesChart() {
        const canvas = document.getElementById('backupSizesChart');
        if (!canvas) return;
        
        const veeam = this.reportData?.veeam;
        if (!veeam || !veeam.jobSessionSummary || !Array.isArray(veeam.jobSessionSummary) || veeam.jobSessionSummary.length === 0) {
            const ctx = canvas.getContext('2d');
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            const displayWidth = rect.width || 400;
            const displayHeight = 200;
            canvas.width = displayWidth * dpr;
            canvas.height = displayHeight * dpr;
            canvas.style.width = displayWidth + 'px';
            canvas.style.height = displayHeight + 'px';
            ctx.scale(dpr, dpr);
            ctx.clearRect(0, 0, displayWidth, displayHeight);
            ctx.fillStyle = '#64748b';
            ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('No session data available', displayWidth / 2, displayHeight / 2);
            return;
        }
        
        const totals = {
            avgBackupSize: 0,
            maxBackupSize: 0,
            avgDataSize: 0,
            maxDataSize: 0
        };
        
        veeam.jobSessionSummary.forEach(job => {
            totals.avgBackupSize += job.AvgBackupSize || 0;
            totals.maxBackupSize += job.MaxBackupSize || 0;
            totals.avgDataSize += job.AvgDataSize || 0;
            totals.maxDataSize += job.MaxDataSize || 0;
        });
        
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const displayWidth = rect.width || 400;
        const displayHeight = 200;
        
        if (displayWidth <= 0) return;
        
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        canvas.style.width = '100%';
        canvas.style.height = '200px';
        ctx.scale(dpr, dpr);
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        
        const chartData = [
            { label: 'Avg Backup', value: totals.avgBackupSize, color: '#3b82f6' },
            { label: 'Max Backup', value: totals.maxBackupSize, color: '#2563eb' },
            { label: 'Avg Data', value: totals.avgDataSize, color: '#10b981' },
            { label: 'Max Data', value: totals.maxDataSize, color: '#059669' }
        ];
        
        const maxValue = Math.max(...chartData.map(d => d.value), 1);
        // Calculate bar width and spacing to use available width better
        const minPadding = 20;
        const availableWidth = Math.max(300, displayWidth - (minPadding * 2)); // Ensure minimum width
        const totalBarSpacing = (chartData.length - 1) * 20; // 20px spacing between bars
        const calculatedBarWidth = (availableWidth - totalBarSpacing) / chartData.length;
        const barWidth = Math.max(40, Math.min(80, calculatedBarWidth)); // Min 40px, max 80px
        const barSpacing = 20;
        const chartHeight = 120;
        const chartWidth = chartData.length * barWidth + totalBarSpacing;
        // Ensure chartWidth doesn't exceed available space
        const maxChartWidth = displayWidth - (minPadding * 2);
        const finalChartWidth = Math.min(chartWidth, maxChartWidth);
        const padding = { top: 30, right: minPadding, bottom: 50, left: minPadding };
        
        // Calculate horizontal offset to center the chart - use full width
        // Center the chart within the available space
        const availableSpace = displayWidth - padding.left - padding.right;
        const chartOffsetX = Math.max(0, (availableSpace - finalChartWidth) / 2);
        const adjustedLeft = padding.left + chartOffsetX;
        
        // Clear canvas with transparent background
        ctx.clearRect(0, 0, displayWidth, displayHeight);
        
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        for (let i = 0; i <= 5; i++) {
            const y = padding.top + (chartHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(adjustedLeft, y);
            ctx.lineTo(adjustedLeft + finalChartWidth, y);
            ctx.stroke();
        }
        
        chartData.forEach((item, index) => {
            const x = adjustedLeft + index * (barWidth + barSpacing) + barSpacing;
            const barHeight = (item.value / maxValue) * chartHeight;
            const y = padding.top + chartHeight - barHeight;
            
            const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
            gradient.addColorStop(0, item.color);
            const darkerColor = this.darkenColor(item.color, 0.2);
            gradient.addColorStop(1, darkerColor);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, barWidth, barHeight);
            
            ctx.strokeStyle = item.color;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, barWidth, barHeight);
            
            if (item.value > 0) {
                ctx.fillStyle = '#e2e8f0';
                ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                const displayValue = item.value.toFixed(2) + ' TB';
                ctx.fillText(displayValue, x + barWidth / 2, y - 8);
            }
            
            ctx.fillStyle = '#94a3b8';
            ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textBaseline = 'top';
            const label = item.label;
            const labelY = padding.top + chartHeight + 10;
            if (label.length > 12) {
                const words = label.split(' ');
                if (words.length > 1) {
                    ctx.fillText(words[0], x + barWidth / 2, labelY);
                    ctx.fillText(words.slice(1).join(' '), x + barWidth / 2, labelY + 15);
                } else {
                    ctx.fillText(label, x + barWidth / 2, labelY);
                }
            } else {
                ctx.fillText(label, x + barWidth / 2, labelY);
            }
        });
        
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(adjustedLeft, padding.top);
        ctx.lineTo(adjustedLeft, padding.top + chartHeight);
        ctx.lineTo(adjustedLeft + finalChartWidth, padding.top + chartHeight);
        ctx.stroke();
        
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 0; i <= 5; i++) {
            const value = (maxValue / 5) * i;
            const y = padding.top + chartHeight - (i / 5) * chartHeight;
            const displayValue = value.toFixed(2) + ' TB';
            ctx.fillText(displayValue, Math.max(5, adjustedLeft - 8), y);
        }
        
        ctx.save();
        ctx.translate(20, padding.top + chartHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Size (TB)', 0, 0);
        ctx.restore();
    }
    
    darkenColor(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - Math.round(255 * amount));
        const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - Math.round(255 * amount));
        const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - Math.round(255 * amount));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    
    showJobDetails(jobDataEncoded) {
        try {
            const job = JSON.parse(decodeURIComponent(jobDataEncoded));
            const modal = document.getElementById('jobDetailsModal');
            const content = document.getElementById('jobDetailsContent');
            
            if (!modal || !content) return;
            
            // Update modal title with job name
            const modalTitle = modal.querySelector('h2');
            if (modalTitle) {
                modalTitle.textContent = `${job.Name || job.name || 'Job'} Details`;
            }
            
            // Helper function to format values
            const formatValue = (value) => {
                if (value === null || value === undefined || value === '') return 'N/A';
                if (typeof value === 'boolean') return value ? 'Yes' : 'No';
                if (typeof value === 'object') {
                    try {
                        return JSON.stringify(value, null, 2);
                    } catch {
                        return String(value);
                    }
                }
                return String(value);
            };
            
            const formatBoolean = (value) => {
                if (value === true || value === 'true' || value === 'True' || value === 1) return 'Yes';
                if (value === false || value === 'false' || value === 'False' || value === 0) return 'No';
                return 'N/A';
            };
            
            // Helper function to render a table section
            const renderTable = (properties) => {
                const rows = properties.map(p => {
                    const value = p.format === 'boolean' ? formatBoolean(job[p.key]) : formatValue(job[p.key]);
                    if (value === 'N/A' && !p.showIfEmpty) return '';
                    return `
                        <tr>
                            <td style="padding: 0.5rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${p.label}</td>
                            <td style="padding: 0.5rem; word-break: break-word; color: #e2e8f0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${value}</td>
                        </tr>
                    `;
                }).filter(h => h).join('');
                
                if (!rows) return '<div style="padding: 1rem; text-align: center; color: #94a3b8;">No data available.</div>';
                
                return `
                    <div class="audit-table-wrapper" style="width: 100%; max-width: 100%; margin: 0; padding: 0; overflow-x: auto;">
                        <table class="audit-table" style="width: 100%; min-width: 100%; table-layout: auto; font-size: 0.8rem;">
                            <thead>
                                <tr>
                                    <th style="padding: 0.5rem; text-align: left; font-size: 0.8rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1); width: 40%;">Property</th>
                                    <th style="padding: 0.5rem; text-align: left; font-size: 0.8rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows}
                            </tbody>
                        </table>
                    </div>
                `;
            };
            
            // Tab content functions
            const tabs = [];
            let tabContent = '';
            
            // Tab 1: Common Information
            const commonInfo = renderTable([
                { key: 'Name', label: 'Name' },
                { key: 'JobType', label: 'Type' },
                { key: 'SourceSize', label: 'Total Backup Size' },
                { key: 'TargetAddress', label: 'Target Address' },
                { key: 'TargetFile', label: 'Target File' },
                { key: 'Description', label: 'Description' },
                { key: 'ModifiedBy', label: 'Modified By' },
                { key: 'CreationTimeUTC', label: 'Created' },
                { key: 'LastResult', label: 'Last Result' },
                { key: 'LastRun', label: 'Last Run' },
                { key: 'LatestRunLocal', label: 'Latest Run (Local)' }
            ]);
            if (commonInfo && !commonInfo.includes('No data available')) {
                tabs.push({ id: 'common', label: 'Common Information', active: tabs.length === 0 });
                tabContent += `<div id="tab-common" class="tab-content" style="display: ${tabs.length === 1 ? 'block' : 'none'}; padding: 1rem 0;">${commonInfo}</div>`;
            }
            
            // Tab 2: Virtual Machines
            const vmsData = job.Objects || job.VMs || job.VMList || [];
            let vmsTable = '';
            if (Array.isArray(vmsData) && vmsData.length > 0) {
                vmsTable = `
                    <div class="audit-table-wrapper" style="width: 100%; max-width: 100%; margin: 0; padding: 0; overflow-x: auto;">
                        <table class="audit-table" style="width: 100%; min-width: 100%; table-layout: auto; font-size: 0.8rem;">
                            <thead>
                                <tr>
                                    <th style="padding: 0.5rem; text-align: left; font-size: 0.8rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Name</th>
                                    <th style="padding: 0.5rem; text-align: left; font-size: 0.8rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Resource Type</th>
                                    <th style="padding: 0.5rem; text-align: left; font-size: 0.8rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Role</th>
                                    <th style="padding: 0.5rem; text-align: left; font-size: 0.8rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Approx Size</th>
                                    <th style="padding: 0.5rem; text-align: left; font-size: 0.8rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Disk Filter Mode</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${vmsData.map(vm => `
                                    <tr>
                                        <td style="padding: 0.5rem; color: #e2e8f0;">${vm.Name || vm.name || 'N/A'}</td>
                                        <td style="padding: 0.5rem; color: #e2e8f0;">${vm.ResourceType || vm.resourceType || 'Virtual Machine'}</td>
                                        <td style="padding: 0.5rem; color: #e2e8f0;">${vm.Role || vm.role || 'Include'}</td>
                                        <td style="padding: 0.5rem; color: #e2e8f0;">${vm.ApproxSize || vm.approxSize || vm.Size || vm.size || 'N/A'}</td>
                                        <td style="padding: 0.5rem; color: #e2e8f0;">${vm.DiskFilterMode || vm.diskFilterMode || 'AllDisks'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            } else {
                vmsTable = '<div style="padding: 1rem; text-align: center; color: #94a3b8;">No virtual machines data available.</div>';
            }
            tabs.push({ id: 'vms', label: 'Virtual Machines', active: tabs.length === 0 && !commonInfo.includes('No data available') ? false : tabs.length === 0 });
            tabContent += `<div id="tab-vms" class="tab-content" style="display: ${tabs.length === 1 ? 'block' : 'none'}; padding: 1rem 0;">${vmsTable}</div>`;
            
            // Tab 3: Storage
            const storageInfo = renderTable([
                { key: 'BackupProxy', label: 'Backup Proxy' },
                { key: 'Repository', label: 'Backup Repository' },
                { key: 'TargetRepository', label: 'Target Repository' },
                { key: 'BackupRepository', label: 'Backup Repository' },
                { key: 'RetentionType', label: 'Retention Type' },
                { key: 'RetainDaysToKeep', label: 'Retain Days To Keep' },
                { key: 'RestorePoints', label: 'Restore Points' },
                { key: 'KeepFirstFullBackup', label: 'Keep First Full Backup', format: 'boolean' },
                { key: 'EnableFullBackup', label: 'Enable Full Backup', format: 'boolean' },
                { key: 'IntegrityChecks', label: 'Integrity Checks', format: 'boolean' },
                { key: 'StorageEncryption', label: 'Storage Encryption', format: 'boolean' },
                { key: 'Encrypted', label: 'Encrypted', format: 'boolean' },
                { key: 'BackupMode', label: 'Backup Mode' },
                { key: 'BackupChainType', label: 'Backup Chain Type' },
                { key: 'ActiveFullBackupScheduleKind', label: 'Active Full Backup Schedule Kind' },
                { key: 'ActiveFullBackupDays', label: 'Active Full Backup Days' },
                { key: 'TransformFullToSynthetic', label: 'Transform Full To Synthetic', format: 'boolean' },
                { key: 'TransformIncrementsToSynthetic', label: 'Transform Increments To Synthetic', format: 'boolean' },
                { key: 'TransformToSyntheticDays', label: 'Transform To Synthetic Days' },
                { key: 'GfsEnabled', label: 'Keep certain full backup longer for archival purposes (GFS)', format: 'boolean' },
                { key: 'GfsRetention', label: 'GFS Retention' }
            ]);
            if (storageInfo && !storageInfo.includes('No data available')) {
                tabs.push({ id: 'storage', label: 'Storage', active: false });
                tabContent += `<div id="tab-storage" class="tab-content" style="display: none; padding: 1rem 0;">${storageInfo}</div>`;
            }
            
            // Tab 4: Advanced Settings (Maintenance)
            const maintenanceInfo = renderTable([
                { key: 'StorageLevelCorruptionGuard', label: 'Storage-Level Corruption Guard (SLCG)', format: 'boolean' },
                { key: 'SlcgScheduleType', label: 'SLCG Schedule Type' },
                { key: 'SlcgScheduleDay', label: 'SLCG Schedule Day' },
                { key: 'SlcgBackupMonthlySchedule', label: 'SLCG Backup Monthly Schedule' },
                { key: 'DefragmentAndCompactFullBackup', label: 'Defragment and Compact Full Backup (DCFB)', format: 'boolean' },
                { key: 'DcfbScheduleType', label: 'DCFB Schedule Type' },
                { key: 'DcfbScheduleDay', label: 'DCFB Schedule Day' },
                { key: 'DcfbBackupMonthlySchedule', label: 'DCFB Backup Monthly Schedule' },
                { key: 'RemoveDeletedItemDataAfter', label: 'Remove deleted item data after' }
            ]);
            if (maintenanceInfo && !maintenanceInfo.includes('No data available')) {
                tabs.push({ id: 'maintenance', label: 'Advanced Settings (Maintenance)', active: false });
                tabContent += `<div id="tab-maintenance" class="tab-content" style="display: none; padding: 1rem 0;">${maintenanceInfo}</div>`;
            }
            
            // Tab 5: Advanced Settings (Storage)
            const storageAdvancedInfo = renderTable([
                { key: 'InlineDataDeduplication', label: 'Inline Data Deduplication', format: 'boolean' },
                { key: 'Deduplication', label: 'Deduplication', format: 'boolean' },
                { key: 'EnableDeduplication', label: 'Enable Deduplication', format: 'boolean' },
                { key: 'ExcludeSwapFilesBlock', label: 'Exclude Swap Files Block', format: 'boolean' },
                { key: 'ExcludeDeletedFilesBlock', label: 'Exclude Deleted Files Block', format: 'boolean' },
                { key: 'CompressionLevel', label: 'Compression Level' },
                { key: 'StorageOptimization', label: 'Storage optimization' },
                { key: 'BlockSize', label: 'Block Size' },
                { key: 'EnabledBackupFileEncryption', label: 'Enabled Backup File Encryption', format: 'boolean' },
                { key: 'EncryptionKey', label: 'Encryption Key' }
            ]);
            if (storageAdvancedInfo && !storageAdvancedInfo.includes('No data available')) {
                tabs.push({ id: 'storage-advanced', label: 'Advanced Settings (Storage)', active: false });
                tabContent += `<div id="tab-storage-advanced" class="tab-content" style="display: none; padding: 1rem 0;">${storageAdvancedInfo}</div>`;
            }
            
            // Tab 6: Advanced Settings (Notification)
            const notificationInfo = renderTable([
                { key: 'SendSnmpNotification', label: 'Send Snmp Notification', format: 'boolean' },
                { key: 'SendEmailNotification', label: 'Send Email Notification', format: 'boolean' },
                { key: 'EmailNotificationAdditionalAddresses', label: 'Email Notification Additional Addresses' },
                { key: 'EmailNotifyTime', label: 'Email Notify Time' },
                { key: 'UseCustomEmailNotificationOptions', label: 'Use Custom Email Notification Options', format: 'boolean' },
                { key: 'UseCustomNotificationSetting', label: 'Use Custom Notification Setting' },
                { key: 'NotifyOnSuccess', label: 'Notify On Success', format: 'boolean' },
                { key: 'NotifyOnWarning', label: 'Notify On Warning', format: 'boolean' },
                { key: 'NotifyOnError', label: 'Notify On Error', format: 'boolean' },
                { key: 'SuppressNotificationUntilLastRetry', label: 'Suppress Notification until Last Retry', format: 'boolean' },
                { key: 'SetResultsToVmNotes', label: 'Set Results To Vm Notes', format: 'boolean' },
                { key: 'VmAttributeNoteValue', label: 'VM Attribute Note Value' },
                { key: 'AppendToExistingAttribute', label: 'Append to Existing Attribute', format: 'boolean' }
            ]);
            if (notificationInfo && !notificationInfo.includes('No data available')) {
                tabs.push({ id: 'notification', label: 'Advanced Settings (Notification)', active: false });
                tabContent += `<div id="tab-notification" class="tab-content" style="display: none; padding: 1rem 0;">${notificationInfo}</div>`;
            }
            
            // Tab 7: Advanced Settings (vSphere)
            const vsphereInfo = renderTable([
                { key: 'EnableVmwareToolsQuiescence', label: 'Enable VMware Tools Quiescence', format: 'boolean' },
                { key: 'UseChangeBlockTracking', label: 'Use Change Block Tracking', format: 'boolean' },
                { key: 'EnableCbtForAllProtectedVms', label: 'Enable CBT for all protected VMs', format: 'boolean' },
                { key: 'ResetCbtOnEachActiveFullBackup', label: 'Reset CBT On each Active Full Backup', format: 'boolean' }
            ]);
            if (vsphereInfo && !vsphereInfo.includes('No data available')) {
                tabs.push({ id: 'vsphere', label: 'Advanced Settings (vSphere)', active: false });
                tabContent += `<div id="tab-vsphere" class="tab-content" style="display: none; padding: 1rem 0;">${vsphereInfo}</div>`;
            }
            
            // Tab 8: Advanced Settings (Script)
            const scriptInfo = renderTable([
                { key: 'RunTheFollowingScriptBefore', label: 'Run the Following Script Before', format: 'boolean' },
                { key: 'RunScriptBeforeTheJob', label: 'Run Script Before the Job' },
                { key: 'RunTheFollowingScriptAfter', label: 'Run the Following Script After', format: 'boolean' },
                { key: 'RunScriptAfterTheJob', label: 'Run Script After the Job' },
                { key: 'RunScriptFrequency', label: 'Run Script Frequency' },
                { key: 'RunScriptEveryBackupSession', label: 'Run Script Every Backup Session' }
            ]);
            if (scriptInfo && !scriptInfo.includes('No data available')) {
                tabs.push({ id: 'script', label: 'Advanced Settings (Script)', active: false });
                tabContent += `<div id="tab-script" class="tab-content" style="display: none; padding: 1rem 0;">${scriptInfo}</div>`;
            }
            
            // Tab 9: Guest Processing
            const guestProcessingData = vmsData.filter(vm => {
                // Include if GuestProcessingEnabled is true, or if any guest processing property exists
                return vm.GuestProcessingEnabled === true || 
                       vm.GuestProcessingEnabled !== undefined ||
                       vm.DefaultCredential || vm.defaultCredential ||
                       vm.ObjectCredential || vm.objectCredential ||
                       vm.ApplicationProcessing !== undefined ||
                       vm.TransactionLogs || vm.transactionLogs ||
                       vm.FileExclusions !== undefined ||
                       vm.Scripts !== undefined;
            });
            let guestProcessingTable = '';
            if (guestProcessingData.length > 0 || vmsData.length > 0) {
                guestProcessingTable = guestProcessingData.map(vm => {
                    const formatBool = (val) => {
                        if (val === true || val === 'true' || val === 'True' || val === 1) return 'Yes';
                        if (val === false || val === 'false' || val === 'False' || val === 0) return 'No';
                        return 'N/A';
                    };
                    
                    return `
                        <div style="margin-bottom: 2rem;">
                            <h4 style="color: #e2e8f0; font-size: 0.9rem; margin-bottom: 0.75rem; font-weight: 600; padding-bottom: 0.5rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                                ${vm.Name || vm.name || 'N/A'}
                            </h4>
                            <div class="audit-table-wrapper" style="width: 100%; max-width: 100%; margin: 0; padding: 0; overflow-x: auto;">
                                <table class="audit-table" style="width: 100%; min-width: 100%; table-layout: auto; font-size: 0.8rem;">
                                    <thead>
                                        <tr>
                                            <th style="padding: 0.5rem; text-align: left; font-size: 0.8rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1); width: 40%;">Property</th>
                                            <th style="padding: 0.5rem; text-align: left; font-size: 0.8rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td style="padding: 0.5rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Name</td>
                                            <td style="padding: 0.5rem; color: #e2e8f0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${vm.Name || vm.name || 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 0.5rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Enabled</td>
                                            <td style="padding: 0.5rem; color: #e2e8f0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${formatBool(vm.GuestProcessingEnabled)}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 0.5rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Resource Type</td>
                                            <td style="padding: 0.5rem; color: #e2e8f0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${vm.ResourceType || vm.resourceType || 'Virtual Machine'}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 0.5rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Ignore Errors</td>
                                            <td style="padding: 0.5rem; color: #e2e8f0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${formatBool(vm.GuestProcessingIgnoreErrors)}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 0.5rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Guest Proxy Auto Detect</td>
                                            <td style="padding: 0.5rem; color: #e2e8f0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${formatBool(vm.GuestProxyAutoDetect)}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 0.5rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Default Credential</td>
                                            <td style="padding: 0.5rem; color: #e2e8f0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${vm.DefaultCredential || vm.defaultCredential || 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 0.5rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Object Credential</td>
                                            <td style="padding: 0.5rem; color: #e2e8f0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${vm.ObjectCredential || vm.objectCredential || 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 0.5rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Application Processing</td>
                                            <td style="padding: 0.5rem; color: #e2e8f0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${formatBool(vm.ApplicationProcessing)}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 0.5rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Transaction Logs</td>
                                            <td style="padding: 0.5rem; color: #e2e8f0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${vm.TransactionLogs || vm.transactionLogs || 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 0.5rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Use Persistent Guest Agent</td>
                                            <td style="padding: 0.5rem; color: #e2e8f0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${formatBool(vm.UsePersistentGuestAgent)}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 0.5rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">SQL Transaction Logs Processing</td>
                                            <td style="padding: 0.5rem; color: #e2e8f0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${vm.SqlTransactionLogsProcessing || vm.sqlTransactionLogsProcessing || 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 0.5rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">SQL Backup Log Every</td>
                                            <td style="padding: 0.5rem; color: #e2e8f0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${vm.SqlBackupLogEvery || vm.sqlBackupLogEvery || 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 0.5rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">SQL Retain Log Backups</td>
                                            <td style="padding: 0.5rem; color: #e2e8f0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${vm.SqlRetainLogBackups || vm.sqlRetainLogBackups || 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 0.5rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Oracle Account Type</td>
                                            <td style="padding: 0.5rem; color: #e2e8f0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${vm.OracleAccountType || vm.oracleAccountType || 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 0.5rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Oracle Sysdba Creds</td>
                                            <td style="padding: 0.5rem; color: #e2e8f0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${vm.OracleSysdbaCreds || vm.oracleSysdbaCreds || 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 0.5rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Oracle Backup Logs Every</td>
                                            <td style="padding: 0.5rem; color: #e2e8f0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${vm.OracleBackupLogsEvery || vm.oracleBackupLogsEvery || 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 0.5rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Oracle Archive Logs</td>
                                            <td style="padding: 0.5rem; color: #e2e8f0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${vm.OracleArchiveLogs || vm.oracleArchiveLogs || 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 0.5rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Oracle Retain Log Backups</td>
                                            <td style="padding: 0.5rem; color: #e2e8f0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${vm.OracleRetainLogBackups || vm.oracleRetainLogBackups || 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 0.5rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">File Exclusions</td>
                                            <td style="padding: 0.5rem; color: #e2e8f0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${formatBool(vm.FileExclusions)}</td>
                                        </tr>
                                        ${vm.FileExclusions ? `
                                        <tr>
                                            <td style="padding: 0.5rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${vm.FileExclusionsMode || vm.fileExclusionsMode || 'Exclude/Include the following file and folders'}</td>
                                            <td style="padding: 0.5rem; color: #e2e8f0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${vm.FileExclusionsPaths || vm.fileExclusionsPaths || 'N/A'}</td>
                                        </tr>
                                        ` : ''}
                                        <tr>
                                            <td style="padding: 0.5rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Scripts</td>
                                            <td style="padding: 0.5rem; color: #e2e8f0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${formatBool(vm.Scripts)}</td>
                                        </tr>
                                        ${vm.Scripts ? `
                                        <tr>
                                            <td style="padding: 0.5rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Scripts Mode</td>
                                            <td style="padding: 0.5rem; color: #e2e8f0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${vm.ScriptsMode || vm.scriptsMode || 'N/A'}</td>
                                        </tr>
                                        ${vm.LinuxPreFreezeScript && vm.LinuxPreFreezeScript !== 'N/A' ? `
                                        <tr>
                                            <td style="padding: 0.5rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Linux Pre-freeze script</td>
                                            <td style="padding: 0.5rem; color: #e2e8f0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${vm.LinuxPreFreezeScript || vm.linuxPreFreezeScript || 'N/A'}</td>
                                        </tr>
                                        ` : ''}
                                        ${vm.LinuxPostThawScript && vm.LinuxPostThawScript !== 'N/A' ? `
                                        <tr>
                                            <td style="padding: 0.5rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Linux Post-thaw script</td>
                                            <td style="padding: 0.5rem; color: #e2e8f0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${vm.LinuxPostThawScript || vm.linuxPostThawScript || 'N/A'}</td>
                                        </tr>
                                        ` : ''}
                                        ${vm.WindowsPreFreezeScript && vm.WindowsPreFreezeScript !== 'N/A' ? `
                                        <tr>
                                            <td style="padding: 0.5rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Windows Pre-freeze script</td>
                                            <td style="padding: 0.5rem; color: #e2e8f0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${vm.WindowsPreFreezeScript || vm.windowsPreFreezeScript || 'N/A'}</td>
                                        </tr>
                                        ` : ''}
                                        ${vm.WindowsPostThawScript && vm.WindowsPostThawScript !== 'N/A' ? `
                                        <tr>
                                            <td style="padding: 0.5rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Windows Post-thaw script</td>
                                            <td style="padding: 0.5rem; color: #e2e8f0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${vm.WindowsPostThawScript || vm.windowsPostThawScript || 'N/A'}</td>
                                        </tr>
                                        ` : ''}
                                        ` : ''}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `;
                }).join('');
            } else if (vmsData.length > 0) {
                // Show all VMs even if guest processing data is not available
                guestProcessingTable = vmsData.map(vm => {
                    const formatBool = (val) => {
                        if (val === true || val === 'true' || val === 'True' || val === 1) return 'Yes';
                        if (val === false || val === 'false' || val === 'False' || val === 0) return 'No';
                        return 'N/A';
                    };
                    
                    return `
                        <div style="margin-bottom: 2rem;">
                            <h4 style="color: #e2e8f0; font-size: 0.9rem; margin-bottom: 0.75rem; font-weight: 600; padding-bottom: 0.5rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                                ${vm.Name || vm.name || 'N/A'}
                            </h4>
                            <div class="audit-table-wrapper" style="width: 100%; max-width: 100%; margin: 0; padding: 0; overflow-x: auto;">
                                <table class="audit-table" style="width: 100%; min-width: 100%; table-layout: auto; font-size: 0.8rem;">
                                    <thead>
                                        <tr>
                                            <th style="padding: 0.5rem; text-align: left; font-size: 0.8rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1); width: 40%;">Property</th>
                                            <th style="padding: 0.5rem; text-align: left; font-size: 0.8rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td style="padding: 0.5rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Name</td>
                                            <td style="padding: 0.5rem; color: #e2e8f0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${vm.Name || vm.name || 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 0.5rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Enabled</td>
                                            <td style="padding: 0.5rem; color: #e2e8f0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${formatBool(vm.GuestProcessingEnabled)}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 0.5rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Resource Type</td>
                                            <td style="padding: 0.5rem; color: #e2e8f0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${vm.ResourceType || vm.resourceType || 'Virtual Machine'}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                guestProcessingTable = '<div style="padding: 1rem; text-align: center; color: #94a3b8;">No guest processing data available.</div>';
            }
            if (vmsData.length > 0) {
                tabs.push({ id: 'guest-processing', label: 'Guest Processing', active: false });
                tabContent += `<div id="tab-guest-processing" class="tab-content" style="display: none; padding: 1rem 0;">${guestProcessingTable}</div>`;
            }
            
            // Tab 10: Secondary Target
            const secondaryTargetData = job.SecondaryTarget || job.SecondaryTargets || [];
            let secondaryTargetTable = '';
            if (Array.isArray(secondaryTargetData) && secondaryTargetData.length > 0) {
                secondaryTargetTable = `
                    <div class="audit-table-wrapper" style="width: 100%; max-width: 100%; margin: 0; padding: 0; overflow-x: auto;">
                        <table class="audit-table" style="width: 100%; min-width: 100%; table-layout: auto; font-size: 0.8rem;">
                            <thead>
                                <tr>
                                    <th style="padding: 0.5rem; text-align: left; font-size: 0.8rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Job Name</th>
                                    <th style="padding: 0.5rem; text-align: left; font-size: 0.8rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Type</th>
                                    <th style="padding: 0.5rem; text-align: left; font-size: 0.8rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">State</th>
                                    <th style="padding: 0.5rem; text-align: left; font-size: 0.8rem; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${secondaryTargetData.map(target => `
                                    <tr>
                                        <td style="padding: 0.5rem; color: #e2e8f0;">${target.Name || target.name || 'N/A'}</td>
                                        <td style="padding: 0.5rem; color: #e2e8f0;">${target.Type || target.type || 'N/A'}</td>
                                        <td style="padding: 0.5rem; color: #e2e8f0;">${target.State || target.state || 'N/A'}</td>
                                        <td style="padding: 0.5rem; color: #e2e8f0;">${target.Description || target.description || 'N/A'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            } else {
                secondaryTargetTable = '<div style="padding: 1rem; text-align: center; color: #94a3b8;">No secondary target data available.</div>';
            }
            tabs.push({ id: 'secondary', label: 'Secondary Target', active: false });
            tabContent += `<div id="tab-secondary" class="tab-content" style="display: none; padding: 1rem 0;">${secondaryTargetTable}</div>`;
            
            // Build tabs HTML
            const tabsHtml = `
                <div style="border-bottom: 1px solid #334155; margin-bottom: 1rem;">
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                        ${tabs.map((tab, index) => `
                            <button 
                                onclick="if(window.veeamAuditorPage){window.veeamAuditorPage.switchJobDetailsTab('${tab.id}')}"
                                class="job-details-tab"
                                data-tab="${tab.id}"
                                style="
                                    padding: 0.5rem 1rem;
                                    background: ${tab.active ? '#3b82f6' : 'transparent'};
                                    color: ${tab.active ? '#ffffff' : '#94a3b8'};
                                    border: none;
                                    border-bottom: 2px solid ${tab.active ? '#3b82f6' : 'transparent'};
                                    cursor: pointer;
                                    font-size: 0.85rem;
                                    font-weight: ${tab.active ? '600' : '400'};
                                    transition: all 0.2s;
                                "
                                onmouseover="if(!this.classList.contains('active')){this.style.color='#e2e8f0';}"
                                onmouseout="if(!this.classList.contains('active')){this.style.color='#94a3b8';}"
                            >
                                ${tab.label}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
            
            const html = tabsHtml + tabContent;
            
            content.innerHTML = html || '<div style="padding: 2rem; text-align: center; color: #94a3b8;">No job details available.</div>';
            modal.style.display = 'block';
            
            // Close modal when clicking outside
            modal.onclick = (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            };
        } catch (error) {
            console.error('Error showing job details:', error);
        }
    }
    
    switchJobDetailsTab(tabId) {
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = 'none';
        });
        
        // Remove active class from all tabs
        document.querySelectorAll('.job-details-tab').forEach(tab => {
            tab.style.background = 'transparent';
            tab.style.color = '#94a3b8';
            tab.style.borderBottomColor = 'transparent';
            tab.style.fontWeight = '400';
            tab.classList.remove('active');
        });
        
        // Show selected tab content
        const selectedContent = document.getElementById(`tab-${tabId}`);
        if (selectedContent) {
            selectedContent.style.display = 'block';
        }
        
        // Activate selected tab
        const selectedTab = document.querySelector(`[data-tab="${tabId}"]`);
        if (selectedTab) {
            selectedTab.style.background = '#3b82f6';
            selectedTab.style.color = '#ffffff';
            selectedTab.style.borderBottomColor = '#3b82f6';
            selectedTab.style.fontWeight = '600';
            selectedTab.classList.add('active');
        }
    }

    showJobSessionsModal(jobIndex) {
        try {
            const veeam = this.reportData?.veeam;
            if (!veeam || !veeam.jobSessionSummary || !veeam.jobSessionSummary[jobIndex]) {
                console.error('Job session data not found');
                return;
            }

            const job = veeam.jobSessionSummary[jobIndex];
            const sessions = job.Sessions || [];

            // Create or get modal
            let modal = document.getElementById('jobSessionsModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'jobSessionsModal';
                modal.className = 'modal';
                modal.style.cssText = 'display: none; position: fixed; z-index: 10000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.7);';
                document.body.appendChild(modal);
            }

            const modalContent = `
                <div style="background-color: #0f172a; margin: 2% auto; padding: 0; border: 1px solid #334155; width: 95%; max-width: 1400px; border-radius: 0.5rem; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column;">
                    <div style="padding: 1rem; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; background: #1e293b;">
                        <h2 style="color: #e2e8f0; font-size: 1.25rem; font-weight: 600; margin: 0;">
                            <i class="fas fa-list-alt" style="color: #8b5cf6; margin-right: 0.5rem;"></i>
                            Job Sessions: ${job.JobName || 'N/A'}
                        </h2>
                        <button onclick="document.getElementById('jobSessionsModal').style.display='none'" style="background: transparent; border: none; color: #94a3b8; font-size: 1.5rem; cursor: pointer; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">&times;</button>
                    </div>
                    <div style="padding: 1rem; overflow-y: auto; flex: 1;">
                        ${sessions.length > 0 ? `
                            <div class="audit-table-wrapper" style="width: 100%; margin: 0; padding: 0; overflow-x: auto;">
                                <table class="audit-table" style="width: 100%; min-width: 100%; table-layout: auto; font-size: 0.75rem;">
                                    <thead>
                                        <tr>
                                            <th style="padding: 0.5rem; text-align: left; font-size: 0.75rem;">Result</th>
                                            <th style="padding: 0.5rem; text-align: left; font-size: 0.75rem;">Reason</th>
                                            <th style="padding: 0.5rem; text-align: left; font-size: 0.75rem;">Message</th>
                                            <th style="padding: 0.5rem; text-align: left; font-size: 0.75rem;">Creation Time</th>
                                            <th style="padding: 0.5rem; text-align: left; font-size: 0.75rem;">End Time</th>
                                            <th style="padding: 0.5rem; text-align: center; font-size: 0.75rem;">Duration</th>
                                            <th style="padding: 0.5rem; text-align: left; font-size: 0.75rem;">State</th>
                                            <th style="padding: 0.5rem; text-align: center; font-size: 0.75rem;">Backup Size (TB)</th>
                                            <th style="padding: 0.5rem; text-align: center; font-size: 0.75rem;">Data Size (TB)</th>
                                            <th style="padding: 0.5rem; text-align: center; font-size: 0.75rem;">Change Rate %</th>
                                            <th style="padding: 0.5rem; text-align: center; font-size: 0.75rem;">Is Retry</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${sessions.map(session => {
                                            const result = session.Result || 'None';
                                            const resultLower = result.toLowerCase();
                                            const resultColor = resultLower === 'success' || resultLower === '0' ? '#10b981' : 
                                                               resultLower === 'warning' || resultLower === '1' ? '#f59e0b' : 
                                                               resultLower === 'failed' || resultLower === 'error' || resultLower === 'failure' || resultLower === '2' ? '#ef4444' : '#94a3b8';
                                            
                                            // Only show reason and message for failed or warning sessions
                                            const showReasonMessage = resultLower === 'failed' || resultLower === 'error' || resultLower === 'failure' || resultLower === 'warning' || resultLower === '2' || resultLower === '1';
                                            const reason = session.Reason || session.reason || 'N/A';
                                            const message = session.Message || session.message || 'N/A';
                                            
                                            return `
                                                <tr>
                                                    <td style="padding: 0.5rem;">
                                                        <span style="color: ${resultColor}; font-weight: 500;">${result}</span>
                                                    </td>
                                                    <td style="padding: 0.5rem; max-width: 200px; word-wrap: break-word; ${showReasonMessage && reason !== 'N/A' ? 'color: #f59e0b;' : 'color: #94a3b8;'}">
                                                        ${showReasonMessage ? reason : '-'}
                                                    </td>
                                                    <td style="padding: 0.5rem; max-width: 300px; word-wrap: break-word; ${showReasonMessage && message !== 'N/A' ? 'color: #ef4444;' : 'color: #94a3b8;'}">
                                                        ${showReasonMessage ? message : '-'}
                                                    </td>
                                                    <td style="padding: 0.5rem;">${session.CreationTime || 'N/A'}</td>
                                                    <td style="padding: 0.5rem;">${session.EndTime || 'N/A'}</td>
                                                    <td style="padding: 0.5rem; text-align: center;">${session.Duration || '00:00:00'}</td>
                                                    <td style="padding: 0.5rem;">${session.State || 'N/A'}</td>
                                                    <td style="padding: 0.5rem; text-align: center;">${(session.BackupSize || 0).toFixed(4)}</td>
                                                    <td style="padding: 0.5rem; text-align: center;">${(session.DataSize || 0).toFixed(4)}</td>
                                                    <td style="padding: 0.5rem; text-align: center;">${(session.ChangeRate || 0).toFixed(2)}</td>
                                                    <td style="padding: 0.5rem; text-align: center;">
                                                        ${session.IsRetry ? '<i class="fas fa-check-circle" style="color: #10b981;"></i>' : '<i class="fas fa-times-circle" style="color: #64748b;"></i>'}
                                                    </td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        ` : `
                            <div style="text-align: center; padding: 2rem; color: #94a3b8;">
                                <i class="fas fa-info-circle" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                                <p>No sessions found for this job.</p>
                            </div>
                        `}
                    </div>
                </div>
            `;

            modal.innerHTML = modalContent;
            modal.style.display = 'block';

            // Close modal when clicking outside
            modal.onclick = (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            };
        } catch (error) {
            console.error('Error showing job sessions modal:', error);
        }
    }
}

