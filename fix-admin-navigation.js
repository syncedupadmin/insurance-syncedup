const fs = require('fs');
const path = require('path');

const correctNavigation = `    <nav class="nav">
        <a href="/admin/">
            <i data-lucide="layout-dashboard" class="icon"></i>Dashboard
        </a>
        <a href="/admin/agent-performance">
            <i data-lucide="trending-up" class="icon"></i>Agent Performance
        </a>
        <a href="/admin/users">
            <i data-lucide="users" class="icon"></i>Users
        </a>
        <a href="/admin/convoso-leads">
            <i data-lucide="users" class="icon"></i>Leads
        </a>
        <a href="/admin/vendors">
            <i data-lucide="building-2" class="icon"></i>Vendors
        </a>
        <a href="/admin/commissions">
            <i data-lucide="dollar-sign" class="icon"></i>Commissions
        </a>
        <a href="/admin/settings">
            <i data-lucide="settings" class="icon"></i>Settings
        </a>
        <a href="/admin/convoso-monitor">
            <i data-lucide="monitor-speaker" class="icon"></i>Convoso
        </a>
        <a href="/global-leaderboard">
            <i data-lucide="trophy" class="icon"></i>Global Leaderboard
        </a>
    </nav>`;

const adminFiles = [
    'public/admin/agent-performance.html',
    'public/admin/agents.html', 
    'public/admin/commissions.html',
    'public/admin/convoso-leads.html',
    'public/admin/convoso-monitor.html',
    'public/admin/convoso.html',
    'public/admin/leads.html',
    'public/admin/licensing.html',
    'public/admin/onboarding.html',
    'public/admin/reports.html',
    'public/admin/users.html',
    'public/admin/vendors.html'
];

adminFiles.forEach(filePath => {
    try {
        if (fs.existsSync(filePath)) {
            let content = fs.readFileSync(filePath, 'utf8');
            
            // Find and replace navigation section
            const navRegex = /<nav class="nav">[\s\S]*?<\/nav>/;
            const match = content.match(navRegex);
            
            if (match) {
                // Set the active class based on the file name
                const fileName = path.basename(filePath, '.html');
                let navWithActive = correctNavigation;
                
                // Add active class to current page
                if (fileName === 'agent-performance') {
                    navWithActive = navWithActive.replace('href="/admin/agent-performance"', 'href="/admin/agent-performance" class="active"');
                } else if (fileName === 'users' || fileName === 'agents') {
                    navWithActive = navWithActive.replace('href="/admin/users"', 'href="/admin/users" class="active"');
                } else if (fileName === 'convoso-leads' || fileName === 'leads') {
                    navWithActive = navWithActive.replace('href="/admin/convoso-leads"', 'href="/admin/convoso-leads" class="active"');
                } else if (fileName === 'vendors') {
                    navWithActive = navWithActive.replace('href="/admin/vendors"', 'href="/admin/vendors" class="active"');
                } else if (fileName === 'commissions') {
                    navWithActive = navWithActive.replace('href="/admin/commissions"', 'href="/admin/commissions" class="active"');
                } else if (fileName === 'convoso-monitor' || fileName === 'convoso') {
                    navWithActive = navWithActive.replace('href="/admin/convoso-monitor"', 'href="/admin/convoso-monitor" class="active"');
                }
                
                content = content.replace(navRegex, navWithActive);
                fs.writeFileSync(filePath, content);
                console.log(`✓ Fixed navigation in ${filePath}`);
            } else {
                console.log(`? No navigation found in ${filePath}`);
            }
        } else {
            console.log(`✗ File not found: ${filePath}`);
        }
    } catch (error) {
        console.log(`✗ Error processing ${filePath}:`, error.message);
    }
});

console.log('Navigation fix complete!');