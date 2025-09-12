const fs = require('fs');
const path = require('path');

console.log('=== MANAGER NAVIGATION CONVERSION VERIFICATION ===\n');

const managerDir = path.join(__dirname, 'public', '_manager');
const files = fs.readdirSync(managerDir).filter(f => f.endsWith('.html'));

let allGood = true;
let usesSharedNav = 0;
let hasGoalsLink = 0;
let hasNavPlaceholder = 0;

console.log('Checking manager HTML files:\n');

files.forEach(file => {
    const filePath = path.join(managerDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    const hasSharedNavScript = content.includes('shared-nav.js');
    const hasPlaceholder = content.includes('nav-placeholder');
    const hasGoals = content.includes('/manager/goals');
    
    console.log(`${file}:`);
    console.log(`  ${hasSharedNavScript ? '✅' : '❌'} Uses shared-nav.js`);
    console.log(`  ${hasPlaceholder ? '✅' : '❌'} Has nav-placeholder div`);
    console.log(`  ${!hasGoals ? '✅' : '❌'} No hardcoded Goals link`);
    console.log('');
    
    if (hasSharedNavScript) usesSharedNav++;
    if (hasGoals) hasGoalsLink++;
    if (hasPlaceholder) hasNavPlaceholder++;
    
    if (hasGoals) allGood = false;
});

console.log('=== SUMMARY ===');
console.log(`Total HTML files: ${files.length}`);
console.log(`Files using shared-nav.js: ${usesSharedNav}`);
console.log(`Files with nav-placeholder: ${hasNavPlaceholder}`);
console.log(`Files with Goals link: ${hasGoalsLink}`);

if (allGood && usesSharedNav === files.length) {
    console.log('\n✅ SUCCESS! All manager files converted to shared navigation.');
    console.log('Goals link has been successfully removed from all pages.');
} else if (hasGoalsLink > 0) {
    console.log('\n⚠️ WARNING: Some files still have hardcoded Goals links!');
} else {
    console.log('\n⚠️ Some files may not be fully converted.');
}