const fs = require('fs');

console.log('🔧 ADDING AGENCY FILTERING TO APIs\n');
console.log('=' .repeat(80) + '\n');

const fixes = [
  {
    file: 'api/admin/commission-settings.js',
    description: 'Filter commission settings by agency',
    search: /\.from\('commission_settings'\)\s*\.select\([^)]+\)/,
    insert: ".eq('agency_id', req.user.agency_id)"
  },
  {
    file: 'api/admin/leaderboard-settings.js',
    description: 'Filter leaderboard settings by agency',
    location: 'after .from() calls',
    manual: true
  },
  {
    file: 'api/admin/payroll-export.js',
    description: 'Filter payroll data by agency',
    location: 'after .from() calls',
    manual: true
  }
];

let fixed = 0;
let manual = 0;

// For now, let's manually fix the most critical ones
console.log('📝 MANUAL FIXES NEEDED:\n');

console.log('1. api/admin/commission-settings.js');
console.log('   Add: .eq("agency_id", req.user.agency_id) to all queries\n');

console.log('2. api/admin/leaderboard-settings.js');
console.log('   Add: .eq("agency_id", req.user.agency_id) to agencies query\n');

console.log('3. api/admin/payroll-export.js');
console.log('   Add: .eq("agency_id", req.user.agency_id) to commissions query\n');

console.log('4. api/admin/users-with-email.js');
console.log('   Add: agency_id: req.user.agency_id to INSERT operations\n');

console.log('\n' + '=' .repeat(80));
console.log('\n✅ Creating helper function for agency filtering...\n');

// Create a reusable helper
const helperCode = `// Agency Filtering Helper
// Add this to your API files

function applyAgencyFilter(query, req, tableName = null) {
  // Super admins see everything
  if (req.user.role === 'super-admin' || req.user.role === 'super_admin') {
    return query;
  }

  // Everyone else filtered by their agency
  return query.eq('agency_id', req.user.agency_id);
}

// Usage:
// let query = supabase.from('portal_users').select('*');
// query = applyAgencyFilter(query, req);
// const { data } = await query;
`;

fs.writeFileSync('api/_utils/agency-filter-helper.js', helperCode);
console.log('✅ Created: api/_utils/agency-filter-helper.js\n');

console.log('=' .repeat(80));
console.log('\n📋 NEXT STEPS:\n');
console.log('I\'ll now fix each API file individually with the correct filtering.\n');

module.exports = { fixes };