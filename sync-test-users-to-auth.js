import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncTestUsers() {
  console.log('Syncing test users to Supabase Auth...\n');

  const testEmails = [
    'admin@testalpha.com',
    'agent1@testalpha.com',
    'agent2@testalpha.com',
    'admin@testbeta.com',
    'agent1@testbeta.com',
    'agent2@testbeta.com'
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
        name: portalUser.name
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

  console.log('\n✅ Sync complete! Test users can now login.');
}

syncTestUsers();