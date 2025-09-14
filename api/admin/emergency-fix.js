// EMERGENCY Database Fix - NO AUTH REQUIRED (EMERGENCY ONLY)
// PRODUCTION CRITICAL: Fixes orphaned records immediately
// WARNING: This bypasses auth for emergency use only

import { createClient } from '@supabase/supabase-js';
import { setCORSHeaders, handleCORSPreflight } from '../_utils/cors.js';

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
    console.log('🚨 EMERGENCY DATABASE FIX INITIATED');

    const fixResults = {
      timestamp: new Date().toISOString(),
      fixed_by: 'EMERGENCY_SYSTEM',
      fixes_applied: [],
      errors: [],
      emergency_mode: true
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
        console.error('Agency creation error:', agencyError);
      } else {
        fixResults.fixes_applied.push('✅ Valid agencies ensured');
        console.log('✅ Valid agencies created/updated');
      }
    } catch (error) {
      fixResults.errors.push(`Agency fix error: ${error.message}`);
      console.error('Agency fix error:', error);
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
        console.error('Find orphaned users error:', findError);
      } else if (orphanedUsers && orphanedUsers.length > 0) {
        console.log(`🔧 Found ${orphanedUsers.length} orphaned users to fix:`, orphanedUsers.map(u => u.email));
        
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
          console.error('Update users error:', updateError);
        } else {
          fixResults.fixes_applied.push(`✅ Fixed ${orphanedUsers.length} orphaned users (reassigned to DEMO001)`);
          console.log(`✅ Successfully reassigned ${orphanedUsers.length} users to DEMO001`);
        }
      } else {
        fixResults.fixes_applied.push('✅ No orphaned users found');
        console.log('✅ No orphaned users found');
      }
    } catch (error) {
      fixResults.errors.push(`User fix error: ${error.message}`);
      console.error('User fix error:', error);
    }

    // STEP 3: Fix orphaned sales - assign agency_id from agent
    try {
      const { data: orphanedSales, error: salesError } = await supabase
        .from('portal_sales')
        .select('id, agent_id, customer_name, premium')
        .is('agency_id', null);

      if (salesError) {
        fixResults.errors.push(`Failed to find orphaned sales: ${salesError.message}`);
        console.error('Find orphaned sales error:', salesError);
      } else if (orphanedSales && orphanedSales.length > 0) {
        console.log(`🔧 Found ${orphanedSales.length} orphaned sales to fix`);
        
        // Update sales with agent's agency_id
        let fixedSalesCount = 0;
        for (const sale of orphanedSales) {
          if (sale.agent_id) {
            const { data: agent } = await supabase
              .from('portal_users')
              .select('agency_id')
              .eq('id', sale.agent_id)
              .single();

            if (agent && agent.agency_id) {
              await supabase
                .from('portal_sales')
                .update({ 
                  agency_id: agent.agency_id,
                  updated_at: new Date().toISOString()
                })
                .eq('id', sale.id);
              fixedSalesCount++;
            }
          }
        }
        
        fixResults.fixes_applied.push(`✅ Fixed ${fixedSalesCount} orphaned sales`);
        console.log(`✅ Successfully fixed ${fixedSalesCount} orphaned sales`);
      } else {
        fixResults.fixes_applied.push('✅ No orphaned sales found');
        console.log('✅ No orphaned sales found');
      }
    } catch (error) {
      fixResults.errors.push(`Sales fix error: ${error.message}`);
      console.error('Sales fix error:', error);
    }

    // STEP 4: Create missing commission records
    try {
      const { data: salesWithoutCommissions, error: commissionCheckError } = await supabase
        .from('portal_sales')
        .select('id, agent_id, agency_id, commission_amount, commission_rate, premium, product_name, carrier, policy_number, sale_date, status')
        .gt('commission_amount', 0);

      if (commissionCheckError) {
        fixResults.errors.push(`Failed to check commission status: ${commissionCheckError.message}`);
        console.error('Commission check error:', commissionCheckError);
      } else if (salesWithoutCommissions) {
        // Check which sales already have commissions
        const { data: existingCommissions } = await supabase
          .from('commissions')
          .select('sale_id');

        const existingSaleIds = new Set(existingCommissions?.map(c => c.sale_id) || []);
        const salesNeedingCommissions = salesWithoutCommissions.filter(s => !existingSaleIds.has(s.id));

        if (salesNeedingCommissions.length > 0) {
          console.log(`🔧 Creating ${salesNeedingCommissions.length} missing commission records`);
          
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
            console.error('Commission creation error:', createError);
          } else {
            const totalCommission = commissionsToCreate.reduce((sum, c) => sum + (c.commission_amount || 0), 0);
            fixResults.fixes_applied.push(`✅ Created ${commissionsToCreate.length} commission records ($${totalCommission.toFixed(2)} total)`);
            console.log(`✅ Successfully created ${commissionsToCreate.length} commission records totaling $${totalCommission.toFixed(2)}`);
          }
        } else {
          fixResults.fixes_applied.push('✅ All sales already have commission records');
          console.log('✅ All sales already have commission records');
        }
      }
    } catch (error) {
      fixResults.errors.push(`Commission creation error: ${error.message}`);
      console.error('Commission creation error:', error);
    }

    // STEP 5: Log the fix operation
    await supabase.from('audit_logs').insert({
      user_id: null,
      agency_id: 'SYSTEM',
      action: 'EMERGENCY_DATABASE_FIX',
      resource_type: 'database',
      details: `Applied ${fixResults.fixes_applied.length} fixes, ${fixResults.errors.length} errors`,
      metadata: fixResults,
      timestamp: new Date().toISOString()
    });

    const success = fixResults.errors.length === 0;
    const status = success ? 200 : 207; // 207 = Multi-Status (partial success)

    console.log(`🚨 EMERGENCY DATABASE FIX COMPLETED: ${fixResults.fixes_applied.length} fixes applied, ${fixResults.errors.length} errors`);

    return res.status(status).json({
      success,
      message: success ? '✅ Database integrity restored successfully' : '⚠️ Database fix completed with some errors',
      ...fixResults
    });

  } catch (error) {
    console.error('🚨 EMERGENCY DATABASE FIX FAILED:', error);
    return res.status(500).json({ 
      error: 'Database fix failed',
      message: error.message,
      emergency_mode: true
    });
  }
}