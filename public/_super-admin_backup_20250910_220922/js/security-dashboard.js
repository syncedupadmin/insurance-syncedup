class SuperAdminSecurityDashboard {
    constructor() {
        // Authentication handled by portal-guard via cookies
        // Authentication handled by portal-guard via cookies
        
        // Verify super admin access
        const role = this.normalizeRole(this.currentUser.role || '');
        if (!this.authToken || role !== 'super_admin') {
            this.redirectToLogin();
            return;
        }
        
        this.securityAlerts = [];
        this.activeSessions = [];
        this.threatLevel = 'MEDIUM';
        this.systemMetrics = {};
        
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
        await this.loadSecurityData();
        this.updateLastRefresh();
        this.startPeriodicUpdates();
    }

    setupEventListeners() {
        // Control buttons
        const refreshBtn = document.getElementById('refresh-security');
        const terminateAllBtn = document.getElementById('terminate-all-sessions');
        const exportBtn = document.getElementById('export-security');
        const threatLevelSelect = document.getElementById('set-threat-level');
        const viewAllAlertsBtn = document.getElementById('view-all-alerts');
        const refreshSessionsBtn = document.getElementById('refresh-sessions');

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshSecurityData());
        }

        if (terminateAllBtn) {
            terminateAllBtn.addEventListener('click', () => this.terminateAllSessions());
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportSecurityReport());
        }

        if (threatLevelSelect) {
            threatLevelSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.setThreatLevel(e.target.value);
                    e.target.value = ''; // Reset selection
                }
            });
        }

        if (viewAllAlertsBtn) {
            viewAllAlertsBtn.addEventListener('click', () => this.showAllAlerts());
        }

        if (refreshSessionsBtn) {
            refreshSessionsBtn.addEventListener('click', () => this.refreshActiveSessions());
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

    async loadSecurityData() {
        try {
            this.showLoading(true);
            
            // Try to load real data first, fall back to demo data
            await this.loadRealSecurityData();
            
        } catch (error) {
            console.error('Error loading security data:', error);
            this.showError('Failed to load live security data. Using demo data.');
            this.loadDemoSecurityData();
        } finally {
            this.showLoading(false);
        }
    }

    async loadRealSecurityData() {
        // This would connect to real security APIs in production
        const endpoints = [
            '/api/admin/security/alerts',
            '/api/admin/security/sessions',
            '/api/admin/security/metrics'
        ];

        // For now, simulate API calls and use demo data
        this.loadDemoSecurityData();
    }

    loadDemoSecurityData() {
        // Demo security alerts
        this.securityAlerts = [
            {
                id: 'alert-001',
                title: 'Multiple Failed Login Attempts',
                description: 'User attempted to login 5 times with incorrect credentials from IP 192.168.1.100',
                severity: 'HIGH',
                status: 'active',
                source: 'Authentication System',
                timestamp: new Date(Date.now() - 300000).toISOString() // 5 minutes ago
            },
            {
                id: 'alert-002',
                title: 'Suspicious File Upload Blocked',
                description: 'Executable file upload attempt blocked by security scanner',
                severity: 'CRITICAL',
                status: 'active',
                source: 'File Scanner',
                timestamp: new Date(Date.now() - 900000).toISOString() // 15 minutes ago
            },
            {
                id: 'alert-003',
                title: 'Unusual Access Pattern Detected',
                description: 'User accessing resources outside normal business hours from new location',
                severity: 'MEDIUM',
                status: 'resolved',
                source: 'Behavior Analysis',
                timestamp: new Date(Date.now() - 1800000).toISOString() // 30 minutes ago
            },
            {
                id: 'alert-004',
                title: 'Database Query Anomaly',
                description: 'Unusual database query patterns detected that may indicate SQL injection attempt',
                severity: 'HIGH',
                status: 'active',
                source: 'Database Monitor',
                timestamp: new Date(Date.now() - 600000).toISOString() // 10 minutes ago
            }
        ];

        // Demo active sessions
        this.activeSessions = [
            {
                id: 'session-001',
                userId: 'user-001',
                username: 'John Agent',
                email: 'john.agent@demo.com',
                role: 'agent',
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                location: 'New York, NY, US',
                device: 'Windows Desktop - Chrome',
                loginTime: new Date(Date.now() - 3600000).toISOString(),
                lastActivity: new Date(Date.now() - 300000).toISOString(),
                status: 'active'
            },
            {
                id: 'session-002',
                userId: 'user-002',
                username: 'Sarah Manager',
                email: 'sarah.manager@demo.com',
                role: 'manager',
                ipAddress: '192.168.1.200',
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                location: 'Los Angeles, CA, US',
                device: 'macOS Desktop - Safari',
                loginTime: new Date(Date.now() - 1800000).toISOString(),
                lastActivity: new Date(Date.now() - 600000).toISOString(),
                status: 'active'
            },
            {
                id: 'session-003',
                userId: 'user-003',
                username: 'Demo Admin',
                email: 'admin@demo.com',
                role: 'admin',
                ipAddress: '192.168.1.150',
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
                location: 'Chicago, IL, US',
                device: 'iPhone - Safari',
                loginTime: new Date(Date.now() - 7200000).toISOString(),
                lastActivity: new Date(Date.now() - 1200000).toISOString(),
                status: 'active'
            }
        ];

        // Demo system metrics
        this.systemMetrics = {
            threatLevel: this.threatLevel,
            failedLogins: Math.floor(Math.random() * 50) + 10,
            blockedIps: Math.floor(Math.random() * 20) + 5,
            cpuUsage: Math.floor(Math.random() * 30) + 40,
            memoryUsage: Math.floor(Math.random() * 40) + 30,
            diskUsage: Math.floor(Math.random() * 20) + 60,
            networkLoad: Math.floor(Math.random() * 100) + 50
        };

        this.renderSecurityOverview();
        this.renderSecurityAlerts();
        this.renderActiveSessions();
        this.updateSystemStatus();
    }

    renderSecurityOverview() {
        // Update threat level
        const threatCard = document.getElementById('threat-level-card');
        const threatBadge = document.getElementById('threat-badge');
        
        if (threatCard && threatBadge) {
            threatCard.className = `threat-level threat-${this.threatLevel.toLowerCase()}`;
            threatBadge.textContent = this.threatLevel;
        }

        // Update stats
        const activeAlerts = this.securityAlerts.filter(a => a.status === 'active').length;
        const stats = {
            'active-alerts': activeAlerts,
            'total-sessions': this.activeSessions.length,
            'failed-logins': this.systemMetrics.failedLogins || 0,
            'blocked-ips': this.systemMetrics.blockedIps || 0
        };

        Object.entries(stats).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value.toLocaleString();
            }
        });
    }

    renderSecurityAlerts() {
        const alertsList = document.getElementById('security-alerts-list');
        if (!alertsList) return;

        if (this.securityAlerts.length === 0) {
            alertsList.innerHTML = `
                <div class="no-data">
                    <i>🔒</i>
                    <p>No security alerts at this time</p>
                </div>
            `;
            return;
        }

        // Show only the most recent 5 alerts
        const recentAlerts = this.securityAlerts.slice(0, 5);
        
        const alertsHTML = recentAlerts.map(alert => `
            <div class="alert-item ${alert.severity.toLowerCase()}" data-alert-id="${alert.id}">
                <div class="alert-header">
                    <span class="alert-severity severity-${alert.severity.toLowerCase()}">
                        <i>${this.getSeverityIcon(alert.severity)}</i>
                        ${alert.severity}
                    </span>
                    <span class="alert-time" title="${new Date(alert.timestamp).toLocaleString()}">
                        ${this.formatRelativeTime(alert.timestamp)}
                    </span>
                </div>
                <div class="alert-content">
                    <h4>${alert.title}</h4>
                    <p>${alert.description}</p>
                    ${alert.source ? `<div class="alert-source">Source: ${alert.source}</div>` : ''}
                </div>
                <div class="alert-actions">
                    ${alert.status === 'active' ? `
                        <button class="btn btn-sm btn-success" onclick="superAdminSD.resolveAlert('${alert.id}')">
                            <i>✅</i> Resolve
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-primary" onclick="superAdminSD.viewAlertDetails('${alert.id}')">
                        <i>👁️</i> Details
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="superAdminSD.dismissAlert('${alert.id}')">
                        <i>✖️</i> Dismiss
                    </button>
                </div>
            </div>
        `).join('');

        alertsList.innerHTML = alertsHTML;
    }

    renderActiveSessions() {
        const sessionsList = document.getElementById('active-sessions-list');
        if (!sessionsList) return;

        if (this.activeSessions.length === 0) {
            sessionsList.innerHTML = `
                <div class="no-data">
                    <i>👥</i>
                    <p>No active sessions</p>
                </div>
            `;
            return;
        }

        const sessionsHTML = this.activeSessions.map(session => `
            <div class="alert-item" data-session-id="${session.id}">
                <div class="alert-header">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div class="user-avatar" style="width: 32px; height: 32px; font-size: 0.8rem;">
                            ${this.getInitials(session.username)}
                        </div>
                        <div>
                            <strong style="color: var(--text-primary);">${session.username}</strong>
                            <div style="color: var(--text-secondary); font-size: 0.85rem;">${session.role}</div>
                        </div>
                    </div>
                    <span class="system-status status-healthy">
                        <i>🟢</i> ${session.status}
                    </span>
                </div>
                <div class="alert-content">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
                        <div>
                            <div style="color: var(--text-secondary); font-size: 0.85rem;">
                                <i>🌍</i> Location: ${session.location}
                            </div>
                            <div style="color: var(--text-secondary); font-size: 0.85rem;">
                                <i>💻</i> Device: ${session.device}
                            </div>
                        </div>
                        <div>
                            <div style="color: var(--text-secondary); font-size: 0.85rem;">
                                <i>🔗</i> IP: ${session.ipAddress}
                            </div>
                            <div style="color: var(--text-secondary); font-size: 0.85rem;">
                                <i>⏰</i> Active: ${this.formatRelativeTime(session.loginTime)}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="alert-actions">
                    <button class="btn btn-sm btn-warning" onclick="superAdminSD.terminateSession('${session.id}')">
                        <i>⚠️</i> Terminate
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="superAdminSD.viewSessionDetails('${session.id}')">
                        <i>👁️</i> Details
                    </button>
                </div>
            </div>
        `).join('');

        sessionsList.innerHTML = sessionsHTML;
    }

    updateSystemStatus() {
        const statusElement = document.getElementById('system-status');
        if (!statusElement) return;

        const criticalAlerts = this.securityAlerts.filter(a => a.severity === 'CRITICAL' && a.status === 'active').length;
        const highAlerts = this.securityAlerts.filter(a => a.severity === 'HIGH' && a.status === 'active').length;

        let status = 'healthy';
        let statusText = 'System Healthy';
        let statusIcon = '🛡️';

        if (criticalAlerts > 0 || this.threatLevel === 'CRITICAL') {
            status = 'critical';
            statusText = 'Critical Security Issues';
            statusIcon = '🚨';
        } else if (highAlerts > 0 || this.threatLevel === 'HIGH') {
            status = 'warning';
            statusText = 'Security Warnings';
            statusIcon = '⚠️';
        }

        statusElement.className = `system-status status-${status}`;
        statusElement.innerHTML = `<i>${statusIcon}</i> ${statusText}`;
    }

    getSeverityIcon(severity) {
        const icons = {
            'CRITICAL': '🚨',
            'HIGH': '⚠️',
            'MEDIUM': '🔶',
            'LOW': 'ℹ️'
        };
        return icons[severity] || 'ℹ️';
    }

    getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }

    formatRelativeTime(timestamp) {
        const now = new Date();
        const date = new Date(timestamp);
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

    async refreshSecurityData() {
        await this.loadSecurityData();
        this.updateLastRefresh();
        this.showNotification('Security data refreshed successfully', 'success');
    }

    async refreshActiveSessions() {
        // In a real implementation, this would reload session data from the API
        this.renderActiveSessions();
        this.showNotification('Active sessions refreshed', 'success');
    }

    async setThreatLevel(level) {
        try {
            this.threatLevel = level;
            this.systemMetrics.threatLevel = level;
            this.renderSecurityOverview();
            this.updateSystemStatus();
            
            this.showNotification(`Threat level set to ${level}`, 'warning');
        } catch (error) {
            this.showNotification('Failed to update threat level', 'error');
        }
    }

    async terminateAllSessions() {
        if (!confirm('Are you sure you want to terminate ALL active sessions?\n\nThis will log out all users except yourself and cannot be undone.')) {
            return;
        }

        try {
            // In demo, clear all sessions except current user
            this.activeSessions = this.activeSessions.filter(s => s.email === this.currentUser.email);
            this.renderActiveSessions();
            this.renderSecurityOverview();
            
            this.showNotification('All user sessions terminated successfully', 'success');
        } catch (error) {
            this.showNotification('Failed to terminate sessions', 'error');
        }
    }

    async terminateSession(sessionId) {
        const session = this.activeSessions.find(s => s.id === sessionId);
        if (!session) return;

        if (!confirm(`Terminate session for ${session.username}?\n\nThis will immediately log out the user.`)) {
            return;
        }

        try {
            // Remove session from demo data
            this.activeSessions = this.activeSessions.filter(s => s.id !== sessionId);
            this.renderActiveSessions();
            this.renderSecurityOverview();
            
            this.showNotification(`Session terminated for ${session.username}`, 'success');
        } catch (error) {
            this.showNotification('Failed to terminate session', 'error');
        }
    }

    resolveAlert(alertId) {
        const alert = this.securityAlerts.find(a => a.id === alertId);
        if (!alert) return;

        alert.status = 'resolved';
        this.renderSecurityAlerts();
        this.renderSecurityOverview();
        this.updateSystemStatus();
        
        this.showNotification(`Alert "${alert.title}" resolved successfully`, 'success');
    }

    viewAlertDetails(alertId) {
        const alert = this.securityAlerts.find(a => a.id === alertId);
        if (!alert) return;

        alert(`Security Alert Details\n\nTitle: ${alert.title}\nSeverity: ${alert.severity}\nStatus: ${alert.status}\nSource: ${alert.source}\nTime: ${new Date(alert.timestamp).toLocaleString()}\n\nDescription:\n${alert.description}\n\nThis would open a detailed view modal in the full implementation.`);
    }

    viewSessionDetails(sessionId) {
        const session = this.activeSessions.find(s => s.id === sessionId);
        if (!session) return;

        alert(`Session Details\n\nUser: ${session.username} (${session.email})\nRole: ${session.role}\nLogin Time: ${new Date(session.loginTime).toLocaleString()}\nLast Activity: ${new Date(session.lastActivity).toLocaleString()}\nIP Address: ${session.ipAddress}\nLocation: ${session.location}\nDevice: ${session.device}\nUser Agent: ${session.userAgent}\n\nThis would open a detailed session analysis modal in the full implementation.`);
    }

    dismissAlert(alertId) {
        this.securityAlerts = this.securityAlerts.filter(a => a.id !== alertId);
        this.renderSecurityAlerts();
        this.renderSecurityOverview();
        this.updateSystemStatus();
        
        this.showNotification('Alert dismissed', 'success');
    }

    showAllAlerts() {
        alert(`All Security Alerts\n\nTotal Alerts: ${this.securityAlerts.length}\nActive: ${this.securityAlerts.filter(a => a.status === 'active').length}\nResolved: ${this.securityAlerts.filter(a => a.status === 'resolved').length}\n\nThis would open a comprehensive alerts management interface in the full implementation.`);
    }

    exportSecurityReport() {
        const report = {
            generatedAt: new Date().toISOString(),
            threatLevel: this.threatLevel,
            totalAlerts: this.securityAlerts.length,
            activeAlerts: this.securityAlerts.filter(a => a.status === 'active').length,
            activeSessions: this.activeSessions.length,
            systemMetrics: this.systemMetrics
        };

        this.showNotification('Security report generated successfully. In production, this would download a PDF report.', 'success');
        console.log('Security Report Data:', report);
    }

    startPeriodicUpdates() {
        // Update security data every 30 seconds
        this.updateInterval = setInterval(() => {
            // In production, this would fetch fresh data
            this.updateLastRefresh();
        }, 30000);
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
                background: ${type === 'success' ? 'rgba(16, 185, 129, 0.9)' : type === 'error' ? 'rgba(239, 68, 68, 0.9)' : type === 'warning' ? 'rgba(245, 158, 11, 0.9)' : 'rgba(59, 130, 246, 0.9)'};
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
}

// Initialize when DOM is loaded
let superAdminSD;
document.addEventListener('DOMContentLoaded', () => {
    superAdminSD = new SuperAdminSecurityDashboard();
});