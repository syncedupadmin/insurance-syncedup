// api/auth/login.js
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // normalize body from json/string/form
  let body = req.body;
  if (Buffer.isBuffer(body)) body = body.toString('utf8');
  if (typeof body === 'string') {
    try { body = JSON.parse(body); }
    catch { body = Object.fromEntries(new URLSearchParams(body)); }
  }
  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '').normalize().trim();
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const { data: user, error } = await supabase.from('portal_users').select('*').eq('email', email).single();
  if (error || !user) return res.status(401).json({ error: 'Invalid credentials' });
  if (user.is_active === false) return res.status(403).json({ error: 'Account is deactivated' });

  const ok = await bcrypt.compare(password, String(user.password_hash || '').trim());
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  return res.status(200).json({
    user: {
      id: user.id,
      email: user.email,
      name: user.full_name || user.name || 'User',
      role: user.role,
      agency_id: user.agency_id,
      agent_id: user.agent_id
    }
  });
}