// Audit API Module - Handles all audit logging
export async function logAdminAction(action, details, targetResource = null) {
    try {
        const response = await fetch('/api/super-admin/audit', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action,
                details,
                target_resource: targetResource,
                session_id: sessionStorage.getItem('session_id'),
                screen_resolution: `${window.screen.width}x${window.screen.height}`,
                browser_language: navigator.language,
                referrer: document.referrer
            })
        });

        if (!response.ok) {
            // Fail silently for audit logs - don't disrupt user experience
            console.warn('Audit log failed:', response.status);
            return { success: false };
        }

        return { success: true };
    } catch (error) {
        // Fail silently - audit logging should never break functionality
        console.warn('Audit logging error:', error.message);
        return { success: false };
    }
}

export async function loadRecentAuditEntries(limit = 10) {
    try {
        const response = await fetch(`/api/super-admin/audit?limit=${limit}`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.entries || [];
        }
    } catch (error) {
        console.error('Error loading audit entries:', error);
    }
    return [];
}

export async function loadFullAuditLog() {
    await logAdminAction('NAVIGATION', 'Accessed Complete Audit Trail');
    
    const mainContent = document.querySelector('.dashboard-grid');
    if (!mainContent) return;
    
    mainContent.innerHTML = `
        <div class="system-section">
            <h3 class="section-title">Complete Audit Trail</h3>
            <div id="audit-filters" style="margin-bottom: 1rem;">
                <input type="date" id="audit-start" style="margin-right: 0.5rem;">
                <input type="date" id="audit-end" style="margin-right: 0.5rem;">
                <button onclick="filterAuditLogs()" class="btn btn-primary">Filter</button>
            </div>
            <table class="audit-table">
                <thead>
                    <tr>
                        <th>Timestamp</th>
                        <th>User</th>
                        <th>Action</th>
                        <th>Details</th>
                        <th>IP Address</th>
                    </tr>
                </thead>
                <tbody id="full-audit-log">
                    <tr><td colspan="5">Loading...</td></tr>
                </tbody>
            </table>
        </div>
    `;
    
    const entries = await loadRecentAuditEntries(100);
    const tbody = document.getElementById('full-audit-log');
    
    if (tbody && entries.length > 0) {
        tbody.innerHTML = entries.map(entry => `
            <tr>
                <td>${new Date(entry.created_at || entry.timestamp).toLocaleString()}</td>
                <td>${entry.admin_email || 'System'}</td>
                <td>${entry.action}</td>
                <td>${typeof entry.details === 'object' ? (entry.details.message || JSON.stringify(entry.details)) : entry.details}</td>
                <td>${entry.ip_address || 'N/A'}</td>
            </tr>
        `).join('');
    } else if (tbody) {
        tbody.innerHTML = '<tr><td colspan="5">No audit entries found</td></tr>';
    }
}