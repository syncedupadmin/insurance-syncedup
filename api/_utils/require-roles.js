// API gate helper for role-based access control
const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET;

const normalize = r => String(r||"").toLowerCase().replace(/[\s-]+/g,"_");

function getCookie(req, name) {
  const m = (req.headers.cookie || "").match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export const requireRoles = (allowedRoles) => {
  return (req, res, next) => {
    try {
      const token = getCookie(req, "auth_token");
      if (!token) {
        return res.status(401).json({ error: "authentication_required" });
      }

      const payload = jwt.verify(token, SECRET);
      
      // Get user roles - support both single role and multi-role
      const raw = getCookie(req, "user_roles") || getCookie(req, "user_role") || payload.role || "agent";
      const roles = Array.isArray(raw) ? raw.map(normalize) : 
                    (raw.startsWith('[') ? JSON.parse(raw).map(normalize) : 
                     String(raw).split(",").map(normalize));

      // Check if user has any of the required roles
      const hasAccess = roles.some(role => allowedRoles.map(normalize).includes(normalize(role)));
      
      if (!hasAccess) {
        return res.status(403).json({ 
          error: "forbidden", 
          required: allowedRoles,
          user_roles: roles 
        });
      }

      // Attach user info for downstream use
      req.user = { 
        roles, 
        highest: roles.sort((a,b) => {
          const hierarchy = ["agent","customer_service","manager","admin","super_admin"];
          return hierarchy.indexOf(b) - hierarchy.indexOf(a);
        })[0] || "agent",
        ...payload
      };

      if (typeof next === 'function') {
        next();
      } else {
        return true; // For direct usage without middleware pattern
      }
    } catch (error) {
      return res.status(401).json({ error: "invalid_token" });
    }
  };
};

// Direct role check function (for serverless functions)
export const checkRoles = async (req, allowedRoles) => {
  try {
    const token = getCookie(req, "auth_token");
    if (!token) return { authorized: false, error: "authentication_required" };

    const payload = jwt.verify(token, SECRET);
    
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