const { requireAuth } = require('../../_middleware/authCheck.js');
const { getConvosoToken, makeConvosoRequest } = require('../../_utils/convoso-helper.js');

async function convosoMonitorHandler(req, res) {
  const supabase = req.supabase;
  const user = req.user;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Convoso Monitor API - User:', user.role, 'Agency:', user.agency_id);

    const convosoToken = await getConvosoToken(supabase, user.agency_id);

    if (!convosoToken) {
      return res.status(200).json({
        success: false,
        error: 'no_token',
        message: 'No Convoso API token configured for this agency. Please add your Convoso token in Settings.',
        data: null
      });
    }

    const { campaign_id, queue_id, user_id, filter_by_skill_options } = req.query;

    const params = {};
    if (campaign_id) params.campaign_id = campaign_id;
    if (queue_id) params.queue_id = queue_id;
    if (user_id) params.user_id = user_id;
    if (filter_by_skill_options) params.filter_by_skill_options = filter_by_skill_options;

    const convosoData = await makeConvosoRequest(convosoToken, 'agent-monitor/search', params);

    return res.status(200).json({
      success: true,
      data: convosoData.data || convosoData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Convoso Monitor API error:', error);

    if (error.message?.includes('Convoso API error')) {
      return res.status(502).json({
        success: false,
        error: 'convoso_api_error',
        message: 'Failed to connect to Convoso API. Please verify your API token in Settings.',
        details: error.message
      });
    }

    return res.status(500).json({
      success: false,
      error: 'internal_error',
      message: 'Internal server error',
      details: error.message
    });
  }
}

module.exports = requireAuth(['admin', 'manager'])(convosoMonitorHandler);