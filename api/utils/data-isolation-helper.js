// Production Data Isolation Helper
// This utility provides functions to ensure clean separation between demo and production data

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Check if a user/agency is a demo account
 */
export function isDemoUser(email, agencyId) {
  return email?.includes('@demo.com') || agencyId === 'DEMO001';
}

/**
 * Apply demo/production data filtering to Supabase queries
 */
export function applyDataIsolation(query, tableName, isDemo, filterField = 'sale_id') {
  if (isDemo) {
    // Demo users only see demo data
    switch (tableName) {
      case 'portal_commissions':
        return query.like('sale_id', 'DEMO_SALE_%');
      case 'support_tickets':
        return query.like('ticket_number', 'TKT-DEMO-%');
      case 'convoso_leads':
        return query.like('lead_id', 'DEMO_LEAD_%');
      case 'portal_sales':
        return query.like('sale_id', 'DEMO_SALE_%');
      default:
        return query.eq('agency_id', 'DEMO001');
    }
  } else {
    // Production users only see real data (exclude demo patterns)
    switch (tableName) {
      case 'portal_commissions':
        return query.not('sale_id', 'like', 'DEMO_SALE_%');
      case 'support_tickets':
        return query.not('ticket_number', 'like', 'TKT-DEMO-%');
      case 'convoso_leads':
        return query.not('lead_id', 'like', 'DEMO_LEAD_%');
      case 'portal_sales':
        return query.not('sale_id', 'like', 'DEMO_SALE_%');
      default:
        return query.neq('agency_id', 'DEMO001');
    }
  }
}

/**
 * Get real lead summary data with proper empty state handling
 */
export async function getLeadSummary(agencyId, startDate, endDate, isDemo = false) {
  try {
    let query = supabase
      .from('convoso_leads')
      .select('*')
      .gte('received_at', startDate)
      .lte('received_at', endDate);

    // Apply data isolation
    query = applyDataIsolation(query, 'convoso_leads', isDemo);
    
    if (!isDemo) {
      query = query.eq('agency_id', agencyId);
    }

    const { data: leads, error } = await query;

    if (error) {
      throw error;
    }

    const totalLeads = leads?.length || 0;
    const newLeads = leads?.filter(l => l.status === 'new').length || 0;
    const activeLeads = leads?.filter(l => ['new', 'contacted', 'qualified'].includes(l.status)).length || 0;
    const convertedLeads = leads?.filter(l => l.status === 'sold').length || 0;

    // Group leads by source
    const sourceGroups = leads?.reduce((acc, lead) => {
      const source = lead.source || 'Other';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {}) || {};

    const leadSources = Object.entries(sourceGroups).map(([source, count]) => ({
      source,
      count
    }));

    // Calculate average response time if data is available
    const responseTimes = leads?.filter(l => l.last_call_time && l.received_at)
      .map(l => (new Date(l.last_call_time) - new Date(l.received_at)) / (1000 * 60)) || [];
    
    const avgResponseTime = responseTimes.length > 0 
      ? (responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length).toFixed(1) + ' minutes'
      : 'No data';

    return {
      total_leads: totalLeads,
      new_leads: newLeads,
      active_leads: activeLeads,
      converted_leads: convertedLeads,
      lead_sources: leadSources,
      avg_response_time: avgResponseTime
    };

  } catch (error) {
    console.error('Error fetching lead summary:', error);
    return {
      total_leads: 0,
      new_leads: 0,
      active_leads: 0,
      converted_leads: 0,
      lead_sources: [],
      avg_response_time: 'No data'
    };
  }
}

/**
 * Calculate real growth rate between periods
 */
export async function calculateGrowthRate(currentRevenue, startDate, endDate, agencyId, isDemo = false) {
  try {
    const previousPeriod = getPreviousPeriod(startDate, endDate);
    
    let query = supabase
      .from('portal_sales')
      .select('premium')
      .gte('sale_date', previousPeriod.start)
      .lte('sale_date', previousPeriod.end);

    // Apply data isolation
    query = applyDataIsolation(query, 'portal_sales', isDemo);
    
    if (!isDemo) {
      query = query.eq('agency_id', agencyId);
    }
    
    const { data: previousSales } = await query;
    
    const previousRevenue = previousSales?.reduce((sum, s) => sum + (parseFloat(s.premium) || 0), 0) || 0;
    
    if (previousRevenue === 0) return '0.0';
    return (((currentRevenue - previousRevenue) / previousRevenue) * 100).toFixed(1);
  } catch (error) {
    console.error('Error calculating growth rate:', error);
    return '0.0';
  }
}

/**
 * Get agent conversion rates based on real leads data
 */
export async function getAgentConversionRates(agentIds, startDate, endDate, isDemo = false) {
  const conversionRates = {};
  
  try {
    for (const agentId of agentIds) {
      // Get leads count for agent
      let leadsQuery = supabase
        .from('convoso_leads')
        .select('id', { count: 'exact' })
        .eq('agent_assignment', agentId)
        .gte('received_at', startDate)
        .lte('received_at', endDate);

      leadsQuery = applyDataIsolation(leadsQuery, 'convoso_leads', isDemo);

      // Get sales count for agent  
      let salesQuery = supabase
        .from('portal_sales')
        .select('id', { count: 'exact' })
        .eq('agent_id', agentId)
        .gte('sale_date', startDate)
        .lte('sale_date', endDate);

      salesQuery = applyDataIsolation(salesQuery, 'portal_sales', isDemo);

      const [leadsResult, salesResult] = await Promise.all([
        leadsQuery,
        salesQuery
      ]);

      const leadsCount = leadsResult.count || 0;
      const salesCount = salesResult.count || 0;
      
      conversionRates[agentId] = {
        leads_count: leadsCount,
        sales_count: salesCount,
        conversion_rate: leadsCount > 0 ? (salesCount / leadsCount) * 100 : 0
      };
    }
  } catch (error) {
    console.error('Error calculating agent conversion rates:', error);
    // Return zero values for all agents on error
    agentIds.forEach(id => {
      conversionRates[id] = {
        leads_count: 0,
        sales_count: 0,
        conversion_rate: 0
      };
    });
  }

  return conversionRates;
}

/**
 * Get system alerts - no fake data, only real alerts
 */
export async function getSystemAlerts(agencyId, isDemo = false) {
  try {
    // Get real system alerts from database if alerts table exists
    let query = supabase
      .from('system_alerts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!isDemo) {
      query = query.eq('agency_id', agencyId);
    }

    const { data: alerts, error } = await query;
    
    if (error && error.code !== 'PGRST116') { // Table doesn't exist
      throw error;
    }

    return alerts || [];

  } catch (error) {
    console.error('Error fetching system alerts:', error);
    return [];
  }
}

/**
 * Utility function to get previous period dates
 */
function getPreviousPeriod(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const periodLength = end - start;
  
  return {
    start: new Date(start.getTime() - periodLength).toISOString().split('T')[0],
    end: new Date(start.getTime() - 1).toISOString().split('T')[0]
  };
}

/**
 * Verify production readiness by checking for demo data pollution
 */
export async function verifyProductionReadiness() {
  const issues = [];

  try {
    // Check for non-demo users with demo-like data
    const { data: suspiciousUsers } = await supabase
      .from('portal_users')
      .select('email, role, agency_id')
      .not('email', 'like', '%@demo.com')
      .eq('agency_id', 'DEMO001');

    if (suspiciousUsers && suspiciousUsers.length > 0) {
      issues.push(`Found ${suspiciousUsers.length} non-demo users with DEMO001 agency ID`);
    }

    // Check for demo data in production tables
    const checks = [
      { table: 'portal_commissions', pattern: 'DEMO_SALE_%', field: 'sale_id' },
      { table: 'support_tickets', pattern: 'TKT-DEMO-%', field: 'ticket_number' },
      { table: 'convoso_leads', pattern: 'DEMO_LEAD_%', field: 'lead_id' }
    ];

    for (const check of checks) {
      const { count } = await supabase
        .from(check.table)
        .select('id', { count: 'exact' })
        .like(check.field, check.pattern);

      if (count === 0) {
        issues.push(`No demo data found in ${check.table} - system may be too clean for demo functionality`);
      }
    }

    return {
      is_ready: issues.length === 0,
      issues
    };

  } catch (error) {
    return {
      is_ready: false,
      issues: [`Verification failed: ${error.message}`]
    };
  }
}