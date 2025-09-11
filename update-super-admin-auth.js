const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, 'api', 'super-admin');

// Files that already use auth-middleware (skip these)
const skipFiles = [
  'auth-middleware.js',
  '_auth-helper.js',
  'audit.js',
  'agencies.js',
  'users.js',
  'metrics.js',
  'health.js'
];

// Files we've already updated
const updatedFiles = [
  'system-health.js',
  'analytics.js',
  'system-stats.js',
  'financial-stats.js',
  'activity-chart.js'
];

// Get all JS files
const files = fs.readdirSync(apiDir)
  .filter(file => file.endsWith('.js'))
  .filter(file => !skipFiles.includes(file))
  .filter(file => !updatedFiles.includes(file));

console.log(`Found ${files.length} files to update\n`);

let successCount = 0;
let errorCount = 0;

files.forEach(file => {
  const filePath = path.join(apiDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;
  
  // Check if file has JWT auth pattern
  if (content.includes('jwt.verify') || content.includes('decoded.role')) {
    console.log(`Updating ${file}...`);
    
    // Replace import/require statements
    if (content.includes('import jwt from')) {
      content = content.replace(
        "import jwt from 'jsonwebtoken';",
        "const { verifySuperAdmin } = require('./_auth-helper');"
      );
      updated = true;
    }
    
    // Replace ES6 import style for files using import
    if (content.includes('import { createClient }') && !content.includes('verifySuperAdmin')) {
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('import { createClient }')) {
          lines.splice(i + 1, 0, "const { verifySuperAdmin } = require('./_auth-helper');");
          content = lines.join('\n');
          updated = true;
          break;
        }
      }
    }
    
    // Replace authentication pattern
    const authPatterns = [
      // Pattern 1: Full JWT verify block
      /const authHeader[\s\S]*?if \(decoded\.role[\s\S]*?\}\s*\}/g,
      // Pattern 2: Simpler auth check
      /const token = authHeader[\s\S]*?return res\.status\(403\)[\s\S]*?\}/g,
      // Pattern 3: Try-catch JWT verify
      /try \{\s*decoded = jwt\.verify[\s\S]*?\} catch[\s\S]*?\}[\s\S]*?if \([^}]*decoded\.role[\s\S]*?\}/g
    ];
    
    for (const pattern of authPatterns) {
      if (pattern.test(content)) {
        content = content.replace(pattern, `const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
        
        const user = await verifySuperAdmin(token);
        if (!user) {
            return res.status(403).json({ error: 'Super admin privileges required' });
        }`);
        updated = true;
        break;
      }
    }
    
    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Updated ${file}`);
      successCount++;
    } else {
      console.log(`⚠ Could not update ${file} - manual review needed`);
      errorCount++;
    }
  }
});

console.log(`\n=== Update Summary ===`);
console.log(`✓ Successfully updated: ${successCount} files`);
console.log(`⚠ Need manual review: ${errorCount} files`);
console.log(`\nNext steps:`);
console.log(`1. Deploy to Vercel`);
console.log(`2. Test /api/super-admin/users endpoint`);
console.log(`3. Verify dashboard loads data`);