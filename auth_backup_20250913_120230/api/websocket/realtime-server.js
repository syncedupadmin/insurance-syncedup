const WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class RealtimeServer {
  constructor() {
    this.wss = null;
    this.clients = new Map();
    this.metrics = {
      connectedClients: 0,
      messagesPerSecond: 0,
      uptime: Date.now()
    };
    this.messageCount = 0;
    this.metricsInterval = null;
  }

  start(port = 8080) {
    this.wss = new WebSocket.Server({ 
      port,
      verifyClient: this.verifyClient.bind(this)
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    
    // Start metrics collection
    this.startMetricsCollection();
    
    // Start data broadcasting
    this.startDataBroadcasting();

    console.log(`WebSocket server started on port ${port}`);
  }

  async verifyClient(info) {
    // Extract token from query string or headers
    const url = new URL(info.req.url, 'http://localhost');
    const token = url.searchParams.get('token') || info.req.headers.authorization?.substring(7);

    if (!token) {
      return false;
    }

    try {
      // Verify JWT token
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return false;
      }

      // Get user role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, agency_id')
        .eq('id', user.id)
        .single();

      // Store user info for later use
      info.req.user = user;
      info.req.profile = profile;

      return true;
    } catch (error) {
      console.error('WebSocket auth error:', error);
      return false;
    }
  }

  handleConnection(ws, req) {
    const clientId = this.generateClientId();
    const user = req.user;
    const profile = req.profile;

    // Store client info
    this.clients.set(clientId, {
      ws,
      user,
      profile,
      connectedAt: Date.now(),
      subscriptions: new Set()
    });

    this.metrics.connectedClients = this.clients.size;

    console.log(`Client connected: ${clientId} (${profile.role})`);

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'connection_established',
      clientId,
      serverTime: new Date().toISOString(),
      subscriptions_available: this.getAvailableSubscriptions(profile.role)
    });

    // Handle messages from client
    ws.on('message', (message) => this.handleMessage(clientId, message));

    // Handle client disconnect
    ws.on('close', () => this.handleDisconnect(clientId));

    // Handle errors
    ws.on('error', (error) => this.handleError(clientId, error));

    // Auto-subscribe super admins to all channels
    if (profile.role === 'super_admin') {
      this.subscribeToChannel(clientId, 'system_metrics');
      this.subscribeToChannel(clientId, 'revenue_updates');
      this.subscribeToChannel(clientId, 'agency_updates');
      this.subscribeToChannel(clientId, 'user_updates');
      this.subscribeToChannel(clientId, 'alerts');
    }
  }

  handleMessage(clientId, message) {
    try {
      const data = JSON.parse(message.toString());
      const client = this.clients.get(clientId);

      if (!client) return;

      switch (data.type) {
        case 'subscribe':
          this.subscribeToChannel(clientId, data.channel);
          break;
        case 'unsubscribe':
          this.unsubscribeFromChannel(clientId, data.channel);
          break;
        case 'ping':
          this.sendToClient(clientId, { type: 'pong', timestamp: Date.now() });
          break;
        case 'request_data':
          this.handleDataRequest(clientId, data);
          break;
        default:
          console.log('Unknown message type:', data.type);
      }

      this.messageCount++;
    } catch (error) {
      console.error('Error handling message:', error);
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Invalid message format'
      });
    }
  }

  handleDisconnect(clientId) {
    this.clients.delete(clientId);
    this.metrics.connectedClients = this.clients.size;
    console.log(`Client disconnected: ${clientId}`);
  }

  handleError(clientId, error) {
    console.error(`Client error ${clientId}:`, error);
  }

  subscribeToChannel(clientId, channel) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Check permissions
    if (!this.hasChannelPermission(client.profile.role, channel)) {
      this.sendToClient(clientId, {
        type: 'subscription_denied',
        channel,
        reason: 'Insufficient permissions'
      });
      return;
    }

    client.subscriptions.add(channel);
    this.sendToClient(clientId, {
      type: 'subscribed',
      channel
    });

    console.log(`Client ${clientId} subscribed to ${channel}`);
  }

  unsubscribeFromChannel(clientId, channel) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions.delete(channel);
    this.sendToClient(clientId, {
      type: 'unsubscribed',
      channel
    });
  }

  hasChannelPermission(role, channel) {
    const permissions = {
      super_admin: ['system_metrics', 'revenue_updates', 'agency_updates', 'user_updates', 'alerts', 'leaderboard'],
      admin: ['agency_updates', 'user_updates', 'leaderboard'],
      manager: ['team_updates', 'leaderboard'],
      agent: ['personal_updates', 'leaderboard']
    };

    return permissions[role]?.includes(channel) || false;
  }

  getAvailableSubscriptions(role) {
    const permissions = {
      super_admin: ['system_metrics', 'revenue_updates', 'agency_updates', 'user_updates', 'alerts', 'leaderboard'],
      admin: ['agency_updates', 'user_updates', 'leaderboard'],
      manager: ['team_updates', 'leaderboard'],
      agent: ['personal_updates', 'leaderboard']
    };

    return permissions[role] || [];
  }

  sendToClient(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) return;

    try {
      client.ws.send(JSON.stringify(data));
    } catch (error) {
      console.error(`Error sending to client ${clientId}:`, error);
    }
  }

  broadcastToChannel(channel, data) {
    this.clients.forEach((client, clientId) => {
      if (client.subscriptions.has(channel)) {
        this.sendToClient(clientId, {
          ...data,
          channel,
          timestamp: Date.now()
        });
      }
    });
  }

  startMetricsCollection() {
    this.metricsInterval = setInterval(() => {
      // Calculate messages per second
      this.metrics.messagesPerSecond = this.messageCount;
      this.messageCount = 0;

      // Broadcast system metrics to subscribers
      const systemMetrics = {
        type: 'system_metrics_update',
        data: {
          ...this.metrics,
          cpu_usage: Math.floor(Math.random() * 30) + 20,
          memory_usage: Math.floor(Math.random() * 40) + 30,
          active_connections: this.metrics.connectedClients,
          uptime_hours: ((Date.now() - this.metrics.uptime) / (1000 * 60 * 60)).toFixed(2)
        }
      };

      this.broadcastToChannel('system_metrics', systemMetrics);
    }, 5000); // Every 5 seconds
  }

  startDataBroadcasting() {
    // Broadcast revenue updates every 30 seconds
    setInterval(() => {
      this.broadcastRevenueUpdate();
    }, 30000);

    // Broadcast agency updates every 60 seconds
    setInterval(() => {
      this.broadcastAgencyUpdate();
    }, 60000);

    // Simulate alerts occasionally
    setInterval(() => {
      if (Math.random() < 0.1) { // 10% chance
        this.broadcastAlert();
      }
    }, 10000);
  }

  async broadcastRevenueUpdate() {
    try {
      // Get recent commission data
      const { data: recentCommissions } = await supabase
        .from('commissions')
        .select('commission_amount, created_at, profiles:agent_id(name)')
        .order('created_at', { ascending: false })
        .limit(10);

      const totalRevenue = recentCommissions?.reduce((sum, comm) => sum + (comm.commission_amount || 0), 0) || 0;

      this.broadcastToChannel('revenue_updates', {
        type: 'revenue_update',
        data: {
          total_revenue: totalRevenue,
          recent_commissions: recentCommissions?.slice(0, 5),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error broadcasting revenue update:', error);
    }
  }

  async broadcastAgencyUpdate() {
    try {
      // Get agency stats
      const { count: totalAgencies } = await supabase
        .from('agencies')
        .select('*', { count: 'exact', head: true });

      const { count: activeAgencies } = await supabase
        .from('agencies')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      this.broadcastToChannel('agency_updates', {
        type: 'agency_stats_update',
        data: {
          total_agencies: totalAgencies || 0,
          active_agencies: activeAgencies || 0,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error broadcasting agency update:', error);
    }
  }

  broadcastAlert() {
    const alerts = [
      { type: 'warning', message: 'High CPU usage detected on server-01', severity: 'medium' },
      { type: 'info', message: 'Daily backup completed successfully', severity: 'low' },
      { type: 'success', message: 'New agency registration: Premium Insurance Co.', severity: 'low' },
      { type: 'error', message: 'Failed payment retry attempt', severity: 'high' }
    ];

    const randomAlert = alerts[Math.floor(Math.random() * alerts.length)];

    this.broadcastToChannel('alerts', {
      type: 'system_alert',
      data: {
        ...randomAlert,
        id: this.generateClientId(),
        timestamp: new Date().toISOString()
      }
    });
  }

  async handleDataRequest(clientId, request) {
    try {
      switch (request.dataType) {
        case 'dashboard_stats':
          const stats = await this.getDashboardStats();
          this.sendToClient(clientId, {
            type: 'data_response',
            requestId: request.requestId,
            data: stats
          });
          break;
        default:
          this.sendToClient(clientId, {
            type: 'data_response',
            requestId: request.requestId,
            error: 'Unknown data type'
          });
      }
    } catch (error) {
      this.sendToClient(clientId, {
        type: 'data_response',
        requestId: request.requestId,
        error: error.message
      });
    }
  }

  async getDashboardStats() {
    // Return real-time dashboard statistics
    const [agencyCount, userCount, commissionSum] = await Promise.all([
      supabase.from('agencies').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('commissions').select('commission_amount')
    ]);

    const totalRevenue = commissionSum.data?.reduce((sum, comm) => sum + (comm.commission_amount || 0), 0) || 0;

    return {
      total_agencies: agencyCount.count || 0,
      total_users: userCount.count || 0,
      total_revenue: totalRevenue,
      last_updated: new Date().toISOString()
    };
  }

  generateClientId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  stop() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    if (this.wss) {
      this.wss.close();
    }

    console.log('WebSocket server stopped');
  }
}

// Export for use as a module
module.exports = RealtimeServer;

// If running directly, start the server
if (require.main === module) {
  const server = new RealtimeServer();
  server.start(process.env.WS_PORT || 8080);

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully');
    server.stop();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully');
    server.stop();
    process.exit(0);
  });
}