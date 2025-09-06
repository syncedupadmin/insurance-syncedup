// public/login.js
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginFormElement') || document.querySelector('form');
  const emailInput = document.getElementById('email') || document.querySelector('input[type="email"]');
  const passInput  = document.getElementById('password') || document.querySelector('input[type="password"]');
  const errBox = document.getElementById('errorBox');

  const showError = (m) => { if (errBox) { errBox.textContent = m; errBox.style.display = 'block'; } };

  // keep the same normalize helper as backend
  const normalizeRole = (r) => String(r || '')
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  const targetFor = {
    super_admin: '/super-admin',
    admin: '/admin',
    manager: '/manager',
    agent: '/agent',
    customer_service: '/customer-service'
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

    // ...after successful fetch of /api/auth/login
    const { token, user } = data;
    localStorage.setItem('syncedup_token', token);
    localStorage.setItem('syncedup_user', JSON.stringify(user));

    const role = normalizeRole(user.role);
    location.replace(targetFor[role] || '/dashboard');
  }

  form?.addEventListener('submit', doLogin);
});