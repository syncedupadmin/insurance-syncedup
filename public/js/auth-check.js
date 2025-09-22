// public/js/auth-check.js
(function () {
  const VERIFY_URL = '/api/auth/verify';
  const LOGIN_URL  = '/login?next=' + encodeURIComponent(location.pathname + location.search);
  let unloading = false;
  window.addEventListener('beforeunload', () => { unloading = true; });

  async function verifyOnce(controller) {
    const res = await fetch(VERIFY_URL, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Accept': 'application/json' },
      signal: controller?.signal
    });
    if (res.status === 401) return { ok: false, status: 401 };
    if (!res.ok) return { ok: false, status: res.status, transient: true };
    const data = await res.json().catch(() => null);
    return { ok: !!(data && (data.ok || data.authenticated)), status: 200, data };
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
      if (r.status === 401) { location.href = LOGIN_URL; return false; }
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
        console.log('[AUTH-CHECK] getCurrentUser returning:', r.data.user);
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
  document.addEventListener('DOMContentLoaded', () => { requireAuth(); });
})();