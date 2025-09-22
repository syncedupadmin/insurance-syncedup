const { login, verifyToken } = require('../../lib/auth-bridge.js');
const { getRolePortalPath } = require('../../lib/role-normalizer.js');
const { loginRateLimiter } = require('../../lib/rate-limiter.js');

module.exports = async function handler(req, res) {
  // Apply rate limiting to prevent brute force
  loginRateLimiter(req, res, async () => {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ success:false, error:'Missing credentials' })

  const requestedEmail = String(email || '').trim().toLowerCase();

  // Step A: Check current session from cookie
  const authToken = req.cookies?.auth_token;
  let currentUser = null;
  if (authToken) {
    try {
      currentUser = await verifyToken(authToken);
    } catch {
      // Invalid token, will be replaced
    }
  }

  // If there's a session but for a DIFFERENT email, nuke it immediately
  if (currentUser?.email && currentUser.email.toLowerCase() !== requestedEmail) {
    console.log('[LOGIN] Session mismatch - clearing cookie for', currentUser.email, 'to login as', requestedEmail);
    res.setHeader('Set-Cookie', 'auth_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
    currentUser = null; // Clear to force new login
  }

  // REMOVED dangerous "already authenticated" shortcut - ALWAYS do real sign-in
  try {
    // Step B: ALWAYS attempt real sign-in with provided credentials
    const { token, user: supaUser } = await login(email, password)

    // Step C: Set NEW cookie from this sign-in
    res.setHeader('Set-Cookie', [
      `auth_token=${token}; HttpOnly; Path=/; Max-Age=28800; Secure; SameSite=Lax`
    ])

    // Step D: Source role ONLY from portal_users (NEVER from Supabase metadata)
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: pu } = await supabase
      .from('portal_users')
      .select('id, email, role, roles, agency_id')
      .eq('auth_user_id', supaUser.id || supaUser.sub)
      .single();

    if (!pu) {
      console.error('[LOGIN] No portal_users record for auth_user_id:', supaUser.id);
      return res.status(403).json({ ok: false, error: 'No portal user record found' });
    }

    // Normalize role strictly
    const ALLOWED = new Set(['super-admin','admin','manager','customer-service','agent']);
    const norm = v => String(v||'').trim().toLowerCase().replace(/_/g,'-').replace(/\s+/g,'-');

    const portalRoles = (Array.isArray(pu.roles) && pu.roles.length ? pu.roles : [pu.role])
      .map(norm)
      .filter(r => ALLOWED.has(r));

    if (portalRoles.length === 0) {
      portalRoles.push('agent'); // Fallback if no valid roles
    }

    const primary = portalRoles[0];
    const has = r => portalRoles.includes(r);

    // Explicit precedence with exact matching (NO substrings, NO underscores)
    const redirectPath = has('super-admin') ? '/super-admin'
                      : has('admin')        ? '/admin'
                      : has('manager')      ? '/manager'
                      : has('customer-service') ? '/customer-service'
                      : '/agent';

    // Enhanced logging to prove sources and decisions
    console.log('[LOGIN] role sources', {
      requestedEmail,
      supaUserId: supaUser.id || supaUser.sub,
      portalEmail: pu.email,
      portalRoles,
      primary,
      redirectPath
    });

    // Return format that matches client expectations
    return res.status(200).json({
      ok: true,
      success: true,
      redirect: redirectPath,
      user: {
        id: pu.id, // Use portal_users.id as primary ID
        email: pu.email,
        role: primary,
        roles: portalRoles,
        agency_id: pu.agency_id
      },
      token // Also return token so client can store it
    })
  } catch (e) {
    res.status(401).json({ success:false, error: e.message })
  }
  });
}
