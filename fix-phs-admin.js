require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixPHSAdmin() {
  console.log('🔧 Fixing admin@phsagency.com\n');

  // Get the correct UUID for PHS001
  const { data: phsAgency } = await supabase
    .from('agencies')
    .select('id, name, code')
    .eq('code', 'PHS001')
    .single();

  console.log('Found agency:');
  console.log(`  Name: ${phsAgency.name}`);
  console.log(`  Code: ${phsAgency.code}`);
  console.log(`  UUID: ${phsAgency.id}\n`);

  // Get the user
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const user = authUsers.users.find(u => u.email === 'admin@phsagency.com');

  if (!user) {
    console.log('❌ User not found');
    return;
  }

  console.log(`Current agency_id: ${user.user_metadata?.agency_id}`);

  // Update
  const { data, error } = await supabase.auth.admin.updateUserById(
    user.id,
    {
      user_metadata: {
        ...user.user_metadata,
        agency_id: phsAgency.id
      },
      app_metadata: {
        ...user.app_metadata,
        agency_id: phsAgency.id
      }
    }
  );

  if (error) {
    console.log('❌ Error:', error.message);
  } else {
    console.log('✅ Updated successfully!');
    console.log(`New agency_id: ${data.user.user_metadata.agency_id}`);
  }
}

fixPHSAdmin();