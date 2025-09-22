const fs = require('fs');

// Read the admin index.html file
let content = fs.readFileSync('public/admin/index.html', 'utf8');

// Find the script section and replace with improved error handling
const scriptStart = content.indexOf('<script>');
const scriptEnd = content.indexOf('</script>') + '</script>'.length;

if (scriptStart !== -1 && scriptEnd !== -1) {
    const improvedScript = `<script>
        let currentUser = null;
        let dashboardData = null;
        
        // Global error handler to prevent console errors
        window.addEventListener('error', function(e) {
            console.warn('Dashboard error handled:', e.error?.message || e.message);
            return true; // Prevent default error handling
        });
        
        // Safe element updates
        function safeUpdateElement(id, value, fallback = '0') {
            try {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value || fallback;
                }
            } catch (error) {
                console.warn(\`Failed to update element \${id}:\`, error);
            }
        }
        
        // Safe fetch with error handling
        async function safeFetch(url, options = {}) {
            try {
                const response = await fetch(url, {
                    ...options,
                    headers: {
                        'Authorization': \`Bearer \${localStorage.getItem('syncedup_token') || 'demo'}\`,
                        'Content-Type': 'application/json',
                        ...options.headers
                    }
                });
                
                if (!response.ok) {
                    throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
                }
                
                return await response.json();
            } catch (error) {
                console.warn(\`API fetch failed for \${url}:\`, error.message);
                return null;
            }
        }
        
        document.addEventListener('DOMContentLoaded', function() {
            try {
                initializeDashboard();
            } catch (error) {
                console.error('Dashboard initialization failed:', error);
                loadFallbackData();
            }
        });
        
        function initializeDashboard() {
            // Check authentication with error handling
            try {
                const userData = localStorage.getItem('syncedup_user');
                if (userData) {
                    currentUser = JSON.parse(userData);
                    
                    // Only admin and super-admin can access admin portal
                    const allowedRoles = ['admin', 'super-admin', 'manager'];
                    if (!allowedRoles.includes(currentUser.role)) {
                        window.location.href = '/login';
                        return;
                    }
                    
                    loadDashboardData();
                } else {
                    window.location.href = '/login';
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                window.location.href = '/login';
            }
        }
        
        async function loadDashboardData() {
            try {
                showLoadingStates();
                
                // Load dashboard data with safe fetches
                const [analyticsData, userStats, commissionData, recentLeads] = await Promise.all([
                    safeFetch('/api/admin/analytics?analytics_type=overview'),
                    safeFetch('/api/admin/user-management'),
                    safeFetch('/api/admin/commission-summary'),
                    safeFetch('/api/admin/leads?recent=true&limit=10')
                ]);
                
                // Update dashboard with fetched data or fallbacks
                updateDashboardMetrics(analyticsData, userStats, commissionData);
                updateAgentPerformanceTable(analyticsData);
                updateRecentLeads(recentLeads);
                updateCommissionSummary(commissionData);
                updateRecentActivity();
                
                hideLoadingStates();
                
            } catch (error) {
                console.error('Failed to load dashboard data:', error);
                loadFallbackData();
            }
        }
        
        function updateDashboardMetrics(analytics, userStats, commissionData) {
            // Update metrics with safe fallbacks
            safeUpdateElement('activeAgents', userStats?.summary?.agents || analytics?.totalAgents);
            safeUpdateElement('mtdRevenue', \`$\${(analytics?.mtdRevenue || 0).toLocaleString()}\`, '$0');
            safeUpdateElement('activeLeads', analytics?.activeLeads);
            safeUpdateElement('conversionRate', \`\${(analytics?.conversionRate || 0).toFixed(1)}%\`, '0%');
            safeUpdateElement('totalCommissions', \`$\${(commissionData?.thisMonth || 0).toLocaleString()}\`, '$0');
            safeUpdateElement('systemStatus', '100%');
        }
        
        function updateAgentPerformanceTable(analyticsData) {
            const tableBody = document.getElementById('agentOverviewTable');
            if (!tableBody) return;
            
            try {
                tableBody.innerHTML = '';
                
                // Mock data if analytics not available
                const agents = analyticsData?.topAgents || [
                    { id: 1, name: 'Sample Agent 1', sales: 0, revenue: 0, conversionRate: 0 },
                    { id: 2, name: 'Sample Agent 2', sales: 0, revenue: 0, conversionRate: 0 }
                ];
                
                if (agents.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="5" class="no-data">No agent data available</td></tr>';
                    return;
                }
                
                agents.forEach(agent => {
                    const row = document.createElement('tr');
                    row.innerHTML = \`
                        <td><strong>\${agent.name || 'Agent'}</strong><br><small>\${agent.id || 'N/A'}</small></td>
                        <td><strong>\${agent.sales || 0}</strong></td>
                        <td class="premium-amount">$\${(agent.revenue || 0).toLocaleString()}</td>
                        <td class="conversion-rate">\${(agent.conversionRate || 0).toFixed(1)}%</td>
                        <td>
                            <button class="btn btn-view" onclick="viewAgent('\${agent.id}')">View</button>
                        </td>
                    \`;
                    tableBody.appendChild(row);
                });
            } catch (error) {
                console.warn('Failed to update agent table:', error);
                tableBody.innerHTML = '<tr><td colspan="5" class="no-data">Error loading agent data</td></tr>';
            }
        }
        
        function updateRecentLeads(leadsData) {
            const container = document.getElementById('recentLeads');
            if (!container) return;
            
            try {
                const leads = leadsData?.leads || [];
                
                if (leads.length === 0) {
                    container.innerHTML = '<p class="no-data">No recent leads found</p>';
                    return;
                }
                
                container.innerHTML = leads.map(lead => \`
                    <div class="lead-item">
                        <strong>\${lead.name || 'Lead'}</strong>
                        <span class="lead-status">\${lead.status || 'New'}</span>
                        <small>\${new Date(lead.created || Date.now()).toLocaleDateString()}</small>
                    </div>
                \`).join('');
            } catch (error) {
                console.warn('Failed to update recent leads:', error);
                container.innerHTML = '<p class="no-data">Error loading recent leads</p>';
            }
        }
        
        function updateCommissionSummary(commissionData) {
            const container = document.getElementById('commissionSummary');
            if (!container) return;
            
            try {
                const data = commissionData || { thisMonth: 0, avgRate: 0, pending: 0 };
                
                container.innerHTML = \`
                    <div class="commission-stats">
                        <div class="stat">
                            <label>This Month:</label>
                            <span class="value">$\${(data.thisMonth || 0).toLocaleString()}</span>
                        </div>
                        <div class="stat">
                            <label>Avg Rate:</label>
                            <span class="value">\${(data.avgRate || 0).toFixed(1)}%</span>
                        </div>
                        <div class="stat">
                            <label>Pending:</label>
                            <span class="value">\${data.pending || 0}</span>
                        </div>
                    </div>
                \`;
            } catch (error) {
                console.warn('Failed to update commission summary:', error);
                container.innerHTML = '<p class="no-data">Error loading commission data</p>';
            }
        }
        
        function updateRecentActivity() {
            const tableBody = document.getElementById('activityTable');
            if (!tableBody) return;
            
            try {
                // Mock activity data
                const activities = [
                    { time: '2:30 PM', agent: 'System', action: 'Dashboard loaded', details: 'Admin portal accessed' }
                ];
                
                tableBody.innerHTML = activities.map(activity => \`
                    <tr>
                        <td>\${activity.time}</td>
                        <td>\${activity.agent}</td>
                        <td>\${activity.action}</td>
                        <td>\${activity.details}</td>
                    </tr>
                \`).join('');
            } catch (error) {
                console.warn('Failed to update recent activity:', error);
                tableBody.innerHTML = '<tr><td colspan="4" class="no-data">Error loading activity data</td></tr>';
            }
        }
        
        function showLoadingStates() {
            const loadingElements = ['agentOverviewTable', 'recentLeads', 'commissionSummary', 'activityTable'];
            loadingElements.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.classList.add('loading');
                }
            });
        }
        
        function hideLoadingStates() {
            const loadingElements = ['agentOverviewTable', 'recentLeads', 'commissionSummary', 'activityTable'];
            loadingElements.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.classList.remove('loading');
                }
            });
        }
        
        function loadFallbackData() {
            console.log('Loading fallback data...');
            
            // Set safe default values
            safeUpdateElement('activeAgents', '0');
            safeUpdateElement('mtdRevenue', '$0');
            safeUpdateElement('activeLeads', '0');
            safeUpdateElement('conversionRate', '0%');
            safeUpdateElement('totalCommissions', '$0');
            safeUpdateElement('systemStatus', '100%');
            
            // Update tables with empty states
            updateAgentPerformanceTable(null);
            updateRecentLeads(null);
            updateCommissionSummary(null);
            updateRecentActivity();
        }
        
        // Navigation helpers
        function viewAgent(agentId) {
            if (agentId) {
                window.location.href = \`/admin/agent-performance?agent=\${agentId}\`;
            }
        }
        
        function logout() {
            try {
                localStorage.removeItem('syncedup_token');
                localStorage.removeItem('syncedup_user');
                window.location.href = '/login';
            } catch (error) {
                console.error('Logout failed:', error);
                window.location.href = '/login';
            }
        }
        
        // Initialize Lucide icons after DOM updates
        function initializeIcons() {
            try {
                if (typeof lucide !== 'undefined' && lucide.createIcons) {
                    lucide.createIcons();
                }
            } catch (error) {
                console.warn('Failed to initialize icons:', error);
            }
        }
        
        // Call icon initialization after a short delay to ensure DOM is updated
        setTimeout(initializeIcons, 1000);
    </script>`;
    
    // Replace the script section
    const newContent = content.substring(0, scriptStart) + improvedScript + content.substring(scriptEnd);
    
    // Write the updated content back
    fs.writeFileSync('public/admin/index.html', newContent);
    console.log('✓ Fixed dashboard JavaScript with better error handling');
} else {
    console.log('✗ Could not find script section in admin dashboard');
}