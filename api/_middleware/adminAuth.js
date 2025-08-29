export function requireAdmin(handler) {
  return async (req, res) => {
    // Quick implementation - we'll improve this later today
    const adminToken = req.headers['x-admin-token'];
    const ADMIN_TOKENS = process.env.ADMIN_TOKENS?.split(',') || ['temp-admin-key-2024'];
    
    if (!adminToken || !ADMIN_TOKENS.includes(adminToken)) {
      return res.status(403).json({ 
        error: 'Admin access required',
        message: 'This endpoint requires admin privileges'
      });
    }
    
    // Log admin action
    console.log(`Admin action: ${req.method} ${req.url} at ${new Date().toISOString()}`);
    
    return handler(req, res);
  };
}