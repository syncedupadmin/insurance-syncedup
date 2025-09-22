// Verify network calls match expected pattern
require('dotenv').config();

const BASE_URL = 'https://insurance.syncedupsolutions.com';

async function verifyNetworkCalls() {
    console.log('\n========================================');
    console.log('Network Call Verification (DevTools Simulation)');
    console.log('========================================\n');

    const networkLog = [];

    // Helper to log network calls
    function logCall(method, path, status) {
        const entry = `${method} ${path} → ${status}`;
        networkLog.push(entry);
        if (path.includes('/api/auth/login') && method === 'POST') {
            console.error(`❌ UNEXPECTED: ${entry}`);
        } else if (path.includes('/api/auth/verify') || path.includes('/api/auth/me')) {
            console.log(`✅ EXPECTED: ${entry}`);
        } else if (path.endsWith('.html')) {
            console.log(`📄 PAGE: ${entry}`);
        }
    }

    try {
        // Step 1: Login once (expected)
        console.log('1. Initial login (expected POST /api/auth/login)...');
        const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'agent1@phsagency.com',
                password: 'Agent123!'
            })
        });
        logCall('POST', '/api/auth/login', loginRes.status);

        const loginData = await loginRes.json();
        if (!loginRes.ok) {
            console.error('❌ Login failed:', loginData);
            return;
        }

        // Extract auth token
        const cookies = loginRes.headers.get('set-cookie');
        const authTokenMatch = cookies?.match(/auth_token=([^;]+)/);
        const authToken = authTokenMatch ? authTokenMatch[1] : null;

        console.log('\n2. Navigate to /agent/quotes (should NOT call login)...');

        // Load quotes page
        const quotesRes = await fetch(`${BASE_URL}/agent/quotes`, {
            headers: {
                'Cookie': `auth_token=${authToken}`,
                'Accept': 'text/html'
            }
        });
        logCall('GET', '/_agent/quotes.html', quotesRes.status);

        // Simulate what the page would do - call verify
        const verifyRes1 = await fetch(`${BASE_URL}/api/auth/verify`, {
            headers: { 'Cookie': `auth_token=${authToken}` }
        });
        logCall('GET', '/api/auth/verify', verifyRes1.status);

        // Maybe also calls /api/auth/me
        const meRes1 = await fetch(`${BASE_URL}/api/auth/me`, {
            headers: { 'Cookie': `auth_token=${authToken}` }
        });
        logCall('GET', '/api/auth/me', meRes1.status);

        console.log('\n3. Navigate to /agent/commissions (should NOT call login)...');

        // Load commissions page
        const commissionsRes = await fetch(`${BASE_URL}/agent/commissions`, {
            headers: {
                'Cookie': `auth_token=${authToken}`,
                'Accept': 'text/html'
            }
        });
        logCall('GET', '/_agent/commissions.html', commissionsRes.status);

        // Simulate what the page would do
        const verifyRes2 = await fetch(`${BASE_URL}/api/auth/verify`, {
            headers: { 'Cookie': `auth_token=${authToken}` }
        });
        logCall('GET', '/api/auth/verify', verifyRes2.status);

        console.log('\n========================================');
        console.log('Network Log Summary:');
        console.log('========================================');

        const loginCalls = networkLog.filter(l => l.includes('POST /api/auth/login')).length;
        const verifyCalls = networkLog.filter(l => l.includes('/api/auth/verify')).length;
        const meCalls = networkLog.filter(l => l.includes('/api/auth/me')).length;

        console.log(`• POST /api/auth/login calls: ${loginCalls} (should be 1)`);
        console.log(`• GET /api/auth/verify calls: ${verifyCalls}`);
        console.log(`• GET /api/auth/me calls: ${meCalls}`);

        if (loginCalls === 1) {
            console.log('\n✅ SUCCESS: Only one login call as expected!');
        } else {
            console.log(`\n❌ FAILURE: Expected 1 login call, got ${loginCalls}`);
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

verifyNetworkCalls();