// Test single portal access with debugging
import fetch from 'node-fetch';

const API_BASE = 'https://insurance-syncedup-5xmz5i95m-nicks-projects-f40381ea.vercel.app';

async function loginUser() {
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'manager@demo.com',
        password: 'Demo@Manager2024!'
      })
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status}`);
    }

    const result = await response.json();
    return result.token;
  } catch (error) {
    console.log(`❌ Login failed: ${error.message}`);
    return null;
  }
}

async function testPortalAccess(token) {
  try {
    console.log(`🧪 Testing manager access to admin portal (should be denied)`);
    
    const response = await fetch(`${API_BASE}/admin`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cookie': `auth-token=${token}`
      },
      redirect: 'manual' // Don't follow redirects
    });

    console.log(`📊 Response status: ${response.status}`);
    console.log(`📊 Response headers:`, Object.fromEntries(response.headers.entries()));
    
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      console.log(`🔄 Redirect location: ${location}`);
      return 'REDIRECTED';
    } else if (response.status === 200) {
      const text = await response.text();
      console.log(`📄 Response body (first 500 chars): ${text.substring(0, 500)}`);
      return 'ALLOWED';
    }
    
    return `STATUS_${response.status}`;

  } catch (error) {
    console.error(`❌ Error testing portal:`, error);
    return `ERROR: ${error.message}`;
  }
}

async function runTest() {
  console.log('🧪 Testing Manager → Admin Portal Access Control');
  console.log('=' .repeat(60));
  
  const token = await loginUser();
  if (!token) {
    console.log('❌ Cannot test - login failed');
    return;
  }
  
  console.log('✅ Login successful, testing portal access...');
  const result = await testPortalAccess(token);
  console.log(`🎯 Final result: ${result}`);
  
  if (result === 'REDIRECTED') {
    console.log('✅ PASS: Manager properly denied access to admin portal');
  } else if (result === 'ALLOWED') {
    console.log('❌ FAIL: Manager should NOT have access to admin portal!');
  } else {
    console.log(`⚠️ UNCERTAIN: Unexpected result (${result})`);
  }
}

runTest().catch(console.error);