# Setup Test Users for Login

The issue is that the seeded users need to exist in your `portal_users` table with proper agency assignments. Here's how to fix it:

## Step 1: Call the seeder with your domain

```bash
curl https://zgkszwkxibpnxhvlenct.supabase.co/functions/v1/seed-test-users?domain=test.syncedup.com
```

This creates:
- agent@test.syncedup.com
- manager@test.syncedup.com
- admin@test.syncedup.com
- customer.service@test.syncedup.com

All with password: `Test1234!`

## Step 2: Run this SQL in Supabase to add them to portal_users

```sql
-- First, get the user IDs from auth.users
WITH test_users AS (
  SELECT id, email, raw_app_meta_data->>'role' as role
  FROM auth.users
  WHERE email IN (
    'agent@test.syncedup.com',
    'manager@test.syncedup.com',
    'admin@test.syncedup.com',
    'customer.service@test.syncedup.com'
  )
)
-- Insert into portal_users
INSERT INTO public.portal_users (
  id,
  email,
  full_name,
  role,
  agency_id,
  is_active,
  created_at,
  updated_at
)
SELECT
  tu.id,
  tu.email,
  CASE
    WHEN tu.role = 'agent' THEN 'Test Agent'
    WHEN tu.role = 'manager' THEN 'Test Manager'
    WHEN tu.role = 'admin' THEN 'Test Admin'
    WHEN tu.role = 'customer_service' THEN 'Test Customer Service'
  END as full_name,
  tu.role,
  'a2222222', -- Demo agency ID (or change to your test agency)
  true,
  NOW(),
  NOW()
FROM test_users tu
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name,
  is_active = true,
  updated_at = NOW();

-- Verify they were created
SELECT email, full_name, role, agency_id, is_active
FROM portal_users
WHERE email LIKE '%@test.syncedup.com'
ORDER BY role;
```

## Step 3: Test Login

Now go to your login page and use:

**Agent Login:**
- Email: agent@test.syncedup.com
- Password: Test1234!
- Should redirect to: /agent/

**Manager Login:**
- Email: manager@test.syncedup.com
- Password: Test1234!
- Should redirect to: /manager/

**Admin Login:**
- Email: admin@test.syncedup.com
- Password: Test1234!
- Should redirect to: /admin/

**Customer Service Login:**
- Email: customer.service@test.syncedup.com
- Password: Test1234!
- Should redirect to: /customer-service/

## If Login Still Fails:

1. Check browser console for errors
2. The issue might be that your login expects specific metadata. Run this to update metadata:

```sql
UPDATE auth.users
SET
  raw_app_meta_data = jsonb_build_object(
    'role',
    CASE
      WHEN email = 'agent@test.syncedup.com' THEN 'agent'
      WHEN email = 'manager@test.syncedup.com' THEN 'manager'
      WHEN email = 'admin@test.syncedup.com' THEN 'admin'
      WHEN email = 'customer.service@test.syncedup.com' THEN 'customer_service'
    END,
    'agency_id', 'a2222222'
  ),
  raw_user_meta_data = jsonb_build_object(
    'role',
    CASE
      WHEN email = 'agent@test.syncedup.com' THEN 'agent'
      WHEN email = 'manager@test.syncedup.com' THEN 'manager'
      WHEN email = 'admin@test.syncedup.com' THEN 'admin'
      WHEN email = 'customer.service@test.syncedup.com' THEN 'customer_service'
    END,
    'agency_id', 'a2222222',
    'full_name',
    CASE
      WHEN email = 'agent@test.syncedup.com' THEN 'Test Agent'
      WHEN email = 'manager@test.syncedup.com' THEN 'Test Manager'
      WHEN email = 'admin@test.syncedup.com' THEN 'Test Admin'
      WHEN email = 'customer.service@test.syncedup.com' THEN 'Test Customer Service'
    END
  )
WHERE email IN (
  'agent@test.syncedup.com',
  'manager@test.syncedup.com',
  'admin@test.syncedup.com',
  'customer.service@test.syncedup.com'
);
```

## Alternative: Create Users Directly with Your Super Admin

1. Login as super admin
2. Go to User Management
3. Click "CREATE USER"
4. Create each test user with the appropriate role

This ensures they're created exactly how your system expects them.