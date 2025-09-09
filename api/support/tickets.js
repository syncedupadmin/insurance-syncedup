// DISABLED: // DISABLED: import { requireAuth } from '../_middleware/authCheck.js';

async function ticketsHandler(req, res) {
  const supabase = req.supabase;

  try {
    if (req.method === 'GET') {
      let query = supabase.from('support_tickets');
      
      if (req.user.role === 'admin') {
        // Admin sees all tickets with full details
        query = query.select('*');
      } else {
        // Other roles see only their agency's tickets
        query = query
          .select('*')
          .eq('agency_id', req.user.agency_id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const { title, description, priority = 'normal' } = req.body;
      
      if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required' });
      }
      
      // Generate unique ticket number
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 5).toUpperCase();
      const ticket_number = `TKT-${timestamp}-${random}`;

      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          ticket_number,
          title,
          description,
          priority,
          agency_id: req.user.agency_id,
          created_by: req.user.id,
          status: 'open'
        })
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'PATCH') {
      const { id } = req.query;
      const updates = req.body;
      
      // Validate permissions
      let query = supabase
        .from('support_tickets')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      // Non-admin users can only update their agency's tickets
      if (req.user.role !== 'admin') {
        query = query.eq('agency_id', req.user.agency_id);
      }
      
      const { data, error } = await query.select().single();
      
      if (error) throw error;
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Tickets handler error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// DISABLED: export default requireAuth()(ticketsHandler);
export default ticketsHandler;
