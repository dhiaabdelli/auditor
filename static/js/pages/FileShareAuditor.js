export class FileShareAuditorPage {
    constructor() {
        this.reportData = null;
        this.reportId = null;
        this.loading = false;
        this.currentLanguage = localStorage.getItem('language') || 'en';
        this.groupsArray = [];
        this.usersArray = [];
        this.showCriticalIssuesModal = false;
        this.showWarningIssuesModal = false;
        this.selectedFolderForModal = null;
        this.folderTreeData = null; // Store original folder tree data
        this.selectedCriticalIssuesModal = null;
        this.selectedWarningIssuesModal = null;
        this.selectedGroupModal = null;
        this.selectedUserModal = null;
        this.isRedFlagsModalOpen = false;
        this.selectedShareRedFlags = null;
        this.isShareDetailsModalOpen = false;
        this.selectedShareDetails = null;
        this.activeView = 'overview'; // 'overview' or 'folder-tree'
        this.sidebarCollapsed = false;
        this.expandedCategories = new Set(['navigation']);
        this.translations = {
            en: {
                title: 'File Share Audit',
                subtitle: 'Comprehensive audit report for file shares',
                loading: 'Loading audit report...',
                error: 'Error loading report',
                back: 'Back to List',
                noData: 'No audit data available',
                script: 'Download Script',
                import: 'Import Data',
                serverName: 'Server Name',
                auditDate: 'Audit Date',
                totalShares: 'Total Shares',
                shareName: 'Share Name',
                path: 'Path',
                description: 'Description',
                shareType: 'Share Type',
                permissions: 'Permissions',
                ntfsPermissions: 'NTFS Permissions',
                totalSize: 'Total Size (GB)',
                fileCount: 'File Count',
                lastAccessed: 'Last Accessed',
                isAdministrative: 'Administrative',
                isHidden: 'Hidden',
                accountName: 'Account Name',
                accessRight: 'Access Right',
                accessControlType: 'Access Control Type',
                identityReference: 'Identity Reference',
                fileSystemRights: 'File System Rights',
                isInherited: 'Inherited'
            },
            fr: {
                title: 'Audit Partage de Fichiers',
                subtitle: 'Rapport d\'audit complet pour les partages de fichiers',
                loading: 'Chargement du rapport d\'audit...',
                error: 'Erreur lors du chargement du rapport',
                back: 'Retour à la liste',
                noData: 'Aucune donnée d\'audit disponible',
                script: 'Télécharger le Script',
                import: 'Importer les Données',
                serverName: 'Nom du Serveur',
                auditDate: 'Date d\'Audit',
                totalShares: 'Total des Partages',
                shareName: 'Nom du Partage',
                path: 'Chemin',
                description: 'Description',
                shareType: 'Type de Partage',
                permissions: 'Permissions',
                ntfsPermissions: 'Permissions NTFS',
                totalSize: 'Taille Totale (Go)',
                fileCount: 'Nombre de Fichiers',
                lastAccessed: 'Dernier Accès',
                isAdministrative: 'Administratif',
                isHidden: 'Masqué',
                accountName: 'Nom du Compte',
                accessRight: 'Droit d\'Accès',
                accessControlType: 'Type de Contrôle d\'Accès',
                identityReference: 'Référence d\'Identité',
                fileSystemRights: 'Droits du Système de Fichiers',
                isInherited: 'Hérité'
            }
        };
        this.sidebarCollapsed = false;
    }

    toggleSidebar() {
        this.sidebarCollapsed = !this.sidebarCollapsed;
        this.updateDisplay();
    }

    toggleCategory(key) {
        if (this.expandedCategories.has(key)) {
            this.expandedCategories.delete(key);
        } else {
            this.expandedCategories.add(key);
        }
        this.updateDisplay();
    }

    switchView(view) {
        this.activeView = view;
        this.updateDisplay();
    }

    t(key) {
        return this.translations[this.currentLanguage][key] || key;
    }

    async render() {
        if (this.loading) {
            return `
                <div class="administration-container page-container-full">
                    <div class="loading-container" style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                        <div class="loading-spinner"></div>
                        <p>${this.t('loading')}</p>
                    </div>
                </div>
            `;
        }

        if (!this.reportData) {
            return `
                <div class="administration-container page-container-full ${this.sidebarCollapsed ? 'sidebar-collapsed' : ''}">
                    <input type="file" id="file-share-report-file-input" accept=".json" style="display: none;" onchange="fileShareAuditorInstance.handleFileSelect(event)">
                    
                    <aside class="administration-sidebar">
                        <div class="sidebar-collapse-header">
                            <button class="collapse-btn" onclick="fileShareAuditorInstance.toggleSidebar()">
                                <i class="fas fa-angle-double-left"></i>
                            </button>
                        </div>
                        <nav class="sidebar-nav">
                            <button class="nav-item active">
                                <i class="fas fa-chart-line"></i>
                                <span>Overview</span>
                            </button>
                        </nav>
                    </aside>

                    <main class="administration-content" style="padding: 0;">
                        <div class="file-share-auditor-main premium-auditor-container" style="height: 100%; display: flex; flex-direction: column; gap: 0; padding: 0;">
                            <div class="premium-header-modern" style="padding: 1rem 1.5rem; margin: 1.5rem 1.5rem 0 1.5rem;">
                                <div class="premium-title-group">
                                    <button class="page-header-back-btn" onclick="fileShareAuditorInstance.goBack()" style="background: rgba(148, 163, 184, 0.08); border: none; color: #f8fafc; border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;">
                                        <i class="fas fa-arrow-left" style="font-size: 1rem;"></i>
                                    </button>
                                    <div class="premium-title-text">
                                        <h2 style="font-size: 1.5rem;">${this.t('title')}</h2>
                                        <p style="font-size: 0.75rem;">${this.reportData?.serverName || this.t('noData') || 'File Share Audit'}</p>
                                    </div>
                                </div>
                                <div class="premium-btn-group">
                                    <button class="premium-action-btn" onclick="fileShareAuditorInstance.loadReport()" style="height: 36px;">
                                        <i class="fas fa-sync-alt"></i>
                                    </button>
                                    <button class="premium-action-btn" onclick="fileShareAuditorInstance.generateScript({ encrypt: true, obfuscate: true })" style="height: 36px;">
                                        <i class="fas fa-code"></i>
                                        <span>Script</span>
                                    </button>
                                    <button class="premium-action-btn" onclick="fileShareAuditorInstance.showImportDialog()" style="height: 36px;">
                                        <i class="fas fa-upload"></i>
                                        <span>Import</span>
                                    </button>
                                </div>
                            </div>
                            <div class="audit-content">
                                <div class="reports-empty-state">
                                    <i class="fas fa-folder-open fa-3x"></i>
                                    <p>${this.t('noData')}</p>
                                    <p style="margin-top: 1rem; color: #94a3b8; font-size: 0.875rem;">
                                        Click "Script" to download the PowerShell script, run it on your server, then click "Import" to upload the JSON output.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            `;
        }

        const folderAnalysis = this.reportData.folderAnalysis || {};
        const serverName = this.reportData.serverName || 'N/A';
        const auditDate = this.reportData.auditDate || 'N/A';
        const summary = folderAnalysis.summary || {};
        const criticalIssues = summary.criticalIssues || [];
        const warningIssues = summary.warningIssues || [];
        const folderTree = folderAnalysis.folderTree || [];

        // Calculate total permissions statistics
        let totalPermissions = 0;
        let totalExplicit = 0;
        let totalInherited = 0;
        let totalDenyAces = 0;
        let totalAllow = 0;

        // Aggregate groups and users with their folder access
        const groupsMap = new Map(); // groupName -> { folders: [], totalFolders: 0, rights: Set }
        const usersMap = new Map(); // userName -> { folders: [], totalFolders: 0, rights: Set }

        folderTree.forEach(folder => {
            const perms = folder.permissions || [];
            totalPermissions += perms.length;
            totalExplicit += perms.filter(p => !p.isInherited).length;
            totalInherited += perms.filter(p => p.isInherited).length;
            totalDenyAces += perms.filter(p => p.accessControlType === 'Deny').length;
            totalAllow += perms.filter(p => p.accessControlType === 'Allow').length;

            // Process each permission to categorize as group or user
            perms.forEach(perm => {
                const identity = perm.identityReference || '';
                if (!identity || identity.trim() === '') return;

                // Detect groups: BUILTIN\, NT AUTHORITY\, Domain\Group patterns, or well-known groups
                const isGroup = identity.includes('BUILTIN\\') ||
                    identity.includes('NT AUTHORITY\\') ||
                    identity.includes('Everyone') ||
                    identity.includes('Authenticated Users') ||
                    identity.includes('Domain Users') ||
                    identity.includes('Users') ||
                    identity.includes('Administrators') ||
                    identity.includes('Guests') ||
                    identity.includes('Backup Operators') ||
                    identity.includes('Power Users') ||
                    (identity.includes('\\') && !identity.match(/^[A-Z]+\\[A-Za-z0-9_]+$/i)); // Domain\User pattern (not a group)

                // Skip system accounts (SYSTEM, CREATOR OWNER, etc.)
                if (identity.includes('SYSTEM') || identity.includes('CREATOR OWNER') || identity.includes('SELF')) {
                    return;
                }

                if (isGroup) {
                    if (!groupsMap.has(identity)) {
                        groupsMap.set(identity, { folders: [], rights: new Set(), totalFolders: 0 });
                    }
                    const groupData = groupsMap.get(identity);
                    // Avoid duplicate folders
                    const folderExists = groupData.folders.some(f => f.path === folder.path);
                    if (!folderExists) {
                        groupData.folders.push({
                            path: folder.path || '',
                            relativePath: folder.relativePath || folder.name || '',
                            rights: perm.fileSystemRights || '',
                            accessType: perm.accessControlType || '',
                            isInherited: perm.isInherited || false,
                            riskLevel: perm.riskLevel || 'Low'
                        });
                        groupData.totalFolders = groupData.folders.length;
                    }
                    groupData.rights.add(perm.fileSystemRights || '');
                } else {
                    // Assume it's a user
                    if (!usersMap.has(identity)) {
                        usersMap.set(identity, { folders: [], rights: new Set(), totalFolders: 0 });
                    }
                    const userData = usersMap.get(identity);
                    // Avoid duplicate folders
                    const folderExists = userData.folders.some(f => f.path === folder.path);
                    if (!folderExists) {
                        userData.folders.push({
                            path: folder.path || '',
                            relativePath: folder.relativePath || folder.name || '',
                            rights: perm.fileSystemRights || '',
                            accessType: perm.accessControlType || '',
                            isInherited: perm.isInherited || false,
                            riskLevel: perm.riskLevel || 'Low'
                        });
                        userData.totalFolders = userData.folders.length;
                    }
                    userData.rights.add(perm.fileSystemRights || '');
                }
            });
        });

        // Convert maps to sorted arrays and store in class
        this.groupsArray = Array.from(groupsMap.entries())
            .map(([name, data]) => ({ name, ...data, rights: Array.from(data.rights) }))
            .sort((a, b) => b.totalFolders - a.totalFolders);

        this.usersArray = Array.from(usersMap.entries())
            .map(([name, data]) => ({ name, ...data, rights: Array.from(data.rights) }))
            .sort((a, b) => b.totalFolders - a.totalFolders);

        return `
            <div class="administration-container page-container-full ${this.sidebarCollapsed ? 'sidebar-collapsed' : ''}">
                <input type="file" id="file-share-report-file-input" accept=".json" style="display: none;" onchange="fileShareAuditorInstance.handleFileSelect(event)">
                
                <aside class="administration-sidebar">
                    <div class="sidebar-collapse-header">
                        <button class="collapse-btn" onclick="fileShareAuditorInstance.toggleSidebar()">
                            <i class="fas fa-angle-double-left"></i>
                        </button>
                    </div>
                    <nav class="sidebar-nav">
                        <!-- Navigation Category -->
                        <div class="sidebar-category ${this.expandedCategories.has('navigation') ? 'expanded' : ''}">
                            <div class="category-header" onclick="fileShareAuditorInstance.toggleCategory('navigation')">
                                <div class="category-title">
                                    <i class="fas fa-compass"></i>
                                    <span>Navigation</span>
                                </div>
                                <i class="fas fa-chevron-down arrow"></i>
                            </div>
                            <div class="category-items">
                                <button class="nav-item ${this.activeView === 'overview' ? 'active' : ''}" 
                                        onclick="fileShareAuditorInstance.switchView('overview')">
                                    <span>Overview</span>
                                </button>
                                ${folderTree.length > 0 ? `
                                <button class="nav-item ${this.activeView === 'folder-tree' ? 'active' : ''}" 
                                        onclick="fileShareAuditorInstance.switchView('folder-tree')">
                                    <span>Folder Tree (${folderTree.length})</span>
                                </button>
                                ` : ''}
                            </div>
                        </div>
                    </nav>
                </aside>

                <main class="administration-content">
                    <div class="file-share-auditor-main">
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1.5rem; height: 60px; flex-shrink: 0;">
                            <div style="display: flex; align-items: center; gap: 1rem; min-width: 0;">
                                <button class="page-header-back-btn" onclick="fileShareAuditorInstance.goBack()" style="background: rgba(148, 163, 184, 0.08); border: none; color: #f8fafc; border-radius: 6px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;">
                                    <i class="fas fa-arrow-left" style="font-size: 0.95rem;"></i>
                                </button>
                                <div style="display: flex; align-items: center; gap: 0.875rem; overflow: hidden;">
                                    <h2 style="margin: 0; font-size: 1.15rem; font-weight: 600; color: #f8fafc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${this.reportData?.name || this.t('title')}</h2>
                                    <span style="font-size: 0.75rem; color: #64748b; background: rgba(148, 163, 184, 0.1); padding: 0.15rem 0.6rem; border-radius: 12px; white-space: nowrap;">${this.reportData?.serverName || 'File Share Audit'}</span>
                                </div>
                            </div>
                            <div style="display: flex; gap: 0.5rem; align-items: center;">
                                <button class="premium-action-btn" onclick="fileShareAuditorInstance.loadReport()" style="height: 32px; width: 32px; padding: 0; display: flex; justify-content: center; align-items: center;">
                                    <i class="fas fa-sync-alt" style="font-size: 0.75rem;"></i>
                                </button>
                                <button class="premium-action-btn" onclick="fileShareAuditorInstance.generateScript({ encrypt: true, obfuscate: true })" style="height: 32px; padding: 0 0.75rem; font-size: 0.75rem;">
                                    <i class="fas fa-code" style="font-size: 0.7rem;"></i>
                                    <span>Script</span>
                                </button>
                                <button class="premium-action-btn" onclick="fileShareAuditorInstance.generateScript({ encrypt: false, obfuscate: false })" style="height: 32px; padding: 0 0.75rem; font-size: 0.75rem;">
                                    <i class="fas fa-file-alt" style="font-size: 0.7rem;"></i>
                                    <span>Plain</span>
                                </button>
                                <button class="premium-action-btn" onclick="fileShareAuditorInstance.showImportDialog()" style="height: 32px; padding: 0 0.75rem; font-size: 0.75rem;">
                                    <i class="fas fa-upload" style="font-size: 0.7rem;"></i>
                                    <span>Import</span>
                                </button>
                                <button class="premium-action-btn" onclick="fileShareAuditorInstance.deleteReport()" style="height: 32px; width: 32px; padding: 0; display: flex; justify-content: center; align-items: center; color: #ef4444; border-color: rgba(239, 68, 68, 0.2);">
                                    <i class="fas fa-trash" style="font-size: 0.75rem;"></i>
                                </button>
                            </div>
                        </div>
                        ${this.activeView === 'folder-tree' ? this.renderFolderTreeView(folderTree, folderAnalysis) : this.renderOverviewView(folderAnalysis, summary, criticalIssues, warningIssues, totalPermissions, totalExplicit, totalInherited, totalDenyAces, totalAllow)}
                    </div>
                </div>
            </div>
            <div id="report-message" class="message" style="display: none;"></div>
        `;
    }

    renderOverviewView(folderAnalysis, summary, criticalIssues, warningIssues, totalPermissions, totalExplicit, totalInherited, totalDenyAces, totalAllow) {
        const folderTree = folderAnalysis.folderTree || [];
        return `
            <div class="audit-content" style="height: 100%; overflow-y: auto; margin-top: 0; padding: 1.5rem;">
                    <!-- Summary Cards -->
                    ${folderAnalysis.folderPath ? `
                    <div class="hardware-section-modern">
                        <h4 class="section-subtitle-modern">
                            <i class="fas fa-folder-open"></i> Folder Analysis Summary
                        </h4>
                        <div class="hardware-grid-modern">
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern icon-blue">
                                    <i class="fas fa-folder"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">Folder Path</div>
                                    <div class="hardware-value-modern" style="font-size: 0.75rem; font-family: 'Consolas', 'Monaco', monospace; word-break: break-all;">${folderAnalysis.folderPath || 'N/A'}</div>
                                </div>
                            </div>
                            ${criticalIssues.length > 0 ? `
                            <div class="hardware-item-modern" 
                                 onclick="fileShareAuditorInstance.showIssuesModal('critical')"
                                 style="cursor: pointer; transition: transform 0.15s, box-shadow 0.15s;" 
                                 onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(239, 68, 68, 0.2)'"
                                 onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                                <div class="hardware-icon-modern" style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.2) 100%); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444;">
                                    <i class="fas fa-exclamation-triangle"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">Critical Issues</div>
                                    <div class="hardware-value-modern" style="color: #ef4444">${criticalIssues.length}</div>
                                    <div style="font-size: 0.6875rem; color: #94a3b8; margin-top: 0.25rem; display: flex; align-items: center; gap: 0.25rem;">
                                        <i class="fas fa-mouse-pointer" style="font-size: 0.5625rem;"></i>
                                        <span>Click to view details</span>
                                    </div>
                                </div>
                            </div>
                            ` : `
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.2) 100%); border: 1px solid rgba(16, 185, 129, 0.3); color: #10b981;">
                                    <i class="fas fa-exclamation-triangle"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">Critical Issues</div>
                                    <div class="hardware-value-modern" style="color: #34d399">${criticalIssues.length}</div>
                                </div>
                            </div>
                            `}
                            ${warningIssues.length > 0 ? `
                            <div class="hardware-item-modern" 
                                 onclick="fileShareAuditorInstance.showIssuesModal('warning')"
                                 style="cursor: pointer; transition: transform 0.15s, box-shadow 0.15s;" 
                                 onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(245, 158, 11, 0.2)'"
                                 onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                                <div class="hardware-icon-modern" style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.2) 100%); border: 1px solid rgba(245, 158, 11, 0.3); color: #f59e0b;">
                                    <i class="fas fa-exclamation-circle"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">Warnings</div>
                                    <div class="hardware-value-modern" style="color: #f59e0b">${warningIssues.length}</div>
                                    <div style="font-size: 0.6875rem; color: #94a3b8; margin-top: 0.25rem; display: flex; align-items: center; gap: 0.25rem;">
                                        <i class="fas fa-mouse-pointer" style="font-size: 0.5625rem;"></i>
                                        <span>Click to view details</span>
                                    </div>
                                </div>
                            </div>
                            ` : `
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.2) 100%); border: 1px solid rgba(16, 185, 129, 0.3); color: #10b981;">
                                    <i class="fas fa-exclamation-circle"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">Warnings</div>
                                    <div class="hardware-value-modern" style="color: #34d399">${warningIssues.length}</div>
                                </div>
                            </div>
                            `}
                            ${folderAnalysis.totalSize !== undefined ? `
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern icon-purple">
                                    <i class="fas fa-hdd"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">Total Size</div>
                                    <div class="hardware-value-modern">${folderAnalysis.totalSize.toFixed(2)} GB</div>
                                </div>
                            </div>
                            ` : ''}
                            ${folderAnalysis.totalFoldersAnalyzed !== undefined ? `
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern icon-blue">
                                    <i class="fas fa-sitemap"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">Folders Analyzed</div>
                                    <div class="hardware-value-modern">${folderAnalysis.totalFoldersAnalyzed}</div>
                                </div>
                            </div>
                            ` : ''}
                            ${folderAnalysis.subfoldersWithIssues !== undefined && folderAnalysis.subfoldersWithIssues.length > 0 ? `
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern" style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.2) 100%); border: 1px solid rgba(245, 158, 11, 0.3); color: #f59e0b;">
                                    <i class="fas fa-exclamation-triangle"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">Folders with Issues</div>
                                    <div class="hardware-value-modern" style="color: #f59e0b">${folderAnalysis.subfoldersWithIssues.length}</div>
                                </div>
                            </div>
                            ` : ''}
                            ${totalPermissions > 0 ? `
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern icon-blue">
                                    <i class="fas fa-shield-alt"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">Total Permissions</div>
                                    <div class="hardware-value-modern">${totalPermissions}</div>
                                    <div style="font-size: 0.6875rem; color: #94a3b8; margin-top: 0.125rem;">
                                        Exp: ${totalExplicit} • Inh: ${totalInherited} • Allow: ${totalAllow}${totalDenyAces > 0 ? ` • Deny: ${totalDenyAces}` : ''}
                                    </div>
                                </div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    ` : ''}

                    <!-- Share Enumeration -->
                    ${(folderAnalysis.shareEnumeration || []).length > 0 ? `
                    <div class="hardware-section-modern">
                        <h4 class="section-subtitle-modern">
                            <i class="fas fa-list"></i> Share Enumeration
                            <span style="color: #94a3b8; font-size: 0.75rem; font-weight: normal; margin-left: 0.5rem;">
                                (${folderAnalysis.shareEnumeration.length} ${folderAnalysis.shareEnumeration.length === 1 ? 'share' : 'shares'})
                            </span>
                        </h4>
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th>Share Name</th>
                                        <th>Share Risk</th>
                                        <th>UNC Path</th>
                                        <th>Local Path</th>
                                        <th>Hosting Server</th>
                                        <th>Share Type</th>
                                        <th>Offline Files</th>
                                        <th>SMB Version</th>
                                        <th>Encryption</th>
                                        <th>Continuous Availability</th>
                                        <th>Red Flags</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${folderAnalysis.shareEnumeration.map((share, shareIndex) => {
            const hasRedFlags = share.hasRedFlags || false;
            const shareRiskLevel = share.shareRiskLevel || share.highestNTFSRisk || 'Low';
            const shareRiskIcon = share.shareRiskIcon || (shareRiskLevel === 'Critical' ? '🔴' : shareRiskLevel === 'High' ? '🟠' : shareRiskLevel === 'Medium' ? '🟡' : '🟢');
            const shareRiskColor = share.shareRiskColor || (shareRiskLevel === 'Critical' ? '#ef4444' : shareRiskLevel === 'High' ? '#f59e0b' : shareRiskLevel === 'Medium' ? '#fbbf24' : '#10b981');
            return `
                                        <tr 
                                            onclick="fileShareAuditorInstance.showShareDetailsModal(${shareIndex})"
                                            style="${hasRedFlags || shareRiskLevel === 'Critical' ? 'background: rgba(239, 68, 68, 0.05);' : shareRiskLevel === 'High' ? 'background: rgba(245, 158, 11, 0.03);' : ''} cursor: pointer; transition: background-color 0.2s;"
                                            onmouseover="this.style.backgroundColor='rgba(59, 130, 246, 0.1)'"
                                            onmouseout="this.style.backgroundColor='${hasRedFlags || shareRiskLevel === 'Critical' ? 'rgba(239, 68, 68, 0.05)' : shareRiskLevel === 'High' ? 'rgba(245, 158, 11, 0.03)' : 'transparent'}'"
                                        >
                                            <td>
                                                <strong style="color: ${share.shareType === 'Hidden' ? '#f59e0b' : '#e2e8f0'};">
                                                    ${share.shareName || 'N/A'}
                                                    ${share.shareType === 'Hidden' ? ' <i class="fas fa-eye-slash" style="color: #f59e0b;"></i>' : ''}
                                                    ${share.shareType === 'Admin' ? ' <i class="fas fa-shield-alt" style="color: #6366f1;"></i>' : ''}
                                                </strong>
                                            </td>
                                            <td>
                                                <span style="background: ${shareRiskColor}20; color: ${shareRiskColor}; padding: 0.25rem 0.5rem; border-radius: 3px; font-size: 0.75rem; font-weight: 600; border: 1px solid ${shareRiskColor}40; display: inline-flex; align-items: center; gap: 0.25rem;">
                                                    <span>${shareRiskIcon}</span>
                                                    <span>${shareRiskLevel}</span>
                                                </span>
                                            </td>
                                            <td style="font-family: 'Consolas', 'Monaco', monospace; font-size: 0.8125rem; color: #94a3b8;">
                                                ${share.uncPath || 'N/A'}
                                            </td>
                                            <td style="font-family: 'Consolas', 'Monaco', monospace; font-size: 0.8125rem; color: #94a3b8;">
                                                ${share.localPath || 'N/A'}
                                            </td>
                                            <td>${share.hostingServer || 'N/A'}</td>
                                            <td>
                                                <span style="color: ${share.shareType === 'Hidden' ? '#f59e0b' : share.shareType === 'Admin' ? '#6366f1' : '#94a3b8'};">
                                                    ${share.shareType || 'Normal'}
                                                </span>
                                            </td>
                                            <td>
                                                <span style="color: ${share.offlineFilesEnabled === 'Yes' ? '#10b981' : '#94a3b8'};">
                                                    <i class="fas fa-${share.offlineFilesEnabled === 'Yes' ? 'check' : 'times'}"></i> ${share.offlineFilesEnabled || 'No'}
                                                </span>
                                            </td>
                                            <td>
                                                <span style="color: ${share.smbVersion && share.smbVersion.includes('SMB1') ? '#ef4444' : '#10b981'};">
                                                    ${share.smbVersion || 'N/A'}
                                                    ${share.smbVersion && share.smbVersion.includes('SMB1') ? ' <i class="fas fa-exclamation-triangle"></i>' : ''}
                                                </span>
                                            </td>
                                            <td>
                                                <span style="color: ${share.encryptionRequired === 'Yes' ? '#10b981' : '#f59e0b'};">
                                                    <i class="fas fa-${share.encryptionRequired === 'Yes' ? 'lock' : 'unlock'}"></i> ${share.encryptionRequired || 'No'}
                                                </span>
                                            </td>
                                            <td>
                                                <span style="color: ${share.continuousAvailability === 'Yes' ? '#10b981' : '#94a3b8'};">
                                                    <i class="fas fa-${share.continuousAvailability === 'Yes' ? 'check' : 'times'}"></i> ${share.continuousAvailability || 'No'}
                                                </span>
                                            </td>
                                            <td>
                                                ${hasRedFlags && share.redFlags && share.redFlags.length > 0 ? `
                                                <button 
                                                    data-share-index="${shareIndex}"
                                                    onclick="event.stopPropagation(); fileShareAuditorInstance.showRedFlagsModalByIndex(${shareIndex})"
                                                    style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 0.25rem;"
                                                    onmouseover="this.style.background='rgba(239, 68, 68, 0.2)'; this.style.borderColor='rgba(239, 68, 68, 0.5)'"
                                                    onmouseout="this.style.background='rgba(239, 68, 68, 0.1)'; this.style.borderColor='rgba(239, 68, 68, 0.3)'"
                                                    title="Click to view red flags details"
                                                >
                                                    <i class="fas fa-exclamation-circle"></i>
                                                    <span>${share.redFlags.length}</span>
                                                </button>
                                                ` : '<span style="color: #10b981;"><i class="fas fa-check"></i> None</span>'}
                                            </td>
                                        </tr>
                                        `;
        }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    ` : ''}


                    <!-- Groups with Folder Access -->
                    ${this.groupsArray.length > 0 ? `
                    <div class="hardware-section-modern">
                        <h4 class="section-subtitle-modern">
                            <i class="fas fa-users"></i> Groups with Folder Access
                            <span style="color: #94a3b8; font-size: 0.75rem; font-weight: normal; margin-left: 0.5rem;">
                                (${this.groupsArray.length} ${this.groupsArray.length === 1 ? 'group' : 'groups'})
                            </span>
                        </h4>
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th style="width: 35%;">Group Name</th>
                                        <th style="width: 15%;">Folders</th>
                                        <th style="width: 30%;">Rights</th>
                                        <th style="width: 20%;">Highest Risk</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${this.groupsArray.map((group, index) => {
            // Calculate highest risk level
            const risks = group.folders.map(f => f.riskLevel || 'Low');
            const riskOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
            const highestRisk = risks.sort((a, b) => (riskOrder[b] || 0) - (riskOrder[a] || 0))[0] || 'Low';
            const riskColor = highestRisk === 'Critical' ? '#ef4444' :
                highestRisk === 'High' ? '#f59e0b' :
                    highestRisk === 'Medium' ? '#fbbf24' : '#10b981';
            const riskIcon = highestRisk === 'Critical' ? '🔴' :
                highestRisk === 'High' ? '🟠' :
                    highestRisk === 'Medium' ? '🟡' : '🟢';
            return `
                                        <tr onclick="fileShareAuditorInstance.showGroupModal(${index})" 
                                            style="cursor: pointer; transition: background 0.15s;" 
                                            onmouseover="this.style.background='rgba(59, 130, 246, 0.1)'" 
                                            onmouseout="this.style.background='transparent'">
                                            <td>
                                                <strong style="color: #e2e8f0; font-size: 0.8125rem; word-break: break-word; display: flex; align-items: center; gap: 0.5rem;">
                                                    <i class="fas fa-users" style="color: #3b82f6; font-size: 0.75rem;"></i>
                                                    ${group.name}
                                                </strong>
                                            </td>
                                            <td style="color: #94a3b8; font-size: 0.8125rem;">
                                                <span style="background: rgba(59, 130, 246, 0.1); color: #3b82f6; padding: 0.1875rem 0.5rem; border-radius: 3px; font-weight: 600;">
                                                    ${group.totalFolders}
                                                </span>
                                            </td>
                                            <td style="font-size: 0.75rem; color: #cbd5e1;">
                                                <div style="display: flex; flex-wrap: wrap; gap: 0.25rem;">
                                                    ${(() => {
                    // Parse rights - they might be strings like "FullControl, Modify, Synchronize" or arrays
                    const allRights = [];
                    if (Array.isArray(group.rights)) {
                        group.rights.forEach(right => {
                            if (typeof right === 'string') {
                                const rightsList = right.split(',').map(r => r.trim()).filter(r => r.length > 0);
                                allRights.push(...rightsList);
                            } else {
                                allRights.push(right);
                            }
                        });
                    } else if (typeof group.rights === 'string') {
                        const rightsList = group.rights.split(',').map(r => r.trim()).filter(r => r.length > 0);
                        allRights.push(...rightsList);
                    }
                    // Remove duplicates
                    const uniqueRights = [...new Set(allRights)];
                    // Show all rights, but limit to first 3 for compact display
                    const displayRights = uniqueRights.slice(0, 3);
                    return displayRights.map(right => {
                        const rightColor = right.includes('FullControl') || right.includes('Full') ? '#ef4444' :
                            right.includes('Modify') || right.includes('Change') ? '#f59e0b' :
                                right.includes('Write') ? '#fbbf24' :
                                    right.includes('Read') ? '#10b981' : '#3b82f6';
                        return `
                                                            <span style="background: ${rightColor}20; color: ${rightColor}; padding: 0.125rem 0.375rem; border-radius: 3px; font-family: 'Consolas', 'Monaco', monospace; font-size: 0.6875rem; font-weight: 600; border: 1px solid ${rightColor}40; white-space: nowrap;">
                                                                ${right}
                                                            </span>
                                                        `;
                    }).join('') + (uniqueRights.length > 3 ? `<span style="color: #64748b; font-size: 0.6875rem;">+${uniqueRights.length - 3} more</span>` : '');
                })()}
                                                </div>
                                            </td>
                                            <td>
                                                <span style="background: ${riskColor}20; color: ${riskColor}; padding: 0.1875rem 0.375rem; border-radius: 3px; font-size: 0.6875rem; font-weight: 600; border: 1px solid ${riskColor}40;">
                                                    ${riskIcon} ${highestRisk}
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

                    <!-- Users with Folder Access -->
                    ${this.usersArray.length > 0 ? `
                    <div class="hardware-section-modern">
                        <h4 class="section-subtitle-modern">
                            <i class="fas fa-user"></i> Users with Folder Access
                            <span style="color: #94a3b8; font-size: 0.75rem; font-weight: normal; margin-left: 0.5rem;">
                                (${this.usersArray.length} ${this.usersArray.length === 1 ? 'user' : 'users'})
                            </span>
                        </h4>
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th style="width: 35%;">User Name</th>
                                        <th style="width: 15%;">Folders</th>
                                        <th style="width: 30%;">Rights</th>
                                        <th style="width: 20%;">Highest Risk</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${this.usersArray.map((user, index) => {
            // Calculate highest risk level
            const risks = user.folders.map(f => f.riskLevel || 'Low');
            const riskOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
            const highestRisk = risks.sort((a, b) => (riskOrder[b] || 0) - (riskOrder[a] || 0))[0] || 'Low';
            const riskColor = highestRisk === 'Critical' ? '#ef4444' :
                highestRisk === 'High' ? '#f59e0b' :
                    highestRisk === 'Medium' ? '#fbbf24' : '#10b981';
            const riskIcon = highestRisk === 'Critical' ? '🔴' :
                highestRisk === 'High' ? '🟠' :
                    highestRisk === 'Medium' ? '🟡' : '🟢';
            return `
                                        <tr onclick="fileShareAuditorInstance.showUserModal(${index})" 
                                            style="cursor: pointer; transition: background 0.15s;" 
                                            onmouseover="this.style.background='rgba(16, 185, 129, 0.1)'" 
                                            onmouseout="this.style.background='transparent'">
                                            <td>
                                                <strong style="color: #e2e8f0; font-size: 0.8125rem; word-break: break-word; display: flex; align-items: center; gap: 0.5rem;">
                                                    <i class="fas fa-user" style="color: #10b981; font-size: 0.75rem;"></i>
                                                    ${user.name}
                                                </strong>
                                            </td>
                                            <td style="color: #94a3b8; font-size: 0.8125rem;">
                                                <span style="background: rgba(16, 185, 129, 0.1); color: #10b981; padding: 0.1875rem 0.5rem; border-radius: 3px; font-weight: 600;">
                                                    ${user.totalFolders}
                                                </span>
                                            </td>
                                            <td style="font-size: 0.75rem; color: #cbd5e1;">
                                                <div style="display: flex; flex-wrap: wrap; gap: 0.25rem;">
                                                    ${(() => {
                    // Parse rights - they might be strings like "FullControl, Modify, Synchronize" or arrays
                    const allRights = [];
                    if (Array.isArray(user.rights)) {
                        user.rights.forEach(right => {
                            if (typeof right === 'string') {
                                const rightsList = right.split(',').map(r => r.trim()).filter(r => r.length > 0);
                                allRights.push(...rightsList);
                            } else {
                                allRights.push(right);
                            }
                        });
                    } else if (typeof user.rights === 'string') {
                        const rightsList = user.rights.split(',').map(r => r.trim()).filter(r => r.length > 0);
                        allRights.push(...rightsList);
                    }
                    // Remove duplicates
                    const uniqueRights = [...new Set(allRights)];
                    // Show all rights, but limit to first 3 for compact display
                    const displayRights = uniqueRights.slice(0, 3);
                    return displayRights.map(right => {
                        const rightColor = right.includes('FullControl') || right.includes('Full') ? '#ef4444' :
                            right.includes('Modify') || right.includes('Change') ? '#f59e0b' :
                                right.includes('Write') ? '#fbbf24' :
                                    right.includes('Read') ? '#10b981' : '#10b981';
                        return `
                                                            <span style="background: ${rightColor}20; color: ${rightColor}; padding: 0.125rem 0.375rem; border-radius: 3px; font-family: 'Consolas', 'Monaco', monospace; font-size: 0.6875rem; font-weight: 600; border: 1px solid ${rightColor}40; white-space: nowrap;">
                                                                ${right}
                                                            </span>
                                                        `;
                    }).join('') + (uniqueRights.length > 3 ? `<span style="color: #64748b; font-size: 0.6875rem;">+${uniqueRights.length - 3} more</span>` : '');
                })()}
                                                </div>
                                            </td>
                                            <td>
                                                <span style="background: ${riskColor}20; color: ${riskColor}; padding: 0.1875rem 0.375rem; border-radius: 3px; font-size: 0.6875rem; font-weight: 600; border: 1px solid ${riskColor}40;">
                                                    ${riskIcon} ${highestRisk}
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

                    <!-- NTFS Permissions -->
                    ${(folderAnalysis.ntfsPermissions || []).length > 0 ? `
                    <div class="hardware-section-modern">
                        <h4 class="section-subtitle-modern">
                            <i class="fas fa-shield-alt"></i> NTFS Permissions
                        </h4>
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th>Identity</th>
                                        <th>Rights</th>
                                        <th>Type</th>
                                        <th>Inherited</th>
                                        <th>Issues</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${folderAnalysis.ntfsPermissions.map(perm => {
            const hasIssues = (perm.misconfigurations || []).length > 0;
            // Parse rights string into individual rights
            const rightsStr = perm.fileSystemRights || 'N/A';
            const rightsArray = rightsStr !== 'N/A' ? rightsStr.split(',').map(r => r.trim()).filter(r => r.length > 0) : [];
            return `
                                        <tr style="${hasIssues ? 'background: rgba(239, 68, 68, 0.05);' : ''}">
                                            <td>
                                                <strong style="color: ${perm.identityReference && perm.identityReference.includes('CREATOR OWNER') ? '#f59e0b' : '#e2e8f0'};">
                                                    ${perm.identityReference || 'N/A'}
                                                </strong>
                                            </td>
                                            <td>
                                                ${rightsArray.length > 0 ? `
                                                <div style="display: flex; flex-wrap: wrap; gap: 0.375rem;">
                                                    ${rightsArray.map(right => {
                const rightColor = right.includes('FullControl') ? '#ef4444' :
                    right.includes('Modify') ? '#f59e0b' :
                        right.includes('Write') ? '#fbbf24' :
                            right.includes('Read') ? '#10b981' : '#94a3b8';
                return `
                                                        <span style="background: ${rightColor}20; color: ${rightColor}; padding: 0.25rem 0.5rem; border-radius: 3px; font-size: 0.75rem; font-weight: 600; border: 1px solid ${rightColor}40; font-family: 'Consolas', 'Monaco', monospace;">
                                                            ${right}
                                                        </span>
                                                    `;
            }).join('')}
                                                </div>
                                                ` : `<span style="font-family: 'Consolas', 'Monaco', monospace; font-size: 0.8125rem; color: #94a3b8;">${rightsStr}</span>`}
                                            </td>
                                            <td>${perm.accessControlType || 'N/A'}</td>
                                            <td>
                                                <span style="color: ${perm.isInherited ? '#94a3b8' : '#e2e8f0'};">
                                                    <i class="fas fa-${perm.isInherited ? 'check' : 'times'}"></i> ${perm.isInherited ? 'Yes' : 'No'}
                                                </span>
                                            </td>
                                            <td>
                                                ${hasIssues ? `
                                                <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                                                    ${perm.misconfigurations.map(issue => `
                                                        <span style="color: ${issue.match(/Critical:/) ? '#ef4444' : '#f59e0b'}; font-size: 0.75rem;">
                                                            <i class="fas fa-${issue.match(/Critical:/) ? 'times-circle' : 'exclamation-triangle'}"></i> ${issue}
                                                        </span>
                                                    `).join('')}
                                                </div>
                                                ` : '<span style="color: #10b981;"><i class="fas fa-check"></i> OK</span>'}
                                            </td>
                                        </tr>
                                        `;
        }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    ` : ''}

                    <!-- SMB Share Information -->
                    ${folderAnalysis.smbShare ? `
                    <div class="hardware-section-modern">
                        <h4 class="section-subtitle-modern">
                            <i class="fas fa-network-wired"></i> SMB Share Information
                        </h4>
                        <div class="hardware-grid-modern">
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern icon-blue">
                                    <i class="fas fa-server"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">Share Name</div>
                                    <div class="hardware-value-modern">${folderAnalysis.smbShare.name || 'N/A'}</div>
                                </div>
                            </div>
                            <div class="hardware-item-modern">
                                <div class="hardware-icon-modern icon-purple">
                                    <i class="fas fa-lock"></i>
                                </div>
                                <div class="hardware-info-modern">
                                    <div class="hardware-label-modern">Encryption</div>
                                    <div class="hardware-value-modern" style="color: ${folderAnalysis.smbShare.encryptData ? '#10b981' : '#f59e0b'}">
                                        ${folderAnalysis.smbShare.encryptData ? 'Enabled' : 'Disabled'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        ${(folderAnalysis.smbPermissions || []).length > 0 ? `
                        <div style="margin-top: 1.5rem;">
                            <h5 style="color: #e2e8f0; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.75rem;">SMB Share Permissions</h5>
                            <div class="table-container-modern">
                                <table class="table-compact">
                                    <thead>
                                        <tr>
                                            <th>Account</th>
                                            <th>Access Right</th>
                                            <th>Type</th>
                                            <th>Issues</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${folderAnalysis.smbPermissions.map(perm => {
            const hasIssues = (perm.misconfigurations || []).length > 0;
            const rights = perm.accessRights || (perm.accessRight ? [perm.accessRight] : ['N/A']);
            return `
                                            <tr style="${hasIssues ? 'background: rgba(239, 68, 68, 0.05);' : ''}">
                                                <td><strong>${perm.accountName || 'N/A'}</strong></td>
                                                <td>
                                                    <div style="display: flex; flex-wrap: wrap; gap: 0.375rem;">
                                                        ${rights.map(right => {
                const rightColor = right === 'Full' ? '#ef4444' :
                    right === 'Change' || right === 'Modify' ? '#f59e0b' :
                        right === 'Write' ? '#fbbf24' :
                            right === 'Read' ? '#10b981' : '#94a3b8';
                return `
                                                            <span style="background: ${rightColor}20; color: ${rightColor}; padding: 0.25rem 0.5rem; border-radius: 3px; font-size: 0.75rem; font-weight: 600; border: 1px solid ${rightColor}40;">
                                                                ${right}
                                                            </span>
                                                        `;
            }).join('')}
                                                    </div>
                                                </td>
                                                <td>${perm.accessControlType || 'N/A'}</td>
                                                <td>
                                                    ${hasIssues ? `
                                                    <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                                                        ${perm.misconfigurations.map(issue => `
                                                            <span style="color: ${issue.match(/Critical:/) ? '#ef4444' : '#f59e0b'}; font-size: 0.75rem;">
                                                                <i class="fas fa-${issue.match(/Critical:/) ? 'times-circle' : 'exclamation-triangle'}"></i> ${issue}
                                                            </span>
                                                        `).join('')}
                                                    </div>
                                                    ` : '<span style="color: #10b981;"><i class="fas fa-check"></i> OK</span>'}
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

                    <!-- Effective Access Matrix -->
                    ${(folderAnalysis.permissionAnalysis || []).length > 0 && folderAnalysis.smbShare ? `
                    <div class="hardware-section-modern">
                        <h4 class="section-subtitle-modern">
                            <i class="fas fa-table"></i> Effective Access Matrix
                            <span style="color: #94a3b8; font-size: 0.75rem; font-weight: normal; margin-left: 0.5rem;">
                                (What users can actually do over SMB)
                            </span>
                        </h4>
                        <div style="margin-bottom: 1rem; padding: 0.75rem; background: rgba(59, 130, 246, 0.1); border-left: 3px solid #3b82f6; border-radius: 4px;">
                            <p style="color: #94a3b8; font-size: 0.8125rem; margin: 0;">
                                <i class="fas fa-info-circle" style="color: #3b82f6;"></i> 
                                <strong>Effective Access</strong> is the most restrictive permission between Share and NTFS. 
                                This shows what users can actually do when accessing files over SMB.
                            </p>
                        </div>
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th style="width: 20%;">Share</th>
                                        <th style="width: 25%;">Identity</th>
                                        <th style="width: 15%;">Share Right</th>
                                        <th style="width: 15%;">NTFS Right</th>
                                        <th style="width: 15%;">Effective Access</th>
                                        <th style="width: 10%;">Risk</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${folderAnalysis.permissionAnalysis.map(analysis => {
            // Map share level to readable format
            const shareRight = analysis.shareLevel === 'FullControl' ? 'Full' :
                analysis.shareLevel === 'Modify' ? 'Change' :
                    analysis.shareLevel === 'Read' ? 'Read' :
                        analysis.shareLevel || 'None';

            // Map NTFS level to readable format
            const ntfsRight = analysis.ntfsPermission === 'FullControl' ? 'FullControl' :
                analysis.ntfsPermission === 'Modify' ? 'Modify' :
                    analysis.ntfsPermission === 'Write' ? 'Write' :
                        analysis.ntfsPermission === 'Read' ? 'Read' :
                            analysis.ntfsPermission === 'Denied' ? 'Denied' :
                                analysis.ntfsPermission || 'None';

            // Map effective permission
            const effectiveAccess = analysis.effectivePermission === 'FullControl' ? 'FullControl' :
                analysis.effectivePermission === 'Modify' ? 'Modify' :
                    analysis.effectivePermission === 'Write' ? 'Write' :
                        analysis.effectivePermission === 'Read' ? 'Read' :
                            analysis.effectivePermission === 'Denied' ? 'Denied' :
                                analysis.effectivePermission || 'None';

            // Determine risk level and color
            const riskLevel = analysis.riskLevel || 'Low';
            const riskColor = riskLevel === 'Critical' ? '#ef4444' :
                riskLevel === 'High' ? '#f59e0b' :
                    riskLevel === 'Medium' ? '#fbbf24' : '#10b981';
            const riskIcon = riskLevel === 'Critical' ? '🔴' :
                riskLevel === 'High' ? '🟠' :
                    riskLevel === 'Medium' ? '🟡' : '🟢';

            // Color for effective access
            const effectiveColor = effectiveAccess === 'FullControl' || effectiveAccess === 'Denied' ? '#ef4444' :
                effectiveAccess === 'Modify' ? '#f59e0b' :
                    effectiveAccess === 'Write' ? '#fbbf24' :
                        effectiveAccess === 'Read' ? '#10b981' : '#94a3b8';

            // Color for share right
            const shareColor = shareRight === 'Full' ? '#ef4444' :
                shareRight === 'Change' ? '#f59e0b' :
                    shareRight === 'Read' ? '#10b981' : '#94a3b8';

            // Color for NTFS right
            const ntfsColor = ntfsRight === 'FullControl' || ntfsRight === 'Denied' ? '#ef4444' :
                ntfsRight === 'Modify' ? '#f59e0b' :
                    ntfsRight === 'Write' ? '#fbbf24' :
                        ntfsRight === 'Read' ? '#10b981' : '#94a3b8';

            return `
                                        <tr style="${riskLevel === 'Critical' ? 'background: rgba(239, 68, 68, 0.05);' : riskLevel === 'High' ? 'background: rgba(245, 158, 11, 0.03);' : ''}">
                                            <td>
                                                <strong style="color: #e2e8f0; font-size: 0.8125rem;">
                                                    ${folderAnalysis.smbShare.name || 'N/A'}
                                                </strong>
                                            </td>
                                            <td>
                                                <strong style="color: #e2e8f0; font-size: 0.8125rem;">
                                                    ${analysis.account || 'N/A'}
                                                </strong>
                                            </td>
                                            <td>
                                                <span style="background: ${shareColor}20; color: ${shareColor}; padding: 0.25rem 0.5rem; border-radius: 3px; font-size: 0.75rem; font-weight: 600; border: 1px solid ${shareColor}40;">
                                                    ${shareRight}
                                                </span>
                                            </td>
                                            <td>
                                                <span style="background: ${ntfsColor}20; color: ${ntfsColor}; padding: 0.25rem 0.5rem; border-radius: 3px; font-size: 0.75rem; font-weight: 600; border: 1px solid ${ntfsColor}40;">
                                                    ${ntfsRight}
                                                </span>
                                            </td>
                                            <td>
                                                <span style="background: ${effectiveColor}20; color: ${effectiveColor}; padding: 0.25rem 0.5rem; border-radius: 3px; font-size: 0.75rem; font-weight: 600; border: 1px solid ${effectiveColor}40;">
                                                    ${effectiveAccess}
                                                </span>
                                            </td>
                                            <td>
                                                <span style="background: ${riskColor}20; color: ${riskColor}; padding: 0.1875rem 0.375rem; border-radius: 3px; font-size: 0.6875rem; font-weight: 600; border: 1px solid ${riskColor}40; display: inline-flex; align-items: center; gap: 0.1875rem;">
                                                    <span>${riskIcon}</span>
                                                    <span>${riskLevel}</span>
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

                    <!-- Inheritance Integrity Scan -->
                    ${folderAnalysis.inheritanceIntegrity ? `
                    <div class="hardware-section-modern">
                        <h4 class="section-subtitle-modern">
                            <i class="fas fa-sitemap"></i> Inheritance Integrity Scan
                            <span style="color: #94a3b8; font-size: 0.6875rem; font-weight: normal; margin-left: 0.5rem;">
                                (Permission sprawl and long-term risk detection)
                            </span>
                        </h4>
                        <div style="margin-bottom: 0.75rem; padding: 0.5rem; background: rgba(245, 158, 11, 0.1); border-left: 2px solid #f59e0b; border-radius: 3px;">
                            <p style="color: #94a3b8; font-size: 0.75rem; margin: 0; line-height: 1.4;">
                                <i class="fas fa-info-circle" style="color: #f59e0b; font-size: 0.6875rem;"></i> 
                                Broken inheritance is one of the top causes of permission sprawl and long-term risk. 
                                This scan identifies folders with inheritance issues, deep chains, and orphaned ACLs.
                            </p>
                        </div>
                        
                        ${(() => {
                    const integrity = folderAnalysis.inheritanceIntegrity;
                    const breakingInheritance = integrity.foldersBreakingInheritance || [];
                    const deepChains = integrity.deepInheritanceChains || [];
                    const explicitDuplicating = integrity.explicitDuplicatingInherited || [];
                    const orphanedACLs = integrity.orphanedACLEntries || [];
                    const creatorOwnerRoot = integrity.creatorOwnerOnSharedRoot || [];

                    const totalIssues = breakingInheritance.length + deepChains.length + explicitDuplicating.length + orphanedACLs.length + creatorOwnerRoot.length;

                    if (totalIssues === 0) {
                        return `
                                <div style="padding: 1rem; text-align: center; background: rgba(16, 185, 129, 0.1); border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.3);">
                                    <i class="fas fa-check-circle" style="color: #10b981; font-size: 1.25rem; margin-bottom: 0.375rem;"></i>
                                    <p style="color: #10b981; font-size: 0.8125rem; font-weight: 600; margin: 0;">No inheritance integrity issues detected</p>
                                </div>
                                `;
                    }

                    return `
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.5rem; margin-bottom: 0.75rem;">
                                <div style="background: rgba(15, 23, 42, 0.4); padding: 0.5rem; border-radius: 3px; border: 1px solid #334155;">
                                    <div style="color: #94a3b8; font-size: 0.625rem; margin-bottom: 0.125rem;">Folders Breaking Inheritance</div>
                                    <div style="color: ${breakingInheritance.length > 0 ? '#f59e0b' : '#10b981'}; font-size: 1.125rem; font-weight: 600;">${breakingInheritance.length}</div>
                                </div>
                                <div style="background: rgba(15, 23, 42, 0.4); padding: 0.5rem; border-radius: 3px; border: 1px solid #334155;">
                                    <div style="color: #94a3b8; font-size: 0.625rem; margin-bottom: 0.125rem;">Deep Inheritance Chains (>3)</div>
                                    <div style="color: ${deepChains.length > 0 ? '#ef4444' : '#10b981'}; font-size: 1.125rem; font-weight: 600;">${deepChains.length}</div>
                                </div>
                                <div style="background: rgba(15, 23, 42, 0.4); padding: 0.5rem; border-radius: 3px; border: 1px solid #334155;">
                                    <div style="color: #94a3b8; font-size: 0.625rem; margin-bottom: 0.125rem;">Explicit Duplicating Inherited</div>
                                    <div style="color: ${explicitDuplicating.length > 0 ? '#f59e0b' : '#10b981'}; font-size: 1.125rem; font-weight: 600;">${explicitDuplicating.length}</div>
                                </div>
                                <div style="background: rgba(15, 23, 42, 0.4); padding: 0.5rem; border-radius: 3px; border: 1px solid #334155;">
                                    <div style="color: #94a3b8; font-size: 0.625rem; margin-bottom: 0.125rem;">Orphaned ACL Entries</div>
                                    <div style="color: ${orphanedACLs.length > 0 ? '#f59e0b' : '#10b981'}; font-size: 1.125rem; font-weight: 600;">${orphanedACLs.length}</div>
                                </div>
                                <div style="background: rgba(15, 23, 42, 0.4); padding: 0.5rem; border-radius: 3px; border: 1px solid #334155;">
                                    <div style="color: #94a3b8; font-size: 0.625rem; margin-bottom: 0.125rem;">CREATOR OWNER on Root</div>
                                    <div style="color: ${creatorOwnerRoot.length > 0 ? '#f59e0b' : '#10b981'}; font-size: 1.125rem; font-weight: 600;">${creatorOwnerRoot.length}</div>
                                </div>
                            </div>
                            
                            ${breakingInheritance.length > 0 ? `
                            <div style="margin-bottom: 1.5rem;">
                                <h5 style="color: #e2e8f0; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.75rem;">
                                    <i class="fas fa-exclamation-triangle" style="color: #f59e0b;"></i> Folders Breaking Inheritance
                                </h5>
                                <div class="table-container-modern">
                                    <table class="table-compact">
                                        <thead>
                                            <tr>
                                                <th>Folder</th>
                                                <th>Depth</th>
                                                <th>Explicit Permissions</th>
                                                <th>Inherited Permissions</th>
                                                <th>Risk</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${breakingInheritance.map(item => {
                        const riskColor = item.riskLevel === 'Critical' ? '#ef4444' : '#f59e0b';
                        const riskIcon = item.riskLevel === 'Critical' ? '🔴' : '🟠';
                        return `
                                                <tr>
                                                    <td style="font-family: 'Consolas', 'Monaco', monospace; font-size: 0.75rem; color: #cbd5e1;">
                                                        ${item.folder || 'N/A'}
                                                    </td>
                                                    <td style="color: #94a3b8; font-size: 0.8125rem;">
                                                        ${item.depth || 0} ${item.depth === 1 ? 'level' : 'levels'}
                                                        ${item.depth > 3 ? ' <i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i>' : ''}
                                                    </td>
                                                    <td style="color: #e2e8f0; font-size: 0.8125rem;">${item.explicitCount || 0}</td>
                                                    <td style="color: #94a3b8; font-size: 0.8125rem;">${item.inheritedCount || 0}</td>
                                                    <td>
                                                        <span style="background: ${riskColor}20; color: ${riskColor}; padding: 0.1875rem 0.375rem; border-radius: 3px; font-size: 0.6875rem; font-weight: 600; border: 1px solid ${riskColor}40;">
                                                            ${riskIcon} ${item.riskLevel || 'High'}
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
                            
                            ${deepChains.length > 0 ? `
                            <div style="margin-bottom: 1.5rem;">
                                <h5 style="color: #e2e8f0; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.75rem;">
                                    <i class="fas fa-sitemap" style="color: #ef4444;"></i> Deep Inheritance Chains (>3 levels)
                                </h5>
                                <div class="table-container-modern">
                                    <table class="table-compact">
                                        <thead>
                                            <tr>
                                                <th>Folder</th>
                                                <th>Depth</th>
                                                <th>Broken Inheritance</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${deepChains.map(item => {
                        return `
                                                <tr>
                                                    <td style="font-family: 'Consolas', 'Monaco', monospace; font-size: 0.75rem; color: #cbd5e1;">
                                                        ${item.folder || 'N/A'}
                                                    </td>
                                                    <td style="color: #ef4444; font-size: 0.8125rem; font-weight: 600;">
                                                        🔴 ${item.depth || 0} levels
                                                    </td>
                                                    <td>
                                                        <span style="color: ${item.hasBrokenInheritance ? '#f59e0b' : '#10b981'};">
                                                            <i class="fas fa-${item.hasBrokenInheritance ? 'exclamation-triangle' : 'check'}"></i> 
                                                            ${item.hasBrokenInheritance ? 'Yes' : 'No'}
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
                            
                            ${explicitDuplicating.length > 0 ? `
                            <div style="margin-bottom: 1.5rem;">
                                <h5 style="color: #e2e8f0; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.75rem;">
                                    <i class="fas fa-copy" style="color: #f59e0b;"></i> Explicit Permissions Duplicating Inherited Rights
                                </h5>
                                <div class="table-container-modern">
                                    <table class="table-compact">
                                        <thead>
                                            <tr>
                                                <th>Folder</th>
                                                <th>Identity</th>
                                                <th>Rights</th>
                                                <th>Depth</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${explicitDuplicating.map(item => {
                        return `
                                                <tr>
                                                    <td style="font-family: 'Consolas', 'Monaco', monospace; font-size: 0.75rem; color: #cbd5e1;">
                                                        ${item.folder || 'N/A'}
                                                    </td>
                                                    <td style="color: #e2e8f0; font-size: 0.8125rem;">${item.identity || 'N/A'}</td>
                                                    <td style="color: #94a3b8; font-size: 0.8125rem;">${item.rights || 'N/A'}</td>
                                                    <td style="color: #94a3b8; font-size: 0.8125rem;">${item.depth || 0}</td>
                                                </tr>
                                                `;
                    }).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            ` : ''}
                            
                            ${orphanedACLs.length > 0 ? `
                            <div style="margin-bottom: 1.5rem;">
                                <h5 style="color: #e2e8f0; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.75rem;">
                                    <i class="fas fa-user-slash" style="color: #f59e0b;"></i> Orphaned ACL Entries (SID Not Resolvable)
                                </h5>
                                <div class="table-container-modern">
                                    <table class="table-compact">
                                        <thead>
                                            <tr>
                                                <th>Folder</th>
                                                <th>Orphaned Identities</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${orphanedACLs.map(item => {
                        const orphanedList = item.orphanedSIDs || [];
                        return `
                                                <tr>
                                                    <td style="font-family: 'Consolas', 'Monaco', monospace; font-size: 0.75rem; color: #cbd5e1;">
                                                        ${item.folder || 'N/A'}
                                                    </td>
                                                    <td>
                                                        <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                                                            ${orphanedList.map(orphan => `
                                                                <span style="color: #f59e0b; font-size: 0.75rem;">
                                                                    <i class="fas fa-exclamation-triangle"></i> ${orphan.identity} (${orphan.rights})
                                                                </span>
                                                            `).join('')}
                                                        </div>
                                                    </td>
                                                </tr>
                                                `;
                    }).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            ` : ''}
                            
                            ${creatorOwnerRoot.length > 0 ? `
                            <div style="margin-bottom: 1.5rem;">
                                <h5 style="color: #e2e8f0; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.75rem;">
                                    <i class="fas fa-user-shield" style="color: #f59e0b;"></i> CREATOR OWNER with FullControl on Non-Root Folders
                                </h5>
                                <div style="margin-bottom: 0.75rem; padding: 0.5rem; background: rgba(245, 158, 11, 0.1); border-left: 3px solid #f59e0b; border-radius: 4px;">
                                    <p style="color: #94a3b8; font-size: 0.75rem; margin: 0;">
                                        <i class="fas fa-info-circle" style="color: #f59e0b;"></i> 
                                        Note: CREATOR OWNER with FullControl on the root folder is normal Windows behavior. 
                                        This table shows CREATOR OWNER on subfolders, which may indicate unnecessary explicit permissions.
                                    </p>
                                </div>
                                <div class="table-container-modern">
                                    <table class="table-compact">
                                        <thead>
                                            <tr>
                                                <th>Folder</th>
                                                <th>Rights</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${creatorOwnerRoot.map(item => {
                        return `
                                                <tr>
                                                    <td style="font-family: 'Consolas', 'Monaco', monospace; font-size: 0.75rem; color: #cbd5e1;">
                                                        ${item.folder || 'N/A'}
                                                    </td>
                                                    <td>
                                                        <span style="background: #f59e0b20; color: #f59e0b; padding: 0.25rem 0.5rem; border-radius: 3px; font-size: 0.75rem; font-weight: 600; border: 1px solid #f59e0b40;">
                                                            🟠 ${item.rights || 'FullControl'}
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
                            `;
                })()}
                    </div>
                    ` : ''}

                    <!-- Unauthenticated Access Exposure -->
                    ${folderAnalysis.unauthenticatedAccess ? `
                    <div class="hardware-section-modern">
                        <h4 class="section-subtitle-modern">
                            <i class="fas fa-user-secret"></i> Unauthenticated Access Exposure
                            <span style="color: #94a3b8; font-size: 0.75rem; font-weight: normal; margin-left: 0.5rem;">
                                (Anonymous and guest access detection)
                            </span>
                        </h4>
                        <div style="margin-bottom: 1rem; padding: 0.75rem; background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; border-radius: 4px;">
                            <p style="color: #94a3b8; font-size: 0.8125rem; margin: 0;">
                                <i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i> 
                                <strong>Critical Security Risk:</strong> Unauthenticated access allows attackers to access files without credentials. 
                                Guest-writable folders should be zero. Anonymous access should be eliminated.
                            </p>
                        </div>
                        
                        ${(() => {
                    const unauthenticated = folderAnalysis.unauthenticatedAccess;
                    const anonymousPaths = unauthenticated.anonymousAccessPaths || [];
                    const guestReadable = unauthenticated.guestReadableFolders || [];
                    const guestWritable = unauthenticated.guestWritableFolders || [];
                    const smbAnonymousEnum = unauthenticated.smbAnonymousEnumeration || false;
                    const offlineWithAnonymous = unauthenticated.offlineFilesWithAnonymous || [];

                    const totalIssues = anonymousPaths.length + guestReadable.length + guestWritable.length + (smbAnonymousEnum ? 1 : 0) + offlineWithAnonymous.length;

                    if (totalIssues === 0) {
                        return `
                                <div style="padding: 1rem; text-align: center; background: rgba(16, 185, 129, 0.1); border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.3);">
                                    <i class="fas fa-check-circle" style="color: #10b981; font-size: 1.25rem; margin-bottom: 0.375rem;"></i>
                                    <p style="color: #10b981; font-size: 0.8125rem; font-weight: 600; margin: 0;">No unauthenticated access detected</p>
                                </div>
                                `;
                    }

                    return `
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.5rem; margin-bottom: 0.75rem;">
                                <div style="background: rgba(15, 23, 42, 0.4); padding: 0.5rem; border-radius: 3px; border: 1px solid #334155;">
                                    <div style="color: #94a3b8; font-size: 0.625rem; margin-bottom: 0.125rem;">Anonymous Access Paths</div>
                                    <div style="color: ${anonymousPaths.length > 0 ? '#ef4444' : '#10b981'}; font-size: 1.125rem; font-weight: 600;">${anonymousPaths.length}</div>
                                </div>
                                <div style="background: rgba(15, 23, 42, 0.4); padding: 0.5rem; border-radius: 3px; border: 1px solid #334155;">
                                    <div style="color: #94a3b8; font-size: 0.625rem; margin-bottom: 0.125rem;">Guest-Readable Folders</div>
                                    <div style="color: ${guestReadable.length > 0 ? '#f59e0b' : '#10b981'}; font-size: 1.125rem; font-weight: 600;">${guestReadable.length}</div>
                                </div>
                                <div style="background: rgba(15, 23, 42, 0.4); padding: 0.5rem; border-radius: 3px; border: 1px solid #334155;">
                                    <div style="color: #94a3b8; font-size: 0.625rem; margin-bottom: 0.125rem;">Guest-Writable Folders</div>
                                    <div style="color: ${guestWritable.length > 0 ? '#ef4444' : '#10b981'}; font-size: 1.125rem; font-weight: 600;">${guestWritable.length}</div>
                                    ${guestWritable.length > 0 ? '<div style="color: #ef4444; font-size: 0.5625rem; margin-top: 0.125rem;">🔴 Should be zero!</div>' : ''}
                                </div>
                                <div style="background: rgba(15, 23, 42, 0.4); padding: 0.5rem; border-radius: 3px; border: 1px solid #334155;">
                                    <div style="color: #94a3b8; font-size: 0.625rem; margin-bottom: 0.125rem;">SMB Anonymous Enum</div>
                                    <div style="color: ${smbAnonymousEnum ? '#ef4444' : '#10b981'}; font-size: 0.8125rem; font-weight: 600;">
                                        ${smbAnonymousEnum ? '<i class="fas fa-times-circle" style="font-size: 0.75rem;"></i>' : '<i class="fas fa-check" style="font-size: 0.75rem;"></i>'} ${smbAnonymousEnum ? 'Enabled' : 'Disabled'}
                                    </div>
                                </div>
                                <div style="background: rgba(15, 23, 42, 0.4); padding: 0.5rem; border-radius: 3px; border: 1px solid #334155;">
                                    <div style="color: #94a3b8; font-size: 0.625rem; margin-bottom: 0.125rem;">Offline + Anonymous</div>
                                    <div style="color: ${offlineWithAnonymous.length > 0 ? '#ef4444' : '#10b981'}; font-size: 1.125rem; font-weight: 600;">${offlineWithAnonymous.length}</div>
                                </div>
                            </div>
                            
                            ${anonymousPaths.length > 0 ? `
                            <div style="margin-bottom: 1.5rem;">
                                <h5 style="color: #e2e8f0; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.75rem;">
                                    <i class="fas fa-user-secret" style="color: #ef4444;"></i> Anonymous Access Paths
                                </h5>
                                <div class="table-container-modern">
                                    <table class="table-compact">
                                        <thead>
                                            <tr>
                                                <th>Folder</th>
                                                <th>Highest Right</th>
                                                <th>Details</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${anonymousPaths.map(item => {
                        const rightColor = item.highestRight === 'FullControl' ? '#ef4444' :
                            item.highestRight === 'Modify' ? '#f59e0b' :
                                item.highestRight === 'Write' ? '#fbbf24' : '#10b981';
                        return `
                                                <tr style="background: rgba(239, 68, 68, 0.05);">
                                                    <td style="font-family: 'Consolas', 'Monaco', monospace; font-size: 0.75rem; color: #cbd5e1;">
                                                        ${item.folder || 'N/A'}
                                                    </td>
                                                    <td>
                                                        <span style="background: ${rightColor}20; color: ${rightColor}; padding: 0.25rem 0.5rem; border-radius: 3px; font-size: 0.75rem; font-weight: 600; border: 1px solid ${rightColor}40;">
                                                            🔴 ${item.highestRight || 'N/A'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                                                            ${(item.rights || []).map(r => `
                                                                <span style="color: #f59e0b; font-size: 0.75rem;">
                                                                    ${r.rights || 'N/A'}
                                                                </span>
                                                            `).join('')}
                                                        </div>
                                                    </td>
                                                </tr>
                                                `;
                    }).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            ` : ''}
                            
                            ${guestReadable.length > 0 ? `
                            <div style="margin-bottom: 1.5rem;">
                                <h5 style="color: #e2e8f0; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.75rem;">
                                    <i class="fas fa-user-friends" style="color: #f59e0b;"></i> Guest-Readable Folders
                                </h5>
                                <div class="table-container-modern">
                                    <table class="table-compact">
                                        <thead>
                                            <tr>
                                                <th>Folder</th>
                                                <th>Rights</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${guestReadable.map(item => {
                        return `
                                                <tr>
                                                    <td style="font-family: 'Consolas', 'Monaco', monospace; font-size: 0.75rem; color: #cbd5e1;">
                                                        ${item.folder || 'N/A'}
                                                    </td>
                                                    <td style="color: #f59e0b; font-size: 0.8125rem;">${item.rights || 'Read'}</td>
                                                </tr>
                                                `;
                    }).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            ` : ''}
                            
                            ${guestWritable.length > 0 ? `
                            <div style="margin-bottom: 1.5rem;">
                                <h5 style="color: #e2e8f0; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.75rem;">
                                    <i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i> Guest-Writable Folders (CRITICAL)
                                </h5>
                                <div style="margin-bottom: 0.75rem; padding: 0.75rem; background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; border-radius: 4px;">
                                    <p style="color: #ef4444; font-size: 0.8125rem; margin: 0; font-weight: 600;">
                                        <i class="fas fa-exclamation-circle"></i> 
                                        Guest-writable folders should be ZERO. This is a critical security risk allowing unauthenticated file modification.
                                    </p>
                                </div>
                                <div class="table-container-modern">
                                    <table class="table-compact">
                                        <thead>
                                            <tr>
                                                <th>Folder</th>
                                                <th>Effective Right</th>
                                                <th>Rights</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${guestWritable.map(item => {
                        const rightColor = item.effectiveRight === 'FullControl' ? '#ef4444' :
                            item.effectiveRight === 'Modify' ? '#f59e0b' : '#fbbf24';
                        return `
                                                <tr style="background: rgba(239, 68, 68, 0.05);">
                                                    <td style="font-family: 'Consolas', 'Monaco', monospace; font-size: 0.75rem; color: #cbd5e1;">
                                                        ${item.folder || 'N/A'}
                                                    </td>
                                                    <td>
                                                        <span style="background: ${rightColor}20; color: ${rightColor}; padding: 0.25rem 0.5rem; border-radius: 3px; font-size: 0.75rem; font-weight: 600; border: 1px solid ${rightColor}40;">
                                                            🔴 ${item.effectiveRight || 'N/A'}
                                                        </span>
                                                    </td>
                                                    <td style="color: #f59e0b; font-size: 0.8125rem;">${item.rights || 'N/A'}</td>
                                                </tr>
                                                `;
                    }).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            ` : ''}
                            
                            ${offlineWithAnonymous.length > 0 ? `
                            <div style="margin-bottom: 1.5rem;">
                                <h5 style="color: #e2e8f0; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.75rem;">
                                    <i class="fas fa-download" style="color: #ef4444;"></i> Offline Files + Anonymous Access (Data Exfiltration Risk)
                                </h5>
                                <div style="margin-bottom: 0.75rem; padding: 0.75rem; background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; border-radius: 4px;">
                                    <p style="color: #ef4444; font-size: 0.8125rem; margin: 0; font-weight: 600;">
                                        <i class="fas fa-exclamation-circle"></i> 
                                        Share allows offline files with anonymous access - enables data exfiltration without authentication.
                                    </p>
                                </div>
                                <div class="table-container-modern">
                                    <table class="table-compact">
                                        <thead>
                                            <tr>
                                                <th>Share</th>
                                                <th>Caching Mode</th>
                                                <th>Anonymous Account</th>
                                                <th>Rights</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${offlineWithAnonymous.map(item => {
                        return `
                                                <tr style="background: rgba(239, 68, 68, 0.05);">
                                                    <td><strong style="color: #e2e8f0;">${item.share || 'N/A'}</strong></td>
                                                    <td style="color: #f59e0b; font-size: 0.8125rem;">${item.cachingMode || 'N/A'}</td>
                                                    <td style="color: #ef4444; font-size: 0.8125rem;">${item.account || 'N/A'}</td>
                                                    <td style="color: #f59e0b; font-size: 0.8125rem;">${item.rights || 'N/A'}</td>
                                                </tr>
                                                `;
                    }).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            ` : ''}
                            
                            ${smbAnonymousEnum ? `
                            <div style="margin-bottom: 1.5rem; padding: 0.75rem; background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; border-radius: 4px;">
                                <p style="color: #ef4444; font-size: 0.8125rem; margin: 0; font-weight: 600;">
                                    <i class="fas fa-exclamation-circle"></i> 
                                    🔴 SMB server allows anonymous enumeration - attackers can list shares without authentication.
                                </p>
                            </div>
                            ` : ''}
                            `;
                })()}
                    </div>
                    ` : ''}

                    <!-- Permission Model Analysis -->
                    ${(folderAnalysis.permissionAnalysis || []).length > 0 ? `
                    <div class="hardware-section-modern">
                        <h4 class="section-subtitle-modern">
                            <i class="fas fa-balance-scale"></i> Permission Model Analysis (Advanced ACL Audit)
                            <span style="color: #94a3b8; font-size: 0.75rem; font-weight: normal; margin-left: 0.5rem;">
                                (${folderAnalysis.permissionAnalysis.length} ${folderAnalysis.permissionAnalysis.length === 1 ? 'account' : 'accounts'})
                            </span>
                        </h4>
                        
                        ${(folderAnalysis.permissionMisconfigurations || []).length > 0 ? `
                        <div style="margin-bottom: 1.5rem; padding: 1rem; background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; border-radius: 4px;">
                            <h5 style="color: #ef4444; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.75rem;">
                                <i class="fas fa-exclamation-triangle"></i> Permission Misconfigurations Detected
                            </h5>
                            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                                ${folderAnalysis.permissionMisconfigurations.map(misconfig => {
                    const riskColor = misconfig.riskLevel === 'Critical' ? '#ef4444' : misconfig.riskLevel === 'High' ? '#f59e0b' : '#fbbf24';
                    return `
                                    <div style="color: ${riskColor}; font-size: 0.8125rem;">
                                        <i class="fas fa-${misconfig.riskLevel === 'Critical' ? 'times-circle' : 'exclamation-triangle'}"></i> 
                                        <strong>${misconfig.account}:</strong> ${misconfig.issue}
                                    </div>
                                    `;
                }).join('')}
                            </div>
                        </div>
                        ` : ''}
                        
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th>Account</th>
                                        <th>Share Permission</th>
                                        <th>NTFS Permission</th>
                                        <th>Effective Permission</th>
                                        <th>Explicit NTFS</th>
                                        <th>Inherited NTFS</th>
                                        <th>Deny ACE</th>
                                        <th>Broken Inheritance</th>
                                        <th>Issues</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${folderAnalysis.permissionAnalysis.map(analysis => {
                    const hasIssues = (analysis.issues || []).length > 0;
                    const riskColor = analysis.riskLevel === 'Critical' ? '#ef4444' : analysis.riskLevel === 'High' ? '#f59e0b' : analysis.riskLevel === 'Medium' ? '#fbbf24' : '#10b981';
                    return `
                                        <tr style="${hasIssues ? 'background: rgba(239, 68, 68, 0.05);' : ''}">
                                            <td><strong>${analysis.account || 'N/A'}</strong></td>
                                            <td>
                                                ${(() => {
                            const shareRights = analysis.shareRights || (analysis.sharePermission ? analysis.sharePermission.split(', ').map(r => r.trim()) : []);
                            if (shareRights.length === 0) return '<span style="color: #94a3b8;">N/A</span>';
                            return `
                                                    <div style="display: flex; flex-wrap: wrap; gap: 0.375rem;">
                                                        ${shareRights.map(right => {
                                const rightColor = right === 'Full' ? '#ef4444' :
                                    right === 'Change' || right === 'Modify' ? '#f59e0b' :
                                        right === 'Write' ? '#fbbf24' :
                                            right === 'Read' ? '#10b981' : '#94a3b8';
                                return `
                                                            <span style="background: ${rightColor}20; color: ${rightColor}; padding: 0.25rem 0.5rem; border-radius: 3px; font-size: 0.75rem; font-weight: 600; border: 1px solid ${rightColor}40;">
                                                                ${right}
                                                            </span>
                                                        `;
                            }).join('')}
                                                    </div>
                                                    `;
                        })()}
                                            </td>
                                            <td>
                                                <span style="color: ${analysis.ntfsPermission === 'Denied' ? '#ef4444' : analysis.ntfsPermission === 'FullControl' ? '#ef4444' : analysis.ntfsPermission === 'Modify' ? '#f59e0b' : '#94a3b8'};">
                                                    ${analysis.ntfsPermission || 'None'}
                                                </span>
                                            </td>
                                            <td>
                                                <span style="color: ${analysis.effectivePermission === 'Denied' ? '#ef4444' : analysis.effectivePermission === 'FullControl' ? '#ef4444' : analysis.effectivePermission === 'Modify' ? '#f59e0b' : '#94a3b8'}; font-weight: 600;">
                                                    ${analysis.effectivePermission || 'None'}
                                                </span>
                                            </td>
                                            <td>
                                                <span style="color: ${analysis.hasExplicitNTFS ? '#e2e8f0' : '#94a3b8'};">
                                                    <i class="fas fa-${analysis.hasExplicitNTFS ? 'check' : 'times'}"></i> ${analysis.hasExplicitNTFS ? 'Yes' : 'No'}
                                                </span>
                                            </td>
                                            <td>
                                                <span style="color: ${analysis.hasInheritedNTFS ? '#e2e8f0' : '#94a3b8'};">
                                                    <i class="fas fa-${analysis.hasInheritedNTFS ? 'check' : 'times'}"></i> ${analysis.hasInheritedNTFS ? 'Yes' : 'No'}
                                                </span>
                                            </td>
                                            <td>
                                                <span style="color: ${analysis.hasDenyACE ? '#ef4444' : '#10b981'};">
                                                    <i class="fas fa-${analysis.hasDenyACE ? 'exclamation-triangle' : 'check'}"></i> ${analysis.hasDenyACE ? 'Yes' : 'No'}
                                                </span>
                                            </td>
                                            <td>
                                                <span style="color: ${analysis.brokenInheritance ? '#f59e0b' : '#10b981'};">
                                                    <i class="fas fa-${analysis.brokenInheritance ? 'exclamation-triangle' : 'check'}"></i> ${analysis.brokenInheritance ? 'Yes' : 'No'}
                                                </span>
                                            </td>
                                            <td>
                                                ${hasIssues ? `
                                                <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                                                    ${analysis.issues.map(issue => {
                            const issueColor = issue.match(/Critical:/) ? '#ef4444' : issue.match(/Warning:/) ? '#f59e0b' : '#fbbf24';
                            return `
                                                        <span style="color: ${issueColor}; font-size: 0.75rem;">
                                                            <i class="fas fa-${issue.match(/Critical:/) ? 'times-circle' : 'exclamation-triangle'}"></i> ${issue}
                                                        </span>
                                                        `;
                        }).join('')}
                                                </div>
                                                ` : '<span style="color: #10b981;"><i class="fas fa-check"></i> OK</span>'}
                                            </td>
                                        </tr>
                                        `;
                }).join('')}
                                </tbody>
                            </table>
                        </div>
                        
                        <div style="margin-top: 1rem; padding: 0.75rem; background: rgba(59, 130, 246, 0.1); border-left: 3px solid #3b82f6; border-radius: 4px;">
                            <p style="color: #94a3b8; font-size: 0.8125rem; margin: 0;">
                                <strong style="color: #3b82f6;">Note:</strong> Effective permission is the most restrictive between Share and NTFS permissions. 
                                Share permissions act as a filter on NTFS permissions - users need both Share and NTFS permissions to access files.
                            </p>
                        </div>
                    </div>
                    ` : ''}

                    <!-- B. High-Risk Principals Analysis -->
                    ${(folderAnalysis.highRiskPrincipals || []).length > 0 ? `
                    <div class="hardware-section-modern">
                        <h4 class="section-subtitle-modern">
                            <i class="fas fa-user-shield"></i> B. High-Risk Principals Analysis
                            <span style="color: #94a3b8; font-size: 0.75rem; font-weight: normal; margin-left: 0.5rem;">
                                (${folderAnalysis.highRiskPrincipals.length} ${folderAnalysis.highRiskPrincipals.length === 1 ? 'principal' : 'principals'})
                            </span>
                        </h4>
                        
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th>Principal</th>
                                        <th>Type</th>
                                        <th>NTFS Rights</th>
                                        <th>Risk Level</th>
                                        <th>Share Permission</th>
                                        <th>Service Account</th>
                                        <th>Write Access</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${folderAnalysis.highRiskPrincipals.map(principal => {
                    const riskColor = principal.ntfsRiskLevel === 'Critical' ? '#ef4444' : principal.ntfsRiskLevel === 'High' ? '#f59e0b' : principal.ntfsRiskLevel === 'Medium' ? '#fbbf24' : '#10b981';
                    const shareRiskColor = principal.shareRiskLevel === 'Critical' ? '#ef4444' : principal.shareRiskLevel === 'High' ? '#f59e0b' : principal.shareRiskLevel === 'Medium' ? '#fbbf24' : '#94a3b8';
                    return `
                                        <tr style="background: ${principal.ntfsRiskLevel === 'Critical' ? 'rgba(239, 68, 68, 0.05)' : principal.ntfsRiskLevel === 'High' ? 'rgba(245, 158, 11, 0.05)' : 'transparent'};">
                                            <td>
                                                <strong style="color: ${riskColor};">
                                                    ${principal.principal || 'N/A'}
                                                </strong>
                                            </td>
                                            <td>
                                                <span style="color: #94a3b8; font-size: 0.8125rem;">
                                                    ${principal.principalType || 'Unknown'}
                                                </span>
                                            </td>
                                            <td style="font-family: 'Consolas', 'Monaco', monospace; font-size: 0.8125rem;">
                                                ${principal.ntfsRights || 'N/A'}
                                            </td>
                                            <td>
                                                <span style="color: ${riskColor}; font-weight: 600;">
                                                    ${principal.ntfsRiskIcon || '🟢'} ${principal.ntfsRiskLevel || 'Low'}
                                                </span>
                                            </td>
                                            <td>
                                                ${(() => {
                            const shareRights = principal.shareRights || (principal.sharePermission ? principal.sharePermission.split(', ').map(r => r.trim()) : []);
                            if (shareRights.length === 0) return '<span style="color: #94a3b8;">None</span>';
                            return `
                                                    <div style="display: flex; flex-wrap: wrap; gap: 0.375rem;">
                                                        ${shareRights.map(right => {
                                const rightColor = right === 'Full' ? '#ef4444' :
                                    right === 'Change' || right === 'Modify' ? '#f59e0b' :
                                        right === 'Write' ? '#fbbf24' :
                                            right === 'Read' ? '#10b981' : '#94a3b8';
                                return `
                                                            <span style="background: ${rightColor}20; color: ${rightColor}; padding: 0.25rem 0.5rem; border-radius: 3px; font-size: 0.75rem; font-weight: 600; border: 1px solid ${rightColor}40;">
                                                                ${right}
                                                            </span>
                                                        `;
                            }).join('')}
                                                    </div>
                                                    `;
                        })()}
                                            </td>
                                            <td>
                                                <span style="color: ${principal.isServiceAccount ? '#ef4444' : '#94a3b8'};">
                                                    <i class="fas fa-${principal.isServiceAccount ? 'exclamation-triangle' : 'check'}"></i> ${principal.isServiceAccount ? 'Yes' : 'No'}
                                                </span>
                                            </td>
                                            <td>
                                                <span style="color: ${principal.hasWriteAccess ? '#ef4444' : '#10b981'};">
                                                    <i class="fas fa-${principal.hasWriteAccess ? 'exclamation-triangle' : 'check'}"></i> ${principal.hasWriteAccess ? 'Yes' : 'No'}
                                                </span>
                                            </td>
                                        </tr>
                                        `;
                }).join('')}
                                </tbody>
                            </table>
                        </div>
                        
                        <div style="margin-top: 1rem; padding: 0.75rem; background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; border-radius: 4px;">
                            <p style="color: #94a3b8; font-size: 0.8125rem; margin: 0;">
                                <strong style="color: #ef4444;">Risk Scoring:</strong> 🔴 Critical (Full Control) → 🔴 High (Modify) → 🟠 High (Write/Create Files) → 🟡 Medium (Read) → 🟢 Low
                            </p>
                        </div>
                    </div>
                    ` : ''}
            </div>
        `;
    }

    renderFolderTreeView(folderTree, folderAnalysis) {
        return `
            <div class="audit-content" style="height: 100%; overflow-y: auto; margin-top: 0; padding: 0.5rem 0.75rem;">
                <div class="hardware-section-modern" style="margin-top: 0;">
                    <div style="margin-bottom: 1rem;">
                        <input 
                            type="text" 
                            id="folder-tree-search" 
                            class="folder-tree-search-input"
                            placeholder="Search folders by name or path..."
                            oninput="fileShareAuditorInstance.filterFolderTree(this.value)"
                            style="width: 100%; padding: 0.5rem 0.75rem; background: #1e293b; border: 1px solid #334155; border-radius: 0.375rem; color: #e2e8f0; font-size: 0.8125rem; transition: all 0.2s;"
                            onfocus="this.style.borderColor='#3b82f6'; this.style.boxShadow='0 0 0 3px rgba(59, 130, 246, 0.1)'"
                            onblur="this.style.borderColor='#334155'; this.style.boxShadow='none'"
                        >
                    </div>
                    <div class="folder-tree-container" id="folder-tree-container" style="height: calc(100vh - 250px); overflow-y: auto;">
                        ${this.renderFolderTree(folderTree, folderAnalysis.folderPath || '')}
                    </div>
                </div>
            </div>
        `;
    }


    async mount() {
        window.fileShareAuditorInstance = this;
        document.body.style.overflow = 'hidden';
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        if (id) {
            this.reportId = parseInt(id);
            if (isNaN(this.reportId)) {
                console.error('Invalid report ID:', id);
                this.reportId = null;
            } else {
                await this.loadReport();
            }
        } else {
            // Try to get ID from hash if not in query params
            const hash = window.location.hash;
            const hashMatch = hash.match(/[?&]id=(\d+)/);
            if (hashMatch) {
                this.reportId = parseInt(hashMatch[1]);
                if (!isNaN(this.reportId)) {
                    await this.loadReport();
                }
            }
        }
    }

    async unmount() {
        document.body.style.overflow = '';
    }

    async loadReport() {
        if (!this.reportId) {
            console.warn('No report ID available');
            return;
        }
        this.loading = true;
        this.updateDisplay();

        try {
            // Try both URL formats
            let response = await fetch(`/api/file-share-reports/${this.reportId}`);
            if (!response.ok && response.status === 404) {
                // Try alternative endpoint
                response = await fetch(`/api/file-share-reports/get?id=${this.reportId}`);
            }

            if (!response.ok) {
                if (response.status === 404) {
                    console.warn('Report not found:', this.reportId);
                    this.reportData = null;
                } else {
                    const errorText = await response.text();
                    throw new Error(`Failed to load report: ${errorText}`);
                }
            } else {
                this.reportData = await response.json();
                // Store server name and folder path for script generation
                if (this.reportData && !this.reportData.serverName) {
                    this.reportData.serverName = this.reportData.name || 'SERVER';
                }
            }
        } catch (error) {
            console.error('Error loading report:', error);
            this.reportData = null;
        } finally {
            this.loading = false;
            this.updateDisplay();
        }
    }

    goBack() {
        if (window.appInstance) {
            window.appInstance.navigateTo('file-share-auditor');
        } else {
            window.location.hash = 'file-share-auditor';
            window.location.reload();
        }
    }

    async generateScript(options = {}) {
        const { encrypt = true, obfuscate = true } = options;
        if (!this.reportId) {
            // Try to get ID from URL again
            const urlParams = new URLSearchParams(window.location.search);
            const id = urlParams.get('id');
            if (id) {
                this.reportId = parseInt(id);
            } else {
                const hash = window.location.hash;
                const hashMatch = hash.match(/[?&]id=(\d+)/);
                if (hashMatch) {
                    this.reportId = parseInt(hashMatch[1]);
                }
            }

            if (!this.reportId || isNaN(this.reportId)) {
                this.showMessage('Report ID not found. Please navigate to a valid report.', 'error');
                return;
            }
        }

        this.showMessage(encrypt ? 'Generating script...' : 'Generating plain script...', 'info');

        // Get folder path from report data (from folderAnalysis or directly from report metadata)
        let folderPath = this.reportData?.folderAnalysis?.folderPath || this.reportData?.folderPath || '';
        let serverName = this.reportData?.serverName || 'SERVER';

        // If we don't have the data, try to get folder path from the list
        if (!folderPath) {
            try {
                const listResponse = await fetch('/api/file-share-reports');
                if (listResponse.ok) {
                    const reports = await listResponse.json();
                    const currentReport = reports.find(r => r.id === this.reportId);
                    if (currentReport && currentReport.folderPath) {
                        folderPath = currentReport.folderPath;
                        serverName = currentReport.serverName || serverName;
                    }
                }
            } catch (e) {
                console.warn('Could not fetch report list:', e);
            }
        }

        if (!folderPath) {
            this.showMessage('Folder path not found. Please ensure the report has a folder path configured.', 'error');
            return;
        }

        try {
            const response = await fetch('/api/file-share-reports/generate-script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reportId: this.reportId,
                    serverName: serverName,
                    folderPath: folderPath,
                    obfuscated: obfuscate,
                    encrypt: encrypt
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = 'Failed to generate script';
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error || errorMessage;
                } catch {
                    errorMessage = errorText || errorMessage;
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();

            // Create a blob and download
            const blob = new Blob([data.script], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const scriptType = encrypt ? 'Encrypted' : 'Plain';
            a.download = `FileShareAudit-${scriptType}-${serverName.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.ps1`;
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

    showImportDialog() {
        const input = document.getElementById('import-file-input');
        if (input) {
            input.click();
        }
    }

    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!this.reportId) {
            this.showMessage('Report ID not found. Please navigate to a valid report.', 'error');
            return;
        }

        this.showMessage('Importing report data...', 'info');

        try {
            const text = await file.text();

            // Validate that it's valid JSON (either plain or encrypted)
            try {
                JSON.parse(text);
            } catch (e) {
                throw new Error('Invalid JSON file. Please ensure the file contains valid JSON data.');
            }

            const response = await fetch('/api/file-share-reports/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reportId: this.reportId,
                    data: text
                })
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

    showMessage(message, type) {
        // Use global notification system if available
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            // Fallback to alert for critical errors
            if (type === 'error') {
                alert(message);
            } else {
                console.log(`[${type.toUpperCase()}] ${message}`);
            }
        }
    }

    renderGroupModal() {
        if (this.selectedGroupModal === null || !this.groupsArray[this.selectedGroupModal]) return '';

        const group = this.groupsArray[this.selectedGroupModal];

        return `
            <div class="modal-overlay" onclick="fileShareAuditorInstance.closeGroupModal()" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem;">
                <div class="modal-content" onclick="event.stopPropagation()" style="background: #1e293b; border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 0.5rem; max-width: 1000px; width: 100%; max-height: 70vh; display: flex; flex-direction: column; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
                    <div class="modal-header" style="padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(59, 130, 246, 0.3); display: flex; align-items: center; justify-content: space-between; background: rgba(59, 130, 246, 0.1);">
                        <h3 style="color: #3b82f6; font-size: 1.125rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; margin: 0;">
                            <i class="fas fa-users"></i> ${group.name} - Folder Access Details
                        </h3>
                        <button onclick="fileShareAuditorInstance.closeGroupModal()" style="background: transparent; border: none; color: #94a3b8; font-size: 1.25rem; cursor: pointer; padding: 0.25rem; line-height: 1; transition: color 0.2s;" onmouseover="this.style.color='#e2e8f0'" onmouseout="this.style.color='#94a3b8'">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body" style="padding: 1.5rem; overflow-y: auto; flex: 1;">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                            <div style="background: rgba(15, 23, 42, 0.4); padding: 1rem; border-radius: 0.25rem; border: 1px solid #334155;">
                                <div style="color: #94a3b8; font-size: 0.75rem; margin-bottom: 0.25rem;">Total Folders</div>
                                <div style="color: #3b82f6; font-size: 1.5rem; font-weight: 600;">${group.totalFolders}</div>
                            </div>
                            <div style="background: rgba(15, 23, 42, 0.4); padding: 1rem; border-radius: 0.25rem; border: 1px solid #334155;">
                                <div style="color: #94a3b8; font-size: 0.75rem; margin-bottom: 0.25rem;">Unique Rights</div>
                                <div style="color: #3b82f6; font-size: 1.5rem; font-weight: 600;">${group.rights.length}</div>
                            </div>
                        </div>
                        <div style="margin-bottom: 1.5rem;">
                            <h4 style="color: #e2e8f0; font-size: 0.9375rem; font-weight: 600; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-key" style="color: #3b82f6;"></i> Rights
                            </h4>
                            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                                ${(() => {
                // Flatten and parse all rights from the array
                const allRights = [];
                group.rights.forEach(right => {
                    if (typeof right === 'string') {
                        const rightsList = right.split(',').map(r => r.trim()).filter(r => r.length > 0);
                        allRights.push(...rightsList);
                    } else {
                        allRights.push(right);
                    }
                });
                // Remove duplicates
                const uniqueRights = [...new Set(allRights)];
                return uniqueRights.map(right => {
                    const rightColor = right.includes('FullControl') || right.includes('Full') ? '#ef4444' :
                        right.includes('Modify') || right.includes('Change') ? '#f59e0b' :
                            right.includes('Write') ? '#fbbf24' :
                                right.includes('Read') ? '#10b981' : '#3b82f6';
                    return `
                                        <span style="background: ${rightColor}20; color: ${rightColor}; padding: 0.375rem 0.75rem; border-radius: 3px; font-family: 'Consolas', 'Monaco', monospace; font-size: 0.75rem; font-weight: 600; border: 1px solid ${rightColor}40;">
                                            ${right}
                                        </span>
                                    `;
                }).join('');
            })()}
                            </div>
                        </div>
                        <div>
                            <h4 style="color: #e2e8f0; font-size: 0.9375rem; font-weight: 600; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-folder-open" style="color: #3b82f6;"></i> Folders (${group.folders.length})
                            </h4>
                            <div class="table-container-modern">
                                <table class="table-compact">
                                    <thead>
                                        <tr>
                                            <th style="width: 40%;">Folder Path</th>
                                            <th style="width: 25%;">Rights</th>
                                            <th style="width: 10%;">Type</th>
                                            <th style="width: 10%;">Inherited</th>
                                            <th style="width: 15%;">Risk</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${group.folders.map(folder => {
                const riskColor = folder.riskLevel === 'Critical' ? '#ef4444' :
                    folder.riskLevel === 'High' ? '#f59e0b' :
                        folder.riskLevel === 'Medium' ? '#fbbf24' : '#10b981';
                const riskIcon = folder.riskLevel === 'Critical' ? '🔴' :
                    folder.riskLevel === 'High' ? '🟠' :
                        folder.riskLevel === 'Medium' ? '🟡' : '🟢';
                return `
                                            <tr>
                                                <td>
                                                    <div style="font-family: 'Consolas', 'Monaco', monospace; font-size: 0.75rem; color: #cbd5e1; word-break: break-all;" title="${folder.path}">
                                                        ${folder.relativePath}
                                                    </div>
                                                </td>
                                                <td>
                                                    ${(() => {
                        const rightsStr = folder.rights || 'N/A';
                        const rightsArray = rightsStr !== 'N/A' ? rightsStr.split(',').map(r => r.trim()).filter(r => r.length > 0) : [];
                        if (rightsArray.length > 0) {
                            return `
                                                            <div style="display: flex; flex-wrap: wrap; gap: 0.25rem;">
                                                                ${rightsArray.map(right => {
                                const rightColor = right.includes('FullControl') || right.includes('Full') ? '#ef4444' :
                                    right.includes('Modify') || right.includes('Change') ? '#f59e0b' :
                                        right.includes('Write') ? '#fbbf24' :
                                            right.includes('Read') ? '#10b981' : '#3b82f6';
                                return `
                                                                    <span style="background: ${rightColor}20; color: ${rightColor}; padding: 0.1875rem 0.375rem; border-radius: 3px; font-size: 0.6875rem; font-weight: 600; border: 1px solid ${rightColor}40; font-family: 'Consolas', 'Monaco', monospace;">
                                                                        ${right}
                                                                    </span>
                                                                `;
                            }).join('')}
                                                            </div>
                                                            `;
                        }
                        return `<span style="font-size: 0.75rem; color: #94a3b8; font-family: 'Consolas', 'Monaco', monospace;">${rightsStr}</span>`;
                    })()}
                                                </td>
                                                <td style="color: ${folder.accessType === 'Deny' ? '#f59e0b' : '#94a3b8'}; font-size: 0.75rem;">
                                                    ${folder.accessType}
                                                </td>
                                                <td>
                                                    <span style="color: ${folder.isInherited ? '#94a3b8' : '#e2e8f0'}; font-size: 0.75rem;">
                                                        <i class="fas fa-${folder.isInherited ? 'check' : 'times'}"></i> ${folder.isInherited ? 'Yes' : 'No'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span style="background: ${riskColor}20; color: ${riskColor}; padding: 0.1875rem 0.375rem; border-radius: 3px; font-size: 0.6875rem; font-weight: 600; border: 1px solid ${riskColor}40;">
                                                        ${riskIcon} ${folder.riskLevel}
                                                    </span>
                                                </td>
                                            </tr>
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
    }

    showRedFlagsModal(shareName, redFlags) {
        // Handle both array and string formats
        const flagsArray = Array.isArray(redFlags) ? redFlags : (typeof redFlags === 'string' ? [redFlags] : []);
        this.selectedShareRedFlags = {
            shareName: shareName,
            redFlags: flagsArray
        };
        this.isRedFlagsModalOpen = true;
        this.lockBodyScroll();
        this.updateDisplay();
    }

    showRedFlagsModalByIndex(shareIndex) {
        const folderAnalysis = this.reportData?.folderAnalysis;
        if (!folderAnalysis || !folderAnalysis.shareEnumeration || !folderAnalysis.shareEnumeration[shareIndex]) {
            return;
        }
        const share = folderAnalysis.shareEnumeration[shareIndex];
        this.showRedFlagsModal(share.shareName || 'Unknown', share.redFlags || []);
    }

    closeRedFlagsModal() {
        this.isRedFlagsModalOpen = false;
        this.selectedShareRedFlags = null;
        // Only unlock if no other modals are open
        if (!this.showCriticalIssuesModal && !this.showWarningIssuesModal &&
            !this.isShareDetailsModalOpen &&
            this.selectedGroupModal === null && this.selectedUserModal === null) {
            this.unlockBodyScroll();
        }
        this.updateDisplay();
    }

    renderRedFlagsModal() {
        if (!this.isRedFlagsModalOpen || !this.selectedShareRedFlags) return '';

        const { shareName, redFlags } = this.selectedShareRedFlags;

        return `
            <div class="modal-overlay" onclick="fileShareAuditorInstance.closeRedFlagsModal()" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem;">
                <div onclick="event.stopPropagation()" style="background: #1e293b; border: 1px solid #334155; border-radius: 6px; width: 100%; max-width: 700px; max-height: 70vh; display: flex; flex-direction: column; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);">
                    <div style="padding: 1.5rem; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0; color: #e2e8f0; font-size: 1.25rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i>
                            Red Flags - ${shareName}
                        </h3>
                        <button onclick="fileShareAuditorInstance.closeRedFlagsModal()" style="background: transparent; border: none; color: #94a3b8; font-size: 1.25rem; cursor: pointer; padding: 0.25rem; line-height: 1; transition: color 0.2s;" onmouseover="this.style.color='#e2e8f0'" onmouseout="this.style.color='#94a3b8'">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div style="padding: 1.5rem; overflow-y: auto; flex: 1;">
                        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                            ${redFlags.length > 0 ? redFlags.map((flag, index) => `
                                <div style="background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; padding: 0.75rem 1rem; border-radius: 4px; display: flex; align-items: flex-start; gap: 0.75rem;">
                                    <i class="fas fa-exclamation-circle" style="color: #ef4444; margin-top: 0.125rem; flex-shrink: 0;"></i>
                                    <span style="color: #e2e8f0; font-size: 0.875rem; line-height: 1.5;">${flag}</span>
                                </div>
                            `).join('') : `
                                <div style="text-align: center; color: #94a3b8; padding: 2rem;">
                                    No red flags found.
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    showShareDetailsModal(shareIndex) {
        const folderAnalysis = this.reportData?.folderAnalysis;
        if (!folderAnalysis || !folderAnalysis.shareEnumeration || !folderAnalysis.shareEnumeration[shareIndex]) {
            return;
        }
        this.selectedShareDetails = folderAnalysis.shareEnumeration[shareIndex];
        this.isShareDetailsModalOpen = true;
        this.lockBodyScroll();
        this.updateDisplay();
    }

    closeShareDetailsModal() {
        this.isShareDetailsModalOpen = false;
        this.selectedShareDetails = null;
        // Only unlock if no other modals are open
        if (!this.showCriticalIssuesModal && !this.showWarningIssuesModal &&
            !this.isRedFlagsModalOpen &&
            this.selectedGroupModal === null && this.selectedUserModal === null) {
            this.unlockBodyScroll();
        }
        this.updateDisplay();
    }

    renderShareDetailsModal() {
        if (!this.isShareDetailsModalOpen || !this.selectedShareDetails) return '';

        const share = this.selectedShareDetails;
        const shareRiskLevel = share.shareRiskLevel || share.highestNTFSRisk || 'Low';
        const shareRiskIcon = share.shareRiskIcon || (shareRiskLevel === 'Critical' ? '🔴' : shareRiskLevel === 'High' ? '🟠' : shareRiskLevel === 'Medium' ? '🟡' : '🟢');
        const shareRiskColor = share.shareRiskColor || (shareRiskLevel === 'Critical' ? '#ef4444' : shareRiskLevel === 'High' ? '#f59e0b' : shareRiskLevel === 'Medium' ? '#fbbf24' : '#10b981');

        return `
            <div class="modal-overlay" onclick="fileShareAuditorInstance.closeShareDetailsModal()" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem;">
                <div onclick="event.stopPropagation()" style="background: #1e293b; border: 1px solid #334155; border-radius: 6px; width: 100%; max-width: 700px; max-height: 70vh; display: flex; flex-direction: column; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);">
                    <div style="padding: 0.75rem 1rem; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0; color: #e2e8f0; font-size: 1rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-share-alt" style="color: #3b82f6; font-size: 0.875rem;"></i>
                            ${share.shareName || 'Unknown'}
                        </h3>
                        <button onclick="fileShareAuditorInstance.closeShareDetailsModal()" style="background: transparent; border: none; color: #94a3b8; font-size: 1.125rem; cursor: pointer; padding: 0.25rem; line-height: 1; transition: color 0.2s;" onmouseover="this.style.color='#e2e8f0'" onmouseout="this.style.color='#94a3b8'">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div style="padding: 1rem; overflow-y: auto; flex: 1;">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.5rem; margin-bottom: 0.75rem;">
                            <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 4px; padding: 0.5rem;">
                                <div style="color: #94a3b8; font-size: 0.625rem; margin-bottom: 0.125rem;">Share Name</div>
                                <div style="color: #e2e8f0; font-size: 0.8125rem; font-weight: 600;">${share.shareName || 'N/A'}</div>
                            </div>
                            <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 4px; padding: 0.5rem;">
                                <div style="color: #94a3b8; font-size: 0.625rem; margin-bottom: 0.125rem;">Share Risk</div>
                                <div style="display: flex; align-items: center; gap: 0.25rem;">
                                    <span style="background: ${shareRiskColor}20; color: ${shareRiskColor}; padding: 0.125rem 0.375rem; border-radius: 3px; font-size: 0.75rem; font-weight: 600; border: 1px solid ${shareRiskColor}40;">
                                        ${shareRiskIcon} ${shareRiskLevel}
                                    </span>
                                </div>
                            </div>
                            <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 4px; padding: 0.5rem;">
                                <div style="color: #94a3b8; font-size: 0.625rem; margin-bottom: 0.125rem;">Share Type</div>
                                <div style="color: ${share.shareType === 'Hidden' ? '#f59e0b' : share.shareType === 'Admin' ? '#6366f1' : '#e2e8f0'}; font-size: 0.8125rem; font-weight: 600;">
                                    ${share.shareType || 'Normal'}
                                    ${share.shareType === 'Hidden' ? ' <i class="fas fa-eye-slash" style="font-size: 0.75rem;"></i>' : ''}
                                    ${share.shareType === 'Admin' ? ' <i class="fas fa-shield-alt" style="font-size: 0.75rem;"></i>' : ''}
                                </div>
                            </div>
                            <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 4px; padding: 0.5rem;">
                                <div style="color: #94a3b8; font-size: 0.625rem; margin-bottom: 0.125rem;">Hosting Server</div>
                                <div style="color: #e2e8f0; font-size: 0.8125rem; font-weight: 600;">${share.hostingServer || 'N/A'}</div>
                            </div>
                        </div>
                        
                        <div style="background: #0f172a; border: 1px solid #334155; border-radius: 4px; padding: 0.75rem; margin-bottom: 0.75rem;">
                            <h4 style="color: #e2e8f0; font-size: 0.75rem; font-weight: 600; margin: 0 0 0.5rem 0; display: flex; align-items: center; gap: 0.375rem;">
                                <i class="fas fa-link" style="color: #3b82f6; font-size: 0.75rem;"></i> Paths
                            </h4>
                            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                                <div>
                                    <div style="color: #94a3b8; font-size: 0.625rem; margin-bottom: 0.125rem;">UNC Path</div>
                                    <div style="font-family: 'Consolas', 'Monaco', monospace; color: #e2e8f0; font-size: 0.75rem; word-break: break-all;">${share.uncPath || 'N/A'}</div>
                                </div>
                                <div>
                                    <div style="color: #94a3b8; font-size: 0.625rem; margin-bottom: 0.125rem;">Local Path</div>
                                    <div style="font-family: 'Consolas', 'Monaco', monospace; color: #e2e8f0; font-size: 0.75rem; word-break: break-all;">${share.localPath || 'N/A'}</div>
                                </div>
                            </div>
                        </div>
                        
                        <div style="background: #0f172a; border: 1px solid #334155; border-radius: 4px; padding: 0.75rem; margin-bottom: 0.75rem;">
                            <h4 style="color: #e2e8f0; font-size: 0.75rem; font-weight: 600; margin: 0 0 0.5rem 0; display: flex; align-items: center; gap: 0.375rem;">
                                <i class="fas fa-cog" style="color: #3b82f6; font-size: 0.75rem;"></i> Configuration
                            </h4>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.5rem;">
                                <div>
                                    <div style="color: #94a3b8; font-size: 0.625rem; margin-bottom: 0.125rem;">Offline Files</div>
                                    <div style="color: ${share.offlineFilesEnabled === 'Yes' ? '#10b981' : '#94a3b8'}; font-size: 0.75rem;">
                                        <i class="fas fa-${share.offlineFilesEnabled === 'Yes' ? 'check' : 'times'}" style="font-size: 0.6875rem;"></i> ${share.offlineFilesEnabled || 'No'}
                                    </div>
                                </div>
                                <div>
                                    <div style="color: #94a3b8; font-size: 0.625rem; margin-bottom: 0.125rem;">SMB Version</div>
                                    <div style="color: ${share.smbVersion && share.smbVersion.includes('SMB1') ? '#ef4444' : '#10b981'}; font-size: 0.75rem;">
                                        ${share.smbVersion || 'N/A'}
                                        ${share.smbVersion && share.smbVersion.includes('SMB1') ? ' <i class="fas fa-exclamation-triangle" style="font-size: 0.6875rem;"></i>' : ''}
                                    </div>
                                </div>
                                <div>
                                    <div style="color: #94a3b8; font-size: 0.625rem; margin-bottom: 0.125rem;">Encryption</div>
                                    <div style="color: ${share.encryptionRequired === 'Yes' ? '#10b981' : '#f59e0b'}; font-size: 0.75rem;">
                                        <i class="fas fa-${share.encryptionRequired === 'Yes' ? 'lock' : 'unlock'}" style="font-size: 0.6875rem;"></i> ${share.encryptionRequired || 'No'}
                                    </div>
                                </div>
                                <div>
                                    <div style="color: #94a3b8; font-size: 0.625rem; margin-bottom: 0.125rem;">Continuous Availability</div>
                                    <div style="color: ${share.continuousAvailability === 'Yes' ? '#10b981' : '#94a3b8'}; font-size: 0.75rem;">
                                        <i class="fas fa-${share.continuousAvailability === 'Yes' ? 'check' : 'times'}" style="font-size: 0.6875rem;"></i> ${share.continuousAvailability || 'No'}
                                    </div>
                                </div>
                                ${share.concurrentUserLimit ? `
                                <div>
                                    <div style="color: #94a3b8; font-size: 0.625rem; margin-bottom: 0.125rem;">Concurrent User Limit</div>
                                    <div style="color: #e2e8f0; font-size: 0.75rem;">${share.concurrentUserLimit}</div>
                                </div>
                                ` : ''}
                                ${share.folderEnumerationMode && share.folderEnumerationMode !== 'N/A' ? `
                                <div>
                                    <div style="color: #94a3b8; font-size: 0.625rem; margin-bottom: 0.125rem;">Folder Enumeration Mode</div>
                                    <div style="color: #e2e8f0; font-size: 0.75rem;">${share.folderEnumerationMode}</div>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        
                        ${share.description ? `
                        <div style="background: #0f172a; border: 1px solid #334155; border-radius: 4px; padding: 0.75rem; margin-bottom: 0.75rem;">
                            <h4 style="color: #e2e8f0; font-size: 0.75rem; font-weight: 600; margin: 0 0 0.375rem 0; display: flex; align-items: center; gap: 0.375rem;">
                                <i class="fas fa-info-circle" style="color: #3b82f6; font-size: 0.75rem;"></i> Description
                            </h4>
                            <div style="color: #e2e8f0; font-size: 0.75rem;">${share.description}</div>
                        </div>
                        ` : ''}
                        
                        ${share.redFlags && share.redFlags.length > 0 ? `
                        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 4px; padding: 0.75rem;">
                            <h4 style="color: #ef4444; font-size: 0.75rem; font-weight: 600; margin: 0 0 0.5rem 0; display: flex; align-items: center; gap: 0.375rem;">
                                <i class="fas fa-exclamation-triangle" style="font-size: 0.75rem;"></i> Red Flags (${share.redFlags.length})
                            </h4>
                            <div style="display: flex; flex-direction: column; gap: 0.375rem;">
                                ${share.redFlags.map((flag, index) => `
                                    <div style="background: rgba(239, 68, 68, 0.1); border-left: 2px solid #ef4444; padding: 0.375rem 0.5rem; border-radius: 3px; display: flex; align-items: flex-start; gap: 0.375rem;">
                                        <i class="fas fa-exclamation-circle" style="color: #ef4444; margin-top: 0.0625rem; flex-shrink: 0; font-size: 0.6875rem;"></i>
                                        <span style="color: #e2e8f0; font-size: 0.75rem; line-height: 1.4;">${flag}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        ` : `
                        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 4px; padding: 0.75rem;">
                            <div style="color: #10b981; font-size: 0.75rem; display: flex; align-items: center; gap: 0.375rem;">
                                <i class="fas fa-check-circle" style="font-size: 0.75rem;"></i> No red flags detected
                            </div>
                        </div>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    renderUserModal() {
        if (this.selectedUserModal === null || !this.usersArray[this.selectedUserModal]) return '';

        const user = this.usersArray[this.selectedUserModal];

        return `
            <div class="modal-overlay" onclick="fileShareAuditorInstance.closeUserModal()" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem;">
                <div class="modal-content" onclick="event.stopPropagation()" style="background: #1e293b; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 0.5rem; max-width: 1000px; width: 100%; max-height: 70vh; display: flex; flex-direction: column; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
                    <div class="modal-header" style="padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(16, 185, 129, 0.3); display: flex; align-items: center; justify-content: space-between; background: rgba(16, 185, 129, 0.1);">
                        <h3 style="color: #10b981; font-size: 1.125rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; margin: 0;">
                            <i class="fas fa-user"></i> ${user.name} - Folder Access Details
                        </h3>
                        <button onclick="fileShareAuditorInstance.closeUserModal()" style="background: transparent; border: none; color: #94a3b8; font-size: 1.25rem; cursor: pointer; padding: 0.25rem; line-height: 1; transition: color 0.2s;" onmouseover="this.style.color='#e2e8f0'" onmouseout="this.style.color='#94a3b8'">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body" style="padding: 1.5rem; overflow-y: auto; flex: 1;">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                            <div style="background: rgba(15, 23, 42, 0.4); padding: 1rem; border-radius: 0.25rem; border: 1px solid #334155;">
                                <div style="color: #94a3b8; font-size: 0.75rem; margin-bottom: 0.25rem;">Total Folders</div>
                                <div style="color: #10b981; font-size: 1.5rem; font-weight: 600;">${user.totalFolders}</div>
                            </div>
                            <div style="background: rgba(15, 23, 42, 0.4); padding: 1rem; border-radius: 0.25rem; border: 1px solid #334155;">
                                <div style="color: #94a3b8; font-size: 0.75rem; margin-bottom: 0.25rem;">Unique Rights</div>
                                <div style="color: #10b981; font-size: 1.5rem; font-weight: 600;">${user.rights.length}</div>
                            </div>
                        </div>
                        <div style="margin-bottom: 1.5rem;">
                            <h4 style="color: #e2e8f0; font-size: 0.9375rem; font-weight: 600; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-key" style="color: #10b981;"></i> Rights
                            </h4>
                            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                                ${(() => {
                // Flatten and parse all rights from the array
                const allRights = [];
                user.rights.forEach(right => {
                    if (typeof right === 'string') {
                        const rightsList = right.split(',').map(r => r.trim()).filter(r => r.length > 0);
                        allRights.push(...rightsList);
                    } else {
                        allRights.push(right);
                    }
                });
                // Remove duplicates
                const uniqueRights = [...new Set(allRights)];
                return uniqueRights.map(right => {
                    const rightColor = right.includes('FullControl') || right.includes('Full') ? '#ef4444' :
                        right.includes('Modify') || right.includes('Change') ? '#f59e0b' :
                            right.includes('Write') ? '#fbbf24' :
                                right.includes('Read') ? '#10b981' : '#10b981';
                    return `
                                        <span style="background: ${rightColor}20; color: ${rightColor}; padding: 0.375rem 0.75rem; border-radius: 3px; font-family: 'Consolas', 'Monaco', monospace; font-size: 0.75rem; font-weight: 600; border: 1px solid ${rightColor}40;">
                                            ${right}
                                        </span>
                                    `;
                }).join('');
            })()}
                            </div>
                        </div>
                        <div>
                            <h4 style="color: #e2e8f0; font-size: 0.9375rem; font-weight: 600; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-folder-open" style="color: #10b981;"></i> Folders (${user.folders.length})
                            </h4>
                            <div class="table-container-modern">
                                <table class="table-compact">
                                    <thead>
                                        <tr>
                                            <th style="width: 40%;">Folder Path</th>
                                            <th style="width: 25%;">Rights</th>
                                            <th style="width: 10%;">Type</th>
                                            <th style="width: 10%;">Inherited</th>
                                            <th style="width: 15%;">Risk</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${user.folders.map(folder => {
                const riskColor = folder.riskLevel === 'Critical' ? '#ef4444' :
                    folder.riskLevel === 'High' ? '#f59e0b' :
                        folder.riskLevel === 'Medium' ? '#fbbf24' : '#10b981';
                const riskIcon = folder.riskLevel === 'Critical' ? '🔴' :
                    folder.riskLevel === 'High' ? '🟠' :
                        folder.riskLevel === 'Medium' ? '🟡' : '🟢';
                return `
                                            <tr>
                                                <td>
                                                    <div style="font-family: 'Consolas', 'Monaco', monospace; font-size: 0.75rem; color: #cbd5e1; word-break: break-all;" title="${folder.path}">
                                                        ${folder.relativePath}
                                                    </div>
                                                </td>
                                                <td>
                                                    ${(() => {
                        const rightsStr = folder.rights || 'N/A';
                        const rightsArray = rightsStr !== 'N/A' ? rightsStr.split(',').map(r => r.trim()).filter(r => r.length > 0) : [];
                        if (rightsArray.length > 0) {
                            return `
                                                            <div style="display: flex; flex-wrap: wrap; gap: 0.25rem;">
                                                                ${rightsArray.map(right => {
                                const rightColor = right.includes('FullControl') || right.includes('Full') ? '#ef4444' :
                                    right.includes('Modify') || right.includes('Change') ? '#f59e0b' :
                                        right.includes('Write') ? '#fbbf24' :
                                            right.includes('Read') ? '#10b981' : '#3b82f6';
                                return `
                                                                    <span style="background: ${rightColor}20; color: ${rightColor}; padding: 0.1875rem 0.375rem; border-radius: 3px; font-size: 0.6875rem; font-weight: 600; border: 1px solid ${rightColor}40; font-family: 'Consolas', 'Monaco', monospace;">
                                                                        ${right}
                                                                    </span>
                                                                `;
                            }).join('')}
                                                            </div>
                                                            `;
                        }
                        return `<span style="font-size: 0.75rem; color: #94a3b8; font-family: 'Consolas', 'Monaco', monospace;">${rightsStr}</span>`;
                    })()}
                                                </td>
                                                <td style="color: ${folder.accessType === 'Deny' ? '#f59e0b' : '#94a3b8'}; font-size: 0.75rem;">
                                                    ${folder.accessType}
                                                </td>
                                                <td>
                                                    <span style="color: ${folder.isInherited ? '#94a3b8' : '#e2e8f0'}; font-size: 0.75rem;">
                                                        <i class="fas fa-${folder.isInherited ? 'check' : 'times'}"></i> ${folder.isInherited ? 'Yes' : 'No'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span style="background: ${riskColor}20; color: ${riskColor}; padding: 0.1875rem 0.375rem; border-radius: 3px; font-size: 0.6875rem; font-weight: 600; border: 1px solid ${riskColor}40;">
                                                        ${riskIcon} ${folder.riskLevel}
                                                    </span>
                                                </td>
                                            </tr>
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
    }

    async updateDisplay() {
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = await this.render();

            // Set instance for event handlers
            window.fileShareAuditorInstance = this;

            // Append modals after render
            if (this.showCriticalIssuesModal) {
                content.insertAdjacentHTML('beforeend', this.renderIssuesModal('critical'));
            }
            if (this.showWarningIssuesModal) {
                content.insertAdjacentHTML('beforeend', this.renderIssuesModal('warning'));
            }
            if (this.selectedGroupModal !== null) {
                content.insertAdjacentHTML('beforeend', this.renderGroupModal());
            }
            if (this.selectedUserModal !== null) {
                content.insertAdjacentHTML('beforeend', this.renderUserModal());
            }
            if (this.isRedFlagsModalOpen) {
                content.insertAdjacentHTML('beforeend', this.renderRedFlagsModal());
            }
            if (this.isShareDetailsModalOpen) {
                content.insertAdjacentHTML('beforeend', this.renderShareDetailsModal());
            }
            if (this.selectedFolderForModal) {
                content.insertAdjacentHTML('beforeend', this.renderFolderPermissionsModal());
            }

            // Update page navbar title after rendering
            if (window.pageNavbarInstance) {
                window.pageNavbarInstance.updateTitle();
            }
        }
    }

    renderFolderTree(folderTree, rootPath) {
        if (!folderTree || folderTree.length === 0) {
            return '<div class="empty-state"><i class="fas fa-folder-open"></i><p>No folder tree data available</p></div>';
        }

        // Store folder tree data indexed by path for quick lookup
        if (!this.folderTreeMap) {
            this.folderTreeMap = new Map();
            folderTree.forEach(folder => {
                this.folderTreeMap.set(folder.path, folder);
            });
        }

        // Build a map for quick lookup
        const folderMap = this.folderTreeMap;

        // Build hierarchy recursively
        const buildTree = (path, depth = 0) => {
            const folder = folderMap.get(path);
            if (!folder) return '';

            const relativePath = folder.relativePath || folder.name || '.';
            const riskColor = folder.riskLevel === 'Critical' ? '#ef4444' :
                folder.riskLevel === 'High' ? '#f59e0b' :
                    folder.riskLevel === 'Medium' ? '#fbbf24' : '#10b981';

            const riskIcon = folder.riskLevel === 'Critical' ? 'fa-exclamation-triangle' :
                folder.riskLevel === 'High' ? 'fa-exclamation-circle' :
                    folder.riskLevel === 'Medium' ? 'fa-exclamation' : 'fa-check-circle';

            const hasIssues = folder.hasMisconfigurations || false;
            const issueCount = (folder.criticalCount || 0) + (folder.highCount || 0) + (folder.mediumCount || 0) + (folder.warningCount || 0);

            // Get child folders (direct children only)
            const childFolders = folderTree.filter(f => {
                if (f.path === path) return false;
                const parentPath = f.path.substring(0, f.path.lastIndexOf('\\'));
                return parentPath === path;
            }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            const folderId = `folder-${path.replace(/[^a-zA-Z0-9]/g, '-')}`;
            const isRoot = depth === 0; // Root folder is always open
            const isExpanded = true; // All folders are expanded by default
            const hasChildren = childFolders.length > 0;

            const explicitPerms = (folder.permissions || []).filter(p => !p.isInherited).length;
            const inheritedPerms = (folder.permissions || []).filter(p => p.isInherited).length;
            const denyAces = (folder.permissions || []).filter(p => p.accessControlType === 'Deny').length;
            const allowPerms = (folder.permissions || []).filter(p => p.accessControlType === 'Allow').length;

            const folderPathEncoded = encodeURIComponent(folder.path || '');
            let html = `
                <div class="folder-tree-node" data-folder-path="${folder.path || ''}">
                    <div class="folder-tree-header" 
                         data-folder-id="${folderId}"
                         data-folder-path="${folder.path || ''}"
                         style="display: flex; align-items: center; gap: 0.375rem; padding: 0.375rem 0.5rem; background: ${hasIssues ? 'rgba(239, 68, 68, 0.08)' : 'rgba(51, 65, 85, 0.3)'}; border: 1px solid ${hasIssues ? 'rgba(239, 68, 68, 0.3)' : '#334155'}; border-radius: 0.25rem; transition: all 0.15s; user-select: none; margin-left: ${depth * 0.5}rem; margin-bottom: 0.125rem;"
                         onmouseover="this.style.background='${hasIssues ? 'rgba(239, 68, 68, 0.12)' : 'rgba(51, 65, 85, 0.4)'}'; this.style.borderColor='${hasIssues ? 'rgba(239, 68, 68, 0.4)' : '#475569'}'"
                         onmouseout="this.style.background='${hasIssues ? 'rgba(239, 68, 68, 0.08)' : 'rgba(51, 65, 85, 0.3)'}'; this.style.borderColor='${hasIssues ? 'rgba(239, 68, 68, 0.3)' : '#334155'}'"
                         title="${folder.path || ''}">
                        ${hasChildren ? `
                        <i class="fas folder-chevron-${folderId} fa-chevron-down" 
                           style="color: #64748b; font-size: 0.625rem; width: 10px; transition: transform 0.15s; flex-shrink: 0; cursor: pointer;"
                           onclick="event.stopPropagation(); fileShareAuditorInstance.toggleFolder('${folderId}')"
                           title="Click to expand/collapse"></i>
                        ` : '<span style="width: 10px; flex-shrink: 0;"></span>'}
                        <i class="fas fa-folder" style="color: ${riskColor}; font-size: 0.6875rem; flex-shrink: 0;"></i>
                        <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.0625rem; cursor: pointer;"
                             onclick="event.stopPropagation(); fileShareAuditorInstance.toggleFolder('${folderId}')"
                             onmouseover="this.style.opacity='0.8'"
                             onmouseout="this.style.opacity='1'"
                             title="Click to expand/collapse">
                            <span style="font-weight: 600; color: #e2e8f0; font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${folder.name || relativePath}</span>
                        </div>
                        ${issueCount > 0 ? `
                        <span style="background: ${riskColor}30; color: ${riskColor}; padding: 0.125rem 0.3125rem; border-radius: 3px; font-size: 0.625rem; font-weight: 600; border: 1px solid ${riskColor}50; flex-shrink: 0; cursor: pointer;"
                              onclick="event.stopPropagation(); fileShareAuditorInstance.showFolderPermissionsModalByPath('${folderPathEncoded}')"
                              onmouseover="this.style.transform='scale(1.1)'; this.style.boxShadow='0 2px 8px ${riskColor}50'"
                              onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'"
                              title="Click to view permissions">
                            <i class="fas ${riskIcon}" style="font-size: 0.5rem; margin-right: 0.125rem;"></i>${issueCount}
                        </span>
                        ` : '<span style="color: #10b981; font-size: 0.625rem; flex-shrink: 0;"><i class="fas fa-check" style="font-size: 0.5rem;"></i></span>'}
                    </div>
                    ${hasChildren || folder.folderWarning || folder.error ? `
                    <div class="folder-tree-content-${folderId}" style="display: block; margin-left: ${(depth + 1) * 0.5}rem; margin-top: 0.125rem; padding-left: 0.375rem; border-left: 1px solid ${hasIssues ? 'rgba(239, 68, 68, 0.2)' : '#334155'};">
                        ${folder.folderWarning ? `
                        <div style="color: #f59e0b; font-size: 0.6875rem; padding: 0.375rem 0.5rem; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 0.25rem; margin-bottom: 0.125rem; display: flex; align-items: flex-start; gap: 0.3125rem;">
                            <i class="fas fa-exclamation-triangle" style="font-size: 0.625rem; margin-top: 0.0625rem; flex-shrink: 0;"></i>
                            <span style="word-break: break-word;">${folder.folderWarning}</span>
                        </div>
                        ` : ''}
                        ${folder.error ? `
                        <div style="color: #ef4444; font-size: 0.6875rem; padding: 0.375rem 0.5rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 0.25rem; margin-bottom: 0.125rem; display: flex; align-items: center; gap: 0.3125rem;">
                            <i class="fas fa-exclamation-triangle" style="font-size: 0.625rem;"></i>
                            <span>${folder.error}</span>
                        </div>
                        ` : ''}
                        ${childFolders.map(child => buildTree(child.path, depth + 1)).join('')}
                    </div>
                    ` : childFolders.map(child => buildTree(child.path, depth + 1)).join('')}
                </div>
            `;

            return html;
        };

        // Find root folder
        const rootFolder = folderTree.find(f => {
            if (f.path === rootPath) return true;
            const relPath = f.relativePath || '';
            return relPath === '.' || relPath === '' || !relPath;
        }) || folderTree[0];

        if (!rootFolder) {
            return '<div class="empty-state"><i class="fas fa-folder-open"></i><p>No root folder found</p></div>';
        }

        // Store folder tree data for filtering
        this.folderTreeData = folderTree;
        this.folderTreeRootPath = rootPath;

        return buildTree(rootFolder.path, 0);
    }

    filterFolderTree(searchTerm) {
        if (!this.folderTreeData) return;

        const container = document.getElementById('folder-tree-container');
        if (!container) return;

        const searchLower = searchTerm.toLowerCase().trim();

        if (!searchLower) {
            // Show all folders and ensure they're all visible
            const allNodes = container.querySelectorAll('.folder-tree-node');
            allNodes.forEach(node => {
                node.style.display = '';
            });
            return;
        }

        // Filter folders
        const allNodes = container.querySelectorAll('.folder-tree-node');
        const matchingPaths = new Set();

        // First pass: find all matching nodes
        allNodes.forEach(node => {
            const folderPath = node.getAttribute('data-folder-path') || '';
            const folderName = folderPath.split('\\').pop() || '';
            const matches = folderPath.toLowerCase().includes(searchLower) ||
                folderName.toLowerCase().includes(searchLower);

            if (matches) {
                matchingPaths.add(folderPath);
                // Also add all parent paths
                let currentPath = folderPath;
                while (currentPath) {
                    matchingPaths.add(currentPath);
                    const lastBackslash = currentPath.lastIndexOf('\\');
                    if (lastBackslash === -1) break;
                    currentPath = currentPath.substring(0, lastBackslash);
                }
            }
        });

        // Second pass: show/hide nodes and expand parents
        allNodes.forEach(node => {
            const folderPath = node.getAttribute('data-folder-path') || '';
            const shouldShow = matchingPaths.has(folderPath);

            if (shouldShow) {
                node.style.display = '';
                // Expand parent nodes to show this node
                let parent = node.parentElement;
                while (parent) {
                    if (parent.classList && parent.classList.contains('folder-tree-node')) {
                        const header = parent.querySelector('.folder-tree-header');
                        if (header) {
                            const folderId = header.getAttribute('data-folder-id');
                            if (folderId) {
                                const content = document.querySelector(`.folder-tree-content-${folderId}`);
                                const icon = document.querySelector(`.folder-chevron-${folderId}`);
                                if (content) {
                                    const currentDisplay = window.getComputedStyle(content).display;
                                    if (currentDisplay === 'none') {
                                        content.style.display = 'block';
                                        if (icon) {
                                            icon.classList.remove('fa-chevron-right');
                                            icon.classList.add('fa-chevron-down');
                                        }
                                    }
                                }
                            }
                        }
                    }
                    parent = parent.parentElement;
                }
            } else {
                node.style.display = 'none';
            }
        });
    }

    showFolderPermissionsModalByPath(folderPathEncoded) {
        try {
            const folderPath = decodeURIComponent(folderPathEncoded);
            const folder = this.folderTreeMap?.get(folderPath);
            if (folder) {
                this.selectedFolderForModal = folder;
                this.lockBodyScroll();
                this.updateDisplay();
            }
        } catch (error) {
            console.error('Error getting folder data:', error);
        }
    }

    closeFolderPermissionsModal() {
        this.selectedFolderForModal = null;
        if (!this.showCriticalIssuesModal && !this.showWarningIssuesModal &&
            !this.isRedFlagsModalOpen && !this.isShareDetailsModalOpen &&
            this.selectedGroupModal === null && this.selectedUserModal === null) {
            this.unlockBodyScroll();
        }
        this.updateDisplay();
    }

    renderFolderPermissionsModal() {
        if (!this.selectedFolderForModal) return '';

        const folder = this.selectedFolderForModal;
        const explicitPerms = (folder.permissions || []).filter(p => !p.isInherited);
        const inheritedPerms = (folder.permissions || []).filter(p => p.isInherited);
        const allowPerms = (folder.permissions || []).filter(p => p.accessControlType === 'Allow');
        const denyAces = (folder.permissions || []).filter(p => p.accessControlType === 'Deny');
        const issueCount = (folder.criticalCount || 0) + (folder.highCount || 0) + (folder.mediumCount || 0) + (folder.warningCount || 0);
        const riskColor = folder.riskLevel === 'Critical' ? '#ef4444' :
            folder.riskLevel === 'High' ? '#f59e0b' :
                folder.riskLevel === 'Medium' ? '#fbbf24' : '#10b981';

        return `
            <div class="modal-overlay" onclick="fileShareAuditorInstance.closeFolderPermissionsModal()" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem;">
                <div class="modal-content" onclick="event.stopPropagation()" style="background: #1e293b; border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 0.5rem; max-width: 1200px; width: 100%; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
                    <div class="modal-header" style="padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(59, 130, 246, 0.3); display: flex; align-items: center; justify-content: space-between; background: rgba(59, 130, 246, 0.1);">
                        <h3 style="color: #3b82f6; font-size: 1.125rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; margin: 0;">
                            <i class="fas fa-folder" style="color: ${riskColor};"></i> ${folder.name || folder.relativePath || 'Folder'} - Permissions
                        </h3>
                        <button onclick="fileShareAuditorInstance.closeFolderPermissionsModal()" style="background: transparent; border: none; color: #94a3b8; font-size: 1.25rem; cursor: pointer; padding: 0.25rem; line-height: 1; transition: color 0.2s;" onmouseover="this.style.color='#e2e8f0'" onmouseout="this.style.color='#94a3b8'">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body" style="padding: 1.5rem; overflow-y: auto; flex: 1;">
                        <!-- Permissions Summary -->
                        <div style="margin-bottom: 1.5rem; padding: 1rem; background: rgba(15, 23, 42, 0.4); border: 1px solid #334155; border-radius: 0.375rem;">
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                                <div style="text-align: center;">
                                    <div style="color: #94a3b8; font-size: 0.75rem; margin-bottom: 0.25rem;">Total Permissions</div>
                                    <div style="color: #3b82f6; font-size: 1.5rem; font-weight: 600;">${folder.permissions?.length || 0}</div>
                                </div>
                                <div style="text-align: center;">
                                    <div style="color: #94a3b8; font-size: 0.75rem; margin-bottom: 0.25rem;">Explicit</div>
                                    <div style="color: #e2e8f0; font-size: 1.5rem; font-weight: 600;">${explicitPerms.length}</div>
                                </div>
                                <div style="text-align: center;">
                                    <div style="color: #94a3b8; font-size: 0.75rem; margin-bottom: 0.25rem;">Inherited</div>
                                    <div style="color: #94a3b8; font-size: 1.5rem; font-weight: 600;">${inheritedPerms.length}</div>
                                </div>
                                <div style="text-align: center;">
                                    <div style="color: #94a3b8; font-size: 0.75rem; margin-bottom: 0.25rem;">Allow</div>
                                    <div style="color: #10b981; font-size: 1.5rem; font-weight: 600;">${allowPerms.length}</div>
                                </div>
                                ${denyAces.length > 0 ? `
                                <div style="text-align: center;">
                                    <div style="color: #94a3b8; font-size: 0.75rem; margin-bottom: 0.25rem;">Deny</div>
                                    <div style="color: #f59e0b; font-size: 1.5rem; font-weight: 600;">${denyAces.length}</div>
                                </div>
                                ` : ''}
                            </div>
                            <div style="padding-top: 1rem; border-top: 1px solid #334155;">
                                <div style="color: #94a3b8; font-size: 0.75rem; margin-bottom: 0.25rem; display: flex; align-items: center; gap: 0.375rem;">
                                    <i class="fas fa-folder-open" style="color: #64748b;"></i> Full Path:
                                </div>
                                <div style="color: #e2e8f0; font-family: 'Consolas', 'Monaco', monospace; font-size: 0.8125rem; word-break: break-all; padding: 0.5rem; background: rgba(15, 23, 42, 0.6); border-radius: 0.25rem; border: 1px solid #334155;">
                                    ${folder.path || 'N/A'}
                                </div>
                            </div>
                        </div>

                        <!-- Permissions Table -->
                        ${(folder.permissions || []).length > 0 ? `
                        <div class="table-container-modern">
                            <table class="table-compact">
                                <thead>
                                    <tr>
                                        <th style="width: 18%;">Identity</th>
                                        <th style="width: 22%;">Rights</th>
                                        <th style="width: 7%;">Type</th>
                                        <th style="width: 9%;">Inherited</th>
                                        <th style="width: 8%;">Propagation</th>
                                        <th style="width: 9%;">Risk</th>
                                        <th style="width: 27%;">Issues</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${folder.permissions.map(perm => {
            const hasIssues = (perm.misconfigurations || []).length > 0;
            const permRiskColor = perm.riskLevel === 'Critical' ? '#ef4444' :
                perm.riskLevel === 'High' ? '#f59e0b' :
                    perm.riskLevel === 'Medium' ? '#fbbf24' : '#10b981';
            const riskIcon = perm.riskLevel === 'Critical' ? '🔴' :
                perm.riskLevel === 'High' ? '🟠' :
                    perm.riskLevel === 'Medium' ? '🟡' : '🟢';
            const propagationText = perm.propagationFlags || 'None';
            const propagationShort = propagationText.includes('InheritOnly') ? 'Inherit' :
                propagationText.includes('NoPropagateInherit') ? 'NoProp' :
                    propagationText.includes('None') ? 'None' : 'All';
            const rightsStr = perm.fileSystemRights || 'N/A';
            const rightsArray = rightsStr !== 'N/A' ? rightsStr.split(',').map(r => r.trim()).filter(r => r.length > 0) : [];
            return `
                                        <tr style="${hasIssues ? 'background: rgba(239, 68, 68, 0.03);' : ''}">
                                            <td>
                                                <strong style="color: ${perm.identityReference && perm.identityReference.includes('CREATOR OWNER') ? '#f59e0b' : '#e2e8f0'}; font-size: 0.75rem; word-break: break-word;" title="${perm.identityReference || 'N/A'}">${perm.identityReference || 'N/A'}</strong>
                                            </td>
                                            <td>
                                                ${rightsArray.length > 0 ? `
                                                <div style="display: flex; flex-wrap: wrap; gap: 0.25rem;">
                                                    ${rightsArray.map(right => {
                const rightColor = right.includes('FullControl') ? '#ef4444' :
                    right.includes('Modify') ? '#f59e0b' :
                        right.includes('Write') ? '#fbbf24' :
                            right.includes('Read') ? '#10b981' : '#94a3b8';
                return `
                                                        <span style="background: ${rightColor}20; color: ${rightColor}; padding: 0.1875rem 0.375rem; border-radius: 3px; font-size: 0.6875rem; font-weight: 600; border: 1px solid ${rightColor}40; font-family: 'Consolas', 'Monaco', monospace;">
                                                            ${right}
                                                        </span>
                                                    `;
            }).join('')}
                                                </div>
                                                ` : `<span style="font-family: 'Consolas', 'Monaco', monospace; font-size: 0.75rem; color: #cbd5e1; word-break: break-word;" title="${rightsStr}">${rightsStr}</span>`}
                                            </td>
                                            <td style="color: ${perm.accessControlType === 'Deny' ? '#f59e0b' : '#94a3b8'}; font-size: 0.75rem; font-weight: ${perm.accessControlType === 'Deny' ? '600' : '400'};">${perm.accessControlType || 'N/A'}</td>
                                            <td>
                                                <span style="color: ${perm.isInherited ? '#94a3b8' : '#e2e8f0'}; font-size: 0.75rem; display: flex; align-items: center; gap: 0.25rem;">
                                                    <i class="fas fa-${perm.isInherited ? 'check' : 'times'}" style="font-size: 0.625rem;"></i>
                                                    <span>${perm.isInherited ? 'Yes' : 'No'}</span>
                                                </span>
                                            </td>
                                            <td style="color: #94a3b8; font-size: 0.6875rem;" title="${propagationText}">
                                                ${propagationShort}
                                            </td>
                                            <td>
                                                <span style="background: ${permRiskColor}20; color: ${permRiskColor}; padding: 0.1875rem 0.375rem; border-radius: 3px; font-size: 0.6875rem; font-weight: 600; border: 1px solid ${permRiskColor}40; display: inline-flex; align-items: center; gap: 0.1875rem;">
                                                    <span>${riskIcon}</span>
                                                    <span>${perm.riskLevel || 'Low'}</span>
                                                </span>
                                            </td>
                                            <td>
                                                ${hasIssues ? `
                                                <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                                                    ${perm.misconfigurations.map(issue => {
                const issueColor = issue.match(/Critical:/) ? '#ef4444' :
                    issue.match(/High:/) ? '#f59e0b' :
                        issue.match(/Warning:/) ? '#fbbf24' : '#94a3b8';
                const issueIcon = issue.match(/Critical:/) ? 'times-circle' :
                    issue.match(/High:/) ? 'exclamation-circle' :
                        'info-circle';
                const shortIssue = issue.replace(/^(Critical|High|Warning):\s*/, '');
                return `
                                                        <span style="color: ${issueColor}; font-size: 0.6875rem; display: flex; align-items: flex-start; gap: 0.25rem; line-height: 1.3;">
                                                            <i class="fas fa-${issueIcon}" style="margin-top: 0.125rem; flex-shrink: 0; font-size: 0.5625rem;"></i>
                                                            <span style="word-break: break-word;">${shortIssue}</span>
                                                        </span>
                                                    `;
            }).join('')}
                                                </div>
                                                ` : '<span style="color: #10b981; font-size: 0.6875rem;"><i class="fas fa-check" style="font-size: 0.5625rem;"></i></span>'}
                                            </td>
                                        </tr>
                                        `;
        }).join('')}
                                </tbody>
                            </table>
                        </div>
                        ` : '<div style="color: #94a3b8; font-size: 0.875rem; padding: 1rem; text-align: center; background: rgba(15, 23, 42, 0.4); border-radius: 0.25rem;">No permissions</div>'}
                    </div>
                </div>
            </div>
        `;
    }

    toggleFolder(folderId) {
        const content = document.querySelector(`.folder-tree-content-${folderId}`);
        const icon = document.querySelector(`.folder-chevron-${folderId}`);

        if (content) {
            const currentDisplay = window.getComputedStyle(content).display;
            const isVisible = currentDisplay !== 'none';
            content.style.display = isVisible ? 'none' : 'block';
            if (icon) {
                if (isVisible) {
                    icon.classList.remove('fa-chevron-down');
                    icon.classList.add('fa-chevron-right');
                } else {
                    icon.classList.remove('fa-chevron-right');
                    icon.classList.add('fa-chevron-down');
                }
            }
        }
    }

    lockBodyScroll() {
        if (document.body) {
            document.body.style.overflow = 'hidden';
        }
    }

    unlockBodyScroll() {
        if (document.body) {
            document.body.style.overflow = '';
        }
    }

    showIssuesModal(type) {
        const isCritical = type === 'critical';
        if (isCritical) {
            this.selectedCriticalIssuesModal = { page: 0 };
            this.showCriticalIssuesModal = true;
        } else {
            this.selectedWarningIssuesModal = { page: 0 };
            this.showWarningIssuesModal = true;
        }
        this.lockBodyScroll();
        this.updateDisplay();
    }

    closeIssuesModal(type) {
        const isCritical = type === 'critical';
        if (isCritical) {
            this.showCriticalIssuesModal = false;
            this.selectedCriticalIssuesModal = null;
        } else {
            this.showWarningIssuesModal = false;
            this.selectedWarningIssuesModal = null;
        }
        // Only unlock if no other modals are open
        if (!this.showCriticalIssuesModal && !this.showWarningIssuesModal &&
            !this.isRedFlagsModalOpen && !this.isShareDetailsModalOpen &&
            this.selectedGroupModal === null && this.selectedUserModal === null) {
            this.unlockBodyScroll();
        }
        this.updateDisplay();
    }

    changeIssuesPage(type, delta) {
        const isCritical = type === 'critical';
        const selectedModal = isCritical ? this.selectedCriticalIssuesModal : this.selectedWarningIssuesModal;
        if (!selectedModal) return;

        const issues = isCritical ?
            (this.reportData?.folderAnalysis?.summary?.criticalIssues || []) :
            (this.reportData?.folderAnalysis?.summary?.warningIssues || []);
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(issues.length / pageSize));
        let page = selectedModal.page || 0;
        page = Math.min(Math.max(page + delta, 0), totalPages - 1);
        selectedModal.page = page;
        this.updateDisplay();
    }

    showGroupModal(index) {
        this.selectedGroupModal = index;
        this.lockBodyScroll();
        this.updateDisplay();
    }

    closeGroupModal() {
        this.selectedGroupModal = null;
        // Only unlock if no other modals are open
        if (!this.showCriticalIssuesModal && !this.showWarningIssuesModal &&
            !this.isRedFlagsModalOpen && !this.isShareDetailsModalOpen &&
            this.selectedUserModal === null) {
            this.unlockBodyScroll();
        }
        this.updateDisplay();
    }

    showUserModal(index) {
        this.selectedUserModal = index;
        this.lockBodyScroll();
        this.updateDisplay();
    }

    closeUserModal() {
        this.selectedUserModal = null;
        // Only unlock if no other modals are open
        if (!this.showCriticalIssuesModal && !this.showWarningIssuesModal &&
            !this.isRedFlagsModalOpen && !this.isShareDetailsModalOpen &&
            this.selectedGroupModal === null) {
            this.unlockBodyScroll();
        }
        this.updateDisplay();
    }

    renderIssuesModal(type) {
        const isCritical = type === 'critical';
        const issues = isCritical ? (this.reportData?.folderAnalysis?.summary?.criticalIssues || []) :
            (this.reportData?.folderAnalysis?.summary?.warningIssues || []);
        const showModal = isCritical ? this.showCriticalIssuesModal : this.showWarningIssuesModal;
        const selectedModal = isCritical ? this.selectedCriticalIssuesModal : this.selectedWarningIssuesModal;
        const title = isCritical ? 'Critical Security Issues' : 'Warning Issues';
        const icon = isCritical ? 'exclamation-triangle' : 'exclamation-circle';
        const color = isCritical ? '#ef4444' : '#f59e0b';
        const bgColor = isCritical ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)';
        const borderColor = isCritical ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)';

        if (!showModal || !selectedModal) return '';

        // Pagination
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(issues.length / pageSize));
        const currentPage = Math.min(Math.max(selectedModal.page || 0, 0), totalPages - 1);
        const start = currentPage * pageSize;
        const pageItems = issues.slice(start, start + pageSize);

        return `
            <div class="modal-overlay" onclick="fileShareAuditorInstance.closeIssuesModal('${type}')" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem;">
                <div class="modal-content" onclick="event.stopPropagation()" style="background: #1e293b; border: 1px solid ${borderColor}; border-radius: 6px; max-width: 800px; width: 100%; max-height: 70vh; display: flex; flex-direction: column; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
                    <div class="modal-header" style="padding: 0.75rem 1rem; border-bottom: 1px solid ${borderColor}; display: flex; align-items: center; justify-content: space-between; background: ${bgColor}; flex-shrink: 0;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <div style="width: 32px; height: 32px; border-radius: 4px; background: ${color}20; display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-${icon}" style="color: ${color}; font-size: 0.875rem;"></i>
                            </div>
                            <div>
                                <h3 style="color: ${color}; font-size: 0.9375rem; font-weight: 600; margin: 0; line-height: 1.2;">${title}</h3>
                                <p style="color: #94a3b8; font-size: 0.75rem; margin: 0; line-height: 1.2;">${issues.length} ${issues.length === 1 ? 'issue' : 'issues'} total</p>
                            </div>
                        </div>
                        <button onclick="fileShareAuditorInstance.closeIssuesModal('${type}')" style="background: transparent; border: none; color: #94a3b8; font-size: 1.125rem; cursor: pointer; padding: 0.25rem; line-height: 1; transition: color 0.2s;" onmouseover="this.style.color='#e2e8f0'" onmouseout="this.style.color='#94a3b8'">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body" style="padding: 0.75rem; flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden;">
                        <div class="table-container-modern" style="flex: 1; overflow-y: auto; min-height: 0;">
                            <table class="table-compact">
                                <thead style="position: sticky; top: 0; background: #1e293b; z-index: 10;">
                                    <tr>
                                        <th style="width: 30px;"></th>
                                        <th>Issue</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${pageItems.length > 0 ? pageItems.map(issue => `
                                        <tr>
                                            <td style="text-align: center; padding: 0.5rem 0.25rem;">
                                                <i class="fas fa-${isCritical ? 'times-circle' : 'exclamation-triangle'}" style="color: ${color}; font-size: 0.75rem;"></i>
                                            </td>
                                            <td style="color: ${isCritical ? '#f87171' : '#fbbf24'}; word-break: break-word; line-height: 1.4; font-size: 0.8125rem; padding: 0.5rem;">${issue}</td>
                                        </tr>
                                    `).join('') : `
                                        <tr>
                                            <td colspan="2" style="text-align: center; color: #94a3b8; padding: 2rem; font-size: 0.8125rem;">
                                                No ${isCritical ? 'critical' : 'warning'} issues found.
                                            </td>
                                        </tr>
                                    `}
                                </tbody>
                            </table>
                        </div>
                        ${totalPages > 1 ? `
                        <div class="modal-pagination" style="display: flex; align-items: center; justify-content: space-between; margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #334155; flex-shrink: 0;">
                            <button class="btn btn-secondary btn-xs" onclick="fileShareAuditorInstance.changeIssuesPage('${type}', -1)" ${currentPage === 0 ? 'disabled' : ''} style="padding: 0.375rem 0.75rem; font-size: 0.75rem; border-radius: 4px; background: #334155; border: 1px solid #475569; color: #e2e8f0; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#475569'" onmouseout="this.style.background='#334155'" ${currentPage === 0 ? 'style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                                <i class="fas fa-chevron-left" style="font-size: 0.6875rem;"></i> Previous
                            </button>
                            <span class="modal-page-indicator" style="color: #94a3b8; font-size: 0.75rem; font-weight: 500;">Page ${currentPage + 1} of ${totalPages}</span>
                            <button class="btn btn-secondary btn-xs" onclick="fileShareAuditorInstance.changeIssuesPage('${type}', 1)" ${currentPage === totalPages - 1 ? 'disabled' : ''} style="padding: 0.375rem 0.75rem; font-size: 0.75rem; border-radius: 4px; background: #334155; border: 1px solid #475569; color: #e2e8f0; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#475569'" onmouseout="this.style.background='#334155'" ${currentPage === totalPages - 1 ? 'style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                                Next <i class="fas fa-chevron-right" style="font-size: 0.6875rem;"></i>
                            </button>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    async deleteReport() {
        if (!this.reportId) {
            this.showMessage('No report ID available', 'error');
            return;
        }

        if (!confirm('Are you sure you want to delete this report?')) {
            return;
        }

        try {
            const response = await fetch(`/api/file-share-reports/delete?id=${this.reportId}`, {
                method: 'GET'
            });

            if (!response.ok) {
                throw new Error('Failed to delete report');
            }

            this.showMessage('Report deleted successfully!', 'success');

            // Navigate back to list page
            setTimeout(() => {
                if (window.appInstance) {
                    window.appInstance.navigateTo('file-share-auditor-list');
                } else {
                    window.location.hash = '#file-share-auditor-list';
                    window.location.reload();
                }
            }, 1000);
        } catch (error) {
            console.error('Error deleting report:', error);
            this.showMessage('Error deleting report: ' + error.message, 'error');
        }
    }
}





