export class LoginPage {
    constructor() {
        this.errorMessage = '';
        this.isLoading = false;
        this.setupMode = false;
        this.loadingSetup = false;
        this.checkingUser = false; // Prevent multiple simultaneous checks
        this.mounting = false; // Prevent multiple simultaneous mount calls
        this.mfaStep = 'none'; // 'none', 'pending', 'totp'
        this.tempToken = '';
        this.mfaRequestId = null;
        this.mfaExpiresIn = 0;
        this.mfaPollInterval = null;
    }

    async render() {
        // Check if we're in setup mode (first time - no users exist)
        if (this.setupMode) {
            return this.renderSetup();
        }

        return `
            <div class="login-container">
                <!-- Left Panel - Visual -->
                <div class="login-left-panel">
                    <div class="login-left-content">
                        <div class="login-logo">DCT</div>
                        <div class="login-hero-text">
                            <h1>Control Your Infrastructure</h1>
                            <p>Manage, Monitor, and Secure Your IT Environment</p>
                        </div>
                        <div class="login-pagination">
                            <span class="pagination-dot active"></span>
                            <span class="pagination-dot"></span>
                            <span class="pagination-dot"></span>
                            <span class="pagination-dot"></span>
                        </div>
                    </div>
                </div>
                
                <!-- Right Panel - Form -->
                <div class="login-right-panel">
                    <div class="login-form-container">
                        <h2 class="login-title">Login</h2>
                        <p class="login-subtitle">
                            Enter your credentials to access Dhia Control Tower
                        </p>
                        
                        <form id="login-form" class="login-form" onsubmit="loginPageInstance.handleLogin(event)">
                            ${this.mfaStep === 'none' ? `
                                <div class="login-form-group">
                                    <label class="login-label">Username</label>
                                    <input 
                                        type="text" 
                                        id="username" 
                                        name="username" 
                                        class="login-input"
                                        placeholder="Enter your username"
                                        required
                                        autocomplete="username"
                                        ${this.isLoading ? 'disabled' : ''}
                                    />
                                </div>
                                
                                <div class="login-form-group">
                                    <label class="login-label">Password</label>
                                    <input 
                                        type="password" 
                                        id="password" 
                                        name="password" 
                                        class="login-input"
                                        placeholder="Enter your password"
                                        required
                                        autocomplete="current-password"
                                        ${this.isLoading ? 'disabled' : ''}
                                    />
                                    <button 
                                        type="button" 
                                        class="login-password-toggle"
                                        onclick="loginPageInstance.togglePasswordVisibility()"
                                        tabindex="-1"
                                    >
                                        <i class="fas fa-eye" id="password-toggle-icon"></i>
                                    </button>
                                </div>
                                
                                ${this.errorMessage ? `
                                    <div class="login-error">
                                        <i class="fas fa-exclamation-circle"></i>
                                        <span>${this.errorMessage}</span>
                                    </div>
                                ` : ''}
                            ` : ''}
                            
                            ${this.mfaStep === 'pending' ? `
                                <div style="text-align: center; margin: 2rem 0;">
                                    <i class="fas fa-mobile-alt" style="font-size: 2rem; color: #3b82f6; margin-bottom: 1rem;"></i>
                                    <h3 style="color: #e2e8f0; margin: 0 0 0.5rem 0; font-size: 1.1rem;">Waiting for MFA Approval</h3>
                                    <p style="color: #94a3b8; margin: 0 0 1rem 0; font-size: 0.9rem;">Check your mobile app for a push notification</p>
                                    <div style="display: flex; justify-content: center; align-items: center; gap: 0.5rem; margin-top: 1rem;">
                                        <div class="spinner" style="width: 20px; height: 20px; border: 2px solid #334155; border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                                        <span style="color: #94a3b8; font-size: 0.85rem;">Waiting...</span>
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${this.mfaStep === 'totp' ? `
                                <div style="text-align: center; margin: 2rem 0;">
                                    <h3 style="color: #e2e8f0; margin: 0 0 0.5rem 0; font-size: 1.1rem;">
                                        <i class="fas fa-key"></i> Enter TOTP Code
                                    </h3>
                                    <p style="color: #94a3b8; margin: 0 0 1.5rem 0; font-size: 0.9rem;">
                                        Enter the 6-digit code from your authenticator app
                                    </p>
                                    <div class="login-form-group">
                                        <label class="login-label">Verification Code</label>
                                        <input 
                                            type="text" 
                                            id="mfa-totp-code" 
                                            class="login-input"
                                            placeholder="000000"
                                            maxlength="6"
                                            pattern="[0-9]{6}"
                                            autocomplete="off"
                                            style="text-align: center; font-size: 1.2rem; letter-spacing: 0.5rem;"
                                            onkeypress="if(event.key === 'Enter') loginPageInstance.handleTOTPSubmit()"
                                        />
                                    </div>
                                    <button 
                                        type="button" 
                                        class="login-submit-btn"
                                        onclick="loginPageInstance.handleTOTPSubmit()"
                                        ${this.isLoading ? 'disabled' : ''}
                                        style="width: 100%; margin-top: 1rem;"
                                    >
                                        ${this.isLoading ? `
                                            <i class="fas fa-spinner fa-spin"></i> Verifying...
                                        ` : `
                                            <i class="fas fa-check"></i> Verify Code
                                        `}
                                    </button>
                                </div>
                            ` : ''}
                            
                            ${this.mfaStep === 'none' ? `
                                <div class="login-checkbox-group">
                                    <label class="login-checkbox-label">
                                        <input 
                                            type="checkbox" 
                                            id="remember-me"
                                            class="login-checkbox"
                                            checked
                                        />
                                        <span class="login-checkbox-text">
                                            Remember this device
                                        </span>
                                    </label>
                                </div>
                                
                                <button 
                                    type="submit" 
                                    class="login-submit-btn"
                                    ${this.isLoading ? 'disabled' : ''}
                                >
                                    ${this.isLoading ? `
                                        <i class="fas fa-spinner fa-spin"></i> Authenticating...
                                    ` : `
                                        Login
                                    `}
                                </button>
                            ` : ''}
                        </form>
                    </div>
                </div>
            </div>
        `;
    }

    renderSetup() {
        return `
            <div class="login-container">
                <!-- Left Panel - Visual -->
                <div class="login-left-panel">
                    <div class="login-left-content">
                        <div class="login-logo">DCT</div>
                        <div class="login-hero-text">
                            <h1>Welcome to Control Tower</h1>
                            <p>Create your administrator account to get started</p>
                        </div>
                        <div class="login-pagination">
                            <span class="pagination-dot active"></span>
                            <span class="pagination-dot"></span>
                            <span class="pagination-dot"></span>
                            <span class="pagination-dot"></span>
                        </div>
                    </div>
                </div>
                
                <!-- Right Panel - Setup Form -->
                <div class="login-right-panel">
                    <div class="login-form-container">
                        <h2 class="login-title">🔑 Create Account</h2>
                        <p class="login-subtitle">
                            Create your administrator account to access Dhia Control Tower
                        </p>
                        
                        <form id="setup-form" class="login-form" onsubmit="loginPageInstance.handleRegister(event)">
                            <div class="login-form-group">
                                <label class="login-label">Username</label>
                                <input 
                                    type="text" 
                                    id="setup-username" 
                                    name="username" 
                                    class="login-input"
                                    placeholder="Choose a username (min. 3 characters)"
                                    required
                                    autocomplete="username"
                                    minlength="3"
                                    ${this.isLoading ? 'disabled' : ''}
                                />
                            </div>
                            
                            <div class="login-form-group">
                                <label class="login-label">Password</label>
                                <input 
                                    type="password" 
                                    id="setup-password" 
                                    name="password" 
                                    class="login-input"
                                    placeholder="Choose a password (min. 8 characters)"
                                    required
                                    autocomplete="new-password"
                                    minlength="8"
                                    ${this.isLoading ? 'disabled' : ''}
                                />
                                <button 
                                    type="button" 
                                    class="login-password-toggle"
                                    onclick="loginPageInstance.togglePasswordVisibility('setup-password')"
                                    tabindex="-1"
                                >
                                    <i class="fas fa-eye" id="setup-password-toggle-icon"></i>
                                </button>
                            </div>
                            
                            <div class="login-form-group">
                                <label class="login-label">Confirm Password</label>
                                <input 
                                    type="password" 
                                    id="setup-password-confirm" 
                                    name="passwordConfirm" 
                                    class="login-input"
                                    placeholder="Confirm your password"
                                    required
                                    autocomplete="new-password"
                                    ${this.isLoading ? 'disabled' : ''}
                                />
                                <button 
                                    type="button" 
                                    class="login-password-toggle"
                                    onclick="loginPageInstance.togglePasswordVisibility('setup-password-confirm')"
                                    tabindex="-1"
                                >
                                    <i class="fas fa-eye" id="setup-password-confirm-toggle-icon"></i>
                                </button>
                            </div>
                            
                            ${this.errorMessage ? `
                                <div class="login-error">
                                    <i class="fas fa-exclamation-circle"></i>
                                    <span>${this.errorMessage}</span>
                                </div>
                            ` : ''}
                            
                            <button 
                                type="submit" 
                                class="login-submit-btn"
                                ${this.isLoading ? 'disabled' : ''}
                            >
                                ${this.isLoading ? `
                                    <i class="fas fa-spinner fa-spin"></i> Creating Account...
                                ` : `
                                    <i class="fas fa-user-plus"></i> Create Account
                                `}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        `;
    }

    async mount() {
        // Prevent multiple simultaneous mount calls
        if (this.mounting) {
            return;
        }

        this.mounting = true;

        try {
            // Set global instance for form submission
            window.loginPageInstance = this;

            // If user is already authenticated, don't check anything - they shouldn't be on login page
            if (window.appInstance && window.appInstance.authenticated) {
                // User is authenticated, redirect to apps immediately
                window.appInstance.currentPage = 'controller';
                window.location.hash = '#controller';
                // Skip validation since we know they're authenticated
                window.appInstance.skipTokenValidation = true;
                await window.appInstance.renderPage(true);
                return;
            }

            // Also check if we have a valid token in localStorage
            const token = localStorage.getItem('jwt_token');
            if (token && window.appInstance) {
                // We have a token, try to validate it quickly
                const cleanToken = window.appInstance.extractJWTToken(token);
                if (cleanToken) {
                    // Check if token is expired locally first (quick check)
                    try {
                        const payload = JSON.parse(atob(cleanToken.split('.')[1]));
                        const exp = payload.exp * 1000;
                        if (exp > Date.now()) {
                            // Token exists and is not expired, user should be authenticated
                            // Set authenticated state and redirect
                            window.appInstance.setAuthenticated(true);
                            window.appInstance.authenticated = true;
                            if (window.api) {
                                window.api.apiKey = cleanToken;
                            }
                            window.appInstance.currentPage = 'controller';
                            window.location.hash = '#controller';
                            window.appInstance.skipTokenValidation = true;
                            await window.appInstance.renderPage(true);
                            return;
                        }
                    } catch (e) {
                        // Token parsing failed, continue with normal flow
                    }
                }
            }

            // Check if user exists (for setup mode) - only if not already checking
            if (!this.setupMode && !this.checkingUser) {
                this.checkingUser = true;
                try {
                    const response = await fetch('/api/auth/check', {
                        signal: AbortSignal.timeout(5000) // 5 second timeout
                    });

                    if (response.ok) {
                        const data = await response.json();
                        // Only check exists property, ignore count
                        if (data.exists === false) {
                            // No user exists, show setup form
                            this.setupMode = true;
                            this.checkingUser = false;
                            // Don't call updateDisplay() here to avoid loop - just render directly
                            const content = document.getElementById('page-content');
                            if (content) {
                                const html = await this.render();
                                content.innerHTML = html;
                                // Don't call mount() again - we're already mounted
                            }
                            return;
                        } else {
                            // User exists, show login form (already rendered)
                            this.checkingUser = false;
                            const usernameInput = document.getElementById('username');
                            if (usernameInput) {
                                usernameInput.focus();
                            }
                        }
                    } else if (response.status === 429) {
                        // Rate limited - wait a bit and don't retry immediately
                        console.warn('Rate limited on user check - assuming user exists');
                        this.checkingUser = false;
                        // Assume user exists to avoid loop
                        const usernameInput = document.getElementById('username');
                        if (usernameInput) {
                            usernameInput.focus();
                        }
                    } else {
                        // If status check fails, assume user exists to avoid loop
                        this.checkingUser = false;
                        const usernameInput = document.getElementById('username');
                        if (usernameInput) {
                            usernameInput.focus();
                        }
                    }
                } catch (error) {
                    // Network errors or timeouts - assume user exists to avoid loop
                    console.warn('Error checking user status - assuming user exists:', error);
                    this.checkingUser = false;
                    // Assume user exists to avoid infinite loop
                    const usernameInput = document.getElementById('username');
                    if (usernameInput) {
                        usernameInput.focus();
                    }
                }
            }

            // Allow Enter key to submit (only if login form exists)
            const usernameInput = document.getElementById('username');
            if (usernameInput && !this.setupMode) {
                usernameInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !this.isLoading) {
                        const form = document.getElementById('login-form');
                        if (form) {
                            form.requestSubmit();
                        }
                    }
                });
            }
        } finally {
            // Always reset mounting flag, even if there was an error or early return
            this.mounting = false;
        }
    }

    async handleRegister(event) {
        event.preventDefault();

        if (this.isLoading) return;

        const usernameInput = document.getElementById('setup-username');
        const passwordInput = document.getElementById('setup-password');
        const passwordConfirmInput = document.getElementById('setup-password-confirm');

        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        const passwordConfirm = passwordConfirmInput.value;

        // Validation
        if (!username || !password || !passwordConfirm) {
            this.showError('All fields are required');
            return;
        }

        if (username.length < 3) {
            this.showError('Username must be at least 3 characters');
            return;
        }

        if (password.length < 8) {
            this.showError('Password must be at least 8 characters');
            return;
        }

        if (password !== passwordConfirm) {
            this.showError('Passwords do not match');
            return;
        }

        this.isLoading = true;
        this.errorMessage = '';
        this.updateDisplay();

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.token) {
                    // Store JWT token
                    localStorage.setItem('jwt_token', data.token);

                    // Update API utility with JWT token
                    if (window.api) {
                        window.api.apiKey = data.token;
                    }

                    // Set authentication state
                    if (window.appInstance) {
                        // Stop any validation intervals that might interfere
                        window.appInstance.stopTokenValidationInterval();

                        // Set authenticated BEFORE anything else to prevent showLogin from running
                        window.appInstance.setAuthenticated(true);
                        window.appInstance.authenticated = true;
                        window.appInstance.showingLogin = false; // Reset showingLogin flag

                        // Clear login page state
                        this.setupMode = false;
                        this.checkingUser = true; // Prevent mount from running
                        this.mounting = true; // Prevent any further mount calls

                        // Update API utility with JWT token and reload it properly
                        if (window.api) {
                            window.api.apiKey = data.token;
                            // Reload to ensure it's properly set
                            await window.api.loadAPIKey(true);
                        }

                        // Show header and footer
                        const header = document.getElementById('header');
                        const footer = document.querySelector('.app-footer');
                        if (header) header.style.display = '';
                        if (footer) footer.style.display = '';
                        document.body.style.paddingTop = '';

                        // Clear login content and navigate to apps
                        const content = document.getElementById('page-content');
                        if (content) {
                            content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
                        }

                        // Set a flag to skip token validation on next renderPage call
                        window.appInstance.skipTokenValidation = true;

                        // Small delay to ensure everything is set before navigation
                        await new Promise(resolve => setTimeout(resolve, 100));

                        window.appInstance.currentPage = 'controller';
                        window.location.hash = '#controller';
                        await window.appInstance.renderPage(true);

                        // Clear skip flag after a short delay to resume normal validation
                        setTimeout(() => {
                            if (window.appInstance) {
                                window.appInstance.skipTokenValidation = false;
                            }
                        }, 2000); // 2 seconds should be enough for initial page load

                        // Restart validation interval after successful navigation
                        window.appInstance.startTokenValidationInterval();
                    } else {
                        window.location.hash = '#controller';
                        window.location.reload();
                    }
                    return;
                } else {
                    this.showError(data.message || 'Failed to create account');
                }
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Failed to create account' }));
                this.showError(errorData.message || 'Failed to create account');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showError('Failed to connect to server. Please try again.');
        } finally {
            this.isLoading = false;
            this.updateDisplay();
        }
    }

    async handleLogin(event) {
        event.preventDefault();

        console.log('[Login] handleLogin called');

        if (this.isLoading) {
            console.log('[Login] Already loading, returning');
            return;
        }

        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');

        if (!usernameInput || !passwordInput) {
            console.error('[Login] Username or password input not found');
            this.showError('Form inputs not found. Please refresh the page.');
            return;
        }

        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (!username || !password) {
            console.log('[Login] Username or password empty');
            this.showError('Please enter username and password');
            return;
        }

        console.log('[Login] Starting login process for user:', username);
        this.isLoading = true;
        this.errorMessage = '';
        this.checkingUser = true; // Prevent mount from running during login
        this.updateDisplay();

        let loginSuccessful = false;

        try {
            console.log('[Login] Sending login request to /api/auth/login');
            // Validate credentials and get JWT token
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            console.log('[Login] Response status:', response.status, 'ok:', response.ok);

            if (response.ok) {
                const data = await response.json();
                console.log('[Login] Response data:', {
                    valid: data.valid,
                    hasToken: !!data.token,
                    mfaRequired: data.mfa_required,
                    hasTempToken: !!data.temp_token,
                    message: data.message
                });

                // Check if MFA is required
                if (data.valid && data.mfa_required && data.temp_token) {
                    console.log('[Login] MFA required, starting MFA flow with temp_token');
                    // MFA required - store temp token and start MFA flow
                    this.tempToken = data.temp_token;

                    // Store temp token temporarily (don't use it for normal auth, but keep it for MFA)
                    // Don't set it as the main token - it's temporary
                    localStorage.setItem('mfa_temp_token', data.temp_token);
                    console.log('[Login] Temp token stored in localStorage as mfa_temp_token');

                    // Prevent token validation from running during MFA flow
                    if (window.appInstance) {
                        window.appInstance.skipTokenValidation = true;
                        console.log('[Login] skipTokenValidation set to true for MFA flow');
                    }

                    // Don't set authenticated state - we're waiting for MFA
                    // But prevent validation loops
                    this.isLoading = false; // Allow UI updates
                    await this.startMFAFlow();
                    return; // Don't proceed with normal login
                }

                if (data.valid && data.token) {
                    loginSuccessful = true;

                    // CRITICAL: Store JWT token FIRST
                    localStorage.setItem('jwt_token', data.token);
                    console.log('[Login] Token stored in localStorage');

                    // CRITICAL: Update API utility with JWT token BEFORE anything else
                    if (window.api) {
                        // Extract clean JWT token first
                        const cleanToken = window.api.extractJWTToken ? window.api.extractJWTToken(data.token) : data.token;

                        // Set directly first
                        window.api.apiKey = cleanToken || data.token;
                        console.log('[Login] Token set in window.api.apiKey:', window.api.apiKey ? 'SET' : 'NOT SET');

                        // Verify localStorage has the token
                        const storedToken = localStorage.getItem('jwt_token');
                        if (storedToken !== data.token) {
                            console.warn('[Login] Token mismatch in localStorage, updating...');
                            localStorage.setItem('jwt_token', data.token);
                        }

                        // Then reload to ensure it's properly set
                        await window.api.loadAPIKey(true);
                        console.log('[Login] Token loaded via loadAPIKey, apiKey:', window.api.apiKey ? 'SET' : 'NOT SET');

                        // Final verification - force set if still not set
                        if (!window.api.apiKey) {
                            console.error('[Login] ERROR: Token not set in api.apiKey after loadAPIKey! Forcing set...');
                            // Force set it again with clean token
                            window.api.apiKey = cleanToken || data.token;
                            // Also ensure localStorage has it
                            localStorage.setItem('jwt_token', cleanToken || data.token);
                        }

                        console.log('[Login] Final token verification - localStorage:', localStorage.getItem('jwt_token') ? 'HAS TOKEN' : 'NO TOKEN', 'api.apiKey:', window.api.apiKey ? 'HAS TOKEN' : 'NO TOKEN');
                    } else {
                        console.error('[Login] ERROR: window.api is not available!');
                    }

                    // Show header and footer
                    const header = document.getElementById('header');
                    const footer = document.querySelector('.app-footer');
                    if (header) header.style.display = '';
                    if (footer) footer.style.display = '';
                    document.body.style.paddingTop = '';

                    // Set authentication state
                    if (window.appInstance) {
                        // Stop any validation intervals that might interfere
                        window.appInstance.stopTokenValidationInterval();

                        // CRITICAL: Set authenticated and skip validation BEFORE anything else
                        window.appInstance.setAuthenticated(true);
                        window.appInstance.authenticated = true;
                        window.appInstance.showingLogin = false; // Reset showingLogin flag
                        window.appInstance.skipTokenValidation = true; // Skip validation immediately
                        console.log('[Login] Authentication state set, skipTokenValidation = true');

                        // Clear login content immediately and prevent any further mount calls
                        const content = document.getElementById('page-content');
                        if (content) {
                            content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
                        }

                        // Prevent mount from running again
                        this.checkingUser = true;
                        this.mounting = true; // Prevent any further mount calls
                        this.isLoading = false;

                        // Small delay to ensure everything is set before navigation
                        await new Promise(resolve => setTimeout(resolve, 200));

                        // Verify token is still in localStorage before navigation
                        const storedToken = localStorage.getItem('jwt_token');
                        if (!storedToken) {
                            console.error('[Login] ERROR: Token missing from localStorage before navigation!');
                            // Re-store it
                            localStorage.setItem('jwt_token', data.token);
                        }

                        // Navigate to apps page
                        if (!window.appInstance) {
                            console.error('[Login] ERROR: window.appInstance is null! Reloading page...');
                            window.location.hash = '#controller';
                            window.location.reload();
                            return;
                        }

                        window.appInstance.currentPage = 'controller';
                        window.location.hash = '#controller';
                        console.log('[Login] Navigating to apps page, currentPage:', window.appInstance.currentPage);

                        // Render page without validating token (we just logged in, token is valid)
                        try {
                            console.log('[Login] Calling renderPage(true)...');
                            await window.appInstance.renderPage(true);
                            console.log('[Login] Page rendered successfully');
                        } catch (error) {
                            console.error('[Login] Error rendering page:', error);
                            console.error('[Login] Error stack:', error.stack);
                            // If render fails, try reloading
                            window.location.hash = '#controller';
                            window.location.reload();
                            return;
                        }

                        // Clear skip flag after a short delay to resume normal validation
                        // Token will be validated reactively when API calls return 401
                        setTimeout(() => {
                            if (window.appInstance) {
                                window.appInstance.skipTokenValidation = false;
                                console.log('[Login] skipTokenValidation reset to false - token will be validated reactively on API errors');
                            }
                        }, 1000); // 1 second should be enough for initial page load
                    } else {
                        console.error('[Login] ERROR: window.appInstance is not available!');
                        window.location.hash = '#controller';
                        window.location.reload();
                    }
                    return; // Exit early on success
                } else {
                    this.showError(data.message || 'Invalid username or password');
                }
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Authentication failed' }));
                this.showError(errorData.message || 'Invalid username or password');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Failed to connect to server. Please try again.');
        } finally {
            // Only update display if login failed (to show error)
            // Don't update if login was successful (we're navigating away)
            if (!loginSuccessful) {
                this.isLoading = false;
                this.updateDisplay();
            }
        }
    }

    async startMFAFlow() {
        this.mfaStep = 'pending';
        this.errorMessage = '';

        // Ensure we have the temp token
        if (!this.tempToken) {
            this.tempToken = localStorage.getItem('mfa_temp_token');
            console.log('[MFA] Retrieved temp token from localStorage:', this.tempToken ? 'FOUND' : 'NOT FOUND');
        }

        if (!this.tempToken) {
            this.showError('MFA token not found. Please try logging in again.');
            this.isLoading = false;
            this.updateDisplay();
            return;
        }

        this.updateDisplay();

        try {
            console.log('[MFA] Creating MFA request with temp token');
            // Create MFA request
            const response = await fetch('/api/auth/mfa/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.tempToken}`
                },
                body: JSON.stringify({})
            });

            if (response.ok) {
                const data = await response.json();
                this.mfaRequestId = data.mfa_request_id;
                this.mfaExpiresIn = data.expires_in || 300;

                console.log('[MFA] Request created, ID:', this.mfaRequestId, 'Expires in:', this.mfaExpiresIn);

                // Start polling for status
                this.startMFAPolling();

                // Show TOTP option after 15 seconds (give push notification time to arrive)
                // Only show if still pending (not approved/denied)
                setTimeout(() => {
                    if (this.mfaStep === 'pending' && this.mfaRequestId) {
                        console.log('[MFA] Showing TOTP option after 15 seconds');
                        // Show option to use TOTP code (but keep polling active)
                        this.mfaStep = 'totp';
                        this.updateDisplay();
                    }
                }, 15000); // Wait 15 seconds before showing TOTP option
            } else {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('[MFA] Failed to create request:', errorData);
                // If can't communicate with MFA server, fallback to TOTP immediately
                if (errorData.error && (errorData.error.includes('Failed to contact MFA server') ||
                    errorData.error.includes('Failed to contact'))) {
                    console.log('[MFA] MFA server unreachable, showing TOTP immediately');
                    this.mfaStep = 'totp';
                    this.updateDisplay();
                } else {
                    this.showError(errorData.error || 'Failed to create MFA request');
                    this.isLoading = false;
                    this.updateDisplay();
                }
            }
        } catch (error) {
            console.error('[MFA] Request error:', error);
            // If can't communicate with MFA server, fallback to TOTP immediately
            console.log('[MFA] Network error, showing TOTP immediately');
            this.mfaStep = 'totp';
            this.updateDisplay();
        }
    }

    startMFAPolling() {
        if (this.mfaPollInterval) {
            clearInterval(this.mfaPollInterval);
        }

        const maxAttempts = Math.floor(this.mfaExpiresIn / 3); // Poll every 3 seconds
        let attempts = 0;

        console.log('[MFA] Starting polling, max attempts:', maxAttempts, 'Request ID:', this.mfaRequestId);

        // Poll immediately first time
        const pollOnce = async () => {
            attempts++;
            console.log('[MFA] Polling attempt', attempts, 'of', maxAttempts, 'Request ID:', this.mfaRequestId);

            try {
                const statusUrl = `/api/auth/mfa/status/${this.mfaRequestId}`;
                console.log('[MFA] Fetching status from:', statusUrl);
                const response = await fetch(statusUrl);

                console.log('[MFA] Status response status:', response.status, 'ok:', response.ok);

                if (response.ok) {
                    const data = await response.json();
                    console.log('[MFA] Status response data:', data);
                    console.log('[MFA] Current status:', data.status);

                    if (data.status === 'approved') {
                        console.log('[MFA] ✅ Status approved, completing login');
                        clearInterval(this.mfaPollInterval);
                        this.mfaPollInterval = null;
                        // Stop showing TOTP if it was shown
                        this.mfaStep = 'approved';
                        // MFA approved - complete login
                        await this.completeMFALogin();
                        return; // Exit early
                    } else if (data.status === 'denied') {
                        console.log('[MFA] ❌ Status denied');
                        clearInterval(this.mfaPollInterval);
                        this.mfaPollInterval = null;
                        this.showError('Login denied by user');
                        this.isLoading = false;
                        this.mfaStep = 'none';
                        this.updateDisplay();
                        return;
                    } else if (data.status === 'expired') {
                        console.log('[MFA] ⏰ Status expired');
                        clearInterval(this.mfaPollInterval);
                        this.mfaPollInterval = null;
                        this.showError('MFA request expired. Please try again.');
                        this.isLoading = false;
                        this.mfaStep = 'none';
                        this.updateDisplay();
                        return;
                    } else if (data.status === 'pending') {
                        // Continue polling - status is still pending
                        console.log('[MFA] ⏳ Status still pending, continuing to poll...');
                    } else {
                        console.warn('[MFA] ⚠️ Unknown status:', data.status);
                    }
                } else {
                    const errorText = await response.text().catch(() => '');
                    console.warn('[MFA] Status check failed:', response.status, errorText);
                }
            } catch (error) {
                console.error('[MFA] Error polling status:', error);
                // Don't stop polling on network errors - might be temporary
            }

            if (attempts >= maxAttempts) {
                console.log('[MFA] Max polling attempts reached');
                clearInterval(this.mfaPollInterval);
                this.mfaPollInterval = null;
                // Timeout - show TOTP option if not already shown
                if (this.mfaStep === 'pending') {
                    console.log('[MFA] Showing TOTP after timeout');
                    this.mfaStep = 'totp';
                    this.updateDisplay();
                }
            }
        };

        // Poll immediately
        pollOnce();

        // Then poll every 3 seconds
        this.mfaPollInterval = setInterval(pollOnce, 3000);
    }

    async verifyTOTPCode(code) {
        if (!this.mfaRequestId) {
            this.showError('MFA request not found. Please try logging in again.');
            return false;
        }

        try {
            const response = await fetch('/api/auth/mfa/totp/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.tempToken}`
                },
                body: JSON.stringify({
                    mfa_request_id: this.mfaRequestId,
                    code: code
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.valid) {
                    // Code validated - complete login
                    await this.completeMFALogin();
                    return true;
                } else {
                    this.showError(data.message || 'Invalid code');
                    return false;
                }
            } else {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                this.showError(errorData.error || 'Failed to verify code');
                return false;
            }
        } catch (error) {
            console.error('TOTP verification error:', error);
            this.showError('Failed to verify code. Please try again.');
            return false;
        }
    }

    async completeMFALogin() {
        console.log('[MFA] Starting completeMFALogin');
        this.isLoading = true;
        this.errorMessage = '';

        // Ensure we have the temp token
        if (!this.tempToken) {
            this.tempToken = localStorage.getItem('mfa_temp_token');
            console.log('[MFA] Retrieved temp token from localStorage for completion');
        }

        if (!this.tempToken) {
            console.error('[MFA] No temp token found for completion');
            this.showError('MFA token not found. Please try logging in again.');
            this.isLoading = false;
            this.updateDisplay();
            return;
        }

        // Update UI to show we're completing login
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = '<div class="loading" style="text-align: center; padding: 2rem;"><div class="spinner"></div><p style="color: #94a3b8; margin-top: 1rem;">Completing login...</p></div>';
        }

        try {
            console.log('[MFA] Calling /api/auth/mfa/complete with temp token');
            const response = await fetch('/api/auth/mfa/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.tempToken}`
                },
                body: JSON.stringify({})
            });

            console.log('[MFA] Complete response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('[MFA] Complete response data:', { valid: data.valid, hasToken: !!data.token });

                if (data.valid && data.token) {
                    console.log('[MFA] ✅ Token received, storing and completing login');

                    // Store final JWT token
                    localStorage.setItem('jwt_token', data.token);
                    // Clear temp token
                    localStorage.removeItem('mfa_temp_token');
                    console.log('[MFA] Token stored in localStorage, temp token cleared');

                    // Update API utility
                    if (window.api) {
                        const cleanToken = window.api.extractJWTToken ? window.api.extractJWTToken(data.token) : data.token;
                        window.api.apiKey = cleanToken || data.token;
                        await window.api.loadAPIKey(true);
                        console.log('[MFA] Token set in API utility');
                    }

                    // Set authentication state
                    if (window.appInstance) {
                        window.appInstance.stopTokenValidationInterval();
                        window.appInstance.setAuthenticated(true);
                        window.appInstance.authenticated = true;
                        window.appInstance.showingLogin = false;
                        window.appInstance.skipTokenValidation = true;
                        console.log('[MFA] Authentication state set');

                        // Show header and footer
                        const header = document.getElementById('header');
                        const footer = document.querySelector('.app-footer');
                        if (header) header.style.display = '';
                        if (footer) footer.style.display = '';
                        document.body.style.paddingTop = '';

                        // Navigate to apps page
                        await new Promise(resolve => setTimeout(resolve, 200));
                        window.appInstance.currentPage = 'controller';
                        window.location.hash = '#controller';
                        console.log('[MFA] Navigating to apps page');
                        await window.appInstance.renderPage(true);
                        console.log('[MFA] Page rendered');

                        // Clear skip flag after delay
                        setTimeout(() => {
                            if (window.appInstance) {
                                window.appInstance.skipTokenValidation = false;
                            }
                        }, 1000);
                    } else {
                        console.error('[MFA] ERROR: window.appInstance not available');
                        window.location.hash = '#controller';
                        window.location.reload();
                    }
                } else {
                    console.error('[MFA] Invalid response:', data);
                    this.showError(data.message || 'Failed to complete login');
                    this.isLoading = false;
                    this.updateDisplay();
                }
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Failed to complete login' }));
                console.error('[MFA] Complete failed:', errorData);
                this.showError(errorData.message || 'Failed to complete login');
                this.isLoading = false;
                this.updateDisplay();
            }
        } catch (error) {
            console.error('[MFA] Completion error:', error);
            this.showError('Failed to complete login. Please try again.');
            this.isLoading = false;
            this.updateDisplay();
        }
    }

    async handleTOTPSubmit() {
        const codeInput = document.getElementById('mfa-totp-code');
        if (!codeInput) {
            return;
        }

        const code = codeInput.value.trim();
        if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
            this.showError('Please enter a valid 6-digit code');
            codeInput.focus();
            return;
        }

        this.isLoading = true;
        this.errorMessage = '';
        this.updateDisplay();

        const success = await this.verifyTOTPCode(code);
        if (!success) {
            this.isLoading = false;
            codeInput.value = '';
            codeInput.focus();
            this.updateDisplay();
        }
    }

    showError(message) {
        this.errorMessage = message;
        this.updateDisplay();
    }

    togglePasswordVisibility(fieldId = 'password') {
        const passwordInput = document.getElementById(fieldId);
        let toggleIcon;

        if (fieldId === 'password') {
            toggleIcon = document.getElementById('password-toggle-icon');
        } else if (fieldId === 'setup-password') {
            toggleIcon = document.getElementById('setup-password-toggle-icon');
        } else if (fieldId === 'setup-password-confirm') {
            toggleIcon = document.getElementById('setup-password-confirm-toggle-icon');
        }

        if (passwordInput && toggleIcon) {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleIcon.classList.remove('fa-eye');
                toggleIcon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                toggleIcon.classList.remove('fa-eye-slash');
                toggleIcon.classList.add('fa-eye');
            }
        }
    }

    updateDisplay() {
        const content = document.getElementById('page-content');
        if (content) {
            this.render().then(html => {
                content.innerHTML = html;
                this.mount();
            });
        }
    }

    cleanup() {
        // Stop MFA polling if active
        if (this.mfaPollInterval) {
            clearInterval(this.mfaPollInterval);
            this.mfaPollInterval = null;
        }
        // Reset MFA state
        this.mfaStep = 'none';
        this.tempToken = '';
        this.mfaRequestId = null;
        this.mfaExpiresIn = 0;
        // Clear temp token from localStorage
        localStorage.removeItem('mfa_temp_token');
    }
}



