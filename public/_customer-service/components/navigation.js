// Customer Service Portal Navigation Component
// Centralized navigation for all customer service pages

(function() {
    'use strict';
    
    // Define navigation items
    const navItems = [
        { 
            href: '/customer-service/', 
            icon: 'layout-dashboard', 
            text: 'Dashboard',
            aliases: ['/customer-service/index.html']
        },
        { 
            href: '/customer-service/member-search', 
            icon: 'search', 
            text: 'Member Search',
            aliases: ['/customer-service/member-search.html']
        },
        { 
            href: '/customer-service/member-profile', 
            icon: 'user-check', 
            text: 'Member History',
            aliases: ['/customer-service/member-profile.html']
        },
        { 
            href: '/customer-service/settings', 
            icon: 'settings', 
            text: 'Settings',
            aliases: ['/customer-service/settings.html']
        }
    ];

    // Function to render navigation
    function renderCSNavigation() {
        const navElement = document.getElementById('csNavigation');
        if (!navElement) return;

        // Get current path
        const currentPath = window.location.pathname;
        
        // Build navigation HTML
        let navHTML = '';
        navItems.forEach(item => {
            // Check if current page matches this nav item
            const isActive = currentPath === item.href || 
                           currentPath === item.href + '.html' ||
                           currentPath.endsWith(item.href) ||
                           (item.aliases && item.aliases.some(alias => currentPath.endsWith(alias)));
            
            navHTML += `
                <a href="${item.href}" class="nav-link ${isActive ? 'active' : ''}">
                    <i data-lucide="${item.icon}" class="icon"></i>
                    ${item.text}
                </a>
            `;
        });

        // Insert navigation
        navElement.innerHTML = navHTML;

        // Re-initialize Lucide icons if available
        if (typeof lucide !== 'undefined') {
            setTimeout(() => lucide.createIcons(), 100);
        }
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderCSNavigation);
    } else {
        renderCSNavigation();
    }

    // Export for use in other scripts if needed
    window.CSNavigation = {
        render: renderCSNavigation,
        items: navItems
    };
})();