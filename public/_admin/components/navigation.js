// Admin Portal Navigation Component
// Provides consistent navigation across all admin pages

(function() {
    'use strict';

    const AdminNavigation = {
        // Navigation items configuration
        navItems: [
            { href: '/admin/', icon: 'layout-dashboard', text: 'Dashboard' },
            { href: '/admin/agent-performance.html', icon: 'trending-up', text: 'Agent Performance' },
            { href: '/admin/users.html', icon: 'users', text: 'Users' },
            { href: '/admin/licenses.html', icon: 'shield-check', text: 'Licenses' },
            { href: '/admin/convoso-leads.html', icon: 'users', text: 'Leads' },
            { href: '/admin/vendors.html', icon: 'building-2', text: 'Vendors' },
            { href: '/admin/commissions.html', icon: 'dollar-sign', text: 'Commissions' },
            { href: '/admin/onboarding.html', icon: 'user-plus', text: 'Onboarding' },
            { href: '/admin/reports.html', icon: 'file-text', text: 'Reports' },
            { href: '/admin/settings.html', icon: 'settings', text: 'Settings' },
            { href: '/admin/convoso-monitor.html', icon: 'monitor-speaker', text: 'Convoso' },
            { href: '/global-leaderboard', icon: 'trophy', text: 'Global Leaderboard' }
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
            // Try multiple possible mount points
            const mountPoints = ['adminNavigation', 'nav-placeholder'];
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

            // If no mount point found, check for nav element
            if (!mounted) {
                const navElement = document.querySelector('nav.nav');
                if (navElement) {
                    navElement.innerHTML = this.buildNavInnerHTML();
                    this.setActiveLink();
                    
                    // Re-initialize Lucide icons
                    if (typeof lucide !== 'undefined') {
                        setTimeout(() => lucide.createIcons(), 100);
                    }
                    mounted = true;
                }
            }

            if (!mounted) {
                console.warn('Admin navigation mount point not found');
            }
        },

        // Build navigation HTML (with nav wrapper)
        buildNavHTML: function() {
            return `<nav class="nav">${this.buildNavInnerHTML()}</nav>`;
        },

        // Build navigation inner HTML (just the links)
        buildNavInnerHTML: function() {
            const currentPath = window.location.pathname;
            let navHTML = '';
            
            this.navItems.forEach(item => {
                // Determine if this item is active
                const isActive = this.isActiveRoute(item.href, currentPath);
                const activeClass = isActive ? ' class="active"' : '';
                
                navHTML += `
                    <a href="${item.href}"${activeClass}>
                        <i data-lucide="${item.icon}" class="icon"></i>${item.text}
                    </a>
                `;
            });
            
            return navHTML;
        },

        // Check if route is active
        isActiveRoute: function(href, currentPath) {
            // Normalize paths for comparison
            const normalizedHref = href.replace(/\/$/, '').toLowerCase();
            const normalizedPath = currentPath.replace(/\/$/, '').toLowerCase();
            
            // Special handling for index page
            if (normalizedHref === '/admin' || normalizedHref === '/admin/index.html') {
                return normalizedPath === '/admin' || 
                       normalizedPath === '/admin/index.html' ||
                       normalizedPath === '/_admin' ||
                       normalizedPath === '/_admin/index.html';
            }
            
            // Check both with and without underscore prefix
            const altHref = normalizedHref.replace('/admin/', '/_admin/');
            const altPath = normalizedPath.replace('/_admin/', '/admin/');
            
            // Remove .html extension for comparison
            const hrefWithoutExt = normalizedHref.replace('.html', '');
            const pathWithoutExt = normalizedPath.replace('.html', '');
            
            return normalizedHref === normalizedPath || 
                   normalizedHref === altPath ||
                   altHref === normalizedPath ||
                   hrefWithoutExt === pathWithoutExt;
        },

        // Set active link after render
        setActiveLink: function() {
            const currentPath = window.location.pathname;
            const navLinks = document.querySelectorAll('nav.nav a');
            
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
    window.AdminNavigation = AdminNavigation;

    // Auto-initialize
    AdminNavigation.init();
})();