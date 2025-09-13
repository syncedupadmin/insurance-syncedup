// Agent Portal Navigation Component
// Centralized navigation for all agent pages

(function() {
    // Define navigation items
    const navItems = [
        { href: '/agent', icon: 'layout-dashboard', text: 'Dashboard' },
        { href: '/agent/quotes', icon: 'calculator', text: 'Quote Products' },
        { href: '/agent/commissions', icon: 'dollar-sign', text: 'My Commissions' },
        { href: '/agent/settings', icon: 'settings', text: 'Settings' }
    ];

    // Function to render navigation
    function renderAgentNavigation() {
        const navElement = document.getElementById('agentNavigation');
        if (!navElement) return;

        // Get current path
        const currentPath = window.location.pathname;
        
        // Build navigation HTML
        let navHTML = '';
        navItems.forEach(item => {
            const isActive = currentPath === item.href || 
                           (item.href !== '/agent' && currentPath.startsWith(item.href));
            
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
            lucide.createIcons();
        }
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderAgentNavigation);
    } else {
        renderAgentNavigation();
    }

    // Export for use in other scripts if needed
    window.AgentNavigation = {
        render: renderAgentNavigation,
        items: navItems
    };
})();