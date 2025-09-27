import { requireAuth } from '../_middleware/authCheck.js';

async function commissionsHandler(req, res) {
  const supabase = req.supabase;
  const user = req.user;

  try {
    if (req.method === 'GET') {
      const { startDate, endDate, status, groupBy } = req.query;

      let query = supabase
        .from('portal_sales')
        .select(`
          *,
          customer:customers(first_name, last_name, email),
          product:products(name, carrier, commission_rate),
          agent:portal_users!portal_sales_agent_id_fkey(name, email, agent_code)
        `)
        .order('sale_date', { ascending: false });

      if (user.role === 'agent') {
        query = query.eq('agent_id', user.id);
      } else if (user.role === 'manager') {
        query = query.eq('agency_id', user.agency_id);
      } else if (user.role === 'admin') {
        query = query.eq('agency_id', user.agency_id);
      }

      if (startDate) {
        query = query.gte('sale_date', startDate);
      }
      if (endDate) {
        query = query.lte('sale_date', endDate);
      }
      if (status) {
        query = query.eq('status', status);
      }

      const { data: sales, error } = await query;

      if (error) throw error;

      if (groupBy === 'month') {
        const grouped = {};
        sales.forEach(sale => {
          const month = sale.sale_date.slice(0, 7);
          if (!grouped[month]) {
            grouped[month] = {
              month,
              total_commission: 0,
              total_premium: 0,
              sales_count: 0,
              sales: []
            };
          }
          grouped[month].total_commission += parseFloat(sale.commission_amount || 0);
          grouped[month].total_premium += parseFloat(sale.premium || 0);
          grouped[month].sales_count += 1;
          grouped[month].sales.push(sale);
        });

        return res.json({
          success: true,
          grouped: Object.values(grouped).sort((a, b) => b.month.localeCompare(a.month)),
          total_commission: sales.reduce((sum, s) => sum + parseFloat(s.commission_amount || 0), 0),
          total_sales: sales.length
        });
      }

      if (groupBy === 'product') {
        const grouped = {};
        sales.forEach(sale => {
          const productId = sale.product_id;
          const productName = sale.product?.name || 'Unknown Product';
          if (!grouped[productId]) {
            grouped[productId] = {
              product_id: productId,
              product_name: productName,
              carrier: sale.product?.carrier,
              total_commission: 0,
              total_premium: 0,
              sales_count: 0,
              sales: []
            };
          }
          grouped[productId].total_commission += parseFloat(sale.commission_amount || 0);
          grouped[productId].total_premium += parseFloat(sale.premium || 0);
          grouped[productId].sales_count += 1;
          grouped[productId].sales.push(sale);
        });

        return res.json({
          success: true,
          grouped: Object.values(grouped).sort((a, b) => b.total_commission - a.total_commission),
          total_commission: sales.reduce((sum, s) => sum + parseFloat(s.commission_amount || 0), 0),
          total_sales: sales.length
        });
      }

      const totalCommission = sales.reduce((sum, sale) => {
        return sum + parseFloat(sale.commission_amount || 0);
      }, 0);

      const pendingCommission = sales
        .filter(s => s.status === 'pending')
        .reduce((sum, sale) => sum + parseFloat(sale.commission_amount || 0), 0);

      const paidCommission = sales
        .filter(s => s.status === 'paid')
        .reduce((sum, sale) => sum + parseFloat(sale.commission_amount || 0), 0);

      return res.json({
        success: true,
        commissions: sales || [],
        summary: {
          total_commission: totalCommission,
          pending_commission: pendingCommission,
          paid_commission: paidCommission,
          total_sales: sales.length,
          average_commission: sales.length > 0 ? totalCommission / sales.length : 0
        }
      });
    }

    if (req.method === 'POST') {
      if (user.role !== 'admin' && user.role !== 'super-admin' && user.role !== 'super_admin') {
        return res.status(403).json({ error: 'Only admins can create commission adjustments' });
      }

      const {
        agent_id,
        amount,
        reason,
        adjustment_type
      } = req.body;

      if (!agent_id || !amount || !adjustment_type) {
        return res.status(400).json({
          error: 'agent_id, amount, and adjustment_type are required'
        });
      }

      const adjustmentData = {
        agent_id,
        agency_id: user.agency_id,
        amount: parseFloat(amount),
        reason: reason || '',
        adjustment_type,
        created_by: user.id,
        created_at: new Date().toISOString(),
        status: 'pending'
      };

      const { data: adjustment, error } = await supabase
        .from('commission_adjustments')
        .insert(adjustmentData)
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        success: true,
        adjustment,
        message: 'Commission adjustment created successfully'
      });
    }

    if (req.method === 'PUT') {
      if (user.role !== 'admin' && user.role !== 'super-admin' && user.role !== 'super_admin') {
        return res.status(403).json({ error: 'Only admins can update commission status' });
      }

      const { id } = req.query;
      const { status } = req.body;

      if (!id || !status) {
        return res.status(400).json({ error: 'Commission ID and status are required' });
      }

      let updateQuery = supabase
        .from('portal_sales')
        .select('*')
        .eq('id', id);

      if (user.role !== 'super-admin' && user.role !== 'super_admin') {
        updateQuery = updateQuery.eq('agency_id', user.agency_id);
      }

      const { data: existingSale, error: fetchError } = await updateQuery.single();

      if (fetchError || !existingSale) {
        return res.status(404).json({ error: 'Sale not found or access denied' });
      }

      const { data: updatedSale, error: updateError } = await supabase
        .from('portal_sales')
        .update({
          commission_status: status,
          commission_paid_date: status === 'paid' ? new Date().toISOString() : null
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      return res.json({
        success: true,
        sale: updatedSale,
        message: 'Commission status updated successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Commissions API error:', error);
    return res.status(500).json({ error: error.message });
  }
}

export default requireAuth(['agent', 'manager', 'admin', 'super-admin'])(commissionsHandler);