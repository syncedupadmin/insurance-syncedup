// ENTERPRISE AUDIT LOGGING API - CRITICAL SECURITY COMPONENT
// This API handles ALL administrator actions with complete audit trail

const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  // Create Supabase client inside handler to ensure env vars are loaded
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials:', { url: !!supabaseUrl, key: !!supabaseKey });
    return res.status(500).json({ error: 'Database configuration error' });
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  // CORS headers for security
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verify super admin authentication using JWT from cookie
  const getCookie = (name) => {
    const match = (req.headers.cookie || '').match(new RegExp(`(?:^|; )${name}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : null;
  };
  
  const token = getCookie('auth_token');
  if (!token) {
    return res.status(401).json({ error: 'Authorization required' });
  }
  
  let user;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const role = getCookie('user_role') || payload.role;
    
    if (role !== 'super_admin') {
      return res.status(403).json({ error: 'Super admin privileges required' });
    }
    
    user = {
      id: payload.id || payload.sub,
      email: payload.email,
      role: role
    };
  } catch (jwtError) {
    console.error('JWT verification error:', jwtError);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  try {
    // Route to appropriate handler based on method
    if (req.method === 'POST') {
      // Handle audit logging for any POST request
      return await handleAuditLogging(req, res, user);
    }
    
    if (req.method === 'GET') {
      // Handle GET requests - check for query parameters
      const url = new URL(req.url, `http://${req.headers.host}`);
      const hasLimit = url.searchParams.has('limit');
      
      // If limit parameter exists, return recent logs
      if (hasLimit) {
        const limit = Math.min(parseInt(url.searchParams.get('limit')) || 10, 100);
        
        const { data: logs, error } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) {
          console.error('Error fetching audit logs:', error);
          return res.status(500).json({ error: 'Failed to fetch audit logs' });
        }

        // Map created_at to created_at for frontend compatibility
        const entries = (logs || []).map(log => ({
          ...log,
          created_at: log.created_at,
          action: log.action || 'UNKNOWN',
          details: log.details || 'No details provided'
        }));

        return res.status(200).json({ 
          entries: entries,
          count: entries.length 
        });
      }
      
      // Otherwise handle as comprehensive query
      return await handleAuditLogQuery(req, res, user);
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
  // Create Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in handleAuditLogging');
    return res.status(500).json({ error: 'Database configuration error' });
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
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
      details: { message: details, timestamp: new Date().toISOString() }, // Plain object for JSONB
      target_resource,
      ip_address: getClientIP(req) || '0.0.0.0', // Ensure valid IP
      user_agent: req.headers['user-agent'] || 'Unknown',
      session_id,
      screen_resolution,
      browser_language,
      referrer,
      created_at: new Date().toISOString(),
      metadata: {
        request_headers: sanitizeHeaders(req.headers),
        user_role: user.role,
        user_agency: null
      },
      // Add existing columns
      agency_id: null, // Don't set agency_id for super admin
      user_id: user.id,
      user_email: user.email,
      portal: 'super-admin' // varchar accepts any text
    };

    // Insert audit log with error handling
    const { data, error } = await supabase
      .from('audit_logs')
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
      created_at: auditEntry.created_at
    });

  } catch (error) {
    console.error('CRITICAL: Audit logging error:', error);
    return res.status(500).json({ error: 'Failed to process audit log' });
  }
}

// Handle recent audit logs retrieval
async function handleRecentAuditLogs(req, res, user) {
  // Create Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in handleRecentAuditLogs');
    return res.status(500).json({ error: 'Database configuration error' });
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100); // Max 100 records
    
    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select(`
        id,
        admin_email,
        action,
        details,
        target_resource,
        ip_address,
        created_at,
        metadata
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent audit logs:', error);
      return res.status(500).json({ error: 'Failed to fetch audit logs' });
    }

    // Log the audit log access
    await supabase.from('audit_logs').insert([{
      admin_id: user.id,
      admin_email: user.email,
      action: 'AUDIT_LOGS_VIEWED',
      details: { message: `Viewed ${logs?.length || 0} recent audit log entries` },
      ip_address: getClientIP(req) || '0.0.0.0',
      user_agent: req.headers['user-agent'],
      created_at: new Date().toISOString(),
      user_id: user.id,
      user_email: user.email,
      agency_id: null,
      portal: 'super-admin'
    }]);

    return res.status(200).json(logs || []);

  } catch (error) {
    console.error('Error handling recent audit logs:', error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
}

// Handle comprehensive audit log queries with filters
async function handleAuditLogQuery(req, res, user) {
  // Create Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in handleAuditLogQuery');
    return res.status(500).json({ error: 'Database configuration error' });
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
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
      .from('audit_logs')
      .select(`
        id,
        admin_email,
        action,
        details,
        target_resource,
        ip_address,
        created_at,
        metadata
      `);

    // Apply filters
    if (start_date) {
      query = query.gte('created_at', start_date);
    }
    if (end_date) {
      query = query.lte('created_at', end_date);
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
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) {
      console.error('Error querying audit logs:', error);
      return res.status(500).json({ error: 'Failed to query audit logs' });
    }

    // Log the comprehensive audit query
    await supabase.from('audit_logs').insert([{
      admin_id: user.id,
      admin_email: user.email,
      action: 'COMPREHENSIVE_AUDIT_QUERY',
      details: { message: 'Queried audit logs', filters: req.query },
      ip_address: getClientIP(req),
      user_agent: req.headers['user-agent'],
      created_at: new Date().toISOString(),
      user_id: user.id,
      user_email: user.email,
      portal: 'super-admin'
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
  // Create Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in logSecurityEvent');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    const securityEvent = {
      event_type: eventType,
      severity: determineSeverity(eventType),
      ip_address: getClientIP(req),
      user_agent: req.headers['user-agent'] || 'Unknown',
      attempted_endpoint: req.url,
      details,
      created_at: new Date().toISOString(),
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