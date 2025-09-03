import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { state, carrier, type, active_only } = req.query;
    
    // Build query with filters
    let query = supabase.from('products').select('*');
    
    // Filter by state if provided
    if (state) {
      query = query.contains('states', [state.toUpperCase()]);
    }
    
    // Filter by carrier (e.g., FirstEnroll)
    if (carrier) {
      query = query.ilike('carrier', `%${carrier}%`);
    }
    
    // Filter by product type
    if (type) {
      query = query.eq('product_type', type);
    }
    
    // Filter active products only
    if (active_only === 'true') {
      query = query.eq('is_active', true);
    }
    
    // Order by premium for consistent results
    query = query.order('premium', { ascending: true });

    const { data: products, error } = await query;

    if (error) {
      console.error('Products query error:', error);
      // Return FirstEnroll demo data if database query fails
      return res.status(200).json(getFirstEnrollDemoProducts(state));
    }

    // If no products found in database, return demo data
    if (!products || products.length === 0) {
      console.log('No products in database, returning FirstEnroll demo data');
      return res.status(200).json(getFirstEnrollDemoProducts(state));
    }

    res.status(200).json(products);
  } catch (error) {
    console.error('Products API error:', error);
    // Fallback to demo data on any error
    res.status(200).json(getFirstEnrollDemoProducts());
  }
}

// FirstEnroll demo products for development/demo purposes
function getFirstEnrollDemoProducts(state = null) {
  const demoProducts = [
    {
      id: 'fe-ppo-500',
      name: 'PPO Plan 500',
      carrier: 'FirstEnroll',
      product_type: 'health',
      states: ['TX', 'FL', 'CA', 'NY', 'IL'],
      premium: 149.99,
      commission_rate: 30.0,
      deductible: 500,
      max_out_of_pocket: 3000,
      copay_primary: 25,
      copay_specialist: 45,
      prescription_coverage: true,
      dental_included: false,
      vision_included: false,
      is_active: true,
      description: 'Comprehensive PPO health plan with low deductible'
    },
    {
      id: 'fe-hmo-1000',
      name: 'HMO Plan 1000',
      carrier: 'FirstEnroll',
      product_type: 'health',
      states: ['TX', 'FL', 'CA'],
      premium: 119.99,
      commission_rate: 28.0,
      deductible: 1000,
      max_out_of_pocket: 4000,
      copay_primary: 20,
      copay_specialist: 40,
      prescription_coverage: true,
      dental_included: false,
      vision_included: false,
      is_active: true,
      description: 'Affordable HMO plan with network restrictions'
    },
    {
      id: 'fe-hdhp-2500',
      name: 'High Deductible Health Plan',
      carrier: 'FirstEnroll',
      product_type: 'health',
      states: ['TX', 'FL', 'CA', 'NY'],
      premium: 89.99,
      commission_rate: 35.0,
      deductible: 2500,
      max_out_of_pocket: 6000,
      copay_primary: 0,
      copay_specialist: 0,
      prescription_coverage: true,
      dental_included: true,
      vision_included: true,
      is_active: true,
      description: 'HSA-compatible high deductible plan with comprehensive coverage after deductible'
    },
    {
      id: 'fe-bronze-plus',
      name: 'Bronze Plus Plan',
      carrier: 'FirstEnroll',
      product_type: 'health',
      states: ['TX', 'FL', 'CA', 'NY', 'IL', 'OH'],
      premium: 199.99,
      commission_rate: 25.0,
      deductible: 750,
      max_out_of_pocket: 3500,
      copay_primary: 30,
      copay_specialist: 50,
      prescription_coverage: true,
      dental_included: true,
      vision_included: false,
      is_active: true,
      description: 'Enhanced bronze plan with added dental benefits'
    }
  ];
  
  // Filter by state if provided
  if (state) {
    return demoProducts.filter(product => 
      product.states.includes(state.toUpperCase())
    );
  }
  
  return demoProducts;
}