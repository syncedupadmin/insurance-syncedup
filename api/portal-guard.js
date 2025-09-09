/**
 * EMERGENCY PORTAL GUARD - FIXED VERSION
 * Server-side Access Control for Vercel Functions
 * CRITICAL: Prevents unauthorized access - PRODUCTION SAFE
 */

let jwt;
try {
  jwt = require('jsonwebtoken');
} catch (error) {
  console.error('Failed to load jsonwebtoken:', error);
  // Fallback JWT decode without verification for debugging
}

// JWT decode and verify function with full error handling
function verifyJWT(token) {
  try {
    if (!token) return null;
    
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('❌ JWT_SECRET not configured');
      return null;
    }
    
    if (!jwt) {
      console.error('❌ JWT library not available');
      return null;
    }
    
    const payload = jwt.verify(token, secret);
    return payload;
  } catch (error) {
    console.error('JWT verification failed:', error.message);
    return null;
  }
}

// STRICT Portal Access Control Matrix
const PORTAL_ACCESS_CONTROL = {
  'super-admin': ['super_admin'],
  'admin': ['super_admin', 'admin'], 
  'manager': ['super_admin', 'admin', 'manager'],
  'agent': ['super_admin', 'admin', 'manager', 'agent'],
  'customer-service': ['super_admin', 'admin', 'customer_service'],
  'leaderboard': ['super_admin', 'admin', 'manager', 'agent', 'customer_service']
};

// Default redirect portals for unauthorized users
const DEFAULT_PORTALS = {
  'super_admin': '/super-admin',
  'admin': '/admin', 
  'manager': '/manager',
  'agent': '/agent',
  'customer_service': '/customer-service'
};

module.exports = async function handler(req, res) {
  try {
    console.log('🛡️ Portal Guard: Starting request handling');
    console.log('Method:', req.method);
    console.log('Query:', req.query);
    console.log('JWT available:', !!jwt);
    console.log('JWT_SECRET available:', !!process.env.JWT_SECRET);
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    const { portal, file } = req.query;
    
    if (!portal || !file) {
      console.error('❌ Portal guard: Missing portal or file parameter');
      return res.status(400).json({ error: 'Missing portal or file parameter' });
    }
    
    console.log(`🛡️ Portal Guard: Checking access to ${portal} portal`);
    
    // Extract JWT token from multiple sources
    let token = null;
    
    // Try Authorization header first
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.substring(7);
    }
    
    // Try cookies as fallback
    if (!token && req.headers.cookie) {
      try {
        const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
          const parts = cookie.trim().split('=');
          if (parts.length === 2) {
            acc[parts[0]] = parts[1];
          }
          return acc;
        }, {});
        
        token = cookies['auth-token'] || cookies['syncedup_token'];
      } catch (cookieError) {
        console.error('Cookie parsing error:', cookieError.message);
      }
    }
    
    // No token found - redirect to login
    if (!token) {
      console.log(`❌ No token found for ${portal} portal - redirecting to login`);
      const loginUrl = `${req.headers.origin || 'https://' + req.headers.host}/login?error=authentication_required`;
      return res.redirect(302, loginUrl);
    }
    
    // Verify JWT token
    const payload = verifyJWT(token);
    if (!payload) {
      console.log(`❌ Invalid/expired token for ${portal} portal - redirecting to login`);
      const loginUrl = `${req.headers.origin || 'https://' + req.headers.host}/login?error=token_invalid`;
      return res.redirect(302, loginUrl);
    }
    
    const userRole = payload.role || payload.user_role;
    const userEmail = payload.email;
    
    if (!userRole || !userEmail) {
      console.log(`❌ Incomplete token payload for ${portal} portal`);
      const loginUrl = `${req.headers.origin || 'https://' + req.headers.host}/login?error=incomplete_token`;
      return res.redirect(302, loginUrl);
    }
    
    console.log(`👤 Access attempt: ${userEmail} (${userRole}) → ${portal} portal`);
    
    // Check if user role has access to this portal
    const allowedRoles = PORTAL_ACCESS_CONTROL[portal];
    if (!allowedRoles) {
      console.log(`❌ Unknown portal: ${portal}`);
      return res.status(404).json({ error: 'Portal not found' });
    }
    
    console.log(`🔍 Access Check: ${userRole} requesting ${portal} portal`);
    console.log(`🔍 Allowed roles for ${portal}:`, allowedRoles);
    console.log(`🔍 User role included?`, allowedRoles.includes(userRole));
    
    if (!allowedRoles.includes(userRole)) {
      console.log(`❌ ACCESS DENIED: ${userRole} cannot access ${portal} portal`);
      
      // Redirect to user's authorized portal
      const defaultPortal = DEFAULT_PORTALS[userRole];
      if (defaultPortal) {
        const baseUrl = req.headers.origin || 'https://' + req.headers.host;
        const redirectUrl = `${baseUrl}${defaultPortal}?access_denied=true&attempted_portal=${portal}`;
        console.log(`🔄 Redirecting to authorized portal: ${defaultPortal}`);
        return res.redirect(302, redirectUrl);
      } else {
        const loginUrl = `${req.headers.origin || 'https://' + req.headers.host}/login?error=no_authorized_portal`;
        return res.redirect(302, loginUrl);
      }
    }
    
    console.log(`✅ ACCESS GRANTED: ${userRole} authorized for ${portal} portal`);
    
    // Set authorization headers and redirect directly to the portal file
    const baseUrl = req.headers.origin || 'https://' + req.headers.host;
    const redirectUrl = `${baseUrl}${file}?authorized=true&role=${userRole}&timestamp=${Date.now()}`;
    
    res.setHeader('X-Portal-Access', 'authorized');
    res.setHeader('X-User-Role', userRole);
    res.setHeader('X-Portal-Name', portal);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    console.log(`🔄 ACCESS GRANTED: Redirecting ${userEmail} to ${file}`);
    return res.redirect(302, redirectUrl);
    
  } catch (error) {
    console.error('❌ Portal guard critical error:', error);
    
    // Fail safely - redirect to login rather than crash
    try {
      const loginUrl = `${req.headers.origin || 'https://' + req.headers.host}/login?error=system_error`;
      return res.redirect(302, loginUrl);
    } catch (redirectError) {
      console.error('❌ Even redirect failed:', redirectError);
      return res.status(500).json({ error: 'System temporarily unavailable' });
    }
  }
};