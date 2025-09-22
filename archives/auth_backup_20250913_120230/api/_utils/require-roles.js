// API gate helper for role-based access control
const { normalize, highestRole, canAssume } = require("./roles");

function getCookie(req, name) {
  const m = (req.headers.cookie || "").match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

module.exports = allowed => (req,res,next) => {
  const raw = getCookie(req, "user_roles") || getCookie(req, "user_role") || "agent";
  const roles = String(raw).startsWith('[') ? JSON.parse(raw).map(normalize) : String(raw).split(",").map(normalize);
  const hi = highestRole(roles);
  const assumed = normalize(getCookie(req, "assumed_role")) || null;
  const eff = assumed && canAssume(hi, assumed) ? [assumed] : [hi];
  if (!eff.some(r => allowed.includes(r))) return res.status(403).json({ error:"forbidden" });
  next();
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