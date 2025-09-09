// Test production authentication with real credentials
import fetch from 'node-fetch';

const API_BASE = 'https://insurance-syncedup-4865up1r7-nicks-projects-f40381ea.vercel.app/api';
// const API_BASE = 'http://localhost:3000/api'; // Use for local testing

// Test credentials from the database (updated with secure passwords)
const TEST_CREDENTIALS = [
  { email: 'admin@demo.com', password: 'Demo@Admin2024!', expected_role: 'admin' },
  { email: 'agent@demo.com', password: 'Demo@Agent2024!', expected_role: 'agent' },
  { email: 'manager@demo.com', password: 'Demo@Manager2024!', expected_role: 'manager' },
  { email: 'admin@syncedupsolutions.com', password: 'Super@Admin2024!', expected_role: 'super_admin' }
];

async function testLogin(credentials) {
  console.log(`\n🔐 Testing login for: ${credentials.email}`);
  
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password
      })
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const error = await response.text();
      console.log(`   ❌ Login failed: ${error}`);
      return null;
    }

    const result = await response.json();
    console.log(`   ✅ Login successful`);
    console.log(`   User ID: ${result.user?.id}`);
    console.log(`   Role: ${result.user?.role}`);
    console.log(`   Agency: ${result.user?.agency_id}`);
    console.log(`   Token: ${result.token ? 'Present' : 'Missing'}`);
    
    return result.token;
  } catch (error) {
    console.log(`   ❌ Network error: ${error.message}`);
    return null;
  }
}

async function testTokenVerify(token, email) {
  console.log(`\n🔍 Testing token verification for: ${email}`);
  
  try {
    const response = await fetch(`${API_BASE}/auth/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const error = await response.text();
      console.log(`   ❌ Verification failed: ${error}`);
      return false;
    }

    const result = await response.json();
    console.log(`   ✅ Token verification successful`);
    console.log(`   Valid: ${result.valid}`);
    console.log(`   User: ${result.user?.email}`);
    console.log(`   Role: ${result.user?.role}`);
    
    return true;
  } catch (error) {
    console.log(`   ❌ Network error: ${error.message}`);
    return false;
  }
}

async function testProtectedEndpoint(token, email) {
  console.log(`\n🛡️ Testing protected endpoint for: ${email}`);
  
  try {
    const response = await fetch(`${API_BASE}/sales`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const error = await response.text();
      console.log(`   ❌ Protected endpoint failed: ${error}`);
      return false;
    }

    const result = await response.json();
    console.log(`   ✅ Protected endpoint accessible`);
    console.log(`   Sales data: ${result.sales ? result.sales.length + ' records' : 'No data'}`);
    
    return true;
  } catch (error) {
    console.log(`   ❌ Network error: ${error.message}`);
    return false;
  }
}

async function runProductionAuthTest() {
  console.log('🚀 PRODUCTION AUTHENTICATION TEST');
  console.log('='.repeat(50));
  console.log(`Testing API: ${API_BASE}`);
  
  let successCount = 0;
  let totalTests = 0;
  
  for (const creds of TEST_CREDENTIALS) {
    totalTests++;
    console.log('\n' + '='.repeat(60));
    
    // Test login
    const token = await testLogin(creds);
    if (!token) {
      console.log(`❌ FAILED: Could not login as ${creds.email}`);
      continue;
    }
    
    // Test token verification
    const verifySuccess = await testTokenVerify(token, creds.email);
    if (!verifySuccess) {
      console.log(`❌ FAILED: Token verification failed for ${creds.email}`);
      continue;
    }
    
    // Test protected endpoint
    const protectedSuccess = await testProtectedEndpoint(token, creds.email);
    if (!protectedSuccess) {
      console.log(`❌ FAILED: Protected endpoint access failed for ${creds.email}`);
      continue;
    }
    
    console.log(`\n✅ SUCCESS: Full authentication flow working for ${creds.email}`);
    successCount++;
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 PRODUCTION AUTHENTICATION TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${successCount}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - successCount}/${totalTests}`);
  
  if (successCount === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED - PRODUCTION AUTHENTICATION IS WORKING!');
    console.log('✅ System is ready for production deployment');
  } else {
    console.log('\n🚨 SOME TESTS FAILED - AUTHENTICATION NEEDS FIXES');
    console.log('❌ Do not deploy until all tests pass');
  }
}

// Run the test
runProductionAuthTest().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});