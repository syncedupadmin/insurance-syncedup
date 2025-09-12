import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    try {
        if (req.method === 'GET') {
            // Get all billing data
            const { data: agencies } = await supabase
                .from('agencies')
                .select('*')
                .order('next_billing_date', { ascending: true });
            
            // Get payment history
            const { data: payments } = await supabase
                .from('payments')
                .select('*')
                .order('payment_date', { ascending: false })
                .limit(100);
            
            // Get overdue accounts
            const today = new Date().toISOString().split('T')[0];
            const { data: overdueAgencies } = await supabase
                .from('agencies')
                .select('*')
                .or('payment_status.eq.overdue,next_billing_date.lt.' + today)
                .eq('subscription_status', 'active');
            
            // Calculate metrics
            const activeAgencies = agencies.filter(a => a.subscription_status === 'active');
            const mrr = activeAgencies.reduce((sum, a) => sum + (parseFloat(a.monthly_fee) || 0), 0);
            const avgRevenue = activeAgencies.length > 0 ? mrr / activeAgencies.length : 0;
            
            // Get failed payments
            const { data: failedPayments } = await supabase
                .from('payments')
                .select('*')
                .eq('status', 'failed')
                .order('payment_date', { ascending: false });
            
            // Calculate churn (agencies cancelled in last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const { count: churnedCount } = await supabase
                .from('subscription_changes')
                .select('*', { count: 'exact', head: true })
                .eq('new_plan', 'cancelled')
                .gte('change_date', thirtyDaysAgo.toISOString());
            
            const churnRate = activeAgencies.length > 0 
                ? ((churnedCount || 0) / activeAgencies.length * 100).toFixed(1)
                : 0;
            
            return res.status(200).json({
                success: true,
                metrics: {
                    mrr,
                    avgRevenue,
                    churnRate,
                    totalActive: activeAgencies.length,
                    overdueCount: overdueAgencies?.length || 0,
                    failedPaymentsCount: failedPayments?.length || 0
                },
                overdueAgencies: overdueAgencies || [],
                recentPayments: payments || [],
                failedPayments: failedPayments || []
            });
        }
        
        if (req.method === 'POST') {
            const { action, agency_id, data } = req.body;
            
            if (action === 'record_payment') {
                const { data: payment, error } = await supabase
                    .from('payments')
                    .insert({
                        agency_id,
                        amount: data.amount,
                        payment_date: new Date().toISOString(),
                        payment_method: data.method,
                        status: 'successful'
                    })
                    .select()
                    .single();
                
                // Update agency payment status
                await supabase
                    .from('agencies')
                    .update({
                        payment_status: 'current',
                        last_payment_date: new Date().toISOString(),
                        failed_payment_count: 0
                    })
                    .eq('id', agency_id);
                
                return res.status(200).json({ success: true, payment });
            }
            
            if (action === 'mark_failed') {
                // Record failed payment
                await supabase
                    .from('payments')
                    .insert({
                        agency_id,
                        amount: data.amount,
                        payment_date: new Date().toISOString(),
                        status: 'failed'
                    });
                
                // Update agency
                const { data: agency } = await supabase
                    .from('agencies')
                    .select('failed_payment_count')
                    .eq('id', agency_id)
                    .single();
                
                await supabase
                    .from('agencies')
                    .update({
                        payment_status: 'overdue',
                        failed_payment_count: (agency?.failed_payment_count || 0) + 1
                    })
                    .eq('id', agency_id);
                
                return res.status(200).json({ success: true });
            }
        }
        
    } catch (error) {
        console.error('Billing management error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}