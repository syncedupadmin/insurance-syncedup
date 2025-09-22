// Rate limiting utility for API endpoints
// Prevents brute force attacks and abuse

// In-memory store for rate limiting (in production, use Redis)
const attempts = new Map();

/**
 * Clean up old entries periodically (every hour)
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of attempts.entries()) {
    if (now - data.resetTime > 3600000) { // 1 hour
      attempts.delete(key);
    }
  }
}, 3600000); // Run every hour

/**
 * Get client identifier from request
 * @param {Object} req - Request object
 * @returns {string} - Client identifier
 */
function getClientId(req) {
  // Try to get IP from various headers
  const ip = req.headers['x-forwarded-for']?.split(',')[0] ||
             req.headers['x-real-ip'] ||
             req.connection?.remoteAddress ||
             req.socket?.remoteAddress ||
             'unknown';

  // For login endpoints, also include email to prevent targeted attacks
  if (req.body?.email) {
    return `${ip}:${req.body.email.toLowerCase()}`;
  }

  return ip;
}

/**
 * Rate limiter middleware
 * @param {Object} options - Configuration options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.maxAttempts - Max attempts per window
 * @param {string} options.message - Error message
 * @returns {Function} - Middleware function
 */
function createRateLimiter(options = {}) {
  const {
    windowMs = 900000, // 15 minutes by default
    maxAttempts = 5,   // 5 attempts by default
    message = 'Too many attempts, please try again later'
  } = options;

  return function rateLimiter(req, res, next) {
    const clientId = getClientId(req);
    const now = Date.now();

    // Get or create client record
    let clientData = attempts.get(clientId);

    if (!clientData) {
      clientData = {
        count: 0,
        resetTime: now + windowMs
      };
      attempts.set(clientId, clientData);
    }

    // Reset if window has passed
    if (now > clientData.resetTime) {
      clientData.count = 0;
      clientData.resetTime = now + windowMs;
    }

    // Increment attempt count
    clientData.count++;

    // Check if limit exceeded
    if (clientData.count > maxAttempts) {
      const retryAfter = Math.ceil((clientData.resetTime - now) / 1000);

      res.setHeader('X-RateLimit-Limit', maxAttempts);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', new Date(clientData.resetTime).toISOString());
      res.setHeader('Retry-After', retryAfter);

      return res.status(429).json({
        error: message,
        retryAfter: retryAfter
      });
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', maxAttempts);
    res.setHeader('X-RateLimit-Remaining', maxAttempts - clientData.count);
    res.setHeader('X-RateLimit-Reset', new Date(clientData.resetTime).toISOString());

    // Continue to next middleware
    if (next) next();
  };
}

/**
 * Login-specific rate limiter with progressive delays
 */
const loginRateLimiter = createRateLimiter({
  windowMs: 900000,  // 15 minutes
  maxAttempts: 5,     // 5 login attempts
  message: 'Too many login attempts. Please try again in 15 minutes.'
});

/**
 * API rate limiter for general endpoints
 */
const apiRateLimiter = createRateLimiter({
  windowMs: 60000,    // 1 minute
  maxAttempts: 100,   // 100 requests per minute
  message: 'API rate limit exceeded. Please slow down your requests.'
});

/**
 * Strict rate limiter for sensitive operations
 */
const strictRateLimiter = createRateLimiter({
  windowMs: 3600000,  // 1 hour
  maxAttempts: 3,     // 3 attempts per hour
  message: 'Maximum attempts reached for this operation. Please try again later.'
});

module.exports = {
  createRateLimiter,
  loginRateLimiter,
  apiRateLimiter,
  strictRateLimiter,
  getClientId
};