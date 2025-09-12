const fs = require('fs');
const path = require('path');

// Files to convert (already did index.html)
const filesToConvert = [
    'team-management.html',
    'performance.html',
    'reports.html',
    'vendors.html',
    'settings.html',
    'leads.html'
];

console.log('Converting manager files to use shared-nav.js...\n');

filesToConvert.forEach(file => {
    const filePath = path.join(__dirname, 'public', '_manager', file);
    
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  ${file} - File not found, skipping`);
        return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Step 1: Add shared-nav.js script if not present
    if (!content.includes('shared-nav.js')) {
        // Find where to insert (before </head>)
        content = content.replace(
            '</head>',
            '    <script src="/manager/shared-nav.js"></script>\n</head>'
        );
        modified = true;
    }
    
    // Step 2: Replace hardcoded navigation with placeholder
    // Pattern to match the entire nav div with all links
    const navPattern = /<div class="nav">[\s\S]*?<\/div>\s*(?=<div class="container">|<!-- Main Content -->|<main)/;
    
    if (navPattern.test(content)) {
        content = content.replace(navPattern, '    <!-- Navigation -->\n    <div id="nav-placeholder"></div>\n    \n    ');
        modified = true;
    }
    
    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ ${file} - Converted to use shared-nav.js`);
    } else {
        console.log(`⚠️  ${file} - Already using shared navigation or no changes needed`);
    }
});

console.log('\n✅ Conversion complete! All manager files now use shared-nav.js');
console.log('Goals link has been removed from all pages via shared navigation.');