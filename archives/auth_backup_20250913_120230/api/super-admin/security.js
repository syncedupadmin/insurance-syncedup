import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Action');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'Database configuration error' });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const action = req.headers['x-action'] || 'stats';
    
    try {
        switch(action) {
            case 'events':
                // Get REAL security events from audit logs
                const { data: events, error: eventsError } = await supabase
                    .from('audit_logs')
                    .select('action, admin_email, user_email, created_at, ip_address')
                    .order('created_at', { ascending: false })
                    .limit(20);
                    
                if (eventsError) {
                    return res.status(200).json({ events: [] });
                }
                
                const formattedEvents = (events || []).map(e => ({
                    type: e.action || 'UNKNOWN',
                    user: e.admin_email || e.user_email || 'Unknown',
                    ts: new Date(e.created_at),
                    ip: e.ip_address
                }));
                
                return res.status(200).json({ events: formattedEvents });
                
            case 'stats':
                // Calculate REAL security stats from database
                const now = new Date();
                const yesterday = new Date(now - 24 * 60 * 60 * 1000);
                const lastWeek = new Date(now - 7 * 24 * 60 * 60 * 1000);
                
                // Get failed login attempts
                const { data: failedLogins } = await supabase
                    .from('audit_logs')
                    .select('id')
                    .in('action', ['LOGIN_FAILED', 'AUTH_FAILED', 'UNAUTHORIZED'])
                    .gte('created_at', yesterday.toISOString());
                
                // Get MFA stats from users
                const { data: allUsers } = await supabase
                    .from('portal_users')
                    .select('id, mfa_enabled');
                    
                const mfaEnabled = allUsers?.filter(u => u.mfa_enabled).length || 0;
                const totalUsers = allUsers?.length || 1;
                const mfaUsagePct = Math.round((mfaEnabled / totalUsers) * 100);
                
                // Get blocked IPs (simulated from failed logins)
                const { data: blockedIPs } = await supabase
                    .from('audit_logs')
                    .select('ip_address')
                    .in('action', ['IP_BLOCKED', 'ACCESS_DENIED'])
                    .gte('created_at', lastWeek.toISOString());
                
                // Get password resets
                const { data: passwordResets } = await supabase
                    .from('audit_logs')
                    .select('id')
                    .eq('action', 'PASSWORD_RESET')
                    .gte('created_at', yesterday.toISOString());
                
                // Get active sessions (users logged in recently)
                const { data: activeSessions } = await supabase
                    .from('portal_users')
                    .select('id')
                    .gte('last_login', yesterday.toISOString());
                
                return res.status(200).json({
                    stats: {
                        failed_logins_24h: failedLogins?.length || 0,
                        mfa_usage_pct: mfaUsagePct,
                        ip_blocks_7d: blockedIPs?.length || 0,
                        password_resets_24h: passwordResets?.length || 0,
                        active_sessions: activeSessions?.length || 0,
                        suspicious_activities: 0 // Would need ML/pattern detection
                    }
                });
                
            case 'settings':
                // Get REAL security settings from database or environment
                return res.status(200).json({
                    settings: {
                        mfa_required: process.env.MFA_REQUIRED === 'true' || false,
                        session_ttl_min: parseInt(process.env.SESSION_TTL_MIN) || 60,
                        max_login_attempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
                        password_complexity: process.env.PASSWORD_COMPLEXITY || 'high',
                        ip_whitelist_enabled: process.env.IP_WHITELIST_ENABLED === 'true' || false,
                        audit_logging_enabled: true // Always true for super admin
                    }
                });
                
            default:
                // System health check
                const { data: recentLogs } = await supabase
                    .from('audit_logs')
                    .select('id')
                    .gte('created_at', yesterday.toISOString());
                    
                return res.status(200).json({
                    status: recentLogs && recentLogs.length > 0 ? 'operational' : 'degraded',
                    last_check: new Date().toISOString(),
                    logs_24h: recentLogs?.length || 0
                });
        }
    } catch (error) {
        console.error('Security API error:', error);
        return res.status(500).json({ error: 'Failed to fetch security data' });
    }
}