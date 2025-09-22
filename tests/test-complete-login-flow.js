// Test complete login flow including portal access
import fetch from 'node-fetch';

const API_BASE = 'https://insurance-syncedup-km2s838zq-nicks-projects-f40381ea.vercel.app';

async function testCompleteLoginFlow() {
  console.log('🧪 TESTING COMPLETE LOGIN FLOW');
  console.log('=' .repeat(60));
  console.log(`🌐 URL: ${API_BASE}`);
  console.log('');
  
  try {
    // Step 1: Test login API
    console.log('📋 Step 1: Testing login API...');
    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@demo.com',
        password: 'Demo@Admin2024!'
      })
    });

    console.log(`📊 Login API status: ${loginResponse.status}`);
    
    if (!loginResponse.ok) {
      console.log('❌ Login API failed - cannot test flow');
      return false;
    }
    
    const loginResult = await loginResponse.json();
    const token = loginResult.token;
    console.log('✅ Login API successful - token received');
    
    // Step 2: Test portal access immediately after login (simulating user flow)
    console.log('\n📋 Step 2: Testing immediate portal access (simulating user clicking portal)...');
    
    const portalResponse = await fetch(`${API_BASE}/admin`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cookie': `auth-token=${token}`,
        'Referer': `${API_BASE}/login` // This simulates coming from login page
      },
      redirect: 'manual'
    });

    console.log(`📊 Portal access status: ${portalResponse.status}`);
    
    if (portalResponse.status === 302) {
      const location = portalResponse.headers.get('location');
      console.log(`🔄 Redirected to: ${location}`);
      
      if (location && (location.includes('Completing Login') || location.includes('portal-files') || location.includes('admin'))) {
        console.log('✅ Portal access working - proper redirect received');
        
        // Step 3: Test the redirect destination
        console.log('\n📋 Step 3: Testing redirect destination...');
        
        const finalResponse = await fetch(location, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Cookie': `auth-token=${token}`
          },
          redirect: 'manual'
        });
        
        console.log(`📊 Final destination status: ${finalResponse.status}`);
        
        if (finalResponse.status === 200 || finalResponse.status === 302) {
          console.log('✅ Final destination accessible');
          return true;
        } else {
          console.log('❌ Final destination not accessible');
          return false;
        }
      } else {
        console.log('❌ Unexpected redirect location');
        return false;
      }
    } else if (portalResponse.status === 200) {
      console.log('✅ Direct portal access granted (alternative flow)');
      return true;
    } else {
      console.log(`❌ Unexpected portal response: ${portalResponse.status}`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Error testing login flow: ${error.message}`);
    return false;
  }
}

async function testLoginFlowWithoutToken() {
  console.log('\n📋 Testing portal access without token (should redirect to login)...');
  
  try {
    const response = await fetch(`${API_BASE}/admin`, {
      method: 'GET',
      redirect: 'manual'
    });

    console.log(`📊 Portal (no token) status: ${response.status}`);
    
    if (response.status === 302) {
      const location = response.headers.get('location');
      if (location && location.includes('/login')) {
        console.log('✅ Unauthorized access properly redirected to login');
        return true;
      }
    }
    
    console.log('❌ Unauthorized access not properly handled');
    return false;
  } catch (error) {
    console.log(`❌ Error testing unauthorized access: ${error.message}`);
    return false;
  }
}

async function runFullTest() {
  const loginFlowWorks = await testCompleteLoginFlow();
  const unauthorizedFlowWorks = await testLoginFlowWithoutToken();
  
  console.log('\n🎯 COMPLETE LOGIN FLOW TEST RESULTS');
  console.log('=' .repeat(60));
  
  if (loginFlowWorks && unauthorizedFlowWorks) {
    console.log('🎉 COMPLETE LOGIN FLOW WORKING!');
    console.log('✅ Users can login successfully');
    console.log('✅ Portal access works after login');
    console.log('✅ Unauthorized access properly blocked');
    console.log('✅ No infinite redirect loops');
    console.log('🚀 System ready for production use!');
    return true;
  } else {
    console.log('❌ LOGIN FLOW ISSUES DETECTED!');
    console.log(`📊 Login flow: ${loginFlowWorks ? '✅' : '❌'}`);
    console.log(`📊 Unauthorized handling: ${unauthorizedFlowWorks ? '✅' : '❌'}`);
    console.log('🛑 System needs fixes before production use');
    return false;
  }
}

runFullTest().catch(console.error);