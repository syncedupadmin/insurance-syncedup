/**
 * User Management System for SyncedUp Insurance Admin
 * 
 * This module handles comprehensive user management including:
 * - User CRUD operations
 * - Role-based access control
 * - Bulk actions
 * - Security features (2FA, password policies)
 * - Activity logging
 */

class UserManagement {
    constructor() {
        this.users = [];
        this.filteredUsers = [];
        this.selectedUsers = [];
        this.currentPage = 1;
        this.usersPerPage = 25;
        this.sortColumn = 'email';
        this.sortDirection = 'asc';
        this.searchTerm = '';
        
        // Initialize with auth check
        this.checkAuthentication();
        
        // Password policy configuration
        this.passwordPolicy = {
            minLength: 12,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: true,
            preventReuse: 5,
            maxAge: 90,
            lockoutAttempts: 5,
            lockoutDuration: 900
        };
        
        this.init();
    }

    /**
     * Check authentication and permissions
     */
    checkAuthentication() {
        try {
            const token = localStorage.getItem('syncedup_token');
            const userStr = localStorage.getItem('syncedup_user');
            
            if (!token || !userStr) {
                window.location.href = '/login';
                return false;
            }
            
            const user = JSON.parse(userStr);
            const allowedRoles = ['super-admin', 'admin'];
            
            if (!allowedRoles.includes(user.role)) {
                alert('Access denied. Administrator privileges required.');
                window.location.href = '/login';
                return false;
            }
            
            this.currentUser = user;
            return true;
        } catch (error) {
            console.error('Authentication check failed:', error);
            window.location.href = '/login';
            return false;
        }
    }

    /**
     * Initialize the user management system
     */
    async init() {
        try {
            await this.loadUsers();
            this.setupEventListeners();
            this.updateUI();
            
            console.log('User management system initialized');
        } catch (error) {
            console.error('Failed to initialize user management:', error);
            this.showError('Failed to initialize system. Please refresh the page.');
        }
    }

    /**
     * Load users from API
     */
    async loadUsers() {
        try {
            const response = await this.apiCall('/api/admin/users', {
                method: 'GET'
            });
            
            if (response && response.success) {
                this.users = response.data.map(user => ({
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    status: user.status || 'active',
                    lastLogin: user.lastLogin,
                    failedAttempts: user.failedAttempts || 0,
                    mfaEnabled: user.mfaEnabled || false,
                    phone: user.phone,
                    department: user.department,
                    createdAt: user.createdAt,
                    metadata: user.metadata || {}
                }));
            } else {
                // Load fallback data for demo/development
                this.loadFallbackUsers();
            }
            
            this.filteredUsers = [...this.users];
            this.updateStatistics();
            
        } catch (error) {
            console.error('Error loading users:', error);
            this.loadFallbackUsers();
        }
    }

    /**
     * Load fallback user data for demo purposes
     */
    loadFallbackUsers() {
        this.users = [
            {
                id: 'user-1',
                email: 'admin@phsagency.com',
                name: 'System Administrator',
                role: 'super-admin',
                status: 'active',
                lastLogin: new Date().toISOString(),
                failedAttempts: 0,
                mfaEnabled: true,
                phone: '+1 (555) 123-4567',
                department: 'IT',
                createdAt: '2024-01-01T00:00:00Z',
                metadata: {}
            },
            {
                id: 'user-2',
                email: 'manager@phsagency.com',
                name: 'Sales Manager',
                role: 'manager',
                status: 'active',
                lastLogin: new Date(Date.now() - 86400000).toISOString(),
                failedAttempts: 0,
                mfaEnabled: true,
                phone: '+1 (555) 234-5678',
                department: 'Sales',
                createdAt: '2024-01-15T00:00:00Z',
                metadata: {}
            },
            {
                id: 'user-3',
                email: 'agent1@phsagency.com',
                name: 'Sarah Johnson',
                role: 'agent',
                status: 'active',
                lastLogin: new Date(Date.now() - 3600000).toISOString(),
                failedAttempts: 0,
                mfaEnabled: false,
                phone: '+1 (555) 345-6789',
                department: 'Sales',
                createdAt: '2024-02-01T00:00:00Z',
                metadata: {}
            },
            {
                id: 'user-4',
                email: 'agent2@phsagency.com',
                name: 'Mike Chen',
                role: 'agent',
                status: 'inactive',
                lastLogin: new Date(Date.now() - 604800000).toISOString(),
                failedAttempts: 2,
                mfaEnabled: false,
                phone: '+1 (555) 456-7890',
                department: 'Sales',
                createdAt: '2024-02-15T00:00:00Z',
                metadata: {}
            },
            {
                id: 'user-5',
                email: 'support@phsagency.com',
                name: 'Customer Service Rep',
                role: 'customer-service',
                status: 'active',
                lastLogin: new Date(Date.now() - 7200000).toISOString(),
                failedAttempts: 0,
                mfaEnabled: true,
                phone: '+1 (555) 567-8901',
                department: 'Support',
                createdAt: '2024-03-01T00:00:00Z',
                metadata: {}
            },
            {
                id: 'user-6',
                email: 'locked@phsagency.com',
                name: 'Locked User',
                role: 'agent',
                status: 'locked',
                lastLogin: new Date(Date.now() - 1209600000).toISOString(),
                failedAttempts: 5,
                mfaEnabled: false,
                phone: '+1 (555) 678-9012',
                department: 'Sales',
                createdAt: '2024-03-15T00:00:00Z',
                metadata: {}
            }
        ];
        
        this.filteredUsers = [...this.users];
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('userSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.applyFilters();
            });
        }

        // Filter dropdowns
        ['roleFilter', 'statusFilter'].forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) {
                filter.addEventListener('change', () => this.applyFilters());
            }
        });

        // Select all checkbox
        const selectAllCheckbox = document.getElementById('selectAll');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                this.toggleAllUsers(e.target.checked);
            });
        }
    }

    /**
     * Apply search and filter criteria
     */
    applyFilters() {
        const roleFilter = document.getElementById('roleFilter')?.value || '';
        const statusFilter = document.getElementById('statusFilter')?.value || '';
        
        this.filteredUsers = this.users.filter(user => {
            const matchesSearch = !this.searchTerm || 
                user.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                user.role.toLowerCase().includes(this.searchTerm.toLowerCase());
                
            const matchesRole = !roleFilter || user.role === roleFilter;
            const matchesStatus = !statusFilter || user.status === statusFilter;
            
            return matchesSearch && matchesRole && matchesStatus;
        });
        
        this.currentPage = 1;
        this.selectedUsers = [];
        this.updateUI();
    }

    /**
     * Update the user interface
     */
    updateUI() {
        this.updateStatistics();
        this.updateUserTable();
        this.updatePagination();
        this.updateBulkActions();
    }

    /**
     * Update user statistics
     */
    updateStatistics() {
        const totalUsers = this.users.length;
        const activeUsers = this.users.filter(u => u.status === 'active').length;
        const lockedUsers = this.users.filter(u => u.status === 'locked').length;
        const mfaEnabledUsers = this.users.filter(u => u.mfaEnabled).length;
        
        this.updateElement('totalUsers', totalUsers);
        this.updateElement('activeUsers', activeUsers);
        this.updateElement('lockedUsers', lockedUsers);
        this.updateElement('mfaEnabledUsers', mfaEnabledUsers);
    }

    /**
     * Update user table
     */
    updateUserTable() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;
        
        const startIndex = (this.currentPage - 1) * this.usersPerPage;
        const endIndex = startIndex + this.usersPerPage;
        const pageUsers = this.filteredUsers.slice(startIndex, endIndex);
        
        tbody.innerHTML = '';
        
        if (pageUsers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                        <i data-lucide="users" class="icon" style="margin-bottom: 1rem;"></i>
                        <p>No users found matching your criteria</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        pageUsers.forEach(user => {
            const row = this.createUserRow(user);
            tbody.appendChild(row);
        });
        
        // Reinitialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    /**
     * Create a user table row
     */
    createUserRow(user) {
        const row = document.createElement('tr');
        
        const lastLogin = user.lastLogin ? 
            new Date(user.lastLogin).toLocaleDateString() : 'Never';
            
        const mfaStatus = user.mfaEnabled ? 
            '<span class="mfa-enabled"><i data-lucide="shield-check"></i> Enabled</span>' :
            '<span class="mfa-disabled"><i data-lucide="shield-off"></i> Disabled</span>';
            
        row.innerHTML = `
            <td>
                <input type="checkbox" class="user-checkbox" value="${user.id}" 
                       onchange="userManagement.toggleUserSelection('${user.id}')">
            </td>
            <td>
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 40px; height: 40px; background: var(--primary-color); 
                                border-radius: 50%; display: flex; align-items: center; 
                                justify-content: center; color: white; font-weight: 600;">
                        ${this.getInitials(user.name)}
                    </div>
                    <div>
                        <div style="font-weight: 600; color: var(--text-primary);">${user.name}</div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">${user.email}</div>
                    </div>
                </div>
            </td>
            <td>
                <span class="user-role ${user.role}">
                    ${this.formatRole(user.role)}
                </span>
            </td>
            <td>
                <span class="user-status ${user.status}">
                    ${this.formatStatus(user.status)}
                </span>
            </td>
            <td>
                <div class="last-login">${lastLogin}</div>
            </td>
            <td>
                <div class="mfa-status">${mfaStatus}</div>
            </td>
            <td>
                <span class="failed-attempts ${user.failedAttempts > 3 ? 'high' : ''}">${user.failedAttempts}</span>
            </td>
            <td>
                <div class="user-actions">
                    <button class="action-btn edit" onclick="userManagement.editUser('${user.id}')" 
                            title="Edit User">
                        <i data-lucide="edit"></i>
                    </button>
                    ${user.status === 'locked' ? 
                        `<button class="action-btn unlock" onclick="userManagement.unlockUser('${user.id}')" 
                                title="Unlock User">
                            <i data-lucide="unlock"></i>
                        </button>` :
                        `<button class="action-btn lock" onclick="userManagement.lockUser('${user.id}')" 
                                title="Lock User">
                            <i data-lucide="lock"></i>
                        </button>`
                    }
                    <button class="action-btn" onclick="userManagement.viewUserActivity('${user.id}')" 
                            title="View Activity">
                        <i data-lucide="activity"></i>
                    </button>
                    ${user.id !== this.currentUser.id ? 
                        `<button class="action-btn delete" onclick="userManagement.deleteUser('${user.id}')" 
                                title="Delete User">
                            <i data-lucide="trash-2"></i>
                        </button>` : ''
                    }
                </div>
            </td>
        `;
        
        return row;
    }

    /**
     * Update pagination controls
     */
    updatePagination() {
        const totalPages = Math.ceil(this.filteredUsers.length / this.usersPerPage);
        const startIndex = (this.currentPage - 1) * this.usersPerPage;
        const endIndex = Math.min(startIndex + this.usersPerPage, this.filteredUsers.length);
        
        // Update pagination info
        this.updateElement('showingStart', startIndex + 1);
        this.updateElement('showingEnd', endIndex);
        this.updateElement('totalRecords', this.filteredUsers.length);
        
        // Update pagination controls
        const pageNumbers = document.getElementById('pageNumbers');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
        }
        
        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= totalPages;
        }
        
        if (pageNumbers) {
            pageNumbers.innerHTML = '';
            
            for (let i = 1; i <= totalPages; i++) {
                if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                    const pageBtn = document.createElement('button');
                    pageBtn.className = `page-btn ${i === this.currentPage ? 'active' : ''}`;
                    pageBtn.textContent = i;
                    pageBtn.onclick = () => this.goToPage(i);
                    pageNumbers.appendChild(pageBtn);
                } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                    const ellipsis = document.createElement('span');
                    ellipsis.textContent = '...';
                    ellipsis.style.padding = '0.5rem';
                    pageNumbers.appendChild(ellipsis);
                }
            }
        }
    }

    /**
     * Update bulk actions panel
     */
    updateBulkActions() {
        const bulkActionsPanel = document.getElementById('bulkActionsPanel');
        const bulkActionBtn = document.getElementById('bulkActionBtn');
        const selectedCount = document.getElementById('selectedCount');
        
        if (selectedCount) {
            selectedCount.textContent = `${this.selectedUsers.length} selected`;
        }
        
        if (bulkActionBtn) {
            bulkActionBtn.disabled = this.selectedUsers.length === 0;
        }
        
        if (bulkActionsPanel) {
            if (this.selectedUsers.length > 0) {
                bulkActionsPanel.classList.add('show');
            } else {
                bulkActionsPanel.classList.remove('show');
            }
        }
    }

    /**
     * Toggle user selection
     */
    toggleUserSelection(userId) {
        const checkbox = document.querySelector(`input[value="${userId}"]`);
        if (!checkbox) return;
        
        if (checkbox.checked) {
            if (!this.selectedUsers.includes(userId)) {
                this.selectedUsers.push(userId);
            }
        } else {
            this.selectedUsers = this.selectedUsers.filter(id => id !== userId);
        }
        
        this.updateBulkActions();
        this.updateSelectAllCheckbox();
    }

    /**
     * Toggle all users selection
     */
    toggleAllUsers(checked) {
        const checkboxes = document.querySelectorAll('.user-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
            const userId = checkbox.value;
            
            if (checked && !this.selectedUsers.includes(userId)) {
                this.selectedUsers.push(userId);
            } else if (!checked) {
                this.selectedUsers = this.selectedUsers.filter(id => id !== userId);
            }
        });
        
        this.updateBulkActions();
    }

    /**
     * Update select all checkbox state
     */
    updateSelectAllCheckbox() {
        const selectAllCheckbox = document.getElementById('selectAll');
        const checkboxes = document.querySelectorAll('.user-checkbox');
        
        if (selectAllCheckbox && checkboxes.length > 0) {
            const checkedCount = document.querySelectorAll('.user-checkbox:checked').length;
            
            if (checkedCount === 0) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
            } else if (checkedCount === checkboxes.length) {
                selectAllCheckbox.checked = true;
                selectAllCheckbox.indeterminate = false;
            } else {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = true;
            }
        }
    }

    /**
     * Show create user modal
     */
    showCreateUserModal() {
        const modal = document.getElementById('userModal');
        const title = document.getElementById('userModalTitle');
        const form = document.getElementById('userForm');
        
        if (title) title.textContent = 'Add New User';
        if (form) form.reset();
        
        // Show password field for new users
        const passwordGroup = document.getElementById('passwordGroup');
        if (passwordGroup) {
            passwordGroup.style.display = 'block';
            const passwordInput = document.getElementById('userPassword');
            if (passwordInput) passwordInput.required = true;
        }
        
        this.currentEditingUser = null;
        this.showModal(modal);
    }

    /**
     * Edit user
     */
    editUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) {
            this.showError('User not found');
            return;
        }
        
        const modal = document.getElementById('userModal');
        const title = document.getElementById('userModalTitle');
        
        if (title) title.textContent = 'Edit User';
        
        // Populate form
        this.updateElement('userEmail', user.email, 'value');
        this.updateElement('userName', user.name, 'value');
        this.updateElement('userRole', user.role, 'value');
        this.updateElement('userPhone', user.phone || '', 'value');
        this.updateElement('userDepartment', user.department || '', 'value');
        this.updateElement('userStatus', user.status, 'value');
        
        // Hide password field for existing users
        const passwordGroup = document.getElementById('passwordGroup');
        if (passwordGroup) {
            passwordGroup.style.display = 'none';
            const passwordInput = document.getElementById('userPassword');
            if (passwordInput) passwordInput.required = false;
        }
        
        this.currentEditingUser = user;
        this.showModal(modal);
    }

    /**
     * Save user (create or update)
     */
    async saveUser(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const userData = {
            email: formData.get('email') || document.getElementById('userEmail')?.value,
            name: formData.get('name') || document.getElementById('userName')?.value,
            role: formData.get('role') || document.getElementById('userRole')?.value,
            phone: formData.get('phone') || document.getElementById('userPhone')?.value,
            department: formData.get('department') || document.getElementById('userDepartment')?.value,
            status: formData.get('status') || document.getElementById('userStatus')?.value
        };
        
        // Validate required fields
        if (!userData.email || !userData.name || !userData.role) {
            this.showError('Please fill in all required fields');
            return;
        }
        
        // Validate email format
        if (!this.validateEmail(userData.email)) {
            this.showError('Please enter a valid email address');
            return;
        }
        
        // Validate password for new users
        if (!this.currentEditingUser) {
            const password = formData.get('password') || document.getElementById('userPassword')?.value;
            if (!password) {
                this.showError('Password is required for new users');
                return;
            }
            
            const passwordValidation = this.validatePassword(password);
            if (!passwordValidation.valid) {
                this.showError(passwordValidation.message);
                return;
            }
            
            userData.password = password;
        }
        
        try {
            const isEdit = !!this.currentEditingUser;
            const url = isEdit ? `/api/admin/users/${this.currentEditingUser.id}` : '/api/admin/users';
            const method = isEdit ? 'PUT' : 'POST';
            
            const response = await this.apiCall(url, {
                method,
                body: JSON.stringify(userData)
            });
            
            if (response && response.success) {
                this.showSuccess(isEdit ? 'User updated successfully' : 'User created successfully');
                this.closeUserModal();
                await this.loadUsers();
                this.updateUI();
            } else {
                this.showError(response?.message || 'Failed to save user');
            }
            
        } catch (error) {
            console.error('Error saving user:', error);
            this.showError('Failed to save user. Please try again.');
        }
    }

    /**
     * Delete user
     */
    async deleteUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;
        
        if (userId === this.currentUser.id) {
            this.showError('You cannot delete your own account');
            return;
        }
        
        const confirmed = confirm(
            `Are you sure you want to delete user "${user.name}" (${user.email})?\n\n` +
            'This action cannot be undone and will permanently remove all user data.'
        );
        
        if (!confirmed) return;
        
        try {
            const response = await this.apiCall(`/api/admin/users/${userId}`, {
                method: 'DELETE'
            });
            
            if (response && response.success) {
                this.showSuccess('User deleted successfully');
                await this.loadUsers();
                this.updateUI();
            } else {
                this.showError(response?.message || 'Failed to delete user');
            }
            
        } catch (error) {
            console.error('Error deleting user:', error);
            this.showError('Failed to delete user. Please try again.');
        }
    }

    /**
     * Lock user account
     */
    async lockUser(userId) {
        await this.updateUserStatus(userId, 'locked');
    }

    /**
     * Unlock user account
     */
    async unlockUser(userId) {
        await this.updateUserStatus(userId, 'active');
    }

    /**
     * Update user status
     */
    async updateUserStatus(userId, status) {
        try {
            const response = await this.apiCall(`/api/admin/users/${userId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status })
            });
            
            if (response && response.success) {
                this.showSuccess(`User ${status === 'locked' ? 'locked' : 'unlocked'} successfully`);
                await this.loadUsers();
                this.updateUI();
            } else {
                this.showError(response?.message || 'Failed to update user status');
            }
            
        } catch (error) {
            console.error('Error updating user status:', error);
            this.showError('Failed to update user status. Please try again.');
        }
    }

    /**
     * View user activity
     */
    async viewUserActivity(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;
        
        const modal = document.getElementById('activityModal');
        const content = document.getElementById('activityContent');
        
        if (content) {
            content.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <i data-lucide="loader" class="icon spin"></i>
                    Loading activity log for ${user.name}...
                </div>
            `;
        }
        
        this.showModal(modal);
        
        try {
            const response = await this.apiCall(`/api/admin/users/${userId}/activity`);
            
            if (response && response.success && content) {
                const activities = response.data || [];
                
                if (activities.length === 0) {
                    content.innerHTML = `
                        <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                            <i data-lucide="activity" class="icon" style="margin-bottom: 1rem;"></i>
                            <p>No activity recorded for this user</p>
                        </div>
                    `;
                } else {
                    content.innerHTML = `
                        <div class="activity-timeline">
                            ${activities.map(activity => `
                                <div class="activity-item">
                                    <div class="activity-time">${new Date(activity.timestamp).toLocaleString()}</div>
                                    <div class="activity-action">${activity.action}</div>
                                    <div class="activity-details">${activity.details || ''}</div>
                                    <div class="activity-ip">IP: ${activity.ipAddress || 'Unknown'}</div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                }
            } else {
                content.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                        <p>Unable to load activity log</p>
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('Error loading user activity:', error);
            if (content) {
                content.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: var(--error);">
                        <p>Error loading activity log</p>
                    </div>
                `;
            }
        }
        
        // Reinitialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    /**
     * Bulk activate users
     */
    async bulkActivateUsers() {
        await this.bulkUpdateStatus('active', 'activate');
    }

    /**
     * Bulk deactivate users
     */
    async bulkDeactivateUsers() {
        await this.bulkUpdateStatus('inactive', 'deactivate');
    }

    /**
     * Bulk lock users
     */
    async bulkLockUsers() {
        await this.bulkUpdateStatus('locked', 'lock');
    }

    /**
     * Bulk update user status
     */
    async bulkUpdateStatus(status, action) {
        if (this.selectedUsers.length === 0) {
            this.showError('No users selected');
            return;
        }
        
        const confirmed = confirm(
            `Are you sure you want to ${action} ${this.selectedUsers.length} user(s)?`
        );
        
        if (!confirmed) return;
        
        try {
            const response = await this.apiCall('/api/admin/users/bulk-status', {
                method: 'PATCH',
                body: JSON.stringify({
                    userIds: this.selectedUsers,
                    status: status
                })
            });
            
            if (response && response.success) {
                this.showSuccess(`Successfully ${action}d ${this.selectedUsers.length} user(s)`);
                this.selectedUsers = [];
                await this.loadUsers();
                this.updateUI();
            } else {
                this.showError(response?.message || `Failed to ${action} users`);
            }
            
        } catch (error) {
            console.error(`Error bulk ${action}ing users:`, error);
            this.showError(`Failed to ${action} users. Please try again.`);
        }
    }

    /**
     * Clear user selection
     */
    clearSelection() {
        this.selectedUsers = [];
        document.querySelectorAll('.user-checkbox').forEach(cb => cb.checked = false);
        this.updateBulkActions();
        this.updateSelectAllCheckbox();
    }

    /**
     * Pagination methods
     */
    goToPage(page) {
        this.currentPage = page;
        this.updateUI();
    }

    nextPage() {
        const totalPages = Math.ceil(this.filteredUsers.length / this.usersPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.updateUI();
        }
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updateUI();
        }
    }

    /**
     * Modal management
     */
    showModal(modal) {
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modal) {
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = 'auto';
        }
    }

    closeUserModal() {
        const modal = document.getElementById('userModal');
        this.closeModal(modal);
        this.currentEditingUser = null;
    }

    closeActivityModal() {
        const modal = document.getElementById('activityModal');
        this.closeModal(modal);
    }

    /**
     * Utility methods
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validatePassword(password) {
        const policy = this.passwordPolicy;
        
        if (password.length < policy.minLength) {
            return { valid: false, message: `Password must be at least ${policy.minLength} characters long` };
        }
        
        if (policy.requireUppercase && !/[A-Z]/.test(password)) {
            return { valid: false, message: 'Password must contain at least one uppercase letter' };
        }
        
        if (policy.requireLowercase && !/[a-z]/.test(password)) {
            return { valid: false, message: 'Password must contain at least one lowercase letter' };
        }
        
        if (policy.requireNumbers && !/\d/.test(password)) {
            return { valid: false, message: 'Password must contain at least one number' };
        }
        
        if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            return { valid: false, message: 'Password must contain at least one special character' };
        }
        
        return { valid: true };
    }

    getInitials(name) {
        return name.split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }

    formatRole(role) {
        return role.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    formatStatus(status) {
        return status.charAt(0).toUpperCase() + status.slice(1);
    }

    updateElement(id, value, property = 'textContent') {
        const element = document.getElementById(id);
        if (element) {
            if (property === 'textContent' || property === 'innerHTML') {
                element[property] = value;
            } else {
                element[property] = value;
            }
        }
    }

    /**
     * API call wrapper
     */
    async apiCall(url, options = {}) {
        const token = localStorage.getItem('syncedup_token');
        
        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        };
        
        const response = await fetch(url, { ...defaultOptions, ...options });
        
        if (response.status === 401) {
            // Token expired, redirect to login
            localStorage.removeItem('syncedup_token');
            localStorage.removeItem('syncedup_user');
            window.location.href = '/login';
            return null;
        }
        
        return response.json();
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    /**
     * Show error message
     */
    showError(message) {
        this.showNotification(message, 'error');
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'info'}" class="icon"></i>
            <span>${message}</span>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'rgb(34, 197, 94)' : type === 'error' ? 'rgb(239, 68, 68)' : 'rgb(59, 130, 246)'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Initialize Lucide icon
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }

    /**
     * Refresh user data
     */
    async refreshUserData() {
        await this.loadUsers();
        this.updateUI();
        this.showSuccess('User data refreshed successfully');
    }

    /**
     * Logout
     */
    logout() {
        localStorage.removeItem('syncedup_token');
        localStorage.removeItem('syncedup_user');
        window.location.href = '/login';
    }
}

// Initialize user management system
function initializeUserManagement() {
    if (typeof window.userManagement === 'undefined') {
        window.userManagement = new UserManagement();
    }
}

// Global functions for HTML onclick handlers
function showCreateUserModal() {
    window.userManagement?.showCreateUserModal();
}

function closeUserModal() {
    window.userManagement?.closeUserModal();
}

function closeActivityModal() {
    window.userManagement?.closeActivityModal();
}

function saveUser(event) {
    return window.userManagement?.saveUser(event);
}

function toggleAllUsers() {
    const selectAll = document.getElementById('selectAll');
    window.userManagement?.toggleAllUsers(selectAll?.checked);
}

function bulkActivateUsers() {
    window.userManagement?.bulkActivateUsers();
}

function bulkDeactivateUsers() {
    window.userManagement?.bulkDeactivateUsers();
}

function bulkLockUsers() {
    window.userManagement?.bulkLockUsers();
}

function clearSelection() {
    window.userManagement?.clearSelection();
}

function nextPage() {
    window.userManagement?.nextPage();
}

function previousPage() {
    window.userManagement?.previousPage();
}

function refreshUserData() {
    window.userManagement?.refreshUserData();
}

function logout() {
    window.userManagement?.logout();
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .spin {
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    .activity-timeline {
        max-height: 400px;
        overflow-y: auto;
    }
    
    .activity-item {
        padding: 1rem;
        border-bottom: 1px solid var(--border-color);
        border-left: 3px solid var(--primary-color);
        margin-bottom: 0.5rem;
        border-radius: 0 4px 4px 0;
        background: var(--hover-bg);
    }
    
    .activity-time {
        font-size: 0.75rem;
        color: var(--text-secondary);
        margin-bottom: 0.25rem;
    }
    
    .activity-action {
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 0.25rem;
    }
    
    .activity-details {
        font-size: 0.875rem;
        color: var(--text-secondary);
        margin-bottom: 0.25rem;
    }
    
    .activity-ip {
        font-size: 0.75rem;
        color: var(--text-muted);
    }
`;
document.head.appendChild(style);