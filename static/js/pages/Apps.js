export class AppsPage {
    constructor(onNavigate) {
        // Set instance IMMEDIATELY so inline event handlers work
        window.appsPageInstance = this;

        this.onNavigate = onNavigate;
        this.currentLanguage = localStorage.getItem('language') || 'en';
        this.searchQuery = '';
        this.filterCategory = 'all';
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
                ipScanner: 'DeepView Scout',
                packetAnalyzer: 'DeepView Packet',
                reportTemplates: 'DeepView Reports',
                scriptGenerator: 'Script Generator',
                batchGenerator: 'Batch Generator',
                speedtest: 'DeepView Pulse',
                domainLookup: 'DeepView Domain Lookup',
                pingTracer: 'DeepView Trace',
                // App descriptions
                hypervManagerDesc: 'Manage Hyper-V virtual machines, hosts, and clusters',
                hypervReportDesc: 'Audit and analyze Hyper-V clusters and hosts',
                documentationDesc: 'Access system documentation and guides',
                todoManagerDesc: 'Manage tasks, projects, and team collaboration',
                infrastructureDiagramDesc: 'Create and manage infrastructure diagrams',
                sshClientDesc: 'Connect to remote servers via SSH',
                sftpClientDesc: 'Transfer files securely via SFTP',
                networkToolsDesc: 'Diagnose, troubleshoot, and analyze network connectivity and performance',
                ipScannerDesc: 'Map, monitor, and analyze network devices across all subnets',
                packetAnalyzerDesc: 'Real-time packet capture and deep network traffic analysis',
                reportTemplatesDesc: 'Create and manage document templates for automated report generation',
                scriptGeneratorDesc: 'Generate PowerShell and batch scripts',
                batchGeneratorDesc: 'Create and manage batch operations',
                speedtestDesc: 'Real-time bandwidth and latency testing for accurate network performance',
                domainLookupDesc: 'Lookup domain registration, history, and relationships using RDAP securely',
                pingTracerDesc: 'Continuously trace network paths, monitor connectivity, latency, and performance',
                subnetCalculator: 'Network Tools',
                subnetCalculatorDesc: 'IPv4 subnet calculator, converter, range expander, MAC lookup and generator',
                cryptoTools: 'Crypto Tools',
                cryptoToolsDesc: 'RSA key pairs, password strength, HMAC, encryption, hashing, and more',
                webTools: 'Web Tools',
                webToolsDesc: 'OTP generator, JWT parser, keycode info, JSON diff and basic auth',
                developmentTools: 'Development Tools',
                developmentToolsDesc: 'Crontab generator, JSON/SQL/XML formatter, chmod calculator, Docker converter',
                automation: 'DeepView Automation',
                automationDesc: 'Automate IT tasks, workflows, and system operations across your infrastructure',
                healthMonitor: 'Health Monitor',
                healthMonitorDesc: 'Monitor the health and status of all application services',
                // Sections
                tools: 'Tools',
                toolsDesc: 'Network, Crypto, Web, and Development tools',
                documentation: 'Documentation',
                documentationDesc: 'Access system documentation and guides',
                auditor: 'DeepView Insight',
                auditorDesc: 'Audit and analyze Hyper-V, ESXi, Windows, and Active Directory securely',
                manager: 'Manager',
                managerDesc: 'Manage Hyper-V, VMware, KVM, Proxmox, and other virtualization platforms',
                remote: 'DeepView Remote',
                remoteDesc: 'Securely access and manage systems remotely via multiple protocols.',
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
                pageSubtitle: 'Choose your tool to streamline and optimize your infrastructure management',
                // Search and Filters
                search: 'Search applications...',
                allCategories: 'All Categories',
                infrastructure: 'Infrastructure',
                reporting: 'Reporting',
                networking: 'Networking',
                tools: 'Tools',
                remote: 'Remote',
                productivity: 'Productivity',
                monitoring: 'Monitoring',
                noResults: 'No applications found',
                noResultsDesc: 'Try adjusting your search or filter criteria'
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
                ipScanner: 'DeepView Scout',
                ipScannerDesc: 'Cartographiez, surveillez et analysez les périphériques réseau sur tous les sous-réseaux',
                packetAnalyzer: 'DeepView Packet',
                packetAnalyzerDesc: 'Capture de paquets en temps réel et analyse approfondie du trafic réseau',
                reportTemplates: 'DeepView Reports',
                reportTemplatesDesc: 'Créer et gérer des modèles de documents pour la génération automatique de rapports',
                scriptGeneratorDesc: 'Générer des scripts PowerShell et batch',
                speedtest: 'DeepView Pulse',
                domainLookup: 'DeepView Domain Lookup',
                pingTracer: 'DeepView Trace',
                batchGeneratorDesc: 'Créer et gérer les opérations par lots',
                speedtestDesc: 'Tests de bande passante et de latence en temps réel pour une performance réseau précise',
                domainLookupDesc: 'Consultez l\'enregistrement, l\'historique et les relations des domaines via RDAP en toute sécurité',
                pingTracerDesc: 'Tracez en continu les chemins réseau, surveillez la connectivité, la latence et les performances',
                subnetCalculator: 'Outils Réseau',
                subnetCalculatorDesc: 'Calculateur de sous-réseau IPv4, convertisseur, développeur de plage, recherche et générateur MAC',
                cryptoTools: 'Outils Crypto',
                cryptoToolsDesc: 'Paires de clés RSA, force du mot de passe, HMAC, chiffrement, hachage et plus',
                webTools: 'Outils Web',
                webToolsDesc: 'Générateur OTP, analyseur JWT, info clavier, diff JSON et authentification de base',
                developmentTools: 'Outils de Développement',
                developmentToolsDesc: 'Générateur crontab, formateur JSON/SQL/XML, calculateur chmod, convertisseur Docker',
                automation: 'DeepView Automation',
                automationDesc: 'Automatisez les tâches informatiques, les flux de travail et les opérations système sur votre infrastructure',
                healthMonitor: 'Moniteur de Santé',
                healthMonitorDesc: 'Surveiller la santé et le statut de tous les services de l\'application',
                // Sections
                tools: 'Outils',
                toolsDesc: 'Outils réseau, crypto, web et développement',
                documentation: 'Documentation',
                documentationDesc: 'Accéder à la documentation système et aux guides',
                auditor: 'DeepView Insight',
                auditorDesc: 'Auditez et analysez Hyper-V, ESXi, Windows et Active Directory en toute sécurité',
                manager: 'Gestionnaire',
                managerDesc: 'Gérer Hyper-V, VMware, KVM, Proxmox et autres plateformes de virtualisation',
                remote: 'DeepView Remote',
                remoteDesc: 'Accédez et gérez vos systèmes à distance de manière sécurisée via plusieurs protocoles.',
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
                pageSubtitle: 'Choisissez votre outil pour rationaliser et optimiser la gestion de votre infrastructure',
                // Search and Filters
                search: 'Rechercher des applications...',
                allCategories: 'Toutes les Catégories',
                infrastructure: 'Infrastructure',
                reporting: 'Rapports',
                networking: 'Réseau',
                tools: 'Outils',
                remote: 'Distant',
                productivity: 'Productivité',
                monitoring: 'Surveillance',
                noResults: 'Aucune application trouvée',
                noResultsDesc: 'Essayez d\'ajuster vos critères de recherche ou de filtrage'
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

    handleSearch(query) {
        this.searchQuery = query.toLowerCase();
        this.updateDisplay();
    }

    handleFilter(category) {
        this.filterCategory = category;
        this.updateDisplay();
    }

    getFilteredApps(apps) {
        return apps.filter(app => {
            const matchesSearch = !this.searchQuery ||
                app.title.toLowerCase().includes(this.searchQuery) ||
                app.description.toLowerCase().includes(this.searchQuery);

            const matchesCategory = this.filterCategory === 'all' ||
                app.section === this.filterCategory;

            return matchesSearch && matchesCategory;
        });
    }

    updateDisplay() {
        const content = document.getElementById('apps-dynamic-content');
        if (content) {
            content.innerHTML = this.renderAppsGrid();
        }
    }

    getApps() {
        return [
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
                title: this.t('pingTracer'),
                description: this.t('pingTracerDesc'),
                color: '#6366f1',
                section: 'networking'
            },
            {
                id: 'domain-lookup',
                icon: 'fa-shield-dog',
                title: this.t('domainLookup'),
                description: this.t('domainLookupDesc'),
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
                title: this.t('speedtest'),
                description: this.t('speedtestDesc'),
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
    }

    renderAppsGrid() {
        const apps = this.getApps();
        const filteredApps = this.getFilteredApps(apps);

        if (filteredApps.length === 0) {
            return `
                <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 3rem; color: #64748b;">
                    <i class="fas fa-search fa-3x" style="margin-bottom: 1.5rem; opacity: 0.5;"></i>
                    <h3 style="margin: 0 0 0.5rem 0; font-size: 1.25rem; color: #94a3b8;">${this.t('noResults')}</h3>
                    <p style="margin: 0; font-size: 0.875rem;">${this.t('noResultsDesc')}</p>
                </div>
            `;
        }

        return `
            <div class="apps-grid grid-compact">
                ${filteredApps.map((app, index) => `
                    <div class="app-card" data-app="${app.id}" onclick="appsPageInstance.navigateTo('${app.id}')">
                        <div class="app-icon" style="background: linear-gradient(135deg, ${app.color}15 0%, ${app.color}25 100%);">
                            <i class="fas ${app.icon}" style="color: ${app.color};"></i>
                        </div>
                        <div class="app-info">
                            <h3 class="app-title">${app.title}</h3>
                            ${app.description ? `<p class="app-description">${app.description}</p>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    render() {
        const categories = [
            { id: 'all', label: this.t('allCategories') },
            { id: 'infrastructure', label: this.t('infrastructure') },
            { id: 'reporting', label: this.t('reporting') },
            { id: 'networking', label: this.t('networking') },
            { id: 'tools', label: this.t('tools') },
            { id: 'remote', label: this.t('remote') },
            { id: 'productivity', label: this.t('productivity') },
            { id: 'monitoring', label: this.t('monitoring') }
        ];

        return `
            <div class="apps-page" style="height: calc(100vh - 120px); overflow: hidden; display: flex; flex-direction: column;">
                <div style="padding: 1rem; display: flex; flex-direction: column; height: 100%; box-sizing: border-box;">
                    <!-- Search and Filter Bar -->
                    <div style="display: flex; gap: 0.75rem; margin-bottom: 2rem; flex-shrink: 0; flex-wrap: wrap;">
                        <!-- Search Bar -->
                        <div style="position: relative; flex: 1; min-width: 220px;">
                            <i class="fas fa-search" style="position: absolute; left: 0.65rem; top: 50%; transform: translateY(-50%); color: #64748b; font-size: 0.75rem;"></i>
                            <input 
                                type="text" 
                                placeholder="${this.t('search')}" 
                                value="${this.searchQuery}"
                                oninput="appsPageInstance.handleSearch(this.value)"
                                style="width: 100%; padding: 0 0.65rem 0 2.25rem; background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px; color: white; font-size: 0.8rem; outline: none; height: 34px;">
                        </div>
                        
                        <!-- Category Filter -->
                        <div style="position: relative;">
                            <select 
                                onchange="appsPageInstance.handleFilter(this.value)"
                                style="padding: 0 2.25rem 0 0.65rem; background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px; color: white; font-size: 0.8rem; outline: none; cursor: pointer; appearance: none; min-width: 160px; height: 34px;">
                                ${categories.map(cat => `
                                    <option value="${cat.id}" ${this.filterCategory === cat.id ? 'selected' : ''}>${cat.label}</option>
                                `).join('')}
                            </select>
                            <i class="fas fa-chevron-down" style="position: absolute; right: 0.65rem; top: 50%; transform: translateY(-50%); color: #64748b; font-size: 0.7rem; pointer-events: none;"></i>
                        </div>
                    </div>

                    <!-- Apps Grid -->
                    <div id="apps-dynamic-content" style="flex: 1; overflow-y: auto; min-height: 0;">
                        ${this.renderAppsGrid()}
                    </div>
                </div>
            </div>
        `;
    }

    async mount() {
        // Set up click handlers for app cards
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
