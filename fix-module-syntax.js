const fs = require('fs');
const path = require('path');

const files = [
  'api/admin/agents.js',
  'api/admin/bulk-upload.js',
  'api/admin/commission-overrides.js',
  'api/admin/commission-settings.js',
  'api/admin/leaderboard-settings.js',
  'api/admin/leads-backup.js',
  'api/admin/payroll-export.js',
  'api/admin/reset-password.js',
  'api/admin/users-with-email.js',
  'api/manager/dashboard-v2.js',
  'api/manager/goals.js',
  'api/manager/reports.js',
  'api/manager/team-performance.js',
  'api/manager/vendors.js'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Check if file uses require() but has export default
  if (content.includes('require(') && content.includes('export default requireAuth')) {
    // Replace export default with module.exports
    content = content.replace(
      /export default requireAuth\((.*?)\)\((.*?)\);?$/m,
      'module.exports = requireAuth($1)($2);'
    );

    // Check if requireAuth is imported
    const hasAuthImport = content.includes("require('../_middleware/authCheck") ||
                          content.includes("require('./_middleware/authCheck");
    if (!hasAuthImport) {
      // Add import at the top after other requires
      const lastRequire = content.lastIndexOf('require(');
      if (lastRequire !== -1) {
        const endOfLine = content.indexOf('\n', lastRequire);
        content = content.slice(0, endOfLine + 1) +
                  "const { requireAuth } = require('../_middleware/authCheck.js');\n" +
                  content.slice(endOfLine + 1);
      }
    }

    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed ${file}`);
  }
});

console.log('Done!');