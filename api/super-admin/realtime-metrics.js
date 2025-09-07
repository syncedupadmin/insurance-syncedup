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

        const realtimeData = await getRealtimeMetrics();
        
        return res.status(200).json({
            success: true,
            timestamp: new Date().toISOString(),
            data: realtimeData
        });

    } catch (error) {
        console.error('Realtime metrics API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function getRealtimeMetrics() {
    return {
        system: {
            cpu_usage: Math.floor(Math.random() * 40) + 20,
            memory_usage: Math.floor(Math.random() * 50) + 30,
            active_connections: Math.floor(Math.random() * 50) + 10,
            requests_per_minute: Math.floor(Math.random() * 500) + 200
        },
        users: {
            online_now: Math.floor(Math.random() * 50) + 10,
            active_sessions: Math.floor(Math.random() * 80) + 20,
            new_logins_last_hour: Math.floor(Math.random() * 20) + 5
        },
        activity: {
            api_calls_last_minute: Math.floor(Math.random() * 100) + 50,
            errors_last_hour: Math.floor(Math.random() * 10),
            avg_response_time: Math.floor(Math.random() * 100) + 50
        }
    };
}