-- FIRST: Call the Edge Function to create the test users
-- Run this in your browser or terminal:
-- curl https://zgkszwkxibpnxhvlenct.supabase.co/functions/v1/seed-test-users

-- OR if that doesn't work, manually check if users exist:
SELECT email, id, created_at
FROM auth.users
WHERE email IN (
  'agent@example.com',
  'manager@example.com',
  'admin@example.com',
  'customer.service@example.com'
);

-- If no results above, the users don't exist.
-- Tell the Supabase Assistant to run this to create them directly:

-- Create test users with SQL (alternative method)
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Create agent@example.com
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'agent@example.com',
    crypt('Test1234!', gen_salt('bf')),
    NOW(),
    '{"role": "agent", "agency_id": "AGENCY001"}',
    '{"role": "agent", "full_name": "Test Agent", "agency_id": "AGENCY001"}',
    NOW(),
    NOW()
  ) ON CONFLICT (email) DO NOTHING;

  -- Create manager@example.com
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'manager@example.com',
    crypt('Test1234!', gen_salt('bf')),
    NOW(),
    '{"role": "manager", "agency_id": "AGENCY001"}',
    '{"role": "manager", "full_name": "Test Manager", "agency_id": "AGENCY001"}',
    NOW(),
    NOW()
  ) ON CONFLICT (email) DO NOTHING;

  -- Create admin@example.com
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@example.com',
    crypt('Test1234!', gen_salt('bf')),
    NOW(),
    '{"role": "admin", "agency_id": "AGENCY001"}',
    '{"role": "admin", "full_name": "Test Admin", "agency_id": "AGENCY001"}',
    NOW(),
    NOW()
  ) ON CONFLICT (email) DO NOTHING;

  -- Create customer.service@example.com
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'customer.service@example.com',
    crypt('Test1234!', gen_salt('bf')),
    NOW(),
    '{"role": "customer_service", "agency_id": "AGENCY001"}',
    '{"role": "customer_service", "full_name": "Test Customer Service", "agency_id": "AGENCY001"}',
    NOW(),
    NOW()
  ) ON CONFLICT (email) DO NOTHING;
END $$;