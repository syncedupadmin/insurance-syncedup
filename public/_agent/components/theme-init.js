// Theme Initialization Helper - Ensures theme is always applied
// This script provides a fallback for theme initialization
(function() {
    'use strict';

    // Function to apply theme immediately
    function applyThemeNow() {
        const theme = localStorage.getItem('agentTheme') || 'professional';
        const html = document.documentElement;
        const body = document.body;

        // Ensure theme classes are applied
        if (!html.classList.contains(theme + '-mode')) {
            html.classList.add(theme + '-mode');
        }

        if (body && !body.classList.contains(theme + '-mode')) {
            body.classList.add('portal-agent');
            body.classList.add(theme + '-mode');
        }

        // Ensure background is set
        if (!html.style.background || html.style.background === 'none') {
            if (theme === 'classic') {
                html.style.background = 'linear-gradient(-45deg,#047857,#059669,#10b981,#34d399)';
            } else if (theme === 'modern') {
                html.style.background = 'linear-gradient(135deg,#10b981 0%,#059669 100%)';
            } else {
                html.style.background = 'linear-gradient(-45deg,#059669,#10b981,#34d399,#a7f3d0)';
            }
        }

        // Ensure theme CSS is loaded
        const themeCSS = document.querySelector('link[data-theme-css]');
        if (!themeCSS) {
            if (theme === 'modern') {
                const baseLink = document.createElement('link');
                baseLink.rel = 'stylesheet';
                baseLink.href = '/css/themes/modern-base.css';
                baseLink.setAttribute('data-theme-css', 'modern-base');
                document.head.appendChild(baseLink);
            } else {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = '/css/themes/' + theme + '.css';
                link.setAttribute('data-theme-css', theme);
                document.head.appendChild(link);
            }
        }
    }

    // Apply theme immediately
    applyThemeNow();

    // Reapply when DOM is ready (if needed)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyThemeNow);
    }

    // Reapply after a short delay to catch any timing issues
    setTimeout(applyThemeNow, 100);

    // Export for debugging
    window._themeInit = {
        apply: applyThemeNow,
        current: () => localStorage.getItem('agentTheme') || 'professional'
    };
})();