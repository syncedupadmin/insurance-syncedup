require('dotenv').config({ path: '.env.production' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRoles() {
  console.log('Checking manager and customer service roles...\n');

  const emails = [
    'manager@testalpha.com',
    'cs@testalpha.com',
    'manager@testbeta.com',
    'cs@testbeta.com'
  ];

  for (const email of emails) {
    const { data, error } = await supabase
      .from('portal_users')
      .select('id, email, role, roles, agency_id, auth_user_id')
      .eq('email', email)
      .single();

    if (error) {
      console.log(`❌ ${email}: ${error.message}`);
    } else {
      console.log(`✅ ${email}:`);
      console.log(`   role: ${data.role}`);
      console.log(`   roles: ${JSON.stringify(data.roles)}`);
      console.log(`   agency_id: ${data.agency_id}`);
      console.log(`   auth_user_id: ${data.auth_user_id}`);
      console.log('');
    }
  }
}

checkRoles().catch(console.error);