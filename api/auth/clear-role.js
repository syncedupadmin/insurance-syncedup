module.exports = async (req, res) => {
  const baseFlags = "Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax";
  const prodFlag = process.env.VERCEL ? "; Secure" : "";
  res.setHeader("Set-Cookie", [
    `assumed_role=; HttpOnly; ${baseFlags}${prodFlag}`,
    `active_role=; ${baseFlags}${prodFlag}`
  ]);
  res.setHeader("Content-Type","application/json");
  res.end(JSON.stringify({ ok:true, redirect: "/" }));
};