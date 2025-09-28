const { requireAuth } = require('../_middleware/authCheck.js');

async function integrationsHandler(req, res) {
  const supabase = req.supabase;
  const user = req.user;

  // CRITICAL SECURITY: Only allow admins to manage their own agency's integrations
  if (!user.agency_id) {
    return res.status(403).json({
      error: 'Agency ID required',
      message: 'You must be associated with an agency to manage integrations'
    });
  }

  const userAgencyId = user.agency_id;

  try {
    switch (req.method) {
      case 'GET':
        return await handleGetIntegrations(req, res, supabase, userAgencyId);

      case 'POST':
      case 'PUT':
        return await handleUpdateIntegrations(req, res, supabase, userAgencyId);

      case 'DELETE':
        return await handleDeleteIntegration(req, res, supabase, userAgencyId);

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Integrations API error:', error);
    return res.status(500).json({
      error: 'Failed to process integrations request',
      message: error.message
    });
  }
}

async function handleGetIntegrations(req, res, supabase, agencyId) {
  try {
    // SECURITY: Only fetch THIS agency's credentials
    const { data: agency, error } = await supabase
      .from('agencies')
      .select('id, name, code, api_credentials')
      .eq('id', agencyId)
      .single();

    if (error) {
      console.error('Error fetching agency:', error);
      return res.status(500).json({ error: 'Failed to fetch integrations' });
    }

    if (!agency) {
      return res.status(404).json({ error: 'Agency not found' });
    }

    // SECURITY: Mask sensitive credentials before returning
    const maskedCredentials = maskCredentials(agency.api_credentials || {});

    return res.status(200).json({
      success: true,
      agency_id: agency.id,
      agency_name: agency.name,
      integrations: maskedCredentials,
      available_integrations: [
        {
          id: 'convoso',
          name: 'Convoso',
          description: 'Lead management and dialer integration',
          fields: [
            { name: 'api_key', label: 'API Key', type: 'password', required: true },
            { name: 'api_secret', label: 'API Secret', type: 'password', required: false },
            { name: 'account_id', label: 'Account ID', type: 'text', required: false },
            { name: 'base_url', label: 'Base URL', type: 'text', required: false, default: 'https://api.convoso.com' }
          ]
        },
        {
          id: 'stripe',
          name: 'Stripe',
          description: 'Payment processing',
          fields: [
            { name: 'api_key', label: 'API Key', type: 'password', required: true },
            { name: 'webhook_secret', label: 'Webhook Secret', type: 'password', required: false }
          ]
        },
        {
          id: 'twilio',
          name: 'Twilio',
          description: 'SMS and voice communications',
          fields: [
            { name: 'account_sid', label: 'Account SID', type: 'text', required: true },
            { name: 'auth_token', label: 'Auth Token', type: 'password', required: true },
            { name: 'phone_number', label: 'Phone Number', type: 'text', required: false }
          ]
        }
      ]
    });

  } catch (error) {
    console.error('Error in handleGetIntegrations:', error);
    return res.status(500).json({ error: 'Failed to fetch integrations' });
  }
}

async function handleUpdateIntegrations(req, res, supabase, agencyId) {
  const { integration_name, credentials, enabled } = req.body;

  if (!integration_name || !credentials) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'integration_name and credentials are required'
    });
  }

  // Validate integration name
  const validIntegrations = ['convoso', 'stripe', 'twilio', 'sendgrid', 'zapier'];
  if (!validIntegrations.includes(integration_name)) {
    return res.status(400).json({
      error: 'Invalid integration name',
      message: `Allowed integrations: ${validIntegrations.join(', ')}`
    });
  }

  try {
    // SECURITY: Fetch ONLY this agency's current credentials
    const { data: agency, error: fetchError } = await supabase
      .from('agencies')
      .select('api_credentials')
      .eq('id', agencyId)
      .single();

    if (fetchError) {
      console.error('Error fetching agency:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch agency' });
    }

    // Build updated credentials object
    const currentCredentials = agency?.api_credentials || {};
    const updatedCredentials = {
      ...currentCredentials,
      [integration_name]: {
        ...credentials,
        enabled: enabled !== false, // Default to true
        updated_at: new Date().toISOString(),
        updated_by: req.user.email || 'admin'
      }
    };

    // SECURITY: Update ONLY this agency's credentials
    const { data: updatedAgency, error: updateError } = await supabase
      .from('agencies')
      .update({
        api_credentials: updatedCredentials,
        updated_at: new Date().toISOString()
      })
      .eq('id', agencyId)
      .select('id, name, api_credentials')
      .single();

    if (updateError) {
      console.error('Error updating agency:', updateError);
      return res.status(500).json({ error: 'Failed to update integrations' });
    }

    // SECURITY: Mask credentials in response
    const maskedCredentials = maskCredentials(updatedAgency.api_credentials);

    return res.status(200).json({
      success: true,
      message: `${integration_name} integration updated successfully`,
      agency_id: updatedAgency.id,
      agency_name: updatedAgency.name,
      integration: {
        name: integration_name,
        ...maskedCredentials[integration_name]
      }
    });

  } catch (error) {
    console.error('Error in handleUpdateIntegrations:', error);
    return res.status(500).json({ error: 'Failed to update integrations' });
  }
}

async function handleDeleteIntegration(req, res, supabase, agencyId) {
  const { integration_name } = req.query;

  if (!integration_name) {
    return res.status(400).json({ error: 'integration_name query parameter required' });
  }

  try {
    // SECURITY: Fetch ONLY this agency's credentials
    const { data: agency, error: fetchError } = await supabase
      .from('agencies')
      .select('api_credentials')
      .eq('id', agencyId)
      .single();

    if (fetchError) {
      return res.status(500).json({ error: 'Failed to fetch agency' });
    }

    const currentCredentials = agency?.api_credentials || {};

    // Remove the integration
    const { [integration_name]: removed, ...remainingCredentials } = currentCredentials;

    // SECURITY: Update ONLY this agency
    const { error: updateError } = await supabase
      .from('agencies')
      .update({
        api_credentials: remainingCredentials,
        updated_at: new Date().toISOString()
      })
      .eq('id', agencyId);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to delete integration' });
    }

    return res.status(200).json({
      success: true,
      message: `${integration_name} integration removed successfully`
    });

  } catch (error) {
    console.error('Error in handleDeleteIntegration:', error);
    return res.status(500).json({ error: 'Failed to delete integration' });
  }
}

// SECURITY: Mask sensitive credentials before sending to frontend
function maskCredentials(credentials) {
  if (!credentials || typeof credentials !== 'object') {
    return {};
  }

  const masked = {};

  for (const [integrationName, config] of Object.entries(credentials)) {
    if (!config || typeof config !== 'object') continue;

    masked[integrationName] = {};

    for (const [key, value] of Object.entries(config)) {
      // Mask sensitive fields
      const sensitiveFields = ['api_key', 'api_secret', 'auth_token', 'webhook_secret', 'password', 'secret'];

      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        // Show first 4 and last 4 characters only
        if (typeof value === 'string' && value.length > 8) {
          masked[integrationName][key] = `${value.substring(0, 4)}${'*'.repeat(value.length - 8)}${value.substring(value.length - 4)}`;
        } else if (typeof value === 'string' && value.length > 0) {
          masked[integrationName][key] = '****';
        } else {
          masked[integrationName][key] = null;
        }
      } else {
        // Non-sensitive fields pass through
        masked[integrationName][key] = value;
      }
    }
  }

  return masked;
}

// CRITICAL: Only admins and super_admins can manage integrations
module.exports = requireAuth(['admin', 'super_admin'])(integrationsHandler);