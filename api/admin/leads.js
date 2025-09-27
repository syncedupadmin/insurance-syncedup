const { requireAuth } = require('../_middleware/authCheck.js');

async function leadsHandler(req, res) {
  const supabase = req.supabase;
  const user = req.user;

  const { recent, limit = '50' } = req.query;

  try {
    if (req.method === 'GET') {
      console.log('Admin Leads API - User:', user.role, 'Agency:', user.agency_id);

      // Query leads for ALL agents in this agency
      let query = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

      // Filter by agency (admin sees all leads in their agency)
      if (user.role !== 'super-admin' && user.role !== 'super_admin') {
        query = query.eq('agency_id', user.agency_id);
      }

      if (recent === 'true') {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', sevenDaysAgo);
      }

      const { data: leads, error } = await query;

      console.log('Admin Leads API - Database response:', {
        error: error?.message,
        dataCount: leads?.length
      });

      if (error) {
        if (error.message?.includes('does not exist') || error.code === 'PGRST116') {
          console.log('Admin Leads API - Leads table does not exist yet');
          return res.status(200).json({
            success: true,
            data: [],
            count: 0
          });
        }
        throw error;
      }

      return res.status(200).json({
        success: true,
        data: leads || [],
        count: leads?.length || 0,
        timestamp: new Date().toISOString()
      });
    }

    if (req.method === 'POST') {
      const leadData = req.body;

      if (!leadData.name && !leadData.first_name) {
        return res.status(400).json({ error: 'Name or first_name is required' });
      }

      const { data: lead, error } = await supabase
        .from('leads')
        .insert({
          ...leadData,
          agency_id: user.agency_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        success: true,
        data: lead,
        message: 'Lead created successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Admin Leads API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

module.exports = requireAuth(['admin', 'manager'])(leadsHandler);
