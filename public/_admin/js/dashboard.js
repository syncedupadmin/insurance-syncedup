// Admin Dashboard Functions with Auto-Refresh

// Auto-refresh variables
let autoRefreshInterval = null;
let refreshIntervalTime = 30000; // 30 seconds default
let lastRefreshTime = null;
let currentView = 'dashboard';

// Initialize auto-refresh on page load
document.addEventListener('DOMContentLoaded', () => {
    startAutoRefresh();
    addRefreshControls();
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
        case 'agents':
            await silentRefreshAgentPerformance();
            break;
        case 'users':
            await silentRefreshUsersData();
            break;
        case 'licenses':
            await silentRefreshLicensesData();
            break;
        case 'commissions':
            await silentRefreshCommissionsData();
            break;
        case 'reports':
            await silentRefreshReportsData();
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

    const authToken = localStorage.getItem('auth_token');
    const data = await window.SilentRefresh.silentFetch('/api/admin/dashboard-metrics', authToken);

    if (data && data.data) {
        // Define mapping of selectors to data paths for Admin portal
        const updateMap = {
            '#activeAgents': { path: 'data.activeAgents', format: 'number' },
            '#mtdRevenue': { path: 'data.mtdRevenue', format: 'currency' },
            '#policiesSold': { path: 'data.policiesSold', format: 'number' },
            '#activeLeads': { path: 'data.activeLeads', format: 'number' },
            '#conversionRate': { path: 'data.conversionRate', format: 'text' },
            '#totalCommissions': { path: 'data.totalCommissions', format: 'currency' },
            '#systemStatus': { path: 'data.systemStatus', format: 'text' },
            // Add metric cards if they exist
            '.metric-card:nth-child(1) .metric-value': { path: 'data.totalUsers', format: 'number' },
            '.metric-card:nth-child(2) .metric-value': { path: 'data.activeUsers', format: 'number' },
            '.metric-card:nth-child(3) .metric-value': { path: 'data.totalRevenue', format: 'currency' },
            '.metric-card:nth-child(4) .metric-value': { path: 'data.pendingCommissions', format: 'currency' }
        };

        // Apply differential updates
        window.SilentRefresh.applyDifferentialUpdates(data, updateMap);
    } else if (data) {
        // Fallback to old update method if data structure is different
        updateDashboardMetrics(data);
    }
}

function refreshDashboard() {
    // Keep old function as fallback
    fetch('/api/admin/dashboard-metrics', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            updateDashboardMetrics(data);
        }
    })
    .catch(console.error);
}

async function silentRefreshAgentPerformance() {
    // For now, fallback to old method
    if (typeof loadAgentPerformance === 'function') {
        loadAgentPerformance();
    }
}

async function silentRefreshUsersData() {
    // For now, fallback to old method
    if (typeof loadUsersData === 'function') {
        loadUsersData();
    }
}

async function silentRefreshLicensesData() {
    // For now, fallback to old method
    if (typeof loadLicensesData === 'function') {
        loadLicensesData();
    }
}

async function silentRefreshCommissionsData() {
    // For now, fallback to old method
    if (typeof loadCommissionsData === 'function') {
        loadCommissionsData();
    }
}

async function silentRefreshReportsData() {
    // For now, fallback to old method
    if (typeof generateReports === 'function') {
        generateReports();
    }
}

function updateDashboardMetrics(data) {
    // Update metric cards with new data
    const metrics = {
        'total-users': data.totalUsers || 0,
        'active-agents': data.activeAgents || 0,
        'total-policies': data.totalPolicies || 0,
        'monthly-revenue': data.monthlyRevenue || '$0',
        'conversion-rate': data.conversionRate || '0%',
        'avg-policy-value': data.avgPolicyValue || '$0',
        'pending-claims': data.pendingClaims || 0,
        'total-commissions': data.totalCommissions || '$0'
    };

    Object.keys(metrics).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
            // Animate the update
            element.style.opacity = '0.5';
            setTimeout(() => {
                element.textContent = metrics[key];
                element.style.opacity = '1';
            }, 200);
        }
    });

    // Update charts if they exist
    if (typeof updateCharts === 'function') {
        updateCharts(data.chartData);
    }
}

// Removed showRefreshIndicator - using silent refresh instead

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

    // Try to find a good place to insert the controls
    const existingControls = header.querySelector('#refresh-controls');
    if (existingControls) {
        existingControls.remove();
    }

    // Look for nav or other elements to insert before
    const nav = header.querySelector('nav');
    if (nav) {
        header.insertBefore(refreshControls, nav);
    } else {
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

function setupViewTracking() {
    // Track navigation clicks to update current view
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link && link.href) {
            const href = link.getAttribute('href');
            if (href) {
                if (href.includes('agent-performance')) currentView = 'agents';
                else if (href.includes('users')) currentView = 'users';
                else if (href.includes('licenses')) currentView = 'licenses';
                else if (href.includes('commissions')) currentView = 'commissions';
                else if (href.includes('reports')) currentView = 'reports';
                else if (href.includes('index') || href === '/admin/') currentView = 'dashboard';
            }
        }
    });

    // Detect initial view
    detectCurrentView();
}

function detectCurrentView() {
    const path = window.location.pathname;
    if (path.includes('agent-performance')) currentView = 'agents';
    else if (path.includes('users')) currentView = 'users';
    else if (path.includes('licenses')) currentView = 'licenses';
    else if (path.includes('commissions')) currentView = 'commissions';
    else if (path.includes('reports')) currentView = 'reports';
    else currentView = 'dashboard';
}

// Export functions for use in other scripts
window.adminDashboard = {
    startAutoRefresh,
    stopAutoRefresh,
    refreshCurrentView,
    updateRefreshInterval,
    manualRefresh
};