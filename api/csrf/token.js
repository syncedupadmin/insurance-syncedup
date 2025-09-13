const { verifyToken } = require('../lib/auth-bridge.js');
const CSRF_SECRET = process.env.JWT_SECRET + '_csrf' || 'csrf-fallback-secret';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Generate CSRF token
    const csrfToken = jwt.sign(
      { 
        type: 'csrf',
        timestamp: Date.now() 
      },
      CSRF_SECRET,
      { expiresIn: '1h' }
    );

    return res.status(200).json({
      success: true,
      csrfToken: csrfToken
    });
  } catch (error) {
    console.error('CSRF token generation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
