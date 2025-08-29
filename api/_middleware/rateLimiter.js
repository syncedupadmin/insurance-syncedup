import rateLimit from 'express-rate-limit';

// Create different rate limiters for different endpoints
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login requests per windowMs
  message: {
    error: 'Too many login attempts from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req) => {
    // Use IP + User-Agent for better fingerprinting
    return req.ip + req.get('User-Agent');
  }
});

export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 API requests per windowMs
  message: {
    error: 'Too many API requests from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for admin tokens
    const adminTokens = (process.env.ADMIN_TOKENS || '').split(',');
    const adminToken = req.headers['x-admin-token'];
    return adminTokens.includes(adminToken);
  }
});

export const strictRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit each IP to 10 requests per windowMs for sensitive operations
  message: {
    error: 'Too many requests for this operation, please try again after 5 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Helper function to apply rate limiting in Vercel functions
export function applyRateLimit(limiter) {
  return async (req, res, next) => {
    return new Promise((resolve) => {
      limiter(req, res, (result) => {
        if (result instanceof Error) {
          return res.status(429).json(result.message || { error: 'Rate limit exceeded' });
        }
        resolve(result);
      });
    });
  };
}