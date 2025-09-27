import { requireAuth } from '../_middleware/authCheck.js';
import { getUserContext } from '../utils/auth-helper.js';

async function dashboardHandler(req, res) {
  const supabase = req.supabase;
  
  try {
    const { agencyId, agentId, role } = getUserContext(req);
    
    // Get current month start date
    const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    
    // Get real sales data for the current agent
    const { data: sales, error: salesError } = await supabase
      .from('portal_sales')
      .select('*')
      .eq('agent_id', agentId)
      .eq('agency_id', agencyId)
      .gte('sale_date', currentMonthStart);
    
    if (salesError) {
      console.error('Sales data error:', salesError);
    }
    
    // Calculate metrics from actual sales data
    const monthlySales = sales?.reduce((sum, s) => sum + (parseFloat(s.total_premium) || 0), 0) || 0;
    const commissions = sales?.reduce((sum, s) => sum + (parseFloat(s.total_commission) || 0), 0) || 0;
    const policiesCount = sales?.length || 0;
    
    // Get all agents' sales for ranking (simplified)
    const { data: allAgentsSales } = await supabase
      .from('portal_sales')
      .select('agent_id, total_commission')
      .eq('agency_id', agencyId)
      .gte('sale_date', currentMonthStart);
    
    // Calculate agent rankings
    const agentCommissions = {};
    (allAgentsSales || []).forEach(sale => {
      const agentId = sale.agent_id;
      if (!agentCommissions[agentId]) {
        agentCommissions[agentId] = 0;
      }
      agentCommissions[agentId] += parseFloat(sale.total_commission) || 0;
    });
    
    // Find current agent's rank
    const sortedAgents = Object.entries(agentCommissions)
      .sort(([,a], [,b]) => b - a)
      .map(([agentId]) => agentId);
    
    const currentAgentRank = sortedAgents.indexOf(agentId.toString()) + 1;
    
    // Get recent sales for activity feed
    const { data: recentSales } = await supabase
      .from('portal_sales')
      .select('*')
      .eq('agent_id', agentId)
      .eq('agency_id', agencyId)
      .order('sale_date', { ascending: false })
      .limit(5);
    
    // Get agent goals from database
    const { data: goals } = await supabase
      .from('portal_goals')
      .select('*')
      .eq('agent_id', agentId)
      .eq('agency_id', agencyId)
      .eq('status', 'active');
    
    // Get default goals if none exist
    const salesGoal = goals?.find(g => g.type === 'sales')?.target_value || 15000;
    const policiesGoal = goals?.find(g => g.type === 'policies')?.target_value || 12;
    
    // Return real data
    return res.json({
      monthlySales,
      policiesCount,
      commissions,
      rank: currentAgentRank || 1,
      goals: {
        salesGoal,
        salesProgress: (monthlySales / salesGoal) * 100,
        policiesGoal,
        policiesProgress: (policiesCount / policiesGoal) * 100
      },
      recentActivity: (recentSales || []).map(sale => ({
        id: sale.id,
        type: 'sale',
        client_name: sale.client_name,
        premium: parseFloat(sale.total_premium) || 0,
        commission: parseFloat(sale.total_commission) || 0,
        date: sale.sale_date
      })),
      leaderboard: sortedAgents.slice(0, 5).map((agentIdStr, index) => ({
        rank: index + 1,
        name: agentIdStr === agentId.toString() ? 'Current Agent' : `Agent ${index + 1}`,
        commissions: agentCommissions[agentIdStr],
        isCurrentUser: agentIdStr === agentId.toString()
      })),
      trends: {
        lastMonth: 0, // Would need previous month data
        growth: '0.0'
      }
    });
    
  } catch (error) {
    console.error('Dashboard handler error:', error);
    
    // Return empty data on error
    return res.json({
      monthlySales: 0,
      policiesCount: 0,
      commissions: 0,
      rank: 0,
      goals: {
        salesGoal: 15000,
        salesProgress: 0,
        policiesGoal: 12,
        policiesProgress: 0
      },
      recentActivity: [],
      leaderboard: [],
      trends: {
        lastMonth: 0,
        growth: '0.0'
      }
    });
  }
}

export default requireAuth(['agent', 'manager', 'admin'])(dashboardHandler);
