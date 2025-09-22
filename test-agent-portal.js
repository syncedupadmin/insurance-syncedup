// Test agent portal authentication
require('dotenv').config();

const BASE_URL = 'https://insurance.syncedupsolutions.com';

async function testAgentPortal() {
    console.log('\n========================================');
    console.log('Testing Agent Portal Authentication');
    console.log('========================================\n');

    try {
        // Step 1: Login as agent1@phsagency.com
        console.log('1. Attempting login as agent1@phsagency.com...');
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
        console.log('   - User:', loginData.user?.email);
        console.log('   - Role:', loginData.user?.role);

        // Extract auth token from Set-Cookie header
        const cookies = loginRes.headers.get('set-cookie');
        const authTokenMatch = cookies?.match(/auth_token=([^;]+)/);
        const authToken = authTokenMatch ? authTokenMatch[1] : null;

        if (!authToken) {
            console.error('❌ No auth token in response');
            return;
        }

        console.log('✅ Auth token received');

        // Step 2: Test accessing agent dashboard
        console.log('\n2. Testing access to agent dashboard...');
        const dashboardRes = await fetch(`${BASE_URL}/_agent/index.html`, {
            headers: {
                'Cookie': `auth_token=${authToken}`
            }
        });

        if (dashboardRes.ok) {
            console.log('✅ Agent dashboard accessible');
        } else {
            console.log('❌ Agent dashboard returned:', dashboardRes.status);
        }

        // Step 3: Test accessing quotes page
        console.log('\n3. Testing access to quotes page...');
        const quotesRes = await fetch(`${BASE_URL}/_agent/quotes.html`, {
            headers: {
                'Cookie': `auth_token=${authToken}`
            }
        });

        if (quotesRes.ok) {
            console.log('✅ Quotes page accessible');
        } else {
            console.log('❌ Quotes page returned:', quotesRes.status);
        }

        // Step 4: Test accessing commissions page
        console.log('\n4. Testing access to commissions page...');
        const commissionsRes = await fetch(`${BASE_URL}/_agent/commissions.html`, {
            headers: {
                'Cookie': `auth_token=${authToken}`
            }
        });

        if (commissionsRes.ok) {
            console.log('✅ Commissions page accessible');
        } else {
            console.log('❌ Commissions page returned:', commissionsRes.status);
        }

        // Step 5: Test accessing settings page
        console.log('\n5. Testing access to settings page...');
        const settingsRes = await fetch(`${BASE_URL}/_agent/settings.html`, {
            headers: {
                'Cookie': `auth_token=${authToken}`
            }
        });

        if (settingsRes.ok) {
            console.log('✅ Settings page accessible');
        } else {
            console.log('❌ Settings page returned:', settingsRes.status);
        }

        // Step 6: Verify authentication endpoint
        console.log('\n6. Verifying authentication status...');
        const verifyRes = await fetch(`${BASE_URL}/api/auth/verify`, {
            headers: {
                'Cookie': `auth_token=${authToken}`
            }
        });

        if (verifyRes.ok) {
            const verifyData = await verifyRes.json();
            console.log('✅ Authentication verified');
            console.log('   - User:', verifyData.user?.email);
            console.log('   - Role:', verifyData.user?.role);
        } else {
            console.log('❌ Verify endpoint returned:', verifyRes.status);
        }

        console.log('\n========================================');
        console.log('Test Complete - All agent pages should be accessible');
        console.log('========================================\n');

    } catch (error) {
        console.error('❌ Test failed with error:', error);
    }
}

// Run the test
testAgentPortal();