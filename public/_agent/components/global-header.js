// Agent Portal Global Header Component
// Provides consistent header across all agent pages

(function() {
    'use strict';

    const AgentHeader = {
        // Default configuration
        config: {
            pageTitle: 'Agent Portal',
            showRoleSwitcher: false,
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
                // Use cookie-based authentication to get user data
                const response = await fetch('/api/auth/verify', {
                    credentials: 'include'
                });

                if (response.ok) {
                    const userData = await response.json();
                    if (userData.firstName && userData.lastName) {
                        return {
                            role: userData.role || 'agent',
                            name: `${userData.firstName} ${userData.lastName}`,
                            email: userData.email || '',
                            firstName: userData.firstName,
                            lastName: userData.lastName
                        };
                    }
                }
                
                // Check if SyncedUpAuth is available
                if (typeof SyncedUpAuth !== 'undefined' && SyncedUpAuth.getCurrentUser) {
                    const user = await SyncedUpAuth.getCurrentUser();
                    if (user) {
                        return user;
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
                    role: userRole || 'agent',
                    name: userName || 'Agent User',
                    email: userEmail || ''
                };
            } catch (error) {
                console.warn('Failed to get user data:', error);
                return {
                    role: 'agent',
                    name: 'Agent User'
                };
            }
        },

        // Build the header HTML
        buildHeader: function(userData) {
            const userDisplay = userData ? `${userData.name || 'Agent User'} (${userData.role || 'Agent'})` : 'Loading...';
            
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

                        <!-- Theme Switcher Buttons -->
                        <div style="display: flex; gap: 0.5rem; align-items: center;">
                            <button class="btn btn-sm" onclick="if(window.themeSystem) window.themeSystem.applyTheme('professional')"
                                    title="Professional Theme"
                                    style="padding: 0.4rem 0.8rem; font-size: 0.85rem; background: linear-gradient(135deg, #059669, #10b981);">
                                <i data-lucide="briefcase" style="width: 16px; height: 16px;"></i>
                            </button>
                            <button class="btn btn-sm" onclick="if(window.themeSystem) window.themeSystem.applyTheme('classic')"
                                    title="Classic Theme"
                                    style="padding: 0.4rem 0.8rem; font-size: 0.85rem; background: linear-gradient(135deg, #047857, #059669);">
                                <i data-lucide="palette" style="width: 16px; height: 16px;"></i>
                            </button>
                            <button class="btn btn-sm" onclick="if(window.themeSystem) window.themeSystem.applyTheme('modern')"
                                    title="Modern Theme"
                                    style="padding: 0.4rem 0.8rem; font-size: 0.85rem; background: linear-gradient(135deg, #10b981, #34d399);">
                                <i data-lucide="zap" style="width: 16px; height: 16px;"></i>
                            </button>
                        </div>
            `;

            // Add logout button
            headerContent += `
                        <button class="btn" onclick="AgentHeader.logout()">
                            <i data-lucide="log-out" class="icon"></i>
                            Logout
                        </button>
                    </div>
                </div>
            `;
            
            // Add navigation placeholder with centered styling
            headerContent += `
                <div class="nav" id="agentNavigation" style="
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 1rem;
                    padding: 1rem 0;
                ">
                    <!-- Navigation will be injected by navigation.js -->
                </div>
            `;
            
            return headerContent;
        },

        // Initialize additional components
        initializeComponents: function(userData) {
            // Initialize role switcher if needed
            if (this.config.showRoleSwitcher && window.RoleSwitcher) {
                // Agent can potentially switch to customer role
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
                    // Agent can switch to other roles they have
                    if (roles.includes('manager')) {
                        availableRoles.push({ value: 'manager', label: 'Manager' });
                    }
                    if (roles.includes('admin')) {
                        availableRoles.push({ value: 'admin', label: 'Admin' });
                    }
                }
                
                if (availableRoles.length > 0) {
                    window.RoleSwitcher.renderSwitcher('roleSwitcherMount', availableRoles);
                }
            }
            
            // Load navigation
            if (window.AgentNavigation && window.AgentNavigation.render) {
                window.AgentNavigation.render();
            } else {
                // If navigation.js isn't loaded yet, wait for it
                const checkNav = setInterval(() => {
                    if (window.AgentNavigation && window.AgentNavigation.render) {
                        window.AgentNavigation.render();
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
                
                // Clear localStorage/sessionStorage for legacy cleanup
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
            const displayText = userData ? `${userData.name || 'Agent User'} (${userData.role || 'Agent'})` : 'Loading...';
            this.updateUserDisplay(displayText);
            return userData;
        }
    };

    // Expose to global scope
    window.AgentHeader = AgentHeader;
    
    // Also expose logout function directly for onclick handlers
    window.logout = function() {
        AgentHeader.logout();
    };
})();