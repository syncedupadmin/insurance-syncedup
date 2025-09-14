// Commission Sync API - Creates commission records from sales
// PRODUCTION CRITICAL: Ensures all sales have corresponding commission tracking

import { createClient } from '@supabase/supabase-js';
import { setCORSHeaders, handleCORSPreflight } from '../_utils/cors.js';
import { validateUserContext, logSecurityViolation } from '../_utils/agency-isolation.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Handle CORS preflight  
  if (handleCORSPreflight(req, res)) return;
  
  // Set secure CORS headers
  setCORSHeaders(req, res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate user has admin access
    const userContext = validateUserContext(req);
    if (!['super_admin', 'admin'].includes(userContext.role)) {
      logSecurityViolation(req, 'UNAUTHORIZED_COMMISSION_SYNC', { 
        role: userContext.role,
        agency: userContext.agencyId 
      });
      return res.status(403).json({ error: 'Admin access required' });
    }

    console.log(`Commission sync initiated by ${userContext.email} (${userContext.role})`);

    // Step 1: Get sales without commission records
    const { data: salesWithoutCommissions, error: salesError } = await supabase
      .from('portal_sales')
      .select(`
        id,
        agent_id,
        agency_id,
        customer_name,
        product_name,
        premium,
        commission_rate,
        commission_amount,
        sale_date,
        status,
        policy_number,
        carrier,
        created_at,
        portal_users(name, email)
      `)
      .gt('commission_amount', 0)
      .not('id', 'in', `(SELECT sale_id FROM commissions WHERE sale_id IS NOT NULL)`);

    if (salesError) {
      console.error('Error fetching sales:', salesError);
      return res.status(500).json({ error: 'Failed to fetch sales data' });
    }

    if (!salesWithoutCommissions || salesWithoutCommissions.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'All sales already have commission records',
        created: 0,
        total_commission: 0
      });
    }

    // Step 2: Create commission records
    const commissionsToCreate = salesWithoutCommissions.map(sale => ({
      sale_id: sale.id,
      agent_id: sale.agent_id,
      agency_id: sale.agency_id,
      commission_rate: sale.commission_rate,
      commission_amount: sale.commission_amount,
      base_amount: sale.premium,
      commission_type: 'initial',
      payment_status: sale.status === 'active' ? 'pending' : 'cancelled',
      product_name: sale.product_name,
      carrier: sale.carrier,
      policy_number: sale.policy_number,
      payment_period: new Date(sale.sale_date).toISOString().substr(0, 7), // YYYY-MM
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { data: createdCommissions, error: commissionError } = await supabase
      .from('commissions')
      .insert(commissionsToCreate)
      .select();

    if (commissionError) {
      console.error('Error creating commissions:', commissionError);
      return res.status(500).json({ error: 'Failed to create commission records' });
    }

    // Step 3: Calculate totals
    const totalCommission = commissionsToCreate.reduce((sum, comm) => sum + (comm.commission_amount || 0), 0);
    const createdCount = createdCommissions?.length || 0;

    // Step 4: Log the sync action
    await supabase.from('audit_logs').insert({
      user_id: userContext.userId,
      agency_id: userContext.agencyId,
      action: 'COMMISSION_SYNC',
      resource_type: 'commissions',
      details: `Created ${createdCount} commission records totaling $${totalCommission.toFixed(2)}`,
      metadata: {
        created_count: createdCount,
        total_commission: totalCommission,
        initiated_by: userContext.email
      },
      timestamp: new Date().toISOString()
    });

    console.log(`Commission sync completed: ${createdCount} records created, $${totalCommission.toFixed(2)} total`);

    return res.status(200).json({
      success: true,
      message: `Successfully created ${createdCount} commission records`,
      created: createdCount,
      total_commission: totalCommission,
      commissions: createdCommissions
    });

  } catch (error) {
    console.error('Commission sync error:', error);
    return res.status(500).json({ 
      error: 'Commission sync failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}