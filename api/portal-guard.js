const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET;
const { normalize, highestRole, roleHome, allowedPaths, canAssume } = require("./_utils/roles");

function getCookie(req, name) {
  const m = (req.headers.cookie || "").match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

module.exports = async (req, res) => {
  // Map pretty routes -> actual static dirs
  const routes = {
    "/admin": "/_admin/index.html",
    "/manager": "/_manager/index.html", 
    "/agent": "/_agent/index.html",
    "/customer-service": "/_customer-service/index.html",
    "/super-admin": "/_super-admin/index.html"
  };

  // Public routes
  const url = req.url.split("?")[0];
  if (url === "/login" || url.startsWith("/api/auth/")) {
    res.statusCode = 200;
    res.end("OK");
    return;
  }

  // Protect portal assets from direct access without auth
  const protectedAsset = /^\/_(admin|manager|agent|customer-service|super-admin)\/.+\.(css|js|png|jpg|svg|html)$/i;
  if (protectedAsset.test(url)) {
    const token = getCookie(req, "auth_token");
    if (!token) {
      res.statusCode = 302;
      res.setHeader("Location", "/login?error=asset_protected");
      res.end();
      return;
    }
    // If they have a token, let them access the asset
    res.statusCode = 200;
    res.end("OK");
    return;
  }

  // Only protect the known portals
  if (!routes[url]) {
    // Not a protected portal path; let Vercel serve the static file
    res.statusCode = 200;
    res.end("OK");
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
    const payload = jwt.verify(token, SECRET);
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

    // OK – redirect to static file
    res.statusCode = 302;
    res.setHeader("Location", routes[url]);
    res.end();
  } catch (e) {
    res.statusCode = 302;
    res.setHeader("Location", "/login?error=session_invalid");
    res.end();
  }
};