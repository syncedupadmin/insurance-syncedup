import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const logEntry = req.body;
        
        // Initialize Supabase client
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
        
        if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey);
            
            // Try to insert audit log
            try {
                const { data, error } = await supabase
                    .from('audit_logs')
                    .insert({
                        admin_id: logEntry.admin_id,
                        admin_email: logEntry.admin_email,
                        action: logEntry.action,
                        details: logEntry.details,
                        target_resource: logEntry.target_resource,
                        ip_address: logEntry.ip_address,
                        user_agent: logEntry.user_agent,
                        session_id: logEntry.session_id,
                        created_at: logEntry.timestamp || new Date().toISOString()
                    });
                
                if (error) {
                    throw error;
                }
                
                return res.status(200).json({
                    success: true,
                    message: 'Audit log recorded successfully'
                });
                
            } catch (dbError) {
                console.error('Failed to insert audit log:', dbError);
                
                // Store locally for manual review
                console.log('AUDIT LOG:', JSON.stringify(logEntry, null, 2));
                
                return res.status(200).json({
                    success: true,
                    message: 'Audit log stored locally (database unavailable)',
                    warning: 'Database connection failed'
                });
            }
        }
        
        // No database configured, just log to console
        console.log('AUDIT LOG:', JSON.stringify(logEntry, null, 2));
        
        return res.status(200).json({
            success: true,
            message: 'Audit log recorded to console'
        });
        
    } catch (error) {
        console.error('Audit logging failed:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}