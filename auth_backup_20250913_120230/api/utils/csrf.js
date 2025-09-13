import jwt from 'jsonwebtoken';

const CSRF_SECRET = process.env.JWT_SECRET + '_csrf' || 'csrf-fallback-secret';

function requireCSRF(handler) {
  return async (req, res) => {
    // Skip CSRF for GET requests
    if (req.method === 'GET' || req.method === 'OPTIONS') {
      return handler(req, res);
    }

    try {
      // Get CSRF token from headers
      const csrfToken = req.headers['x-csrf-token'];
      
      if (!csrfToken) {
        return res.status(403).json({ error: 'CSRF token required' });
      }

      // Verify CSRF token
      const decoded = jwt.verify(csrfToken, CSRF_SECRET);
      
      if (decoded.type !== 'csrf') {
        return res.status(403).json({ error: 'Invalid CSRF token' });
      }

      // Check token age (1 hour max)
      const tokenAge = Date.now() - decoded.timestamp;
      if (tokenAge > 60 * 60 * 1000) {
        return res.status(403).json({ error: 'CSRF token expired' });
      }

      // CSRF token is valid, proceed with request
      return handler(req, res);
      
    } catch (error) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
  };
}

function generateCSRFToken() {
  return jwt.sign(
    { 
      type: 'csrf',
      timestamp: Date.now() 
    },
    CSRF_SECRET,
    { expiresIn: '1h' }
  );
}

export { requireCSRF, generateCSRFToken };