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
    
    // TODO: Remove test bypass before production
    if (!token) {
      console.log('No token found, using test values');
      return {
        userId: 'test',
        agencyId: 'AGENCY001', 
        agentId: 'AGENT001',
        role: 'admin'
      };
    }
    
    // Verify and decode JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    return {
      userId: decoded.userId || decoded.id,
      agencyId: decoded.agency_id,
      agentId: decoded.agent_id,
      role: decoded.role
    };
    
  } catch (error) {
    console.error('JWT verification failed:', error.message);
    
    // TODO: Remove test bypass before production
    console.log('JWT verification failed, using test values');
    return {
      userId: 'test',
      agencyId: 'AGENCY001',
      agentId: 'AGENT001', 
      role: 'admin'
    };
  }
}