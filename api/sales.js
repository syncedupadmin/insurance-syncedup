const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
 process.env.NEXT_PUBLIC_SUPABASE_URL,
 process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
 res.setHeader('Access-Control-Allow-Origin', '*');
 res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
 res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
 
 if (req.method === 'OPTIONS') {
   res.status(200).end();
   return;
 }
 
 if (req.method === 'POST') {
   try {
     console.log('Received sale data:', req.body);
     
     const saleData = {
       customer_name: req.body.customerName,
       agent_id: req.body.agentId,
       product_id: req.body.productId,
       premium: parseFloat(req.body.premium),
       monthly_recurring: parseFloat(req.body.monthlyRecurring),
       enrollment_fee: parseFloat(req.body.enrollmentFee || 0),
       first_month_total: parseFloat(req.body.premium)
     };
     
     const { data: sale, error } = await supabase
       .from('sales')
       .insert([saleData])
       .select()
       .single();
       
     if (error) {
       console.error('Database error:', error);
       return res.status(500).json({ error: 'Database error: ' + error.message });
     }
     
     res.status(200).json(sale);
   } catch (error) {
     console.error('API error:', error);
     res.status(500).json({ error: 'Server error: ' + error.message });
   }
 } 
 else if (req.method === 'GET') {
   try {
     const { data: sales, error } = await supabase
       .from('sales')
       .select('*')
       .order('created_at', { ascending: false });
       
     if (error) {
       console.error('Database error:', error);
       return res.status(500).json({ error: 'Database error: ' + error.message });
     }
     
     res.status(200).json({ totalSales: sales.length, sales });
   } catch (error) {
     console.error('API error:', error);
     res.status(500).json({ error: 'Server error: ' + error.message });
   }
 } 
 else {
   res.status(405).json({ error: 'Method not allowed' });
 }
}