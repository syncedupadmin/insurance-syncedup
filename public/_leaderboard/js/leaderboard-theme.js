/**
 * Leaderboard Independent Theme System
 * 
 * This system is completely separate from portal theme systems.
 * Uses 'leaderboardTheme' localStorage key (NOT 'selectedTheme').
 * 
 * Available themes:
 * - competition (default): Dark with neon accents, animated effects
 * - analytics: Clean white/gray design for data visualization
 * - gaming: Retro arcade aesthetic with 8-bit styling
 */

class LeaderboardThemeSystem {
    constructor() {
        this.themes = {
            competition: {
                name: 'Competition Mode',
                description: 'Dark theme with neon accents and animations',
                cssFile: '/leaderboard/css/themes/competition.css',
                bodyClass: 'lb-competition-mode',
                icon: '🏆'
            },
            analytics: {
                name: 'Analytics Mode',
                description: 'Clean design focused on data visualization',
                cssFile: '/leaderboard/css/themes/analytics.css',
                bodyClass: 'lb-analytics-mode',
                icon: '📊'
            },
            gaming: {
                name: 'Gaming Mode',
                description: 'Retro arcade aesthetic with 8-bit styling',
                cssFile: '/leaderboard/css/themes/gaming.css',
                bodyClass: 'lb-gaming-mode',
                icon: '🎮'
            }
        };

        this.currentTheme = null;
        this.loadedCSS = new Map();
        
        // Completely separate from portal themes
        this.storageKey = 'leaderboardTheme';
        
        // Auto-init if we're on a leaderboard page
        this.init();
    }

    /**
     * Initialize the theme system
     */
    init() {
        // Only initialize if we're on a leaderboard page
        if (!this.isLeaderboardPage()) {
            console.log('LeaderboardThemeSystem: Not on leaderboard page, skipping init');
            return;
        }

        console.log('LeaderboardThemeSystem: Initializing on leaderboard page');
        
        // Load saved theme or default to 'competition'
        const savedTheme = this.getSavedTheme();
        this.applyTheme(savedTheme);

        // Set up theme switcher if it exists
        this.setupThemeSwitcher();
        
        // Add keyboard shortcut for theme switching (T key)
        this.setupKeyboardShortcuts();

        console.log(`LeaderboardThemeSystem: Initialized with theme '${savedTheme}'`);
    }

    /**
     * Check if current page is a leaderboard page
     * @returns {boolean}
     */
    isLeaderboardPage() {
        const path = window.location.pathname;
        return path.includes('/leaderboard') || path.includes('leaderboard') || path === '/global-leaderboard' || path.startsWith('/global-leaderboard');
    }

    /**
     * Get saved theme from localStorage or default
     * @returns {string}
     */
    getSavedTheme() {
        const saved = localStorage.getItem(this.storageKey);
        return (saved && this.themes[saved]) ? saved : 'competition';
    }

    /**
     * Save theme to localStorage
     * @param {string} themeName 
     */
    saveTheme(themeName) {
        if (this.themes[themeName]) {
            localStorage.setItem(this.storageKey, themeName);
            console.log(`LeaderboardThemeSystem: Theme '${themeName}' saved to localStorage`);
        }
    }

    /**
     * Apply a theme to the leaderboard
     * @param {string} themeName 
     */
    async applyTheme(themeName) {
        if (!this.themes[themeName]) {
            console.error(`LeaderboardThemeSystem: Theme '${themeName}' not found`);
            return;
        }

        const theme = this.themes[themeName];
        
        try {
            // Remove all leaderboard theme classes
            this.removeAllThemeClasses();
            
            // Load theme CSS
            await this.loadThemeCSS(theme.cssFile);
            
            // Add new theme class
            document.body.classList.add(theme.bodyClass);
            
            // Update current theme
            this.currentTheme = themeName;
            
            // Save to localStorage
            this.saveTheme(themeName);
            
            // Update theme switcher UI
            this.updateThemeSwitcherUI();
            
            // Trigger theme change event
            this.dispatchThemeChangeEvent(themeName);
            
            console.log(`LeaderboardThemeSystem: Applied theme '${themeName}'`);
            
            // Add special effects for certain themes
            this.addThemeSpecificEffects(themeName);
            
        } catch (error) {
            console.error(`LeaderboardThemeSystem: Error applying theme '${themeName}':`, error);
        }
    }

    /**
     * Remove all leaderboard theme classes from body
     */
    removeAllThemeClasses() {
        Object.values(this.themes).forEach(theme => {
            document.body.classList.remove(theme.bodyClass);
        });
    }

    /**
     * Load theme CSS file
     * @param {string} cssFile 
     */
    async loadThemeCSS(cssFile) {
        // Check if already loaded
        if (this.loadedCSS.has(cssFile)) {
            console.log(`LeaderboardThemeSystem: CSS '${cssFile}' already loaded`);
            return;
        }

        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = cssFile;
            link.onload = () => {
                this.loadedCSS.set(cssFile, link);
                console.log(`LeaderboardThemeSystem: Loaded CSS '${cssFile}'`);
                resolve();
            };
            link.onerror = () => {
                console.error(`LeaderboardThemeSystem: Failed to load CSS '${cssFile}'`);
                reject(new Error(`Failed to load CSS: ${cssFile}`));
            };
            
            // Remove any existing theme CSS first
            this.removeOldThemeCSS();
            
            document.head.appendChild(link);
        });
    }

    /**
     * Remove old theme CSS files from DOM
     */
    removeOldThemeCSS() {
        this.loadedCSS.forEach((link, cssFile) => {
            if (link.parentNode) {
                link.parentNode.removeChild(link);
            }
        });
        this.loadedCSS.clear();
    }

    /**
     * Set up theme switcher buttons
     */
    setupThemeSwitcher() {
        // Create theme switcher if it doesn't exist
        let switcher = document.querySelector('.theme-switcher');
        if (!switcher) {
            switcher = this.createThemeSwitcher();
        }

        // Set up event listeners
        Object.keys(this.themes).forEach(themeName => {
            const btn = document.querySelector(`[data-theme="${themeName}"]`);
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.switchTheme(themeName);
                });
            }
        });
    }

    /**
     * Create theme switcher UI
     * @returns {HTMLElement}
     */
    createThemeSwitcher() {
        const header = document.querySelector('.leaderboard-header');
        if (!header) return null;

        const switcher = document.createElement('div');
        switcher.className = 'theme-switcher';
        switcher.innerHTML = Object.keys(this.themes).map(themeName => {
            const theme = this.themes[themeName];
            return `
                <button class="theme-btn" data-theme="${themeName}" title="${theme.description}">
                    <span class="theme-icon">${theme.icon}</span>
                    <span class="theme-name">${theme.name}</span>
                </button>
            `;
        }).join('');

        header.appendChild(switcher);
        return switcher;
    }

    /**
     * Update theme switcher UI to reflect current theme
     */
    updateThemeSwitcherUI() {
        const buttons = document.querySelectorAll('.theme-btn');
        buttons.forEach(btn => {
            const themeName = btn.getAttribute('data-theme');
            if (themeName === this.currentTheme) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    /**
     * Switch to a specific theme
     * @param {string} themeName 
     */
    switchTheme(themeName) {
        if (!this.themes[themeName] || themeName === this.currentTheme) {
            return;
        }

        console.log(`LeaderboardThemeSystem: Switching from '${this.currentTheme}' to '${themeName}'`);
        this.applyTheme(themeName);
    }

    /**
     * Cycle to next theme
     */
    nextTheme() {
        const themeNames = Object.keys(this.themes);
        const currentIndex = themeNames.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themeNames.length;
        this.switchTheme(themeNames[nextIndex]);
    }

    /**
     * Get current theme information
     * @returns {object}
     */
    getCurrentTheme() {
        return this.currentTheme ? {
            name: this.currentTheme,
            ...this.themes[this.currentTheme]
        } : null;
    }

    /**
     * Set up keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // T key to cycle themes (only if no input is focused)
            if (e.key === 't' || e.key === 'T') {
                const activeElement = document.activeElement;
                const isInputFocused = activeElement && 
                    (activeElement.tagName === 'INPUT' || 
                     activeElement.tagName === 'TEXTAREA' || 
                     activeElement.tagName === 'SELECT' ||
                     activeElement.isContentEditable);
                
                if (!isInputFocused) {
                    e.preventDefault();
                    this.nextTheme();
                }
            }
        });
    }

    /**
     * Add theme-specific effects and features
     * @param {string} themeName 
     */
    addThemeSpecificEffects(themeName) {
        // Remove any existing effects first
        this.removeThemeEffects();

        switch (themeName) {
            case 'gaming':
                this.addGamingEffects();
                break;
            case 'competition':
                this.addCompetitionEffects();
                break;
            case 'analytics':
                this.addAnalyticsEffects();
                break;
        }
    }

    /**
     * Remove theme-specific effects
     */
    removeThemeEffects() {
        // Remove gaming effects
        document.querySelectorAll('.coin-effect, .sound-wave, .achievement, .insert-coin').forEach(el => {
            el.remove();
        });

        // Remove analytics effects
        document.querySelectorAll('.export-btn').forEach(el => {
            el.remove();
        });

        // Remove competition effects
        document.querySelectorAll('.victory-effect').forEach(el => {
            el.classList.remove('victory-effect');
        });
    }

    /**
     * Add gaming mode effects
     */
    addGamingEffects() {
        // Add coin effects to metrics
        document.querySelectorAll('.leaderboard-metric').forEach(metric => {
            const coin = document.createElement('div');
            coin.className = 'coin-effect';
            coin.innerHTML = '💰';
            metric.appendChild(coin);
        });

        // Add INSERT COIN banner to header
        const header = document.querySelector('.leaderboard-header');
        if (header && !document.querySelector('.insert-coin')) {
            const insertCoin = document.createElement('div');
            insertCoin.className = 'insert-coin';
            insertCoin.textContent = 'INSERT COIN';
            header.appendChild(insertCoin);
        }
    }

    /**
     * Add competition mode effects
     */
    addCompetitionEffects() {
        // Add victory effects to top performers
        document.querySelectorAll('.podium-place').forEach(place => {
            place.classList.add('victory-effect');
        });
    }

    /**
     * Add analytics mode effects
     */
    addAnalyticsEffects() {
        // Add tooltips to metrics
        document.querySelectorAll('.leaderboard-metric').forEach(metric => {
            const label = metric.querySelector('.leaderboard-metric-label');
            if (label) {
                metric.classList.add('tooltip');
                metric.setAttribute('data-tooltip', 'Click for detailed breakdown');
            }
        });
    }

    /**
     * Export leaderboard data (analytics mode feature)
     */
    exportLeaderboardData() {
        // This would typically connect to your data export API
        console.log('Exporting leaderboard data...');
        
        // Show notification
        this.showNotification('Data export feature coming soon!', 'info');
    }

    /**
     * Show notification
     * @param {string} message 
     * @param {string} type 
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: var(--lb-accent, #3498DB);
            color: white;
            border-radius: 4px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    /**
     * Dispatch theme change event
     * @param {string} themeName 
     */
    dispatchThemeChangeEvent(themeName) {
        const event = new CustomEvent('leaderboardThemeChange', {
            detail: {
                theme: themeName,
                themeData: this.themes[themeName]
            }
        });
        window.dispatchEvent(event);
    }

    /**
     * Get all available themes
     * @returns {object}
     */
    getAvailableThemes() {
        return { ...this.themes };
    }

    /**
     * Check if theme system is independent from portal themes
     * @returns {boolean}
     */
    isIndependent() {
        // Verify we don't use portal theme keys or reference portal theme system
        const portalThemeKey = localStorage.getItem('selectedTheme');
        const hasPortalClasses = document.body.classList.contains('professional-mode') ||
                                document.body.classList.contains('classic-mode') ||
                                document.body.classList.contains('modern-mode');
        
        console.log('LeaderboardThemeSystem independence check:', {
            usesOwnStorageKey: this.storageKey === 'leaderboardTheme',
            portalThemeInStorage: !!portalThemeKey,
            hasPortalClasses: hasPortalClasses,
            currentLeaderboardTheme: this.currentTheme
        });

        return this.storageKey === 'leaderboardTheme';
    }

    /**
     * Debug method to show current state
     */
    debug() {
        console.log('LeaderboardThemeSystem Debug Info:', {
            currentTheme: this.currentTheme,
            isLeaderboardPage: this.isLeaderboardPage(),
            storageKey: this.storageKey,
            savedTheme: localStorage.getItem(this.storageKey),
            loadedCSS: Array.from(this.loadedCSS.keys()),
            bodyClasses: Array.from(document.body.classList),
            isIndependent: this.isIndependent()
        });
    }
}

// Create global instance
window.leaderboardThemes = new LeaderboardThemeSystem();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LeaderboardThemeSystem;
}

// Listen for theme changes from other parts of the app
window.addEventListener('leaderboardThemeChange', (e) => {
    console.log('Leaderboard theme changed:', e.detail);
});

// Expose debug method globally
window.debugLeaderboardThemes = () => window.leaderboardThemes.debug();

console.log('LeaderboardThemeSystem: Script loaded successfully');