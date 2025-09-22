require('dotenv').config();

// Test the normalization function
const ALLOWED = new Set(['super-admin','admin','manager','customer-service','agent']);
const norm = v => String(v||'').trim().toLowerCase().replace(/_/g,'-').replace(/\s+/g,'-');

// Test cases
const testRoles = [
  'agent',
  'Agent',
  'AGENT',
  'super_admin',
  'super-admin',
  'SUPER_ADMIN',
  'admin',
  'manager',
  'customer_service',
  'customer-service',
  'invalid_role',
  null,
  undefined,
  ''
];

console.log('Role Normalization Tests:');
console.log('=========================');
testRoles.forEach(role => {
  const normalized = norm(role);
  const isValid = ALLOWED.has(normalized);
  const final = isValid ? normalized : 'agent';
  console.log(`  ${String(role).padEnd(20)} → ${normalized.padEnd(20)} Valid: ${isValid} Final: ${final}`);
});