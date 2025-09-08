// API endpoint for security logging
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    
    // Verify super admin access by decoding JWT
    if (!token) {
      return res.status(403).json({ error: 'No token provided' });
    }

    try {
      // Decode JWT token to check role (basic decode, no verification for demo)
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64'));
      console.log('Security Log API - JWT Payload:', payload);
      console.log('Security Log API - Role check:', payload.role, 'Expected: super_admin');
      
      if (payload.role !== 'super_admin') {
        console.log('Security Log API - Access denied. Role:', payload.role);
        return res.status(403).json({ 
          error: 'Super admin access required',
          received_role: payload.role,
          expected_role: 'super_admin'
        });
      }
    } catch (e) {
      console.log('Security Log API - Token decode error:', e.message);
      return res.status(403).json({ error: 'Invalid token', details: e.message });
    }

    const { event_type, description, severity, ip_address } = req.body;

    // Log the security event (console logging for now - no database required)
    console.log(`SECURITY EVENT: ${event_type} - ${description} [${severity}] from ${ip_address || 'unknown'}`);

    // Create log entry object (no database insert for now)
    const logEntry = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      event_type,
      description,
      severity: severity || 'info',
      ip_address: ip_address || 'unknown',
      user_agent: req.headers['user-agent'] || 'unknown',
      status: 'logged'
    };

    res.status(200).json({
      success: true,
      message: 'Security event logged successfully',
      log_id: logEntry.id,
      timestamp: logEntry.timestamp
    });

  } catch (error) {
    console.error('Security logging error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to log security event'
    });
  }
}