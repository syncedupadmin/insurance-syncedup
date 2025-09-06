// Form switching functions
function showResetForm() {
  document.getElementById('loginForm').classList.add('hidden');
  document.getElementById('resetForm').classList.remove('hidden');
}

function showLoginForm() {
  document.getElementById('resetForm').classList.add('hidden');
  document.getElementById('loginForm').classList.remove('hidden');
  document.getElementById('resetMessage').classList.add('hidden');
}

// Login and reset password handler
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginFormElement');
  const resetForm = document.getElementById('resetFormElement');


  // Login form handler
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('email')?.value?.trim();
      const password = document.getElementById('password')?.value || '';
      const errorDiv = document.getElementById('errorMessage');

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || `Login failed (${res.status})`);
        }

        // Server will set HTTP-only cookie, use redirect URL from server
        setTimeout(() => {
          window.location.replace(data.redirectUrl || '/admin/');
        }, 80);
      } catch (err) {
        console.error('Login error:', err);
        if (errorDiv) {
          errorDiv.textContent = err?.message || 'Login failed. Please try again.';
          errorDiv.classList.remove('hidden');
          setTimeout(() => errorDiv.classList.add('hidden'), 5000);
        } else {
          alert('Login failed. ' + (err?.message || 'Please try again.'));
        }
      }
    });
  }

  // Reset password form handler
  if (resetForm) {
    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('resetEmail').value.trim();
      const messageDiv = document.getElementById('resetMessage');
      
      if (!email) {
        if (messageDiv) {
          messageDiv.textContent = 'Please enter your email address';
          messageDiv.className = 'mt-4 p-3 bg-red-500/20 border border-red-500/50 text-white rounded-xl';
          messageDiv.classList.remove('hidden');
        }
        return;
      }

      try {
        const response = await fetch('/api/auth/request-reset', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          if (messageDiv) {
            messageDiv.textContent = data.message || "If an account exists with that email, we've sent reset instructions.";
            messageDiv.className = 'mt-4 p-3 bg-green-500/20 border border-green-500/50 text-white rounded-xl';
            messageDiv.classList.remove('hidden');
          }
          resetForm.reset();
        } else {
          if (messageDiv) {
            messageDiv.textContent = "If an account exists with that email, we've sent reset instructions.";
            messageDiv.className = 'mt-4 p-3 bg-green-500/20 border border-green-500/50 text-white rounded-xl';
            messageDiv.classList.remove('hidden');
          }
        }
      } catch (error) {
        console.error('Reset password error:', error);
        if (messageDiv) {
          messageDiv.textContent = 'Connection error. Please try again.';
          messageDiv.className = 'mt-4 p-3 bg-red-500/20 border border-red-500/50 text-white rounded-xl';
          messageDiv.classList.remove('hidden');
        }
      }
    });
  }
});

