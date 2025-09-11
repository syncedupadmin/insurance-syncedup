import { createClient } from '@supabase/supabase-js';
const { verifySuperAdmin } = require('./_auth-helper');

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
        const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
        
        const user = await verifySuperAdmin(token);
        if (!user) {
            return res.status(403).json({ error: 'Super admin privileges required' });
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