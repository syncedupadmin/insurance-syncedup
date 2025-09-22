// public/js/auth-helper.js
// Single source of truth for authentication - cookie-based only
(function () {
  const API_VERIFY = '/api/auth/verify';

  let _userCache = null;
  let _pending = null;

  async function fetchJSON(url, opts = {}) {
    const res = await fetch(url, {
      method: 'GET',
      credentials: 'include',        // send cookies or nothing works
      headers: { 'Accept': 'application/json' },
      ...opts
    });
    // Normalize 401 handling so callers can redirect
    if (res.status === 401) {
      const body = await safeJSON(res);
      const err = new Error('Unauthorized');
      err.status = 401;
      err.body = body;
      throw err;
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(`HTTP ${res.status}: ${text}`);
      err.status = res.status;
      throw err;
    }
    return safeJSON(res);
  }

  async function safeJSON(res) {
    try { return await res.json(); } catch { return null; }
  }

  async function getCurrentUser(force = false) {
    if (!force && _userCache) return _userCache;
    if (_pending && !force) return _pending;

    _pending = fetchJSON(API_VERIFY)
      .then(data => {
        // Expected shape: { ok: true, user: { id, email, role, ... } }
        if (!data || !data.ok || !data.user) {
          const err = new Error('Invalid verify response');
          err.status = 401;
          throw err;
        }
        _userCache = data.user;
        return _userCache;
      })
      .finally(() => { _pending = null; });

    return _pending;
  }

  async function requireAuth(opts = {}) {
    const { role, redirectTo = '/login' } = opts || {};
    try {
      const user = await getCurrentUser();
      if (role && !hasRole(user, role)) {
        // Logged in but wrong role, bounce to login or a 403 page if you have one
        window.location.href = redirectTo;
        return false;
      }
      return true;
    } catch (err) {
      if (err && err.status === 401) {
        window.location.href = redirectTo;
        return false;
      }
      // Unexpected error, fail safe to login
      console.error('Auth check failed:', err);
      window.location.href = redirectTo;
      return false;
    }
  }

  function hasRole(user, role) {
    if (!user) return false;
    // Accept 'role' string or 'roles' array from backend
    if (Array.isArray(user.roles)) return user.roles.includes(role);
    if (typeof user.role === 'string') return user.role === role;
    return false;
  }

  async function logout() {
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

    // Redirect to login
    window.location.href = '/login';
  }

  // Backward compatibility wrapper for authenticatedFetch
  async function authenticatedFetch(url, options = {}) {
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

    return fetch(url, fetchOptions);
  }

  // Check if user is authenticated (simple boolean check)
  async function checkAuth() {
    try {
      const user = await getCurrentUser();
      return user !== null;
    } catch {
      return false;
    }
  }

  // Initialize authentication for a portal page (backward compatibility)
  async function initializeAuth(options = {}) {
    const config = {
      requireAuth: true,
      userDisplayElementId: null,
      ...options
    };

    try {
      const user = await getCurrentUser();

      if (!user && config.requireAuth) {
        // Don't redirect here - let requireAuth handle it
        console.warn('No user found - authentication required');
        return null;
      }

      // Update user display if element provided
      if (config.userDisplayElementId && user) {
        const displayElement = document.getElementById(config.userDisplayElementId);
        if (displayElement) {
          const displayName = user.name || user.email || user.username || 'User';
          const role = user.role || 'agent';
          displayElement.textContent = `${displayName} (${role})`;
        }
      }

      return user;
    } catch (error) {
      console.error('Failed to initialize authentication:', error);
      return null;
    }
  }

  window.SyncedUpAuth = {
    getCurrentUser,
    requireAuth,
    logout,
    checkAuth,
    authenticatedFetch,
    initializeAuth,
    refresh: () => getCurrentUser(true),
    // Utility function for safe element updates
    safeUpdateElement: (id, value, fallback = '') => {
      try {
        const element = document.getElementById(id);
        if (element) {
          element.textContent = value || fallback;
        }
      } catch (error) {
        console.warn(`Failed to update element ${id}:`, error);
      }
    }
  };

  // Legacy global functions for backward compatibility
  window.getCurrentUser = () => getCurrentUser();
  window.checkAuth = () => checkAuth();
  window.logout = () => logout();
  window.authenticatedFetch = (url, options) => authenticatedFetch(url, options);

  console.log('✅ SyncedUp Auth Helper loaded - Cookie-based authentication active');
})();