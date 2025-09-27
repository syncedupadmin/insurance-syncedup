const { verifyToken } = require('../lib/auth-bridge.js');
/**
 * PRODUCTION AUTH HELPER - Data Isolation and Access Control
 * Enforces role-based data access at API level
 * CRITICAL: Prevents unauthorized data access
 */

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Extract user context from request
 * Returns user info with proper data isolation scope
 */
async function getUserContext(req) {
  try {
    // Get token from various sources
    let token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {});
      token = cookies['auth-token'];
    }

    if (!token) {
      throw new Error('No authentication token found');
    }

    // Verify JWT token
    const payload = await verifyToken(token);
    
    // Extract user context
    const userId = payload.sub || payload.id;
    const email = payload.email;
    const role = payload.role;
    const agencyId = payload.agency_id;

    if (!userId || !email || !role) {
      throw new Error('Invalid token payload');
    }

    return {
      userId,
      email,
      role,
      agencyId,
      agentId: userId, // For backward compatibility
      dataScope: getDataScope(role)
    };

  } catch (error) {
    throw new Error('Authentication failed: ' + error.message);
  }
}

/**
 * Get data access scope for user role
 */
function getDataScope(role) {
  const scopes = {
    'super_admin': 'ALL_AGENCIES',
    'admin': 'AGENCY_ONLY',
    'manager': 'AGENCY_ONLY', 
    'agent': 'SELF_ONLY',
    'customer_service': 'AGENCY_CUSTOMERS_ONLY'
  };
  
  return scopes[role] || 'NONE';
}

/**
 * Apply data isolation filters to Supabase query
 * CRITICAL: This enforces agency/user level data isolation
 */
function applyDataIsolation(query, userContext, options = {}) {
  const { role, agencyId, userId, dataScope } = userContext;
  
  console.log(`🔒 Applying data isolation: ${dataScope} for ${role} (${userId})`);
  
  switch (dataScope) {
    case 'ALL_AGENCIES':
      // Super admin sees everything - no filters
      console.log('   ✅ Super admin access - no filters applied');
      break;
      
    case 'AGENCY_ONLY':
      // Admin/Manager see only their agency's data
      if (agencyId) {
        query = query.eq('agency_id', agencyId);
        console.log(`   🏢 Agency filter applied: ${agencyId}`);
      } else {
        // No agency - return no results
        query = query.eq('id', 'no-access');
        console.log('   ❌ No agency_id - access denied');
      }
      break;
      
    case 'SELF_ONLY':
      // Agent sees only their own data
      if (options.agentIdField) {
        query = query.eq(options.agentIdField, userId);
      } else {
        query = query.eq('agent_id', userId);
      }
      
      if (agencyId) {
        query = query.eq('agency_id', agencyId);
      }
      console.log(`   👤 Self-only filter applied: agent_id=${userId}, agency_id=${agencyId}`);
      break;
      
    case 'AGENCY_CUSTOMERS_ONLY':
      // Customer service sees agency customers only
      if (agencyId) {
        query = query.eq('agency_id', agencyId);
        // Add customer-specific filters if needed
        if (options.customerOnly) {
          query = query.neq('role', 'agent');
        }
        console.log(`   🎧 Customer service filter applied: agency_id=${agencyId}`);
      } else {
        query = query.eq('id', 'no-access');
        console.log('   ❌ No agency_id - customer service access denied');
      }
      break;
      
    default:
      // No access - return empty results
      query = query.eq('id', 'no-access');
      console.log('   ❌ Unknown data scope - access denied');
      break;
  }
  
  return query;
}

/**
 * Check if user has access to specific portal
 */
function checkPortalAccess(userRole, portalPath) {
  const ACCESS_MATRIX = {
    'super_admin': ['/super-admin', '/admin', '/manager', '/agent', '/customer-service', '/leaderboard'],
    'admin': ['/admin', '/manager', '/agent', '/customer-service', '/leaderboard'],
    'manager': ['/manager', '/agent', '/leaderboard'],
    'agent': ['/agent', '/leaderboard'],
    'customer_service': ['/customer-service', '/leaderboard']
  };
  
  const allowedPortals = ACCESS_MATRIX[userRole] || [];
  return allowedPortals.includes(portalPath);
}

module.exports = {
  getUserContext,
  applyDataIsolation,
  checkPortalAccess,
  getDataScope
};
