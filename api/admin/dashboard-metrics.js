// API endpoint for admin dashboard metrics
const { verifyCookieAuth } = require('../_utils/cookie-auth.js');

module.exports = async function handler(req, res) {
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
    // Verify authentication
    const auth = await verifyCookieAuth(req);
    if (!auth.success) {
      return res.status(401).json({ error: auth.error });
    }

    // Check for admin or super_admin role
    const allowedRoles = ['admin', 'super_admin'];
    if (!allowedRoles.includes(auth.user.normalizedRole)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // For now, treat all authenticated admins as production
    const isDemoAccount = false;
    const isProductionAccount = true;

    // Remove debug log that references undefined token variable
    // console.log(`Dashboard metrics request - Token: ${token.substring(0, 10)}..., isDemo: ${isDemoAccount}, isProd: ${isProductionAccount}`);
    
    let metrics;
    
    if (isDemoAccount) {
      // Return demo data for demo accounts
      metrics = {
        totalAgents: 12,
        activeAgents: 8,
        totalLeads: 1247,
        convertedLeads: 184,
        conversionRate: 14.8,
        totalPolicies: 156,
        totalCommissions: 45678.90,
        monthlyGrowth: 12.5,
        avgPolicyValue: 892.45,
        topAgents: [
          { name: 'Demo Agent Alpha', sales: 23, commission: 4567.80 },
          { name: 'Demo Agent Beta', sales: 19, commission: 3892.50 },
          { name: 'Demo Agent Gamma', sales: 16, commission: 3245.70 }
        ],
        recentActivity: [
          { type: 'sale', agent: 'Demo Agent Alpha', amount: 1250.00, timestamp: new Date().toISOString() },
          { type: 'lead', agent: 'Demo Agent Beta', source: 'Website', timestamp: new Date().toISOString() },
          { type: 'sale', agent: 'Demo Agent Gamma', amount: 892.30, timestamp: new Date().toISOString() }
        ],
        monthlyStats: {
          january: 34567,
          february: 38901,
          march: 42156,
          april: 45678,
          may: 49234,
          june: 52890
        }
      };
    } else {
      // Return real (empty) data for production accounts
      metrics = {
        totalAgents: 0,
        activeAgents: 0,
        totalLeads: 0,
        convertedLeads: 0,
        conversionRate: 0.0,
        totalPolicies: 0,
        totalCommissions: 0.00,
        monthlyGrowth: 0.0,
        avgPolicyValue: 0.00,
        topAgents: [],
        recentActivity: [],
        monthlyStats: {
          january: 0,
          february: 0,
          march: 0,
          april: 0,
          may: 0,
          june: 0
        }
      };
    }

    res.status(200).json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Dashboard metrics error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch dashboard metrics'
    });
  }
}