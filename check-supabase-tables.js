const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Connecting to Supabase...');
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    try {
        // Query to get all tables in the public schema
        const { data, error } = await supabase
            .rpc('get_tables', {}, { 
                get: true,
                head: false 
            })
            .select('*');

        if (error) {
            // Try alternative method - query information_schema
            console.log('Trying alternative method to fetch tables...');
            
            const { data: tables, error: tablesError } = await supabase
                .from('information_schema.tables')
                .select('table_name')
                .eq('table_schema', 'public');
            
            if (tablesError) {
                // Try yet another method - check specific tables
                console.log('Checking for specific tables...');
                
                const tablesToCheck = [
                    'profiles',
                    'portal_users', 
                    'customers',
                    'quotes',
                    'claims',
                    'payments',
                    'commissions',
                    'commission_records',
                    'activities',
                    'notifications',
                    'messages',
                    'agencies',
                    'policies',
                    'system_metrics',
                    'audit_logs'
                ];
                
                console.log('\n=== Checking Table Existence ===\n');
                
                for (const table of tablesToCheck) {
                    try {
                        const { count, error } = await supabase
                            .from(table)
                            .select('*', { count: 'exact', head: true });
                        
                        if (!error) {
                            console.log(`✅ ${table}: EXISTS (${count || 0} rows)`);
                        } else {
                            console.log(`❌ ${table}: NOT FOUND`);
                        }
                    } catch (e) {
                        console.log(`❌ ${table}: ERROR - ${e.message}`);
                    }
                }
            } else {
                console.log('Tables in database:', tables);
            }
        } else {
            console.log('Tables found:', data);
        }

        // Check for auth.users table
        console.log('\n=== Checking Auth Schema ===\n');
        try {
            const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
            if (!authError) {
                console.log(`✅ auth.users: EXISTS (${authUsers.users.length} users)`);
            } else {
                console.log(`❌ auth.users: ${authError.message}`);
            }
        } catch (e) {
            console.log(`⚠️  auth.users: Requires admin privileges`);
        }

    } catch (error) {
        console.error('Error checking tables:', error);
    }
}

checkTables();