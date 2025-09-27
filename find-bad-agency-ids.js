require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findBadAgencyIds() {
  console.log('🔍 SEARCHING FOR NON-UUID AGENCY_IDs\n');

  try {
    // Check portal_users
    console.log('1️⃣ Checking portal_users table...\n');
    const { data: users, error: usersError } = await supabase
      .from('portal_users')
      .select('id, email, role, agency_id');

    if (usersError) {
      console.log('❌ Error:', usersError.message);
      return;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const badUsers = users.filter(u => u.agency_id && !uuidRegex.test(u.agency_id));

    if (badUsers.length > 0) {
      console.log(`❌ Found ${badUsers.length} users with non-UUID agency_id:\n`);
      badUsers.forEach(u => {
        console.log(`  Email: ${u.email}`);
        console.log(`  Role: ${u.role}`);
        console.log(`  agency_id: "${u.agency_id}" ⚠️\n`);
      });

      console.log('\n💡 SOLUTION: These users need their agency_id updated to a valid UUID');
      console.log('   Run: node fix-bad-agency-ids.js');
    } else {
      console.log('✅ All portal_users have valid UUID agency_ids');
    }

    // Check if test-agency-001 exists in agencies table
    console.log('\n2️⃣ Checking if "test-agency-001" exists in agencies table...\n');
    const { data: testAgency, error: testError } = await supabase
      .from('agencies')
      .select('*')
      .eq('id', 'test-agency-001')
      .single();

    if (testError && !testError.message.includes('0 rows')) {
      console.log('❌ Error:', testError.message);
    } else if (testAgency) {
      console.log('⚠️  Found test-agency-001 in agencies table!');
      console.log('   Name:', testAgency.name);
      console.log('   This is a string ID, not a UUID\n');
    } else {
      console.log('✅ "test-agency-001" does NOT exist in agencies table');
    }

    // List all agency IDs
    console.log('\n3️⃣ All agency IDs in database:\n');
    const { data: agencies } = await supabase
      .from('agencies')
      .select('id, name, code');

    agencies?.forEach(a => {
      const isUUID = uuidRegex.test(a.id);
      const icon = isUUID ? '✅' : '❌';
      console.log(`${icon} ${a.name}`);
      console.log(`   ID: ${a.id}`);
      console.log(`   Code: ${a.code}\n`);
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

findBadAgencyIds();