// Quick test of super admin APIs
const https = require('https');

const testUrl = 'https://insurance-syncedup.vercel.app/api/super-admin/metrics';

https.get(testUrl, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', data);
    });
}).on('error', console.error);
