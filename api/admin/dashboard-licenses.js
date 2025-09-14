// API endpoint for license dashboard widgets
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authentication check
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    
    // Verify admin access
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64'));
      if (!['admin', 'super_admin', 'manager'].includes(payload.role)) {
        return res.status(403).json({ error: 'Admin access required' });
      }
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get license dashboard data
    const dashboardData = await getLicenseDashboardData();
    
    return res.status(200).json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('License dashboard error:', error);
    
    // Return fallback data
    const fallbackData = {
      summary: {
        total_licenses: 0,
        active_licenses: 0,
        expired_licenses: 0,
        expiring_soon: 0,
        compliance_rate: 100
      },
      expiring_licenses: [],
      license_alerts: [],
      compliance_issues: []
    };
    
    return res.status(200).json({
      success: true,
      data: fallbackData,
      source: 'fallback'
    });
  }
}

async function getLicenseDashboardData() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const sixtyDaysFromNow = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get all licenses with agent information
    const { data: allLicenses, error } = await supabase
      .from('license_summary')
      .select('*');

    if (error && !error.message.includes('does not exist')) {
      throw error;
    }

    const licenses = allLicenses || [];

    // Calculate summary statistics
    const summary = {
      total_licenses: licenses.length,
      active_licenses: licenses.filter(l => l.status === 'Active').length,
      expired_licenses: licenses.filter(l => l.expiration_date < today).length,
      expiring_soon: licenses.filter(l => 
        l.expiration_date >= today && 
        l.expiration_date <= thirtyDaysFromNow && 
        l.status === 'Active'
      ).length,
      compliance_rate: 0
    };

    // Calculate compliance rate
    if (summary.total_licenses > 0) {
      const compliantLicenses = summary.active_licenses - summary.expired_licenses;
      summary.compliance_rate = Math.round((compliantLicenses / summary.total_licenses) * 100);
    } else {
      summary.compliance_rate = 100;
    }

    // Get licenses expiring soon (next 60 days)
    const expiring_licenses = licenses
      .filter(l => 
        l.expiration_date >= today && 
        l.expiration_date <= sixtyDaysFromNow && 
        l.status === 'Active'
      )
      .sort((a, b) => new Date(a.expiration_date) - new Date(b.expiration_date))
      .slice(0, 10); // Top 10 most urgent

    // Generate license alerts
    const license_alerts = [];

    // Expired licenses alert
    if (summary.expired_licenses > 0) {
      license_alerts.push({
        type: 'expired',
        severity: 'high',
        title: `${summary.expired_licenses} Expired License${summary.expired_licenses > 1 ? 's' : ''}`,
        description: `${summary.expired_licenses} license${summary.expired_licenses > 1 ? 's have' : ' has'} expired and need immediate attention.`,
        count: summary.expired_licenses,
        action_url: '/admin/licenses?status=Expired'
      });
    }

    // Expiring soon alert
    if (summary.expiring_soon > 0) {
      license_alerts.push({
        type: 'expiring',
        severity: 'medium',
        title: `${summary.expiring_soon} License${summary.expiring_soon > 1 ? 's' : ''} Expiring Soon`,
        description: `${summary.expiring_soon} license${summary.expiring_soon > 1 ? 's expire' : ' expires'} within the next 30 days.`,
        count: summary.expiring_soon,
        action_url: '/admin/licenses?action=expiring'
      });
    }

    // Compliance rate alert
    if (summary.compliance_rate < 90) {
      license_alerts.push({
        type: 'compliance',
        severity: summary.compliance_rate < 70 ? 'high' : 'medium',
        title: `Low Compliance Rate: ${summary.compliance_rate}%`,
        description: `Agency compliance rate is below recommended threshold. Review expired and expiring licenses.`,
        count: summary.total_licenses - Math.floor(summary.total_licenses * summary.compliance_rate / 100),
        action_url: '/admin/licenses'
      });
    }

    // Identify compliance issues by agent
    const agentCompliance = {};
    licenses.forEach(license => {
      const agentName = license.agent_name || 'Unknown Agent';
      if (!agentCompliance[agentName]) {
        agentCompliance[agentName] = {
          total: 0,
          expired: 0,
          expiring: 0,
          agent_id: license.agent_id
        };
      }
      
      agentCompliance[agentName].total++;
      if (license.expiration_date < today) {
        agentCompliance[agentName].expired++;
      } else if (license.expiration_date <= thirtyDaysFromNow) {
        agentCompliance[agentName].expiring++;
      }
    });

    // Find agents with compliance issues
    const compliance_issues = Object.entries(agentCompliance)
      .filter(([_, data]) => data.expired > 0 || data.expiring > 0)
      .map(([agentName, data]) => ({
        agent_name: agentName,
        agent_id: data.agent_id,
        total_licenses: data.total,
        expired_count: data.expired,
        expiring_count: data.expiring,
        compliance_score: Math.round(((data.total - data.expired) / data.total) * 100)
      }))
      .sort((a, b) => a.compliance_score - b.compliance_score)
      .slice(0, 5); // Top 5 agents with issues

    return {
      summary,
      expiring_licenses,
      license_alerts,
      compliance_issues,
      last_updated: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error getting license dashboard data:', error);
    
    // Return sample data for testing
    return {
      summary: {
        total_licenses: 25,
        active_licenses: 22,
        expired_licenses: 1,
        expiring_soon: 3,
        compliance_rate: 88
      },
      expiring_licenses: [
        {
          id: '1',
          agent_name: 'John Smith',
          license_number: 'TX-123456',
          state: 'TX',
          license_type: 'LIFE_HEALTH',
          expiration_date: '2024-12-15',
          days_until_expiry: 15
        },
        {
          id: '2',
          agent_name: 'Jane Doe',
          license_number: 'CA-789012',
          state: 'CA',
          license_type: 'PROP_CAS',
          expiration_date: '2024-12-28',
          days_until_expiry: 28
        }
      ],
      license_alerts: [
        {
          type: 'expiring',
          severity: 'medium',
          title: '3 Licenses Expiring Soon',
          description: '3 licenses expire within the next 30 days.',
          count: 3,
          action_url: '/admin/licenses?action=expiring'
        },
        {
          type: 'expired',
          severity: 'high',
          title: '1 Expired License',
          description: '1 license has expired and needs immediate attention.',
          count: 1,
          action_url: '/admin/licenses?status=Expired'
        }
      ],
      compliance_issues: [
        {
          agent_name: 'Bob Wilson',
          total_licenses: 4,
          expired_count: 1,
          expiring_count: 1,
          compliance_score: 75
        }
      ],
      last_updated: new Date().toISOString(),
      source: 'sample_data'
    };
  }
}