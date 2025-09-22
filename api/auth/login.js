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
      .select('id, email, role, roles, agency_id')
      .eq('auth_user_id', supaUser.id || supaUser.sub)
      .single();

    // CRITICAL: Normalize roles properly
    const ALLOWED = new Set(['super-admin','admin','manager','customer-service','agent']);
    const norm = v => String(v||'').trim().toLowerCase().replace(/_/g,'-').replace(/\s+/g,'-');

    // Get portal roles - normalize and validate
    const portalRoles = (Array.isArray(pu?.roles) && pu.roles.length ? pu.roles : [pu?.role])
      .map(norm)
      .filter(r => ALLOWED.has(r));
    const portalRole = portalRoles[0] || '';

    // Get Supabase role - normalize
    const supaRoleRaw = supaUser?.app_metadata?.role ?? supaUser?.user_metadata?.role ?? '';
    const supaRole = norm(supaRoleRaw);

    // CRITICAL LOG: Both sources with normalization
    console.log('[LOGIN] Role sources after normalization:', {
      email: pu?.email || supaUser?.email,
      portalRole,
      portalRoles,
      supaRole,
      supaRoleRaw,
      foundPortalUser: !!pu,
      authUserId: supaUser.id || supaUser.sub
    });

    // Decision: portal_users wins if found, else Supabase, else default
    const finalRole = portalRole || (ALLOWED.has(supaRole) ? supaRole : 'agent');

    console.log('[LOGIN] Final role decision:', {
      finalRole,
      source: portalRole ? 'portal_users' : (ALLOWED.has(supaRole) ? 'supabase' : 'default')
    });

    const redirectPath = getRolePortalPath(finalRole);

    console.log('[LOGIN] Redirect path:', redirectPath);

    res.setHeader('Set-Cookie', [
      `auth_token=${token}; HttpOnly; Path=/; Max-Age=28800; Secure; SameSite=Lax`
    ])

    // Return format that matches client expectations
    res.status(200).json({
      ok: true,
      success: true,
      redirect: redirectPath,
      user: {
        ...supaUser,
        role: finalRole,
        roles: portalRoles.length > 0 ? portalRoles : [finalRole],
        agency_id: pu?.agency_id || supaUser?.agency_id
      },
      token // Also return token so client can store it
    })
  } catch (e) {
    res.status(401).json({ success:false, error: e.message })
  }
  });
}
