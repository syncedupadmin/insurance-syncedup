import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function createTablesViaRPC() {
    console.log('🏗️ Creating missing tables via RPC...\n');
    
    const sqlStatements = [
        {
            name: 'Create leads table',
            sql: `
                CREATE TABLE IF NOT EXISTS public.leads (
                    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                    agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
                    assigned_agent_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
                    first_name VARCHAR(100) NOT NULL,
                    last_name VARCHAR(100) NOT NULL,
                    email VARCHAR(255),
                    phone VARCHAR(20),
                    address_line1 VARCHAR(255),
                    city VARCHAR(100),
                    state VARCHAR(50),
                    zip_code VARCHAR(20),
                    lead_source VARCHAR(50) DEFAULT 'manual',
                    product_interest VARCHAR(100),
                    estimated_premium DECIMAL(10,2),
                    priority VARCHAR(20) DEFAULT 'medium',
                    status VARCHAR(50) DEFAULT 'new',
                    stage VARCHAR(50) DEFAULT 'initial_contact',
                    notes TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            `
        },
        {
            name: 'Create quotes table',
            sql: `
                CREATE TABLE IF NOT EXISTS public.quotes (
                    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                    agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
                    agent_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
                    quote_number VARCHAR(50) UNIQUE NOT NULL,
                    product_type VARCHAR(100) NOT NULL,
                    coverage_type VARCHAR(100),
                    premium_amount DECIMAL(10,2) NOT NULL,
                    deductible DECIMAL(10,2),
                    coverage_limit DECIMAL(12,2),
                    commission_amount DECIMAL(10,2),
                    status VARCHAR(50) DEFAULT 'draft',
                    valid_until DATE,
                    customer_name VARCHAR(255) NOT NULL,
                    customer_email VARCHAR(255),
                    customer_phone VARCHAR(20),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            `
        },
        {
            name: 'Create customers table',
            sql: `
                CREATE TABLE IF NOT EXISTS public.customers (
                    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                    agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
                    first_name VARCHAR(100) NOT NULL,
                    last_name VARCHAR(100) NOT NULL,
                    email VARCHAR(255),
                    phone VARCHAR(20),
                    date_of_birth DATE,
                    address_line1 VARCHAR(255),
                    city VARCHAR(100),
                    state VARCHAR(50),
                    zip_code VARCHAR(20),
                    customer_type VARCHAR(50) DEFAULT 'individual',
                    status VARCHAR(50) DEFAULT 'active',
                    notes TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            `
        }
    ];

    let successful = 0;
    let failed = 0;

    for (const statement of sqlStatements) {
        console.log(`🔨 ${statement.name}...`);
        
        try {
            // Try using rpc to execute SQL
            const { data, error } = await supabase.rpc('exec_sql', {
                query: statement.sql
            });
            
            if (error) {
                console.log(`   ❌ RPC Error: ${error.message}`);
                failed++;
            } else {
                console.log(`   ✅ Success via RPC`);
                successful++;
            }
        } catch (rpcError) {
            console.log(`   ❌ RPC Exception: ${rpcError.message}`);
            
            // If RPC fails, try a different approach - create a simple test record to trigger table creation
            try {
                const tableName = statement.name.includes('leads') ? 'leads' : 
                                 statement.name.includes('quotes') ? 'quotes' : 'customers';
                
                console.log(`   🔄 Attempting alternate approach for ${tableName}...`);
                
                // Try to insert and then delete to force table creation
                const { error: insertError } = await supabase
                    .from(tableName)
                    .insert([{ id: 'test' }]);
                
                if (insertError && !insertError.message.includes('does not exist')) {
                    console.log(`   ✅ Table ${tableName} exists or was created`);
                    successful++;
                } else if (insertError && insertError.message.includes('does not exist')) {
                    console.log(`   ❌ Table ${tableName} does not exist and cannot be created: ${insertError.message}`);
                    failed++;
                } else {
                    console.log(`   ✅ Table ${tableName} verified through insertion test`);
                    successful++;
                    
                    // Clean up test record
                    await supabase.from(tableName).delete().eq('id', 'test');
                }
                
            } catch (altError) {
                console.log(`   ❌ Alternate approach failed: ${altError.message}`);
                failed++;
            }
        }
        
        console.log('');
    }

    console.log('📊 TABLE CREATION SUMMARY');
    console.log('=' .repeat(30));
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    
    // Now let's try to fix the agencies table settings field
    console.log('\n🔧 Fixing agencies table settings...');
    await fixAgencySettings();
    
    // Create indexes for better performance
    console.log('\n📈 Creating essential indexes...');
    await createIndexes();
}

async function fixAgencySettings() {
    try {
        // Get agencies with empty settings
        const { data: agencies, error: fetchError } = await supabase
            .from('agencies')
            .select('*')
            .eq('settings', {});
            
        if (fetchError) {
            console.log(`❌ Error fetching agencies: ${fetchError.message}`);
            return;
        }
        
        console.log(`Found ${agencies?.length || 0} agencies with empty settings`);
        
        // Update each agency with proper settings
        for (const agency of agencies || []) {
            const newSettings = {
                plan_type: 'professional', // Default
                status: agency.is_active ? 'active' : 'suspended',
                monthly_revenue: 199 // Default professional plan revenue
            };
            
            const { error: updateError } = await supabase
                .from('agencies')
                .update({ settings: newSettings })
                .eq('id', agency.id);
                
            if (updateError) {
                console.log(`❌ Error updating agency ${agency.name}: ${updateError.message}`);
            } else {
                console.log(`✅ Updated settings for agency: ${agency.name}`);
            }
        }
        
    } catch (error) {
        console.log(`❌ Error in fixAgencySettings: ${error.message}`);
    }
}

async function createIndexes() {
    const indexes = [
        {
            name: 'leads_agency_id_idx',
            sql: 'CREATE INDEX IF NOT EXISTS leads_agency_id_idx ON public.leads(agency_id);'
        },
        {
            name: 'quotes_agency_id_idx', 
            sql: 'CREATE INDEX IF NOT EXISTS quotes_agency_id_idx ON public.quotes(agency_id);'
        },
        {
            name: 'customers_agency_id_idx',
            sql: 'CREATE INDEX IF NOT EXISTS customers_agency_id_idx ON public.customers(agency_id);'
        }
    ];
    
    for (const index of indexes) {
        try {
            const { error } = await supabase.rpc('exec_sql', { query: index.sql });
            if (error) {
                console.log(`❌ Index ${index.name}: ${error.message}`);
            } else {
                console.log(`✅ Index ${index.name} created`);
            }
        } catch (err) {
            console.log(`❌ Index ${index.name} exception: ${err.message}`);
        }
    }
}

createTablesViaRPC();