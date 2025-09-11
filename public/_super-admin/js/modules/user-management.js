// User Management Module - Handles user CRUD operations
import { logAdminAction } from '../api/audit.js';
import { showNotification } from './utils.js';

export async function loadUserManagement() {
    await logAdminAction('NAVIGATION', 'Accessed User Management');
    
    const mainContent = document.querySelector('.dashboard-grid');
    if (!mainContent) return;
    
    mainContent.innerHTML = `
        <div class="dashboard-header">
            <h2>User Management</h2>
            <div class="header-actions">
                <button onclick="window.userMgmt.createUser()" class="btn btn-primary">Add New User</button>
                <button onclick="window.userMgmt.exportUsers()" class="btn btn-secondary">Export Users</button>
            </div>
        </div>
        
        <div class="card">
            <div class="tabs">
                <button class="tab-btn active" onclick="window.userMgmt.loadTab('all')">All Users</button>
                <button class="tab-btn" onclick="window.userMgmt.loadTab('agents')">Agents</button>
                <button class="tab-btn" onclick="window.userMgmt.loadTab('managers')">Managers</button>
                <button class="tab-btn" onclick="window.userMgmt.loadTab('admins')">Admins</button>
            </div>
            
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Last Login</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="user-list">
                    <tr><td colspan="6">Loading...</td></tr>
                </tbody>
            </table>
        </div>
    `;
    
    await loadUsers();
}

export async function loadUsers(role = null) {
    try {
        const url = role ? `/api/super-admin/users?role=${role}` : '/api/super-admin/users';
        const response = await fetch(url, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            // API returns {users: [], pagination: {}, filters_applied: {}}
            displayUsers(data.users || data);
        } else {
            throw new Error('Failed to load users');
        }
    } catch (error) {
        console.error('Error loading users:', error);
        document.getElementById('user-list').innerHTML = 
            '<tr><td colspan="6">Error loading users</td></tr>';
    }
}

function displayUsers(users) {
    const tbody = document.getElementById('user-list');
    if (!tbody) return;
    
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No users found</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.full_name || 'N/A'}</td>
            <td>${user.email}</td>
            <td>${user.role}</td>
            <td class="${user.is_active ? 'status-operational' : 'status-error'}">
                ${user.is_active ? 'Active' : 'Inactive'}
            </td>
            <td>${user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}</td>
            <td>
                <button onclick="window.userMgmt.editUser('${user.id}')" class="btn btn-sm">Edit</button>
                <button onclick="window.userMgmt.toggleStatus('${user.id}')" class="btn btn-sm">
                    ${user.is_active ? 'Deactivate' : 'Activate'}
                </button>
            </td>
        </tr>
    `).join('');
}

export async function createUser() {
    // Implementation for creating new user
    await logAdminAction('USER_CREATE_INITIATED', 'Started user creation process');
    
    // Show user creation dialog
    const email = prompt('Enter user email:');
    const password = prompt('Enter password:');
    const role = prompt('Enter role (agent/manager/admin/super_admin):');
    const full_name = prompt('Enter full name:');
    
    if (email && password && role) {
        try {
            // Use secure Edge Function for user creation
            const response = await fetch('/api/super-admin/users', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    password,
                    role,
                    full_name
                })
            });
            
            if (response.ok) {
                await logAdminAction('USER_CREATED', `Created user ${email} with role ${role}`);
                showNotification('User created successfully', 'success');
                await loadUsers(); // Reload user list
            } else {
                throw new Error('Failed to create user');
            }
        } catch (error) {
            console.error('User creation error:', error);
            showNotification('Failed to create user', 'error');
        }
    }
}

export async function editUser(userId) {
    await logAdminAction('USER_EDIT', `Editing user ${userId}`);
    
    // Get current user data
    const response = await fetch(`/api/super-admin/users/${userId}`, {
        credentials: 'include'
    });
    
    if (response.ok) {
        const user = await response.json();
        
        // Show edit dialog
        const newEmail = prompt('Enter new email:', user.email);
        const newName = prompt('Enter new name:', user.full_name);
        const newRole = prompt('Enter new role (agent/manager/admin/super_admin):', user.role);
        
        if (newEmail || newName || newRole) {
            try {
                const updateResponse = await fetch(`/api/super-admin/users/${userId}`, {
                    method: 'PATCH',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: newEmail || user.email,
                        full_name: newName || user.full_name,
                        role: newRole || user.role
                    })
                });
                
                if (updateResponse.ok) {
                    await logAdminAction('USER_UPDATED', `Updated user ${userId}`);
                    showNotification('User updated successfully', 'success');
                    await loadUsers();
                } else {
                    throw new Error('Failed to update user');
                }
            } catch (error) {
                console.error('User update error:', error);
                showNotification('Failed to update user', 'error');
            }
        }
    }
}

export async function toggleStatus(userId) {
    try {
        const response = await fetch(`/api/super-admin/users/${userId}/toggle-status`, {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            await logAdminAction('USER_STATUS_TOGGLE', `Toggled status for user ${userId}`);
            showNotification('User status updated successfully', 'success');
            await loadUsers();
        } else {
            throw new Error('Failed to toggle user status');
        }
    } catch (error) {
        console.error('Error toggling user status:', error);
        showNotification('Failed to update user status', 'error');
    }
}

export async function exportUsers() {
    await logAdminAction('USER_EXPORT', 'Exported user list');
    
    try {
        // Fetch all users
        const response = await fetch('/api/super-admin/users', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const users = await response.json();
            
            // Convert to CSV
            const csv = [
                ['ID', 'Email', 'Name', 'Role', 'Status', 'Created At'],
                ...users.map(user => [
                    user.id,
                    user.email,
                    user.full_name || '',
                    user.role,
                    user.is_active ? 'Active' : 'Inactive',
                    new Date(user.created_at).toLocaleDateString()
                ])
            ].map(row => row.join(',')).join('\n');
            
            // Download CSV
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showNotification('Users exported successfully', 'success');
        } else {
            throw new Error('Failed to fetch users');
        }
    } catch (error) {
        console.error('Export error:', error);
        showNotification('Failed to export users', 'error');
    }
}

export function loadTab(tab) {
    // Update active tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Load users based on tab
    const roleMap = {
        'all': null,
        'agents': 'agent',
        'managers': 'manager',
        'admins': 'admin'
    };
    
    loadUsers(roleMap[tab]);
}

// Expose functions to window for onclick handlers
if (typeof window !== 'undefined') {
    window.userMgmt = {
        createUser,
        editUser,
        toggleStatus,
        exportUsers,
        loadTab
    };
}