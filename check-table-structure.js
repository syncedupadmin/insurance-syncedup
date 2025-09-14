const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableStructure() {
    console.log('=== Checking Table Structures ===\n');
    
    // Check portal_users structure
    try {
        const { data: portalUser, error } = await supabase
            .from('portal_users')
            .select('*')
            .limit(1);
        
        if (!error && portalUser && portalUser.length > 0) {
            console.log('portal_users columns:');
            console.log(Object.keys(portalUser[0]));
            console.log('\nSample data:');
            console.log(portalUser[0]);
        }
    } catch (e) {
        console.error('Error checking portal_users:', e.message);
    }
    
    console.log('\n-------------------\n');
    
    // Check auth.users structure
    try {
        const { data: authData, error } = await supabase.auth.admin.listUsers({
            page: 1,
            perPage: 1
        });
        
        if (!error && authData && authData.users.length > 0) {
            console.log('auth.users structure:');
            const user = authData.users[0];
            console.log('Main fields:', Object.keys(user));
            console.log('User metadata:', user.user_metadata);
            console.log('App metadata:', user.app_metadata);
        }
    } catch (e) {
        console.error('Error checking auth.users:', e.message);
    }
    
    console.log('\n-------------------\n');
    
    // Check other tables
    const tables = ['agencies', 'customers', 'quotes', 'claims', 'system_metrics'];
    
    for (const table of tables) {
        try {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .limit(1);
            
            if (!error) {
                console.log(`${table} columns:`);
                if (data && data.length > 0) {
                    console.log(Object.keys(data[0]));
                } else {
                    console.log('Table exists but is empty');
                }
            }
        } catch (e) {
            console.error(`Error checking ${table}:`, e.message);
        }
        console.log('');
    }
}

checkTableStructure();