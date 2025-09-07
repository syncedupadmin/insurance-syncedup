import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data: agencies, error } = await supabase
      .from('agencies')
      .select('id, name, is_active, campaigns, lists, queues, webhook_url, last_sync, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch agencies',
        details: error.message 
      });
    }

    return res.status(200).json({
      success: true,
      agencies: agencies || []
    });
    
  } catch (error) {
    console.error('List agencies error:', error);
    return res.status(500).json({ 
      error: 'Server error',
      details: error.message 
    });
  }
}