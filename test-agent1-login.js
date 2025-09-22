require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAgent1() {
  console.log('=== Testing agent1@phsagency.com Authentication ===\n');

  // Get agent1's portal user record
  const { data: portalUser, error } = await supabase
    .from('portal_users')
    .select('*')
    .eq('email', 'agent1@phsagency.com')
    .single();

  if (error) {
    console.error('Error fetching portal user:', error.message);
    return;
  }

  console.log('Portal User Record:');
  console.log('  ID:', portalUser.id);
  console.log('  Email:', portalUser.email);
  console.log('  Auth User ID:', portalUser.auth_user_id);
  console.log('  Role:', portalUser.role);
  console.log('  Roles:', portalUser.roles);
  console.log('  Agency ID:', portalUser.agency_id);
  console.log('  Is Active:', portalUser.is_active);

  // Simulate the login normalization logic
  const ALLOWED = new Set(['super-admin','admin','manager','customer-service','agent']);
  const norm = v => String(v||'').trim().toLowerCase().replace(/_/g,'-').replace(/\s+/g,'-');

  const portalRoles = (Array.isArray(portalUser.roles) && portalUser.roles.length ? portalUser.roles : [portalUser.role])
    .map(norm)
    .filter(r => ALLOWED.has(r));

  if (portalRoles.length === 0) {
    portalRoles.push('agent');
  }

  const primary = portalRoles[0];
  const has = r => portalRoles.includes(r);

  const redirectPath = has('super-admin') ? '/super-admin'
                    : has('admin')        ? '/admin'
                    : has('manager')      ? '/manager'
                    : has('customer-service') ? '/customer-service'
                    : '/agent';

  console.log('\n[LOGIN] role sources (simulated):');
  console.log('  requestedEmail: agent1@phsagency.com');
  console.log('  supaUserId:', portalUser.auth_user_id);
  console.log('  portalEmail:', portalUser.email);
  console.log('  portalRoles:', portalRoles);
  console.log('  primary:', primary);
  console.log('  redirectPath:', redirectPath);

  console.log('\n✅ Expected behavior:');
  console.log('  - agent1 should redirect to /agent');
  console.log('  - NOT to /super-admin or /admin');
  console.log('  - Actual result:', redirectPath === '/agent' ? '✅ CORRECT' : '❌ INCORRECT');
}

testAgent1().catch(console.error);