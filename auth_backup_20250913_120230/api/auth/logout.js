import cookie from 'cookie';

export default async function handler(req, res) {
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
    // Clear all authentication cookies with proper names
    const cookiesToClear = ['auth_token', 'user_role', 'user_roles', 'assumed_role'];
    const clearCookies = cookiesToClear.map(name => 
      cookie.serialize(name, '', {
        httpOnly: name === 'auth_token', // Only auth_token is httpOnly
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0,
        path: '/',
        domain: process.env.NODE_ENV === 'production' ? '.syncedupsolutions.com' : undefined
      })
    );
    
    res.setHeader('Set-Cookie', clearCookies);

    return res.status(200).json({ 
      success: true, 
      message: 'Logged out successfully' 
    });

  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error during logout' 
    });
  }
}