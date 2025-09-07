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

        if (decoded.role !== 'super-admin' && decoded.role !== 'super_admin') {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const alerts = [
            { id: 1, type: 'info', title: 'System Update Available', message: 'New security patches available', severity: 'low', timestamp: new Date().toISOString() },
            { id: 2, type: 'warning', title: 'High Memory Usage', message: 'Memory usage at 78%', severity: 'medium', timestamp: new Date(Date.now() - 300000).toISOString() },
            { id: 3, type: 'success', title: 'Backup Completed', message: 'Daily backup successful', severity: 'low', timestamp: new Date(Date.now() - 600000).toISOString() }
        ];
        
        return res.status(200).json({ success: true, data: alerts });

    } catch (error) {
        console.error('System alerts API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}