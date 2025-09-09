import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // CORS headers
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  // Input validation
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Invalid input format' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    // Get user from database with agency information
    const { data: user, error } = await supabase
      .from('portal_users')
      .select(`
        id, 
        email, 
        password_hash,
        name,
        role,
        agency_id,
        is_active,
        must_change_password,
        login_count,
        agencies(name)
      `)
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      console.log(`Login attempt failed - user not found: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.is_active) {
      console.log(`Login attempt failed - inactive user: ${email}`);
      return res.status(401).json({ error: 'Account is not active' });
    }

    // Verify password using bcrypt
    if (!user.password_hash) {
      console.log(`Login attempt failed - no password hash for user: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      console.log(`Login attempt failed - incorrect password for user: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Validate role
    const validRoles = ['super_admin', 'admin', 'manager', 'agent', 'customer_service'];
    if (!validRoles.includes(user.role)) {
      console.log(`Login attempt failed - invalid role: ${user.role} for user: ${email}`);
      return res.status(403).json({ error: 'Invalid user role' });
    }

    // Update login count
    await supabase
      .from('portal_users')
      .update({ 
        login_count: (user.login_count || 0) + 1,
        last_login: new Date().toISOString()
      })
      .eq('id', user.id);

    // Generate JWT token
    const tokenPayload = {
      sub: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
      agency_id: user.agency_id,
      iat: Math.floor(Date.now() / 1000)
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.AUTH_SECRET || process.env.JWT_SECRET,
      { 
        expiresIn: '8h',
        issuer: 'syncedup-auth',
        audience: 'syncedup-app'
      }
    );

    // Prepare user response
    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      firstName: user.name?.split(' ')[0] || 'User',
      lastName: user.name?.split(' ').slice(1).join(' ') || '',
      role: user.role === 'super_admin' ? 'super-admin' : user.role,
      agency_id: user.agency_id,
      agency_name: user.agencies?.name || null,
      mustChangePassword: user.must_change_password || false,
      loginCount: (user.login_count || 0) + 1
    };

    // Determine portal redirect
    const getPortalRedirect = (role) => {
      const redirects = {
        'super_admin': '/super-admin',
        'super-admin': '/super-admin',
        'admin': '/admin',
        'manager': '/manager',
        'agent': '/agent',
        'customer_service': '/customer-service'
      };
      return redirects[role] || '/admin';
    };

    console.log(`Successful login: ${email} (${user.role})`);

    return res.status(200).json({
      success: true,
      token,
      user: userResponse,
      redirect: getPortalRedirect(user.role),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}