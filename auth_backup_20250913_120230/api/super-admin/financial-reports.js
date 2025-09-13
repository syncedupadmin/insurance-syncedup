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
        const { period = 'monthly', year = new Date().getFullYear() } = req.query;
        
        // Get all payments for the period
        const startDate = new Date(year, 0, 1).toISOString();
        const endDate = new Date(year, 11, 31).toISOString();
        
        const { data: payments } = await supabase
            .from('payments')
            .select('*')
            .gte('payment_date', startDate)
            .lte('payment_date', endDate)
            .eq('status', 'successful')
            .order('payment_date', { ascending: true });
        
        // Get subscription changes
        const { data: subscriptionChanges } = await supabase
            .from('subscription_changes')
            .select('*')
            .gte('change_date', startDate)
            .lte('change_date', endDate)
            .order('change_date', { ascending: true });
        
        // Calculate monthly revenue
        const monthlyRevenue = {};
        const monthlyNewAccounts = {};
        const monthlyChurn = {};
        
        for (let month = 0; month < 12; month++) {
            const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
            monthlyRevenue[monthKey] = 0;
            monthlyNewAccounts[monthKey] = 0;
            monthlyChurn[monthKey] = 0;
        }
        
        // Process payments
        (payments || []).forEach(payment => {
            const date = new Date(payment.payment_date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + parseFloat(payment.amount);
        });
        
        // Process subscription changes
        (subscriptionChanges || []).forEach(change => {
            const date = new Date(change.change_date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (change.old_plan === null || change.old_plan === 'trial') {
                monthlyNewAccounts[monthKey] = (monthlyNewAccounts[monthKey] || 0) + 1;
            }
            if (change.new_plan === 'cancelled') {
                monthlyChurn[monthKey] = (monthlyChurn[monthKey] || 0) + 1;
            }
        });
        
        // Get current MRR and projections
        const { data: activeAgencies } = await supabase
            .from('agencies')
            .select('monthly_fee, subscription_plan')
            .eq('subscription_status', 'active');
        
        const currentMRR = (activeAgencies || []).reduce((sum, a) => 
            sum + (parseFloat(a.monthly_fee) || 0), 0
        );
        
        // Calculate growth metrics
        const revenueArray = Object.values(monthlyRevenue);
        const lastMonth = revenueArray[revenueArray.length - 2] || 0;
        const thisMonth = revenueArray[revenueArray.length - 1] || currentMRR;
        const growthRate = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth * 100).toFixed(1) : 0;
        
        // Calculate annual metrics
        const annualRevenue = revenueArray.reduce((sum, val) => sum + val, 0);
        const avgMonthlyRevenue = annualRevenue / 12;
        const projectedAnnual = currentMRR * 12;
        
        // Get top paying agencies
        const { data: topAgencies } = await supabase
            .from('agencies')
            .select('id, name, monthly_fee, subscription_plan')
            .eq('subscription_status', 'active')
            .order('monthly_fee', { ascending: false })
            .limit(10);
        
        // Calculate lifetime value
        const { data: allPayments } = await supabase
            .from('payments')
            .select('agency_id, amount')
            .eq('status', 'successful');
        
        const ltv = {};
        (allPayments || []).forEach(p => {
            ltv[p.agency_id] = (ltv[p.agency_id] || 0) + parseFloat(p.amount);
        });
        
        const avgLTV = Object.values(ltv).length > 0
            ? Object.values(ltv).reduce((sum, val) => sum + val, 0) / Object.values(ltv).length
            : 0;
        
        return res.status(200).json({
            success: true,
            period: {
                year,
                type: period
            },
            revenue: {
                monthly: monthlyRevenue,
                annual: annualRevenue,
                current_mrr: currentMRR,
                projected_annual: projectedAnnual,
                avg_monthly: avgMonthlyRevenue,
                growth_rate: growthRate
            },
            acquisition: {
                monthly_new: monthlyNewAccounts,
                total_new: Object.values(monthlyNewAccounts).reduce((sum, val) => sum + val, 0)
            },
            churn: {
                monthly_churn: monthlyChurn,
                total_churned: Object.values(monthlyChurn).reduce((sum, val) => sum + val, 0),
                churn_rate: activeAgencies?.length > 0 
                    ? (Object.values(monthlyChurn).reduce((sum, val) => sum + val, 0) / activeAgencies.length * 100).toFixed(1)
                    : 0
            },
            top_agencies: topAgencies || [],
            metrics: {
                avg_ltv: avgLTV.toFixed(2),
                total_agencies: activeAgencies?.length || 0,
                arpu: activeAgencies?.length > 0 ? (currentMRR / activeAgencies.length).toFixed(2) : 0
            }
        });
        
    } catch (error) {
        console.error('Financial reports error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}