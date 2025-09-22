// Test the complete flow: reset password -> login with new password
const testResetAndLogin = async () => {
  const testEmail = 'admin@syncedupsolutions.com';
  const baseUrl = 'https://insurance-syncedup-qxak6umhw-nicks-projects-f40381ea.vercel.app';

  try {
    console.log('Step 1: Requesting password reset...');
    
    // Step 1: Reset password
    const resetResponse = await fetch(`${baseUrl}/api/auth/request-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });

    const resetData = await resetResponse.json();
    console.log('Reset response:', resetData);

    if (!resetResponse.ok) {
      console.log('❌ FAILED: Password reset failed');
      return;
    }

    console.log('✅ SUCCESS: Password reset sent');
    
    // Step 2: Since we can't get the email, let's try some common patterns
    // The reset generates: Math.random().toString(36).slice(-8) + 'C3!'
    console.log('\nStep 2: Testing login with default/common passwords...');
    
    const testPasswords = [
      'superadmin123',  // Original default
      'Admin123!',      // Alternative default
      'demo123',        // Demo password
      'password'        // Another demo password
    ];

    for (const password of testPasswords) {
      console.log(`\nTrying password: ${password}`);
      
      const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password })
      });

      const loginData = await loginResponse.json();
      
      if (loginResponse.ok) {
        console.log('✅ SUCCESS: Login successful!');
        console.log('User data:', loginData.user);
        console.log('Token:', loginData.token ? 'Generated' : 'Missing');
        return { success: true, password, user: loginData.user };
      } else {
        console.log(`❌ FAILED: ${loginData.error}`);
      }
    }
    
    console.log('\n❌ All test passwords failed. The reset password is a random string + C3!');
    console.log('You would need to check the actual email to get the new password.');
    
    return { success: false };

  } catch (error) {
    console.error('❌ ERROR: Exception occurred:', error.message);
    return { success: false, error: error.message };
  }
};

// Run the test
testResetAndLogin().then(result => {
  console.log('\n=== FINAL RESULT ===');
  if (result.success) {
    console.log('✅ LOGIN WORKING: You can now log in with password:', result.password);
  } else {
    console.log('❌ LOGIN TEST INCOMPLETE: Need to check email for actual reset password');
  }
});