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
    // Clear the HTTP-only cookie
    res.setHeader('Set-Cookie', cookie.serialize('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,  // Expire immediately
      path: '/'
    }));

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