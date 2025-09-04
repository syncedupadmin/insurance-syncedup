// SIMPLE, ONE-RUN-PER-LOAD AUTH CHECK (no CSS overlays)
window.authCompleted = false;

async function checkAuth() {
  if (window.authCompleted) return;                     // no duplicate runs on same load
  if (window.location.pathname.includes('/login')) return; // skip on login page

  const token =
    localStorage.getItem('syncedup_token') ||
    sessionStorage.getItem('syncedup_token') ||
    localStorage.getItem('token'); // legacy fallback

  if (!token) {
    window.authCompleted = true;
    window.location.replace('/login.html');
    return;
  }

  try {
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.status === 401 || res.status === 403) throw new Error('unauthorized');
    if (!res.ok) throw new Error(`verify ${res.status}`);

    const data = await res.json();
    if (!data?.valid || !data?.user?.role) throw new Error('invalid verify payload');

    const roleToPath = {
      'super-admin': '/super-admin/',
      admin: '/admin/',
      manager: '/manager/',
      agent: '/agent/',
      'customer-service': '/customer-service/'
    };

    const targetPath = roleToPath[data.user.role];
    if (!targetPath) throw new Error('unknown-role');

    localStorage.setItem('syncedup_user', JSON.stringify(data.user));

    if (!window.location.pathname.startsWith(targetPath)) {
      window.authCompleted = true;
      window.location.replace(targetPath);
      return;
    }

    window.authCompleted = true; // success
  } catch (_) {
    try { localStorage.clear(); sessionStorage.clear(); } catch {}
    window.authCompleted = true;
    window.location.replace('/login.html');
  }
}

if (!window.location.pathname.includes('/login')) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuth);
  } else {
    checkAuth();
  }
}

// Optional helper
async function logout() {
  try {
    const token =
      localStorage.getItem('syncedup_token') ||
      localStorage.getItem('token') ||
      sessionStorage.getItem('syncedup_token');
    if (token) {
      await fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    }
  } catch {}
  try { localStorage.clear(); sessionStorage.clear(); } catch {}
  window.location.replace('/login.html');
}