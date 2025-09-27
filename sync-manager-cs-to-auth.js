require('dotenv').config({ path: '.env.production' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function syncManagerCSUsers() {
  console.log('Syncing manager and customer service users to Supabase Auth...\n');

  const testEmails = [
    'manager@testalpha.com',
    'cs@testalpha.com',
    'manager@testbeta.com',
    'cs@testbeta.com'
  ];

  for (const email of testEmails) {
    const { data: portalUser, error: puError } = await supabase
      .from('portal_users')
      .select('*')
      .eq('email', email)
      .single();

    if (puError || !portalUser) {
      console.log(`❌ No portal_users record for ${email}`);
      continue;
    }

    if (portalUser.auth_user_id) {
      console.log(`⚠️  ${email} already has auth_user_id: ${portalUser.auth_user_id}`);
      continue;
    }

    const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: 'Test123!',
      email_confirm: true,
      user_metadata: {
        role: portalUser.role,
        agency_id: portalUser.agency_id,
        full_name: portalUser.full_name
      },
      app_metadata: {
        role: portalUser.role,
        agency_id: portalUser.agency_id
      }
    });

    if (createError) {
      console.error(`❌ Error creating auth user for ${email}:`, createError.message);
      continue;
    }

    console.log(`✅ Created Supabase Auth user for ${email} (ID: ${authUser.user.id})`);

    const { error: updateError } = await supabase
      .from('portal_users')
      .update({ auth_user_id: authUser.user.id })
      .eq('id', portalUser.id);

    if (updateError) {
      console.error(`  ❌ Error updating portal_users.auth_user_id:`, updateError.message);
    } else {
      console.log(`  ✅ Linked portal_users record to auth_user_id`);
    }
  }

  console.log('\n✅ Sync complete! Manager and CS users can now login.');
  console.log('\nTest Credentials:');
  console.log('  manager@testalpha.com | Password: Test123!');
  console.log('  cs@testalpha.com | Password: Test123!');
  console.log('  manager@testbeta.com | Password: Test123!');
  console.log('  cs@testbeta.com | Password: Test123!');
}

syncManagerCSUsers().catch(console.error);