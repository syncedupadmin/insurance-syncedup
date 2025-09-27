require('dotenv').config({ path: '.env.production' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixRoles() {
  console.log('Fixing manager and customer service roles...\n');

  const updates = [
    { email: 'manager@testalpha.com', role: 'manager', roles: ['manager'] },
    { email: 'cs@testalpha.com', role: 'customer_service', roles: ['customer_service'] },
    { email: 'manager@testbeta.com', role: 'manager', roles: ['manager'] },
    { email: 'cs@testbeta.com', role: 'customer_service', roles: ['customer_service'] }
  ];

  for (const update of updates) {
    const { data, error } = await supabase
      .from('portal_users')
      .update({
        role: update.role,
        roles: update.roles
      })
      .eq('email', update.email)
      .select()
      .single();

    if (error) {
      console.log(`❌ ${update.email}: ${error.message}`);
    } else {
      console.log(`✅ Updated ${update.email} to role: ${data.role}, roles: ${JSON.stringify(data.roles)}`);
    }
  }

  console.log('\n✅ Role fixes complete!');
}

fixRoles().catch(console.error);