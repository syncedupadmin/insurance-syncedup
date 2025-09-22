// Simple JWT debugging endpoint
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get authorization header
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    
    console.log('JWT Debug - Token received:', token ? `${token.substring(0, 20)}...` : 'No token');
    
    if (!token) {
      return res.status(200).json({ 
        error: 'No token provided',
        authHeader: authHeader
      });
    }

    // Try to decode JWT token
    try {
      const parts = token.split('.');
      console.log('JWT Debug - Token parts:', parts.length);
      
      if (parts.length !== 3) {
        return res.status(200).json({ 
          error: 'Invalid JWT format',
          parts: parts.length,
          token_preview: token.substring(0, 50)
        });
      }
      
      const payload = JSON.parse(Buffer.from(parts[1], 'base64'));
      console.log('JWT Debug - Decoded payload:', payload);
      
      return res.status(200).json({
        success: true,
        payload: payload,
        token_valid: true,
        role: payload.role,
        email: payload.email
      });
      
    } catch (decodeError) {
      console.log('JWT Debug - Decode error:', decodeError.message);
      return res.status(200).json({ 
        error: 'Token decode failed',
        details: decodeError.message,
        token_preview: token.substring(0, 50)
      });
    }

  } catch (error) {
    console.error('JWT Debug - General error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}