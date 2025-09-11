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
        const { data: agencies, error } = await supabase
            .from('agencies')
            .select('*')
            .eq('is_demo', false)
            .order('name');
            
        if (error) throw error;
        
        const activeAgencies = agencies.filter(a => a.is_active);
        const mrr = activeAgencies.reduce((sum, a) => 
            sum + (parseFloat(a.monthly_fee) || 0), 0
        );
        
        const overdueAgencies = agencies.filter(a => {
            if (!a.next_billing_date) return false;
            return new Date(a.next_billing_date) < new Date();
        });
        
        return res.status(200).json({
            success: true,
            mrr,
            activeAgencies: activeAgencies.length,
            totalAgencies: agencies.length,
            overdueCount: overdueAgencies.length,
            subscriptions: agencies.map(a => ({
                agency_id: a.id,
                agency_name: a.name,
                plan_type: a.subscription_plan || 'free',
                monthly_rate: parseFloat(a.monthly_fee) || 0,
                status: a.subscription_status || 'inactive',
                next_billing: a.next_billing_date,
                user_limit: a.user_limit || 5
            }))
        });
        
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}