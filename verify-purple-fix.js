// Verification script for purple bleeding fix
console.log('=== PURPLE BLEEDING FIX VERIFICATION ===\n');

const fs = require('fs');
const path = require('path');

// Check 1: Verify old modern.css is renamed
console.log('✓ Check 1: Old modern.css renamed');
const oldModernPath = path.join(__dirname, 'public/css/themes/modern.css');
const backupPath = path.join(__dirname, 'public/css/themes/modern-OLD-BACKUP.css');

if (!fs.existsSync(oldModernPath)) {
    console.log('  ✅ Old modern.css no longer exists');
} else {
    console.log('  ❌ WARNING: Old modern.css still exists!');
}

if (fs.existsSync(backupPath)) {
    console.log('  ✅ Backup file exists at modern-OLD-BACKUP.css');
}

// Check 2: Verify new CSS structure exists
console.log('\n✓ Check 2: New CSS structure');
const modernBasePath = path.join(__dirname, 'public/css/themes/modern-base.css');
const modernPurplePath = path.join(__dirname, 'public/css/themes/modern-purple.css');

if (fs.existsSync(modernBasePath)) {
    console.log('  ✅ modern-base.css exists (structure only)');
}
if (fs.existsSync(modernPurplePath)) {
    console.log('  ✅ modern-purple.css exists (admin purple theme)');
}

// Check 3: Verify agent files are fixed
console.log('\n✓ Check 3: Agent portal files fixed');
const agentFiles = ['index.html', 'commissions.html', 'quotes.html', 'settings.html'];
let allFixed = true;

agentFiles.forEach(file => {
    const filePath = path.join(__dirname, 'public/_agent', file);
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for old pattern
        if (content.includes("link.href = '/css/themes/' + t + '.css'") && 
            !content.includes('if(t==="modern")')) {
            console.log(`  ❌ ${file}: Still using old theme loading`);
            allFixed = false;
        } else if (content.includes('modern-base.css')) {
            console.log(`  ✅ ${file}: Fixed to use modern-base.css`);
        } else {
            console.log(`  ⚠️  ${file}: Check manually`);
        }
        
        // Check for clearAuthCookies if it's commissions.html
        if (file === 'commissions.html') {
            if (content.includes('function clearAuthCookies()')) {
                console.log(`  ✅ ${file}: clearAuthCookies function added`);
            }
        }
    }
});

// Check 4: Theme colors summary
console.log('\n✓ Check 4: Expected Portal Colors');
console.log('  🟢 Agent Portal: GREEN (from agent-global.css)');
console.log('  🟣 Admin Portal: PURPLE (from modern-purple.css)');
console.log('  🟠 Manager Portal: ORANGE (from manager-global.css)');
console.log('  🔵 Customer Service: BLUE (from customer-service-global.css)');

// Final summary
console.log('\n=== SUMMARY ===');
if (!fs.existsSync(oldModernPath) && allFixed) {
    console.log('✅ ALL FIXES APPLIED SUCCESSFULLY!');
    console.log('The agent portal should now show GREEN instead of PURPLE.');
} else {
    console.log('⚠️  Some issues may remain. Please verify manually.');
}

console.log('\nNext steps:');
console.log('1. Clear browser cache and localStorage');
console.log('2. Test each portal with modern theme');
console.log('3. Verify colors match expected values above');