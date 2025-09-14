import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { slug } = req.query;
  
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Handle test requests
  if (req.body.test === true) {
    return res.status(200).json({ 
      success: true, 
      message: 'Webhook endpoint is working',
      agency_slug: slug,
      timestamp: new Date().toISOString()
    });
  }
  
  try {
    // Find agency by webhook slug
    const webhookUrl = `${req.headers.host}/api/convoso-webhook/${slug}`;
    const { data: agency, error: agencyError } = await supabase
      .from('agencies')
      .select('*')
      .ilike('webhook_url', `%${slug}%`)
      .eq('is_active', true)
      .single();
    
    if (agencyError || !agency) {
      console.error('Agency lookup failed:', { slug, error: agencyError });
      return res.status(404).json({ 
        error: 'Agency not found for this webhook endpoint' 
      });
    }
    
    console.log(`Webhook received for agency: ${agency.name}`);
    
    // Process different webhook event types from Convoso
    const eventType = req.body.event_type || detectWebhookType(req.body);
    
    switch (eventType) {
      case 'call_completed':
      case 'call_disposition':
        await handleCallCompleted(agency, req.body);
        break;
      case 'lead_updated':
      case 'lead_update':
        await handleLeadUpdated(agency, req.body);
        break;
      case 'agent_status':
        await handleAgentStatus(agency, req.body);
        break;
      case 'campaign_status':
        await handleCampaignStatus(agency, req.body);
        break;
      case 'list_status':
        await handleListStatus(agency, req.body);
        break;
      default:
        console.log('Unhandled event type:', eventType, req.body);
        await logUnknownEvent(agency, req.body);
    }
    
    return res.status(200).json({ 
      success: true,
      message: `Webhook processed for ${agency.name}`,
      event_type: eventType
    });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ 
      error: 'Webhook processing failed',
      details: error.message 
    });
  }
}

function detectWebhookType(data) {
  if (data.call_id || data.disposition || data.duration) {
    return 'call_disposition';
  }
  if (data.lead_id && (data.status || data.list_id)) {
    return 'lead_update';
  }
  if (data.agent_id && (data.agent_status || data.queue_name)) {
    return 'agent_status';
  }
  return 'unknown';
}

async function handleCallCompleted(agency, data) {
  try {
    const callData = {
      agency_id: agency.id,
      convoso_lead_id: data.lead_id?.toString(),
      call_id: data.call_id?.toString(),
      duration: parseInt(data.duration) || 0,
      disposition: data.disposition,
      recording_url: data.recording_url,
      agent_id: data.agent_id?.toString(),
      agent_name: data.agent_name,
      call_time: data.call_time ? new Date(data.call_time) : new Date()
    };
    
    const { error } = await supabase
      .from('convoso_calls')
      .insert(callData);
    
    if (error) {
      console.error('Failed to store call data:', error);
    } else {
      console.log('Call disposition stored successfully');
    }
    
    // Update lead status if we have the lead_id
    if (data.lead_id) {
      await supabase
        .from('convoso_leads')
        .update({ 
          last_disposition: data.disposition,
          updated_at: new Date().toISOString()
        })
        .eq('agency_id', agency.id)
        .eq('convoso_lead_id', data.lead_id.toString());
    }
    
  } catch (error) {
    console.error('Call disposition handling error:', error);
    throw error;
  }
}

async function handleLeadUpdated(agency, data) {
  try {
    const { error } = await supabase
      .from('convoso_leads')
      .update({
        status: data.status,
        last_disposition: data.disposition,
        updated_at: new Date().toISOString()
      })
      .eq('agency_id', agency.id)
      .eq('convoso_lead_id', data.lead_id.toString());
    
    if (error) {
      console.error('Failed to update lead:', error);
    } else {
      console.log('Lead status updated successfully');
    }
    
  } catch (error) {
    console.error('Lead update handling error:', error);
    throw error;
  }
}

async function handleAgentStatus(agency, data) {
  // This could be extended to track agent availability, queue assignments, etc.
  console.log('Agent status update received:', {
    agency: agency.name,
    agent_id: data.agent_id,
    agent_name: data.agent_name,
    status: data.agent_status,
    queue: data.queue_name
  });
  
  // For now, just log it. In the future, you could store agent status in a separate table.
}

async function handleCampaignStatus(agency, data) {
  console.log('Campaign status update received:', {
    agency: agency.name,
    campaign_id: data.campaign_id,
    campaign_name: data.campaign_name,
    status: data.status,
    active_agents: data.active_agents
  });
}

async function handleListStatus(agency, data) {
  console.log('List status update received:', {
    agency: agency.name,
    list_id: data.list_id,
    list_name: data.list_name,
    status: data.status,
    total_leads: data.total_leads
  });
}

async function logUnknownEvent(agency, data) {
  console.log('Unknown webhook event received:', {
    agency: agency.name,
    timestamp: new Date().toISOString(),
    data: data
  });
  
  // You could store unknown events in a separate table for analysis
}