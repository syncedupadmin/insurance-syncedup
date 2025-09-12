const fs = require('fs');
const path = require('path');

console.log('=== CLEANUP VERIFICATION REPORT ===\n');

// Files that should be removed
const removedFiles = {
    admin: [
        'licensing.html',
        'agents.html', 
        'settings.html.bak',
        'test-upload.html',
        'theme-test.html'
    ],
    manager: [
        'goals.html'
    ],
    agent: [
        'archived/customers.html',
        'archived/sales.html'
    ]
};

// Check each portal
let allClear = true;

console.log('✓ ADMIN PORTAL CLEANUP:');
removedFiles.admin.forEach(file => {
    const filePath = path.join(__dirname, 'public', '_admin', file);
    if (!fs.existsSync(filePath)) {
        console.log(`  ✅ ${file} - Successfully removed`);
    } else {
        console.log(`  ❌ ${file} - Still exists!`);
        allClear = false;
    }
});

console.log('\n✓ MANAGER PORTAL CLEANUP:');
removedFiles.manager.forEach(file => {
    const filePath = path.join(__dirname, 'public', '_manager', file);
    if (!fs.existsSync(filePath)) {
        console.log(`  ✅ ${file} - Successfully removed`);
    } else {
        console.log(`  ❌ ${file} - Still exists!`);
        allClear = false;
    }
});

console.log('\n✓ AGENT PORTAL CLEANUP:');
// Check if archived folder is gone
const archivedPath = path.join(__dirname, 'public', '_agent', 'archived');
if (!fs.existsSync(archivedPath)) {
    console.log(`  ✅ archived folder - Successfully removed`);
} else {
    console.log(`  ❌ archived folder - Still exists!`);
    allClear = false;
}

// Check backup folder exists
console.log('\n✓ BACKUP VERIFICATION:');
const backupPath = path.join(__dirname, 'public', '_cleanup_backup');
if (fs.existsSync(backupPath)) {
    console.log(`  ✅ Backup folder exists at: _cleanup_backup/`);
    
    // Count backed up files
    let adminBackups = fs.readdirSync(path.join(backupPath, 'admin')).length;
    let managerBackups = fs.readdirSync(path.join(backupPath, 'manager')).length;
    let agentBackups = fs.readdirSync(path.join(backupPath, 'agent')).length;
    
    console.log(`  📁 Admin backups: ${adminBackups} files`);
    console.log(`  📁 Manager backups: ${managerBackups} files`);
    console.log(`  📁 Agent backups: ${agentBackups} files/folders`);
}

// Navigation checks
console.log('\n✓ NAVIGATION FIXES:');
// Check manager shared-nav.js doesn't have goals
const managerNav = fs.readFileSync(path.join(__dirname, 'public', '_manager', 'shared-nav.js'), 'utf8');
if (!managerNav.includes('/manager/goals')) {
    console.log('  ✅ Manager navigation - Goals link removed');
} else {
    console.log('  ❌ Manager navigation - Goals link still present!');
    allClear = false;
}

// Check agent quotes.html doesn't link to sales.html
const agentQuotes = fs.readFileSync(path.join(__dirname, 'public', '_agent', 'quotes.html'), 'utf8');
if (!agentQuotes.includes('sales.html')) {
    console.log('  ✅ Agent quotes.html - Sales link fixed');
} else {
    console.log('  ❌ Agent quotes.html - Still links to sales.html!');
    allClear = false;
}

// Final summary
console.log('\n=== CLEANUP SUMMARY ===');
if (allClear) {
    console.log('✅ ALL CLEANUP TASKS COMPLETED SUCCESSFULLY!');
    console.log('\nFiles removed:');
    console.log('  - Admin: 5 files (test files + old versions)');
    console.log('  - Manager: 1 file (duplicate dashboard)');
    console.log('  - Agent: 1 folder with 2 archived files');
    console.log('\nTotal: 8 files removed, safely backed up in _cleanup_backup/');
} else {
    console.log('⚠️ Some cleanup tasks may have failed. Please review above.');
}

console.log('\nNOTE: Convoso pages cleanup will be done separately.');