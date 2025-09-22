const { verifyToken } = require('../../lib/auth-bridge.js');
const { createClient } = require('@supabase/supabase-js');

function getCookie(req, name) {
  const m = (req.headers.cookie || "").match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

module.exports = async (req, res) => {
  // Set headers to prevent any caching
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Vary', 'Cookie');
  res.setHeader('Content-Type', 'application/json');

  try {
    const token = getCookie(req, "auth_token");

    // Debug logging (remove before prod)
    console.log('[VERIFY] Has cookie:', !!req.headers.cookie);
    console.log('[VERIFY] Auth token found:', !!token);

    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    // Get user from portal_users (ONLY source of truth)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: dbUser, error } = await supabase
      .from('portal_users')
      .select('id, email, full_name, role, roles, agency_id, is_active')
      .eq('auth_user_id', payload.sub || payload.id)
      .single();

    if (!dbUser || dbUser.is_active === false) {
      console.log('[VERIFY] No active portal user for auth_user_id:', payload.sub || payload.id);
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    // Normalize roles exactly as login does
    const ALLOWED = new Set(['super-admin','admin','manager','customer-service','agent']);
    const norm = v => String(v||'').trim().toLowerCase().replace(/_/g,'-').replace(/\s+/g,'-');

    const roles = (Array.isArray(dbUser.roles) && dbUser.roles.length ? dbUser.roles : [dbUser.role])
      .map(norm)
      .filter(r => ALLOWED.has(r));

    if (roles.length === 0) {
      roles.push('agent');
    }

    const user = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.full_name || dbUser.email?.split('@')[0] || 'User',
      role: roles[0],
      roles: roles,
      agency_id: dbUser.agency_id
    };

    // Debug logging (remove before prod)
    console.log('[VERIFY] User role from portal_users:', user.role, 'roles:', user.roles);

    // ONLY 200 or 401, nothing else
    return res.status(200).json({ ok: true, user });

  } catch (err) {
    console.error('[VERIFY] Error:', err.message);
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
};