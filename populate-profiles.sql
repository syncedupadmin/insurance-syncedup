-- Simple script to populate profiles table
-- Run this AFTER the main setup script

-- First, check what we have
SELECT 'Current state:' as info;
SELECT 'auth.users count:' as table_name, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'profiles count:', COUNT(*) FROM profiles
UNION ALL  
SELECT 'portal_users count:', COUNT(*) FROM portal_users;

-- Populate profiles from auth.users (using direct insert)
INSERT INTO profiles (user_id, email, full_name, role, is_active, created_at)
SELECT 
    au.id,
    au.email,
    COALESCE(
        (au.raw_user_meta_data->>'name')::text,
        split_part(au.email, '@', 1)
    ),
    CASE 
        WHEN au.email = 'admin@syncedupsolutions.com' THEN 'super_admin'
        WHEN au.email = 'superadmin@demo.com' THEN 'super_admin'
        ELSE 'admin'
    END,
    true,
    au.created_at
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.user_id = au.id
);

-- Add profiles for portal_users without auth accounts
INSERT INTO profiles (email, full_name, role, is_active, created_at)
SELECT 
    pu.email,
    COALESCE(pu.name, pu.full_name, split_part(pu.email, '@', 1)),
    CASE 
        WHEN pu.role = 'super_admin' THEN 'super_admin'
        WHEN pu.role = 'admin' THEN 'admin'
        WHEN pu.role = 'manager' THEN 'manager'
        WHEN pu.role = 'agent' THEN 'agent'
        WHEN pu.role = 'customer_service' THEN 'customer_service'
        ELSE 'customer'
    END,
    pu.is_active,
    pu.created_at
FROM portal_users pu
WHERE NOT EXISTS (
    SELECT 1 FROM profiles p WHERE LOWER(p.email) = LOWER(pu.email)
);

-- Update agencies monthly_fee if column exists
UPDATE agencies SET 
    monthly_fee = CASE 
        WHEN name LIKE '%Demo%' THEN 99.00
        WHEN name LIKE '%PHS%' THEN 299.00
        WHEN name LIKE '%SyncedUp%' THEN 999.00
        ELSE 199.00
    END
WHERE monthly_fee IS NULL;

-- Add sample commission records
DO $$
DECLARE
    v_agent_id BIGINT;
BEGIN
    -- Get first agent
    SELECT id INTO v_agent_id 
    FROM profiles 
    WHERE role = 'agent' 
    LIMIT 1;
    
    IF v_agent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM commission_records LIMIT 1) THEN
        INSERT INTO commission_records (
            agent_id, 
            commission_type, 
            sale_amount, 
            commission_rate, 
            commission_amount, 
            status,
            payment_date,
            notes
        ) VALUES
        (v_agent_id, 'new_sale', 2500.00, 15.00, 375.00, 'paid', NOW() - INTERVAL '10 days', 'Sample'),
        (v_agent_id, 'renewal', 1800.00, 10.00, 180.00, 'paid', NOW() - INTERVAL '20 days', 'Sample'),
        (v_agent_id, 'referral', 3200.00, 12.00, 384.00, 'pending', NULL, 'Sample');
    END IF;
END $$;

-- Update system_metrics
DELETE FROM system_metrics WHERE DATE(metric_date) = CURRENT_DATE;

INSERT INTO system_metrics (
    metric_date,
    total_users,
    active_users,
    new_users_today,
    new_users_week,
    new_users_month,
    total_quotes,
    total_policies,
    total_claims,
    revenue_monthly,
    revenue_annual,
    system_uptime,
    conversion_rate,
    customer_satisfaction,
    api_response_time_ms
) VALUES (
    NOW(),
    (SELECT COUNT(*) FROM profiles),
    3,
    1,
    3,
    8,
    (SELECT COUNT(*) FROM quotes),
    (SELECT COUNT(*) FROM policies),
    (SELECT COUNT(*) FROM claims),
    1397.00,
    16764.00,
    99.97,
    23.5,
    4.7,
    125
);

-- Final check
SELECT 'After population:' as info;
SELECT 'profiles' as table_name, COUNT(*) as count, STRING_AGG(DISTINCT role, ', ') as roles FROM profiles
UNION ALL
SELECT 'agencies', COUNT(*), STRING_AGG(name, ', ') FROM agencies
UNION ALL
SELECT 'commission_records', COUNT(*), STRING_AGG(DISTINCT status, ', ') FROM commission_records
UNION ALL
SELECT 'system_metrics', COUNT(*), 'Latest record' FROM system_metrics;