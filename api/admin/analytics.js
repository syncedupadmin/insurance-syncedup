import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../_middleware/authCheck.js';
import { getUserContext } from '../utils/auth-helper.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function analyticsHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { agencyId, role } = getUserContext(req);
    const { 
      timeframe = 'month', 
      analytics_type = 'overview',
      compare_period = false,
      manager_id,
      team_id 
    } = req.query;

    const { startDate, endDate } = getDateRange(timeframe);
    const previousPeriod = compare_period ? getPreviousPeriod(startDate, endDate) : null;

    switch (analytics_type) {
      case 'overview':
        return await getOverviewAnalytics(req, res, agencyId, startDate, endDate, previousPeriod);
      case 'team_performance':
        return await getTeamPerformanceAnalytics(req, res, agencyId, startDate, endDate, manager_id);
      case 'financial':
        return await getFinancialAnalytics(req, res, agencyId, startDate, endDate, previousPeriod);
      case 'commission_liability':
        return await getCommissionLiabilityAnalytics(req, res, agencyId, startDate, endDate);
      case 'manager_performance':
        return await getManagerPerformanceAnalytics(req, res, agencyId, startDate, endDate);
      case 'lead_analytics':
        return await getLeadAnalytics(req, res, agencyId, startDate, endDate);
      case 'product_performance':
        return await getProductPerformanceAnalytics(req, res, agencyId, startDate, endDate);
      default:
        return res.status(400).json({ error: 'Invalid analytics type' });
    }
  } catch (error) {
    console.error('Analytics API error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch analytics', 
      details: error.message 
    });
  }
}

async function getOverviewAnalytics(req, res, agencyId, startDate, endDate, previousPeriod) {
  try {
    // Get core metrics
    const [agencyStats, teamStats, leadStats, financialStats] = await Promise.all([
      getAgencyStats(agencyId, startDate, endDate),
      getTeamStats(agencyId, startDate, endDate),
      getLeadStats(agencyId, startDate, endDate),
      getFinancialStats(agencyId, startDate, endDate)
    ]);

    // Get comparison data if requested
    let comparison = null;
    if (previousPeriod) {
      const [prevAgencyStats, prevTeamStats, prevLeadStats, prevFinancialStats] = await Promise.all([
        getAgencyStats(agencyId, previousPeriod.startDate, previousPeriod.endDate),
        getTeamStats(agencyId, previousPeriod.startDate, previousPeriod.endDate),
        getLeadStats(agencyId, previousPeriod.startDate, previousPeriod.endDate),
        getFinancialStats(agencyId, previousPeriod.startDate, previousPeriod.endDate)
      ]);

      comparison = {
        revenue_change: calculatePercentChange(financialStats.total_revenue, prevFinancialStats.total_revenue),
        sales_change: calculatePercentChange(agencyStats.total_sales, prevAgencyStats.total_sales),
        leads_change: calculatePercentChange(leadStats.total_leads, prevLeadStats.total_leads),
        conversion_change: calculatePercentChange(teamStats.avg_conversion_rate, prevTeamStats.avg_conversion_rate)
      };
    }

    return res.status(200).json({
      timeframe: { start_date: startDate, end_date: endDate },
      agency_overview: agencyStats,
      team_performance: teamStats,
      lead_metrics: leadStats,
      financial_summary: financialStats,
      comparison,
      trends: await getTrendData(agencyId, startDate, endDate)
    });

  } catch (error) {
    console.error('Error in overview analytics:', error);
    return res.status(500).json({ error: 'Failed to fetch overview analytics' });
  }
}

async function getTeamPerformanceAnalytics(req, res, agencyId, startDate, endDate, managerId) {
  try {
    // Get team performance data
    let query = supabase
      .from('portal_users')
      .select('id, full_name, manager_id, agent_code, created_at')
      .eq('agency_id', agencyId)
      .eq('role', 'agent')
      .eq('is_active', true);

    if (managerId) query = query.eq('manager_id', managerId);

    const { data: agents, error: agentsError } = await query;
    if (agentsError) throw agentsError;

    // Get sales data for agents
    const { data: sales, error: salesError } = await supabase
      .from('portal_sales')
      .select('agent_id, premium, sale_date, customer_name, product_name')
      .eq('agency_id', agencyId)
      .gte('sale_date', startDate)
      .lte('sale_date', endDate);

    const salesData = salesError ? [] : sales || [];

    // Get manager information
    const managerIds = [...new Set(agents?.map(a => a.manager_id).filter(Boolean) || [])];
    const { data: managers } = managerIds.length > 0 ? await supabase
      .from('portal_users')
      .select('id, full_name')
      .in('id', managerIds) : { data: [] };

    const managerMap = (managers || []).reduce((map, manager) => {
      map[manager.id] = manager.full_name;
      return map;
    }, {});

    // Calculate performance metrics by team/manager
    const teamPerformance = {};
    (agents || []).forEach(agent => {
      const managerId = agent.manager_id || 'unassigned';
      const managerName = managerMap[managerId] || 'Unassigned';
      
      if (!teamPerformance[managerId]) {
        teamPerformance[managerId] = {
          manager_id: managerId,
          manager_name: managerName,
          agents: [],
          total_sales: 0,
          total_revenue: 0,
          avg_conversion_rate: 0
        };
      }

      const agentSales = salesData.filter(s => s.agent_id === agent.id);
      const agentRevenue = agentSales.reduce((sum, s) => sum + (parseFloat(s.premium) || 0), 0);
      const mockLeads = Math.max(agentSales.length * 3, 10);
      const conversionRate = agentSales.length > 0 ? (agentSales.length / mockLeads) * 100 : 0;

      const agentData = {
        agent_id: agent.id,
        agent_name: agent.full_name,
        agent_code: agent.agent_code,
        sales_count: agentSales.length,
        revenue: agentRevenue,
        conversion_rate: conversionRate,
        tenure_days: Math.floor((new Date() - new Date(agent.created_at)) / (1000 * 60 * 60 * 24))
      };

      teamPerformance[managerId].agents.push(agentData);
      teamPerformance[managerId].total_sales += agentSales.length;
      teamPerformance[managerId].total_revenue += agentRevenue;
    });

    // Calculate team averages
    Object.values(teamPerformance).forEach(team => {
      team.avg_conversion_rate = team.agents.length > 0 
        ? team.agents.reduce((sum, a) => sum + a.conversion_rate, 0) / team.agents.length
        : 0;
      team.agents.sort((a, b) => b.revenue - a.revenue);
    });

    return res.status(200).json({
      timeframe: { start_date: startDate, end_date: endDate },
      team_performance: Object.values(teamPerformance),
      summary: {
        total_teams: Object.keys(teamPerformance).length,
        total_agents: agents?.length || 0,
        best_performing_team: Object.values(teamPerformance).sort((a, b) => b.total_revenue - a.total_revenue)[0] || null
      }
    });

  } catch (error) {
    console.error('Error in team performance analytics:', error);
    return res.status(500).json({ error: 'Failed to fetch team performance analytics' });
  }
}

async function getFinancialAnalytics(req, res, agencyId, startDate, endDate, previousPeriod) {
  try {
    // Get sales data
    const { data: sales, error: salesError } = await supabase
      .from('portal_sales')
      .select('premium, sale_date, product_name, agent_id')
      .eq('agency_id', agencyId)
      .gte('sale_date', startDate)
      .lte('sale_date', endDate);

    const salesData = salesError ? [] : sales || [];

    // Calculate financial metrics
    const totalRevenue = salesData.reduce((sum, s) => sum + (parseFloat(s.premium) || 0), 0);
    const mockCommissionRate = 0.15; // 15% average
    const totalCommissions = totalRevenue * mockCommissionRate;
    const mockLeadCosts = Math.floor(Math.random() * 5000) + 2000;
    const mockOperatingCosts = Math.floor(Math.random() * 3000) + 1500;
    const netProfit = totalRevenue - totalCommissions - mockLeadCosts - mockOperatingCosts;

    // Revenue by product
    const revenueByProduct = salesData.reduce((acc, sale) => {
      const product = sale.product_name || 'Unknown';
      if (!acc[product]) acc[product] = 0;
      acc[product] += parseFloat(sale.premium) || 0;
      return acc;
    }, {});

    // Monthly breakdown
    const monthlyData = generateMonthlyBreakdown(salesData, startDate, endDate);

    // Commission liability by agent
    const { data: agents } = await supabase
      .from('portal_users')
      .select('id, full_name')
      .eq('agency_id', agencyId)
      .eq('role', 'agent');

    const commissionLiability = (agents || []).map(agent => {
      const agentSales = salesData.filter(s => s.agent_id === agent.id);
      const agentRevenue = agentSales.reduce((sum, s) => sum + (parseFloat(s.premium) || 0), 0);
      return {
        agent_id: agent.id,
        agent_name: agent.full_name,
        revenue: agentRevenue,
        commission_owed: agentRevenue * mockCommissionRate,
        sales_count: agentSales.length
      };
    }).sort((a, b) => b.commission_owed - a.commission_owed);

    return res.status(200).json({
      timeframe: { start_date: startDate, end_date: endDate },
      financial_summary: {
        total_revenue: totalRevenue,
        total_commissions: totalCommissions,
        lead_costs: mockLeadCosts,
        operating_costs: mockOperatingCosts,
        net_profit: netProfit,
        profit_margin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
      },
      revenue_by_product: Object.entries(revenueByProduct).map(([product, revenue]) => ({
        product_name: product,
        revenue,
        percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0
      })),
      monthly_breakdown: monthlyData,
      commission_liability: commissionLiability,
      financial_health_score: calculateFinancialHealthScore(netProfit, totalRevenue)
    });

  } catch (error) {
    console.error('Error in financial analytics:', error);
    return res.status(500).json({ error: 'Failed to fetch financial analytics' });
  }
}

async function getCommissionLiabilityAnalytics(req, res, agencyId, startDate, endDate) {
  try {
    // Get all agents and their sales
    const { data: agents } = await supabase
      .from('portal_users')
      .select('id, full_name, agent_code, hire_date')
      .eq('agency_id', agencyId)
      .eq('role', 'agent')
      .eq('is_active', true);

    const { data: sales } = await supabase
      .from('portal_sales')
      .select('agent_id, premium, sale_date, status')
      .eq('agency_id', agencyId)
      .gte('sale_date', startDate)
      .lte('sale_date', endDate);

    const salesData = sales || [];
    const mockCommissionRate = 0.15;

    // Calculate commission liability by agent
    const liabilityData = (agents || []).map(agent => {
      const agentSales = salesData.filter(s => s.agent_id === agent.id);
      const totalRevenue = agentSales.reduce((sum, s) => sum + (parseFloat(s.premium) || 0), 0);
      const commissionOwed = totalRevenue * mockCommissionRate;
      
      return {
        agent_id: agent.id,
        agent_name: agent.full_name,
        agent_code: agent.agent_code,
        hire_date: agent.hire_date,
        sales_count: agentSales.length,
        total_revenue: totalRevenue,
        commission_rate: mockCommissionRate * 100,
        commission_owed: commissionOwed,
        commission_paid: commissionOwed * 0.8, // Mock: 80% paid
        commission_pending: commissionOwed * 0.2, // Mock: 20% pending
        last_payout_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
    }).sort((a, b) => b.commission_owed - a.commission_owed);

    // Calculate totals
    const totals = {
      total_commission_owed: liabilityData.reduce((sum, agent) => sum + agent.commission_owed, 0),
      total_commission_paid: liabilityData.reduce((sum, agent) => sum + agent.commission_paid, 0),
      total_commission_pending: liabilityData.reduce((sum, agent) => sum + agent.commission_pending, 0),
      agents_with_pending_payments: liabilityData.filter(agent => agent.commission_pending > 0).length
    };

    return res.status(200).json({
      timeframe: { start_date: startDate, end_date: endDate },
      commission_liability: liabilityData,
      totals,
      payout_schedule: {
        next_payout_date: getNextPayoutDate(),
        payout_frequency: 'monthly',
        auto_payout_enabled: true
      }
    });

  } catch (error) {
    console.error('Error in commission liability analytics:', error);
    return res.status(500).json({ error: 'Failed to fetch commission liability analytics' });
  }
}

async function getManagerPerformanceAnalytics(req, res, agencyId, startDate, endDate) {
  try {
    // Get managers and their teams
    const { data: managers } = await supabase
      .from('portal_users')
      .select('id, full_name, email, hire_date')
      .eq('agency_id', agencyId)
      .eq('role', 'manager')
      .eq('is_active', true);

    if (!managers || managers.length === 0) {
      return res.status(200).json({
        manager_performance: [],
        summary: { total_managers: 0 }
      });
    }

    // Get agents for each manager
    const managerPerformance = await Promise.all(
      managers.map(async (manager) => {
        const { data: agents } = await supabase
          .from('portal_users')
          .select('id, full_name')
          .eq('manager_id', manager.id)
          .eq('is_active', true);

        if (!agents || agents.length === 0) {
          return {
            manager_id: manager.id,
            manager_name: manager.full_name,
            manager_email: manager.email,
            hire_date: manager.hire_date,
            team_size: 0,
            team_sales: 0,
            team_revenue: 0,
            avg_agent_performance: 0,
            team_retention_rate: 0,
            management_score: 0
          };
        }

        // Get sales for the manager's team
        const { data: teamSales } = await supabase
          .from('portal_sales')
          .select('premium, agent_id')
          .eq('agency_id', agencyId)
          .gte('sale_date', startDate)
          .lte('sale_date', endDate)
          .in('agent_id', agents.map(a => a.id));

        const totalRevenue = (teamSales || []).reduce((sum, s) => sum + (parseFloat(s.premium) || 0), 0);
        const totalSales = (teamSales || []).length;
        const avgAgentPerformance = agents.length > 0 ? totalRevenue / agents.length : 0;

        // Mock additional metrics
        const teamRetentionRate = Math.random() * 20 + 80; // 80-100%
        const managementScore = calculateManagementScore(agents.length, totalRevenue, teamRetentionRate);

        return {
          manager_id: manager.id,
          manager_name: manager.full_name,
          manager_email: manager.email,
          hire_date: manager.hire_date,
          team_size: agents.length,
          team_sales: totalSales,
          team_revenue: totalRevenue,
          avg_agent_performance: avgAgentPerformance,
          team_retention_rate: teamRetentionRate,
          management_score: managementScore,
          agents: agents.map(agent => ({
            agent_id: agent.id,
            agent_name: agent.full_name,
            sales_count: (teamSales || []).filter(s => s.agent_id === agent.id).length,
            revenue: (teamSales || []).filter(s => s.agent_id === agent.id)
              .reduce((sum, s) => sum + (parseFloat(s.premium) || 0), 0)
          }))
        };
      })
    );

    // Sort by management score
    managerPerformance.sort((a, b) => b.management_score - a.management_score);

    return res.status(200).json({
      timeframe: { start_date: startDate, end_date: endDate },
      manager_performance: managerPerformance,
      summary: {
        total_managers: managers.length,
        avg_team_size: managerPerformance.reduce((sum, m) => sum + m.team_size, 0) / managers.length,
        total_agents_managed: managerPerformance.reduce((sum, m) => sum + m.team_size, 0),
        best_performing_manager: managerPerformance[0] || null
      }
    });

  } catch (error) {
    console.error('Error in manager performance analytics:', error);
    return res.status(500).json({ error: 'Failed to fetch manager performance analytics' });
  }
}

async function getLeadAnalytics(req, res, agencyId, startDate, endDate) {
  // Mock lead analytics since leads table might not exist
  const mockLeadData = {
    total_leads: Math.floor(Math.random() * 200) + 100,
    qualified_leads: Math.floor(Math.random() * 150) + 75,
    converted_leads: Math.floor(Math.random() * 50) + 25,
    lead_sources: [
      { source: 'Boberdoo', leads: Math.floor(Math.random() * 60) + 30, conversion_rate: (Math.random() * 10 + 15).toFixed(1) },
      { source: 'Website', leads: Math.floor(Math.random() * 40) + 20, conversion_rate: (Math.random() * 15 + 20).toFixed(1) },
      { source: 'QuoteWizard', leads: Math.floor(Math.random() * 30) + 15, conversion_rate: (Math.random() * 8 + 12).toFixed(1) },
      { source: 'Referrals', leads: Math.floor(Math.random() * 25) + 10, conversion_rate: (Math.random() * 20 + 25).toFixed(1) }
    ]
  };

  mockLeadData.conversion_rate = mockLeadData.total_leads > 0 
    ? (mockLeadData.converted_leads / mockLeadData.total_leads * 100).toFixed(1)
    : '0.0';

  return res.status(200).json({
    timeframe: { start_date: startDate, end_date: endDate },
    lead_analytics: mockLeadData,
    lead_quality_score: (Math.random() * 2 + 3).toFixed(1), // 3-5 scale
    avg_response_time_minutes: Math.floor(Math.random() * 60) + 15
  });
}

async function getProductPerformanceAnalytics(req, res, agencyId, startDate, endDate) {
  try {
    const { data: sales } = await supabase
      .from('portal_sales')
      .select('product_name, premium, sale_date')
      .eq('agency_id', agencyId)
      .gte('sale_date', startDate)
      .lte('sale_date', endDate);

    const salesData = sales || [];

    // Group by product
    const productPerformance = salesData.reduce((acc, sale) => {
      const product = sale.product_name || 'Unknown Product';
      if (!acc[product]) {
        acc[product] = {
          product_name: product,
          sales_count: 0,
          total_revenue: 0,
          avg_premium: 0
        };
      }
      acc[product].sales_count++;
      acc[product].total_revenue += parseFloat(sale.premium) || 0;
      return acc;
    }, {});

    // Calculate averages and sort
    const productArray = Object.values(productPerformance).map(product => ({
      ...product,
      avg_premium: product.sales_count > 0 ? product.total_revenue / product.sales_count : 0
    })).sort((a, b) => b.total_revenue - a.total_revenue);

    return res.status(200).json({
      timeframe: { start_date: startDate, end_date: endDate },
      product_performance: productArray,
      summary: {
        total_products_sold: productArray.length,
        best_selling_product: productArray[0] || null,
        total_revenue: productArray.reduce((sum, p) => sum + p.total_revenue, 0)
      }
    });

  } catch (error) {
    console.error('Error in product performance analytics:', error);
    return res.status(500).json({ error: 'Failed to fetch product performance analytics' });
  }
}

// Helper functions
function getDateRange(timeframe) {
  const now = new Date();
  let startDate, endDate;

  switch (timeframe) {
    case 'week':
      startDate = new Date(now.setDate(now.getDate() - now.getDay()));
      endDate = new Date(now.setDate(startDate.getDate() + 6));
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
}

function getPreviousPeriod(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const duration = end - start;
  
  return {
    startDate: new Date(start.getTime() - duration).toISOString().split('T')[0],
    endDate: new Date(start.getTime() - 1).toISOString().split('T')[0]
  };
}

function calculatePercentChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous * 100).toFixed(1);
}

async function getAgencyStats(agencyId, startDate, endDate) {
  const { data: sales } = await supabase
    .from('portal_sales')
    .select('premium')
    .eq('agency_id', agencyId)
    .gte('sale_date', startDate)
    .lte('sale_date', endDate);

  return {
    total_sales: (sales || []).length,
    total_revenue: (sales || []).reduce((sum, s) => sum + (parseFloat(s.premium) || 0), 0)
  };
}

async function getTeamStats(agencyId, startDate, endDate) {
  const { data: agents } = await supabase
    .from('portal_users')
    .select('id')
    .eq('agency_id', agencyId)
    .eq('role', 'agent')
    .eq('is_active', true);

  return {
    total_agents: (agents || []).length,
    avg_conversion_rate: Math.random() * 15 + 15 // Mock: 15-30%
  };
}

async function getLeadStats(agencyId, startDate, endDate) {
  return {
    total_leads: Math.floor(Math.random() * 200) + 100,
    conversion_rate: Math.random() * 10 + 15
  };
}

async function getFinancialStats(agencyId, startDate, endDate) {
  const { total_revenue } = await getAgencyStats(agencyId, startDate, endDate);
  return {
    total_revenue,
    total_commissions: total_revenue * 0.15,
    net_profit: total_revenue * 0.65
  };
}

async function getTrendData(agencyId, startDate, endDate) {
  return {
    revenue_trend: 'up',
    sales_trend: 'up',
    agent_productivity_trend: 'stable'
  };
}

function generateMonthlyBreakdown(salesData, startDate, endDate) {
  const months = {};
  salesData.forEach(sale => {
    const month = sale.sale_date.substring(0, 7); // YYYY-MM
    if (!months[month]) months[month] = { revenue: 0, sales: 0 };
    months[month].revenue += parseFloat(sale.premium) || 0;
    months[month].sales++;
  });

  return Object.entries(months).map(([month, data]) => ({
    month,
    ...data
  })).sort((a, b) => a.month.localeCompare(b.month));
}

function calculateFinancialHealthScore(netProfit, totalRevenue) {
  if (totalRevenue === 0) return 0;
  const profitMargin = (netProfit / totalRevenue) * 100;
  if (profitMargin > 40) return 'Excellent';
  if (profitMargin > 25) return 'Good';
  if (profitMargin > 10) return 'Fair';
  return 'Needs Improvement';
}

function calculateManagementScore(teamSize, revenue, retentionRate) {
  const revenueScore = Math.min(revenue / 50000 * 40, 40); // Max 40 points for $50k+ revenue
  const teamScore = Math.min(teamSize * 5, 30); // Max 30 points for team size
  const retentionScore = Math.min(retentionRate * 0.3, 30); // Max 30 points for retention
  return Math.round(revenueScore + teamScore + retentionScore);
}

function getNextPayoutDate() {
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(1);
  return nextMonth.toISOString().split('T')[0];
}

export default requireAuth(['admin', 'super_admin'])(analyticsHandler);