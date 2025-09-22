// Portal API Shim - Global _api wrapper for fetch operations
(function() {
    'use strict';

    const API_BASE = '';  // Use relative URLs

    // Global _api object for backward compatibility
    window._api = {
        // GET request wrapper
        get: async function(endpoint, options = {}) {
            try {
                const response = await fetch(`${API_BASE}${endpoint}`, {
                    method: 'GET',
                    credentials: 'include',
                    cache: 'no-store',
                    headers: {
                        'Accept': 'application/json',
                        ...options.headers
                    },
                    ...options
                });

                if (!response.ok && response.status === 401) {
                    // Only redirect on 401 from verify endpoint
                    if (endpoint.includes('/auth/verify')) {
                        window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname);
                    }
                    throw new Error('Unauthorized');
                }

                const data = await response.json();
                return { ok: true, data };
            } catch (error) {
                console.error(`API GET ${endpoint} error:`, error);
                return { ok: false, error: error.message };
            }
        },

        // POST request wrapper
        post: async function(endpoint, body = {}, options = {}) {
            try {
                const response = await fetch(`${API_BASE}${endpoint}`, {
                    method: 'POST',
                    credentials: 'include',
                    cache: 'no-store',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        ...options.headers
                    },
                    body: JSON.stringify(body),
                    ...options
                });

                if (!response.ok && response.status === 401) {
                    if (endpoint.includes('/auth/verify')) {
                        window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname);
                    }
                    throw new Error('Unauthorized');
                }

                const data = await response.json();
                return { ok: true, data };
            } catch (error) {
                console.error(`API POST ${endpoint} error:`, error);
                return { ok: false, error: error.message };
            }
        },

        // PUT request wrapper
        put: async function(endpoint, body = {}, options = {}) {
            return this.post(endpoint, body, { ...options, method: 'PUT' });
        },

        // DELETE request wrapper
        delete: async function(endpoint, options = {}) {
            try {
                const response = await fetch(`${API_BASE}${endpoint}`, {
                    method: 'DELETE',
                    credentials: 'include',
                    cache: 'no-store',
                    headers: {
                        'Accept': 'application/json',
                        ...options.headers
                    },
                    ...options
                });

                if (!response.ok && response.status === 401) {
                    window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname);
                    throw new Error('Unauthorized');
                }

                const data = await response.json();
                return { ok: true, data };
            } catch (error) {
                console.error(`API DELETE ${endpoint} error:`, error);
                return { ok: false, error: error.message };
            }
        }
    };

    // Add shorthand methods for common endpoints
    window._api.auth = {
        verify: () => window._api.get('/api/auth/verify'),
        logout: () => window._api.post('/api/auth/logout'),
        me: () => window._api.get('/api/auth/me')
    };

    window._api.dashboard = {
        stats: () => window._api.get('/api/dashboard'),
        agents: () => window._api.get('/api/admin/agents'),
        leads: () => window._api.get('/api/admin/leads'),
        commissions: () => window._api.get('/api/commissions')
    };

    // Legacy support for direct fetch calls in existing code
    window._api.fetch = function(url, options = {}) {
        return fetch(url, {
            credentials: 'include',
            cache: 'no-store',
            ...options
        });
    };

    console.log('[Portal API] Initialized - window._api is ready');
})();