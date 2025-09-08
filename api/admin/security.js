import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Mock security data - in production, this would come from your security monitoring systems
const mockSecurityAlerts = [
  {
    id: 'alert-001',
    title: 'Multiple Failed Login Attempts',
    description: 'User attempted to login 5 times with incorrect credentials from IP 192.168.1.100',
    severity: 'HIGH',
    status: 'active',
    source: 'Authentication System',
    timestamp: new Date(Date.now() - 300000).toISOString() // 5 minutes ago
  },
  {
    id: 'alert-002',
    title: 'Suspicious File Upload',
    description: 'Executable file uploaded to document management system',
    severity: 'CRITICAL',
    status: 'active',
    source: 'File Scanner',
    timestamp: new Date(Date.now() - 900000).toISOString() // 15 minutes ago
  },
  {
    id: 'alert-003',
    title: 'Unusual Access Pattern',
    description: 'User accessing resources outside normal business hours',
    severity: 'MEDIUM',
    status: 'resolved',
    source: 'Behavior Analysis',
    timestamp: new Date(Date.now() - 1800000).toISOString() // 30 minutes ago
  }
];

let currentThreatLevel = 'MEDIUM';
let securitySettings = {
  enableBruteForceProtection: true,
  enable2FA: true,
  enableSessionTimeouts: true,
  enableIPWhitelisting: false,
  enableAuditLogging: true,
  maxLoginAttempts: 5,
  sessionTimeout: 30,
  passwordMinLength: 8
};

// Log security events
async function logSecurityEvent(userId, eventType, details, ipAddress, userAgent = 'API') {
  try {
    await supabase.from('security_events').insert({
      user_id: userId,
      event_type: eventType,
      details: JSON.stringify(details),
      ip_address: ipAddress,
      user_agent: userAgent,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

export default async function handler(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No authorization token' });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { data: currentUser } = await supabase
    .from('portal_users')
    .select('role, agency_id, id')
    .eq('id', user.id)
    .single();

  // Super admin access required for security management
  if (!currentUser || currentUser.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }

  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const { pathname } = new URL(req.url, 'http://localhost');

  // GET /api/admin/security/alerts - Get security alerts
  if (req.method === 'GET' && pathname.includes('/alerts')) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const severity = req.query.severity || '';
      const status = req.query.status || '';

      let filteredAlerts = [...mockSecurityAlerts];

      // Apply filters
      if (severity) {
        filteredAlerts = filteredAlerts.filter(alert => alert.severity === severity);
      }
      if (status) {
        filteredAlerts = filteredAlerts.filter(alert => alert.status === status);
      }

      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedAlerts = filteredAlerts.slice(startIndex, endIndex);

      await logSecurityEvent(currentUser.id, 'VIEW_SECURITY_ALERTS', { page, limit, severity, status }, clientIP, userAgent);

      return res.status(200).json({
        alerts: paginatedAlerts,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(filteredAlerts.length / limit),
          totalItems: filteredAlerts.length,
          itemsPerPage: limit
        }
      });

    } catch (error) {
      console.error('Error getting security alerts:', error);
      return res.status(500).json({ error: 'Failed to retrieve security alerts' });
    }
  }

  // GET /api/admin/security/sessions - Get active sessions
  if (req.method === 'GET' && pathname.includes('/sessions')) {
    try {
      // Get active sessions from database
      const { data: sessions, error } = await supabase
        .from('user_sessions')
        .select(`
          id,
          user_id,
          ip_address,
          user_agent,
          created_at,
          last_activity,
          is_active,
          location,
          device_info,
          portal_users (
            name,
            email,
            role
          )
        `)
        .eq('is_active', true)
        .order('last_activity', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({ error: error.message });
      }

      // Format sessions for response
      const formattedSessions = (sessions || []).map(session => ({
        id: session.id,
        userId: session.user_id,
        username: session.portal_users?.name || 'Unknown User',
        email: session.portal_users?.email || '',
        role: session.portal_users?.role || 'unknown',
        ipAddress: session.ip_address,
        userAgent: session.user_agent,
        location: session.location || 'Unknown Location',
        device: session.device_info || 'Unknown Device',
        loginTime: session.created_at,
        lastActivity: session.last_activity,
        status: 'active'
      }));

      await logSecurityEvent(currentUser.id, 'VIEW_ACTIVE_SESSIONS', { sessionCount: formattedSessions.length }, clientIP, userAgent);

      return res.status(200).json({
        sessions: formattedSessions
      });

    } catch (error) {
      console.error('Error getting active sessions:', error);
      return res.status(500).json({ error: 'Failed to retrieve active sessions' });
    }
  }

  // GET /api/admin/security/metrics - Get security metrics
  if (req.method === 'GET' && pathname.includes('/metrics')) {
    try {
      // In production, these would come from your monitoring systems
      const metrics = {
        threatLevel: currentThreatLevel,
        failedLogins: Math.floor(Math.random() * 50) + 10,
        blockedIps: Math.floor(Math.random() * 20) + 5,
        cpuUsage: Math.floor(Math.random() * 30) + 40,
        memoryUsage: Math.floor(Math.random() * 40) + 30,
        diskUsage: Math.floor(Math.random() * 20) + 60,
        networkLoad: Math.floor(Math.random() * 100) + 50,
        activeUsers: Math.floor(Math.random() * 50) + 20,
        totalSessions: Math.floor(Math.random() * 100) + 50
      };

      await logSecurityEvent(currentUser.id, 'VIEW_SECURITY_METRICS', {}, clientIP, userAgent);

      return res.status(200).json({ metrics });

    } catch (error) {
      console.error('Error getting security metrics:', error);
      return res.status(500).json({ error: 'Failed to retrieve security metrics' });
    }
  }

  // POST /api/admin/security/alerts/:id/resolve - Resolve security alert
  if (req.method === 'POST' && pathname.includes('/resolve')) {
    try {
      const alertId = pathname.split('/')[4]; // Extract alert ID from path
      const alertIndex = mockSecurityAlerts.findIndex(a => a.id === alertId);

      if (alertIndex === -1) {
        return res.status(404).json({ error: 'Alert not found' });
      }

      mockSecurityAlerts[alertIndex].status = 'resolved';
      mockSecurityAlerts[alertIndex].resolvedAt = new Date().toISOString();
      mockSecurityAlerts[alertIndex].resolvedBy = currentUser.id;

      await logSecurityEvent(currentUser.id, 'RESOLVE_SECURITY_ALERT', { alertId }, clientIP, userAgent);

      return res.status(200).json({
        success: true,
        message: 'Alert resolved successfully'
      });

    } catch (error) {
      console.error('Error resolving alert:', error);
      return res.status(500).json({ error: 'Failed to resolve alert' });
    }
  }

  // POST /api/admin/security/sessions/:id/terminate - Terminate session
  if (req.method === 'POST' && pathname.includes('/terminate')) {
    try {
      const sessionId = pathname.split('/')[4]; // Extract session ID from path

      if (pathname.includes('/terminate-all')) {
        // Terminate all sessions except current user's
        const { error } = await supabase
          .from('user_sessions')
          .update({ is_active: false, ended_at: new Date().toISOString() })
          .neq('user_id', currentUser.id)
          .eq('is_active', true);

        if (error) {
          return res.status(500).json({ error: error.message });
        }

        await logSecurityEvent(currentUser.id, 'TERMINATE_ALL_SESSIONS', {}, clientIP, userAgent);

        return res.status(200).json({
          success: true,
          message: 'All sessions terminated successfully'
        });
      } else {
        // Terminate specific session
        const { error } = await supabase
          .from('user_sessions')
          .update({ is_active: false, ended_at: new Date().toISOString() })
          .eq('id', sessionId);

        if (error) {
          return res.status(500).json({ error: error.message });
        }

        await logSecurityEvent(currentUser.id, 'TERMINATE_SESSION', { sessionId }, clientIP, userAgent);

        return res.status(200).json({
          success: true,
          message: 'Session terminated successfully'
        });
      }

    } catch (error) {
      console.error('Error terminating session:', error);
      return res.status(500).json({ error: 'Failed to terminate session' });
    }
  }

  // POST /api/admin/security/threat-level - Set threat level
  if (req.method === 'POST' && pathname.includes('/threat-level')) {
    try {
      const { threatLevel } = req.body;

      if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(threatLevel)) {
        return res.status(400).json({ error: 'Invalid threat level' });
      }

      currentThreatLevel = threatLevel;

      await logSecurityEvent(currentUser.id, 'UPDATE_THREAT_LEVEL', { newLevel: threatLevel }, clientIP, userAgent);

      return res.status(200).json({
        success: true,
        message: `Threat level set to ${threatLevel}`
      });

    } catch (error) {
      console.error('Error setting threat level:', error);
      return res.status(500).json({ error: 'Failed to update threat level' });
    }
  }

  // GET/POST /api/admin/security/settings - Get/Update security settings
  if (pathname.includes('/settings')) {
    if (req.method === 'GET') {
      try {
        await logSecurityEvent(currentUser.id, 'VIEW_SECURITY_SETTINGS', {}, clientIP, userAgent);
        return res.status(200).json({ settings: securitySettings });
      } catch (error) {
        console.error('Error getting security settings:', error);
        return res.status(500).json({ error: 'Failed to retrieve security settings' });
      }
    }

    if (req.method === 'POST') {
      try {
        const updates = req.body;
        securitySettings = { ...securitySettings, ...updates };

        await logSecurityEvent(currentUser.id, 'UPDATE_SECURITY_SETTINGS', { updates: Object.keys(updates) }, clientIP, userAgent);

        return res.status(200).json({
          success: true,
          settings: securitySettings,
          message: 'Security settings updated successfully'
        });

      } catch (error) {
        console.error('Error updating security settings:', error);
        return res.status(500).json({ error: 'Failed to update security settings' });
      }
    }
  }

  // POST /api/admin/security/export - Export security report
  if (req.method === 'POST' && pathname.includes('/export')) {
    try {
      const { startDate, endDate, includeAlerts, includeSessions, includeMetrics } = req.body;

      // In production, this would generate and return an actual PDF report
      const reportData = {
        generatedAt: new Date().toISOString(),
        period: { startDate, endDate },
        summary: {
          totalAlerts: mockSecurityAlerts.length,
          criticalAlerts: mockSecurityAlerts.filter(a => a.severity === 'CRITICAL').length,
          activeSessions: Math.floor(Math.random() * 50) + 20,
          failedLogins: Math.floor(Math.random() * 100) + 50
        }
      };

      if (includeAlerts) reportData.alerts = mockSecurityAlerts;
      if (includeSessions) reportData.sessions = [];
      if (includeMetrics) reportData.metrics = {};

      await logSecurityEvent(currentUser.id, 'EXPORT_SECURITY_REPORT', { reportData: Object.keys(reportData) }, clientIP, userAgent);

      // In production, you would create a PDF and return it as a blob
      return res.status(200).json({
        success: true,
        message: 'Security report generated successfully',
        downloadUrl: '/api/admin/security/reports/latest.pdf' // Mock URL
      });

    } catch (error) {
      console.error('Error exporting security report:', error);
      return res.status(500).json({ error: 'Failed to export security report' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}