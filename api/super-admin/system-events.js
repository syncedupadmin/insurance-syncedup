import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
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
        
        // Check if user is super-admin
        if (decoded.role !== 'super-admin' && decoded.role !== 'super_admin') {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        // Get system events
        const events = await getSystemEvents();

        return res.status(200).json({
            success: true,
            events: events
        });

    } catch (error) {
        console.error('System events API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function getSystemEvents() {
    try {
        const events = [];
        
        // Try to get real system events from audit logs or system tables
        try {
            const { data: auditLogs, error: auditError } = await supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);
            
            if (!auditError && auditLogs && auditLogs.length > 0) {
                auditLogs.forEach(log => {
                    events.push({
                        id: log.id,
                        title: formatAuditAction(log.action, log.resource_type),
                        description: log.changes ? JSON.stringify(log.changes) : 'System action performed',
                        timestamp: log.created_at,
                        severity: getSeverityFromAction(log.action)
                    });
                });
            }
        } catch (err) {
            console.log('No audit logs table available');
        }

        // Try to get user activity events
        try {
            const { data: userActivity, error: userError } = await supabase
                .from('users')
                .select('email, last_login, created_at')
                .order('last_login', { ascending: false })
                .limit(5);
                
            if (!userError && userActivity && userActivity.length > 0) {
                userActivity.forEach(user => {
                    if (user.last_login) {
                        events.push({
                            id: `login_${user.email}_${Date.now()}`,
                            title: 'User Login',
                            description: `${user.email} accessed the system`,
                            timestamp: user.last_login,
                            severity: 'info'
                        });
                    }
                });
            }
        } catch (err) {
            console.log('No user activity data available');
        }

        // If no real events, return empty array instead of fake data
        return events.length > 0 ? events.slice(0, 10) : [];

    } catch (error) {
        console.error('Error getting system events:', error);
        return [];
    }
}

function formatAuditAction(action, resourceType) {
    const actionMap = {
        'create': 'Created',
        'update': 'Updated',
        'delete': 'Deleted',
        'login': 'Login',
        'logout': 'Logout'
    };
    
    const resourceMap = {
        'user': 'User Account',
        'agency': 'Organization',
        'sale': 'Transaction',
        'lead': 'Lead Record'
    };
    
    return `${actionMap[action] || action} ${resourceMap[resourceType] || resourceType}`;
}

function getSeverityFromAction(action) {
    const severityMap = {
        'create': 'success',
        'update': 'info',
        'delete': 'warning',
        'login': 'info',
        'logout': 'info',
        'error': 'danger'
    };
    
    return severityMap[action] || 'info';
}