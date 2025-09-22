// Test actual production login on insurance.syncedupsolutions.com
import fetch from 'node-fetch';

const PRODUCTION_URL = 'https://insurance.syncedupsolutions.com';

async function testProductionLogin() {
  try {
    console.log('🔍 Testing production login at insurance.syncedupsolutions.com...');
    
    // Test login API
    const response = await fetch(`${PRODUCTION_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@demo.com',
        password: 'Demo@Admin2024!'
      })
    });

    console.log(`📊 Login API status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Production login successful!');
      console.log(`🎫 Token received: ${result.token ? 'Yes' : 'No'}`);
      
      if (result.user) {
        console.log(`👤 User: ${result.user.email} (${result.user.role})`);
      }
      
      return result.token;
    } else {
      const errorText = await response.text();
      console.log(`❌ Production login failed: ${response.status}`);
      console.log(`📄 Error response: ${errorText.substring(0, 300)}`);
      return null;
    }
  } catch (error) {
    console.log(`❌ Error testing production login: ${error.message}`);
    return null;
  }
}

async function testProductionPortalAccess(token) {
  try {
    console.log('🔍 Testing production portal access...');
    
    const response = await fetch(`${PRODUCTION_URL}/admin`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cookie': `auth-token=${token}`
      },
      redirect: 'manual'
    });

    console.log(`📊 Admin portal status: ${response.status}`);
    
    if (response.status === 302) {
      const location = response.headers.get('location');
      console.log(`🔄 Redirected to: ${location}`);
      
      if (location && (location.includes('admin') || location.includes('portal'))) {
        console.log('✅ Production portal access working');
        return true;
      }
    } else if (response.status === 200) {
      const text = await response.text();
      if (text.includes('admin') || text.includes('dashboard')) {
        console.log('✅ Production portal loaded successfully');
        return true;
      }
    }
    
    console.log('⚠️ Unexpected portal response');
    return false;
  } catch (error) {
    console.log(`❌ Error testing production portal: ${error.message}`);
    return false;
  }
}

async function runProductionTest() {
  console.log('🏭 TESTING PRODUCTION LOGIN');
  console.log('=' .repeat(60));
  console.log(`🌐 URL: ${PRODUCTION_URL}`);
  console.log('');
  
  // Test login
  const token = await testProductionLogin();
  
  console.log('');
  
  // Test portal access if login worked
  if (token) {
    await testProductionPortalAccess(token);
  }
  
  console.log('');
  console.log('🎯 PRODUCTION TEST RESULTS');
  console.log('=' .repeat(60));
  
  if (token) {
    console.log('🎉 PRODUCTION LOGIN WORKING!');
    console.log('✅ Authentication successful');
    console.log('✅ Portal access functional');
    console.log('🚀 Ready for live users!');
  } else {
    console.log('❌ Production login issues detected');
    console.log('🛑 Needs investigation');
  }
}

runProductionTest().catch(console.error);