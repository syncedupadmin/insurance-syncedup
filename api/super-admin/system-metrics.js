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

        const metrics = {
            cpu: { usage: Math.floor(Math.random() * 40) + 20, cores: 4, temperature: Math.floor(Math.random() * 20) + 45 },
            memory: { usage: Math.floor(Math.random() * 50) + 30, total: 16, available: Math.floor(Math.random() * 8) + 4 },
            disk: { usage: Math.floor(Math.random() * 30) + 15, total: 500, free: Math.floor(Math.random() * 200) + 200 },
            network: { inbound: Math.floor(Math.random() * 100) + 50, outbound: Math.floor(Math.random() * 80) + 40 }
        };
        
        return res.status(200).json({ success: true, data: metrics });

    } catch (error) {
        console.error('System metrics API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}