/**
 * Classic Mode Toggle System
 * Switches between modern purple glass morphism and Windows 95 classic theme
 */
class ClassicModeManager {
    constructor() {
        this.isClassic = localStorage.getItem('classicMode') === 'true';
        this.init();
    }

    init() {
        // Apply theme immediately on load to prevent flash
        this.applyTheme(this.isClassic);
        
        // Set up event listeners when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
        } else {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        // Update toggle button text
        const toggleBtn = document.getElementById('classicModeToggle');
        if (toggleBtn) {
            toggleBtn.textContent = this.isClassic ? 'Modern Mode' : 'Classic Mode';
        }
    }

    toggleClassicMode() {
        this.isClassic = !this.isClassic;
        localStorage.setItem('classicMode', this.isClassic.toString());
        
        // Update toggle button text
        const toggleBtn = document.getElementById('classicModeToggle');
        if (toggleBtn) {
            toggleBtn.textContent = this.isClassic ? 'Modern Mode' : 'Classic Mode';
        }
        
        // Apply theme
        this.applyTheme(this.isClassic);
    }

    applyTheme(isClassic) {
        if (isClassic) {
            this.applyClassicTheme();
        } else {
            this.applyModernTheme();
        }
    }

    applyClassicTheme() {
        // Remove any existing theme styles
        const existingStyle = document.getElementById('classic-theme-style');
        if (existingStyle) {
            existingStyle.remove();
        }

        // Create Windows 95 classic theme CSS
        const classicCSS = `
            /* Windows 95 Classic Theme Override */
            * {
                transition: none !important;
                animation: none !important;
            }
            
            body {
                font-family: "MS Sans Serif", sans-serif !important;
                background: #c0c0c0 !important;
                color: #000000 !important;
            }
            
            .header {
                background: linear-gradient(180deg, #0080ff 0%, #0060df 100%) !important;
                color: white !important;
                border: 2px outset #c0c0c0 !important;
                border-radius: 0 !important;
                box-shadow: none !important;
                padding: 8px 16px !important;
            }
            
            .nav {
                background: #c0c0c0 !important;
                border: 1px solid #808080 !important;
                border-radius: 0 !important;
                padding: 0 !important;
            }
            
            .nav a {
                color: #000000 !important;
                border: 1px outset #c0c0c0 !important;
                margin: 2px !important;
                background: #c0c0c0 !important;
                border-radius: 0 !important;
            }
            
            .nav a:hover {
                background: #dfdfdf !important;
                border: 1px inset #c0c0c0 !important;
            }
            
            .nav a.active {
                border: 1px inset #c0c0c0 !important;
                background: #dfdfdf !important;
                color: #000000 !important;
            }
            
            .container {
                background: #c0c0c0 !important;
            }
            
            .card {
                background: #c0c0c0 !important;
                border: 2px inset #c0c0c0 !important;
                border-radius: 0 !important;
                box-shadow: none !important;
                color: #000000 !important;
            }
            
            .btn {
                background: #c0c0c0 !important;
                color: #000000 !important;
                border: 2px outset #c0c0c0 !important;
                border-radius: 0 !important;
                padding: 4px 16px !important;
                font-family: "MS Sans Serif", sans-serif !important;
                font-size: 11px !important;
                cursor: pointer !important;
            }
            
            .btn:hover {
                background: #dfdfdf !important;
            }
            
            .btn:active,
            .btn:focus {
                border: 2px inset #c0c0c0 !important;
            }
            
            .btn-success {
                background: #008000 !important;
                color: white !important;
                border: 2px outset #008000 !important;
            }
            
            .btn-success:hover {
                background: #00a000 !important;
            }
            
            .btn-danger {
                background: #800000 !important;
                color: white !important;
                border: 2px outset #800000 !important;
            }
            
            .btn-danger:hover {
                background: #a00000 !important;
            }
            
            .btn-warning {
                background: #808000 !important;
                color: white !important;
                border: 2px outset #808000 !important;
            }
            
            .btn-warning:hover {
                background: #a0a000 !important;
            }
            
            .btn-secondary {
                background: #808080 !important;
                color: white !important;
                border: 2px outset #808080 !important;
            }
            
            .btn-secondary:hover {
                background: #a0a0a0 !important;
            }
            
            .tabs {
                border: none !important;
                background: #c0c0c0 !important;
            }
            
            .tab {
                background: #c0c0c0 !important;
                color: #000000 !important;
                border: 1px outset #c0c0c0 !important;
                border-radius: 0 !important;
                margin-right: 2px !important;
            }
            
            .tab:hover {
                background: #dfdfdf !important;
            }
            
            .tab.active {
                background: #dfdfdf !important;
                border: 1px inset #c0c0c0 !important;
            }
            
            .form-group input,
            .form-group select,
            .form-group textarea {
                background: white !important;
                color: #000000 !important;
                border: 2px inset #c0c0c0 !important;
                border-radius: 0 !important;
                font-family: "MS Sans Serif", sans-serif !important;
            }
            
            .form-group label {
                color: #000000 !important;
                font-family: "MS Sans Serif", sans-serif !important;
                font-size: 11px !important;
            }
            
            .api-key-item {
                background: #dfdfdf !important;
                border: 1px inset #c0c0c0 !important;
                border-radius: 0 !important;
                color: #000000 !important;
            }
            
            .api-key-name {
                color: #000000 !important;
                font-family: "MS Sans Serif", sans-serif !important;
            }
            
            .api-key-value {
                color: #000080 !important;
                font-family: "Courier New", monospace !important;
            }
            
            .plan-card {
                background: #c0c0c0 !important;
                border: 2px inset #c0c0c0 !important;
                border-radius: 0 !important;
                color: #000000 !important;
            }
            
            .plan-card.current {
                border: 2px outset #c0c0c0 !important;
                background: #dfdfdf !important;
            }
            
            .plan-card.current::before {
                background: #0080ff !important;
                color: white !important;
                border-radius: 0 !important;
                font-family: "MS Sans Serif", sans-serif !important;
                font-size: 10px !important;
            }
            
            .plan-name {
                color: #000000 !important;
                font-family: "MS Sans Serif", sans-serif !important;
            }
            
            .plan-price {
                color: #000080 !important;
                font-family: "MS Sans Serif", sans-serif !important;
            }
            
            .brand-preview {
                background: white !important;
                border: 2px inset #c0c0c0 !important;
                border-radius: 0 !important;
                color: #000000 !important;
            }
            
            .logo-upload {
                border: 2px inset #c0c0c0 !important;
                border-radius: 0 !important;
                background: white !important;
                color: #000000 !important;
            }
            
            .logo-upload:hover {
                background: #f0f0f0 !important;
            }
            
            .color-preview {
                border: 1px solid #000000 !important;
                border-radius: 0 !important;
            }
            
            .section-title {
                color: #000000 !important;
                font-family: "MS Sans Serif", sans-serif !important;
                border-bottom: 1px solid #808080 !important;
            }
            
            .tier-item {
                background: #dfdfdf !important;
                border: 1px inset #c0c0c0 !important;
                border-radius: 0 !important;
            }
            
            .help-text {
                color: #000080 !important;
                font-family: "MS Sans Serif", sans-serif !important;
            }
            
            /* Status indicators */
            .status-active {
                color: #008000 !important;
            }
            
            .status-inactive {
                color: #800000 !important;
            }
            
            /* Checkbox and radio styling */
            input[type="checkbox"],
            input[type="radio"] {
                border: 2px inset #c0c0c0 !important;
                background: white !important;
            }
            
            /* Table styling */
            table {
                background: white !important;
                border: 2px inset #c0c0c0 !important;
                border-radius: 0 !important;
                color: #000000 !important;
            }
            
            th, td {
                border: 1px solid #808080 !important;
                color: #000000 !important;
                font-family: "MS Sans Serif", sans-serif !important;
            }
            
            th {
                background: #c0c0c0 !important;
            }
            
            /* Scrollbars */
            ::-webkit-scrollbar {
                width: 16px !important;
                background: #c0c0c0 !important;
            }
            
            ::-webkit-scrollbar-thumb {
                background: #808080 !important;
                border: 1px outset #c0c0c0 !important;
            }
            
            ::-webkit-scrollbar-corner {
                background: #c0c0c0 !important;
            }
        `;

        // Inject the classic theme CSS
        const styleElement = document.createElement('style');
        styleElement.id = 'classic-theme-style';
        styleElement.textContent = classicCSS;
        document.head.appendChild(styleElement);

        // Add classic class to body
        document.body.classList.add('classic-mode');
    }

    applyModernTheme() {
        // Remove classic theme styles
        const existingStyle = document.getElementById('classic-theme-style');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        // Remove classic class from body
        document.body.classList.remove('classic-mode');
    }
}

// Global function for toggle button
function toggleClassicMode() {
    if (window.classicModeManager) {
        window.classicModeManager.toggleClassicMode();
    }
}

// Initialize the classic mode manager
window.classicModeManager = new ClassicModeManager();