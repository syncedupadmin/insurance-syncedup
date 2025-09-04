import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function analyzeDatabase() {
    console.log('🔍 Starting comprehensive database analysis...\n');
    
    try {
        // Get all tables in the public schema
        const { data: tables, error: tablesError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
            .eq('table_type', 'BASE TABLE');

        if (tablesError) {
            console.error('Error fetching tables:', tablesError);
            return;
        }

        console.log(`📊 Found ${tables.length} tables in database:\n`);
        
        const databaseSchema = {};
        
        for (const table of tables) {
            const tableName = table.table_name;
            console.log(`🔹 Analyzing table: ${tableName}`);
            
            try {
                // Get sample data to understand structure
                const { data: sampleData, error: sampleError } = await supabase
                    .from(tableName)
                    .select('*')
                    .limit(1);

                if (sampleError) {
                    console.log(`   ❌ Error accessing ${tableName}:`, sampleError.message);
                    databaseSchema[tableName] = { error: sampleError.message };
                    continue;
                }

                // Get column information
                const { data: columns, error: columnsError } = await supabase
                    .from('information_schema.columns')
                    .select('column_name, data_type, is_nullable, column_default')
                    .eq('table_schema', 'public')
                    .eq('table_name', tableName)
                    .order('ordinal_position');

                if (columnsError) {
                    console.log(`   ❌ Error getting columns for ${tableName}:`, columnsError.message);
                }

                const tableInfo = {
                    columns: columns || [],
                    sampleData: sampleData && sampleData.length > 0 ? sampleData[0] : null,
                    recordCount: sampleData ? sampleData.length : 0
                };

                databaseSchema[tableName] = tableInfo;

                console.log(`   ✅ Columns (${columns?.length || 0}):`, 
                    columns?.map(c => `${c.column_name} (${c.data_type})`).join(', ') || 'Unable to fetch');
                
                if (sampleData && sampleData.length > 0) {
                    console.log(`   📄 Sample record keys:`, Object.keys(sampleData[0]));
                } else {
                    console.log(`   📄 No sample data available`);
                }

            } catch (tableError) {
                console.log(`   ❌ Error analyzing ${tableName}:`, tableError.message);
                databaseSchema[tableName] = { error: tableError.message };
            }
            
            console.log(''); // Empty line for readability
        }

        // Save full analysis to file
        console.log('💾 Saving complete database analysis...');
        
        const analysisReport = {
            timestamp: new Date().toISOString(),
            tablesCount: tables.length,
            schema: databaseSchema
        };

        // We'll need to save this analysis somehow - let's log it for now
        console.log('\n📋 DATABASE ANALYSIS COMPLETE');
        console.log('=' .repeat(50));
        console.log(JSON.stringify(analysisReport, null, 2));

    } catch (error) {
        console.error('❌ Database analysis error:', error);
    }
}

analyzeDatabase();