-- Quick Fix: Add Missing Data to Existing Tables
-- Run this in Supabase SQL Editor if the tables exist but are empty

-- STEP 1: First check what we have
SELECT 'auth.users' as table_name, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'portal_users', COUNT(*) FROM portal_users
UNION ALL
SELECT 'agencies', COUNT(*) FROM agencies
UNION ALL
SELECT 'commission_records', COUNT(*) FROM commission_records
UNION ALL
SELECT 'system_metrics', COUNT(*) FROM system_metrics;

-- STEP 2: Populate profiles from auth.users (if not already done)
INSERT INTO profiles (id, email, full_name, role, is_active, created_at)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
    COALESCE(
        CASE 
            WHEN au.raw_user_meta_data->>'role' = 'super-admin' THEN 'super_admin'
            WHEN au.raw_user_meta_data->>'role' = 'customer-service' THEN 'customer_service'
            ELSE au.raw_user_meta_data->>'role'
        END,
        'customer'
    ),
    true,
    au.created_at
FROM auth.users au
ON CONFLICT (id) DO NOTHING;

-- STEP 3: Update system_metrics (delete old and insert fresh)
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
    GREATEST((SELECT COUNT(*) FROM portal_users), 8),
    GREATEST((SELECT COUNT(*) FROM portal_users WHERE last_login > NOW() - INTERVAL '7 days'), 3),
    1,
    3,
    8,
    GREATEST((SELECT COUNT(*) FROM quotes), 0),
    GREATEST((SELECT COUNT(*) FROM quotes WHERE status = 'pending'), 0),
    GREATEST((SELECT COUNT(*) FROM quotes WHERE status = 'approved'), 0),
    GREATEST((SELECT COUNT(*) FROM quotes WHERE status = 'converted'), 0),
    GREATEST((SELECT COUNT(*) FROM policies), 0),
    GREATEST((SELECT COUNT(*) FROM policies WHERE status = 'active'), 0),
    GREATEST((SELECT COUNT(*) FROM claims), 0),
    GREATEST((SELECT COUNT(*) FROM claims WHERE status = 'pending'), 0),
    GREATEST((SELECT COUNT(*) FROM claims WHERE status = 'approved'), 0),
    1397.00,  -- Sum of agency fees
    16764.00, -- Annual revenue
    99.97,
    23.5,
    4.7,
    125
);

-- STEP 4: Ensure agencies exist (safe upsert)
INSERT INTO agencies (name, code, email, phone, monthly_fee, status, address, city, state, zip_code) 
VALUES
    ('Demo Agency', 'DEMO', 'demo@syncedup.com', '555-0100', 99.00, 'active', '123 Demo St', 'Austin', 'TX', '78701'),
    ('PHS Insurance Agency', 'PHS', 'contact@phsinsurance.com', '555-0200', 299.00, 'active', '456 Insurance Ave', 'Dallas', 'TX', '75201'),
    ('SyncedUp Solutions', 'SYNC', 'admin@syncedupsolutions.com', '555-0300', 999.00, 'active', '789 Tech Blvd', 'Houston', 'TX', '77001')
ON CONFLICT (name) 
DO UPDATE SET 
    monthly_fee = EXCLUDED.monthly_fee,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    status = EXCLUDED.status,
    updated_at = NOW()
WHERE agencies.name = EXCLUDED.name;

-- STEP 5: Add sample commission records ONLY if we have agent profiles
DO $$
DECLARE
    agent_id UUID;
BEGIN
    -- Get first agent ID if exists
    SELECT id INTO agent_id FROM profiles WHERE role = 'agent' LIMIT 1;
    
    IF agent_id IS NOT NULL THEN
        -- Add a few sample commission records
        INSERT INTO commission_records (
            agent_id, 
            commission_type, 
            sale_amount, 
            commission_rate, 
            commission_amount, 
            status,
            payment_date
        ) VALUES
        (agent_id, 'new_sale', 2500.00, 15.00, 375.00, 'paid', CURRENT_DATE - INTERVAL '10 days'),
        (agent_id, 'renewal', 1800.00, 10.00, 180.00, 'paid', CURRENT_DATE - INTERVAL '20 days'),
        (agent_id, 'referral', 3200.00, 12.00, 384.00, 'pending', NULL)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- STEP 6: Verify what we have now
SELECT '=== Final Data Count ===' as status;
SELECT 'profiles' as table_name, COUNT(*) as count FROM profiles
UNION ALL
SELECT 'portal_users', COUNT(*) FROM portal_users
UNION ALL
SELECT 'agencies', COUNT(*) FROM agencies
UNION ALL
SELECT 'system_metrics', COUNT(*) FROM system_metrics
UNION ALL
SELECT 'commission_records', COUNT(*) FROM commission_records;