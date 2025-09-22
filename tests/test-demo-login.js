const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testLogin() {
  try {
    console.log('🧪 Testing login flow...\n');
    
    // Test login with the user's credentials
    console.log('1. Testing login with admin@syncedupsolutions.com...');
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@syncedupsolutions.com',
      password: 'SuperAdmin2024!'
    });
    
    if (authError) {
      console.log('❌ Login failed:', authError.message);
      return;
    }
    
    console.log('✅ Login successful!');
    console.log('   User ID:', authData.user.id);
    console.log('   Email:', authData.user.email);
    console.log('   Role:', authData.user.user_metadata?.role);
    console.log('   Access Token:', authData.session?.access_token ? 'Present' : 'Missing');
    
    // Test token verification
    console.log('\n2. Testing token verification...');
    
    const { data: userData, error: verifyError } = await supabase.auth.getUser(authData.session.access_token);
    
    if (verifyError) {
      console.log('❌ Token verification failed:', verifyError.message);
      return;
    }
    
    console.log('✅ Token verification successful!');
    console.log('   Verified User ID:', userData.user.id);
    console.log('   Verified Role:', userData.user.user_metadata?.role);
    
    // Test JWT payload
    console.log('\n3. Analyzing JWT token...');
    const tokenPayload = JSON.parse(Buffer.from(authData.session.access_token.split('.')[1], 'base64').toString());
    console.log('   Token role:', tokenPayload.user_metadata?.role);
    console.log('   Token exp:', new Date(tokenPayload.exp * 1000));
    
    console.log('\n✅ Login flow working correctly!');
    console.log('The user should be able to access the super admin portal.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testLogin();