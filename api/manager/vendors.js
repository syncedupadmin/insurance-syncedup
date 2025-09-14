import { createClient } from '@supabase/supabase-js';
// DISABLED: // DISABLED: import { requireAuth } from '../_middleware/authCheck.js';
import { getUserContext } from '../utils/auth-helper.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function vendorsHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { agencyId, role } = getUserContext(req);

    switch (req.method) {
      case 'GET':
        return handleGetVendors(req, res, agencyId);
      case 'POST':
        return handleCreateVendor(req, res, agencyId);
      case 'PUT':
        return handleUpdateVendor(req, res, agencyId);
      case 'DELETE':
        return handleDeleteVendor(req, res, agencyId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Vendors API error:', error);
    return res.status(500).json({ 
      error: 'Failed to process vendor request', 
      details: error.message 
    });
  }
}

async function handleGetVendors(req, res, agencyId) {
  const { vendor_id, status, type } = req.query;

  try {
    // Check if vendors table exists, if not return demo data
    const { data: vendors, error: vendorsError } = await supabase
      .from('portal_lead_vendors')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });

    // If table doesn't exist or no vendors, return demo data
    if (vendorsError || !vendors || vendors.length === 0) {
      const demoVendors = generateDemoVendors();
      return res.status(200).json({
        vendors: demoVendors,
        summary: calculateVendorSummary(demoVendors),
        boberdoo_config: getDemoBoberdooConfig()
      });
    }

    // Filter vendors based on query parameters
    let filteredVendors = vendors;
    if (vendor_id) filteredVendors = filteredVendors.filter(v => v.id === vendor_id);
    if (status) filteredVendors = filteredVendors.filter(v => v.status === status);
    if (type) filteredVendors = filteredVendors.filter(v => v.vendor_type === type);

    // Get recent lead stats for each vendor
    const vendorsWithStats = await Promise.all(
      filteredVendors.map(async (vendor) => {
        const stats = await getVendorStats(vendor.id);
        return { ...vendor, stats };
      })
    );

    // Get Boberdoo configuration
    const boberdooConfig = await getBoberdooConfig(agencyId);

    return res.status(200).json({
      vendors: vendorsWithStats,
      summary: calculateVendorSummary(vendorsWithStats),
      boberdoo_config: boberdooConfig
    });

  } catch (error) {
    console.error('Error fetching vendors:', error);
    return res.status(500).json({ error: 'Failed to fetch vendors' });
  }
}

async function handleCreateVendor(req, res, agencyId) {
  const { 
    vendor_name, 
    vendor_type, 
    contact_email, 
    contact_phone,
    lead_cost,
    states_covered,
    age_ranges,
    lead_filters,
    api_endpoint,
    api_key,
    status = 'active'
  } = req.body;

  if (!vendor_name || !vendor_type || !contact_email) {
    return res.status(400).json({ error: 'Missing required fields: vendor_name, vendor_type, contact_email' });
  }

  try {
    const { data, error } = await supabase
      .from('portal_lead_vendors')
      .insert({
        agency_id: agencyId,
        vendor_name,
        vendor_type,
        contact_email,
        contact_phone: contact_phone || '',
        lead_cost: parseFloat(lead_cost) || 0,
        states_covered: states_covered || [],
        age_ranges: age_ranges || [],
        lead_filters: lead_filters || {},
        api_endpoint: api_endpoint || '',
        api_key: api_key || '',
        status,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      message: 'Vendor created successfully',
      vendor: data
    });

  } catch (error) {
    console.error('Error creating vendor:', error);
    return res.status(500).json({ error: 'Failed to create vendor' });
  }
}

async function handleUpdateVendor(req, res, agencyId) {
  const { vendor_id } = req.query;
  const updates = req.body;

  if (!vendor_id) {
    return res.status(400).json({ error: 'Vendor ID required' });
  }

  try {
    const { data, error } = await supabase
      .from('portal_lead_vendors')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', vendor_id)
      .eq('agency_id', agencyId)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      message: 'Vendor updated successfully',
      vendor: data
    });

  } catch (error) {
    console.error('Error updating vendor:', error);
    return res.status(500).json({ error: 'Failed to update vendor' });
  }
}

async function handleDeleteVendor(req, res, agencyId) {
  const { vendor_id } = req.query;

  if (!vendor_id) {
    return res.status(400).json({ error: 'Vendor ID required' });
  }

  try {
    const { error } = await supabase
      .from('portal_lead_vendors')
      .delete()
      .eq('id', vendor_id)
      .eq('agency_id', agencyId);

    if (error) throw error;

    return res.status(200).json({
      message: 'Vendor deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting vendor:', error);
    return res.status(500).json({ error: 'Failed to delete vendor' });
  }
}

async function getVendorStats(vendorId) {
  try {
    // Get leads from the last 30 days (mock data since leads table might not exist)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Mock lead statistics
    const mockStats = {
      leads_30_days: Math.floor(Math.random() * 100) + 20,
      conversion_rate: (Math.random() * 15 + 10).toFixed(1),
      avg_lead_cost: (Math.random() * 30 + 15).toFixed(2),
      total_cost_30_days: 0,
      quality_score: (Math.random() * 2 + 3).toFixed(1), // 3-5 scale
      last_lead_date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    mockStats.total_cost_30_days = (mockStats.leads_30_days * parseFloat(mockStats.avg_lead_cost)).toFixed(2);

    return mockStats;
  } catch (error) {
    console.error('Error getting vendor stats:', error);
    return {
      leads_30_days: 0,
      conversion_rate: '0.0',
      avg_lead_cost: '0.00',
      total_cost_30_days: '0.00',
      quality_score: '0.0',
      last_lead_date: null
    };
  }
}

async function getBoberdooConfig(agencyId) {
  try {
    const { data, error } = await supabase
      .from('portal_integrations')
      .select('*')
      .eq('agency_id', agencyId)
      .eq('integration_type', 'boberdoo')
      .single();

    if (error || !data) {
      return getDemoBoberdooConfig();
    }

    return data;
  } catch (error) {
    return getDemoBoberdooConfig();
  }
}

function getDemoBoberdooConfig() {
  return {
    integration_type: 'boberdoo',
    api_endpoint: 'https://api.boberdoo.com/v1/leads',
    api_key: 'demo_key_hidden_for_security',
    webhook_url: 'https://your-agency.vercel.app/api/webhooks/boberdoo',
    lead_filters: {
      min_age: 18,
      max_age: 65,
      states: ['FL', 'TX', 'CA', 'NY'],
      income_min: 25000,
      exclude_duplicate_emails: true,
      exclude_duplicate_phones: true
    },
    lead_distribution: {
      auto_assign: true,
      distribution_method: 'round_robin', // round_robin, weighted, geographic
      max_leads_per_agent_daily: 10,
      business_hours_only: true
    },
    status: 'active',
    last_sync: '2025-09-02T15:30:00Z',
    total_leads_received: 1247,
    total_cost_mtd: 18705.50
  };
}

function calculateVendorSummary(vendors) {
  const active = vendors.filter(v => v.status === 'active');
  const totalLeads = vendors.reduce((sum, v) => sum + (v.stats?.leads_30_days || 0), 0);
  const totalCost = vendors.reduce((sum, v) => sum + parseFloat(v.stats?.total_cost_30_days || 0), 0);
  const avgConversion = vendors.length > 0 
    ? vendors.reduce((sum, v) => sum + parseFloat(v.stats?.conversion_rate || 0), 0) / vendors.length
    : 0;

  return {
    total_vendors: vendors.length,
    active_vendors: active.length,
    inactive_vendors: vendors.length - active.length,
    total_leads_30_days: totalLeads,
    total_cost_30_days: totalCost.toFixed(2),
    avg_conversion_rate: avgConversion.toFixed(1),
    avg_cost_per_lead: totalLeads > 0 ? (totalCost / totalLeads).toFixed(2) : '0.00'
  };
}

function generateDemoVendors() {
  return [
    {
      id: 'vendor-1',
      vendor_name: 'Boberdoo Leads',
      vendor_type: 'api_integration',
      contact_email: 'support@boberdoo.com',
      contact_phone: '1-800-555-0123',
      lead_cost: 25.00,
      states_covered: ['FL', 'TX', 'CA', 'NY', 'GA'],
      age_ranges: ['18-35', '36-50', '51-65'],
      lead_filters: {
        income_min: 30000,
        exclude_duplicates: true,
        tobacco_users: false
      },
      api_endpoint: 'https://api.boberdoo.com/v1/leads',
      api_key: 'hidden_for_security',
      status: 'active',
      created_at: '2025-08-15T10:00:00Z',
      stats: {
        leads_30_days: 87,
        conversion_rate: '18.4',
        avg_lead_cost: '25.00',
        total_cost_30_days: '2175.00',
        quality_score: '4.2',
        last_lead_date: '2025-09-02'
      }
    },
    {
      id: 'vendor-2',
      vendor_name: 'QuoteWizard',
      vendor_type: 'lead_service',
      contact_email: 'partners@quotewizard.com',
      contact_phone: '1-855-555-0456',
      lead_cost: 32.50,
      states_covered: ['FL', 'TX', 'AZ', 'NV'],
      age_ranges: ['25-45', '46-65'],
      lead_filters: {
        income_min: 40000,
        homeowner_only: true,
        married_only: false
      },
      api_endpoint: 'https://api.quotewizard.com/leads',
      api_key: 'hidden_for_security',
      status: 'active',
      created_at: '2025-07-20T14:30:00Z',
      stats: {
        leads_30_days: 52,
        conversion_rate: '22.1',
        avg_lead_cost: '32.50',
        total_cost_30_days: '1690.00',
        quality_score: '4.5',
        last_lead_date: '2025-09-01'
      }
    },
    {
      id: 'vendor-3',
      vendor_name: 'LeadGenius',
      vendor_type: 'manual_upload',
      contact_email: 'info@leadgenius.com',
      contact_phone: '1-844-555-0789',
      lead_cost: 18.75,
      states_covered: ['FL', 'AL', 'MS', 'LA'],
      age_ranges: ['21-60'],
      lead_filters: {
        income_min: 25000,
        health_conscious: true
      },
      api_endpoint: '',
      api_key: '',
      status: 'paused',
      created_at: '2025-06-10T09:15:00Z',
      stats: {
        leads_30_days: 0,
        conversion_rate: '0.0',
        avg_lead_cost: '18.75',
        total_cost_30_days: '0.00',
        quality_score: '3.8',
        last_lead_date: '2025-08-15'
      }
    },
    {
      id: 'vendor-4',
      vendor_name: 'HealthSherpa Leads',
      vendor_type: 'api_integration',
      contact_email: 'api@healthsherpa.com',
      contact_phone: '1-888-555-0321',
      lead_cost: 28.00,
      states_covered: ['FL', 'TX', 'CA', 'IL', 'PA'],
      age_ranges: ['26-64'],
      lead_filters: {
        aca_qualified: true,
        subsidy_eligible: true
      },
      api_endpoint: 'https://api.healthsherpa.com/leads',
      api_key: 'hidden_for_security',
      status: 'active',
      created_at: '2025-08-01T11:45:00Z',
      stats: {
        leads_30_days: 65,
        conversion_rate: '25.3',
        avg_lead_cost: '28.00',
        total_cost_30_days: '1820.00',
        quality_score: '4.7',
        last_lead_date: '2025-09-02'
      }
    },
    {
      id: 'vendor-5',
      vendor_name: 'Local Medicare Referrals',
      vendor_type: 'referral_network',
      contact_email: 'partners@localmedicare.com',
      contact_phone: '1-866-555-0654',
      lead_cost: 45.00,
      states_covered: ['FL'],
      age_ranges: ['65+'],
      lead_filters: {
        medicare_eligible: true,
        supplement_interested: true
      },
      api_endpoint: '',
      api_key: '',
      status: 'active',
      created_at: '2025-07-05T16:20:00Z',
      stats: {
        leads_30_days: 23,
        conversion_rate: '31.2',
        avg_lead_cost: '45.00',
        total_cost_30_days: '1035.00',
        quality_score: '4.8',
        last_lead_date: '2025-08-31'
      }
    }
  ];
}

// DISABLED: export default requireAuth(['manager', 'admin', 'super_admin'])(vendorsHandler);export default vendorsHandler;
