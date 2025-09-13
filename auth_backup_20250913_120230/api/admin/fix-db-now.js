// EMERGENCY DATABASE FIX - IMMEDIATE EXECUTION
// Minimal dependencies, direct Supabase call

export default async function handler(req, res) {
  // Set CORS headers for production domains
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://insurance.syncedupsolutions.com',
    'https://insurance-syncedup.vercel.app'
  ];
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Environment validation
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ 
        error: 'Missing Supabase configuration',
        message: 'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY required'
      });
    }

    console.log('🚨 EMERGENCY DATABASE FIX STARTING');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;
    
    const fixResults = {
      timestamp: new Date().toISOString(),
      fixes_applied: [],
      errors: []
    };

    // STEP 1: Create/update valid agencies
    try {
      const agencyResponse = await fetch(`${supabaseUrl}/rest/v1/agencies`, {
        method: 'POST',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify([
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
        ])
      });

      if (agencyResponse.ok) {
        fixResults.fixes_applied.push('✅ Valid agencies created/updated');
        console.log('✅ Valid agencies ensured');
      } else {
        const error = await agencyResponse.text();
        fixResults.errors.push(`Agency creation failed: ${error}`);
        console.error('Agency creation error:', error);
      }
    } catch (error) {
      fixResults.errors.push(`Agency fix error: ${error.message}`);
      console.error('Agency fix error:', error);
    }

    // STEP 2: Fix orphaned users
    try {
      // First get orphaned users
      const orphanedResponse = await fetch(`${supabaseUrl}/rest/v1/portal_users?select=id,email,agency_id&agency_id=not.in.(a1111111-1111-1111-1111-111111111111,a2222222-2222-2222-2222-222222222222,a3333333-3333-3333-3333-333333333333)`, {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`
        }
      });

      if (orphanedResponse.ok) {
        const orphanedUsers = await orphanedResponse.json();
        
        if (orphanedUsers && orphanedUsers.length > 0) {
          console.log(`🔧 Found ${orphanedUsers.length} orphaned users to fix`);
          
          // Update orphaned users to DEMO001 agency
          const updateResponse = await fetch(`${supabaseUrl}/rest/v1/portal_users?agency_id=not.in.(a1111111-1111-1111-1111-111111111111,a2222222-2222-2222-2222-222222222222,a3333333-3333-3333-3333-333333333333)`, {
            method: 'PATCH',
            headers: {
              'apikey': serviceKey,
              'Authorization': `Bearer ${serviceKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              agency_id: 'a2222222-2222-2222-2222-222222222222',
              updated_at: new Date().toISOString()
            })
          });

          if (updateResponse.ok) {
            fixResults.fixes_applied.push(`✅ Fixed ${orphanedUsers.length} orphaned users (reassigned to DEMO001)`);
            console.log(`✅ Successfully reassigned ${orphanedUsers.length} users to DEMO001`);
          } else {
            const error = await updateResponse.text();
            fixResults.errors.push(`Failed to fix orphaned users: ${error}`);
          }
        } else {
          fixResults.fixes_applied.push('✅ No orphaned users found');
          console.log('✅ No orphaned users found');
        }
      }
    } catch (error) {
      fixResults.errors.push(`User fix error: ${error.message}`);
      console.error('User fix error:', error);
    }

    // STEP 3: Fix orphaned sales
    try {
      const orphanedSalesResponse = await fetch(`${supabaseUrl}/rest/v1/portal_sales?select=id,agent_id,customer_name&agency_id=is.null`, {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`
        }
      });

      if (orphanedSalesResponse.ok) {
        const orphanedSales = await orphanedSalesResponse.json();
        
        if (orphanedSales && orphanedSales.length > 0) {
          console.log(`🔧 Found ${orphanedSales.length} orphaned sales to fix`);
          
          // Update orphaned sales - assign to DEMO001 for now
          const updateSalesResponse = await fetch(`${supabaseUrl}/rest/v1/portal_sales?agency_id=is.null`, {
            method: 'PATCH',
            headers: {
              'apikey': serviceKey,
              'Authorization': `Bearer ${serviceKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              agency_id: 'a2222222-2222-2222-2222-222222222222',
              updated_at: new Date().toISOString()
            })
          });

          if (updateSalesResponse.ok) {
            fixResults.fixes_applied.push(`✅ Fixed ${orphanedSales.length} orphaned sales`);
            console.log(`✅ Successfully fixed ${orphanedSales.length} orphaned sales`);
          } else {
            const error = await updateSalesResponse.text();
            fixResults.errors.push(`Failed to fix orphaned sales: ${error}`);
          }
        } else {
          fixResults.fixes_applied.push('✅ No orphaned sales found');
          console.log('✅ No orphaned sales found');
        }
      }
    } catch (error) {
      fixResults.errors.push(`Sales fix error: ${error.message}`);
      console.error('Sales fix error:', error);
    }

    const success = fixResults.errors.length === 0;
    console.log(`🚨 EMERGENCY DATABASE FIX COMPLETED: ${fixResults.fixes_applied.length} fixes, ${fixResults.errors.length} errors`);

    return res.status(success ? 200 : 207).json({
      success,
      message: success ? '✅ Database integrity restored' : '⚠️ Partial success with some errors',
      ...fixResults
    });

  } catch (error) {
    console.error('🚨 EMERGENCY FIX FAILED:', error);
    return res.status(500).json({ 
      error: 'Database fix failed',
      message: error.message
    });
  }
}