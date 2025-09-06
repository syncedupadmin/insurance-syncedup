// Authentication utilities for client-side
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop().split(';').shift();
    }
    return null;
}

function getUser() {
    const userCookie = getCookie('user');
    if (userCookie) {
        try {
            return JSON.parse(decodeURIComponent(userCookie));
        } catch (e) {
            return null;
        }
    }
    return null;
}

function isAuthenticated() {
    return getCookie('token') !== null;
}

async function logout() {
    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Logout error:', error);
    }
    window.location.href = '/login';
}

// Check authentication and redirect if not authenticated
function checkAuth(requiredRole = null) {
    if (!isAuthenticated()) {
        window.location.href = '/login';
        return false;
    }
    
    if (requiredRole) {
        const user = getUser();
        if (!user || user.role !== requiredRole) {
            if (requiredRole === 'admin') {
                alert('Admin access required');
                window.location.href = '/';
            } else {
                window.location.href = '/login';
            }
            return false;
        }
    }
    
    return true;
}