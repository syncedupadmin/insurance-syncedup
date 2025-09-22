require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { getRolePortalPath } = require('./lib/role-normalizer.js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  // Simulate login for agent1
  const email = 'agent1@phsagency.com';

  // Get the auth user
  const { data: users } = await supabase.auth.admin.listUsers();
  const supaUser = users.users.find(u => u.email === email);

  if (!supaUser) {
    console.log('User not found in Supabase Auth');
    return;
  }

  // Look up by auth_user_id
  const { data: pu } = await supabase
    .from('portal_users')
    .select('id, email, role, roles, agency_id, auth_user_id')
    .eq('auth_user_id', supaUser.id)
    .single();

  // Extract roles
  const portalRole = (pu?.role || '').toString();
  const portalRoles = Array.isArray(pu?.roles) ? pu.roles : [portalRole].filter(Boolean);
  const supaRole = (supaUser?.app_metadata?.role || supaUser?.user_metadata?.role || '').toString();

  console.log('[LOGIN SIMULATION] Role sources:');
  console.log('  Supabase Auth ID:', supaUser.id);
  console.log('  Portal User auth_user_id:', pu?.auth_user_id);
  console.log('  Portal Role:', portalRole);
  console.log('  Portal Roles Array:', portalRoles);
  console.log('  Supa Metadata Role:', supaRole);
  console.log('  Found Portal User:', !!pu);

  const actualRole = portalRole || supaRole || 'agent';
  const redirectPath = getRolePortalPath(actualRole);

  console.log('\n[DECISION]:');
  console.log('  Actual Role:', actualRole);
  console.log('  Redirect Path:', redirectPath);
  console.log('  Decision:', portalRole ? 'using_portal_role' : (supaRole ? 'using_supa_role' : 'using_default'));
})();