export class AppsPage {
    constructor(onNavigate) {
        this.onNavigate = onNavigate;
        this.currentLanguage = localStorage.getItem('language') || 'en';
        this.translations = {
            en: {
                // App titles
                hypervManager: 'Hyper-V Manager',
                hypervReport: 'Hyper-V Auditor',
                documentation: 'Documentation',
                todoManager: 'To-Do Manager',
                infrastructureDiagram: 'Infrastructure Diagram',
                sshClient: 'SSH Client',
                sftpClient: 'SFTP Client',
                ipScanner: 'IP Scanner',
                packetAnalyzer: 'Packet Analyzer',
                reportTemplates: 'Reports',
                infrastructureInventory: 'Infrastructure Inventory',
                scriptGenerator: 'Script Generator',
                batchGenerator: 'Batch Generator',
                // App descriptions
                hypervManagerDesc: 'Manage Hyper-V virtual machines, hosts, and clusters',
                hypervReportDesc: 'Audit and analyze Hyper-V clusters and hosts',
                documentationDesc: 'Access system documentation and guides',
                todoManagerDesc: 'Manage tasks, projects, and team collaboration',
                infrastructureDiagramDesc: 'Create and manage infrastructure diagrams',
                sshClientDesc: 'Connect to remote servers via SSH',
                sftpClientDesc: 'Transfer files securely via SFTP',
                networkToolsDesc: 'Diagnose, troubleshoot, and analyze network connectivity and performance',
                ipScannerDesc: 'Scan IP ranges to discover active hosts, open ports, and network devices',
                packetAnalyzerDesc: 'Capture and analyze network packets in real-time with protocol decoding',
                reportTemplatesDesc: 'Create and manage document templates for automated report generation',
                infrastructureInventoryDesc: 'Generate comprehensive infrastructure documentation in Excel format',
                scriptGeneratorDesc: 'Generate PowerShell and batch scripts',
                batchGeneratorDesc: 'Create and manage batch operations',
                subnetCalculator: 'Network Tools',
                subnetCalculatorDesc: 'IPv4 subnet calculator, converter, range expander, MAC lookup and generator',
                cryptoTools: 'Crypto Tools',
                cryptoToolsDesc: 'RSA key pairs, password strength, HMAC, encryption, hashing, and more',
                webTools: 'Web Tools',
                webToolsDesc: 'OTP generator, JWT parser, keycode info, JSON diff and basic auth',
                developmentTools: 'Development Tools',
                developmentToolsDesc: 'Crontab generator, JSON/SQL/XML formatter, chmod calculator, Docker converter',
                automation: 'Automation',
                automationDesc: 'Create automated workflows with visual flow builder',
                healthMonitor: 'Health Monitor',
                healthMonitorDesc: 'Monitor the health and status of all application services',
                // Sections
                tools: 'Tools',
                toolsDesc: 'Network, Crypto, Web, and Development tools',
                documentation: 'Documentation',
                documentationDesc: 'Access system documentation and guides',
                auditor: 'Auditor',
                auditorDesc: 'Hyper-V, ESXi, vSphere, Windows, and Active Directory auditing and analysis tools',
                manager: 'Manager',
                managerDesc: 'Manage Hyper-V, VMware, KVM, Proxmox, and other virtualization platforms',
                remote: 'Remote',
                remoteDesc: 'SSH, SFTP, FTP, PowerShell, and other remote connection tools',
                crypto: 'Crypto',
                development: 'Development',
                infrastructure: 'Infrastructure Management',
                reporting: 'Reporting & Analysis',
                networking: 'Network & Connectivity',
                // Language
                language: 'Language',
                languageEnglish: 'English',
                languageFrench: 'French',
                // Page header
                pageSubtitle: 'Choose your tool to streamline and optimize your infrastructure management'
            },
            fr: {
                // App titles
                hypervManager: 'Gestionnaire Hyper-V',
                hypervReport: 'Auditeur Hyper-V',
                documentation: 'Documentation',
                todoManager: 'Gestionnaire de Tâches',
                infrastructureDiagram: 'Diagramme d\'Infrastructure',
                sshClient: 'Client SSH',
                networkTools: 'Outils Réseau',
                scriptGenerator: 'Générateur de Scripts',
                batchGenerator: 'Générateur de Lots',
                // App descriptions
                hypervManagerDesc: 'Gérer les machines virtuelles, hôtes et clusters Hyper-V',
                hypervReportDesc: 'Auditer et analyser les clusters et hôtes Hyper-V',
                documentationDesc: 'Accéder à la documentation système et aux guides',
                todoManagerDesc: 'Gérer les tâches, projets et collaboration d\'équipe',
                infrastructureDiagramDesc: 'Créer et gérer les diagrammes d\'infrastructure',
                sshClientDesc: 'Se connecter aux serveurs distants via SSH',
                sftpClientDesc: 'Transférer des fichiers en toute sécurité via SFTP',
                networkToolsDesc: 'Outils complets de diagnostic et d\'analyse réseau',
                ipScanner: 'Scanner IP',
                ipScannerDesc: 'Scanner des plages d\'adresses IP pour découvrir les hôtes actifs, ports ouverts et périphériques réseau',
                packetAnalyzer: 'Analyseur de Paquets',
                packetAnalyzerDesc: 'Capturer et analyser les paquets réseau en temps réel avec décodage de protocole',
                reportTemplatesDesc: 'Créer et gérer des modèles de documents pour la génération automatique de rapports',
                infrastructureInventoryDesc: 'Générer une documentation complète de l\'infrastructure au format Excel',
                scriptGeneratorDesc: 'Générer des scripts PowerShell et batch',
                batchGeneratorDesc: 'Créer et gérer les opérations par lots',
                subnetCalculator: 'Outils Réseau',
                subnetCalculatorDesc: 'Calculateur de sous-réseau IPv4, convertisseur, développeur de plage, recherche et générateur MAC',
                cryptoTools: 'Outils Crypto',
                cryptoToolsDesc: 'Paires de clés RSA, force du mot de passe, HMAC, chiffrement, hachage et plus',
                webTools: 'Outils Web',
                webToolsDesc: 'Générateur OTP, analyseur JWT, info clavier, diff JSON et authentification de base',
                developmentTools: 'Outils de Développement',
                developmentToolsDesc: 'Générateur crontab, formateur JSON/SQL/XML, calculateur chmod, convertisseur Docker',
                automation: 'Automatisation',
                automationDesc: 'Créer des workflows automatisés avec un constructeur de flux visuel',
                healthMonitor: 'Moniteur de Santé',
                healthMonitorDesc: 'Surveiller la santé et le statut de tous les services de l\'application',
                // Sections
                tools: 'Outils',
                toolsDesc: 'Outils réseau, crypto, web et développement',
                documentation: 'Documentation',
                documentationDesc: 'Accéder à la documentation système et aux guides',
                auditor: 'Auditeur',
                auditorDesc: 'Outils d\'audit et d\'analyse Hyper-V, ESXi, vSphere, Windows et Active Directory',
                manager: 'Gestionnaire',
                managerDesc: 'Gérer Hyper-V, VMware, KVM, Proxmox et autres plateformes de virtualisation',
                remote: 'Distant',
                remoteDesc: 'SSH, SFTP, FTP, PowerShell et autres outils de connexion à distance',
                crypto: 'Crypto',
                development: 'Développement',
                infrastructure: 'Gestion d\'Infrastructure',
                reporting: 'Rapports et Analyses',
                networking: 'Réseau et Connectivité',
                productivity: 'Productivité',
                // Language
                language: 'Langue',
                languageEnglish: 'Anglais',
                languageFrench: 'Français',
                // Page header
                pageSubtitle: 'Choisissez votre outil pour rationaliser et optimiser la gestion de votre infrastructure'
            }
        };
    }

    t(key) {
        return this.translations[this.currentLanguage][key] || key;
    }

    setLanguage(lang) {
        this.currentLanguage = lang;
        localStorage.setItem('language', lang);
        // Trigger a re-render by dispatching an event
        document.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
    }

    render() {
        const apps = [
            // Auditor Section (consolidated - use sub-navbar to switch between auditors) - FIRST
            {
                id: 'hyperv-auditor-list',
                icon: 'fa-search',
                title: this.t('auditor'),
                description: this.t('auditorDesc'),
                color: '#3b82f6',
                section: 'reporting'
            },

            // Automation Section - SECOND
            {
                id: 'automation',
                icon: 'fa-project-diagram',
                title: this.t('automation'),
                description: this.t('automationDesc'),
                color: '#ec4899',
                section: 'productivity'
            },

            // Reporting & Analysis Section - THIRD
            {
                id: 'reports',
                icon: 'fa-file-alt',
                title: this.t('reportTemplates'),
                description: this.t('reportTemplatesDesc'),
                color: '#8b5cf6',
                section: 'reporting'
            },
            {
                id: 'infrastructure-inventory',
                icon: 'fa-file-excel',
                title: this.t('infrastructureInventory'),
                description: this.t('infrastructureInventoryDesc'),
                color: '#10b981',
                section: 'reporting'
            },

            // Manager Section (consolidated - use sub-navbar to switch between platforms)
            {
                id: 'hyperv',
                icon: 'fa-server',
                title: this.t('manager'),
                description: this.t('managerDesc'),
                color: '#3b82f6',
                section: 'infrastructure'
            },

            // Infrastructure Diagram Section
            {
                id: 'infrastructure-diagram',
                icon: 'fa-sitemap',
                title: this.t('infrastructureDiagram'),
                description: this.t('infrastructureDiagramDesc'),
                color: '#06b6d4',
                section: 'infrastructure'
            },

            // Network & Connectivity Section
            {
                id: 'ip-scanner',
                icon: 'fa-search-location',
                title: this.t('ipScanner'),
                description: this.t('ipScannerDesc'),
                color: '#10b981',
                section: 'networking'
            },
            {
                id: 'ping-tracer',
                icon: 'fa-route',
                title: 'Ping Tracer',
                description: 'Continuously ping each network host between your computer and a destination',
                color: '#6366f1',
                section: 'networking'
            },
            {
                id: 'domain-lookup',
                icon: 'fa-shield-dog',
                title: 'Domain Lookup',
                description: 'Look up domain information, registration history, and entity relationships using RDAP',
                color: '#f59e0b',
                section: 'networking'
            },
            {
                id: 'packet-analyzer',
                icon: 'fa-microscope',
                title: this.t('packetAnalyzer'),
                description: this.t('packetAnalyzerDesc'),
                color: '#8b5cf6',
                section: 'networking'
            },
            {
                id: 'speedtest',
                icon: 'fa-tachometer-alt',
                title: 'Speedtest',
                description: 'Test your internet connection speed and view historical results',
                color: '#ec4899',
                section: 'networking'
            },

            // Remote Section (consolidated - use sub-navbar to switch between SSH and SFTP)
            {
                id: 'remote',
                icon: 'fa-server',
                title: this.t('remote'),
                description: this.t('remoteDesc'),
                color: '#10b981',
                section: 'remote'
            },

            // Tools Section (consolidated - use sub-navbar to switch between tools)
            {
                id: 'subnet-calculator',
                icon: 'fa-tools',
                title: this.t('tools'),
                description: this.t('toolsDesc'),
                color: '#6366f1',
                section: 'tools'
            },

            // Documentation Section
            {
                id: 'documentation',
                icon: 'fa-book',
                title: this.t('documentation'),
                description: this.t('documentationDesc'),
                color: '#8b5cf6',
                section: 'documentation'
            },

            // To-Do Manager Section
            {
                id: 'todo',
                icon: 'fa-tasks',
                title: this.t('todoManager'),
                description: this.t('todoManagerDesc'),
                color: '#f59e0b',
                section: 'productivity'
            },

            // Activity Log
            {
                id: 'activity-log',
                icon: 'fa-clipboard-list',
                title: 'Activity Log',
                description: 'Monitor API calls, logins, and system events',
                color: '#8b5cf6',
                section: 'monitoring'
            }
        ];

        return `
            <div class="apps-page">
                <div class="apps-grid">
                    ${apps.map((app, index) => `
                        <div class="app-card" data-app="${app.id}" onclick="appsPageInstance.navigateTo('${app.id}')">
                            <div class="app-icon" style="background: linear-gradient(135deg, ${app.color}15 0%, ${app.color}25 100%);">
                                <i class="fas ${app.icon}" style="color: ${app.color};"></i>
                            </div>
                            <div class="app-content">
                                <h3 class="app-title">${app.title}</h3>
                                ${app.description ? `<p class="app-description">${app.description}</p>` : ''}
                            </div>
                            <div class="app-arrow">
                                <i class="fas fa-chevron-right"></i>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    async mount() {
        // Set global instance
        window.appsPageInstance = this;

        // Set up click handlers
        document.querySelectorAll('.app-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const appId = card.dataset.app;
                if (appId && this.onNavigate) {
                    this.onNavigate(appId);
                }
            });
        });

    }

    navigateTo(appId) {
        if (this.onNavigate) {
            this.onNavigate(appId);
        }
    }

    cleanup() {
        // Cleanup if needed
    }
}

// Global instance
window.appsPageInstance = null;
