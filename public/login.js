// public/login.js
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginFormElement') || document.querySelector('form');
  const emailInput = document.getElementById('email') || document.querySelector('input[type="email"]');
  const passInput  = document.getElementById('password') || document.querySelector('input[type="password"]');
  const errBox = document.getElementById('errorBox');

  const showError = (m) => { if (errBox) { errBox.textContent = m; errBox.style.display = 'block'; } };

  async function doLogin(e) {
    e?.preventDefault();
    const email = (emailInput?.value || '').trim();
    const password = (passInput?.value || '').trim();
    if (!email || !password) return showError('Please enter email and password.');

    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return showError(data?.error || 'Login failed');

    // Store credentials BEFORE redirect
    localStorage.setItem('syncedup_token', data.token || '');
    localStorage.setItem('syncedup_user', JSON.stringify(data.user || {}));

    // Normalize role variants
    const normalizeRole = r => ({
      'super-admin': 'super_admin',
      'customer-service': 'customer_service'
    }[r] || r);

    // Role to page mapping - clean URLs (no .html)
    const targetFor = {
      super_admin: '/super-admin',
      admin: '/admin',
      manager: '/manager',
      agent: '/agent',
      customer_service: '/customer-service'
    };

    const role = normalizeRole(String(data?.user?.role || '').toLowerCase().replace('-', '_'));
    const targetUrl = targetFor[role] || '/dashboard';
    
    location.href = targetUrl;
  }

  form?.addEventListener('submit', doLogin);
});