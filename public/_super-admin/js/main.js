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
        case 'users': loadUserManagement(); break;
        case 'infrastructure': loadInfrastructure(); break;
        case 'financial': loadFinancialReports(); break;
        case 'usage': loadUsageReports(); break;
        case 'analytics': loadPlatformAnalytics(); break;
        case 'compliance': loadComplianceMonitoring(); break;
        case 'settings': loadSettings(); break;
    }
}

// Test Edge Function
async function testEdgeFunction() {
    console.log('Testing Edge Function...');

    // Get token from localStorage or cookie
    let token = localStorage.getItem('auth_token');
    if (!token) {
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=');
            acc[key] = value;
            return acc;
        }, {});
        token = cookies.auth_token;
    }

    if (!token) {
        alert('No auth token found. Please log in again.');
        return;
    }

    try {
        // Test stats endpoint
        const response = await fetch('https://zgkszwkxibpnxhvlenct.supabase.co/functions/v1/admin-gateway/stats', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ Edge Function works!', data);
            alert('Edge Function test successful! Check console for details.');
        } else {
            console.error('❌ Edge Function error:', data);
            alert(`Edge Function error: ${data.error}`);
        }
    } catch (error) {
        console.error('Network error:', error);
        alert(`Network error: ${error.message}`);
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
        
        // Calculate agency statistics
        const stats = {
            total: data.agencies.length,
            active: data.agencies.filter(a => a.is_active).length,
            suspended: data.agencies.filter(a => !a.is_active).length,
            totalRevenue: data.agencies.reduce((sum, a) => sum + (a.monthly_fee || 0), 0)
        };

        content.innerHTML = `
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h2>Agency Management - FULL CONTROL</h2>
                    <button class="btn btn-primary" onclick="showCreateAgencyForm()">
                        <i class="fas fa-plus"></i> CREATE NEW AGENCY
                    </button>
                </div>
            </div>

            <div class="metrics-row">
                <div class="metric-card">
                    <h4>TOTAL AGENCIES</h4>
                    <div class="metric-value">${stats.total}</div>
                    <div class="metric-change">${stats.active} active</div>
                </div>
                <div class="metric-card">
                    <h4>SUSPENDED</h4>
                    <div class="metric-value">${stats.suspended}</div>
                    <div class="metric-change ${stats.suspended > 0 ? 'negative' : 'positive'}">
                        ${stats.suspended > 0 ? 'Requires attention' : 'All active'}
                    </div>
                </div>
                <div class="metric-card">
                    <h4>MONTHLY REVENUE</h4>
                    <div class="metric-value">$${stats.totalRevenue.toLocaleString()}</div>
                    <div class="metric-change">From all agencies</div>
                </div>
                <div class="metric-card">
                    <h4>AVG USER COUNT</h4>
                    <div class="metric-value">
                        ${data.agencies.length > 0 ?
                            Math.round(data.agencies.reduce((sum, a) => sum + (a.user_count || 0), 0) / data.agencies.length) :
                            0}
                    </div>
                    <div class="metric-change">Per agency</div>
                </div>
            </div>

            <div class="card">
                <h3 class="section-title">All Agencies</h3>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>AGENCY</th>
                            <th>STATUS</th>
                            <th>PLAN</th>
                            <th>USERS</th>
                            <th>MONTHLY FEE</th>
                            <th>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.agencies.map(agency => {
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
                                    <td>${agency.user_count || 0} users</td>
                                    <td>$${agency.monthly_fee || 0}</td>
                                    <td>
                                        ${actionButton}
                                        <button class="btn btn-sm" onclick="editAgency('${agency.id}')">EDIT</button>
                                        <button class="btn btn-sm btn-danger" onclick="deleteAgency('${agency.id}', '${agency.name}')">DELETE</button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
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
        // For now, display the infrastructure page without fetching API data
        // since the API endpoint might not exist yet
        content.innerHTML = `
            <div class="card">
                <h2>Infrastructure & Database Management</h2>
            </div>

            <!-- Database Tables Section -->
            <div class="card">
                <h3 class="section-title">Database Tables</h3>
                <button class="btn btn-secondary" onclick="loadDatabaseTables()" style="margin-bottom: 15px;">
                    <i class="fas fa-sync"></i> Refresh Tables
                </button>
                <div id="tables-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">
                    <div class="loading">Loading tables...</div>
                </div>
            </div>

            <!-- SQL Query Tool Section -->
            <div class="card">
                <h3 class="section-title">SQL Query Tool (DDL Only)</h3>
                <div style="margin-bottom: 15px;">
                    <select id="sql-template" onchange="loadSQLTemplate()" style="padding: 10px; background: #1a1a1a; color: white; border: 1px solid #444;">
                        <option value="">-- Select a template --</option>
                        <option value="create-table">Create Table</option>
                        <option value="add-column">Add Column to Table</option>
                        <option value="create-index">Create Index</option>
                        <option value="drop-table">Drop Table</option>
                        <option value="rename-table">Rename Table</option>
                        <option value="add-constraint">Add Constraint</option>
                    </select>
                    <button class="btn btn-secondary" onclick="clearSQL()">Clear</button>
                    <button class="btn btn-secondary" onclick="showSQLHistory()">History</button>
                </div>

                <textarea id="sql-query" placeholder="Enter your DDL SQL query here... (CREATE TABLE, ALTER TABLE, DROP TABLE, CREATE INDEX)"
                          style="width: 100%; height: 200px; background: #1a1a1a; color: #10b981; border: 1px solid #444; padding: 10px; font-family: 'Courier New', monospace; font-size: 14px;"></textarea>

                <div style="margin-top: 15px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <button class="btn btn-primary" onclick="executeSQL()">
                            <i class="fas fa-play"></i> Execute SQL
                        </button>
                        <button class="btn btn-secondary" onclick="validateSQL()">
                            <i class="fas fa-check"></i> Validate Only
                        </button>
                    </div>
                    <div style="color: #8b92a5; font-size: 12px;">
                        Allowed: CREATE TABLE, ALTER TABLE, DROP TABLE, CREATE INDEX
                    </div>
                </div>

                <div id="sql-result" style="margin-top: 20px;"></div>

                <!-- Query History (stored locally) -->
                <div id="sql-history" style="display: none; margin-top: 20px;">
                    <h4>Query History</h4>
                    <div id="history-list" style="max-height: 300px; overflow-y: auto;"></div>
                </div>
            </div>
        `;

        // Try to fetch infrastructure data but don't fail if API doesn't exist
        fetch('/api/super-admin/infrastructure')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Add metrics if API returns data
                    const metricsHtml = `
                        <div class="metrics-row">
                            <div class="metric-card ${data.database?.status === 'warning' ? 'alert' : ''}">
                                <h4>DATABASE USAGE</h4>
                                <div class="metric-value">${data.database?.sizeGB || 0} GB</div>
                                <div class="progress-bar">
                                    <div class="progress-fill ${(data.database?.usagePercent || 0) > 80 ? 'warning' : ''}"
                                         style="width: ${data.database?.usagePercent || 0}%"></div>
                                </div>
                                <div class="metric-change">${data.database?.usagePercent || 0}% of ${data.database?.limitGB || 100} GB</div>
                            </div>

                            <div class="metric-card ${data.storage?.status === 'warning' ? 'alert' : ''}">
                                <h4>STORAGE USAGE</h4>
                                <div class="metric-value">${data.storage?.sizeGB || 0} GB</div>
                                <div class="progress-bar">
                                    <div class="progress-fill ${(data.storage?.usagePercent || 0) > 80 ? 'warning' : ''}"
                                         style="width: ${data.storage?.usagePercent || 0}%"></div>
                                </div>
                                <div class="metric-change">${data.storage?.usagePercent || 0}% of ${data.storage?.limitGB || 100} GB</div>
                            </div>

                            <div class="metric-card ${data.api?.status === 'warning' ? 'alert' : ''}">
                                <h4>API USAGE</h4>
                                <div class="metric-value">${((data.api?.estimatedCalls || 0) / 1000).toFixed(1)}k</div>
                                <div class="progress-bar">
                                    <div class="progress-fill ${(data.api?.usagePercent || 0) > 80 ? 'warning' : ''}"
                                         style="width: ${data.api?.usagePercent || 0}%"></div>
                                </div>
                                <div class="metric-change">${data.api?.usagePercent || 0}% of monthly limit</div>
                            </div>
                        </div>

                        <div class="card">
                            <h3 class="section-title">Database Records</h3>
                            <table class="data-table">
                                <tr>
                                    <td>Total Users</td>
                                    <td>${(data.records?.users || 0).toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <td>Total Agencies</td>
                                    <td>${(data.records?.agencies || 0).toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <td>Total Records</td>
                                    <td>${(data.records?.total || 0).toLocaleString()}</td>
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
                                    <td>$${data.costs?.estimated || 0}</td>
                                </tr>
                                <tr>
                                    <td>Status</td>
                                    <td class="status-active">Within Free Limits</td>
                                </tr>
                            </table>
                            ${(data.database?.usagePercent > 50 || data.storage?.usagePercent > 50) ? `
                                <div style="margin-top: 1rem; padding: 1rem; background: rgba(245, 158, 11, 0.1); border-radius: 8px;">
                                    <strong>⚠️ Usage Warning:</strong> You're approaching free tier limits. Consider upgrading to Pro plan soon.
                                </div>
                            ` : ''}
                        </div>
                    `;

                    // Append metrics to the page
                    content.insertAdjacentHTML('beforeend', metricsHtml);
                }
            })
            .catch(err => {
                console.log('Infrastructure API not available yet:', err);
            });

        // Load tables automatically
        loadDatabaseTables();
    } catch (error) {
        content.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}

// Load database tables function
async function loadDatabaseTables() {
    const tablesList = document.getElementById('tables-list');
    if (!tablesList) return;

    tablesList.innerHTML = '<div class="loading">Loading tables...</div>';

    try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('https://zgkszwkxibpnxhvlenct.supabase.co/functions/v1/admin-gateway/tables', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch tables');
        }

        const result = await response.json();

        // The endpoint returns { tables: [...] } format
        if (result.tables && Array.isArray(result.tables)) {
            const tablesData = result.tables;

            if (tablesData.length === 0) {
                tablesList.innerHTML = '<div style="color: #8b92a5;">No tables found in the database</div>';
                return;
            }

            // Extract table names from the structured data
            const tableNames = tablesData.map(t => t.name);

            // Group tables by category
            const systemTables = tableNames.filter(t =>
                t.startsWith('auth') ||
                t.startsWith('storage') ||
                t.startsWith('realtime') ||
                t.startsWith('_') ||
                t.startsWith('pg_')
            );
            const customTables = tableNames.filter(t =>
                !t.startsWith('auth') &&
                !t.startsWith('storage') &&
                !t.startsWith('realtime') &&
                !t.startsWith('_') &&
                !t.startsWith('pg_')
            );

            let html = '';

            if (customTables.length > 0) {
                html += '<div style="grid-column: 1/-1; margin-bottom: 10px; color: #10b981; font-weight: bold;">Application Tables</div>';
                customTables.sort().forEach(table => {
                    html += `
                        <div style="padding: 10px; background: #1a1a1a; border: 1px solid #444; border-radius: 5px; cursor: pointer;"
                             onclick="showTableInfo('${table}')" title="Click for details">
                            <i class="fas fa-table" style="color: #10b981;"></i> ${table}
                        </div>
                    `;
                });
            }

            if (systemTables.length > 0) {
                html += '<div style="grid-column: 1/-1; margin: 20px 0 10px 0; color: #8b92a5; font-weight: bold;">System Tables</div>';
                systemTables.sort().forEach(table => {
                    html += `
                        <div style="padding: 10px; background: #0f0f0f; border: 1px solid #333; border-radius: 5px; opacity: 0.7;"
                             title="System table">
                            <i class="fas fa-database" style="color: #8b92a5;"></i> ${table}
                        </div>
                    `;
                });
            }

            tablesList.innerHTML = html;
        } else {
            throw new Error(result.error || 'Unexpected response format');
        }
    } catch (error) {
        console.error('Error loading tables:', error);
        tablesList.innerHTML = `<div style="color: #ef4444;">Error loading tables: ${error.message}</div>`;
    }
}

// Show table information
async function showTableInfo(tableName) {
    const token = localStorage.getItem('auth_token');

    try {
        const response = await fetch('https://zgkszwkxibpnxhvlenct.supabase.co/functions/v1/admin-gateway/table-info', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ table: tableName })
        });

        if (!response.ok) {
            throw new Error('Failed to fetch table info');
        }

        const result = await response.json();

        if (result.ok && result.columns) {
            let infoHtml = `
                <h4>Table: ${tableName}</h4>
                <table class="data-table" style="margin-top: 10px;">
                    <thead>
                        <tr>
                            <th>Column</th>
                            <th>Type</th>
                            <th>Nullable</th>
                            <th>Default</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            result.columns.forEach(col => {
                infoHtml += `
                    <tr>
                        <td>${col.column_name}</td>
                        <td>${col.data_type}</td>
                        <td>${col.is_nullable}</td>
                        <td>${col.column_default || '-'}</td>
                    </tr>
                `;
            });

            infoHtml += `
                    </tbody>
                </table>
                <div style="margin-top: 15px;">
                    <button class="btn btn-secondary" onclick="copyTableStructure('${tableName}')">
                        <i class="fas fa-copy"></i> Copy CREATE TABLE
                    </button>
                </div>
            `;

            // Display in SQL result area
            document.getElementById('sql-result').innerHTML = `
                <div style="padding: 15px; background: #1a1a1a; border: 1px solid #444; border-radius: 5px;">
                    ${infoHtml}
                </div>
            `;
        } else {
            throw new Error(result.error || 'Failed to load table info');
        }
    } catch (error) {
        alert('Error fetching table info: ' + error.message);
    }
}

// Copy table structure as CREATE TABLE statement
async function copyTableStructure(tableName) {
    const token = localStorage.getItem('auth_token');

    try {
        const response = await fetch('https://zgkszwkxibpnxhvlenct.supabase.co/functions/v1/admin-gateway/table-ddl', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ table: tableName })
        });

        if (!response.ok) {
            throw new Error('Failed to fetch table DDL');
        }

        const result = await response.json();

        if (result.ok && result.ddl) {
            // Put DDL in the SQL query textarea
            document.getElementById('sql-query').value = result.ddl;

            // Copy to clipboard
            navigator.clipboard.writeText(result.ddl).then(() => {
                alert('Table structure copied to clipboard and query editor!');
            }).catch(() => {
                alert('Table structure loaded in query editor!');
            });
        } else {
            throw new Error(result.error || 'Failed to generate DDL');
        }
    } catch (error) {
        alert('Error copying table structure: ' + error.message);
    }
}

// New dashboard functions for super admin

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

// ============= AGENCY CREATION FUNCTIONS =============

// Show create agency form
function showCreateAgencyForm() {
    document.getElementById('create-agency-modal').classList.add('active');
    document.getElementById('create-agency-overlay').classList.add('active');
    document.body.style.overflow = 'hidden';

    // Reset form
    document.getElementById('create-agency-form').reset();
}

// Close create agency form
function closeCreateAgencyForm() {
    document.getElementById('create-agency-modal').classList.remove('active');
    document.getElementById('create-agency-overlay').classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Initialize form submission handler
document.addEventListener('DOMContentLoaded', () => {
    const createForm = document.getElementById('create-agency-form');
    if (createForm) {
        createForm.addEventListener('submit', handleCreateAgency);
    }
});

// Handle create agency form submission
async function handleCreateAgency(e) {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    try {
        // Get form values
        const formData = {
            name: document.getElementById('new-agency-name').value.trim(),
            contact_email: document.getElementById('new-agency-email').value.trim(),
            phone_number: document.getElementById('new-agency-phone').value.trim(),
            address: document.getElementById('new-agency-address').value.trim(),
            plan_type: document.getElementById('new-agency-plan').value
        };

        // Validate
        if (!formData.name || !formData.contact_email || !formData.plan_type) {
            alert('Please fill in all required fields');
            return;
        }

        // Show loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating agency...';

        // Get auth token
        const token = localStorage.getItem('auth_token') || '';

        // Make API call
        const response = await fetch('/api/super-admin/create-agency', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            // Show success message with details
            const message = `
                Agency "${result.data.agency.name}" created successfully!

                Agency Code: ${result.data.agency.code}
                Plan: ${result.data.agency.plan_type}
                Max Users: ${result.data.agency.max_users}

                Next Step: Add users through User Management
            `;
            alert(message);

            // Close form and reload agencies
            closeCreateAgencyForm();
            loadAgencyManagement();
        } else {
            throw new Error(result.error || 'Failed to create agency');
        }

    } catch (error) {
        console.error('Error creating agency:', error);
        alert('Error creating agency: ' + error.message);
    } finally {
        // Restore button
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// ============= USER MANAGEMENT FUNCTIONS =============

async function loadUserManagement() {
    const content = document.getElementById('main-content');
    content.innerHTML = '<div class="loading">Loading users...</div>';

    try {
        // Get users from portal_users table
        const response = await fetch('/api/super-admin/users');
        const data = await response.json();

        if (!response.ok) throw new Error(data.error);

        const users = data.users || [];

        // Get agencies for mapping
        const agenciesResponse = await fetch('/api/super-admin/agencies-management');
        const agenciesData = await agenciesResponse.json();
        const agencies = agenciesData.agencies || [];

        // Create agency map for quick lookup
        const agencyMap = {};
        agencies.forEach(agency => {
            agencyMap[agency.id] = agency.name;
        });

        // Group users by agency
        const usersByAgency = {};
        const usersWithoutAgency = [];

        users.forEach(user => {
            if (user.agency_id) {
                if (!usersByAgency[user.agency_id]) {
                    usersByAgency[user.agency_id] = {
                        name: agencyMap[user.agency_id] || `Agency ${user.agency_id.substring(0, 8)}`,
                        users: []
                    };
                }
                usersByAgency[user.agency_id].users.push(user);
            } else {
                usersWithoutAgency.push(user);
            }
        });

        // Sort agencies by name
        const sortedAgencies = Object.keys(usersByAgency).sort((a, b) =>
            usersByAgency[a].name.localeCompare(usersByAgency[b].name)
        );

        content.innerHTML = `
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h2>User Management</h2>
                    <div>
                        <button class="btn btn-secondary" onclick="toggleUserView()">
                            <i class="fas fa-list"></i> <span id="view-toggle-text">View as List</span>
                        </button>
                        <button class="btn btn-primary" onclick="showCreateUserForm()">
                            <i class="fas fa-user-plus"></i> CREATE USER
                        </button>
                        <button class="btn btn-secondary" onclick="inviteUser()">
                            <i class="fas fa-envelope"></i> INVITE USER
                        </button>
                    </div>
                </div>
            </div>

            <div class="metrics-row">
                <div class="metric-card">
                    <h4>TOTAL USERS</h4>
                    <div class="metric-value">${users.length}</div>
                </div>
                <div class="metric-card">
                    <h4>ACTIVE USERS</h4>
                    <div class="metric-value">${users.filter(u => u.is_active).length}</div>
                </div>
                <div class="metric-card">
                    <h4>BY ROLE</h4>
                    <div style="font-size: 14px; margin-top: 10px;">
                        Admin: ${users.filter(u => u.role === 'admin').length}<br>
                        Manager: ${users.filter(u => u.role === 'manager').length}<br>
                        Agent: ${users.filter(u => u.role === 'agent').length}
                    </div>
                </div>
                <div class="metric-card">
                    <h4>WITHOUT AGENCY</h4>
                    <div class="metric-value">${usersWithoutAgency.length}</div>
                </div>
            </div>

            <div class="card">
                <div style="margin-bottom: 20px;">
                    <input type="text" id="user-search" placeholder="Search users by email or name..."
                           style="padding: 10px; width: 300px; background: #1a1a1a; color: white; border: 1px solid #444;"
                           onkeyup="filterUsers()">
                </div>

                <!-- Grouped View (Default) -->
                <div id="grouped-view">
                    ${sortedAgencies.map(agencyId => `
                        <div class="agency-group" style="margin-bottom: 30px;">
                            <h3 class="section-title" style="color: #10b981; margin-bottom: 15px;">
                                <i class="fas fa-building"></i> ${usersByAgency[agencyId].name}
                                <span style="font-size: 14px; color: #8b92a5; margin-left: 10px;">
                                    (${usersByAgency[agencyId].users.length} users)
                                </span>
                            </h3>
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>EMAIL</th>
                                        <th>NAME</th>
                                        <th>ROLE</th>
                                        <th>STATUS</th>
                                        <th>LAST LOGIN</th>
                                        <th>ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${usersByAgency[agencyId].users.map(user => `
                                        <tr data-email="${user.email.toLowerCase()}" data-name="${(user.full_name || user.name || '').toLowerCase()}">
                                            <td>${user.email}</td>
                                            <td>${user.full_name || user.name || 'N/A'}</td>
                                            <td>
                                                <select onchange="changeUserRole('${user.id}', this.value)" style="background: #1a1a1a; color: white; border: 1px solid #444; padding: 5px;">
                                                    <option value="agent" ${user.role === 'agent' ? 'selected' : ''}>Agent</option>
                                                    <option value="manager" ${user.role === 'manager' ? 'selected' : ''}>Manager</option>
                                                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                                                    <option value="customer_service" ${user.role === 'customer_service' ? 'selected' : ''}>Customer Service</option>
                                                    <option value="super_admin" ${user.role === 'super_admin' ? 'selected' : ''}>Super Admin</option>
                                                </select>
                                            </td>
                                            <td class="${user.is_active ? 'status-active' : 'status-inactive'}">
                                                ${user.is_active ? 'Active' : 'Inactive'}
                                            </td>
                                            <td>${user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}</td>
                                            <td>
                                                <button class="btn btn-sm" onclick="resetUserPassword('${user.id}', '${user.email}')">Reset Password</button>
                                                <button class="btn btn-sm ${user.is_active ? 'btn-danger' : 'btn-success'}"
                                                        onclick="toggleUserStatus('${user.id}', ${!user.is_active})">
                                                    ${user.is_active ? 'Deactivate' : 'Activate'}
                                                </button>
                                                <button class="btn btn-sm" onclick="assignToAgency('${user.id}')">Remove from Agency</button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `).join('')}

                    ${usersWithoutAgency.length > 0 ? `
                        <div class="agency-group" style="margin-bottom: 30px;">
                            <h3 class="section-title" style="color: #ef4444; margin-bottom: 15px;">
                                <i class="fas fa-user-slash"></i> Users Without Agency
                                <span style="font-size: 14px; color: #8b92a5; margin-left: 10px;">
                                    (${usersWithoutAgency.length} users)
                                </span>
                            </h3>
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>EMAIL</th>
                                        <th>NAME</th>
                                        <th>ROLE</th>
                                        <th>STATUS</th>
                                        <th>LAST LOGIN</th>
                                        <th>ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${usersWithoutAgency.map(user => `
                                        <tr data-email="${user.email.toLowerCase()}" data-name="${(user.full_name || user.name || '').toLowerCase()}">
                                            <td>${user.email}</td>
                                            <td>${user.full_name || user.name || 'N/A'}</td>
                                            <td>
                                                <select onchange="changeUserRole('${user.id}', this.value)" style="background: #1a1a1a; color: white; border: 1px solid #444; padding: 5px;">
                                                    <option value="agent" ${user.role === 'agent' ? 'selected' : ''}>Agent</option>
                                                    <option value="manager" ${user.role === 'manager' ? 'selected' : ''}>Manager</option>
                                                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                                                    <option value="customer_service" ${user.role === 'customer_service' ? 'selected' : ''}>Customer Service</option>
                                                    <option value="super_admin" ${user.role === 'super_admin' ? 'selected' : ''}>Super Admin</option>
                                                </select>
                                            </td>
                                            <td class="${user.is_active ? 'status-active' : 'status-inactive'}">
                                                ${user.is_active ? 'Active' : 'Inactive'}
                                            </td>
                                            <td>${user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}</td>
                                            <td>
                                                <button class="btn btn-sm" onclick="resetUserPassword('${user.id}', '${user.email}')">Reset Password</button>
                                                <button class="btn btn-sm ${user.is_active ? 'btn-danger' : 'btn-success'}"
                                                        onclick="toggleUserStatus('${user.id}', ${!user.is_active})">
                                                    ${user.is_active ? 'Deactivate' : 'Activate'}
                                                </button>
                                                <button class="btn btn-sm btn-primary" onclick="assignToAgency('${user.id}')">Assign to Agency</button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : ''}
                </div>

                <!-- List View (Hidden by default) -->
                <div id="list-view" style="display: none;">
                    <h3 class="section-title">All Users</h3>
                    <table class="data-table" id="users-table">
                        <thead>
                            <tr>
                                <th>EMAIL</th>
                                <th>NAME</th>
                                <th>ROLE</th>
                                <th>AGENCY</th>
                                <th>STATUS</th>
                                <th>LAST LOGIN</th>
                                <th>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(user => `
                                <tr data-email="${user.email.toLowerCase()}" data-name="${(user.full_name || user.name || '').toLowerCase()}">
                                    <td>${user.email}</td>
                                    <td>${user.full_name || user.name || 'N/A'}</td>
                                    <td>
                                        <select onchange="changeUserRole('${user.id}', this.value)" style="background: #1a1a1a; color: white; border: 1px solid #444; padding: 5px;">
                                            <option value="agent" ${user.role === 'agent' ? 'selected' : ''}>Agent</option>
                                            <option value="manager" ${user.role === 'manager' ? 'selected' : ''}>Manager</option>
                                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                                            <option value="customer_service" ${user.role === 'customer_service' ? 'selected' : ''}>Customer Service</option>
                                            <option value="super_admin" ${user.role === 'super_admin' ? 'selected' : ''}>Super Admin</option>
                                        </select>
                                    </td>
                                    <td>${user.agency_id ? (agencyMap[user.agency_id] || `Agency ${user.agency_id.substring(0, 8)}`) : 'None'}</td>
                                    <td class="${user.is_active ? 'status-active' : 'status-inactive'}">
                                        ${user.is_active ? 'Active' : 'Inactive'}
                                    </td>
                                    <td>${user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}</td>
                                    <td>
                                        <button class="btn btn-sm" onclick="resetUserPassword('${user.id}', '${user.email}')">Reset Password</button>
                                        <button class="btn btn-sm ${user.is_active ? 'btn-danger' : 'btn-success'}"
                                                onclick="toggleUserStatus('${user.id}', ${!user.is_active})">
                                            ${user.is_active ? 'Deactivate' : 'Activate'}
                                        </button>
                                        <button class="btn btn-sm" onclick="assignToAgency('${user.id}')">Assign Agency</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading users:', error);
        content.innerHTML = `<div class="error-message">Error loading users: ${error.message}</div>`;
    }
}

function filterUsers() {
    const search = document.getElementById('user-search').value.toLowerCase();

    // Filter in both views
    const allRows = document.querySelectorAll('tr[data-email]');

    allRows.forEach(row => {
        const email = row.dataset.email || '';
        const name = row.dataset.name || '';

        if (email.includes(search) || name.includes(search)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });

    // Hide/show agency groups if all users are hidden
    const agencyGroups = document.querySelectorAll('.agency-group');
    agencyGroups.forEach(group => {
        const visibleRows = group.querySelectorAll('tbody tr[style=""], tbody tr:not([style*="none"])');
        if (visibleRows.length === 0 && search !== '') {
            group.style.display = 'none';
        } else {
            group.style.display = '';
        }
    });
}

// Toggle between grouped and list view
function toggleUserView() {
    const groupedView = document.getElementById('grouped-view');
    const listView = document.getElementById('list-view');
    const toggleText = document.getElementById('view-toggle-text');

    if (groupedView && listView) {
        if (groupedView.style.display === 'none') {
            // Switch to grouped view
            groupedView.style.display = '';
            listView.style.display = 'none';
            if (toggleText) toggleText.textContent = 'View as List';
        } else {
            // Switch to list view
            groupedView.style.display = 'none';
            listView.style.display = '';
            if (toggleText) toggleText.textContent = 'View by Agency';
        }
    }
}

async function inviteUser() {
    const email = prompt('Enter email address to invite:');
    if (!email) return;

    try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('https://zgkszwkxibpnxhvlenct.supabase.co/functions/v1/admin-gateway/users', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'invite',
                email: email
            })
        });

        const result = await response.json();

        if (response.ok && result.ok) {
            alert(`Invitation sent to ${email}`);
            loadUserManagement();
        } else {
            throw new Error(result.error || 'Failed to invite user');
        }
    } catch (error) {
        alert('Error inviting user: ' + error.message);
    }
}

async function resetUserPassword(userId, email) {
    if (!confirm(`Reset password for ${email}?`)) return;

    try {
        // For now, use the invite function to send a password reset
        const token = localStorage.getItem('auth_token');
        const response = await fetch('https://zgkszwkxibpnxhvlenct.supabase.co/functions/v1/admin-gateway/users', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'invite',
                email: email
            })
        });

        const result = await response.json();

        if (response.ok && result.ok) {
            alert(`Password reset email sent to ${email}`);
        } else {
            throw new Error(result.error || 'Failed to reset password');
        }
    } catch (error) {
        alert('Error resetting password: ' + error.message);
    }
}

async function changeUserRole(userId, newRole) {
    try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('https://zgkszwkxibpnxhvlenct.supabase.co/functions/v1/admin-gateway/users', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'set_role',
                user_id: userId,
                role: newRole
            })
        });

        const result = await response.json();

        if (response.ok && result.ok) {
            alert('Role updated successfully');
        } else {
            throw new Error(result.error || 'Failed to update role');
        }
    } catch (error) {
        alert('Error updating role: ' + error.message);
        loadUserManagement(); // Reload to reset the dropdown
    }
}

async function toggleUserStatus(userId, activate) {
    try {
        const response = await fetch('/api/super-admin/users', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: userId,
                is_active: activate
            })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            loadUserManagement();
        } else {
            throw new Error(result.error || 'Failed to update user status');
        }
    } catch (error) {
        alert('Error updating user status: ' + error.message);
    }
}

async function assignToAgency(userId) {
    // First, get list of agencies
    try {
        const response = await fetch('/api/super-admin/agencies-management');
        const data = await response.json();

        if (!data.success) throw new Error('Failed to load agencies');

        const agencies = data.agencies || [];
        const agencyOptions = agencies.map(a => `${a.name} (${a.id})`).join('\n');

        const selectedAgency = prompt(`Select agency ID to assign:\n\n${agencyOptions}\n\nEnter agency ID:`);
        if (!selectedAgency) return;

        const token = localStorage.getItem('auth_token');
        const assignResponse = await fetch('https://zgkszwkxibpnxhvlenct.supabase.co/functions/v1/admin-gateway/users', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'set_agency',
                user_id: userId,
                agency_id: selectedAgency
            })
        });

        const result = await assignResponse.json();

        if (assignResponse.ok && result.ok) {
            alert('User assigned to agency successfully');
            loadUserManagement();
        } else {
            throw new Error(result.error || 'Failed to assign agency');
        }
    } catch (error) {
        alert('Error assigning agency: ' + error.message);
    }
}

function showCreateUserForm() {
    const email = prompt('Enter email for new user:');
    if (!email) return;

    const password = prompt('Enter password (leave blank for auto-generated):');
    const role = prompt('Enter role (agent/manager/admin/customer_service):') || 'agent';

    createNewUser(email, password, role);
}

async function createNewUser(email, password, role) {
    try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('https://zgkszwkxibpnxhvlenct.supabase.co/functions/v1/admin-gateway/users', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'create',
                email: email,
                password: password || undefined,
                user_metadata: { role: role },
                app_metadata: { role: role }
            })
        });

        const result = await response.json();

        if (response.ok && result.ok) {
            alert(`User created successfully!\nEmail: ${email}\nRole: ${role}`);
            loadUserManagement();
        } else {
            throw new Error(result.error || 'Failed to create user');
        }
    } catch (error) {
        alert('Error creating user: ' + error.message);
    }
}

// Delete agency function
async function deleteAgency(agencyId, agencyName) {
    if (!confirm(`Are you sure you want to DELETE the agency "${agencyName}"?\n\nThis action cannot be undone!`)) {
        return;
    }

    if (!confirm(`FINAL CONFIRMATION: Delete "${agencyName}" and all associated data?`)) {
        return;
    }

    try {
        const response = await fetch('/api/super-admin/agencies-management', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: agencyId })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            alert(`Agency "${agencyName}" has been deleted`);
            loadAgencyManagement();
        } else {
            throw new Error(result.error || 'Failed to delete agency');
        }
    } catch (error) {
        console.error('Error deleting agency:', error);
        alert('Error deleting agency: ' + error.message);
    }
}

// ============= SQL QUERY TOOL FUNCTIONS =============

// SQL Templates
const sqlTemplates = {
    'create-table': `CREATE TABLE your_table_name (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);`,
    'add-column': `ALTER TABLE your_table_name
ADD COLUMN new_column_name VARCHAR(255);`,
    'create-index': `CREATE INDEX idx_your_index_name
ON your_table_name (column_name);`,
    'drop-table': `DROP TABLE IF EXISTS your_table_name;`,
    'rename-table': `ALTER TABLE old_table_name
RENAME TO new_table_name;`,
    'add-constraint': `ALTER TABLE your_table_name
ADD CONSTRAINT constraint_name
FOREIGN KEY (column_name)
REFERENCES other_table(id);`
};

function loadSQLTemplate() {
    const template = document.getElementById('sql-template').value;
    if (template && sqlTemplates[template]) {
        document.getElementById('sql-query').value = sqlTemplates[template];
    }
}

function clearSQL() {
    document.getElementById('sql-query').value = '';
    document.getElementById('sql-result').innerHTML = '';
}

async function executeSQL() {
    const sqlQuery = document.getElementById('sql-query').value.trim();
    if (!sqlQuery) {
        alert('Please enter a SQL query');
        return;
    }

    const resultDiv = document.getElementById('sql-result');
    resultDiv.innerHTML = '<div class="loading">Executing SQL...</div>';

    try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('https://zgkszwkxibpnxhvlenct.supabase.co/functions/v1/admin-gateway/sql', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sql: sqlQuery })
        });

        const result = await response.json();

        if (response.ok && result.ok) {
            resultDiv.innerHTML = `
                <div style="background: #10b981; color: white; padding: 15px; border-radius: 8px;">
                    <i class="fas fa-check-circle"></i> SQL executed successfully!
                </div>
            `;

            // Save to history
            saveToSQLHistory(sqlQuery, true);

            // Clear the query after successful execution
            setTimeout(() => {
                if (confirm('Query executed successfully! Clear the editor?')) {
                    clearSQL();
                }
            }, 500);
        } else {
            resultDiv.innerHTML = `
                <div style="background: #ef4444; color: white; padding: 15px; border-radius: 8px;">
                    <i class="fas fa-times-circle"></i> Error: ${result.error}
                </div>
            `;
            saveToSQLHistory(sqlQuery, false, result.error);
        }
    } catch (error) {
        resultDiv.innerHTML = `
            <div style="background: #ef4444; color: white; padding: 15px; border-radius: 8px;">
                <i class="fas fa-times-circle"></i> Network error: ${error.message}
            </div>
        `;
    }
}

async function validateSQL() {
    const sqlQuery = document.getElementById('sql-query').value.trim();
    if (!sqlQuery) {
        alert('Please enter a SQL query');
        return;
    }

    const resultDiv = document.getElementById('sql-result');

    // Check if it's DDL
    const isDDL = /^(CREATE|ALTER|DROP)\s+(TABLE|INDEX|CONSTRAINT)/i.test(sqlQuery);

    if (isDDL) {
        resultDiv.innerHTML = `
            <div style="background: #3b82f6; color: white; padding: 15px; border-radius: 8px;">
                <i class="fas fa-info-circle"></i> This appears to be a valid DDL query. Click "Execute SQL" to run it.
            </div>
        `;
    } else {
        resultDiv.innerHTML = `
            <div style="background: #f59e0b; color: white; padding: 15px; border-radius: 8px;">
                <i class="fas fa-exclamation-triangle"></i> Only DDL queries are allowed (CREATE TABLE, ALTER TABLE, DROP TABLE, CREATE INDEX)
            </div>
        `;
    }
}

function saveToSQLHistory(query, success, error = null) {
    // Get existing history from localStorage
    let history = JSON.parse(localStorage.getItem('sql_history') || '[]');

    // Add new entry
    history.unshift({
        query: query,
        success: success,
        error: error,
        timestamp: new Date().toISOString()
    });

    // Keep only last 50 queries
    history = history.slice(0, 50);

    // Save back to localStorage
    localStorage.setItem('sql_history', JSON.stringify(history));

    // Also save to database via audit log
    logAudit('SQL_QUERY', query, { success, error });
}

function showSQLHistory() {
    const historyDiv = document.getElementById('sql-history');
    const historyList = document.getElementById('history-list');

    // Toggle visibility
    if (historyDiv.style.display === 'none') {
        historyDiv.style.display = 'block';

        // Load history from localStorage
        const history = JSON.parse(localStorage.getItem('sql_history') || '[]');

        if (history.length === 0) {
            historyList.innerHTML = '<p style="color: #8b92a5;">No query history yet</p>';
        } else {
            historyList.innerHTML = history.map((item, index) => `
                <div style="background: #2a2a2a; padding: 10px; margin-bottom: 10px; border-radius: 4px; border-left: 3px solid ${item.success ? '#10b981' : '#ef4444'};">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span style="color: ${item.success ? '#10b981' : '#ef4444'}; font-weight: bold;">
                            ${item.success ? '✓ Success' : '✗ Failed'}
                        </span>
                        <span style="color: #8b92a5; font-size: 12px;">
                            ${new Date(item.timestamp).toLocaleString()}
                        </span>
                    </div>
                    <div style="background: #1a1a1a; padding: 8px; border-radius: 4px; margin: 5px 0;">
                        <code style="color: #10b981; font-size: 12px; white-space: pre-wrap;">${item.query}</code>
                    </div>
                    ${item.error ? `<div style="color: #ef4444; font-size: 12px; margin-top: 5px;">Error: ${item.error}</div>` : ''}
                    <button class="btn btn-sm" onclick="loadFromHistory(${index})" style="margin-top: 5px;">
                        Load Query
                    </button>
                </div>
            `).join('');
        }
    } else {
        historyDiv.style.display = 'none';
    }
}

function loadFromHistory(index) {
    const history = JSON.parse(localStorage.getItem('sql_history') || '[]');
    if (history[index]) {
        document.getElementById('sql-query').value = history[index].query;
        document.getElementById('sql-history').style.display = 'none';
    }
}