import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Check what tables exist and their schemas
    console.log('Testing database connection...');
    
    // Test 1: Check agencies table structure
    const { data: agenciesTest, error: agenciesError } = await supabase
      .from('agencies')
      .select('*')
      .limit(1);

    console.log('Agencies table test:', { data: agenciesTest, error: agenciesError });
    
    // Test 2: Check portal_users table structure  
    const { data: usersTest, error: usersError } = await supabase
      .from('portal_users')
      .select('*')
      .limit(1);

    console.log('Portal_users table test:', { data: usersTest, error: usersError });

    // Test 3: Try to create a minimal agency
    const { data: testAgency, error: createError } = await supabase
      .from('agencies')
      .insert([{
        name: 'DEBUG_TEST_AGENCY',
        code: 'DEBUG01'
      }])
      .select('*')
      .single();

    console.log('Agency creation test:', { data: testAgency, error: createError });

    if (testAgency) {
      // Test 4: Try to create a minimal user
      const { data: testUser, error: userError } = await supabase
        .from('portal_users')
        .insert([{
          email: 'debug@test.com',
          password_hash: 'test-hash',
          name: 'Debug User',
          role: 'agent',
          agency_id: testAgency.id
        }])
        .select('*')
        .single();

      console.log('User creation test:', { data: testUser, error: userError });

      // Clean up
      if (testUser) {
        await supabase.from('portal_users').delete().eq('id', testUser.id);
      }
      await supabase.from('agencies').delete().eq('id', testAgency.id);
    }

    return res.status(200).json({
      success: true,
      debug: {
        agencies_table: agenciesError ? 'ERROR: ' + agenciesError.message : 'OK',
        users_table: usersError ? 'ERROR: ' + usersError.message : 'OK',
        agency_creation: createError ? 'ERROR: ' + createError.message : 'OK',
        user_creation: testUser ? 'OK' : (userError ? 'ERROR: ' + userError.message : 'SKIPPED')
      }
    });

  } catch (error) {
    console.error('Debug error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Debug failed: ' + error.message 
    });
  }
}