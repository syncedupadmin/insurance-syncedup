import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const { agentId } = req.query;
  
  try {
    console.log('Commissions API called for agent:', agentId);

    let formattedCommissions = [];

    // Return mock data for demo purposes - avoid database queries for now
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