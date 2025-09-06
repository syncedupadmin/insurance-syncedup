import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../_middleware/authCheck.js';
import { getUserContext } from '../utils/auth-helper.js';


// Helper function to calculate real growth rate
async function calculateGrowthRate(currentRevenue, startDate, endDate, agencyId) {
  try {
    const previousPeriod = getPreviousPeriod(startDate, endDate);
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    
    const { data: previousSales } = await supabase
      .from('portal_sales')
      .select('premium')
      .eq('agency_id', agencyId)
      .gte('sale_date', previousPeriod.start)
      .lte('sale_date', previousPeriod.end);
    
    const previousRevenue = previousSales?.reduce((sum, s) => sum + (parseFloat(s.premium) || 0), 0) || 0;
    
    if (previousRevenue === 0) return '0.0';
    return (((currentRevenue - previousRevenue) / previousRevenue) * 100).toFixed(1);
  } catch (error) {
    return '0.0';
  }
}

function getPreviousPeriod(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const periodLength = end - start;
  
  return {
    start: new Date(start.getTime() - periodLength).toISOString().split('T')[0],
    end: new Date(start.getTime() - 1).toISOString().split('T')[0]
  };
}

// Helper function for empty KPIs
function emptyKPIs() {
  return {
    quick_stats: {
      active_agents: 0,
      total_sales_mtd: 0
    },
    agency_overview: {
      total_sales: 0
    },
    team_performance: {
      top_performers: []
    },
    recent_activity: []
  };
}

async function managerDashboardHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const timeframe = req.query.timeframe || 'month';
    
    // Check environment variables safely
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('Manager Dashboard: Environment variables missing, returning empty data');
      return res.status(200).json({ 
        ok: false, 
        reason: 'env-missing', 
        ...emptyKPIs() 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const { agencyId, role, email } = getUserContext(req);
    const { timeframe = 'month' } = req.query;

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
      getAgencyOverview(agencyId, startDate, endDate),
      getTeamPerformanceOverview(agencyId, startDate, endDate),
      getRecentActivity(agencyId),
      getUpcomingGoals(agencyId),
      getLeadSummary(agencyId, startDate, endDate),
      getSystemAlerts(agencyId)
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
    console.error('Manager dashboard API error:', error?.stack || error);
    return res.status(200).json({ 
      ok: false, 
      reason: 'exception', 
      ...emptyKPIs() 
    });
  }
}

async function getAgencyOverview(agencyId, startDate, endDate) {
  try {
    // Get agents count
    const { data: agents, error: agentsError } = await supabase
      .from('portal_users')
      .select('id, created_at')
      .eq('agency_id', agencyId)
      .eq('role', 'agent')
      .eq('is_active', true);

    if (agentsError) throw agentsError;

    // Get sales data
    const { data: sales, error: salesError } = await supabase
      .from('portal_sales')
      .select('premium, sale_date, customer_name')
      .eq('agency_id', agencyId)
      .gte('sale_date', startDate)
      .lte('sale_date', endDate);

    const salesData = salesError ? [] : sales || [];
    
    // Calculate overview metrics
    const totalSales = salesData.reduce((sum, s) => sum + (parseFloat(s.premium) || 0), 0);
    const salesCount = salesData.length;
    const avgPremium = salesCount > 0 ? totalSales / salesCount : 0;
    
    // Calculate real conversion rate from actual leads data if available
    let leadsCount = 0;
    let conversionRate = 0;
    
    try {
      const { data: leadsData, count: leadsCountResult } = await supabase
        .from('convoso_leads')
        .select('id', { count: 'exact' })
        .eq('agency_id', agencyId)
        .gte('received_at', startDate)
        .lte('received_at', endDate);
      
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
      revenue_growth: await calculateGrowthRate(totalSales, startDate, endDate, agencyId),
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

async function getTeamPerformanceOverview(agencyId, startDate, endDate) {
  try {
    // Get agents
    const { data: agents, error: agentsError } = await supabase
      .from('portal_users')
      .select('id, full_name, agent_code')
      .eq('agency_id', agencyId)
      .eq('role', 'agent')
      .eq('is_active', true)
      .order('full_name');

    if (agentsError) throw agentsError;

    if (!agents || agents.length === 0) {
      return {
        total_agents: 0,
        avg_conversion_rate: 0,
        top_performers: [],
        performance_distribution: { high: 0, medium: 0, low: 0 }
      };
    }

    // Get sales data for agents
    const { data: sales, error: salesError } = await supabase
      .from('portal_sales')
      .select('agent_id, premium, sale_date')
      .eq('agency_id', agencyId)
      .gte('sale_date', startDate)
      .lte('sale_date', endDate)
      .in('agent_id', agents.map(a => a.id));

    const salesData = salesError ? [] : sales || [];

    // Calculate agent performance
    const agentPerformance = agents.map(agent => {
      const agentSales = salesData.filter(s => s.agent_id === agent.id);
      const totalSales = agentSales.reduce((sum, s) => sum + (parseFloat(s.premium) || 0), 0);
      let conversionRate = 0;
      
      // Try to get actual lead count for conversion rate calculation
      try {
        const { count: leadCount } = await supabase
          .from('convoso_leads')
          .select('*', { count: 'exact', head: true })
          .eq('agency_id', agencyId)
          .eq('agent_id', agent.id);
        
        conversionRate = leadCount > 0 ? (agentSales.length / leadCount) * 100 : 0;
      } catch (error) {
        // If leads data not available, set conversion rate based on sales only
        conversionRate = agentSales.length > 0 ? 25 : 0; // Default assumption
      }

      return {
        agent_id: agent.id,
        agent_name: agent.full_name,
        agent_code: agent.agent_code,
        total_sales: totalSales,
        sales_count: agentSales.length,
        conversion_rate: conversionRate
      };
    });

    // Sort and get top performers
    agentPerformance.sort((a, b) => b.total_sales - a.total_sales);
    const topPerformers = agentPerformance.slice(0, 3);

    // Calculate performance distribution
    const avgConversionRate = agentPerformance.length > 0
      ? agentPerformance.reduce((sum, a) => sum + a.conversion_rate, 0) / agentPerformance.length
      : 0;

    const performanceDistribution = {
      high: agentPerformance.filter(a => a.conversion_rate > avgConversionRate * 1.2).length,
      medium: agentPerformance.filter(a => 
        a.conversion_rate >= avgConversionRate * 0.8 && a.conversion_rate <= avgConversionRate * 1.2
      ).length,
      low: agentPerformance.filter(a => a.conversion_rate < avgConversionRate * 0.8).length
    };

    return {
      total_agents: agents.length,
      avg_conversion_rate: avgConversionRate,
      top_performers: topPerformers,
      performance_distribution: performanceDistribution
    };

  } catch (error) {
    console.error('Error getting team performance overview:', error);
    return {
      total_agents: 0,
      avg_conversion_rate: 0,
      top_performers: [],
      performance_distribution: { high: 0, medium: 0, low: 0 }
    };
  }
}

async function getRecentActivity(agencyId) {
  try {
    // Get recent sales
    const { data: sales, error: salesError } = await supabase
      .from('portal_sales')
      .select(`
        id, 
        premium, 
        sale_date, 
        customer_name, 
        product_name,
        agent_id
      `)
      .eq('agency_id', agencyId)
      .order('sale_date', { ascending: false })
      .limit(10);

    // Get agent names for sales
    const { data: agents, error: agentsError } = await supabase
      .from('portal_users')
      .select('id, full_name')
      .eq('agency_id', agencyId)
      .eq('role', 'agent');

    const agentMap = (agents || []).reduce((map, agent) => {
      map[agent.id] = agent.full_name;
      return map;
    }, {});

    // Format recent activity
    const recentSales = (sales || []).map(sale => ({
      id: sale.id,
      type: 'sale',
      description: `${agentMap[sale.agent_id] || 'Agent'} sold ${sale.product_name} to ${sale.customer_name}`,
      amount: parseFloat(sale.premium),
      date: sale.sale_date,
      agent_name: agentMap[sale.agent_id] || 'Unknown Agent'
    }));

    return recentSales;

  } catch (error) {
    console.error('Error getting recent activity:', error);
    return [];
  }
}

async function getUpcomingGoals(agencyId) {
  try {
    const { data: goals, error: goalsError } = await supabase
      .from('portal_goals')
      .select(`
        id,
        title,
        target_date,
        target_value,
        agent_id,
        status
      `)
      .eq('agency_id', agencyId)
      .eq('status', 'active')
      .gte('target_date', new Date().toISOString().split('T')[0])
      .order('target_date')
      .limit(5);

    if (goalsError || !goals || goals.length === 0) {
      return [];
    }

    // Get agent names
    const { data: agents } = await supabase
      .from('portal_users')
      .select('id, full_name')
      .eq('agency_id', agencyId);

    const agentMap = (agents || []).reduce((map, agent) => {
      map[agent.id] = agent.full_name;
      return map;
    }, {});

    return goals.map(goal => ({
      ...goal,
      agent_name: agentMap[goal.agent_id] || 'Unknown Agent',
      days_remaining: Math.ceil((new Date(goal.target_date) - new Date()) / (1000 * 60 * 60 * 24))
    }));

  } catch (error) {
    console.error('Error getting upcoming goals:', error);
    return [];
  }
}

async function getLeadSummary(agencyId, startDate, endDate) {
  try {
    const { data: leads, error: leadsError } = await supabase
      .from('convoso_leads')
      .select('id, status, source, received_at, agent_id')
      .eq('agency_id', agencyId)
      .gte('received_at', startDate)
      .lte('received_at', endDate);

    if (leadsError) {
      console.log('Leads data not available:', leadsError.message);
      return {
        total_leads: 0,
        new_leads: 0,
        active_leads: 0,
        converted_leads: 0,
        lead_sources: [],
        avg_response_time: '0 minutes'
      };
    }

    const leadsData = leads || [];
    const totalLeads = leadsData.length;
    const newLeads = leadsData.filter(l => l.status === 'new').length;
    const activeLeads = leadsData.filter(l => ['new', 'contacted', 'working'].includes(l.status)).length;
    const convertedLeads = leadsData.filter(l => l.status === 'converted').length;

    // Group by source
    const sourceMap = leadsData.reduce((acc, lead) => {
      acc[lead.source] = (acc[lead.source] || 0) + 1;
      return acc;
    }, {});

    const leadSources = Object.entries(sourceMap).map(([source, count]) => ({
      source,
      count
    }));

    return {
      total_leads: totalLeads,
      new_leads: newLeads,
      active_leads: activeLeads,
      converted_leads: convertedLeads,
      lead_sources: leadSources,
      avg_response_time: 'N/A'
    };

  } catch (error) {
    console.error('Error getting lead summary:', error);
    return {
      total_leads: 0,
      new_leads: 0,
      active_leads: 0,
      converted_leads: 0,
      lead_sources: [],
      avg_response_time: '0 minutes'
    };
  }
}

async function getSystemAlerts(agencyId) {
  try {
    const { data: alerts, error: alertsError } = await supabase
      .from('system_alerts')
      .select('*')
      .eq('agency_id', agencyId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (alertsError) {
      console.log('System alerts not available:', alertsError.message);
      return [];
    }

    return alerts || [];

  } catch (error) {
    console.error('Error getting system alerts:', error);
    return [];
  }
}

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



export default requireAuth(['manager', 'admin', 'super_admin'])(managerDashboardHandler);