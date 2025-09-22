// Strict role-based routing with exact matching - no substring shenanigans
(function() {
  'use strict';

  /**
   * Gets the landing path for a user based on their roles
   * Uses EXACT matching - no substring checks
   * @param {Object} user - User object with role or roles array
   * @returns {string} Portal path
   */
  function landingPathFor(user) {
    // Get roles as normalized array
    const list = (Array.isArray(user?.roles) ? user.roles : [user?.role])
                 .filter(Boolean)
                 .map(x => String(x || '').toLowerCase().trim());

    // Exact match helper
    const has = r => list.includes(r);

    // CRITICAL DEBUG LOG
    if (typeof console !== 'undefined' && console.log) {
      console.log('[ROUTE-BY-ROLE] Determining path:', {
        input_role: user.role,
        input_roles: user.roles,
        normalized_list: list,
        checks: {
          'has_super-admin': has('super-admin'),
          'has_admin': has('admin'),
          'has_manager': has('manager'),
          'has_customer-service': has('customer-service'),
          'has_agent': has('agent')
        }
      });
    }

    // Explicit precedence order with EXACT matching (no underscore prefix)
    if (has('super-admin'))      return '/super-admin';
    if (has('admin'))            return '/admin';
    if (has('manager'))          return '/manager';
    if (has('customer-service')) return '/customer-service';

    // Default to agent portal
    return '/agent';
  }

  // Export for use
  window.RouteByRole = window.RouteByRole || {};
  window.RouteByRole.landingPathFor = landingPathFor;

  // Also export as module if possible
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { landingPathFor };
  }
})();

// ES6 export
export function landingPathFor(user) {
  const list = (Array.isArray(user?.roles) ? user.roles : [user?.role])
    .filter(Boolean)
    .map(x => String(x || '').toLowerCase().trim());
  const has = r => list.includes(r);
  if (has('super-admin')) return '/super-admin';
  if (has('admin')) return '/admin';
  if (has('manager')) return '/manager';
  if (has('customer-service')) return '/customer-service';
  return '/agent';
}