import { ConvosoService } from '../services/convoso-discovery.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { agency_name, convoso_token } = req.body;
  
  // Validate inputs
  if (!agency_name || !convoso_token) {
    return res.status(400).json({ 
      error: 'Missing required fields: agency_name and convoso_token' 
    });
  }

  try {
    console.log(`Starting onboarding for agency: ${agency_name}`);
    
    // Check if agency already exists
    const { data: existingAgency } = await supabase
      .from('agencies')
      .select('id')
      .eq('name', agency_name)
      .single();
    
    if (existingAgency) {
      return res.status(400).json({ 
        error: 'Agency name already exists' 
      });
    }

    // Initialize Convoso service and test token
    const convoso = new ConvosoService(convoso_token);
    
    // Test token and get data
    console.log('Testing Convoso token and fetching data...');
    const campaigns = await convoso.getCampaigns();
    const lists = await convoso.getLists();
    
    if (!campaigns.success) {
      console.error('Token validation failed:', campaigns.error);
      return res.status(400).json({ 
        error: 'Invalid Convoso token or API connection failed',
        details: campaigns.error 
      });
    }
    
    if (!lists.success) {
      console.error('Lists fetch failed:', lists.error);
      return res.status(400).json({ 
        error: 'Failed to fetch lists from Convoso',
        details: lists.error 
      });
    }

    // Validate that we got meaningful data
    if (!lists.data || lists.data.length === 0) {
      return res.status(400).json({ 
        error: 'No active lists found in Convoso account - please create at least one list' 
      });
    }
    
    // Generate webhook URL
    const webhookSlug = agency_name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const webhookUrl = `${process.env.NEXT_PUBLIC_URL || process.env.VERCEL_URL || 'http://localhost:3000'}/api/convoso-webhook/${webhookSlug}`;
    
    // Store in database
    console.log('Storing agency configuration in database...');
    const { data: agency, error: insertError } = await supabase
      .from('agencies')
      .insert({
        name: agency_name,
        convoso_auth_token: convoso_token,
        campaigns: campaigns.data || [],
        lists: lists.data || [],
        queues: [], // Will be populated later
        field_mappings: {
          phone_number: 'phone',
          first_name: 'firstName',
          last_name: 'lastName',
          email: 'email',
          currently_insured: 'currentlyInsured',
          household_income: 'householdIncome'
        },
        webhook_url: webhookUrl,
        is_active: true,
        last_sync: new Date().toISOString()
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error(`Database error: ${insertError.message}`);
    }
    
    console.log(`Successfully onboarded agency: ${agency_name} (ID: ${agency.id})`);
    
    return res.json({
      success: true,
      agency_id: agency.id,
      agency_name: agency.name,
      campaigns_found: campaigns.data?.length || 0,
      lists_found: lists.data?.length || 0,
      webhook_url: webhookUrl,
      campaigns: campaigns.data?.map(c => ({ id: c.id, name: c.name })) || [],
      lists: lists.data?.map(l => ({ id: l.id, name: l.name, status: l.status })) || []
    });
    
  } catch (error) {
    console.error('Onboarding error:', error);
    
    if (error.message.includes('fetch')) {
      return res.status(502).json({ 
        error: 'Unable to connect to Convoso API - please try again',
        details: 'Network connectivity issue' 
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to onboard agency',
      details: error.message 
    });
  }
}