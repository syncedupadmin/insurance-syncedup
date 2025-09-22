const fs = require('fs');
const path = require('path');

// Fix all manager HTML files
const managerDir = path.join(__dirname, 'public', '_manager');
const files = fs.readdirSync(managerDir).filter(f => f.endsWith('.html'));

console.log('Fixing manager portal files...\n');

files.forEach(file => {
    const filePath = path.join(managerDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Fix 1: Remove manager-modern.css reference (blue theme)
    if (content.includes('manager-modern.css')) {
        content = content.replace(/<link rel="stylesheet" href="\/css\/themes\/manager-modern\.css">/g, '');
        console.log(`✓ ${file}: Removed manager-modern.css (blue theme)`);
        modified = true;
    }
    
    // Fix 2: Update theme loading for modern theme (same as agent fix)
    const oldPattern = `        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/css/themes/' + t + '.css';
        link.setAttribute('data-theme-css', t);
        document.head.appendChild(link);`;
    
    const newPattern = `        if(t==="modern"){
            // Load modern base styles (structure only)
            var baseLink = document.createElement('link');
            baseLink.rel = 'stylesheet';
            baseLink.href = '/css/themes/modern-base.css';
            baseLink.setAttribute('data-theme-css', 'modern-base');
            document.head.appendChild(baseLink);
            // Manager portal orange colors are in manager-global.css
        } else {
            // Load traditional theme CSS
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '/css/themes/' + t + '.css';
            link.setAttribute('data-theme-css', t);
            document.head.appendChild(link);
        }`;
    
    if (content.includes(oldPattern)) {
        content = content.replace(oldPattern, newPattern);
        console.log(`✓ ${file}: Fixed modern theme loading`);
        modified = true;
    }
    
    // Write back if modified
    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
    }
});

console.log('\n✅ Manager portal fixed! Should now show ORANGE instead of BLUE.');