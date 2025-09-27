require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 VERIFYING FIX\n');

async function verify() {
  const { data: authUsers } = await supabase.auth.admin.listUsers();

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  console.log('Checking all users for valid agency_ids in metadata:\n');

  let allGood = true;

  authUsers.users.forEach(user => {
    const agencyId = user.user_metadata?.agency_id || user.app_metadata?.agency_id;

    if (agencyId) {
      const isValid = uuidRegex.test(agencyId);
      const icon = isValid ? '✅' : '❌';

      console.log(`${icon} ${user.email}`);
      console.log(`   agency_id: ${agencyId}`);

      if (!isValid) {
        allGood = false;
        console.log(`   ⚠️  NOT A VALID UUID!`);
      }
      console.log('');
    } else {
      console.log(`⚪ ${user.email}`);
      console.log(`   (No agency_id in metadata - might be super_admin)`);
      console.log('');
    }
  });

  console.log('═'.repeat(80));
  if (allGood) {
    console.log('✅ ALL USERS HAVE VALID AGENCY_IDs!\n');
    console.log('💡 Users need to logout and login again to get fresh tokens.');
  } else {
    console.log('❌ Some users still have invalid agency_ids\n');
    console.log('Run: node fix-auth-metadata.js again');
  }
}

verify();