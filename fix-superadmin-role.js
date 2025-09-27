require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixSuperAdminRole() {
  console.log('🔧 Fixing super admin role...\n');

  // Fix the roles array
  const { data, error } = await supabase
    .from('portal_users')
    .update({
      roles: ['super-admin']  // Fix the roles array
    })
    .eq('email', 'admin@syncedupsolutions.com')
    .select();

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log('✅ Updated super admin user:');
  console.log(JSON.stringify(data[0], null, 2));

  // Verify the fix
  const { data: verified } = await supabase
    .from('portal_users')
    .select('email, role, roles, agency_id')
    .eq('email', 'admin@syncedupsolutions.com')
    .single();

  console.log('\n✅ Verification:');
  console.log('  Email:', verified.email);
  console.log('  Role:', verified.role);
  console.log('  Roles array:', JSON.stringify(verified.roles));
  console.log('  Agency ID:', verified.agency_id);
  console.log('\n✅ Now try logging in - should redirect to /super-admin');
}

fixSuperAdminRole();