// Sets a temporary override for the current portal role and redirects.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { role, redirectTo } = (req.body || {});
  const legit = new Set(['agent','customer_service','manager','admin','super_admin']);
  const norm = String(role || '').toLowerCase().replace(/[\s-]+/g, '_');
  if (!legit.has(norm)) return res.status(400).json({ error: 'invalid_role' });

  const isProd = /\.syncedupsolutions\.com$/i.test(req.headers.host || '');
  const baseFlags = `Path=/; Secure; SameSite=Lax`;
  const domain = isProd ? `; Domain=.syncedupsolutions.com` : '';

  // This cookie is the "active" role; user_roles remains the source of truth.
  res.setHeader('Set-Cookie', [
    `current_role=${encodeURIComponent(norm)}; HttpOnly; ${baseFlags}${domain}`,
    // handy for client UI
    `user_role=${encodeURIComponent(norm)}; ${baseFlags}${domain}`
  ]);

  const dest = redirectTo || (
    norm === 'super_admin' ? '/super-admin' :
    norm === 'admin'       ? '/admin' :
    norm === 'manager'     ? '/manager' :
    norm === 'customer_service' ? '/customer-service' : '/agent'
  );

  res.writeHead(302, { Location: dest });
  res.end();
}