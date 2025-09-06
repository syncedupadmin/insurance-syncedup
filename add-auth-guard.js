const fs = require('fs');
const path = require('path');
const glob = require('glob');

/**
 * Script to add auth guard to all portal HTML files
 * This prevents flash of protected content
 */

const AUTH_GUARD_INJECT = `
    <!-- Auth Guard CSS - Must be loaded FIRST to prevent flash -->
    <link rel="stylesheet" href="/assets/auth-guard.css">
    
    <!-- Auth Guard Script - Must be loaded in HEAD before content renders -->
    <script src="/auth-check.js"></script>`;

const PORTALS = [
    'public/admin/**/*.html',
    'public/super-admin/**/*.html', 
    'public/agent/**/*.html',
    'public/manager/**/*.html',
    'public/customer-service/**/*.html'
];

function injectAuthGuard() {
    console.log('🔒 Injecting Auth Guard into portal pages...\n');
    
    let updatedFiles = 0;
    let skippedFiles = 0;
    
    PORTALS.forEach(pattern => {
        const files = glob.sync(pattern);
        
        files.forEach(file => {
            try {
                let content = fs.readFileSync(file, 'utf8');
                
                // Skip if auth guard already exists
                if (content.includes('auth-guard.css') || content.includes('/auth-check.js')) {
                    console.log(`⏭️  Skipping ${file} (auth guard already present)`);
                    skippedFiles++;
                    return;
                }
                
                // Find the head section and inject auth guard after stylesheets
                const headRegex = /(<link[^>]*stylesheet[^>]*>[\s\S]*?)(\s*<script|<\/head>)/i;
                
                if (headRegex.test(content)) {
                    content = content.replace(headRegex, `$1${AUTH_GUARD_INJECT}$2`);
                    fs.writeFileSync(file, content);
                    console.log(`✅ Updated ${file}`);
                    updatedFiles++;
                } else {
                    console.log(`⚠️  Could not find head section in ${file}`);
                }
                
            } catch (error) {
                console.error(`❌ Error processing ${file}:`, error.message);
            }
        });
    });
    
    console.log(`\n🎉 Auth Guard injection complete!`);
    console.log(`✅ Updated: ${updatedFiles} files`);
    console.log(`⏭️  Skipped: ${skippedFiles} files`);
}

// Run the injection
injectAuthGuard();