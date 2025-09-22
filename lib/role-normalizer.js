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
  const pathMap = {
    'super_admin': '/_super-admin',
    'super-admin': '/_super-admin',
    'admin': '/_admin',
    'manager': '/_manager',
    'agent': '/_agent',
    'customer_service': '/_customer-service',
    'customer-service': '/_customer-service'
  };

  return pathMap[normalized] || '/_agent';
}

module.exports = {
  normalizeRole,
  roleToDisplay,
  getRolePortalPath
};