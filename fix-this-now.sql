-- FIX THIS ONCE AND FOR ALL

-- 1. Check what columns profiles actually has
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public';

-- 2. Add ALL missing columns we need
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS role TEXT,
ADD COLUMN IF NOT EXISTS agency_id BIGINT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS supervisor_id BIGINT,
ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- 3. Make email unique after adding it
ALTER TABLE profiles 
ADD CONSTRAINT profiles_email_unique UNIQUE (email);

-- 4. Now insert the super admin
INSERT INTO profiles (user_id, full_name, email, role, is_active)
VALUES 
    ('41589ffb-5613-41ad-9251-03ca35ab9d89', 'SyncedUp Super Admin', 'admin@syncedupsolutions.com', 'super_admin', true)
ON CONFLICT (user_id) DO UPDATE SET 
    email = 'admin@syncedupsolutions.com',
    role = 'super_admin',
    full_name = 'SyncedUp Super Admin';

-- 5. Show what we have
SELECT * FROM profiles;