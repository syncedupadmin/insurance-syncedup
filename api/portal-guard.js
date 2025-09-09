const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET;

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
    const role = String(payload.role || "").toLowerCase();

    const allowed = {
      "super_admin": ["/super-admin","/admin","/manager","/agent","/customer-service"],
      "admin":       ["/admin","/manager","/agent","/customer-service"],
      "manager":     ["/manager","/agent"],
      "agent":       ["/agent"],
      "customer_service": ["/customer-service"]
    };

    // normalize role
    const norm = role.replace(/[\s-]+/g, "_");
    const can = allowed[norm] || [];

    if (!can.includes(url)) {
      res.statusCode = 302;
      res.setHeader("Location", "/login?error=access_denied");
      res.end();
      return;
    }

    // Auth OK; send to the static html in /public
    res.statusCode = 302;
    res.setHeader("Location", routes[url]);
    res.end();
  } catch (e) {
    res.statusCode = 302;
    res.setHeader("Location", "/login?error=session_invalid");
    res.end();
  }
};