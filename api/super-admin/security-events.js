// ENTERPRISE SECURITY EVENTS API - CRITICAL INCIDENT MONITORING
// Provides real-time security event monitoring and alerting

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verify super admin authorization
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    await logSecurityEvent('UNAUTHORIZED_SECURITY_EVENTS_ACCESS', 'No token provided', req);
    return res.status(401).json({ error: 'Authorization required' });
  }

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      await logSecurityEvent('INVALID_TOKEN_SECURITY_EVENTS', 'Invalid token for security events', req);
      return res.status(403).json({ error: 'Invalid authorization' });
    }

    // Verify super admin role
    if (user.user_metadata?.role !== 'super_admin' && user.app_metadata?.role !== 'super_admin') {
      await logSecurityEvent('INSUFFICIENT_PRIVILEGES_SECURITY_EVENTS', `${user.email} attempted security events access`, req);
      return res.status(403).json({ error: 'Super admin privileges required' });
    }

    // Route to appropriate handler
    switch (req.method) {
      case 'GET':
        if (req.url.includes('/summary')) {
          return await handleSecurityEventsSummary(req, res, user);
        }
        return await handleGetSecurityEvents(req, res, user);
      case 'POST':
        return await handleCreateSecurityEvent(req, res, user);
      case 'DELETE':
        return await handleDeleteSecurityEvent(req, res, user);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('CRITICAL: Security Events API error:', error);
    await logSecurityEvent('SECURITY_EVENTS_API_ERROR', `API error: ${error.message}`, req);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Get security events with filtering and pagination
async function handleGetSecurityEvents(req, res, user) {
  try {
    const {
      page = 1,
      limit = 50,
      severity_filter,
      event_type_filter,
      start_date,
      end_date,
      ip_filter
    } = req.query;

    let query = supabase
      .from('security_events')
      .select('*', { count: 'exact' });

    // Apply filters
    if (severity_filter && severity_filter !== 'all') {
      query = query.eq('severity', severity_filter);
    }
    
    if (event_type_filter && event_type_filter !== 'all') {
      query = query.eq('event_type', event_type_filter);
    }
    
    if (start_date) {
      query = query.gte('timestamp', start_date);
    }
    
    if (end_date) {
      query = query.lte('timestamp', end_date);
    }
    
    if (ip_filter) {
      query = query.eq('ip_address', ip_filter);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { data: events, error, count } = await query
      .order('timestamp', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) {
      console.error('Error fetching security events:', error);
      return res.status(500).json({ error: 'Failed to fetch security events' });
    }

    // Log access
    await logAdminAction(user, 'SECURITY_EVENTS_ACCESSED', 
      `Retrieved ${events?.length || 0} security events with filters`, req);

    return res.status(200).json({
      events: events || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        total_pages: Math.ceil(count / parseInt(limit))
      },
      filters_applied: {
        severity_filter,
        event_type_filter,
        start_date,
        end_date,
        ip_filter
      }
    });

  } catch (error) {
    console.error('Error handling security events retrieval:', error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
}

// Get security events summary and analytics
async function handleSecurityEventsSummary(req, res, user) {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get events from last 24 hours
    const { data: recentEvents, error: recentError } = await supabase
      .from('security_events')
      .select('*')
      .gte('timestamp', twentyFourHoursAgo)
      .order('timestamp', { ascending: false });

    if (recentError) {
      console.error('Error fetching recent security events:', recentError);
      return res.status(500).json({ error: 'Failed to fetch recent events' });
    }

    // Get events from last 7 days for trend analysis
    const { data: weeklyEvents, error: weeklyError } = await supabase
      .from('security_events')
      .select('event_type, severity, timestamp')
      .gte('timestamp', sevenDaysAgo);

    if (weeklyError) {
      console.error('Error fetching weekly security events:', weeklyError);
    }

    // Calculate summary statistics
    const totalEvents24h = recentEvents?.length || 0;
    const highSeverityEvents = recentEvents?.filter(e => e.severity === 'high').length || 0;
    const mediumSeverityEvents = recentEvents?.filter(e => e.severity === 'medium').length || 0;
    const lowSeverityEvents = recentEvents?.filter(e => e.severity === 'low').length || 0;

    // Event type distribution
    const eventTypeDistribution = {};
    recentEvents?.forEach(event => {
      eventTypeDistribution[event.event_type] = (eventTypeDistribution[event.event_type] || 0) + 1;
    });

    // Top threat IPs
    const ipThreats = {};
    recentEvents?.forEach(event => {
      if (event.ip_address && event.severity === 'high') {
        ipThreats[event.ip_address] = (ipThreats[event.ip_address] || 0) + 1;
      }
    });

    const topThreats = Object.entries(ipThreats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([ip, count]) => ({ ip_address: ip, threat_count: count }));

    const summary = {
      last_24_hours: {
        total_events: totalEvents24h,
        high_severity: highSeverityEvents,
        medium_severity: mediumSeverityEvents,
        low_severity: lowSeverityEvents
      },
      event_distribution: eventTypeDistribution,
      top_threat_ips: topThreats,
      recent_critical_events: recentEvents?.filter(e => e.severity === 'high').slice(0, 10) || [],
      generated_at: new Date().toISOString()
    };

    // Log summary access
    await logAdminAction(user, 'SECURITY_EVENTS_SUMMARY_ACCESSED', 
      `Retrieved security events summary - ${totalEvents24h} events in last 24h`, req);

    return res.status(200).json(summary);

  } catch (error) {
    console.error('Error generating security events summary:', error);
    return res.status(500).json({ error: 'Failed to generate summary' });
  }
}

// Create manual security event
async function handleCreateSecurityEvent(req, res, user) {
  try {
    const { event_type, severity, details, ip_address } = req.body;
    
    if (!event_type || !severity || !details) {
      return res.status(400).json({ error: 'Event type, severity, and details required' });
    }

    // Validate severity level
    if (!['low', 'medium', 'high', 'critical'].includes(severity)) {
      return res.status(400).json({ error: 'Invalid severity level' });
    }

    const newEvent = {
      event_type: event_type.toUpperCase(),
      severity,
      details,
      ip_address: ip_address || getClientIP(req),
      user_agent: req.headers['user-agent'] || 'Manual Entry',
      attempted_endpoint: 'Manual',
      timestamp: new Date().toISOString(),
      metadata: {
        created_by: user.email,
        manual_entry: true
      }
    };

    const { data: createdEvent, error } = await supabase
      .from('security_events')
      .insert([newEvent])
      .select()
      .single();

    if (error) {
      console.error('Failed to create security event:', error);
      return res.status(500).json({ error: 'Failed to create security event' });
    }

    // Audit log
    await logAdminAction(user, 'SECURITY_EVENT_CREATED', 
      `Manually created ${severity} security event: ${event_type} - ${details}`, req);

    return res.status(201).json({
      success: true,
      message: 'Security event created successfully',
      event: createdEvent
    });

  } catch (error) {
    console.error('Error creating security event:', error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
}

// Delete security event
async function handleDeleteSecurityEvent(req, res, user) {
  try {
    const { event_id } = req.query;
    
    if (!event_id) {
      return res.status(400).json({ error: 'Event ID required' });
    }

    // Get event details before deletion
    const { data: eventToDelete, error: fetchError } = await supabase
      .from('security_events')
      .select('*')
      .eq('id', event_id)
      .single();

    if (fetchError || !eventToDelete) {
      return res.status(404).json({ error: 'Security event not found' });
    }

    const { error } = await supabase
      .from('security_events')
      .delete()
      .eq('id', event_id);

    if (error) {
      console.error('Failed to delete security event:', error);
      return res.status(500).json({ error: 'Failed to delete security event' });
    }

    // Critical audit log
    await logAdminAction(user, 'SECURITY_EVENT_DELETED', 
      `Deleted security event: ${eventToDelete.event_type} - ${eventToDelete.details}`, 
      req, event_id);

    return res.status(200).json({
      success: true,
      message: 'Security event deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting security event:', error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
}

// Utility functions
async function logAdminAction(user, action, details, req, targetResource = null) {
  try {
    const auditEntry = {
      admin_id: user.id,
      admin_email: user.email,
      action: action.toUpperCase(),
      details,
      target_resource: targetResource,
      ip_address: getClientIP(req),
      user_agent: req.headers['user-agent'] || 'Unknown',
      timestamp: new Date().toISOString()
    };

    await supabase.from('admin_audit_log').insert([auditEntry]);
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
}

async function logSecurityEvent(eventType, details, req) {
  try {
    const securityEvent = {
      event_type: eventType,
      severity: 'high',
      ip_address: getClientIP(req),
      user_agent: req.headers['user-agent'] || 'Unknown',
      attempted_endpoint: req.url,
      details,
      timestamp: new Date().toISOString()
    };

    await supabase.from('security_events').insert([securityEvent]);
    console.error(`SECURITY EVENT: ${eventType} - ${details}`);
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection.remoteAddress ||
         'unknown';
}