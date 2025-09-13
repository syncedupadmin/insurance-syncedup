import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Extract authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Missing or invalid authorization header' });
    }

    // Verify admin access (you may want to decode and verify JWT here)
    const token = authHeader.substring(7);

    // Extract form data
    const {
      name,
      contact_email,
      phone_number,
      address,
      plan_type
    } = req.body;

    // Validate required fields
    if (!name || !contact_email || !plan_type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, contact_email, plan_type'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contact_email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Validate plan type
    const validPlans = ['basic', 'professional', 'enterprise'];
    if (!validPlans.includes(plan_type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan type'
      });
    }

    // Check if agency name already exists
    const { data: existingAgency } = await supabase
      .from('agencies')
      .select('id')
      .eq('name', name)
      .single();

    if (existingAgency) {
      return res.status(409).json({
        success: false,
        error: 'An agency with this name already exists'
      });
    }

    // Generate agency code from name
    const agencyCode = name.toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '') // Remove spaces
      .substring(0, 10) + Math.floor(Math.random() * 100).toString().padStart(2, '0');

    // Start transaction by creating agency first
    const { data: newAgency, error: agencyError } = await supabase
      .from('agencies')
      .insert([{
        name: name,
        code: agencyCode,
        admin_email: contact_email,
        is_active: true,
        settings: {
          plan: plan_type,
          billing: {
            monthly_cost: plan_type === 'basic' ? 99 : plan_type === 'professional' ? 199 : 399,
            status: 'active'
          },
          features: {
            max_users: plan_type === 'basic' ? 10 : plan_type === 'professional' ? 50 : 200,
            api_access: true,
            advanced_reporting: plan_type !== 'basic'
          },
          contact: {
            phone: phone_number,
            address: address
          }
        },
        features: {
          dashboard: true,
          reports: true,
          api_access: true,
          bulk_upload: plan_type !== 'basic'
        },
        commission_split: 20,
        pay_period: 'monthly',
        pay_day: 1,
        participate_global_leaderboard: true,
        is_demo: false,
        created_at: new Date().toISOString()
      }])
      .select('*')
      .single();

    if (agencyError) {
      console.error('Error creating agency:', agencyError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create agency: ' + agencyError.message
      });
    }

    // Success response - Agency created without auto-creating users
    return res.status(201).json({
      success: true,
      message: `Agency "${name}" created successfully`,
      data: {
        agency: {
          id: newAgency.id,
          name: newAgency.name,
          code: newAgency.code,
          admin_email: newAgency.admin_email,
          plan_type: newAgency.settings?.plan || 'basic',
          phone_number: newAgency.settings?.contact?.phone,
          address: newAgency.settings?.contact?.address,
          is_active: newAgency.is_active,
          created_at: newAgency.created_at,
          max_users: newAgency.settings?.features?.max_users
        }
      }
    });

  } catch (error) {
    console.error('Error in create-agency:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error: ' + error.message
    });
  }
}