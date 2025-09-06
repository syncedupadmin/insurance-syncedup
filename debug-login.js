import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const debugLogin = async () => {
  const testEmail = 'admin@syncedupsolutions.com';

  try {
    console.log('Debugging login process...');
    console.log('Checking portal_users table...');

    // Check portal_users table
    const { data: portalUser, error: portalError } = await supabase
      .from('portal_users')
      .select('id,email,name,role,agency_id,must_change_password,is_active,login_count,password_hash')
      .eq('email', testEmail.toLowerCase());

    console.log('Portal users result:', portalUser);
    console.log('Portal users error:', portalError);

    // Check users table
    console.log('\nChecking users table...');
    const { data: regularUser, error: regularError } = await supabase
      .from('users')
      .select('id,email,name,role,agency_id,must_change_password,is_active,login_count,password_hash')
      .eq('email', testEmail.toLowerCase());

    console.log('Regular users result:', regularUser);
    console.log('Regular users error:', regularError);

    // List all tables
    console.log('\nListing all available tables...');
    const { data: tables, error: tablesError } = await supabase.rpc('get_schema_tables');
    if (tablesError) {
      console.log('Could not list tables:', tablesError);
    } else {
      console.log('Available tables:', tables);
    }

  } catch (error) {
    console.error('❌ DEBUG ERROR:', error.message);
  }
};

debugLogin();