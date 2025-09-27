const fs = require('fs');

console.log('🚀 FINISHING ALL REMAINING FIXES\n');
console.log('='.repeat(80) + '\n');

const fixes = [
  // Admin APIs that need auth re-enabled
  {
    file: 'api/admin/commission-overrides.js',
    roles: ['admin'],
    needsAgencyFilter: true
  },
  {
    file: 'api/admin/leaderboard-settings.js',
    roles: ['admin'],
    needsAgencyFilter: true
  },
  {
    file: 'api/admin/leads-backup.js',
    roles: ['admin'],
    needsAgencyFilter: true
  },
  {
    file: 'api/admin/payroll-export.js',
    roles: ['admin'],
    needsAgencyFilter: true
  },
  {
    file: 'api/admin/reset-password.js',
    roles: ['admin'],
    needsAgencyFilter: false // Password reset is per-user
  },
  {
    file: 'api/admin/users-with-email.js',
    roles: ['admin'],
    needsAgencyFilter: false // Already includes agency_id in INSERT
  },

  // Manager APIs
  {
    file: 'api/manager/dashboard-v2.js',
    roles: ['manager', 'admin'],
    needsAgencyFilter: true
  },
  {
    file: 'api/manager/goals.js',
    roles: ['manager', 'admin'],
    needsAgencyFilter: true
  },
  {
    file: 'api/manager/reports.js',
    roles: ['manager', 'admin'],
    needsAgencyFilter: true
  },
  {
    file: 'api/manager/team-performance.js',
    roles: ['manager', 'admin'],
    needsAgencyFilter: true
  },
  {
    file: 'api/manager/vendors.js',
    roles: ['manager', 'admin'],
    needsAgencyFilter: true
  }
];

let fixed = 0;
let skipped = 0;
let errors = [];

for (const fix of fixes) {
  try {
    if (!fs.existsSync(fix.file)) {
      console.log(`⚠️  SKIP: ${fix.file} (not found)`);
      skipped++;
      continue;
    }

    let content = fs.readFileSync(fix.file, 'utf8');
    let modified = false;

    // Fix 1: Remove // DISABLED: from imports
    if (content.includes('// DISABLED:')) {
      content = content.replace(/\/\/ DISABLED: \/\/ DISABLED: \/\/ DISABLED: \/\/ DISABLED: import/g, 'import');
      content = content.replace(/\/\/ DISABLED: import/g, 'import');
      modified = true;
    }

    // Fix 2: Add requireAuth import if not present
    if (!content.includes("from '../_middleware/authCheck.js'") &&
        !content.includes('requireAuth')) {
      const firstImport = content.indexOf('import');
      if (firstImport !== -1) {
        const endOfLine = content.indexOf('\n', firstImport);
        content = content.slice(0, endOfLine + 1) +
                 "import { requireAuth } from '../_middleware/authCheck.js';\n" +
                 content.slice(endOfLine + 1);
        modified = true;
      }
    }

    // Fix 3: Fix export statement
    const rolesStr = fix.roles.map(r => `'${r}'`).join(', ');
    const handlerMatch = content.match(/export default (\w+);/);

    if (handlerMatch) {
      const handlerName = handlerMatch[1];

      // Remove any DISABLED export
      content = content.replace(/\/\/ DISABLED: export default.*?\n/g, '');

      // Replace final export
      const exportRegex = new RegExp(`export default ${handlerName};`, 'g');
      if (!content.includes('requireAuth')) {
        content = content.replace(
          exportRegex,
          `export default requireAuth([${rolesStr}])(${handlerName});`
        );
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(fix.file, content);
      console.log(`✅ FIXED: ${fix.file}`);
      console.log(`   Auth: [${fix.roles.join(', ')}]`);
      if (fix.needsAgencyFilter) {
        console.log(`   ⚠️  Note: Manually verify agency filtering in queries`);
      }
      fixed++;
    } else {
      console.log(`✅ OK: ${fix.file} (already correct)`);
      skipped++;
    }

  } catch (err) {
    console.log(`❌ ERROR: ${fix.file} - ${err.message}`);
    errors.push({ file: fix.file, error: err.message });
  }
}

console.log('\n' + '='.repeat(80));
console.log(`\n📊 SUMMARY:`);
console.log(`  ✅ Fixed: ${fixed}`);
console.log(`  ✅ Already OK: ${skipped}`);
console.log(`  ❌ Errors: ${errors.length}`);

if (errors.length > 0) {
  console.log('\n❌ ERRORS:');
  errors.forEach(e => console.log(`  - ${e.file}: ${e.error}`));
}

console.log(`\n✅ Authentication fixes complete!\n`);
console.log('📋 NEXT: Manually verify agency filtering in these files:');
fixes.filter(f => f.needsAgencyFilter).forEach(f => {
  console.log(`  - ${f.file}`);
});