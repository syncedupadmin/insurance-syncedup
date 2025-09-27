const { requireAuth } = require('../_middleware/authCheck.js');

async function adminDashboardHandler(req, res) {
  const supabase = req.supabase;

  try {
    const agencyId = req.user.agency_id;
    const role = req.user.role;

    // Get current month start date
    const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    // Base query - super admin sees all, admin sees their agency only
    let salesQuery = supabase
      .from('portal_sales')
      .select('*')
      .gte('sale_date', currentMonthStart);

    if (role !== 'super-admin' && role !== 'super_admin') {
      salesQuery = salesQuery.eq('agency_id', agencyId);
    }

    const { data: sales, error: salesError } = await salesQuery;

    if (salesError) {
      console.error('Sales data error:', salesError);
    }

    // Calculate metrics
    const totalRevenue = sales?.reduce((sum, s) => sum + (parseFloat(s.total_premium) || 0), 0) || 0;
    const totalCommissions = sales?.reduce((sum, s) => sum + (parseFloat(s.total_commission) || 0), 0) || 0;
    const totalSales = sales?.length || 0;

    // Get agent count
    let agentsQuery = supabase
      .from('portal_users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'agent')
      .eq('is_active', true);

    if (role !== 'super-admin' && role !== 'super_admin') {
      agentsQuery = agentsQuery.eq('agency_id', agencyId);
    }

    const { count: agentCount } = await agentsQuery;

    // Get customer count
    let customersQuery = supabase
      .from('customers')
      .select('id', { count: 'exact', head: true });

    if (role !== 'super-admin' && role !== 'super_admin') {
      customersQuery = customersQuery.eq('agency_id', agencyId);
    }

    const { count: customerCount } = await customersQuery;

    // Get top agents this month
    const agentSales = {};
    (sales || []).forEach(sale => {
      const agentId = sale.agent_id;
      if (!agentSales[agentId]) {
        agentSales[agentId] = {
          sales: 0,
          revenue: 0,
          commissions: 0
        };
      }
      agentSales[agentId].sales++;
      agentSales[agentId].revenue += parseFloat(sale.total_premium) || 0;
      agentSales[agentId].commissions += parseFloat(sale.total_commission) || 0;
    });

    const topAgents = Object.entries(agentSales)
      .sort(([,a], [,b]) => b.commissions - a.commissions)
      .slice(0, 5)
      .map(([agentId, stats]) => ({
        agentId,
        ...stats
      }));

    // Return dashboard data
    return res.json({
      totalRevenue,
      totalCommissions,
      totalSales,
      agentCount: agentCount || 0,
      customerCount: customerCount || 0,
      topAgents,
      period: 'current_month',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return res.status(500).json({ error: error.message });
  }
}

export default requireAuth(['admin', 'super-admin'])(adminDashboardHandler);