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
    const { token, user } = await login(email, password)
    res.setHeader('Set-Cookie', [
      `auth_token=${token}; HttpOnly; Path=/; Max-Age=28800; Secure; SameSite=Lax`
    ])

    // DEV: Log cookie headers for audit
    if (process.env.NODE_ENV !== 'production') {
      console.log('[AUTH] Set-Cookie:', 'Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800');
    }

    // Return format that matches client expectations
    res.status(200).json({
      ok: true,
      success: true,
      redirect: getRolePortalPath(user.role),
      user,
      token // Also return token so client can store it
    })
  } catch (e) {
    res.status(401).json({ success:false, error: e.message })
  }
  });
}
