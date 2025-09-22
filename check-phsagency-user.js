// Check if admin@phsagency.com exists in portal_users table
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUser() {
  console.log('\n=== Checking admin@phsagency.com in Database ===\n');

  // 1. Check Supabase Auth
  console.log('1. Checking Supabase Auth...');
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });

  if (authError) {
    console.error('Auth check error:', authError);
  } else {
    const phsUser = authData.users.find(u => u.email === 'admin@phsagency.com');
    if (phsUser) {
      console.log('✅ Found in Supabase Auth');
      console.log('   ID:', phsUser.id);
      console.log('   Email:', phsUser.email);
      console.log('   Role (app_metadata):', phsUser.app_metadata?.role);
      console.log('   Role (user_metadata):', phsUser.user_metadata?.role);
      console.log('   Agency ID (app_metadata):', phsUser.app_metadata?.agency_id);
      console.log('   Agency ID (user_metadata):', phsUser.user_metadata?.agency_id);
      console.log('   Full app_metadata:', JSON.stringify(phsUser.app_metadata, null, 2));
      console.log('   Full user_metadata:', JSON.stringify(phsUser.user_metadata, null, 2));
    } else {
      console.log('❌ NOT found in Supabase Auth');
    }
  }

  // 2. Check portal_users table
  console.log('\n2. Checking portal_users table...');

  // First, let's see what columns exist in portal_users
  const { data: columns, error: columnsError } = await supabase
    .from('portal_users')
    .select('*')
    .limit(1);

  if (columns && columns.length > 0) {
    console.log('   Columns in portal_users:', Object.keys(columns[0]));
  }

  // Try different ways to find the user
  console.log('\n   a) Search by email...');
  const { data: byEmail, error: emailError } = await supabase
    .from('portal_users')
    .select('*')
    .eq('email', 'admin@phsagency.com');

  if (emailError) {
    console.log('   Error searching by email:', emailError.message);
  } else if (byEmail && byEmail.length > 0) {
    console.log('   ✅ Found by email:', byEmail.length, 'record(s)');
    byEmail.forEach((user, i) => {
      console.log(`   Record ${i + 1}:`, JSON.stringify(user, null, 2));
    });
  } else {
    console.log('   ❌ NOT found by email');
  }

  // Try by auth_user_id
  console.log('\n   b) Search by auth_user_id (if we have it from auth)...');
  const { data: authUsers } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });

  const authUser = authUsers?.users.find(u => u.email === 'admin@phsagency.com');
  if (authUser) {
    const { data: byAuthId, error: authIdError } = await supabase
      .from('portal_users')
      .select('*')
      .eq('auth_user_id', authUser.id);

    if (authIdError) {
      console.log('   Error searching by auth_user_id:', authIdError.message);
    } else if (byAuthId && byAuthId.length > 0) {
      console.log('   ✅ Found by auth_user_id:', byAuthId.length, 'record(s)');
      byAuthId.forEach((user, i) => {
        console.log(`   Record ${i + 1}:`, JSON.stringify(user, null, 2));
      });
    } else {
      console.log('   ❌ NOT found by auth_user_id:', authUser.id);
    }
  }

  // Check users table too (different from portal_users)
  console.log('\n3. Checking users table (if different from portal_users)...');
  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'admin@phsagency.com');

  if (usersError) {
    console.log('   Error checking users table:', usersError.message);
  } else if (usersData && usersData.length > 0) {
    console.log('   ✅ Found in users table:', usersData.length, 'record(s)');
    usersData.forEach((user, i) => {
      console.log(`   Record ${i + 1}:`, JSON.stringify(user, null, 2));
    });
  } else {
    console.log('   ❌ NOT found in users table');
  }

  // List all users with 'admin' role to see what we have
  console.log('\n4. Listing ALL admin users in portal_users...');
  const { data: adminUsers, error: adminError } = await supabase
    .from('portal_users')
    .select('id, email, full_name, role, agency_id, auth_user_id, is_active')
    .eq('role', 'admin');

  if (adminError) {
    console.log('   Error listing admins:', adminError.message);
  } else if (adminUsers && adminUsers.length > 0) {
    console.log('   Found', adminUsers.length, 'admin user(s):');
    adminUsers.forEach((user, i) => {
      console.log(`   ${i + 1}. Email: ${user.email}, Name: ${user.full_name}, Agency: ${user.agency_id}, Active: ${user.is_active}`);
    });
  } else {
    console.log('   No admin users found');
  }

  // Check if there's a user with PHS001 agency
  console.log('\n5. Checking for users in PHS001 agency...');
  const { data: phsUsers, error: phsError } = await supabase
    .from('portal_users')
    .select('id, email, full_name, role, agency_id, is_active')
    .eq('agency_id', 'PHS001');

  if (phsError) {
    console.log('   Error checking PHS001 users:', phsError.message);
  } else if (phsUsers && phsUsers.length > 0) {
    console.log('   Found', phsUsers.length, 'user(s) in PHS001:');
    phsUsers.forEach((user, i) => {
      console.log(`   ${i + 1}. Email: ${user.email}, Role: ${user.role}, Name: ${user.full_name}`);
    });
  } else {
    console.log('   No users found in PHS001 agency');
  }
}

checkUser().catch(console.error);