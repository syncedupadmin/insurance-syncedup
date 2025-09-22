// Test login functionality and portal access
import fetch from 'node-fetch';

const API_BASE = 'https://insurance-syncedup-g5w6n8la9-nicks-projects-f40381ea.vercel.app';

async function testLoginPage() {
  try {
    console.log('🔍 Testing login page accessibility...');
    
    const response = await fetch(`${API_BASE}/login`);
    
    console.log(`📊 Login page status: ${response.status}`);
    
    if (response.status === 200) {
      const text = await response.text();
      const hasLoginForm = text.includes('Sign In') || text.includes('login');
      console.log(`✅ Login page accessible: ${hasLoginForm ? 'Has login form' : 'Missing login form'}`);
      return hasLoginForm;
    } else {
      console.log(`❌ Login page not accessible: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error accessing login page: ${error.message}`);
    return false;
  }
}

async function testLoginAPI() {
  try {
    console.log('🔍 Testing login API...');
    
    const response = await fetch(`${API_BASE}/api/auth/login`, {
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
      console.log('✅ Login API working - token received');
      return result.token;
    } else {
      console.log(`❌ Login API failed: ${response.status}`);
      return null;
    }
  } catch (error) {
    console.log(`❌ Error testing login API: ${error.message}`);
    return null;
  }
}

async function testPortalAccessWithToken(token) {
  try {
    console.log('🔍 Testing portal access with valid token...');
    
    const response = await fetch(`${API_BASE}/admin`, {
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
      
      if (location && location.includes('/portal-files/admin')) {
        console.log('✅ Portal guard working - redirecting to admin portal');
        return true;
      } else {
        console.log('⚠️ Unexpected redirect location');
        return false;
      }
    } else if (response.status === 200) {
      console.log('✅ Direct access granted (expected for authorized user)');
      return true;
    } else {
      console.log(`❌ Unexpected portal response: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error testing portal access: ${error.message}`);
    return false;
  }
}

async function testPortalAccessWithoutToken() {
  try {
    console.log('🔍 Testing portal access without token...');
    
    const response = await fetch(`${API_BASE}/admin`, {
      method: 'GET',
      redirect: 'manual'
    });

    console.log(`📊 Admin portal (no auth) status: ${response.status}`);
    
    if (response.status === 302) {
      const location = response.headers.get('location');
      console.log(`🔄 Redirected to: ${location}`);
      
      if (location && location.includes('/login')) {
        console.log('✅ Portal protection working - redirecting to login');
        return true;
      }
    }
    
    console.log('❌ Portal should redirect to login when not authenticated');
    return false;
  } catch (error) {
    console.log(`❌ Error testing portal protection: ${error.message}`);
    return false;
  }
}

async function runLoginTests() {
  console.log('🧪 TESTING LOGIN FUNCTIONALITY');
  console.log('=' .repeat(60));
  
  let allPassed = true;
  
  // Test 1: Login page accessibility
  const loginPageWorks = await testLoginPage();
  if (!loginPageWorks) allPassed = false;
  
  console.log('');
  
  // Test 2: Login API functionality
  const token = await testLoginAPI();
  if (!token) allPassed = false;
  
  console.log('');
  
  // Test 3: Portal access with authentication
  if (token) {
    const portalAccessWorks = await testPortalAccessWithToken(token);
    if (!portalAccessWorks) allPassed = false;
  }
  
  console.log('');
  
  // Test 4: Portal protection without authentication
  const portalProtectionWorks = await testPortalAccessWithoutToken();
  if (!portalProtectionWorks) allPassed = false;
  
  console.log('');
  console.log('🎯 FINAL RESULTS');
  console.log('=' .repeat(60));
  
  if (allPassed) {
    console.log('🎉 ALL LOGIN TESTS PASSED!');
    console.log('✅ Login page accessible');
    console.log('✅ Login API functional'); 
    console.log('✅ Portal access working');
    console.log('✅ Portal protection enforced');
    console.log('🚀 System is PRODUCTION READY!');
  } else {
    console.log('❌ Some login tests failed!');
    console.log('🛑 System needs fixes before production use');
  }
  
  return allPassed;
}

runLoginTests().catch(console.error);