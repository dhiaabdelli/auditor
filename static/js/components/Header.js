import { SubNavbar } from './SubNavbar.js';

export class Header {
    constructor(currentPage = 'apps') {
        this.currentPage = currentPage;
        this.subNavbar = new SubNavbar();
    }

    getPageName(pageId) {
        const pageNames = {
                'apps': 'Applications',
                // Virtualization
                // Manager
            'hyperv': 'Manager',
            'vmware-vsphere': 'Manager',
            'vmware-esxi': 'Manager',
            'kvm': 'Manager',
            'proxmox': 'Manager',
            'xen': 'Manager',
            'virtualbox': 'Manager',
                'hyperv-auditor': 'Auditor',
                'hyperv-auditor-list': 'Auditor',
                'hyperv-auditor-details': 'Auditor',
                'esxi-auditor': 'Auditor',
                'vsphere-auditor': 'Auditor',
                'windows-auditor': 'Auditor',
                'windows-server-auditor-list': 'Auditor',
                'windows-server-auditor-details': 'Auditor',
                'file-share-auditor': 'Auditor',
                'file-share-auditor-list': 'Auditor',
                'file-share-auditor-details': 'Auditor',
                'active-directory-auditor': 'Auditor',
            // Productivity
            'documentation': 'Productivity',
            'todo': 'To-Do Manager',
            'infrastructure-diagram': 'Productivity',
            // Automation
            'automation': 'Automation',
            'automation/workflows': 'Workflows',
            'automation/webhooks': 'Webhooks',
            'automation/schedulers': 'Schedulers',
            'automation/executions': 'Executions',
            // Remote
            'remote': 'Remote',
            'ssh-client': 'Remote',
            'sftp-client': 'Remote',
            'ftp-client': 'Remote',
            'powershell-remote': 'Remote',
            'rdp-client': 'Remote',
            'telnet-client': 'Remote',
            'winrm-client': 'Remote',
            'database': 'Remote',
            'ip-scanner': 'IP Scanner',
            'ping-tracer': 'Ping Tracer',
            'domain-lookup': 'Domain Lookup',
            'packet-analyzer': 'Packet Analyzer',
            'speedtest': 'Speedtest',
            // Reports
            'reports': 'Reports',
            // Infrastructure Inventory
            'infrastructure-inventory': 'Infrastructure Inventory',
            // Tools
            'subnet-calculator': 'Tools',
            // Crypto
            'crypto-tools': 'Tools',
            // Web Tools
            'web-tools': 'Tools',
            // Development Tools
            'development-tools': 'Tools',
            // Health Monitor
            'health-monitor': 'Health Monitor',
            // Activity Log
            'activity-log': 'Activity Log',
            'activity-log-sessions': 'Activity Log',
            // Settings
            'settings': 'Settings'
        };
        return pageNames[pageId] || 'Applications';
    }
    
    async openApps() {
        if (window.appInstance) {
            await window.appInstance.navigateTo('apps');
        }
    }

    async openSettings() {
        // Close menu
        const dropdown = document.getElementById('userMenuDropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
        
        // Navigate to settings
        if (window.appInstance) {
            await window.appInstance.navigateTo('settings');
        }
    }


    render() {
        const pageName = this.getPageName(this.currentPage);
        const isAppsPage = this.currentPage === 'apps';

        return `
            <div class="modern-header">
                <div class="header-left">
                    <button class="apps-toggle-btn" onclick="headerInstance.openApps()" title="Applications">
                        <i class="fas fa-bars"></i>
                    </button>
                    <div class="header-brand">
                        <div class="brand-text">
                            ${isAppsPage ? 
                                `<span class="header-page-name">Applications</span>` :
                                `<span class="header-breadcrumb">
                                    <span class="breadcrumb-item breadcrumb-link" onclick="headerInstance.openApps()">Applications</span>
                                    <i class="fas fa-chevron-right breadcrumb-separator"></i>
                                    <span class="breadcrumb-item">${pageName}</span>
                                </span>`
                            }
                        </div>
                    </div>
                </div>
                
                <div class="header-right">
                    <div class="header-actions">
                        <div class="user-menu-container">
                            <button class="header-btn user-btn" onclick="headerInstance.toggleUserMenu()" title="User">
                                <i class="fas fa-user"></i>
                            </button>
                            <div class="user-menu-dropdown" id="userMenuDropdown">
                                <button class="user-menu-item" onclick="headerInstance.openSettings()">
                                    <i class="fas fa-cog"></i>
                                    <span>Settings</span>
                                </button>
                                <button class="user-menu-item" onclick="headerInstance.logout()">
                                    <i class="fas fa-sign-out-alt"></i>
                                    <span>Logout</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    mount() {
        // Set global sub-navbar instance
        window.subNavbarInstance = this.subNavbar;
        
        // Initialize sub-navbar for current page
        this.updateSubNavbar(this.currentPage);
        
        // Close user menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-menu-container')) {
                const dropdown = document.getElementById('userMenuDropdown');
                if (dropdown) {
                    dropdown.style.display = 'none';
                }
            }
        });
    }

    updatePageName(pageId) {
        this.currentPage = pageId;
        const pageName = this.getPageName(pageId);
        const isAppsPage = pageId === 'apps';
        
        const brandText = document.querySelector('.brand-text');
        if (brandText) {
            if (isAppsPage) {
                brandText.innerHTML = `<span class="header-page-name">Applications</span>`;
            } else {
                brandText.innerHTML = `
                    <span class="header-breadcrumb">
                        <span class="breadcrumb-item breadcrumb-link" onclick="headerInstance.openApps()">Applications</span>
                        <i class="fas fa-chevron-right breadcrumb-separator"></i>
                        <span class="breadcrumb-item">${pageName}</span>
                    </span>
                `;
            }
        }
        // Update sub-navbar
        this.updateSubNavbar(pageId);
    }

    updateSubNavbar(pageId) {
        // Remove existing sub-navbar
        const existingSubNavbar = document.querySelector('.sub-navbar');
        if (existingSubNavbar) {
            existingSubNavbar.remove();
        }

        // Update body padding
        document.body.classList.remove('has-sub-navbar');

        // Render new sub-navbar if needed
        const subNavbarHTML = this.subNavbar.render(pageId);
        if (subNavbarHTML) {
            const header = document.querySelector('.modern-header');
            if (header && header.parentNode) {
                header.insertAdjacentHTML('afterend', subNavbarHTML);
                this.subNavbar.attachEventListeners();
                // Add class to body to adjust padding
                document.body.classList.add('has-sub-navbar');
            }
        }
    }
    
    async logout() {
        if (confirm('Are you sure you want to logout?')) {
            // Log logout event to server (include session ID if available)
            try {
                // Get session ID from JWT token
                const token = localStorage.getItem('jwt_token');
                let sessionId = null;
                if (token && window.api) {
                    sessionId = window.api.getSessionIdFromToken(token);
                }
                const headers = {
                    'Content-Type': 'application/json'
                };
                if (sessionId) {
                    headers['X-Session-ID'] = sessionId;
                }
                
                await fetch('/api/logout', {
                    method: 'POST',
                    headers: headers
                });
            } catch (error) {
                // Continue with logout even if logging fails
                console.error('Failed to log logout event:', error);
            }

            if (window.appInstance) {
                // Clear authentication state (this also clears session_id)
                window.appInstance.setAuthenticated(false);
                
                // Hide header and footer immediately
                const header = document.getElementById('header');
                const footer = document.querySelector('.app-footer');
                if (header) header.style.display = 'none';
                if (footer) footer.style.display = 'none';
                
                // Show login page
                window.appInstance.showLogin();
            }
        }
    }


    toggleUserMenu() {
        const dropdown = document.getElementById('userMenuDropdown');
        if (dropdown) {
            const isVisible = dropdown.style.display === 'block';
            dropdown.style.display = isVisible ? 'none' : 'block';
            
            // Close dropdown when clicking outside
            if (!isVisible) {
                const closeMenu = (e) => {
                    if (!e.target.closest('.user-menu-container')) {
                        dropdown.style.display = 'none';
                        document.removeEventListener('click', closeMenu);
                    }
                };
                setTimeout(() => {
                    document.addEventListener('click', closeMenu);
                }, 0);
            }
        }
    }
    
    openSettings() {
        // Close menu
        const dropdown = document.getElementById('userMenuDropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
        
        // Navigate to settings
        if (window.appInstance) {
            window.appInstance.navigateTo('settings');
        }
    }
}

// Global instance for onclick handlers
window.headerInstance = null;

