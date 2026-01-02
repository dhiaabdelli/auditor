import { api } from '../utils/api.js';

export class Sidebar {
    constructor() {
        this.isOpen = false;
        this.content = '';
        this.title = '';
        this.icon = '';
        this.onCloseCallback = null;
        this.updateInterval = null;
    }

    /**
     * Open the sidebar with custom content
     * @param {Object} options - Sidebar configuration
     * @param {string} options.title - Sidebar title
     * @param {string} options.icon - Font Awesome icon class (optional)
     * @param {string} options.content - HTML content for the sidebar
     * @param {Function} options.onClose - Callback when sidebar is closed
     */
    open(options = {}) {
        this.title = options.title || '';
        this.icon = options.icon || '';
        this.content = options.content || '';
        this.onCloseCallback = options.onClose || null;
        this.isOpen = true;
        this.render();
        this.updateMainContentMargin();
    }

    /**
     * Close the sidebar
     */
    close() {
        this.isOpen = false;
        this.render();
        this.updateMainContentMargin();
        
        if (this.onCloseCallback) {
            this.onCloseCallback();
            this.onCloseCallback = null;
        }
    }

    /**
     * Toggle sidebar open/close
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Update sidebar content without closing
     * @param {Object} options - Sidebar configuration
     */
    update(options = {}) {
        if (options.title !== undefined) {
            this.title = options.title;
        }
        if (options.icon !== undefined) {
            this.icon = options.icon;
        }
        if (options.content !== undefined) {
            this.content = options.content;
        }
        if (options.onClose !== undefined) {
            this.onCloseCallback = options.onClose;
        }
        this.render();
    }

    /**
     * Render the sidebar
     */
    render() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        
        if (!sidebar) return;

        if (!this.isOpen) {
            sidebar.innerHTML = '';
            sidebar.classList.remove('sidebar-open');
            if (overlay) {
                overlay.classList.remove('show');
            }
            return;
        }

        sidebar.classList.add('sidebar-open');
        if (overlay) {
            overlay.classList.add('show');
        }
        
        sidebar.innerHTML = `
            <div class="sidebar-header">
                <h3 class="sidebar-title">
                    ${this.icon ? `<i class="fas ${this.icon} sidebar-title-icon"></i>` : ''}
                    <span>${this.escapeHtml(this.title)}</span>
                </h3>
                <button class="sidebar-close-btn" onclick="sidebarInstance.close()" title="Close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="sidebar-content">
                ${this.content}
            </div>
        `;
    }

    /**
     * Update main content margin to accommodate sidebar
     */
    updateMainContentMargin() {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            if (this.isOpen) {
                mainContent.classList.add('with-sidebar');
            } else {
                mainContent.classList.remove('with-sidebar');
            }
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Mount the sidebar (initialize)
     */
    mount() {
        // Render empty sidebar initially
        this.render();
        
        // Close sidebar when clicking outside (on overlay)
        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('sidebar');
            const sidebarOverlay = document.getElementById('sidebar-overlay');
            
            if (this.isOpen && sidebarOverlay && e.target === sidebarOverlay) {
                this.close();
            }
        });

        // Close sidebar on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }
}

// Global instance
window.sidebarInstance = null;

