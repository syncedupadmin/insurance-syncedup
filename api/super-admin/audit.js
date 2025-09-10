// ENTERPRISE AUDIT LOGGING API - CRITICAL SECURITY COMPONENT
// This API handles ALL administrator actions with complete audit trail

const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper to get cookie value
function getCookie(req, name) {
  const cookies = req.headers.cookie || '';
  const match = cookies.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

module.exports = async function handler(req, res) {
  // CORS headers for security
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Get token from cookie
  const token = getCookie(req, 'auth_token');
  
  if (!token) {
    // Log unauthorized access attempt with IP
    await logSecurityEvent(
      'UNAUTHORIZED_AUDIT_ACCESS', 
      'No authorization token provided for audit API',
      req
    );
    return res.status(401).json({ error: 'Authorization required' });
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify super admin role
    if (decoded.role !== 'super_admin') {
      await logSecurityEvent(
        'INSUFFICIENT_PRIVILEGES_AUDIT', 
        `User ${decoded.email} with role ${decoded.role} attempted audit API access`,
        req
      );
      return res.status(403).json({ error: 'Super admin privileges required' });
    }

    // Route to appropriate handler
    if (req.method === 'POST' && req.url.includes('/log')) {
      return await handleAuditLogging(req, res, decoded);
    }
    
    if (req.method === 'GET' && req.url.includes('/recent')) {
      return await handleRecentAuditLogs(req, res, decoded);
    }
    
    if (req.method === 'GET') {
      return await handleAuditLogQuery(req, res, decoded);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('CRITICAL: Audit API error:', error);
    await logSecurityEvent(
      'AUDIT_API_ERROR', 
      `Audit API encountered error: ${error.message}`,
      req
    );
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Handle administrator action logging
async function handleAuditLogging(req, res, user) {
  try {
    const {
      action,
      details,
      target_resource,
      session_id,
      screen_resolution,
      browser_language,
      referrer
    } = req.body;

    // Validate required fields
    if (!action || !details) {
      return res.status(400).json({ error: 'Action and details are required' });
    }

    // Create comprehensive audit entry
    const auditEntry = {
      admin_id: user.id,
      admin_email: user.email,
      action: action.toUpperCase(),
      details,
      target_resource,
      ip_address: getClientIP(req),
      user_agent: req.headers['user-agent'] || 'Unknown',
      session_id,
      screen_resolution,
      browser_language,
      referrer,
      timestamp: new Date().toISOString(),
      metadata: {
        request_headers: sanitizeHeaders(req.headers),
        user_role: user.user_metadata?.role || user.app_metadata?.role,
        user_agency: user.user_metadata?.agency_id
      }
    };

    // Insert audit log with error handling
    const { data, error } = await supabase
      .from('admin_audit_log')
      .insert([auditEntry])
      .select();

    if (error) {
      console.error('CRITICAL: Failed to insert audit log:', error);
      // This is a critical failure - store locally for manual review
      console.error('FAILED AUDIT ENTRY:', JSON.stringify(auditEntry, null, 2));
      return res.status(500).json({ error: 'Failed to log action' });
    }

    // Log successful audit entry
    console.log(`AUDIT: ${user.email} - ${action} - ${details}`);

    return res.status(200).json({ 
      success: true, 
      audit_id: data[0]?.id,
      timestamp: auditEntry.timestamp
    });

  } catch (error) {
    console.error('CRITICAL: Audit logging error:', error);
    return res.status(500).json({ error: 'Failed to process audit log' });
  }
}

// Handle recent audit logs retrieval
async function handleRecentAuditLogs(req, res, user) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100); // Max 100 records
    
    const { data: logs, error } = await supabase
      .from('admin_audit_log')
      .select(`
        id,
        admin_email,
        action,
        details,
        target_resource,
        ip_address,
        timestamp,
        metadata
      `)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent audit logs:', error);
      return res.status(500).json({ error: 'Failed to fetch audit logs' });
    }

    // Log the audit log access
    await supabase.from('admin_audit_log').insert([{
      admin_id: user.id,
      admin_email: user.email,
      action: 'AUDIT_LOGS_VIEWED',
      details: `Viewed ${logs?.length || 0} recent audit log entries`,
      ip_address: getClientIP(req),
      user_agent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    }]);

    return res.status(200).json(logs || []);

  } catch (error) {
    console.error('Error handling recent audit logs:', error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
}

// Handle comprehensive audit log queries with filters
async function handleAuditLogQuery(req, res, user) {
  try {
    const {
      start_date,
      end_date,
      action_type,
      target_user,
      admin_email,
      page = 1,
      limit = 50
    } = req.query;

    let query = supabase
      .from('admin_audit_log')
      .select(`
        id,
        admin_email,
        action,
        details,
        target_resource,
        ip_address,
        timestamp,
        metadata
      `);

    // Apply filters
    if (start_date) {
      query = query.gte('timestamp', start_date);
    }
    if (end_date) {
      query = query.lte('timestamp', end_date);
    }
    if (action_type) {
      query = query.eq('action', action_type.toUpperCase());
    }
    if (target_user) {
      query = query.eq('target_resource', target_user);
    }
    if (admin_email) {
      query = query.eq('admin_email', admin_email);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { data: logs, error, count } = await query
      .order('timestamp', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) {
      console.error('Error querying audit logs:', error);
      return res.status(500).json({ error: 'Failed to query audit logs' });
    }

    // Log the comprehensive audit query
    await supabase.from('admin_audit_log').insert([{
      admin_id: user.id,
      admin_email: user.email,
      action: 'COMPREHENSIVE_AUDIT_QUERY',
      details: `Queried audit logs with filters: ${JSON.stringify(req.query)}`,
      ip_address: getClientIP(req),
      user_agent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    }]);

    return res.status(200).json({
      logs: logs || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count
      },
      filters_applied: {
        start_date,
        end_date,
        action_type,
        target_user,
        admin_email
      }
    });

  } catch (error) {
    console.error('Error handling audit log query:', error);
    return res.status(500).json({ error: 'Failed to process query' });
  }
}

// Log security events (separate from admin actions)
async function logSecurityEvent(eventType, details, req) {
  try {
    const securityEvent = {
      event_type: eventType,
      severity: determineSeverity(eventType),
      ip_address: getClientIP(req),
      user_agent: req.headers['user-agent'] || 'Unknown',
      attempted_endpoint: req.url,
      details,
      timestamp: new Date().toISOString(),
      metadata: {
        method: req.method,
        headers: sanitizeHeaders(req.headers)
      }
    };

    await supabase.from('security_events').insert([securityEvent]);
    
    // Also log to console for immediate monitoring
    console.error(`SECURITY EVENT: ${eventType} - ${details} - IP: ${getClientIP(req)}`);

  } catch (error) {
    console.error('CRITICAL: Failed to log security event:', error);
  }
}

// Determine severity level for security events
function determineSeverity(eventType) {
  const highSeverityEvents = [
    'UNAUTHORIZED_AUDIT_ACCESS',
    'INVALID_TOKEN_AUDIT_ACCESS',
    'INSUFFICIENT_PRIVILEGES_AUDIT',
    'DEVELOPER_TOOLS_OPENED'
  ];
  
  return highSeverityEvents.includes(eventType) ? 'high' : 'medium';
}

// Extract client IP address with proxy support
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         (req.connection.socket && req.connection.socket.remoteAddress) ||
         'unknown';
}

// Sanitize request headers (remove sensitive data)
function sanitizeHeaders(headers) {
  const sanitized = { ...headers };
  delete sanitized.authorization;
  delete sanitized.cookie;
  delete sanitized['x-api-key'];
  return sanitized;
}