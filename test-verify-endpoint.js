// Test /api/auth/verify endpoint with agent1's token
require('dotenv').config();

async function testVerifyEndpoint() {
  console.log('\n=== Testing /api/auth/verify Endpoint ===\n');

  const baseUrl = 'https://insurance.syncedupsolutions.com';
  const email = 'agent1@phsagency.com';
  const password = 'Agent123!';

  // Step 1: Login to get token
  console.log('1. Logging in to get auth token...');
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!loginRes.ok) {
    console.log('❌ Login failed');
    return;
  }

  const setCookieHeader = loginRes.headers.get('set-cookie');
  const authToken = setCookieHeader?.match(/auth_token=([^;]+)/)?.[1];

  if (!authToken) {
    console.log('❌ No auth token received');
    return;
  }

  console.log('✅ Got auth token\n');

  // Step 2: Test /api/auth/verify
  console.log('2. Testing /api/auth/verify...');
  const verifyRes = await fetch(`${baseUrl}/api/auth/verify`, {
    headers: {
      'Cookie': `auth_token=${authToken}`,
      'Content-Type': 'application/json'
    }
  });

  console.log('   Status:', verifyRes.status);

  if (!verifyRes.ok) {
    const error = await verifyRes.text();
    console.log('❌ Verify failed:', error);
    return;
  }

  const verifyData = await verifyRes.json();
  console.log('✅ Verify response:', JSON.stringify(verifyData, null, 2));

  // Step 3: Test /api/auth/me for comparison
  console.log('\n3. Testing /api/auth/me for comparison...');
  const meRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: {
      'Cookie': `auth_token=${authToken}`,
      'Content-Type': 'application/json'
    }
  });

  console.log('   Status:', meRes.status);

  if (!meRes.ok) {
    const error = await meRes.text();
    console.log('❌ /api/auth/me failed:', error);
    return;
  }

  const meData = await meRes.json();
  console.log('✅ /api/auth/me response:', JSON.stringify(meData, null, 2));

  // Compare the responses
  console.log('\n=== Analysis ===');

  if (verifyData.ok && verifyData.user) {
    console.log('✅ /api/auth/verify returns user data');
    console.log('   User email:', verifyData.user?.email);
    console.log('   User role:', verifyData.user?.role);
    console.log('   User ID:', verifyData.user?.id);
  } else {
    console.log('❌ /api/auth/verify not returning expected data');
  }

  if (meData.authenticated && meData.user) {
    console.log('✅ /api/auth/me returns user data');
    console.log('   User email:', meData.user?.email);
    console.log('   User role:', meData.user?.role);
    console.log('   User ID:', meData.user?.id);
  }

  console.log('\nNote: auth-helper.js expects /api/auth/verify to return { user: {...} }');
  console.log('If user is null, the client-side code might redirect to login');
}

testVerifyEndpoint().catch(console.error);