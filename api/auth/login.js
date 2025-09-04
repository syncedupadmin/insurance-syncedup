import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';
const JWT_EXPIRES_IN = '1h'; // Token expires in 1 hour

export default async function handler(req, res) {
  // CORS headers (correct, cache-safe)
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

    // Fetch fields we actually use
    const { data: dbUser, error: queryError } = await supabase
      .from('users')
      .select('id,email,name,role,agency_id,must_change_password,is_active,login_count,password_hash')
      .eq('email', email.toLowerCase())
      .single();

    let user;
    if (queryError || !dbUser) {
      // Fallback for demo and system users if they don't exist in database
      const demoUsers = {
        'admin@demo.com': { id: 'demo-admin', email: 'admin@demo.com', name: 'Admin User', role: 'admin', agency_id: 'DEMO001', is_active: true, must_change_password: false, login_count: 0 },
        'manager@demo.com': { id: 'demo-manager', email: 'manager@demo.com', name: 'Manager User', role: 'manager', agency_id: 'DEMO001', is_active: true, must_change_password: false, login_count: 0 },
        'agent@demo.com': { id: 'demo-agent', email: 'agent@demo.com', name: 'Agent User', role: 'agent', agency_id: 'DEMO001', is_active: true, must_change_password: false, login_count: 0 },
        'super@demo.com': { id: 'demo-super', email: 'super@demo.com', name: 'Super Admin', role: 'super-admin', agency_id: 'DEMO001', is_active: true, must_change_password: false, login_count: 0 },
        'service@demo.com': { id: 'demo-service', email: 'service@demo.com', name: 'Customer Service', role: 'customer-service', agency_id: 'DEMO001', is_active: true, must_change_password: false, login_count: 0 },
        'admin@syncedupsolutions.com': { id: 'super-admin-main', email: 'admin@syncedupsolutions.com', name: 'Super Administrator', role: 'super-admin', agency_id: 'SYSTEM', is_active: true, must_change_password: false, login_count: 0 }
      };
      
      const demoUser = demoUsers[email.toLowerCase()];
      if (demoUser) {
        user = demoUser;
      } else {
        await new Promise(r => setTimeout(r, 100)); // user enumeration hardening
        return res.status(401).json({ error: 'Invalid email or password' });
      }
    } else {
      user = dbUser;
    }

    // Special override: admin@syncedupsolutions.com is always super-admin
    if (email.toLowerCase() === 'admin@syncedupsolutions.com') {
      user.role = 'super-admin';
      user.agency_id = user.agency_id || 'SYSTEM';
    }

    if (!user.is_active) return res.status(401).json({ error: 'Account is not active' });

    // Demo-only password check. Replace with bcrypt in prod.
    const demoPasswords = ['demo123', 'password', 'demo', '123456'];
    const isValidPassword = demoPasswords.includes(password);
    if (!isValidPassword) return res.status(401).json({ error: 'Invalid email or password' });

    // Best-effort login stats (non-fatal)
    try {
      await supabase
        .from('users')
        .update({
          login_count: (user.login_count || 0) + 1,
          last_login: new Date().toISOString()
        })
        .eq('id', user.id);
    } catch (_) {}

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

    // Response user shape (normalize role)
    const userData = {
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
      user: userData,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}