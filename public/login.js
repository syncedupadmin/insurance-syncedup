// public/login.js
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginFormElement') || document.querySelector('form');
  const emailInput = document.getElementById('email') || document.querySelector('input[type="email"]');
  const passInput  = document.getElementById('password') || document.querySelector('input[type="password"]');
  const errBox = document.getElementById('errorBox');

  const showError = (m) => { if (errBox) { errBox.textContent = m; errBox.style.display = 'block'; } };

  // normalize role variants once
  const normalizeRole = r => (r || '')
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  // mapping to CLEAN URLs (no .html)
  const targetFor = {
    super_admin: '/super-admin',
    admin: '/admin',
    manager: '/manager',
    agent: '/agent',
    customer_service: '/customer-service', // Beautiful blue customer service portal
  };

  async function doLogin(e) {
    e?.preventDefault();
    const email = emailInput.value.trim();
    const password = passInput.value.trim();
    if (!email || !password) return showError('Please enter email and password');

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.user) {
      return showError(data?.error || 'Login failed');
    }

    // store and redirect
    localStorage.setItem('syncedup_token', data.token || '');
    localStorage.setItem('syncedup_user', JSON.stringify(data.user || {}));

    const role = normalizeRole(data.user.role);
    window.location.href = targetFor[role] || '/dashboard';
  }

  form?.addEventListener('submit', doLogin);
});