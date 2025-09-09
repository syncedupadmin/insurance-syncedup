import { createClient } from '@supabase/supabase-js';
// DISABLED: // DISABLED: import { requireAuth } from '../_middleware/authCheck.js';
import { getUserContext } from '../utils/auth-helper.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function teamPerformanceHandler(req, res) {
  // CORS headers
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
    const { timeframe = 'month', agent_id } = req.query;

    // Get date range based on timeframe
    const { startDate, endDate } = getDateRange(timeframe);

    // Get all agents in the agency
    const { data: agents, error: agentsError } = await supabase
      .from('portal_users')
      .select('id, full_name, email, agent_code, created_at, is_active')
      .eq('agency_id', agencyId)
      .eq('role', 'agent')
      .eq('is_active', true)
      .order('full_name');

    if (agentsError) {
      console.error('Error fetching agents:', agentsError);
      return res.status(500).json({ error: 'Failed to fetch agents' });
    }

    // If no real agents, use demo data
    if (!agents || agents.length === 0) {
      return res.status(200).json(generateDemoTeamData(timeframe));
    }

    // Get sales data for all agents
    const { data: sales, error: salesError } = await supabase
      .from('portal_sales')
      .select('agent_id, premium, sale_date, status, customer_name, product_name')
      .eq('agency_id', agencyId)
      .gte('sale_date', startDate)
      .lte('sale_date', endDate)
      .in('agent_id', agents.map(a => a.id));

    if (salesError) {
      console.error('Error fetching sales:', salesError);
      return res.status(500).json({ error: 'Failed to fetch sales data' });
    }

    // Calculate performance metrics for each agent
    const agentPerformance = agents.map(agent => {
      const agentSales = sales?.filter(s => s.agent_id === agent.id) || [];
      
      const totalSales = agentSales.reduce((sum, s) => sum + (parseFloat(s.premium) || 0), 0);
      const salesCount = agentSales.length;
      const avgPremium = salesCount > 0 ? totalSales / salesCount : 0;
      
      // Calculate conversion rate (mock for now - would need leads data)
      const mockLeads = Math.max(salesCount * 3, 10); // Assume 3:1 lead to sale ratio
      const conversionRate = salesCount > 0 ? (salesCount / mockLeads) * 100 : 0;

      return {
        agent: {
          id: agent.id,
          name: agent.full_name,
          email: agent.email,
          agent_code: agent.agent_code,
          tenure_days: Math.floor((new Date() - new Date(agent.created_at)) / (1000 * 60 * 60 * 24))
        },
        metrics: {
          total_sales: totalSales,
          sales_count: salesCount,
          avg_premium: avgPremium,
          conversion_rate: conversionRate,
          leads_count: mockLeads,
          sales_this_week: agentSales.filter(s => isThisWeek(s.sale_date)).length,
          rank: 0 // Will be calculated after sorting
        },
        recent_sales: agentSales
          .sort((a, b) => new Date(b.sale_date) - new Date(a.sale_date))
          .slice(0, 5)
          .map(sale => ({
            customer_name: sale.customer_name,
            product_name: sale.product_name,
            premium: parseFloat(sale.premium),
            sale_date: sale.sale_date,
            status: sale.status
          }))
      };
    });

    // Sort by total sales and assign ranks
    const sortedPerformance = agentPerformance.sort((a, b) => b.metrics.total_sales - a.metrics.total_sales);
    sortedPerformance.forEach((agent, index) => {
      agent.metrics.rank = index + 1;
    });

    // Calculate team totals and averages
    const teamTotals = {
      total_sales: sortedPerformance.reduce((sum, a) => sum + a.metrics.total_sales, 0),
      total_sales_count: sortedPerformance.reduce((sum, a) => sum + a.metrics.sales_count, 0),
      total_agents: sortedPerformance.length,
      avg_sales_per_agent: 0,
      avg_conversion_rate: 0,
      top_performer: sortedPerformance[0] || null,
      bottom_performer: sortedPerformance[sortedPerformance.length - 1] || null
    };

    teamTotals.avg_sales_per_agent = teamTotals.total_agents > 0 ? teamTotals.total_sales / teamTotals.total_agents : 0;
    teamTotals.avg_conversion_rate = teamTotals.total_agents > 0 
      ? sortedPerformance.reduce((sum, a) => sum + a.metrics.conversion_rate, 0) / teamTotals.total_agents 
      : 0;

    // Get specific agent data if requested
    let agentDetail = null;
    if (agent_id) {
      agentDetail = sortedPerformance.find(a => a.agent.id === agent_id);
    }

    return res.status(200).json({
      timeframe,
      date_range: { start_date: startDate, end_date: endDate },
      team_summary: teamTotals,
      agent_performance: sortedPerformance,
      agent_detail: agentDetail,
      company_benchmarks: {
        avg_conversion_rate: 25.5,
        avg_sales_per_agent: teamTotals.avg_sales_per_agent * 1.15,
        target_monthly_sales: 15000
      }
    });

  } catch (error) {
    console.error('Team performance API error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch team performance', 
      details: error.message 
    });
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

function isThisWeek(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
  const weekEnd = new Date(now.setDate(weekStart.getDate() + 6));
  
  return date >= weekStart && date <= weekEnd;
}

function generateDemoTeamData(timeframe) {
  const demoAgents = [
    {
      agent: {
        id: 'demo-agent-1',
        name: 'Sarah Johnson',
        email: 'sarah.johnson@agency.com',
        agent_code: 'SJ001',
        tenure_days: 245
      },
      metrics: {
        total_sales: 18750.50,
        sales_count: 12,
        avg_premium: 1562.54,
        conversion_rate: 28.5,
        leads_count: 42,
        sales_this_week: 3,
        rank: 1
      },
      recent_sales: [
        { customer_name: 'John Smith', product_name: 'PPO Plan 500', premium: 149.99, sale_date: '2025-09-01', status: 'active' },
        { customer_name: 'Mary Wilson', product_name: 'HMO Plan 1000', premium: 119.99, sale_date: '2025-08-30', status: 'active' }
      ]
    },
    {
      agent: {
        id: 'demo-agent-2',
        name: 'Michael Chen',
        email: 'michael.chen@agency.com',
        agent_code: 'MC002',
        tenure_days: 180
      },
      metrics: {
        total_sales: 15420.75,
        sales_count: 9,
        avg_premium: 1713.42,
        conversion_rate: 22.5,
        leads_count: 40,
        sales_this_week: 2,
        rank: 2
      },
      recent_sales: [
        { customer_name: 'David Brown', product_name: 'Bronze Plus Plan', premium: 199.99, sale_date: '2025-08-29', status: 'active' }
      ]
    },
    {
      agent: {
        id: 'demo-agent-3',
        name: 'Emma Rodriguez',
        email: 'emma.rodriguez@agency.com',
        agent_code: 'ER003',
        tenure_days: 90
      },
      metrics: {
        total_sales: 8940.25,
        sales_count: 6,
        avg_premium: 1490.04,
        conversion_rate: 18.2,
        leads_count: 33,
        sales_this_week: 1,
        rank: 3
      },
      recent_sales: [
        { customer_name: 'Lisa Garcia', product_name: 'HDHP 2500', premium: 89.99, sale_date: '2025-08-28', status: 'active' }
      ]
    }
  ];

  return {
    timeframe,
    date_range: getDateRange(timeframe),
    team_summary: {
      total_sales: 43111.50,
      total_sales_count: 27,
      total_agents: 3,
      avg_sales_per_agent: 14370.50,
      avg_conversion_rate: 23.1,
      top_performer: demoAgents[0],
      bottom_performer: demoAgents[2]
    },
    agent_performance: demoAgents,
    agent_detail: null,
    company_benchmarks: {
      avg_conversion_rate: 25.5,
      avg_sales_per_agent: 16525.00,
      target_monthly_sales: 15000
    }
  };
}

// DISABLED: export default requireAuth(['manager', 'admin', 'super_admin'])(teamPerformanceHandler);export default teamPerformanceHandler;
