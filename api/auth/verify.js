const { verifyToken } = require('../../lib/auth-bridge.js');
const SECRET = process.env.JWT_SECRET;

function getCookie(req, name) {
  const m = (req.headers.cookie || "").match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

module.exports = (req, res) => {
  try {
    const token = getCookie(req, "auth_token");
    if (!token) throw new Error("no token");
    const { email, role, sub } = await verifyToken(, ["auth_token","auth-token","user_role","user_roles","assumed_role"]);
    res.setHeader("Content-Type","application/json");
    res.end(JSON.stringify({ ok:true, user:{ email, role, id: sub }}));
  } catch {
    res.statusCode = 401;
    res.end(JSON.stringify({ ok:false }));
  }
};
