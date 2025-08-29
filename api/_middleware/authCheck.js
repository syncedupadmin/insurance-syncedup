// api/_middleware/authCheck.js
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { parse } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export function requireAuth(allowedRoles = []) {
  return (handler) => async (req, res) => {
    // Parse cookies from the request
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.token || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      if (allowedRoles.length > 0 && !allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      // Set the user context for RLS
      await supabase.rpc('set_current_user_email', { user_email: decoded.email });
      
      req.user = decoded;
      return handler(req, res);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}