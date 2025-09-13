// API endpoint for leaderboard rankings
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
    const { period = 'month', agency, limit = '50' } = req.query;
    const maxResults = Math.min(parseInt(limit), 100);
    
    // Get authorization header to determine account type
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    
    // Determine if this is a demo or production account
    const isDemoAccount = token.startsWith('demo-') || token === 'demo';
    
    console.log(`Leaderboard rankings request - Token: ${token.substring(0, 10)}..., isDemo: ${isDemoAccount}`);

    let rankingsData;
    
    if (isDemoAccount) {
      // Return demo data for demo accounts
      rankingsData = {
      metadata: {
        period: period,
        agency: agency || 'all',
        lastUpdated: new Date().toISOString(),
        totalAgents: 47,
        activeAgents: 35
      },
      rankings: [
        {
          rank: 1,
          agentId: 'agent_001',
          name: 'John Smith',
          agency: 'PHS Insurance Agency',
          email: 'john.smith@phsagency.com',
          sales: 23,
          leads: 89,
          conversionRate: 25.8,
          commission: 4567.80,
          points: 2580,
          badges: ['Top Performer', 'Rising Star', 'Customer Favorite'],
          streak: 3,
          lastSale: new Date().toISOString(),
          avatar: '/images/agents/john-smith.jpg'
        },
        {
          rank: 2,
          agentId: 'agent_002',
          name: 'Sarah Johnson',
          agency: 'PHS Insurance Agency',
          email: 'sarah.johnson@phsagency.com',
          sales: 19,
          leads: 76,
          conversionRate: 25.0,
          commission: 3892.50,
          points: 2500,
          badges: ['Consistent Performer', 'Team Player'],
          streak: 2,
          lastSale: new Date().toISOString(),
          avatar: '/images/agents/sarah-johnson.jpg'
        },
        {
          rank: 3,
          agentId: 'agent_003',
          name: 'Mike Davis',
          agency: 'PHS Insurance Agency',
          email: 'mike.davis@phsagency.com',
          sales: 16,
          leads: 68,
          conversionRate: 23.5,
          commission: 3245.70,
          points: 2350,
          badges: ['Steady Growth'],
          streak: 1,
          lastSale: new Date().toISOString(),
          avatar: '/images/agents/mike-davis.jpg'
        },
        {
          rank: 4,
          agentId: 'agent_004',
          name: 'Lisa Chen',
          agency: 'PHS Insurance Agency',
          email: 'lisa.chen@phsagency.com',
          sales: 14,
          leads: 62,
          conversionRate: 22.6,
          commission: 2890.40,
          points: 2260,
          badges: ['New Talent'],
          streak: 1,
          lastSale: new Date().toISOString(),
          avatar: '/images/agents/lisa-chen.jpg'
        },
        {
          rank: 5,
          agentId: 'agent_005',
          name: 'Robert Wilson',
          agency: 'Demo Agency',
          email: 'robert.wilson@demo.com',
          sales: 12,
          leads: 58,
          conversionRate: 20.7,
          commission: 2456.30,
          points: 2070,
          badges: ['Improving'],
          streak: 0,
          lastSale: new Date().toISOString(),
          avatar: '/images/agents/robert-wilson.jpg'
        },
        {
          rank: 6,
          agentId: 'agent_006',
          name: 'Emily Brown',
          agency: 'Demo Agency',
          email: 'emily.brown@demo.com',
          sales: 11,
          leads: 54,
          conversionRate: 20.4,
          commission: 2234.50,
          points: 2040,
          badges: ['Team Support'],
          streak: 0,
          lastSale: new Date().toISOString(),
          avatar: '/images/agents/emily-brown.jpg'
        }
      ],
      summary: {
        totalSales: 95,
        totalLeads: 407,
        avgConversionRate: 23.3,
        totalCommissions: 19286.20,
        topAgency: 'PHS Insurance Agency',
        agencies: [
          { name: 'PHS Insurance Agency', agents: 4, totalSales: 72, totalCommission: 14596.40 },
          { name: 'Demo Agency', agents: 2, totalSales: 23, totalCommission: 4689.80 }
        ]
      },
      achievements: [
        { type: 'milestone', agent: 'John Smith', description: 'Reached 20+ sales this month', date: new Date().toISOString() },
        { type: 'badge', agent: 'Sarah Johnson', description: 'Earned Customer Favorite badge', date: new Date().toISOString() },
        { type: 'streak', agent: 'Mike Davis', description: 'Started a new sales streak', date: new Date().toISOString() }
      ]
    };
    } else {
      // Return real (empty) data for production accounts  
      rankingsData = {
        metadata: {
          period: period,
          agency: agency || 'all',
          lastUpdated: new Date().toISOString(),
          totalAgents: 0,
          activeAgents: 0
        },
        rankings: [],
        summary: {
          totalSales: 0,
          totalLeads: 0,
          avgConversionRate: 0.0,
          totalCommissions: 0.00,
          topAgency: 'No agencies yet',
          agencies: []
        },
        achievements: []
      };
    }

    // Filter by agency if specified
    if (agency && agency !== 'all') {
      rankingsData.rankings = rankingsData.rankings.filter(agent => 
        agent.agency.toLowerCase().includes(agency.toLowerCase())
      );
      rankingsData.metadata.agency = agency;
    }

    // Limit results
    rankingsData.rankings = rankingsData.rankings.slice(0, maxResults);

    res.status(200).json({
      success: true,
      data: rankingsData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Leaderboard rankings error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch leaderboard rankings'
    });
  }
}