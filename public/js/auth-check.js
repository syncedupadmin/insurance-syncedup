// public/js/auth-check.js
(function () {
  // Debounce guard to prevent duplicate runs
  if (window.__authGuardRan) return;
  window.__authGuardRan = true;

  const VERIFY_URL = '/api/auth/verify';
  const LOGIN_URL  = '/login?next=' + encodeURIComponent(location.pathname + location.search);
  let unloading = false;
  window.addEventListener('beforeunload', () => { unloading = true; });

  async function verifyOnce(controller) {
    const res = await fetch(VERIFY_URL, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Accept': 'application/json' },
      signal: controller?.signal
    });
    if (res.status === 401) return { ok: false, status: 401 };
    if (!res.ok) return { ok: false, status: res.status, transient: true };
    const data = await res.json().catch(() => null);
    return { ok: !!(data && data.ok), status: 200, data };
  }

  async function requireAuth(opts = {}) {
    const { role } = opts || {};
    const ac = new AbortController();
    try {
      let r = await verifyOnce(ac);
      if (!r.ok && r.transient) {
        await new Promise(res => setTimeout(res, 150));
        r = await verifyOnce(ac);
      }
      if (r.ok) {
        if (role && r.data?.user) {
          const roles = r.data.user.roles || (r.data.user.role ? [r.data.user.role] : []);
          if (!roles.includes(role)) {
            location.href = '/login?unauthorized=1';
            return false;
          }
        }
        return true;
      }
      // ONLY redirect on 401 from verify
      if (r.status === 401) {
        location.href = LOGIN_URL;
        return false;
      }
      return true;
    } catch (err) {
      if (unloading || (err && err.name === 'AbortError')) return true;
      return true;
    }
  }

  // getCurrentUser function for compatibility
  async function getCurrentUser() {
    const ac = new AbortController();
    try {
      const r = await verifyOnce(ac);
      if (r.ok && r.data?.user) {
        return r.data.user;
      }
      return null;
    } catch (err) {
      console.error('[AUTH-CHECK] getCurrentUser error:', err);
      return null;
    }
  }

  window.SyncedUpAuth = window.SyncedUpAuth || {};
  window.SyncedUpAuth.requireAuth = requireAuth;
  window.SyncedUpAuth.getCurrentUser = getCurrentUser;

  // Script uses defer, so DOM is ready when this runs
  // Only run requireAuth if not on login page
  if (!window.location.pathname.includes('/login')) {
    // Check if we just came from login (don't re-check auth immediately)
    const cameFromLogin = document.referrer && document.referrer.includes('/login');
    const isAgentDashboard = window.location.pathname === '/agent' || window.location.pathname === '/agent/';

    if (cameFromLogin && isAgentDashboard) {
      console.log('[AUTH-CHECK] Skipping - just logged in to agent dashboard');
      return; // Skip auth check on fresh login
    }

    // Check if header is still initializing
    if (window._headerInitializing) {
      console.log('[AUTH-CHECK] Waiting for header to initialize...');
      // Wait for header to be ready before checking auth
      const waitForHeader = setInterval(() => {
        if (!window._headerInitializing || window._headerReady) {
          clearInterval(waitForHeader);
          console.log('[AUTH-CHECK] Header ready, checking auth now');
          requireAuth();
        }
      }, 100);

      // Timeout after 3 seconds
      setTimeout(() => {
        clearInterval(waitForHeader);
        requireAuth();
      }, 3000);
    } else {
      // Normal auth check with small delay to prevent race conditions
      setTimeout(() => {
        requireAuth();
      }, 100);
    }
  }
})();