// Test cookie-based token handoff between login and portal guard
import fetch from 'node-fetch';

const API_BASE = 'https://insurance-syncedup-km2s838zq-nicks-projects-f40381ea.vercel.app';

async function testCookieTokenHandoff() {
  console.log('🍪 TESTING COOKIE TOKEN HANDOFF');
  console.log('=' .repeat(60));
  console.log(`🌐 URL: ${API_BASE}`);
  console.log('');
  
  try {
    // Step 1: Login and get cookie
    console.log('📋 Step 1: Testing login API and cookie setting...');
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
      console.log('❌ Login API failed - cannot test cookie handoff');
      return false;
    }
    
    // Extract the Set-Cookie header
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    console.log(`🍪 Set-Cookie header: ${setCookieHeader ? 'Present' : 'Missing'}`);
    
    if (setCookieHeader) {
      console.log(`🍪 Cookie details: ${setCookieHeader.substring(0, 100)}...`);
      
      // Parse the cookie
      const cookieMatch = setCookieHeader.match(/auth-token=([^;]+)/);
      if (cookieMatch) {
        const cookieToken = cookieMatch[1];
        console.log(`✅ Cookie token extracted: ${cookieToken.substring(0, 20)}...`);
        
        // Step 2: Test portal access using the cookie
        console.log('\\n📋 Step 2: Testing portal access with cookie...');
        
        const portalResponse = await fetch(`${API_BASE}/admin`, {
          method: 'GET',
          headers: {
            'Cookie': `auth-token=${cookieToken}`, // Send cookie manually
            'Referer': `${API_BASE}/login`
          },
          redirect: 'manual'
        });

        console.log(`📊 Portal access status: ${portalResponse.status}`);
        
        if (portalResponse.status === 302) {
          const location = portalResponse.headers.get('location');
          console.log(`🔄 Redirected to: ${location}`);
          
          if (location && location.includes('_admin')) {
            console.log('✅ Cookie token handoff working - portal access granted!');
            return true;
          } else if (location && location.includes('login')) {
            console.log('❌ Cookie token not working - redirected to login');
            return false;
          } else {
            console.log('⚠️ Unexpected redirect destination');
            return false;
          }
        } else {
          console.log(`❌ Unexpected portal response: ${portalResponse.status}`);
          return false;
        }
        
      } else {
        console.log('❌ Could not extract token from cookie');
        return false;
      }
    } else {
      console.log('❌ No Set-Cookie header found');
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Error testing cookie handoff: ${error.message}`);
    return false;
  }
}

async function testWithoutCookie() {
  console.log('\\n📋 Testing portal access without cookie (should redirect to login)...');
  
  try {
    const response = await fetch(`${API_BASE}/admin`, {
      method: 'GET',
      redirect: 'manual'
    });

    console.log(`📊 Portal (no cookie) status: ${response.status}`);
    
    if (response.status === 302) {
      const location = response.headers.get('location');
      if (location && location.includes('/login')) {
        console.log('✅ No cookie properly redirected to login');
        return true;
      }
    }
    
    console.log('❌ No cookie access not properly handled');
    return false;
  } catch (error) {
    console.log(`❌ Error testing no cookie access: ${error.message}`);
    return false;
  }
}

async function runCookieTest() {
  const cookieHandoffWorks = await testCookieTokenHandoff();
  const noCookieWorks = await testWithoutCookie();
  
  console.log('\\n🎯 COOKIE TOKEN HANDOFF TEST RESULTS');
  console.log('=' .repeat(60));
  
  if (cookieHandoffWorks && noCookieWorks) {
    console.log('🎉 COOKIE TOKEN HANDOFF WORKING!');
    console.log('✅ Login sets authentication cookie');
    console.log('✅ Portal guard reads cookie correctly');
    console.log('✅ Token handoff seamless');
    console.log('✅ Unauthorized access blocked');
    console.log('🚀 System ready for production use!');
    return true;
  } else {
    console.log('❌ COOKIE TOKEN HANDOFF ISSUES!');
    console.log(`📊 Cookie handoff: ${cookieHandoffWorks ? '✅' : '❌'}`);
    console.log(`📊 No cookie handling: ${noCookieWorks ? '✅' : '❌'}`);
    console.log('🛑 System needs fixes before production use');
    return false;
  }
}

runCookieTest().catch(console.error);