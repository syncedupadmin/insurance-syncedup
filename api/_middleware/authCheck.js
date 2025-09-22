import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import cookie from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';

export function requireAuth(allowedRoles = []) {
  return (handler) => async (req, res) => {
    try {
      // Try to get token from Authorization header (for API calls) or cookies (for authenticated requests)
      let token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token && req.headers.cookie) {
        const cookies = cookie.parse(req.headers.cookie);
        token = cookies['auth-token'];
      }
      
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Validate role permissions (handle both 'super-admin' and 'super_admin' formats)
      if (allowedRoles.length > 0) {
        const normalizedUserRole = decoded.role.replace('-', '_');
        const normalizedAllowedRoles = allowedRoles.map(role => role.replace('-', '_'));
        
        if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }
      }
      
      // Set user context for RLS
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );
      
      // Set the user context for RLS policies
      try {
        await supabase.rpc('set_config', {
          key: 'app.user_id',
          value: decoded.id
        });
      } catch (error) {
        // Ignore RLS setup errors for now
        console.log('RLS setup skipped:', error.message);
      }
      
      req.user = decoded;
      req.supabase = supabase;
      
      return handler(req, res);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

export function logAction(supabase, userId, agencyId, action, resourceType, resourceId, changes = null) {
  return supabase.from('audit_logs').insert({
    user_id: userId,
    agency_id: agencyId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    changes
  });
}
