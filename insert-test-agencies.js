require('dotenv').config({ path: '.env.production' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function insertTestAgencies() {
  console.log('Inserting test agencies for orphaned users...\n');

  const agencies = [
    {
      id: 'test-agency-001',
      name: 'Test Agency Alpha',
      code: 'ALPHA01',
      admin_email: 'admin@testalpha.com',
      contact_email: 'admin@testalpha.com',
      subscription_plan: 'professional',
      subscription_status: 'active',
      monthly_fee: 149,
      user_limit: 50,
      storage_limit_gb: 500,
      api_calls_limit: 1000000,
      next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'test-agency-002',
      name: 'Test Agency Beta',
      code: 'BETA01',
      admin_email: 'admin@testbeta.com',
      contact_email: 'admin@testbeta.com',
      subscription_plan: 'professional',
      subscription_status: 'active',
      monthly_fee: 149,
      user_limit: 50,
      storage_limit_gb: 500,
      api_calls_limit: 1000000,
      next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  try {
    for (const agency of agencies) {
      console.log(`Inserting: ${agency.name} (${agency.id})...`);

      const { data, error } = await supabase
        .from('agencies')
        .insert(agency)
        .select()
        .single();

      if (error) {
        console.log(`  ✗ Error:`, error.message);
      } else {
        console.log(`  ✓ Success`);
        console.log(`    - ID: ${data.id}`);
        console.log(`    - Code: ${data.code}`);
        console.log(`    - Plan: ${data.subscription_plan} ($${data.monthly_fee}/mo)`);
      }
    }

    console.log('\n=== Verification ===\n');

    const { data: users } = await supabase
      .from('portal_users')
      .select('email, role, agency_id')
      .in('agency_id', ['test-agency-001', 'test-agency-002'])
      .order('agency_id, role');

    if (users) {
      console.log(`Users linked to test agencies: ${users.length}\n`);

      const alpha = users.filter(u => u.agency_id === 'test-agency-001');
      const beta = users.filter(u => u.agency_id === 'test-agency-002');

      console.log('Test Agency Alpha:');
      alpha.forEach(u => console.log(`  - ${u.email} (${u.role})`));

      console.log('\nTest Agency Beta:');
      beta.forEach(u => console.log(`  - ${u.email} (${u.role})`));
    }

    console.log('\n✅ Test agencies created successfully!\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

insertTestAgencies();