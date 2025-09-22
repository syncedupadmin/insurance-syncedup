const https = require('https');

// Convoso API token from your codebase
const AUTH_TOKEN = '8nf3i9mmzoxidg3ntm28gbxvlhdiqo3p';

// Lead ID to fetch
const LEAD_ID = '10256299';

async function fetchLeadData() {
    console.log('\n========================================');
    console.log('FETCHING CONVOSO LEAD DATA - REAL API');
    console.log('========================================');
    console.log('Lead ID:', LEAD_ID);
    console.log('Timestamp:', new Date().toISOString());

    // Try the search endpoint like in your existing code
    const postData = JSON.stringify({
        search: {
            lead_id: LEAD_ID
        },
        limit: 10,
        offset: 0
    });

    const options = {
        hostname: 'api.convoso.com',
        port: 443,
        path: '/v1/leads/search',
        method: 'POST',
        headers: {
            'X-Auth-Token': AUTH_TOKEN,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    console.log('\nSending request to Convoso API...');
    console.log('Headers:', JSON.stringify(options.headers, null, 2));
    console.log('Body:', postData);

    const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            console.log('\n--- RESPONSE STATUS ---');
            console.log('Status Code:', res.statusCode);
            console.log('Status Message:', res.statusMessage);

            console.log('\n--- RAW RESPONSE ---');
            console.log(data);

            try {
                const parsed = JSON.parse(data);
                console.log('\n--- PARSED JSON ---');
                console.log(JSON.stringify(parsed, null, 2));

                // If we got lead data, show individual fields
                if (parsed.success && parsed.data) {
                    console.log('\n--- LEAD DATA FIELDS ---');
                    if (Array.isArray(parsed.data) && parsed.data.length > 0) {
                        const lead = parsed.data[0];
                        console.log('\nLead found! Here are all the fields:');
                        console.log('=====================================');
                        for (const [key, value] of Object.entries(lead)) {
                            console.log(`${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
                        }
                    } else if (typeof parsed.data === 'object') {
                        console.log('\nLead found! Here are all the fields:');
                        console.log('=====================================');
                        for (const [key, value] of Object.entries(parsed.data)) {
                            console.log(`${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
                        }
                    }
                }
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

    req.write(postData);
    req.end();
}

// Also try the dispositions endpoint to see recent activity
async function fetchDispositions() {
    console.log('\n========================================');
    console.log('FETCHING RECENT DISPOSITIONS');
    console.log('========================================');

    const postData = JSON.stringify({
        search: {},
        limit: 5,
        offset: 0
    });

    const options = {
        hostname: 'api.convoso.com',
        port: 443,
        path: '/v1/dispositions/search',
        method: 'POST',
        headers: {
            'X-Auth-Token': AUTH_TOKEN,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            console.log('Status:', res.statusCode);

            try {
                const parsed = JSON.parse(data);
                if (parsed.success && parsed.data) {
                    console.log('\n--- SAMPLE DISPOSITION RECORD ---');
                    if (Array.isArray(parsed.data) && parsed.data.length > 0) {
                        const record = parsed.data[0];
                        console.log('\nFields in disposition record:');
                        console.log('=====================================');
                        for (const [key, value] of Object.entries(record)) {
                            console.log(`${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
                        }
                    }
                } else {
                    console.log('Response:', JSON.stringify(parsed, null, 2));
                }
            } catch (e) {
                console.log('Could not parse:', e.message);
            }
        });
    });

    req.on('error', (e) => {
        console.error('Request failed:', e);
    });

    req.write(postData);
    req.end();
}

// Run both
fetchLeadData();
setTimeout(() => fetchDispositions(), 2000);