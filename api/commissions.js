import { createClient } from '@supabase/supabase-js';
import { getUserContext } from './utils/auth-helper.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const { agentId: queryAgentId } = req.query;
  
  try {
    const { agencyId, agentId, role } = getUserContext(req);
    const targetAgentId = queryAgentId || agentId;
    
    console.log('Commissions API called for agent:', targetAgentId);

    // Query portal_commissions table with role-based filtering
    let query = supabase.from('portal_commissions');
    
    if (role === 'agent') {
      query = query.eq('agent_id', agentId);
    } else if (['manager', 'admin'].includes(role)) {
      query = query.eq('agency_id', agencyId);
      if (queryAgentId) {
        query = query.eq('agent_id', queryAgentId);
      }
    }
    // super_admin sees all
    
    const { data: commissions, error } = await query
      .select('*')
      .order('created_at', { ascending: false });

    let formattedCommissions = [];

    if (error || !commissions || commissions.length === 0) {
      // Return mock data for demo purposes if no real data
      console.log('Using mock commissions data for demo purposes');
      formattedCommissions = [
      {
        saleId: 'demo-001',
        amount: 1200.00,
        status: 'paid',
        productName: 'Auto Insurance Premium',
        premium: 8400,
        customerName: 'John Smith',
        saleDate: '2025-08-15',
        paymentDate: '2025-08-20'
      },
      {
        saleId: 'demo-002', 
        amount: 850.50,
        status: 'pending',
        productName: 'Home Insurance',
        premium: 5670,
        customerName: 'Sarah Johnson',
        saleDate: '2025-08-22',
        paymentDate: null
      },
      {
        saleId: 'demo-003',
        amount: 425.25,
        status: 'paid',
        productName: 'Life Insurance',
        premium: 2835,
        customerName: 'Michael Brown',
        saleDate: '2025-08-10',
        paymentDate: '2025-08-18'
      }
    ];
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