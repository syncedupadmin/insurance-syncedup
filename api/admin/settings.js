import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../_middleware/authCheck.js';
import { getUserContext } from '../utils/auth-helper.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function settingsHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { agencyId, role } = getUserContext(req);

    switch (req.method) {
      case 'GET':
        return handleGetSettings(req, res, agencyId);
      case 'POST':
      case 'PUT':
        return handleUpdateSettings(req, res, agencyId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Settings API error:', error);
    return res.status(500).json({ 
      error: 'Failed to process settings request', 
      details: error.message 
    });
  }
}

async function handleGetSettings(req, res, agencyId) {
  const { category } = req.query;

  try {
    // Get settings from database
    let query = supabase
      .from('portal_settings')
      .select('*')
      .eq('agency_id', agencyId);

    if (category) query = query.eq('category', category);

    const { data: settings, error: settingsError } = await query;

    // If no settings exist, return demo data
    if (settingsError || !settings || settings.length === 0) {
      return res.status(200).json({
        settings: generateDemoSettings(),
        categories: ['general', 'branding', 'billing', 'notifications', 'security', 'integrations']
      });
    }

    // Organize settings by category
    const organizedSettings = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) acc[setting.category] = {};
      acc[setting.category][setting.setting_key] = {
        value: setting.setting_value,
        type: setting.value_type,
        description: setting.description,
        last_updated: setting.updated_at
      };
      return acc;
    }, {});

    return res.status(200).json({
      settings: organizedSettings,
      categories: Object.keys(organizedSettings)
    });

  } catch (error) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
}

async function handleUpdateSettings(req, res, agencyId) {
  const { settings_updates } = req.body;

  if (!settings_updates || typeof settings_updates !== 'object') {
    return res.status(400).json({ error: 'Settings updates object required' });
  }

  try {
    const results = [];

    // Process each setting update
    for (const [category, categorySettings] of Object.entries(settings_updates)) {
      for (const [key, settingData] of Object.entries(categorySettings)) {
        const { value, type = 'string', description = '' } = settingData;

        // Check if setting exists
        const { data: existingSetting } = await supabase
          .from('portal_settings')
          .select('id')
          .eq('agency_id', agencyId)
          .eq('category', category)
          .eq('setting_key', key)
          .single();

        let result;
        if (existingSetting) {
          // Update existing setting
          result = await supabase
            .from('portal_settings')
            .update({
              setting_value: value,
              value_type: type,
              description,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingSetting.id)
            .select()
            .single();
        } else {
          // Create new setting
          result = await supabase
            .from('portal_settings')
            .insert({
              agency_id: agencyId,
              category,
              setting_key: key,
              setting_value: value,
              value_type: type,
              description,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();
        }

        if (result.error) throw result.error;
        results.push(result.data);
      }
    }

    return res.status(200).json({
      message: 'Settings updated successfully',
      updated_settings: results.length,
      settings: results
    });

  } catch (error) {
    console.error('Error updating settings:', error);
    return res.status(500).json({ error: 'Failed to update settings' });
  }
}

function generateDemoSettings() {
  return {
    general: {
      agency_name: {
        value: 'SyncedUp Insurance Agency',
        type: 'string',
        description: 'Name of the insurance agency'
      },
      agency_phone: {
        value: '(555) 123-4567',
        type: 'string',
        description: 'Main agency phone number'
      },
      agency_email: {
        value: 'info@syncedup-insurance.com',
        type: 'email',
        description: 'Main agency email address'
      },
      agency_address: {
        value: '123 Insurance Blvd, Suite 400, Tampa, FL 33601',
        type: 'text',
        description: 'Physical address of the agency'
      },
      business_hours: {
        value: 'Monday-Friday 9:00 AM - 6:00 PM EST',
        type: 'string',
        description: 'Standard business hours'
      },
      timezone: {
        value: 'America/New_York',
        type: 'string',
        description: 'Agency timezone'
      }
    },
    branding: {
      logo_url: {
        value: '/images/logo.png',
        type: 'url',
        description: 'URL to agency logo'
      },
      primary_color: {
        value: '#667eea',
        type: 'color',
        description: 'Primary brand color'
      },
      secondary_color: {
        value: '#764ba2',
        type: 'color',
        description: 'Secondary brand color'
      },
      font_family: {
        value: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
        type: 'string',
        description: 'Default font family for the portal'
      },
      custom_css: {
        value: '',
        type: 'text',
        description: 'Custom CSS for additional styling'
      }
    },
    billing: {
      billing_email: {
        value: 'billing@syncedup-insurance.com',
        type: 'email',
        description: 'Email for billing notifications'
      },
      payment_processor: {
        value: 'stripe',
        type: 'string',
        description: 'Payment processing service'
      },
      auto_billing: {
        value: true,
        type: 'boolean',
        description: 'Enable automatic billing'
      },
      billing_cycle: {
        value: 'monthly',
        type: 'string',
        description: 'Billing cycle frequency'
      },
      late_fee_percentage: {
        value: 2.5,
        type: 'number',
        description: 'Late fee percentage'
      }
    },
    notifications: {
      email_notifications: {
        value: true,
        type: 'boolean',
        description: 'Enable email notifications'
      },
      sms_notifications: {
        value: true,
        type: 'boolean',
        description: 'Enable SMS notifications'
      },
      new_lead_notification: {
        value: true,
        type: 'boolean',
        description: 'Notify on new leads'
      },
      sale_notification: {
        value: true,
        type: 'boolean',
        description: 'Notify on new sales'
      },
      goal_reminder_days: {
        value: 7,
        type: 'number',
        description: 'Days before goal deadline to send reminder'
      },
      license_expiry_reminder_days: {
        value: 30,
        type: 'number',
        description: 'Days before license expiry to send reminder'
      }
    },
    security: {
      require_two_factor: {
        value: false,
        type: 'boolean',
        description: 'Require two-factor authentication'
      },
      password_min_length: {
        value: 8,
        type: 'number',
        description: 'Minimum password length'
      },
      session_timeout_minutes: {
        value: 480,
        type: 'number',
        description: 'Session timeout in minutes (8 hours)'
      },
      max_login_attempts: {
        value: 5,
        type: 'number',
        description: 'Maximum failed login attempts before lockout'
      },
      lockout_duration_minutes: {
        value: 30,
        type: 'number',
        description: 'Account lockout duration in minutes'
      }
    },
    integrations: {
      lead_auto_assignment: {
        value: true,
        type: 'boolean',
        description: 'Automatically assign leads to agents'
      },
      lead_distribution_method: {
        value: 'round_robin',
        type: 'string',
        description: 'Method for distributing leads (round_robin, weighted, geographic)'
      },
      webhook_retry_attempts: {
        value: 3,
        type: 'number',
        description: 'Number of webhook retry attempts'
      },
      api_rate_limit: {
        value: 1000,
        type: 'number',
        description: 'API requests per hour limit'
      },
      data_retention_days: {
        value: 2555,
        type: 'number',
        description: 'Data retention period in days (7 years)'
      }
    }
  };
}

export default requireAuth(['admin', 'super_admin'])(settingsHandler);