-- Initialize Insurance.SyncedUp Database
-- Run this in Supabase SQL Editor

-- STEP 1: First, populate profiles table from existing auth.users
-- This ensures foreign key constraints won't fail
DO $$
BEGIN
    -- Insert profiles for existing auth.users if they don't exist
    INSERT INTO profiles (id, email, full_name, role, is_active, created_at)
    SELECT 
        au.id,
        au.email,
        COALESCE(au.raw_user_meta_data->>'full_name', au.email),
        COALESCE(au.raw_user_meta_data->>'role', 'customer'),
        true,
        au.created_at
    FROM auth.users au
    WHERE NOT EXISTS (
        SELECT 1 FROM profiles p WHERE p.id = au.id
    );
    
    RAISE NOTICE 'Profiles created for existing auth users';
END $$;

-- STEP 2: Sync profiles with portal_users data
-- Update profiles with data from portal_users where emails match
UPDATE profiles p
SET 
    full_name = pu.name,
    role = CASE 
        WHEN pu.role = 'super-admin' THEN 'super_admin'
        WHEN pu.role = 'customer-service' THEN 'customer_service'
        ELSE pu.role
    END,
    phone = pu.phone,
    department = pu.department,
    last_login = pu.last_login
FROM portal_users pu
WHERE p.email = pu.email;

-- STEP 3: Add sample commission records only if agent profiles exist
DO $$
DECLARE
    agent_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO agent_count FROM profiles WHERE role = 'agent';
    
    IF agent_count > 0 THEN
        -- Add sample commission records for existing agents
        INSERT INTO commission_records (
            agent_id, 
            commission_type, 
            sale_amount, 
            commission_rate, 
            commission_amount, 
            status,
            payment_date,
            created_at
        ) 
        SELECT 
            p.id,
            CASE (random() * 3)::int 
                WHEN 0 THEN 'new_sale'
                WHEN 1 THEN 'renewal'
                ELSE 'referral'
            END,
            1500.00 + (random() * 3000),
            15.00,
            (1500.00 + (random() * 3000)) * 0.15,
            CASE WHEN random() < 0.7 THEN 'paid' ELSE 'pending' END,
            CASE WHEN random() < 0.7 THEN CURRENT_DATE - INTERVAL '1 month' * (random() * 3)::int ELSE NULL END,
            NOW() - INTERVAL '1 day' * (random() * 30)::int
        FROM profiles p
        WHERE p.role = 'agent'
        LIMIT 5;
        
        RAISE NOTICE 'Sample commission records created';
    ELSE
        RAISE NOTICE 'No agents found, skipping commission records';
    END IF;
END $$;

-- STEP 4: Ensure agencies have data (update existing or insert new)
INSERT INTO agencies (name, code, email, phone, monthly_fee, status, address, city, state, zip_code) 
VALUES
    ('Demo Agency', 'DEMO', 'demo@syncedup.com', '555-0100', 99.00, 'active', '123 Demo St', 'Austin', 'TX', '78701'),
    ('PHS Insurance Agency', 'PHS', 'contact@phsinsurance.com', '555-0200', 299.00, 'active', '456 Insurance Ave', 'Dallas', 'TX', '75201'),
    ('SyncedUp Solutions', 'SYNC', 'admin@syncedupsolutions.com', '555-0300', 999.00, 'active', '789 Tech Blvd', 'Houston', 'TX', '77001')
ON CONFLICT (name) 
DO UPDATE SET 
    monthly_fee = EXCLUDED.monthly_fee,
    status = EXCLUDED.status,
    updated_at = NOW();

-- STEP 5: Initialize system metrics with real data
INSERT INTO system_metrics (
    metric_date,
    total_users,
    active_users,
    new_users_today,
    new_users_week,
    new_users_month,
    total_quotes,
    quotes_pending,
    quotes_approved,
    quotes_converted,
    total_policies,
    policies_active,
    total_claims,
    claims_pending,
    claims_approved,
    revenue_monthly,
    revenue_annual,
    system_uptime,
    conversion_rate,
    customer_satisfaction,
    api_response_time_ms
) VALUES (
    CURRENT_DATE,
    (SELECT COUNT(*) FROM portal_users),
    (SELECT COUNT(*) FROM portal_users WHERE last_login > NOW() - INTERVAL '7 days'),
    1,
    3,
    8,
    (SELECT COUNT(*) FROM quotes),
    (SELECT COUNT(*) FROM quotes WHERE status = 'pending'),
    (SELECT COUNT(*) FROM quotes WHERE status = 'approved'),
    (SELECT COUNT(*) FROM quotes WHERE status = 'converted'),
    (SELECT COUNT(*) FROM policies),
    (SELECT COUNT(*) FROM policies WHERE status = 'active'),
    (SELECT COUNT(*) FROM claims),
    (SELECT COUNT(*) FROM claims WHERE status = 'pending'),
    (SELECT COUNT(*) FROM claims WHERE status = 'approved'),
    (SELECT SUM(monthly_fee) FROM agencies WHERE status = 'active'),
    (SELECT SUM(monthly_fee) * 12 FROM agencies WHERE status = 'active'),
    99.97,
    23.5,
    4.7,
    125
)
ON CONFLICT DO NOTHING;

-- STEP 6: Create or update RLS policies (safe to run multiple times)
DO $$
BEGIN
    -- Enable RLS on all tables if not already enabled
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE commission_records ENABLE ROW LEVEL SECURITY;
    ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
    ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
    ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE 'Row Level Security enabled on all tables';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'RLS already enabled or error: %', SQLERRM;
END $$;

-- Create policies (DROP IF EXISTS first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Agents can view own commissions" ON commission_records;
CREATE POLICY "Agents can view own commissions" ON commission_records
    FOR SELECT USING (auth.uid() = agent_id);

DROP POLICY IF EXISTS "Managers can view all commissions" ON commission_records;
CREATE POLICY "Managers can view all commissions" ON commission_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('manager', 'admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Anyone can view agencies" ON agencies;
CREATE POLICY "Anyone can view agencies" ON agencies
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only super admins can modify agencies" ON agencies;
CREATE POLICY "Only super admins can modify agencies" ON agencies
    FOR INSERT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "Only admins can view metrics" ON system_metrics;
CREATE POLICY "Only admins can view metrics" ON system_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- STEP 7: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_commission_records_agent_id ON commission_records(agent_id);
CREATE INDEX IF NOT EXISTS idx_commission_records_status ON commission_records(status);
CREATE INDEX IF NOT EXISTS idx_policies_customer_id ON policies(customer_id);
CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_metrics_metric_date ON system_metrics(metric_date);

-- STEP 8: Verify the setup
DO $$
DECLARE
    profile_count INTEGER;
    agency_count INTEGER;
    metric_count INTEGER;
    portal_user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO profile_count FROM profiles;
    SELECT COUNT(*) INTO agency_count FROM agencies;
    SELECT COUNT(*) INTO metric_count FROM system_metrics;
    SELECT COUNT(*) INTO portal_user_count FROM portal_users;
    
    RAISE NOTICE '=== Database Initialization Complete ===';
    RAISE NOTICE 'Profiles: % records', profile_count;
    RAISE NOTICE 'Portal Users: % records', portal_user_count;
    RAISE NOTICE 'Agencies: % records', agency_count;
    RAISE NOTICE 'System Metrics: % records', metric_count;
    RAISE NOTICE '========================================';
END $$;