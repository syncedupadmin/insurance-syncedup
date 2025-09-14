import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function executeSchemaUpdates() {
    console.log('🚀 Starting database schema updates...\n');
    
    try {
        // Read the SQL file
        const sqlContent = readFileSync('./database-schema-updates.sql', 'utf8');
        
        // Split into individual statements (rough split for logging)
        const statements = sqlContent.split(';').filter(stmt => stmt.trim().length > 0);
        
        console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
        
        // Execute each statement individually to catch specific errors
        let successful = 0;
        let failed = 0;
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i].trim();
            if (!statement || statement.startsWith('--') || statement.length < 10) {
                continue; // Skip comments and very short statements
            }
            
            try {
                console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
                
                const { data, error } = await supabase.rpc('exec_sql', {
                    sql: statement + ';'
                });
                
                if (error) {
                    console.log(`   ❌ Error: ${error.message}`);
                    failed++;
                } else {
                    console.log(`   ✅ Success`);
                    successful++;
                }
                
            } catch (stmtError) {
                console.log(`   ❌ Statement error: ${stmtError.message}`);
                failed++;
            }
        }
        
        console.log('\n📊 EXECUTION SUMMARY');
        console.log('=' .repeat(30));
        console.log(`✅ Successful: ${successful}`);
        console.log(`❌ Failed: ${failed}`);
        
        // Let's try a different approach - execute the entire SQL as one block
        console.log('\n🔄 Attempting to execute full SQL script...');
        
        const { data: fullResult, error: fullError } = await supabase.rpc('exec_sql', {
            sql: sqlContent
        });
        
        if (fullError) {
            console.log('❌ Full script execution failed:', fullError.message);
            
            // Try direct query execution instead
            console.log('\n🔄 Trying direct query execution...');
            const { error: directError } = await supabase.sql(sqlContent);
            
            if (directError) {
                console.log('❌ Direct execution also failed:', directError.message);
            } else {
                console.log('✅ Direct execution successful!');
            }
        } else {
            console.log('✅ Full script execution successful!');
        }
        
    } catch (error) {
        console.error('❌ Schema update error:', error);
    }
}

executeSchemaUpdates();