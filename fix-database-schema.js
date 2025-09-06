const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function fixDatabaseSchema() {
    console.log('🔧 Starting database schema fix...');
    
    try {
        // First, let's see what the current agencies table looks like
        console.log('📋 Checking current agencies table structure...');
        
        const { data: agencies, error: agenciesError } = await supabase
            .from('agencies')
            .select('*')
            .limit(1);
            
        if (agenciesError) {
            console.log('❌ Error checking agencies table:', agenciesError.message);
        } else {
            console.log('✅ Current agencies table sample:', agencies[0] ? Object.keys(agencies[0]) : 'No data');
        }

        // Apply the schema fixes using RPC calls
        console.log('🛠️ Applying schema fixes...');
        
        // Add missing columns to agencies table
        const schemaUpdates = [
            // Add agency_id column if it doesn't exist
            `ALTER TABLE agencies ADD COLUMN IF NOT EXISTS agency_id VARCHAR(50)`,
            `ALTER TABLE agencies ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255)`,
            `ALTER TABLE agencies ADD COLUMN IF NOT EXISTS plan_type VARCHAR(50) DEFAULT 'basic'`,
            `ALTER TABLE agencies ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'trial'`,
            `ALTER TABLE agencies ADD COLUMN IF NOT EXISTS monthly_revenue DECIMAL(10,2) DEFAULT 0`,
            `ALTER TABLE agencies ADD COLUMN IF NOT EXISTS user_count INTEGER DEFAULT 0`,
            `ALTER TABLE agencies ADD COLUMN IF NOT EXISTS performance_score DECIMAL(5,2) DEFAULT 75.0`,
            `ALTER TABLE agencies ADD COLUMN IF NOT EXISTS last_active VARCHAR(100) DEFAULT 'Just created'`,
            
            // Update existing agencies to have agency_id if missing
            `UPDATE agencies SET agency_id = CONCAT(UPPER(SUBSTRING(REPLACE(name, ' ', ''), 1, 6)), LPAD(EXTRACT(EPOCH FROM created_at)::INTEGER::TEXT, 6, '0')) WHERE agency_id IS NULL`,
            
            // Create unique constraint on agency_id
            `CREATE UNIQUE INDEX IF NOT EXISTS idx_agencies_agency_id_unique ON agencies(agency_id)`,
            
            // Add other indexes
            `CREATE INDEX IF NOT EXISTS idx_agencies_status ON agencies(status)`,
            `CREATE INDEX IF NOT EXISTS idx_agencies_plan_type ON agencies(plan_type)`
        ];
        
        for (const sql of schemaUpdates) {
            try {
                console.log(`Executing: ${sql.substring(0, 50)}...`);
                const { error } = await supabase.rpc('exec_sql', { sql });
                if (error) {
                    console.log(`⚠️ Warning for SQL command: ${error.message}`);
                } else {
                    console.log('✅ SQL executed successfully');
                }
            } catch (err) {
                console.log(`⚠️ Could not execute SQL: ${err.message}`);
                // Try alternative approach - direct table operations
                await tryDirectTableOperations();
            }
        }
        
        // Verify the changes
        console.log('🔍 Verifying schema changes...');
        const { data: updatedAgencies, error: verifyError } = await supabase
            .from('agencies')
            .select('*')
            .limit(1);
            
        if (!verifyError && updatedAgencies[0]) {
            console.log('✅ Updated agencies table columns:', Object.keys(updatedAgencies[0]));
        }
        
        console.log('🎉 Database schema fix completed!');
        
    } catch (error) {
        console.error('❌ Error fixing database schema:', error);
    }
}

async function tryDirectTableOperations() {
    console.log('🔄 Trying direct table operations...');
    
    // Try to update existing agencies to have the required fields
    try {
        const { data: agencies } = await supabase
            .from('agencies')
            .select('*');
            
        if (agencies && agencies.length > 0) {
            for (const agency of agencies) {
                const updates = {
                    updated_at: new Date().toISOString()
                };
                
                // Add agency_id if missing
                if (!agency.agency_id && !agency.code) {
                    updates.agency_id = agency.name
                        .replace(/[^a-zA-Z0-9\s]/g, '')
                        .replace(/\s+/g, '')
                        .substring(0, 10)
                        .toUpperCase() + Date.now().toString().slice(-3);
                }
                
                // Add contact_email if missing  
                if (!agency.contact_email && agency.admin_email) {
                    updates.contact_email = agency.admin_email;
                }
                
                // Add other missing fields
                if (agency.plan_type === undefined) updates.plan_type = 'basic';
                if (agency.status === undefined) updates.status = agency.is_active ? 'active' : 'trial';
                if (agency.monthly_revenue === undefined) updates.monthly_revenue = 0;
                if (agency.user_count === undefined) updates.user_count = 0;
                if (agency.performance_score === undefined) updates.performance_score = 75.0;
                if (agency.last_active === undefined) updates.last_active = 'Unknown';
                
                // Only update if we have changes
                if (Object.keys(updates).length > 1) {
                    const { error } = await supabase
                        .from('agencies')
                        .update(updates)
                        .eq('id', agency.id);
                        
                    if (!error) {
                        console.log(`✅ Updated agency: ${agency.name}`);
                    }
                }
            }
        }
    } catch (err) {
        console.log('⚠️ Direct operations error:', err.message);
    }
}

// Run the schema fix
if (require.main === module) {
    fixDatabaseSchema().then(() => {
        console.log('✅ Schema fix completed');
        process.exit(0);
    }).catch(err => {
        console.error('❌ Schema fix failed:', err);
        process.exit(1);
    });
}

module.exports = { fixDatabaseSchema };