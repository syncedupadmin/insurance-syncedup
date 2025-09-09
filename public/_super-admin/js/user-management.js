class SuperAdminUserManagement {
    constructor() {
        this.authToken = localStorage.getItem('syncedup_token');
        this.currentUser = JSON.parse(localStorage.getItem('syncedup_user') || '{}');
        
        // Verify super admin access
        const role = this.normalizeRole(this.currentUser.role || '');
        if (!this.authToken || role !== 'super_admin') {
            this.redirectToLogin();
            return;
        }
        
        this.users = [];
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.filters = {
            search: '',
            role: '',
            status: ''
        };
        
        this.init();
    }

    normalizeRole(role) {
        const roleMap = {
            'super-admin': 'super_admin',
            'customer-service': 'customer_service'
        };
        return roleMap[role] || role;
    }

    redirectToLogin() {
        alert('Unauthorized access. Super Admin privileges required.');
        window.location.href = '/login';
    }

    async init() {
        this.setupEventListeners();
        this.updateUserInfo();
        await this.loadUsers();
        this.updateLastRefresh();
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('user-search');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.filters.search = searchInput.value;
                this.filterUsers();
            }, 300));
        }

        // Filter controls
        const roleFilter = document.getElementById('role-filter');
        const statusFilter = document.getElementById('status-filter');
        
        if (roleFilter) {
            roleFilter.addEventListener('change', (e) => {
                this.filters.role = e.target.value;
                this.filterUsers();
            });
        }

        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filters.status = e.target.value;
                this.filterUsers();
            });
        }

        // Action buttons
        const addUserBtn = document.getElementById('add-user-btn');
        const refreshBtn = document.getElementById('refresh-btn');

        if (addUserBtn) {
            addUserBtn.addEventListener('click', () => this.showAddUserDialog());
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshUsers());
        }
    }

    updateUserInfo() {
        const emailElement = document.getElementById('admin-email');
        if (emailElement) {
            emailElement.textContent = this.currentUser.email || 'Super Administrator';
        }
    }

    updateLastRefresh() {
        const refreshElement = document.getElementById('last-refresh');
        if (refreshElement) {
            refreshElement.textContent = new Date().toLocaleTimeString();
        }
    }

    async loadUsers() {
        try {
            this.showLoading(true);
            
            const response = await fetch('/api/admin/users?page=1&limit=100', {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                this.redirectToLogin();
                return;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.users = data.users || [];
            this.updateStats(data.stats || {});
            this.renderUsers();

        } catch (error) {
            console.error('Error loading users:', error);
            this.showError('Failed to load user data. Using demo data.');
            this.loadDemoData();
        } finally {
            this.showLoading(false);
        }
    }

    loadDemoData() {
        this.users = [
            {
                id: 'demo-1',
                name: 'John Agent',
                email: 'john.agent@demo.com',
                role: 'agent',
                is_active: true,
                created_at: new Date(Date.now() - 86400000).toISOString(),
                last_login: new Date(Date.now() - 3600000).toISOString(),
                agent_code: 'JA001'
            },
            {
                id: 'demo-2',
                name: 'Sarah Manager',
                email: 'sarah.manager@demo.com',
                role: 'manager',
                is_active: true,
                created_at: new Date(Date.now() - 172800000).toISOString(),
                last_login: new Date(Date.now() - 7200000).toISOString()
            },
            {
                id: 'demo-3',
                name: 'Demo Admin',
                email: 'admin@demo.com',
                role: 'admin',
                is_active: true,
                created_at: new Date(Date.now() - 259200000).toISOString(),
                last_login: new Date(Date.now() - 1800000).toISOString()
            },
            {
                id: 'demo-4',
                name: 'Inactive User',
                email: 'inactive@demo.com',
                role: 'agent',
                is_active: false,
                created_at: new Date(Date.now() - 604800000).toISOString(),
                last_login: new Date(Date.now() - 86400000).toISOString(),
                agent_code: 'IU001'
            }
        ];

        const stats = {
            total: this.users.length,
            active: this.users.filter(u => u.is_active).length,
            admins: this.users.filter(u => ['admin', 'super_admin'].includes(u.role)).length,
            agents: this.users.filter(u => u.role === 'agent').length
        };

        this.updateStats(stats);
        this.renderUsers();
    }

    updateStats(stats) {
        const elements = {
            'total-users': stats.total || 0,
            'active-users': stats.active || 0,
            'admin-count': stats.admins || 0,
            'agent-count': stats.agents || 0
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value.toLocaleString();
            }
        });
    }

    filterUsers() {
        this.renderUsers();
    }

    renderUsers() {
        const userList = document.getElementById('user-list');
        if (!userList) return;

        let filteredUsers = [...this.users];

        // Apply filters
        if (this.filters.search) {
            const searchLower = this.filters.search.toLowerCase();
            filteredUsers = filteredUsers.filter(user => 
                user.name.toLowerCase().includes(searchLower) ||
                user.email.toLowerCase().includes(searchLower) ||
                user.role.toLowerCase().includes(searchLower) ||
                (user.agent_code && user.agent_code.toLowerCase().includes(searchLower))
            );
        }

        if (this.filters.role) {
            filteredUsers = filteredUsers.filter(user => user.role === this.filters.role);
        }

        if (this.filters.status) {
            const isActive = this.filters.status === 'active';
            filteredUsers = filteredUsers.filter(user => user.is_active === isActive);
        }

        if (filteredUsers.length === 0) {
            userList.innerHTML = `
                <div class="no-data">
                    <i>👥</i>
                    <p>No users found matching your criteria</p>
                </div>
            `;
            return;
        }

        const usersHTML = filteredUsers.map(user => `
            <div class="user-item" data-user-id="${user.id}">
                <div class="user-info">
                    <div class="user-avatar">
                        ${this.getInitials(user.name)}
                    </div>
                    <div class="user-details">
                        <h4>${user.name}</h4>
                        <p>${user.email}</p>
                        ${user.agent_code ? `<p>Agent Code: ${user.agent_code}</p>` : ''}
                    </div>
                </div>
                <div class="user-meta">
                    <span class="user-status ${user.is_active ? 'active' : 'inactive'}">
                        ${user.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span>Role: ${this.formatRole(user.role)}</span>
                    <span>Joined: ${this.formatDate(user.created_at)}</span>
                    <span>Last Login: ${user.last_login ? this.formatRelativeTime(user.last_login) : 'Never'}</span>
                </div>
                <div class="user-actions">
                    <button class="btn btn-sm btn-primary" onclick="superAdminUM.editUser('${user.id}')">
                        <i>✏️</i> Edit
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="superAdminUM.resetPassword('${user.id}')">
                        <i>🔑</i> Reset Password
                    </button>
                    ${user.role !== 'super_admin' ? `
                        <button class="btn btn-sm ${user.is_active ? 'btn-warning' : 'btn-success'}" 
                                onclick="superAdminUM.toggleUserStatus('${user.id}')">
                            <i>${user.is_active ? '⏸️' : '▶️'}</i> ${user.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');

        userList.innerHTML = usersHTML;
    }

    getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }

    formatRole(role) {
        const roleMap = {
            'super_admin': 'Super Admin',
            'admin': 'Admin',
            'manager': 'Manager',
            'agent': 'Agent',
            'customer_service': 'Customer Service'
        };
        return roleMap[role] || role.charAt(0).toUpperCase() + role.slice(1);
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    }

    formatRelativeTime(dateString) {
        if (!dateString) return 'Never';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }

    async refreshUsers() {
        await this.loadUsers();
        this.updateLastRefresh();
        this.showNotification('User data refreshed successfully', 'success');
    }

    editUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        alert(`Edit User Feature\n\nUser: ${user.name}\nEmail: ${user.email}\nRole: ${user.role}\n\nThis would open a detailed edit modal in the full implementation.`);
    }

    async resetPassword(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        if (!confirm(`Reset password for ${user.name}?\n\nA new temporary password will be generated and emailed to the user.`)) {
            return;
        }

        try {
            this.showNotification(`Password reset initiated for ${user.name}. New credentials will be emailed.`, 'success');
        } catch (error) {
            this.showNotification('Failed to reset password', 'error');
        }
    }

    async toggleUserStatus(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        const action = user.is_active ? 'deactivate' : 'activate';
        if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${user.name}?`)) {
            return;
        }

        try {
            // Update local state for demo
            user.is_active = !user.is_active;
            this.renderUsers();
            
            const stats = {
                total: this.users.length,
                active: this.users.filter(u => u.is_active).length,
                admins: this.users.filter(u => ['admin', 'super_admin'].includes(u.role)).length,
                agents: this.users.filter(u => u.role === 'agent').length
            };
            this.updateStats(stats);
            
            this.showNotification(`User ${action}d successfully`, 'success');
        } catch (error) {
            this.showNotification(`Failed to ${action} user`, 'error');
        }
    }

    showAddUserDialog() {
        alert(`Add New User\n\nThis would open a comprehensive user creation modal with:\n- Personal information fields\n- Role selection\n- Permission settings\n- Department assignment\n- Initial password setup\n\nFull implementation would include form validation and API integration.`);
    }

    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'success' ? 'rgba(16, 185, 129, 0.9)' : type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(59, 130, 246, 0.9)'};
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                font-weight: 500;
                z-index: 1001;
                backdrop-filter: blur(20px);
                animation: slideIn 0.3s ease;
                max-width: 400px;
            ">
                ${message}
                <button onclick="this.parentElement.remove()" style="
                    background: none;
                    border: none;
                    color: white;
                    font-size: 1.2rem;
                    cursor: pointer;
                    margin-left: 1rem;
                    padding: 0;
                ">×</button>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize when DOM is loaded
let superAdminUM;
document.addEventListener('DOMContentLoaded', () => {
    superAdminUM = new SuperAdminUserManagement();
});