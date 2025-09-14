import { createClient } from '@supabase/supabase-js';
// DISABLED: // DISABLED: import { requireAuth } from './_middleware/authCheck.js';
import { getUserContext, applyDataIsolation } from './utils/auth-helper.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function salesHandler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || 'https://insurance.syncedupsolutions.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const userContext = getUserContext(req);
    console.log(`🔐 Sales API access: ${userContext.role} (${userContext.email})`);

    if (req.method === 'GET') {
      return await handleGetSales(req, res, userContext);
    }
    
    if (req.method === 'POST') {
      return await handleCreateSale(req, res, userContext);
    }
    
    if (req.method === 'PUT') {
      return await handleUpdateSale(req, res, userContext);
    }
    
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Sales API error:', error);
    if (error.message.includes('Authentication failed')) {
      res.status(401).json({ error: 'Authentication required' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

// GET /api/sales - Retrieve sales data with proper data isolation
async function handleGetSales(req, res, userContext) {
  try {
    const { 
      agent_id: queryAgentId, 
      date_from, 
      date_to, 
      status,
      limit = 50,
      offset = 0 
    } = req.query;

    // Build base query 
    let query = supabase.from('portal_sales').select('*');

    // Apply data isolation based on user role and agency
    query = applyDataIsolation(query, userContext);

    // Additional filtering for specific agent (if user has permission)
    if (queryAgentId && ['super_admin', 'admin', 'manager'].includes(userContext.role)) {
      query = query.eq('agent_id', queryAgentId);
    }

    // Date filtering
    if (date_from) {
      query = query.gte('sale_date', date_from);
    }
    if (date_to) {
      query = query.lte('sale_date', date_to);
    }

    // Status filtering
    if (status) {
      query = query.eq('status', status);
    }

    // Pagination and ordering
    query = query
      .order('sale_date', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data: sales, error } = await query;

    if (error) {
      throw error;
    }

    // Get commission data for these sales
    const saleIds = sales?.map(s => s.id) || [];
    let commissions = [];
    
    if (saleIds.length > 0) {
      const { data: commissionsData } = await supabase
        .from('portal_commissions')
        .select('*')
        .in('sale_id', saleIds);
      
      commissions = commissionsData || [];
    }

    // Combine sales with commission data
    const salesWithCommissions = sales?.map(sale => ({
      ...sale,
      commission: commissions.find(c => c.sale_id === sale.id) || null
    })) || [];

    // Calculate totals
    const totals = {
      totalSales: sales?.length || 0,
      totalPremium: sales?.reduce((sum, sale) => sum + (parseFloat(sale.premium) || 0), 0) || 0,
      totalCommissions: commissions.reduce((sum, comm) => sum + (parseFloat(comm.commission_amount) || 0), 0)
    };

    res.status(200).json({
      sales: salesWithCommissions,
      totals,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: sales?.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({ error: 'Failed to fetch sales data' });
  }
}

// POST /api/sales - Create new sale with automatic commission calculation
async function handleCreateSale(req, res, agencyId, agentId) {
  try {
    console.log('Creating sale with body:', req.body);

    // Handle both old and new request formats
    const body = req.body;
    
    // Legacy format support
    if (body.customerName && body.productId && body.premium) {
      const legacySaleData = {
        customer_name: body.customerName,
        agent_id: body.agentId || agentId,
        agency_id: agencyId,
        product_id: body.productId,
        premium: parseFloat(body.premium),
        monthly_recurring: parseFloat(body.monthlyRecurring || body.premium),
        enrollment_fee: parseFloat(body.enrollmentFee || 0),
        first_month_total: parseFloat(body.premium),
        sale_date: new Date().toISOString().split('T')[0],
        customer_email: body.customerEmail || null,
        customer_phone: body.customerPhone || null,
        status: 'active',
        created_at: new Date().toISOString()
      };

      // Get product info for commission calculation
      const productData = await getProductInfo(body.productId);
      if (!productData) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Calculate commission
      const commissionAmount = await calculateCommissionForSale(
        parseFloat(body.premium),
        productData,
        agencyId
      );

      // Insert sale
      const { data: sale, error: saleError } = await supabase
        .from('portal_sales')
        .insert([legacySaleData])
        .select()
        .single();

      if (saleError) {
        console.error('Sale creation error:', saleError);
        return res.status(500).json({ error: 'Database error: ' + saleError.message });
      }

      // Create commission record
      await createCommissionRecord(sale, productData, commissionAmount, agentId, agencyId);

      return res.status(201).json({
        sale,
        commission: commissionAmount,
        message: 'Sale created successfully with commission calculation'
      });
    }

    // New format with structured data
    const {
      productId,
      customerInfo,
      saleDetails,
      quoteNumber
    } = body;

    if (!productId || !customerInfo || !saleDetails) {
      return res.status(400).json({ 
        error: 'Missing required fields: productId, customerInfo, saleDetails' 
      });
    }

    const productData = await getProductInfo(productId);
    if (!productData) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const commissionAmount = await calculateCommissionForSale(
      parseFloat(saleDetails.premium),
      productData,
      agencyId
    );

    const saleId = generateSaleId();
    
    const saleData = {
      id: saleId,
      agent_id: agentId,
      agency_id: agencyId,
      product_id: productId,
      quote_id: quoteNumber || null,
      customer_name: customerInfo.name,
      customer_email: customerInfo.email,
      customer_phone: customerInfo.phone || null,
      customer_address: customerInfo.address || null,
      product_name: productData.name,
      carrier: productData.carrier,
      premium: parseFloat(saleDetails.premium),
      monthly_recurring: parseFloat(saleDetails.premium),
      policy_number: saleDetails.policyNumber || generatePolicyNumber(),
      sale_date: saleDetails.saleDate || new Date().toISOString().split('T')[0],
      effective_date: saleDetails.effectiveDate || getNextMonthFirst(),
      status: 'active',
      payment_method: saleDetails.paymentMethod || 'monthly',
      created_at: new Date().toISOString()
    };

    const { data: createdSale, error: saleError } = await supabase
      .from('portal_sales')
      .insert(saleData)
      .select()
      .single();

    if (saleError) {
      throw saleError;
    }

    await createCommissionRecord(createdSale, productData, commissionAmount, agentId, agencyId);

    res.status(201).json({
      sale: createdSale,
      calculatedCommission: commissionAmount,
      message: 'Sale created successfully with automatic commission calculation'
    });

  } catch (error) {
    console.error('Create sale error:', error);
    res.status(500).json({ 
      error: 'Failed to create sale', 
      details: error.message 
    });
  }
}

// PUT /api/sales - Update existing sale
async function handleUpdateSale(req, res, agencyId, agentId, role) {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Sale ID is required' });
    }

    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }

    // Check permissions
    let query = supabase.from('portal_sales').select('*').eq('id', id);
    
    if (role === 'agent') {
      query = query.eq('agent_id', agentId);
    } else if (role === 'manager') {
      query = query.eq('agency_id', agencyId);
    }
    // admin role has universal access - no filtering needed

    const { data: existingSale, error: fetchError } = await query.single();

    if (fetchError || !existingSale) {
      return res.status(404).json({ error: 'Sale not found or access denied' });
    }

    const { data: updatedSale, error: updateError } = await supabase
      .from('portal_sales')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    res.status(200).json({
      sale: updatedSale,
      message: 'Sale updated successfully'
    });

  } catch (error) {
    console.error('Update sale error:', error);
    res.status(500).json({ 
      error: 'Failed to update sale', 
      details: error.message 
    });
  }
}

// Helper functions
async function getProductInfo(productId) {
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (product) return product;

  // Fallback to demo products
  const demoProducts = getFirstEnrollDemoProducts();
  return demoProducts.find(p => p.id === productId);
}

async function calculateCommissionForSale(premium, product, agencyId) {
  // Get commission settings for the agency
  const { data: commissionSettings } = await supabase
    .from('commission_settings')
    .select('*')
    .limit(1);

  return calculateCommission(premium, product, commissionSettings?.[0]);
}

async function createCommissionRecord(sale, product, commissionAmount, agentId, agencyId) {
  const commissionData = {
    id: generateCommissionId(),
    sale_id: sale.id,
    agent_id: agentId,
    agency_id: agencyId,
    product_name: product.name,
    customer_name: sale.customer_name,
    premium_amount: parseFloat(sale.premium),
    commission_rate: product.commission_rate,
    commission_amount: commissionAmount,
    sale_date: sale.sale_date,
    status: 'pending',
    created_at: new Date().toISOString()
  };

  try {
    await supabase.from('portal_commissions').insert(commissionData);
  } catch (error) {
    console.warn('Failed to create commission record:', error);
  }
}

function calculateCommission(premium, product, commissionSettings = null) {
  if (!commissionSettings || !commissionSettings.structures) {
    return Math.round(premium * (product.commission_rate / 100) * 100) / 100;
  }

  const activeStructure = commissionSettings.structures[commissionSettings.active_structure];
  
  if (!activeStructure) {
    return Math.round(premium * (product.commission_rate / 100) * 100) / 100;
  }

  switch (activeStructure.type) {
    case 'percentage':
      return Math.round(premium * (activeStructure.rate / 100) * 100) / 100;
      
    case 'tiered':
      return calculateTieredCommission(premium, activeStructure.tiers);
      
    case 'product':
      const productRate = activeStructure.rates[product.product_type] || product.commission_rate;
      return Math.round(premium * (productRate / 100) * 100) / 100;
      
    case 'hybrid':
      if (premium >= activeStructure.bonus_threshold) {
        return Math.round(premium * (activeStructure.bonus_rate / 100) * 100) / 100;
      }
      return Math.round(premium * (activeStructure.base_rate / 100) * 100) / 100;
      
    default:
      return Math.round(premium * (product.commission_rate / 100) * 100) / 100;
  }
}

function calculateTieredCommission(premium, tiers) {
  let totalCommission = 0;
  let remainingPremium = premium;

  for (const tier of tiers) {
    if (remainingPremium <= 0) break;

    const tierMin = tier.min || 0;
    const tierMax = tier.max || Infinity;
    const tierRange = Math.min(tierMax - tierMin, remainingPremium);

    if (premium >= tierMin) {
      const tierCommission = tierRange * (tier.rate / 100);
      totalCommission += tierCommission;
      remainingPremium -= tierRange;
    }
  }

  return Math.round(totalCommission * 100) / 100;
}

function generateSaleId() {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SAL-${timestamp.slice(-8)}-${random}`;
}

function generateCommissionId() {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `COM-${timestamp.slice(-8)}-${random}`;
}

function generatePolicyNumber() {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `POL-${timestamp.slice(-6)}-${random}`;
}

function getNextMonthFirst() {
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  return nextMonth.toISOString().split('T')[0];
}

function getFirstEnrollDemoProducts() {
  return [
    {
      id: 'fe-ppo-500',
      name: 'PPO Plan 500',
      carrier: 'FirstEnroll',
      commission_rate: 30.0,
      product_type: 'health'
    },
    {
      id: 'fe-hmo-1000',
      name: 'HMO Plan 1000',
      carrier: 'FirstEnroll',
      commission_rate: 28.0,
      product_type: 'health'
    }
  ];
}

// DISABLED: export default requireAuth(['agent', 'admin', 'manager', 'super_admin', 'customer_service'])(salesHandler);export default salesHandler;
