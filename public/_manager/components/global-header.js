// Manager Portal Global Header Component
// Provides consistent header across all manager pages

(function() {
    'use strict';

    const ManagerHeader = {
        // Default configuration
        config: {
            pageTitle: 'Manager Dashboard',
            showRoleSwitcher: true,
            showUserDisplay: true,
            containerClass: 'header',
            mountPoint: 'global-header-mount'
        },

        // Initialize the header
        init: function(options = {}) {
            // Merge options with defaults
            this.config = { ...this.config, ...options };
            
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.render());
            } else {
                this.render();
            }
        },

        // Render the header
        render: async function() {
            const mountPoint = document.getElementById(this.config.mountPoint);
            if (!mountPoint) {
                console.error(`Mount point #${this.config.mountPoint} not found`);
                return;
            }

            // Get user data if available
            const userData = await this.getUserData();
            
            // Build header HTML
            const headerHTML = this.buildHeader(userData);
            
            // Insert header
            mountPoint.innerHTML = headerHTML;
            
            // Initialize components
            this.initializeComponents(userData);
            
            // Re-initialize Lucide icons
            if (typeof lucide !== 'undefined') {
                setTimeout(() => lucide.createIcons(), 100);
            }
        },

        // Get current user data
        getUserData: async function() {
            try {
                // First, try to get from localStorage (most up-to-date)
                const localUser = localStorage.getItem('user');
                if (localUser) {
                    const userData = JSON.parse(localUser);
                    if (userData.firstName && userData.lastName) {
                        return {
                            role: userData.role || 'manager',
                            name: `${userData.firstName} ${userData.lastName}`,
                            email: userData.email || '',
                            firstName: userData.firstName,
                            lastName: userData.lastName
                        };
                    } else if (userData.name) {
                        return {
                            role: userData.role || 'manager',
                            name: userData.name,
                            email: userData.email || ''
                        };
                    }
                }
                
                // Check if SyncedUpAuth is available
                if (typeof SyncedUpAuth !== 'undefined' && SyncedUpAuth.getCurrentUser) {
                    const user = await SyncedUpAuth.getCurrentUser();
                    if (user) {
                        // Format the name properly
                        let userName = 'Manager';
                        if (user.firstName && user.lastName) {
                            userName = `${user.firstName} ${user.lastName}`;
                        } else if (user.name) {
                            userName = user.name;
                        } else if (user.email) {
                            userName = user.email.split('@')[0];
                        }
                        
                        return {
                            ...user,
                            name: userName,
                            role: user.role || 'manager'
                        };
                    }
                }
                
                // Fallback to checking cookies
                const getCookie = (name) => {
                    const value = `; ${document.cookie}`;
                    const parts = value.split(`; ${name}=`);
                    if (parts.length === 2) return parts.pop().split(';').shift();
                    return null;
                };
                
                const userRole = getCookie('user_role');
                const userName = getCookie('user_name');
                const userEmail = getCookie('user_email');
                
                return {
                    role: userRole || 'manager',
                    name: userName || userEmail || 'Manager',
                    email: userEmail || ''
                };
            } catch (error) {
                console.warn('Failed to get user data:', error);
                return {
                    role: 'manager',
                    name: 'Manager'
                };
            }
        },

        // Build the header HTML
        buildHeader: function(userData) {
            const userDisplay = userData ? `${userData.name || 'Manager'} (${userData.role || 'Manager'})` : 'Loading...';
            
            let headerContent = `
                <div class="${this.config.containerClass}">
                    <h1>${this.config.pageTitle}</h1>
                    <div style="display: flex; align-items: center; gap: 1rem;">
            `;
            
            // Add role switcher if enabled
            if (this.config.showRoleSwitcher) {
                headerContent += `<div id="roleSwitcherMount"></div>`;
            }
            
            // Add user display if enabled
            if (this.config.showUserDisplay) {
                headerContent += `<span id="userDisplay">${userDisplay}</span>`;
            }
            
            // Add logout button
            headerContent += `
                        <button class="btn" onclick="ManagerHeader.logout()">
                            <i data-lucide="log-out" class="icon"></i>
                            Logout
                        </button>
                    </div>
                </div>
            `;
            
            // Add navigation placeholder
            headerContent += `
                <div id="managerNavigation">
                    <!-- Navigation will be injected by navigation.js -->
                </div>
            `;
            
            return headerContent;
        },

        // Initialize additional components
        initializeComponents: function(userData) {
            // Initialize role switcher if needed
            if (this.config.showRoleSwitcher && window.RoleSwitcher) {
                // Managers can typically switch to agent or admin roles
                const availableRoles = [];
                
                // Check if user has multiple roles
                const getCookie = (name) => {
                    const value = `; ${document.cookie}`;
                    const parts = value.split(`; ${name}=`);
                    if (parts.length === 2) return parts.pop().split(';').shift();
                    return null;
                };
                
                const userRoles = getCookie('user_roles');
                if (userRoles) {
                    const roles = userRoles.split(',');
                    // Manager can switch to other roles they have
                    if (roles.includes('agent')) {
                        availableRoles.push({ value: 'agent', label: 'Agent' });
                    }
                    if (roles.includes('admin')) {
                        availableRoles.push({ value: 'admin', label: 'Admin' });
                    }
                    if (roles.includes('customer-service')) {
                        availableRoles.push({ value: 'customer-service', label: 'Customer Service' });
                    }
                }
                
                if (availableRoles.length > 0) {
                    window.RoleSwitcher.renderSwitcher('roleSwitcherMount', availableRoles);
                }
            }
            
            // Load navigation
            if (window.ManagerNavigation && window.ManagerNavigation.render) {
                window.ManagerNavigation.render();
            } else {
                // If navigation.js isn't loaded yet, wait for it
                const checkNav = setInterval(() => {
                    if (window.ManagerNavigation && window.ManagerNavigation.render) {
                        window.ManagerNavigation.render();
                        clearInterval(checkNav);
                    }
                }, 100);
                
                // Stop checking after 5 seconds
                setTimeout(() => clearInterval(checkNav), 5000);
            }
        },

        // Logout function
        logout: function() {
            // If SyncedUpAuth is available, use it
            if (typeof SyncedUpAuth !== 'undefined' && SyncedUpAuth.logout) {
                SyncedUpAuth.logout();
            } else {
                // Fallback: Clear cookies and redirect
                document.cookie = 'auth_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
                document.cookie = 'user_role=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
                document.cookie = 'user_roles=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
                document.cookie = 'assumed_role=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
                
                // Clear any localStorage data
                try {
                    localStorage.clear();
                    sessionStorage.clear();
                } catch (e) {
                    // Ignore errors
                }
                
                window.location.href = '/login';
            }
        },

        // Update page title
        updateTitle: function(newTitle) {
            this.config.pageTitle = newTitle;
            const titleElement = document.querySelector(`#${this.config.mountPoint} h1`);
            if (titleElement) {
                titleElement.textContent = newTitle;
            }
        },

        // Update user display
        updateUserDisplay: function(displayText) {
            const userDisplay = document.getElementById('userDisplay');
            if (userDisplay) {
                userDisplay.textContent = displayText;
            }
        },

        // Refresh user data from storage
        refreshUserData: async function() {
            const userData = await this.getUserData();
            const displayText = userData ? `${userData.name || 'Manager'} (${userData.role || 'Manager'})` : 'Loading...';
            this.updateUserDisplay(displayText);
            return userData;
        }
    };

    // Expose to global scope
    window.ManagerHeader = ManagerHeader;
    
    // Also expose logout function directly for onclick handlers
    window.logout = function() {
        ManagerHeader.logout();
    };
})();