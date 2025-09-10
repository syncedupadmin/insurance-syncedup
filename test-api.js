const https = require('https');

const tests = [
    'https://insurance.syncedupsolutions.com/api/super-admin/metrics',
    'https://insurance.syncedupsolutions.com/api/super-admin/agencies'
];

tests.forEach(url => {
    https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log(`\nURL: ${url}`);
            console.log('Status:', res.statusCode);
            console.log('Response:', data.slice(0, 200));
        });
    }).on('error', err => {
        console.log(`\nURL: ${url}`);
        console.log('Error:', err.message);
    });
});
