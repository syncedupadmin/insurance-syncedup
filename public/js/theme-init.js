// CRITICAL: This runs immediately, blocking render to prevent flash
(function() {
    'use strict';
    
    // Get theme immediately
    const savedTheme = localStorage.getItem('selectedTheme') || 'professional';
    
    // Apply theme class immediately (before CSS loads)
    if (savedTheme === 'classic') {
        document.documentElement.classList.add('classic-mode');
        // Preload classic CSS
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'style';
        link.href = '/css/themes/classic.css';
        document.head.appendChild(link);
    } else if (savedTheme === 'modern') {
        document.documentElement.classList.add('modern-mode');
        // Preload modern CSS
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'style';
        link.href = '/css/themes/modern.css';
        document.head.appendChild(link);
    }
    // Professional needs no class (uses base styles)
    
    // Add portal class if needed
    const path = window.location.pathname;
    if (path.includes('/admin/')) {
        document.documentElement.classList.add('portal-admin');
    } else if (path.includes('/manager/')) {
        document.documentElement.classList.add('portal-manager');
    } else if (path.includes('/agent/')) {
        document.documentElement.classList.add('portal-agent');
    } else if (path.includes('/customer-service/')) {
        document.documentElement.classList.add('portal-customer-service');
    }
})();