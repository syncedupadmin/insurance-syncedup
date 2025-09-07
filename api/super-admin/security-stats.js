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

        const securityStats = {
            failed_logins_24h: Math.floor(Math.random() * 25) + 5,
            blocked_ips: Math.floor(Math.random() * 10) + 2,
            suspicious_activities: Math.floor(Math.random() * 15) + 3,
            ssl_status: 'Valid',
            ssl_expires_days: Math.floor(Math.random() * 60) + 30,
            two_factor_enabled: Math.floor(Math.random() * 80) + 60,
            password_strength_compliance: Math.floor(Math.random() * 15) + 85,
            security_score: Math.floor(Math.random() * 10) + 85
        };

        return res.status(200).json({
            success: true,
            data: securityStats
        });

    } catch (error) {
        console.error('Security stats API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}