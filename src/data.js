// Database-backed data access - no hardcoded data
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Fetch products from database
async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true);
  
  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }
  return data || [];
}

// Fetch sales from database
async function getSales(filters = {}) {
  let query = supabase
    .from('sales')
    .select('*');
  
  if (filters.agent_id) {
    query = query.eq('agent_id', filters.agent_id);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching sales:', error);
    return [];
  }
  return data || [];
}

// Fetch agents from database
async function getAgents(agency_id = null) {
  let query = supabase
    .from('portal_users')
    .select('*')
    .eq('role', 'agent')
    .eq('is_active', true);
  
  if (agency_id) {
    query = query.eq('agency_id', agency_id);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching agents:', error);
    return [];
  }
  return data || [];
}

// Fetch chargebacks from database
async function getChargebacks(filters = {}) {
  let query = supabase
    .from('chargebacks')
    .select('*');
  
  if (filters.agent_id) {
    query = query.eq('agent_id', filters.agent_id);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching chargebacks:', error);
    return [];
  }
  return data || [];
}

module.exports = {
  getProducts,
  getSales,
  getAgents,
  getChargebacks
};