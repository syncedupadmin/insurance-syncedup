const https = require('https');

// Convoso API credentials - you'll need to provide these
const API_KEY = 'your_api_key';
const API_SECRET = 'your_api_secret';
const ACCOUNT_ID = 'your_account_id';

// Lead ID to fetch
const LEAD_ID = '10256299';

// Convoso API endpoint
const options = {
    hostname: 'api.convoso.com',
    port: 443,
    path: `/v1/leads/${LEAD_ID}`,
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
};

console.log('\n========================================');
console.log('FETCHING CONVOSO LEAD DATA');
console.log('========================================');
console.log('Lead ID:', LEAD_ID);
console.log('Timestamp:', new Date().toISOString());
console.log('\nSending request to Convoso API...\n');

const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('--- RESPONSE STATUS ---');
        console.log('Status Code:', res.statusCode);
        console.log('Status Message:', res.statusMessage);

        console.log('\n--- RESPONSE HEADERS ---');
        console.log(JSON.stringify(res.headers, null, 2));

        console.log('\n--- RAW RESPONSE ---');
        console.log(data);

        try {
            const parsed = JSON.parse(data);
            console.log('\n--- PARSED JSON ---');
            console.log(JSON.stringify(parsed, null, 2));

            console.log('\n--- INDIVIDUAL FIELDS ---');
            function logFields(obj, prefix = '') {
                for (const [key, value] of Object.entries(obj)) {
                    if (typeof value === 'object' && value !== null) {
                        console.log(`${prefix}${key}: [object]`);
                        logFields(value, `  ${prefix}`);
                    } else {
                        console.log(`${prefix}${key}: ${value}`);
                    }
                }
            }
            logFields(parsed);

        } catch (e) {
            console.log('\nCould not parse response as JSON');
            console.log('Error:', e.message);
        }

        console.log('\n========================================\n');
    });
});

req.on('error', (e) => {
    console.error('Request failed:', e);
});

req.end();