import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || ''
);

export default async function handler(req, res) {
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

    const { recent, limit = '10' } = req.query;

    if (req.method === 'GET') {
      // Get leads from database - REAL DATA ONLY
      let query = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

      if (recent === 'true') {
        // Get leads from last 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', sevenDaysAgo);
      }

      const { data: leads, error } = await query;

      if (error && !error.message.includes('does not exist')) {
        console.error('Leads query error:', error);
        return res.status(500).json({ 
          error: 'Database error',
          message: error.message
        });
      }

      // Return REAL data or empty array if table doesn't exist
      return res.status(200).json({
        success: true,
        data: leads || [],
        count: leads?.length || 0,
        source: 'database'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
      case 'POST':
        return handleCreateLead(req, res, agencyId);
      case 'PUT':
        return handleUpdateLead(req, res, agencyId);
      case 'DELETE':
        return handleDeleteLead(req, res, agencyId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Leads API error:', error);
    return res.status(500).json({ 
      error: 'Failed to process leads request', 
      details: error.message 
    });
  }
}

async function handleGetLeads(req, res, agencyId) {
  const { 
    recent, 
    limit = 50, 
    status_filter, 
    agent_id, 
    source_filter,
    start_date,
    end_date 
  } = req.query;

  try {
    // Query REAL leads table - NO MOCK DATA
    let query = supabase
      .from('leads')
      .select(`
        id,
        first_name,
        last_name,
        name,
        email,
        phone,
        insurance_type,
        status,
        source,
        agent_id,
        created_at,
        updated_at,
        notes,
        estimated_premium,
        agency_id
      `)
      .eq('agency_id', agencyId);

    // Apply filters
    if (status_filter) query = query.eq('status', status_filter);
    if (agent_id) query = query.eq('agent_id', agent_id);
    if (source_filter) query = query.eq('source', source_filter);
    if (start_date) query = query.gte('created_at', start_date);
    if (end_date) query = query.lte('created_at', end_date);

    // Apply ordering
    if (recent === 'true') {
      query = query.order('created_at', { ascending: false });
    } else {
      query = query.order('updated_at', { ascending: false });
    }

    // Apply limit
    query = query.limit(parseInt(limit));

    const { data: leads, error: leadsError } = await query;

    if (leadsError) {
      console.error('Database query error:', leadsError);
      return res.status(500).json({ 
        error: 'Failed to fetch leads from database',
        details: leadsError.message 
      });
    }

    // Get agent names for leads
    const agentIds = [...new Set(leads?.filter(l => l.agent_id).map(l => l.agent_id) || [])];
    let agentMap = {};
    
    if (agentIds.length > 0) {
      const { data: agents } = await supabase
        .from('portal_users')
        .select('id, full_name')
        .in('id', agentIds);

      agentMap = (agents || []).reduce((map, agent) => {
        map[agent.id] = agent.full_name;
        return map;
      }, {});
    }

    // Enhance leads data
    const enhancedLeads = (leads || []).map(lead => ({
      ...lead,
      agent_name: lead.agent_id ? agentMap[lead.agent_id] || 'Unassigned' : 'Unassigned',
      time_since_created: getTimeSinceCreated(lead.created_at),
      priority: calculateLeadPriority(lead)
    }));

    // Calculate REAL summary from database data
    const summary = {
      total_leads: enhancedLeads.length,
      new_leads: enhancedLeads.filter(l => l.status === 'new').length,
      contacted_leads: enhancedLeads.filter(l => l.status === 'contacted').length,
      qualified_leads: enhancedLeads.filter(l => l.status === 'qualified').length,
      converted_leads: enhancedLeads.filter(l => l.status === 'converted').length,
      lost_leads: enhancedLeads.filter(l => l.status === 'lost').length
    };

    return res.status(200).json({
      success: true,
      data: enhancedLeads,
      summary,
      pagination: {
        limit: parseInt(limit),
        has_more: enhancedLeads.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching leads:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch leads',
      details: error.message 
    });
  }
}

async function handleCreateLead(req, res, agencyId) {
  const {
    first_name,
    last_name,
    name,
    email,
    phone,
    insurance_type,
    source,
    notes,
    estimated_premium
  } = req.body;

  if (!email || !insurance_type) {
    return res.status(400).json({ 
      error: 'Missing required fields: email, insurance_type' 
    });
  }

  try {
    const { data, error } = await supabase
      .from('leads')
      .insert({
        agency_id: agencyId,
        first_name,
        last_name,
        name: name || `${first_name || ''} ${last_name || ''}`.trim(),
        email: email.toLowerCase(),
        phone: phone || '',
        insurance_type,
        source: source || 'Manual Entry',
        status: 'new',
        notes: notes || '',
        estimated_premium: estimated_premium || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Database insert error:', error);
      return res.status(500).json({ 
        error: 'Failed to create lead',
        details: error.message 
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      data: data
    });

  } catch (error) {
    console.error('Error creating lead:', error);
    return res.status(500).json({ 
      error: 'Failed to create lead',
      details: error.message 
    });
  }
}

async function handleUpdateLead(req, res, agencyId) {
  const { lead_id } = req.query;
  const updates = req.body;

  if (!lead_id) {
    return res.status(400).json({ error: 'Lead ID required' });
  }

  try {
    const { data, error } = await supabase
      .from('leads')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', lead_id)
      .eq('agency_id', agencyId)
      .select()
      .single();

    if (error) {
      console.error('Database update error:', error);
      return res.status(500).json({ 
        error: 'Failed to update lead',
        details: error.message 
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Lead updated successfully',
      data: data
    });

  } catch (error) {
    console.error('Error updating lead:', error);
    return res.status(500).json({ 
      error: 'Failed to update lead',
      details: error.message 
    });
  }
}

async function handleDeleteLead(req, res, agencyId) {
  const { lead_id } = req.query;

  if (!lead_id) {
    return res.status(400).json({ error: 'Lead ID required' });
  }

  try {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', lead_id)
      .eq('agency_id', agencyId);

    if (error) {
      console.error('Database delete error:', error);
      return res.status(500).json({ 
        error: 'Failed to delete lead',
        details: error.message 
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Lead deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting lead:', error);
    return res.status(500).json({ 
      error: 'Failed to delete lead',
      details: error.message 
    });
  }
}

// Helper functions
function getTimeSinceCreated(createdAt) {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now - created;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return created.toLocaleDateString();
}

function calculateLeadPriority(lead) {
  const hoursSinceCreated = (new Date() - new Date(lead.created_at)) / (1000 * 60 * 60);
  const premium = parseFloat(lead.estimated_premium) || 0;
  
  // High priority: Recent leads with high premium
  if (hoursSinceCreated < 2 || premium > 2000) return 'high';
  if (hoursSinceCreated < 8 || premium > 1000) return 'medium';
  return 'low';
}

export default requireAuth(['admin', 'manager'])(leadsHandler);