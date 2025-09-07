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
            console.log('JWT verification failed:', jwtError.message);
            return res.status(403).json({ error: 'Invalid token' });
        }

        // Allow admin and super-admin roles
        const allowedRoles = ['super-admin', 'super_admin', 'admin'];
        if (!allowedRoles.includes(decoded.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        // Generate response time data for last 24 hours
        const hours = Array.from({ length: 24 }, (_, i) => {
            const time = new Date();
            time.setHours(time.getHours() - (23 - i));
            return {
                hour: time.getHours().toString().padStart(2, '0') + ':00',
                response_time: Math.floor(Math.random() * 100) + 50,
                requests: Math.floor(Math.random() * 500) + 100
            };
        });

        return res.status(200).json({
            success: true,
            data: {
                chartData: {
                    labels: hours.map(h => h.hour),
                    datasets: [{
                        label: 'Response Time (ms)',
                        data: hours.map(h => h.response_time),
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        fill: true
                    }]
                }
            }
        });

    } catch (error) {
        console.error('Response time chart API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}