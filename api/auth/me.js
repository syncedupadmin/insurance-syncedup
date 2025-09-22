// DEPRECATED - Use /api/auth/verify instead
module.exports = async (req, res) => {
  console.warn('[DEPRECATED] /api/auth/me called - use /api/auth/verify instead');
  return require('./verify.js')(req, res);
};