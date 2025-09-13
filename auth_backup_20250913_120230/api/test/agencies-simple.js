// Simple agencies endpoint for testing
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get authorization header
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    
    console.log('Simple Agencies - Token check:', token ? 'Present' : 'Missing');
    
    // Simple JWT check
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64'));
      console.log('Simple Agencies - Role:', payload.role);
      
      if (payload.role !== 'super_admin') {
        return res.status(403).json({ 
          error: 'Super admin required',
          received_role: payload.role 
        });
      }
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Return simple test data for now (real Supabase data will be added once JWT works)
    const testAgencies = [
      {
        id: 'agency-001',
        name: 'PHS Insurance Agency',
        subscription_plan: 'professional',
        contact_email: 'admin@phsagency.com',
        is_active: true,
        created_at: new Date().toISOString(),
        metrics: {
          total_users: 5,
          total_revenue: 299.00
        }
      },
      {
        id: 'agency-002', 
        name: 'Demo Insurance Group',
        subscription_plan: 'starter',
        contact_email: 'demo@demo.com',
        is_active: true,
        created_at: new Date().toISOString(),
        metrics: {
          total_users: 2,
          total_revenue: 99.00
        }
      }
    ];

    console.log('Simple Agencies - Returning test data:', testAgencies.length, 'agencies');

    return res.status(200).json({
      success: true,
      agencies: testAgencies,
      total: testAgencies.length,
      source: 'test_data'
    });

  } catch (error) {
    console.error('Simple Agencies - Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}