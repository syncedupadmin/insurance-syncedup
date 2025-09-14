// License Dashboard Widget Component
// This component displays license expiration alerts and compliance status

class LicenseWidget {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.data = null;
        this.init();
    }

    async init() {
        if (!this.container) {
            console.warn('License widget container not found');
            return;
        }

        this.render();
        await this.loadData();
    }

    render() {
        this.container.innerHTML = `
            <div class="license-widget">
                <div class="widget-header">
                    <h3 class="widget-title">
                        <i data-lucide="shield-check"></i>
                        License Management
                    </h3>
                    <a href="/admin/licenses" class="widget-link">
                        View All
                        <i data-lucide="arrow-right"></i>
                    </a>
                </div>
                
                <div class="license-summary">
                    <div class="summary-stat">
                        <div class="stat-value" id="totalLicensesWidget">-</div>
                        <div class="stat-label">Total Licenses</div>
                    </div>
                    <div class="summary-stat">
                        <div class="stat-value" id="activeLicensesWidget">-</div>
                        <div class="stat-label">Active</div>
                    </div>
                    <div class="summary-stat expired">
                        <div class="stat-value" id="expiredLicensesWidget">-</div>
                        <div class="stat-label">Expired</div>
                    </div>
                    <div class="summary-stat expiring">
                        <div class="stat-value" id="expiringSoonWidget">-</div>
                        <div class="stat-label">Expiring Soon</div>
                    </div>
                </div>

                <div class="license-alerts" id="licenseAlerts">
                    <div class="loading-state">
                        <i data-lucide="loader"></i>
                        Loading license data...
                    </div>
                </div>

                <div class="expiring-licenses" id="expiringLicenses">
                    <!-- Expiring licenses will be populated here -->
                </div>
            </div>
        `;

        // Initialize icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    async loadData() {
        try {
            const response = await fetch('/api/admin/dashboard-licenses', {
                headers: {
                    // Use credentials: 'include' instead of Authorization header
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                this.data = result.data;
                this.updateWidget();
            } else {
                throw new Error('Failed to load license data');
            }
        } catch (error) {
            console.error('License widget error:', error);
            this.showError();
        }
    }

    updateWidget() {
        if (!this.data) return;

        // Update summary statistics
        this.updateElement('totalLicensesWidget', this.data.summary.total_licenses);
        this.updateElement('activeLicensesWidget', this.data.summary.active_licenses);
        this.updateElement('expiredLicensesWidget', this.data.summary.expired_licenses);
        this.updateElement('expiringSoonWidget', this.data.summary.expiring_soon);

        // Update alerts
        this.renderAlerts();
        
        // Update expiring licenses list
        this.renderExpiringLicenses();
    }

    renderAlerts() {
        const alertsContainer = document.getElementById('licenseAlerts');
        
        if (!this.data.license_alerts || this.data.license_alerts.length === 0) {
            alertsContainer.innerHTML = `
                <div class="no-alerts">
                    <i data-lucide="check-circle"></i>
                    <span>No license alerts</span>
                </div>
            `;
        } else {
            alertsContainer.innerHTML = this.data.license_alerts.map(alert => `
                <div class="license-alert ${alert.severity}">
                    <div class="alert-icon">
                        ${this.getAlertIcon(alert.type)}
                    </div>
                    <div class="alert-content">
                        <div class="alert-title">${alert.title}</div>
                        <div class="alert-description">${alert.description}</div>
                    </div>
                    <div class="alert-action">
                        <a href="${alert.action_url}" class="alert-link">
                            <i data-lucide="arrow-right"></i>
                        </a>
                    </div>
                </div>
            `).join('');
        }

        // Initialize icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    renderExpiringLicenses() {
        const expiringContainer = document.getElementById('expiringLicenses');
        
        if (!this.data.expiring_licenses || this.data.expiring_licenses.length === 0) {
            expiringContainer.innerHTML = '';
            return;
        }

        expiringContainer.innerHTML = `
            <div class="expiring-section">
                <h4 class="section-title">Licenses Expiring Soon</h4>
                <div class="expiring-list">
                    ${this.data.expiring_licenses.slice(0, 3).map(license => `
                        <div class="expiring-item">
                            <div class="license-info">
                                <div class="agent-name">${license.agent_name || 'Unknown Agent'}</div>
                                <div class="license-details">
                                    ${license.license_number} • ${license.state}
                                </div>
                            </div>
                            <div class="expiration-info">
                                <div class="days-remaining ${this.getExpirationClass(license.days_until_expiry)}">
                                    ${this.formatExpirationDays(license.days_until_expiry)}
                                </div>
                                <div class="expiration-date">
                                    ${this.formatDate(license.expiration_date)}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                ${this.data.expiring_licenses.length > 3 ? `
                    <div class="view-more">
                        <a href="/admin/licenses?action=expiring">
                            View all ${this.data.expiring_licenses.length} expiring licenses
                        </a>
                    </div>
                ` : ''}
            </div>
        `;
    }

    showError() {
        const alertsContainer = document.getElementById('licenseAlerts');
        alertsContainer.innerHTML = `
            <div class="error-state">
                <i data-lucide="alert-triangle"></i>
                <span>Failed to load license data</span>
            </div>
        `;

        // Initialize icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    updateElement(id, value, fallback = '0') {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value || fallback;
        }
    }

    getAlertIcon(type) {
        const icons = {
            expired: '<i data-lucide="alert-circle"></i>',
            expiring: '<i data-lucide="clock"></i>',
            compliance: '<i data-lucide="shield-alert"></i>'
        };
        return icons[type] || '<i data-lucide="info"></i>';
    }

    getExpirationClass(days) {
        if (days < 0) return 'expired';
        if (days <= 30) return 'expiring-soon';
        if (days <= 60) return 'renewal-needed';
        return 'valid';
    }

    formatExpirationDays(days) {
        if (days < 0) return `${Math.abs(days)}d ago`;
        if (days === 0) return 'Today';
        if (days === 1) return 'Tomorrow';
        return `${days}d`;
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    async refresh() {
        await this.loadData();
    }
}

// CSS styles for the license widget
const licenseWidgetStyles = `
    <style>
        .license-widget {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 16px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
        }

        .widget-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }

        .widget-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--text-primary);
            margin: 0;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .widget-link {
            color: var(--primary);
            text-decoration: none;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 0.25rem;
            transition: all 0.3s ease;
        }

        .widget-link:hover {
            color: var(--primary-light);
        }

        .license-summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 1rem;
            margin-bottom: 1.5rem;
        }

        .summary-stat {
            text-align: center;
            padding: 1rem;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .summary-stat.expired {
            border-color: rgba(239, 68, 68, 0.3);
            background: rgba(239, 68, 68, 0.1);
        }

        .summary-stat.expiring {
            border-color: rgba(245, 158, 11, 0.3);
            background: rgba(245, 158, 11, 0.1);
        }

        .stat-value {
            font-size: 2rem;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 0.25rem;
        }

        .stat-label {
            font-size: 0.75rem;
            color: var(--text-secondary);
            font-weight: 500;
        }

        .license-alerts {
            margin-bottom: 1.5rem;
        }

        .license-alert {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            margin-bottom: 0.5rem;
            border-left: 4px solid;
        }

        .license-alert.high {
            border-left-color: #ef4444;
            background: rgba(239, 68, 68, 0.1);
        }

        .license-alert.medium {
            border-left-color: #f59e0b;
            background: rgba(245, 158, 11, 0.1);
        }

        .license-alert.low {
            border-left-color: #3b82f6;
            background: rgba(59, 130, 246, 0.1);
        }

        .alert-icon {
            color: var(--text-secondary);
        }

        .alert-content {
            flex: 1;
        }

        .alert-title {
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 0.25rem;
        }

        .alert-description {
            font-size: 0.875rem;
            color: var(--text-secondary);
        }

        .alert-action {
            color: var(--primary);
        }

        .alert-link {
            color: inherit;
            text-decoration: none;
        }

        .no-alerts, .error-state, .loading-state {
            text-align: center;
            padding: 1.5rem;
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
        }

        .expiring-section {
            margin-top: 1rem;
        }

        .section-title {
            font-size: 1rem;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 1rem;
        }

        .expiring-list {
            space-y: 0.5rem;
        }

        .expiring-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 6px;
            margin-bottom: 0.5rem;
        }

        .license-info {
            flex: 1;
        }

        .agent-name {
            font-weight: 500;
            color: var(--text-primary);
        }

        .license-details {
            font-size: 0.75rem;
            color: var(--text-secondary);
        }

        .expiration-info {
            text-align: right;
        }

        .days-remaining {
            font-weight: 600;
            font-size: 0.875rem;
        }

        .days-remaining.expired {
            color: #ef4444;
        }

        .days-remaining.expiring-soon {
            color: #f59e0b;
        }

        .days-remaining.renewal-needed {
            color: #f97316;
        }

        .days-remaining.valid {
            color: #10b981;
        }

        .expiration-date {
            font-size: 0.75rem;
            color: var(--text-secondary);
        }

        .view-more {
            text-align: center;
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .view-more a {
            color: var(--primary);
            text-decoration: none;
            font-weight: 500;
        }

        .view-more a:hover {
            color: var(--primary-light);
        }

        @media (max-width: 768px) {
            .license-summary {
                grid-template-columns: repeat(2, 1fr);
            }

            .expiring-item {
                flex-direction: column;
                align-items: flex-start;
                gap: 0.5rem;
            }

            .expiration-info {
                text-align: left;
                width: 100%;
            }
        }
    </style>
`;

// Inject CSS styles
if (!document.querySelector('#license-widget-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'license-widget-styles';
    styleElement.innerHTML = licenseWidgetStyles;
    document.head.appendChild(styleElement);
}

// Export for use in admin dashboard
window.LicenseWidget = LicenseWidget;