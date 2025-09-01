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

  // Parse body
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { }
  }
  
  const email = (body?.email || '').toLowerCase().trim();
  
  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  // Get user by email only - NO PASSWORD CHECK
  const { data: user, error } = await supabase
    .from('portal_users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !user) {
    return res.status(401).json({ error: 'User not found' });
  }

  // WARNING: NO PASSWORD VERIFICATION - TEMPORARY ONLY
  console.log('WARNING: Password bypass active for user:', email);

  // Success - user logged in without password
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