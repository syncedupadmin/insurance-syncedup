import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  console.log('ENV CHECK:', {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
    key: process.env.SUPABASE_SERVICE_KEY ? 'SET' : 'MISSING'
  });
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  try {
    // Get user by email from portal_users table
    const { data: user, error } = await supabase
      .from('portal_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    console.log('Query result:', { user, error });

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is active (if column exists)
    if (user.is_active === false) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    console.log('Password check:', { 
      provided: password, 
      stored: user?.password_hash?.substring(0, 10) + '...', 
      valid: validPassword 
    });
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create auth session
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: process.env.SUPABASE_SERVICE_KEY // Use service key as a bypass
    }).catch(() => {
      // If auth fails, create a custom token
      return { data: { session: { access_token: jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'your-secret-key') } } };
    });

    // Debug logging
    console.log('Login successful for:', email);
    console.log('User must_change_password flag:', user.must_change_password);
    console.log('User last_password_change:', user.last_password_change);

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name || user.name,
        role: user.role,
        agency_id: user.agency_id,
        agent_id: user.agent_id,
        must_change_password: user.must_change_password || false
      },
      token: authData?.session?.access_token || jwt.sign({ 
        userId: user.id, 
        id: user.id,
        email: user.email,
        role: user.role,
        agency_id: user.agency_id,
        agent_id: user.agent_id,
        name: user.full_name || user.name,
        sub: user.id
      }, process.env.JWT_SECRET || 'your-secret-key')
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}
