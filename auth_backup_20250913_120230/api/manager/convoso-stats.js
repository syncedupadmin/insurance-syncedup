import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { range = 'today' } = req.query;

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

    // Get total leads count
    const { count: totalLeads } = await supabase
      .from('convoso_leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());

    // Get completed calls count and avg duration
    const { data: callsData } = await supabase
      .from('convoso_calls')
      .select('duration, agent_id')
      .gte('call_time', startDate.toISOString())
      .not('disposition', 'is', null);

    const completedCalls = callsData?.length || 0;
    const avgCallDuration = callsData?.length > 0 
      ? Math.round(callsData.reduce((sum, call) => sum + (call.duration || 0), 0) / callsData.length)
      : 0;

    // Get unique active agents
    const uniqueAgents = callsData 
      ? [...new Set(callsData.map(call => call.agent_id).filter(id => id))]
      : [];
    const activeAgents = uniqueAgents.length;

    const stats = {
      totalLeads: totalLeads || 0,
      completedCalls,
      activeAgents,
      avgCallDuration
    };

    return res.status(200).json({
      success: true,
      stats,
      range,
      period: {
        start: startDate.toISOString(),
        end: now.toISOString()
      }
    });

  } catch (error) {
    console.error('Convoso stats error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch stats',
      details: error.message 
    });
  }
}