// Test agent1@phsagency.com portal access
require('dotenv').config();

async function testAgentPortalAccess() {
  console.log('\n=== Testing Agent Portal Access ===\n');

  const baseUrl = 'https://insurance.syncedupsolutions.com';
  const email = 'agent1@phsagency.com';
  const password = 'Agent123!'; // Standard test password

  // Step 1: Login
  console.log('1. Attempting login as agent1@phsagency.com...');
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  console.log('   Status:', loginRes.status);

  if (!loginRes.ok) {
    const error = await loginRes.json();
    console.log('❌ Login failed:', error.error || error.message);
    console.log('\nNOTE: You may need to reset the password for agent1@phsagency.com in Supabase Auth');
    return;
  }

  const loginData = await loginRes.json();
  console.log('✅ Login successful!');
  console.log('   Redirect:', loginData.redirect);
  console.log('   Role:', loginData.user?.role);

  // Get auth token from cookie
  const setCookieHeader = loginRes.headers.get('set-cookie');
  const authToken = setCookieHeader?.match(/auth_token=([^;]+)/)?.[1];

  if (!authToken) {
    console.log('❌ No auth token received');
    return;
  }

  console.log('✅ Auth token received\n');

  // Step 2: Test /api/auth/me
  console.log('2. Testing /api/auth/me...');
  const meRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { 'Cookie': `auth_token=${authToken}` }
  });

  console.log('   Status:', meRes.status);

  if (!meRes.ok) {
    const error = await meRes.text();
    console.log('❌ /api/auth/me failed:', error);
    return;
  }

  const meData = await meRes.json();
  console.log('✅ Authentication verified');
  console.log('   User:', meData.user?.email);
  console.log('   Role:', meData.user?.role);
  console.log('   Agency:', meData.user?.agency_id);

  // Step 3: Test Agent Portal Pages
  console.log('\n3. Testing Agent Portal Page Access...\n');

  const agentPages = [
    '/agent',
    '/agent/quotes',
    '/agent/commissions',
    '/agent/settings'
  ];

  for (const page of agentPages) {
    console.log(`Testing ${page}...`);

    const pageRes = await fetch(`${baseUrl}${page}`, {
      headers: {
        'Cookie': `auth_token=${authToken}`,
        'Accept': 'text/html'
      },
      redirect: 'manual'
    });

    if (pageRes.status === 200) {
      const html = await pageRes.text();

      // Check if it's the correct page content
      if (html.includes('<!DOCTYPE html>')) {
        if (html.includes('Dashboard') || html.includes('dashboard') ||
            html.includes('Quote') || html.includes('Commission') ||
            html.includes('Settings')) {
          console.log(`  ✅ ${page} - Accessible (200 OK)`);

          // Check for specific indicators
          if (html.includes('login') || html.includes('Login')) {
            console.log(`     ⚠️  Warning: Page may contain login elements`);
          }
        } else {
          console.log(`  ⚠️  ${page} - Loaded but content unclear`);
        }
      }
    } else if (pageRes.status === 302 || pageRes.status === 301) {
      const location = pageRes.headers.get('location');
      if (location?.includes('login')) {
        console.log(`  ❌ ${page} - Redirects to login (authentication failed)`);
      } else if (location?.includes('_agent')) {
        console.log(`  ✅ ${page} - Redirects to /_agent (expected rewrite)`);
      } else {
        console.log(`  ➡️  ${page} - Redirects to: ${location}`);
      }
    } else if (pageRes.status === 403) {
      console.log(`  🔒 ${page} - Access denied (403)`);
    } else if (pageRes.status === 404) {
      console.log(`  ❓ ${page} - Not found (404)`);
    } else {
      console.log(`  ❌ ${page} - Status: ${pageRes.status}`);
    }
  }

  // Step 4: Test an API that requires authentication
  console.log('\n4. Testing authenticated API access...');
  const apiRes = await fetch(`${baseUrl}/api/agent/dashboard`, {
    headers: { 'Cookie': `auth_token=${authToken}` }
  });

  if (apiRes.ok) {
    console.log('✅ API access working');
  } else {
    console.log(`⚠️  API returned status: ${apiRes.status}`);
  }

  console.log('\n=== Test Summary ===');
  console.log('Authentication is properly configured for agent1@phsagency.com');
  console.log('Portal pages should be accessible in the browser');
  console.log('\nIf pages are not loading in browser:');
  console.log('1. Clear browser cookies and cache');
  console.log('2. Try incognito/private mode');
  console.log('3. Ensure password is correct in Supabase Auth');
}

testAgentPortalAccess().catch(console.error);