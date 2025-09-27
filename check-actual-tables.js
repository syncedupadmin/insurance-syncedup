require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkTables() {
  const tables = ['portal_users', 'profiles', 'agencies', 'auth.users'];

  console.log('=== CHECKING ACTUAL TABLE EXISTENCE ===\n');

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`❌ ${table}: Does NOT exist (${error.message})`);
      } else {
        console.log(`✅ ${table}: EXISTS with ${count} rows`);

        // Get sample data
        if (count > 0 && count < 20) {
          const { data } = await supabase
            .from(table)
            .select('*')
            .limit(3);

          if (data && data[0]) {
            console.log(`   Columns: ${Object.keys(data[0]).join(', ')}`);
            if (table === 'portal_users' || table === 'profiles') {
              data.forEach(row => {
                console.log(`   - ${row.email}: role=${row.role}, agency_id=${row.agency_id}`);
              });
            }
          }
        }
      }
    } catch (e) {
      console.log(`❌ ${table}: Error - ${e.message}`);
    }
  }

  // Check if login actually works
  console.log('\n=== TESTING LOGIN FLOW ===\n');

  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@demo.com',
      password: 'password123'
    });

    if (authError) {
      console.log('❌ Login failed:', authError.message);
    } else {
      console.log('✅ Login successful for admin@demo.com');
      console.log('   User ID:', authData.user.id);
      console.log('   User metadata:', JSON.stringify(authData.user.user_metadata, null, 2));
      console.log('   App metadata:', JSON.stringify(authData.user.app_metadata, null, 2));

      // Now check if portal_users has this user
      const { data: portalUser } = await supabase
        .from('portal_users')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .single();

      if (portalUser) {
        console.log('✅ Found in portal_users:', portalUser.email, 'agency_id:', portalUser.agency_id);
      } else {
        console.log('❌ NOT found in portal_users table');
      }

      // Check profiles table too
      const { data: profileUser } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();

      if (profileUser) {
        console.log('✅ Found in profiles:', profileUser.email, 'agency_id:', profileUser.agency_id);
      } else {
        console.log('❌ NOT found in profiles table');
      }
    }
  } catch (e) {
    console.log('❌ Login test error:', e.message);
  }
}

checkTables().then(() => console.log('\n✅ Check complete'));