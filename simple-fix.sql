-- SIMPLE FIX: Just populate the profiles table with what you have

-- 1. Add the 2 auth.users to profiles
INSERT INTO profiles (user_id, full_name, email)
VALUES 
    ('41589ffb-5613-41ad-9251-03ca35ab9d89', 'SyncedUp Super Admin', 'admin@syncedupsolutions.com'),
    ('c6dad962-c773-4ec9-8ac3-a6324fe8f889', 'Super Admin Demo', 'superadmin@demo.com')
ON CONFLICT (user_id) DO NOTHING;

-- 2. Check what we have now
SELECT 'Profiles created from auth.users:' as status, COUNT(*) as count FROM profiles WHERE user_id IS NOT NULL;

-- 3. Show what's in profiles
SELECT * FROM profiles;