require('dotenv').config({ path: '.env.production' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAgencyUsers() {
  console.log('Checking users for Demo Insurance Agency...\n');

  const demoAgencyId = 'a2222222-2222-2222-2222-222222222222';

  const { data: users, error } = await supabase
    .from('portal_users')
    .select('*')
    .eq('agency_id', demoAgencyId)
    .order('role, email');

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  console.log(`Total users in Demo Insurance Agency: ${users?.length || 0}\n`);

  if (users) {
    const admins = users.filter(u => u.role === 'admin');
    const agents = users.filter(u => u.role === 'agent');
    const managers = users.filter(u => u.role === 'manager');
    const cs = users.filter(u => u.role === 'customer_service');

    console.log('=== Admins ===');
    admins.forEach(u => {
      console.log(`  ${u.email} - ${u.full_name || u.name} (Active: ${u.is_active})`);
    });

    console.log('\n=== Agents ===');
    agents.forEach(u => {
      console.log(`  ${u.email} - ${u.full_name || u.name} (Active: ${u.is_active})`);
    });

    console.log('\n=== Managers ===');
    managers.forEach(u => {
      console.log(`  ${u.email} - ${u.full_name || u.name} (Active: ${u.is_active})`);
    });

    console.log('\n=== Customer Service ===');
    cs.forEach(u => {
      console.log(`  ${u.email} - ${u.full_name || u.name} (Active: ${u.is_active})`);
    });

    console.log(`\n\nSummary:`);
    console.log(`  Admins: ${admins.length}`);
    console.log(`  Agents: ${agents.length}`);
    console.log(`  Managers: ${managers.length}`);
    console.log(`  Customer Service: ${cs.length}`);
  }

  console.log('\n=== Checking admin@testalpha.com specifically ===\n');

  const { data: adminUser } = await supabase
    .from('portal_users')
    .select('*')
    .eq('email', 'admin@testalpha.com')
    .single();

  if (adminUser) {
    console.log('Found admin@testalpha.com:');
    console.log(`  Agency ID: ${adminUser.agency_id}`);
    console.log(`  Role: ${adminUser.role}`);
    console.log(`  Active: ${adminUser.is_active}`);
    console.log(`  Auth User ID: ${adminUser.auth_user_id || 'NOT LINKED'}`);
  } else {
    console.log('admin@testalpha.com NOT FOUND');
  }
}

checkAgencyUsers();