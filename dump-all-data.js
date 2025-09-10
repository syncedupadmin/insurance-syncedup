const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function dumpAllData() {
    console.log('=== COMPLETE DATABASE DUMP ===\n');
    
    const tables = [
        'profiles',
        'portal_users',
        'agencies',
        'customers',
        'quotes',
        'policies',
        'claims',
        'payments',
        'commission_records',
        'commissions',
        'system_metrics',
        'activities',
        'notifications',
        'messages',
        'audit_logs'
    ];
    
    for (const table of tables) {
        console.log(`\n========== ${table.toUpperCase()} ==========`);
        
        try {
            const { data, error, count } = await supabase
                .from(table)
                .select('*', { count: 'exact' });
            
            if (error) {
                console.log(`ERROR: ${error.message}`);
            } else {
                console.log(`Count: ${data?.length || 0} records`);
                
                if (data && data.length > 0) {
                    // Show first record structure
                    console.log('\nColumns:', Object.keys(data[0]).join(', '));
                    
                    // Show all data for small tables
                    if (data.length <= 10) {
                        console.log('\nData:');
                        data.forEach((row, i) => {
                            console.log(`Record ${i + 1}:`, JSON.stringify(row, null, 2));
                        });
                    } else {
                        // Show sample for large tables
                        console.log('\nFirst 3 records:');
                        data.slice(0, 3).forEach((row, i) => {
                            console.log(`Record ${i + 1}:`, JSON.stringify(row, null, 2));
                        });
                    }
                } else {
                    console.log('Table exists but is empty');
                }
            }
        } catch (e) {
            console.log(`EXCEPTION: ${e.message}`);
        }
    }
    
    // Check auth.users separately
    console.log('\n========== AUTH.USERS ==========');
    try {
        const { data: authData, error } = await supabase.auth.admin.listUsers();
        
        if (error) {
            console.log(`ERROR: ${error.message}`);
        } else {
            console.log(`Count: ${authData.users.length} users`);
            authData.users.forEach((user, i) => {
                console.log(`\nUser ${i + 1}:`);
                console.log('  ID:', user.id);
                console.log('  Email:', user.email);
                console.log('  Created:', user.created_at);
                console.log('  Metadata:', user.user_metadata);
            });
        }
    } catch (e) {
        console.log(`EXCEPTION: ${e.message}`);
    }
    
    console.log('\n=== END OF DUMP ===');
}

dumpAllData();