import ConvosoDiscovery from '../services/convoso-discovery';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
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

  // Sanitize agency name
  const sanitizedAgencyName = agency_name.trim();
  if (sanitizedAgencyName.length < 2 || sanitizedAgencyName.length > 100) {
    return res.status(400).json({ 
      error: 'Agency name must be between 2 and 100 characters' 
    });
  }
  
  try {
    // Step 1: Check if agency already exists
    const { data: existingAgency } = await supabase
      .from('agencies')
      .select('id')
      .eq('name', sanitizedAgencyName)
      .single();
    
    if (existingAgency) {
      return res.status(400).json({ 
        error: 'Agency name already exists' 
      });
    }
    
    // Step 2: Validate token and discover setup
    console.log(`Starting discovery for agency: ${sanitizedAgencyName}`);
    const discovery = new ConvosoDiscovery(convoso_token);
    
    // First validate the token
    const isValidToken = await discovery.validateToken();
    if (!isValidToken) {
      return res.status(400).json({ 
        error: 'Invalid Convoso token - unable to authenticate with Convoso API' 
      });
    }
    
    // Discover agency setup
    const setup = await discovery.discoverAgencySetup();
    
    if (!setup.success) {
      return res.status(400).json({ 
        error: 'Failed to discover agency setup from Convoso',
        details: setup.error 
      });
    }

    // Validate that we got meaningful data
    if (!setup.campaigns || setup.campaigns.length === 0) {
      console.warn('No campaigns found for agency');
    }
    if (!setup.lists || setup.lists.length === 0) {
      return res.status(400).json({ 
        error: 'No active lists found in Convoso account - please create at least one list' 
      });
    }
    
    // Step 3: Generate secure webhook URL
    const webhookSlug = sanitizedAgencyName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const webhookUrl = `${process.env.NEXT_PUBLIC_URL || process.env.VERCEL_URL || 'http://localhost:3000'}/api/convoso-webhook/${webhookSlug}`;
    
    // Step 4: Store agency with all discovered configuration
    console.log('Storing agency configuration in database');
    const { data: agency, error: insertError } = await supabase
      .from('agencies')
      .insert({
        name: sanitizedAgencyName,
        convoso_auth_token: convoso_token,
        campaigns: setup.campaigns,
        lists: setup.lists,
        queues: setup.queues,
        field_mappings: setup.fieldMappings,
        webhook_url: webhookUrl,
        last_sync: new Date().toISOString()
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error(`Database error: ${insertError.message}`);
    }
    
    // Step 5: Log successful onboarding
    console.log(`Successfully onboarded agency: ${sanitizedAgencyName} (ID: ${agency.id})`);
    
    // Step 6: Return comprehensive onboarding info
    return res.status(200).json({
      success: true,
      agency: {
        id: agency.id,
        name: agency.name,
        webhook_url: webhookUrl
      },
      discovered: {
        campaigns: setup.campaigns.length,
        lists: setup.lists.length,
        queues: setup.queues.length,
        campaign_details: setup.campaigns.map(c => ({ id: c.id, name: c.name })),
        list_details: setup.lists.map(l => ({ id: l.id, name: l.name, status: l.status }))
      },
      instructions: {
        convoso_connect: `Add this webhook URL to Convoso Connect: ${webhookUrl}`,
        test_command: `curl -X POST "${webhookUrl}" -H 'Content-Type: application/json' -d '{"test": true}'`,
        next_steps: [
          "1. Configure webhook URL in Convoso Connect",
          "2. Test the webhook endpoint using the provided curl command",
          "3. Start sending leads using the smart-lead-insert API"
        ]
      }
    });
    
  } catch (error) {
    console.error('Onboarding error:', error);
    
    // Return appropriate error based on error type
    if (error.message.includes('Database error')) {
      return res.status(500).json({ 
        error: 'Database operation failed',
        details: error.message 
      });
    }
    
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