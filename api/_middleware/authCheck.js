import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here-change-this-to-something-secure';

export function requireAuth(allowedRoles = []) {
  return (handler) => async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Validate role permissions
      if (allowedRoles.length > 0 && !allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      // Set user context for RLS
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );
      
      // Set the user context for RLS policies
      await supabase.rpc('set_config', {
        key: 'app.user_id',
        value: decoded.id
      }).catch(() => {}); // Ignore if function doesn't exist
      
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
