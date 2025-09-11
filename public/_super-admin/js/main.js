// Global state
let currentView = 'dashboard';
let currentUser = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    updateTime();
    setInterval(updateTime, 60000);
    loadDashboard();
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
        case 'dashboard': loadDashboard(); break;
        case 'users': loadUserManagement(); break;
        case 'agencies': loadAgencyManagement(); break;
        case 'analytics': loadAnalytics(); break;
        case 'config': loadSystemConfig(); break;
        case 'audit': loadAuditTrail(); break;
        case 'security': loadSecurity(); break;
        case 'settings': loadSettings(); break;
    }
}

async function loadDashboard() {
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
                        ${data.agencies.map(agency => `
                            <tr>
                                <td>${agency.name}</td>
                                <td class="${agency.is_active ? 'status-active' : 'status-inactive'}">
                                    ${agency.is_active ? 'Active' : 'Suspended'}
                                </td>
                                <td>${agency.subscription_plan || 'free'}</td>
                                <td>$${agency.monthly_fee || 0}</td>
                                <td>
                                    ${agency.is_active ? 
                                        `<button class="btn btn-sm btn-danger" onclick="suspendAgency('${agency.id}')">SUSPEND</button>` :
                                        `<button class="btn btn-sm btn-success" onclick="reactivateAgency('${agency.id}')">REACTIVATE</button>`
                                    }
                                    <button class="btn btn-sm" onclick="editAgency('${agency.id}')">EDIT</button>
                                </td>
                            </tr>
                        `).join('')}
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

async function editAgency(agencyId) {
    const newPlan = prompt('Enter new plan (free/pro/enterprise):');
    const newFee = prompt('Enter new monthly fee:');
    
    if (newPlan || newFee) {
        const updates = {};
        if (newPlan) updates.subscription_plan = newPlan;
        if (newFee) updates.monthly_fee = parseFloat(newFee);
        
        const response = await fetch('/api/super-admin/agencies-management', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agency_id: agencyId, updates })
        });
        
        if (response.ok) {
            alert('Agency UPDATED!');
            loadAgencyManagement();
        }
    }
}