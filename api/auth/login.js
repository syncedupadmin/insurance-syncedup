import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  try {
    // Get user by email
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
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
        name: user.name,
        role: user.role,
        agency_id: user.agency_id,
        must_change_password: user.must_change_password
      },
      token: authData?.session?.access_token || jwt.sign({ 
        userId: user.id, 
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        sub: user.id
      }, process.env.JWT_SECRET || 'your-secret-key')
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}
