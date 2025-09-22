// Authentication check using HTTP-only cookies
window.authCompleted = false;

async function checkAuth() {
  if (window.authCompleted) return;
  if (window.location.pathname.includes('/login')) return;

  try {
    const response = await fetch('/api/auth/verify', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();

    if (!data.ok || !data.user) {
      window.authCompleted = true;
      window.location.replace('/login.html');
      return;
    }
    
    // Check role-based access
    const currentPath = window.location.pathname;
    const userRole = data.user.role;
    
    const roleToPath = {
      'super-admin': '/super-admin/',
      'admin': '/admin/',
      'manager': '/manager/',
      'agent': '/agent/',
      'customer-service': '/customer-service/'
    };

    const targetPath = roleToPath[userRole];
    if (!targetPath) {
      window.authCompleted = true;
      window.location.replace('/login.html');
      return;
    }

    // Allow access to leaderboard for all authenticated users
    if (window.location.pathname.startsWith('/leaderboard/')) {
      window.currentUser = data.user;
      window.authCompleted = true;
      return;
    }

    if (!currentPath.startsWith(targetPath)) {
      window.authCompleted = true;
      window.location.replace(targetPath);
      return;
    }

    // Store minimal user data for UI use
    window.currentUser = data.user;
    window.authCompleted = true;
    
  } catch (error) {
    console.error('Auth check failed:', error);
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

// Logout helper that clears HTTP-only cookie
async function logout() {
  try {
    await fetch('/api/auth/logout', { 
      method: 'POST', 
      credentials: 'include' 
    });
  } catch {}
  window.location.replace('/login.html');
}