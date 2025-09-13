// public/login.js - CLEAN SERVER-SIDE AUTHENTICATION ONLY
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginFormElement') || document.querySelector('form');
  const emailInput = document.getElementById('email') || document.querySelector('input[type="email"]');
  const passwordInput = document.getElementById('password') || document.querySelector('input[type="password"]');
  const errBox = document.getElementById('errorMessage') || document.getElementById('errorBox');

  // Password reset elements
  const loginForm = document.getElementById('loginForm');
  const resetForm = document.getElementById('resetForm');
  const resetFormElement = document.getElementById('resetFormElement');
  const resetEmailInput = document.getElementById('resetEmail');
  const resetMessage = document.getElementById('resetMessage');

  const showError = (m) => {
    if (errBox) {
      errBox.textContent = m;
      errBox.style.display = 'block';
      errBox.classList.remove('hidden');
    }
  };

  // Show/hide forms
  window.showResetForm = () => {
    if (loginForm) loginForm.classList.add('hidden');
    if (resetForm) resetForm.classList.remove('hidden');
    if (resetMessage) resetMessage.classList.add('hidden');
  };

  window.showLoginForm = () => {
    if (resetForm) resetForm.classList.add('hidden');
    if (loginForm) loginForm.classList.remove('hidden');
    if (errBox) errBox.classList.add('hidden');
  };

  // Handle login
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
          // Store token in localStorage for Edge Function access
          if (data.token) {
            localStorage.setItem('auth_token', data.token);
          }
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

  // Handle password reset
  resetFormElement?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = resetEmailInput.value.trim();

    if (!email) {
      if (resetMessage) {
        resetMessage.textContent = 'Please enter your email address';
        resetMessage.className = 'mt-4 p-3 bg-red-500/20 border border-red-500/50 text-white rounded-xl';
        resetMessage.classList.remove('hidden');
      }
      return;
    }

    // Show loading state
    const submitBtn = resetFormElement.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    }

    try {
      // For now, use the existing API endpoint
      // In production, this should call Supabase directly
      const res = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json().catch(() => ({}));

      // Always show success to prevent user enumeration
      if (resetMessage) {
        resetMessage.textContent = 'If an account exists with this email, you will receive password reset instructions.';
        resetMessage.className = 'mt-4 p-3 bg-green-500/20 border border-green-500/50 text-white rounded-xl';
        resetMessage.classList.remove('hidden');
      }

      // Clear form and return to login after delay
      resetEmailInput.value = '';
      setTimeout(() => {
        showLoginForm();
      }, 5000);

    } catch (error) {
      console.error('Reset error:', error);
      if (resetMessage) {
        resetMessage.textContent = 'An error occurred. Please try again later.';
        resetMessage.className = 'mt-4 p-3 bg-red-500/20 border border-red-500/50 text-white rounded-xl';
        resetMessage.classList.remove('hidden');
      }
    } finally {
      // Restore button
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText || 'Send Reset Instructions';
      }
    }
  });
});