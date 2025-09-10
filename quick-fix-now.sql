-- QUICK FIX - Just get it working

-- 1. Delete any bad rows
DELETE FROM profiles WHERE user_id IS NULL;

-- 2. Make user_id nullable if it isn't already
ALTER TABLE profiles ALTER COLUMN user_id DROP NOT NULL;

-- 3. Insert ONLY the one super admin that has an auth account
INSERT INTO profiles (user_id, full_name, email, role, is_active)
VALUES 
    ('41589ffb-5613-41ad-9251-03ca35ab9d89', 'SyncedUp Super Admin', 'admin@syncedupsolutions.com', 'super_admin', true)
ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin';

-- 4. Insert portal_users as profiles (they don't need auth accounts)
INSERT INTO profiles (email, full_name, role, is_active)
SELECT 
    pu.email,
    pu.name,
    CASE 
        WHEN pu.email = 'admin@syncedupsolutions.com' THEN 'super_admin'
        WHEN pu.role = 'customer_service' THEN 'customer_service'
        ELSE pu.role
    END,
    true
FROM portal_users pu
WHERE pu.email != 'admin@syncedupsolutions.com'  -- Skip the super admin we already added
ON CONFLICT (email) DO NOTHING;

-- 5. Check what we have
SELECT email, role FROM profiles ORDER BY role, email;