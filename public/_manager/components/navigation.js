// Manager Portal Navigation Component
// Provides consistent navigation across all manager pages

(function() {
    'use strict';

    const ManagerNavigation = {
        // Navigation items configuration
        navItems: [
            { href: '/manager/', icon: 'home', text: 'Dashboard' },
            { href: '/manager/team-management.html', icon: 'users', text: 'Team' },
            { href: '/manager/performance.html', icon: 'trending-up', text: 'Performance' },
            { href: '/manager/reports.html', icon: 'file-text', text: 'Reports' },
            { href: '/manager/leads.html', icon: 'users-2', text: 'Leads' },
            { href: '/manager/vendors.html', icon: 'building-2', text: 'Vendors' },
            { href: '/manager/convoso.html', icon: 'phone-call', text: 'Convoso' },
            { href: '/manager/convoso-monitor.html', icon: 'monitor', text: 'Call Monitor' },
            { href: '/manager/convoso-leads.html', icon: 'phone-incoming', text: 'Call Leads' },
            { href: '/manager/settings.html', icon: 'settings', text: 'Settings' }
        ],

        // Initialize navigation
        init: function() {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.render());
            } else {
                this.render();
            }
        },

        // Render navigation
        render: function() {
            // Try both possible mount points
            const mountPoints = ['managerNavigation', 'nav-placeholder'];
            let mounted = false;

            for (const mountId of mountPoints) {
                const mountPoint = document.getElementById(mountId);
                if (mountPoint) {
                    mountPoint.innerHTML = this.buildNavHTML();
                    this.setActiveLink();
                    mounted = true;
                    
                    // Re-initialize Lucide icons
                    if (typeof lucide !== 'undefined') {
                        setTimeout(() => lucide.createIcons(), 100);
                    }
                    break;
                }
            }

            if (!mounted) {
                console.warn('Manager navigation mount point not found');
            }
        },

        // Build navigation HTML
        buildNavHTML: function() {
            const currentPath = window.location.pathname;
            
            let navHTML = '<div class="nav">';
            
            this.navItems.forEach(item => {
                // Determine if this item is active
                const isActive = this.isActiveRoute(item.href, currentPath);
                const activeClass = isActive ? ' active' : '';
                
                navHTML += `
                    <a href="${item.href}" class="nav-link${activeClass}">
                        <i data-lucide="${item.icon}" class="icon"></i>
                        ${item.text}
                    </a>
                `;
            });
            
            navHTML += '</div>';
            
            return navHTML;
        },

        // Check if route is active
        isActiveRoute: function(href, currentPath) {
            // Normalize paths for comparison
            const normalizedHref = href.replace(/\/$/, '').toLowerCase();
            const normalizedPath = currentPath.replace(/\/$/, '').toLowerCase();
            
            // Special handling for index page
            if (normalizedHref === '/manager' || normalizedHref === '/manager/index.html') {
                return normalizedPath === '/manager' || 
                       normalizedPath === '/manager/index.html' ||
                       normalizedPath === '/_manager' ||
                       normalizedPath === '/_manager/index.html';
            }
            
            // Check both with and without underscore prefix
            const altHref = normalizedHref.replace('/manager/', '/_manager/');
            const altPath = normalizedPath.replace('/_manager/', '/manager/');
            
            return normalizedHref === normalizedPath || 
                   normalizedHref === altPath ||
                   altHref === normalizedPath;
        },

        // Set active link after render
        setActiveLink: function() {
            const currentPath = window.location.pathname;
            const navLinks = document.querySelectorAll('.nav .nav-link');
            
            navLinks.forEach(link => {
                const href = link.getAttribute('href');
                if (this.isActiveRoute(href, currentPath)) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });
        },

        // Update active state (can be called externally)
        updateActiveState: function() {
            this.setActiveLink();
        }
    };

    // Expose to global scope
    window.ManagerNavigation = ManagerNavigation;

    // Auto-initialize
    ManagerNavigation.init();
})();