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
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
        
        const user = await verifySuperAdmin(token);
        if (!user) {
            return res.status(403).json({ error: 'Super admin privileges required' });
        });
        }

        const allowedRoles = ['super-admin', 'super_admin', 'admin'];
        if (!allowedRoles.includes(decoded.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const endpoints = [
            { name: '/api/auth/login', requests: Math.floor(Math.random() * 1000) + 500, avg_time: Math.floor(Math.random() * 100) + 50 },
            { name: '/api/dashboard', requests: Math.floor(Math.random() * 800) + 400, avg_time: Math.floor(Math.random() * 80) + 40 },
            { name: '/api/sales', requests: Math.floor(Math.random() * 600) + 300, avg_time: Math.floor(Math.random() * 120) + 60 },
            { name: '/api/users', requests: Math.floor(Math.random() * 400) + 200, avg_time: Math.floor(Math.random() * 90) + 45 },
            { name: '/api/reports', requests: Math.floor(Math.random() * 300) + 150, avg_time: Math.floor(Math.random() * 150) + 75 }
        ];

        return res.status(200).json({
            success: true,
            data: {
                chartData: {
                    labels: endpoints.map(e => e.name),
                    datasets: [
                        {
                            label: 'Requests',
                            data: endpoints.map(e => e.requests),
                            backgroundColor: 'rgba(102, 126, 234, 0.8)'
                        },
                        {
                            label: 'Avg Response Time (ms)',
                            data: endpoints.map(e => e.avg_time),
                            backgroundColor: 'rgba(72, 187, 120, 0.8)'
                        }
                    ]
                }
            }
        });

    } catch (error) {
        console.error('Endpoint chart API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}