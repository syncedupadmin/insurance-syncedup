// Final test of login functionality
const testLogin = async () => {
  const testEmail = 'admin@syncedupsolutions.com';
  const testPassword = 'TestPassword123!';
  const baseUrl = 'https://insurance-syncedup-j2icwpncu-nicks-projects-f40381ea.vercel.app';

  try {
    console.log('Testing login with known password...');
    console.log('Email:', testEmail);
    console.log('Password:', testPassword);
    console.log('API URL:', `${baseUrl}/api/auth/login`);

    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });

    console.log('Response status:', loginResponse.status);
    
    const loginData = await loginResponse.json();
    console.log('Response data:', JSON.stringify(loginData, null, 2));
    
    if (loginResponse.ok) {
      console.log('✅ SUCCESS: Login works!');
      console.log('🎉 FIXED: You can now log in with:');
      console.log('  Email:', testEmail);
      console.log('  Password:', testPassword);
      console.log('  Role:', loginData.user.role);
      console.log('  Must change password:', loginData.user.mustChangePassword);
    } else {
      console.log('❌ FAILED: Login still not working');
      console.log('Error:', loginData.error);
    }

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
};

testLogin();