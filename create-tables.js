const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function createTables() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase credentials');
        return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Create agency_integrations table first
    console.log('Creating agency_integrations table...');
    
    const { data, error } = await supabase.rpc('create_agency_integrations_table', {});
    
    if (error) {
        console.log('Table may already exist or RPC not available. Continuing...');
        console.log('Error:', error.message);
    } else {
        console.log('Table created successfully');
    }
    
    // Test if we can insert a record
    console.log('Testing table insertion...');
    
    try {
        const { data: insertData, error: insertError } = await supabase
            .from('agency_integrations')
            .upsert({
                agency_id: 'PHS001',
                agency_name: 'Phoenix Health Solutions',
                integration_type: 'convoso',
                is_active: true,
                encrypted_api_key: 'TEMP_KEY',
                encrypted_webhook_secret: 'TEMP_SECRET',
                encrypted_account_id: 'TEMP_ACCOUNT',
                encryption_key_id: 'v1',
                webhook_url: 'https://insurance.syncedupsolutions.com/api/leads/convoso-webhook/PHS001',
                onboarding_status: 'pending'
            }, {
                onConflict: 'agency_id'
            });
            
        if (insertError) {
            console.log('Insert failed:', insertError.message);
            if (insertError.message.includes('relation') && insertError.message.includes('does not exist')) {
                console.log('Need to create tables manually in Supabase dashboard');
            }
        } else {
            console.log('Insert successful - tables exist!');
        }
    } catch (error) {
        console.log('Insert test failed:', error.message);
    }
}

createTables();