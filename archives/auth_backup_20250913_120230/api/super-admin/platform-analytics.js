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
        // Get all agencies
        const { data: agencies } = await supabase
            .from('agencies')
            .select('*')
            .order('created_at', { ascending: false });
        
        // Calculate business metrics
        const totalAgencies = agencies?.length || 0;
        const activeAgencies = agencies?.filter(a => a.subscription_status === 'active').length || 0;
        const trialAgencies = agencies?.filter(a => a.subscription_status === 'trial').length || 0;
        
        // Get total users across platform
        const { count: totalUsers } = await supabase
            .from('portal_users')
            .select('*', { count: 'exact', head: true });
        
        const avgUsersPerAgency = activeAgencies > 0 ? (totalUsers / activeAgencies).toFixed(1) : 0;
        
        // Calculate growth (month over month)
        const thisMonth = new Date();
        const lastMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - 1, 1);
        const twoMonthsAgo = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - 2, 1);
        
        const { count: newAgenciesThisMonth } = await supabase
            .from('agencies')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', lastMonth.toISOString());
        
        const { count: newAgenciesLastMonth } = await supabase
            .from('agencies')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', twoMonthsAgo.toISOString())
            .lt('created_at', lastMonth.toISOString());
        
        const growthRate = newAgenciesLastMonth > 0 
            ? ((newAgenciesThisMonth - newAgenciesLastMonth) / newAgenciesLastMonth * 100).toFixed(1)
            : 0;
        
        // Trial to paid conversion
        const { data: conversions } = await supabase
            .from('subscription_changes')
            .select('*')
            .eq('old_plan', 'trial')
            .neq('new_plan', 'cancelled')
            .gte('change_date', lastMonth.toISOString());
        
        const conversionRate = trialAgencies > 0
            ? ((conversions?.length || 0) / trialAgencies * 100).toFixed(1)
            : 0;
        
        // Identify at-risk agencies (low usage in last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const atRiskAgencies = [];
        const powerUsers = [];
        
        for (const agency of (agencies || [])) {
            if (agency.subscription_status !== 'active') continue;
            
            // Check last login activity
            const { count: activeUsers } = await supabase
                .from('portal_users')
                .select('*', { count: 'exact', head: true })
                .eq('agency_id', agency.id.toString())
                .gte('last_login', thirtyDaysAgo.toISOString());
            
            // Check API activity
            const apiUsage = agency.api_calls_this_month || 0;
            
            if (activeUsers === 0 || apiUsage < 100) {
                atRiskAgencies.push({
                    ...agency,
                    risk_reason: activeUsers === 0 ? 'No active users' : 'Low API usage',
                    last_active_users: activeUsers,
                    api_calls: apiUsage
                });
            } else if (apiUsage > 5000) {
                powerUsers.push({
                    ...agency,
                    active_users: activeUsers,
                    api_calls: apiUsage
                });
            }
        }
        
        // API usage by endpoint (simplified)
        const { data: recentLogs } = await supabase
            .from('audit_logs')
            .select('action')
            .gte('created_at', thirtyDaysAgo.toISOString())
            .limit(1000);
        
        const endpointUsage = {};
        (recentLogs || []).forEach(log => {
            endpointUsage[log.action] = (endpointUsage[log.action] || 0) + 1;
        });
        
        const topEndpoints = Object.entries(endpointUsage)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([endpoint, count]) => ({ endpoint, count }));
        
        // Peak usage hours
        const hourlyUsage = Array(24).fill(0);
        (recentLogs || []).forEach(log => {
            const hour = new Date(log.created_at).getHours();
            hourlyUsage[hour]++;
        });
        
        const peakHour = hourlyUsage.indexOf(Math.max(...hourlyUsage));
        
        return res.status(200).json({
            success: true,
            business_metrics: {
                total_agencies: totalAgencies,
                active_agencies: activeAgencies,
                trial_agencies: trialAgencies,
                total_users: totalUsers || 0,
                avg_users_per_agency: avgUsersPerAgency,
                growth_rate: growthRate + '%',
                new_this_month: newAgenciesThisMonth || 0
            },
            conversion: {
                trial_to_paid_rate: conversionRate + '%',
                conversions_this_month: conversions?.length || 0
            },
            engagement: {
                at_risk_count: atRiskAgencies.length,
                at_risk_agencies: atRiskAgencies.slice(0, 5),
                power_users_count: powerUsers.length,
                power_users: powerUsers.slice(0, 5)
            },
            usage_patterns: {
                peak_hour: `${peakHour}:00`,
                peak_hour_activity: hourlyUsage[peakHour],
                top_endpoints: topEndpoints
            },
            health_score: {
                overall: activeAgencies > 0 ? 
                    Math.round((100 - (atRiskAgencies.length / activeAgencies * 100))) : 0,
                growth: growthRate > 0 ? 'positive' : 'negative',
                conversion: parseFloat(conversionRate) > 20 ? 'good' : 'needs_improvement'
            }
        });
        
    } catch (error) {
        console.error('Platform analytics error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}