import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAgencyCreation() {
    try {
        console.log('Testing agency creation...');
        
        // Test data that matches the actual form
        const testData = {
            name: 'Test Agency Creation',
            contact_email: 'testcreate@test.com',
            plan_type: 'professional',
            status: 'trial'
        };

        console.log('Creating agency with data:', testData);

        // Calculate initial monthly revenue based on plan
        const planPricing = {
            basic: 99,
            professional: 199,
            enterprise: 399
        };

        // Map status to is_active boolean
        const is_active = testData.status === 'active';
        const monthly_revenue = testData.status === 'trial' ? 0 : (planPricing[testData.plan_type] || 0);

        // Generate unique agency code
        const agencyCode = testData.name
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .replace(/\s+/g, '')
            .substring(0, 10)
            .toUpperCase();

        // Create agency data that matches the actual database schema
        const newAgency = {
            name: testData.name.trim(),
            code: agencyCode,
            admin_email: testData.contact_email.trim().toLowerCase(),
            is_active,
            commission_split: 20,
            pay_period: 'monthly',
            pay_day: 1,
            is_demo: false,
            participate_global_leaderboard: false,
            api_credentials: {},
            features: {
                api_access: false,
                csv_upload: true
            },
            settings: {
                plan_type: testData.plan_type,
                status: testData.status,
                monthly_revenue: monthly_revenue
            },
            commission_structure: {
                rate: 80,
                type: 'percentage',
                tiers: []
            }
        };

        console.log('Inserting agency:', JSON.stringify(newAgency, null, 2));

        // Insert into agencies table
        let { data: agency, error } = await supabase
            .from('agencies')
            .insert([newAgency])
            .select()
            .single();

        if (error) {
            console.error('Error creating agency:', error);
            return;
        }

        console.log('✅ Successfully created agency:');
        console.log(JSON.stringify(agency, null, 2));

        // Clean up - delete the test agency
        console.log('\nCleaning up test agency...');
        const { error: deleteError } = await supabase
            .from('agencies')
            .delete()
            .eq('id', agency.id);

        if (deleteError) {
            console.error('Error deleting test agency:', deleteError);
        } else {
            console.log('✅ Test agency cleaned up successfully');
        }

    } catch (error) {
        console.error('Test error:', error);
    }
}

testAgencyCreation();