require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkStructure() {
  console.log('🔍 CHECKING AGENCIES TABLE STRUCTURE\n');

  const { data: agencies, error } = await supabase
    .from('agencies')
    .select('*')
    .limit(1);

  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }

  if (agencies.length === 0) {
    console.log('⚠️  No agencies found');
    return;
  }

  const agency = agencies[0];

  console.log('📋 Available columns in agencies table:\n');
  Object.keys(agency).forEach(col => {
    console.log(`  - ${col}: ${typeof agency[col]} = ${JSON.stringify(agency[col]).substring(0, 100)}`);
  });

  console.log('\n' + '═'.repeat(80));
  console.log('🔍 CHECKING FOR CONVOSO/API CREDENTIALS COLUMNS:\n');

  const convosoColumns = Object.keys(agency).filter(col =>
    col.toLowerCase().includes('convoso') ||
    col.toLowerCase().includes('api') ||
    col.toLowerCase().includes('credential')
  );

  if (convosoColumns.length > 0) {
    console.log('✅ Found Convoso/API related columns:');
    convosoColumns.forEach(col => {
      console.log(`  - ${col}`);
      console.log(`    Value: ${JSON.stringify(agency[col], null, 2)}`);
    });
  } else {
    console.log('❌ No Convoso/API credential columns found in agencies table');
    console.log('\n💡 Convoso credentials should be stored in one of:');
    console.log('   1. api_credentials column (JSON)');
    console.log('   2. settings column (JSON)');
    console.log('   3. New convoso_credentials column');
    console.log('   4. Separate integrations table');
  }

  // Check if api_credentials is JSON
  if (agency.api_credentials) {
    console.log('\n📦 api_credentials structure:');
    try {
      const parsed = typeof agency.api_credentials === 'string'
        ? JSON.parse(agency.api_credentials)
        : agency.api_credentials;
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('  (Not JSON or empty)');
    }
  }

  // Check if settings is JSON
  if (agency.settings) {
    console.log('\n⚙️  settings structure:');
    try {
      const parsed = typeof agency.settings === 'string'
        ? JSON.parse(agency.settings)
        : agency.settings;
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('  (Not JSON or empty)');
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log('\n💡 TO ADD CONVOSO API CREDENTIALS:\n');
  console.log('Option 1: Update via Supabase Dashboard');
  console.log('   - Go to Table Editor > agencies');
  console.log('   - Find your agency row');
  console.log('   - Update api_credentials column with JSON:');
  console.log('     {');
  console.log('       "convoso": {');
  console.log('         "api_key": "your-api-key",');
  console.log('         "api_secret": "your-secret",');
  console.log('         "account_id": "your-account-id"');
  console.log('       }');
  console.log('     }');
  console.log('\nOption 2: Use SQL');
  console.log(`   UPDATE agencies`);
  console.log(`   SET api_credentials = '{"convoso": {"api_key": "xxx", "api_secret": "yyy"}}'::jsonb`);
  console.log(`   WHERE id = 'your-agency-uuid';`);
  console.log('\nOption 3: Use the settings API');
  console.log('   POST /api/admin/settings');
  console.log('   Body: { "settings_updates": { "integrations": { "convoso_api_key": { "value": "xxx" } } } }');
}

checkStructure();