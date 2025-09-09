// public/login.js - CLEAN SERVER-SIDE AUTHENTICATION ONLY
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginFormElement') || document.querySelector('form');
  const emailInput = document.getElementById('email') || document.querySelector('input[type="email"]');
  const passwordInput = document.getElementById('password') || document.querySelector('input[type="password"]');
  const errBox = document.getElementById('errorMessage') || document.getElementById('errorBox');

  const showError = (m) => { 
    if (errBox) { 
      errBox.textContent = m; 
      errBox.style.display = 'block'; 
      errBox.classList.remove('hidden');
    } 
  };

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();                                  // ← important
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      return showError('Please enter email and password');
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.success && data.redirect) {
          window.location.assign(data.redirect);           // ← do the page navigation
          return;
        }
      }

      // error UI
      const err = await res.json().catch(() => ({}));
      showError(err.error || 'Login failed');
    } catch (error) {
      console.error('Login error:', error);
      showError('Network error. Please try again.');
    }
  });
});