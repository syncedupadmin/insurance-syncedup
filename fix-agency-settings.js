import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixAgencySettings() {
    console.log('🔧 Fixing agencies table settings and data consistency...\n');
    
    try {
        // Get all agencies
        const { data: agencies, error: fetchError } = await supabase
            .from('agencies')
            .select('*');
            
        if (fetchError) {
            console.log(`❌ Error fetching agencies: ${fetchError.message}`);
            return;
        }
        
        console.log(`📊 Found ${agencies?.length || 0} agencies to process\n`);
        
        let updated = 0;
        let skipped = 0;
        
        // Update each agency with proper settings
        for (const agency of agencies || []) {
            console.log(`🏢 Processing agency: ${agency.name} (${agency.code})`);
            
            // Check current settings
            console.log(`   Current settings:`, agency.settings);
            console.log(`   Current active status:`, agency.is_active);
            
            // Determine plan type and monthly revenue based on agency
            let plan_type = 'professional'; // Default
            let monthly_revenue = 199; // Default professional
            let status = agency.is_active ? 'active' : 'suspended';
            
            // Adjust based on agency name/code (smart defaults)
            if (agency.name.toLowerCase().includes('demo') || agency.code.includes('DEMO')) {
                plan_type = 'basic';
                monthly_revenue = 99;
                status = 'trial';
            } else if (agency.name.toLowerCase().includes('enterprise') || agency.code.includes('ENT')) {
                plan_type = 'enterprise';
                monthly_revenue = 399;
            }
            
            const newSettings = {
                plan_type: plan_type,
                status: status,
                monthly_revenue: monthly_revenue,
                features: {
                    api_access: plan_type === 'enterprise',
                    csv_upload: true,
                    advanced_reporting: plan_type !== 'basic',
                    white_labeling: plan_type === 'enterprise'
                },
                billing: {
                    cycle: 'monthly',
                    auto_renewal: true,
                    next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                }
            };
            
            console.log(`   New settings:`, newSettings);
            
            const { error: updateError } = await supabase
                .from('agencies')
                .update({ 
                    settings: newSettings,
                    // Also ensure is_active matches the status
                    is_active: status === 'active'
                })
                .eq('id', agency.id);
                
            if (updateError) {
                console.log(`   ❌ Error updating: ${updateError.message}`);
                skipped++;
            } else {
                console.log(`   ✅ Updated successfully`);
                updated++;
            }
            
            console.log(''); // Empty line for readability
        }
        
        console.log('📊 SETTINGS UPDATE SUMMARY');
        console.log('=' .repeat(30));
        console.log(`✅ Updated: ${updated}`);
        console.log(`❌ Skipped: ${skipped}`);
        
        // Now let's verify the updates
        console.log('\n🔍 Verifying updates...');
        await verifyUpdates();
        
    } catch (error) {
        console.log(`❌ Error in fixAgencySettings: ${error.message}`);
    }
}

async function verifyUpdates() {
    try {
        const { data: agencies, error } = await supabase
            .from('agencies')
            .select('id, name, code, settings, is_active');
            
        if (error) {
            console.log(`❌ Verification error: ${error.message}`);
            return;
        }
        
        console.log('\n📋 UPDATED AGENCIES:');
        agencies.forEach(agency => {
            console.log(`🏢 ${agency.name} (${agency.code})`);
            console.log(`   Active: ${agency.is_active}`);
            console.log(`   Plan: ${agency.settings?.plan_type || 'unknown'}`);
            console.log(`   Status: ${agency.settings?.status || 'unknown'}`);
            console.log(`   Revenue: $${agency.settings?.monthly_revenue || 0}`);
            console.log('');
        });
        
    } catch (error) {
        console.log(`❌ Verification error: ${error.message}`);
    }
}

fixAgencySettings();