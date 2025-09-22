import { createClient } from '@supabase/supabase-js';
import { getUserContext } from './utils/auth-helper.js';


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const { agentId: queryAgentId } = req.query;
  
  try {
    const { agencyId, agentId, role, email } = getUserContext(req);
    const targetAgentId = queryAgentId || agentId;
    
    console.log('Commissions API called for agent:', targetAgentId);

    // Query portal_commissions table with role-based filtering and demo isolation
    let query = supabase.from('portal_commissions');
    
    // Implement demo/production data isolation
    if (isDemo) {
      // Demo users only see demo data (DEMO_SALE_* pattern)
      query = query.like('sale_id', 'DEMO_SALE_%');
    } else {
      // Production users only see real data (exclude DEMO_SALE_* pattern)
      query = query.not('sale_id', 'like', 'DEMO_SALE_%');
    }
    
    if (role === 'agent') {
      query = query.eq('agent_id', agentId);
    } else if (role === 'manager') {
      query = query.eq('agency_id', agencyId);
      if (queryAgentId) {
        query = query.eq('agent_id', queryAgentId);
      }
    }
    // admin role has universal access - no filtering needed
    
    const { data: commissions, error } = await query
      .select('*')
      .order('created_at', { ascending: false });

    let formattedCommissions = [];

    if (error && !error.message.includes('does not exist')) {
      throw error;
    }

    if (!commissions || commissions.length === 0) {
      // Return empty array for production users - no fake data
      console.log('No commission data found - returning empty result');
      formattedCommissions = [];
    } else {
      // Format real data from database
      formattedCommissions = commissions.map(comm => ({
        saleId: comm.sale_id,
        amount: comm.commission_amount,
        status: comm.status,
        productName: comm.product_name,
        premium: comm.premium_amount,
        customerName: comm.customer_name,
        saleDate: comm.sale_date,
        paymentDate: comm.payment_date
      }));
    }

    console.log('Returning commissions data:', formattedCommissions.length, 'records');
    res.status(200).json(formattedCommissions);
    
  } catch (error) {
    console.error('Commissions API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch commissions', 
      details: error.message 
    });
  }
}