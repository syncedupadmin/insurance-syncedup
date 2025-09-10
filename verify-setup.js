const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySetup() {
    console.log('=== VERIFYING DATABASE SETUP ===\n');
    
    const checks = {
        profiles: 0,
        agencies: 0,
        commission_records: 0,
        system_metrics: 0,
        portal_users: 0
    };
    
    // Check profiles
    try {
        const { count, error } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });
        
        if (!error) {
            checks.profiles = count || 0;
            console.log(`✅ Profiles table: ${count} records`);
            
            // Get role breakdown
            const { data: roles } = await supabase
                .from('profiles')
                .select('role');
            
            if (roles) {
                const roleCounts = {};
                roles.forEach(r => {
                    roleCounts[r.role] = (roleCounts[r.role] || 0) + 1;
                });
                console.log('   Roles:', JSON.stringify(roleCounts));
            }
        } else {
            console.log(`❌ Profiles table: ${error.message}`);
        }
    } catch (e) {
        console.log(`❌ Profiles error: ${e.message}`);
    }
    
    // Check agencies
    try {
        const { data: agencies, error } = await supabase
            .from('agencies')
            .select('name, monthly_fee, status');
        
        if (!error) {
            checks.agencies = agencies.length;
            console.log(`\n✅ Agencies table: ${agencies.length} records`);
            agencies.forEach(a => {
                console.log(`   - ${a.name}: $${a.monthly_fee}/mo (${a.status})`);
            });
        } else {
            console.log(`\n❌ Agencies table: ${error.message}`);
        }
    } catch (e) {
        console.log(`\n❌ Agencies error: ${e.message}`);
    }
    
    // Check commission_records
    try {
        const { count, error } = await supabase
            .from('commission_records')
            .select('*', { count: 'exact', head: true });
        
        if (!error) {
            checks.commission_records = count || 0;
            console.log(`\n✅ Commission records: ${count} records`);
        } else {
            console.log(`\n❌ Commission records: ${error.message}`);
        }
    } catch (e) {
        console.log(`\n❌ Commission records error: ${e.message}`);
    }
    
    // Check system_metrics
    try {
        const { data: metrics, error } = await supabase
            .from('system_metrics')
            .select('revenue_monthly, revenue_annual, total_users')
            .order('created_at', { ascending: false })
            .limit(1);
        
        if (!error && metrics.length > 0) {
            checks.system_metrics = 1;
            console.log(`\n✅ System metrics: Latest record`);
            console.log(`   - Monthly Revenue: $${metrics[0].revenue_monthly}`);
            console.log(`   - Annual Revenue: $${metrics[0].revenue_annual}`);
            console.log(`   - Total Users: ${metrics[0].total_users}`);
        } else {
            console.log(`\n❌ System metrics: ${error ? error.message : 'No data'}`);
        }
    } catch (e) {
        console.log(`\n❌ System metrics error: ${e.message}`);
    }
    
    // Summary
    console.log('\n========================================');
    console.log('SETUP VERIFICATION SUMMARY:');
    console.log('========================================');
    
    const allGood = Object.values(checks).every(v => v > 0);
    
    if (allGood) {
        console.log('✅ ALL TABLES CONFIGURED CORRECTLY!');
        console.log('\nYour super admin portal should work now!');
        console.log('URL: https://insurance-syncedup-jqa3lyj2u-nicks-projects-f40381ea.vercel.app/super-admin');
    } else {
        console.log('⚠️  Some tables need attention:');
        Object.entries(checks).forEach(([table, count]) => {
            if (count === 0) {
                console.log(`   - ${table}: No data found`);
            }
        });
        console.log('\nRun the SQL script in Supabase to complete setup.');
    }
    
    // Test API
    console.log('\n========================================');
    console.log('TESTING API ENDPOINT:');
    console.log('========================================');
    
    try {
        const response = await fetch('https://insurance-syncedup-jqa3lyj2u-nicks-projects-f40381ea.vercel.app/api/super-admin/metrics', {
            headers: {
                'Authorization': 'Bearer test'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ API Response OK');
            console.log('   Total Users:', data.totalUsers);
            console.log('   Revenue:', data.revenue?.monthly);
        } else {
            console.log('❌ API Response:', response.status, response.statusText);
        }
    } catch (e) {
        console.log('❌ API Error:', e.message);
    }
}

verifySetup();