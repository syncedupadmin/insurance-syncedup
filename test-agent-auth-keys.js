const { createClient } = require('@supabase/supabase-js');

// Test both key formats
const SUPABASE_URL = 'https://zgkszwkxibpnxhvlenct.supabase.co';
const JWT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpna3N6d2t4aWJwbnhodmxlbmN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMTk3OTMsImV4cCI6MjA3MTg5NTc5M30.1n7a1TYOM2zWiCUfGFhQnfPb8fjvDkDa_ba3CKZEB98';
const SHORT_ANON_KEY = 'sb_publishable_WWDGtn5vkQyCoRWn3yOvjg_VAjMlr_-';

async function testAuth() {
    console.log('Testing Supabase authentication with different keys...\n');

    // Test with JWT key (used in frontend)
    console.log('1. Testing with JWT ANON KEY:');
    try {
        const supabase1 = createClient(SUPABASE_URL, JWT_ANON_KEY);
        const { data, error } = await supabase1.auth.signInWithPassword({
            email: 'agent1@phsagency.com',
            password: process.argv[2] || 'PHS@Agent2024!'
        });

        if (error) {
            console.log('   ❌ JWT Key failed:', error.message);
        } else {
            console.log('   ✅ JWT Key SUCCESS!');
            console.log('   User ID:', data.user.id);
            console.log('   Email:', data.user.email);
            console.log('   Role:', data.user.user_metadata?.role || data.user.app_metadata?.role || 'agent');
        }
    } catch (err) {
        console.log('   ❌ JWT Key exception:', err.message);
    }

    console.log('\n2. Testing with SHORT ANON KEY (from .env):');
    try {
        const supabase2 = createClient(SUPABASE_URL, SHORT_ANON_KEY);
        const { data, error } = await supabase2.auth.signInWithPassword({
            email: 'agent1@phsagency.com',
            password: process.argv[2] || 'PHS@Agent2024!'
        });

        if (error) {
            console.log('   ❌ Short Key failed:', error.message);
        } else {
            console.log('   ✅ Short Key SUCCESS!');
            console.log('   User ID:', data.user.id);
            console.log('   Email:', data.user.email);
            console.log('   Role:', data.user.user_metadata?.role || data.user.app_metadata?.role || 'agent');
        }
    } catch (err) {
        console.log('   ❌ Short Key exception:', err.message);
    }

    console.log('\n3. Testing via API endpoint with current backend config:');
    const fetch = require('node-fetch');
    try {
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'agent1@phsagency.com',
                password: process.argv[2] || 'PHS@Agent2024!'
            })
        });

        const result = await response.text();
        if (response.ok) {
            console.log('   ✅ API Endpoint SUCCESS!');
            console.log('   Response:', result);
        } else {
            console.log('   ❌ API Endpoint failed:', response.status);
            console.log('   Response:', result);
        }
    } catch (err) {
        console.log('   ❌ API Endpoint exception:', err.message);
    }
}

testAuth().then(() => {
    console.log('\nTest complete. If JWT key works but Short key fails, the .env file has wrong key.');
    process.exit(0);
}).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});