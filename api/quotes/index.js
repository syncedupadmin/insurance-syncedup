import { requireAuth } from '../_middleware/authCheck.js';

async function quotesHandler(req, res) {
  const supabase = req.supabase;
  const user = req.user;

  try {
    if (req.method === 'GET') {
      let query = supabase
        .from('quotes')
        .select(`
          *,
          customer:customers(first_name, last_name, email, phone),
          product:products(name, carrier, commission_rate),
          agent:portal_users!quotes_agent_id_fkey(name, email)
        `)
        .order('created_at', { ascending: false });

      if (user.role === 'agent') {
        query = query.eq('agent_id', user.id);
      } else if (user.role === 'manager') {
        query = query.eq('agency_id', user.agency_id);
      } else if (user.role === 'admin') {
        query = query.eq('agency_id', user.agency_id);
      }

      const { status, startDate, endDate } = req.query;

      if (status) {
        query = query.eq('status', status);
      }
      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      query = query.range(offset, offset + limit - 1);

      const { data: quotes, error, count } = await query;

      if (error) throw error;

      return res.json({
        success: true,
        quotes: quotes || [],
        total: count,
        limit,
        offset
      });
    }

    if (req.method === 'POST') {
      const {
        customer_id,
        product_id,
        premium,
        coverage_amount,
        payment_frequency,
        effective_date,
        notes,
        convert_to_sale
      } = req.body;

      if (!customer_id || !product_id || !premium) {
        return res.status(400).json({
          error: 'customer_id, product_id, and premium are required'
        });
      }

      const quoteData = {
        customer_id,
        product_id,
        agent_id: user.role === 'agent' ? user.id : req.body.agent_id,
        agency_id: user.agency_id,
        premium: parseFloat(premium),
        coverage_amount: coverage_amount ? parseFloat(coverage_amount) : null,
        payment_frequency: payment_frequency || 'monthly',
        effective_date: effective_date || new Date().toISOString(),
        status: convert_to_sale ? 'accepted' : 'pending',
        notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: newQuote, error: quoteError } = await supabase
        .from('quotes')
        .insert(quoteData)
        .select()
        .single();

      if (quoteError) throw quoteError;

      if (convert_to_sale) {
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('commission_rate')
          .eq('id', product_id)
          .single();

        if (!productError && product) {
          const commissionRate = product.commission_rate || 80;
          const commissionAmount = (parseFloat(premium) * commissionRate) / 100;

          const saleData = {
            customer_id,
            product_id,
            agent_id: quoteData.agent_id,
            agency_id: user.agency_id,
            quote_id: newQuote.id,
            premium: parseFloat(premium),
            commission_amount: commissionAmount,
            commission_rate: commissionRate,
            policy_number: `POL-${Date.now()}`,
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

          if (!saleError) {
            return res.status(201).json({
              success: true,
              quote: newQuote,
              sale: newSale,
              message: 'Quote created and converted to sale successfully'
            });
          }
        }
      }

      return res.status(201).json({
        success: true,
        quote: newQuote,
        message: 'Quote created successfully'
      });
    }

    if (req.method === 'PUT') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Quote ID required' });
      }

      let updateQuery = supabase
        .from('quotes')
        .select('*')
        .eq('id', id);

      if (user.role === 'agent') {
        updateQuery = updateQuery.eq('agent_id', user.id);
      } else if (user.role !== 'super-admin' && user.role !== 'super_admin') {
        updateQuery = updateQuery.eq('agency_id', user.agency_id);
      }

      const { data: existingQuote, error: fetchError } = await updateQuery.single();

      if (fetchError || !existingQuote) {
        return res.status(404).json({ error: 'Quote not found or access denied' });
      }

      const updates = { ...req.body };
      delete updates.id;
      delete updates.created_at;
      delete updates.agent_id;
      delete updates.agency_id;
      updates.updated_at = new Date().toISOString();

      if (updates.status === 'accepted' && req.body.convert_to_sale) {
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('commission_rate')
          .eq('id', existingQuote.product_id)
          .single();

        if (!productError && product) {
          const commissionRate = product.commission_rate || 80;
          const commissionAmount = (parseFloat(existingQuote.premium) * commissionRate) / 100;

          const saleData = {
            customer_id: existingQuote.customer_id,
            product_id: existingQuote.product_id,
            agent_id: existingQuote.agent_id,
            agency_id: existingQuote.agency_id,
            quote_id: existingQuote.id,
            premium: existingQuote.premium,
            commission_amount: commissionAmount,
            commission_rate: commissionRate,
            policy_number: `POL-${Date.now()}`,
            effective_date: existingQuote.effective_date || new Date().toISOString(),
            sale_date: new Date().toISOString(),
            payment_frequency: existingQuote.payment_frequency || 'monthly',
            status: 'active',
            notes: existingQuote.notes
          };

          await supabase
            .from('portal_sales')
            .insert(saleData)
            .select()
            .single();
        }
      }

      const { data: updatedQuote, error: updateError } = await supabase
        .from('quotes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      return res.json({
        success: true,
        quote: updatedQuote,
        message: updates.status === 'accepted' ? 'Quote accepted and converted to sale' : 'Quote updated successfully'
      });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Quote ID required' });
      }

      if (user.role !== 'admin' && user.role !== 'super-admin' && user.role !== 'super_admin') {
        return res.status(403).json({ error: 'Only admins can delete quotes' });
      }

      const { data, error } = await supabase
        .from('quotes')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('agency_id', user.agency_id)
        .select()
        .single();

      if (error) throw error;

      return res.json({
        success: true,
        message: 'Quote cancelled successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Quotes API error:', error);
    return res.status(500).json({ error: error.message });
  }
}

export default requireAuth(['agent', 'manager', 'admin', 'super-admin'])(quotesHandler);