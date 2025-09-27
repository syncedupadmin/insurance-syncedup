import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    // CORS headers
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
        // Authentication check
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
        
        // Check if user is super-admin (handle both formats)
        if (decoded.role !== 'super-admin' && decoded.role !== 'super_admin') {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        // Get system statistics
        const stats = await getSystemStats();

        return res.status(200).json({
            success: true,
            totalRevenue: stats.totalRevenue,
            activeAgencies: stats.totalAgencies,
            totalUsers: stats.totalUsers,
            revenueGrowth: stats.revenueGrowth || 0,
            newAgencies: stats.newAgencies || 0,
            activeUserPercent: stats.activeUserPercent || 0,
            systemHealth: stats.systemHealth,
            lastUpdated: stats.lastUpdated
        });

    } catch (error) {
        console.error('System stats API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function getSystemStats() {
    try {
        // Initialize stats with default values
        let stats = {
            totalAgencies: 0,
            totalUsers: 0,
            totalRevenue: 0,
            activeUsers: 0,
            revenueGrowth: 0,
            newAgencies: 0,
            activeUserPercent: 0,
            systemHealth: 'Operational',
            lastUpdated: new Date().toISOString()
        };

        // Try to get real data from databases, but provide defaults if tables don't exist
        try {
            // Get agency stats
            const { data: agencies, error: agencyError } = await supabase
                .from('agencies')
                .select('id, settings');

            if (!agencyError && agencies) {
                stats.totalAgencies = agencies.length;
                stats.totalRevenue = agencies.reduce((sum, agency) => {
                    return sum + (agency.settings?.monthly_revenue || 0);
                }, 0);
            } else {
                // No agencies data available
                stats.totalAgencies = 0;
                stats.totalRevenue = 0;
            }
        } catch (err) {
            console.log('No agencies table available');
            stats.totalAgencies = 0;
            stats.totalRevenue = 0;
        }

        try {
            // Get user stats from users table
            const { data: users, error: userError } = await supabase
                .from('users')
                .select('id, is_active, last_login');

            if (!userError && users) {
                stats.totalUsers = users.length;
                stats.activeUsers = users.filter(user => user.is_active).length;
            } else {
                // Try portal_users table as fallback
                const { data: portalUsers, error: portalError } = await supabase
                    .from('portal_users')
                    .select('id, is_active, last_login');

                if (!portalError && portalUsers) {
                    stats.totalUsers = portalUsers.length;
                    stats.activeUsers = portalUsers.filter(user => user.is_active).length;
                } else {
                    // No user data available
                    stats.totalUsers = 0;
                    stats.activeUsers = 0;
                }
            }
        } catch (err) {
            console.log('No user tables available');
            stats.totalUsers = 0;
            stats.activeUsers = 0;
        }

        // Calculate percentage and growth metrics
        stats.activeUserPercent = stats.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0;

        // Calculate system health based on active users ratio
        const healthRatio = stats.totalUsers > 0 ? stats.activeUsers / stats.totalUsers : 0;
        if (stats.totalUsers === 0) {
            stats.systemHealth = 'Initializing';
        } else if (healthRatio >= 0.8) {
            stats.systemHealth = 'Optimal';
        } else if (healthRatio >= 0.6) {
            stats.systemHealth = 'Operational';
        } else if (healthRatio >= 0.4) {
            stats.systemHealth = 'Degraded';
        } else {
            stats.systemHealth = 'Critical';
        }

        return stats;

    } catch (error) {
        console.error('Error getting system stats:', error);
        // Return safe default values
        return {
            totalAgencies: 0,
            totalUsers: 0,
            totalRevenue: 0,
            activeUsers: 0,
            revenueGrowth: 0,
            newAgencies: 0,
            activeUserPercent: 0,
            systemHealth: 'Unknown',
            lastUpdated: new Date().toISOString()
        };
    }
}