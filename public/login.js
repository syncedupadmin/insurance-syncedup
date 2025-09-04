// Minimal login handler: store token, then redirect by role
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginFormElement') || document.querySelector('form');

  function portalForRole(role) {
    switch (role) {
      case 'super-admin': return '/super-admin/';
      case 'admin': return '/admin/';
      case 'manager': return '/manager/';
      case 'agent': return '/agent/';
      case 'customer-service': return '/customer-service/';
      default: return '/admin/';
    }
  }

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email')?.value?.trim();
    const password = document.getElementById('password')?.value || '';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok || !data?.success || !data?.token || !data?.user?.role) {
        throw new Error(data?.error || `Login failed (${res.status})`);
      }

      // Persist auth data synchronously
      localStorage.setItem('syncedup_token', data.token);
      localStorage.setItem('syncedup_user', JSON.stringify(data.user));

      // brief heartbeat; localStorage is sync but let the UI breathe
      setTimeout(() => {
        window.location.replace(portalForRole(data.user.role));
      }, 80);
    } catch (err) {
      console.error('Login error:', err);
      alert('Login failed. ' + (err?.message || 'Please try again.'));
    }
  });
});