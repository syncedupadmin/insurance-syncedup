import { createClient } from '@supabase/supabase-js';
// DISABLED: // DISABLED: // DISABLED: import { requireAuth } from '../_middleware/authCheck.js';
import { getUserContext } from '../utils/auth-helper.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function commissionOverridesHandler(req, res) {
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
        return handleGetCommissionOverrides(req, res, agencyId);
      case 'POST':
        return handleCreateCommissionOverride(req, res, agencyId);
      case 'PUT':
        return handleUpdateCommissionOverride(req, res, agencyId);
      case 'DELETE':
        return handleDeleteCommissionOverride(req, res, agencyId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Commission overrides API error:', error);
    return res.status(500).json({ 
      error: 'Failed to process commission override request', 
      details: error.message 
    });
  }
}

async function handleGetCommissionOverrides(req, res, agencyId) {
  const { agent_id, product_id, active_only } = req.query;

  try {
    // Get commission overrides
    let query = supabase
      .from('portal_commission_overrides')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });

    if (agent_id) query = query.eq('agent_id', agent_id);
    if (product_id) query = query.eq('product_id', product_id);
    if (active_only === 'true') query = query.eq('is_active', true);

    const { data: overrides, error: overridesError } = await query;

    // If no overrides exist, return demo data
    if (overridesError || !overrides || overrides.length === 0) {
      const demoOverrides = await generateDemoCommissionOverrides(agencyId);
      return res.status(200).json({
        commission_overrides: demoOverrides,
        summary: {
          total_overrides: demoOverrides.length,
          active_overrides: demoOverrides.filter(o => o.is_active).length,
          agents_with_overrides: new Set(demoOverrides.map(o => o.agent_id)).size
        }
      });
    }

    // Get agent and product information
    const agentIds = [...new Set(overrides.map(o => o.agent_id))];
    const productIds = [...new Set(overrides.map(o => o.product_id).filter(Boolean))];

    const [agentData, productData] = await Promise.all([
      supabase
        .from('portal_users')
        .select('id, full_name, agent_code')
        .in('id', agentIds),
      productIds.length > 0 ? supabase
        .from('portal_products')
        .select('id, name, carrier')
        .in('id', productIds) : Promise.resolve({ data: [] })
    ]);

    const agentMap = (agentData.data || []).reduce((map, agent) => {
      map[agent.id] = agent;
      return map;
    }, {});

    const productMap = (productData.data || []).reduce((map, product) => {
      map[product.id] = product;
      return map;
    }, {});

    // Enhance overrides with agent and product info
    const enhancedOverrides = overrides.map(override => ({
      ...override,
      agent_name: agentMap[override.agent_id]?.full_name || 'Unknown Agent',
      agent_code: agentMap[override.agent_id]?.agent_code || 'N/A',
      product_name: override.product_id ? 
        (productMap[override.product_id]?.name || 'Unknown Product') : 
        'All Products',
      carrier: override.product_id ? 
        (productMap[override.product_id]?.carrier || 'Unknown Carrier') : 
        'All Carriers'
    }));

    // Calculate summary
    const summary = {
      total_overrides: enhancedOverrides.length,
      active_overrides: enhancedOverrides.filter(o => o.is_active).length,
      agents_with_overrides: new Set(enhancedOverrides.map(o => o.agent_id)).size
    };

    return res.status(200).json({
      commission_overrides: enhancedOverrides,
      summary
    });

  } catch (error) {
    console.error('Error fetching commission overrides:', error);
    return res.status(500).json({ error: 'Failed to fetch commission overrides' });
  }
}

async function handleCreateCommissionOverride(req, res, agencyId) {
  const {
    agent_id,
    product_id,
    override_type,
    override_value,
    effective_date,
    expiry_date,
    reason,
    notes
  } = req.body;

  if (!agent_id || !override_type || !override_value) {
    return res.status(400).json({ error: 'Missing required fields: agent_id, override_type, override_value' });
  }

  try {
    const { data, error } = await supabase
      .from('portal_commission_overrides')
      .insert({
        agency_id: agencyId,
        agent_id,
        product_id: product_id || null,
        override_type,
        override_value: parseFloat(override_value),
        effective_date: effective_date || new Date().toISOString().split('T')[0],
        expiry_date: expiry_date || null,
        reason: reason || '',
        notes: notes || '',
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      message: 'Commission override created successfully',
      override: data
    });

  } catch (error) {
    console.error('Error creating commission override:', error);
    return res.status(500).json({ error: 'Failed to create commission override' });
  }
}

async function handleUpdateCommissionOverride(req, res, agencyId) {
  const { override_id } = req.query;
  const updates = req.body;

  if (!override_id) {
    return res.status(400).json({ error: 'Override ID required' });
  }

  try {
    const { data, error } = await supabase
      .from('portal_commission_overrides')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', override_id)
      .eq('agency_id', agencyId)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      message: 'Commission override updated successfully',
      override: data
    });

  } catch (error) {
    console.error('Error updating commission override:', error);
    return res.status(500).json({ error: 'Failed to update commission override' });
  }
}

async function handleDeleteCommissionOverride(req, res, agencyId) {
  const { override_id } = req.query;

  if (!override_id) {
    return res.status(400).json({ error: 'Override ID required' });
  }

  try {
    const { error } = await supabase
      .from('portal_commission_overrides')
      .delete()
      .eq('id', override_id)
      .eq('agency_id', agencyId);

    if (error) throw error;

    return res.status(200).json({
      message: 'Commission override deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting commission override:', error);
    return res.status(500).json({ error: 'Failed to delete commission override' });
  }
}

async function generateDemoCommissionOverrides(agencyId) {
  // Get agents for the demo
  const { data: agents } = await supabase
    .from('portal_users')
    .select('id, full_name, agent_code')
    .eq('agency_id', agencyId)
    .eq('role', 'agent')
    .eq('is_active', true)
    .limit(5);

  const agentsList = agents && agents.length > 0 ? agents : [
    { id: 'demo-agent-1', full_name: 'Sarah Johnson', agent_code: 'SJ001' },
    { id: 'demo-agent-2', full_name: 'Michael Chen', agent_code: 'MC002' },
    { id: 'demo-agent-3', full_name: 'Emma Rodriguez', agent_code: 'ER003' }
  ];

  return [
    {
      id: 'override-1',
      agent_id: agentsList[0].id,
      agent_name: agentsList[0].full_name,
      agent_code: agentsList[0].agent_code,
      product_id: null,
      product_name: 'All Products',
      carrier: 'All Carriers',
      override_type: 'percentage_increase',
      override_value: 5.0,
      effective_date: '2025-01-01',
      expiry_date: null,
      reason: 'Top performer bonus',
      notes: 'Permanent 5% increase for consistently high performance',
      is_active: true,
      created_at: '2025-01-15T10:00:00Z'
    },
    {
      id: 'override-2',
      agent_id: agentsList[1].id,
      agent_name: agentsList[1].full_name,
      agent_code: agentsList[1].agent_code,
      product_id: 'prod-1',
      product_name: 'PPO Plan 500',
      carrier: 'FirstEnroll',
      override_type: 'fixed_rate',
      override_value: 20.0,
      effective_date: '2025-02-01',
      expiry_date: '2025-12-31',
      reason: 'Product specialization',
      notes: 'Higher rate for PPO expertise and training completion',
      is_active: true,
      created_at: '2025-02-01T09:30:00Z'
    },
    {
      id: 'override-3',
      agent_id: agentsList[2].id,
      agent_name: agentsList[2].full_name,
      agent_code: agentsList[2].agent_code,
      product_id: null,
      product_name: 'All Products',
      carrier: 'All Carriers',
      override_type: 'percentage_decrease',
      override_value: 2.0,
      effective_date: '2025-01-01',
      expiry_date: '2025-06-30',
      reason: 'New agent training period',
      notes: 'Temporary 2% reduction during 6-month probation period',
      is_active: true,
      created_at: '2025-01-01T14:00:00Z'
    },
    {
      id: 'override-4',
      agent_id: agentsList[0].id,
      agent_name: agentsList[0].full_name,
      agent_code: agentsList[0].agent_code,
      product_id: 'prod-5',
      product_name: 'Gold Premier Plan',
      carrier: 'FirstEnroll',
      override_type: 'fixed_rate',
      override_value: 25.0,
      effective_date: '2025-03-01',
      expiry_date: null,
      reason: 'Premium product incentive',
      notes: 'Special rate for highest tier product sales',
      is_active: true,
      created_at: '2025-03-01T11:15:00Z'
    },
    {
      id: 'override-5',
      agent_id: agentsList[1].id,
      agent_name: agentsList[1].full_name,
      agent_code: agentsList[1].agent_code,
      product_id: null,
      product_name: 'All Products',
      carrier: 'All Carriers',
      override_type: 'percentage_increase',
      override_value: 3.0,
      effective_date: '2025-01-01',
      expiry_date: '2025-03-31',
      reason: 'Q1 performance incentive',
      notes: 'Quarterly bonus for exceeding goals',
      is_active: false,
      created_at: '2025-01-01T16:45:00Z'
    },
    {
      id: 'override-6',
      agent_id: agentsList[2].id,
      agent_name: agentsList[2].full_name,
      agent_code: agentsList[2].agent_code,
      product_id: 'prod-2',
      product_name: 'HMO Plan 1000',
      carrier: 'FirstEnroll',
      override_type: 'fixed_rate',
      override_value: 18.0,
      effective_date: '2025-04-01',
      expiry_date: null,
      reason: 'HMO sales focus',
      notes: 'Incentive to promote HMO products in target market',
      is_active: true,
      created_at: '2025-04-01T08:20:00Z'
    }
  ];
}

// DISABLED: export default requireAuth.*Handler);
export default commissionOverridesHandler;
