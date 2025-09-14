import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('Testing Create Agency Schema Compatibility...\n');

async function testSchemaCompatibility() {
  try {
    // Test 1: Check if agencies table exists with required columns
    console.log('1. Testing agencies table structure...');
    const { data: agenciesSchema, error: agenciesError } = await supabase
      .from('agencies')
      .select('*')
      .limit(0);
    
    if (agenciesError) {
      console.log('❌ Agencies table error:', agenciesError.message);
    } else {
      console.log('✅ Agencies table exists');
    }

    // Test 2: Check if portal_users table exists
    console.log('\n2. Testing portal_users table...');
    const { data: usersData, error: usersError } = await supabase
      .from('portal_users')
      .select('*')
      .limit(0);
    
    if (usersError) {
      console.log('❌ portal_users table error:', usersError.message);
      
      // Check if 'users' table exists instead
      console.log('   Checking alternative "users" table...');
      const { data: altUsersData, error: altUsersError } = await supabase
        .from('users')
        .select('*')
        .limit(0);
      
      if (altUsersError) {
        console.log('❌ users table error:', altUsersError.message);
      } else {
        console.log('✅ users table exists (need to update API)');
      }
    } else {
      console.log('✅ portal_users table exists');
    }

    // Test 3: Try to create a test agency (dry run)
    console.log('\n3. Testing agency creation (dry run)...');
    const testAgencyData = {
      name: 'TEST_SCHEMA_CHECK_DELETE_ME',
      contact_email: 'test@example.com',
      phone_number: '+1-555-0123',
      address: '123 Test Street',
      plan_type: 'basic',
      status: 'active'
    };

    const { data: testAgency, error: createError } = await supabase
      .from('agencies')
      .insert([testAgencyData])
      .select('*')
      .single();

    if (createError) {
      console.log('❌ Agency creation test failed:', createError.message);
      console.log('   This might indicate missing columns in agencies table');
    } else {
      console.log('✅ Test agency created:', testAgency.id);
      
      // Clean up test agency
      const { error: deleteError } = await supabase
        .from('agencies')
        .delete()
        .eq('id', testAgency.id);
      
      if (deleteError) {
        console.log('⚠️ Failed to clean up test agency:', deleteError.message);
      } else {
        console.log('✅ Test agency cleaned up');
      }
    }

    // Test 4: Check existing agencies structure
    console.log('\n4. Checking existing agencies structure...');
    const { data: existingAgencies, error: existingError } = await supabase
      .from('agencies')
      .select('*')
      .limit(3);

    if (existingError) {
      console.log('❌ Failed to fetch existing agencies:', existingError.message);
    } else {
      console.log('✅ Found', existingAgencies.length, 'existing agencies');
      if (existingAgencies.length > 0) {
        console.log('   Sample agency columns:', Object.keys(existingAgencies[0]));
      }
    }

  } catch (error) {
    console.error('❌ Schema test failed:', error.message);
  }
}

// Run the test
testSchemaCompatibility();