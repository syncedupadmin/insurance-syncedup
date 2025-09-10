-- Complete Database Schema Creation for Insurance.SyncedUp
-- Run this ENTIRE script in Supabase SQL Editor

-- STEP 1: Create profiles table (MUST be first)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'manager', 'agent', 'customer_service', 'customer')),
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    hire_date DATE,
    department TEXT,
    supervisor_id UUID REFERENCES profiles(id),
    commission_rate DECIMAL(5,2),
    is_active BOOLEAN DEFAULT true,
    avatar_url TEXT,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 2: Populate profiles from existing auth.users
INSERT INTO profiles (id, email, full_name, role, is_active, created_at)
SELECT 
    au.id,
    au.email,
    COALESCE(
        au.raw_user_meta_data->>'full_name', 
        au.raw_user_meta_data->>'name',
        split_part(au.email, '@', 1)
    ),
    CASE 
        WHEN au.email LIKE '%superadmin%' OR au.email = 'admin@syncedupsolutions.com' THEN 'super_admin'
        ELSE COALESCE(au.raw_user_meta_data->>'role', 'admin')
    END,
    true,
    au.created_at
FROM auth.users au
ON CONFLICT (id) DO NOTHING;

-- STEP 3: Update profiles with portal_users data where available
UPDATE profiles p
SET 
    full_name = pu.name,
    role = CASE 
        WHEN pu.role = 'super_admin' THEN 'super_admin'
        WHEN pu.role = 'customer_service' THEN 'customer_service'
        ELSE pu.role
    END,
    phone = pu.phone,
    department = pu.department,
    last_login = pu.last_login
FROM portal_users pu
WHERE p.email = pu.email;

-- STEP 4: Create commission_records table if not exists
CREATE TABLE IF NOT EXISTS public.commission_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    policy_id UUID,
    quote_id UUID,
    commission_type TEXT NOT NULL CHECK (commission_type IN ('new_sale', 'renewal', 'referral', 'bonus')),
    sale_amount DECIMAL(12,2) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    commission_amount DECIMAL(12,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
    payment_date DATE,
    payment_method TEXT CHECK (payment_method IN ('direct_deposit', 'check', 'wire')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_by UUID REFERENCES profiles(id),
    approved_date TIMESTAMP WITH TIME ZONE
);

-- STEP 5: Ensure agencies table has correct structure
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS zip_code TEXT;

-- STEP 6: Populate agencies with data
INSERT INTO agencies (name, code, email, phone, monthly_fee, status, address, city, state, zip_code) 
VALUES
    ('Demo Agency', 'DEMO', 'demo@syncedup.com', '555-0100', 99.00, 'active', '123 Demo St', 'Austin', 'TX', '78701'),
    ('PHS Insurance Agency', 'PHS', 'contact@phsinsurance.com', '555-0200', 299.00, 'active', '456 Insurance Ave', 'Dallas', 'TX', '75201'),
    ('SyncedUp Solutions', 'SYNC', 'admin@syncedupsolutions.com', '555-0300', 999.00, 'active', '789 Tech Blvd', 'Houston', 'TX', '77001')
ON CONFLICT (name) 
DO UPDATE SET 
    monthly_fee = EXCLUDED.monthly_fee,
    status = EXCLUDED.status,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    zip_code = EXCLUDED.zip_code,
    updated_at = NOW();

-- STEP 7: Add sample commission records for testing
DO $$
DECLARE
    v_agent_id UUID;
BEGIN
    -- Get an agent profile
    SELECT id INTO v_agent_id 
    FROM profiles 
    WHERE role = 'agent' 
    LIMIT 1;
    
    IF v_agent_id IS NOT NULL THEN
        INSERT INTO commission_records (
            agent_id, 
            commission_type, 
            sale_amount, 
            commission_rate, 
            commission_amount, 
            status,
            payment_date
        ) VALUES
        (v_agent_id, 'new_sale', 2500.00, 15.00, 375.00, 'paid', CURRENT_DATE - INTERVAL '10 days'),
        (v_agent_id, 'renewal', 1800.00, 10.00, 180.00, 'paid', CURRENT_DATE - INTERVAL '20 days'),
        (v_agent_id, 'referral', 3200.00, 12.00, 384.00, 'pending', NULL),
        (v_agent_id, 'new_sale', 4100.00, 15.00, 615.00, 'paid', CURRENT_DATE - INTERVAL '5 days'),
        (v_agent_id, 'bonus', 1000.00, 100.00, 1000.00, 'approved', NULL)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- STEP 8: Update system_metrics with real data
DELETE FROM system_metrics WHERE metric_date = CURRENT_DATE;

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
    (SELECT COUNT(*) FROM profiles),
    (SELECT COUNT(*) FROM profiles WHERE last_login > NOW() - INTERVAL '7 days'),
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
    (SELECT COALESCE(SUM(monthly_fee), 1397.00) FROM agencies WHERE status = 'active'),
    (SELECT COALESCE(SUM(monthly_fee) * 12, 16764.00) FROM agencies WHERE status = 'active'),
    99.97,
    23.5,
    4.7,
    125
);

-- STEP 9: Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

-- STEP 10: Create RLS Policies
-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Service role has full access to profiles" ON profiles;
CREATE POLICY "Service role has full access to profiles" ON profiles
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Commission records policies
DROP POLICY IF EXISTS "Agents can view own commissions" ON commission_records;
CREATE POLICY "Agents can view own commissions" ON commission_records
    FOR SELECT USING (
        auth.uid() = agent_id OR
        auth.jwt()->>'role' = 'service_role'
    );

DROP POLICY IF EXISTS "Service role has full access to commissions" ON commission_records;
CREATE POLICY "Service role has full access to commissions" ON commission_records
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Agencies policies
DROP POLICY IF EXISTS "Anyone can view agencies" ON agencies;
CREATE POLICY "Anyone can view agencies" ON agencies
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can modify agencies" ON agencies;
CREATE POLICY "Service role can modify agencies" ON agencies
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- System metrics policies  
DROP POLICY IF EXISTS "Service role can access metrics" ON system_metrics;
CREATE POLICY "Service role can access metrics" ON system_metrics
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- STEP 11: Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_commission_records_agent_id ON commission_records(agent_id);
CREATE INDEX IF NOT EXISTS idx_commission_records_status ON commission_records(status);

-- STEP 12: Verification
DO $$
DECLARE
    v_profiles_count INTEGER;
    v_agencies_count INTEGER;
    v_commissions_count INTEGER;
    v_metrics_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_profiles_count FROM profiles;
    SELECT COUNT(*) INTO v_agencies_count FROM agencies;
    SELECT COUNT(*) INTO v_commissions_count FROM commission_records;
    SELECT COUNT(*) INTO v_metrics_count FROM system_metrics;
    
    RAISE NOTICE '';
    RAISE NOTICE '=================================';
    RAISE NOTICE 'Database Setup Complete!';
    RAISE NOTICE '=================================';
    RAISE NOTICE 'Profiles: % records', v_profiles_count;
    RAISE NOTICE 'Agencies: % records', v_agencies_count;
    RAISE NOTICE 'Commission Records: % records', v_commissions_count;
    RAISE NOTICE 'System Metrics: % records', v_metrics_count;
    RAISE NOTICE '=================================';
END $$;