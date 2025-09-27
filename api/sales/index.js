import { requireAuth } from '../_middleware/authCheck.js';

async function salesHandler(req, res) {
  const supabase = req.supabase;
  const user = req.user;

  try {
    if (req.method === 'GET') {
      // Get sales data with role-based filtering
      let query = supabase
        .from('portal_sales')
        .select(`
          *,
          customer:customers(first_name, last_name, email),
          product:products(name, carrier),
          agent:portal_users!portal_sales_agent_id_fkey(name, email)
        `)
        .order('sale_date', { ascending: false });

      // Filter by role
      if (user.role === 'agent') {
        // Agents see only their own sales
        query = query.eq('agent_id', user.id);
      } else if (user.role === 'manager') {
        // Managers see their team's sales (implement team_id filter later)
        query = query.eq('agency_id', user.agency_id);
      } else if (user.role === 'admin') {
        // Admins see all sales in their agency
        query = query.eq('agency_id', user.agency_id);
      }
      // Super admins see all sales (no filter)

      // Apply pagination
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      query = query.range(offset, offset + limit - 1);

      const { data: sales, error, count } = await query;

      if (error) throw error;

      return res.json({
        success: true,
        sales: sales || [],
        total: count,
        limit,
        offset
      });
    }

    if (req.method === 'POST') {
      // Create new sale
      const {
        customer_id,
        product_id,
        premium,
        policy_number,
        effective_date,
        payment_frequency,
        notes
      } = req.body;

      if (!customer_id || !product_id || !premium) {
        return res.status(400).json({
          error: 'customer_id, product_id, and premium are required'
        });
      }

      // Get product details for commission calculation
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('commission_rate')
        .eq('id', product_id)
        .single();

      if (productError) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Calculate commission
      const commissionRate = product.commission_rate || 80; // Default 80%
      const commissionAmount = (parseFloat(premium) * commissionRate) / 100;

      // Create sale record
      const saleData = {
        customer_id,
        product_id,
        agent_id: user.role === 'agent' ? user.id : req.body.agent_id,
        agency_id: user.agency_id,
        premium: parseFloat(premium),
        commission_amount: commissionAmount,
        commission_rate: commissionRate,
        policy_number: policy_number || `POL-${Date.now()}`,
        effective_date: effective_date || new Date().toISOString(),
        sale_date: new Date().toISOString(),
        payment_frequency: payment_frequency || 'monthly',
        status: 'active',
        notes
      };

      const { data: newSale, error: saleError } = await supabase
        .from('portal_sales')
        .insert(saleData)
        .select()
        .single();

      if (saleError) throw saleError;

      return res.status(201).json({
        success: true,
        sale: newSale,
        message: 'Sale recorded successfully'
      });
    }

    if (req.method === 'PUT') {
      // Update existing sale
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Sale ID required' });
      }

      // Only admins and the agent who created it can update
      let updateQuery = supabase
        .from('portal_sales')
        .select('*')
        .eq('id', id);

      if (user.role === 'agent') {
        updateQuery = updateQuery.eq('agent_id', user.id);
      } else if (user.role !== 'super-admin' && user.role !== 'super_admin') {
        updateQuery = updateQuery.eq('agency_id', user.agency_id);
      }

      const { data: existingSale, error: fetchError } = await updateQuery.single();

      if (fetchError || !existingSale) {
        return res.status(404).json({ error: 'Sale not found or access denied' });
      }

      // Update the sale
      const updates = { ...req.body };
      delete updates.id;
      delete updates.created_at;
      delete updates.agent_id; // Can't change agent
      delete updates.agency_id; // Can't change agency

      const { data: updatedSale, error: updateError } = await supabase
        .from('portal_sales')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      return res.json({
        success: true,
        sale: updatedSale,
        message: 'Sale updated successfully'
      });
    }

    if (req.method === 'DELETE') {
      // Soft delete (update status)
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Sale ID required' });
      }

      // Only admins can delete
      if (user.role !== 'admin' && user.role !== 'super-admin' && user.role !== 'super_admin') {
        return res.status(403).json({ error: 'Only admins can delete sales' });
      }

      const { data, error } = await supabase
        .from('portal_sales')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .eq('agency_id', user.agency_id)
        .select()
        .single();

      if (error) throw error;

      return res.json({
        success: true,
        message: 'Sale cancelled successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Sales API error:', error);
    return res.status(500).json({ error: error.message });
  }
}

export default requireAuth(['agent', 'manager', 'admin', 'super-admin'])(salesHandler);