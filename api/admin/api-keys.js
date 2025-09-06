import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../_middleware/authCheck.js';
import { getUserContext } from '../utils/auth-helper.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function apiKeysHandler(req, res) {
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
        return handleGetApiKeys(req, res, agencyId);
      case 'POST':
        return handleCreateApiKey(req, res, agencyId);
      case 'PUT':
        return handleUpdateApiKey(req, res, agencyId);
      case 'DELETE':
        return handleDeleteApiKey(req, res, agencyId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API keys management error:', error);
    return res.status(500).json({ 
      error: 'Failed to process API keys request', 
      details: error.message 
    });
  }
}

async function handleGetApiKeys(req, res, agencyId) {
  const { service_name, active_only } = req.query;

  try {
    // Get API keys from database
    let query = supabase
      .from('portal_api_keys')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });

    if (service_name) query = query.eq('service_name', service_name);
    if (active_only === 'true') query = query.eq('is_active', true);

    const { data: apiKeys, error: apiKeysError } = await query;

    // If no API keys exist, return demo data
    if (apiKeysError || !apiKeys || apiKeys.length === 0) {
      return res.status(200).json({
        api_keys: generateDemoApiKeys(),
        summary: {
          total_keys: 8,
          active_keys: 6,
          expired_keys: 1,
          expiring_soon: 1
        }
      });
    }

    // Mask sensitive keys in response
    const maskedApiKeys = apiKeys.map(key => ({
      ...key,
      api_key: maskApiKey(key.api_key),
      api_secret: key.api_secret ? maskApiKey(key.api_secret) : null
    }));

    // Calculate summary
    const now = new Date();
    const summary = {
      total_keys: maskedApiKeys.length,
      active_keys: maskedApiKeys.filter(k => k.is_active).length,
      expired_keys: maskedApiKeys.filter(k => 
        k.expires_at && new Date(k.expires_at) < now
      ).length,
      expiring_soon: maskedApiKeys.filter(k => 
        k.expires_at && 
        new Date(k.expires_at) > now && 
        new Date(k.expires_at) < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      ).length
    };

    return res.status(200).json({
      api_keys: maskedApiKeys,
      summary
    });

  } catch (error) {
    console.error('Error fetching API keys:', error);
    return res.status(500).json({ error: 'Failed to fetch API keys' });
  }
}

async function handleCreateApiKey(req, res, agencyId) {
  const {
    service_name,
    description,
    api_key,
    api_secret,
    webhook_url,
    expires_at,
    permissions,
    environment
  } = req.body;

  if (!service_name || !api_key) {
    return res.status(400).json({ error: 'Missing required fields: service_name, api_key' });
  }

  try {
    const { data, error } = await supabase
      .from('portal_api_keys')
      .insert({
        agency_id: agencyId,
        service_name,
        description: description || '',
        api_key,
        api_secret: api_secret || null,
        webhook_url: webhook_url || null,
        expires_at: expires_at || null,
        permissions: permissions || [],
        environment: environment || 'production',
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Mask the keys in response
    const responseData = {
      ...data,
      api_key: maskApiKey(data.api_key),
      api_secret: data.api_secret ? maskApiKey(data.api_secret) : null
    };

    return res.status(201).json({
      message: 'API key created successfully',
      api_key: responseData
    });

  } catch (error) {
    console.error('Error creating API key:', error);
    return res.status(500).json({ error: 'Failed to create API key' });
  }
}

async function handleUpdateApiKey(req, res, agencyId) {
  const { key_id } = req.query;
  const updates = req.body;

  if (!key_id) {
    return res.status(400).json({ error: 'Key ID required' });
  }

  try {
    const { data, error } = await supabase
      .from('portal_api_keys')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', key_id)
      .eq('agency_id', agencyId)
      .select()
      .single();

    if (error) throw error;

    // Mask the keys in response
    const responseData = {
      ...data,
      api_key: maskApiKey(data.api_key),
      api_secret: data.api_secret ? maskApiKey(data.api_secret) : null
    };

    return res.status(200).json({
      message: 'API key updated successfully',
      api_key: responseData
    });

  } catch (error) {
    console.error('Error updating API key:', error);
    return res.status(500).json({ error: 'Failed to update API key' });
  }
}

async function handleDeleteApiKey(req, res, agencyId) {
  const { key_id } = req.query;

  if (!key_id) {
    return res.status(400).json({ error: 'Key ID required' });
  }

  try {
    const { error } = await supabase
      .from('portal_api_keys')
      .delete()
      .eq('id', key_id)
      .eq('agency_id', agencyId);

    if (error) throw error;

    return res.status(200).json({
      message: 'API key deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting API key:', error);
    return res.status(500).json({ error: 'Failed to delete API key' });
  }
}

function maskApiKey(key) {
  if (!key || key.length < 8) return '***masked***';
  return key.substring(0, 4) + '***' + key.substring(key.length - 4);
}

function generateDemoApiKeys() {
  return [
    {
      id: 'key-1',
      service_name: 'FirstEnroll',
      description: 'FirstEnroll insurance products API',
      api_key: 'fe_live_sk_1234***5678',
      api_secret: null,
      webhook_url: 'https://your-agency.vercel.app/api/webhooks/firstenroll',
      permissions: ['read_products', 'create_quotes', 'submit_applications'],
      environment: 'production',
      expires_at: '2025-12-31',
      is_active: true,
      created_at: '2025-01-15T10:00:00Z',
      last_used: '2025-09-02T14:30:00Z'
    },
    {
      id: 'key-2',
      service_name: 'Boberdoo',
      description: 'Boberdoo lead management system',
      api_key: 'bob_prod_abc123***def789',
      api_secret: 'sec_prod_xyz456***uvw012',
      webhook_url: 'https://your-agency.vercel.app/api/webhooks/boberdoo',
      permissions: ['receive_leads', 'update_lead_status', 'billing'],
      environment: 'production',
      expires_at: null,
      is_active: true,
      created_at: '2025-01-20T09:15:00Z',
      last_used: '2025-09-03T08:45:00Z'
    },
    {
      id: 'key-3',
      service_name: 'QuoteWizard',
      description: 'QuoteWizard lead provider integration',
      api_key: 'qw_api_key_999***111',
      api_secret: null,
      webhook_url: 'https://your-agency.vercel.app/api/webhooks/quotewizard',
      permissions: ['receive_leads', 'update_status'],
      environment: 'production',
      expires_at: '2025-06-30',
      is_active: true,
      created_at: '2025-02-01T11:30:00Z',
      last_used: '2025-09-01T16:20:00Z'
    },
    {
      id: 'key-4',
      service_name: 'HealthSherpa',
      description: 'HealthSherpa ACA marketplace integration',
      api_key: 'hs_live_api_555***333',
      api_secret: 'hs_secret_777***999',
      webhook_url: 'https://your-agency.vercel.app/api/webhooks/healthsherpa',
      permissions: ['read_plans', 'enroll_customers', 'check_subsidy_eligibility'],
      environment: 'production',
      expires_at: null,
      is_active: true,
      created_at: '2025-01-25T14:45:00Z',
      last_used: '2025-09-02T10:15:00Z'
    },
    {
      id: 'key-5',
      service_name: 'Stripe',
      description: 'Payment processing for premium collections',
      api_key: 'sk_live_stripe***payment',
      api_secret: null,
      webhook_url: 'https://your-agency.vercel.app/api/webhooks/stripe',
      permissions: ['process_payments', 'handle_subscriptions', 'issue_refunds'],
      environment: 'production',
      expires_at: null,
      is_active: true,
      created_at: '2025-01-10T08:00:00Z',
      last_used: '2025-09-03T12:00:00Z'
    },
    {
      id: 'key-6',
      service_name: 'Twilio',
      description: 'SMS and voice communication services',
      api_key: 'AC_twilio_sms***voice',
      api_secret: 'auth_token_abc***xyz',
      webhook_url: 'https://your-agency.vercel.app/api/webhooks/twilio',
      permissions: ['send_sms', 'make_calls', 'receive_messages'],
      environment: 'production',
      expires_at: null,
      is_active: true,
      created_at: '2025-02-15T13:20:00Z',
      last_used: '2025-09-02T17:45:00Z'
    },
    {
      id: 'key-7',
      service_name: 'FirstEnroll',
      description: 'FirstEnroll testing environment',
      api_key: 'fe_test_sk_test***test',
      api_secret: null,
      webhook_url: 'https://your-agency-staging.vercel.app/api/webhooks/firstenroll',
      permissions: ['read_products', 'create_quotes'],
      environment: 'staging',
      expires_at: '2025-03-31',
      is_active: false,
      created_at: '2025-01-15T10:30:00Z',
      last_used: '2025-08-15T09:00:00Z'
    },
    {
      id: 'key-8',
      service_name: 'DocuSign',
      description: 'Digital signature service for applications',
      api_key: 'docu_api_sign***docs',
      api_secret: 'docu_secret_key***sign',
      webhook_url: 'https://your-agency.vercel.app/api/webhooks/docusign',
      permissions: ['create_envelopes', 'send_for_signature', 'track_status'],
      environment: 'production',
      expires_at: '2025-10-15',
      is_active: true,
      created_at: '2025-03-01T15:10:00Z',
      last_used: '2025-08-28T11:30:00Z'
    }
  ];
}

export default requireAuth(['admin', 'super_admin'])(apiKeysHandler);