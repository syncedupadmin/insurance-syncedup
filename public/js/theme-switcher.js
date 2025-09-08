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
            
            // Remove any inline styles after theme is loaded
            setTimeout(() => {
                document.documentElement.style.removeProperty('visibility');
                document.documentElement.style.removeProperty('background');
                document.documentElement.style.removeProperty('backgroundColor');
            }, 100);
        },

        detectPortal: function() {
            const path = window.location.pathname;
            let portalClass = '';

            if (path.includes('/manager/')) portalClass = 'portal-manager';
            else if (path.includes('/agent/')) portalClass = 'portal-agent';
            else if (path.includes('/customer-service/')) portalClass = 'portal-customer-service';
            else if (path.includes('/admin/')) portalClass = 'portal-admin';

            if (portalClass) {
                document.body.classList.add(portalClass);
                this.currentPortal = portalClass;
                localStorage.setItem('detectedPortal', portalClass);
            }
        },

        loadSavedTheme: function() {
            const savedTheme = localStorage.getItem('selectedTheme') || 'professional';
            
            // Classes already set by critical script, just load CSS if needed
            if (savedTheme !== 'professional' && !document.querySelector(`link[data-theme-css="${savedTheme}"]`)) {
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

            // Apply new theme
            if (themeName === 'professional') {
                // Professional uses base styles, no class needed
            } else {
                // Add theme class to both for compatibility
                document.documentElement.classList.add(themeName + '-mode');
                document.body.classList.add(themeName + '-mode');
                
                // Load theme CSS
                this.loadThemeCSS(themeName);
            }

            this.currentTheme = themeName;
            localStorage.setItem('selectedTheme', themeName);

            // Dispatch theme change event
            document.dispatchEvent(new CustomEvent('themeChanged', {
                detail: { theme: themeName, portal: this.currentPortal }
            }));
        },

        loadThemeCSS: function(themeName) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = `/css/themes/${themeName}.css`;
            link.setAttribute('data-theme-css', themeName);
            document.head.appendChild(link);
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