'use client';

import { useState, useEffect } from 'react';

export default function ConvosoManager() {
  const [agencies, setAgencies] = useState([]);
  const [stats, setStats] = useState({
    totalLeads: 0,
    completedCalls: 0,
    activeAgents: 0,
    avgCallDuration: 0
  });
  const [recentCalls, setRecentCalls] = useState([]);
  const [leadActivity, setLeadActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('today');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showLeads, setShowLeads] = useState(false);
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    loadData();
  }, [selectedTimeRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadAgencies(),
        fetchConvosoStats(),
        fetchRecentCalls(),
        fetchLeadActivity()
      ]);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAgencies = async () => {
    try {
      const response = await fetch('/api/admin/list-agencies');
      if (response.ok) {
        const data = await response.json();
        setAgencies(data.agencies || []);
      }
    } catch (error) {
      console.error('Failed to fetch agencies:', error);
    }
  };

  const fetchConvosoStats = async () => {
    try {
      const response = await fetch(`/api/manager/convoso-stats?range=${selectedTimeRange}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats || stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchRecentCalls = async () => {
    try {
      const response = await fetch(`/api/manager/recent-calls?range=${selectedTimeRange}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setRecentCalls(data.calls || []);
      }
    } catch (error) {
      console.error('Failed to fetch recent calls:', error);
    }
  };

  const fetchLeadActivity = async () => {
    try {
      const response = await fetch(`/api/manager/lead-activity?range=${selectedTimeRange}`);
      if (response.ok) {
        const data = await response.json();
        setLeadActivity(data.activity || []);
      }
    } catch (error) {
      console.error('Failed to fetch lead activity:', error);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDispositionColor = (disposition) => {
    switch (disposition?.toLowerCase()) {
      case 'sale':
      case 'interested':
        return { background: '#f0fff4', color: '#2f855a', border: '#9ae6b4' };
      case 'callback':
      case 'follow up':
        return { background: '#fffbeb', color: '#c05621', border: '#fbd38d' };
      case 'not interested':
      case 'dnc':
        return { background: '#fed7d7', color: '#c53030', border: '#feb2b2' };
      default:
        return { background: '#f7fafc', color: '#4a5568', border: '#e2e8f0' };
    }
  };

  const loadAllLeads = async () => {
    try {
      const response = await fetch(`/api/admin/convoso-leads?limit=50`);
      if (response.ok) {
        const data = await response.json();
        setLeads(data.leads || []);
        setShowLeads(true);
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error);
      setMessage({ type: 'error', text: 'Failed to load leads' });
    }
  };

  const openQuote = (lead) => {
    const quoteUrl = `/agent/quote?` + new URLSearchParams({
      lead_id: lead.id,
      first_name: lead.first_name || 'Unknown',
      last_name: lead.last_name || 'Lead',
      phone: lead.phone_number || '',
      dob: lead.date_of_birth || '1980-01-01',
      zip: lead.postal_code || '90210',
      email: lead.email || '',
      source: 'convoso'
    });
    
    window.open(quoteUrl, '_blank', 'width=1200,height=800');
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📞</div>
          <p style={{ color: '#718096' }}>Loading Convoso data...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f5',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header matching manager theme */}
      <div style={{
        background: 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)',
        color: 'white',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>📞 Convoso Dashboard</h1>
        <select
          value={selectedTimeRange}
          onChange={(e) => setSelectedTimeRange(e.target.value)}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            border: '1px solid white',
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            fontSize: '0.875rem'
          }}
        >
          <option value="today" style={{ color: '#2d3748' }}>Today</option>
          <option value="week" style={{ color: '#2d3748' }}>This Week</option>
          <option value="month" style={{ color: '#2d3748' }}>This Month</option>
          <option value="quarter" style={{ color: '#2d3748' }}>This Quarter</option>
        </select>
      </div>

      <div style={{ maxWidth: '1400px', margin: '2rem auto', padding: '0 2rem' }}>
        {/* Manager Notice */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(66, 153, 225, 0.1) 0%, rgba(102, 126, 234, 0.1) 100%)',
          border: '2px solid #4299e1',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          <p style={{ margin: 0, color: '#2d3748', fontWeight: '500' }}>
            🎯 <span style={{ color: '#4299e1', fontWeight: '600' }}>Manager Dashboard</span> - Monitor your team's call center performance and lead conversion rates
          </p>
        </div>

        {/* Message Display */}
        {message.text && (
          <div style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            borderRadius: '8px',
            background: message.type === 'success' ? '#f0fff4' : '#fed7d7',
            border: `1px solid ${message.type === 'success' ? '#9ae6b4' : '#feb2b2'}`,
            color: message.type === 'success' ? '#2f855a' : '#c53030'
          }}>
            {message.text}
          </div>
        )}

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gap: '1.5rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          marginBottom: '2rem'
        }}>
          <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#4299e1',
              marginBottom: '0.5rem'
            }}>
              {stats.totalLeads.toLocaleString()}
            </div>
            <div style={{ color: '#718096', fontSize: '0.875rem' }}>Total Leads</div>
          </div>

          <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#4299e1',
              marginBottom: '0.5rem'
            }}>
              {stats.completedCalls.toLocaleString()}
            </div>
            <div style={{ color: '#718096', fontSize: '0.875rem' }}>Completed Calls</div>
          </div>

          <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#4299e1',
              marginBottom: '0.5rem'
            }}>
              {stats.activeAgents}
            </div>
            <div style={{ color: '#718096', fontSize: '0.875rem' }}>Active Agents</div>
          </div>

          <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#4299e1',
              marginBottom: '0.5rem'
            }}>
              {formatDuration(stats.avgCallDuration)}
            </div>
            <div style={{ color: '#718096', fontSize: '0.875rem' }}>Avg Call Duration</div>
          </div>
        </div>

        {/* Recent Activity Grid */}
        <div style={{
          display: 'grid',
          gap: '1.5rem',
          gridTemplateColumns: '1fr 1fr'
        }}>
          {/* Recent Calls */}
          <div style={{
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1rem',
              borderBottom: '1px solid #e2e8f0',
              background: '#f7fafc'
            }}>
              <h3 style={{ margin: 0, color: '#2d3748', fontWeight: '600' }}>Recent Calls</h3>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {recentCalls.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#718096' }}>
                  No recent calls found
                </div>
              ) : (
                recentCalls.map((call, index) => {
                  const dispositionStyle = getDispositionColor(call.disposition);
                  return (
                    <div key={index} style={{
                      padding: '1rem',
                      borderBottom: index < recentCalls.length - 1 ? '1px solid #f7fafc' : 'none'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ fontWeight: '500', color: '#2d3748' }}>
                          {call.agent_name || `Agent ${call.agent_id}`}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#718096' }}>
                          {formatDuration(call.duration)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: '#a0aec0' }}>
                          {new Date(call.call_time).toLocaleString()}
                        </div>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          background: dispositionStyle.background,
                          color: dispositionStyle.color,
                          border: `1px solid ${dispositionStyle.border}`
                        }}>
                          {call.disposition || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Lead Activity */}
          <div style={{
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1rem',
              borderBottom: '1px solid #e2e8f0',
              background: '#f7fafc'
            }}>
              <h3 style={{ margin: 0, color: '#2d3748', fontWeight: '600' }}>Lead Activity</h3>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {leadActivity.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#718096' }}>
                  No recent activity found
                </div>
              ) : (
                leadActivity.map((activity, index) => {
                  const dispositionStyle = getDispositionColor(activity.last_disposition);
                  return (
                    <div key={index} style={{
                      padding: '1rem',
                      borderBottom: index < leadActivity.length - 1 ? '1px solid #f7fafc' : 'none'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#4299e1',
                          marginTop: '0.5rem',
                          marginRight: '0.75rem',
                          flexShrink: 0
                        }}></div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '500', color: '#2d3748', marginBottom: '0.25rem' }}>
                            Lead {activity.convoso_lead_id} updated
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <div style={{ fontSize: '0.75rem', color: '#718096' }}>
                              Status: {activity.status}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#a0aec0' }}>
                              {new Date(activity.updated_at).toLocaleString()}
                            </div>
                          </div>
                          {activity.last_disposition && (
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              background: dispositionStyle.background,
                              color: dispositionStyle.color,
                              border: `1px solid ${dispositionStyle.border}`
                            }}>
                              {activity.last_disposition}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button style={{
              padding: '0.75rem 1.5rem',
              background: '#4299e1',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}>
              👥 Manage Team
            </button>
            <button style={{
              padding: '0.75rem 1.5rem',
              background: '#48bb78',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}>
              📊 Team Performance
            </button>
            <button style={{
              padding: '0.75rem 1.5rem',
              background: '#ed8936',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}>
              📋 Generate Reports
            </button>
            <button 
              onClick={loadAllLeads}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              🎯 View All Leads
            </button>
          </div>
        </div>

        {/* Leads Modal */}
        {showLeads && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              maxWidth: '90vw',
              maxHeight: '80vh',
              overflow: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, color: '#2d3748' }}>All Convoso Leads</h2>
                <button
                  onClick={() => setShowLeads(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: '#718096'
                  }}
                >
                  ×
                </button>
              </div>

              {leads.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#718096' }}>
                  No leads found
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#4a5568' }}>Lead</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#4a5568' }}>Phone</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#4a5568' }}>Agency</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#4a5568' }}>Status</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#4a5568' }}>Disposition</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#4a5568' }}>Created</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#4a5568' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((lead, index) => (
                        <tr key={lead.id} style={{ borderBottom: '1px solid #f7fafc' }}>
                          <td style={{ padding: '0.75rem' }}>
                            <div style={{ fontWeight: '500', color: '#2d3748' }}>
                              {lead.first_name} {lead.last_name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#718096' }}>
                              ID: {lead.convoso_lead_id}
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem', color: '#4a5568' }}>
                            {lead.phone_number}
                          </td>
                          <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#718096' }}>
                            {lead.agencies?.name || 'Unknown'}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              background: lead.status === 'NEW' ? '#f0fff4' : '#f7fafc',
                              color: lead.status === 'NEW' ? '#2f855a' : '#4a5568',
                              border: `1px solid ${lead.status === 'NEW' ? '#9ae6b4' : '#e2e8f0'}`
                            }}>
                              {lead.status || 'NEW'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            {lead.last_disposition ? (
                              <span style={{
                                padding: '0.25rem 0.5rem',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                background: lead.disposition_color?.background || '#f7fafc',
                                color: lead.disposition_color?.color || '#4a5568',
                                border: `1px solid ${lead.disposition_color?.border || '#e2e8f0'}`
                              }}>
                                {lead.last_disposition}
                              </span>
                            ) : (
                              <span style={{ color: '#a0aec0', fontSize: '0.875rem' }}>-</span>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#718096' }}>
                            {new Date(lead.created_at).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <button
                              onClick={() => openQuote(lead)}
                              style={{
                                padding: '0.375rem 0.75rem',
                                background: '#4299e1',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: '500'
                              }}
                            >
                              Get Quote
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}