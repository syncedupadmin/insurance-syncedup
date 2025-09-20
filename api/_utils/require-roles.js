const { verifyToken } = require('../../lib/auth-bridge.js');
// API gate helper for role-based access control
const { normalize, highestRole, canAssume } = require("./roles");

function getCookie(req, name) {
  const m = (req.headers.cookie || "").match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

// Direct role check function (for serverless functions)
const checkRoles = async (req, allowedRoles) => {
  try {
    const token = getCookie(req, "auth_token");
    if (!token) return { authorized: false, error: "authentication_required" };

    const payload = await verifyToken(token, ["auth_token","auth-token","user_role","user_roles","assumed_role"]);

    const raw = getCookie(req, "user_roles") || getCookie(req, "user_role") || payload.role || "agent";
    const roles = Array.isArray(raw) ? raw.map(normalize) :
                  (raw.startsWith('[') ? JSON.parse(raw).map(normalize) :
                   String(raw).split(",").map(normalize));

    const hasAccess = roles.some(role => allowedRoles.map(normalize).includes(normalize(role)));

    return {
      authorized: hasAccess,
      user: {
        roles,
        highest: roles.sort((a,b) => {
          const hierarchy = ["agent","customer_service","manager","admin","super_admin"];
          return hierarchy.indexOf(b) - hierarchy.indexOf(a);
        })[0] || "agent",
        ...payload
      }
    };
  } catch (error) {
    return { authorized: false, error: "invalid_token" };
  }
};

// Main requireRoles middleware
function requireRoles(allowedRoles) {
  return async function(handler) {
    return async function(req, res) {
      try {
        // Get token from cookie or bearer header
        const token = getCookie(req, "auth_token") ||
                     (req.headers.authorization?.replace('Bearer ', ''));

        if (!token) {
          return res.status(401).json({ error: 'No authentication token' });
        }

        // Verify token
        const payload = await verifyToken(token);
        if (!payload) {
          return res.status(401).json({ error: 'Invalid token' });
        }

        // Check roles
        const userRole = payload.role || 'agent';
        const normalizedRole = normalize(userRole);
        const normalizedAllowed = allowedRoles.map(normalize);

        if (!normalizedAllowed.includes(normalizedRole)) {
          // Check for role hierarchy (e.g., admin can access manager endpoints)
          const hierarchy = ["agent", "customer_service", "manager", "admin", "super_admin"];
          const userLevel = hierarchy.indexOf(normalizedRole);
          const requiredLevel = Math.min(...normalizedAllowed.map(r => hierarchy.indexOf(r)));

          if (userLevel < requiredLevel) {
            return res.status(403).json({ error: 'Insufficient permissions' });
          }
        }

        // Attach user to request
        req.user = payload;

        // Call the actual handler
        return handler(req, res);
      } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({ error: 'Authentication error' });
      }
    };
  };
}

module.exports = requireRoles;
module.exports.requireRoles = requireRoles;
module.exports.checkRoles = checkRoles;