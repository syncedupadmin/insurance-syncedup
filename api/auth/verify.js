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
      .select('id, email, full_name, role, agency_id, is_active')
      .eq('auth_user_id', payload.sub || payload.id)
      .single();

    let user;
    if (!dbUser) {
      // Fallback for users not in portal_users
      user = {
        id: payload.id || payload.sub,
        email: payload.email,
        name: payload.email?.split('@')[0] || 'User',
        role: payload.role || 'agent',
        roles: [payload.role || 'agent'],
        agency_id: payload.agency_id || payload.agencyId
      };
    } else if (dbUser.is_active === false) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    } else {
      // Use portal_users.id as the primary ID
      user = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.full_name || dbUser.email?.split('@')[0] || 'User',
        role: dbUser.role,
        roles: [dbUser.role],
        agency_id: dbUser.agency_id
      };
    }

    // Normalize super_admin to super-admin
    if (user.role === 'super_admin') {
      user.role = 'super-admin';
      user.roles = ['super-admin'];
    }

    // CRITICAL DEBUG LOG
    if (process.env.NODE_ENV !== 'production') {
      console.log('[VERIFY] Returning user payload:', {
        email: user.email,
        role: user.role,
        roles: user.roles,
        source: dbUser ? 'portal_users' : 'supabase_metadata',
        raw_dbUser: dbUser
      });
    }

    return res.status(200).json({
      ok: true,
      user
    });
  } catch (err) {
    console.error('[AUTH] Verify error:', err);
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
};