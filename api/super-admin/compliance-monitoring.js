import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    try {
        if (req.method === 'GET') {
            // Get all agencies with their limits
            const { data: agencies } = await supabase
                .from('agencies')
                .select('*')
                .eq('subscription_status', 'active');
            
            const violations = [];
            const warnings = [];
            
            // Check each agency for limit violations
            for (const agency of (agencies || [])) {
                const limits = {
                    users: agency.user_limit || 5,
                    storage_gb: agency.subscription_plan === 'enterprise' ? 100 : 
                               agency.subscription_plan === 'professional' ? 50 : 10,
                    api_calls: agency.subscription_plan === 'enterprise' ? 100000 : 
                              agency.subscription_plan === 'professional' ? 50000 : 10000
                };
                
                // Check user limit
                const { count: userCount } = await supabase
                    .from('portal_users')
                    .select('*', { count: 'exact', head: true })
                    .eq('agency_id', agency.id.toString());
                
                const userPercent = (userCount / limits.users * 100);
                
                if (userPercent >= 100) {
                    violations.push({
                        agency_id: agency.id,
                        agency_name: agency.name,
                        type: 'user_limit_exceeded',
                        current: userCount,
                        limit: limits.users,
                        percent: userPercent.toFixed(1)
                    });
                } else if (userPercent >= 80) {
                    warnings.push({
                        agency_id: agency.id,
                        agency_name: agency.name,
                        type: 'approaching_user_limit',
                        current: userCount,
                        limit: limits.users,
                        percent: userPercent.toFixed(1)
                    });
                }
                
                // Check storage limit
                const storagePercent = ((agency.storage_used_gb || 0) / limits.storage_gb * 100);
                
                if (storagePercent >= 100) {
                    violations.push({
                        agency_id: agency.id,
                        agency_name: agency.name,
                        type: 'storage_limit_exceeded',
                        current: agency.storage_used_gb || 0,
                        limit: limits.storage_gb,
                        percent: storagePercent.toFixed(1)
                    });
                } else if (storagePercent >= 80) {
                    warnings.push({
                        agency_id: agency.id,
                        agency_name: agency.name,
                        type: 'approaching_storage_limit',
                        current: agency.storage_used_gb || 0,
                        limit: limits.storage_gb,
                        percent: storagePercent.toFixed(1)
                    });
                }
                
                // Check API limit
                const apiPercent = ((agency.api_calls_this_month || 0) / limits.api_calls * 100);
                
                if (apiPercent >= 100) {
                    violations.push({
                        agency_id: agency.id,
                        agency_name: agency.name,
                        type: 'api_limit_exceeded',
                        current: agency.api_calls_this_month || 0,
                        limit: limits.api_calls,
                        percent: apiPercent.toFixed(1)
                    });
                } else if (apiPercent >= 80) {
                    warnings.push({
                        agency_id: agency.id,
                        agency_name: agency.name,
                        type: 'approaching_api_limit',
                        current: agency.api_calls_this_month || 0,
                        limit: limits.api_calls,
                        percent: apiPercent.toFixed(1)
                    });
                }
            }
            
            // Check for suspicious activity
            const twentyFourHoursAgo = new Date();
            twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
            
            // Agencies with excessive API calls in 24h
            const { data: suspiciousActivity } = await supabase
                .from('audit_logs')
                .select('user_id, agency_id')
                .gte('created_at', twentyFourHoursAgo.toISOString());
            
            const apiCallsByAgency = {};
            (suspiciousActivity || []).forEach(log => {
                apiCallsByAgency[log.agency_id] = (apiCallsByAgency[log.agency_id] || 0) + 1;
            });
            
            const suspiciousAgencies = Object.entries(apiCallsByAgency)
                .filter(([_, count]) => count > 10000)
                .map(([agency_id, count]) => ({
                    agency_id,
                    type: 'excessive_api_calls_24h',
                    count,
                    threshold: 10000
                }));
            
            // Check for rate limit violations
            const { data: rateLimitViolations } = await supabase
                .from('audit_logs')
                .select('*')
                .eq('action', 'RATE_LIMIT_EXCEEDED')
                .gte('created_at', twentyFourHoursAgo.toISOString())
                .order('created_at', { ascending: false });
            
            // Platform-level audit events
            const { data: platformEvents } = await supabase
                .from('audit_logs')
                .select('*')
                .in('action', ['AGENCY_CREATED', 'AGENCY_DELETED', 'PLAN_CHANGED', 'PAYMENT_FAILED'])
                .order('created_at', { ascending: false })
                .limit(50);
            
            // Data retention check (older than 90 days)
            const retentionDate = new Date();
            retentionDate.setDate(retentionDate.getDate() - 90);
            
            const { count: oldRecords } = await supabase
                .from('audit_logs')
                .select('*', { count: 'exact', head: true })
                .lt('created_at', retentionDate.toISOString());
            
            return res.status(200).json({
                success: true,
                violations: {
                    count: violations.length,
                    items: violations
                },
                warnings: {
                    count: warnings.length,
                    items: warnings
                },
                suspicious_activity: {
                    count: suspiciousAgencies.length,
                    items: suspiciousAgencies
                },
                rate_limits: {
                    violations_24h: rateLimitViolations?.length || 0,
                    recent_violations: (rateLimitViolations || []).slice(0, 10)
                },
                platform_audit: {
                    recent_events: platformEvents || []
                },
                data_retention: {
                    records_for_cleanup: oldRecords || 0,
                    retention_days: 90
                },
                compliance_status: {
                    overall: violations.length === 0 ? 'compliant' : 'violations_detected',
                    requires_action: violations.length > 0 || warnings.length > 5
                }
            });
        }
        
        if (req.method === 'POST') {
            const { action, agency_id, reason } = req.body;
            
            if (action === 'enforce_limit') {
                // Suspend agency for limit violation
                await supabase
                    .from('agencies')
                    .update({
                        subscription_status: 'suspended',
                        suspension_reason: reason
                    })
                    .eq('id', agency_id);
                
                // Log the action
                await supabase
                    .from('audit_logs')
                    .insert({
                        action: 'LIMIT_ENFORCEMENT',
                        user_id: 'system',
                        agency_id,
                        details: { reason }
                    });
                
                return res.status(200).json({ success: true });
            }
        }
        
    } catch (error) {
        console.error('Compliance monitoring error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}