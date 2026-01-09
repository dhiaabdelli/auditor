export class PageNavbar {
    constructor() {
        this.currentLanguage = localStorage.getItem('language') || 'en';
    }

    /**
     * Get page navbar config for a given page
     */
    getPageNavbarConfig(pageId) {
        // Define page navbar items for different pages
        const configs = {
            'veeam-auditor-list': {
                items: [
                    { id: 'refresh', label: 'Refresh', icon: 'fa-sync-alt', action: 'loadReports' },
                    { id: 'new-audit', label: 'New Audit', icon: 'fa-plus', action: 'showCreateReportModal' }
                ]
            },
            'windows-server-auditor-list': {
                items: [
                    { id: 'refresh', label: 'Refresh', icon: 'fa-sync-alt', action: 'loadReports' },
                    { id: 'new-audit', label: 'New Audit', icon: 'fa-plus', action: 'showCreateReportModal' }
                ]
            },
            'file-share-auditor-list': {
                items: [
                    { id: 'refresh', label: 'Refresh', icon: 'fa-sync-alt', action: 'loadReports' },
                    { id: 'new-audit', label: 'New Audit', icon: 'fa-plus', action: 'showCreateReportModal' }
                ]
            },
            'hyperv-auditor-list': {
                items: [
                    { id: 'refresh', label: 'Refresh', icon: 'fa-sync-alt', action: 'loadReports' },
                    { id: 'new-report', label: 'New Report', icon: 'fa-plus', action: 'showCreateReportModal' }
                ]
            },
            'veeam-auditor': {
                showTitle: true,
                titleIcon: 'fa-cloud',
                items: [
                    { id: 'script', label: 'Script', icon: 'fa-code', action: 'generateScript', actionParams: { encrypt: true, obfuscate: true }, color: 'blue' },
                    { id: 'plain-script', label: 'Plain Script', icon: 'fa-file-alt', action: 'generateScript', actionParams: { encrypt: false, obfuscate: false }, color: 'gray' },
                    { id: 'import', label: 'Import', icon: 'fa-upload', action: 'importReport', color: 'green' }
                ]
            },
            'windows-server-auditor': {
                showTitle: true,
                titleIcon: 'fa-server',
                items: [
                    { id: 'script', label: 'Script', icon: 'fa-code', action: 'generateScript', actionParams: { encrypt: true, obfuscate: true }, color: 'blue' },
                    { id: 'plain-script', label: 'Plain Script', icon: 'fa-file-alt', action: 'generateScript', actionParams: { encrypt: false, obfuscate: false }, color: 'gray' },
                    { id: 'import', label: 'Import', icon: 'fa-upload', action: 'importReport', color: 'green' }
                ]
            },
            'file-share-auditor': {
                showTitle: true,
                titleIcon: 'fa-folder-open',
                items: [
                    { id: 'script', label: 'Script', icon: 'fa-code', action: 'generateScript', actionParams: { encrypt: true, obfuscate: true }, color: 'blue' },
                    { id: 'plain-script', label: 'Plain Script', icon: 'fa-file-alt', action: 'generateScript', actionParams: { encrypt: false, obfuscate: false }, color: 'gray' },
                    { id: 'import', label: 'Import', icon: 'fa-upload', action: 'showImportDialog', color: 'green' }
                ]
            },
            'hyperv-auditor': {
                showTitle: true,
                titleIcon: 'fa-cube',
                items: [
                    { id: 'script', label: 'Script', icon: 'fa-code', action: 'generateScript', actionParams: { encrypt: true, obfuscate: true }, color: 'blue' },
                    { id: 'plain-script', label: 'Plain Script', icon: 'fa-file-alt', action: 'generateScript', actionParams: { encrypt: false, obfuscate: false }, color: 'gray' },
                    { id: 'import', label: 'Import', icon: 'fa-upload', action: 'importReport', color: 'green' }
                ]
            },
            'veeam-auditor-details': {
                showTitle: true,
                titleIcon: 'fa-cloud',
                items: [
                    { id: 'script', label: 'Script', icon: 'fa-code', action: 'generateScript', actionParams: { encrypt: true, obfuscate: true }, color: 'blue' },
                    { id: 'plain-script', label: 'Plain Script', icon: 'fa-file-alt', action: 'generateScript', actionParams: { encrypt: false, obfuscate: false }, color: 'gray' },
                    { id: 'import', label: 'Import', icon: 'fa-upload', action: 'importReport', color: 'green' },
                    { id: 'delete', label: 'Delete', icon: 'fa-trash', action: 'deleteReport', color: 'red' }
                ]
            },
            'windows-server-auditor-details': {
                showTitle: true,
                titleIcon: 'fa-server',
                items: [
                    { id: 'script', label: 'Script', icon: 'fa-code', action: 'generateScript', actionParams: { encrypt: true, obfuscate: true }, color: 'blue' },
                    { id: 'plain-script', label: 'Plain Script', icon: 'fa-file-alt', action: 'generateScript', actionParams: { encrypt: false, obfuscate: false }, color: 'gray' },
                    { id: 'import', label: 'Import', icon: 'fa-upload', action: 'importReport', color: 'green' },
                    { id: 'delete', label: 'Delete', icon: 'fa-trash', action: 'deleteReport', color: 'red' }
                ]
            },
            'file-share-auditor-details': {
                showTitle: true,
                titleIcon: 'fa-folder-open',
                items: [
                    { id: 'script', label: 'Script', icon: 'fa-code', action: 'generateScript', actionParams: { encrypt: true, obfuscate: true }, color: 'blue' },
                    { id: 'plain-script', label: 'Plain Script', icon: 'fa-file-alt', action: 'generateScript', actionParams: { encrypt: false, obfuscate: false }, color: 'gray' },
                    { id: 'import', label: 'Import', icon: 'fa-upload', action: 'showImportDialog', color: 'green' },
                    { id: 'delete', label: 'Delete', icon: 'fa-trash', action: 'deleteReport', color: 'red' }
                ]
            },
            'hyperv-auditor-details': {
                showTitle: true,
                titleIcon: 'fa-cube',
                items: [
                    { id: 'script', label: 'Script', icon: 'fa-code', action: 'generateScript', actionParams: { encrypt: true, obfuscate: true }, color: 'blue' },
                    { id: 'plain-script', label: 'Plain Script', icon: 'fa-file-alt', action: 'generateScript', actionParams: { encrypt: false, obfuscate: false }, color: 'gray' },
                    { id: 'import', label: 'Import', icon: 'fa-upload', action: 'importReport', color: 'green' },
                    { id: 'delete', label: 'Delete', icon: 'fa-trash', action: 'deleteReport', color: 'red' }
                ]
            },
            'ping-tracer': {
                showTitle: true,
                titleIcon: 'fa-chart-line',
                items: []
            },
            'ip-scanner': {
                showTitle: true,
                titleIcon: 'fa-search-location',
                items: []
            }
        };

        return configs[pageId] || null;
    }

    /**
     * Get title for detail pages
     */
    getTitle(pageId) {
        // For ping-tracer and ip-scanner, return the title directly
        if (pageId === 'ping-tracer') {
            return 'Ping Tracer';
        }
        if (pageId === 'ip-scanner') {
            return 'IP Scanner';
        }
        
        let pageInstance = null;
        
        // Normalize pageId (handle both with and without -details)
        const normalizedPageId = pageId.replace('-details', '');
        
        if ((pageId === 'veeam-auditor' || pageId === 'veeam-auditor-details') && window.veeamAuditorInstance) {
            pageInstance = window.veeamAuditorInstance;
        } else if ((pageId === 'windows-server-auditor' || pageId === 'windows-server-auditor-details') && window.windowsServerAuditorInstance) {
            pageInstance = window.windowsServerAuditorInstance;
        } else if ((pageId === 'file-share-auditor' || pageId === 'file-share-auditor-details') && window.fileShareAuditorInstance) {
            pageInstance = window.fileShareAuditorInstance;
        } else if ((pageId === 'hyperv-auditor' || pageId === 'hyperv-auditor-details') && window.hyperVAuditorInstance) {
            pageInstance = window.hyperVAuditorInstance;
        }
        
        if (pageInstance && pageInstance.reportData) {
            const data = pageInstance.reportData;
            if (normalizedPageId === 'veeam-auditor') {
                return data.serverName || 'Veeam Backup & Replication';
            } else if (normalizedPageId === 'windows-server-auditor') {
                return data.systemInfo?.computerName || data.serverName || 'Windows Server';
            } else if (normalizedPageId === 'file-share-auditor') {
                return data.serverName || data.name || 'File Share';
            } else if (normalizedPageId === 'hyperv-auditor') {
                return data.serverName || data.name || data.selectedReport?.name || 'Hyper-V';
            }
        }
        
        // For Hyper-V, try selectedReport if reportData is not available
        if (normalizedPageId === 'hyperv-auditor' && pageInstance && pageInstance.selectedReport) {
            return pageInstance.selectedReport.name || 'Hyper-V';
        }
        
        // Default titles
        const defaultTitles = {
            'veeam-auditor': 'Veeam Backup & Replication',
            'windows-server-auditor': 'Windows Server',
            'file-share-auditor': 'File Share',
            'hyperv-auditor': 'Hyper-V'
        };
        
        return defaultTitles[normalizedPageId] || '';
    }

    /**
     * Render the page navbar for a given page
     */
    render(pageId) {
        const config = this.getPageNavbarConfig(pageId);
        
        if (!config) {
            return '';
        }

        const title = config.showTitle ? this.getTitle(pageId) : '';
        const titleIcon = config.titleIcon || '';
        const showBackButton = config.showTitle && pageId !== 'ping-tracer' && pageId !== 'ip-scanner'; // Show back button only on detail pages (pages with title), but not for ping-tracer or ip-scanner

        // Check if this is an auditor detail page that needs sidebar toggle
        const auditorDetailPages = ['windows-server-auditor', 'windows-server-auditor-details', 'linux-server-auditor', 'linux-server-auditor-details', 'file-share-auditor', 'file-share-auditor-details', 'veeam-auditor', 'veeam-auditor-details'];
        const needsSidebarToggle = auditorDetailPages.includes(pageId);
        
        // Don't render page navbar for ping-tracer and ip-scanner (they use modern-header toggle)
        if (pageId === 'ping-tracer' || pageId === 'ip-scanner') {
            return '';
        }

        return `
            <div class="page-navbar" data-page="${pageId}">
                <div class="page-navbar-container">
                    <div class="page-navbar-left-group">
                        ${needsSidebarToggle ? `
                            <button class="page-navbar-sidebar-toggle" id="page-navbar-sidebar-toggle" onclick="pageNavbarInstance.toggleAuditorSidebar()" title="Toggle Navigation">
                                <i class="fas fa-bars"></i>
                            </button>
                        ` : ''}
                        ${showBackButton ? `
                            <div class="page-navbar-left">
                                <button class="page-navbar-back" onclick="pageNavbarInstance.goBack()" title="Go back">
                                    <i class="fas fa-arrow-left"></i>
                                </button>
                                ${config.showTitle ? `
                                    <div class="page-navbar-title">
                                        ${titleIcon ? `<i class="fas ${titleIcon}"></i>` : ''}
                                        <span>${title || 'Loading...'}</span>
                                    </div>
                                ` : ''}
                            </div>
                        ` : config.showTitle ? `
                            <div class="page-navbar-title">
                                ${titleIcon ? `<i class="fas ${titleIcon}"></i>` : ''}
                                <span>${title || (pageId === 'ping-tracer' ? 'Ping Tracer' : pageId === 'ip-scanner' ? 'IP Scanner' : '')}</span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="page-navbar-items" id="page-navbar-items-container">
                        ${config.items.map((item, index) => {
                            const actionParams = item.actionParams ? JSON.stringify(item.actionParams) : null;
                            const colorClass = item.color ? `page-navbar-item-${item.color}` : '';
                            // For data attribute, escape quotes properly
                            const actionParamsEscaped = actionParams ? actionParams.replace(/"/g, '&quot;').replace(/'/g, '&#39;') : '';
                            return `
                            <button 
                                class="page-navbar-item ${colorClass}" 
                                data-action="${item.action}"
                                data-action-params="${actionParamsEscaped}"
                                data-item-index="${index}"
                            >
                                <i class="fas ${item.icon}"></i>
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
     * Toggle auditor sidebar (for mobile)
     */
    toggleAuditorSidebar() {
        // Find the appropriate auditor instance based on current page
        const pageId = document.querySelector('.page-navbar')?.getAttribute('data-page') || '';
        let pageInstance = null;
        
        if (pageId === 'ping-tracer' && window.pingTracerInstance) {
            pageInstance = window.pingTracerInstance;
            if (typeof pageInstance.toggleConfigSidebar === 'function') {
                pageInstance.toggleConfigSidebar();
            }
            return;
        }
        
        if (pageId === 'ip-scanner' && window.ipScannerInstance) {
            pageInstance = window.ipScannerInstance;
            if (typeof pageInstance.toggleConfigSidebar === 'function') {
                pageInstance.toggleConfigSidebar();
            }
            return;
        }
        
        if ((pageId === 'veeam-auditor' || pageId === 'veeam-auditor-details') && window.veeamAuditorInstance) {
            pageInstance = window.veeamAuditorInstance;
        } else if ((pageId === 'windows-server-auditor' || pageId === 'windows-server-auditor-details') && window.windowsServerAuditorInstance) {
            pageInstance = window.windowsServerAuditorInstance;
        } else if ((pageId === 'file-share-auditor' || pageId === 'file-share-auditor-details') && window.fileShareAuditorInstance) {
            pageInstance = window.fileShareAuditorInstance;
        } else if ((pageId === 'linux-server-auditor' || pageId === 'linux-server-auditor-details') && window.linuxServerAuditorInstance) {
            pageInstance = window.linuxServerAuditorInstance;
        }
        
        if (pageInstance && typeof pageInstance.toggleSidebar === 'function') {
            pageInstance.toggleSidebar();
        }
    }

    /**
     * Attach event listeners to navbar buttons after rendering
     */
    attachEventListeners() {
        // Use event delegation on the container
        const container = document.getElementById('page-navbar-items-container');
        if (container) {
            // Remove old listeners by cloning
            const newContainer = container.cloneNode(true);
            container.parentNode.replaceChild(newContainer, container);
            
            // Attach click event listener using delegation
            newContainer.addEventListener('click', (e) => {
                const button = e.target.closest('.page-navbar-item');
                if (!button) return;
                
                const action = button.getAttribute('data-action');
                const actionParamsStr = button.getAttribute('data-action-params');
                let actionParams = null;
                
                if (actionParamsStr) {
                    try {
                        // Unescape HTML entities and parse JSON
                        const unescaped = actionParamsStr.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
                        actionParams = JSON.parse(unescaped);
                    } catch (e) {
                        console.error('Failed to parse action params:', e, actionParamsStr);
                    }
                }
                
                if (action) {
                    this.handleAction(action, actionParams);
                }
            });
        }
    }

    /**
     * Go back to previous page
     */
    goBack() {
        // Check if there's history to go back to
        if (window.history.length > 1) {
            window.history.back();
        } else {
            // If no history, navigate to the list page based on current page
            const pageId = window.location.hash.split('?')[0].replace('#', '');
            const normalizedPageId = pageId.replace('-details', '').replace('-auditor', '');
            
            // Navigate to the corresponding list page
            if (normalizedPageId === 'veeam') {
                window.location.hash = '#veeam-auditor-list';
            } else if (normalizedPageId === 'windows-server') {
                window.location.hash = '#windows-server-auditor-list';
            } else if (normalizedPageId === 'file-share') {
                window.location.hash = '#file-share-auditor-list';
            } else if (normalizedPageId === 'hyperv') {
                window.location.hash = '#hyperv-auditor-list';
            } else {
                // Default fallback
                window.location.hash = '#applications';
            }
        }
    }

    /**
     * Update the title in the navbar
     */
    updateTitle() {
        const pageId = window.location.hash.split('?')[0].replace('#', '');
        const config = this.getPageNavbarConfig(pageId);
        
        if (!config || !config.showTitle) {
            return;
        }
        
        const titleElement = document.querySelector('.page-navbar-title span');
        if (titleElement) {
            const newTitle = this.getTitle(pageId);
            if (newTitle) {
                titleElement.textContent = newTitle;
            } else {
                // Keep default title if no data available yet
                const normalizedPageId = pageId.replace('-details', '');
                const defaultTitles = {
                    'veeam-auditor': 'Veeam Backup & Replication',
                    'windows-server-auditor': 'Windows Server',
                    'file-share-auditor': 'File Share',
                    'hyperv-auditor': 'Hyper-V'
                };
                titleElement.textContent = defaultTitles[normalizedPageId] || 'Loading...';
            }
        }
    }

    /**
     * Handle action button clicks
     */
    handleAction(action, actionParams = null) {
        // Find the current page instance and call the action
        const pageId = window.location.hash.split('?')[0].replace('#', '');
        
        // Try to find the page instance
        let pageInstance = null;
        
        if (pageId === 'veeam-auditor-list' && window.veeamAuditorListInstance) {
            pageInstance = window.veeamAuditorListInstance;
        } else if (pageId === 'windows-server-auditor-list' && window.windowsServerAuditorListInstance) {
            pageInstance = window.windowsServerAuditorListInstance;
        } else if (pageId === 'file-share-auditor-list' && window.fileShareAuditorListInstance) {
            pageInstance = window.fileShareAuditorListInstance;
        } else if (pageId === 'hyperv-auditor-list' && window.hyperVAuditorListInstance) {
            pageInstance = window.hyperVAuditorListInstance;
        } else if ((pageId === 'veeam-auditor' || pageId === 'veeam-auditor-details') && window.veeamAuditorInstance) {
            pageInstance = window.veeamAuditorInstance;
        } else if ((pageId === 'windows-server-auditor' || pageId === 'windows-server-auditor-details') && window.windowsServerAuditorInstance) {
            pageInstance = window.windowsServerAuditorInstance;
        } else if ((pageId === 'file-share-auditor' || pageId === 'file-share-auditor-details') && window.fileShareAuditorInstance) {
            pageInstance = window.fileShareAuditorInstance;
        } else if ((pageId === 'hyperv-auditor' || pageId === 'hyperv-auditor-details') && window.hyperVAuditorInstance) {
            pageInstance = window.hyperVAuditorInstance;
        }
        
        // Handle refresh action with animation
        if (action === 'loadReports' || action === 'loadReport') {
            const refreshButton = document.querySelector(`.page-navbar-item[data-action="${action}"]`);
            if (refreshButton) {
                refreshButton.classList.add('refreshing');
                refreshButton.disabled = true;
            }
            
            const executeRefresh = async () => {
                try {
                    if (pageInstance && typeof pageInstance[action] === 'function') {
                        if (actionParams) {
                            await pageInstance[action](actionParams);
                        } else {
                            await pageInstance[action]();
                        }
                    }
                } finally {
                    if (refreshButton) {
                        refreshButton.classList.remove('refreshing');
                        refreshButton.disabled = false;
                    }
                }
            };
            
            executeRefresh();
            return;
        }
        
        if (pageInstance && typeof pageInstance[action] === 'function') {
            if (actionParams) {
                pageInstance[action](actionParams);
            } else {
                pageInstance[action]();
            }
        }
    }
}

// Global instance
window.pageNavbarInstance = null;

