-- Final Population Script - Run this to complete setup
-- This assumes all tables exist (profiles, agencies, commission_records, system_metrics)

-- STEP 1: Clear and populate profiles from auth.users (we know you have 2)
INSERT INTO profiles (user_id, email, full_name, role, is_active)
VALUES 
    ('41589ffb-5613-41ad-9251-03ca35ab9d89'::uuid, 'admin@syncedupsolutions.com', 'SyncedUp Super Admin', 'super_admin', true),
    ('c6dad962-c773-4ec9-8ac3-a6324fe8f889'::uuid, 'superadmin@demo.com', 'Super Admin Demo', 'super_admin', true)
ON CONFLICT (user_id) DO UPDATE SET 
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

-- STEP 2: Add portal_users as profiles (without auth accounts)
INSERT INTO profiles (email, full_name, role, is_active)
VALUES 
    ('admin@demo.com', 'Demo Admin', 'admin', true),
    ('manager@demo.com', 'Demo Manager', 'manager', true),
    ('service@demo.com', 'Demo Service', 'customer_service', true),
    ('admin@phsagency.com', 'PHS Administrator', 'agent', true),
    ('manager@phsagency.com', 'PHS Manager', 'agent', true),
    ('agent1@phsagency.com', 'PHS Agent 1', 'agent', true),
    ('agent@demo.com', 'Demo Agent', 'agent', true)
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

-- STEP 3: Ensure agencies have monthly_fee
UPDATE agencies SET 
    monthly_fee = CASE 
        WHEN name = 'Demo Agency' THEN 99.00
        WHEN name = 'PHS Insurance Agency' THEN 299.00
        WHEN name = 'SyncedUp Solutions' THEN 999.00
        ELSE 199.00
    END,
    status = 'active'
WHERE name IN ('Demo Agency', 'PHS Insurance Agency', 'SyncedUp Solutions');

-- STEP 4: Add commission records for agents
INSERT INTO commission_records (
    agent_id, 
    commission_type, 
    sale_amount, 
    commission_rate, 
    commission_amount, 
    status,
    payment_date,
    notes
)
SELECT 
    p.id,
    'new_sale',
    2500.00,
    15.00,
    375.00,
    'paid',
    CURRENT_DATE - INTERVAL '10 days',
    'Sample data'
FROM profiles p
WHERE p.role = 'agent'
AND p.email = 'agent@demo.com'
AND NOT EXISTS (
    SELECT 1 FROM commission_records WHERE agent_id = p.id
);

-- STEP 5: Populate system_metrics
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
    (SELECT COUNT(*) FROM profiles WHERE is_active = true),
    1,
    3,
    9,
    0,
    0,
    0,
    1397.00,
    16764.00,
    99.97,
    23.5,
    4.7,
    125
);

-- STEP 6: Verify everything
SELECT 'Setup Complete!' as status;
SELECT 'Profiles:' as table_name, COUNT(*) as count FROM profiles
UNION ALL
SELECT 'Super Admins:', COUNT(*) FROM profiles WHERE role = 'super_admin'
UNION ALL
SELECT 'Agents:', COUNT(*) FROM profiles WHERE role = 'agent'
UNION ALL
SELECT 'Agencies:', COUNT(*) FROM agencies WHERE monthly_fee IS NOT NULL
UNION ALL
SELECT 'Metrics:', COUNT(*) FROM system_metrics;

-- Show the data
SELECT 'Profile Roles:' as info, STRING_AGG(DISTINCT role, ', ') as values FROM profiles
UNION ALL
SELECT 'Agency Revenue:', SUM(monthly_fee)::text || '/month' FROM agencies WHERE status = 'active';