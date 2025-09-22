import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { memberId } = req.query;

    if (!memberId) {
      return res.status(400).json({ error: 'Member ID is required' });
    }

    // Get member profile
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select(`
        *,
        assigned_agent:users(id, name, email),
        agency:agencies(name, code)
      `)
      .or(`id.eq.${memberId},member_id.eq.${memberId}`)
      .single();

    if (customerError || !customer) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Get related data (policies, claims, interactions)
    const [policiesResult, claimsResult, interactionsResult] = await Promise.allSettled([
      // Get policies (if policies table exists)
      supabase
        .from('policies')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false }),
      
      // Get claims (if claims table exists)
      supabase
        .from('claims')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false }),
      
      // Get customer service interactions
      supabase
        .from('customer_service_cases')
        .select(`
          *,
          assigned_agent:users(name)
        `)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
    ]);

    const profile = {
      id: customer.id,
      memberId: customer.member_id,
      firstName: customer.first_name,
      lastName: customer.last_name,
      email: customer.email,
      phone: customer.phone,
      dateOfBirth: customer.date_of_birth,
      address: {
        street: customer.address_street,
        city: customer.address_city,
        state: customer.address_state,
        zip: customer.address_zip
      },
      productType: customer.product_type,
      status: customer.status,
      createdAt: customer.created_at,
      assignedAgent: customer.assigned_agent,
      agency: customer.agency,
      policies: policiesResult.status === 'fulfilled' ? policiesResult.value.data || [] : [],
      claims: claimsResult.status === 'fulfilled' ? claimsResult.value.data || [] : [],
      interactions: interactionsResult.status === 'fulfilled' ? interactionsResult.value.data || [] : []
    };

    return res.status(200).json(profile);

  } catch (error) {
    console.error('Profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}