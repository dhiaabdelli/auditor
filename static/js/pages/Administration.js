
export class AdministrationPage {
    constructor(activeTab = null) {
        window.administrationInstance = this;

        // Load state from URL parameters
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
        this.activeTab = activeTab || params.get('tab') || 'general';

        this.loading = false;

        // Reset sidebar state (no longer persistent via local storage)
        this.expandedCategories = new Set(['settings', 'access-control']);
        this.sidebarCollapsed = false;

        this.users = [];
        this.loadingUsers = false;
        this.lastFetchTime = 0;
        this.wifiState = {
            refreshInterval: null,
            data: null,
            showPassword: false
        };

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
                <aside class="administration-sidebar" style="display: flex; flex-direction: column; overflow: hidden;">
                    <div class="sidebar-collapse-header">
                        <button class="collapse-btn" onclick="administrationInstance.toggleSidebar()">
                            <i class="fas fa-angle-double-left"></i>
                        </button>
                    </div>
                    <nav class="sidebar-nav" style="overflow-y: auto; flex: 1; min-height: 0; padding-bottom: 3rem;">
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
                if (!this.users || (Array.isArray(this.users) && this.users.length === 0) || Date.now() - this.lastFetchTime > 30000) {
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
            case 'email':
                return this.renderEmailTab();
            case 'wifi':
                return await this.renderWifiTab();
            case 'logs':
                return this.renderLogsTab();
            case 'general':
                return this.renderGeneralTab();
            default:
                return this.renderPlaceholderTab(this.activeTab.charAt(0).toUpperCase() + this.activeTab.slice(1), `Management interface for ${this.activeTab}.`);
        }
    }

    renderGeneralTab() {
        return `
            <div style="height: 100%; display: flex; flex-direction: column; overflow: hidden;">
                <div class="settings-card-header" style="flex-shrink: 0; background: transparent; padding: 0.75rem 1.5rem; border-bottom: 1px solid var(--header-border);">
                    <h2 style="font-size: 1.1rem; margin: 0 0 0.25rem 0;"><i class="fas fa-sliders-h"></i> General Settings</h2>
                    <p class="settings-card-description" style="margin: 0; font-size: 0.8rem;">Configure core system parameters and preferences.</p>
                </div>
                <div style="flex: 1; overflow-y: auto; padding: 1.5rem; background: var(--card-bg);">
                    <div style="max-width: 100%;">
                        <div class="settings-form-group" style="margin-bottom: 1rem;">
                            <label for="system-name" style="font-size: 0.8rem; margin-bottom: 0.25rem;">System Name</label>
                            <input type="text" id="system-name" class="form-control" placeholder="My System" value="Enterprise Auditor" style="padding: 0.5rem;">
                            <span class="form-hint" style="margin-top: 0.25rem;">The name displayed in the application header and notifications.</span>
                        </div>
                        <div class="settings-form-group" style="margin-bottom: 1rem;">
                            <label for="base-url" style="font-size: 0.8rem; margin-bottom: 0.25rem;">Base URL</label>
                            <input type="text" id="base-url" class="form-control" placeholder="https://auditor.example.com" value="http://localhost:8080" style="padding: 0.5rem;">
                            <span class="form-hint" style="margin-top: 0.25rem;">The public URL used for links in emails and integrations.</span>
                        </div>
                         <div class="settings-form-group" style="margin-bottom: 1rem;">
                            <label for="language" style="font-size: 0.8rem; margin-bottom: 0.25rem;">Default Language</label>
                            <select id="language" class="form-control" style="padding: 0.5rem;">
                                <option value="en">English (US)</option>
                                <option value="fr">French</option>
                                <option value="de">German</option>
                                <option value="es">Spanish</option>
                            </select>
                        </div>
                         <div class="settings-form-group" style="margin-bottom: 1rem;">
                            <label for="timezone" style="font-size: 0.8rem; margin-bottom: 0.25rem;">Time Zone</label>
                            <select id="timezone" class="form-control" style="padding: 0.5rem;">
                                <option value="UTC">UTC</option>
                                <option value="America/New_York">America/New_York</option>
                                <option value="Europe/London">Europe/London</option>
                                <option value="Europe/Paris">Europe/Paris</option>
                                <option value="Asia/Tokyo">Asia/Tokyo</option>
                            </select>
                        </div>
                        <div class="settings-item" style="padding: 0.75rem 0;">
                            <div class="settings-item-content">
                                <div class="settings-item-info">
                                    <h3 style="font-size: 0.9rem; margin-bottom: 0.25rem;">Maintenance Mode</h3>
                                    <p style="font-size: 0.8rem;">Prevent non-admin users from accessing the system.</p>
                                </div>
                                <div class="settings-item-action">
                                    <label class="toggle-switch" style="transform: scale(0.8); transform-origin: right center;">
                                        <input type="checkbox">
                                        <span class="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer" style="padding: 0.75rem 1.5rem; background: var(--bg); border-top: 1px solid var(--header-border); flex-shrink: 0; border-radius: 0;">
                    <button class="btn btn-primary" style="padding: 0.4rem 1rem; font-size: 0.8rem;"><i class="fas fa-save"></i> Save Changes</button>
                </div>
            </div>
        `;
    }

    renderEmailTab() {
        return `
            <div style="height: 100%; display: flex; flex-direction: column; overflow: hidden;">
                <div class="settings-card-header" style="flex-shrink: 0; background: transparent; padding: 0.75rem 1.5rem; border-bottom: 1px solid var(--header-border);">
                    <h2 style="font-size: 1.1rem; margin: 0 0 0.25rem 0;"><i class="fas fa-envelope"></i> Email Settings</h2>
                    <p class="settings-card-description" style="margin: 0; font-size: 0.8rem;">Configure SMTP settings for sending system notifications and alerts.</p>
                </div>
                <div style="flex: 1; overflow-y: auto; padding: 1.5rem; background: var(--card-bg);">
                    <div style="max-width: 100%;">
                        <div class="settings-form-group" style="margin-bottom: 1rem;">
                            <label for="smtp-server" style="font-size: 0.8rem; margin-bottom: 0.25rem;">SMTP Server</label>
                            <input type="text" id="smtp-server" class="form-control" placeholder="smtp.example.com" value="" style="padding: 0.5rem;">
                            <span class="form-hint" style="margin-top: 0.25rem;">The hostname or IP address of your SMTP server.</span>
                        </div>
                        <div class="settings-form-group" style="margin-bottom: 1rem;">
                            <label for="smtp-port" style="font-size: 0.8rem; margin-bottom: 0.25rem;">SMTP Port</label>
                            <input type="number" id="smtp-port" class="form-control" placeholder="587" value="587" style="padding: 0.5rem;">
                            <span class="form-hint" style="margin-top: 0.25rem;">Common ports: 25, 465, 587.</span>
                        </div>
                        <div class="settings-item" style="padding: 0.75rem 0;">
                            <div class="settings-item-content">
                                <div class="settings-item-info">
                                    <h3 style="font-size: 0.9rem; margin-bottom: 0.25rem;">Use SSL/TLS</h3>
                                    <p style="font-size: 0.8rem;">Enable secure connection for email transmission.</p>
                                </div>
                                <div class="settings-item-action">
                                    <label class="toggle-switch" style="transform: scale(0.8); transform-origin: right center;">
                                        <input type="checkbox" checked>
                                        <span class="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div class="settings-form-group" style="margin-bottom: 1rem;">
                            <label for="smtp-username" style="font-size: 0.8rem; margin-bottom: 0.25rem;">Username</label>
                            <input type="text" id="smtp-username" class="form-control" placeholder="user@example.com" value="" style="padding: 0.5rem;">
                        </div>
                        <div class="settings-form-group" style="margin-bottom: 1rem;">
                            <label for="smtp-password" style="font-size: 0.8rem; margin-bottom: 0.25rem;">Password</label>
                            <input type="password" id="smtp-password" class="form-control" placeholder="••••••••" value="" style="padding: 0.5rem;">
                        </div>
                        <div class="settings-form-group" style="margin-bottom: 1rem;">
                            <label for="sender-email" style="font-size: 0.8rem; margin-bottom: 0.25rem;">Sender Email</label>
                            <input type="email" id="sender-email" class="form-control" placeholder="noreply@example.com" value="" style="padding: 0.5rem;">
                            <span class="form-hint" style="margin-top: 0.25rem;">The email address that will appear in the "From" field.</span>
                        </div>
                    </div>
                </div>
                <div class="modal-footer" style="padding: 0.75rem 1.5rem; background: var(--bg); border-top: 1px solid var(--header-border); flex-shrink: 0; border-radius: 0;">
                    <button class="btn btn-secondary" style="margin-right: 0.5rem; padding: 0.4rem 1rem; font-size: 0.8rem;"><i class="fas fa-paper-plane"></i> Test Email</button>
                    <button class="btn btn-primary" style="padding: 0.4rem 1rem; font-size: 0.8rem;"><i class="fas fa-save"></i> Save Changes</button>
                </div>
            </div>
        `;
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
                const data = await response.json();
                this.users = Array.isArray(data) ? data : [];
                this.lastFetchTime = Date.now();
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            this.loadingUsers = false;
        }
    }

    renderUsersTab() {
        if (this.loadingUsers && (!this.users || this.users.length === 0)) {
            return `
                <div style="height: 100%; display: flex; align-items: center; justify-content: center; color: var(--text-muted);">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary);"></i>
                        <p>Loading users...</p>
                    </div>
                </div>
            `;
        }

        return `
            <div style="height: 100%; display: flex; flex-direction: column; overflow: hidden;">
                <div class="settings-card-header" style="flex-shrink: 0; background: transparent; padding: 0.75rem 1.5rem; border-bottom: 1px solid var(--header-border);">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <h2 style="font-size: 1.1rem; margin: 0 0 0.25rem 0;"><i class="fas fa-users"></i> User Management</h2>
                            <p class="settings-card-description" style="margin: 0; font-size: 0.8rem;">Manage system users, roles, and access permissions.</p>
                        </div>
                    </div>
                </div>
                
                <div style="flex-shrink: 0; padding: 0.5rem 1.5rem; border-bottom: 1px solid var(--header-border); display: flex; justify-content: space-between; align-items: center; background: rgba(15, 23, 42, 0.4);">
                    <div class="admin-action-group left" style="display: flex; gap: 0.5rem;">
                        <button class="admin-action-btn primary" onclick="administrationInstance.openUserModal('new')" style="padding: 0.35rem 0.6rem; font-size: 0.7rem;"><i class="fas fa-plus"></i> NEW</button>
                        <button class="admin-action-btn" onclick="administrationInstance.editSelectedUser()" style="padding: 0.35rem 0.6rem; font-size: 0.7rem;"><i class="fas fa-edit"></i> EDIT</button>
                        <div style="width: 1px; background: var(--header-border); margin: 0 0.25rem;"></div>
                        <button class="admin-action-btn" onclick="administrationInstance.toggleSelectedUserStatus(true)" style="padding: 0.35rem 0.6rem; font-size: 0.7rem; color: #10b981;"><i class="fas fa-check"></i> ENABLE</button>
                        <button class="admin-action-btn" onclick="administrationInstance.toggleSelectedUserStatus(false)" style="padding: 0.35rem 0.6rem; font-size: 0.7rem; color: #f59e0b;"><i class="fas fa-ban"></i> DISABLE</button>
                        <button class="admin-action-btn danger" onclick="administrationInstance.deleteSelectedUser()" style="padding: 0.35rem 0.6rem; font-size: 0.7rem;"><i class="fas fa-trash"></i> DELETE</button>
                    </div>
                    <div class="admin-action-group right" style="display: flex; gap: 0.5rem;">
                        <button class="admin-action-btn" onclick="administrationInstance.fetchUsers().then(() => administrationInstance.updateUI())" style="padding: 0.35rem 0.6rem; font-size: 0.7rem;"><i class="fas fa-sync-alt"></i> REFRESH</button>
                    </div>
                </div>

                <div style="flex: 1; overflow: hidden; background: var(--card-bg); padding: 0;">
                    <div class="admin-table-container" style="height: 100%; overflow-y: auto; padding: 0;">
                        <table class="admin-table" style="width: 100%; border-collapse: collapse; font-size: 0.75rem;">
                            <thead>
                                <tr style="position: sticky; top: 0; background: var(--bg); z-index: 1;">
                                    <th class="col-select" style="width: 40px; padding: 0.5rem 0.75rem; text-align: center; border-bottom: 1px solid var(--header-border);">
                                        <i class="fas fa-check-square" style="color: var(--text-muted); opacity: 0.5;"></i>
                                    </th>
                                    <th class="col-sortable" style="padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid var(--header-border);">User</th>
                                    <th class="col-sortable" style="padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid var(--header-border);">Role</th>
                                    <th class="col-sortable" style="padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid var(--header-border);">Status</th>
                                    <th class="col-sortable" style="padding: 0.5rem 0.75rem; text-align: right; border-bottom: 1px solid var(--header-border);">Quota Usage</th>
                                    <th class="col-sortable" style="padding: 0.5rem 0.75rem; text-align: right; border-bottom: 1px solid var(--header-border);">Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.loadingUsers ? `
                                    <tr>
                                        <td colspan="6" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                                            <i class="fas fa-circle-notch fa-spin" style="font-size: 1.5rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                                            <div>Loading users...</div>
                                        </td>
                                    </tr>
                                ` : (this.users && this.users.length > 0 ? this.users.map(user => `
                                    <tr style="border-bottom: 1px solid rgba(51, 65, 85, 0.3); transition: background 0.15s;" onclick="this.querySelector('input').click()">
                                        <td class="col-select" style="padding: 0.4rem 0.75rem; text-align: center;">
                                            <input type="radio" name="user-select" value="${user.id || user.username}" style="cursor: pointer;">
                                        </td>
                                        <td style="padding: 0.4rem 0.75rem;">
                                            <div style="display: flex; align-items: center; gap: 0.75rem;">
                                                <div style="width: 28px; height: 28px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 0.75rem;">
                                                    ${user.username.charAt(0).toUpperCase()}
                                                </div>
                                                <div style="display: flex; flex-direction: column;">
                                                    <span style="font-weight: 500; color: var(--text-main); font-size: 0.8rem;">${user.username}</span>
                                                    <span style="font-size: 0.7rem; color: var(--text-muted);">${user.email || 'No email'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td style="padding: 0.4rem 0.75rem;">
                                            <span style="background: rgba(99, 102, 241, 0.1); color: #818cf8; padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.7rem;">
                                                ${user.role || 'User'}
                                            </span>
                                        </td>
                                        <td style="padding: 0.4rem 0.75rem;">
                                            <span class="admin-status-badge ${(user.status || 'Enabled').toLowerCase()}" 
                                                  style="padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 0.7rem; font-weight: 500; background: ${user.status === 'Disabled' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)'}; color: ${user.status === 'Disabled' ? '#f59e0b' : '#10b981'};">
                                                ${user.status || 'Enabled'}
                                            </span>
                                            ${user.is_locked ? '<i class="fas fa-lock" style="font-size: 0.7rem; color: #ef4444; margin-left: 0.5rem;" title="Account Locked"></i>' : ''}
                                        </td>
                                        <td style="padding: 0.4rem 0.75rem; text-align: right; font-family: monospace; color: var(--text-muted);">
                                            ${user.usage || '0 B'} <span style="color: #64748b;">/ ${user.quota || 'Unlimited'}</span>
                                        </td>
                                        <td style="padding: 0.4rem 0.75rem; text-align: right; color: var(--text-muted);">
                                            ${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '--'}
                                        </td>
                                    </tr>
                                `).join('') : `
                                    <tr>
                                        <td colspan="6" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                                            <i class="fas fa-users-slash" style="font-size: 1.5rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                                            <div>No users found</div>
                                        </td>
                                    </tr>
                                `)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    // User Management Methods
    openUserModal(mode, userId = null) {
        this.currentUserMode = mode;
        this.currentUserId = userId;

        let user = { username: '', role: 'user', status: 'Enabled', quota: 'Unlimited', email: '' };
        if (mode === 'edit' && userId) {
            user = this.users.find(u => (u.id || u.username) == userId) || user;
        }

        const title = mode === 'new' ? 'New User Account' : 'Edit User Settings';
        const content = `
            <div class="user-form-compact" style="padding: 0.25rem;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 0.75rem;">
                    <div>
                        <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.3rem; font-weight: 500;">Username</label>
                        <input type="text" id="user-modal-username" class="form-control" value="${user.username}" ${mode === 'edit' ? 'readonly' : ''} 
                               style="width: 100%; padding: 0.5rem; background: rgba(0,0,0,0.1); border: 1px solid var(--header-border); color: var(--text-color); border-radius: 4px; font-size: 0.8rem; ${mode === 'edit' ? 'opacity: 0.6; cursor: not-allowed;' : ''}">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.3rem; font-weight: 500;">Email Address</label>
                        <input type="email" id="user-modal-email" class="form-control" value="${user.email || ''}" placeholder="email@example.com" 
                               style="width: 100%; padding: 0.5rem; background: rgba(0,0,0,0.1); border: 1px solid var(--header-border); color: var(--text-color); border-radius: 4px; font-size: 0.8rem;">
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 0.75rem;">
                <div>
                    <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.3rem; font-weight: 500;">
                        ${mode === 'edit' ? 'Change Password' : 'Password'} 
                        ${mode === 'edit' ? '<span style="font-weight: normal; opacity: 0.7;">(optional)</span>' : ''}
                    </label>
                    <input type="password" id="user-modal-password" class="form-control" placeholder="••••••••" 
                           style="width: 100%; padding: 0.5rem; background: rgba(0,0,0,0.1); border: 1px solid var(--header-border); color: var(--text-color); border-radius: 4px; font-size: 0.8rem;">
                </div>
                <div>
                    <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.3rem; font-weight: 500;">Confirm Password</label>
                    <input type="password" id="user-modal-confirm" class="form-control" placeholder="••••••••" 
                           style="width: 100%; padding: 0.5rem; background: rgba(0,0,0,0.1); border: 1px solid var(--header-border); color: var(--text-color); border-radius: 4px; font-size: 0.8rem;">
                </div>
            </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 0.25rem;">
                    <div>
                        <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.3rem; font-weight: 500;">Role</label>
                        <select id="user-modal-role" class="form-control" style="width: 100%; padding: 0.5rem; background: rgba(0,0,0,0.1); border: 1px solid var(--header-border); color: var(--text-color); border-radius: 4px; font-size: 0.8rem; cursor: pointer;">
                            <option value="user" ${user.role === 'user' ? 'selected' : ''}>Standard User</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Administrator</option>
                            <option value="auditor" ${user.role === 'auditor' ? 'selected' : ''}>Auditor</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.3rem; font-weight: 500;">Status</label>
                        <select id="user-modal-status" class="form-control" style="width: 100%; padding: 0.6rem; background: rgba(0,0,0,0.1); border: 1px solid var(--header-border); color: var(--text-color); border-radius: 4px; font-size: 0.8rem; cursor: pointer;">
                            <option value="Enabled" ${user.status === 'Enabled' ? 'selected' : ''}>Enabled</option>
                            <option value="Disabled" ${user.status === 'Disabled' ? 'selected' : ''}>Disabled</option>
                        </select>
                    </div>
                </div>
            </div>
        `;

        const actions = [
            { label: 'Cancel', onclick: 'modalInstance.close()', class: 'btn-secondary' },
            { label: mode === 'new' ? 'Create User' : 'Save Changes', onclick: 'administrationInstance.saveUser()', class: 'btn-primary', icon: 'fas fa-check' }
        ];

        window.modalInstance.open(title, content, actions, true);
    }

    async saveUser() {
        const username = document.getElementById('user-modal-username').value;
        const role = document.getElementById('user-modal-role').value;
        const status = document.getElementById('user-modal-status').value;
        const email = document.getElementById('user-modal-email').value;

        if (!username) {
            alert('Username is required');
            return;
        }

        let body = { username, role, status, email };

        const password = document.getElementById('user-modal-password').value;
        const confirm = document.getElementById('user-modal-confirm').value;

        if (this.currentUserMode === 'new') {
            if (!password) {
                alert('Password is required');
                return;
            }
        }

        if (password) {
            if (password !== confirm) {
                alert('Passwords do not match');
                return;
            }
            body.password = password;
        }

        if (this.currentUserMode === 'edit') {
            const parsedId = parseInt(this.currentUserId);
            if (!isNaN(parsedId)) {
                body.id = parsedId;
            }
        }
        try {
            const token = localStorage.getItem('jwt_token');
            const method = this.currentUserMode === 'new' ? 'POST' : 'PUT';
            const response = await fetch('/api/admin/users', {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                window.modalInstance.close();
                await this.fetchUsers();
                this.updateUI();
            } else {
                const err = await response.text();
                alert('Failed to save user: ' + err);
            }
        } catch (error) {
            console.error('Error saving user:', error);
            alert('System error saving user');
        }
    }

    getSelectedUserId() {
        const checked = document.querySelector('input[name="user-select"]:checked');
        if (!checked) {
            alert('Please select a user first.');
            return null;
        }
        return checked.value;
    }

    editSelectedUser() {
        const id = this.getSelectedUserId();
        if (id) this.openUserModal('edit', id);
    }

    async deleteSelectedUser() {
        const userId = this.getSelectedUserId();
        if (!userId) {
            alert('Please select a user to delete');
            return;
        }

        const user = this.users.find(u => (u.id || u.username) == userId);
        if (!user) return;

        if (user.username === 'admin') {
            alert('The primary administrator account cannot be deleted.');
            return;
        }

        if (!confirm(`Are you sure you want to delete user "${user.username}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const token = localStorage.getItem('jwt_token');
            const response = await fetch(`/api/admin/users?username=${encodeURIComponent(user.username)}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                await this.fetchUsers();
                this.updateUI();
            } else {
                const err = await response.text();
                alert('Failed to delete user: ' + err);
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('System error deleting user');
        }
    }

    async toggleSelectedUserStatus(enabled) {
        const userId = this.getSelectedUserId();
        if (!userId) {
            alert(`Please select a user to ${enabled ? 'enable' : 'disable'}`);
            return;
        }

        const user = this.users.find(u => (u.id || u.username) == userId);
        if (!user) return;

        const newStatus = enabled ? 'Enabled' : 'Disabled';

        try {
            const token = localStorage.getItem('jwt_token');
            const response = await fetch('/api/admin/users', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    id: parseInt(user.id),
                    username: user.username,
                    role: user.role,
                    status: newStatus,
                    email: user.email
                })
            });

            if (response.ok) {
                await this.fetchUsers();
                this.updateUI();
            } else {
                const err = await response.text();
                alert('Failed to update user status: ' + err);
            }
        } catch (error) {
            console.error('Error toggling user status:', error);
            alert('System error updating status');
        }
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

    renderWifiTab() {
        return `
            <div style="height: 100%; display: flex; flex-direction: column; overflow: hidden;">
                <div class="settings-card-header" style="flex-shrink: 0; background: transparent; padding: 0.75rem 1.5rem; border-bottom: 1px solid var(--header-border);">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <h2 style="font-size: 1.1rem; margin: 0 0 0.25rem 0;"><i class="fas fa-wifi"></i> WiFi Management</h2>
                            <p class="settings-card-description" style="margin: 0; font-size: 0.8rem;">Monitor and manage wireless access point and connected clients.</p>
                        </div>
                    </div>
                </div>
                
                <div style="flex-shrink: 0; padding: 0.5rem 1.5rem; border-bottom: 1px solid var(--header-border); display: flex; justify-content: space-between; align-items: center; background: rgba(15, 23, 42, 0.4);">
                    <div class="admin-action-group left" style="display: flex; gap: 1rem; align-items: center;">
                         <!-- Status Bar integrated in Toolbar -->
                        <div style="display: flex; gap: 1rem; align-items: center; font-size: 0.8rem; color: var(--text-muted);">
                            <div style="display: flex; align-items: center; gap: 0.5rem;" title="SSID">
                                <i class="fas fa-broadcast-tower" style="color: #60a5fa;"></i>
                                <span id="ap-ssid" style="color: var(--text-main); font-weight: 500;">--</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.5rem;" title="Password">
                                <i class="fas fa-key" style="color: #64748b;"></i>
                                <span id="ap-password" style="font-family: monospace;">••••••••</span>
                                <button onclick="administrationInstance.toggleWifiPassword()" style="background: none; border: none; color: #64748b; cursor: pointer; padding: 0;">
                                    <i id="password-toggle-icon" class="fas fa-eye"></i>
                                </button>
                            </div>
                             <div style="display: flex; align-items: center; gap: 0.5rem;" title="Details">
                                <span class="admin-status-badge enabled" id="ap-band-badge" style="background: rgba(59, 130, 246, 0.1); color: #60a5fa;">-- GHz</span>
                                <span class="admin-status-badge" id="ap-channel-badge" style="background: rgba(148, 163, 184, 0.1); color: #94a3b8;">Ch --</span>
                            </div>
                        </div>
                    </div>
                    <div class="admin-action-group right" style="display: flex; gap: 0.5rem;">
                         <button class="admin-action-btn" onclick="administrationInstance.loadWifiData()" style="padding: 0.35rem 0.6rem; font-size: 0.7rem;"><i class="fas fa-sync-alt"></i> REFRESH</button>
                    </div>
                </div>

                <div style="flex: 1; overflow: hidden; background: var(--card-bg); padding: 0;">
                    <div class="admin-table-container" style="height: 100%; overflow-y: auto; padding: 0;">
                        <table class="admin-table" style="width: 100%; border-collapse: collapse; font-size: 0.75rem;">
                            <thead>
                                <tr style="position: sticky; top: 0; background: var(--bg); z-index: 1;">
                                    <th class="col-sortable" style="padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid var(--header-border);">Device</th>
                                    <th class="col-sortable" style="padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid var(--header-border);">IP Address</th>
                                    <th class="col-sortable" style="padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid var(--header-border);">MAC Address</th>
                                    <th class="col-sortable" style="padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid var(--header-border);">Signal</th>
                                    <th class="col-sortable" style="padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid var(--header-border);">Activity (Tx/Rx)</th>
                                    <th class="col-sortable" style="padding: 0.5rem 0.75rem; text-align: right; border-bottom: 1px solid var(--header-border);">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="clients-tbody">
                                <tr>
                                    <td colspan="6" style="text-align: center; padding: 2rem; color: #94a3b8;">
                                        <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
                                            <i class="fas fa-spinner fa-spin" style="font-size: 1.5rem; color: #3b82f6; opacity: 0.5;"></i>
                                            <div style="font-size: 0.8125rem;">Scanning wireless environment...</div>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Footer Info Bar -->
                <div style="padding: 0.5rem 1.5rem; border-top: 1px solid var(--header-border); background: var(--bg); display: flex; justify-content: space-between; font-size: 0.75rem; color: #94a3b8;">
                    <span id="wifi-footer-clients">0 Clients Connected</span>
                    <span id="wifi-footer-traffic">Traffic: 0 MB</span>
                </div>
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

    async toggleCategory(key) {
        if (this.expandedCategories.has(key)) {
            this.expandedCategories.delete(key);
        } else {
            this.expandedCategories.add(key);
        }
        await this.fullRerender();
    }

    async toggleSidebar() {
        this.sidebarCollapsed = !this.sidebarCollapsed;
        await this.fullRerender();
    }

    async switchTab(tab) {
        if (this.activeTab === 'wifi') {
            this.unmountWifi();
        }

        this.activeTab = tab;

        // Update URL with the new tab
        const hash = window.location.hash;
        const [pagePart] = hash.split('?');
        window.history.replaceState(null, '', `${pagePart}?tab=${tab}`);

        await this.updateUI();

        if (this.activeTab === 'wifi') {
            await this.mountWifi();
        }
    }

    async fullRerender() {
        const container = document.getElementById('page-content');
        if (container) {
            container.innerHTML = await this.render();
            if (this.activeTab === 'wifi') {
                await this.mountWifi();
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
        this.unmountWifi();
    }

    // WiFi Manager Helper Methods
    getDeviceIcon(vendor) {
        if (!vendor) return 'fa-laptop';
        const v = vendor.toLowerCase();
        if (v.includes('apple')) return 'fa-mobile-alt';
        if (v.includes('sams') || v.includes('google') || v.includes('android')) return 'fa-mobile-alt';
        if (v.includes('intel') || v.includes('dell') || v.includes('hp')) return 'fa-laptop';
        if (v.includes('asus') || v.includes('gigabyte')) return 'fa-desktop';
        if (v.includes('tplink') || v.includes('cisco') || v.includes('ubiquiti')) return 'fa-network-wired';
        return 'fa-laptop';
    }

    async mountWifi() {
        await this.loadWifiData();
        // Auto refresh every 5s
        this.wifiState.refreshInterval = setInterval(() => this.loadWifiData(), 5000);
    }

    unmountWifi() {
        if (this.wifiState.refreshInterval) {
            clearInterval(this.wifiState.refreshInterval);
            this.wifiState.refreshInterval = null;
        }
    }

    async loadWifiData() {
        try {
            const response = await fetch('/api/wifi/status');
            if (response.ok) {
                this.wifiState.data = await response.json();
                this.updateWifiUI();
            } else {
                console.error("Failed to load Wifi status");
            }
        } catch (e) {
            console.error("Error loading Wifi status", e);
        }
    }

    toggleWifiPassword() {
        this.wifiState.showPassword = !this.wifiState.showPassword;
        this.updateWifiPasswordDisplay();
    }

    updateWifiPasswordDisplay() {
        const passElem = document.getElementById('ap-password');
        const iconElem = document.getElementById('password-toggle-icon');
        if (!passElem || !this.wifiState.data) return;

        if (this.wifiState.showPassword) {
            passElem.textContent = this.wifiState.data.password || 'No Password';
            passElem.style.letterSpacing = 'normal';
            iconElem.className = 'fas fa-eye-slash';
        } else {
            passElem.textContent = '••••••••';
            passElem.style.letterSpacing = '1px';
            iconElem.className = 'fas fa-eye';
        }
    }

    updateWifiUI() {
        if (!this.wifiState.data) return;
        const data = this.wifiState.data;

        // Update Header/Toolbar Info
        const ssidElem = document.getElementById('ap-ssid');
        if (ssidElem) ssidElem.textContent = data.ssid || 'Unknown';

        this.updateWifiPasswordDisplay();

        const bandBadge = document.getElementById('ap-band-badge');
        if (bandBadge) bandBadge.textContent = data.band ? `${data.band.replace('GHz', '')} GHz` : '-- GHz';

        const channelBadge = document.getElementById('ap-channel-badge');
        if (channelBadge) channelBadge.textContent = `Ch ${data.channel || '--'}`;

        // Footer Stats
        const footerClients = document.getElementById('wifi-footer-clients');
        if (footerClients) footerClients.textContent = `${data.totalClients} Client${data.totalClients !== 1 ? 's' : ''} Connected`;

        const rxMb = (data.trafficRx / 1024 / 1024).toFixed(1);
        const txMb = (data.trafficTx / 1024 / 1024).toFixed(1);
        const footerTraffic = document.getElementById('wifi-footer-traffic');
        if (footerTraffic) footerTraffic.textContent = `Traffic: ${rxMb} MB Rx / ${txMb} MB Tx`;


        // Update Clients Table
        const tbody = document.getElementById('clients-tbody');
        if (!tbody) return;

        if (data.clients.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #94a3b8;">No clients connected</td></tr>`;
            return;
        }

        tbody.innerHTML = data.clients.map(client => {
            let signalClass = '#10b981'; // Green
            if (client.signal < -70) signalClass = '#f59e0b'; // Orange
            if (client.signal < -80) signalClass = '#ef4444'; // Red

            const deviceIcon = this.getDeviceIcon(client.vendor);

            return `
                <tr style="border-bottom: 1px solid rgba(51, 65, 85, 0.3);">
                    <td style="padding: 0.4rem 0.75rem;">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <div style="width: 28px; height: 28px; border-radius: 6px; background: rgba(59, 130, 246, 0.1); display: flex; align-items: center; justify-content: center; color: #60a5fa;">
                                <i class="fas ${deviceIcon}"></i>
                            </div>
                            <div>
                                <div style="font-weight: 500; color: var(--text-main); font-size: 0.8rem;">${client.hostname}</div>
                                <div style="font-size: 0.7rem; color: var(--text-muted);">${client.vendor || 'Unknown Vendor'}</div>
                            </div>
                        </div>
                    </td>
                    <td style="padding: 0.4rem 0.75rem;">
                         <code style="color: #60a5fa; font-size: 0.75rem; background: rgba(59, 130, 246, 0.1); padding: 0.1rem 0.3rem; border-radius: 4px;">${client.ip}</code>
                    </td>
                    <td style="padding: 0.4rem 0.75rem;">
                        <code style="font-size: 0.75rem; color: var(--text-muted); font-family: monospace;">${client.mac}</code>
                    </td>
                    <td style="padding: 0.4rem 0.75rem;">
                         <div style="display: flex; align-items: center; gap: 0.5rem;">
                             <i class="fas fa-signal" style="color: ${signalClass}; font-size: 0.8rem;"></i>
                             <span style="font-size: 0.8rem; color: var(--text-main);">${client.signal} dBm</span>
                         </div>
                    </td>
                    <td style="padding: 0.4rem 0.75rem;">
                        <div style="font-size: 0.75rem; color: var(--text-muted);">
                            <span style="color: #10b981;"><i class="fas fa-arrow-down" style="font-size: 0.6rem;"></i> ${client.rxBitrate}</span> / 
                            <span style="color: #3b82f6;"><i class="fas fa-arrow-up" style="font-size: 0.6rem;"></i> ${client.txBitrate}</span> Mbps
                        </div>
                    </td>
                    <td style="padding: 0.4rem 0.75rem; text-align: right;">
                        <div style="display: flex; justify-content: flex-end; gap: 0.5rem;">
                            <button class="btn btn-icon btn-compact" onclick="administrationInstance.kickWifiClient('${client.mac}', '${client.hostname}')" title="Kick Client" style="padding: 0.2rem; background: none; border: none; color: #f59e0b; cursor: pointer;">
                                <i class="fas fa-times-circle"></i>
                            </button>
                             <button class="btn btn-icon btn-compact" onclick="administrationInstance.blockWifiClient('${client.mac}', '${client.hostname}')" title="Block Client" style="padding: 0.2rem; background: none; border: none; color: #ef4444; cursor: pointer;">
                                <i class="fas fa-ban"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    formatTime(seconds) {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        return `${Math.floor(seconds / 3600)}h`;
    }

    async kickWifiClient(mac, hostname) {
        if (!confirm(`Are you sure you want to kick "${hostname || mac}"? \nThis will force the device to disconnect from the WiFi.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/wifi/kick?mac=${encodeURIComponent(mac)}`, {
                method: 'POST'
            });

            if (response.ok) {
                this.loadWifiData();
            } else {
                const error = await response.text();
                alert(`Failed to kick client: ${error}`);
            }
        } catch (error) {
            console.error('Error kicking client:', error);
            alert('Error communicating with the server.');
        }
    }

    async blockWifiClient(mac, hostname) {
        if (!confirm(`ARE YOU SURE you want to BLOCK "${hostname || mac}" PERMANENTLY? \nThis device will be blacklisted and will NOT be able to reconnect until manually unblocked.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/wifi/block?mac=${encodeURIComponent(mac)}`, {
                method: 'POST'
            });

            const result = await response.json();

            if (response.ok) {
                this.loadWifiData();
            } else {
                alert(`Failed to block client: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error blocking client:', error);
            alert('Error communicating with the server.');
        }
    }
}
