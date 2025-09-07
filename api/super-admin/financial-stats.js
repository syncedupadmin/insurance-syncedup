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

        const stats = {
            total_revenue: Math.floor(Math.random() * 500000) + 100000,
            monthly_revenue: Math.floor(Math.random() * 50000) + 20000,
            revenue_growth: Math.floor(Math.random() * 20) + 5,
            commission_paid: Math.floor(Math.random() * 25000) + 5000,
            pending_payments: Math.floor(Math.random() * 5000) + 1000,
            profit_margin: Math.floor(Math.random() * 30) + 15
        };
        
        return res.status(200).json({ success: true, data: stats });

    } catch (error) {
        console.error('Financial stats API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}