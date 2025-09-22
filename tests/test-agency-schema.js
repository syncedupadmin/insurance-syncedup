import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAgencySchema() {
    try {
        console.log('Testing agency schema...');
        
        // First, let's see what's in the agencies table
        const { data: agencies, error: selectError } = await supabase
            .from('agencies')
            .select('*')
            .limit(1);

        if (selectError) {
            console.error('Error selecting from agencies:', selectError.message);
            return;
        }

        if (agencies && agencies.length > 0) {
            console.log('Sample agency record:');
            console.log(JSON.stringify(agencies[0], null, 2));
            
            console.log('\nAvailable columns:');
            console.log(Object.keys(agencies[0]));
        } else {
            console.log('No agencies found in database');
        }

        // Try to get table schema from information_schema
        const { data: columns, error: schemaError } = await supabase
            .rpc('get_table_schema', { table_name: 'agencies' });

        if (schemaError) {
            console.error('Could not get schema info:', schemaError.message);
        } else {
            console.log('\nTable schema from information_schema:');
            console.log(columns);
        }

    } catch (error) {
        console.error('Test error:', error);
    }
}

testAgencySchema();