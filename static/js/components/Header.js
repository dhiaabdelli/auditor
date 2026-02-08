import { SubNavbar } from './SubNavbar.js';

export class Header {
    constructor(currentPage = 'controller') {
        this.currentPage = currentPage;
        this.subNavbar = new SubNavbar();
        this.isDarkMode = true; // strictly dark
    }

    getPageName(pageId) {
        const pageNames = {
            'apps': 'Applications',
            'controller': 'Overview',
            // Virtualization
            // Manager
            'hyperv': 'Manager',
            'vmware-vsphere': 'Manager',
            'vmware-esxi': 'Manager',
            'kvm': 'Manager',
            'proxmox': 'Manager',
            'xen': 'Manager',
            'virtualbox': 'Manager',
            'hyperv-auditor': 'DeepView Insight',
            'hyperv-auditor-list': 'DeepView Insight',
            'hyperv-auditor-details': 'DeepView Insight',
            'esxi-auditor': 'DeepView Insight',
            'vsphere-auditor': 'DeepView Insight',
            'windows-auditor': 'DeepView Insight',
            'windows-server-auditor-list': 'DeepView Insight',
            'windows-server-auditor-details': 'DeepView Insight',
            'linux-auditor': 'DeepView Insight',
            'linux-server-auditor-list': 'DeepView Insight',
            'linux-server-auditor-details': 'DeepView Insight',
            'file-share-auditor': 'DeepView Insight',
            'file-share-auditor-list': 'DeepView Insight',
            'file-share-auditor-details': 'DeepView Insight',
            'active-directory-auditor': 'DeepView Insight',
            'veeam-auditor-list': 'DeepView Insight',
            'veeam-auditor-details': 'DeepView Insight',
            // Productivity
            'infrastructure-diagram': 'Productivity',
            // Automation
            'automation': 'DeepView Automation',
            'automation/workflows': 'DeepView Automation',
            'automation/webhooks': 'DeepView Automation',
            'automation/schedulers': 'DeepView Automation',
            'automation/executions': 'DeepView Automation',
            // Remote
            'remote': 'DeepView Remote',
            'ssh-client': 'DeepView Remote',
            'sftp-client': 'DeepView Remote',
            'ftp-client': 'DeepView Remote',
            'powershell-remote': 'DeepView Remote',
            'rdp-client': 'DeepView Remote',
            'telnet-client': 'DeepView Remote',
            'winrm-client': 'DeepView Remote',
            'database': 'DeepView Remote',
            'ip-scanner': 'DeepView Scout',
            'ping-tracer': 'DeepView Trace',
            'domain-lookup': 'DeepView Domain Lookup',
            'packet-analyzer': 'DeepView Packet',
            'speedtest': 'DeepView Pulse',
            // Reports
            'reports': 'DeepView Reports',
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
            'settings': 'Settings',
            // Administration
            'administration': 'Administration',
            'wifi-manager': 'WiFi Manager'
        };
        return pageNames[pageId] || 'Applications';
    }

    async openApps() {
        if (window.appInstance) {
            await window.appInstance.navigateTo('apps');
        }
    }

    async openOverview() {
        if (window.appInstance) {
            await window.appInstance.navigateTo('controller');
        }
    }

    async openAdministration() {
        if (window.appInstance) {
            await window.appInstance.navigateTo('administration');
        }
    }

    async openMonitor() {
        if (window.appInstance) {
            await window.appInstance.navigateTo('health-monitor');
        }
    }

    async openChangePassword() {
        // Close menu
        const dropdown = document.getElementById('userMenuDropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
        }

        // Navigate to change password if implemented
        if (window.appInstance) {
            await window.appInstance.navigateTo('settings'); // Fallback to settings or specific tab
        }
    }

    async openUserPreference() {
        // Close menu
        const dropdown = document.getElementById('userMenuDropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
        }

        // Navigate to user preference
        if (window.appInstance) {
            await window.appInstance.navigateTo('settings'); // Fallback
        }
    }

    applyTheme() {
        document.body.classList.remove('light-mode');
    }


    render() {
        const pageName = this.getPageName(this.currentPage);
        const needsConfigToggle =
            this.currentPage === 'ping-tracer' ||
            this.currentPage === 'ip-scanner' ||
            this.currentPage === 'veeam-auditor' ||
            this.currentPage === 'veeam-auditor-details' ||
            this.currentPage === 'windows-server-auditor' ||
            this.currentPage === 'windows-server-auditor-details' ||
            this.currentPage === 'file-share-auditor' ||
            this.currentPage === 'file-share-auditor-details' ||
            this.currentPage === 'linux-server-auditor' ||
            this.currentPage === 'linux-server-auditor-details' ||
            this.currentPage === 'hyperv-auditor' ||
            this.currentPage === 'hyperv-auditor-list' ||
            this.currentPage === 'hyperv-auditor-details';

        const isOverview = ['controller', 'network-overview'].includes(this.currentPage);
        const isAdministration = ['administration', 'wifi-manager', 'network-interfaces', 'settings', 'activity-log', 'activity-log-sessions'].includes(this.currentPage);
        const isMonitor = this.currentPage === 'health-monitor';
        const isApplications = !isOverview && !isAdministration && !isMonitor && this.currentPage !== 'login';

        return `
            <div class="modern-header">
                <div class="header-left">
                    <div class="header-brand-logo" onclick="headerInstance.openOverview()">
                        DeepView Console
                    </div>
                    <div class="header-nav">
                        <button class="nav-item ${isOverview ? 'active' : ''}" onclick="headerInstance.openOverview()">
                            Overview
                        </button>
                        <button class="nav-item ${isApplications ? 'active' : ''}" onclick="headerInstance.openApps()">
                            Applications
                        </button>
                        <button class="nav-item ${isAdministration ? 'active' : ''}" onclick="headerInstance.openAdministration()">
                            Administration
                        </button>
                        <button class="nav-item ${isMonitor ? 'active' : ''}" onclick="headerInstance.openMonitor()">
                            Monitor
                        </button>
                    </div>
                </div>
                
                <div class="header-right">
                    <div class="header-actions">

                        <div class="user-menu-container">
                            <div class="user-profile" onclick="headerInstance.toggleUserMenu()">
                                <div class="user-avatar">
                                    <i class="fas fa-user"></i>
                                </div>
                                <div class="user-info">
                                    <span class="user-name">Admin</span>
                                    <i class="fas fa-chevron-down user-chevron"></i>
                                </div>
                            </div>
                            <div class="user-menu-dropdown" id="userMenuDropdown">
                                <button class="user-menu-item" onclick="headerInstance.openChangePassword()">
                                    <i class="fas fa-key"></i>
                                    <span>Change Password</span>
                                </button>
                                <button class="user-menu-item" onclick="headerInstance.openUserPreference()">
                                    <i class="fas fa-user-edit"></i>
                                    <span>User Preference</span>
                                </button>
                                <button class="user-menu-item logout-item" onclick="headerInstance.logout()">
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

        // Apply saved theme
        this.applyTheme();

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
        const needsConfigToggle =
            pageId === 'ping-tracer' ||
            pageId === 'ip-scanner' ||
            pageId === 'veeam-auditor' ||
            pageId === 'veeam-auditor-details' ||
            pageId === 'windows-server-auditor' ||
            pageId === 'windows-server-auditor-details' ||
            pageId === 'file-share-auditor' ||
            pageId === 'file-share-auditor-details' ||
            pageId === 'linux-server-auditor' ||
            pageId === 'linux-server-auditor-details' ||
            pageId === 'hyperv-auditor' ||
            pageId === 'hyperv-auditor-list' ||
            pageId === 'hyperv-auditor-details';

        // Update the header-left section to show the correct button
        // Update the header-left section to show the correct menu active state
        const headerLeft = document.querySelector('.header-left');
        if (headerLeft) {
            const headerNav = headerLeft.querySelector('.header-nav');
            if (headerNav) {
                const isOverview = ['controller', 'network-overview'].includes(pageId);
                const isAdministration = ['administration', 'wifi-manager', 'network-interfaces', 'settings', 'activity-log', 'activity-log-sessions'].includes(pageId);
                const isMonitor = pageId === 'health-monitor';
                const isApplications = !isOverview && !isAdministration && !isMonitor && pageId !== 'login';

                headerNav.innerHTML = `
                    <button class="nav-item ${isOverview ? 'active' : ''}" onclick="headerInstance.openOverview()">
                        Overview
                    </button>
                    <button class="nav-item ${isApplications ? 'active' : ''}" onclick="headerInstance.openApps()">
                        Applications
                    </button>
                    <button class="nav-item ${isAdministration ? 'active' : ''}" onclick="headerInstance.openAdministration()">
                        Administration
                    </button>
                    <button class="nav-item ${isMonitor ? 'active' : ''}" onclick="headerInstance.openMonitor()">
                        Monitor
                    </button>
                `;
            }

            // Update the toggle button
            const existingToggle = headerLeft.querySelector('.apps-toggle-btn, .header-config-toggle');
            if (existingToggle) {
                if (needsConfigToggle) {
                    // Replace apps toggle with config toggle
                    existingToggle.outerHTML = `
                        <button class="header-config-toggle" id="header-config-toggle" onclick="headerInstance.toggleConfigSidebar()" title="Configuration">
                            <i class="fas fa-bars"></i>
                        </button>
                    `;
                } else {
                    // Replace config toggle with apps toggle
                    existingToggle.outerHTML = `
                        <button class="apps-toggle-btn" onclick="headerInstance.openApps()" title="Applications">
                            <i class="fas fa-bars"></i>
                        </button>
                    `;
                }
            } else {
                // No toggle button found, insert the correct one before brand-text
                const brandTextElement = headerLeft.querySelector('.brand-text');
                if (brandTextElement) {
                    const toggleHTML = needsConfigToggle ? `
                        <button class="header-config-toggle" id="header-config-toggle" onclick="headerInstance.toggleConfigSidebar()" title="Configuration">
                            <i class="fas fa-bars"></i>
                        </button>
                    ` : `
                        <button class="apps-toggle-btn" onclick="headerInstance.openApps()" title="Applications">
                            <i class="fas fa-bars"></i>
                        </button>
                    `;
                    brandTextElement.insertAdjacentHTML('beforebegin', toggleHTML);
                }
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

        // Update body classes - remove all navbar classes first
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

    toggleConfigSidebar() {
        // Toggle config sidebar for ping-tracer or ip-scanner
        const pageId = this.currentPage;

        if (pageId === 'ping-tracer' && window.pingTracerInstance) {
            if (typeof window.pingTracerInstance.toggleConfigSidebar === 'function') {
                window.pingTracerInstance.toggleConfigSidebar();
            }
            return;
        }

        if (pageId === 'ip-scanner' && window.ipScannerInstance) {
            if (typeof window.ipScannerInstance.toggleConfigSidebar === 'function') {
                window.ipScannerInstance.toggleConfigSidebar();
            }
            return;
        }

        // Handle auditor pages
        if (window.windowsServerAuditorInstance && typeof window.windowsServerAuditorInstance.toggleSidebar === 'function') {
            window.windowsServerAuditorInstance.toggleSidebar();
        } else if (window.veeamAuditorInstance && typeof window.veeamAuditorInstance.toggleSidebar === 'function') {
            window.veeamAuditorInstance.toggleSidebar();
        } else if (window.fileShareAuditorInstance && typeof window.fileShareAuditorInstance.toggleSidebar === 'function') {
            window.fileShareAuditorInstance.toggleSidebar();
        } else if (window.linuxServerAuditorInstance && typeof window.linuxServerAuditorInstance.toggleSidebar === 'function') {
            window.linuxServerAuditorInstance.toggleSidebar();
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

    openChangePassword() {
        this.closeUserMenu();
        if (window.appInstance) {
            window.appInstance.navigateTo('settings');
        }
    }

    openUserPreference() {
        this.closeUserMenu();
        if (window.appInstance) {
            window.appInstance.navigateTo('settings');
        }
    }

    closeUserMenu() {
        const dropdown = document.getElementById('userMenuDropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
    }
}

// Global instance for onclick handlers
window.headerInstance = null;

