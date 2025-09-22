// Update agent1@phsagency.com password in Supabase Auth
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateAgentPassword() {
  console.log('\n=== Updating agent1@phsagency.com Password ===\n');

  const email = 'agent1@phsagency.com';
  const newPassword = 'Agent123!'; // Standard test password

  // Find the user
  console.log('1. Finding user in Supabase Auth...');
  const { data: authData, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.log('❌ Error listing users:', listError.message);
    return;
  }

  const authUser = authData?.users?.find(u => u.email === email);

  if (!authUser) {
    console.log('❌ User not found in Supabase Auth');
    console.log('\nCreating user in Supabase Auth...');

    // Get the portal_users record to get necessary info
    const { data: portalUser } = await supabase
      .from('portal_users')
      .select('*')
      .eq('email', email)
      .single();

    if (!portalUser) {
      console.log('❌ User not found in portal_users either');
      return;
    }

    // Create the user in Supabase Auth
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: newPassword,
      email_confirm: true,
      user_metadata: {
        role: portalUser.role,
        agency_id: portalUser.agency_id
      },
      app_metadata: {
        role: portalUser.role,
        agency_id: portalUser.agency_id
      }
    });

    if (createError) {
      console.log('❌ Error creating user:', createError.message);
      return;
    }

    console.log('✅ User created successfully');
    console.log('   ID:', newUser.user.id);

    // Update portal_users with the new auth_user_id
    const { error: updateError } = await supabase
      .from('portal_users')
      .update({ auth_user_id: newUser.user.id })
      .eq('email', email);

    if (updateError) {
      console.log('❌ Error updating portal_users:', updateError.message);
    } else {
      console.log('✅ Updated portal_users with auth_user_id');
    }

    console.log('\n✅ Password set to: Agent123!');
    return;
  }

  console.log('✅ Found user:', authUser.id);

  // Update the password
  console.log('\n2. Updating password...');
  const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
    authUser.id,
    {
      password: newPassword,
      email_confirm: true // Ensure email is confirmed
    }
  );

  if (updateError) {
    console.log('❌ Error updating password:', updateError.message);
    return;
  }

  console.log('✅ Password updated successfully');

  // Test the new password
  console.log('\n3. Testing login with new password...');
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: email,
    password: newPassword
  });

  if (loginError) {
    console.log('❌ Login test failed:', loginError.message);
  } else {
    console.log('✅ Login successful!');
    console.log('   User ID:', loginData.user.id);
    console.log('   Email:', loginData.user.email);
  }

  console.log('\n=== Summary ===');
  console.log('✅ Password has been set to: Agent123!');
  console.log('✅ You can now log in as agent1@phsagency.com');
}

updateAgentPassword().catch(console.error);