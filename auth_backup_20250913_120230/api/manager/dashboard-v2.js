import { createClient } from '@supabase/supabase-js';
// DISABLED: // DISABLED: import { requireAuth } from '../_middleware/authCheck.js';
import { getUserContext } from '../utils/auth-helper.js';
import { 
  isDemoUser, 
  applyDataIsolation, 
  getLeadSummary, 
  calculateGrowthRate,
  getAgentConversionRates,
  getSystemAlerts
} from '../utils/data-isolation-helper.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function managerDashboardHandler(req, res) {
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
    const { agencyId, role, email } = getUserContext(req);
    const { timeframe = 'month' } = req.query;
    const isDemo = isDemoUser(email, agencyId);

    // Get date range
    const { startDate, endDate } = getDateRange(timeframe);

    // Get all dashboard data in parallel
    const [
      agencyOverview,
      teamPerformance,
      recentActivity,
      upcomingGoals,
      leadSummary,
      alerts
    ] = await Promise.all([
      getAgencyOverview(agencyId, startDate, endDate, isDemo),
      getTeamPerformanceOverview(agencyId, startDate, endDate, isDemo),
      getRecentActivity(agencyId, isDemo),
      getUpcomingGoals(agencyId, isDemo),
      getLeadSummary(agencyId, startDate, endDate, isDemo),
      getSystemAlerts(agencyId, isDemo)
    ]);

    return res.status(200).json({
      timeframe,
      date_range: { start_date: startDate, end_date: endDate },
      agency_overview: agencyOverview,
      team_performance: teamPerformance,
      recent_activity: recentActivity,
      upcoming_goals: upcomingGoals,
      lead_summary: leadSummary,
      alerts: alerts,
      quick_stats: {
        active_agents: teamPerformance.total_agents,
        total_sales_mtd: agencyOverview.total_sales,
        avg_conversion_rate: teamPerformance.avg_conversion_rate,
        pending_leads: leadSummary.active_leads
      }
    });

  } catch (error) {
    console.error('Manager dashboard API error:', error);
    return res.status(500).json({ 
      error: 'Failed to load dashboard', 
      details: error.message 
    });
  }
}

async function getAgencyOverview(agencyId, startDate, endDate, isDemo = false) {
  try {
    // Get agents count
    let agentsQuery = supabase
      .from('portal_users')
      .select('id, created_at')
      .eq('role', 'agent')
      .eq('is_active', true);

    if (!isDemo) {
      agentsQuery = agentsQuery.eq('agency_id', agencyId);
    } else {
      agentsQuery = agentsQuery.eq('agency_id', 'DEMO001');
    }

    const { data: agents, error: agentsError } = await agentsQuery;

    if (agentsError) throw agentsError;

    // Get sales data with proper isolation
    let salesQuery = supabase
      .from('portal_sales')
      .select('premium, sale_date, customer_name')
      .gte('sale_date', startDate)
      .lte('sale_date', endDate);

    salesQuery = applyDataIsolation(salesQuery, 'portal_sales', isDemo);
    
    if (!isDemo) {
      salesQuery = salesQuery.eq('agency_id', agencyId);
    }

    const { data: sales, error: salesError } = await salesQuery;

    const salesData = salesError ? [] : sales || [];
    
    // Calculate overview metrics
    const totalSales = salesData.reduce((sum, s) => sum + (parseFloat(s.premium) || 0), 0);
    const salesCount = salesData.length;
    const avgPremium = salesCount > 0 ? totalSales / salesCount : 0;
    
    // Get real leads count and conversion rate
    let leadsCount = 0;
    let conversionRate = 0;
    
    try {
      let leadsQuery = supabase
        .from('convoso_leads')
        .select('id', { count: 'exact' })
        .gte('received_at', startDate)
        .lte('received_at', endDate);

      leadsQuery = applyDataIsolation(leadsQuery, 'convoso_leads', isDemo);
      
      if (!isDemo) {
        leadsQuery = leadsQuery.eq('agency_id', agencyId);
      }

      const { count: leadsCountResult } = await leadsQuery;
      leadsCount = leadsCountResult || 0;
      conversionRate = leadsCount > 0 ? (salesCount / leadsCount) * 100 : 0;
    } catch (error) {
      console.log('Leads data not available, using sales-only metrics');
    }
    
    return {
      total_agents: agents?.length || 0,
      new_agents_period: agents?.filter(a => 
        new Date(a.created_at) >= new Date(startDate)
      ).length || 0,
      total_sales: totalSales,
      sales_count: salesCount,
      avg_premium: avgPremium,
      leads_count: leadsCount,
      conversion_rate: conversionRate,
      revenue_growth: await calculateGrowthRate(totalSales, startDate, endDate, agencyId, isDemo),
      customer_count: new Set(salesData.map(s => s.customer_name)).size
    };

  } catch (error) {
    console.error('Error getting agency overview:', error);
    return {
      total_agents: 0,
      new_agents_period: 0,
      total_sales: 0,
      sales_count: 0,
      avg_premium: 0,
      leads_count: 0,
      conversion_rate: 0,
      revenue_growth: '0.0',
      customer_count: 0
    };
  }
}

async function getTeamPerformanceOverview(agencyId, startDate, endDate, isDemo = false) {
  try {
    // Get agents
    let agentsQuery = supabase
      .from('portal_users')
      .select('id, full_name, agent_code')
      .eq('role', 'agent')
      .eq('is_active', true)
      .order('full_name');

    if (!isDemo) {
      agentsQuery = agentsQuery.eq('agency_id', agencyId);
    } else {
      agentsQuery = agentsQuery.eq('agency_id', 'DEMO001');
    }

    const { data: agents, error: agentsError } = await agentsQuery;

    if (agentsError) throw agentsError;

    if (!agents || agents.length === 0) {
      return {
        total_agents: 0,
        avg_conversion_rate: 0,
        top_performer: null,
        agent_performance: []
      };
    }

    // Get sales data for all agents
    let salesQuery = supabase
      .from('portal_sales')
      .select('agent_id, premium, sale_date')
      .gte('sale_date', startDate)
      .lte('sale_date', endDate);

    salesQuery = applyDataIsolation(salesQuery, 'portal_sales', isDemo);

    const { data: salesData, error: salesError } = await salesQuery;

    const agentSalesData = salesError ? [] : salesData || [];

    // Get conversion rates for all agents
    const agentIds = agents.map(a => a.id);
    const conversionRates = await getAgentConversionRates(agentIds, startDate, endDate, isDemo);

    // Calculate agent performance
    const agentPerformance = agents.map(agent => {
      const agentSales = agentSalesData.filter(s => s.agent_id === agent.id);
      const totalSales = agentSales.reduce((sum, s) => sum + (parseFloat(s.premium) || 0), 0);
      const agentConversionData = conversionRates[agent.id] || { leads_count: 0, conversion_rate: 0 };

      return {
        agent_id: agent.id,
        agent_name: agent.full_name,
        agent_code: agent.agent_code,
        total_sales: totalSales,
        sales_count: agentSales.length,
        leads_count: agentConversionData.leads_count,
        conversion_rate: agentConversionData.conversion_rate
      };
    });

    // Sort by total sales to find top performer
    const sortedAgents = agentPerformance.sort((a, b) => b.total_sales - a.total_sales);
    const topPerformer = sortedAgents[0];
    
    // Calculate team averages
    const avgConversionRate = agentPerformance.reduce((sum, a) => sum + a.conversion_rate, 0) / agentPerformance.length;

    return {
      total_agents: agents.length,
      avg_conversion_rate: avgConversionRate,
      top_performer: topPerformer,
      agent_performance: agentPerformance
    };

  } catch (error) {
    console.error('Error getting team performance:', error);
    return {
      total_agents: 0,
      avg_conversion_rate: 0,
      top_performer: null,
      agent_performance: []
    };
  }
}

async function getRecentActivity(agencyId, isDemo = false) {
  try {
    // Get recent sales as activities
    let salesQuery = supabase
      .from('portal_sales')
      .select(`
        id, sale_date, customer_name, premium, product_name,
        portal_users!inner(full_name)
      `)
      .order('sale_date', { ascending: false })
      .limit(10);

    salesQuery = applyDataIsolation(salesQuery, 'portal_sales', isDemo);
    
    if (!isDemo) {
      salesQuery = salesQuery.eq('agency_id', agencyId);
    }

    const { data: sales, error: salesError } = await salesQuery;

    if (salesError) throw salesError;

    const activities = (sales || []).map(sale => ({
      id: sale.id,
      type: 'sale',
      description: `${sale.portal_users.full_name} closed a ${sale.product_name} policy`,
      customer: sale.customer_name,
      amount: parseFloat(sale.premium),
      timestamp: sale.sale_date
    }));

    return activities;

  } catch (error) {
    console.error('Error getting recent activity:', error);
    return [];
  }
}

async function getUpcomingGoals(agencyId, isDemo = false) {
  try {
    // Get agent goals
    let goalsQuery = supabase
      .from('agent_goals')
      .select(`
        id, goal_type, target_value, current_value, target_date,
        portal_users!inner(full_name)
      `)
      .eq('is_active', true)
      .gte('target_date', new Date().toISOString().split('T')[0])
      .order('target_date');

    if (!isDemo) {
      goalsQuery = goalsQuery.eq('agency_id', agencyId);
    } else {
      goalsQuery = goalsQuery.eq('agency_id', 'DEMO001');
    }

    const { data: goals, error: goalsError } = await goalsQuery;

    if (goalsError) throw goalsError;

    // Return real goals or empty array if none
    if (!goals || goals.length === 0) {
      return [];
    }

    // Sort by target date and return first 5
    const sortedGoals = goals.sort((a, b) => new Date(a.target_date) - new Date(b.target_date));
    return sortedGoals.slice(0, 5).map(goal => ({
      id: goal.id,
      type: goal.goal_type,
      target: parseFloat(goal.target_value),
      current: parseFloat(goal.current_value) || 0,
      agent_name: goal.portal_users.full_name,
      target_date: goal.target_date
    }));

  } catch (error) {
    console.error('Error getting upcoming goals:', error);
    return [];
  }
}

function getDateRange(timeframe) {
  const now = new Date();
  let startDate, endDate;

  switch (timeframe) {
    case 'week':
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      startDate = startOfWeek.toISOString().split('T')[0];
      endDate = new Date().toISOString().split('T')[0];
      break;
    case 'quarter':
      const quarter = Math.floor((new Date().getMonth()) / 3);
      const startOfQuarter = new Date(new Date().getFullYear(), quarter * 3, 1);
      startDate = startOfQuarter.toISOString().split('T')[0];
      endDate = new Date().toISOString().split('T')[0];
      break;
    case 'year':
      const startOfYear = new Date(new Date().getFullYear(), 0, 1);
      startDate = startOfYear.toISOString().split('T')[0];
      endDate = new Date().toISOString().split('T')[0];
      break;
    case 'month':
    default:
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      startDate = startOfMonth.toISOString().split('T')[0];
      endDate = new Date().toISOString().split('T')[0];
  }

  return { startDate, endDate };
}

// DISABLED: export default requireAuth(['manager', 'admin'])(managerDashboardHandler);export default managerDashboardHandler;
