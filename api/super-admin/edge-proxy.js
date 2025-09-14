const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
    // Check if user is super admin
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'No authorization token' });
    }

    try {
        // Verify the token and check role
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Check if user is super admin
        if (user.user_metadata?.role !== 'super_admin' && user.app_metadata?.role !== 'super_admin') {
            return res.status(403).json({ error: 'Unauthorized - Super Admin access required' });
        }

        // Get the endpoint path from query params
        const { endpoint } = req.query;
        if (!endpoint) {
            return res.status(400).json({ error: 'No endpoint specified' });
        }

        // Whitelist allowed endpoints - now all are deployed
        const allowedEndpoints = ['users', 'reset-password', 'tables', 'table-info', 'table-ddl', 'sql', 'stats'];
        if (!allowedEndpoints.includes(endpoint)) {
            return res.status(403).json({ error: 'Invalid endpoint' });
        }

        // Forward the request to the Edge Function with the correct path
        const edgeFunctionUrl = `https://zgkszwkxibpnxhvlenct.supabase.co/functions/v1/admin-gateway/${endpoint}`;

        console.log('Edge proxy request:', {
            endpoint,
            method: req.method,
            url: edgeFunctionUrl,
            hasBody: !!req.body
        });

        const response = await fetch(edgeFunctionUrl, {
            method: req.method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Origin': 'https://insurance.syncedupsolutions.com'
            },
            body: req.method === 'POST' ? JSON.stringify(req.body) : undefined
        });

        const data = await response.text();
        console.log('Edge Function response:', {
            status: response.status,
            dataLength: data.length,
            dataPreview: data.substring(0, 200)
        });

        // Handle non-2xx status codes better
        if (!response.ok) {
            console.error('Edge Function error:', response.status, data);
            // If it's a known error response, pass it through
            try {
                const errorData = JSON.parse(data);
                return res.status(response.status).json(errorData);
            } catch {
                // Otherwise return a generic error with the status
                return res.status(response.status).json({
                    error: `Edge Function returned ${response.status}`,
                    details: data.substring(0, 500)
                });
            }
        }

        // Try to parse as JSON, if not return as text
        try {
            const jsonData = JSON.parse(data);
            res.status(200).json(jsonData);
        } catch {
            res.status(200).send(data);
        }

    } catch (error) {
        console.error('Edge proxy error:', error);
        res.status(500).json({ error: error.message });
    }
};