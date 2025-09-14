const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  // Check users table
  console.log('Testing users table...');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .limit(10);
  
  console.log('Users Error:', usersError);
  console.log('Users Data:', users);
  
  // Check if specific email exists
  console.log('\nTesting specific email...');
  const { data: specificUser, error: specificError } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'admin@test.com')
    .single();
    
  console.log('Specific Error:', specificError);
  console.log('Specific Data:', specificUser);
}

test();