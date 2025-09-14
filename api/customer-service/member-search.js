import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      memberId, 
      firstName, 
      lastName, 
      phone, 
      email, 
      productType,
      agencyId 
    } = req.body;

    // Build query
    let query = supabase
      .from('customers')
      .select(`
        id,
        member_id,
        first_name,
        last_name,
        phone,
        email,
        product_type,
        status,
        created_at,
        agency_id,
        assigned_agent:users(name)
      `);

    // Apply filters based on search parameters
    if (memberId && memberId.trim()) {
      query = query.ilike('member_id', `%${memberId.trim()}%`);
    }
    if (firstName && firstName.trim()) {
      query = query.ilike('first_name', `%${firstName.trim()}%`);
    }
    if (lastName && lastName.trim()) {
      query = query.ilike('last_name', `%${lastName.trim()}%`);
    }
    if (phone && phone.trim()) {
      query = query.ilike('phone', `%${phone.trim()}%`);
    }
    if (email && email.trim()) {
      query = query.ilike('email', `%${email.trim()}%`);
    }
    if (productType && productType.trim()) {
      query = query.eq('product_type', productType.trim());
    }

    // Filter by agency if provided
    if (agencyId) {
      query = query.eq('agency_id', agencyId);
    }

    // Execute query with limit
    const { data: customers, error } = await query.limit(50);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    // Format results for frontend
    const results = customers?.map(customer => ({
      memberId: customer.member_id,
      firstName: customer.first_name,
      lastName: customer.last_name,
      phone: customer.phone,
      email: customer.email,
      product: customer.product_type,
      status: customer.status,
      agent: customer.assigned_agent?.name || 'Unassigned',
      id: customer.id
    })) || [];

    return res.status(200).json(results);

  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}