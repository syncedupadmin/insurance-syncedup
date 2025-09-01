import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Parse body if it's a string
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { }
  }
  
  const email = (body?.email || '').toLowerCase().trim();
  const password = body?.password || '';
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  // Get user
  const { data: user, error } = await supabase
    .from('portal_users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Check password
  const validPassword = await bcrypt.compare(password, user.password_hash || '');
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Success
  return res.status(200).json({
    user: {
      id: user.id,
      email: user.email,
      name: user.full_name || 'User',
      role: user.role,
      agency_id: user.agency_id,
      agent_id: user.agent_id
    }
  });
}