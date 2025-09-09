// public/login.js - CLEAN SERVER-SIDE AUTHENTICATION ONLY
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginFormElement') || document.querySelector('form');
  const emailInput = document.getElementById('email') || document.querySelector('input[type="email"]');
  const passInput  = document.getElementById('password') || document.querySelector('input[type="password"]');
  const errBox = document.getElementById('errorBox');

  const showError = (m) => { if (errBox) { errBox.textContent = m; errBox.style.display = 'block'; } };

  async function doLogin(e) {
    e?.preventDefault();
    const email = emailInput.value.trim();
    const password = passInput.value.trim();
    if (!email || !password) return showError('Please enter email and password');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
        // IMPORTANT: don't auto-follow, so we can read Location and navigate
        redirect: 'manual'
      });

      // If server sends 3xx, grab Location and navigate the page
      const loc = res.headers.get('Location');
      if (res.status >= 300 && res.status < 400 && loc) {
        window.location.assign(loc);
        return;
      }

      // Some browsers still set redirected+final url — handle just in case
      if (res.redirected && res.url) {
        window.location.assign(res.url);
        return;
      }

      // If we get here, there was an error (server didn't redirect)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return showError(errorData?.error || 'Login failed');
      }

      // Fallback - shouldn't reach here with proper server redirects
      window.location.href = '/admin'; 
      
    } catch (error) {
      console.error('Login error:', error);
      showError('Network error. Please try again.');
    }
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();                             // ← don't let the form reload the page
    await doLogin(e);
  });
});