-- CORRECT PROFILES SETUP
-- Only admin@syncedupsolutions.com should be super_admin

-- 1. First, check if profiles table has the needed columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('super_admin', 'admin', 'manager', 'agent', 'customer_service', 'customer')),
ADD COLUMN IF NOT EXISTS agency_id BIGINT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Add the 2 auth.users with CORRECT roles
INSERT INTO profiles (user_id, full_name, email, role, is_active)
VALUES 
    -- This is the ONLY super_admin
    ('41589ffb-5613-41ad-9251-03ca35ab9d89', 'SyncedUp Super Admin', 'admin@syncedupsolutions.com', 'super_admin', true),
    -- This should be a regular admin for Demo Agency
    ('c6dad962-c773-4ec9-8ac3-a6324fe8f889', 'Demo Admin', 'superadmin@demo.com', 'admin', true)
ON CONFLICT (user_id) 
DO UPDATE SET 
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email;

-- 3. Also update the auth.users metadata to reflect correct roles
-- (This is just for reference - you may need to do this via Supabase dashboard)
-- UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}' WHERE email = 'superadmin@demo.com';

-- 4. Add the portal_users to profiles (without auth accounts)
-- These are your other staff members
INSERT INTO profiles (email, full_name, role, is_active)
SELECT 
    pu.email,
    pu.name,
    CASE 
        WHEN pu.role = 'super_admin' AND pu.email != 'admin@syncedupsolutions.com' THEN 'admin'  -- Downgrade any other super_admin
        WHEN pu.role = 'customer_service' THEN 'customer_service'
        ELSE pu.role
    END as role,
    pu.is_active
FROM portal_users pu
WHERE pu.email NOT IN ('admin@syncedupsolutions.com', 'superadmin@demo.com')  -- Skip the ones we already added
ON CONFLICT (email) DO NOTHING;

-- 5. Link profiles to agencies based on email domain
UPDATE profiles SET agency_id = (
    SELECT CAST(SUBSTRING(id FROM 2 FOR 7) AS BIGINT) FROM agencies WHERE name = 'Demo Insurance Agency' LIMIT 1
) WHERE email LIKE '%@demo.com';

UPDATE profiles SET agency_id = (
    SELECT CAST(SUBSTRING(id FROM 2 FOR 7) AS BIGINT) FROM agencies WHERE name = 'Phoenix Health Solutions' LIMIT 1
) WHERE email LIKE '%@phsagency.com';

UPDATE profiles SET agency_id = (
    SELECT CAST(SUBSTRING(id FROM 2 FOR 7) AS BIGINT) FROM agencies WHERE name = 'SyncedUp Solutions' LIMIT 1
) WHERE email LIKE '%@syncedupsolutions.com';

-- 6. Verify the setup
SELECT 'Role Distribution:' as info;
SELECT role, COUNT(*) as count 
FROM profiles 
GROUP BY role 
ORDER BY role;

SELECT '';
SELECT 'Super Admin Check:' as info;
SELECT email, full_name, role 
FROM profiles 
WHERE role = 'super_admin';

SELECT '';
SELECT 'All Profiles:' as info;
SELECT email, full_name, role, agency_id, is_active
FROM profiles
ORDER BY role, email;