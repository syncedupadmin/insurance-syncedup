// System Health Module - Monitors and displays system status
export async function loadSystemHealth() {
    try {
        const response = await fetch('/api/super-admin/system-health', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const health = await response.json();
            updateHealthDisplay(health);
        }
    } catch (error) {
        console.error('Error loading system health:', error);
        showHealthError();
    }
}

function updateHealthDisplay(health) {
    const container = document.getElementById('system-health');
    if (!container) return;
    
    container.innerHTML = `
        <h3 class="section-title">System Health</h3>
        <div class="health-grid">
            <div class="health-item">
                <span>Database</span>
                <span class="health-status ${health.database ? 'operational' : 'error'}">
                    ${health.database ? 'Operational' : 'Error'}
                </span>
            </div>
            <div class="health-item">
                <span>API Gateway</span>
                <span class="health-status ${health.api ? 'operational' : 'error'}">
                    ${health.api ? 'Operational' : 'Error'}
                </span>
            </div>
            <div class="health-item">
                <span>Auth Service</span>
                <span class="health-status ${health.auth ? 'operational' : 'error'}">
                    ${health.auth ? 'Operational' : 'Error'}
                </span>
            </div>
            <div class="health-item">
                <span>Storage</span>
                <span class="health-status ${health.storage ? 'operational' : 'error'}">
                    ${health.storage ? 'Operational' : 'Error'}
                </span>
            </div>
        </div>
    `;
}

function showHealthError() {
    const container = document.getElementById('system-health');
    if (!container) return;
    
    container.innerHTML = `
        <h3 class="section-title">System Health</h3>
        <div class="health-grid">
            <div class="health-item">
                <span>Status</span>
                <span class="health-status error">Connection Error</span>
            </div>
        </div>
    `;
}

// Auto-refresh health status every 30 seconds
export function startHealthMonitoring() {
    loadSystemHealth();
    setInterval(loadSystemHealth, 30000);
}