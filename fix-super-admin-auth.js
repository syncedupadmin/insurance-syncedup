// Script to fix authentication in all super admin API files
const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, 'api', 'super-admin');

// Files that already use auth-middleware (skip these)
const filesUsingMiddleware = [
  'audit.js',
  'agencies.js', 
  'users.js',
  'metrics.js',
  'health.js',
  'auth-middleware.js'
];

// Read all .js files in the directory
const files = fs.readdirSync(apiDir)
  .filter(file => file.endsWith('.js'))
  .filter(file => !filesUsingMiddleware.includes(file));

console.log(`Found ${files.length} files to update`);

files.forEach(file => {
  const filePath = path.join(apiDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if file has authentication checks
  if (content.includes('authorization') || content.includes('Authorization') || 
      content.includes('decoded.role') || content.includes('token')) {
    
    console.log(`Updating ${file}...`);
    
    // Add auth-middleware import if not present
    if (!content.includes("require('./auth-middleware')") && !content.includes('auth-middleware')) {
      // Check if it uses ES6 imports or CommonJS
      if (content.includes('import ')) {
        // ES6 style - add after other imports
        const lastImportIndex = content.lastIndexOf('import ');
        const lineEnd = content.indexOf('\n', lastImportIndex);
        content = content.slice(0, lineEnd + 1) + 
          "import { verifySuperAdmin } from './auth-middleware.js';\n" +
          content.slice(lineEnd + 1);
      } else {
        // CommonJS style - add at the top after requires
        const requirePattern = /const.*require\([^)]+\);/g;
        let lastRequireMatch;
        let match;
        while ((match = requirePattern.exec(content)) !== null) {
          lastRequireMatch = match;
        }
        
        if (lastRequireMatch) {
          const insertPos = lastRequireMatch.index + lastRequireMatch[0].length;
          content = content.slice(0, insertPos) + 
            "\nconst { verifySuperAdmin } = require('./auth-middleware');" +
            content.slice(insertPos);
        } else {
          // Add at the very top
          content = "const { verifySuperAdmin } = require('./auth-middleware');\n" + content;
        }
      }
    }
    
    // Replace old authentication pattern
    // Pattern 1: Bearer token check with JWT decode
    const authPattern1 = /\/\/ Authentication check[\s\S]*?if \(decoded\.role[^}]+\}[\s\S]*?\}/g;
    const authPattern2 = /const authHeader[\s\S]*?return res\.status\(403\)[\s\S]*?\}/g;
    const authPattern3 = /\/\/ Verify admin access[\s\S]*?return res\.status\(403\)[\s\S]*?\}/g;
    
    // Replace with verifySuperAdmin call
    const newAuthCheck = `    // Verify super admin authentication
    const user = await verifySuperAdmin(req, res);
    if (!user) {
      return; // verifySuperAdmin already sent the response
    }`;
    
    // Try different patterns
    if (authPattern1.test(content)) {
      content = content.replace(authPattern1, newAuthCheck);
    } else if (authPattern2.test(content)) {
      content = content.replace(authPattern2, newAuthCheck);
    } else if (authPattern3.test(content)) {
      content = content.replace(authPattern3, newAuthCheck);
    }
    
    // Save the updated file
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Updated ${file}`);
  }
});

console.log('\\nAuthentication fix complete!');