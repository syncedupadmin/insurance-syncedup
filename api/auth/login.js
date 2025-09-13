const { login } = require('../../lib/auth-bridge.js')
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ ok:false, error:'Missing credentials' })
  try {
    const { token, user } = await login(email, password)
    res.setHeader('Set-Cookie', [
      `auth_token=${token}; HttpOnly; Path=/; Max-Age=28800; Secure; SameSite=Lax`
    ])
    res.status(200).json({ ok:true, user })
  } catch (e) {
    res.status(401).json({ ok:false, error: e.message })
  }
}
