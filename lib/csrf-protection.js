// CSRF Protection utility
const crypto = require('crypto');

// Store for CSRF tokens (in production, use Redis or database)
const tokenStore = new Map();

// Clean up old tokens periodically (every hour)
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of tokenStore.entries()) {
    if (now - data.created > 3600000) { // 1 hour
      tokenStore.delete(token);
    }
  }
}, 3600000);

/**
 * Generate a CSRF token for a session
 * @param {string} sessionId - Session identifier (from cookie)
 * @returns {string} - CSRF token
 */
function generateCSRFToken(sessionId) {
  const token = crypto.randomBytes(32).toString('hex');

  tokenStore.set(token, {
    sessionId,
    created: Date.now()
  });

  return token;
}

/**
 * Verify a CSRF token
 * @param {string} token - CSRF token to verify
 * @param {string} sessionId - Session identifier
 * @returns {boolean} - True if token is valid
 */
function verifyCSRFToken(token, sessionId) {
  if (!token || !sessionId) return false;

  const tokenData = tokenStore.get(token);
  if (!tokenData) return false;

  // Check if token belongs to this session
  if (tokenData.sessionId !== sessionId) return false;

  // Check if token is not too old (1 hour)
  const age = Date.now() - tokenData.created;
  if (age > 3600000) {
    tokenStore.delete(token);
    return false;
  }

  return true;
}

/**
 * CSRF protection middleware
 * @param {Object} options - Configuration options
 * @returns {Function} - Middleware function
 */
function csrfProtection(options = {}) {
  const {
    skipMethods = ['GET', 'HEAD', 'OPTIONS'],
    headerName = 'x-csrf-token',
    cookieName = 'csrf_token',
    sessionCookieName = 'auth_token'
  } = options;

  return function(req, res, next) {
    // Skip CSRF for safe methods
    if (skipMethods.includes(req.method)) {
      if (next) next();
      return;
    }

    // Get session ID from cookie
    const getCookie = (name) => {
      const match = (req.headers.cookie || '').match(new RegExp(`(?:^|; )${name}=([^;]+)`));
      return match ? decodeURIComponent(match[1]) : null;
    };

    const sessionId = getCookie(sessionCookieName);
    if (!sessionId) {
      return res.status(401).json({ error: 'Session required for this operation' });
    }

    // Get CSRF token from header or body
    const token = req.headers[headerName] ||
                  req.body?._csrf ||
                  req.query?._csrf ||
                  getCookie(cookieName);

    if (!token) {
      return res.status(403).json({ error: 'CSRF token required' });
    }

    // Verify token
    if (!verifyCSRFToken(token, sessionId)) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }

    // Token is valid, continue
    if (next) next();
  };
}

/**
 * Get CSRF token endpoint handler
 */
function getCSRFToken(req, res) {
  const getCookie = (name) => {
    const match = (req.headers.cookie || '').match(new RegExp(`(?:^|; )${name}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : null;
  };

  const sessionId = getCookie('auth_token');

  if (!sessionId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = generateCSRFToken(sessionId);

  // Set cookie for convenience (can also be used in header)
  res.setHeader('Set-Cookie', [
    `csrf_token=${token}; Path=/; Max-Age=3600; SameSite=Strict`
  ]);

  res.json({
    token,
    expiresIn: 3600 // 1 hour
  });
}

module.exports = {
  generateCSRFToken,
  verifyCSRFToken,
  csrfProtection,
  getCSRFToken
};