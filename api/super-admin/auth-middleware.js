// Shared authentication middleware for super admin APIs
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper to get cookie value
function getCookie(req, name) {
  const cookies = req.headers.cookie || '';
  const match = cookies.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Verify super admin authentication
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object|null} - Returns user object if authenticated, null otherwise
 */
async function verifySuperAdmin(req, res) {
  // Get token from cookie
  const token = getCookie(req, 'auth_token');
  
  if (!token) {
    res.status(401).json({ error: 'Authorization required' });
    return null;
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user's actual role from portal_users table
    const { data: dbUser, error: dbError } = await supabase
      .from('portal_users')
      .select('id, email, role, full_name, agency_id')
      .eq('email', decoded.email)
      .single();

    if (dbError || !dbUser) {
      res.status(403).json({ error: 'User not found in database' });
      return null;
    }

    // Check if user has super_admin role
    if (dbUser.role !== 'super_admin') {
      // Log security event if logSecurityEvent function exists
      if (typeof logSecurityEvent === 'function') {
        await logSecurityEvent(
          'INSUFFICIENT_PRIVILEGES',
          `${dbUser.email} attempted super admin access with role: ${dbUser.role}`,
          req
        );
      }
      res.status(403).json({ error: 'Super admin privileges required' });
      return null;
    }

    // Return the authenticated user
    return dbUser;
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      res.status(403).json({ error: 'Invalid or expired token' });
    } else {
      console.error('Auth middleware error:', error);
      res.status(500).json({ error: 'Authentication error' });
    }
    return null;
  }
}

module.exports = { verifySuperAdmin, getCookie };