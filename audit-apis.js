const fs = require('fs');
const path = require('path');

console.log('🔍 COMPREHENSIVE API AUDIT\n');
console.log('=' .repeat(80) + '\n');

const apiDir = './api';
const issues = {
  noAuth: [],
  noAgencyFilter: [],
  hasAgencyFilter: [],
  superAdminOnly: [],
  needsWork: []
};

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory() && !entry.name.startsWith('_')) {
      scanDirectory(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      analyzeFile(fullPath);
    }
  }
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = filePath.replace(/\\/g, '/');

  // Skip middleware and utils
  if (relativePath.includes('/_middleware/') || relativePath.includes('/_utils/')) {
    return;
  }

  const hasDisabledAuth = content.includes('// DISABLED:');
  const hasRequireAuth = content.includes('requireAuth(');
  const hasAgencyFilter = content.includes(".eq('agency_id'");
  const hasPortalUsers = content.includes(".from('portal_users')");
  const hasSuperAdminCheck = content.includes("'super-admin'") || content.includes("'super_admin'");
  const isGetRequest = content.includes("req.method === 'GET'");
  const queriesData = content.includes('.select(') && isGetRequest;

  const result = {
    path: relativePath,
    hasAuth: hasRequireAuth && !hasDisabledAuth,
    hasAgencyFilter,
    hasPortalUsers,
    hasSuperAdminCheck,
    queriesData
  };

  // Categorize
  if (hasDisabledAuth) {
    issues.noAuth.push(result);
  } else if (hasSuperAdminCheck) {
    issues.superAdminOnly.push(result);
  } else if (queriesData && hasPortalUsers && !hasAgencyFilter) {
    issues.noAgencyFilter.push(result);
  } else if (hasAgencyFilter) {
    issues.hasAgencyFilter.push(result);
  } else if (queriesData && !result.hasAuth) {
    issues.needsWork.push(result);
  }
}

scanDirectory(apiDir);

console.log('📊 SUMMARY:\n');
console.log(`Total APIs Scanned: ${
  issues.noAuth.length +
  issues.noAgencyFilter.length +
  issues.hasAgencyFilter.length +
  issues.superAdminOnly.length +
  issues.needsWork.length
}`);
console.log(`✅ Properly Filtered: ${issues.hasAgencyFilter.length}`);
console.log(`⚠️  Super Admin Only: ${issues.superAdminOnly.length}`);
console.log(`🚨 CRITICAL - No Auth: ${issues.noAuth.length}`);
console.log(`🚨 CRITICAL - No Agency Filter: ${issues.noAgencyFilter.length}`);
console.log(`⚠️  Needs Review: ${issues.needsWork.length}`);

console.log('\n' + '=' .repeat(80));
console.log('\n🚨 CRITICAL ISSUES - NO AUTHENTICATION:\n');
issues.noAuth.slice(0, 10).forEach((item, i) => {
  console.log(`${i + 1}. ${item.path}`);
});
if (issues.noAuth.length > 10) {
  console.log(`   ... and ${issues.noAuth.length - 10} more`);
}

console.log('\n' + '=' .repeat(80));
console.log('\n🚨 CRITICAL ISSUES - NO AGENCY FILTERING:\n');
issues.noAgencyFilter.slice(0, 15).forEach((item, i) => {
  console.log(`${i + 1}. ${item.path}`);
});
if (issues.noAgencyFilter.length > 15) {
  console.log(`   ... and ${issues.noAgencyFilter.length - 15} more`);
}

console.log('\n' + '=' .repeat(80));
console.log('\n✅ WORKING CORRECTLY (with agency filtering):\n');
issues.hasAgencyFilter.slice(0, 10).forEach((item, i) => {
  console.log(`${i + 1}. ${item.path}`);
});
if (issues.hasAgencyFilter.length > 10) {
  console.log(`   ... and ${issues.hasAgencyFilter.length - 10} more`);
}

console.log('\n' + '=' .repeat(80));
console.log('\n⚠️  SUPER ADMIN ONLY (correct - sees all agencies):\n');
issues.superAdminOnly.slice(0, 10).forEach((item, i) => {
  console.log(`${i + 1}. ${item.path}`);
});
if (issues.superAdminOnly.length > 10) {
  console.log(`   ... and ${issues.superAdminOnly.length - 10} more`);
}

// Generate priority fix list
console.log('\n' + '=' .repeat(80));
console.log('\n🎯 PRIORITY FIX LIST:\n');

console.log('PRIORITY 1 - Re-enable Auth (41 files):');
console.log('  These have auth completely disabled with // DISABLED: comments');
console.log('  Fix: Remove // DISABLED: and wrap with requireAuth()');
console.log('  Files: api/admin/agents.js, api/admin/analytics.js, etc.\n');

console.log('PRIORITY 2 - Add Agency Filtering (estimated 20-30 files):');
console.log('  These query portal_users but don\'t filter by agency_id');
console.log('  Fix: Add .eq("agency_id", req.user.agency_id)');
issues.noAgencyFilter.slice(0, 5).forEach((item, i) => {
  console.log(`  ${i + 1}. ${item.path}`);
});
console.log('  ... etc.\n');

console.log('PRIORITY 3 - Frontend Data Loading:');
console.log('  Fix dashboard hardcoded $0 values');
console.log('  Connect to real API endpoints');
console.log('  Files: public/_admin/index.html, public/_agent/index.html, etc.\n');

console.log('PRIORITY 4 - Create Missing APIs:');
console.log('  api/quotes/index.js - Quote creation/retrieval');
console.log('  api/sales/index.js - Sales recording');
console.log('  api/agent/commissions.js - Commission statements\n');

console.log('\n' + '=' .repeat(80));
console.log('\n💾 Saving detailed report to api-audit-report.json...\n');

fs.writeFileSync('api-audit-report.json', JSON.stringify(issues, null, 2));
console.log('✅ Report saved!\n');