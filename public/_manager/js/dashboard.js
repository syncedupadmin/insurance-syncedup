// Manager Dashboard Functions with Auto-Refresh

// Auto-refresh variables
let autoRefreshInterval = null;
let refreshIntervalTime = 30000; // 30 seconds default
let lastRefreshTime = null;
let currentView = 'dashboard';

// Initialize auto-refresh on page load
document.addEventListener('DOMContentLoaded', () => {
    startAutoRefresh();
    // addRefreshControls(); // Removed - using silent refresh indicator instead

    // Track view changes
    setupViewTracking();
});

// ============= AUTO-REFRESH FUNCTIONS =============

function startAutoRefresh() {
    // Clear any existing interval
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }

    // Set up new interval
    autoRefreshInterval = setInterval(() => {
        refreshCurrentView();
    }, refreshIntervalTime);

    // Update last refresh time
    lastRefreshTime = new Date();
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

async function refreshCurrentView() {
    // Save state before refresh
    if (window.SilentRefresh) {
        window.SilentRefresh.saveViewState();
        window.SilentRefresh.showSilentRefreshIndicator();
    }

    // Refresh based on current view
    switch(currentView) {
        case 'dashboard':
            await silentRefreshDashboard();
            break;
        case 'team':
            await silentRefreshTeamStats();
            break;
        case 'performance':
            await silentRefreshPerformanceMetrics();
            break;
        case 'leads':
            await silentRefreshLeadsData();
            break;
    }

    // Restore state after refresh
    if (window.SilentRefresh) {
        window.SilentRefresh.restoreViewState();
    }

    // Update last refresh time
    lastRefreshTime = new Date();
    updateRefreshStatus();
}

async function silentRefreshDashboard() {
    if (!window.SilentRefresh) {
        // Fallback to old method if core not loaded
        refreshDashboard();
        return;
    }

    // Use cookie-based authentication
    const data = await window.SilentRefresh.silentFetch('/api/manager/dashboard-metrics');

    if (data && data.data) {
        // Define mapping of selectors to data paths for Manager portal
        const updateMap = {
            '#teamPerformance': { path: 'data.teamPerformance', format: 'number' },
            '#monthlyTarget': { path: 'data.monthlyTarget', format: 'currency' },
            '#completedTasks': { path: 'data.completedTasks', format: 'number' },
            '#activeAgents': { path: 'data.activeAgents', format: 'number' },
            '#mtdSales': { path: 'data.mtdSales', format: 'currency' },
            '#conversionRate': { path: 'data.conversionRate', format: 'text' },
            // Add metric cards if they exist
            '.metric-card:nth-child(1) .metric-value': { path: 'data.teamPerformance', format: 'number' },
            '.metric-card:nth-child(2) .metric-value': { path: 'data.monthlyTarget', format: 'number' },
            '.metric-card:nth-child(3) .metric-value': { path: 'data.completedTasks', format: 'number' },
            '.metric-card:nth-child(4) .metric-value': { path: 'data.pendingLeads', format: 'number' }
        };

        // Apply differential updates
        window.SilentRefresh.applyDifferentialUpdates(data, updateMap);
    } else if (data) {
        // Fallback to old update method if data structure is different
        updateDashboardMetrics(data);
    } else {
        // If no data, try old method
        refreshDashboard();
    }
}

function refreshDashboard() {
    // Keep old function as fallback
    if (typeof loadDashboardData === 'function') {
        loadDashboardData();
    } else {
        // If no specific function, reload the metrics
        const metricsCards = document.querySelectorAll('.metric-card');
        if (metricsCards.length > 0) {
            // Reload dashboard data via API
            fetch('/api/manager/dashboard-metrics', {
                credentials: 'include'
            })
            .then(res => res.json())
            .then(data => {
                updateDashboardMetrics(data);
            })
            .catch(console.error);
        }
    }
}

async function silentRefreshTeamStats() {
    // For now, fallback to old method
    const teamTable = document.querySelector('#team-performance-table');
    if (teamTable && typeof loadTeamData === 'function') {
        loadTeamData();
    }
}

async function silentRefreshPerformanceMetrics() {
    // For now, fallback to old method
    if (typeof updatePerformanceCharts === 'function') {
        updatePerformanceCharts();
    }
}

async function silentRefreshLeadsData() {
    // For now, fallback to old method
    if (typeof loadLeadsData === 'function') {
        loadLeadsData();
    }
}

function updateDashboardMetrics(data) {
    // Update metric cards with new data
    const metrics = {
        'total-agents': data.totalAgents || 0,
        'active-agents': data.activeAgents || 0,
        'total-sales': data.totalSales || 0,
        'conversion-rate': data.conversionRate || '0%',
        'avg-premium': data.avgPremium || '$0',
        'total-commission': data.totalCommission || '$0'
    };

    Object.keys(metrics).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
            element.textContent = metrics[key];
        }
    });
}

// Removed showRefreshIndicator - using silent refresh instead

/* Removed timer controls - using silent refresh
function addRefreshControls() {
    // Find the header or create a container for refresh controls
    const header = document.querySelector('.header') || document.querySelector('header');
    if (!header) return;

    const refreshControls = document.createElement('div');
    refreshControls.id = 'refresh-controls';
    refreshControls.style.cssText = `
        display: flex;
        align-items: center;
        gap: 15px;
        margin-left: auto;
        margin-right: 20px;
        font-size: 14px;
    `;

    refreshControls.innerHTML = `
        <div id="refresh-status" style="color: rgba(255,255,255,0.8);">
            <i class="fas fa-clock"></i>
            <span id="last-refresh">Never</span>
        </div>
        <select id="refresh-interval" style="
            background: rgba(255,255,255,0.1);
            color: white;
            border: 1px solid rgba(255,255,255,0.2);
            padding: 5px 10px;
            border-radius: 5px;
            cursor: pointer;
            backdrop-filter: blur(10px);
        " onchange="updateRefreshInterval(this.value)">
            <option value="0">Auto-refresh: OFF</option>
            <option value="10000">Every 10 seconds</option>
            <option value="30000" selected>Every 30 seconds</option>
            <option value="60000">Every 1 minute</option>
            <option value="300000">Every 5 minutes</option>
        </select>
        <button class="btn btn-sm" onclick="manualRefresh()" style="
            padding: 5px 12px;
            font-size: 12px;
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            backdrop-filter: blur(10px);
        ">
            <i class="fas fa-sync"></i> Refresh Now
        </button>
    `;

    // Try to insert in header
    const navLinks = header.querySelector('.nav-links');
    if (navLinks) {
        navLinks.parentNode.insertBefore(refreshControls, navLinks.nextSibling);
    } else {
        // Fallback: append to header
        header.appendChild(refreshControls);
    }

    // Start status updates
    updateRefreshStatus();
    setInterval(updateRefreshStatus, 1000);
}

function updateRefreshInterval(value) {
    refreshIntervalTime = parseInt(value);

    if (refreshIntervalTime === 0) {
        stopAutoRefresh();
        document.getElementById('last-refresh').textContent = 'Auto-refresh disabled';
    } else {
        startAutoRefresh();
        document.getElementById('last-refresh').textContent = 'Just now';
    }
}

function manualRefresh() {
    refreshCurrentView();
}

function updateRefreshStatus() {
    if (!lastRefreshTime) return;

    const statusElement = document.getElementById('last-refresh');
    if (!statusElement) return;

    const now = new Date();
    const diff = Math.floor((now - lastRefreshTime) / 1000);

    if (diff < 60) {
        statusElement.textContent = diff === 0 ? 'Just now' : `${diff}s ago`;
    } else if (diff < 3600) {
        const minutes = Math.floor(diff / 60);
        statusElement.textContent = `${minutes}m ago`;
    } else {
        const hours = Math.floor(diff / 3600);
        statusElement.textContent = `${hours}h ago`;
    }
}
*/ // End of removed timer controls

function setupViewTracking() {
    // Track navigation clicks to update current view
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link && link.href) {
            const href = link.getAttribute('href');
            if (href) {
                if (href.includes('team')) currentView = 'team';
                else if (href.includes('performance')) currentView = 'performance';
                else if (href.includes('leads')) currentView = 'leads';
                else if (href.includes('index') || href === '/manager/') currentView = 'dashboard';
            }
        }
    });

    // Also track programmatic view changes
    if (window.history && window.history.pushState) {
        const originalPushState = window.history.pushState;
        window.history.pushState = function() {
            originalPushState.apply(window.history, arguments);
            detectCurrentView();
        };
    }
}

function detectCurrentView() {
    const path = window.location.pathname;
    if (path.includes('team')) currentView = 'team';
    else if (path.includes('performance')) currentView = 'performance';
    else if (path.includes('leads')) currentView = 'leads';
    else currentView = 'dashboard';
}

// Export functions for use in inline scripts
window.managerDashboard = {
    startAutoRefresh,
    stopAutoRefresh,
    refreshCurrentView,
    updateRefreshInterval,
    manualRefresh
};