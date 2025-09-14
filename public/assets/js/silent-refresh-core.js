/**
 * Silent Refresh Core - Shared across all portals
 * Based on working Super Admin implementation
 */

// Store previous data for comparison
let previousDashboardData = {};
let viewState = {};

// Save current view state (from Super Admin)
function saveViewState() {
    viewState = {
        scrollY: window.scrollY,
        scrollX: window.scrollX,
        activeElement: document.activeElement?.id,
        openDropdowns: Array.from(document.querySelectorAll('.dropdown.show, .dropdown-menu.show'))
            .map(el => ({id: el.id, classes: el.className})),
        formValues: {}
    };

    // Save form values
    document.querySelectorAll('input, select, textarea').forEach(field => {
        if (field.id || field.name) {
            viewState.formValues[field.id || field.name] = field.value;
        }
    });
}

// Restore view state (from Super Admin)
function restoreViewState() {
    // Restore scroll
    window.scrollTo(viewState.scrollX || 0, viewState.scrollY || 0);

    // Restore focus
    if (viewState.activeElement) {
        document.getElementById(viewState.activeElement)?.focus();
    }

    // Restore dropdowns
    viewState.openDropdowns?.forEach(dropdown => {
        const element = document.getElementById(dropdown.id);
        if (element) {
            element.className = dropdown.classes;
        }
    });

    // Restore form values
    Object.entries(viewState.formValues || {}).forEach(([key, value]) => {
        const field = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
        if (field && field.value !== value) {
            field.value = value;
        }
    });
}

// Show silent indicator (from Super Admin)
function showSilentRefreshIndicator() {
    let indicator = document.getElementById('silent-refresh-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'silent-refresh-indicator';
        indicator.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 8px 16px;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            font-size: 12px;
            color: #666;
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: opacity 0.3s ease;
        `;
        indicator.innerHTML = `
            <span style="
                width: 8px;
                height: 8px;
                background: #4CAF50;
                border-radius: 50%;
                display: inline-block;
                animation: pulse 2s infinite;
            "></span>
            <span>Live</span>
        `;
        document.body.appendChild(indicator);

        // Add pulse animation
        if (!document.getElementById('silent-refresh-styles')) {
            const style = document.createElement('style');
            style.id = 'silent-refresh-styles';
            style.textContent = `
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
                @keyframes fadeHighlight {
                    0% { background-color: rgba(76, 175, 80, 0.1); }
                    100% { background-color: transparent; }
                }
                .value-updated {
                    animation: fadeHighlight 2s ease;
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Brief pulse to show update
    indicator.style.opacity = '0.5';
    setTimeout(() => {
        indicator.style.opacity = '1';
    }, 100);
}

// Update single metric value with animation (from Super Admin)
function updateMetricValue(selector, newValue, format = 'text') {
    const element = document.querySelector(selector);
    if (!element) return;

    const currentValue = element.textContent.trim();

    // Only update if changed
    if (currentValue !== newValue) {
        // Add transition
        element.style.transition = 'all 0.3s ease';

        // Update content
        if (format === 'currency') {
            element.textContent = `$${parseFloat(newValue).toLocaleString()}`;
        } else if (format === 'number') {
            element.textContent = parseInt(newValue).toLocaleString();
        } else {
            element.textContent = newValue;
        }

        // Add highlight
        element.classList.add('value-updated');
        setTimeout(() => {
            element.classList.remove('value-updated');
        }, 2000);
    }
}

// Silent fetch with auth (adapted for Admin/Manager)
async function silentFetch(url, token) {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error('API returned success: false');
        }

        return data;
    } catch (error) {
        console.error('Silent fetch error:', error);
        return null;
    }
}

// Differential update function
function applyDifferentialUpdates(newData, updateMap) {
    if (!newData) return;

    // updateMap defines selector -> data path mapping
    Object.entries(updateMap).forEach(([selector, config]) => {
        const value = getNestedValue(newData, config.path);
        if (value !== undefined) {
            updateMetricValue(selector, value, config.format);
        }
    });
}

// Helper to get nested object values
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

// Export for use in portals
window.SilentRefresh = {
    saveViewState,
    restoreViewState,
    showSilentRefreshIndicator,
    updateMetricValue,
    silentFetch,
    applyDifferentialUpdates
};