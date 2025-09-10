const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPortalUsers() {
    try {
        console.log('\n=== Checking Portal Users ===\n');
        
        const { data: portalUsers, error: portalError } = await supabase
            .from('portal_users')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (portalError) {
            console.error('Error fetching portal_users:', portalError);
        } else {
            console.log(`Found ${portalUsers.length} portal users:`);
            portalUsers.forEach(user => {
                console.log(`- ${user.email} (${user.role}) - ${user.name}`);
            });
        }
        
        console.log('\n=== Checking Profiles ===\n');
        
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('*');
        
        if (profileError) {
            console.error('Error fetching profiles:', profileError);
        } else {
            console.log(`Found ${profiles.length} profiles`);
            if (profiles.length > 0) {
                profiles.forEach(profile => {
                    console.log(`- ${profile.email} (${profile.role})`);
                });
            }
        }
        
        console.log('\n=== Checking Auth Users ===\n');
        
        // This requires service role key
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
        
        if (authError) {
            console.error('Error fetching auth users:', authError);
        } else {
            console.log(`Found ${authData.users.length} auth users:`);
            authData.users.forEach(user => {
                console.log(`- ${user.email} (ID: ${user.id})`);
            });
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

checkPortalUsers();