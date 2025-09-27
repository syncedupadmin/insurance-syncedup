require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugSchema() {
  console.log('🔍 DEBUGGING SUPABASE SCHEMA ISSUES\n');
  console.log('Environment Check:');
  console.log('- URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Missing');
  console.log('- Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ Set' : '✗ Missing');
  console.log('\n' + '='.repeat(80) + '\n');

  try {
    // 1. Check agencies table structure
    console.log('1️⃣ AGENCIES TABLE STRUCTURE:');
    const { data: agencies, error: agenciesError } = await supabase
      .from('agencies')
      .select('*')
      .limit(5);

    if (agenciesError) {
      console.log('❌ Error:', agenciesError.message);
    } else {
      console.log(`✅ Found ${agencies.length} agencies`);
      if (agencies.length > 0) {
        console.log('\nSample Agency:');
        const sample = agencies[0];
        console.log('Columns:', Object.keys(sample).join(', '));
        console.log('\nFirst agency:');
        console.log('- ID:', sample.id, '(type:', typeof sample.id, ')');
        console.log('- Name:', sample.name);
        console.log('- Code:', sample.code);
        console.log('\nAll agencies:');
        agencies.forEach(a => {
          console.log(`  - ${a.name} (id: ${a.id}, code: ${a.code})`);
        });
      }
    }
    console.log('\n' + '='.repeat(80) + '\n');

    // 2. Check portal_users table and their agency_id types
    console.log('2️⃣ PORTAL_USERS TABLE & AGENCY_ID:');
    const { data: users, error: usersError } = await supabase
      .from('portal_users')
      .select('id, email, role, agency_id')
      .limit(10);

    if (usersError) {
      console.log('❌ Error:', usersError.message);
    } else {
      console.log(`✅ Found ${users.length} users`);
      console.log('\nUser agency_id values and types:');
      users.forEach(u => {
        console.log(`- ${u.email}`);
        console.log(`  Role: ${u.role}`);
        console.log(`  agency_id: ${u.agency_id} (type: ${typeof u.agency_id})`);
        console.log(`  Is UUID format: ${isUUID(u.agency_id)}`);
      });
    }
    console.log('\n' + '='.repeat(80) + '\n');

    // 3. Check leads table structure
    console.log('3️⃣ LEADS TABLE STRUCTURE:');
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .limit(3);

    if (leadsError) {
      if (leadsError.message?.includes('does not exist')) {
        console.log('⚠️  Leads table does not exist yet');
      } else {
        console.log('❌ Error:', leadsError.message);
      }
    } else {
      console.log(`✅ Found ${leads.length} leads`);
      if (leads.length > 0) {
        const sample = leads[0];
        console.log('\nColumns:', Object.keys(sample).join(', '));
        console.log('\nSample lead agency_id:');
        console.log('- Value:', sample.agency_id);
        console.log('- Type:', typeof sample.agency_id);
        console.log('- Is UUID:', isUUID(sample.agency_id));
      }
    }
    console.log('\n' + '='.repeat(80) + '\n');

    // 4. Check for agency_id mismatches
    console.log('4️⃣ CHECKING FOR AGENCY_ID MISMATCHES:');

    // Get all unique agency IDs from portal_users
    const userAgencyIds = [...new Set(users?.map(u => u.agency_id).filter(Boolean))];
    console.log('\nUnique agency_ids in portal_users:');
    userAgencyIds.forEach(id => {
      const isUuid = isUUID(id);
      console.log(`  ${id} - ${isUuid ? '✅ UUID' : '❌ STRING'}`);

      // Check if this ID exists in agencies table
      const matchingAgency = agencies?.find(a => a.id === id || a.code === id);
      if (matchingAgency) {
        console.log(`    ✅ Matches agency: ${matchingAgency.name}`);
      } else {
        console.log(`    ⚠️  No matching agency found!`);
      }
    });

    console.log('\n' + '='.repeat(80) + '\n');

    // 5. Get table column info from information_schema
    console.log('5️⃣ DATABASE COLUMN TYPES (from information_schema):');

    const tables = ['agencies', 'portal_users', 'leads'];
    for (const table of tables) {
      console.log(`\n${table.toUpperCase()}:`);
      const { data: columns, error: colError } = await supabase
        .rpc('exec_sql', {
          query: `
            SELECT column_name, data_type, udt_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = '${table}'
            AND column_name IN ('id', 'agency_id')
            ORDER BY column_name
          `
        });

      if (colError) {
        // Try direct query instead
        console.log('  (RPC not available, checking via direct query)');
      } else if (columns) {
        columns.forEach(col => {
          console.log(`  ${col.column_name}: ${col.data_type} (${col.udt_name})`);
        });
      }
    }

    console.log('\n' + '='.repeat(80) + '\n');

    // 6. RECOMMENDATIONS
    console.log('6️⃣ DIAGNOSIS & RECOMMENDATIONS:\n');

    const nonUuidAgencyIds = userAgencyIds.filter(id => !isUUID(id));
    if (nonUuidAgencyIds.length > 0) {
      console.log('⚠️  PROBLEM FOUND:');
      console.log(`   ${nonUuidAgencyIds.length} users have non-UUID agency_ids: ${nonUuidAgencyIds.join(', ')}`);
      console.log('\n💡 SOLUTIONS:');
      console.log('   Option 1: Update portal_users to use actual UUID agency_ids');
      console.log('   Option 2: Change agencies.id column type to TEXT');
      console.log('   Option 3: Add a migration script to fix the data\n');
      console.log('   Run: node fix-agency-ids.js');
    } else {
      console.log('✅ All agency_ids appear to be valid UUIDs');
    }

  } catch (error) {
    console.error('\n❌ UNEXPECTED ERROR:', error.message);
    console.error('Stack:', error.stack);
  }
}

function isUUID(str) {
  if (!str || typeof str !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

debugSchema();