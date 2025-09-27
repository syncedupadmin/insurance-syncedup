import { requireAuth } from '../_middleware/authCheck.js';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

async function productionCleanupHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = req.supabase || createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { confirm_cleanup, backup_completed } = req.body;
    
    if (!confirm_cleanup || !backup_completed) {
      return res.status(400).json({ 
        error: 'Cleanup confirmation and backup confirmation required',
        required_fields: {
          confirm_cleanup: 'Must be true to proceed',
          backup_completed: 'Must confirm database backup completed'
        }
      });
    }

    console.log('Starting production cleanup process...');
    
    const results = {
      demo_users_preserved: 0,
      leads_cleaned: 0,
      commissions_cleaned: 0,
      tickets_cleaned: 0,
      sales_cleaned: 0,
      users_cleaned: 0,
      verification_passed: false,
      errors: []
    };

    // Step 1: Identify and preserve demo users
    const { data: demoUsers, error: demoUsersError } = await supabase
      .from('portal_users')
      .select('id, email, role, name')
      .or('email.like.%@demo.com,email.eq.admin@syncedupsolutions.com');

    if (demoUsersError) {
      throw new Error(`Failed to identify demo users: ${demoUsersError.message}`);
    }

    results.demo_users_preserved = demoUsers?.length || 0;
    const demoUserIds = demoUsers?.map(u => u.id) || [];

    console.log(`Preserving ${results.demo_users_preserved} demo users`);

    // Step 2: Clean leads data (keep only DEMO_LEAD_* patterns)
    try {
      const { error: leadsError, count: leadsDeleted } = await supabase
        .from('convoso_leads')
        .delete({ count: 'exact' })
        .not('lead_id', 'like', 'DEMO_LEAD_%')
        .not('agent_assignment', 'in', `(${demoUserIds.join(',')})`);

      if (!leadsError) {
        results.leads_cleaned = leadsDeleted || 0;
      } else {
        results.errors.push(`Leads cleanup: ${leadsError.message}`);
      }
    } catch (error) {
      results.errors.push(`Leads cleanup error: ${error.message}`);
    }

    // Step 3: Clean commission data (keep only DEMO_SALE_* patterns)  
    try {
      const { error: commissionsError, count: commissionsDeleted } = await supabase
        .from('portal_commissions')
        .delete({ count: 'exact' })
        .not('sale_id', 'like', 'DEMO_SALE_%')
        .neq('agency_id', 'DEMO001');

      if (!commissionsError) {
        results.commissions_cleaned = commissionsDeleted || 0;
      } else {
        results.errors.push(`Commissions cleanup: ${commissionsError.message}`);
      }
    } catch (error) {
      results.errors.push(`Commissions cleanup error: ${error.message}`);
    }

    // Step 4: Clean support tickets (keep only TKT-DEMO-* patterns)
    try {
      const { error: ticketsError, count: ticketsDeleted } = await supabase
        .from('support_tickets')
        .delete({ count: 'exact' })
        .not('ticket_number', 'like', 'TKT-DEMO-%')
        .neq('agency_id', 'DEMO001');

      if (!ticketsError) {
        results.tickets_cleaned = ticketsDeleted || 0;
      } else {
        results.errors.push(`Tickets cleanup: ${ticketsError.message}`);
      }
    } catch (error) {
      results.errors.push(`Tickets cleanup error: ${error.message}`);
    }

    // Step 5: Clean sales data (keep only DEMO_SALE_* patterns)
    try {
      const { error: salesError, count: salesDeleted } = await supabase
        .from('portal_sales')
        .delete({ count: 'exact' })
        .not('sale_id', 'like', 'DEMO_SALE_%')
        .neq('agency_id', 'DEMO001');

      if (!salesError) {
        results.sales_cleaned = salesDeleted || 0;
      } else {
        results.errors.push(`Sales cleanup: ${salesError.message}`);
      }
    } catch (error) {
      results.errors.push(`Sales cleanup error: ${error.message}`);
    }

    // Step 6: Clean non-demo users (keep only @demo.com emails)
    try {
      const { error: usersError, count: usersDeleted } = await supabase
        .from('portal_users')
        .delete({ count: 'exact' })
        .not('email', 'like', '%@demo.com')
        .neq('email', 'admin@syncedupsolutions.com')
        .neq('role', 'super_admin');

      if (!usersError) {
        results.users_cleaned = usersDeleted || 0;
      } else {
        results.errors.push(`Users cleanup: ${usersError.message}`);
      }
    } catch (error) {
      results.errors.push(`Users cleanup error: ${error.message}`);
    }

    // Step 7: Verification - ensure only demo data remains
    try {
      const verificationQueries = await Promise.all([
        // Verify demo users count
        supabase
          .from('portal_users')
          .select('id', { count: 'exact' })
          .like('email', '%@demo.com'),
        
        // Verify no non-demo commissions
        supabase  
          .from('portal_commissions')
          .select('id', { count: 'exact' })
          .not('sale_id', 'like', 'DEMO_SALE_%'),
        
        // Verify no non-demo tickets
        supabase
          .from('support_tickets') 
          .select('id', { count: 'exact' })
          .not('ticket_number', 'like', 'TKT-DEMO-%'),
        
        // Verify no non-demo leads
        supabase
          .from('convoso_leads')
          .select('id', { count: 'exact' })
          .not('lead_id', 'like', 'DEMO_LEAD_%')
      ]);

      const [demoUsersCheck, nonDemoCommissions, nonDemoTickets, nonDemoLeads] = verificationQueries;

      if (demoUsersCheck.error || nonDemoCommissions.error || nonDemoTickets.error || nonDemoLeads.error) {
        throw new Error('Verification queries failed');
      }

      const demoUserCount = demoUsersCheck.count || 0;
      const nonDemoCommissionCount = nonDemoCommissions.count || 0;
      const nonDemoTicketCount = nonDemoTickets.count || 0;
      const nonDemoLeadCount = nonDemoLeads.count || 0;

      if (demoUserCount >= 5 && nonDemoCommissionCount === 0 && 
          nonDemoTicketCount === 0 && nonDemoLeadCount === 0) {
        results.verification_passed = true;
      } else {
        results.errors.push(
          `Verification failed: Demo users: ${demoUserCount}, ` +
          `Non-demo commissions: ${nonDemoCommissionCount}, ` + 
          `Non-demo tickets: ${nonDemoTicketCount}, ` +
          `Non-demo leads: ${nonDemoLeadCount}`
        );
      }

    } catch (error) {
      results.errors.push(`Verification error: ${error.message}`);
    }

    // Step 8: Log cleanup completion
    console.log('Production cleanup completed:', results);

    return res.json({
      success: results.verification_passed,
      message: results.verification_passed ? 
        'Production cleanup completed successfully. System ready for live data.' :
        'Production cleanup completed with warnings. Please review errors.',
      results,
      next_steps: [
        'Verify all dashboards show empty states appropriately',
        'Test demo account functionality',
        'Deploy to production environment',
        'Begin live Convoso integration',
        'Monitor system for any issues'
      ]
    });

  } catch (error) {
    console.error('Production cleanup error:', error);
    return res.status(500).json({ 
      error: 'Production cleanup failed',
      details: error.message,
      recommendation: 'Restore from backup and investigate issues before retrying'
    });
  }
}

export default requireAuth(['super_admin'])(productionCleanupHandler);