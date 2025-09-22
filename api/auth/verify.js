const { verifyToken } = require('../../lib/auth-bridge.js');
const { createClient } = require('@supabase/supabase-js');

function getCookie(req, name) {
  const m = (req.headers.cookie || "").match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

module.exports = async (req, res) => {
  // Set no-cache header
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');

  try {
    const token = getCookie(req, "auth_token");
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    // Get user from portal_users
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: dbUser, error } = await supabase
      .from('portal_users')
      .select('id, email, full_name, role, roles, agency_id, is_active')
      .eq('auth_user_id', payload.sub || payload.id)
      .single();

    // CRITICAL: Apply same normalization as login
    const ALLOWED = new Set(['super-admin','admin','manager','customer-service','agent']);
    const norm = v => String(v||'').trim().toLowerCase().replace(/_/g,'-').replace(/\s+/g,'-');

    let user;
    if (!dbUser) {
      // NO FALLBACK - portal_users is the ONLY source of truth
      console.error('[VERIFY] No portal_users record for auth_user_id:', payload.sub || payload.id);
      return res.status(403).json({ ok: false, error: 'No portal user' });
    } else if (dbUser.is_active === false) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    } else {
      // Use portal_users with normalization
      const roles = (Array.isArray(dbUser.roles) && dbUser.roles.length ? dbUser.roles : [dbUser.role])
        .map(norm)
        .filter(r => ALLOWED.has(r));

      if (roles.length === 0) {
        roles.push('agent'); // Default if no valid roles
      }

      const primary = roles[0];

      user = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.full_name || dbUser.email?.split('@')[0] || 'User',
        role: primary,
        roles: roles,
        agency_id: dbUser.agency_id
      };
    }

    // Enhanced logging as required
    console.log('[VERIFY] FINAL user payload to return:', {
      id: user.id,
      email: user.email,
      role: user.role,
      roles: user.roles,
      agency_id: user.agency_id
    });

    return res.status(200).json({
      ok: true,
      user
    });
  } catch (err) {
    console.error('[AUTH] Verify error:', err);
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
};