const { verifyToken } = require('../../lib/auth-bridge.js');
import { createClient } from '@supabase/supabase-js';
import cookie from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';

export default async function handler(req, res) {
  // CORS headers
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Parse cookies from request
    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies['auth-token'];

    if (!token) {
      return res.status(401).json({ authenticated: false, error: 'No authentication token' });
    }

    // Verify JWT token
    const payload = await verifyToken(, ["auth_token","auth-token","user_role","user_roles","assumed_role"]);

    // Optional DB cross-check to ensure user still exists/active
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: dbUser, error } = await supabase
      .from('users')
      .select('id,email,name,role,agency_id,is_active,must_change_password,login_count')
      .eq('id', payload.id)
      .single();

    let user;
    if (error || !dbUser) {
      // Handle system users that don't exist in database
      const systemUsers = {
        'super-admin-main': { 
          id: 'super-admin-main', 
          email: 'admin@syncedupsolutions.com', 
          name: 'Super Administrator', 
          role: 'super-admin', 
          agency_id: 'SYSTEM', 
          is_active: true, 
          must_change_password: false, 
          login_count: 0 
        }
      };
      
      const systemUser = systemUsers[payload.id];
      if (!systemUser) {
        return res.status(403).json({ authenticated: false, error: 'User not found' });
      }
      user = systemUser;
    } else if (dbUser.is_active === false) {
      return res.status(403).json({ authenticated: false, error: 'User inactive' });
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
      authenticated: true,
      user: responseUser
    });
  } catch (err) {
    return res.status(401).json({ authenticated: false, error: 'Invalid or expired token' });
  }
}
