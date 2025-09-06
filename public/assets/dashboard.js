// Load dashboard data
async function loadDashboardData() {
    const token = localStorage.getItem('syncedup_token') || localStorage.getItem('token');
    
    try {
        const response = await fetch('/api/agent/dashboard', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            // Update the stat cards with real data
            document.querySelectorAll('.stat-value')[0].textContent = '$' + (data.monthlySales || 0);
            document.querySelectorAll('.stat-value')[1].textContent = data.policiesCount || 0;
            document.querySelectorAll('.stat-value')[2].textContent = '$' + (data.commissions || 0);
            document.querySelectorAll('.stat-value')[3].textContent = '#' + (data.rank || 'N/A');
        }
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
    }
}

// Call on page load
if (window.location.pathname.includes('/agent/')) {
    loadDashboardData();
}
