class SecurityDashboard {
    constructor() {
        this.authToken = localStorage.getItem('authToken');
        this.userId = localStorage.getItem('userId');
        this.userRole = localStorage.getItem('userRole');
        
        // WebSocket connection for real-time updates
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        // Security data
        this.securityAlerts = [];
        this.activeSessions = [];
        this.threatLevel = 'LOW';
        this.systemMetrics = {};
        
        // Initialize dashboard
        this.init();
    }

    async init() {
        if (!this.validateAuth()) {
            return;
        }
        
        this.setupEventListeners();
        await this.loadSecurityData();
        this.initializeWebSocket();
        this.startPeriodicUpdates();
        this.updateLastRefresh();
    }

    validateAuth() {
        if (!this.authToken || this.userRole !== 'super-admin') {
            this.showError('Unauthorized access. Super admin privileges required.');
            setTimeout(() => {
                window.location.href = '/admin/login.html';
            }, 2000);
            return false;
        }
        return true;
    }

    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refresh-security');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshSecurityData());
        }

        // Auto-refresh toggle
        const autoRefreshToggle = document.getElementById('auto-refresh-toggle');
        if (autoRefreshToggle) {
            autoRefreshToggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.startPeriodicUpdates();
                } else {
                    this.stopPeriodicUpdates();
                }
            });
        }

        // Filter controls
        const filterSelects = document.querySelectorAll('.filter-select');
        filterSelects.forEach(select => {
            select.addEventListener('change', () => this.filterSecurityAlerts());
        });

        // Search functionality
        const searchInput = document.getElementById('alert-search');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(() => this.searchAlerts(), 300));
        }

        // Export functionality
        const exportBtn = document.getElementById('export-security');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportSecurityReport());
        }

        // Session management
        const terminateAllBtn = document.getElementById('terminate-all-sessions');
        if (terminateAllBtn) {
            terminateAllBtn.addEventListener('click', () => this.terminateAllSessions());
        }

        // Threat level actions
        const threatLevelSelect = document.getElementById('set-threat-level');
        if (threatLevelSelect) {
            threatLevelSelect.addEventListener('change', (e) => {
                this.setThreatLevel(e.target.value);
            });
        }

        // Security settings
        const securityToggles = document.querySelectorAll('.security-toggle');
        securityToggles.forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                this.updateSecuritySetting(e.target.dataset.setting, e.target.checked);
            });
        });
    }

    async loadSecurityData() {
        try {
            const loadingOverlay = document.querySelector('.loading-overlay');
            if (loadingOverlay) loadingOverlay.style.display = 'flex';

            // Load multiple endpoints in parallel
            const [alertsResponse, sessionsResponse, metricsResponse] = await Promise.all([
                this.fetchWithAuth('/api/admin/security/alerts'),
                this.fetchWithAuth('/api/admin/security/sessions'),
                this.fetchWithAuth('/api/admin/security/metrics')
            ]);

            this.securityAlerts = alertsResponse.alerts || [];
            this.activeSessions = sessionsResponse.sessions || [];
            this.systemMetrics = metricsResponse.metrics || {};
            this.threatLevel = metricsResponse.threatLevel || 'LOW';

            this.renderSecurityOverview();
            this.renderSecurityAlerts();
            this.renderActiveSessions();
            this.renderSystemMetrics();

        } catch (error) {
            console.error('Error loading security data:', error);
            this.showError('Failed to load security data');
        } finally {
            const loadingOverlay = document.querySelector('.loading-overlay');
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        }
    }

    renderSecurityOverview() {
        // Update threat level indicator
        const threatIndicator = document.querySelector('.threat-level');
        const threatBadge = document.querySelector('.threat-badge');
        if (threatIndicator && threatBadge) {
            threatIndicator.className = `threat-level threat-${this.threatLevel.toLowerCase()}`;
            threatBadge.textContent = this.threatLevel;
        }

        // Update overview stats
        const stats = {
            'active-alerts': this.securityAlerts.filter(a => a.status === 'active').length,
            'total-sessions': this.activeSessions.length,
            'failed-logins': this.systemMetrics.failedLogins || 0,
            'blocked-ips': this.systemMetrics.blockedIps || 0
        };

        Object.entries(stats).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value.toLocaleString();
        });

        // Update system status
        this.updateSystemStatus();
    }

    renderSecurityAlerts() {
        const alertsContainer = document.getElementById('security-alerts-list');
        if (!alertsContainer) return;

        if (this.securityAlerts.length === 0) {
            alertsContainer.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-shield-alt"></i>
                    <p>No security alerts at this time</p>
                </div>
            `;
            return;
        }

        const alertsHTML = this.securityAlerts.map(alert => `
            <div class="alert-item ${alert.severity.toLowerCase()}" data-alert-id="${alert.id}">
                <div class="alert-header">
                    <span class="alert-severity severity-${alert.severity.toLowerCase()}">
                        <i class="fas ${this.getSeverityIcon(alert.severity)}"></i>
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
                        <button class="btn btn-sm btn-success" onclick="securityDashboard.resolveAlert('${alert.id}')">
                            <i class="fas fa-check"></i> Resolve
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-info" onclick="securityDashboard.viewAlertDetails('${alert.id}')">
                        <i class="fas fa-eye"></i> Details
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="securityDashboard.dismissAlert('${alert.id}')">
                        <i class="fas fa-times"></i> Dismiss
                    </button>
                </div>
            </div>
        `).join('');

        alertsContainer.innerHTML = alertsHTML;
    }

    renderActiveSessions() {
        const sessionsContainer = document.getElementById('active-sessions-list');
        if (!sessionsContainer) return;

        if (this.activeSessions.length === 0) {
            sessionsContainer.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-users"></i>
                    <p>No active sessions</p>
                </div>
            `;
            return;
        }

        const sessionsHTML = this.activeSessions.map(session => `
            <div class="session-item" data-session-id="${session.id}">
                <div class="session-user">
                    <img src="${session.avatar || '/assets/default-avatar.png'}" alt="Avatar" class="session-avatar">
                    <div class="session-info">
                        <strong>${session.username}</strong>
                        <span class="session-role">${session.role}</span>
                    </div>
                </div>
                <div class="session-details">
                    <div class="session-meta">
                        <i class="fas fa-clock"></i> ${this.formatRelativeTime(session.loginTime)}
                    </div>
                    <div class="session-meta">
                        <i class="fas fa-map-marker-alt"></i> ${session.location || 'Unknown'}
                    </div>
                    <div class="session-meta">
                        <i class="fas fa-desktop"></i> ${session.device || 'Unknown Device'}
                    </div>
                    <div class="session-meta">
                        <i class="fas fa-globe"></i> ${session.ipAddress}
                    </div>
                </div>
                <div class="session-actions">
                    <span class="session-status ${session.status}">
                        <i class="fas fa-circle"></i> ${session.status}
                    </span>
                    <button class="btn btn-sm btn-warning" onclick="securityDashboard.terminateSession('${session.id}')">
                        <i class="fas fa-sign-out-alt"></i> Terminate
                    </button>
                </div>
            </div>
        `).join('');

        sessionsContainer.innerHTML = sessionsHTML;
    }

    renderSystemMetrics() {
        // Update activity chart if chart library is available
        if (typeof Chart !== 'undefined') {
            this.updateActivityChart();
        }

        // Update security metrics
        const metrics = [
            { id: 'cpu-usage', value: this.systemMetrics.cpuUsage || 0, suffix: '%' },
            { id: 'memory-usage', value: this.systemMetrics.memoryUsage || 0, suffix: '%' },
            { id: 'disk-usage', value: this.systemMetrics.diskUsage || 0, suffix: '%' },
            { id: 'network-load', value: this.systemMetrics.networkLoad || 0, suffix: 'Mbps' }
        ];

        metrics.forEach(metric => {
            const element = document.getElementById(metric.id);
            const progressBar = document.querySelector(`[data-metric="${metric.id}"] .progress-fill`);
            
            if (element) element.textContent = `${metric.value}${metric.suffix}`;
            if (progressBar) {
                progressBar.style.width = `${metric.value}%`;
                progressBar.className = `progress-fill ${this.getMetricClass(metric.value)}`;
            }
        });
    }

    initializeWebSocket() {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}/ws/security`;

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('Security WebSocket connected');
                this.reconnectAttempts = 0;
                
                // Send authentication
                this.ws.send(JSON.stringify({
                    type: 'auth',
                    token: this.authToken
                }));
            };

            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            };

            this.ws.onclose = () => {
                console.log('Security WebSocket disconnected');
                this.handleWebSocketReconnect();
            };

            this.ws.onerror = (error) => {
                console.error('Security WebSocket error:', error);
            };

        } catch (error) {
            console.error('Failed to initialize WebSocket:', error);
        }
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'security_alert':
                this.addSecurityAlert(data.alert);
                break;
            case 'session_update':
                this.updateSessionList();
                break;
            case 'system_metrics':
                this.systemMetrics = data.metrics;
                this.renderSystemMetrics();
                break;
            case 'threat_level_change':
                this.threatLevel = data.threatLevel;
                this.renderSecurityOverview();
                break;
        }
    }

    addSecurityAlert(alert) {
        this.securityAlerts.unshift(alert);
        this.renderSecurityAlerts();
        this.renderSecurityOverview();
        this.showNotification(`New ${alert.severity} security alert: ${alert.title}`, 'warning');
    }

    async resolveAlert(alertId) {
        try {
            await this.fetchWithAuth(`/api/admin/security/alerts/${alertId}/resolve`, {
                method: 'POST'
            });

            const alertIndex = this.securityAlerts.findIndex(a => a.id === alertId);
            if (alertIndex !== -1) {
                this.securityAlerts[alertIndex].status = 'resolved';
                this.renderSecurityAlerts();
                this.renderSecurityOverview();
            }

            this.showNotification('Alert resolved successfully', 'success');

        } catch (error) {
            console.error('Error resolving alert:', error);
            this.showError('Failed to resolve alert');
        }
    }

    async terminateSession(sessionId) {
        if (!confirm('Are you sure you want to terminate this session?')) return;

        try {
            await this.fetchWithAuth(`/api/admin/security/sessions/${sessionId}/terminate`, {
                method: 'POST'
            });

            this.activeSessions = this.activeSessions.filter(s => s.id !== sessionId);
            this.renderActiveSessions();
            this.renderSecurityOverview();

            this.showNotification('Session terminated successfully', 'success');

        } catch (error) {
            console.error('Error terminating session:', error);
            this.showError('Failed to terminate session');
        }
    }

    async terminateAllSessions() {
        if (!confirm('Are you sure you want to terminate ALL active sessions? This will log out all users except yourself.')) return;

        try {
            await this.fetchWithAuth('/api/admin/security/sessions/terminate-all', {
                method: 'POST'
            });

            await this.updateSessionList();
            this.showNotification('All sessions terminated successfully', 'success');

        } catch (error) {
            console.error('Error terminating all sessions:', error);
            this.showError('Failed to terminate sessions');
        }
    }

    async setThreatLevel(level) {
        try {
            await this.fetchWithAuth('/api/admin/security/threat-level', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ threatLevel: level })
            });

            this.threatLevel = level;
            this.renderSecurityOverview();
            this.showNotification(`Threat level set to ${level}`, 'info');

        } catch (error) {
            console.error('Error setting threat level:', error);
            this.showError('Failed to update threat level');
        }
    }

    async updateSecuritySetting(setting, enabled) {
        try {
            await this.fetchWithAuth('/api/admin/security/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [setting]: enabled })
            });

            this.showNotification(`Security setting updated: ${setting}`, 'success');

        } catch (error) {
            console.error('Error updating security setting:', error);
            this.showError('Failed to update security setting');
        }
    }

    async exportSecurityReport() {
        try {
            const response = await this.fetchWithAuth('/api/admin/security/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startDate: document.getElementById('export-start-date')?.value,
                    endDate: document.getElementById('export-end-date')?.value,
                    includeAlerts: true,
                    includeSessions: true,
                    includeMetrics: true
                })
            });

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `security-report-${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            this.showNotification('Security report exported successfully', 'success');

        } catch (error) {
            console.error('Error exporting security report:', error);
            this.showError('Failed to export security report');
        }
    }

    startPeriodicUpdates() {
        if (this.updateInterval) clearInterval(this.updateInterval);
        
        this.updateInterval = setInterval(() => {
            this.refreshSecurityData();
        }, 30000); // Update every 30 seconds
    }

    stopPeriodicUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    async refreshSecurityData() {
        await this.loadSecurityData();
        this.updateLastRefresh();
    }

    updateLastRefresh() {
        const lastRefreshElement = document.getElementById('last-refresh');
        if (lastRefreshElement) {
            lastRefreshElement.textContent = new Date().toLocaleTimeString();
        }
    }

    // Utility methods
    async fetchWithAuth(url, options = {}) {
        const headers = {
            'Authorization': `Bearer ${this.authToken}`,
            ...options.headers
        };

        const response = await fetch(url, { ...options, headers });

        if (response.status === 401) {
            localStorage.removeItem('authToken');
            window.location.href = '/admin/login.html';
            throw new Error('Authentication failed');
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    getSeverityIcon(severity) {
        const icons = {
            'CRITICAL': 'fa-exclamation-triangle',
            'HIGH': 'fa-exclamation-circle',
            'MEDIUM': 'fa-exclamation',
            'LOW': 'fa-info-circle'
        };
        return icons[severity] || 'fa-info-circle';
    }

    getMetricClass(value) {
        if (value >= 90) return 'critical';
        if (value >= 75) return 'high';
        if (value >= 50) return 'medium';
        return 'low';
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

    updateSystemStatus() {
        const statusElement = document.querySelector('.system-status');
        if (!statusElement) return;

        const cpuUsage = this.systemMetrics.cpuUsage || 0;
        const memoryUsage = this.systemMetrics.memoryUsage || 0;
        const criticalAlerts = this.securityAlerts.filter(a => a.severity === 'CRITICAL' && a.status === 'active').length;

        let status = 'healthy';
        let statusText = 'System Healthy';
        let statusIcon = 'fa-check-circle';

        if (criticalAlerts > 0 || cpuUsage > 90 || memoryUsage > 90) {
            status = 'critical';
            statusText = 'Critical Issues';
            statusIcon = 'fa-exclamation-triangle';
        } else if (cpuUsage > 75 || memoryUsage > 75) {
            status = 'warning';
            statusText = 'Performance Warning';
            statusIcon = 'fa-exclamation-circle';
        }

        statusElement.className = `system-status status-${status}`;
        statusElement.innerHTML = `<i class="fas ${statusIcon}"></i> ${statusText}`;
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check' : type === 'error' ? 'fa-times' : 'fa-info'}"></i>
            ${message}
            <button class="notification-close">&times;</button>
        `;

        // Add to page
        const container = document.querySelector('.notifications-container') || document.body;
        container.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);

        // Close button handler
        notification.querySelector('.notification-close').onclick = () => {
            notification.remove();
        };
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    handleWebSocketReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
                console.log(`Attempting to reconnect WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                this.initializeWebSocket();
            }, 1000 * this.reconnectAttempts);
        }
    }
}

// Utility function for debouncing
function debounce(func, wait) {
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

// Initialize when DOM is loaded
let securityDashboard;
document.addEventListener('DOMContentLoaded', () => {
    securityDashboard = new SecurityDashboard();
});