import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inventoryDatabase() {
    console.log('🔍 Taking inventory of Supabase database...\n');
    
    // Tables we know about from the codebase
    const knownTables = [
        'agencies',
        'users',
        'leads',
        'portal_sales',
        'commissions',
        'quotes',
        'customers',
        'performance_metrics',
        'user_sessions',
        'audit_logs',
        'team_performance',
        'agent_performance'
    ];

    const databaseInventory = {
        timestamp: new Date().toISOString(),
        tables: {}
    };

    console.log(`📋 Checking ${knownTables.length} known tables...\n`);

    for (const tableName of knownTables) {
        console.log(`🔹 Analyzing: ${tableName}`);
        
        try {
            // Try to get sample data
            const { data: sampleData, error: sampleError } = await supabase
                .from(tableName)
                .select('*')
                .limit(3);

            if (sampleError) {
                console.log(`   ❌ Table doesn't exist or no access: ${sampleError.message}`);
                databaseInventory.tables[tableName] = {
                    exists: false,
                    error: sampleError.message
                };
                continue;
            }

            // Get count
            const { count, error: countError } = await supabase
                .from(tableName)
                .select('*', { count: 'exact', head: true });

            const tableInfo = {
                exists: true,
                recordCount: countError ? 'unknown' : count,
                columns: sampleData && sampleData.length > 0 ? Object.keys(sampleData[0]) : [],
                sampleData: sampleData && sampleData.length > 0 ? sampleData[0] : null,
                allSamples: sampleData || []
            };

            databaseInventory.tables[tableName] = tableInfo;

            console.log(`   ✅ Records: ${tableInfo.recordCount}`);
            console.log(`   📊 Columns (${tableInfo.columns.length}): ${tableInfo.columns.join(', ')}`);
            
            if (sampleData && sampleData.length > 0) {
                console.log(`   🎯 Sample data structure:`, Object.keys(sampleData[0]));
            }

        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            databaseInventory.tables[tableName] = {
                exists: false,
                error: error.message
            };
        }
        
        console.log(''); // Empty line
    }

    // Summary
    const existingTables = Object.entries(databaseInventory.tables)
        .filter(([_, info]) => info.exists)
        .map(([name, _]) => name);
    
    const missingTables = Object.entries(databaseInventory.tables)
        .filter(([_, info]) => !info.exists)
        .map(([name, _]) => name);

    console.log('\n📋 DATABASE INVENTORY SUMMARY');
    console.log('=' .repeat(50));
    console.log(`✅ Existing tables (${existingTables.length}):`, existingTables.join(', '));
    console.log(`❌ Missing tables (${missingTables.length}):`, missingTables.join(', '));
    
    console.log('\n📄 DETAILED ANALYSIS:');
    console.log(JSON.stringify(databaseInventory, null, 2));

    return databaseInventory;
}

inventoryDatabase();