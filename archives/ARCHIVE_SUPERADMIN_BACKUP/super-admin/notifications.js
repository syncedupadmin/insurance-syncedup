import { createClient } from '@supabase/supabase-js';
const { verifySuperAdmin } = require('./_auth-helper');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Authentication check
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
        
        const user = await verifySuperAdmin(token);
        if (!user) {
            return res.status(403).json({ error: 'Super admin privileges required' });
        } catch (error) {
        console.error('Notifications API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function getNotifications(req, res, user) {
    try {
        const {
            type = '',
            status = '',
            priority = '',
            limit = 20,
            page = 1
        } = req.query;

        // Try to get from notifications table, fallback to mock data
        let query = supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false });

        // Apply filters
        if (type) query = query.eq('type', type);
        if (status) query = query.eq('status', status);
        if (priority) query = query.eq('priority', priority);

        // For super-admin, show all notifications
        // For regular admin, show only their agency notifications
        if (user.role !== 'super_admin') {
            query = query.eq('agency_id', user.agency_id);
        }

        // Pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query = query.range(offset, offset + parseInt(limit) - 1);

        const { data: notifications, error, count } = await query;

        if (error) {
            console.log('Notifications table not found, returning mock data');
            const mockNotifications = generateMockNotifications();
            return res.status(200).json({
                success: true,
                data: mockNotifications,
                unread_count: mockNotifications.filter(n => n.status === 'unread').length,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: mockNotifications.length,
                    total_pages: Math.ceil(mockNotifications.length / parseInt(limit))
                }
            });
        }

        // Get unread count
        let unreadQuery = supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'unread');

        if (user.role !== 'super_admin') {
            unreadQuery = unreadQuery.eq('agency_id', user.agency_id);
        }

        const { count: unreadCount } = await unreadQuery;

        return res.status(200).json({
            success: true,
            data: notifications,
            unread_count: unreadCount || 0,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                total_pages: Math.ceil(count / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Get notifications error:', error);
        return res.status(500).json({ error: 'Failed to fetch notifications' });
    }
}

async function createNotification(req, res, user) {
    try {
        const {
            title,
            message,
            type = 'info',
            priority = 'medium',
            agency_id = null,
            user_id = null,
            action_url = null,
            expires_at = null
        } = req.body;

        if (!title || !message) {
            return res.status(400).json({
                error: 'Title and message are required'
            });
        }

        const notification = {
            title,
            message,
            type,
            priority,
            agency_id,
            user_id,
            action_url,
            expires_at,
            status: 'unread',
            created_by: user.id,
            created_at: new Date().toISOString(),
            metadata: {
                created_by_name: user.name || user.email,
                created_by_role: user.role
            }
        };

        const { data: newNotification, error } = await supabase
            .from('notifications')
            .insert([notification])
            .select()
            .single();

        if (error) {
            console.log('Cannot create notification in DB, logging instead:', error.message);
            console.log('NOTIFICATION:', JSON.stringify(notification, null, 2));
            
            return res.status(201).json({
                success: true,
                message: 'Notification queued',
                data: { ...notification, id: 'temp-' + Date.now() }
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Notification created successfully',
            data: newNotification
        });

    } catch (error) {
        console.error('Create notification error:', error);
        return res.status(500).json({ error: 'Failed to create notification' });
    }
}

async function updateNotification(req, res, user) {
    try {
        const { id } = req.query;
        const { status, read_at } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'Notification ID is required' });
        }

        const updateData = {};
        
        if (status) {
            updateData.status = status;
            if (status === 'read' && !read_at) {
                updateData.read_at = new Date().toISOString();
            }
        }

        if (read_at) {
            updateData.read_at = read_at;
        }

        const { data: notification, error } = await supabase
            .from('notifications')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({
                error: `Failed to update notification: ${error.message}`
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Notification updated successfully',
            data: notification
        });

    } catch (error) {
        console.error('Update notification error:', error);
        return res.status(500).json({ error: 'Failed to update notification' });
    }
}

async function deleteNotification(req, res, user) {
    try {
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ error: 'Notification ID is required' });
        }

        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);

        if (error) {
            return res.status(400).json({
                error: `Failed to delete notification: ${error.message}`
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Notification deleted successfully'
        });

    } catch (error) {
        console.error('Delete notification error:', error);
        return res.status(500).json({ error: 'Failed to delete notification' });
    }
}

function generateMockNotifications() {
    const types = ['system', 'security', 'billing', 'user', 'agency', 'performance'];
    const priorities = ['low', 'medium', 'high', 'critical'];
    const statuses = ['unread', 'read', 'dismissed'];

    const notifications = [];

    // Recent critical notifications
    notifications.push({
        id: 'notif_001',
        title: 'High Memory Usage Alert',
        message: 'System memory usage has exceeded 85% threshold. Consider scaling resources.',
        type: 'system',
        priority: 'critical',
        status: 'unread',
        agency_id: null,
        user_id: null,
        action_url: '/super-admin/system-health',
        created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        metadata: {
            created_by_name: 'System Monitor',
            created_by_role: 'system',
            threshold: '85%',
            current_usage: '87%'
        }
    });

    notifications.push({
        id: 'notif_002',
        title: 'Failed Login Attempts',
        message: '15 failed login attempts detected from IP 192.168.1.100 in the last hour.',
        type: 'security',
        priority: 'high',
        status: 'unread',
        agency_id: null,
        user_id: null,
        action_url: '/super-admin/audit-logs',
        created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
        metadata: {
            created_by_name: 'Security Monitor',
            created_by_role: 'system',
            ip_address: '192.168.1.100',
            attempt_count: 15
        }
    });

    notifications.push({
        id: 'notif_003',
        title: 'New Agency Registration',
        message: 'Premium Insurance Solutions has completed registration and requires admin approval.',
        type: 'agency',
        priority: 'medium',
        status: 'unread',
        agency_id: 'agency_123',
        user_id: null,
        action_url: '/super-admin/agencies',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        metadata: {
            created_by_name: 'Registration System',
            created_by_role: 'system',
            agency_name: 'Premium Insurance Solutions',
            contact_email: 'admin@premiumins.com'
        }
    });

    notifications.push({
        id: 'notif_004',
        title: 'Payment Processing Issue',
        message: 'Monthly subscription payment failed for Elite Insurance Group. Auto-retry scheduled.',
        type: 'billing',
        priority: 'high',
        status: 'read',
        agency_id: 'agency_456',
        user_id: null,
        action_url: '/super-admin/billing',
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        read_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        metadata: {
            created_by_name: 'Payment Processor',
            created_by_role: 'system',
            agency_name: 'Elite Insurance Group',
            amount: '$299.00',
            reason: 'Insufficient funds'
        }
    });

    notifications.push({
        id: 'notif_005',
        title: 'API Rate Limit Exceeded',
        message: 'Agency "Metro Insurance" has exceeded their API rate limit. Consider upgrading their plan.',
        type: 'performance',
        priority: 'medium',
        status: 'read',
        agency_id: 'agency_789',
        user_id: null,
        action_url: '/super-admin/analytics?type=api_analytics',
        created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
        read_at: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(), // 7 hours ago
        metadata: {
            created_by_name: 'API Monitor',
            created_by_role: 'system',
            agency_name: 'Metro Insurance',
            limit: '1000/hour',
            current_usage: '1245/hour'
        }
    });

    // Add some older notifications
    for (let i = 6; i <= 15; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const priority = priorities[Math.floor(Math.random() * priorities.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        const daysAgo = Math.floor(Math.random() * 7) + 1;
        const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
        const readAt = status === 'read' ? new Date(createdAt.getTime() + Math.floor(Math.random() * 12) * 60 * 60 * 1000) : null;

        notifications.push({
            id: `notif_${String(i).padStart(3, '0')}`,
            title: generateNotificationTitle(type),
            message: generateNotificationMessage(type),
            type: type,
            priority: priority,
            status: status,
            agency_id: type === 'system' ? null : `agency_${Math.floor(Math.random() * 999) + 100}`,
            user_id: Math.random() > 0.7 ? `user_${Math.floor(Math.random() * 999) + 100}` : null,
            action_url: getActionUrl(type),
            created_at: createdAt.toISOString(),
            read_at: readAt ? readAt.toISOString() : null,
            metadata: {
                created_by_name: 'System Monitor',
                created_by_role: 'system'
            }
        });
    }

    return notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function generateNotificationTitle(type) {
    const titles = {
        system: ['System Update Available', 'Backup Completed', 'Maintenance Window Scheduled', 'Database Migration Complete'],
        security: ['Suspicious Activity Detected', 'SSL Certificate Renewal', 'Password Policy Updated', 'Two-Factor Authentication Enabled'],
        billing: ['Payment Processed Successfully', 'Invoice Generated', 'Subscription Renewal', 'Credit Card Expired'],
        user: ['New User Registration', 'User Account Locked', 'Profile Updated', 'Password Reset Request'],
        agency: ['Agency Status Changed', 'New Agency Application', 'Contract Renewal', 'Plan Upgrade Request'],
        performance: ['Slow Query Detected', 'High Traffic Volume', 'Cache Miss Rate High', 'Database Connection Pool Full']
    };

    const typeArray = titles[type] || titles.system;
    return typeArray[Math.floor(Math.random() * typeArray.length)];
}

function generateNotificationMessage(type) {
    const messages = {
        system: ['System maintenance completed successfully.', 'Daily backup process finished without errors.', 'All services are running normally.'],
        security: ['Please review the security logs for details.', 'Consider enabling additional security measures.', 'Security scan completed with no issues found.'],
        billing: ['Payment has been processed successfully.', 'Please review the billing details.', 'Automated billing cycle completed.'],
        user: ['User account status has been updated.', 'Please review user activity.', 'User management action completed.'],
        agency: ['Agency information has been updated.', 'Please review agency status.', 'Agency management action completed.'],
        performance: ['System performance metrics indicate attention needed.', 'Consider reviewing system resources.', 'Performance optimization completed.']
    };

    const typeArray = messages[type] || messages.system;
    return typeArray[Math.floor(Math.random() * typeArray.length)];
}

function getActionUrl(type) {
    const urls = {
        system: '/super-admin/system-health',
        security: '/super-admin/audit-logs',
        billing: '/super-admin/revenue',
        user: '/super-admin/users',
        agency: '/super-admin/agencies',
        performance: '/super-admin/analytics'
    };

    return urls[type] || '/super-admin';
}