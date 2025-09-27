const fs = require('fs');

const filesToFix = [
  { path: 'api/admin/agents.js', roles: ['admin'] },
  { path: 'api/admin/bulk-upload.js', roles: ['admin', 'super-admin'] },
  { path: 'api/admin/commission-overrides.js', roles: ['admin'] },
  { path: 'api/admin/commission-settings.js', roles: ['admin'] },
  { path: 'api/admin/leaderboard-settings.js', roles: ['admin'] },
  { path: 'api/admin/leads-backup.js', roles: ['admin'] },
  { path: 'api/admin/payroll-export.js', roles: ['admin'] },
  { path: 'api/admin/reset-password.js', roles: ['admin'] },
  { path: 'api/admin/users-with-email.js', roles: ['admin'] },
  { path: 'api/agent/dashboard.js', roles: ['agent', 'manager', 'admin'] },
  { path: 'api/auth/password-reset-confirm.js', roles: [] }, // Public endpoint
  { path: 'api/auth/password-reset-request.js', roles: [] }, // Public endpoint
  { path: 'api/customer-service/activities.js', roles: ['customer-service', 'admin'] },
  { path: 'api/customer-service/analytics.js', roles: ['customer-service', 'admin'] },
  { path: 'api/integrations/convoso/agents.js', roles: ['admin'] },
  { path: 'api/integrations/convoso/sync-settings.js', roles: ['admin'] },
  { path: 'api/integrations/healthsherpa/auth.js', roles: ['admin'] },
  { path: 'api/integrations/healthsherpa/plans.js', roles: ['agent', 'admin'] },
  { path: 'api/manager/agents-performance.js', roles: ['manager', 'admin'] },
  { path: 'api/manager/team-analytics.js', roles: ['manager', 'admin'] },
  { path: 'api/manager/team-leads.js', roles: ['manager', 'admin'] },
  { path: 'api/manager/team-settings.js', roles: ['manager', 'admin'] },
];

console.log('🔧 RE-ENABLING AUTHENTICATION\n');
console.log('=' .repeat(80) + '\n');

let fixed = 0;
let skipped = 0;
let errors = 0;

for (const file of filesToFix) {
  try {
    if (!fs.existsSync(file.path)) {
      console.log(`⚠️  SKIP: ${file.path} (file not found)`);
      skipped++;
      continue;
    }

    let content = fs.readFileSync(file.path, 'utf8');

    // Check if it has disabled auth
    if (!content.includes('// DISABLED:')) {
      console.log(`✅ SKIP: ${file.path} (already has auth)`);
      skipped++;
      continue;
    }

    // Fix 1: Remove // DISABLED: from import
    content = content.replace(/\/\/ DISABLED: \/\/ DISABLED: \/\/ DISABLED: \/\/ DISABLED: import/g, 'import');
    content = content.replace(/\/\/ DISABLED: import/g, 'import');

    // Fix 2: Remove // DISABLED: from export and wrap handler
    if (file.roles.length > 0) {
      const rolesStr = file.roles.map(r => `'${r}'`).join(', ');

      // Find the pattern: // DISABLED: export default requireAuth([...])(handlerName);
      content = content.replace(
        /\/\/ DISABLED: export default requireAuth\(\[.*?\]\)\((\w+)\);/g,
        `export default requireAuth([${rolesStr}])($1);`
      );

      // Find the pattern: export default handlerName;
      const handlerMatch = content.match(/export default (\w+);/);
      if (handlerMatch && !content.includes('requireAuth')) {
        const handlerName = handlerMatch[1];
        content = content.replace(
          `export default ${handlerName};`,
          `export default requireAuth([${rolesStr}])(${handlerName});`
        );
      }
    } else {
      // Public endpoint - just uncomment
      content = content.replace(/\/\/ DISABLED: export default/g, 'export default');
    }

    // Write back
    fs.writeFileSync(file.path, content);
    console.log(`✅ FIXED: ${file.path} (roles: ${file.roles.join(', ') || 'public'})`);
    fixed++;

  } catch (err) {
    console.log(`❌ ERROR: ${file.path} - ${err.message}`);
    errors++;
  }
}

console.log('\n' + '=' .repeat(80));
console.log(`\n📊 SUMMARY:`);
console.log(`  ✅ Fixed: ${fixed}`);
console.log(`  ⚠️  Skipped: ${skipped}`);
console.log(`  ❌ Errors: ${errors}`);
console.log(`\n✅ Authentication re-enabled!\n`);