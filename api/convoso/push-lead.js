import { ConvosoService } from '../services/convoso-discovery.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { agency_id, lead_data } = req.body;
  
  // Validate required fields
  if (!agency_id || !lead_data || !lead_data.phone_number) {
    return res.status(400).json({ 
      error: 'Missing required fields: agency_id and lead_data.phone_number' 
    });
  }

  try {
    // Get agency configuration
    const { data: agency, error: fetchError } = await supabase
      .from('agencies')
      .select('*')
      .eq('id', agency_id)
      .eq('is_active', true)
      .single();
    
    if (fetchError || !agency) {
      console.error('Agency fetch error:', fetchError);
      return res.status(404).json({ 
        error: 'Agency not found or inactive' 
      });
    }
    
    // Initialize Convoso service
    const convoso = new ConvosoService(agency.convoso_auth_token);
    
    // Find appropriate list - prioritize DATA lists, then any active list
    const list = agency.lists.find(l => 
      l.name && l.name.toUpperCase().includes('DATA') && l.status === 'Active'
    ) || agency.lists.find(l => l.status === 'Active') || agency.lists[0];
    
    if (!list) {
      return res.status(400).json({ 
        error: 'No suitable list found for this agency',
        available_lists: agency.lists.map(l => ({ id: l.id, name: l.name, status: l.status }))
      });
    }
    
    // Clean phone number
    const cleanPhone = lead_data.phone_number.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return res.status(400).json({ 
        error: 'Invalid phone number - must be at least 10 digits' 
      });
    }

    // Prepare lead data for Convoso
    const convosoLeadData = {
      list_id: list.id,
      phone_number: cleanPhone,
      first_name: lead_data.first_name || '',
      last_name: lead_data.last_name || '',
      email: lead_data.email || '',
      address: lead_data.address || '',
      city: lead_data.city || '',
      state: lead_data.state || '',
      zip: lead_data.zip || '',
      currently_insured: lead_data.currently_insured || '',
      household_income: lead_data.household_income || '',
      pre_existing: lead_data.pre_existing || ''
    };

    console.log(`Pushing lead to Convoso for agency ${agency.name}, list ${list.id}, phone ${cleanPhone}`);
    
    // Send to Convoso
    const result = await convoso.insertLead(convosoLeadData);
    
    if (result.success) {
      // Track in database
      const { error: trackingError } = await supabase.from('convoso_leads').insert({
        agency_id,
        internal_lead_id: lead_data.id || null,
        convoso_lead_id: result.data.lead_id.toString(),
        list_id: list.id,
        campaign_id: list.campaign_id || null,
        status: 'NEW',
        created_at: new Date().toISOString()
      });
      
      if (trackingError) {
        console.error('Tracking error (non-fatal):', trackingError);
      }
      
      // Update agency last_sync
      await supabase
        .from('agencies')
        .update({ last_sync: new Date().toISOString() })
        .eq('id', agency_id);
      
      return res.status(200).json({
        success: true,
        convoso_lead_id: result.data.lead_id,
        list_id: list.id,
        list_name: list.name,
        message: result.message || 'Lead pushed to Convoso successfully'
      });
    } else {
      // Handle Convoso-specific errors
      if (result.message && result.message.includes('duplicate')) {
        return res.status(409).json({ 
          error: 'Duplicate lead - lead already exists in Convoso',
          details: result.message 
        });
      }
      
      throw new Error(result.message || 'Convoso API error');
    }
    
  } catch (error) {
    console.error('Lead push error:', error);
    
    if (error.message.includes('fetch')) {
      return res.status(502).json({ 
        error: 'Unable to connect to Convoso API',
        details: 'Network connectivity issue' 
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to push lead to Convoso',
      details: error.message 
    });
  }
}