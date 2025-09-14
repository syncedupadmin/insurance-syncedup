const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixUserRoles() {
    console.log('\n=== Fixing PHSAgency User Roles ===\n');
    
    try {
        // Fix admin@phsagency.com
        const { data: admin, error: adminError } = await supabase
            .from('portal_users')
            .update({ role: 'admin' })
            .eq('email', 'admin@phsagency.com')
            .select();
        
        if (adminError) {
            console.error('Error updating admin@phsagency.com:', adminError);
        } else {
            console.log('✅ Updated admin@phsagency.com to role: admin');
        }
        
        // Fix manager@phsagency.com
        const { data: manager, error: managerError } = await supabase
            .from('portal_users')
            .update({ role: 'manager' })
            .eq('email', 'manager@phsagency.com')
            .select();
        
        if (managerError) {
            console.error('Error updating manager@phsagency.com:', managerError);
        } else {
            console.log('✅ Updated manager@phsagency.com to role: manager');
        }
        
        // Verify all PHSAgency users
        const { data: users, error: verifyError } = await supabase
            .from('portal_users')
            .select('email, role, name')
            .like('email', '%phsagency%')
            .order('email');
        
        if (verifyError) {
            console.error('Error verifying users:', verifyError);
        } else {
            console.log('\n=== Updated PHSAgency Users ===');
            users.forEach(user => {
                console.log(`${user.email}: ${user.role} - ${user.name}`);
            });
        }
        
    } catch (error) {
        console.error('Unexpected error:', error);
    }
}

fixUserRoles();