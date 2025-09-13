-- Fix test users authentication metadata
-- Run this in Supabase SQL Editor to ensure test users can login

-- Update auth.users metadata for all test users
UPDATE auth.users
SET
  raw_app_meta_data = jsonb_build_object(
    'role',
    CASE
      WHEN email = 'agent@example.com' THEN 'agent'
      WHEN email = 'manager@example.com' THEN 'manager'
      WHEN email = 'admin@example.com' THEN 'admin'
      WHEN email = 'customer.service@example.com' THEN 'customer_service'
    END,
    'agency_id', 'AGENCY001'
  ),
  raw_user_meta_data = jsonb_build_object(
    'role',
    CASE
      WHEN email = 'agent@example.com' THEN 'agent'
      WHEN email = 'manager@example.com' THEN 'manager'
      WHEN email = 'admin@example.com' THEN 'admin'
      WHEN email = 'customer.service@example.com' THEN 'customer_service'
    END,
    'agency_id', 'AGENCY001',
    'full_name',
    CASE
      WHEN email = 'agent@example.com' THEN 'Test Agent'
      WHEN email = 'manager@example.com' THEN 'Test Manager'
      WHEN email = 'admin@example.com' THEN 'Test Admin'
      WHEN email = 'customer.service@example.com' THEN 'Test Customer Service'
    END
  ),
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  updated_at = NOW()
WHERE email IN (
  'agent@example.com',
  'manager@example.com',
  'admin@example.com',
  'customer.service@example.com'
);

-- Ensure portal_users records exist and are properly linked
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
    WHEN u.email = 'agent@example.com' THEN 'agent'
    WHEN u.email = 'manager@example.com' THEN 'manager'
    WHEN u.email = 'admin@example.com' THEN 'admin'
    WHEN u.email = 'customer.service@example.com' THEN 'customer_service'
  END as role,
  ARRAY[CASE
    WHEN u.email = 'agent@example.com' THEN 'agent'
    WHEN u.email = 'manager@example.com' THEN 'manager'
    WHEN u.email = 'admin@example.com' THEN 'admin'
    WHEN u.email = 'customer.service@example.com' THEN 'customer_service'
  END]::text[] as roles,
  CASE
    WHEN u.email = 'agent@example.com' THEN 'Test Agent'
    WHEN u.email = 'manager@example.com' THEN 'Test Manager'
    WHEN u.email = 'admin@example.com' THEN 'Test Admin'
    WHEN u.email = 'customer.service@example.com' THEN 'Test Customer Service'
  END as full_name,
  CASE
    WHEN u.email = 'agent@example.com' THEN 'Test Agent'
    WHEN u.email = 'manager@example.com' THEN 'Test Manager'
    WHEN u.email = 'admin@example.com' THEN 'Test Admin'
    WHEN u.email = 'customer.service@example.com' THEN 'Test Customer Service'
  END as name,
  'AGENCY001' as agency_id,
  u.id as auth_user_id,
  true as is_active,
  NOW() as created_at,
  NOW() as updated_at
FROM auth.users u
WHERE u.email IN (
  'agent@example.com',
  'manager@example.com',
  'admin@example.com',
  'customer.service@example.com'
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

-- Verify the users are set up correctly
SELECT
  u.email,
  u.raw_app_meta_data->>'role' as auth_role,
  u.raw_app_meta_data->>'agency_id' as auth_agency,
  u.email_confirmed_at,
  p.role as portal_role,
  p.agency_id as portal_agency,
  p.is_active
FROM auth.users u
LEFT JOIN portal_users p ON p.email = u.email
WHERE u.email IN (
  'agent@example.com',
  'manager@example.com',
  'admin@example.com',
  'customer.service@example.com'
);