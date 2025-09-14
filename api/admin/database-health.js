// Database Health Check API - Monitors data integrity
// PRODUCTION CRITICAL: Identifies orphaned records and data issues

import { createClient } from '@supabase/supabase-js';
import { setCORSHeaders, handleCORSPreflight } from '../_utils/cors.js';
import { validateUserContext, logSecurityViolation } from '../_utils/agency-isolation.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Handle CORS preflight  
  if (handleCORSPreflight(req, res)) return;
  
  // Set secure CORS headers
  setCORSHeaders(req, res);

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate user has admin access
    const userContext = validateUserContext(req);
    if (!['super_admin', 'admin'].includes(userContext.role)) {
      logSecurityViolation(req, 'UNAUTHORIZED_DB_HEALTH_CHECK', { 
        role: userContext.role,
        agency: userContext.agencyId 
      });
      return res.status(403).json({ error: 'Admin access required' });
    }

    console.log(`Database health check initiated by ${userContext.email} (${userContext.role})`);

    const healthReport = {
      timestamp: new Date().toISOString(),
      checked_by: userContext.email,
      overall_status: 'HEALTHY',
      issues: [],
      statistics: {},
      recommendations: []
    };

    // 1. Check for orphaned users
    const { data: orphanedUsers, error: userError } = await supabase
      .from('portal_users')
      .select('id, email, agency_id, is_active')
      .not('agency_id', 'in', '(a1111111-1111-1111-1111-111111111111,a2222222-2222-2222-2222-222222222222,a3333333-3333-3333-3333-333333333333)');

    if (userError) {
      console.error('Error checking users:', userError);
    } else if (orphanedUsers && orphanedUsers.length > 0) {
      healthReport.overall_status = 'CRITICAL';
      healthReport.issues.push({
        type: 'ORPHANED_USERS',
        severity: 'CRITICAL',
        count: orphanedUsers.length,
        description: `${orphanedUsers.length} users have invalid agency_ids`,
        affected_emails: orphanedUsers.map(u => u.email),
        action_required: 'Run fix-production-data-integrity.sql'
      });
    }

    // 2. Check for sales without commission records
    const { data: salesWithoutCommissions, error: salesError } = await supabase
      .rpc('check_sales_without_commissions');

    if (salesError) {
      // Fallback if RPC doesn't exist
      const { data: allSales } = await supabase
        .from('portal_sales')
        .select('id, commission_amount')
        .gt('commission_amount', 0);

      const { data: allCommissions } = await supabase
        .from('commissions')
        .select('sale_id');

      const commissionSaleIds = new Set(allCommissions?.map(c => c.sale_id) || []);
      const salesWithoutComm = allSales?.filter(s => !commissionSaleIds.has(s.id)) || [];

      if (salesWithoutComm.length > 0) {
        healthReport.overall_status = healthReport.overall_status === 'HEALTHY' ? 'WARNING' : 'CRITICAL';
        healthReport.issues.push({
          type: 'MISSING_COMMISSIONS',
          severity: 'WARNING',
          count: salesWithoutComm.length,
          description: `${salesWithoutComm.length} sales missing commission records`,
          action_required: 'Call /api/admin/commission-sync'
        });
      }
    }

    // 3. Check for null agency_ids in sales
    const { data: orphanedSales, error: salesAgencyError } = await supabase
      .from('portal_sales')
      .select('id, customer_name, premium')
      .is('agency_id', null);

    if (salesAgencyError) {
      console.error('Error checking sales agency_ids:', salesAgencyError);
    } else if (orphanedSales && orphanedSales.length > 0) {
      healthReport.overall_status = 'CRITICAL';
      healthReport.issues.push({
        type: 'ORPHANED_SALES',
        severity: 'CRITICAL',
        count: orphanedSales.length,
        description: `${orphanedSales.length} sales have null agency_id`,
        action_required: 'Run fix-production-data-integrity.sql'
      });
    }

    // 4. Get statistics
    const [userStats, salesStats, commissionStats, agencyStats] = await Promise.all([
      supabase.from('portal_users').select('agency_id, is_active', { count: 'exact', head: true }),
      supabase.from('portal_sales').select('agency_id, status, commission_amount', { count: 'exact', head: true }),
      supabase.from('commissions').select('agency_id, payment_status', { count: 'exact', head: true }),
      supabase.from('agencies').select('id, is_active', { count: 'exact', head: true })
    ]);

    healthReport.statistics = {
      total_users: userStats.count || 0,
      total_sales: salesStats.count || 0,
      total_commissions: commissionStats.count || 0,
      total_agencies: agencyStats.count || 0
    };

    // 5. Generate recommendations
    if (healthReport.issues.length === 0) {
      healthReport.recommendations.push('Database integrity is excellent. No action required.');
    } else {
      healthReport.recommendations.push('Run the database integrity fix script immediately.');
      if (healthReport.issues.some(i => i.type === 'MISSING_COMMISSIONS')) {
        healthReport.recommendations.push('Sync commission records using /api/admin/commission-sync');
      }
    }

    // 6. Log the health check
    await supabase.from('audit_logs').insert({
      user_id: userContext.userId,
      agency_id: userContext.agencyId,
      action: 'DATABASE_HEALTH_CHECK',
      resource_type: 'database',
      details: `Health status: ${healthReport.overall_status}, Issues found: ${healthReport.issues.length}`,
      metadata: healthReport,
      timestamp: new Date().toISOString()
    });

    return res.status(200).json(healthReport);

  } catch (error) {
    console.error('Database health check error:', error);
    return res.status(500).json({ 
      error: 'Health check failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}