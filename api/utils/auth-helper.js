import jwt from 'jsonwebtoken';

export function getUserContext(req) {
  try {
    // Extract token from Authorization header or cookies
    let token = null;
    
    if (req.headers.authorization) {
      token = req.headers.authorization.replace('Bearer ', '');
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }
    
    if (!token) {
      throw new Error('No authentication token provided');
    }
    
    // Verify JWT token - PRODUCTION ONLY, NO BYPASSES
    const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.AUTH_SECRET);
    
    return {
      userId: decoded.userId || decoded.id || decoded.user_id,
      agencyId: decoded.agency_id || decoded.agencyId,
      agentId: decoded.agent_id || decoded.agentId,
      role: decoded.role
    };
    
  } catch (error) {
    console.error('Auth verification failed:', error.message);
    throw new Error('Authentication required');
  }
}