module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Robust HTTPS check - same as login
    const xfwd = String(req.headers['x-forwarded-proto'] || '');
    const isHTTPS = xfwd.split(',')[0].trim() === 'https' || req.secure === true;

    // Clear auth_token with EXACT same attributes as when setting
    const clearCookie = [
      'auth_token=',
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      'Max-Age=0'
    ];
    if (isHTTPS) clearCookie.push('Secure');

    res.setHeader('Set-Cookie', clearCookie.join('; '));

    return res.status(200).json({
      ok: true,
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('[LOGOUT] Error:', error);
    return res.status(500).json({
      ok: false,
      success: false,
      error: 'Internal server error during logout'
    });
  }
}