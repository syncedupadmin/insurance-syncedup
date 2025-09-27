require('dotenv').config({ path: '.env.production' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyAgenciesUpdate() {
  console.log('Starting agencies table update...\n');

  try {
    console.log('Step 1: Fetching existing agencies...');
    const { data: agencies, error: fetchError } = await supabase
      .from('agencies')
      .select('*');

    if (fetchError) {
      console.log('  Error:', fetchError.message);
      if (fetchError.message?.includes('column') && fetchError.message?.includes('does not exist')) {
        console.log('\n  ⚠️  Missing columns detected. You need to run the SQL migration first.');
        console.log('  Please execute update-agencies-schema.sql manually in Supabase SQL editor.');
        console.log('\n  Then run this script again to populate default values.\n');
        return;
      }
      throw fetchError;
    }

    console.log(`  Found ${agencies?.length || 0} agencies\n`);

    if (!agencies || agencies.length === 0) {
      console.log('  No agencies found. Nothing to update.\n');
      return;
    }

    console.log('Step 2: Updating agency default values...');

    for (const agency of agencies) {
      const updates = {};

      // Generate code if missing
      if (!agency.code) {
        updates.code = agency.id.substring(0, 8).toUpperCase();
      }

      // Set admin_email if missing
      if (!agency.admin_email) {
        updates.admin_email = agency.contact_email || `admin@${agency.name.toLowerCase().replace(/\s+/g, '')}.com`;
      }

      // Map billing_status to subscription_status if missing
      if (!agency.subscription_status) {
        updates.subscription_status = agency.billing_status || (agency.is_active ? 'active' : 'suspended');
      }

      // Set next billing date if missing
      if (!agency.next_billing_date) {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        updates.next_billing_date = nextMonth.toISOString().split('T')[0];
      }

      // Set default monthly fee if missing
      if (agency.monthly_fee === null || agency.monthly_fee === undefined) {
        // Set based on subscription plan
        const planFees = {
          'free': 0,
          'starter': 49,
          'professional': 149,
          'enterprise': 499
        };
        updates.monthly_fee = planFees[agency.subscription_plan] || 0;
      }

      // Set default user limit if missing
      if (agency.user_limit === null || agency.user_limit === undefined) {
        const planLimits = {
          'free': 3,
          'starter': 10,
          'professional': 50,
          'enterprise': 999
        };
        updates.user_limit = planLimits[agency.subscription_plan] || 10;
      }

      // Set default storage limit if missing
      if (agency.storage_limit_gb === null || agency.storage_limit_gb === undefined) {
        const storageLimits = {
          'free': 5,
          'starter': 50,
          'professional': 500,
          'enterprise': 5000
        };
        updates.storage_limit_gb = storageLimits[agency.subscription_plan] || 50;
      }

      // Set default API calls limit if missing
      if (agency.api_calls_limit === null || agency.api_calls_limit === undefined) {
        const apiLimits = {
          'free': 1000,
          'starter': 100000,
          'professional': 1000000,
          'enterprise': 10000000
        };
        updates.api_calls_limit = apiLimits[agency.subscription_plan] || 100000;
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('agencies')
          .update(updates)
          .eq('id', agency.id);

        if (updateError) {
          console.log(`  ✗ Failed to update agency ${agency.name}:`, updateError.message);
        } else {
          console.log(`  ✓ Updated agency: ${agency.name}`);
          Object.keys(updates).forEach(key => {
            console.log(`    - ${key}: ${updates[key]}`);
          });
        }
      } else {
        console.log(`  - Agency ${agency.name} already up to date`);
      }
    }

    console.log('\n✅ Agencies table update completed successfully!');

    console.log('\n📊 Current agencies:');
    const { data: finalAgencies } = await supabase
      .from('agencies')
      .select('id, name, code, subscription_plan, subscription_status, monthly_fee, user_limit, is_active');

    if (finalAgencies) {
      finalAgencies.forEach(a => {
        console.log(`\n  ${a.name}`);
        console.log(`    Code: ${a.code || 'N/A'}`);
        console.log(`    Plan: ${a.subscription_plan}, Status: ${a.subscription_status}`);
        console.log(`    Fee: $${a.monthly_fee || 0}/mo, Users: ${a.user_limit || 0}`);
        console.log(`    Active: ${a.is_active ? 'Yes' : 'No'}`);
      });
    }

    console.log('\n');

  } catch (error) {
    console.error('\n❌ Error updating agencies table:', error);
    process.exit(1);
  }
}

applyAgenciesUpdate();