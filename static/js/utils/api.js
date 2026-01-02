// API utility for making authenticated requests
import { logger } from './logger.js';

class API {
    constructor() {
        this.apiKey = null;
        this.loadAPIKey();
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
     * Extracts session ID from JWT token
     */
    getSessionIdFromToken(token) {
        if (!token) return null;
        
        try {
            const cleanToken = this.extractJWTToken(token);
            if (!cleanToken) return null;
            
            // Decode JWT payload (second part)
            const parts = cleanToken.split('.');
            if (parts.length < 2) return null;
            
            const payload = JSON.parse(atob(parts[1]));
            return payload.sessionId || null;
        } catch (e) {
            return null;
        }
    }
    
    async loadAPIKey(skipRedirect = false) {
        logger.debug('[API Utility] loadAPIKey() called');
        // Get JWT token from localStorage (only storage we use)
        let token = localStorage.getItem('jwt_token');
        
        // If found, extract clean JWT token
        if (token) {
            logger.debug('[API Utility] Token found');
            
            // Extract clean JWT token (handles cases with extra characters like "eeyJ...")
            const cleanToken = this.extractJWTToken(token);
            
            if (cleanToken) {
                logger.debug('[API Utility] Extracted clean JWT token');
                
                // Basic expiration check (full validation happens with API)
                try {
                    const payload = JSON.parse(atob(cleanToken.split('.')[1]));
                    const exp = payload.exp * 1000; // Convert to milliseconds
                    const now = Date.now();
                    const timeUntilExpiry = exp - now;
                    
                    logger.debug('[API Utility] JWT token detected');
                    logger.debug('[API Utility] Token expires at:', new Date(exp).toISOString());
                    logger.debug('[API Utility] Time until expiry:', Math.round(timeUntilExpiry / 1000), 'seconds');
                    
                    // Check if expired (with 1 minute buffer for clock skew)
                    if (exp < (now + 60000)) {
                        logger.debug('[API Utility] Token expired - clearing auth');
                        // Token expired, clear it
                        this.clearAuth();
                        // Only redirect if not during init (skipRedirect = false means allow redirect)
                        if (!skipRedirect) {
                            logger.debug('[API Utility] Redirecting to login...');
                            this.redirectToLogin();
                        }
                        return;
                    }
                    
                    // Token format is valid - store clean version
                    // Update localStorage if token was cleaned
                    if (cleanToken !== token) {
                        logger.debug('[API Utility] Cleaning token in localStorage...');
                        localStorage.setItem('jwt_token', cleanToken);
                    }
                    
                    logger.debug('[API Utility] Token format valid - setting apiKey');
                    this.apiKey = cleanToken;
                    return;
                } catch (e) {
                    logger.error('[API Utility] Invalid token format - clearing auth');
                    // Invalid token format, clear it
                    this.clearAuth();
                    // Only redirect if not during init
                    if (!skipRedirect) {
                        logger.debug('[API Utility] Redirecting to login...');
                        this.redirectToLogin();
                    }
                    return;
                }
            } else {
                // Legacy API key - still valid
                logger.debug('[API Utility] Legacy API key found - valid - setting apiKey');
                this.apiKey = token;
                return;
            }
        }
        
        // No token found
        logger.debug('[API Utility] No token found in localStorage');
        this.apiKey = null;
    }
    
    clearAuth() {
        localStorage.removeItem('jwt_token');
        this.apiKey = null;
    }
    
    redirectToLogin() {
        // Clear authentication state first
        this.clearAuth();
        
        // Redirect to login if app instance is available
        if (window.appInstance) {
            window.appInstance.setAuthenticated(false);
            // Use setTimeout to ensure this happens after current execution
            setTimeout(() => {
                if (window.appInstance) {
                    window.appInstance.showLogin();
                }
            }, 0);
        }
        // If app not initialized yet, init() will detect missing auth and show login
    }

    getHeaders(customHeaders = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...customHeaders
        };
        
        // Add session ID from JWT token if available
        if (this.apiKey) {
            const sessionId = this.getSessionIdFromToken(this.apiKey);
            if (sessionId) {
                headers['X-Session-ID'] = sessionId;
            }
        }
        
        if (this.apiKey) {
            // Use JWT token in Authorization header
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }
        
        return headers;
    }

    /**
     * Validates the current token and returns true if valid
     */
    validateToken() {
        logger.debug('[API Utility] validateToken() called');
        if (!this.apiKey) {
            logger.debug('[API Utility] No apiKey set');
            return false;
        }
        
        // Check if it's a JWT token (starts with eyJ)
        if (this.apiKey.startsWith('eyJ')) {
            try {
                const payload = JSON.parse(atob(this.apiKey.split('.')[1]));
                const exp = payload.exp * 1000; // Convert to milliseconds
                const now = Date.now();
                const timeUntilExpiry = exp - now;
                
                logger.debug('[API Utility] JWT token detected');
                logger.debug('[API Utility] Token expires at:', new Date(exp).toISOString());
                logger.debug('[API Utility] Time until expiry:', Math.round(timeUntilExpiry / 1000), 'seconds');
                
                // Check if expired (with 1 minute buffer for clock skew)
                if (exp < (now + 60000)) {
                    logger.debug('[API Utility] Token expired');
                    // Token expired
                    return false;
                }
                
                logger.debug('[API Utility] Token is valid');
                // Token is valid
                return true;
            } catch (e) {
                logger.error('[API Utility] Invalid token format');
                // Invalid token format
                return false;
            }
        }
        
        // Legacy API key - still valid
        logger.debug('[API Utility] Legacy API key - valid');
        return true;
    }
    
    async fetch(url, options = {}) {
        // Validate token before making any request
        if (!this.validateToken()) {
            // Token is invalid/expired
            this.clearAuth();
            this.redirectToLogin();
            
            // Return a 401 response
            return new Response(JSON.stringify({ error: 'Token expired or invalid' }), {
                status: 401,
                statusText: 'Unauthorized',
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Ensure API key is loaded
        if (!this.apiKey) {
            await this.loadAPIKey();
        }
        
        // Validate again after loading
        if (!this.validateToken()) {
            this.clearAuth();
            this.redirectToLogin();
            return new Response(JSON.stringify({ error: 'Token expired or invalid' }), {
                status: 401,
                statusText: 'Unauthorized',
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const headers = this.getHeaders(options.headers);
        
        let response;
        try {
            // Create timeout controller for browsers that don't support AbortSignal.timeout
            let timeoutId;
            const controller = new AbortController();
            const timeout = 10000; // 10 seconds
            
            if (AbortSignal.timeout) {
                // Use native timeout if available
                response = await fetch(url, {
                    ...options,
                    headers,
                    signal: AbortSignal.timeout(timeout)
                });
            } else {
                // Fallback for older browsers
                timeoutId = setTimeout(() => controller.abort(), timeout);
                response = await fetch(url, {
                    ...options,
                    headers,
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
            }
        } catch (error) {
            // Network error or timeout - don't treat as auth failure
            if (error.name === 'AbortError' || error.name === 'TypeError' || 
                error.message?.includes('Failed to fetch') || 
                error.message?.includes('NetworkError')) {
                logger.warn('[API] Network error or timeout - not treating as auth failure');
                // Return a response that indicates network error but don't logout
                return new Response(JSON.stringify({ error: 'Network error' }), {
                    status: 0, // Status 0 indicates network error
                    statusText: 'Network Error',
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            // Re-throw other errors
            throw error;
        }

        // If unauthorized, token might be expired - clear it and require re-login
        // But only if we're not in the initial load phase (race condition protection)
        if (response.status === 401 && !options._retried) {
            // Check if we're in initial load phase (first 3 seconds after page load)
            const isInitialLoad = (Date.now() - (window.pageLoadTime || 0)) < 3000;
            
            // Also check if this is a network error (response might be from a failed fetch)
            const isNetworkError = !response.ok && (response.status === 0 || response.status === undefined);
            
            if (!isInitialLoad && !isNetworkError) {
                // Not initial load and not network error - token is likely expired
                this.clearAuth();
                this.redirectToLogin();
            } else {
                // Initial load or network error - might be race condition or network issue
                // Just return the response, let the caller handle retry logic
                logger.debug('[API] 401 during initial load or network error - might be race condition');
            }
            
            // Don't retry - user needs to login again (or caller will retry)
            return response;
        }

        return response;
    }

    async get(url, options = {}) {
        return this.fetch(url, {
            ...options,
            method: 'GET'
        });
    }

    async post(url, data, options = {}) {
        return this.fetch(url, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(url, data, options = {}) {
        return this.fetch(url, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async delete(url, options = {}) {
        return this.fetch(url, {
            ...options,
            method: 'DELETE'
        });
    }
}

// Export singleton instance
export const api = new API();






