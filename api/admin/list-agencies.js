import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data: agencies, error } = await supabase
      .from('agency_integrations')
      .select('id, agency_name as name, is_active, integration_settings, webhook_url, last_validation_at as last_sync, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch agencies',
        details: error.message 
      });
    }

    // Transform the data to match expected format
    const transformedAgencies = (agencies || []).map(agency => ({
      ...agency,
      campaigns: agency.integration_settings?.campaigns || [],
      lists: agency.integration_settings?.lists || [],
      queues: agency.integration_settings?.queues || []
    }));

    return res.status(200).json({
      success: true,
      agencies: transformedAgencies
    });
    
  } catch (error) {
    console.error('List agencies error:', error);
    return res.status(500).json({ 
      error: 'Server error',
      details: error.message 
    });
  }
}