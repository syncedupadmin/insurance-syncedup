// Simple script to verify routing configuration
const https = require('https');

const baseUrl = 'https://insurance.syncedupsolutions.com';

const urls = [
    '/admin',
    '/manager', 
    '/agent',
    '/customer-service',
    '/super-admin',
    '/login',
    '/admin/admin-global.css',
    '/agent/agent-global.css',
    '/manager/manager-global.css'
];

console.log('🔍 Verifying Clean URLs on Production\n');
console.log('=' .repeat(60));

async function checkUrl(url) {
    return new Promise((resolve) => {
        const fullUrl = baseUrl + url;
        
        https.get(fullUrl, (res) => {
            let status = res.statusCode;
            let result = '';
            
            if (status === 200) {
                result = '✅ OK';
            } else if (status === 301 || status === 302) {
                result = `↪️ Redirect to: ${res.headers.location}`;
            } else if (status === 404) {
                result = '❌ Not Found';
            } else {
                result = `⚠️ Status: ${status}`;
            }
            
            console.log(`${url.padEnd(35)} → ${result}`);
            resolve();
        }).on('error', (err) => {
            console.log(`${url.padEnd(35)} → ❌ Error: ${err.message}`);
            resolve();
        });
    });
}

async function runChecks() {
    for (const url of urls) {
        await checkUrl(url);
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('\n✅ Route verification complete');
    console.log('\nNotes:');
    console.log('- Portal URLs should redirect to /login when not authenticated');
    console.log('- CSS files should return 200 OK');
    console.log('- Clean URLs (without underscores) should work');
}

runChecks();