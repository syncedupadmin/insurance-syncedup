// Verify agent1@phsagency.com authentication setup
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyAgentAuth() {
  console.log('\n=== Verifying agent1@phsagency.com Authentication ===\n');

  // Check portal_users
  console.log('1. Checking portal_users table...');
  const { data: portalUser, error: portalError } = await supabase
    .from('portal_users')
    .select('*')
    .eq('email', 'agent1@phsagency.com')
    .single();

  if (portalError) {
    console.log('❌ Error checking portal_users:', portalError.message);
    return;
  }

  if (portalUser) {
    console.log('✅ Found in portal_users:');
    console.log('   ID:', portalUser.id);
    console.log('   Email:', portalUser.email);
    console.log('   Role:', portalUser.role);
    console.log('   Agency ID:', portalUser.agency_id);
    console.log('   Auth User ID:', portalUser.auth_user_id || 'NULL ❌');
    console.log('   Active:', portalUser.is_active);
  }

  // Check Supabase Auth
  console.log('\n2. Checking Supabase Auth...');
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.log('❌ Error checking Supabase Auth:', authError.message);
    return;
  }

  const authUser = authData?.users?.find(u => u.email === 'agent1@phsagency.com');

  if (authUser) {
    console.log('✅ Found in Supabase Auth:');
    console.log('   ID:', authUser.id);
    console.log('   Email:', authUser.email);
    console.log('   Created:', authUser.created_at);
    console.log('   Last Sign In:', authUser.last_sign_in_at);
  } else {
    console.log('❌ NOT found in Supabase Auth!');
  }

  // Verify linkage
  console.log('\n3. Verifying linkage...');
  if (portalUser && authUser) {
    if (portalUser.auth_user_id === authUser.id) {
      console.log('✅ CORRECTLY LINKED! auth_user_id matches Supabase Auth ID');
    } else {
      console.log('❌ MISMATCH!');
      console.log('   portal_users.auth_user_id:', portalUser.auth_user_id);
      console.log('   Supabase Auth ID:', authUser.id);
    }
  }

  // Test authentication flow
  console.log('\n4. Testing authentication with correct password...');
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: 'agent1@phsagency.com',
    password: 'Agent123!' // Using the standard test password
  });

  if (loginError) {
    console.log('❌ Login failed:', loginError.message);
    console.log('   You may need to set/reset the password in Supabase Auth');
  } else {
    console.log('✅ Login successful!');
    console.log('   Access Token received');
    console.log('   User ID:', loginData.user.id);
  }

  console.log('\n=== Summary ===');
  if (portalUser?.auth_user_id && authUser && portalUser.auth_user_id === authUser.id) {
    console.log('✅ agent1@phsagency.com is properly configured');
    console.log('✅ Portal pages should now be accessible');
  } else {
    console.log('⚠️  Configuration issues detected');
    if (!portalUser?.auth_user_id) {
      console.log('   - auth_user_id is still NULL in portal_users');
    }
    if (!authUser) {
      console.log('   - User not found in Supabase Auth');
    }
  }
}

verifyAgentAuth().catch(console.error);