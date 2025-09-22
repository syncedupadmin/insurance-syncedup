// Admin Portal Global Header Component
// Provides consistent header across all admin pages

(function() {
    'use strict';

    const AdminHeader = {
        // Default configuration
        config: {
            pageTitle: 'Admin Dashboard',
            showRoleSwitcher: true,
            showUserDisplay: true,
            containerClass: 'header',
            mountPoint: 'global-header-mount',
            includeParticles: true
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
                // Use cookie-based authentication to get user data
                const response = await fetch('/api/auth/verify', {
                    credentials: 'include'
                });

                if (response.ok) {
                    const userData = await response.json();
                    if (userData.firstName && userData.lastName) {
                        return {
                            role: userData.role || 'admin',
                            name: `${userData.firstName} ${userData.lastName}`,
                            email: userData.email || '',
                            firstName: userData.firstName,
                            lastName: userData.lastName
                        };
                    } else if (userData.name) {
                        return {
                            role: userData.role || 'admin',
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
                        let userName = 'Admin';
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
                            role: user.role || 'admin'
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
                    role: userRole || 'admin',
                    name: userName || userEmail || 'Admin',
                    email: userEmail || ''
                };
            } catch (error) {
                console.warn('Failed to get user data:', error);
                return {
                    role: 'admin',
                    name: 'Admin'
                };
            }
        },

        // Build the header HTML
        buildHeader: function(userData) {
            const userDisplay = userData ? `${userData.name || 'Admin'} (${userData.role || 'Admin'})` : 'Loading...';
            
            let headerContent = '';
            
            // Add floating particles if enabled
            if (this.config.includeParticles) {
                headerContent += `
                    <!-- Floating particles effect -->
                    <div class="particles">
                        <div class="particle"></div>
                        <div class="particle"></div>
                        <div class="particle"></div>
                    </div>
                `;
            }
            
            // Add main header
            headerContent += `
                <div class="${this.config.containerClass}">
                    <h1 class="neon-text">${this.config.pageTitle}</h1>
                    <div style="display: flex; justify-content: center; align-items: center; gap: 1rem; padding: 1rem 0;">
            `;
            
            // Add role switcher if enabled
            if (this.config.showRoleSwitcher) {
                headerContent += `<div id="roleSwitcherMount"></div>`;
            }
            
            // Add user display if enabled
            if (this.config.showUserDisplay) {
                headerContent += `<span id="userDisplay" style="color: white;">${userDisplay}</span>`;
            }
            
            // Add leaderboard button with game-themed styling
            headerContent += `
                <button class="leaderboard-btn" onclick="window.location.href='/global-leaderboard'" style="
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
                    color: #1a1a1a;
                    border: 2px solid #FFD700;
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    font-weight: bold;
                    font-size: 0.95rem;
                    cursor: pointer;
                    position: relative;
                    overflow: hidden;
                    transition: all 0.3s ease;
                    box-shadow: 0 2px 8px rgba(255, 215, 0, 0.3);
                    text-shadow: 0 1px 2px rgba(0,0,0,0.1);
                "
                onmouseover="this.style.transform='translateY(-2px) scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(255, 215, 0, 0.5)';"
                onmouseout="this.style.transform='translateY(0) scale(1)'; this.style.boxShadow='0 2px 8px rgba(255, 215, 0, 0.3)';">
                    <i data-lucide="trophy" class="icon" style="color: #1a1a1a;"></i>
                    <span style="position: relative;">
                        Leaderboard
                    </span>
                </button>
            `;
            
            // Add logout button
            headerContent += `
                        <button class="btn" style="background: transparent; border: 1px solid white;" onclick="AdminHeader.logout()">
                            <i data-lucide="log-out" class="icon"></i>Logout
                        </button>
                    </div>
                </div>
            `;
            
            // Add navigation placeholder with centered styling
            headerContent += `
                <nav class="nav" id="adminNavigation" style="
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 1rem;
                    padding: 1rem 0;
                ">
                    <!-- Navigation will be injected by navigation.js -->
                </nav>
            `;
            
            return headerContent;
        },

        // Initialize additional components
        initializeComponents: function(userData) {
            // Initialize role switcher if needed
            if (this.config.showRoleSwitcher && window.RoleSwitcher) {
                // Admins can typically switch to various roles
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
                    // Admin can switch to other roles they have
                    if (roles.includes('manager')) {
                        availableRoles.push({ value: 'manager', label: 'Manager' });
                    }
                    if (roles.includes('agent')) {
                        availableRoles.push({ value: 'agent', label: 'Agent' });
                    }
                    if (roles.includes('customer-service')) {
                        availableRoles.push({ value: 'customer-service', label: 'Customer Service' });
                    }
                    if (roles.includes('super-admin')) {
                        availableRoles.push({ value: 'super-admin', label: 'Super Admin' });
                    }
                }
                
                if (availableRoles.length > 0) {
                    window.RoleSwitcher.renderSwitcher('roleSwitcherMount', availableRoles);
                }
            }
            
            // Load navigation
            if (window.AdminNavigation && window.AdminNavigation.render) {
                window.AdminNavigation.render();
            } else {
                // If navigation.js isn't loaded yet, wait for it
                const checkNav = setInterval(() => {
                    if (window.AdminNavigation && window.AdminNavigation.render) {
                        window.AdminNavigation.render();
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
            const displayText = userData ? `${userData.name || 'Admin'} (${userData.role || 'Admin'})` : 'Loading...';
            this.updateUserDisplay(displayText);
            return userData;
        }
    };

    // Expose to global scope
    window.AdminHeader = AdminHeader;
    
    // Also expose logout function directly for onclick handlers
    window.logout = function() {
        AdminHeader.logout();
    };
})();