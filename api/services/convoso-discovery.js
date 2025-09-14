import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export class ConvosoService {
  constructor(authToken) {
    this.authToken = authToken;
    this.baseURL = 'https://api.convoso.com/v1';
  }

  async discoverAgencySetup() {
    try {
      // Get campaigns with error handling
      const campaigns = await this.getCampaigns();
      
      // Get lists with pagination support
      const lists = await this.getAllLists();
      
      // Get queues (using campaign data since no direct queue endpoint)
      const queues = await this.extractQueuesFromCampaigns(campaigns);
      
      // Validate we got data
      if (!campaigns.success || !lists.success) {
        throw new Error('Invalid token or API error');
      }
      
      return {
        success: true,
        campaigns: campaigns.data || [],
        lists: lists.data || [],
        queues: queues || [],
        fieldMappings: this.getStandardFieldMappings()
      };
    } catch (error) {
      console.error('Discovery failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getCampaigns() {
    try {
      const response = await fetch(`${this.baseURL}/campaigns/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ 
          auth_token: this.authToken,
          limit: 100 
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Campaign fetch error:', error);
      return { success: false, error: error.message };
    }
  }

  async getAllLists() {
    try {
      const response = await fetch(`${this.baseURL}/lists/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ 
          auth_token: this.authToken,
          limit: 1000  // Get all lists
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Lists fetch error:', error);
      return { success: false, error: error.message };
    }
  }

  extractQueuesFromCampaigns(campaigns) {
    // Extract queue info from campaign data
    if (!campaigns.data) return [];
    
    const queues = [];
    const queueMap = new Map(); // Use Map to prevent duplicates
    
    campaigns.data.forEach(campaign => {
      if (campaign.queue_name && campaign.queue_id) {
        const queueKey = `${campaign.queue_id}-${campaign.queue_name}`;
        if (!queueMap.has(queueKey)) {
          queueMap.set(queueKey, {
            id: campaign.queue_id,
            name: campaign.queue_name,
            campaign_id: campaign.id
          });
        }
      }
    });
    
    return Array.from(queueMap.values());
  }

  getStandardFieldMappings() {
    // Return standard field mappings for insurance
    return {
      // Core fields
      phone_number: 'phone',
      first_name: 'firstName',
      last_name: 'lastName',
      email: 'email',
      date_of_birth: 'dob',
      
      // Address fields
      address1: 'address',
      city: 'city',
      state: 'state',
      postal_code: 'zip',
      
      // Insurance-specific
      currently_insured: 'currentlyInsured',
      household_income: 'householdIncome',
      pre_existing: 'preExisting',
      current_meds: 'currentMeds',
      price_range: 'priceRange',
      
      // Additional fields from Convoso
      individual_or_family_plan_1: 'planType',
      plan_start_date: 'planStartDate',
      urgency_date: 'urgencyDate',
      with_what_company: 'currentCarrier',
      what_are_you_spending_with_that_carrier: 'currentSpend',
      shopping_around: 'shoppingReason',
      eligible_for_medicaid: 'medicaidEligible'
    };
  }

  async validateToken() {
    try {
      const response = await fetch(`${this.baseURL}/campaigns/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ 
          auth_token: this.authToken,
          limit: 1 
        })
      });
      
      return response.ok;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }

  async getAgentList() {
    try {
      const response = await fetch(`${this.baseURL}/agent-monitor/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ 
          auth_token: this.authToken
        })
      });
      
      if (!response.ok) {
        console.error(`Convoso API error: HTTP ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error('Response body:', errorText);
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }
      
      return await response.json();
    } catch (error) {
      console.error('Convoso getAgentList error:', error);
      return { success: false, error: error.message };
    }
  }
}

class ConvosoDiscovery {
  constructor(authToken) {
    this.authToken = authToken;
    this.baseURL = 'https://api.convoso.com/v1';
  }

  async discoverAgencySetup() {
    try {
      const campaigns = await this.getCampaigns();
      const lists = await this.getAllLists();
      const queues = await this.extractQueuesFromCampaigns(campaigns);
      
      if (!campaigns.success || !lists.success) {
        throw new Error('Invalid token or API error');
      }
      
      return {
        success: true,
        campaigns: campaigns.data || [],
        lists: lists.data || [],
        queues: queues || [],
        fieldMappings: this.getStandardFieldMappings()
      };
    } catch (error) {
      console.error('Discovery failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getCampaigns() {
    try {
      const response = await fetch(`${this.baseURL}/campaigns/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ 
          auth_token: this.authToken,
          limit: 100 
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Campaign fetch error:', error);
      return { success: false, error: error.message };
    }
  }

  async getAllLists() {
    try {
      const response = await fetch(`${this.baseURL}/lists/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ 
          auth_token: this.authToken,
          limit: 1000
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Lists fetch error:', error);
      return { success: false, error: error.message };
    }
  }

  extractQueuesFromCampaigns(campaigns) {
    if (!campaigns.data) return [];
    
    const queues = [];
    const queueMap = new Map();
    
    campaigns.data.forEach(campaign => {
      if (campaign.queue_name && campaign.queue_id) {
        const queueKey = `${campaign.queue_id}-${campaign.queue_name}`;
        if (!queueMap.has(queueKey)) {
          queueMap.set(queueKey, {
            id: campaign.queue_id,
            name: campaign.queue_name,
            campaign_id: campaign.id
          });
        }
      }
    });
    
    return Array.from(queueMap.values());
  }

  getStandardFieldMappings() {
    return {
      phone_number: 'phone',
      first_name: 'firstName',
      last_name: 'lastName',
      email: 'email',
      date_of_birth: 'dob',
      address1: 'address',
      city: 'city',
      state: 'state',
      postal_code: 'zip',
      currently_insured: 'currentlyInsured',
      household_income: 'householdIncome',
      pre_existing: 'preExisting',
      current_meds: 'currentMeds',
      price_range: 'priceRange',
      individual_or_family_plan_1: 'planType',
      plan_start_date: 'planStartDate',
      urgency_date: 'urgencyDate',
      with_what_company: 'currentCarrier',
      what_are_you_spending_with_that_carrier: 'currentSpend',
      shopping_around: 'shoppingReason',
      eligible_for_medicaid: 'medicaidEligible'
    };
  }
}

// Add insertLead method to ConvosoService
ConvosoService.prototype.insertLead = async function(leadData) {
  const payload = {
    auth_token: this.authToken,
    list_id: leadData.list_id,
    phone_number: leadData.phone_number,
    first_name: leadData.first_name || '',
    last_name: leadData.last_name || '',
    email: leadData.email || '',
    address1: leadData.address || '',
    city: leadData.city || '',
    state: leadData.state || '',
    postal_code: leadData.zip || '',
    currently_insured: leadData.currently_insured || '',
    household_income: leadData.household_income || '',
    pre_existing: leadData.pre_existing || '',
    hopper: true,
    hopper_priority: 99,
    check_dup: 2,
    update_if_found: true
  };

  const response = await fetch(`${this.baseURL}/leads/insert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(payload)
  });
  
  return await response.json();
};

// Add getCampaigns method that returns proper data
ConvosoService.prototype.getCampaigns = async function() {
  try {
    const response = await fetch(`${this.baseURL}/campaigns/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ 
        auth_token: this.authToken,
        limit: 100 
      })
    });
    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Add getLists method that returns proper data
ConvosoService.prototype.getLists = async function() {
  try {
    const response = await fetch(`${this.baseURL}/lists/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ 
        auth_token: this.authToken,
        limit: 1000
      })
    });
    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export default ConvosoDiscovery;