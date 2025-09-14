import { createClient } from '@supabase/supabase-js';
import { getUserContext } from './utils/auth-helper.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    agentId, 
    customerName, 
    customerEmail, 
    productId,
    productName,
    addonId,
    addonName,
    premium,
    commissionAmount 
  } = req.body;
  
  try {
    const { agencyId, agentId: authAgentId } = getUserContext(req);
    
    // Generate unique sale ID
    const saleId = `SALE${Date.now()}`;
    const commissionId = `COMM${Date.now()}`;
    
    // Insert sale record
    const { data: sale, error: saleError } = await supabase
      .from('portal_sales')
      .insert({
        id: saleId,
        agent_id: agentId || authAgentId,
        agency_id: agencyId,
        product_id: productId,
        product_name: addonName ? `${productName} + ${addonName}` : productName,
        customer_name: customerName,
        customer_email: customerEmail,
        premium: premium,
        sale_date: new Date().toISOString().split('T')[0],
        commission_amount: commissionAmount,
        commission_rate: 30,
        sale_date: new Date().toISOString(),
        status: 'active'
      })
      .select()
      .single();

    if (saleError) throw saleError;

    // Insert commission record
    const { data: commission, error: commissionError } = await supabase
      .from('portal_commissions')
      .insert({
        id: commissionId,
        sale_id: saleId,
        agent_id: agentId || authAgentId,
        agency_id: agencyId,
        commission_amount: commissionAmount,
        status: 'pending'
      })
      .select()
      .single();

    if (commissionError) throw commissionError;

    res.status(200).json({ 
      success: true, 
      saleId,
      message: `Sale recorded successfully! Sale ID: ${saleId}`,
      sale,
      commission
    });
    
  } catch (error) {
    console.error('Record sale error:', error);
    res.status(500).json({ 
      error: 'Failed to record sale', 
      details: error.message 
    });
  }
}