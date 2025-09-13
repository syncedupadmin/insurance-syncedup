const { login } = require('../../lib/auth-bridge.js')

// Role-based redirect mapping
const getRoleRedirect = (role) => {
  const redirectMap = {
    'super_admin': '/super-admin/',  // Clean URL, no underscore, no .html
    'admin': '/admin/',
    'manager': '/manager/',
    'agent': '/agent/',
    'customer_service': '/customer-service/'
  }
  return redirectMap[role] || '/agent/'
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ success:false, error:'Missing credentials' })
  try {
    const { token, user } = await login(email, password)
    res.setHeader('Set-Cookie', [
      `auth_token=${token}; HttpOnly; Path=/; Max-Age=28800; Secure; SameSite=Lax`
    ])
    // Return format that matches client expectations
    res.status(200).json({
      success: true,
      redirect: getRoleRedirect(user.role),
      user,
      token // Also return token so client can store it
    })
  } catch (e) {
    res.status(401).json({ success:false, error: e.message })
  }
}
