const https = require('https');
const querystring = require('querystring');

// Convoso API token
const AUTH_TOKEN = '8nf3i9mmzoxidg3ntm28gbxvlhdiqo3p';
const LEAD_ID = '10256299';

console.log('\n========================================');
console.log('FETCHING REAL CONVOSO LEAD DATA');
console.log('========================================');
console.log('Lead ID:', LEAD_ID);
console.log('Timestamp:', new Date().toISOString());

// Using the same format as your working agent-monitor API
const postData = querystring.stringify({
    auth_token: AUTH_TOKEN,
    lead_id: LEAD_ID,
    limit: 10,
    offset: 0,
    with_details: 1,
    with_custom_fields: 1,
    with_all_fields: 1
});

const options = {
    hostname: 'api.convoso.com',
    port: 443,
    path: '/v1/leads/search',
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
    }
};

console.log('\nSending request to Convoso API...');
console.log('Path:', options.path);
console.log('Body:', postData);

const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('\n--- RESPONSE STATUS ---');
        console.log('Status Code:', res.statusCode);

        try {
            const parsed = JSON.parse(data);

            if (parsed.success && parsed.data) {
                console.log('\n✅ SUCCESS! Lead data retrieved\n');

                // Check different possible data structures
                let leads = [];
                if (parsed.data.entries && parsed.data.entries.leads) {
                    leads = parsed.data.entries.leads;
                } else if (Array.isArray(parsed.data)) {
                    leads = parsed.data;
                } else if (parsed.data.leads) {
                    leads = parsed.data.leads;
                }

                if (leads.length > 0) {
                    const lead = leads[0];
                    console.log('========================================');
                    console.log('COMPLETE LEAD FIELDS FROM CONVOSO:');
                    console.log('========================================\n');

                    // Display all fields
                    Object.keys(lead).sort().forEach(key => {
                        const value = lead[key];
                        if (value !== null && value !== undefined && value !== '') {
                            console.log(`${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
                        }
                    });

                    // Also show the complete raw structure
                    console.log('\n========================================');
                    console.log('RAW JSON STRUCTURE:');
                    console.log('========================================');
                    console.log(JSON.stringify(lead, null, 2));
                } else {
                    console.log('\nNo lead found with ID:', LEAD_ID);
                    console.log('Full response:', JSON.stringify(parsed, null, 2));
                }
            } else {
                console.log('\n❌ API Error');
                console.log('Response:', JSON.stringify(parsed, null, 2));
            }
        } catch (e) {
            console.log('\nError parsing response:', e.message);
            console.log('Raw response:', data);
        }

        console.log('\n========================================\n');
    });
});

req.on('error', (e) => {
    console.error('Request failed:', e);
});

req.write(postData);
req.end();