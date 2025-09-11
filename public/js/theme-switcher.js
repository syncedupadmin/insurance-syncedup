(function() {
    'use strict';

    const themeSystem = {
        themes: ['professional', 'classic', 'modern'],
        currentTheme: null,
        currentPortal: null,
        initialized: false,

        init: function() {
            // Skip if already initialized (prevent double execution)
            if (this.initialized) return;
            
            // Skip theme system on Convoso pages
            if (window.CONVOSO_PAGE || document.title.includes('Convoso') || 
                window.location.pathname.includes('convoso')) {
                console.log('Theme system disabled for Convoso page');
                return;
            }
            
            this.initialized = true;
            
            this.detectPortal();
            this.loadSavedTheme();
            this.setupEventListeners();
            
            // Remove visibility inline style only (keep theme backgrounds)
            setTimeout(() => {
                document.documentElement.style.removeProperty('visibility');
            }, 100);
        },

        detectPortal: function() {
            // Path normalization to handle /_admin -> /admin conversion
            const normalizePath = p => p.replace(/^\/_/, '/');
            const path = normalizePath(window.location.pathname || '/');
            let portalClass = '';

            if (path.includes('/manager/')) portalClass = 'portal-manager';
            else if (path.includes('/agent/')) portalClass = 'portal-agent';
            else if (path.includes('/customer-service/')) portalClass = 'portal-customer-service';
            else if (path.includes('/admin/')) portalClass = 'portal-admin';
            else if (path.includes('/super-admin/')) portalClass = 'portal-super-admin';

            if (portalClass) {
                document.body.classList.add(portalClass);
                this.currentPortal = portalClass;
                localStorage.setItem('detectedPortal', portalClass);
            }
        },
        
        getThemeKey: function() {
            // Return portal-specific localStorage key
            const path = (window.location.pathname || '/').replace(/^\/_/, '/');
            if (path.includes('/manager/')) return 'managerTheme';
            else if (path.includes('/agent/')) return 'agentTheme';
            else if (path.includes('/customer-service/')) return 'serviceTheme';
            else if (path.includes('/admin/')) return 'adminTheme';
            else if (path.includes('/super-admin/')) return 'superAdminTheme';
            else if (path.includes('/leaderboard')) return 'leaderboardTheme';
            return 'selectedTheme'; // fallback for other pages
        },

        loadSavedTheme: function() {
            const themeKey = this.getThemeKey();
            const savedTheme = localStorage.getItem(themeKey) || 'professional';
            
            // Always ensure theme CSS is loaded (critical script may have already loaded it)
            if (!document.querySelector(`link[data-theme-css="${savedTheme}"]`)) {
                this.loadThemeCSS(savedTheme);
            }
            
            this.currentTheme = savedTheme;
        },

        applyTheme: function(themeName) {
            if (!this.themes.includes(themeName)) {
                console.error('Invalid theme:', themeName);
                return;
            }

            // Add transition class for smooth change
            document.body.style.transition = 'background 0.3s ease';
            
            // Remove all theme classes from both html and body
            document.documentElement.classList.remove('professional-mode', 'classic-mode', 'modern-mode');
            document.body.classList.remove('professional-mode', 'classic-mode', 'modern-mode');
            
            // Remove any existing theme CSS
            document.querySelectorAll('link[data-theme-css]').forEach(link => link.remove());

            // Apply new theme - all themes get classes and CSS
            document.documentElement.classList.add(themeName + '-mode');
            document.body.classList.add(themeName + '-mode');
            
            // Load theme CSS for all themes
            this.loadThemeCSS(themeName);

            this.currentTheme = themeName;
            const themeKey = this.getThemeKey();
            localStorage.setItem(themeKey, themeName);

            // Dispatch theme change event
            document.dispatchEvent(new CustomEvent('themeChanged', {
                detail: { theme: themeName, portal: this.currentPortal }
            }));
        },

        loadThemeCSS: function(themeName) {
            // For modern theme, load both base and portal-specific color CSS
            if (themeName === 'modern') {
                // Load modern-base.css first
                const baseLink = document.createElement('link');
                baseLink.rel = 'stylesheet';
                baseLink.href = '/css/themes/modern-base.css';
                baseLink.setAttribute('data-theme-css', 'modern-base');
                document.head.appendChild(baseLink);
                
                // Load portal-specific color CSS
                const path = (window.location.pathname || '/').replace(/^\/_/, '/');
                if (path.includes('/admin/')) {
                    const purpleLink = document.createElement('link');
                    purpleLink.rel = 'stylesheet';
                    purpleLink.href = '/css/themes/modern-purple.css';
                    purpleLink.setAttribute('data-theme-css', 'modern-purple');
                    document.head.appendChild(purpleLink);
                }
                // Agent, manager, and customer-service use their own portal CSS colors
            } else {
                // Load traditional single theme CSS
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = `/css/themes/${themeName}.css`;
                link.setAttribute('data-theme-css', themeName);
                document.head.appendChild(link);
            }
        },

        setupEventListeners: function() {
            document.addEventListener('themeChanged', () => {
                if (typeof updateThemeButtons === 'function') {
                    updateThemeButtons();
                }
            });
        }
    };

    // Initialize immediately if DOM is ready
    if (document.readyState !== 'loading') {
        themeSystem.init();
    } else {
        document.addEventListener('DOMContentLoaded', () => themeSystem.init());
    }

    // Expose to global scope
    window.themeSystem = themeSystem;

    // Legacy support functions
    window.toggleProfessionalMode = function() {
        themeSystem.applyTheme('professional');
    };

    window.toggleClassicMode = function() {
        themeSystem.applyTheme('classic');
    };

    window.toggleModernMode = function() {
        themeSystem.applyTheme('modern');
    };
})();