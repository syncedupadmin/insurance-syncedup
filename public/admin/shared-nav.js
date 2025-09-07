// Shared Navigation Component for Admin Portal
// This script creates a consistent navigation bar across all admin pages

function createAdminNavigation() {
    // Standard admin navigation structure
    const navItems = [
        { href: '/admin/', icon: 'layout-dashboard', text: 'Dashboard' },
        { href: '/admin/agent-performance', icon: 'trending-up', text: 'Agent Performance' },
        { href: '/admin/users', icon: 'users', text: 'Users' },
        { href: '/admin/convoso-leads', icon: 'users', text: 'Leads' },
        { href: '/admin/vendors', icon: 'building-2', text: 'Vendors' },
        { href: '/admin/commissions', icon: 'dollar-sign', text: 'Commissions' },
        { href: '/admin/settings', icon: 'settings', text: 'Settings' },
        { href: '/admin/convoso-monitor', icon: 'monitor-speaker', text: 'Convoso' },
        { href: '/global-leaderboard', icon: 'trophy', text: 'Global Leaderboard' }
    ];

    // Create navigation HTML
    let navHTML = '<nav class="nav">';
    
    const currentPath = window.location.pathname;
    
    navItems.forEach(item => {
        const isActive = currentPath === item.href || 
                        (item.href === '/admin/' && currentPath === '/admin/index.html') ||
                        currentPath.startsWith(item.href + '/');
        
        navHTML += `
            <a href="${item.href}" ${isActive ? 'class="active"' : ''}>
                <i data-lucide="${item.icon}" class="icon"></i>${item.text}
            </a>
        `;
    });
    
    navHTML += '</nav>';
    
    return navHTML;
}

function createAdminHeader(pageTitle) {
    return `
        <!-- Floating particles effect -->
        <div class="particles">
            <div class="particle"></div>
            <div class="particle"></div>
            <div class="particle"></div>
        </div>
        
        <!-- Header -->
        <div class="header">
            <h1>${pageTitle}</h1>
            <button class="btn" style="background: transparent; border: 1px solid white;" onclick="logout()">
                <i data-lucide="log-out" class="icon"></i>Logout
            </button>
        </div>
    `;
}

// Initialize shared navigation on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Shared nav loading...');
    
    // Find the nav placeholder or inject after header
    const navPlaceholder = document.getElementById('nav-placeholder');
    const headerElement = document.querySelector('.header');
    
    if (navPlaceholder) {
        console.log('Found nav placeholder, injecting navigation');
        navPlaceholder.innerHTML = createAdminNavigation();
    } else if (headerElement) {
        console.log('Found header element, injecting navigation after');
        headerElement.insertAdjacentHTML('afterend', createAdminNavigation());
    } else {
        console.error('Could not find nav placeholder or header element');
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
    window.location.href = '/login';
}

// Export for manual initialization if needed
window.AdminNav = {
    create: createAdminNavigation,
    createHeader: createAdminHeader,
    logout: logout
};