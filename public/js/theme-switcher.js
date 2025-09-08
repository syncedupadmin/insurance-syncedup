// PROFESSIONAL THEME SWITCHER WITH PORTAL COLOR DETECTION

// Auto-detect portal and apply correct theme class
function detectPortal() {
    const path = window.location.pathname;
    let portalClass = '';
    
    // Detect portal based on URL path
    if (path.includes('/admin/')) {
        portalClass = 'portal-admin';
    } else if (path.includes('/manager/')) {
        portalClass = 'portal-manager';
    } else if (path.includes('/agent/')) {
        portalClass = 'portal-agent';
    } else if (path.includes('/customer-service/')) {
        portalClass = 'portal-customer-service';
    } else if (path.includes('/super-admin/')) {
        portalClass = 'portal-super-admin';
    } else if (path.includes('/leaderboard')) {
        portalClass = 'portal-leaderboard';
    } else {
        // Default portal detection based on subdomain or other indicators
        const hostname = window.location.hostname;
        if (hostname.includes('admin')) {
            portalClass = 'portal-admin';
        } else if (hostname.includes('manager')) {
            portalClass = 'portal-manager';
        } else if (hostname.includes('agent')) {
            portalClass = 'portal-agent';
        }
    }
    
    // Apply portal class to html and body
    if (portalClass) {
        document.documentElement.classList.add(portalClass);
        document.body.classList.add(portalClass);
        
        // Store detected portal for other scripts
        localStorage.setItem('detectedPortal', portalClass);
        console.log(`Portal detected: ${portalClass}`);
    }
    
    return portalClass;
}

// Load theme CSS file dynamically
function loadThemeCSS(themeName) {
    // Remove existing theme CSS
    const existingThemeLinks = document.querySelectorAll('link[data-theme-css]');
    existingThemeLinks.forEach(link => link.remove());
    
    // Don't load CSS for default professional theme (uses base styles)
    if (themeName === 'professional') {
        return;
    }
    
    // Load theme-specific CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `/css/themes/${themeName}.css`;
    link.setAttribute('data-theme-css', themeName);
    
    // Add error handling
    link.onerror = () => {
        console.warn(`Theme CSS file not found: /css/themes/${themeName}.css`);
    };
    
    // Insert after existing stylesheets
    const lastStylesheet = document.querySelector('link[rel="stylesheet"]:last-of-type');
    if (lastStylesheet) {
        lastStylesheet.insertAdjacentElement('afterend', link);
    } else {
        document.head.appendChild(link);
    }
    
    console.log(`Loaded theme CSS: /css/themes/${themeName}.css`);
}

// Apply theme with portal colors preserved
function applyTheme(themeName = 'professional') {
    // Remove existing theme classes (both old and new format)
    const existingThemes = ['theme-professional', 'theme-classic', 'theme-modern', 'professional-mode', 'classic-mode', 'modern-mode'];
    existingThemes.forEach(theme => {
        document.documentElement.classList.remove(theme);
        document.body.classList.remove(theme);
    });
    
    // Apply new theme using the format that matches existing CSS
    const themeClass = `${themeName}-mode`;
    document.documentElement.classList.add(themeClass);
    document.body.classList.add(themeClass);
    
    // Load theme CSS file dynamically
    loadThemeCSS(themeName);
    
    // Ensure portal class is maintained
    const portalClass = localStorage.getItem('detectedPortal') || detectPortal();
    if (portalClass) {
        document.documentElement.classList.add(portalClass);
        document.body.classList.add(portalClass);
    }
    
    // Save theme preference
    localStorage.setItem('selectedTheme', themeName);
    console.log(`Applied theme: ${themeName} with portal: ${portalClass}`);
    
    // Trigger custom event for other scripts
    document.dispatchEvent(new CustomEvent('themeChanged', {
        detail: { theme: themeName, portal: portalClass }
    }));
}

// Load saved theme or default to professional
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('selectedTheme') || 'professional';
    applyTheme(savedTheme);
}

// Theme toggle functions for backwards compatibility
function toggleClassicMode() {
    applyTheme('classic');
}

function toggleProfessionalMode() {
    applyTheme('professional');
}

function toggleModernMode() {
    applyTheme('modern');
}

// Portal color verification
function verifyPortalColors() {
    const portal = localStorage.getItem('detectedPortal');
    const computedStyle = getComputedStyle(document.documentElement);
    
    const primaryColor = computedStyle.getPropertyValue('--primary-color').trim();
    const headerBg = computedStyle.getPropertyValue('--header-bg').trim();
    
    console.log(`Portal: ${portal}`);
    console.log(`Primary Color: ${primaryColor}`);
    console.log(`Header Background: ${headerBg}`);
    
    return {
        portal,
        primaryColor,
        headerBg,
        isValid: primaryColor !== '' && headerBg !== ''
    };
}

// Initialize theme system
function initializeThemeSystem() {
    // Detect portal first
    detectPortal();
    
    // Load saved theme or default
    loadSavedTheme();
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (event) => {
        // Alt + P for Professional Mode
        if (event.altKey && event.key.toLowerCase() === 'p') {
            event.preventDefault();
            applyTheme('professional');
        }
        
        // Alt + C for Classic Mode  
        if (event.altKey && event.key.toLowerCase() === 'c') {
            event.preventDefault();
            applyTheme('classic');
        }
        
        // Alt + M for Modern Mode
        if (event.altKey && event.key.toLowerCase() === 'm') {
            event.preventDefault();
            applyTheme('modern');
        }
    });
    
    // Update any existing theme toggle buttons
    updateThemeButtons();
    
    console.log('Theme system initialized');
}

// Update theme toggle button states
function updateThemeButtons() {
    const currentTheme = localStorage.getItem('selectedTheme') || 'professional';
    
    // Update button states
    const buttons = {
        'classicModeToggle': 'classic',
        'professionalModeToggle': 'professional', 
        'modernModeToggle': 'modern'
    };
    
    Object.entries(buttons).forEach(([buttonId, theme]) => {
        const button = document.getElementById(buttonId);
        if (button) {
            if (currentTheme === theme) {
                button.classList.add('active');
                button.setAttribute('aria-pressed', 'true');
            } else {
                button.classList.remove('active');
                button.setAttribute('aria-pressed', 'false');
            }
        }
    });
}

// Theme preferences management
function getThemePreferences() {
    return {
        theme: localStorage.getItem('selectedTheme') || 'professional',
        portal: localStorage.getItem('detectedPortal') || 'unknown',
        autoDetect: localStorage.getItem('autoDetectPortal') !== 'false'
    };
}

function setThemePreferences(preferences) {
    if (preferences.theme) {
        localStorage.setItem('selectedTheme', preferences.theme);
    }
    if (preferences.portal) {
        localStorage.setItem('detectedPortal', preferences.portal);
    }
    if (preferences.autoDetect !== undefined) {
        localStorage.setItem('autoDetectPortal', preferences.autoDetect.toString());
    }
    
    // Apply changes
    applyTheme(preferences.theme || 'professional');
}

// Export functions for global use
window.themeSystem = {
    detectPortal,
    applyTheme,
    loadSavedTheme,
    verifyPortalColors,
    getThemePreferences,
    setThemePreferences,
    toggleClassicMode,
    toggleProfessionalMode,
    toggleModernMode
};

// Legacy global functions for compatibility
window.detectPortal = detectPortal;
window.toggleClassicMode = toggleClassicMode;
window.toggleProfessionalMode = toggleProfessionalMode;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeThemeSystem);
} else {
    initializeThemeSystem();
}

// Listen for theme change events
document.addEventListener('themeChanged', (event) => {
    updateThemeButtons();
    
    // Trigger alignment fixes after theme change
    setTimeout(() => {
        if (window.alignmentFixer && window.alignmentFixer.fixAll) {
            window.alignmentFixer.fixAll();
        }
    }, 100);
});

// CSS Variables Inspector (for debugging)
function inspectCSSVariables() {
    const style = getComputedStyle(document.documentElement);
    const variables = {};
    
    // Get all CSS custom properties
    Array.from(document.styleSheets).forEach(styleSheet => {
        try {
            Array.from(styleSheet.cssRules).forEach(rule => {
                if (rule.style) {
                    for (let i = 0; i < rule.style.length; i++) {
                        const property = rule.style[i];
                        if (property.startsWith('--')) {
                            variables[property] = style.getPropertyValue(property);
                        }
                    }
                }
            });
        } catch (e) {
            // Skip external stylesheets that can't be accessed
        }
    });
    
    return variables;
}

// Export CSS inspector
window.inspectCSSVariables = inspectCSSVariables;

console.log('Theme switcher with portal detection loaded successfully');