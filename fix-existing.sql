-- Insurance.SyncedUp Database Fix Script
-- Repairs existing database to match complete schema requirements
-- 
-- This script adds missing tables and columns to existing databases
-- Run this AFTER checking what tables/columns already exist

-- ═══════════════════════════════════════════════════════════════
-- BACKUP EXISTING DATA FIRST
-- ═══════════════════════════════════════════════════════════════

-- Create backup tables for existing data
DO $$
BEGIN
    -- Backup existing users table if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        EXECUTE 'CREATE TABLE users_backup_' || to_char(now(), 'YYYYMMDD_HH24MI') || ' AS SELECT * FROM users';
        RAISE NOTICE 'Created backup of users table';
    END IF;
    
    -- Backup existing portal_users table if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'portal_users') THEN
        EXECUTE 'CREATE TABLE portal_users_backup_' || to_char(now(), 'YYYYMMDD_HH24MI') || ' AS SELECT * FROM portal_users';
        RAISE NOTICE 'Created backup of portal_users table';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- ADD MISSING CORE TABLES
-- ═══════════════════════════════════════════════════════════════

-- 1. Create agencies table if missing
CREATE TABLE IF NOT EXISTS agencies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    subscription_plan VARCHAR(50) DEFAULT 'starter',
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    website VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    stripe_customer_id VARCHAR(255),
    billing_status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add missing columns to portal_users
DO $$
BEGIN
    -- Add agency_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portal_users' AND column_name = 'agency_id') THEN
        ALTER TABLE portal_users ADD COLUMN agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added agency_id column to portal_users';
    END IF;
    
    -- Add first_name if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portal_users' AND column_name = 'first_name') THEN
        ALTER TABLE portal_users ADD COLUMN first_name VARCHAR(255);
        RAISE NOTICE 'Added first_name column to portal_users';
    END IF;
    
    -- Add last_name if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portal_users' AND column_name = 'last_name') THEN
        ALTER TABLE portal_users ADD COLUMN last_name VARCHAR(255);
        RAISE NOTICE 'Added last_name column to portal_users';
    END IF;
    
    -- Add is_active if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portal_users' AND column_name = 'is_active') THEN
        ALTER TABLE portal_users ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added is_active column to portal_users';
    END IF;
    
    -- Add phone if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portal_users' AND column_name = 'phone') THEN
        ALTER TABLE portal_users ADD COLUMN phone VARCHAR(50);
        RAISE NOTICE 'Added phone column to portal_users';
    END IF;
    
    -- Add department if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portal_users' AND column_name = 'department') THEN
        ALTER TABLE portal_users ADD COLUMN department TEXT;
        RAISE NOTICE 'Added department column to portal_users';
    END IF;
    
    -- Add permissions if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portal_users' AND column_name = 'permissions') THEN
        ALTER TABLE portal_users ADD COLUMN permissions JSONB DEFAULT '{}';
        RAISE NOTICE 'Added permissions column to portal_users';
    END IF;
    
    -- Add security columns if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portal_users' AND column_name = 'two_factor_enabled') THEN
        ALTER TABLE portal_users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added two_factor_enabled column to portal_users';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portal_users' AND column_name = 'login_attempts') THEN
        ALTER TABLE portal_users ADD COLUMN login_attempts INTEGER DEFAULT 0;
        RAISE NOTICE 'Added login_attempts column to portal_users';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portal_users' AND column_name = 'locked_until') THEN
        ALTER TABLE portal_users ADD COLUMN locked_until TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added locked_until column to portal_users';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding columns to portal_users: %', SQLERRM;
END $$;

-- 3. Fix audit_logs table structure
DO $$
BEGIN
    -- Add missing columns to audit_logs if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        
        -- Add admin_email if missing (for backward compatibility)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'admin_email') THEN
            ALTER TABLE audit_logs ADD COLUMN admin_email VARCHAR(255);
            RAISE NOTICE 'Added admin_email column to audit_logs';
        END IF;
        
        -- Add user_email if missing (for backward compatibility)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'user_email') THEN
            ALTER TABLE audit_logs ADD COLUMN user_email VARCHAR(255);
            RAISE NOTICE 'Added user_email column to audit_logs';
        END IF;
        
        -- Add details if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'details') THEN
            ALTER TABLE audit_logs ADD COLUMN details JSONB;
            RAISE NOTICE 'Added details column to audit_logs';
        END IF;
        
        -- Add portal if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'portal') THEN
            ALTER TABLE audit_logs ADD COLUMN portal VARCHAR(50);
            RAISE NOTICE 'Added portal column to audit_logs';
        END IF;
        
        -- Add metadata if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'metadata') THEN
            ALTER TABLE audit_logs ADD COLUMN metadata JSONB;
            RAISE NOTICE 'Added metadata column to audit_logs';
        END IF;
        
    ELSE
        -- Create audit_logs if it doesn't exist
        CREATE TABLE audit_logs (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID,
            agency_id UUID,
            admin_email VARCHAR(255),
            user_email VARCHAR(255),
            action VARCHAR(100) NOT NULL,
            resource_type VARCHAR(100),
            resource_id VARCHAR(255),
            details JSONB,
            portal VARCHAR(50),
            ip_address INET,
            user_agent TEXT,
            metadata JSONB,
            timestamp TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        RAISE NOTICE 'Created audit_logs table';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error fixing audit_logs table: %', SQLERRM;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- CREATE MISSING BUSINESS TABLES
-- ═══════════════════════════════════════════════════════════════

-- 4. Create portal_sales table if missing
CREATE TABLE IF NOT EXISTS portal_sales (
    id VARCHAR(50) PRIMARY KEY,
    agent_id UUID,
    agency_id UUID,
    product_id VARCHAR(100),
    quote_id VARCHAR(100),
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    customer_address TEXT,
    product_name VARCHAR(255),
    carrier VARCHAR(255),
    premium DECIMAL(12,2) NOT NULL,
    monthly_recurring DECIMAL(12,2),
    enrollment_fee DECIMAL(10,2) DEFAULT 0,
    first_month_total DECIMAL(12,2),
    commission_rate DECIMAL(5,2),
    commission_amount DECIMAL(10,2),
    policy_number VARCHAR(100),
    sale_date DATE NOT NULL,
    effective_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    payment_method VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create portal_commissions table if missing
CREATE TABLE IF NOT EXISTS portal_commissions (
    id VARCHAR(50) PRIMARY KEY,
    sale_id VARCHAR(50),
    agent_id UUID,
    agency_id UUID,
    product_name VARCHAR(255),
    customer_name VARCHAR(255),
    premium_amount DECIMAL(12,2),
    commission_rate DECIMAL(5,2),
    commission_amount DECIMAL(10,2),
    base_amount DECIMAL(12,2),
    commission_type VARCHAR(50) DEFAULT 'initial',
    payment_status VARCHAR(50) DEFAULT 'pending',
    sale_date DATE,
    payment_period VARCHAR(20),
    carrier VARCHAR(255),
    policy_number VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create products table if missing
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    carrier VARCHAR(255),
    product_type VARCHAR(100),
    commission_rate DECIMAL(5,2),
    base_premium DECIMAL(10,2),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create customers table if missing
CREATE TABLE IF NOT EXISTS customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id VARCHAR(100) UNIQUE,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    date_of_birth DATE,
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_state VARCHAR(50),
    address_zip VARCHAR(20),
    product_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    assigned_agent_id UUID,
    agency_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create quotes table if missing
CREATE TABLE IF NOT EXISTS quotes (
    id VARCHAR(100) PRIMARY KEY,
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    product_id VARCHAR(100),
    premium DECIMAL(12,2),
    quoted_by UUID,
    agency_id UUID,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- CREATE MISSING SUPPORT TABLES
-- ═══════════════════════════════════════════════════════════════

-- 9. Create customer_service_cases table if missing
CREATE TABLE IF NOT EXISTS customer_service_cases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID,
    case_number VARCHAR(100) UNIQUE,
    subject VARCHAR(255),
    description TEXT,
    status VARCHAR(50) DEFAULT 'open',
    priority VARCHAR(20) DEFAULT 'medium',
    assigned_agent_id UUID,
    agency_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Create support_tickets table if missing
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID,
    title VARCHAR(255),
    description TEXT,
    status VARCHAR(50) DEFAULT 'open',
    priority VARCHAR(20) DEFAULT 'medium',
    assigned_to UUID,
    agency_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- CREATE MISSING SECURITY TABLES
-- ═══════════════════════════════════════════════════════════════

-- 11. Create security_events table if missing
CREATE TABLE IF NOT EXISTS security_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    agency_id UUID,
    event_type VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    severity VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Create user_sessions table if missing
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    session_token VARCHAR(255) UNIQUE,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    location TEXT,
    device_info TEXT
);

-- ═══════════════════════════════════════════════════════════════
-- FIX DATA INTEGRITY ISSUES
-- ═══════════════════════════════════════════════════════════════

-- 13. Insert default agency if agencies table is empty
INSERT INTO agencies (agency_id, name, subscription_plan, contact_email)
SELECT 'DEFAULT', 'Default Agency', 'starter', 'admin@default.com'
WHERE NOT EXISTS (SELECT 1 FROM agencies);

-- 14. Update existing portal_users to have agency_id if null
DO $$
BEGIN
    -- Assign default agency to users without agency_id
    IF EXISTS (SELECT 1 FROM portal_users WHERE agency_id IS NULL) THEN
        UPDATE portal_users 
        SET agency_id = (SELECT id FROM agencies ORDER BY created_at LIMIT 1)
        WHERE agency_id IS NULL;
        RAISE NOTICE 'Updated users without agency_id to default agency';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating user agency assignments: %', SQLERRM;
END $$;

-- 15. Fix orphaned sales records
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'portal_sales') THEN
        -- Update sales records without valid agency_id
        UPDATE portal_sales 
        SET agency_id = (SELECT id FROM agencies ORDER BY created_at LIMIT 1)
        WHERE agency_id IS NULL 
           OR agency_id NOT IN (SELECT id FROM agencies);
        
        GET DIAGNOSTICS count = ROW_COUNT;
        RAISE NOTICE 'Fixed % orphaned sales records', count;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error fixing orphaned sales: %', SQLERRM;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- ADD MISSING INDEXES
-- ═══════════════════════════════════════════════════════════════

-- 16. Create performance indexes if missing
DO $$
BEGIN
    -- Index on portal_users agency_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_portal_users_agency_id') THEN
        CREATE INDEX idx_portal_users_agency_id ON portal_users(agency_id);
        RAISE NOTICE 'Created index on portal_users.agency_id';
    END IF;
    
    -- Index on portal_sales agent_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_portal_sales_agent_id') THEN
        CREATE INDEX idx_portal_sales_agent_id ON portal_sales(agent_id);
        RAISE NOTICE 'Created index on portal_sales.agent_id';
    END IF;
    
    -- Index on portal_sales agency_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_portal_sales_agency_id') THEN
        CREATE INDEX idx_portal_sales_agency_id ON portal_sales(agency_id);
        RAISE NOTICE 'Created index on portal_sales.agency_id';
    END IF;
    
    -- Index on audit_logs timestamp
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_logs_timestamp') THEN
        CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
        RAISE NOTICE 'Created index on audit_logs.timestamp';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating indexes: %', SQLERRM;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- INSERT ESSENTIAL DATA
-- ═══════════════════════════════════════════════════════════════

-- 17. Insert default products if table is empty
INSERT INTO products (id, name, carrier, product_type, commission_rate) 
SELECT * FROM (VALUES 
    ('AUTO001', 'Auto Insurance Standard', 'State Farm', 'Auto', 15.00),
    ('HOME001', 'Homeowners Insurance', 'Allstate', 'Home', 20.00),
    ('LIFE001', 'Term Life Insurance', 'MetLife', 'Life', 25.00)
) AS default_products(id, name, carrier, product_type, commission_rate)
WHERE NOT EXISTS (SELECT 1 FROM products);

-- ═══════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- ═══════════════════════════════════════════════════════════════

-- 18. Verify critical tables exist
DO $$
DECLARE
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    required_tables TEXT[] := ARRAY['agencies', 'portal_users', 'portal_sales', 'portal_commissions', 'audit_logs', 'customers'];
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY required_tables LOOP
        IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = table_name) THEN
            missing_tables := missing_tables || table_name;
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE WARNING 'Missing critical tables: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE 'All critical tables exist';
    END IF;
END $$;

-- 19. Record fix completion
INSERT INTO schema_version (version, description) VALUES 
('1.0.1', 'Database repair script applied - fixed missing tables and columns');

-- Database fix script completed
RAISE NOTICE 'Database fix script completed successfully';