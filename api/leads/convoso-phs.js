import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  // ONLY accept leads from PHS Dialer campaign (ID: 4123)
  const campaignId = req.body.campaign_id || req.body.campaignId;
  if (campaignId !== '4123' && campaignId !== 4123) {
    return res.status(403).json({ 
      error: 'Unauthorized campaign', 
      received: campaignId,
      message: 'Only PHS Dialer campaign (4123) is authorized' 
    });
  }
  
  const lead = {
    agency_id: 'PHS001',
    campaign_id: '4123',
    campaign_name: 'PHS Dialer',
    lead_id: req.body.lead_id || req.body.leadId,
    external_id: req.body.external_id || req.body.externalId,
    phone_number: req.body.phone_number || req.body.phoneNumber || req.body.phone,
    first_name: req.body.first_name || req.body.firstName,
    last_name: req.body.last_name || req.body.lastName,
    email: req.body.email,
    status: 'new',
    source: 'Convoso',
    received_at: new Date().toISOString(),
    call_attempts: 0,
    priority: 'high'
  };
  
  const { data, error } = await supabase
    .from('convoso_leads')
    .insert(lead)
    .select();
  
  if (error) {
    console.error('Convoso webhook error:', error);
    return res.status(500).json({ error: 'Failed to store lead' });
  }
  
  // Log webhook activity
  await supabase.from('webhook_logs').insert({
    type: 'convoso_lead',
    agency_id: 'PHS001',
    payload: req.body,
    success: true
  });
  
  return res.status(200).json({ 
    success: true, 
    lead_id: data[0].id,
    message: 'PHS Dialer lead received' 
  });
}