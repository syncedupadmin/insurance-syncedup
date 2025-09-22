// Simplified login test API
module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, password } = req.body || {};
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    console.log('Test login attempt:', email);

    // Simple test - just return success for admin@syncedupsolutions.com with TestPassword123!
    if (email.toLowerCase() === 'admin@syncedupsolutions.com' && password === 'TestPassword123!') {
      return res.status(200).json({
        success: true,
        message: 'Simple test login works',
        user: {
          email: email,
          role: 'admin',
          id: 'test-id'
        },
        token: 'test-token'
      });
    }

    return res.status(401).json({ error: 'Invalid test credentials' });

  } catch (error) {
    console.error('Test login error:', error);
    return res.status(500).json({ 
      error: 'Test login server error', 
      details: error.message 
    });
  }
}