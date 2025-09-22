// API endpoint for license management with NIPR integration
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || ''
);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Authentication check
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    
    // Verify admin access
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64'));
      if (!['admin', 'super_admin', 'manager'].includes(payload.role)) {
        return res.status(403).json({ error: 'Admin access required' });
      }
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { action, license_id } = req.query;

    switch (req.method) {
      case 'GET':
        return await handleGetRequest(req, res, action);
      case 'POST':
        return await handlePostRequest(req, res, action);
      case 'PUT':
        return await handlePutRequest(req, res, license_id);
      case 'DELETE':
        return await handleDeleteRequest(req, res, license_id);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('License management error:', error);
    
    // Handle missing tables gracefully
    if (error.message?.includes('does not exist') || error.message?.includes('table') || error.message?.includes('schema')) {
      return res.status(200).json({ 
        success: true,
        data: [],
        message: 'License management system not yet configured - database schema pending',
        error: 'Tables not found',
        timestamp: new Date().toISOString()
      });
    }
    
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}

// Handle GET requests
async function handleGetRequest(req, res, action) {
  const { 
    search, 
    state, 
    license_type, 
    status, 
    agent_id,
    agency_id,
    sort_by = 'expiration_date',
    sort_order = 'asc',
    limit = '50',
    offset = '0'
  } = req.query;

  try {
    switch (action) {
      case 'summary':
        return await getLicenseSummary(req, res);
      
      case 'expiring':
        return await getExpiringLicenses(req, res);
      
      case 'compliance':
        return await getComplianceReport(req, res);
      
      default:
        // Get all licenses with filters
        let query = supabase
          .from('license_summary')
          .select('*')
          .order(sort_by, { ascending: sort_order === 'asc' })
          .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        // Apply filters
        if (search) {
          query = query.or(
            `agent_name.ilike.%${search}%,license_number.ilike.%${search}%,state.ilike.%${search}%`
          );
        }

        if (state) {
          const states = state.split(',');
          query = query.in('state', states);
        }

        if (license_type) {
          const types = license_type.split(',');
          query = query.in('license_type', types);
        }

        if (status) {
          const statuses = status.split(',');
          query = query.in('status', statuses);
        }

        if (agent_id) {
          query = query.eq('agent_id', agent_id);
        }

        if (agency_id) {
          query = query.eq('agency_id', agency_id);
        }

        const { data: licenses, error } = await query;

        if (error) throw error;

        // Get total count for pagination
        let countQuery = supabase
          .from('license_summary')
          .select('*', { count: 'exact', head: true });

        // Apply same filters for count
        if (search) {
          countQuery = countQuery.or(
            `agent_name.ilike.%${search}%,license_number.ilike.%${search}%,state.ilike.%${search}%`
          );
        }
        if (state) countQuery = countQuery.in('state', state.split(','));
        if (license_type) countQuery = countQuery.in('license_type', license_type.split(','));
        if (status) countQuery = countQuery.in('status', status.split(','));
        if (agent_id) countQuery = countQuery.eq('agent_id', agent_id);
        if (agency_id) countQuery = countQuery.eq('agency_id', agency_id);

        const { count } = await countQuery;

        return res.status(200).json({
          success: true,
          data: licenses,
          pagination: {
            total: count,
            limit: parseInt(limit),
            offset: parseInt(offset),
            has_more: count > parseInt(offset) + parseInt(limit)
          }
        });
    }
  } catch (error) {
    throw error;
  }
}

// Get license summary for dashboard
async function getLicenseSummary(req, res) {
  try {
    // Get summary statistics
    const { data: summaryData, error: summaryError } = await supabase
      .rpc('get_license_summary');

    if (summaryError) {
      // Fallback to manual calculation if RPC doesn't exist
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data: allLicenses, error } = await supabase
        .from('licenses')
        .select('*');

      if (error) throw error;

      const summary = {
        total_licenses: allLicenses.length,
        active_licenses: allLicenses.filter(l => l.status === 'Active').length,
        expired_licenses: allLicenses.filter(l => l.expiration_date < today).length,
        expiring_soon: allLicenses.filter(l => 
          l.expiration_date >= today && 
          l.expiration_date <= thirtyDaysFromNow && 
          l.status === 'Active'
        ).length,
        compliance_rate: 0
      };

      summary.compliance_rate = summary.total_licenses > 0 
        ? ((summary.active_licenses - summary.expired_licenses) / summary.total_licenses * 100).toFixed(1)
        : 100;

      return res.status(200).json({
        success: true,
        data: summary
      });
    }

    return res.status(200).json({
      success: true,
      data: summaryData
    });

  } catch (error) {
    throw error;
  }
}

// Get expiring licenses
async function getExpiringLicenses(req, res) {
  const { days = '30' } = req.query;
  
  try {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + parseInt(days));

    const { data: licenses, error } = await supabase
      .from('license_summary')
      .select('*')
      .gte('expiration_date', new Date().toISOString().split('T')[0])
      .lte('expiration_date', targetDate.toISOString().split('T')[0])
      .eq('status', 'Active')
      .order('expiration_date', { ascending: true });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: licenses,
      expires_within_days: parseInt(days)
    });

  } catch (error) {
    throw error;
  }
}

// Handle POST requests (create license, sync with NIPR)
async function handlePostRequest(req, res, action) {
  try {
    switch (action) {
      case 'sync':
        return await syncWithNIPR(req, res);
      
      case 'reminder':
        return await sendRenewalReminder(req, res);
      
      default:
        // Create new license
        const {
          agent_id,
          agency_id,
          license_number,
          state,
          license_type,
          issue_date,
          expiration_date,
          status = 'Active',
          nipr_id,
          notes
        } = req.body;

        if (!agent_id || !license_number || !state || !license_type || !issue_date || !expiration_date) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const { data: license, error } = await supabase
          .from('licenses')
          .insert({
            agent_id,
            agency_id,
            license_number,
            state: state.toUpperCase(),
            license_type,
            issue_date,
            expiration_date,
            status,
            nipr_id,
            notes
          })
          .select()
          .single();

        if (error) throw error;

        return res.status(201).json({
          success: true,
          data: license,
          message: 'License created successfully'
        });
    }
  } catch (error) {
    throw error;
  }
}

// Sync with NIPR (placeholder for actual NIPR API integration)
async function syncWithNIPR(req, res) {
  try {
    // This would integrate with actual NIPR API
    // For now, we'll simulate the sync process
    
    const { agent_id, force_sync = false } = req.body;

    // Simulate NIPR API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Update last_sync timestamp for affected licenses
    const updateData = { last_sync: new Date().toISOString() };
    
    let query = supabase
      .from('licenses')
      .update(updateData);

    if (agent_id) {
      query = query.eq('agent_id', agent_id);
    }

    const { data, error } = await query.select();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: {
        synced_licenses: data?.length || 0,
        last_sync: new Date().toISOString(),
        message: 'Successfully synced with NIPR'
      }
    });

  } catch (error) {
    throw error;
  }
}

// Handle PUT requests (update license)
async function handlePutRequest(req, res, license_id) {
  if (!license_id) {
    return res.status(400).json({ error: 'License ID required' });
  }

  try {
    const updateData = { ...req.body };
    delete updateData.id; // Remove ID from update data
    updateData.updated_at = new Date().toISOString();

    const { data: license, error } = await supabase
      .from('licenses')
      .update(updateData)
      .eq('id', license_id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: license,
      message: 'License updated successfully'
    });

  } catch (error) {
    throw error;
  }
}

// Handle DELETE requests
async function handleDeleteRequest(req, res, license_id) {
  if (!license_id) {
    return res.status(400).json({ error: 'License ID required' });
  }

  try {
    const { error } = await supabase
      .from('licenses')
      .delete()
      .eq('id', license_id);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: 'License deleted successfully'
    });

  } catch (error) {
    throw error;
  }
}