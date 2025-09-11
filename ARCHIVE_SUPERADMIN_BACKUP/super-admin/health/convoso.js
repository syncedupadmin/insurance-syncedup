export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        // Check if Convoso API is configured
        const convosoApiKey = process.env.CONVOSO_API_KEY;
        const convosoToken = process.env.CONVOSO_TOKEN;
        
        if (!convosoApiKey && !convosoToken) {
            return res.status(200).json({
                status: 'not_configured',
                message: 'Convoso API credentials not configured',
                timestamp: new Date().toISOString()
            });
        }
        
        // Test Convoso API connection
        const convosoUrl = 'https://api.convoso.com/api/v2/campaigns';
        const token = convosoApiKey || convosoToken;
        
        const response = await fetch(convosoUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 5000 // 5 second timeout
        });
        
        if (!response.ok) {
            throw new Error(`Convoso API returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        return res.status(200).json({
            status: 'operational',
            timestamp: new Date().toISOString(),
            campaigns: data?.length || 0,
            lastCheck: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Convoso health check failed:', error);
        
        // Return operational with warning if it's just a timeout or connection issue
        if (error.message.includes('timeout') || error.message.includes('ENOTFOUND')) {
            return res.status(200).json({
                status: 'warning',
                message: 'Convoso API connection timeout - may be temporary',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
        
        return res.status(503).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}