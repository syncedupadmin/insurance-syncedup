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
      // Fallback for users not in portal_users
      const fallbackRole = norm(payload.role || 'agent');
      const validRole = ALLOWED.has(fallbackRole) ? fallbackRole : 'agent';
      user = {
        id: payload.id || payload.sub,
        email: payload.email,
        name: payload.email?.split('@')[0] || 'User',
        role: validRole,
        roles: [validRole],
        agency_id: payload.agency_id || payload.agencyId
      };
    } else if (dbUser.is_active === false) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    } else {
      // Use portal_users with normalization
      const dbRoles = (Array.isArray(dbUser.roles) && dbUser.roles.length ? dbUser.roles : [dbUser.role])
        .map(norm)
        .filter(r => ALLOWED.has(r));
      const dbRole = dbRoles[0] || 'agent';

      user = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.full_name || dbUser.email?.split('@')[0] || 'User',
        role: dbRole,
        roles: dbRoles.length > 0 ? dbRoles : [dbRole],
        agency_id: dbUser.agency_id
      };
    }

    // CRITICAL DEBUG LOG - Log EVERYTHING
    console.log('[VERIFY] RAW dbUser:', JSON.stringify(dbUser, null, 2));
    console.log('[VERIFY] RAW payload (from token):', JSON.stringify(payload, null, 2));
    console.log('[VERIFY] Building user object:', {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      roles: user.roles,
      agency_id: user.agency_id
    });
    console.log('[VERIFY] FINAL user payload to return:', JSON.stringify(user, null, 2));

    return res.status(200).json({
      ok: true,
      user
    });
  } catch (err) {
    console.error('[AUTH] Verify error:', err);
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
};