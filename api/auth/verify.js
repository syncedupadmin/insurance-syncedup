import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';

export default async function handler(req, res) {
  // CORS headers (mirror login)
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ valid: false, error: 'Missing token' });

  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      audience: 'syncedup-app',
      issuer: 'syncedup-auth'
    });

    // Optional DB cross-check to ensure user still exists/active
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { data: dbUser, error } = await supabase
      .from('users')
      .select('id,email,name,role,agency_id,is_active,must_change_password,login_count')
      .eq('id', payload.id)
      .single();

    let user;
    if (error || !dbUser) {
      // Handle demo and system users that don't exist in database
      const demoUsers = {
        'demo-admin': { id: 'demo-admin', email: 'admin@demo.com', name: 'Admin User', role: 'admin', agency_id: 'DEMO001', is_active: true, must_change_password: false, login_count: 0 },
        'demo-manager': { id: 'demo-manager', email: 'manager@demo.com', name: 'Manager User', role: 'manager', agency_id: 'DEMO001', is_active: true, must_change_password: false, login_count: 0 },
        'demo-agent': { id: 'demo-agent', email: 'agent@demo.com', name: 'Agent User', role: 'agent', agency_id: 'DEMO001', is_active: true, must_change_password: false, login_count: 0 },
        'demo-super': { id: 'demo-super', email: 'super@demo.com', name: 'Super Admin', role: 'super-admin', agency_id: 'DEMO001', is_active: true, must_change_password: false, login_count: 0 },
        'demo-service': { id: 'demo-service', email: 'service@demo.com', name: 'Customer Service', role: 'customer-service', agency_id: 'DEMO001', is_active: true, must_change_password: false, login_count: 0 },
        'super-admin-main': { id: 'super-admin-main', email: 'admin@syncedupsolutions.com', name: 'Super Administrator', role: 'super-admin', agency_id: 'SYSTEM', is_active: true, must_change_password: false, login_count: 0 }
      };
      
      const demoUser = demoUsers[payload.id];
      if (!demoUser) {
        return res.status(403).json({ valid: false, error: 'User not found' });
      }
      user = demoUser;
    } else if (dbUser.is_active === false) {
      return res.status(403).json({ valid: false, error: 'User inactive' });
    } else {
      user = dbUser;
    }

    // Special override: admin@syncedupsolutions.com is always super-admin
    if (user.email === 'admin@syncedupsolutions.com') {
      user.role = 'super-admin';
      user.agency_id = user.agency_id || 'SYSTEM';
    }

    const normalizedRole = user.role === 'super_admin' ? 'super-admin' : user.role;

    const responseUser = {
      id: user.id,
      email: user.email,
      firstName: user.name?.split(' ')[0] || 'User',
      lastName: user.name?.split(' ').slice(1).join(' ') || '',
      role: normalizedRole,
      agency_id: user.agency_id,
      mustChangePassword: user.must_change_password || false,
      loginCount: user.login_count || 0
    };

    return res.status(200).json({
      valid: true,
      user: responseUser,
      tokenData: { id: payload.id, email: payload.email, role: normalizedRole, iat: payload.iat, exp: payload.exp }
    });
  } catch (err) {
    return res.status(403).json({ valid: false, error: 'Invalid or expired token' });
  }
}