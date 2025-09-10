// Shared Navigation Component for Manager Portal
// This script creates a consistent navigation bar across all manager pages

function createManagerNavigation() {
    // Standard manager navigation structure
    const navItems = [
        { href: '/manager/', icon: 'layout-dashboard', text: 'Dashboard' },
        { href: '/manager/leads', icon: 'users', text: 'Leads' },
        { href: '/manager/team-management', icon: 'users', text: 'Team Management' },
        { href: '/manager/performance', icon: 'trending-up', text: 'Team Performance' },
        { href: '/manager/reports', icon: 'file-text', text: 'Reports' },
        { href: '/manager/goals', icon: 'target', text: 'Goals' },
        { href: '/manager/vendors', icon: 'building-2', text: 'Vendors' },
        { href: '/manager/settings', icon: 'settings', text: 'Settings' },
        { href: '/manager/convoso', icon: 'phone-call', text: 'Convoso' },
        { href: '/global-leaderboard', icon: 'trophy', text: 'Global Leaderboard' }
    ];

    // Create navigation HTML
    let navHTML = '<div class="nav">';
    
    const currentPath = window.location.pathname;
    
    navItems.forEach(item => {
        const isActive = currentPath === item.href || 
                        (item.href === '/manager/' && (currentPath === '/manager' || currentPath === '/manager/index.html')) ||
                        (item.href !== '/manager/' && currentPath.startsWith(item.href));
        
        navHTML += `
            <a href="${item.href}" class="nav-link ${isActive ? 'active' : ''}">
                <i data-lucide="${item.icon}" class="icon"></i>
                ${item.text}
            </a>
        `;
    });
    
    navHTML += '</div>';
    
    return navHTML;
}

function createManagerHeader(pageTitle) {
    return `
        <!-- Header -->
        <div class="header">
            <h1>${pageTitle}</h1>
            <div style="display: flex; align-items: center; gap: 1rem;">
                <span id="userDisplay">Loading...</span>
                <button class="btn" onclick="logout()">
                    <i data-lucide="log-out" class="icon"></i>
                    Logout
                </button>
            </div>
        </div>
    `;
}

// Initialize shared navigation on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Manager shared nav loading...');
    
    // Find the nav placeholder or inject after header
    const navPlaceholder = document.getElementById('nav-placeholder');
    const headerElement = document.querySelector('.header');
    
    if (navPlaceholder) {
        console.log('Found nav placeholder, injecting navigation');
        navPlaceholder.innerHTML = createManagerNavigation();
    } else if (headerElement && !document.querySelector('.nav')) {
        console.log('Found header element, injecting navigation after');
        headerElement.insertAdjacentHTML('afterend', createManagerNavigation());
    } else {
        console.log('Navigation already exists or could not find insertion point');
    }
    
    // Initialize Lucide icons after navigation is created
    setTimeout(() => {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
            console.log('Lucide icons initialized');
        } else {
            console.warn('Lucide not available');
        }
    }, 100);
});

// Shared logout function
function logout() {
    localStorage.clear();
    sessionStorage.clear();
    // Clear auth cookies
    document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'user_role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    window.location.href = '/login';
}

// Export for manual initialization if needed
window.ManagerNav = {
    create: createManagerNavigation,
    createHeader: createManagerHeader,
    logout: logout
};