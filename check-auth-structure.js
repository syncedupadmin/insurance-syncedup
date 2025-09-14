const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAuthStructure() {
    console.log('=== Checking Auth Users Structure ===\n');
    
    try {
        // Get auth users using admin API
        const { data: authData, error } = await supabase.auth.admin.listUsers();
        
        if (error) {
            console.error('Error:', error);
            return;
        }
        
        console.log(`Found ${authData.users.length} auth users\n`);
        
        // Show detailed structure of first user
        if (authData.users.length > 0) {
            const user = authData.users[0];
            console.log('First user structure:');
            console.log('ID:', user.id);
            console.log('Email:', user.email);
            console.log('Created:', user.created_at);
            console.log('\nAll available fields:');
            console.log(JSON.stringify(user, null, 2));
        }
        
        console.log('\n=== All Users Summary ===\n');
        authData.users.forEach(user => {
            console.log(`User: ${user.email}`);
            console.log(`  ID: ${user.id}`);
            console.log(`  Metadata:`, user.user_metadata || 'none');
            console.log('');
        });
        
    } catch (error) {
        console.error('Error:', error);
    }
}

// Also try a direct SQL query to see auth.users columns
async function checkAuthSQL() {
    console.log('\n=== Trying SQL Query on auth.users ===\n');
    
    try {
        // Try to query auth.users directly
        const { data, error } = await supabase.rpc('get_auth_users', {});
        
        if (error) {
            console.log('Cannot query auth.users directly (expected)');
            console.log('Error:', error.message);
        } else {
            console.log('Data:', data);
        }
    } catch (e) {
        console.log('Direct query not allowed (this is normal)');
    }
}

async function main() {
    await checkAuthStructure();
    await checkAuthSQL();
}

main();