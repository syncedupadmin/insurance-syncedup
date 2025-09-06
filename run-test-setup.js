import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function runTestSetup() {
    console.log('🚀 Starting complete test environment setup...\n');
    
    try {
        // Read the SQL file
        const sqlFile = path.join(__dirname, 'setup-complete-test-environment.sql');
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');
        
        // Split into individual statements (basic split on semicolon)
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        console.log(`📝 Found ${statements.length} SQL statements to execute...\n`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            
            // Skip comments and empty statements
            if (statement.startsWith('--') || statement.trim().length < 10) {
                continue;
            }
            
            try {
                console.log(`⚙️  Executing statement ${i + 1}/${statements.length}...`);
                
                // Execute the SQL statement using the RPC function
                const { data, error } = await supabase.rpc('exec_sql', { 
                    sql_query: statement 
                });
                
                if (error) {
                    // Try direct query if RPC fails
                    const { data: queryData, error: queryError } = await supabase
                        .from('dummy') // This will fail but might give us better error info
                        .select('*')
                        .limit(0);
                    
                    console.log(`   ⚠️  Warning: ${error.message}`);
                    errorCount++;
                } else {
                    console.log(`   ✅ Success`);
                    successCount++;
                }
                
            } catch (execError) {
                console.log(`   ❌ Error: ${execError.message}`);
                errorCount++;
            }
        }
        
        console.log('\n' + '='.repeat(50));
        console.log('📊 SETUP SUMMARY');
        console.log('='.repeat(50));
        console.log(`✅ Successful operations: ${successCount}`);
        console.log(`❌ Failed operations: ${errorCount}`);
        
        // Verify the setup by checking key tables
        console.log('\n🔍 Verifying test environment...\n');
        
        const verificationQueries = [
            { name: 'Test Agency', table: 'agencies', filter: { id: 'TEST-001' } },
            { name: 'Test Users', table: 'portal_users', filter: {} },
            { name: 'Test Products', table: 'products', filter: {} },
            { name: 'Test Sales', table: 'portal_sales', filter: { agency_id: 'TEST-001' } },
            { name: 'Test Commissions', table: 'portal_commissions', filter: { agency_id: 'TEST-001' } },
            { name: 'Test Leads', table: 'leads', filter: { agency_id: 'TEST-001' } },
            { name: 'Test Customers', table: 'customers', filter: { agency_id: 'TEST-001' } },
            { name: 'Test Goals', table: 'portal_goals', filter: { agency_id: 'TEST-001' } }
        ];
        
        for (const query of verificationQueries) {
            try {
                const { data, error, count } = await supabase
                    .from(query.table)
                    .select('*', { count: 'exact' })
                    .match(query.filter)
                    .limit(1);
                
                if (error) {
                    console.log(`❌ ${query.name}: Table might not exist - ${error.message}`);
                } else {
                    console.log(`✅ ${query.name}: ${count} records found`);
                    
                    // Show sample data for key tables
                    if (data && data.length > 0 && ['agencies', 'portal_users'].includes(query.table)) {
                        const sample = data[0];
                        const keys = Object.keys(sample).slice(0, 3);
                        const sampleData = keys.map(key => `${key}: ${sample[key]}`).join(', ');
                        console.log(`   📄 Sample: ${sampleData}`);
                    }
                }
            } catch (verifyError) {
                console.log(`❌ ${query.name}: Verification failed - ${verifyError.message}`);
            }
        }
        
        // Test login credentials
        console.log('\n🔐 Test Credentials Created:');
        console.log('='.repeat(30));
        console.log('test-admin@test.com     (Admin)');
        console.log('test-manager@test.com   (Manager)');
        console.log('test-agent@test.com     (Agent)');
        console.log('test-cs@test.com        (Customer Service)');
        console.log('test-super@test.com     (Super Admin)');
        console.log('\nPassword for all: TestPass123!');
        
        console.log('\n🎉 Test environment setup complete!');
        console.log('\nNext steps:');
        console.log('1. Update login page with test account dropdown');
        console.log('2. Test each role by logging in');
        console.log('3. Verify API endpoints work with the new data');
        
    } catch (error) {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTestSetup();
}

export default runTestSetup;