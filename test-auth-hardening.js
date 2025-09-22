require('dotenv').config();
const https = require('https');

// Test authentication hardening locally
const BASE_URL = 'http://localhost:3002';

async function makeRequest(path, options = {}) {
  const url = new URL(path, BASE_URL);
  return new Promise((resolve, reject) => {
    const req = (url.protocol === 'https:' ? https : require('http')).request(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            cookies: res.headers['set-cookie'] || [],
            data: data ? JSON.parse(data) : null
          });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });

    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function testAuthFlow() {
  console.log('=== AUTH HARDENING TEST SUITE ===\n');

  // Test A: Login as admin
  console.log('TEST A: Login as admin@syncedupsolutions.com');
  const adminLogin = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@syncedupsolutions.com', password: 'Admin123!' }
  });

  console.log('Admin login status:', adminLogin.status);
  if (adminLogin.data) {
    console.log('[LOGIN] role sources:', adminLogin.data.user);
    console.log('Redirect path:', adminLogin.data.redirect);
  }

  const adminCookie = adminLogin.cookies[0];
  console.log('Cookie set:', adminCookie ? 'Yes' : 'No');

  // Verify admin session
  console.log('\nVerifying admin session...');
  const adminVerify = await makeRequest('/api/auth/verify', {
    headers: { Cookie: adminCookie }
  });
  console.log('Verify status:', adminVerify.status);
  if (adminVerify.data?.user) {
    console.log('[VERIFY] FINAL user payload:', adminVerify.data.user);
  }

  // Test B: Switch to agent1 (session mismatch test)
  console.log('\n' + '='.repeat(50));
  console.log('TEST B: Login as agent1@phsagency.com (session mismatch)');
  const agentLogin = await makeRequest('/api/auth/login', {
    method: 'POST',
    headers: { Cookie: adminCookie }, // Send admin cookie
    body: { email: 'agent1@phsagency.com', password: 'Agent1@PHS' }
  });

  console.log('Agent login status:', agentLogin.status);
  if (agentLogin.data) {
    console.log('[LOGIN] role sources:', agentLogin.data.user);
    console.log('Redirect path:', agentLogin.data.redirect);
  }

  const agentCookie = agentLogin.cookies[0];
  console.log('New cookie set:', agentCookie ? 'Yes' : 'No');

  // Verify agent session
  console.log('\nVerifying agent session...');
  const agentVerify = await makeRequest('/api/auth/verify', {
    headers: { Cookie: agentCookie || adminCookie }
  });
  console.log('Verify status:', agentVerify.status);
  if (agentVerify.data?.user) {
    console.log('[VERIFY] FINAL user payload:', agentVerify.data.user);
  }

  // Test C: Check deprecated /api/auth/me
  console.log('\n' + '='.repeat(50));
  console.log('TEST C: Check deprecated /api/auth/me endpoint');
  const meResponse = await makeRequest('/api/auth/me', {
    headers: { Cookie: agentCookie || adminCookie }
  });
  console.log('Me endpoint status:', meResponse.status);
  console.log('Response redirects to verify:', meResponse.data?.ok ? 'Yes' : 'No');

  console.log('\n=== TESTS COMPLETE ===');
}

// Run tests
testAuthFlow().catch(console.error);