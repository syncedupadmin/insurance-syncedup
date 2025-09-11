// Metrics Module - Handles dashboard metrics and statistics
import { formatCurrency } from './utils.js';

export async function loadMetrics() {
    try {
        const response = await fetch('/api/super-admin/system-stats', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const stats = await response.json();
            updateMetricsDisplay(stats);
        } else {
            throw new Error('Failed to load metrics');
        }
    } catch (error) {
        console.error('Error loading metrics:', error);
        showMetricsError();
    }
}

function updateMetricsDisplay(stats) {
    // Update total revenue
    const revenueElement = document.getElementById('total-revenue');
    if (revenueElement) {
        revenueElement.textContent = formatCurrency(stats.totalRevenue || 0);
    }
    
    // Update revenue growth
    const growthElement = document.getElementById('revenue-growth');
    if (growthElement) {
        const growth = stats.revenueGrowth || 0;
        growthElement.textContent = `${growth > 0 ? '+' : ''}${growth.toFixed(1)}% from last month`;
        growthElement.className = growth >= 0 ? 'metric-change positive' : 'metric-change negative';
    }
    
    // Update active agencies
    const agenciesElement = document.getElementById('active-agencies');
    if (agenciesElement) {
        agenciesElement.textContent = stats.activeAgencies || '0';
    }
    
    // Update new agencies
    const newAgenciesElement = document.getElementById('new-agencies');
    if (newAgenciesElement) {
        newAgenciesElement.textContent = `+${stats.newAgencies || 0} this month`;
    }
    
    // Update total users
    const usersElement = document.getElementById('total-users');
    if (usersElement) {
        usersElement.textContent = stats.totalUsers || '0';
    }
    
    // Update active user percentage
    const activePercentElement = document.getElementById('active-percent');
    if (activePercentElement) {
        activePercentElement.textContent = `${stats.activeUserPercent || 0}% active today`;
    }
}

function showMetricsError() {
    const metricsElements = [
        'total-revenue',
        'active-agencies',
        'total-users'
    ];
    
    metricsElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = 'Error';
            element.style.color = 'var(--danger)';
        }
    });
}

export async function loadRecentActivity() {
    try {
        const response = await fetch('/api/super-admin/recent-activity', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const activities = await response.json();
            displayRecentActivity(activities);
        }
    } catch (error) {
        console.error('Error loading recent activity:', error);
    }
}

function displayRecentActivity(activities) {
    const container = document.getElementById('recent-activity');
    if (!container) return;
    
    if (!activities || activities.length === 0) {
        container.innerHTML = '<div class="activity-item">No recent activity</div>';
        return;
    }
    
    container.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <span class="activity-time">${formatTime(activity.timestamp)}</span>
            <span class="activity-text">${activity.description}</span>
        </div>
    `).join('');
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
}

// Auto-refresh metrics every minute
export function startMetricsRefresh() {
    loadMetrics();
    loadRecentActivity();
    
    setInterval(() => {
        loadMetrics();
        loadRecentActivity();
    }, 60000);
}