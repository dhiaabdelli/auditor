
export class AdministrationPage {
    constructor() {
        this.activeTab = 'general';
        this.loading = false;
        this.expandedCategories = new Set(['settings', 'access-control']);
        this.sidebarCollapsed = false;
        this.users = [];
        this.loadingUsers = false;
        this.lastFetchTime = 0;

        this.categories = {
            'settings': {
                title: 'Settings',
                icon: 'fas fa-cog',
                items: [
                    { id: 'general', label: 'General' },
                    { id: 'email', label: 'Email' },
                    { id: 'wifi', label: 'WiFi Management' },
                    { id: 'guest-personalization', label: 'Guest Personalization' },
                    { id: 'metadata', label: 'Metadata' },
                    { id: 'multisite', label: 'Multisite' },
                    { id: 'policies', label: 'Policies' },
                    { id: 'quotas', label: 'Quotas' },
                    { id: 'advisories', label: 'Advisories' },
                    { id: 'logs', label: 'Audit Logs' }
                ]
            },
            'access-control': {
                title: 'Access Control',
                icon: 'fas fa-users-cog',
                items: [
                    { id: 'users', label: 'Users' },
                    { id: 'groups', label: 'Groups' },
                    { id: 'roles', label: 'Roles' },
                    { id: 'service-accounts', label: 'Service Accounts' }
                ]
            },
            'identity-providers': {
                title: 'Identity Providers',
                icon: 'fas fa-user-shield',
                items: [
                    { id: 'saml', label: 'SAML' },
                    { id: 'ldap', label: 'LDAP' },
                    { id: 'oidc', label: 'OIDC' }
                ]
            },
            'certificate-management': {
                title: 'Certificate Management',
                icon: 'fas fa-id-card',
                items: [
                    { id: 'trusted-certificates', label: 'Trusted Certificates' },
                    { id: 'certificates-library', label: 'Certificates Library' }
                ]
            }
        };
    }

    async render() {
        return `
            <div class="administration-container page-container-full ${this.sidebarCollapsed ? 'sidebar-collapsed' : ''}">
                <aside class="administration-sidebar">
                    <div class="sidebar-collapse-header">
                        <button class="collapse-btn" onclick="administrationInstance.toggleSidebar()">
                            <i class="fas fa-angle-double-left"></i>
                        </button>
                    </div>
                    <nav class="sidebar-nav">
                        ${Object.entries(this.categories).map(([key, cat]) => `
                            <div class="sidebar-category ${this.expandedCategories.has(key) ? 'expanded' : ''}">
                                <div class="category-header" onclick="administrationInstance.toggleCategory('${key}')">
                                    <div class="category-title">
                                        <i class="${cat.icon}"></i>
                                        <span>${cat.title}</span>
                                    </div>
                                    <i class="fas fa-chevron-down arrow"></i>
                                </div>
                                <div class="category-items">
                                    ${cat.items.map(item => `
                                        <button class="nav-item ${this.activeTab === item.id ? 'active' : ''}" 
                                                onclick="administrationInstance.switchTab('${item.id}')">
                                            <span>${item.label}</span>
                                        </button>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </nav>
                </aside>
                <main class="administration-content">
                    <div id="admin-tab-content" class="admin-tab-content-wrapper">
                        ${await this.renderTabContent()}
                    </div>
                </main>
            </div>
        `;
    }

    async renderTabContent() {
        switch (this.activeTab) {
            case 'users':
                if (this.users.length === 0 || Date.now() - this.lastFetchTime > 30000) {
                    await this.fetchUsers();
                }
                return this.renderUsersTab();
            case 'groups':
                return this.renderPlaceholderTab('Groups', 'Organize users into groups for easier management.');
            case 'roles':
                return this.renderPlaceholderTab('Roles', 'Define permissions and access levels for different roles.');
            case 'service-accounts':
                return this.renderPlaceholderTab('Service Accounts', 'Manage automated accounts for system integrations.');
            case 'saml':
                return this.renderPlaceholderTab('SAML', 'Configure SAML-based identity provider settings.');
            case 'ldap':
                return this.renderPlaceholderTab('LDAP', 'Connect to external LDAP or Active Directory servers.');
            case 'oidc':
                return this.renderPlaceholderTab('OIDC', 'Configure OpenID Connect identity providers.');
            case 'trusted-certificates':
                return this.renderPlaceholderTab('Trusted Certificates', 'Manage trusted root and intermediate certificates.');
            case 'certificates-library':
                return this.renderPlaceholderTab('Certificates Library', 'Upload and manage SSL/TLS certificates for the system.');
            case 'wifi':
                return await this.renderWifiTab();
            case 'logs':
                return this.renderLogsTab();
            case 'general':
                return this.renderPlaceholderTab('General Settings', 'Configure core system parameters and preferences.');
            default:
                return this.renderPlaceholderTab(this.activeTab.charAt(0).toUpperCase() + this.activeTab.slice(1), `Management interface for ${this.activeTab}.`);
        }
    }

    async fetchUsers() {
        if (this.loadingUsers) return;
        this.loadingUsers = true;
        try {
            const token = localStorage.getItem('jwt_token');
            const response = await fetch('/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                this.users = await response.json();
                this.lastFetchTime = Date.now();
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            this.loadingUsers = false;
        }
    }

    renderUsersTab() {
        if (this.loadingUsers && this.users.length === 0) {
            return `
                <div class="admin-tab-header">
                    <div class="admin-header-main">
                        <h2>Users</h2>
                    </div>
                </div>
                <div class="admin-tab-body">
                    <div class="placeholder-section">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Loading users...</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="admin-tab-header">
                <div class="admin-header-main">
                    <h2>Users</h2>
                </div>
                <div class="admin-header-actions">
                    <div class="admin-action-group left">
                        <button class="admin-action-btn primary"><i class="fas fa-plus"></i> NEW</button>
                        <button class="admin-action-btn"><i class="fas fa-edit"></i> EDIT</button>
                        <button class="admin-action-btn"><i class="fas fa-check"></i> ENABLE</button>
                        <button class="admin-action-btn"><i class="fas fa-ban"></i> DISABLE</button>
                        <button class="admin-action-btn danger"><i class="fas fa-trash"></i> DELETE</button>
                        <button class="admin-action-btn"><i class="fas fa-database"></i> SET QUOTA</button>
                    </div>
                    <div class="admin-action-group right">
                        <button class="admin-action-btn"><i class="fas fa-layer-group"></i> BULK UPDATE</button>
                        <button class="admin-action-btn" onclick="administrationInstance.fetchUsers().then(() => administrationInstance.updateUI())"><i class="fas fa-sync-alt"></i> REFRESH</button>
                        <button class="admin-action-btn"><i class="fas fa-file-export"></i> EXPORT USERS</button>
                    </div>
                </div>
            </div>
            <div class="admin-tab-body">
                <div class="admin-table-container">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th class="col-select"><input type="checkbox"></th>
                                <th class="col-sortable">User Name <i class="fas fa-sort"></i></th>
                                <th class="col-sortable">Role <i class="fas fa-filter"></i></th>
                                <th class="col-sortable">Status</th>
                                <th class="col-sortable">Quota</th>
                                <th class="col-sortable">Usage</th>
                                <th class="col-sortable">Locked <i class="fas fa-filter"></i></th>
                                <th class="col-sortable">Created At</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.users.map(user => `
                                <tr>
                                    <td class="col-select"><input type="radio" name="user-select"></td>
                                    <td class="user-name-cell">${user.username}</td>
                                    <td>${user.role || 'Admin'}</td>
                                    <td><span class="admin-status-badge ${(user.status || 'Enabled').toLowerCase()}">${user.status || 'Enabled'}</span></td>
                                    <td>${user.quota || 'Unlimited'}</td>
                                    <td>${user.usage || '0 B'}</td>
                                    <td class="admin-locked-cell"><i class="fas fa-${user.is_locked ? 'lock' : 'lock-open'}"></i> ${user.is_locked ? 'Locked' : 'Unlocked'}</td>
                                    <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderPlaceholderTab(title, description) {
        return `
            <div class="admin-tab-header">
                <h2>${title}</h2>
                <p>${description}</p>
            </div>
            <div class="admin-tab-body">
                <div class="placeholder-section">
                    <i class="fas fa-tools"></i>
                    <p>${title} configuration will be displayed here.</p>
                </div>
            </div>
        `;
    }

    async renderWifiTab() {
        const { WifiManagerPage } = await import('./WifiManager.js');
        const wifiManager = new WifiManagerPage();
        this.wifiManagerInstance = wifiManager;
        return `
            <div class="admin-tab-header">
                <h2>WiFi Management</h2>
                <p>Monitor and manage wireless access point and connected clients</p>
            </div>
            <div class="admin-tab-body" id="wifi-admin-container" style="padding: 0; background: transparent; border: none;">
                ${await wifiManager.render()}
            </div>
        `;
    }

    renderLogsTab() {
        return `
            <div class="admin-tab-header">
                <h2>Audit Logs</h2>
                <p>View system-wide activity and authentication logs</p>
            </div>
            <div class="admin-tab-body">
                <div class="placeholder-section">
                    <i class="fas fa-history"></i>
                    <p>System audit logs will be displayed here.</p>
                </div>
            </div>
        `;
    }

    async mount() {
        window.administrationInstance = this;
        document.body.style.overflow = 'hidden';
    }

    toggleCategory(key) {
        if (this.expandedCategories.has(key)) {
            this.expandedCategories.delete(key);
        } else {
            this.expandedCategories.add(key);
        }
        this.fullRerender();
    }

    toggleSidebar() {
        this.sidebarCollapsed = !this.sidebarCollapsed;
        this.fullRerender();
    }

    async switchTab(tab) {
        if (this.wifiManagerInstance && this.activeTab === 'wifi') {
            this.wifiManagerInstance.unmount();
            this.wifiManagerInstance = null;
        }

        this.activeTab = tab;
        await this.updateUI();

        if (this.activeTab === 'wifi' && this.wifiManagerInstance) {
            await this.wifiManagerInstance.mount();
        }
    }

    async fullRerender() {
        const container = document.getElementById('page-content');
        if (container) {
            container.innerHTML = await this.render();
            if (this.activeTab === 'wifi' && this.wifiManagerInstance) {
                await this.wifiManagerInstance.mount();
            }
        }
    }

    async updateUI() {
        const content = document.getElementById('admin-tab-content');
        if (content) {
            content.innerHTML = await this.renderTabContent();
        }

        // Update sidebar active state
        const items = document.querySelectorAll('.administration-sidebar .nav-item');
        items.forEach(item => {
            const label = item.querySelector('span').innerText.toLowerCase();
            const itemId = item.getAttribute('onclick').match(/'([^']+)'/)[1];
            if (itemId === this.activeTab) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    async unmount() {
        document.body.style.overflow = '';
        if (this.wifiManagerInstance) {
            this.wifiManagerInstance.unmount();
            this.wifiManagerInstance = null;
        }
    }
}
