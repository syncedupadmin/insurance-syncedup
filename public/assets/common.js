// Authentication check
const token = localStorage.getItem('syncedup_token') || localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('syncedup_user') || '{}');

if (!token) {
    window.location.href = '/login.html';
}

// Set user info
if (document.getElementById('agentName')) {
    document.getElementById('agentName').textContent = user.name || user.email;
}
if (document.getElementById('welcomeName')) {
    document.getElementById('welcomeName').textContent = user.name || 'Agent';
}

// Logout function
function logout() {
    localStorage.clear();
    window.location.href = '/login.html';
}

// API helper
async function apiCall(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    const response = await fetch(endpoint, options);
    return response.json();
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Format date
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US');
}