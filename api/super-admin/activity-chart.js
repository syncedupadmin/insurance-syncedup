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

        const activityData = await getActivityChartData();
        
        return res.status(200).json({
            success: true,
            data: activityData
        });

    } catch (error) {
        console.error('Activity chart API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function getActivityChartData() {
    // Generate user activity data for the last 7 days
    const days = [];
    const currentDate = new Date();
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() - i);
        days.push(date);
    }

    const activityData = days.map(date => ({
        date: date.toISOString().split('T')[0],
        day_label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        logins: Math.floor(Math.random() * 100) + 50,
        active_users: Math.floor(Math.random() * 80) + 30,
        new_registrations: Math.floor(Math.random() * 10) + 2,
        api_calls: Math.floor(Math.random() * 5000) + 1000
    }));

    return {
        chartData: {
            labels: activityData.map(d => d.day_label),
            datasets: [
                {
                    label: 'Daily Logins',
                    data: activityData.map(d => d.logins),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    fill: true
                },
                {
                    label: 'Active Users',
                    data: activityData.map(d => d.active_users),
                    borderColor: '#48bb78',
                    backgroundColor: 'rgba(72, 187, 120, 0.1)',
                    fill: true
                }
            ]
        },
        summary: {
            total_logins_week: activityData.reduce((sum, d) => sum + d.logins, 0),
            avg_daily_logins: Math.round(activityData.reduce((sum, d) => sum + d.logins, 0) / 7),
            total_new_users_week: activityData.reduce((sum, d) => sum + d.new_registrations, 0)
        }
    };
}