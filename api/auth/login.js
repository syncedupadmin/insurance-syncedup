const { login, verifyToken } = require('../../lib/auth-bridge.js');
const { getRolePortalPath } = require('../../lib/role-normalizer.js');
const { loginRateLimiter } = require('../../lib/rate-limiter.js');

module.exports = async function handler(req, res) {
  // Apply rate limiting to prevent brute force
  loginRateLimiter(req, res, async () => {
  if (req.method !== 'POST') return res.status(405).end()

  // If already authenticated with valid cookie, return success without re-login
  try {
    const authToken = req.cookies?.auth_token;
    if (authToken) {
      const existing = await verifyToken(authToken);
      if (existing) {
        return res.status(200).json({
          ok: true,
          success: true,
          redirect: getRolePortalPath(existing.role),
          user: existing,
          alreadyAuthenticated: true
        });
      }
    }
  } catch {
    // Ignore and continue to normal login
  }

  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ success:false, error:'Missing credentials' })
  try {
    const { token, user: supaUser } = await login(email, password)

    // Get the actual role from portal_users table
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Look up by auth_user_id (the Supabase auth ID)
    const { data: pu, error: puErr } = await supabase
      .from('portal_users')
      .select('id, email, role, roles, agency_id, auth_user_id')
      .eq('auth_user_id', supaUser.id || supaUser.sub)
      .single();

    // Also try by email if not found by auth_user_id
    let portalUser = pu;
    if (!portalUser && !puErr) {
      const { data: puByEmail } = await supabase
        .from('portal_users')
        .select('id, email, role, roles, agency_id, auth_user_id')
        .eq('email', email.toLowerCase())
        .single();
      portalUser = puByEmail;
    }

    // Extract roles from both sources
    const portalRole = (portalUser?.role || '').toString();
    const portalRoles = Array.isArray(portalUser?.roles) ? portalUser.roles : [portalRole].filter(Boolean);
    const supaRole = (supaUser?.role || '').toString();

    // CRITICAL: Log both sources
    console.log('[LOGIN] Role sources:', {
      email: email,
      portalRole: portalRole,
      portalRoles: portalRoles,
      supaRole: supaRole,
      supaUserId: supaUser.id || supaUser.sub,
      foundPortalUser: !!portalUser,
      portalUserAuthId: portalUser?.auth_user_id,
      lookupMethod: pu ? 'by_auth_id' : (portalUser ? 'by_email' : 'not_found')
    });

    // Use portal_users role if found, otherwise fallback to Supabase metadata
    const actualRole = portalRole || supaRole || 'agent';
    const redirectPath = getRolePortalPath(actualRole);

    res.setHeader('Set-Cookie', [
      `auth_token=${token}; HttpOnly; Path=/; Max-Age=28800; Secure; SameSite=Lax`
    ])

    // CRITICAL DEBUG LOG
    console.log('[LOGIN] Final decision:', {
      actualRole: actualRole,
      redirectPath: redirectPath,
      decision: portalRole ? 'using_portal_role' : (supaRole ? 'using_supa_role' : 'using_default')
    });

    // Return format that matches client expectations
    res.status(200).json({
      ok: true,
      success: true,
      redirect: redirectPath,
      user: { ...supaUser, role: actualRole, roles: portalRoles.length > 0 ? portalRoles : [actualRole] },
      token // Also return token so client can store it
    })
  } catch (e) {
    res.status(401).json({ success:false, error: e.message })
  }
  });
}
