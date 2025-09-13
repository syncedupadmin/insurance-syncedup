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
  if (!agency_id || !lead_data || !lead_data.phone) {
    return res.status(400).json({ 
      error: 'Missing required fields: agency_id and lead_data.phone' 
    });
  }

  // Validate UUID format for agency_id
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(agency_id)) {
    return res.status(400).json({ 
      error: 'Invalid agency_id format - must be a valid UUID' 
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
    
    // Select appropriate list intelligently
    const list_id = selectBestList(lead_data, agency.lists);
    
    if (!list_id) {
      console.error('No suitable list found', { lists: agency.lists, lead_data });
      return res.status(400).json({ 
        error: 'No suitable list found for this lead type',
        available_lists: agency.lists.map(l => ({ id: l.id, name: l.name }))
      });
    }
    
    // Clean and validate phone number
    const cleanPhone = lead_data.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      return res.status(400).json({ 
        error: 'Invalid phone number - must be 10 or 11 digits' 
      });
    }
    
    // Build Convoso payload with all available fields
    const convoso_payload = {
      auth_token: agency.convoso_auth_token,
      list_id: list_id,
      
      // Required fields
      phone_number: cleanPhone,
      
      // Core optional fields
      ...(lead_data.first_name && { first_name: sanitizeString(lead_data.first_name) }),
      ...(lead_data.last_name && { last_name: sanitizeString(lead_data.last_name) }),
      ...(lead_data.email && isValidEmail(lead_data.email) && { email: lead_data.email }),
      ...(lead_data.dob && { date_of_birth: lead_data.dob }),
      
      // Address fields
      ...(lead_data.address && { address1: sanitizeString(lead_data.address) }),
      ...(lead_data.city && { city: sanitizeString(lead_data.city) }),
      ...(lead_data.state && { state: sanitizeString(lead_data.state) }),
      ...(lead_data.zip && { postal_code: lead_data.zip.toString() }),
      
      // Insurance-specific fields
      ...(lead_data.currently_insured && { currently_insured: lead_data.currently_insured }),
      ...(lead_data.household_income && { household_income: parseInt(lead_data.household_income) || 0 }),
      ...(lead_data.pre_existing && { pre_existing: lead_data.pre_existing }),
      ...(lead_data.current_meds && { current_meds: sanitizeString(lead_data.current_meds) }),
      ...(lead_data.price_range && { price_range: parseInt(lead_data.price_range) || 0 }),
      
      // Additional insurance fields
      ...(lead_data.planType && { individual_or_family_plan_1: lead_data.planType }),
      ...(lead_data.planStartDate && { plan_start_date: lead_data.planStartDate }),
      ...(lead_data.urgencyDate && { urgency_date: lead_data.urgencyDate }),
      ...(lead_data.currentCarrier && { with_what_company: sanitizeString(lead_data.currentCarrier) }),
      ...(lead_data.currentSpend && { what_are_you_spending_with_that_carrier: parseInt(lead_data.currentSpend) || 0 }),
      ...(lead_data.shoppingReason && { shopping_around: sanitizeString(lead_data.shoppingReason) }),
      ...(lead_data.medicaidEligible !== undefined && { eligible_for_medicaid: lead_data.medicaidEligible }),
      
      // Control options
      hopper: true,
      hopper_priority: lead_data.priority || 99,
      check_dup: 2, // Check duplicates in list
      update_if_found: true
    };
    
    console.log(`Inserting lead for agency ${agency.name}, list ${list_id}, phone ${cleanPhone}`);
    
    // Send to Convoso with timeout and retry logic
    const result = await sendToConvosoWithRetry(convoso_payload, 2);
    
    if (result.success) {
      // Track in database
      const { error: trackingError } = await supabase.from('convoso_leads').upsert({
        agency_id,
        internal_lead_id: lead_data.id || null,
        convoso_lead_id: result.data.lead_id.toString(),
        list_id,
        campaign_id: getCampaignFromList(list_id, agency.lists),
        status: 'NEW',
        updated_at: new Date().toISOString()
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
        list_id,
        message: result.message || 'Lead inserted successfully'
      });
    } else {
      // Handle specific Convoso error codes
      if (result.message && result.message.includes('duplicate')) {
        return res.status(409).json({ 
          error: 'Duplicate lead - lead already exists in this list',
          details: result.message 
        });
      }
      
      throw new Error(result.message || 'Convoso API error');
    }
    
  } catch (error) {
    console.error('Lead insertion error:', error);
    
    // Return specific error messages
    if (error.name === 'AbortError') {
      return res.status(504).json({ 
        error: 'Convoso API timeout - please try again' 
      });
    }
    
    if (error.message.includes('fetch')) {
      return res.status(502).json({ 
        error: 'Unable to connect to Convoso API',
        details: 'Network connectivity issue' 
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to insert lead',
      details: error.message 
    });
  }
}

async function sendToConvosoWithRetry(payload, maxRetries = 2) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch('https://api.convoso.com/v1/leads/insert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result;
      
    } catch (error) {
      lastError = error;
      console.error(`Convoso API attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries && !error.message.includes('duplicate')) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }
  }
  
  throw lastError;
}

function selectBestList(lead_data, lists) {
  if (!lists || lists.length === 0) return null;
  
  // Priority 1: Transfer calls
  if (lead_data.is_transfer || lead_data.source === 'transfer') {
    const transferList = lists.find(l => 
      l.name && (
        l.name.toLowerCase().includes('call') || 
        l.name.toLowerCase().includes('transfer') ||
        l.name.toLowerCase().includes('warm')
      )
    );
    if (transferList) return transferList.id;
  }
  
  // Priority 2: Specific carrier lists
  if (lead_data.carrier || lead_data.currentCarrier) {
    const carrier = (lead_data.carrier || lead_data.currentCarrier).toLowerCase();
    const carrierList = lists.find(l => 
      l.name && l.name.toLowerCase().includes(carrier)
    );
    if (carrierList) return carrierList.id;
  }
  
  // Priority 3: State-specific lists
  if (lead_data.state) {
    const stateList = lists.find(l => 
      l.name && l.name.toLowerCase().includes(lead_data.state.toLowerCase())
    );
    if (stateList) return stateList.id;
  }
  
  // Priority 4: Default data lists
  const dataList = lists.find(l => 
    l.name && l.name.toLowerCase().includes('data') && l.status === 'Active'
  );
  if (dataList) return dataList.id;
  
  // Priority 5: Any active list
  const activeList = lists.find(l => l.status === 'Active');
  if (activeList) return activeList.id;
  
  // Fallback: First available list
  return lists[0]?.id || null;
}

function getCampaignFromList(list_id, lists) {
  const list = lists.find(l => l.id === list_id);
  return list ? list.campaign_id : null;
}

function sanitizeString(str) {
  if (!str) return '';
  return str.toString().trim().substring(0, 255); // Limit length and trim
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}