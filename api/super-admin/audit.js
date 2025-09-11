import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'Database configuration error' });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    if (req.method === 'POST') {
        try {
            const { action, details, user } = req.body;
            
            // Insert REAL audit log to database
            const { data, error } = await supabase
                .from('audit_logs')
                .insert([{
                    admin_email: user || 'admin@syncedupsolutions.com',
                    action: action || 'UNKNOWN',
                    details: { message: details || 'No details provided' },
                    ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0',
                    portal: 'super-admin',
                    created_at: new Date().toISOString()
                }])
                .select();
                
            if (error) {
                console.error('Audit log error:', error);
                // Don't fail the request if audit logging fails
                return res.status(200).json({ success: true, warning: 'Audit log failed' });
            }
            
            return res.status(200).json({ success: true, audit_id: data[0]?.id });
        } catch (error) {
            console.error('Audit POST error:', error);
            return res.status(200).json({ success: true, warning: 'Audit log failed' });
        }
    }
    
    if (req.method === 'GET') {
        try {
            // Get REAL audit logs from database
            const limit = Math.min(parseInt(req.query.limit) || 100, 500);
            
            const { data: logs, error } = await supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);
                
            if (error) {
                console.error('Error fetching audit logs:', error);
                return res.status(500).json({ error: 'Failed to fetch audit logs' });
            }
            
            // Format entries for frontend
            const entries = (logs || []).map(log => ({
                timestamp: log.created_at,
                user: log.admin_email || log.user_email || 'Unknown',
                action: log.action || 'UNKNOWN',
                details: typeof log.details === 'object' ? log.details.message : log.details,
                ip_address: log.ip_address || 'Unknown',
                portal: log.portal || 'Unknown',
                id: log.id
            }));
            
            return res.status(200).json({ entries, count: entries.length });
        } catch (error) {
            console.error('Audit GET error:', error);
            return res.status(500).json({ error: 'Failed to fetch audit logs' });
        }
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
}