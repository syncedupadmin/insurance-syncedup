// api/auth/me.js - DEPRECATED: Use /api/auth/verify instead
module.exports = async function handler(req, res) {
  console.warn('[DEPRECATED] /api/auth/me called - use /api/auth/verify instead');

  // Call verify as a thin wrapper
  return require('./verify')(req, res);
};