// Test authentication flow after fixes
require('dotenv').config();

async function testAuthFlow() {
  try {
    console.log('\n=== Testing Authentication Flow ===\n');

    // 1. Test login
    console.log('1. Testing login...');
    const loginRes = await fetch('https://insurance.syncedupsolutions.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@phsagency.com',
        password: 'Admin123!'
      })
    });

    if (!loginRes.ok) {
      console.log('❌ Login failed:', loginRes.status);
      const error = await loginRes.text();
      console.log('Error:', error);
      return;
    }

    const loginData = await loginRes.json();
    console.log('✅ Login successful');
    console.log('   User:', loginData.user?.email);
    console.log('   Role:', loginData.user?.role);
    console.log('   Redirect:', loginData.redirect);

    // Extract cookie from response
    const setCookie = loginRes.headers.get('set-cookie');
    console.log('   Set-Cookie header:', setCookie);

    if (!setCookie) {
      console.log('❌ No cookie set in login response');
      console.log('   All headers:', Array.from(loginRes.headers.entries()));
      return;
    }

    // Parse the auth_token from the set-cookie header
    const authTokenMatch = setCookie.match(/auth_token=([^;]+)/);
    if (!authTokenMatch) {
      console.log('❌ No auth_token in cookie');
      console.log('   Cookie content:', setCookie);
      return;
    }

    const authToken = authTokenMatch[1];
    console.log('✅ Cookie received, token extracted');
    console.log('   Token (first 20 chars):', authToken.substring(0, 20) + '...');

    // 2. Test /api/auth/me
    console.log('\n2. Testing /api/auth/me...');
    const meRes = await fetch('https://insurance.syncedupsolutions.com/api/auth/me', {
      headers: {
        'Cookie': `auth_token=${authToken}`
      }
    });

    console.log('   Status:', meRes.status);

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

    // 3. Test manager dashboard (if manager role)
    if (loginData.user?.role === 'manager' || loginData.user?.role === 'admin') {
      console.log('\n3. Testing /api/manager/dashboard...');
      const dashRes = await fetch('https://insurance.syncedupsolutions.com/api/manager/dashboard', {
        headers: {
          'Cookie': `auth_token=${authToken}`
        }
      });

      console.log('   Status:', dashRes.status);

      if (!dashRes.ok) {
        const error = await dashRes.text();
        console.log('❌ Dashboard failed:', error);
      } else {
        const dashData = await dashRes.json();
        console.log('✅ Dashboard loaded successfully');
        console.log('   Has agency_overview:', !!dashData.agency_overview);
        console.log('   Has team_performance:', !!dashData.team_performance);
      }

      // 4. Test dashboard-metrics
      console.log('\n4. Testing /api/manager/dashboard-metrics...');
      const metricsRes = await fetch('https://insurance.syncedupsolutions.com/api/manager/dashboard-metrics', {
        headers: {
          'Cookie': `auth_token=${authToken}`
        }
      });

      console.log('   Status:', metricsRes.status);

      if (!metricsRes.ok) {
        const error = await metricsRes.text();
        console.log('❌ Dashboard metrics failed:', error);
      } else {
        const metricsData = await metricsRes.json();
        console.log('✅ Dashboard metrics loaded successfully');
        console.log('   Total agents:', metricsData.totalAgents);
        console.log('   Active agents:', metricsData.activeAgents);
      }
    }

    console.log('\n=== All tests completed ===\n');

  } catch (error) {
    console.error('Test error:', error.message);
  }
}

testAuthFlow();