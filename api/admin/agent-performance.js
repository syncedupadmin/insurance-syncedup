// API endpoint for agent performance metrics
export default async function handler(req, res) {
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
    // Get query parameters for filtering
    const { period = '30', agent_id } = req.query;
    
    // Get authorization header to determine account type
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    
    // Determine if this is a demo or production account
    const isDemoAccount = token.startsWith('demo-') || token === 'demo';
    
    console.log(`Agent performance request - Token: ${token.substring(0, 10)}..., isDemo: ${isDemoAccount}`);

    let performanceData;
    
    if (isDemoAccount) {
      // Return demo data for demo accounts
      performanceData = {
      summary: {
        totalAgents: 12,
        activeAgents: 8,
        topPerformer: 'John Smith',
        avgConversionRate: 14.8,
        totalSales: 156,
        totalCommissions: 45678.90
      },
      agents: [
        {
          id: 'agent_001',
          name: 'John Smith',
          email: 'john.smith@phsagency.com',
          sales: 23,
          leads: 89,
          conversionRate: 25.8,
          commission: 4567.80,
          rank: 1,
          status: 'active',
          lastActivity: new Date().toISOString(),
          monthlyStats: [
            { month: 'Jan', sales: 18, commission: 3456.00 },
            { month: 'Feb', sales: 21, commission: 4123.50 },
            { month: 'Mar', sales: 23, commission: 4567.80 }
          ]
        },
        {
          id: 'agent_002',
          name: 'Sarah Johnson',
          email: 'sarah.johnson@phsagency.com',
          sales: 19,
          leads: 76,
          conversionRate: 25.0,
          commission: 3892.50,
          rank: 2,
          status: 'active',
          lastActivity: new Date().toISOString(),
          monthlyStats: [
            { month: 'Jan', sales: 15, commission: 2890.00 },
            { month: 'Feb', sales: 17, commission: 3245.50 },
            { month: 'Mar', sales: 19, commission: 3892.50 }
          ]
        },
        {
          id: 'agent_003',
          name: 'Mike Davis',
          email: 'mike.davis@phsagency.com',
          sales: 16,
          leads: 68,
          conversionRate: 23.5,
          commission: 3245.70,
          rank: 3,
          status: 'active',
          lastActivity: new Date().toISOString(),
          monthlyStats: [
            { month: 'Jan', sales: 12, commission: 2345.00 },
            { month: 'Feb', sales: 14, commission: 2890.50 },
            { month: 'Mar', sales: 16, commission: 3245.70 }
          ]
        },
        {
          id: 'agent_004',
          name: 'Lisa Chen',
          email: 'lisa.chen@phsagency.com',
          sales: 14,
          leads: 62,
          conversionRate: 22.6,
          commission: 2890.40,
          rank: 4,
          status: 'active',
          lastActivity: new Date().toISOString(),
          monthlyStats: [
            { month: 'Jan', sales: 10, commission: 1890.00 },
            { month: 'Feb', sales: 12, commission: 2345.50 },
            { month: 'Mar', sales: 14, commission: 2890.40 }
          ]
        }
      ],
      metrics: {
        period: period,
        totalLeads: 295,
        totalSales: 72,
        avgSaleAmount: 634.29,
        topLeadSource: 'Website',
        leadSources: [
          { source: 'Website', count: 125, percentage: 42.4 },
          { source: 'Referral', count: 89, percentage: 30.2 },
          { source: 'Social Media', count: 45, percentage: 15.3 },
          { source: 'Other', count: 36, percentage: 12.1 }
        ]
      }
    };
    } else {
      // Return real (empty) data for production accounts
      performanceData = {
        summary: {
          totalAgents: 0,
          activeAgents: 0,
          topPerformer: 'No agents yet',
          avgConversionRate: 0.0,
          totalSales: 0,
          totalCommissions: 0.00
        },
        agents: [],
        metrics: {
          period: period,
          totalLeads: 0,
          totalSales: 0,
          avgSaleAmount: 0.00,
          topLeadSource: 'No data',
          leadSources: []
        }
      };
    }

    // If specific agent requested, filter data
    if (agent_id) {
      const agent = performanceData.agents.find(a => a.id === agent_id);
      if (agent) {
        performanceData.agents = [agent];
      } else {
        return res.status(404).json({ error: 'Agent not found' });
      }
    }

    res.status(200).json({
      success: true,
      data: performanceData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Agent performance error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch agent performance data'
    });
  }
}