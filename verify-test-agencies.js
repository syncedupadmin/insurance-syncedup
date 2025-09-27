require('dotenv').config({ path: '.env.production' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyTestAgencies() {
  console.log('Checking for test agencies in database...\n');

  const { data: allAgencies, error } = await supabase
    .from('agencies')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  console.log(`Total agencies in database: ${allAgencies.length}\n`);

  allAgencies.forEach(a => {
    console.log(`${a.name}`);
    console.log(`  ID: ${a.id}`);
    console.log(`  Code: ${a.code || 'N/A'}`);
    console.log(`  Active: ${a.is_active}`);
    console.log('');
  });

  const testAgency1 = allAgencies.find(a => a.id === 'test-agency-001');
  const testAgency2 = allAgencies.find(a => a.id === 'test-agency-002');

  console.log('Looking for specific test agencies:');
  console.log(`  test-agency-001: ${testAgency1 ? '✓ EXISTS' : '✗ NOT FOUND'}`);
  console.log(`  test-agency-002: ${testAgency2 ? '✓ EXISTS' : '✗ NOT FOUND'}`);
}

verifyTestAgencies();