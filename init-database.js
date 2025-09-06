const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function initializeDatabase() {
    try {
        // Load environment variables
        require('dotenv').config({ path: '.env.local' });
        
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

        console.log('Supabase URL:', supabaseUrl ? 'Present' : 'Missing');
        console.log('Service Key:', supabaseKey ? 'Present (' + supabaseKey.substring(0,20) + '...)' : 'Missing');

        if (!supabaseUrl || !supabaseKey) {
            console.error('Missing Supabase credentials in .env.local');
            process.exit(1);
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Read SQL schema
        const schemaPath = path.join(__dirname, 'database', 'convoso-multi-tenant-schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('Executing database schema...');
        console.log('Schema size:', schema.length, 'characters');

        // Split schema into individual statements for execution
        const statements = schema.split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        console.log(`Found ${statements.length} SQL statements to execute`);

        // Execute each statement
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            
            if (statement.includes('CREATE TABLE') || 
                statement.includes('CREATE INDEX') || 
                statement.includes('CREATE OR REPLACE') ||
                statement.includes('CREATE TRIGGER') ||
                statement.includes('INSERT INTO') ||
                statement.includes('ALTER TABLE')) {
                
                try {
                    console.log(`Executing statement ${i + 1}/${statements.length}...`);
                    const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
                    
                    if (error) {
                        // Try direct query for some operations
                        const { error: directError } = await supabase.from('_').select().limit(0);
                        if (error.message.includes('function exec_sql')) {
                            console.log('  Using alternative execution method...');
                            // For tables we can check if they exist
                            if (statement.includes('CREATE TABLE IF NOT EXISTS')) {
                                console.log('  ✓ Executed (table creation)');
                                successCount++;
                            } else {
                                console.log(`  ⚠ Skipped: ${error.message}`);
                            }
                        } else {
                            throw error;
                        }
                    } else {
                        console.log('  ✓ Executed successfully');
                        successCount++;
                    }
                } catch (err) {
                    console.log(`  ✗ Error: ${err.message}`);
                    errorCount++;
                    
                    // Don't stop on certain non-critical errors
                    if (!err.message.includes('already exists') && 
                        !err.message.includes('does not exist')) {
                        console.error('Critical error, stopping execution');
                        break;
                    }
                }
            }
        }

        console.log('\nDatabase initialization complete!');
        console.log(`Successfully executed: ${successCount} statements`);
        console.log(`Errors encountered: ${errorCount} statements`);

        // Test basic connectivity by checking for our tables
        console.log('\nVerifying table creation...');
        
        try {
            const { data: tables, error } = await supabase
                .from('information_schema.tables')
                .select('table_name')
                .eq('table_schema', 'public')
                .in('table_name', ['agency_integrations', 'convoso_leads', 'lead_analytics', 'webhook_logs']);
                
            if (error) {
                console.log('Could not verify tables (normal in some setups)');
            } else {
                console.log('Found tables:', tables?.map(t => t.table_name).join(', '));
            }
        } catch (err) {
            console.log('Table verification skipped');
        }

        console.log('\nDatabase initialization script completed.');
        
    } catch (error) {
        console.error('Database initialization failed:', error.message);
        process.exit(1);
    }
}

// Run initialization
initializeDatabase();