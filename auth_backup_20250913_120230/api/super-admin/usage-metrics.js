import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    try {
        // Get all agencies with usage data
        const { data: agencies } = await supabase
            .from('agencies')
            .select('*')
            .order('api_calls_this_month', { ascending: false });
        
        // Get user counts per agency
        const agenciesWithUsage = await Promise.all(
            (agencies || []).map(async (agency) => {
                const { count: userCount } = await supabase
                    .from('portal_users')
                    .select('*', { count: 'exact', head: true })
                    .eq('agency_id', agency.id.toString());
                
                // Calculate usage percentage based on plan limits
                const userLimit = agency.user_limit || 5;
                const storageLimit = agency.subscription_plan === 'enterprise' ? 100 : 
                                   agency.subscription_plan === 'professional' ? 50 : 10;
                const apiLimit = agency.subscription_plan === 'enterprise' ? 100000 : 
                                agency.subscription_plan === 'professional' ? 50000 : 10000;
                
                return {
                    ...agency,
                    user_count: userCount || 0,
                    user_usage_percent: ((userCount || 0) / userLimit * 100).toFixed(1),
                    storage_usage_percent: ((agency.storage_used_gb || 0) / storageLimit * 100).toFixed(1),
                    api_usage_percent: ((agency.api_calls_this_month || 0) / apiLimit * 100).toFixed(1),
                    limits: {
                        users: userLimit,
                        storage_gb: storageLimit,
                        api_calls: apiLimit
                    }
                };
            })
        );
        
        // Identify agencies near limits
        const nearLimits = agenciesWithUsage.filter(a => 
            parseFloat(a.user_usage_percent) > 80 ||
            parseFloat(a.storage_usage_percent) > 80 ||
            parseFloat(a.api_usage_percent) > 80
        );
        
        // Calculate platform totals
        const totals = agenciesWithUsage.reduce((acc, agency) => ({
            total_users: acc.total_users + agency.user_count,
            total_storage_gb: acc.total_storage_gb + (agency.storage_used_gb || 0),
            total_api_calls: acc.total_api_calls + (agency.api_calls_this_month || 0),
            total_agencies: acc.total_agencies + 1
        }), {
            total_users: 0,
            total_storage_gb: 0,
            total_api_calls: 0,
            total_agencies: 0
        });
        
        // Get activity patterns (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data: recentActivity } = await supabase
            .from('audit_logs')
            .select('created_at')
            .gte('created_at', sevenDaysAgo.toISOString())
            .order('created_at', { ascending: false });
        
        // Calculate peak hours
        const hourlyActivity = {};
        (recentActivity || []).forEach(log => {
            const hour = new Date(log.created_at).getHours();
            hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
        });
        
        const peakHour = Object.entries(hourlyActivity)
            .sort((a, b) => b[1] - a[1])[0];
        
        return res.status(200).json({
            success: true,
            agencies: agenciesWithUsage,
            nearLimits,
            totals: {
                ...totals,
                avg_users_per_agency: totals.total_agencies > 0 
                    ? (totals.total_users / totals.total_agencies).toFixed(1) 
                    : 0,
                avg_storage_per_agency: totals.total_agencies > 0
                    ? (totals.total_storage_gb / totals.total_agencies).toFixed(2)
                    : 0
            },
            activity: {
                peak_hour: peakHour ? `${peakHour[0]}:00` : 'N/A',
                peak_hour_activity: peakHour ? peakHour[1] : 0,
                total_events_7d: recentActivity?.length || 0
            }
        });
        
    } catch (error) {
        console.error('Usage metrics error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}