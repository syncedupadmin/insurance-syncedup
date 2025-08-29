export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Clear cookies
  res.setHeader('Set-Cookie', [
    'token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0',
    'user=; Secure; SameSite=Strict; Path=/; Max-Age=0'
  ]);

  res.status(200).json({ success: true, message: 'Logged out successfully' });
}