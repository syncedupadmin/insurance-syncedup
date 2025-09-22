// Test that no POST /api/auth/login calls happen during page navigation
require('dotenv').config();
const https = require('https');

const BASE_URL = 'https://insurance.syncedupsolutions.com';

// Monkey-patch https to log all requests
const originalRequest = https.request;
const loginCalls = [];

https.request = function(options, callback) {
    // Log any login attempts
    if (options.path && options.path.includes('/api/auth/login') && options.method === 'POST') {
        loginCalls.push({
            path: options.path,
            method: options.method,
            time: new Date().toISOString()
        });
        console.error(`❌ DETECTED UNWANTED LOGIN CALL: ${options.method} ${options.path}`);
    }
    return originalRequest.call(this, options, callback);
};

async function testNoUnwantedLogins() {
    console.log('\n========================================');
    console.log('Testing for Unwanted Login Calls');
    console.log('========================================\n');

    try {
        // Step 1: Login properly once
        console.log('1. Initial login (this is expected)...');
        const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'agent1@phsagency.com',
                password: 'Agent123!'
            })
        });

        const loginData = await loginRes.json();

        if (!loginRes.ok) {
            console.error('❌ Login failed:', loginData);
            return;
        }

        console.log('✅ Initial login successful');

        // Extract auth token
        const cookies = loginRes.headers.get('set-cookie');
        const authTokenMatch = cookies?.match(/auth_token=([^;]+)/);
        const authToken = authTokenMatch ? authTokenMatch[1] : null;

        if (!authToken) {
            console.error('❌ No auth token in response');
            return;
        }

        // Clear login calls counter (we expect one from above)
        loginCalls.length = 0;

        // Step 2: Navigate to quotes page and monitor for login calls
        console.log('\n2. Navigating to quotes page (should NOT trigger login)...');
        const quotesRes = await fetch(`${BASE_URL}/agent/quotes`, {
            headers: {
                'Cookie': `auth_token=${authToken}`,
                'Accept': 'text/html'
            }
        });

        if (loginCalls.length > 0) {
            console.error(`❌ PROBLEM: ${loginCalls.length} unwanted login call(s) detected!`);
            loginCalls.forEach(call => {
                console.error(`   - ${call.time}: ${call.method} ${call.path}`);
            });
        } else {
            console.log('✅ No unwanted login calls when navigating to quotes');
        }

        // Step 3: Navigate to commissions page
        console.log('\n3. Navigating to commissions page (should NOT trigger login)...');
        loginCalls.length = 0;

        const commissionsRes = await fetch(`${BASE_URL}/agent/commissions`, {
            headers: {
                'Cookie': `auth_token=${authToken}`,
                'Accept': 'text/html'
            }
        });

        if (loginCalls.length > 0) {
            console.error(`❌ PROBLEM: ${loginCalls.length} unwanted login call(s) detected!`);
            loginCalls.forEach(call => {
                console.error(`   - ${call.time}: ${call.method} ${call.path}`);
            });
        } else {
            console.log('✅ No unwanted login calls when navigating to commissions');
        }

        // Step 4: Verify auth is still valid
        console.log('\n4. Verifying auth is still valid...');
        const verifyRes = await fetch(`${BASE_URL}/api/auth/verify`, {
            headers: {
                'Cookie': `auth_token=${authToken}`
            }
        });

        if (verifyRes.ok) {
            const verifyData = await verifyRes.json();
            console.log('✅ Authentication still valid');
            console.log('   - User:', verifyData.user?.email);
        } else {
            console.error('❌ Auth verification failed');
        }

        console.log('\n========================================');
        if (loginCalls.length === 0) {
            console.log('✅ SUCCESS: No unwanted login calls detected!');
        } else {
            console.log(`❌ FAILURE: ${loginCalls.length} unwanted login calls detected`);
        }
        console.log('========================================\n');

    } catch (error) {
        console.error('❌ Test failed with error:', error);
    }
}

// Run the test
testNoUnwantedLogins();