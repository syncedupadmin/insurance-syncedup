const { requireAuth } = require('../../_middleware/authCheck.js');
const { getConvosoToken, getConvosoConfig, makeConvosoRequest } = require('../../_utils/convoso-helper.js');

async function convosoMonitorHandler(req, res) {
  const supabase = req.supabase;
  const user = req.user;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Convoso Monitor API - User:', user.role, 'Agency:', user.agency_id);

    // Try to get full config first (new system)
    const convosoConfig = await getConvosoConfig(supabase, user.agency_id);

    let convosoToken = null;
    let baseUrl = null;

    if (convosoConfig && convosoConfig.api_key) {
      // Use new integration system
      convosoToken = convosoConfig.api_key;
      baseUrl = convosoConfig.base_url;
      console.log('Using Convoso credentials from new integration system');
    } else {
      // Fall back to old system
      convosoToken = await getConvosoToken(supabase, user.agency_id);
      console.log('Using Convoso credentials from old system or no credentials found');
    }

    if (!convosoToken) {
      return res.status(200).json({
        success: false,
        error: 'no_token',
        message: 'No Convoso API token configured for this agency. Please add your Convoso token in Settings.',
        data: null,
        // Provide helpful debug info
        debug: {
          agency_id: user.agency_id,
          checked_systems: ['agencies.api_credentials', 'api_keys table'],
          recommendation: 'Please go to Admin > Settings and configure your Convoso API credentials.'
        }
      });
    }

    const { campaign_id, queue_id, user_id, filter_by_skill_options } = req.query;

    const params = {};
    if (campaign_id) params.campaign_id = campaign_id;
    if (queue_id) params.queue_id = queue_id;
    if (user_id) params.user_id = user_id;
    if (filter_by_skill_options) params.filter_by_skill_options = filter_by_skill_options;

    // Pass the base URL if we have it from the config
    const convosoData = await makeConvosoRequest(convosoToken, 'agent-monitor/search', params, baseUrl);

    // Process and structure the response data
    const processedData = processMonitorData(convosoData);

    return res.status(200).json({
      success: true,
      ...processedData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Convoso Monitor API error:', error);

    if (error.message?.includes('Convoso API error')) {
      return res.status(502).json({
        success: false,
        error: 'convoso_api_error',
        message: 'Failed to connect to Convoso API. Please verify your API token in Settings.',
        details: error.message
      });
    }

    return res.status(500).json({
      success: false,
      error: 'internal_error',
      message: 'Internal server error',
      details: error.message
    });
  }
}

// Process the raw Convoso data into a structured format for the frontend
function processMonitorData(rawData) {
  // Handle different response structures from Convoso
  const data = rawData.data || rawData;

  // Default structure if no data
  const defaultResponse = {
    stats: {
      totalCalls: 0,
      callsRinging: 0,
      outboundWaiting: 0,
      inboundWaiting: 0,
      messagesPlaying: 0,
      dialableLeads: 0,
      leadsInHopper: 0,
      dialLevel: 0,
      avgAgents: 0,
      outboundToday: 0,
      manualToday: 0,
      outboundDropped: 0,
      inboundAnswered: 0,
      inboundAnsweredPercent: 0,
      inboundAbandoned: 0,
      avgWaitTime: '00:00',
      avgTalkTime: '00:00',
      avgDispoTime: '00:00',
      avgPauseTime: '00:00',
      outboundRatio: { dropped: 0, answered: 0 },
      inboundRatio: { abandoned: 0, received: 0 }
    },
    agents: {
      loggedIn: 0,
      waiting: 0,
      inCall: 0,
      inDispo: 0,
      paused: 0,
      deadCall: 0
    },
    agentList: []
  };

  // If we have agent data, process it
  if (data.agents && Array.isArray(data.agents)) {
    const agentList = data.agents.map(agent => ({
      id: agent.user_id || agent.id,
      extension: agent.extension || agent.user_extension,
      name: agent.user_name || agent.name || 'Unknown Agent',
      status: formatAgentStatus(agent.status || agent.agent_status),
      statusTime: agent.status_time || agent.last_state_change,
      statusDuration: agent.status_duration || calculateDuration(agent.last_state_change),
      currentCall: agent.current_lead_id || agent.lead_id || null,
      campaign: agent.campaign_name || agent.campaign || '-',
      queue: agent.queue_name || agent.queue || '-',
      list: agent.list_name || agent.list || '-',
      totalCalls: agent.calls_today || agent.total_calls || 0,
      sessionTime: agent.session_duration || agent.login_duration || 0,
      lastActivity: agent.last_activity || agent.last_action_time
    }));

    // Calculate agent counts
    const agentCounts = {
      loggedIn: agentList.length,
      waiting: agentList.filter(a => a.status === 'Ready' || a.status === 'Waiting').length,
      inCall: agentList.filter(a => a.status === 'In Call').length,
      inDispo: agentList.filter(a => a.status === 'Disposition').length,
      paused: agentList.filter(a => a.status === 'Paused' || a.status === 'Break').length,
      deadCall: agentList.filter(a => a.status === 'Dead Call').length
    };

    defaultResponse.agentList = agentList;
    defaultResponse.agents = agentCounts;
  }

  // If we have campaign stats, process them
  if (data.campaign_stats || data.stats) {
    const stats = data.campaign_stats || data.stats;

    defaultResponse.stats = {
      ...defaultResponse.stats,
      totalCalls: stats.total_calls || stats.calls_placed || 0,
      callsRinging: stats.calls_ringing || 0,
      outboundWaiting: stats.outbound_waiting || stats.outbound_queue || 0,
      inboundWaiting: stats.inbound_waiting || stats.inbound_queue || 0,
      messagesPlaying: stats.messages_playing || 0,
      dialableLeads: stats.dialable_leads || 0,
      leadsInHopper: stats.leads_in_hopper || 0,
      dialLevel: stats.dial_level || 0,
      avgAgents: stats.avg_agents || 0,
      outboundToday: stats.outbound_today || 0,
      manualToday: stats.manual_today || 0,
      outboundDropped: stats.outbound_dropped_percent || 0,
      inboundAnswered: stats.inbound_answered || 0,
      inboundAnsweredPercent: stats.inbound_answered_percent || 0,
      inboundAbandoned: stats.inbound_abandoned_percent || 0,
      avgWaitTime: formatTime(stats.avg_wait_time),
      avgTalkTime: formatTime(stats.avg_talk_time),
      avgDispoTime: formatTime(stats.avg_dispo_time),
      avgPauseTime: formatTime(stats.avg_pause_time),
      outboundRatio: {
        dropped: stats.outbound_dropped || 0,
        answered: stats.outbound_answered || 0
      },
      inboundRatio: {
        abandoned: stats.inbound_abandoned || 0,
        received: stats.inbound_received || 0
      }
    };
  }

  return defaultResponse;
}

// Helper function to format agent status
function formatAgentStatus(status) {
  if (!status) return 'Unknown';

  const statusMap = {
    'ready': 'Ready',
    'waiting': 'Waiting',
    'incall': 'In Call',
    'in_call': 'In Call',
    'oncall': 'In Call',
    'dispo': 'Disposition',
    'disposition': 'Disposition',
    'paused': 'Paused',
    'pause': 'Paused',
    'break': 'Break',
    'lunch': 'Lunch',
    'dead': 'Dead Call',
    'dead_call': 'Dead Call'
  };

  return statusMap[status.toLowerCase()] || status;
}

// Helper function to calculate duration
function calculateDuration(lastStateChange) {
  if (!lastStateChange) return 0;

  try {
    const start = new Date(lastStateChange);
    const now = new Date();
    return Math.floor((now - start) / 1000); // Return seconds
  } catch {
    return 0;
  }
}

// Helper function to format time
function formatTime(seconds) {
  if (!seconds || seconds === 0) return '00:00';

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

module.exports = requireAuth(['admin', 'manager'])(convosoMonitorHandler);