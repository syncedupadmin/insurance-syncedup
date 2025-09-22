// PRODUCTION CORS Configuration - NO WILDCARDS
// Only allow production domains and Vercel preview URLs

const ALLOWED_ORIGINS = [
  'https://insurance.syncedupsolutions.com',
  'https://insurance-syncedup.vercel.app',
  // Vercel preview URLs pattern
  /^https:\/\/insurance-syncedup-[a-z0-9]+-nicks-projects-f40381ea\.vercel\.app$/
];

export function setCORSHeaders(req, res) {
  const origin = req.headers.origin;
  
  // Check if origin is allowed
  const isAllowed = ALLOWED_ORIGINS.some(allowedOrigin => {
    if (typeof allowedOrigin === 'string') {
      return origin === allowedOrigin;
    }
    if (allowedOrigin instanceof RegExp) {
      return allowedOrigin.test(origin);
    }
    return false;
  });
  
  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

export function handleCORSPreflight(req, res) {
  if (req.method === 'OPTIONS') {
    setCORSHeaders(req, res);
    return res.status(200).end();
  }
  return false;
}