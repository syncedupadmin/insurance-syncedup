// PRODUCTION AGENCY ISOLATION UTILITIES
// Ensures all data access is properly scoped to user's agency

export function validateAgencyAccess(userAgencyId, requestedAgencyId, userRole) {
  // Super admin can access all agencies
  if (userRole === 'super_admin' || userRole === 'super-admin') {
    return true;
  }
  
  // All other roles can only access their own agency
  if (!userAgencyId) {
    throw new Error('User agency_id is required');
  }
  
  if (!requestedAgencyId) {
    throw new Error('Requested agency_id is required');
  }
  
  return userAgencyId === requestedAgencyId;
}

export function addAgencyFilter(query, userAgencyId, userRole, tableAlias = '') {
  // Super admin sees all data
  if (userRole === 'super_admin' || userRole === 'super-admin') {
    return query;
  }
  
  // All other roles see only their agency data
  const column = tableAlias ? `${tableAlias}.agency_id` : 'agency_id';
  return query.eq(column, userAgencyId);
}

export function validateUserContext(req) {
  const user = req.user;
  if (!user) {
    throw new Error('Authentication required');
  }
  
  if (!user.agency_id) {
    throw new Error('User agency_id is required');
  }
  
  if (!user.role) {
    throw new Error('User role is required');
  }
  
  return {
    userId: user.id || user.sub,
    agencyId: user.agency_id,
    role: user.role,
    email: user.email
  };
}

export function createAgencySecureQuery(supabase, table, userContext) {
  let query = supabase.from(table);
  
  // Apply agency filter based on user role
  if (userContext.role !== 'super_admin' && userContext.role !== 'super-admin') {
    query = query.eq('agency_id', userContext.agencyId);
  }
  
  return query;
}

export function logSecurityViolation(req, action, details) {
  const userContext = req.user || {};
  console.error('SECURITY VIOLATION:', {
    timestamp: new Date().toISOString(),
    action,
    user: userContext.email || 'unknown',
    agency: userContext.agency_id || 'unknown',
    role: userContext.role || 'unknown',
    ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    details
  });
}