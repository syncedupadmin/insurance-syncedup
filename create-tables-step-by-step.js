import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTablesStepByStep() {
    console.log('🏗️ Creating missing tables step by step...\n');
    
    const tables = [
        {
            name: 'leads',
            sql: `
                CREATE TABLE IF NOT EXISTS public.leads (
                    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                    agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
                    assigned_agent_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
                    
                    first_name VARCHAR(100) NOT NULL,
                    last_name VARCHAR(100) NOT NULL,
                    email VARCHAR(255),
                    phone VARCHAR(20),
                    date_of_birth DATE,
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
                    last_contacted_at TIMESTAMP WITH TIME ZONE,
                    next_follow_up TIMESTAMP WITH TIME ZONE,
                    
                    notes TEXT,
                    tags JSONB DEFAULT '[]',
                    custom_fields JSONB DEFAULT '{}',
                    
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    created_by UUID REFERENCES public.users(id)
                );
            `
        },
        {
            name: 'quotes',
            sql: `
                CREATE TABLE IF NOT EXISTS public.quotes (
                    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                    agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
                    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
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
                    
                    quote_details JSONB DEFAULT '{}',
                    terms_and_conditions TEXT,
                    
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            `
        },
        {
            name: 'customers',
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
                    preferred_contact_method VARCHAR(50) DEFAULT 'email',
                    
                    business_name VARCHAR(255),
                    business_type VARCHAR(100),
                    
                    notes TEXT,
                    tags JSONB DEFAULT '[]',
                    custom_fields JSONB DEFAULT '{}',
                    
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    created_by UUID REFERENCES public.users(id)
                );
            `
        },
        {
            name: 'user_sessions',
            sql: `
                CREATE TABLE IF NOT EXISTS public.user_sessions (
                    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
                    
                    session_token VARCHAR(255) UNIQUE NOT NULL,
                    refresh_token VARCHAR(255) UNIQUE,
                    
                    ip_address INET,
                    user_agent TEXT,
                    device_type VARCHAR(50),
                    
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    
                    is_active BOOLEAN DEFAULT true
                );
            `
        }
    ];
    
    let created = 0;
    let errors = 0;
    
    for (const table of tables) {
        console.log(`🔨 Creating table: ${table.name}`);
        
        try {
            const { error } = await supabase.sql(table.sql);
            
            if (error) {
                console.log(`   ❌ Error: ${error.message}`);
                errors++;
            } else {
                console.log(`   ✅ Created successfully`);
                created++;
                
                // Verify table was created
                const { data: verification, error: verifyError } = await supabase
                    .from(table.name)
                    .select('*')
                    .limit(0);
                
                if (verifyError) {
                    console.log(`   ⚠️ Table created but verification failed: ${verifyError.message}`);
                } else {
                    console.log(`   ✅ Table verified and accessible`);
                }
            }
        } catch (tableError) {
            console.log(`   ❌ Exception: ${tableError.message}`);
            errors++;
        }
        
        console.log(''); // Empty line
    }
    
    console.log('📊 TABLE CREATION SUMMARY');
    console.log('=' .repeat(30));
    console.log(`✅ Created: ${created}`);
    console.log(`❌ Errors: ${errors}`);
    
    // Now let's update the empty tables (portal_sales, commissions)
    console.log('\n🔧 Updating existing empty tables...');
    
    await updatePortalSalesStructure();
    await updateCommissionsStructure();
    
    console.log('\n🎉 Database schema updates completed!');
}

async function updatePortalSalesStructure() {
    console.log('📊 Updating portal_sales table structure...');
    
    const columns = [
        'id UUID DEFAULT gen_random_uuid() PRIMARY KEY',
        'agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE',
        'agent_id UUID REFERENCES public.users(id) ON DELETE CASCADE', 
        'customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE',
        'quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL',
        
        'sale_number VARCHAR(50) UNIQUE NOT NULL',
        'product_type VARCHAR(100) NOT NULL',
        'policy_number VARCHAR(100)',
        
        'premium_amount DECIMAL(10,2) NOT NULL',
        'commission_amount DECIMAL(10,2)',
        'commission_rate DECIMAL(5,4)',
        
        'status VARCHAR(50) DEFAULT \'pending\'',
        'sale_date DATE NOT NULL',
        'policy_effective_date DATE',
        'policy_expiration_date DATE',
        
        'customer_name VARCHAR(255) NOT NULL',
        'customer_email VARCHAR(255)',
        
        'sale_details JSONB DEFAULT \'{}\'',
        'notes TEXT',
        
        'created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP',
        'updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP'
    ];
    
    for (const column of columns) {
        try {
            const columnName = column.split(' ')[0];
            const { error } = await supabase.sql(`
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                                   WHERE table_name = 'portal_sales' AND column_name = '${columnName}') THEN
                        ALTER TABLE public.portal_sales ADD COLUMN ${column};
                    END IF;
                END $$;
            `);
            
            if (error) {
                console.log(`   ❌ Error adding ${columnName}: ${error.message}`);
            } else {
                console.log(`   ✅ Column ${columnName} added/verified`);
            }
        } catch (err) {
            console.log(`   ❌ Exception for ${column}: ${err.message}`);
        }
    }
}

async function updateCommissionsStructure() {
    console.log('💰 Updating commissions table structure...');
    
    const columns = [
        'id UUID DEFAULT gen_random_uuid() PRIMARY KEY',
        'agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE',
        'agent_id UUID REFERENCES public.users(id) ON DELETE CASCADE',
        'sale_id UUID REFERENCES public.portal_sales(id) ON DELETE CASCADE',
        
        'commission_type VARCHAR(50) DEFAULT \'sale_commission\'',
        'base_amount DECIMAL(10,2) NOT NULL',
        'commission_rate DECIMAL(5,4) NOT NULL', 
        'commission_amount DECIMAL(10,2) NOT NULL',
        
        'status VARCHAR(50) DEFAULT \'pending\'',
        'payment_period VARCHAR(50)',
        'payment_date DATE',
        'paid_amount DECIMAL(10,2) DEFAULT 0',
        
        'policy_number VARCHAR(100)',
        'customer_name VARCHAR(255)',
        
        'calculation_details JSONB DEFAULT \'{}\'',
        'notes TEXT',
        
        'created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP',
        'updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP'
    ];
    
    for (const column of columns) {
        try {
            const columnName = column.split(' ')[0];
            const { error } = await supabase.sql(`
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                                   WHERE table_name = 'commissions' AND column_name = '${columnName}') THEN
                        ALTER TABLE public.commissions ADD COLUMN ${column};
                    END IF;
                END $$;
            `);
            
            if (error) {
                console.log(`   ❌ Error adding ${columnName}: ${error.message}`);
            } else {
                console.log(`   ✅ Column ${columnName} added/verified`);
            }
        } catch (err) {
            console.log(`   ❌ Exception for ${column}: ${err.message}`);
        }
    }
}

createTablesStepByStep();