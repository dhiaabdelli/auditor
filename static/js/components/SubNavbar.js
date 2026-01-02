export class SubNavbar {
    constructor() {
        this.currentLanguage = localStorage.getItem('language') || 'en';
        this.translations = {
            en: {
                networkTools: 'Network',
                cryptoTools: 'Crypto',
                webTools: 'Web',
                developmentTools: 'Development',
                documentation: 'Documentation',
                infrastructureDiagram: 'Infrastructure Diagram',
                todoManager: 'To-Do Manager',
                hypervAuditor: 'Hyper-V',
                esxiAuditor: 'ESXi',
                vsphereAuditor: 'vSphere',
                windowsAuditor: 'Windows',
                fileShareAuditor: 'File Share',
                veeamAuditor: 'Veeam',
                activeDirectoryAuditor: 'Active Directory',
                ssh: 'SSH',
                sftp: 'SFTP',
                ftp: 'FTP',
                powershell: 'PowerShell',
                rdp: 'RDP',
                telnet: 'Telnet',
                database: 'SQL Client',
                hyperv: 'Hyper-V',
                vmwareVsphere: 'vSphere',
                vmwareEsxi: 'ESXi',
                kvm: 'KVM',
                proxmox: 'Proxmox',
                xen: 'Xen',
                virtualbox: 'VirtualBox'
            },
            fr: {
                networkTools: 'Réseau',
                cryptoTools: 'Crypto',
                webTools: 'Web',
                developmentTools: 'Développement',
                documentation: 'Documentation',
                infrastructureDiagram: 'Diagramme d\'Infrastructure',
                todoManager: 'Gestionnaire de Tâches',
                hypervAuditor: 'Hyper-V',
                esxiAuditor: 'ESXi',
                vsphereAuditor: 'vSphere',
                windowsAuditor: 'Windows',
                fileShareAuditor: 'Partage de Fichiers',
                veeamAuditor: 'Veeam',
                activeDirectoryAuditor: 'Active Directory',
                ssh: 'SSH',
                sftp: 'SFTP',
                ftp: 'FTP',
                powershell: 'PowerShell',
                rdp: 'RDP',
                telnet: 'Telnet',
                database: 'Client SQL',
                hyperv: 'Hyper-V',
                vmwareVsphere: 'vSphere',
                vmwareEsxi: 'ESXi',
                kvm: 'KVM',
                proxmox: 'Proxmox',
                xen: 'Xen',
                virtualbox: 'VirtualBox'
            }
        };
    }

    t(key) {
        return this.translations[this.currentLanguage][key] || key;
    }

    /**
     * Get the sub-navbar configuration for a given page
     * Returns null if the page doesn't have a sub-navbar
     */
    getSubNavbarConfig(pageId) {

        // Tools section sub-navbar
        const toolsPages = {
            'subnet-calculator': {
                group: 'tools',
                items: [
                    { id: 'subnet-calculator', label: this.t('networkTools'), icon: 'fa-network-wired', active: true },
                    { id: 'crypto-tools', label: this.t('cryptoTools'), icon: 'fa-key', active: false },
                    { id: 'web-tools', label: this.t('webTools'), icon: 'fa-globe', active: false },
                    { id: 'development-tools', label: this.t('developmentTools'), icon: 'fa-code', active: false }
                ]
            },
            'crypto-tools': {
                group: 'tools',
                items: [
                    { id: 'subnet-calculator', label: this.t('networkTools'), icon: 'fa-network-wired', active: false },
                    { id: 'crypto-tools', label: this.t('cryptoTools'), icon: 'fa-key', active: true },
                    { id: 'web-tools', label: this.t('webTools'), icon: 'fa-globe', active: false },
                    { id: 'development-tools', label: this.t('developmentTools'), icon: 'fa-code', active: false }
                ]
            },
            'web-tools': {
                group: 'tools',
                items: [
                    { id: 'subnet-calculator', label: this.t('networkTools'), icon: 'fa-network-wired', active: false },
                    { id: 'crypto-tools', label: this.t('cryptoTools'), icon: 'fa-key', active: false },
                    { id: 'web-tools', label: this.t('webTools'), icon: 'fa-globe', active: true },
                    { id: 'development-tools', label: this.t('developmentTools'), icon: 'fa-code', active: false }
                ]
            },
            'development-tools': {
                group: 'tools',
                items: [
                    { id: 'subnet-calculator', label: this.t('networkTools'), icon: 'fa-network-wired', active: false },
                    { id: 'crypto-tools', label: this.t('cryptoTools'), icon: 'fa-key', active: false },
                    { id: 'web-tools', label: this.t('webTools'), icon: 'fa-globe', active: false },
                    { id: 'development-tools', label: this.t('developmentTools'), icon: 'fa-code', active: true }
                ]
            }
        };

        // No productivity subnavbar - all apps are standalone now

        // Auditor section sub-navbar
        const auditorPages = {
            'hyperv-auditor': {
                group: 'auditor',
                items: [
                    { id: 'hyperv-auditor-list', label: this.t('hypervAuditor'), icon: 'fa-server', active: true },
                    { id: 'esxi-auditor', label: this.t('esxiAuditor'), icon: 'fa-server', active: false },
                    { id: 'vsphere-auditor', label: this.t('vsphereAuditor'), icon: 'fa-cloud', active: false },
                    { id: 'windows-server-auditor-list', label: this.t('windowsAuditor'), icon: 'fa-windows', active: false },
                    { id: 'file-share-auditor-list', label: this.t('fileShareAuditor'), icon: 'fa-folder-open', active: false },
                    { id: 'veeam-auditor-list', label: this.t('veeamAuditor'), icon: 'fa-cloud-upload-alt', active: false },
                    { id: 'active-directory-auditor', label: this.t('activeDirectoryAuditor'), icon: 'fa-sitemap', active: false }
                ]
            },
            'hyperv-auditor-list': {
                group: 'auditor',
                items: [
                    { id: 'hyperv-auditor-list', label: this.t('hypervAuditor'), icon: 'fa-server', active: true },
                    { id: 'esxi-auditor', label: this.t('esxiAuditor'), icon: 'fa-server', active: false },
                    { id: 'vsphere-auditor', label: this.t('vsphereAuditor'), icon: 'fa-cloud', active: false },
                    { id: 'windows-server-auditor-list', label: this.t('windowsAuditor'), icon: 'fa-windows', active: false },
                    { id: 'file-share-auditor-list', label: this.t('fileShareAuditor'), icon: 'fa-folder-open', active: false },
                    { id: 'veeam-auditor-list', label: this.t('veeamAuditor'), icon: 'fa-cloud-upload-alt', active: false },
                    { id: 'active-directory-auditor', label: this.t('activeDirectoryAuditor'), icon: 'fa-sitemap', active: false }
                ]
            },
            'hyperv-auditor-details': {
                group: 'auditor',
                items: [
                    { id: 'hyperv-auditor-list', label: this.t('hypervAuditor'), icon: 'fa-server', active: true },
                    { id: 'esxi-auditor', label: this.t('esxiAuditor'), icon: 'fa-server', active: false },
                    { id: 'vsphere-auditor', label: this.t('vsphereAuditor'), icon: 'fa-cloud', active: false },
                    { id: 'windows-server-auditor-list', label: this.t('windowsAuditor'), icon: 'fa-windows', active: false },
                    { id: 'file-share-auditor-list', label: this.t('fileShareAuditor'), icon: 'fa-folder-open', active: false },
                    { id: 'veeam-auditor-list', label: this.t('veeamAuditor'), icon: 'fa-cloud-upload-alt', active: false },
                    { id: 'active-directory-auditor', label: this.t('activeDirectoryAuditor'), icon: 'fa-sitemap', active: false }
                ]
            },
            'esxi-auditor': {
                group: 'auditor',
                items: [
                    { id: 'hyperv-auditor-list', label: this.t('hypervAuditor'), icon: 'fa-server', active: false },
                    { id: 'esxi-auditor', label: this.t('esxiAuditor'), icon: 'fa-server', active: true },
                    { id: 'vsphere-auditor', label: this.t('vsphereAuditor'), icon: 'fa-cloud', active: false },
                    { id: 'windows-server-auditor-list', label: this.t('windowsAuditor'), icon: 'fa-windows', active: false },
                    { id: 'file-share-auditor-list', label: this.t('fileShareAuditor'), icon: 'fa-folder-open', active: false },
                    { id: 'veeam-auditor-list', label: this.t('veeamAuditor'), icon: 'fa-cloud-upload-alt', active: false },
                    { id: 'active-directory-auditor', label: this.t('activeDirectoryAuditor'), icon: 'fa-sitemap', active: false }
                ]
            },
            'vsphere-auditor': {
                group: 'auditor',
                items: [
                    { id: 'hyperv-auditor-list', label: this.t('hypervAuditor'), icon: 'fa-server', active: false },
                    { id: 'esxi-auditor', label: this.t('esxiAuditor'), icon: 'fa-server', active: false },
                    { id: 'vsphere-auditor', label: this.t('vsphereAuditor'), icon: 'fa-cloud', active: true },
                    { id: 'windows-server-auditor-list', label: this.t('windowsAuditor'), icon: 'fa-windows', active: false },
                    { id: 'file-share-auditor-list', label: this.t('fileShareAuditor'), icon: 'fa-folder-open', active: false },
                    { id: 'veeam-auditor-list', label: this.t('veeamAuditor'), icon: 'fa-cloud-upload-alt', active: false },
                    { id: 'active-directory-auditor', label: this.t('activeDirectoryAuditor'), icon: 'fa-sitemap', active: false }
                ]
            },
            'windows-auditor': {
                group: 'auditor',
                items: [
                    { id: 'hyperv-auditor-list', label: this.t('hypervAuditor'), icon: 'fa-server', active: false },
                    { id: 'esxi-auditor', label: this.t('esxiAuditor'), icon: 'fa-server', active: false },
                    { id: 'vsphere-auditor', label: this.t('vsphereAuditor'), icon: 'fa-cloud', active: false },
                    { id: 'windows-server-auditor-list', label: this.t('windowsAuditor'), icon: 'fa-windows', active: false },
                    { id: 'file-share-auditor-list', label: this.t('fileShareAuditor'), icon: 'fa-folder-open', active: false },
                    { id: 'veeam-auditor-list', label: this.t('veeamAuditor'), icon: 'fa-cloud-upload-alt', active: false },
                    { id: 'active-directory-auditor', label: this.t('activeDirectoryAuditor'), icon: 'fa-sitemap', active: false }
                ]
            },
            'windows-server-auditor-list': {
                group: 'auditor',
                items: [
                    { id: 'hyperv-auditor-list', label: this.t('hypervAuditor'), icon: 'fa-server', active: false },
                    { id: 'esxi-auditor', label: this.t('esxiAuditor'), icon: 'fa-server', active: false },
                    { id: 'vsphere-auditor', label: this.t('vsphereAuditor'), icon: 'fa-cloud', active: false },
                    { id: 'windows-server-auditor-list', label: this.t('windowsAuditor'), icon: 'fa-windows', active: true },
                    { id: 'file-share-auditor-list', label: this.t('fileShareAuditor'), icon: 'fa-folder-open', active: false },
                    { id: 'veeam-auditor-list', label: this.t('veeamAuditor'), icon: 'fa-cloud-upload-alt', active: false },
                    { id: 'active-directory-auditor', label: this.t('activeDirectoryAuditor'), icon: 'fa-sitemap', active: false }
                ]
            },
            'windows-server-auditor-details': {
                group: 'auditor',
                items: [
                    { id: 'hyperv-auditor-list', label: this.t('hypervAuditor'), icon: 'fa-server', active: false },
                    { id: 'esxi-auditor', label: this.t('esxiAuditor'), icon: 'fa-server', active: false },
                    { id: 'vsphere-auditor', label: this.t('vsphereAuditor'), icon: 'fa-cloud', active: false },
                    { id: 'windows-server-auditor-list', label: this.t('windowsAuditor'), icon: 'fa-windows', active: false },
                    { id: 'file-share-auditor-list', label: this.t('fileShareAuditor'), icon: 'fa-folder-open', active: false },
                    { id: 'veeam-auditor-list', label: this.t('veeamAuditor'), icon: 'fa-cloud-upload-alt', active: false },
                    { id: 'active-directory-auditor', label: this.t('activeDirectoryAuditor'), icon: 'fa-sitemap', active: false }
                ]
            },
            'file-share-auditor': {
                group: 'auditor',
                items: [
                    { id: 'hyperv-auditor-list', label: this.t('hypervAuditor'), icon: 'fa-server', active: false },
                    { id: 'esxi-auditor', label: this.t('esxiAuditor'), icon: 'fa-server', active: false },
                    { id: 'vsphere-auditor', label: this.t('vsphereAuditor'), icon: 'fa-cloud', active: false },
                    { id: 'windows-server-auditor-list', label: this.t('windowsAuditor'), icon: 'fa-windows', active: false },
                    { id: 'file-share-auditor-list', label: this.t('fileShareAuditor'), icon: 'fa-folder-open', active: true },
                    { id: 'veeam-auditor-list', label: this.t('veeamAuditor'), icon: 'fa-cloud-upload-alt', active: false },
                    { id: 'active-directory-auditor', label: this.t('activeDirectoryAuditor'), icon: 'fa-sitemap', active: false }
                ]
            },
            'file-share-auditor-list': {
                group: 'auditor',
                items: [
                    { id: 'hyperv-auditor-list', label: this.t('hypervAuditor'), icon: 'fa-server', active: false },
                    { id: 'esxi-auditor', label: this.t('esxiAuditor'), icon: 'fa-server', active: false },
                    { id: 'vsphere-auditor', label: this.t('vsphereAuditor'), icon: 'fa-cloud', active: false },
                    { id: 'windows-server-auditor-list', label: this.t('windowsAuditor'), icon: 'fa-windows', active: false },
                    { id: 'file-share-auditor-list', label: this.t('fileShareAuditor'), icon: 'fa-folder-open', active: true },
                    { id: 'veeam-auditor-list', label: this.t('veeamAuditor'), icon: 'fa-cloud-upload-alt', active: false },
                    { id: 'active-directory-auditor', label: this.t('activeDirectoryAuditor'), icon: 'fa-sitemap', active: false }
                ]
            },
            'file-share-auditor-details': {
                group: 'auditor',
                items: [
                    { id: 'hyperv-auditor-list', label: this.t('hypervAuditor'), icon: 'fa-server', active: false },
                    { id: 'esxi-auditor', label: this.t('esxiAuditor'), icon: 'fa-server', active: false },
                    { id: 'vsphere-auditor', label: this.t('vsphereAuditor'), icon: 'fa-cloud', active: false },
                    { id: 'windows-server-auditor-list', label: this.t('windowsAuditor'), icon: 'fa-windows', active: false },
                    { id: 'file-share-auditor-list', label: this.t('fileShareAuditor'), icon: 'fa-folder-open', active: false },
                    { id: 'veeam-auditor-list', label: this.t('veeamAuditor'), icon: 'fa-cloud-upload-alt', active: false },
                    { id: 'active-directory-auditor', label: this.t('activeDirectoryAuditor'), icon: 'fa-sitemap', active: false }
                ]
            },
            'active-directory-auditor': {
                group: 'auditor',
                items: [
                    { id: 'hyperv-auditor-list', label: this.t('hypervAuditor'), icon: 'fa-server', active: false },
                    { id: 'esxi-auditor', label: this.t('esxiAuditor'), icon: 'fa-server', active: false },
                    { id: 'vsphere-auditor', label: this.t('vsphereAuditor'), icon: 'fa-cloud', active: false },
                    { id: 'windows-server-auditor-list', label: this.t('windowsAuditor'), icon: 'fa-windows', active: false },
                    { id: 'file-share-auditor-list', label: this.t('fileShareAuditor'), icon: 'fa-folder-open', active: false },
                    { id: 'veeam-auditor-list', label: this.t('veeamAuditor'), icon: 'fa-cloud-upload-alt', active: false },
                    { id: 'active-directory-auditor', label: this.t('activeDirectoryAuditor'), icon: 'fa-sitemap', active: true }
                ]
            },
            'veeam-auditor-list': {
                group: 'auditor',
                items: [
                    { id: 'hyperv-auditor-list', label: this.t('hypervAuditor'), icon: 'fa-server', active: false },
                    { id: 'esxi-auditor', label: this.t('esxiAuditor'), icon: 'fa-server', active: false },
                    { id: 'vsphere-auditor', label: this.t('vsphereAuditor'), icon: 'fa-cloud', active: false },
                    { id: 'windows-server-auditor-list', label: this.t('windowsAuditor'), icon: 'fa-windows', active: false },
                    { id: 'file-share-auditor-list', label: this.t('fileShareAuditor'), icon: 'fa-folder-open', active: false },
                    { id: 'veeam-auditor-list', label: this.t('veeamAuditor'), icon: 'fa-cloud-upload-alt', active: true },
                    { id: 'active-directory-auditor', label: this.t('activeDirectoryAuditor'), icon: 'fa-sitemap', active: false }
                ]
            },
            'veeam-auditor-details': {
                group: 'auditor',
                items: [
                    { id: 'hyperv-auditor-list', label: this.t('hypervAuditor'), icon: 'fa-server', active: false },
                    { id: 'esxi-auditor', label: this.t('esxiAuditor'), icon: 'fa-server', active: false },
                    { id: 'vsphere-auditor', label: this.t('vsphereAuditor'), icon: 'fa-cloud', active: false },
                    { id: 'windows-server-auditor-list', label: this.t('windowsAuditor'), icon: 'fa-windows', active: false },
                    { id: 'file-share-auditor-list', label: this.t('fileShareAuditor'), icon: 'fa-folder-open', active: false },
                    { id: 'veeam-auditor-list', label: this.t('veeamAuditor'), icon: 'fa-cloud-upload-alt', active: false },
                    { id: 'active-directory-auditor', label: this.t('activeDirectoryAuditor'), icon: 'fa-sitemap', active: false }
                ]
            }
        };

        // Remote section sub-navbar
        const remotePages = {
            'remote': {
                group: 'remote',
                items: [
                    { id: 'ssh-client', label: this.t('ssh'), icon: 'fa-terminal', active: true },
                    { id: 'sftp-client', label: this.t('sftp'), icon: 'fa-cloud', active: false },
                    { id: 'ftp-client', label: this.t('ftp'), icon: 'fa-folder-open', active: false },
                    { id: 'powershell-remote', label: this.t('powershell'), icon: 'fa-code', active: false },
                    { id: 'telnet-client', label: this.t('telnet'), icon: 'fa-network-wired', active: false },
                    { id: 'database-client', label: this.t('database'), icon: 'fa-database', active: false }
                ]
            },
            'ssh-client': {
                group: 'remote',
                items: [
                    { id: 'ssh-client', label: this.t('ssh'), icon: 'fa-terminal', active: true },
                    { id: 'sftp-client', label: this.t('sftp'), icon: 'fa-cloud', active: false },
                    { id: 'ftp-client', label: this.t('ftp'), icon: 'fa-folder-open', active: false },
                    { id: 'powershell-remote', label: this.t('powershell'), icon: 'fa-code', active: false },
                    { id: 'telnet-client', label: this.t('telnet'), icon: 'fa-network-wired', active: false },
                    { id: 'database-client', label: this.t('database'), icon: 'fa-database', active: false }
                ]
            },
            'sftp-client': {
                group: 'remote',
                items: [
                    { id: 'ssh-client', label: this.t('ssh'), icon: 'fa-terminal', active: false },
                    { id: 'sftp-client', label: this.t('sftp'), icon: 'fa-cloud', active: true },
                    { id: 'ftp-client', label: this.t('ftp'), icon: 'fa-folder-open', active: false },
                    { id: 'powershell-remote', label: this.t('powershell'), icon: 'fa-code', active: false },
                    { id: 'telnet-client', label: this.t('telnet'), icon: 'fa-network-wired', active: false },
                    { id: 'database-client', label: this.t('database'), icon: 'fa-database', active: false }
                ]
            },
            'ftp-client': {
                group: 'remote',
                items: [
                    { id: 'ssh-client', label: this.t('ssh'), icon: 'fa-terminal', active: false },
                    { id: 'sftp-client', label: this.t('sftp'), icon: 'fa-cloud', active: false },
                    { id: 'ftp-client', label: this.t('ftp'), icon: 'fa-folder-open', active: true },
                    { id: 'powershell-remote', label: this.t('powershell'), icon: 'fa-code', active: false },
                    { id: 'telnet-client', label: this.t('telnet'), icon: 'fa-network-wired', active: false },
                    { id: 'database-client', label: this.t('database'), icon: 'fa-database', active: false }
                ]
            },
            'powershell-remote': {
                group: 'remote',
                items: [
                    { id: 'ssh-client', label: this.t('ssh'), icon: 'fa-terminal', active: false },
                    { id: 'sftp-client', label: this.t('sftp'), icon: 'fa-cloud', active: false },
                    { id: 'ftp-client', label: this.t('ftp'), icon: 'fa-folder-open', active: false },
                    { id: 'powershell-remote', label: this.t('powershell'), icon: 'fa-code', active: true },
                    { id: 'telnet-client', label: this.t('telnet'), icon: 'fa-network-wired', active: false },
                    { id: 'database-client', label: this.t('database'), icon: 'fa-database', active: false }
                ]
            },
            'telnet-client': {
                group: 'remote',
                items: [
                    { id: 'ssh-client', label: this.t('ssh'), icon: 'fa-terminal', active: false },
                    { id: 'sftp-client', label: this.t('sftp'), icon: 'fa-cloud', active: false },
                    { id: 'ftp-client', label: this.t('ftp'), icon: 'fa-folder-open', active: false },
                    { id: 'powershell-remote', label: this.t('powershell'), icon: 'fa-code', active: false },
                    { id: 'telnet-client', label: this.t('telnet'), icon: 'fa-network-wired', active: true },
                    { id: 'database-client', label: this.t('database'), icon: 'fa-database', active: false }
                ]
            },
            'database-client': {
                group: 'remote',
                items: [
                    { id: 'ssh-client', label: this.t('ssh'), icon: 'fa-terminal', active: false },
                    { id: 'sftp-client', label: this.t('sftp'), icon: 'fa-cloud', active: false },
                    { id: 'ftp-client', label: this.t('ftp'), icon: 'fa-folder-open', active: false },
                    { id: 'powershell-remote', label: this.t('powershell'), icon: 'fa-code', active: false },
                    { id: 'telnet-client', label: this.t('telnet'), icon: 'fa-network-wired', active: false },
                    { id: 'database-client', label: this.t('database'), icon: 'fa-database', active: true }
                ]
            }
        };

        // Manager section sub-navbar
        const managerPages = {
            'hyperv': {
                group: 'manager',
                items: [
                    { id: 'hyperv', label: this.t('hyperv'), icon: 'fa-server', active: true },
                    { id: 'vmware-vsphere', label: this.t('vmwareVsphere'), icon: 'fa-cloud', active: false },
                    { id: 'vmware-esxi', label: this.t('vmwareEsxi'), icon: 'fa-server', active: false },
                    { id: 'kvm', label: this.t('kvm'), icon: 'fa-cube', active: false },
                    { id: 'proxmox', label: this.t('proxmox'), icon: 'fa-cubes', active: false },
                    { id: 'xen', label: this.t('xen'), icon: 'fa-layer-group', active: false },
                    { id: 'virtualbox', label: this.t('virtualbox'), icon: 'fa-box', active: false }
                ]
            },
            'vmware-vsphere': {
                group: 'manager',
                items: [
                    { id: 'hyperv', label: this.t('hyperv'), icon: 'fa-server', active: false },
                    { id: 'vmware-vsphere', label: this.t('vmwareVsphere'), icon: 'fa-cloud', active: true },
                    { id: 'vmware-esxi', label: this.t('vmwareEsxi'), icon: 'fa-server', active: false },
                    { id: 'kvm', label: this.t('kvm'), icon: 'fa-cube', active: false },
                    { id: 'proxmox', label: this.t('proxmox'), icon: 'fa-cubes', active: false },
                    { id: 'xen', label: this.t('xen'), icon: 'fa-layer-group', active: false },
                    { id: 'virtualbox', label: this.t('virtualbox'), icon: 'fa-box', active: false }
                ]
            },
            'vmware-esxi': {
                group: 'manager',
                items: [
                    { id: 'hyperv', label: this.t('hyperv'), icon: 'fa-server', active: false },
                    { id: 'vmware-vsphere', label: this.t('vmwareVsphere'), icon: 'fa-cloud', active: false },
                    { id: 'vmware-esxi', label: this.t('vmwareEsxi'), icon: 'fa-server', active: true },
                    { id: 'kvm', label: this.t('kvm'), icon: 'fa-cube', active: false },
                    { id: 'proxmox', label: this.t('proxmox'), icon: 'fa-cubes', active: false },
                    { id: 'xen', label: this.t('xen'), icon: 'fa-layer-group', active: false },
                    { id: 'virtualbox', label: this.t('virtualbox'), icon: 'fa-box', active: false }
                ]
            },
            'kvm': {
                group: 'manager',
                items: [
                    { id: 'hyperv', label: this.t('hyperv'), icon: 'fa-server', active: false },
                    { id: 'vmware-vsphere', label: this.t('vmwareVsphere'), icon: 'fa-cloud', active: false },
                    { id: 'vmware-esxi', label: this.t('vmwareEsxi'), icon: 'fa-server', active: false },
                    { id: 'kvm', label: this.t('kvm'), icon: 'fa-cube', active: true },
                    { id: 'proxmox', label: this.t('proxmox'), icon: 'fa-cubes', active: false },
                    { id: 'xen', label: this.t('xen'), icon: 'fa-layer-group', active: false },
                    { id: 'virtualbox', label: this.t('virtualbox'), icon: 'fa-box', active: false }
                ]
            },
            'proxmox': {
                group: 'manager',
                items: [
                    { id: 'hyperv', label: this.t('hyperv'), icon: 'fa-server', active: false },
                    { id: 'vmware-vsphere', label: this.t('vmwareVsphere'), icon: 'fa-cloud', active: false },
                    { id: 'vmware-esxi', label: this.t('vmwareEsxi'), icon: 'fa-server', active: false },
                    { id: 'kvm', label: this.t('kvm'), icon: 'fa-cube', active: false },
                    { id: 'proxmox', label: this.t('proxmox'), icon: 'fa-cubes', active: true },
                    { id: 'xen', label: this.t('xen'), icon: 'fa-layer-group', active: false },
                    { id: 'virtualbox', label: this.t('virtualbox'), icon: 'fa-box', active: false }
                ]
            },
            'xen': {
                group: 'manager',
                items: [
                    { id: 'hyperv', label: this.t('hyperv'), icon: 'fa-server', active: false },
                    { id: 'vmware-vsphere', label: this.t('vmwareVsphere'), icon: 'fa-cloud', active: false },
                    { id: 'vmware-esxi', label: this.t('vmwareEsxi'), icon: 'fa-server', active: false },
                    { id: 'kvm', label: this.t('kvm'), icon: 'fa-cube', active: false },
                    { id: 'proxmox', label: this.t('proxmox'), icon: 'fa-cubes', active: false },
                    { id: 'xen', label: this.t('xen'), icon: 'fa-layer-group', active: true },
                    { id: 'virtualbox', label: this.t('virtualbox'), icon: 'fa-box', active: false }
                ]
            },
            'virtualbox': {
                group: 'manager',
                items: [
                    { id: 'hyperv', label: this.t('hyperv'), icon: 'fa-server', active: false },
                    { id: 'vmware-vsphere', label: this.t('vmwareVsphere'), icon: 'fa-cloud', active: false },
                    { id: 'vmware-esxi', label: this.t('vmwareEsxi'), icon: 'fa-server', active: false },
                    { id: 'kvm', label: this.t('kvm'), icon: 'fa-cube', active: false },
                    { id: 'proxmox', label: this.t('proxmox'), icon: 'fa-cubes', active: false },
                    { id: 'xen', label: this.t('xen'), icon: 'fa-layer-group', active: false },
                    { id: 'virtualbox', label: this.t('virtualbox'), icon: 'fa-box', active: true }
                ]
            }
        };

        // Monitoring section sub-navbar
        const monitoringPages = {
            'activity-log': {
                group: 'monitoring',
                items: [
                    { id: 'activity-log', label: 'Activity Logs', icon: 'fa-list', active: true },
                    { id: 'activity-log-sessions', label: 'Sessions', icon: 'fa-users', active: false }
                ]
            },
            'activity-log-sessions': {
                group: 'monitoring',
                items: [
                    { id: 'activity-log', label: 'Activity Logs', icon: 'fa-list', active: false },
                    { id: 'activity-log-sessions', label: 'Sessions', icon: 'fa-users', active: true }
                ]
            }
        };

        return toolsPages[pageId] || auditorPages[pageId] || remotePages[pageId] || managerPages[pageId] || monitoringPages[pageId] || null;
    }

    /**
     * Render the sub-navbar for a given page
     */
    render(pageId) {
        const config = this.getSubNavbarConfig(pageId);
        
        if (!config) {
            return '';
        }

        return `
            <div class="sub-navbar" data-group="${config.group}">
                <div class="sub-navbar-container">
                    <div class="sub-navbar-items">
                        ${config.items.map(item => {
                            // Use 'fab' for brand icons (like fa-windows), 'fas' for others
                            const iconClass = item.icon === 'fa-windows' ? 'fab' : 'fas';
                            return `
                            <button 
                                class="sub-navbar-item ${item.active ? 'active' : ''}" 
                                data-page="${item.id}"
                                data-label="${item.label}"
                                data-tab-id="${item.tabId || ''}"
                                onclick="subNavbarInstance.handleDiagnosticsNavigation(event, '${item.id}', '${item.label}', '${item.tabId || ''}')"
                            >
                                <i class="${iconClass} ${item.icon}"></i>
                                <span>${item.label}</span>
                            </button>
                        `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Handle navigation for page tabs
     */
    handleDiagnosticsNavigation(event, pageId, label, tabId = '') {
        // Navigate to the page
        this.navigateTo(pageId);
    }

    /**
     * Navigate to a sub-app page
     */
    navigateTo(pageId) {
        if (window.appInstance) {
            window.appInstance.navigateTo(pageId);
        }
    }


    /**
     * Update the active state based on current page
     */
    updateActive(pageId) {
        const subNavbar = document.querySelector('.sub-navbar');
        if (!subNavbar) {
            return;
        }

        const items = subNavbar.querySelectorAll('.sub-navbar-item');
        items.forEach(item => {
            const itemPageId = item.getAttribute('data-page');
            if (itemPageId === pageId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    /**
     * Update language
     */
    setLanguage(lang) {
        this.currentLanguage = lang;
        // Re-render if sub-navbar is visible
        const subNavbar = document.querySelector('.sub-navbar');
        if (subNavbar) {
            const pageId = window.appInstance?.currentPage || '';
            const newHTML = this.render(pageId);
            if (newHTML) {
                subNavbar.outerHTML = newHTML;
                // Re-attach event listeners
                this.attachEventListeners();
            }
        }
    }

    /**
     * Attach event listeners to sub-navbar items
     */
    attachEventListeners() {
        const items = document.querySelectorAll('.sub-navbar-item');
        items.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const pageId = item.getAttribute('data-page');
                const label = item.getAttribute('data-label');
                this.handleDiagnosticsNavigation(e, pageId, label);
            });
        });
    }
}

// Global instance for onclick handlers
window.subNavbarInstance = null;
