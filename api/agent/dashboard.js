import { requireAuth } from '../_middleware/authCheck.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // This will automatically use RLS policies based on the user context set in middleware
    const { data: dashboardData, error } = await supabase
      .from('agent_dashboard')
      .select('*')
      .single();

    if (error) {
      console.error('Dashboard query error:', error);
      return res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }

    // Also get sales data (this will be filtered by RLS)
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (salesError) {
      console.error('Sales query error:', salesError);
    }

    res.status(200).json({
      success: true,
      dashboard: dashboardData,
      recentSales: sales || [],
      user: req.user
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Apply authentication middleware
export default requireAuth()(handler);