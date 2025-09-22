const { verifySuperAdmin } = require('./_auth-helper');

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
        // Get token from cookie or Authorization header
        const getCookie = (name) => {
            const match = (req.headers.cookie || '').match(new RegExp(`(?:^|; )${name}=([^;]+)`));
            return match ? decodeURIComponent(match[1]) : null;
        };
        
        const token = getCookie('auth_token') || 
                     (req.headers.authorization?.startsWith('Bearer ') ? 
                      req.headers.authorization.substring(7) : null);
        
        if (!token) {
            return res.status(403).json({ error: 'No authentication token' });
        }
        
        // Verify JWT and get user info
        const jwt = require('jsonwebtoken');
        const SECRET = process.env.JWT_SECRET;
        
        try {
            const payload = jwt.verify(token, SECRET);
            const role = getCookie('user_role') || payload.role;
            
            // Check if role is super_admin
            if (role !== 'super_admin') {
                return res.status(403).json({ error: 'Not authorized - super admin required' });
            }
            
            return res.status(200).json({ 
                id: payload.id || payload.sub,
                email: payload.email,
                full_name: payload.name || payload.email,
                role: role
            });
        } catch (jwtError) {
            console.error('JWT verification error:', jwtError);
            return res.status(403).json({ error: 'Invalid or expired session' });
        }

    } catch (error) {
        console.error('Current user API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}