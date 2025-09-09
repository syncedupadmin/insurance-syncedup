/**
 * Universal Authentication Helper for SyncedUp Insurance Portal
 * Provides cookie-based authentication functions for all portal pages
 * 
 * CRITICAL: This replaces localStorage-based authentication
 * Uses cookies with credentials: 'include' for server-side authentication
 */

const SyncedUpAuth = {
    
    /**
     * Get current authenticated user data from server
     * @returns {Promise<Object|null>} User object or null if not authenticated
     */
    async getCurrentUser() {
        try {
            const response = await fetch('/api/auth/verify', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                return result.user || null;
            } else if (response.status === 401) {
                console.warn('Authentication expired');
                return null;
            } else {
                console.error('Auth verify failed:', response.status, response.statusText);
                return null;
            }
        } catch (error) {
            console.error('Error verifying authentication:', error);
            return null;
        }
    },

    /**
     * Check if user is currently authenticated
     * @returns {Promise<boolean>} True if authenticated, false otherwise
     */
    async checkAuth() {
        const user = await this.getCurrentUser();
        return user !== null;
    },

    /**
     * Get auth token from cookies (fallback for legacy API calls)
     * @returns {string|null} Auth token or null
     */
    getAuthToken() {
        const getCookie = (name) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
            return null;
        };
        return getCookie('auth_token');
    },

    /**
     * Get user role from cookies (fallback)
     * @returns {string} User role
     */
    getUserRole() {
        const getCookie = (name) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
            return null;
        };
        return getCookie('user_role') || getCookie('assumed_role') || 'agent';
    },

    /**
     * Perform authenticated API request
     * @param {string} url - API endpoint URL
     * @param {Object} options - Fetch options
     * @returns {Promise<Response>} Fetch response
     */
    async authenticatedFetch(url, options = {}) {
        const defaultOptions = {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };
        
        // Merge options
        const fetchOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };
        
        try {
            const response = await fetch(url, fetchOptions);
            
            // If unauthorized, don't try to handle redirect - let portal-guard do it
            if (response.status === 401) {
                console.warn('API request unauthorized - session may be expired');
            }
            
            return response;
        } catch (error) {
            console.error('Authenticated fetch failed:', error);
            throw error;
        }
    },

    /**
     * Logout user and redirect to login page
     */
    async logout() {
        try {
            // Call logout API to clear server-side session
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.warn('Logout API call failed:', error);
        }
        
        // Clear client-side cookies
        const cookiesToClear = ['auth_token', 'user_role', 'user_roles', 'assumed_role'];
        cookiesToClear.forEach(cookieName => {
            document.cookie = `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
        });
        
        // Clear any localStorage data that might exist (cleanup)
        try {
            localStorage.removeItem('syncedup_token');
            localStorage.removeItem('syncedup_user');
        } catch (error) {
            // Ignore localStorage errors
        }
        
        // Redirect to login
        window.location.href = '/login';
    },

    /**
     * Initialize authentication for a portal page
     * Call this in DOMContentLoaded to set up authentication
     * @param {Object} options - Configuration options
     * @param {boolean} options.requireAuth - Whether to redirect if not authenticated (default: true)
     * @param {string} options.userDisplayElementId - ID of element to display user info
     */
    async initializeAuth(options = {}) {
        const config = {
            requireAuth: true,
            userDisplayElementId: null,
            ...options
        };
        
        try {
            const user = await this.getCurrentUser();
            
            if (!user && config.requireAuth) {
                // Don't redirect manually - let portal-guard handle this
                // The server-side portal-guard.js will handle authentication
                console.warn('No user found - portal-guard should handle authentication');
                return null;
            }
            
            // Update user display if element provided
            if (config.userDisplayElementId && user) {
                const displayElement = document.getElementById(config.userDisplayElementId);
                if (displayElement) {
                    const displayName = user.name || user.email || user.username || 'User';
                    const role = user.role || this.getUserRole();
                    displayElement.textContent = `${displayName} (${role})`;
                }
            }
            
            return user;
        } catch (error) {
            console.error('Failed to initialize authentication:', error);
            return null;
        }
    },

    /**
     * Legacy compatibility: Safe update element function
     * @param {string} id - Element ID
     * @param {string} value - Value to set
     * @param {string} fallback - Fallback value if value is empty
     */
    safeUpdateElement(id, value, fallback = '') {
        try {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value || fallback;
            }
        } catch (error) {
            console.warn(`Failed to update element ${id}:`, error);
        }
    },

    /**
     * Safe authenticated fetch with error handling and fallbacks
     * @param {string} url - API endpoint URL
     * @param {Object} options - Fetch options
     * @returns {Promise<Object|null>} JSON response data or null if failed
     */
    async safeFetch(url, options = {}) {
        try {
            const response = await this.authenticatedFetch(url, options);
            
            if (!response.ok) {
                console.warn(`API fetch failed for ${url}: ${response.status} ${response.statusText}`);
                return null;
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.warn(`Safe fetch failed for ${url}:`, error.message);
            return null;
        }
    }
};

// Global alias for backward compatibility
window.SyncedUpAuth = SyncedUpAuth;

// Legacy global functions for backward compatibility
window.getCurrentUser = () => SyncedUpAuth.getCurrentUser();
window.checkAuth = () => SyncedUpAuth.checkAuth();
window.logout = () => SyncedUpAuth.logout();
window.authenticatedFetch = (url, options) => SyncedUpAuth.authenticatedFetch(url, options);
window.safeFetch = (url, options) => SyncedUpAuth.safeFetch(url, options);
window.safeUpdateElement = (id, value, fallback) => SyncedUpAuth.safeUpdateElement(id, value, fallback);

// Console message for developers
console.log('✅ SyncedUp Auth Helper loaded - Cookie-based authentication active');
console.log('📘 Use SyncedUpAuth.getCurrentUser(), SyncedUpAuth.checkAuth(), SyncedUpAuth.logout()');
console.log('⚠️  localStorage authentication has been replaced with cookie-based authentication');