import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { range = 'today', limit = 10 } = req.query;

  try {
    // Calculate date range
    const now = new Date();
    let startDate;

    switch (range) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    const { data: calls, error } = await supabase
      .from('convoso_calls')
      .select('*')
      .gte('call_time', startDate.toISOString())
      .order('call_time', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      throw error;
    }

    return res.status(200).json({
      success: true,
      calls: calls || [],
      count: calls?.length || 0
    });

  } catch (error) {
    console.error('Recent calls error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch recent calls',
      details: error.message 
    });
  }
}