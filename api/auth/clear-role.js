// Clears the temporary override so guard falls back to highest role.
export default async function handler(req, res) {
  const isProd = /\.syncedupsolutions\.com$/i.test(req.headers.host || '');
  const baseFlags = `Path=/; Secure; SameSite=Lax`;
  const domain = isProd ? `; Domain=.syncedupsolutions.com` : '';
  const expired = 'Thu, 01 Jan 1970 00:00:01 GMT';

  res.setHeader('Set-Cookie', [
    `current_role=; Expires=${expired}; HttpOnly; ${baseFlags}${domain}`,
    `user_role=; Expires=${expired}; ${baseFlags}${domain}`
  ]);

  res.writeHead(302, { Location: '/login' /* fallback if no highest role */ });
  res.end();
}