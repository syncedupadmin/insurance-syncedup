const http = require('http');

const server = http.createServer((req, res) => {
    let body = '';

    // Collect the raw body
    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', () => {
        console.log('\n========================================');
        console.log('CONVOSO WEBHOOK DATA');
        console.log('========================================');
        console.log('Timestamp:', new Date().toISOString());
        console.log('\n--- REQUEST INFO ---');
        console.log('Method:', req.method);
        console.log('URL:', req.url);

        console.log('\n--- HEADERS ---');
        console.log(JSON.stringify(req.headers, null, 2));

        console.log('\n--- RAW BODY ---');
        console.log(body);

        // Try to parse as JSON
        if (body) {
            try {
                const parsed = JSON.parse(body);
                console.log('\n--- PARSED JSON ---');
                console.log(JSON.stringify(parsed, null, 2));

                console.log('\n--- INDIVIDUAL FIELDS ---');
                for (const [key, value] of Object.entries(parsed)) {
                    console.log(`${key}:`, typeof value === 'object' ? JSON.stringify(value) : value);
                }
            } catch (e) {
                // Try to parse as URL-encoded
                try {
                    const params = new URLSearchParams(body);
                    console.log('\n--- URL-ENCODED PARAMETERS ---');
                    for (const [key, value] of params) {
                        console.log(`${key}: ${value}`);
                    }
                } catch (e2) {
                    console.log('Could not parse body as JSON or URL-encoded');
                }
            }
        }

        console.log('========================================\n');

        // Send success response
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'success',
            message: 'Webhook received and logged',
            timestamp: new Date().toISOString()
        }));
    });
});

const PORT = 3009;
server.listen(PORT, () => {
    console.log(`Convoso webhook test server running on port ${PORT}`);
    console.log(`Webhook URL: http://localhost:${PORT}`);
    console.log(`\nWaiting for Convoso data...\n`);
});