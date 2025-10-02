const { requireAuth } = require('../../_middleware/authCheck.js');
const { getConvosoConfig, makeConvosoRequest } = require('../../_utils/convoso-helper.js');

async function testConvosoConnectionHandler(req, res) {
  const supabase = req.supabase;
  const user = req.user;

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Testing Convoso connection for agency:', user.agency_id);

    // Get Convoso configuration
    const convosoConfig = await getConvosoConfig(supabase, user.agency_id);

    if (!convosoConfig || !convosoConfig.api_key) {
      return res.status(200).json({
        success: false,
        connected: false,
        message: 'No Convoso credentials configured. Please add your API key in Settings.',
        details: {
          agency_id: user.agency_id,
          has_credentials: false
        }
      });
    }

    // Try a simple API call to verify the connection
    console.log('Testing Convoso API with token...');

    try {
      // Try to get campaigns list as a simple test
      const testData = await makeConvosoRequest(
        convosoConfig.api_key,
        'campaigns',
        { limit: 1 },
        convosoConfig.base_url
      );

      console.log('Convoso API test successful');

      return res.status(200).json({
        success: true,
        connected: true,
        message: 'Successfully connected to Convoso API',
        details: {
          agency_id: user.agency_id,
          has_credentials: true,
          base_url: convosoConfig.base_url || 'https://api.convoso.com',
          account_id: convosoConfig.account_id || 'Not configured',
          test_endpoint: 'campaigns',
          response_received: true,
          campaigns_found: testData.data ? testData.data.length : 0
        }
      });

    } catch (apiError) {
      console.error('Convoso API test failed:', apiError);

      // Check if it's an authentication error
      const isAuthError = apiError.message?.includes('401') ||
                         apiError.message?.toLowerCase().includes('unauthorized') ||
                         apiError.message?.toLowerCase().includes('invalid');

      return res.status(200).json({
        success: false,
        connected: false,
        message: isAuthError
          ? 'Invalid API credentials. Please check your API key in Settings.'
          : 'Failed to connect to Convoso API. Please verify your settings.',
        details: {
          agency_id: user.agency_id,
          has_credentials: true,
          base_url: convosoConfig.base_url || 'https://api.convoso.com',
          error: apiError.message,
          is_auth_error: isAuthError
        }
      });
    }

  } catch (error) {
    console.error('Test connection error:', error);

    return res.status(500).json({
      success: false,
      connected: false,
      message: 'Internal error while testing connection',
      details: {
        error: error.message
      }
    });
  }
}

module.exports = requireAuth(['admin', 'manager'])(testConvosoConnectionHandler);