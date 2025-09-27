require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔧 FIXING AUTH METADATA FOR TEST USERS\n');
console.log('═'.repeat(80) + '\n');

async function fixAuthMetadata() {
  try {
    // Get the correct agency ID for "Demo Insurance Agency"
    const { data: demoAgency, error: agencyError } = await supabase
      .from('agencies')
      .select('id, name, code')
      .eq('code', 'DEMO001')
      .single();

    if (agencyError || !demoAgency) {
      console.log('❌ Could not find Demo Insurance Agency (DEMO001)');
      console.log('Available agencies:');
      const { data: agencies } = await supabase.from('agencies').select('id, name, code');
      agencies.forEach(a => console.log(`  - ${a.name} (${a.code}): ${a.id}`));
      return;
    }

    console.log('✅ Found target agency:');
    console.log(`   Name: ${demoAgency.name}`);
    console.log(`   Code: ${demoAgency.code}`);
    console.log(`   ID: ${demoAgency.id}\n`);
    console.log('─'.repeat(80) + '\n');

    // Get all auth users with test-agency-001
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.log('❌ Error listing users:', listError.message);
      return;
    }

    const usersToFix = authUsers.users.filter(user => {
      const metadata = JSON.stringify(user.user_metadata) + JSON.stringify(user.app_metadata);
      return metadata.includes('test-agency-001') || metadata.includes('test-agency-002');
    });

    console.log(`Found ${usersToFix.length} users with test-agency IDs:\n`);

    for (const user of usersToFix) {
      console.log(`Fixing: ${user.email}`);
      console.log(`  Current agency_id: ${user.user_metadata?.agency_id || user.app_metadata?.agency_id}`);

      // Update user metadata
      const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        {
          user_metadata: {
            ...user.user_metadata,
            agency_id: demoAgency.id
          },
          app_metadata: {
            ...user.app_metadata,
            agency_id: demoAgency.id
          }
        }
      );

      if (updateError) {
        console.log(`  ❌ Failed: ${updateError.message}\n`);
      } else {
        console.log(`  ✅ Updated to: ${demoAgency.id}`);
        console.log(`  New metadata:`, JSON.stringify(updatedUser.user.user_metadata, null, 4));
        console.log('');
      }
    }

    console.log('─'.repeat(80) + '\n');
    console.log('✅ AUTH METADATA FIX COMPLETE!\n');
    console.log('💡 Next steps:');
    console.log('   1. Users should logout and login again');
    console.log('   2. Or clear their browser cookies');
    console.log('   3. Test the /api/admin/leads endpoint\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error(error.stack);
  }
}

fixAuthMetadata();