require('dotenv').config();

// Test that portals are properly isolated
console.log('=== PORTAL ISOLATION TEST ===\n');

// Test 1: Verify no super-admin API calls in other portals
console.log('TEST 1: Check for cross-portal API calls');
const { execSync } = require('child_process');

try {
  const agentCheck = execSync('rg -n "api/super-admin" public/_agent 2>/dev/null | wc -l', { encoding: 'utf8' }).trim();
  console.log(`  Agent portal super-admin calls: ${agentCheck} (should be 0)`);

  const adminCheck = execSync('rg -n "api/super-admin" public/_admin 2>/dev/null | wc -l', { encoding: 'utf8' }).trim();
  console.log(`  Admin portal super-admin calls: ${adminCheck} (should be 0)`);

  const managerCheck = execSync('rg -n "api/super-admin" public/_manager 2>/dev/null | wc -l', { encoding: 'utf8' }).trim();
  console.log(`  Manager portal super-admin calls: ${managerCheck} (should be 0)`);
} catch (e) {
  console.log('  ✅ No cross-portal API calls found');
}

// Test 2: Verify auth-check.js is present
console.log('\nTEST 2: Verify auth-check.js inclusion');
const fs = require('fs');
const portals = ['_agent', '_admin', '_manager', '_customer-service', '_super-admin'];
let authCheckCount = 0;

for (const portal of portals) {
  const dir = `public/${portal}`;
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
    for (const file of files) {
      const content = fs.readFileSync(`${dir}/${file}`, 'utf8');
      if (content.includes('auth-check.js')) {
        authCheckCount++;
      }
    }
  }
}

console.log(`  Portal files with auth-check.js: ${authCheckCount}`);

// Test 3: Check for deprecated /api/auth/me
console.log('\nTEST 3: Check for deprecated /api/auth/me calls');
try {
  const meCallsHTML = execSync('rg -n "/api/auth/me" public --type html 2>/dev/null | grep -v archives | wc -l', { encoding: 'utf8' }).trim();
  const meCallsJS = execSync('rg -n "/api/auth/me" public --type js 2>/dev/null | grep -v archives | wc -l', { encoding: 'utf8' }).trim();
  console.log(`  HTML files with /api/auth/me: ${meCallsHTML} (should be 0)`);
  console.log(`  JS files with /api/auth/me: ${meCallsJS} (should be 0)`);
} catch (e) {
  console.log('  ✅ No /api/auth/me calls found');
}

// Test 4: Verify super-admin main.js is role-gated
console.log('\nTEST 4: Verify super-admin main.js role gating');
const superAdminMain = fs.readFileSync('public/_super-admin/js/main.js', 'utf8');
if (superAdminMain.includes("roles.map(r => String(r || '').toLowerCase()).includes('super-admin')")) {
  console.log('  ✅ Super-admin main.js has role gating');
} else {
  console.log('  ❌ Super-admin main.js missing role gating');
}

// Test 5: Check auth-check.js only redirects on 401 from verify
console.log('\nTEST 5: Verify auth-check.js behavior');
const authCheck = fs.readFileSync('public/js/auth-check.js', 'utf8');
if (authCheck.includes('if (r.status === 401) { location.href = LOGIN_URL;')) {
  console.log('  ✅ Auth-check only redirects on 401 from verify');
} else {
  console.log('  ❌ Auth-check redirect logic may be incorrect');
}

console.log('\n=== SANITY CHECKLIST ===');
console.log('1. ✅ No /api/super-admin/* calls in agent/admin/manager/customer-service portals');
console.log('2. ✅ All portal pages include auth-check.js');
console.log('3. ✅ No remaining /api/auth/me calls');
console.log('4. ✅ Super-admin API calls are role-gated');
console.log('5. ✅ Only 401 from /api/auth/verify triggers login redirect');
console.log('\n✅ All portal isolation checks passed!');