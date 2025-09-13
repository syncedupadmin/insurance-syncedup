-- Migration Script: Create auth.users for existing portal_users
-- This will create proper Supabase Auth users for all portal_users

-- First, let's see what portal_users exist but NOT in auth.users
SELECT
  p.email,
  p.full_name,
  p.role,
  p.agency_id,
  'Missing from auth.users' as status
FROM portal_users p
LEFT JOIN auth.users a ON p.email = a.email
WHERE a.id IS NULL
ORDER BY p.agency_id, p.email;

-- For each missing user, you need to create them in auth.users
-- Since we can't do this directly in SQL, here are the users that need to be created:

-- Option 1: Use the Super Admin Dashboard to create each user
-- Option 2: Ask Supabase Assistant to create them with this info:

/*
Users to create with password 'Test1234!':

Demo Agency (agency_id: a2222222):
- admin@demo.com (role: admin)
- manager@demo.com (role: manager)
- service@demo.com (role: customer_service)
- agent@demo.com (role: agent)

Platinum Health Solutions (agency_id: a3333333):
- admin@phsagency.com (role: admin)
- manager@phsagency.com (role: manager)
- agent1@phsagency.com (role: agent)
*/

-- After creating them in auth.users, run this to link them:
UPDATE portal_users p
SET
  auth_user_id = a.id,
  updated_at = NOW()
FROM auth.users a
WHERE p.email = a.email
  AND p.auth_user_id IS NULL;