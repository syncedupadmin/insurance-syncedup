// DEPRECATED - Use /api/auth/verify instead
module.exports = async (req, res) => {
  console.warn('[DEPRECATED] /api/auth/me called - use /api/auth/verify instead');
  return res.status(410).json({
    ok: false,
    error: 'Gone',
    message: 'This endpoint is deprecated. Use /api/auth/verify instead'
  });
};