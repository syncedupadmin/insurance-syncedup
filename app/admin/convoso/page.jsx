'use client';

import { useState, useEffect } from 'react';

export default function ConvosoAdmin() {
  const [agencies, setAgencies] = useState([]);
  const [leads, setLeads] = useState([]);
  const [newAgency, setNewAgency] = useState({ name: '', token: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showOnboardingForm, setShowOnboardingForm] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState(null);
  const [showLeads, setShowLeads] = useState(false);

  useEffect(() => {
    loadAgencies();
  }, []);

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

  const onboardAgency = async () => {
    if (!newAgency.name || !newAgency.token) {
      setMessage({ type: 'error', text: 'Please fill in both agency name and token' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/admin/onboard-convoso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agency_name: newAgency.name,
          convoso_token: newAgency.token
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: `Agency "${data.agency_name}" onboarded successfully! Found ${data.campaigns_found} campaigns and ${data.lists_found} lists.` 
        });
        setNewAgency({ name: '', token: '' });
        setShowOnboardingForm(false);
        await loadAgencies();
      } else {
        setMessage({ type: 'error', text: data.error || 'Onboarding failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error during onboarding: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const testWebhook = async (webhookUrl) => {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true })
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Webhook test successful!' });
      } else {
        setMessage({ type: 'error', text: 'Webhook test failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Webhook test error: ' + error.message });
    }
  };

  const loadLeads = async (agencyId) => {
    try {
      const response = await fetch(`/api/admin/convoso-leads?agency_id=${agencyId}&limit=20`);
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

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f5',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header matching admin theme */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>📞 Convoso Management</h1>
        <button
          onClick={() => setShowOnboardingForm(true)}
          style={{
            background: 'transparent',
            border: '1px solid white',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          + Onboard Agency
        </button>
      </div>

      <div style={{ maxWidth: '1400px', margin: '2rem auto', padding: '0 2rem' }}>
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

        {/* Onboarding Form */}
        {showOnboardingForm && (
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
              minWidth: '400px'
            }}>
              <h2 style={{ margin: '0 0 1.5rem 0', color: '#2d3748' }}>Onboard New Agency</h2>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Agency Name
                </label>
                <input
                  type="text"
                  placeholder="Enter agency name"
                  value={newAgency.name}
                  onChange={(e) => setNewAgency({...newAgency, name: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Convoso API Token
                </label>
                <input
                  type="password"
                  placeholder="Enter Convoso token"
                  value={newAgency.token}
                  onChange={(e) => setNewAgency({...newAgency, token: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowOnboardingForm(false)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#f7fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={onboardAgency}
                  disabled={loading}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: loading ? '#9ca3af' : '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: '500'
                  }}
                >
                  {loading ? 'Onboarding...' : 'Onboard Agency'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Agencies Grid */}
        <div style={{
          display: 'grid',
          gap: '1.5rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))'
        }}>
          {agencies.length === 0 ? (
            <div style={{
              background: 'white',
              padding: '3rem',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              textAlign: 'center',
              gridColumn: '1 / -1'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📞</div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#2d3748' }}>No agencies onboarded</h3>
              <p style={{ margin: 0, color: '#718096' }}>Get started by onboarding your first agency.</p>
            </div>
          ) : (
            agencies.map((agency) => (
              <div key={agency.id} style={{
                background: 'white',
                padding: '1.5rem',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: agency.is_active ? '#48bb78' : '#f56565',
                    marginRight: '0.75rem'
                  }}></div>
                  <h3 style={{ margin: 0, color: '#2d3748', fontSize: '1.25rem', fontWeight: 'bold' }}>
                    {agency.name}
                  </h3>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ 
                    fontSize: '2rem', 
                    fontWeight: 'bold', 
                    color: '#667eea',
                    marginBottom: '0.25rem'
                  }}>
                    {agency.lists?.length || 0}
                  </div>
                  <div style={{ color: '#718096', fontSize: '0.875rem' }}>Active Lists</div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ 
                    fontSize: '2rem', 
                    fontWeight: 'bold', 
                    color: '#667eea',
                    marginBottom: '0.25rem'
                  }}>
                    {agency.campaigns?.length || 0}
                  </div>
                  <div style={{ color: '#718096', fontSize: '0.875rem' }}>Campaigns</div>
                </div>

                {agency.webhook_url && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#718096', marginBottom: '0.25rem' }}>
                      Webhook URL:
                    </div>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: '#4a5568',
                      wordBreak: 'break-all',
                      background: '#f7fafc',
                      padding: '0.5rem',
                      borderRadius: '4px'
                    }}>
                      {agency.webhook_url}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                  {agency.webhook_url && (
                    <button
                      onClick={() => testWebhook(agency.webhook_url)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#48bb78',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                    >
                      Test Webhook
                    </button>
                  )}
                  <button
                    onClick={() => loadLeads(agency.id)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    View Leads
                  </button>
                </div>

                {agency.last_sync && (
                  <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#a0aec0' }}>
                    Last sync: {new Date(agency.last_sync).toLocaleString()}
                  </div>
                )}
              </div>
            ))
          )}
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
              maxWidth: '80vw',
              maxHeight: '80vh',
              overflow: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, color: '#2d3748' }}>Recent Convoso Leads</h2>
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
                  No leads found for this agency
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#4a5568' }}>Lead</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#4a5568' }}>Phone</th>
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
                                background: '#667eea',
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