-- Use YOUR EXISTING users for testing
-- These users already exist in your database

-- First, let's see what roles they have
SELECT
  email,
  raw_app_meta_data->>'role' as app_role,
  raw_user_meta_data->>'role' as user_role,
  email_confirmed_at
FROM auth.users
WHERE email IN (
  'agent@syncedup.com',
  'admin@syncedupsolutions.com',
  'superadmin@demo.com'
);

-- Update their metadata to ensure they can login
UPDATE auth.users
SET
  raw_app_meta_data = jsonb_build_object(
    'role',
    CASE
      WHEN email = 'agent@syncedup.com' THEN 'agent'
      WHEN email = 'admin@syncedupsolutions.com' THEN 'admin'
      WHEN email = 'superadmin@demo.com' THEN 'super_admin'
    END,
    'agency_id', 'AGENCY001'
  ),
  raw_user_meta_data = jsonb_build_object(
    'role',
    CASE
      WHEN email = 'agent@syncedup.com' THEN 'agent'
      WHEN email = 'admin@syncedupsolutions.com' THEN 'admin'
      WHEN email = 'superadmin@demo.com' THEN 'super_admin'
    END,
    'agency_id', 'AGENCY001',
    'full_name',
    CASE
      WHEN email = 'agent@syncedup.com' THEN 'Demo Agent'
      WHEN email = 'admin@syncedupsolutions.com' THEN 'System Admin'
      WHEN email = 'superadmin@demo.com' THEN 'Super Admin'
    END
  ),
  email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email IN (
  'agent@syncedup.com',
  'admin@syncedupsolutions.com',
  'superadmin@demo.com'
);

-- Ensure portal_users records exist
INSERT INTO portal_users (
  email,
  role,
  roles,
  full_name,
  name,
  agency_id,
  auth_user_id,
  is_active,
  created_at,
  updated_at
)
SELECT
  u.email,
  CASE
    WHEN u.email = 'agent@syncedup.com' THEN 'agent'
    WHEN u.email = 'admin@syncedupsolutions.com' THEN 'admin'
    WHEN u.email = 'superadmin@demo.com' THEN 'super_admin'
  END as role,
  ARRAY[CASE
    WHEN u.email = 'agent@syncedup.com' THEN 'agent'
    WHEN u.email = 'admin@syncedupsolutions.com' THEN 'admin'
    WHEN u.email = 'superadmin@demo.com' THEN 'super_admin'
  END]::text[] as roles,
  CASE
    WHEN u.email = 'agent@syncedup.com' THEN 'Demo Agent'
    WHEN u.email = 'admin@syncedupsolutions.com' THEN 'System Admin'
    WHEN u.email = 'superadmin@demo.com' THEN 'Super Admin'
  END as full_name,
  CASE
    WHEN u.email = 'agent@syncedup.com' THEN 'Demo Agent'
    WHEN u.email = 'admin@syncedupsolutions.com' THEN 'System Admin'
    WHEN u.email = 'superadmin@demo.com' THEN 'Super Admin'
  END as name,
  'AGENCY001' as agency_id,
  u.id as auth_user_id,
  true as is_active,
  NOW() as created_at,
  NOW() as updated_at
FROM auth.users u
WHERE u.email IN (
  'agent@syncedup.com',
  'admin@syncedupsolutions.com',
  'superadmin@demo.com'
)
ON CONFLICT (email) DO UPDATE SET
  role = EXCLUDED.role,
  roles = EXCLUDED.roles,
  full_name = EXCLUDED.full_name,
  name = EXCLUDED.name,
  agency_id = EXCLUDED.agency_id,
  auth_user_id = EXCLUDED.auth_user_id,
  is_active = true,
  updated_at = NOW();

-- Verify setup
SELECT
  u.email,
  u.raw_app_meta_data->>'role' as auth_role,
  p.role as portal_role,
  p.agency_id,
  p.is_active
FROM auth.users u
LEFT JOIN portal_users p ON p.email = u.email
WHERE u.email IN (
  'agent@syncedup.com',
  'admin@syncedupsolutions.com',
  'superadmin@demo.com'
);

-- IMPORTANT: You need to know the passwords for these users!
-- If you don't know them, you'll need to reset them.
-- To reset a password, use your super admin dashboard or run:

-- Reset password for agent@syncedup.com to 'Test1234!'
UPDATE auth.users
SET encrypted_password = crypt('Test1234!', gen_salt('bf'))
WHERE email = 'agent@syncedup.com';

-- Reset password for admin@syncedupsolutions.com to 'Test1234!'
UPDATE auth.users
SET encrypted_password = crypt('Test1234!', gen_salt('bf'))
WHERE email = 'admin@syncedupsolutions.com';