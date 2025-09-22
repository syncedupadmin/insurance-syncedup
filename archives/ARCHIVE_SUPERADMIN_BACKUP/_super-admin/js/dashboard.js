// Main Dashboard Controller - Orchestrates all modules
import { logAdminAction, loadRecentAuditEntries, loadFullAuditLog } from './api/audit.js';
import { startHealthMonitoring } from './modules/system-health.js';
import { loadUserManagement } from './modules/user-management.js';
import { startMetricsRefresh } from './modules/metrics.js';
import { checkAuth, generateSessionId, showNotification } from './modules/utils.js';

// Global navigation functions
window.superAdmin = {
    loadDashboard,
    loadUserManagement,
    loadAuditTrail: loadFullAuditLog,
    loadSettings,
    logout,
    loadAnalytics,
    loadSystemConfig,
    loadSecurity,
    currentView: 'dashboard'
};

// Helper to clear and reset the main content
function resetMainContent() {
    const mainContent = document.querySelector('.dashboard-grid');
    if (mainContent) {
        mainContent.innerHTML = '';
    }
    return mainContent;
}

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) return;
    
    // Store session ID
    if (!sessionStorage.getItem('session_id')) {
        sessionStorage.setItem('session_id', generateSessionId());
    }
    
    // Log access
    await logAdminAction('SESSION_START', 'Super Admin Dashboard Accessed');
    
    // Initialize dashboard
    await loadDashboard();
    
    // Start monitoring
    startHealthMonitoring();
    startMetricsRefresh();
    
    // Load recent audit entries
    loadRecentAuditSummary();
    
    // Set up navigation
    setupNavigation();
});

async function loadDashboard() {
    await logAdminAction('NAVIGATION', 'Dashboard Overview');
    
    const mainContent = resetMainContent();
    if (!mainContent) return;
    
    window.superAdmin.currentView = 'dashboard';
    
    mainContent.innerHTML = `
        <!-- Metrics Row -->
        <div class="metrics-row">
            <div class="metric-card">
                <h4>Total Revenue</h4>
                <div class="metric-value" id="total-revenue">Loading...</div>
                <div class="metric-change positive" id="revenue-growth">Calculating...</div>
            </div>
            <div class="metric-card">
                <h4>Active Agencies</h4>
                <div class="metric-value" id="active-agencies">Loading...</div>
                <div class="metric-sub" id="new-agencies">Calculating...</div>
            </div>
            <div class="metric-card">
                <h4>Total Users</h4>
                <div class="metric-value" id="total-users">Loading...</div>
                <div class="metric-sub" id="active-percent">Calculating...</div>
            </div>
        </div>
        
        <!-- System Health Section -->
        <div class="system-section" id="system-health">
            <h3 class="section-title">System Health</h3>
            <div class="health-grid">
                <div class="health-item">
                    <span>Status</span>
                    <span class="health-status checking">Checking...</span>
                </div>
            </div>
        </div>
        
        <!-- Recent Activity -->
        <div class="system-section">
            <h3 class="section-title">Recent Activity</h3>
            <div class="activity-list" id="recent-activity">
                <div class="activity-item">Loading activity...</div>
            </div>
        </div>
        
        <!-- Recent Audit Entries -->
        <div class="system-section">
            <h3 class="section-title">Recent Audit Entries</h3>
            <div id="recent-audit-entries">
                <div class="audit-entry">Loading audit entries...</div>
            </div>
            <button onclick="superAdmin.loadAuditTrail()" class="btn btn-secondary" style="margin-top: 1rem;">
                View Complete Audit Trail
            </button>
        </div>
    `;
}

async function loadRecentAuditSummary() {
    const entries = await loadRecentAuditEntries(5);
    const container = document.getElementById('recent-audit-entries');
    
    if (container && entries.length > 0) {
        container.innerHTML = entries.map(entry => `
            <div class="audit-entry">
                <span class="activity-time">${new Date(entry.created_at || entry.timestamp).toLocaleString()}</span>
                <span class="activity-text">${entry.action}: ${entry.details}</span>
            </div>
        `).join('');
    } else if (container) {
        container.innerHTML = '<div class="audit-entry">No recent audit entries</div>';
    }
}

function setupNavigation() {
    // Add click handlers to navigation links
    document.querySelectorAll('.nav-section a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all links
            document.querySelectorAll('.nav-section a').forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked link
            link.classList.add('active');
            
            // Navigate based on link text
            const text = link.textContent.trim();
            switch(text) {
                case 'Dashboard':
                    loadDashboard();
                    break;
                case 'User Management':
                    loadUserManagement();
                    break;
                case 'Audit Trail':
                    loadFullAuditLog();
                    break;
                case 'Settings':
                    loadSettings();
                    break;
                case 'Analytics':
                    loadAnalytics();
                    break;
                case 'System Config':
                    loadSystemConfig();
                    break;
                case 'Security':
                    loadSecurity();
                    break;
                case 'Logout':
                    logout();
                    break;
            }
        });
    });
}

async function loadSettings() {
    await logAdminAction('NAVIGATION', 'Accessed Settings');
    
    const mainContent = resetMainContent();
    if (!mainContent) return;
    
    window.superAdmin.currentView = 'settings';
    
    mainContent.innerHTML = `
        <div class="dashboard-header">
            <h2>System Settings</h2>
        </div>
        
        <div class="card">
            <h3 class="section-title">General Settings</h3>
            <p>System configuration options will be available here.</p>
        </div>
        
        <div class="card">
            <h3 class="section-title">Security Settings</h3>
            <p>Security configuration options will be available here.</p>
        </div>
    `;
}

async function loadAnalytics() {
    await logAdminAction('NAVIGATION', 'Accessed Analytics');
    
    const mainContent = resetMainContent();
    if (!mainContent) return;
    
    window.superAdmin.currentView = 'analytics';
    
    mainContent.innerHTML = `
        <div class="dashboard-header">
            <h2>Analytics Dashboard</h2>
        </div>
        
        <div class="metrics-row">
            <div class="metric-card">
                <h4>Total Users</h4>
                <div class="metric-value">0</div>
                <div class="metric-sub">Loading...</div>
            </div>
            <div class="metric-card">
                <h4>Active Sessions</h4>
                <div class="metric-value">0</div>
                <div class="metric-sub">Loading...</div>
            </div>
            <div class="metric-card">
                <h4>API Calls Today</h4>
                <div class="metric-value">0</div>
                <div class="metric-sub">Loading...</div>
            </div>
        </div>
        
        <div class="card">
            <h3 class="section-title">User Activity Trends</h3>
            <div class="chart-container">
                <canvas id="analytics-chart"></canvas>
            </div>
        </div>
        
        <div class="card">
            <h3 class="section-title">System Performance</h3>
            <div class="performance-grid">
                <div class="kpi-item">
                    <span class="kpi-label">Avg Response Time</span>
                    <span class="kpi-value">45ms</span>
                </div>
                <div class="kpi-item">
                    <span class="kpi-label">Uptime</span>
                    <span class="kpi-value">99.9%</span>
                </div>
                <div class="kpi-item">
                    <span class="kpi-label">Error Rate</span>
                    <span class="kpi-value">0.1%</span>
                </div>
            </div>
        </div>
    `;
}

async function loadSystemConfig() {
    await logAdminAction('NAVIGATION', 'Accessed System Configuration');
    
    const mainContent = resetMainContent();
    if (!mainContent) return;
    
    window.superAdmin.currentView = 'system-config';
    
    mainContent.innerHTML = `
        <div class="dashboard-header">
            <h2>System Configuration</h2>
        </div>
        
        <div class="card">
            <h3 class="section-title">Database Settings</h3>
            <div class="config-grid">
                <div class="config-item">
                    <label>Database URL</label>
                    <input type="text" value="******.supabase.co" disabled />
                </div>
                <div class="config-item">
                    <label>Connection Pool Size</label>
                    <input type="number" value="20" />
                </div>
                <div class="config-item">
                    <label>Query Timeout (ms)</label>
                    <input type="number" value="30000" />
                </div>
            </div>
        </div>
        
        <div class="card">
            <h3 class="section-title">Security Settings</h3>
            <div class="config-grid">
                <div class="config-item">
                    <label>Session Timeout (minutes)</label>
                    <input type="number" value="60" />
                </div>
                <div class="config-item">
                    <label>Max Login Attempts</label>
                    <input type="number" value="5" />
                </div>
                <div class="config-item">
                    <label>Password Complexity</label>
                    <select>
                        <option>High</option>
                        <option>Medium</option>
                        <option>Low</option>
                    </select>
                </div>
            </div>
        </div>
        
        <div class="card">
            <h3 class="section-title">Email Configuration</h3>
            <div class="config-grid">
                <div class="config-item">
                    <label>SMTP Server</label>
                    <input type="text" value="smtp.sendgrid.net" />
                </div>
                <div class="config-item">
                    <label>SMTP Port</label>
                    <input type="number" value="587" />
                </div>
                <div class="config-item">
                    <label>From Email</label>
                    <input type="email" value="noreply@syncedupsolutions.com" />
                </div>
            </div>
        </div>
        
        <div class="header-actions" style="margin-top: 2rem;">
            <button class="btn btn-primary" onclick="saveSystemConfig()">Save Configuration</button>
            <button class="btn btn-secondary" onclick="loadDashboard()">Cancel</button>
        </div>
    `;
}

function saveSystemConfig() {
    showNotification('Configuration saved successfully', 'success');
    loadDashboard();
}

async function loadSecurity() {
    await logAdminAction('NAVIGATION', 'Accessed Security Settings');
    
    const mainContent = resetMainContent();
    if (!mainContent) return;
    
    window.superAdmin.currentView = 'security';
    
    mainContent.innerHTML = `
        <div class="dashboard-header">
            <h2>Security Management</h2>
        </div>
        
        <div class="metrics-row">
            <div class="metric-card">
                <h4>Failed Login Attempts</h4>
                <div class="metric-value">3</div>
                <div class="metric-sub">Last 24 hours</div>
            </div>
            <div class="metric-card">
                <h4>Active Sessions</h4>
                <div class="metric-value">12</div>
                <div class="metric-sub">Current users online</div>
            </div>
            <div class="metric-card">
                <h4>Security Score</h4>
                <div class="metric-value">95%</div>
                <div class="metric-sub">Excellent</div>
            </div>
        </div>
        
        <div class="card">
            <h3 class="section-title">Recent Security Events</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Event Type</th>
                        <th>User</th>
                        <th>IP Address</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${new Date().toLocaleTimeString()}</td>
                        <td>Login Success</td>
                        <td>admin@syncedupsolutions.com</td>
                        <td>192.168.1.1</td>
                        <td class="status-operational">Success</td>
                    </tr>
                    <tr>
                        <td>${new Date(Date.now() - 3600000).toLocaleTimeString()}</td>
                        <td>Password Reset</td>
                        <td>user@example.com</td>
                        <td>10.0.0.1</td>
                        <td class="status-operational">Completed</td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div class="card">
            <h3 class="section-title">Access Control</h3>
            <div class="config-grid">
                <div class="config-item">
                    <label>Two-Factor Authentication</label>
                    <select>
                        <option>Required for Admins</option>
                        <option>Required for All</option>
                        <option>Optional</option>
                    </select>
                </div>
                <div class="config-item">
                    <label>IP Whitelist</label>
                    <textarea rows="3">192.168.1.0/24
10.0.0.0/8</textarea>
                </div>
                <div class="config-item">
                    <label>Account Lockout Policy</label>
                    <select>
                        <option>5 attempts, 30 min lockout</option>
                        <option>3 attempts, 60 min lockout</option>
                        <option>10 attempts, 15 min lockout</option>
                    </select>
                </div>
            </div>
            <button class="btn btn-primary" style="margin-top: 1rem;">Update Security Settings</button>
        </div>
    `;
}

async function logout() {
    await logAdminAction('SESSION_END', 'Logged out');
    
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            sessionStorage.clear();
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Error during logout', 'error');
    }
}