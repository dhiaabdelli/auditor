import { Header } from './components/Header.js';
import { Sidebar } from './components/Sidebar.js';
import { Footer } from './components/Footer.js';
import { Modal } from './components/Modal.js';
import { api } from './utils/api.js';
import { logger } from './utils/logger.js';
import { LoginPage } from './pages/Login.js';
import { AppsPage } from './pages/Apps.js';
// Virtualization
import { HyperVPage } from './pages/HyperV.js';
import { HyperVAuditorPage } from './pages/HyperVAuditor.js';
import { HyperVAuditorListPage } from './pages/HyperVAuditorList.js';
import { WindowsServerAuditorPage } from './pages/WindowsServerAuditor.js';
import { WindowsServerAuditorListPage } from './pages/WindowsServerAuditorList.js';
import { LinuxServerAuditorListPage } from './pages/LinuxServerAuditorList.js';
import { LinuxServerAuditorPage } from './pages/LinuxServerAuditor.js';
import { FileShareAuditorPage } from './pages/FileShareAuditor.js';
import { FileShareAuditorListPage } from './pages/FileShareAuditorList.js';
import { VeeamAuditorPage } from './pages/VeeamAuditor.js';
import { VeeamAuditorListPage } from './pages/VeeamAuditorList.js';
// Script Tools
import { DocumentationPage } from './pages/Documentation.js';
import { TodoPage } from './pages/Todo.js';
import { InfrastructureDiagramPage } from './pages/InfrastructureDiagram.js';
import { SSHClientPage } from './pages/SSHClient.js';
import { SFTPClientPage } from './pages/SFTPClient.js';
import { TelnetClientPage } from './pages/TelnetClient.js';
import { WinRMClientPage } from './pages/WinRMClient.js';
import { FTPClientPage } from './pages/FTPClient.js';
import { DatabaseClientPage } from './pages/DatabaseClient.js';
import { IPScannerPage } from './pages/IPScanner.js';
import { PingTracerPage } from './pages/PingTracer.js';
import { DomainLookupPage } from './pages/DomainLookup.js';
import { PacketAnalyzerPage } from './pages/PacketAnalyzerPage.js';
import { SpeedtestPage } from './pages/Speedtest.js';
import { ReportTemplatesPage } from './pages/ReportTemplates.js';
import { InfrastructureInventoryPage } from './pages/InfrastructureInventory.js';
import { SubnetCalculatorPage } from './pages/SubnetCalculator.js';
import { CryptoToolsPage } from './pages/CryptoTools.js';
import { WebToolsPage } from './pages/WebTools.js';
import { DevelopmentToolsPage } from './pages/DevelopmentTools.js';
import { AutomationPage } from './pages/AutomationPage.js';
import { HealthMonitorPage } from './pages/HealthMonitor.js';
import { ActivityLogPage } from './pages/ActivityLog.js';
import { SettingsPage } from './pages/Settings.js';

class App {
    constructor() {
        // Track page load time for race condition detection
        window.pageLoadTime = Date.now();
        
        // Get page from URL hash or default to apps
        this.urlParams = new URLSearchParams();
        this.authenticated = false;
        this.showingLogin = false; // Prevent multiple simultaneous showLogin calls
        this.backgroundValidationRunning = false; // Prevent multiple background validations
        this.visibilityListenerSetup = false; // Prevent multiple visibility listeners
        this.skipTokenValidation = false; // Flag to skip token validation (e.g., right after login)
        // Don't set currentPage yet - wait until we check authentication
        this.currentPage = 'apps'; // Default
        
        // IMMEDIATELY validate token on construction (before any rendering)
        // This catches expired tokens on page reload
        const tokenValid = this.validateTokenSync();
        if (!tokenValid) {
            // Token is invalid/expired - clear auth immediately
            this.setAuthenticated(false);
        }
        
        this.init();
    }
    
    /**
     * Synchronous token validation for immediate check on page load
     * This runs before any async operations
     * NOTE: This only does basic format checking - full validation happens in async validateToken()
     */
    validateTokenSync() {
        logger.debug('[Token Validation] Starting synchronous validation in constructor...');
        // Check token immediately without async operations
        let token = localStorage.getItem('jwt_token');
        
        if (!token || token.length === 0) {
            logger.debug('[Token Validation] No token found in localStorage');
            return false;
        }
        
        logger.debug('[Token Validation] Token found');
        
        // Extract JWT token (handles cases with extra characters)
        const jwtToken = this.extractJWTToken(token);
        
        if (jwtToken) {
            logger.debug('[Token Validation] Extracted JWT token');
            // Basic format check - full validation will happen in async validateToken()
            try {
                const payload = JSON.parse(atob(jwtToken.split('.')[1]));
                const exp = payload.exp * 1000; // Convert to milliseconds
                const now = Date.now();
                const timeUntilExpiry = exp - now;
                
                logger.debug('[Token Validation] JWT token detected');
                logger.debug('[Token Validation] Token expires at:', new Date(exp).toISOString());
                logger.debug('[Token Validation] Time until expiry:', Math.round(timeUntilExpiry / 1000), 'seconds');
                
                // Check if expired (with 1 minute buffer for clock skew)
                if (exp < (now + 60000)) {
                    logger.debug('[Token Validation] Token expired - will validate with API');
                    return false;
                }
                
                logger.debug('[Token Validation] Token format valid');
                return true;
            } catch (e) {
                logger.error('[Token Validation] Invalid token format');
                return false;
            }
        }
        
        // Legacy API key - format check only, full validation in async
        logger.debug('[Token Validation] Legacy API key found - format valid');
        return true;
    }
    
    /**
     * Extracts JWT token from string, handling cases where token might have extra characters
     */
    extractJWTToken(token) {
        if (!token) return null;
        
        // Trim whitespace
        token = token.trim();
        
        // Try to find JWT token (starts with "eyJ")
        const eyJIndex = token.indexOf('eyJ');
        if (eyJIndex >= 0) {
            // Extract JWT token starting from "eyJ"
            const extracted = token.substring(eyJIndex);
            // JWT tokens have 3 parts separated by dots
            const parts = extracted.split('.');
            if (parts.length >= 3) {
                // Take first 3 parts (header.payload.signature)
                return parts.slice(0, 3).join('.');
            }
        }
        
        // If no "eyJ" found, check if it's already a valid JWT format (3 parts)
        const parts = token.split('.');
        if (parts.length === 3) {
            return token;
        }
        
        return null;
    }
    
    /**
     * Validates token with backend API
     */
    async validateTokenWithAPI(token) {
        try {
            logger.debug('[Token Validation] Validating token with backend API...');
            
            // Create timeout controller
            let timeoutId;
            const controller = new AbortController();
            const timeout = 5000; // 5 second timeout
            
            if (AbortSignal.timeout) {
                // Use native timeout if available
                var response = await fetch('/api/auth/validate', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    signal: AbortSignal.timeout(timeout)
                });
            } else {
                // Fallback for older browsers
                timeoutId = setTimeout(() => controller.abort(), timeout);
                var response = await fetch('/api/auth/validate', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
            }
            
            if (response.status === 200 || response.status === 401) {
                const isValid = response.status === 200;
                logger.debug('[Token Validation] Backend validation result:', isValid ? 'VALID' : 'INVALID');
                return isValid;
            }
            
            // If we get here, something unexpected happened
            logger.warn('[Token Validation] Unexpected response status:', response.status);
            // On unexpected status, assume valid to prevent false logout (could be server issue)
            return true;
        } catch (error) {
            // Network errors or timeouts - don't treat as auth failure
            if (error.name === 'AbortError' || error.name === 'TypeError' || 
                error.message?.includes('Failed to fetch') || 
                error.message?.includes('NetworkError') ||
                error.message?.includes('Network request failed') ||
                error.message?.includes('ERR_')) {
                logger.warn('[Token Validation] Network error during validation - assuming token is valid to prevent false logout');
                // Return true to prevent false logout on network errors
                // The token will be validated again on the next request
                return true;
            }
            
            // Other errors - log but assume valid to prevent false logout
            logger.warn('[Token Validation] Error during validation - assuming valid to prevent false logout:', error.message);
            return true; // Changed from false to true to prevent false logout
        }
    }
    
    /**
     * Validates the JWT token and returns true if valid, false otherwise
     * Also clears authentication if token is expired/invalid
     * This function validates the token FIRST, then checks the authenticated flag
     * NOW USES BACKEND API VALIDATION
     */
    async validateToken() {
        console.log('[Token Validation] validateToken() called');
        logger.debug('[Token Validation] validateToken() called');
        // First, check if token exists
        let token = localStorage.getItem('jwt_token');
        console.log('[Token Validation] Token exists:', !!token, 'Length:', token ? token.length : 0);
        
        // No token at all - clear auth and return false
        if (!token || token.length === 0) {
            console.log('[Token Validation] No token found - clearing authentication');
            logger.debug('[Token Validation] No token found - clearing authentication');
            this.setAuthenticated(false);
            return false;
        }
        
        console.log('[Token Validation] Token found');
        logger.debug('[Token Validation] Token found');
        
        // Extract JWT token (handles cases with extra characters like "eeyJ...")
        const jwtToken = this.extractJWTToken(token);
        console.log('[Token Validation] Extracted JWT token:', !!jwtToken);
        
        if (jwtToken) {
            console.log('[Token Validation] JWT token detected, validating with backend API...');
            logger.debug('[Token Validation] Extracted JWT token');
            
            // Validate with backend API
            const isValid = await this.validateTokenWithAPI(jwtToken);
            console.log('[Token Validation] API validation result:', isValid);
            
            if (!isValid) {
                console.log('[Token Validation] Token validation failed - clearing authentication');
                logger.debug('[Token Validation] Token validation failed - clearing authentication');
                this.setAuthenticated(false);
                return false;
            }
            
            // Update stored token to clean version if it was modified
            if (jwtToken !== token) {
                console.log('[Token Validation] Cleaning token in localStorage...');
                logger.debug('[Token Validation] Cleaning token in localStorage...');
                localStorage.setItem('jwt_token', jwtToken);
            }
            
            console.log('[Token Validation] Token is valid - setting authenticated flag');
            logger.debug('[Token Validation] Token is valid - setting authenticated flag');
            // Token is valid - ensure authenticated flag is set
            return true;
        }
        
        // Legacy API key - validate with backend
        console.log('[Token Validation] Legacy API key detected - validating with backend...');
        logger.debug('[Token Validation] Legacy API key detected - validating with backend...');
        const isValid = await this.validateTokenWithAPI(token);
        console.log('[Token Validation] Legacy API key validation result:', isValid);
        
        if (!isValid) {
            console.log('[Token Validation] Legacy API key validation failed - clearing authentication');
            logger.debug('[Token Validation] Legacy API key validation failed - clearing authentication');
            this.setAuthenticated(false);
            return false;
        }
        
        console.log('[Token Validation] Legacy API key is valid - setting authenticated flag');
        logger.debug('[Token Validation] Legacy API key is valid - setting authenticated flag');
        return true;
    }
    
    /**
     * Checks if user is authenticated (wrapper for validateToken)
     * NOTE: This is now async, but we keep it for backward compatibility
     * For synchronous checks, use validateTokenSync()
     */
    async isAuthenticated() {
        return await this.validateToken();
    }
    
    setAuthenticated(value) {
        this.authenticated = value;
        if (!value) {
            localStorage.removeItem('jwt_token');
            if (window.api) {
                window.api.apiKey = null;
            }
        }
    }

    getPageFromURL() {
        // If not authenticated, always return 'login'
        if (!this.authenticated) {
            return 'login';
        }
        
        const hash = window.location.hash.slice(1);
        const [page, queryString] = hash.split('?');
        const validPages = [
            'apps',
            // Virtualization
            'hyperv', 'vmware-vsphere', 'vmware-esxi', 'kvm', 'proxmox', 'xen', 'virtualbox',
            // Auditor
            'hyperv-auditor', 'hyperv-auditor-list', 'hyperv-auditor-details', 'esxi-auditor', 'vsphere-auditor', 'windows-auditor', 'windows-server-auditor-list', 'windows-server-auditor-details', 'file-share-auditor', 'file-share-auditor-list', 'file-share-auditor-details', 'veeam-auditor-list', 'veeam-auditor-details', 'active-directory-auditor',
            // Script Tools
            'documentation', 'todo',
            // Diagram Tools
            'infrastructure-diagram',
            // Automation
            'automation',
            // Remote
            'ssh-client', 'sftp-client', 'ftp-client', 'powershell-remote', 'rdp-client', 'telnet-client', 'database-client',
            // Network Tools
            'ip-scanner', 'ping-tracer', 'domain-lookup', 'packet-analyzer', 'speedtest',
            // Reports
            'reports',
            // Infrastructure Inventory
            'infrastructure-inventory',
            // Tools
            'subnet-calculator',
            // Crypto
            'crypto-tools',
            // Web Tools
            'web-tools',
            // Development Tools
            'development-tools',
            // Health Monitor
            'health-monitor'
        ];
        
        // Check if page matches exactly
        if (validPages.includes(page)) {
            this.urlParams = new URLSearchParams(queryString || '');
            return page;
        }
        
        // Check for sub-routes (e.g., automation/workflow/...)
        if (page.startsWith('automation/')) {
            this.urlParams = new URLSearchParams(queryString || '');
            return 'automation';
        }
        
        // If no hash or invalid page, default to apps
        // But check if we're authenticated first
        if (this.isAuthenticated()) {
            return 'apps';
        }
        return 'apps';
    }

    async init() {
        logger.debug('[App Init] Starting initialization...');
        
        // First, load token into API utility
        window.api = api;
        logger.debug('[App Init] Step 1: Loading API key into utility...');
        await api.loadAPIKey(true);
        
        // Check if we have a token in localStorage
        const token = localStorage.getItem('jwt_token');
        if (!token || token.length === 0) {
            logger.debug('[App Init] No token found - showing login');
            this.authenticated = false;
            this.setAuthenticated(false);
            await this.showLogin();
            return;
        }
        
        // Check token format synchronously first
        logger.debug('[App Init] Step 2: Checking token format...');
        const tokenValidSync = this.validateTokenSync();
        if (!tokenValidSync) {
            logger.debug('[App Init] Token format invalid or expired - showing login');
            this.authenticated = false;
            this.setAuthenticated(false);
            await this.showLogin();
            return;
        }
        
        // If we have a token and it looks valid, set authenticated immediately
        // We'll validate with API in the background, but don't block on it
        logger.debug('[App Init] Token format valid - setting authenticated flag');
        this.authenticated = true;
        this.setAuthenticated(true);
        
        // Validate with API in background (non-blocking) - but only once
        // DISABLED: This was causing infinite loops. Token validation happens on-demand instead.
        // if (!this.backgroundValidationRunning) {
        //     this.backgroundValidationRunning = true;
        //     logger.debug('[App Init] Step 3: Validating token with backend API (background)...');
        //     setTimeout(() => {
        //         this.validateToken().then(isValid => {
        //             this.backgroundValidationRunning = false;
        //             if (!isValid && this.authenticated) {
        //                 logger.debug('[App Init] Background validation failed - but not redirecting to avoid loop');
        //                 // Don't redirect here to avoid infinite loops
        //             } else {
        //                 logger.debug('[App Init] Background validation passed');
        //             }
        //         }).catch(error => {
        //             this.backgroundValidationRunning = false;
        //             logger.warn('[App Init] Background validation error (assuming valid):', error);
        //         });
        //     }, 5000); // Wait 5 seconds before validating
        // }
        
        // Token is valid - proceed with app initialization
        // Get current page from URL
        this.currentPage = this.getPageFromURL();
        
        // Show header and footer
        const header = document.getElementById('header');
        const footer = document.querySelector('.app-footer');
        if (header) header.style.display = '';
        if (footer) footer.style.display = '';
        document.body.style.paddingTop = '';

        // Override global fetch to automatically include API key
        this.setupSecureFetch();

        // Handle browser back/forward buttons
        window.addEventListener('popstate', async (event) => {
            // Don't validate on popstate if already authenticated to avoid loops
            if (this.authenticated) {
                this.currentPage = event.state?.page || this.getPageFromURL();
                // Re-parse URL params on popstate
                this.urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
                if (this.header) {
                    this.header.updatePageName(this.currentPage);
                }
                await this.renderPage(true); // Skip validation to avoid loops
                return;
            }
            
            // Only validate if not authenticated
            if (!this.authenticated) {
                const isValid = await this.validateToken();
                if (!isValid) {
                    // Force #login when not authenticated
                    if (window.location.hash !== '#login') {
                        window.history.replaceState({ page: 'login' }, '', '#login');
                    }
                    await this.showLogin();
                    return;
                }
                // If validation passed, set authenticated
                this.authenticated = true;
            }
            
            this.currentPage = event.state?.page || this.getPageFromURL();
            // Re-parse URL params on popstate
            this.urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
            if (this.header) {
                this.header.updatePageName(this.currentPage);
            }
            await this.renderPage(true); // Skip validation since we just validated
        });
        
        // Prevent hash changes when on login page
        window.addEventListener('hashchange', (event) => {
            if (!this.authenticated && this.showingLogin) {
                // If not authenticated and showing login, force #login
                if (window.location.hash !== '#login') {
                    event.preventDefault();
                    window.history.replaceState({ page: 'login' }, '', '#login');
                }
            }
        });

        // Set initial history state - preserve the current URL hash if it exists
        const currentHash = window.location.hash;
        let url;
        if (currentHash && currentHash.length > 1) {
            // If not authenticated, force #login
            if (!this.authenticated) {
                url = '#login';
                this.currentPage = 'login';
            } else {
                // Preserve existing hash if authenticated
                url = currentHash;
                // Update currentPage from hash
                this.currentPage = this.getPageFromURL();
            }
        } else {
            // If authenticated and no hash, default to apps
            if (this.authenticated) {
                url = '#apps';
                this.currentPage = 'apps';
            } else {
                // Default to login if not authenticated
                url = '#login';
                this.currentPage = 'login';
            }
        }
        if (this.urlParams.toString() && !url.includes('?')) {
            url += `?${this.urlParams.toString()}`;
        }
        window.history.replaceState({ page: this.currentPage }, '', url);

        // Set global instance early so pages can use it
        window.appInstance = this;
        
        // Only render header and page if authenticated
        if (this.authenticated) {
            this.renderHeader();
            // Skip validation on initial render to avoid loops
            await this.renderPage(true);
            
            // Initialize modal
            window.modalInstance = new Modal();
            
            // Set up periodic token validation (check every 30 seconds) - but start after delay
            setTimeout(() => {
                if (this.authenticated && !this.tokenValidationInterval) {
                    this.startTokenValidationInterval();
                }
            }, 10000); // Start after 10 seconds to avoid immediate validation
            
            // Validate token when user returns to the tab/window
            this.setupVisibilityChangeListener();
        }
    }
    
    /**
     * Sets up a listener to validate token when user returns to the tab
     */
    setupVisibilityChangeListener() {
        // Only set up once
        if (this.visibilityListenerSetup) {
            return;
        }
        this.visibilityListenerSetup = true;
        
        document.addEventListener('visibilitychange', async () => {
            // When user returns to the tab (page becomes visible)
            if (!document.hidden && this.authenticated && !this.showingLogin) {
                logger.debug('[Visibility Change] Tab became visible - validating token...');
                // Validate token - but don't block
                setTimeout(async () => {
                    if (this.authenticated && !this.showingLogin) {
                        const isValid = await this.validateToken();
                        if (!isValid) {
                            logger.debug('[Visibility Change] Token expired while away - redirecting to login');
                            // Token expired while away, redirect to login
                            this.setAuthenticated(false);
                            if (!this.showingLogin) {
                                await this.showLogin();
                            }
                        } else {
                            logger.debug('[Visibility Change] Token still valid - refreshing API key');
                            // Token still valid, refresh API key in utility
                            if (window.api) {
                                await window.api.loadAPIKey(true);
                            }
                        }
                    }
                }, 500); // Delay to avoid immediate validation
            }
        });
    }
    
    /**
     * Starts a periodic token validation check
     */
    startTokenValidationInterval() {
        // Clear any existing interval first
        this.stopTokenValidationInterval();
        
        // DISABLED: Periodic validation was causing infinite loops and memory issues
        // Token validation now happens on-demand (when making API calls or navigating)
        // This prevents memory issues and infinite loops
        logger.debug('[Token Validation] Periodic validation disabled to prevent loops');
        
        // Token will be validated:
        // 1. When making API calls (via setupSecureFetch)
        // 2. When navigating to a new page (via renderPage)
        // 3. When user returns to tab (via visibility change listener)
    }
    
    /**
     * Stops the periodic token validation
     */
    stopTokenValidationInterval() {
        if (this.tokenValidationInterval) {
            clearInterval(this.tokenValidationInterval);
            this.tokenValidationInterval = null;
        }
    }

    setupSecureFetch() {
        // Store original fetch
        const originalFetch = window.fetch;
        
        // Override fetch to automatically include API key
        window.fetch = async (url, options = {}) => {
            // Skip API key for static files and security/auth endpoints (but NOT /api/health - it needs auth)
            if (typeof url === 'string' && (
                url.startsWith('/static/') || 
                url.startsWith('/health') || // Only /health (not /api/health)
                url.startsWith('/api/security/api-key') ||
                url.startsWith('/api/security/validate-key') ||
                url.startsWith('/api/security/api-key/') ||
                url.startsWith('/api/auth/register') ||
                url.startsWith('/api/auth/login') ||
                url.startsWith('/api/auth/check') ||
                !url.startsWith('/api/')
            )) {
                return originalFetch(url, options);
            }

            // Skip validation if flag is set (e.g., right after login) OR if already authenticated
            // Also skip if we're in MFA flow (checking for temp token)
            const isMFAFlow = localStorage.getItem('mfa_temp_token') !== null;
            
            if (!this.skipTokenValidation && !this.authenticated && !isMFAFlow) {
                // Only validate if not authenticated to avoid loops
                // But don't validate for /api/auth/validate itself to avoid recursion
                // Don't validate during MFA flow
                if (!url.includes('/api/auth/validate') && !url.includes('/api/auth/mfa/')) {
                    const isValid = await this.validateToken();
                    if (!isValid) {
                        // Token is invalid/expired, redirect to login
                        // But only if not already showing login to avoid loops
                        if (!this.showingLogin) {
                            this.setAuthenticated(false);
                            // Use setTimeout to break potential loops
                            setTimeout(() => {
                                if (!this.authenticated && !this.showingLogin) {
                                    this.showLogin();
                                }
                            }, 100);
                        }
                        // Return a 401 response to indicate unauthorized
                        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                            status: 401,
                            statusText: 'Unauthorized',
                            headers: { 'Content-Type': 'application/json' }
                        });
                    }
                }
                
                // Ensure JWT token is loaded (but not during MFA flow)
                if (!api.apiKey && !isMFAFlow) {
                    await api.loadAPIKey(true);
                }
            } else {
                // Skip validation but ensure token is loaded
                if (!api.apiKey) {
                    await api.loadAPIKey(true);
                }
            }

            // Add JWT token to Authorization header
            const headers = new Headers(options.headers || {});
            
            // Don't set Content-Type for FormData - browser will set it with boundary automatically
            if (options.body instanceof FormData && headers.has('Content-Type')) {
                headers.delete('Content-Type');
            }
            
            // Add session ID from JWT token if available
            if (api.apiKey) {
                const sessionId = api.getSessionIdFromToken(api.apiKey);
                if (sessionId) {
                    headers.set('X-Session-ID', sessionId);
                }
            }
            if (api.apiKey && !headers.has('Authorization')) {
                // Extract clean JWT token (handles cases with extra characters)
                const cleanToken = this.extractJWTToken(api.apiKey) || api.apiKey;
                
                // Check if it's a JWT token (starts with eyJ) or legacy API key
                if (cleanToken.startsWith('eyJ')) {
                    headers.set('Authorization', `Bearer ${cleanToken}`);
                } else {
                    // Legacy API key support
                    headers.set('X-API-Key', cleanToken);
                }
            }

            // Merge with existing options
            const secureOptions = {
                ...options,
                headers: headers
            };

            try {
                const response = await originalFetch(url, secureOptions);
                
                // Handle 401 Unauthorized - token is invalid/expired, disconnect user
                if (response.status === 401) {
                    console.log('[Secure Fetch] Received 401 Unauthorized - token invalid, disconnecting user');
                    // Clear authentication
                    this.setAuthenticated(false);
                    api.apiKey = null;
                    localStorage.removeItem('jwt_token');
                    
                    // Show login page (but only if not already showing to avoid loops)
                    if (!this.showingLogin) {
                        await this.showLogin();
                    }
                    
                    // Return the 401 response so caller can handle it
                    return response;
                }
                
                return response;
            } catch (error) {
                logger.error('Fetch error');
                throw error;
            }
        };
    }

    renderHeader() {
        this.header = new Header(this.currentPage);
        const headerElement = document.getElementById('header');
        headerElement.innerHTML = this.header.render();
        
        // Set global instance for onclick handlers
        window.headerInstance = this.header;
        
        // Mount header (this will also initialize sub-navbar)
        this.header.mount();
        
        // Initialize sidebar
        if (!window.sidebarInstance) {
            window.sidebarInstance = new Sidebar();
            window.sidebarInstance.mount();
        }
        
        // Mount header
        if (this.header.mount) {
            this.header.mount();
        }
        
        // Initialize footer
        this.renderFooter();
    }
    
    renderFooter() {
        if (!window.footerInstance) {
            window.footerInstance = new Footer();
        }
        const footerElement = document.getElementById('footer');
        if (footerElement) {
            footerElement.innerHTML = window.footerInstance.render();
            window.footerInstance.mount();
        }
    }
    
    async showLogin() {
        // Don't show login if user is already authenticated
        if (this.authenticated) {
            logger.debug('[Show Login] User is already authenticated, redirecting to apps');
            this.currentPage = 'apps';
            window.location.hash = '#apps';
            // Use setTimeout to break potential loops
            setTimeout(() => {
                if (this.authenticated) {
                    this.renderPage(true);
                }
            }, 100);
            return;
        }
        
        // Prevent multiple simultaneous calls to showLogin
        if (this.showingLogin) {
            logger.debug('[Show Login] Already showing login, skipping...');
            return;
        }
        this.showingLogin = true;
        
        // Force URL to #login when showing login page
        if (window.location.hash !== '#login') {
            window.history.replaceState({ page: 'login' }, '', '#login');
        }
        
        try {
            // Stop token validation interval when showing login
            this.stopTokenValidationInterval();
            
            // Hide header and footer for login page
            const header = document.getElementById('header');
            const footer = document.querySelector('.app-footer');
            if (header) header.style.display = 'none';
            if (footer) footer.style.display = 'none';
            
            // Adjust body padding for login page
            document.body.style.paddingTop = '0';
            
            // Show login page - only if still not authenticated
            if (!this.authenticated) {
                const content = document.getElementById('page-content');
                if (content) {
                    const loginPage = new LoginPage();
                    // CRITICAL: Expose instance globally IMMEDIATELY so inline handlers work
                    window.loginPageInstance = loginPage;
                    const html = await loginPage.render();
                    content.innerHTML = html;
                    // Mount after a brief delay to ensure DOM is ready
                    setTimeout(async () => {
                        if (loginPage.mount && !this.authenticated && !this.showingLogin) {
                            await loginPage.mount();
                        }
                    }, 50);
                }
            }
        } catch (error) {
            logger.error('[Show Login] Error:', error);
        } finally {
            // Reset flag after a delay to allow re-mounting if needed
            setTimeout(() => {
                if (!this.authenticated) {
                    this.showingLogin = false;
                }
            }, 2000);
        }
    }

    async renderPage(skipValidation = false) {
        console.log('[Render Page] START - page:', this.currentPage, 'skipValidation:', skipValidation, 'skipTokenValidation:', this.skipTokenValidation, 'authenticated:', this.authenticated);
        logger.debug('[Render Page] Rendering page:', this.currentPage, 'skipValidation:', skipValidation, 'skipTokenValidation:', this.skipTokenValidation, 'authenticated:', this.authenticated);
        
        // If not authenticated, force #login and show login page
        if (!this.authenticated) {
            if (window.location.hash !== '#login') {
                window.history.replaceState({ page: 'login' }, '', '#login');
            }
            this.currentPage = 'login';
            // Don't render login here - let showLogin() handle it
            if (!this.showingLogin) {
                await this.showLogin();
            }
            return;
        }
        
        // Validate token before rendering any page (unless explicitly skipped)
        if (!skipValidation && !this.skipTokenValidation) {
            console.log('[Render Page] Need to validate token...');
            logger.debug('[Render Page] Validating token with API before rendering...');
            
            // If already authenticated, skip validation
            if (this.authenticated) {
                console.log('[Render Page] Already authenticated, skipping validation');
                logger.debug('[Render Page] Already authenticated, skipping validation');
            } else {
                console.log('[Render Page] Not authenticated, validating token...');
                const isValid = await this.validateToken();
                console.log('[Render Page] Token validation result:', isValid);
                if (!isValid) {
                    console.log('[Render Page] Token validation failed - redirecting to login');
                    logger.debug('[Render Page] Token validation failed - redirecting to login');
                    // Force #login when not authenticated
                    if (window.location.hash !== '#login') {
                        window.history.replaceState({ page: 'login' }, '', '#login');
                    }
                    // Token is invalid/expired, redirect to login
                    await this.showLogin();
                    return;
                }
                console.log('[Render Page] Token valid - proceeding with page render');
                logger.debug('[Render Page] Token valid - proceeding with page render');
            }
        } else {
            console.log('[Render Page] Skipping token validation');
            logger.debug('[Render Page] Skipping token validation (skipValidation:', skipValidation, 'skipTokenValidation:', this.skipTokenValidation, ')');
            // Don't clear the skip flag here - let it be cleared by the login handler after a delay
            // This ensures API calls during page rendering also skip validation
        }
        
        // Scroll to top when navigating to a new page
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        const content = document.getElementById('page-content');
        if (!content) {
            logger.error('page-content element not found');
            return;
        }
        
        content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

        // Cleanup previous page if it has cleanup or unmount method
        if (this.currentPageInstance) {
            if (this.currentPageInstance.cleanup) {
                await this.currentPageInstance.cleanup();
            }
            if (this.currentPageInstance.unmount) {
                await this.currentPageInstance.unmount();
            }
        }

        let page;
        switch (this.currentPage) {
            case 'apps':
                page = new AppsPage((pageId) => this.navigateTo(pageId));
                break;
            // Virtualization
            case 'hyperv':
                page = new HyperVPage();
                break;
            case 'hyperv-auditor':
            case 'hyperv-auditor-list':
                page = new HyperVAuditorListPage();
                break;
            case 'hyperv-auditor-details':
                page = new HyperVAuditorPage();
                break;
            case 'esxi-auditor':
                // TODO: Implement ESXi Auditor page
                page = new HyperVAuditorListPage(); // Placeholder - will be replaced with ESXiAuditorPage
                break;
            case 'vsphere-auditor':
                // TODO: Implement vSphere Auditor page
                page = new HyperVAuditorListPage(); // Placeholder - will be replaced with vSphereAuditorPage
                break;
            case 'windows-auditor':
            case 'windows-server-auditor-list':
                page = new WindowsServerAuditorListPage();
                break;
            case 'windows-server-auditor-details':
                page = new WindowsServerAuditorPage();
                break;
            case 'linux-auditor':
            case 'linux-server-auditor-list':
                page = new LinuxServerAuditorListPage();
                break;
            case 'linux-server-auditor-details':
                page = new LinuxServerAuditorPage();
                break;
            case 'file-share-auditor':
            case 'file-share-auditor-list':
                page = new FileShareAuditorListPage();
                break;
            case 'file-share-auditor-details':
                page = new FileShareAuditorPage();
                break;
            case 'veeam-auditor-list':
                page = new VeeamAuditorListPage();
                break;
            case 'veeam-auditor-details':
                page = new VeeamAuditorPage();
                break;
            case 'active-directory-auditor':
                // TODO: Implement Active Directory Auditor page
                page = new HyperVAuditorListPage(); // Placeholder - will be replaced with ActiveDirectoryAuditorPage
                break;
            // Script Tools
            case 'documentation':
                page = new DocumentationPage();
                // Initialize and load data
                page.init().then(() => {
                    page.updateDisplay();
                });
                break;
            case 'todo':
                page = new TodoPage();
                break;
            case 'infrastructure-diagram':
                page = new InfrastructureDiagramPage();
                break;
            case 'automation':
                page = new AutomationPage();
                break;
            case 'remote':
                // Default to SSH when accessing remote
                page = new SSHClientPage();
                // Set instance immediately so onclick handlers work
                window.sshClientInstance = page;
                break;
            case 'ssh-client':
                page = new SSHClientPage();
                // Set instance immediately so onclick handlers work
                window.sshClientInstance = page;
                break;
            case 'sftp-client':
                page = new SFTPClientPage();
                break;
            case 'ftp-client':
                page = new FTPClientPage();
                break;
            case 'database-client':
                page = new DatabaseClientPage();
                break;
            case 'powershell-remote':
                page = new WinRMClientPage();
                break;
            case 'rdp-client':
                // TODO: Implement RDP Client page
                page = new SSHClientPage(); // Placeholder - will be replaced with RDPClientPage
                break;
            case 'telnet-client':
                page = new TelnetClientPage();
                break;
            case 'database-client':
                page = new DatabaseClientPage();
                break;
            case 'ip-scanner':
                page = new IPScannerPage();
                // Set instance immediately so onclick handlers work
                window.ipScannerInstance = page;
                break;
            case 'ping-tracer':
                page = new PingTracerPage();
                // Set instance immediately so onclick handlers work
                window.pingTracerInstance = page;
                break;
            case 'domain-lookup':
                page = new DomainLookupPage();
                // Set instance immediately so onclick handlers work
                window.domainLookupInstance = page;
                break;
            case 'packet-analyzer':
                page = new PacketAnalyzerPage();
                break;
            case 'speedtest':
                page = new SpeedtestPage();
                // Set instance immediately so onclick handlers work
                window.speedtestPageInstance = page;
                break;
            case 'reports':
                page = new ReportTemplatesPage();
                // Set instance immediately so onclick handlers work
                window.reportTemplatesInstance = page;
                break;
            case 'infrastructure-inventory':
                page = new InfrastructureInventoryPage();
                // Set instance immediately so onclick handlers work
                window.infrastructureInventoryInstance = page;
                break;
            case 'subnet-calculator':
                page = new SubnetCalculatorPage();
                // Set instance immediately so onclick handlers work
                window.subnetCalculatorInstance = page;
                break;
            case 'crypto-tools':
                page = new CryptoToolsPage();
                // Set instance immediately so onclick handlers work
                window.cryptoToolsInstance = page;
                break;
            case 'web-tools':
                page = new WebToolsPage();
                // Set instance immediately so onclick handlers work
                window.webToolsInstance = page;
                break;
            case 'development-tools':
                page = new DevelopmentToolsPage();
                // Set instance immediately so onclick handlers work
                window.devToolsInstance = page;
                break;
            case 'health-monitor':
                page = new HealthMonitorPage();
                // Set instance immediately so onclick handlers work
                window.healthMonitorInstance = page;
                break;
            case 'activity-log':
            case 'activity-log-sessions':
                page = new ActivityLogPage();
                // Set instance immediately so onclick handlers work
                window.activityLogInstance = page;
                break;
            case 'settings':
                page = new SettingsPage();
                // Set instance immediately so onclick handlers work
                window.settingsPageInstance = page;
                break;
            default:
                // For not-yet-implemented pages, show apps page
                page = new AppsPage((pageId) => this.navigateTo(pageId));
        }

        this.currentPageInstance = page;
        console.log('[Render Page] Rendering page content...');
        content.innerHTML = await page.render();
        console.log('[Render Page] Page content rendered');
        
        // Only mount if page has mount method, and load data if needed
        if (page.mount) {
            console.log('[Render Page] Calling page.mount()...');
            await page.mount();
            console.log('[Render Page] Page mounted successfully');
        } else {
            console.log('[Render Page] Page has no mount method');
        }
        
        console.log('[Render Page] END - page rendered successfully');
    }

    async navigateTo(page) {
        logger.debug('[Navigation] Navigating to:', page);
        
        // If not authenticated, don't allow navigation - force login
        if (!this.authenticated) {
            logger.debug('[Navigation] Not authenticated - redirecting to login');
            await this.showLogin();
            return;
        }
        
        // Validate token before every navigation
        logger.debug('[Navigation] Validating token with API before navigation...');
        if (!(await this.validateToken())) {
            logger.debug('[Navigation] Token validation failed - redirecting to login');
            // Token is invalid/expired, redirect to login
            await this.showLogin();
            return;
        }
        logger.debug('[Navigation] Token valid - proceeding with navigation');
        
        // Handle query parameters in page string (e.g., "hyperv-auditor-details?id=2")
        const [pageName, queryString] = page.split('?');
        
        // Don't navigate if we're already on this page (unless we're coming from login)
        if (this.currentPage === pageName && this.currentPage !== 'apps') {
            return;
        }
        
        this.currentPage = pageName;
        
        // Update URL without reloading the page (always use hash for consistency)
        const url = `#${page}`;
        window.history.pushState({ page: pageName }, '', url);
        
        // Update URL params if query string exists
        if (queryString) {
            this.urlParams = new URLSearchParams(queryString);
        }
        
        // Update header page name
        if (this.header) {
            this.header.updatePageName(pageName);
        }
        
        // Scroll to top immediately when navigating
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Render the new page (await to ensure it completes)
        await this.renderPage();
    }
}

// Initialize app
new App();
