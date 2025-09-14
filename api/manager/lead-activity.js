import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { range = 'today', limit = 20 } = req.query;

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

    const { data: activity, error } = await supabase
      .from('convoso_leads')
      .select('convoso_lead_id, status, last_disposition, updated_at, created_at')
      .gte('updated_at', startDate.toISOString())
      .order('updated_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      throw error;
    }

    // Add activity type to each record
    const enrichedActivity = activity?.map(item => ({
      ...item,
      activity_type: item.created_at === item.updated_at ? 'created' : 'updated'
    })) || [];

    return res.status(200).json({
      success: true,
      activity: enrichedActivity,
      count: enrichedActivity.length
    });

  } catch (error) {
    console.error('Lead activity error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch lead activity',
      details: error.message 
    });
  }
}