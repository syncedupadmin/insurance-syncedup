const HIERARCHY = ["agent","customer_service","manager","admin","super_admin"];

const ACCESS = {
  super_admin: ["/super-admin","/admin","/manager","/agent","/customer-service","/dashboard"],
  admin:       ["/admin","/manager","/agent","/customer-service","/dashboard"],
  manager:     ["/manager","/agent","/dashboard"],
  agent:       ["/agent","/dashboard"],
  customer_service: ["/customer-service","/dashboard"]
};

const DOWNGRADE = {
  super_admin: ["admin","manager","agent","customer_service"],
  admin:       ["manager","agent","customer_service"],
  manager:     ["agent"],
  customer_service: ["agent"],
  agent:       []
};

const normalize = r => String(r||"").toLowerCase().replace(/[\s-]+/g,"_");
const legit = new Set(Object.keys(ACCESS));

function highestRole(roles=[]) {
  const rs = roles.map(normalize).filter(r => legit.has(r));
  if (!rs.length) return "agent";
  return rs.sort((a,b)=>HIERARCHY.indexOf(b)-HIERARCHY.indexOf(a))[0];
}

function roleHome(role) {
  return (ACCESS[role]||["/agent"])[0];
}

function allowedPaths(roles=[]) {
  const rs = roles.map(normalize).filter(r => legit.has(r));
  return new Set(rs.flatMap(r => ACCESS[r] || []));
}

function canAssume(baseRole, targetRole) {
  const base = normalize(baseRole), target = normalize(targetRole);
  return legit.has(base) && legit.has(target) && (DOWNGRADE[base]||[]).includes(target);
}

module.exports = {
  HIERARCHY, ACCESS, normalize, legit,
  highestRole, roleHome, allowedPaths, canAssume
};