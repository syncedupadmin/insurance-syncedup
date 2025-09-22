// Test login after fixing /api/auth/me.js
require('dotenv').config();

async function testLogin() {
  console.log('\n=== Testing Login After Fix ===\n');

  const email = 'admin@phsagency.com';
  const password = 'Admin123!';

  // Step 1: Login
  console.log('1. Testing login...');
  const loginRes = await fetch('https://insurance.syncedupsolutions.com/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  console.log('Login response status:', loginRes.status);
  const loginData = await loginRes.json();

  if (!loginData.success) {
    console.log('❌ Login failed:', loginData.error);
    return;
  }

  console.log('✅ Login successful');
  console.log('   Redirect:', loginData.redirect);

  // Get the auth token
  const setCookieHeader = loginRes.headers.get('set-cookie');
  const authToken = setCookieHeader?.match(/auth_token=([^;]+)/)?.[1];

  if (!authToken) {
    console.log('❌ No auth token in response');
    return;
  }

  console.log('✅ Auth token received');

  // Step 2: Test /api/auth/me
  console.log('\n2. Testing /api/auth/me...');
  const meRes = await fetch('https://insurance.syncedupsolutions.com/api/auth/me', {
    headers: { 'Cookie': `auth_token=${authToken}` }
  });

  console.log('Response status:', meRes.status);

  if (!meRes.ok) {
    const error = await meRes.text();
    console.log('❌ /api/auth/me failed:', error);
    return;
  }

  const meData = await meRes.json();
  console.log('✅ /api/auth/me successful');
  console.log('   Authenticated:', meData.authenticated);
  console.log('   User:', meData.user?.email);
  console.log('   Role:', meData.user?.role);
  console.log('   Agency ID:', meData.user?.agency_id);

  // Step 3: Test /api/auth/verify
  console.log('\n3. Testing /api/auth/verify...');
  const verifyRes = await fetch('https://insurance.syncedupsolutions.com/api/auth/verify', {
    headers: { 'Cookie': `auth_token=${authToken}` }
  });

  console.log('Response status:', verifyRes.status);

  if (!verifyRes.ok) {
    const error = await verifyRes.text();
    console.log('❌ /api/auth/verify failed:', error);
    return;
  }

  const verifyData = await verifyRes.json();
  console.log('✅ /api/auth/verify successful');
  console.log('   OK:', verifyData.ok);
  console.log('   User:', verifyData.user?.email);
  console.log('   Role:', verifyData.user?.role);

  // Step 4: Test portal access
  console.log('\n4. Testing admin portal access...');
  const portalRes = await fetch('https://insurance.syncedupsolutions.com/admin', {
    headers: {
      'Cookie': `auth_token=${authToken}`,
      'Accept': 'text/html'
    },
    redirect: 'manual'
  });

  console.log('Response status:', portalRes.status);

  if (portalRes.status === 302 || portalRes.status === 301) {
    const location = portalRes.headers.get('location');
    if (location?.includes('login')) {
      console.log('❌ Still being redirected to login!');
    } else {
      console.log('✅ Redirect to:', location);
    }
  } else if (portalRes.status === 200) {
    const html = await portalRes.text();
    if (html.includes('Admin Dashboard') || html.includes('dashboard')) {
      console.log('✅ Admin dashboard HTML received!');
    } else if (html.includes('login')) {
      console.log('❌ Got login page instead of dashboard');
    } else {
      console.log('⚠️  Got HTML but unclear what page');
    }
  }

  console.log('\n=== Test Complete ===');
  console.log('The /api/auth/me endpoint has been fixed to query portal_users table.');
  console.log('Authentication should now work properly!');
}

testLogin().catch(console.error);