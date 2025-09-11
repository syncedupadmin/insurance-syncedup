module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get token from cookie
        const getCookie = (name) => {
            const match = (req.headers.cookie || '').match(new RegExp(`(?:^|; )${name}=([^;]+)`));
            return match ? decodeURIComponent(match[1]) : null;
        };
        
        const token = getCookie('auth_token');
        if (!token) {
            return res.status(403).json({ error: 'No authentication token' });
        }
        
        // Verify JWT and check role
        const jwt = require('jsonwebtoken');
        const SECRET = process.env.JWT_SECRET;
        
        try {
            const payload = jwt.verify(token, SECRET);
            const role = getCookie('user_role') || payload.role;
            
            if (role !== 'super_admin') {
                return res.status(403).json({ error: 'Not authorized - super admin required' });
            }
            
            // Return mock recent activity data
            const activities = [
                {
                    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
                    description: 'User admin@syncedupsolutions.com logged in'
                },
                {
                    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
                    description: 'New agency "Demo Insurance Co" created'
                },
                {
                    timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
                    description: 'System health check completed'
                },
                {
                    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
                    description: 'Database backup completed successfully'
                },
                {
                    timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
                    description: 'Security scan completed - no issues found'
                }
            ];
            
            return res.status(200).json(activities);
            
        } catch (jwtError) {
            console.error('JWT verification error:', jwtError);
            return res.status(403).json({ error: 'Invalid or expired session' });
        }

    } catch (error) {
        console.error('Recent activity API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}