// Test agent portal authentication with page content validation
require('dotenv').config();

const BASE_URL = 'https://insurance.syncedupsolutions.com';

async function testAgentPortalPages() {
    console.log('\n========================================');
    console.log('Testing Agent Portal Pages in Browser');
    console.log('========================================\n');

    try {
        // Step 1: Login as agent1@phsagency.com
        console.log('1. Logging in as agent1@phsagency.com...');
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

        console.log('✅ Login successful!');

        // Extract auth token from Set-Cookie header
        const cookies = loginRes.headers.get('set-cookie');
        const authTokenMatch = cookies?.match(/auth_token=([^;]+)/);
        const authToken = authTokenMatch ? authTokenMatch[1] : null;

        if (!authToken) {
            console.error('❌ No auth token in response');
            return;
        }

        // Step 2: Test quotes page and check for redirect
        console.log('\n2. Testing /agent/quotes page...');
        const quotesRes = await fetch(`${BASE_URL}/agent/quotes`, {
            headers: {
                'Cookie': `auth_token=${authToken}`,
                'Accept': 'text/html'
            },
            redirect: 'manual' // Don't follow redirects automatically
        });

        if (quotesRes.status === 302 || quotesRes.status === 301) {
            const location = quotesRes.headers.get('location');
            console.error('❌ Quotes page redirected to:', location);
            console.log('   This means authentication is not working!');
        } else if (quotesRes.ok) {
            const content = await quotesRes.text();
            if (content.includes('login') || content.includes('Login')) {
                console.error('❌ Quotes page contains login content - auth failed');
            } else if (content.includes('Quote Products')) {
                console.log('✅ Quotes page loaded correctly with proper content');
            } else {
                console.log('⚠️  Quotes page loaded but content unclear');
            }
        }

        // Step 3: Test commissions page
        console.log('\n3. Testing /agent/commissions page...');
        const commissionsRes = await fetch(`${BASE_URL}/agent/commissions`, {
            headers: {
                'Cookie': `auth_token=${authToken}`,
                'Accept': 'text/html'
            },
            redirect: 'manual'
        });

        if (commissionsRes.status === 302 || commissionsRes.status === 301) {
            const location = commissionsRes.headers.get('location');
            console.error('❌ Commissions page redirected to:', location);
            console.log('   This means authentication is not working!');
        } else if (commissionsRes.ok) {
            const content = await commissionsRes.text();
            if (content.includes('login') || content.includes('Login')) {
                console.error('❌ Commissions page contains login content - auth failed');
            } else if (content.includes('My Commissions')) {
                console.log('✅ Commissions page loaded correctly with proper content');
            } else {
                console.log('⚠️  Commissions page loaded but content unclear');
            }
        }

        // Step 4: Test settings page
        console.log('\n4. Testing /agent/settings page...');
        const settingsRes = await fetch(`${BASE_URL}/agent/settings`, {
            headers: {
                'Cookie': `auth_token=${authToken}`,
                'Accept': 'text/html'
            },
            redirect: 'manual'
        });

        if (settingsRes.status === 302 || settingsRes.status === 301) {
            const location = settingsRes.headers.get('location');
            console.error('❌ Settings page redirected to:', location);
            console.log('   This means authentication is not working!');
        } else if (settingsRes.ok) {
            const content = await settingsRes.text();
            if (content.includes('login') || content.includes('Login')) {
                console.error('❌ Settings page contains login content - auth failed');
            } else if (content.includes('Agent Settings')) {
                console.log('✅ Settings page loaded correctly with proper content');
            } else {
                console.log('⚠️  Settings page loaded but content unclear');
            }
        }

        // Step 5: Test that we can call verify and stay authenticated
        console.log('\n5. Testing auth persistence with /api/auth/verify...');
        const verifyRes = await fetch(`${BASE_URL}/api/auth/verify`, {
            headers: {
                'Cookie': `auth_token=${authToken}`
            }
        });

        if (verifyRes.ok) {
            const verifyData = await verifyRes.json();
            console.log('✅ Auth still valid after page navigation');
            console.log('   - User:', verifyData.user?.email);
            console.log('   - Role:', verifyData.user?.role);
        } else {
            console.error('❌ Auth verification failed after navigation');
        }

        console.log('\n========================================');
        console.log('Browser Simulation Test Complete');
        console.log('========================================\n');

    } catch (error) {
        console.error('❌ Test failed with error:', error);
    }
}

// Run the test
testAgentPortalPages();