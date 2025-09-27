require('dotenv').config({ path: '.env.production' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUsers() {
  const testEmails = [
    'manager@testalpha.com',
    'cs@testalpha.com',
    'manager@testbeta.com',
    'cs@testbeta.com'
  ];

  console.log('=== Checking portal_users table ===\n');

  for (const email of testEmails) {
    const { data: portalUser, error: portalError } = await supabase
      .from('portal_users')
      .select('*')
      .eq('email', email)
      .single();

    if (portalError) {
      console.log(`X ${email}: NOT FOUND in portal_users`);
    } else {
      console.log(`✓ ${email}:`);
      console.log(`  - ID: ${portalUser.id}`);
      console.log(`  - Role: ${portalUser.role}`);
      console.log(`  - Roles array: ${JSON.stringify(portalUser.roles)}`);
      console.log(`  - Agency: ${portalUser.agency_id}`);
      console.log(`  - Auth User ID: ${portalUser.auth_user_id || 'NOT LINKED'}`);
      console.log(`  - Active: ${portalUser.is_active}`);
    }
    console.log('');
  }

  console.log('\n=== Checking Supabase Auth ===\n');

  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

  if (!authError && authData) {
    for (const email of testEmails) {
      const authUser = authData.users.find(u => u.email === email);
      if (authUser) {
        console.log(`✓ ${email} EXISTS in Supabase Auth`);
        console.log(`  - Auth ID: ${authUser.id}`);
        console.log(`  - Confirmed: ${authUser.email_confirmed_at ? 'YES' : 'NO'}`);
      } else {
        console.log(`X ${email}: NOT in Supabase Auth`);
      }
    }
  }

  console.log('\n=== Checking agency_id values ===\n');

  const { data: portalUsers } = await supabase
    .from('portal_users')
    .select('email, agency_id, role')
    .in('email', testEmails);

  if (portalUsers) {
    console.log('Found users with agencies:');
    portalUsers.forEach(u => {
      console.log(`  ${u.email} → agency_id: ${u.agency_id} (role: ${u.role})`);
    });
  }

  console.log('\n=== All Agencies ===\n');

  const { data: agencies } = await supabase
    .from('agencies')
    .select('id, name, code');

  if (agencies) {
    agencies.forEach(a => {
      console.log(`  ${a.name}`);
      console.log(`    ID: ${a.id}`);
      console.log(`    Code: ${a.code || 'N/A'}`);
    });
  }

  console.log('\n=== Summary ===\n');

  const { data: allPortalUsers } = await supabase
    .from('portal_users')
    .select('id, email, role, agency_id, auth_user_id, is_active')
    .order('created_at', { ascending: false });

  if (allPortalUsers) {
    console.log(`Total users in portal_users: ${allPortalUsers.length}`);
    console.log(`  - With auth_user_id: ${allPortalUsers.filter(u => u.auth_user_id).length}`);
    console.log(`  - Without auth_user_id: ${allPortalUsers.filter(u => !u.auth_user_id).length}`);
    console.log(`  - Active: ${allPortalUsers.filter(u => u.is_active).length}`);

    const managerCount = allPortalUsers.filter(u => u.role === 'manager').length;
    const csCount = allPortalUsers.filter(u => u.role === 'customer_service').length;
    console.log(`  - Managers: ${managerCount}`);
    console.log(`  - Customer Service: ${csCount}`);
  }
}

checkUsers();