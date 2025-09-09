import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { setCORSHeaders, handleCORSPreflight } from '../_utils/cors.js';

const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
  // Handle CORS preflight  
  if (handleCORSPreflight(req, res)) return;
  
  // Set secure CORS headers
  setCORSHeaders(req, res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!JWT_SECRET) {
    return res.status(500).json({ valid: false, error: 'Server configuration error' });
  }

  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ valid: false, error: 'Missing token' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    // Optional DB cross-check to ensure user still exists/active
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { data: dbUser, error } = await supabase
      .from('portal_users')
      .select('id,email,full_name,name,role,agency_id,is_active,must_change_password')
      .eq('id', payload.sub || payload.id)
      .single();

    if (error || !dbUser) {
      return res.status(403).json({ valid: false, error: 'User not found' });
    }

    if (dbUser.is_active === false) {
      return res.status(403).json({ valid: false, error: 'User inactive' });
    }

    const user = dbUser;

    const normalizedRole = user.role === 'super_admin' ? 'super-admin' : user.role;

    const displayName = user.full_name || user.name || user.email;
    const responseUser = {
      id: user.id,
      email: user.email,
      firstName: displayName?.split(' ')[0] || 'User',
      lastName: displayName?.split(' ').slice(1).join(' ') || '',
      role: normalizedRole,
      agency_id: user.agency_id,
      mustChangePassword: user.must_change_password || false
    };

    return res.status(200).json({
      valid: true,
      user: responseUser,
      tokenData: { 
        id: payload.sub || payload.id, 
        email: payload.email, 
        role: normalizedRole, 
        agency_id: user.agency_id,
        iat: payload.iat, 
        exp: payload.exp 
      }
    });
  } catch (err) {
    return res.status(403).json({ valid: false, error: 'Invalid or expired token' });
  }
}