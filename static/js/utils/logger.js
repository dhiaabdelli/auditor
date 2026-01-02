/**
 * Secure logging utility that sanitizes sensitive data before logging
 * Logging is disabled in production environments (non-localhost)
 */

// Logger disabled temporarily for debugging
const LOGGER_DISABLED = true;

// Check if we're in a development environment
const isDevelopment = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' ||
                      window.location.hostname === '';

/**
 * Sanitizes sensitive data from strings
 * Removes tokens, API keys, passwords, etc.
 */
function sanitize(data) {
    if (typeof data !== 'string') {
        data = String(data);
    }
    
    // Patterns to sanitize
    const patterns = [
        // JWT tokens (eyJ...)
        /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g,
        // API keys (long base64-like strings)
        /[A-Za-z0-9_-]{32,}/g,
        // Passwords (common patterns)
        /password["\s:=]+[^\s"']+/gi,
        // Tokens
        /token["\s:=]+[^\s"']+/gi,
        // Secrets
        /secret["\s:=]+[^\s"']+/gi,
    ];
    
    let sanitized = data;
    patterns.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '[REDACTED]');
    });
    
    return sanitized;
}

/**
 * Logs debug messages (only in development)
 */
export function debug(...args) {
    if (LOGGER_DISABLED || !isDevelopment) return;
    
    const sanitizedArgs = args.map(arg => {
        if (typeof arg === 'string') {
            return sanitize(arg);
        }
        if (typeof arg === 'object' && arg !== null) {
            try {
                return sanitize(JSON.stringify(arg));
            } catch (e) {
                return '[Object]';
            }
        }
        return arg;
    });
    
    console.log(...sanitizedArgs);
}

/**
 * Logs info messages (only in development)
 */
export function info(...args) {
    if (LOGGER_DISABLED || !isDevelopment) return;
    
    const sanitizedArgs = args.map(arg => {
        if (typeof arg === 'string') {
            return sanitize(arg);
        }
        if (typeof arg === 'object' && arg !== null) {
            try {
                return sanitize(JSON.stringify(arg));
            } catch (e) {
                return '[Object]';
            }
        }
        return arg;
    });
    
    console.info(...sanitizedArgs);
}

/**
 * Logs warning messages (always enabled)
 */
export function warn(...args) {
    if (LOGGER_DISABLED) return;
    
    const sanitizedArgs = args.map(arg => {
        if (typeof arg === 'string') {
            return sanitize(arg);
        }
        if (typeof arg === 'object' && arg !== null) {
            try {
                return sanitize(JSON.stringify(arg));
            } catch (e) {
                return '[Object]';
            }
        }
        return arg;
    });
    
    console.warn(...sanitizedArgs);
}

/**
 * Logs error messages (always enabled)
 */
export function error(...args) {
    if (LOGGER_DISABLED) return;
    
    const sanitizedArgs = args.map(arg => {
        if (typeof arg === 'string') {
            return sanitize(arg);
        }
        if (typeof arg === 'object' && arg !== null) {
            try {
                return sanitize(JSON.stringify(arg));
            } catch (e) {
                return '[Object]';
            }
        }
        return arg;
    });
    
    console.error(...sanitizedArgs);
}

/**
 * Sanitize function for external use
 */
export { sanitize };

/**
 * Default logger object with all methods
 */
export const logger = {
    debug,
    info,
    warn,
    error,
    sanitize
};
