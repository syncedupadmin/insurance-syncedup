// Test Admin Portal APIs
require('dotenv').config();

async function testAdminAPIs() {
  const baseURL = 'http://localhost:3000';

  console.log('\n🧪 Testing Admin Portal APIs...\n');

  // Test login first
  console.log('1️⃣ Testing login...');
  const loginRes = await fetch(`${baseURL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@phsagency.com',
      password: 'Admin123!'
    })
  });

  if (!loginRes.ok) {
    console.error('❌ Login failed:', await loginRes.text());
    return;
  }

  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('✅ Login successful');

  // Test admin APIs with token
  const apis = [
    '/api/admin/dashboard-metrics',
    '/api/admin/users',
    '/api/admin/settings',
    '/api/admin/commission-settings'
  ];

  for (const api of apis) {
    console.log(`\n2️⃣ Testing ${api}...`);

    // Test with cookie
    const cookieRes = await fetch(`${baseURL}${api}`, {
      headers: {
        'Cookie': `auth_token=${token}`
      }
    });

    if (cookieRes.ok) {
      console.log(`✅ ${api} works with cookie auth`);
    } else {
      console.error(`❌ ${api} failed:`, cookieRes.status, await cookieRes.text());
    }
  }

  console.log('\n✅ Admin API tests complete!');
}

// Only run if api-server is running
fetch('http://localhost:3000/api/health')
  .then(() => testAdminAPIs())
  .catch(() => {
    // Server might be running but no health endpoint, try anyway
    testAdminAPIs();
  });