import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
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
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        let decoded;
        
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        } catch (jwtError) {
            return res.status(403).json({ error: 'Invalid token' });
        }

        const allowedRoles = ['super-admin', 'super_admin', 'admin'];
        if (!allowedRoles.includes(decoded.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const events = [
            { id: 1, type: 'failed_login', message: '5 failed login attempts from IP 192.168.1.100', severity: 'warning', timestamp: new Date().toISOString() },
            { id: 2, type: 'ip_blocked', message: 'IP 10.0.0.50 blocked due to suspicious activity', severity: 'high', timestamp: new Date(Date.now() - 300000).toISOString() },
            { id: 3, type: 'password_reset', message: 'Password reset requested for user@example.com', severity: 'info', timestamp: new Date(Date.now() - 600000).toISOString() },
            { id: 4, type: 'admin_login', message: 'Administrator login from new location', severity: 'info', timestamp: new Date(Date.now() - 900000).toISOString() },
            { id: 5, type: 'security_scan', message: 'Automated security scan completed', severity: 'info', timestamp: new Date(Date.now() - 1800000).toISOString() }
        ];

        return res.status(200).json({
            success: true,
            data: events
        });

    } catch (error) {
        console.error('Security events API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}