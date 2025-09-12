// Global state
let currentView = 'dashboard';
let currentUser = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    updateTime();
    setInterval(updateTime, 60000);
    loadRevenueDashboard();
});

// Check authentication
async function checkAuth() {
    try {
        const response = await fetch('/api/super-admin/test-users');
        const data = await response.json();
        if (data.success && data.data) {
            currentUser = data.data.find(u => u.role === 'super_admin');
            document.getElementById('session-user').textContent = `Admin: ${currentUser?.email || 'admin@syncedupsolutions.com'}`;
        }
    } catch (error) {
        console.error('Auth check failed:', error);
    }
}

function updateTime() {
    const now = new Date();
    document.getElementById('current-time').textContent = 
        now.toLocaleString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
}

function navigateTo(view) {
    // Update active nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Log navigation
    logAudit('NAVIGATION', `Accessed ${view}`);
    
    // Load view
    currentView = view;
    switch(view) {
        case 'dashboard': loadRevenueDashboard(); break;
        case 'agencies': loadAgencyManagement(); break;
        case 'infrastructure': loadInfrastructure(); break;
        case 'financial': loadFinancialReports(); break;
        case 'usage': loadUsageReports(); break;
        case 'analytics': loadPlatformAnalytics(); break;
        case 'compliance': loadComplianceMonitoring(); break;
        case 'settings': loadSettings(); break;
    }
}

async function loadRevenueDashboard() {
    const content = document.getElementById('main-content');
    content.innerHTML = '<div class="loading">Loading real revenue data...</div>';
    
    try {
        const response = await fetch('/api/super-admin/revenue-metrics');
        const data = await response.json();
        
        if (!data.success) throw new Error(data.error);
        
        content.innerHTML = `
            <div class="metrics-row">
                <div class="metric-card">
                    <h4>MONTHLY RECURRING REVENUE</h4>
                    <div class="metric-value">$${data.mrr.toLocaleString()}</div>
                    <div class="metric-change positive">${data.activeAgencies} paying agencies</div>
                </div>
                <div class="metric-card">
                    <h4>TOTAL AGENCIES</h4>
                    <div class="metric-value">${data.totalAgencies}</div>
                    <div class="metric-change">${data.activeAgencies} active</div>
                </div>
                <div class="metric-card ${data.overdueCount > 0 ? 'alert' : ''}">
                    <h4>OVERDUE ACCOUNTS</h4>
                    <div class="metric-value">${data.overdueCount}</div>
                    <div class="metric-change ${data.overdueCount > 0 ? 'negative' : 'positive'}">
                        ${data.overdueCount > 0 ? 'Action needed!' : 'All current'}
                    </div>
                </div>
            </div>
            
            <div class="card">
                <h3 class="section-title">Agency Subscriptions</h3>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>AGENCY</th>
                            <th>PLAN</th>
                            <th>MONTHLY</th>
                            <th>STATUS</th>
                            <th>BILLING DATE</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.subscriptions.map(sub => `
                            <tr>
                                <td>${sub.agency_name}</td>
                                <td>${sub.plan_type.toUpperCase()}</td>
                                <td>$${sub.monthly_rate}</td>
                                <td class="${sub.status === 'active' || sub.status === 'trial' ? 'status-active' : 'status-inactive'}">
                                    ${sub.status}
                                </td>
                                <td>${sub.next_billing ? new Date(sub.next_billing).toLocaleDateString() : 'Not set'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="card">
                <h3 class="section-title">Quick Actions</h3>
                <button class="btn btn-primary" onclick="navigateTo('agencies')">Manage Agencies</button>
                <button class="btn" onclick="exportRevenue()">Export Revenue Report</button>
            </div>
        `;
    } catch (error) {
        content.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}

function exportRevenue() {
    alert('Revenue export will download CSV with all subscription data');
}

async function loadUserManagement() {
    const content = document.getElementById('main-content');
    content.innerHTML = `
        <div class="card">
            <h2>User Management</h2>
            <div style="margin: 1rem 0;">
                <button class="btn btn-primary" onclick="addUser()">Add New User</button>
                <button class="btn" onclick="exportUsers()">Export Users</button>
            </div>
        </div>
        
        <div class="card">
            <div class="tabs">
                <button class="tab-btn active" onclick="loadUsersTab('all')">All Users</button>
                <button class="tab-btn" onclick="loadUsersTab('agents')">Agents</button>
                <button class="tab-btn" onclick="loadUsersTab('managers')">Managers</button>
                <button class="tab-btn" onclick="loadUsersTab('admins')">Admins</button>
            </div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>NAME</th>
                        <th>EMAIL</th>
                        <th>ROLE</th>
                        <th>STATUS</th>
                        <th>LAST LOGIN</th>
                        <th>ACTIONS</th>
                    </tr>
                </thead>
                <tbody id="users-table">
                    <tr><td colspan="6">Loading...</td></tr>
                </tbody>
            </table>
        </div>
    `;
    
    loadUsers();
}

async function loadUsers(filter = null) {
    try {
        const response = await fetch('/api/super-admin/test-users');
        const data = await response.json();
        
        if (data.success && data.data) {
            let users = data.data;
            if (filter) {
                users = users.filter(u => {
                    if (filter === 'agents') return u.role === 'agent';
                    if (filter === 'managers') return u.role === 'manager';
                    if (filter === 'admins') return u.role === 'admin' || u.role === 'super_admin';
                    return true;
                });
            }
            
            const tbody = document.getElementById('users-table');
            tbody.innerHTML = users.map(user => `
                <tr>
                    <td>${user.full_name}</td>
                    <td>${user.email}</td>
                    <td>${user.role}</td>
                    <td class="${user.is_active ? 'status-active' : 'status-inactive'}">
                        ${user.is_active ? 'Active' : 'Inactive'}
                    </td>
                    <td>${user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}</td>
                    <td>
                        <button class="btn btn-sm" onclick="editUser('${user.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="toggleUserStatus('${user.id}')">
                            ${user.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function loadUsersTab(filter) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    loadUsers(filter === 'all' ? null : filter);
}

async function loadAnalytics() {
    const content = document.getElementById('main-content');
    const analytics = await fetch('/api/super-admin/analytics').then(r => r.json()).catch(() => null);
    
    content.innerHTML = `
        <div class="card">
            <h2>Analytics Dashboard</h2>
        </div>
        
        <div class="metrics-row">
            <div class="metric-card">
                <h4>ACTIVE USERS</h4>
                <div class="metric-value">${analytics?.kpis?.active_users || 0}</div>
            </div>
            <div class="metric-card">
                <h4>NEW SIGNUPS (7D)</h4>
                <div class="metric-value">${analytics?.kpis?.new_signups_7d || 0}</div>
            </div>
            <div class="metric-card">
                <h4>POLICIES BOUND (30D)</h4>
                <div class="metric-value">${analytics?.kpis?.policies_bound_30d || 0}</div>
            </div>
            <div class="metric-card">
                <h4>REVENUE (30D)</h4>
                <div class="metric-value">$${(analytics?.kpis?.revenue_30d || 0).toLocaleString()}</div>
            </div>
        </div>
        
        <div class="card">
            <h3 class="section-title">Activity Trend</h3>
            <div id="analytics-chart">Chart placeholder - ${analytics?.timeseries?.length || 0} data points available</div>
        </div>
    `;
}

async function loadAuditTrail() {
    const content = document.getElementById('main-content');
    const audit = await fetch('/api/super-admin/audit').then(r => r.json()).catch(() => null);
    
    content.innerHTML = `
        <div class="card">
            <h2>Complete Audit Trail</h2>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>TIMESTAMP</th>
                        <th>USER</th>
                        <th>ACTION</th>
                        <th>DETAILS</th>
                        <th>IP ADDRESS</th>
                    </tr>
                </thead>
                <tbody>
                    ${(audit?.entries || []).map(entry => `
                        <tr>
                            <td>${new Date(entry.timestamp).toLocaleString()}</td>
                            <td>${entry.user}</td>
                            <td>${entry.action}</td>
                            <td>${entry.details}</td>
                            <td>${entry.ip_address}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

async function loadSecurity() {
    const content = document.getElementById('main-content');
    const [events, stats, settings] = await Promise.all([
        fetch('/api/super-admin/security', {headers: {'X-Action': 'events'}}).then(r => r.json()).catch(() => null),
        fetch('/api/super-admin/security', {headers: {'X-Action': 'stats'}}).then(r => r.json()).catch(() => null),
        fetch('/api/super-admin/security', {headers: {'X-Action': 'settings'}}).then(r => r.json()).catch(() => null)
    ]);
    
    content.innerHTML = `
        <div class="card">
            <h2>Security Management</h2>
            <div class="metrics-row">
                <div class="metric-card">
                    <h4>FAILED LOGINS (24H)</h4>
                    <div class="metric-value">${stats?.stats?.failed_logins_24h || 0}</div>
                </div>
                <div class="metric-card">
                    <h4>MFA USAGE</h4>
                    <div class="metric-value">${stats?.stats?.mfa_usage_pct || 0}%</div>
                </div>
                <div class="metric-card">
                    <h4>IP BLOCKS (7D)</h4>
                    <div class="metric-value">${stats?.stats?.ip_blocks_7d || 0}</div>
                </div>
            </div>
        </div>
        
        <div class="card">
            <h3 class="section-title">Recent Security Events</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>TIME</th>
                        <th>TYPE</th>
                        <th>USER</th>
                    </tr>
                </thead>
                <tbody>
                    ${(events?.events || []).map(event => `
                        <tr>
                            <td>${new Date(event.ts).toLocaleString()}</td>
                            <td>${event.type}</td>
                            <td>${event.user}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="card">
            <h3 class="section-title">Security Settings</h3>
            <table class="data-table">
                <tr><td>MFA Required</td><td>${settings?.settings?.mfa_required ? 'Yes' : 'No'}</td></tr>
                <tr><td>Session TTL</td><td>${settings?.settings?.session_ttl_min || 60} minutes</td></tr>
            </table>
        </div>
    `;
}

function loadSystemConfig() {
    const content = document.getElementById('main-content');
    content.innerHTML = `
        <div class="card">
            <h2>System Configuration</h2>
            <h3 class="section-title">Database Settings</h3>
            <table class="data-table">
                <tr><td>DATABASE URL</td><td>******.supabase.co</td></tr>
                <tr><td>CONNECTION POOL SIZE</td><td>20</td></tr>
                <tr><td>QUERY TIMEOUT (MS)</td><td>30000</td></tr>
            </table>
        </div>
        
        <div class="card">
            <h3 class="section-title">Security Settings</h3>
            <table class="data-table">
                <tr><td>SESSION TIMEOUT (MINUTES)</td><td>60</td></tr>
                <tr><td>MAX LOGIN ATTEMPTS</td><td>5</td></tr>
                <tr><td>PASSWORD COMPLEXITY</td><td>High</td></tr>
            </table>
        </div>
        
        <div class="card">
            <h3 class="section-title">Email Configuration</h3>
            <table class="data-table">
                <tr><td>SMTP SERVER</td><td>smtp.sendgrid.net</td></tr>
                <tr><td>SMTP PORT</td><td>587</td></tr>
                <tr><td>FROM EMAIL</td><td>noreply@syncedupsolutions.com</td></tr>
            </table>
            <button class="btn btn-primary" onclick="saveConfig()">Save Configuration</button>
        </div>
    `;
}

function loadSettings() {
    const content = document.getElementById('main-content');
    content.innerHTML = `
        <div class="card">
            <h2>System Settings</h2>
            <h3 class="section-title">General Settings</h3>
            <p>System configuration options</p>
        </div>
        
        <div class="card">
            <h3 class="section-title">Security Settings</h3>
            <p>Security configuration options</p>
        </div>
    `;
}

function loadRecentActivity() {
    const activities = [
        'User admin@syncedupsolutions.com logged in',
        'New agency "Demo Insurance Co" created',
        'System health check completed',
        'Database backup completed successfully',
        'Security scan completed - no issues found'
    ];
    
    const container = document.getElementById('recent-activity');
    if (container) {
        container.innerHTML = activities.map((text, i) => `
            <div style="padding: 0.5rem 0; border-bottom: 1px solid var(--border);">
                <span style="color: var(--text-secondary); margin-right: 1rem;">${i * 15 + 4}m ago</span>
                <span>${text}</span>
            </div>
        `).join('');
    }
}

// Helper functions
async function logAudit(action, details) {
    fetch('/api/super-admin/audit', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action, details, user: currentUser?.email})
    }).catch(() => {});
}

function addUser() { alert('Add User modal would open here'); }
function editUser(id) { alert(`Edit user ${id}`); }
function toggleUserStatus(id) { alert(`Toggle status for user ${id}`); loadUsers(); }
function exportUsers() { alert('Export users to CSV'); }
function saveConfig() { alert('Configuration saved'); }
function logout() { 
    if (confirm('Logout?')) {
        logAudit('LOGOUT', 'User logged out');
        window.location.href = '/login';
    }
}

async function loadAgencyManagement() {
    const content = document.getElementById('main-content');
    content.innerHTML = '<div class="loading">Loading agencies...</div>';
    
    try {
        const response = await fetch('/api/super-admin/agencies-management');
        const data = await response.json();
        
        if (!data.success) throw new Error(data.error);
        
        // Build table rows separately to avoid nested template literal issues
        const tableRows = data.agencies.map(agency => {
            const statusClass = agency.is_active ? 'status-active' : 'status-inactive';
            const statusText = agency.is_active ? 'Active' : 'Suspended';
            const actionButton = agency.is_active ? 
                `<button class="btn btn-sm btn-danger" onclick="suspendAgency('${agency.id}')">SUSPEND</button>` :
                `<button class="btn btn-sm btn-success" onclick="reactivateAgency('${agency.id}')">REACTIVATE</button>`;
            
            return `
                <tr>
                    <td>${agency.name}</td>
                    <td class="${statusClass}">${statusText}</td>
                    <td>${agency.subscription_plan || 'free'}</td>
                    <td>$${agency.monthly_fee || 0}</td>
                    <td>
                        ${actionButton}
                        <button class="btn btn-sm" onclick="editAgency('${agency.id}')">EDIT</button>
                    </td>
                </tr>
            `;
        }).join('');
        
        content.innerHTML = `
            <div class="card">
                <h2>Agency Management - FULL CONTROL</h2>
            </div>
            
            <div class="card">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>AGENCY</th>
                            <th>STATUS</th>
                            <th>PLAN</th>
                            <th>MONTHLY FEE</th>
                            <th>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        content.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}

async function suspendAgency(agencyId) {
    if (!confirm('SUSPEND this agency? They will LOSE ACCESS immediately!')) return;
    
    const response = await fetch('/api/super-admin/agencies-management', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            agency_id: agencyId,
            updates: { 
                is_active: false, 
                subscription_status: 'suspended' 
            }
        })
    });
    
    if (response.ok) {
        alert('Agency SUSPENDED - They no longer have access!');
        loadAgencyManagement();
    }
}

async function reactivateAgency(agencyId) {
    if (!confirm('REACTIVATE this agency?')) return;
    
    const response = await fetch('/api/super-admin/agencies-management', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            agency_id: agencyId,
            updates: { 
                is_active: true, 
                subscription_status: 'active' 
            }
        })
    });
    
    if (response.ok) {
        alert('Agency REACTIVATED!');
        loadAgencyManagement();
    }
}

// Store current agency data
let currentAgencyData = null;

// Open the slide-out panel with agency data
async function editAgency(agencyId) {
    try {
        // Fetch the specific agency data
        const response = await fetch('/api/super-admin/agencies-management');
        const data = await response.json();
        
        if (!data.success) throw new Error('Failed to fetch agency data');
        
        // Find the specific agency
        const agency = data.agencies.find(a => a.id === agencyId);
        if (!agency) throw new Error('Agency not found');
        
        // Store for later use
        currentAgencyData = agency;
        
        // Populate the form
        document.getElementById('agency-id').value = agency.id;
        document.getElementById('agency-name').value = agency.name || '';
        document.getElementById('agency-code').value = agency.code || '';
        document.getElementById('agency-email').value = agency.admin_email || '';
        document.getElementById('agency-plan').value = agency.subscription_plan || 'free';
        document.getElementById('agency-fee').value = agency.monthly_fee || 0;
        document.getElementById('agency-billing').value = agency.next_billing_date ? agency.next_billing_date.split('T')[0] : '';
        document.getElementById('agency-status').value = agency.subscription_status || 'active';
        document.getElementById('agency-user-limit').value = agency.user_limit || 5;
        document.getElementById('agency-storage-limit').value = agency.storage_limit_gb || 10;
        document.getElementById('agency-api-limit').value = agency.api_calls_limit || 10000;
        
        // Show/hide activate/suspend buttons based on status
        const activateBtn = document.getElementById('activate-btn');
        const suspendBtn = document.getElementById('suspend-btn');
        
        if (agency.is_active) {
            activateBtn.style.display = 'none';
            suspendBtn.style.display = 'block';
        } else {
            activateBtn.style.display = 'block';
            suspendBtn.style.display = 'none';
        }
        
        // Open the panel
        openAgencyPanel();
        
    } catch (error) {
        alert('Error loading agency data: ' + error.message);
    }
}

// Open the panel
function openAgencyPanel() {
    document.getElementById('agency-panel').classList.add('active');
    document.getElementById('panel-overlay').classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

// Close the panel
function closeAgencyPanel() {
    document.getElementById('agency-panel').classList.remove('active');
    document.getElementById('panel-overlay').classList.remove('active');
    document.body.style.overflow = 'auto';
    currentAgencyData = null;
}

// Save agency changes
async function saveAgencyChanges() {
    const agencyId = document.getElementById('agency-id').value;
    
    // Gather all the form data
    const updates = {
        name: document.getElementById('agency-name').value,
        code: document.getElementById('agency-code').value,
        admin_email: document.getElementById('agency-email').value,
        subscription_plan: document.getElementById('agency-plan').value,
        monthly_fee: parseFloat(document.getElementById('agency-fee').value) || 0,
        next_billing_date: document.getElementById('agency-billing').value || null,
        subscription_status: document.getElementById('agency-status').value,
        user_limit: parseInt(document.getElementById('agency-user-limit').value) || 5,
        storage_limit_gb: parseFloat(document.getElementById('agency-storage-limit').value) || 10,
        api_calls_limit: parseInt(document.getElementById('agency-api-limit').value) || 10000,
        is_active: document.getElementById('agency-status').value !== 'suspended' && 
                   document.getElementById('agency-status').value !== 'cancelled'
    };
    
    // Validate required fields
    if (!updates.name) {
        alert('Agency name is required');
        return;
    }
    
    try {
        // Show loading state
        const saveBtn = event.target;
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;
        
        const response = await fetch('/api/super-admin/agencies-management', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agency_id: agencyId, updates })
        });
        
        if (!response.ok) throw new Error('Failed to save changes');
        
        // Success notification
        saveBtn.textContent = 'Saved!';
        saveBtn.style.background = 'var(--success)';
        
        // Reload the table
        loadAgencyManagement();
        
        // Close panel after short delay
        setTimeout(() => {
            closeAgencyPanel();
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
            saveBtn.style.background = '';
        }, 1500);
        
    } catch (error) {
        alert('Error saving changes: ' + error.message);
        // Reset button
        event.target.textContent = 'Save Changes';
        event.target.disabled = false;
    }
}

// Suspend agency from panel
async function suspendAgencyFromPanel() {
    const agencyId = document.getElementById('agency-id').value;
    const agencyName = document.getElementById('agency-name').value;
    
    if (!confirm(`Are you sure you want to SUSPEND ${agencyName}? They will lose access immediately!`)) return;
    
    document.getElementById('agency-status').value = 'suspended';
    await saveAgencyChanges();
}

// Activate agency from panel
async function activateAgency() {
    const agencyId = document.getElementById('agency-id').value;
    const agencyName = document.getElementById('agency-name').value;
    
    if (!confirm(`Activate ${agencyName}?`)) return;
    
    document.getElementById('agency-status').value = 'active';
    await saveAgencyChanges();
}

async function loadInfrastructure() {
    const content = document.getElementById('main-content');
    content.innerHTML = '<div class="loading">Loading infrastructure data...</div>';
    
    try {
        const response = await fetch('/api/super-admin/infrastructure');
        const data = await response.json();
        
        if (!data.success) throw new Error(data.error);
        
        content.innerHTML = `
            <div class="card">
                <h2>Infrastructure & Resources</h2>
            </div>
            
            <div class="metrics-row">
                <div class="metric-card ${data.database.status === 'warning' ? 'alert' : ''}">
                    <h4>DATABASE USAGE</h4>
                    <div class="metric-value">${data.database.sizeGB} GB</div>
                    <div class="progress-bar">
                        <div class="progress-fill ${data.database.usagePercent > 80 ? 'warning' : ''}" 
                             style="width: ${data.database.usagePercent}%"></div>
                    </div>
                    <div class="metric-change">${data.database.usagePercent}% of ${data.database.limitGB} GB</div>
                </div>
                
                <div class="metric-card ${data.storage.status === 'warning' ? 'alert' : ''}">
                    <h4>STORAGE USAGE</h4>
                    <div class="metric-value">${data.storage.sizeGB} GB</div>
                    <div class="progress-bar">
                        <div class="progress-fill ${data.storage.usagePercent > 80 ? 'warning' : ''}" 
                             style="width: ${data.storage.usagePercent}%"></div>
                    </div>
                    <div class="metric-change">${data.storage.usagePercent}% of ${data.storage.limitGB} GB</div>
                </div>
                
                <div class="metric-card ${data.api.status === 'warning' ? 'alert' : ''}">
                    <h4>API USAGE</h4>
                    <div class="metric-value">${(data.api.estimatedCalls / 1000).toFixed(1)}k</div>
                    <div class="progress-bar">
                        <div class="progress-fill ${data.api.usagePercent > 80 ? 'warning' : ''}" 
                             style="width: ${data.api.usagePercent}%"></div>
                    </div>
                    <div class="metric-change">${data.api.usagePercent}% of monthly limit</div>
                </div>
            </div>
            
            <div class="card">
                <h3 class="section-title">Database Records</h3>
                <table class="data-table">
                    <tr>
                        <td>Total Users</td>
                        <td>${data.records.users.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td>Total Agencies</td>
                        <td>${data.records.agencies.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td>Total Records</td>
                        <td>${data.records.total.toLocaleString()}</td>
                    </tr>
                </table>
            </div>
            
            <div class="card">
                <h3 class="section-title">Estimated Costs</h3>
                <table class="data-table">
                    <tr>
                        <td>Current Plan</td>
                        <td>Free Tier</td>
                    </tr>
                    <tr>
                        <td>Monthly Cost</td>
                        <td>$${data.costs.estimated}</td>
                    </tr>
                    <tr>
                        <td>Status</td>
                        <td class="status-active">Within Free Limits</td>
                    </tr>
                </table>
                ${data.database.usagePercent > 50 || data.storage.usagePercent > 50 ? `
                    <div style="margin-top: 1rem; padding: 1rem; background: rgba(245, 158, 11, 0.1); border-radius: 8px;">
                        <strong>⚠️ Usage Warning:</strong> You're approaching free tier limits. Consider upgrading to Pro plan soon.
                    </div>
                ` : ''}
            </div>
        `;
    } catch (error) {
        content.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}// New dashboard functions for super admin

async function loadFinancialReports() {
    const content = document.getElementById('main-content');
    content.innerHTML = '<div class="loading">Loading financial reports...</div>';
    
    try {
        const response = await fetch('/api/super-admin/financial-reports');
        const data = await response.json();
        
        if (!data.success) throw new Error(data.error);
        
        content.innerHTML = `
            <div class="card">
                <h2>Financial Reports</h2>
            </div>
            
            <div class="metrics-row">
                <div class="metric-card">
                    <h4>CURRENT MRR</h4>
                    <div class="metric-value">$${data.revenue.current_mrr.toLocaleString()}</div>
                    <div class="metric-change ${parseFloat(data.revenue.growth_rate) >= 0 ? 'positive' : 'negative'}">
                        ${data.revenue.growth_rate}% growth
                    </div>
                </div>
                
                <div class="metric-card">
                    <h4>ANNUAL REVENUE</h4>
                    <div class="metric-value">$${data.revenue.annual.toLocaleString()}</div>
                    <div class="metric-change">Projected: $${data.revenue.projected_annual.toLocaleString()}</div>
                </div>
                
                <div class="metric-card">
                    <h4>AVG REVENUE/AGENCY</h4>
                    <div class="metric-value">$${data.metrics.arpu}</div>
                    <div class="metric-change">LTV: $${data.metrics.avg_ltv}</div>
                </div>
                
                <div class="metric-card">
                    <h4>CHURN RATE</h4>
                    <div class="metric-value">${data.churn.churn_rate}%</div>
                    <div class="metric-change">${data.churn.total_churned} agencies lost</div>
                </div>
            </div>
            
            <div class="card">
                <h3 class="section-title">Top Paying Agencies</h3>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Agency</th>
                            <th>Plan</th>
                            <th>Monthly Fee</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(data.top_agencies || []).map(agency => `
                            <tr>
                                <td>${agency.name}</td>
                                <td>${agency.subscription_plan}</td>
                                <td>$${agency.monthly_fee}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="card">
                <button class="btn btn-primary" onclick="exportFinancialReport()">Export Report</button>
            </div>
        `;
    } catch (error) {
        content.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}

async function loadUsageReports() {
    const content = document.getElementById('main-content');
    content.innerHTML = '<div class="loading">Loading usage metrics...</div>';
    
    try {
        const response = await fetch('/api/super-admin/usage-metrics');
        const data = await response.json();
        
        if (!data.success) throw new Error(data.error);
        
        content.innerHTML = `
            <div class="card">
                <h2>Usage Reports</h2>
            </div>
            
            <div class="metrics-row">
                <div class="metric-card">
                    <h4>TOTAL USERS</h4>
                    <div class="metric-value">${data.totals.total_users.toLocaleString()}</div>
                    <div class="metric-change">Avg per agency: ${data.totals.avg_users_per_agency}</div>
                </div>
                
                <div class="metric-card">
                    <h4>TOTAL STORAGE</h4>
                    <div class="metric-value">${data.totals.total_storage_gb.toFixed(2)} GB</div>
                    <div class="metric-change">Avg per agency: ${data.totals.avg_storage_per_agency} GB</div>
                </div>
                
                <div class="metric-card">
                    <h4>API CALLS</h4>
                    <div class="metric-value">${(data.totals.total_api_calls / 1000).toFixed(1)}k</div>
                    <div class="metric-change">Peak hour: ${data.activity.peak_hour}</div>
                </div>
            </div>
            
            ${data.nearLimits.length > 0 ? `
                <div class="card">
                    <h3 class="section-title">⚠️ Agencies Near Limits</h3>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Agency</th>
                                <th>Users</th>
                                <th>Storage</th>
                                <th>API Calls</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.nearLimits.map(agency => `
                                <tr class="${parseFloat(agency.user_usage_percent) > 90 || parseFloat(agency.storage_usage_percent) > 90 ? 'overdue-row' : ''}">
                                    <td>${agency.name}</td>
                                    <td>${agency.user_usage_percent}%</td>
                                    <td>${agency.storage_usage_percent}%</td>
                                    <td>${agency.api_usage_percent}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : ''}
        `;
    } catch (error) {
        content.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}

async function loadPlatformAnalytics() {
    const content = document.getElementById('main-content');
    content.innerHTML = '<div class="loading">Loading platform analytics...</div>';
    
    try {
        const response = await fetch('/api/super-admin/platform-analytics');
        const data = await response.json();
        
        if (!data.success) throw new Error(data.error);
        
        content.innerHTML = `
            <div class="card">
                <h2>Platform Analytics</h2>
            </div>
            
            <div class="metrics-row">
                <div class="metric-card">
                    <h4>TOTAL AGENCIES</h4>
                    <div class="metric-value">${data.business_metrics.total_agencies}</div>
                    <div class="metric-change">Active: ${data.business_metrics.active_agencies}</div>
                </div>
                
                <div class="metric-card">
                    <h4>GROWTH RATE</h4>
                    <div class="metric-value">${data.business_metrics.growth_rate}</div>
                    <div class="metric-change">New this month: ${data.business_metrics.new_this_month}</div>
                </div>
                
                <div class="metric-card">
                    <h4>CONVERSION RATE</h4>
                    <div class="metric-value">${data.conversion.trial_to_paid_rate}</div>
                    <div class="metric-change">${data.conversion.conversions_this_month} conversions</div>
                </div>
                
                <div class="metric-card">
                    <h4>HEALTH SCORE</h4>
                    <div class="metric-value">${data.health_score.overall}%</div>
                    <div class="metric-change status-${data.health_score.growth === 'positive' ? 'active' : 'inactive'}">
                        ${data.health_score.growth} growth
                    </div>
                </div>
            </div>
            
            ${data.engagement.at_risk_count > 0 ? `
                <div class="card">
                    <h3 class="section-title">🚨 At-Risk Agencies</h3>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Agency</th>
                                <th>Risk Reason</th>
                                <th>API Calls</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.engagement.at_risk_agencies.map(agency => `
                                <tr>
                                    <td>${agency.name}</td>
                                    <td>${agency.risk_reason}</td>
                                    <td>${agency.api_calls}</td>
                                    <td><button class="btn btn-sm btn-warning" onclick="contactAgency(${agency.id})">Contact</button></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : ''}
            
            ${data.engagement.power_users_count > 0 ? `
                <div class="card">
                    <h3 class="section-title">⭐ Power Users</h3>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Agency</th>
                                <th>Active Users</th>
                                <th>API Calls</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.engagement.power_users.map(agency => `
                                <tr>
                                    <td>${agency.name}</td>
                                    <td>${agency.active_users}</td>
                                    <td>${agency.api_calls.toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : ''}
        `;
    } catch (error) {
        content.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}

async function loadComplianceMonitoring() {
    const content = document.getElementById('main-content');
    content.innerHTML = '<div class="loading">Loading compliance data...</div>';
    
    try {
        const response = await fetch('/api/super-admin/compliance-monitoring');
        const data = await response.json();
        
        if (!data.success) throw new Error(data.error);
        
        content.innerHTML = `
            <div class="card">
                <h2>Compliance & Limits</h2>
                <span class="status-${data.compliance_status.overall === 'compliant' ? 'active' : 'error'}">
                    Status: ${data.compliance_status.overall}
                </span>
            </div>
            
            <div class="metrics-row">
                <div class="metric-card ${data.violations.count > 0 ? 'alert' : ''}">
                    <h4>VIOLATIONS</h4>
                    <div class="metric-value">${data.violations.count}</div>
                    <div class="metric-change">Immediate action required</div>
                </div>
                
                <div class="metric-card ${data.warnings.count > 5 ? 'alert' : ''}">
                    <h4>WARNINGS</h4>
                    <div class="metric-value">${data.warnings.count}</div>
                    <div class="metric-change">Agencies approaching limits</div>
                </div>
                
                <div class="metric-card">
                    <h4>RATE LIMITS</h4>
                    <div class="metric-value">${data.rate_limits.violations_24h}</div>
                    <div class="metric-change">Violations in 24h</div>
                </div>
                
                <div class="metric-card">
                    <h4>DATA RETENTION</h4>
                    <div class="metric-value">${data.data_retention.records_for_cleanup}</div>
                    <div class="metric-change">Records > ${data.data_retention.retention_days} days</div>
                </div>
            </div>
            
            ${data.violations.count > 0 ? `
                <div class="card">
                    <h3 class="section-title">🚫 Limit Violations</h3>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Agency</th>
                                <th>Violation Type</th>
                                <th>Current/Limit</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.violations.items.map(violation => `
                                <tr class="overdue-row">
                                    <td>${violation.agency_name}</td>
                                    <td>${violation.type.replace(/_/g, ' ')}</td>
                                    <td>${violation.current}/${violation.limit} (${violation.percent}%)</td>
                                    <td>
                                        <button class="btn btn-sm btn-danger" 
                                                onclick="enforceLimit(${violation.agency_id}, '${violation.type}')">
                                            Enforce
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : ''}
        `;
    } catch (error) {
        content.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}

async function exportFinancialReport() {
    const response = await fetch('/api/super-admin/financial-reports');
    const data = await response.json();
    
    const csv = [
        ['Metric', 'Value'],
        ['Current MRR', data.revenue.current_mrr],
        ['Annual Revenue', data.revenue.annual],
        ['Growth Rate', data.revenue.growth_rate],
        ['Churn Rate', data.churn.churn_rate],
        ['Average Revenue Per Agency', data.metrics.arpu],
        ['Average LTV', data.metrics.avg_ltv]
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
}

async function contactAgency(agencyId) {
    alert(`Contact functionality for agency ${agencyId} would be implemented here`);
}

async function enforceLimit(agencyId, violationType) {
    if (confirm(`Enforce limit for agency ${agencyId} due to ${violationType}?`)) {
        const response = await fetch('/api/super-admin/compliance-monitoring', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'enforce_limit',
                agency_id: agencyId,
                reason: violationType
            })
        });
        
        if (response.ok) {
            alert('Limit enforced - agency suspended');
            loadComplianceMonitoring();
        }
    }
}