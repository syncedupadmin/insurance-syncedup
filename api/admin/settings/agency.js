const { requireAuth } = require('../../_middleware/authCheck.js');

async function agencySettingsHandler(req, res) {
  const supabase = req.supabase;
  const user = req.user;

  try {
    if (req.method === 'GET') {
      console.log('Agency Settings API - GET - User:', user.role, 'Agency:', user.agency_id);

      const { data: agency, error } = await supabase
        .from('agencies')
        .select('*')
        .eq('id', user.agency_id)
        .single();

      if (error) {
        if (error.message?.includes('does not exist') || error.code === 'PGRST116') {
          console.log('Agency Settings API - Agencies table does not exist yet');
          return res.status(200).json({
            success: true,
            data: {
              agency_name: 'Agency',
              license_number: '',
              phone: '',
              email: '',
              address: '',
              city: '',
              state: '',
              zip: '',
              timezone: 'America/New_York'
            }
          });
        }
        throw error;
      }

      return res.status(200).json({
        success: true,
        data: {
          agency_name: agency.name || 'Agency',
          license_number: agency.license_number || '',
          phone: agency.phone || '',
          email: agency.email || '',
          address: agency.address || '',
          city: agency.city || '',
          state: agency.state || '',
          zip: agency.zip || '',
          timezone: agency.timezone || 'America/New_York'
        }
      });
    }

    if (req.method === 'PUT') {
      console.log('Agency Settings API - PUT - User:', user.role, 'Agency:', user.agency_id);

      const {
        agency_name,
        license_number,
        phone,
        email,
        address,
        city,
        state,
        zip,
        timezone
      } = req.body;

      const { data: agency, error } = await supabase
        .from('agencies')
        .update({
          name: agency_name,
          license_number,
          phone,
          email,
          address,
          city,
          state,
          zip,
          timezone,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.agency_id)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({
        success: true,
        data: agency,
        message: 'Agency settings updated successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Agency Settings API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

module.exports = requireAuth(['admin', 'manager'])(agencySettingsHandler);