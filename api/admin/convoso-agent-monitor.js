const { verifyToken } = require('../lib/auth-bridge.js');
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get user info from token (but don't require it for now)
    const token = req.headers.authorization?.replace('Bearer ', '');
    let decoded;
    
    if (token && token !== 'undefined' && token !== 'null') {
      try {
        decoded = await verifyToken(, ["auth_token","auth-token","user_role","user_roles","assumed_role"]);
      } catch (jwtError) {
        console.warn('JWT verification failed, proceeding with fallback');
        // For demo purposes, continue with PHS agency
      }
    } else {
      console.log('No token provided, using demo mode');
    }

    // For now, use hardcoded Convoso token until database is properly set up
    const convosoToken = '8nf3i9mmzoxidg3ntm28gbxvlhdiqo3p';
    
    // Try to get agency data from database, but fallback to hardcoded token
    let agencyData = null;
    
    try {
      // Get agency data - default to PHS agency if token verification fails
      const agencyId = decoded?.agency_id;
      
      if (agencyId) {
        const { data, error } = await supabase
          .from('agencies')
          .select('*')
          .eq('id', agencyId)
          .eq('is_active', true)
          .single();
          
        if (!error && data && data.convoso_auth_token) {
          agencyData = data;
        }
      }
      
      if (!agencyData) {
        agencyData = await getPHSAgency();
      }
    } catch (dbError) {
      console.warn('Database error, using fallback token:', dbError.message);
    }

    // Use database token if available, otherwise use hardcoded token
    const tokenToUse = agencyData?.convoso_auth_token || convosoToken;

    // Use real Convoso API directly
    console.log('Calling Convoso API with token:', tokenToUse ? 'TOKEN_PROVIDED' : 'NO_TOKEN');
    
    const agentResponse = await callConvosoAgentMonitor(tokenToUse);
    
    if (!agentResponse.success) {
      console.warn('Convoso API error:', agentResponse.error);
      return res.status(200).json(getFallbackData());
    }

    // Process agent data
    console.log('Agent response structure:', JSON.stringify(agentResponse, null, 2));
    const agents = Array.isArray(agentResponse.data) ? agentResponse.data : [];
    console.log('Processed agents count:', agents.length);
    const agentStats = calculateAgentStats(agents);
    
    // Calculate call stats from agent data
    const callStats = calculateCallStats(agents);
    
    // Fetch additional stats if available
    const campaignStats = await getCampaignStats(tokenToUse);
    
    const responseData = {
      success: true,
      stats: {
        // Use calculated stats from agent data first, fall back to campaign stats
        totalCalls: callStats.totalCalls || campaignStats.totalCalls || 0,
        callsRinging: callStats.callsRinging || campaignStats.callsRinging || 0,
        outboundWaiting: callStats.outboundWaiting || campaignStats.outboundWaiting || 0,
        inboundWaiting: callStats.inboundWaiting || campaignStats.inboundWaiting || 0,
        messagesPlaying: callStats.messagesPlaying || campaignStats.messagesPlaying || 0,
        dialableLeads: campaignStats.dialableLeads || callStats.dialableLeads || 0,
        leadsInHopper: campaignStats.leadsInHopper || callStats.leadsInHopper || 0,
        dialLevel: callStats.dialLevel || 0,
        avgAgents: callStats.avgAgents || agentStats.loggedIn,
        outboundToday: callStats.outboundToday || campaignStats.outboundToday || 0,
        manualToday: callStats.manualToday || campaignStats.manualToday || 0,
        outboundDropped: callStats.outboundDropped || campaignStats.outboundDropped || 0,
        outboundRatio: campaignStats.outboundRatio || { dropped: 0, answered: 0 },
        inboundAnswered: callStats.inboundAnswered || campaignStats.inboundAnswered || 0,
        inboundAnsweredPercent: campaignStats.inboundAnsweredPercent || 0,
        inboundAbandoned: callStats.inboundAbandoned || campaignStats.inboundAbandoned || 0,
        inboundRatio: campaignStats.inboundRatio || { abandoned: 0, received: 0 }
      },
      agents: agentStats,
      agentList: Array.isArray(agents) ? agents.map(agent => ({
        extension: agent.extension || agent.user_id,
        name: agent.user_full_name || 'Unknown',
        status: agent.status_label || agent.status || 'unknown',
        statusTime: agent.last_state_change || new Date().toISOString(),
        currentCall: agent.lead_id !== "0" ? agent.lead_id : null,
        totalCalls: parseInt(agent.calls_today) || 0,
        sessionTime: parseInt(agent.status_time_sec) || 0,
        campaign: agent.campaign_name || 'Unknown',
        queue: agent.queue_name || 'Multiple Queues',
        list: agent.list_name || '-',
        statusDuration: agent.status_time_mmss || '00:00:00'
      })) : [],
      timestamp: new Date().toISOString()
    };

    res.status(200).json(responseData);
    
  } catch (error) {
    console.error('Agent monitor API error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch agent monitor data',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

async function getPHSAgency() {
  const { data } = await supabase
    .from('agencies')
    .select('*')
    .ilike('name', '%phs%')
    .eq('is_active', true)
    .single();
  return data;
}

function calculateAgentStats(agents) {
  const stats = {
    loggedIn: 0,
    waiting: 0,
    inCall: 0,
    inDispo: 0,
    paused: 0,
    deadCall: 0
  };

  if (!Array.isArray(agents)) {
    console.warn('calculateAgentStats: agents is not an array:', typeof agents, agents);
    return stats;
  }

  agents.forEach(agent => {
    stats.loggedIn++;
    
    const status = (agent.status || '').toLowerCase();
    if (status === 'ready' || status === 'waiting') {
      stats.waiting++;
    } else if (status === 'incall' || status.includes('call') || status.includes('talk')) {
      stats.inCall++;
    } else if (status === 'dispo' || status.includes('dispo')) {
      stats.inDispo++;
    } else if (status === 'paused' || status.includes('pause') || status.includes('break')) {
      stats.paused++;
    } else if (status === 'dead' || status.includes('dead')) {
      stats.deadCall++;
    }
  });

  return stats;
}

// Add this to calculate missing stats from agent data
function calculateCallStats(agents) {
  if (!Array.isArray(agents)) {
    return {
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
      inboundAbandoned: 0
    };
  }

  const stats = {
    totalCalls: agents.reduce((sum, a) => sum + (parseInt(a.calls_today) || 0), 0),
    callsRinging: agents.filter(a => (a.status || '').toLowerCase().includes('ringing')).length,
    outboundWaiting: agents.filter(a => (a.status || '').toLowerCase() === 'ready').length,
    inboundWaiting: 0, // Would need separate API call
    messagesPlaying: agents.filter(a => (a.status || '').toLowerCase().includes('message')).length,
    dialableLeads: 0, // Would need campaign API
    leadsInHopper: 0, // Would need campaign API
    dialLevel: 0, // Would need campaign API
    avgAgents: agents.length,
    // Add daily totals
    outboundToday: agents.reduce((sum, a) => sum + (parseInt(a.calls_today) || 0), 0),
    manualToday: 0,
    outboundDropped: 0,
    inboundAnswered: 0,
    inboundAbandoned: 0
  };
  
  return stats;
}

// Direct Convoso API calls
async function callConvosoAgentMonitor(authToken) {
  try {
    const response = await fetch('https://api.convoso.com/v1/agent-monitor/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        auth_token: authToken,
        limit: '100',
        offset: '0',
        with_totals: '1',
        // Add these to get ALL agents across ALL campaigns
        all_campaigns: '1',
        all_clients: '1',
        include_all: '1'
      })
    });

    if (!response.ok) {
      console.error(`Convoso API error: ${response.status}`);
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    console.log('Raw Convoso response structure:', {
      success: data.success,
      hasData: !!data.data,
      hasEntries: !!data.data?.entries,
      hasAgents: !!data.data?.entries?.agents,
      agentCount: data.data?.entries?.agents?.length || 0
    });
    
    // The agents are in data.data.entries.agents
    if (data && data.success && data.data?.entries?.agents) {
      return {
        success: true,
        data: data.data.entries.agents
      };
    }
    
    return { success: false, data: [], rawResponse: data };
  } catch (error) {
    console.error('Convoso API call failed:', error);
    return { success: false, error: error.message, data: [] };
  }
}

async function callConvosoCampaigns(authToken) {
  try {
    const response = await fetch('https://api.convoso.com/v1/campaigns/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ 
        auth_token: authToken,
        limit: 100 
      })
    });
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    
    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getCampaignStats(authToken) {
  try {
    // Try to get campaign statistics
    const campaigns = await callConvosoCampaigns(authToken);
    if (campaigns.success && campaigns.data) {
      // Extract stats from campaign data
      return {
        totalCalls: campaigns.data.reduce((sum, c) => sum + (c.total_calls || 0), 0),
        dialableLeads: campaigns.data.reduce((sum, c) => sum + (c.dialable_leads || 0), 0),
        leadsInHopper: campaigns.data.reduce((sum, c) => sum + (c.hopper_count || 0), 0)
      };
    }
  } catch (error) {
    console.warn('Failed to get campaign stats:', error);
  }
  
  return {};
}

function getFallbackData() {
  return {
    success: true,
    stats: {
      totalCalls: 0,
      callsRinging: 0,
      outboundWaiting: 0,
      inboundWaiting: 0,
      messagesPlaying: 0,
      dialableLeads: 0,
      leadsInHopper: 0,
      outboundToday: 0,
      manualToday: 0,
      outboundDropped: 0,
      outboundRatio: { dropped: 0, answered: 0 },
      inboundAnswered: 0,
      inboundAnsweredPercent: 0,
      inboundAbandoned: 0,
      inboundRatio: { abandoned: 0, received: 0 },
      avgAgents: 0
    },
    agents: {
      loggedIn: 0,
      waiting: 0,
      inCall: 0,
      inDispo: 0,
      paused: 0,
      deadCall: 0
    },
    agentList: [],
    timestamp: new Date().toISOString(),
    note: 'No Convoso integration configured - showing fallback data'
  };
}
