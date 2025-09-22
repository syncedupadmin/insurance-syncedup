// Centralized role normalization utility
// Ensures consistent role naming across the entire application

/**
 * Normalizes role names to use underscore format
 * @param {string} role - The role to normalize
 * @returns {string} - Normalized role name
 */
function normalizeRole(role) {
  if (!role) return 'agent'; // Default role

  const roleMap = {
    'super-admin': 'super_admin',
    'super admin': 'super_admin',
    'superadmin': 'super_admin',
    'customer-service': 'customer_service',
    'customer service': 'customer_service',
    'customerservice': 'customer_service'
  };

  const normalized = role.toLowerCase().trim();
  return roleMap[normalized] || normalized;
}

/**
 * Converts normalized role to display format (with hyphens for URLs)
 * @param {string} role - The normalized role
 * @returns {string} - Display format role
 */
function roleToDisplay(role) {
  const displayMap = {
    'super_admin': 'super-admin',
    'customer_service': 'customer-service'
  };

  return displayMap[role] || role;
}

/**
 * Gets the portal path for a role
 * @param {string} role - The role (will be normalized)
 * @returns {string} - Portal path
 */
function getRolePortalPath(role) {
  const normalized = normalizeRole(role);
  // Return paths WITHOUT underscore prefix - Vercel handles the routing
  const pathMap = {
    'super_admin': '/super-admin',
    'super-admin': '/super-admin',
    'admin': '/admin',
    'manager': '/manager',
    'agent': '/agent',
    'customer_service': '/customer-service',
    'customer-service': '/customer-service'
  };

  const path = pathMap[normalized] || '/agent';
  console.log('[ROLE-NORMALIZER] getRolePortalPath:', { input: role, normalized, path });
  return path;
}

module.exports = {
  normalizeRole,
  roleToDisplay,
  getRolePortalPath
};