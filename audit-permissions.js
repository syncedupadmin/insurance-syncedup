import fs from 'fs';
import path from 'path';

// Function to find all HTML files in public directories
function findHtmlFiles(dir) {
    const files = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            files.push(...findHtmlFiles(fullPath));
        } else if (item.isFile() && item.name.endsWith('.html')) {
            files.push(fullPath);
        }
    }
    
    return files;
}

// Function to extract role permission checks from HTML file
function checkPermissions(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Look for role-based permission checks
        const roleChecks = [];
        
        // Pattern 1: includes array check
        const includesPattern = /(?:if\s*\()?.*?(?:!)?(?:\[.*?\])\.includes\([^)]*role[^)]*\)/g;
        let match;
        while ((match = includesPattern.exec(content)) !== null) {
            roleChecks.push({
                type: 'includes',
                code: match[0].trim(),
                line: content.substring(0, match.index).split('\n').length
            });
        }
        
        // Pattern 2: role comparison
        const roleComparePattern = /(?:user|currentUser)\.role\s*[!=]==?\s*['"](.*?)['"]|['"](.*?)['"].*?[!=]==?\s*(?:user|currentUser)\.role/g;
        while ((match = roleComparePattern.exec(content)) !== null) {
            roleChecks.push({
                type: 'comparison',
                code: match[0].trim(),
                line: content.substring(0, match.index).split('\n').length
            });
        }
        
        // Check if super-admin is mentioned
        const hasSuperAdmin = content.includes('super-admin') || content.includes('super_admin');
        
        return {
            file: filePath,
            roleChecks,
            hasSuperAdmin,
            hasPermissionCheck: roleChecks.length > 0
        };
    } catch (error) {
        return {
            file: filePath,
            error: error.message
        };
    }
}

// Main audit function
function auditPermissions() {
    console.log('🔍 Auditing permissions in all HTML files...\n');
    
    const publicDir = 'C:\\Users\\nicho\\OneDrive\\Desktop\\Insurance.SyncedUp\\public';
    const htmlFiles = findHtmlFiles(publicDir);
    
    const dashboardFiles = htmlFiles.filter(file => 
        file.includes('index.html') || 
        file.includes('dashboard.html') ||
        (file.includes('/admin/') || file.includes('/agent/') || 
         file.includes('/manager/') || file.includes('/customer-service/') || 
         file.includes('/super-admin/'))
    );
    
    const results = dashboardFiles.map(checkPermissions);
    
    console.log('📊 PERMISSION AUDIT RESULTS:\n');
    
    const problemFiles = [];
    const goodFiles = [];
    
    results.forEach(result => {
        const relativePath = result.file.replace(publicDir, '').replace(/\\/g, '/');
        
        if (result.error) {
            console.log(`❌ ERROR: ${relativePath} - ${result.error}`);
            return;
        }
        
        if (!result.hasPermissionCheck) {
            console.log(`⚠️  NO PERMISSION CHECK: ${relativePath}`);
            problemFiles.push(result);
        } else if (!result.hasSuperAdmin) {
            console.log(`❌ MISSING SUPER-ADMIN: ${relativePath}`);
            console.log(`   Permission checks found:`)
            result.roleChecks.forEach(check => {
                console.log(`   - Line ${check.line}: ${check.code}`);
            });
            problemFiles.push(result);
        } else {
            console.log(`✅ GOOD: ${relativePath} - includes super-admin permissions`);
            goodFiles.push(result);
        }
        
        console.log('');
    });
    
    console.log('\n📈 SUMMARY:');
    console.log(`✅ Files with proper super-admin access: ${goodFiles.length}`);
    console.log(`❌ Files needing fixes: ${problemFiles.length}`);
    
    if (problemFiles.length > 0) {
        console.log('\n🔧 FILES NEEDING FIXES:');
        problemFiles.forEach(result => {
            const relativePath = result.file.replace(publicDir, '').replace(/\\/g, '/');
            console.log(`- ${relativePath}`);
        });
    }
    
    return {
        goodFiles,
        problemFiles,
        total: results.length
    };
}

// Run the audit
auditPermissions();