// Authentication handled by auth-check.js via cookies
// This file kept for backward compatibility but uses cookie-based auth

// Logout function
function logout() {
    // Call server logout endpoint
    fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
    }).finally(() => {
        window.location.href = '/login.html';
    });
}

// Legacy exports for compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { logout };
}