import { createClient } from '@supabase/supabase-js';

// Helper to extract custom fields
function extractCustomFields(data) {
  const customFields = {};
  Object.keys(data).forEach(key => {
    if (key.startsWith('field_')) {
      customFields[key] = data[key];
    }
  });
  return customFields;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  // Accept leads from PHS Dialer campaign
  const campaignId = req.body.campaign_id || req.body.campaignId;
  const campaignUid = req.body.campaign_uid || req.body.campaignUid;
  const campaignName = req.body.campaign_name || req.body.campaignName;

  // Accept if it's the PHS Dialer by ID, UID, or name
  const isValidCampaign =
    campaignId === '4123' || campaignId === 4123 ||
    campaignUid === 'pi6tmzdo4w6zimzxtghwxecspm7mx2wd' ||
    campaignName === 'PHS Dialer';

  if (!isValidCampaign) {
    return res.status(403).json({
      error: 'Unauthorized campaign',
      received: { campaignId, campaignUid, campaignName },
      message: 'Only PHS Dialer campaign is authorized'
    });
  }
  
  const lead = {
    agency_id: 'PHS001',
    campaign_id: campaignId || '4123',
    campaign_uid: campaignUid,
    campaign_name: campaignName || 'PHS Dialer',
    lead_id: req.body.lead_id || req.body.leadId || req.body.id,
    external_id: req.body.external_id || req.body.externalId,
    phone_number: req.body.phone_number || req.body.phoneNumber || req.body.phone,
    first_name: req.body.first_name || req.body.firstName,
    last_name: req.body.last_name || req.body.lastName,
    email: req.body.email,
    address1: req.body.address1 || req.body.address,
    address2: req.body.address2,
    city: req.body.city,
    state: req.body.state,
    zip_code: req.body.postal_code || req.body.zip_code || req.body.zip,
    date_of_birth: req.body.date_of_birth,
    gender: req.body.gender,
    status: req.body.status || 'new',
    source: 'Convoso',
    received_at: new Date().toISOString(),
    call_attempts: parseInt(req.body.called_count) || 0,
    priority: req.body.priority || 'high',
    // Store all custom fields
    custom_fields: extractCustomFields(req.body)
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