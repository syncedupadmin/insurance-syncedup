require('dotenv').config({ path: '.env.production' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function reassignTestUsers() {
  console.log('Reassigning test users to existing agencies...\n');

  const { data: agencies } = await supabase
    .from('agencies')
    .select('id, name, code')
    .order('created_at', { ascending: true });

  if (!agencies || agencies.length < 2) {
    console.log('Not enough agencies to reassign users');
    return;
  }

  console.log('Available agencies:');
  agencies.forEach((a, i) => {
    console.log(`  ${i + 1}. ${a.name} (${a.id}) - Code: ${a.code}`);
  });

  const demoAgency = agencies.find(a => a.code === 'DEMO001');
  const platinumAgency = agencies.find(a => a.code === 'PHS001');

  if (!demoAgency || !platinumAgency) {
    console.log('\nCould not find Demo or Platinum agencies');
    return;
  }

  console.log(`\nReassigning test-agency-001 users to: ${demoAgency.name}`);
  console.log(`Reassigning test-agency-002 users to: ${platinumAgency.name}\n`);

  const mappings = [
    { oldId: 'test-agency-001', newId: demoAgency.id, newName: demoAgency.name },
    { oldId: 'test-agency-002', newId: platinumAgency.id, newName: platinumAgency.name }
  ];

  for (const mapping of mappings) {
    const { data: users } = await supabase
      .from('portal_users')
      .select('id, email, role')
      .eq('agency_id', mapping.oldId);

    if (!users || users.length === 0) {
      console.log(`No users found for ${mapping.oldId}`);
      continue;
    }

    console.log(`Found ${users.length} users with agency_id = '${mapping.oldId}':`);
    users.forEach(u => console.log(`  - ${u.email} (${u.role})`));

    const { data, error } = await supabase
      .from('portal_users')
      .update({ agency_id: mapping.newId })
      .eq('agency_id', mapping.oldId)
      .select('id, email');

    if (error) {
      console.log(`  ✗ Error updating users:`, error.message);
    } else {
      console.log(`  ✓ Successfully reassigned ${data.length} users to ${mapping.newName}\n`);
    }
  }

  console.log('=== Verification ===\n');

  const { data: allUsers } = await supabase
    .from('portal_users')
    .select('email, role, agency_id')
    .in('email', [
      'manager@testalpha.com',
      'cs@testalpha.com',
      'manager@testbeta.com',
      'cs@testbeta.com'
    ]);

  if (allUsers) {
    console.log('Test users now assigned to:');
    for (const user of allUsers) {
      const agency = agencies.find(a => a.id === user.agency_id);
      console.log(`  ${user.email} → ${agency ? agency.name : user.agency_id}`);
    }
  }

  console.log('\n✅ User reassignment complete!\n');
}

reassignTestUsers();