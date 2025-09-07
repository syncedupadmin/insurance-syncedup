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

        const ipRules = [
            { id: 1, ip: '192.168.1.0/24', type: 'whitelist', description: 'Office network', status: 'active', created_at: '2024-01-15' },
            { id: 2, ip: '10.0.0.50', type: 'blacklist', description: 'Suspicious activity', status: 'active', created_at: '2024-01-20' },
            { id: 3, ip: '203.0.113.0/24', type: 'blacklist', description: 'Known attack source', status: 'active', created_at: '2024-01-18' }
        ];

        return res.status(200).json({
            success: true,
            data: ipRules
        });

    } catch (error) {
        console.error('IP rules API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}