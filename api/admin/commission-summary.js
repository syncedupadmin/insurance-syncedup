const { requireAuth } = require('../_middleware/authCheck.js');

async function commissionSummaryHandler(req, res) {
  const supabase = req.supabase;
  const user = req.user;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Commission Summary API - User:', user.role, 'Agency:', user.agency_id);

    // Query portal_sales data for ALL agents in this agency
    let query = supabase
      .from('portal_sales')
      .select(`
        id,
        agent_id,
        premium,
        commission_rate,
        commission_amount,
        sale_date,
        status,
        customer_name,
        product_name
      `)
      .order('sale_date', { ascending: false });

    // Filter by agency (admin sees all agents in their agency)
    if (user.role !== 'super-admin' && user.role !== 'super_admin') {
      query = query.eq('agency_id', user.agency_id);
    }

    // Get current month's data
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    query = query.gte('sale_date', startOfMonth);

    const { data: transactions, error: transactionError } = await query;

    console.log('Commission Summary API - Database response:', {
      error: transactionError?.message,
      dataCount: transactions?.length
    });

    if (transactionError) {
      if (transactionError.message?.includes('does not exist') || transactionError.code === 'PGRST116') {
        console.log('Commission Summary API - Portal sales table does not exist yet');
        return res.status(200).json({
          success: true,
          data: {
            monthly_total: 0,
            average_rate: 0,
            pending_count: 0,
            total_paid: 0,
            agents_with_commissions: 0,
            next_payout_date: getNextPayoutDate()
          }
        });
      }
      throw transactionError;
    }

    // Calculate commission summary from ALL agents in this agency
    const totalRevenue = (transactions || []).reduce((sum, t) => sum + (parseFloat(t.premium) || 0), 0);
    const defaultCommissionRate = 15;

    let totalCommissions = 0;
    let totalPaid = 0;
    let totalPending = 0;

    (transactions || []).forEach(transaction => {
      if (transaction.commission_amount) {
        totalCommissions += parseFloat(transaction.commission_amount);
        if (transaction.status === 'paid' || transaction.status === 'completed') {
          totalPaid += parseFloat(transaction.commission_amount);
        } else {
          totalPending += parseFloat(transaction.commission_amount);
        }
      } else {
        const rate = transaction.commission_rate || defaultCommissionRate;
        const commission = (parseFloat(transaction.premium) || 0) * (rate / 100);
        totalCommissions += commission;
        totalPending += commission;
      }
    });

    const averageRate = totalRevenue > 0 ? (totalCommissions / totalRevenue * 100) : 0;

    // Get unique agent count from this agency's sales
    const uniqueAgents = new Set((transactions || []).map(t => t.agent_id).filter(Boolean));

    const summary = {
      monthly_total: Math.round(totalCommissions),
      average_rate: Math.round(averageRate * 10) / 10,
      pending_count: (transactions || []).filter(t => t.status === 'pending').length,
      total_paid: Math.round(totalPaid),
      agents_with_commissions: uniqueAgents.size,
      next_payout_date: getNextPayoutDate()
    };

    return res.status(200).json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Commission Summary API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

function getNextPayoutDate() {
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(1);
  return nextMonth.toISOString().split('T')[0];
}

module.exports = requireAuth(['admin', 'manager'])(commissionSummaryHandler);
