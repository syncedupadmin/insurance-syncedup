require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  // Test the logic for agent1
  const authUserId = '80259a7f-0446-4d50-8d10-06e060252b47';

  const { data: pu } = await supabase
    .from('portal_users')
    .select('id, email, role, roles, agency_id')
    .eq('auth_user_id', authUserId)
    .single();

  if (!pu) {
    console.log('No portal user found');
    return;
  }

  const ALLOWED = new Set(['super-admin','admin','manager','customer-service','agent']);
  const norm = v => String(v||'').trim().toLowerCase().replace(/_/g,'-').replace(/\s+/g,'-');

  const roles = (Array.isArray(pu.roles) && pu.roles.length ? pu.roles : [pu.role])
    .map(norm)
    .filter(r => ALLOWED.has(r));

  if (roles.length === 0) {
    roles.push('agent');
  }

  const has = r => roles.includes(r);

  const redirectPath = has('super-admin') ? '/super-admin'
                    : has('admin')        ? '/admin'
                    : has('manager')      ? '/manager'
                    : has('customer-service') ? '/customer-service'
                    : '/agent';

  console.log('Portal User:', {
    id: pu.id,
    email: pu.email,
    rawRole: pu.role,
    rawRoles: pu.roles,
    normalizedRoles: roles,
    primaryRole: roles[0],
    redirectPath: redirectPath
  });
})();