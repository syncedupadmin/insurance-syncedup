// Centralized authentication middleware for API endpoints
const { verifyToken } = require('./auth-bridge.js');
const { normalizeRole } = require('./role-normalizer.js');

/**
 * Gets cookie value from request
 * @param {Object} req - Request object
 * @param {string} name - Cookie name
 * @returns {string|null} - Cookie value or null
 */
function getCookie(req, name) {
  const match = (req.headers.cookie || '').match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Authentication middleware - checks if user is authenticated
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object|null} - User object if authenticated, null otherwise
 */
async function requireAuth(req, res) {
  const token = getCookie(req, 'auth_token');

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }

  try {
    const user = await verifyToken(token, ['auth_token', 'auth-token', 'user_role', 'user_roles']);
    if (!user) {
      res.status(401).json({ error: 'Invalid authentication token' });
      return null;
    }

    // Normalize the role
    user.role = normalizeRole(user.role);
    return user;
  } catch (error) {
    console.error('Auth verification error:', error);
    res.status(401).json({ error: 'Authentication failed' });
    return null;
  }
}

/**
 * Role-based access control middleware
 * @param {Array<string>} allowedRoles - Array of allowed roles
 * @returns {Function} - Middleware function
 */
function requireRoles(allowedRoles) {
  return async function(req, res) {
    const user = await requireAuth(req, res);
    if (!user) return null; // Auth already handled the response

    const normalizedRole = normalizeRole(user.role);
    const normalizedAllowed = allowedRoles.map(normalizeRole);

    // Super admin can access everything
    if (normalizedRole === 'super_admin') {
      return user;
    }

    if (!normalizedAllowed.includes(normalizedRole)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return null;
    }

    return user;
  };
}

/**
 * Check if user has specific role
 * @param {Object} user - User object
 * @param {string} role - Role to check
 * @returns {boolean} - True if user has role
 */
function hasRole(user, role) {
  if (!user) return false;
  const userRole = normalizeRole(user.role);
  const checkRole = normalizeRole(role);

  // Super admin has all permissions
  if (userRole === 'super_admin') return true;

  return userRole === checkRole;
}

/**
 * Check if user has any of the specified roles
 * @param {Object} user - User object
 * @param {Array<string>} roles - Roles to check
 * @returns {boolean} - True if user has any of the roles
 */
function hasAnyRole(user, roles) {
  if (!user) return false;
  const userRole = normalizeRole(user.role);

  // Super admin has all permissions
  if (userRole === 'super_admin') return true;

  const normalizedRoles = roles.map(normalizeRole);
  return normalizedRoles.includes(userRole);
}

module.exports = {
  getCookie,
  requireAuth,
  requireRoles,
  hasRole,
  hasAnyRole
};