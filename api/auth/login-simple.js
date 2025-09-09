import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';
const JWT_EXPIRES_IN = '1h';

export default async function handler(req, res) {
  // CORS headers
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Invalid input format' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Query portal_users table first, then users table as fallback
    let { data: userData, error: userError } = await supabase
      .from('portal_users')
      .select('id,email,name,role,agency_id,must_change_password,active,login_count,password_hash')
      .eq('email', email.toLowerCase())
      .single();
    
    // If not found in portal_users, try users table
    if (userError || !userData) {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id,email,name,role,agency_id,must_change_password,is_active,login_count,password_hash')
        .eq('email', email.toLowerCase())
        .single();
      
      if (!usersError && usersData) {
        userData = usersData;
        userError = null;
      }
    }

    let user;
    if (userError || !userData) {
      // No fallback users - all authentication must go through database
      return res.status(401).json({ error: 'Invalid email or password' });
    } else {
      user = userData;
      // Normalize the active field (portal_users uses 'active', users uses 'is_active')
      user.is_active = user.is_active || user.active;
    }

    // Role normalization
    if (user.role === 'super_admin') {
      user.role = 'super-admin';
    }

    if (!user.is_active) return res.status(401).json({ error: 'Account is not active' });

    // Password verification using bcrypt only
    let isValidPassword = false;
    
    if (user.password_hash) {
      try {
        const bcrypt = await import('bcrypt');
        isValidPassword = await bcrypt.compare(password, user.password_hash);
      } catch (bcryptError) {
        console.log('Bcrypt verification failed:', bcryptError.message);
        isValidPassword = false;
      }
    }
    
    if (!isValidPassword) return res.status(401).json({ error: 'Invalid email or password' });

    // Create JWT
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      agency_id: user.agency_id,
      iat: Math.floor(Date.now() / 1000)
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'syncedup-auth',
      audience: 'syncedup-app'
    });

    // Response user data
    const userData_response = {
      id: user.id,
      email: user.email,
      firstName: user.name?.split(' ')[0] || 'User',
      lastName: user.name?.split(' ').slice(1).join(' ') || '',
      role: user.role === 'super_admin' ? 'super-admin' : user.role,
      agency_id: user.agency_id,
      mustChangePassword: user.must_change_password || false,
      loginCount: (user.login_count || 0) + 1
    };

    return res.status(200).json({
      success: true,
      user: userData_response,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}