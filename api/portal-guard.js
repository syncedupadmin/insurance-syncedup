const { verifyToken } = require('../lib/auth-bridge.js');
const SECRET = process.env.JWT_SECRET;
const { normalize, highestRole, roleHome, allowedPaths, canAssume } = require("./_utils/roles");

function getCookie(req, name) {
  const m = (req.headers.cookie || "").match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

module.exports = async (req, res) => {
  const url = req.url.split("?")[0];
  
  // Map portal routes
  const portals = {
    "/admin": "admin",
    "/manager": "manager",
    "/agent": "agent",
    "/customer-service": "customer-service",
    "/super-admin": "super-admin"
  };
  
  const portal = portals[url];
  if (!portal) {
    res.statusCode = 404;
    res.end("Not Found");
    return;
  }

  const token = getCookie(req, "auth_token");
  if (!token) {
    res.statusCode = 302;
    res.setHeader("Location", "/login?error=authentication_required");
    res.end();
    return;
  }

  try {
    const payload = await verifyToken(token, ["auth_token","auth-token","user_role","user_roles","assumed_role"]);
    // roles from cookie first, then token
    const raw = getCookie(req, "user_roles") || getCookie(req, "user_role") || payload.role || "agent";
    const roles = Array.isArray(raw) ? raw.map(normalize)
                  : (String(raw).startsWith("[") ? JSON.parse(raw).map(normalize)
                  : String(raw).split(",").map(normalize));

    const path = url.toLowerCase();
    const assumed = normalize(getCookie(req, "assumed_role")) || null;
    const hi = highestRole(roles);
    const effectiveRoles = assumed && canAssume(hi, assumed) ? [assumed] : [hi];
    const allowed = allowedPaths(effectiveRoles);

    if (!Array.from(allowed).some(p => path.startsWith(p))) {
      res.statusCode = 302;
      res.setHeader("Location", `/login?access_denied=1&from=${encodeURIComponent(path)}`);
      res.end();
      return;
    }

    // Auth OK; send to the actual index.html file
    res.statusCode = 302;
    res.setHeader("Location", `/_${portal}/index.html`);
    res.end();
  } catch (e) {
    res.statusCode = 302;
    res.setHeader("Location", "/login?error=session_invalid");
    res.end();
  }
};
