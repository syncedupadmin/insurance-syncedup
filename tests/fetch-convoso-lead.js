const https = require('https');

// Convoso API token from your codebase
const AUTH_TOKEN = '8nf3i9mmzoxidg3ntm28gbxvlhdiqo3p';

// Lead ID to fetch
const LEAD_ID = '10256299';

// Try different Convoso API endpoints
async function fetchLeadData() {
    console.log('\n========================================');
    console.log('FETCHING CONVOSO LEAD DATA');
    console.log('========================================');
    console.log('Lead ID:', LEAD_ID);
    console.log('Auth Token:', AUTH_TOKEN.substring(0, 10) + '...');
    console.log('Timestamp:', new Date().toISOString());

    // Try endpoint 1: Direct lead fetch
    console.log('\n--- Trying /v1/leads endpoint ---');
    await makeRequest(`/v1/leads/${LEAD_ID}`);

    // Try endpoint 2: Lead search
    console.log('\n--- Trying /v1/leads/search endpoint ---');
    await makeRequest('/v1/leads/search', 'POST', JSON.stringify({
        lead_id: LEAD_ID,
        limit: 1
    }));

    // Try endpoint 3: Lead details
    console.log('\n--- Trying /v1/lead-details endpoint ---');
    await makeRequest(`/v1/lead-details/${LEAD_ID}`);

    // Try endpoint 4: Leads with query
    console.log('\n--- Trying /v1/leads with query ---');
    await makeRequest(`/v1/leads?lead_id=${LEAD_ID}`);
}

function makeRequest(path, method = 'GET', postData = null) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'api.convoso.com',
            port: 443,
            path: path,
            method: method,
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`,
                'X-Auth-Token': AUTH_TOKEN,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        if (postData) {
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        console.log(`\nRequest: ${method} ${path}`);

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log('Status:', res.statusCode, res.statusMessage);

                if (res.statusCode === 200 || res.statusCode === 201) {
                    console.log('\n--- RAW RESPONSE ---');
                    console.log(data.substring(0, 500));

                    try {
                        const parsed = JSON.parse(data);
                        console.log('\n--- PARSED DATA ---');
                        console.log(JSON.stringify(parsed, null, 2));

                        // Log individual fields if we have data
                        if (parsed.data || parsed.lead || parsed.results) {
                            const leadData = parsed.data || parsed.lead || parsed.results?.[0] || parsed;
                            console.log('\n--- LEAD FIELDS ---');
                            for (const [key, value] of Object.entries(leadData)) {
                                if (typeof value !== 'object') {
                                    console.log(`${key}: ${value}`);
                                }
                            }
                        }
                    } catch (e) {
                        console.log('Could not parse JSON:', e.message);
                    }
                } else {
                    console.log('Response:', data);
                }
                console.log('\n----------------------------------------');
                resolve();
            });
        });

        req.on('error', (e) => {
            console.error('Request error:', e.message);
            resolve();
        });

        if (postData) {
            req.write(postData);
        }

        req.end();
    });
}

// Run the fetch
fetchLeadData().then(() => {
    console.log('\n========================================\n');
});