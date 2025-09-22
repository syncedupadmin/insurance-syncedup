// Test browser login flow for admin@phsagency.com
require('dotenv').config();

async function testBrowserLogin() {
  console.log('\n=== Testing Browser Login Flow ===\n');

  try {
    // 1. Login request (simulating what the browser does)
    console.log('1. Sending login request...');
    const loginRes = await fetch('https://insurance.syncedupsolutions.com/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://insurance.syncedupsolutions.com',
        'Referer': 'https://insurance.syncedupsolutions.com/login'
      },
      body: JSON.stringify({
        email: 'admin@phsagency.com',
        password: 'Admin123!'
      }),
      credentials: 'include'
    });

    console.log('   Status:', loginRes.status);
    const loginData = await loginRes.json();

    if (loginData.success) {
      console.log('✅ Login successful');
      console.log('   Email:', loginData.user?.email);
      console.log('   Role:', loginData.user?.role);
      console.log('   Redirect path:', loginData.redirect);
      console.log('   Full user data:', JSON.stringify(loginData.user, null, 2));

      // Check what the browser would do
      if (loginData.redirect) {
        console.log('\n2. Browser would redirect to:', loginData.redirect);

        // Test if the redirect path exists
        const portalRes = await fetch(`https://insurance.syncedupsolutions.com${loginData.redirect}`, {
          method: 'GET',
          headers: {
            'Cookie': loginRes.headers.get('set-cookie') || ''
          }
        });

        console.log('   Portal page status:', portalRes.status);
        if (portalRes.status === 200) {
          console.log('✅ Portal page loads successfully');
        } else if (portalRes.status === 404) {
          console.log('❌ Portal page not found at', loginData.redirect);
        } else {
          console.log('❌ Portal page error:', portalRes.status);
        }
      }
    } else {
      console.log('❌ Login failed');
      console.log('   Error:', loginData.error);
    }

  } catch (error) {
    console.error('Test error:', error.message);
  }
}

testBrowserLogin();