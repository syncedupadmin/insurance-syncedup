const { normalize, highestRole, canAssume, roleHome } = require("../_utils/roles");

function readCookie(cookies, name) {
  const m = (cookies || "").match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.statusCode = 405; return res.end("Method Not Allowed"); }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body||"{}") : (req.body || {});
    const target = normalize(body.role);
    const rolesRaw = readCookie(req.headers.cookie, "user_roles") ||
                     readCookie(req.headers.cookie, "user_role") || "agent";
    const roles = String(rolesRaw).startsWith('[')
      ? JSON.parse(rolesRaw).map(normalize)
      : String(rolesRaw).split(",").map(normalize);

    const hi = highestRole(roles);
    if (!canAssume(hi, target)) {
      res.statusCode = 403;
      return res.end(JSON.stringify({ ok:false, error:"cannot_assume", from:hi, to:target }));
    }

    const baseFlags = "Path=/; SameSite=Lax";
    const prodFlag = process.env.VERCEL ? "; Secure" : "";
    res.setHeader("Set-Cookie", [
      `assumed_role=${encodeURIComponent(target)}; HttpOnly; ${baseFlags}${prodFlag}`,
      `active_role=${encodeURIComponent(target)}; ${baseFlags}${prodFlag}`
    ]);
    res.setHeader("Content-Type","application/json");
    return res.end(JSON.stringify({ ok:true, redirect: roleHome(target) }));

  } catch (e) {
    console.error("switch-role", e);
    res.statusCode = 400;
    return res.end(JSON.stringify({ ok:false, error:"bad_request" }));
  }
};