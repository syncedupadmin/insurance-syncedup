import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { agency_id, limit = 50 } = req.query;

  try {
    let query = supabase
      .from('convoso_leads')
      .select(`
        *,
        agencies(name)
      `)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (agency_id) {
      query = query.eq('agency_id', agency_id);
    }

    const { data: leads, error } = await query;

    if (error) {
      throw error;
    }

    // Enrich leads with sample data for quote system
    const enrichedLeads = leads?.map(lead => ({
      ...lead,
      // Extract lead data from potential sources
      first_name: lead.first_name || extractFromId(lead.convoso_lead_id, 'first'),
      last_name: lead.last_name || extractFromId(lead.convoso_lead_id, 'last'),
      phone_number: lead.phone_number || generateSamplePhone(),
      date_of_birth: lead.date_of_birth || generateSampleDOB(),
      postal_code: lead.postal_code || '90210',
      email: lead.email || `${lead.convoso_lead_id}@example.com`,
      // Convoso-specific fields
      disposition_color: getDispositionColor(lead.last_disposition)
    })) || [];

    return res.status(200).json({
      success: true,
      leads: enrichedLeads,
      count: enrichedLeads.length
    });

  } catch (error) {
    console.error('Convoso leads fetch error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch Convoso leads',
      details: error.message 
    });
  }
}

function extractFromId(leadId, type) {
  // Generate sample names based on lead ID for demo purposes
  const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Lisa', 'Chris', 'Maria'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
  
  const hash = leadId ? parseInt(leadId.toString().slice(-2)) : 0;
  
  if (type === 'first') {
    return firstNames[hash % firstNames.length];
  } else {
    return lastNames[hash % lastNames.length];
  }
}

function generateSamplePhone() {
  return `818${Math.floor(1000000 + Math.random() * 9000000)}`;
}

function generateSampleDOB() {
  const year = 1970 + Math.floor(Math.random() * 40);
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDispositionColor(disposition) {
  switch (disposition?.toLowerCase()) {
    case 'sale':
    case 'interested':
      return { background: '#f0fff4', color: '#2f855a', border: '#9ae6b4' };
    case 'callback':
    case 'follow up':
      return { background: '#fffbeb', color: '#c05621', border: '#fbd38d' };
    case 'not interested':
    case 'dnc':
      return { background: '#fed7d7', color: '#c53030', border: '#feb2b2' };
    default:
      return { background: '#f7fafc', color: '#4a5568', border: '#e2e8f0' };
  }
}