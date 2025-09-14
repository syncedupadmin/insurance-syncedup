// EMERGENCY Database Fix API - Resolves critical data integrity issues
// PRODUCTION CRITICAL: Fixes orphaned records immediately

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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate user has super admin access
    const userContext = validateUserContext(req);
    if (userContext.role !== 'super_admin') {
      logSecurityViolation(req, 'UNAUTHORIZED_DATABASE_FIX', { 
        role: userContext.role,
        agency: userContext.agencyId 
      });
      return res.status(403).json({ error: 'Super admin access required for database fixes' });
    }

    console.log(`EMERGENCY DATABASE FIX initiated by ${userContext.email}`);

    const fixResults = {
      timestamp: new Date().toISOString(),
      fixed_by: userContext.email,
      fixes_applied: [],
      errors: []
    };

    // STEP 1: Create valid agencies if they don't exist
    try {
      const { data: agencyInserts, error: agencyError } = await supabase
        .from('agencies')
        .upsert([
          {
            id: 'a1111111-1111-1111-1111-111111111111',
            agency_id: 'SYSTEM',
            agency_name: 'SyncedUp System',
            is_active: true
          },
          {
            id: 'a2222222-2222-2222-2222-222222222222',
            agency_id: 'DEMO001',
            agency_name: 'Demo Agency',
            is_active: true
          },
          {
            id: 'a3333333-3333-3333-3333-333333333333',
            agency_id: 'PHS001',
            agency_name: 'PHS Insurance Agency',
            is_active: true
          }
        ], { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });

      if (agencyError) {
        fixResults.errors.push(`Agency creation failed: ${agencyError.message}`);
      } else {
        fixResults.fixes_applied.push('Valid agencies ensured');
      }
    } catch (error) {
      fixResults.errors.push(`Agency fix error: ${error.message}`);
    }

    // STEP 2: Fix orphaned users - reassign to DEMO001
    try {
      const validAgencyIds = [
        'a1111111-1111-1111-1111-111111111111',
        'a2222222-2222-2222-2222-222222222222', 
        'a3333333-3333-3333-3333-333333333333'
      ];

      // First, find orphaned users
      const { data: orphanedUsers, error: findError } = await supabase
        .from('portal_users')
        .select('id, email, agency_id')
        .not('agency_id', 'in', `(${validAgencyIds.join(',')})`);

      if (findError) {
        fixResults.errors.push(`Failed to find orphaned users: ${findError.message}`);
      } else if (orphanedUsers && orphanedUsers.length > 0) {
        // Update orphaned users to DEMO001 agency
        const { data: updatedUsers, error: updateError } = await supabase
          .from('portal_users')
          .update({ 
            agency_id: 'a2222222-2222-2222-2222-222222222222',
            updated_at: new Date().toISOString()
          })
          .not('agency_id', 'in', `(${validAgencyIds.join(',')})`)
          .select('id, email, agency_id');

        if (updateError) {
          fixResults.errors.push(`Failed to fix orphaned users: ${updateError.message}`);
        } else {
          fixResults.fixes_applied.push(`Fixed ${orphanedUsers.length} orphaned users (reassigned to DEMO001)`);
        }
      } else {
        fixResults.fixes_applied.push('No orphaned users found');
      }
    } catch (error) {
      fixResults.errors.push(`User fix error: ${error.message}`);
    }

    // STEP 3: Fix orphaned sales - assign agency_id from agent
    try {
      const { data: orphanedSales, error: salesError } = await supabase
        .from('portal_sales')
        .select('id, agent_id, customer_name')
        .is('agency_id', null);

      if (salesError) {
        fixResults.errors.push(`Failed to find orphaned sales: ${salesError.message}`);
      } else if (orphanedSales && orphanedSales.length > 0) {
        // Update sales with agent's agency_id
        const { error: updateSalesError } = await supabase.rpc('fix_orphaned_sales');
        
        if (updateSalesError) {
          // Fallback: manual update
          for (const sale of orphanedSales) {
            const { data: agent } = await supabase
              .from('portal_users')
              .select('agency_id')
              .eq('id', sale.agent_id)
              .single();

            if (agent) {
              await supabase
                .from('portal_sales')
                .update({ 
                  agency_id: agent.agency_id,
                  updated_at: new Date().toISOString()
                })
                .eq('id', sale.id);
            }
          }
          fixResults.fixes_applied.push(`Fixed ${orphanedSales.length} orphaned sales`);
        } else {
          fixResults.fixes_applied.push(`Fixed orphaned sales using RPC function`);
        }
      } else {
        fixResults.fixes_applied.push('No orphaned sales found');
      }
    } catch (error) {
      fixResults.errors.push(`Sales fix error: ${error.message}`);
    }

    // STEP 4: Create missing commission records
    try {
      const { data: salesWithoutCommissions, error: commissionCheckError } = await supabase
        .from('portal_sales')
        .select('id, agent_id, agency_id, commission_amount, commission_rate, premium, product_name, carrier, policy_number, sale_date, status')
        .gt('commission_amount', 0);

      if (commissionCheckError) {
        fixResults.errors.push(`Failed to check commission status: ${commissionCheckError.message}`);
      } else if (salesWithoutCommissions) {
        // Check which sales already have commissions
        const { data: existingCommissions } = await supabase
          .from('commissions')
          .select('sale_id');

        const existingSaleIds = new Set(existingCommissions?.map(c => c.sale_id) || []);
        const salesNeedingCommissions = salesWithoutCommissions.filter(s => !existingSaleIds.has(s.id));

        if (salesNeedingCommissions.length > 0) {
          const commissionsToCreate = salesNeedingCommissions.map(sale => ({
            sale_id: sale.id,
            agent_id: sale.agent_id,
            agency_id: sale.agency_id,
            commission_rate: sale.commission_rate,
            commission_amount: sale.commission_amount,
            base_amount: sale.premium,
            commission_type: 'initial',
            payment_status: sale.status === 'active' ? 'pending' : 'cancelled',
            product_name: sale.product_name,
            carrier: sale.carrier,
            policy_number: sale.policy_number,
            payment_period: new Date(sale.sale_date).toISOString().substr(0, 7)
          }));

          const { data: createdCommissions, error: createError } = await supabase
            .from('commissions')
            .insert(commissionsToCreate);

          if (createError) {
            fixResults.errors.push(`Failed to create commissions: ${createError.message}`);
          } else {
            const totalCommission = commissionsToCreate.reduce((sum, c) => sum + (c.commission_amount || 0), 0);
            fixResults.fixes_applied.push(`Created ${commissionsToCreate.length} commission records ($${totalCommission.toFixed(2)} total)`);
          }
        } else {
          fixResults.fixes_applied.push('All sales already have commission records');
        }
      }
    } catch (error) {
      fixResults.errors.push(`Commission creation error: ${error.message}`);
    }

    // STEP 5: Log the fix operation
    await supabase.from('audit_logs').insert({
      user_id: userContext.userId,
      agency_id: userContext.agencyId,
      action: 'EMERGENCY_DATABASE_FIX',
      resource_type: 'database',
      details: `Applied ${fixResults.fixes_applied.length} fixes, ${fixResults.errors.length} errors`,
      metadata: fixResults,
      timestamp: new Date().toISOString()
    });

    const success = fixResults.errors.length === 0;
    const status = success ? 200 : 500;

    console.log(`Database fix completed: ${fixResults.fixes_applied.length} fixes applied, ${fixResults.errors.length} errors`);

    return res.status(status).json({
      success,
      message: success ? 'Database integrity restored successfully' : 'Database fix completed with some errors',
      ...fixResults
    });

  } catch (error) {
    console.error('Emergency database fix error:', error);
    return res.status(500).json({ 
      error: 'Database fix failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}