const { createClient } = require('@supabase/supabase-js');
const { verifyToken } = require('../../lib/auth-bridge.js');
const cookie = require('cookie');

function requireAuth(allowedRoles = []) {
  return (handler) => async (req, res) => {
    try {
      // Try to get token from Authorization header (for API calls) or cookies (for authenticated requests)
      let token = req.headers.authorization?.replace('Bearer ', '');

      if (!token && req.headers.cookie) {
        const cookies = cookie.parse(req.headers.cookie);
        token = cookies['auth_token'] || cookies['auth-token'];
      }

      if (!token) {
        console.log('[requireAuth] No token found');
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log('[requireAuth] Token found, verifying...');
      const decoded = await verifyToken(token);

      if (!decoded) {
        console.log('[requireAuth] Token verification failed');
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      console.log('[requireAuth] Token verified, user:', decoded.email, 'role:', decoded.role);
      
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
      console.error('[requireAuth] ERROR:', error.message, error.stack);
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(401).json({ error: 'Invalid token', details: error.message });
    }
  };
}

function logAction(supabase, userId, agencyId, action, resourceType, resourceId, changes = null) {
  return supabase.from('audit_logs').insert({
    user_id: userId,
    agency_id: agencyId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    changes
  });
}

module.exports = { requireAuth, logAction };
