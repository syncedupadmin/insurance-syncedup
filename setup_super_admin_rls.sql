-- SUPER ADMIN RLS SETUP
-- This creates Row Level Security policies for super admin access

-- Step 1: Create helper function to check super_admin role
CREATE OR REPLACE FUNCTION is_super_admin() 
RETURNS boolean AS $$
BEGIN
  -- Check both methods: JWT metadata and portal_users table
  RETURN (
    -- Method 1: Check JWT app_metadata (Supabase Auth)
    (auth.jwt() -> 'app_metadata' ->> 'user_role' = 'super_admin')
    OR
    -- Method 2: Check portal_users table (current system)
    EXISTS (
      SELECT 1 FROM portal_users 
      WHERE email = auth.jwt() ->> 'email' 
      AND role = 'super_admin'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Grant super_admin full access to portal_users
CREATE POLICY "Super admin can read all users" 
ON portal_users FOR SELECT 
TO authenticated 
USING (is_super_admin());

CREATE POLICY "Super admin can insert users" 
ON portal_users FOR INSERT 
TO authenticated 
WITH CHECK (is_super_admin());

CREATE POLICY "Super admin can update users" 
ON portal_users FOR UPDATE 
TO authenticated 
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Super admin can delete users" 
ON portal_users FOR DELETE 
TO authenticated 
USING (is_super_admin());

-- Step 3: Grant super_admin full access to audit_logs
CREATE POLICY "Super admin can read audit logs" 
ON audit_logs FOR SELECT 
TO authenticated 
USING (is_super_admin());

CREATE POLICY "Super admin can insert audit logs" 
ON audit_logs FOR INSERT 
TO authenticated 
WITH CHECK (is_super_admin());

-- Step 4: Grant super_admin access to agencies table (if exists)
CREATE POLICY "Super admin can manage agencies" 
ON agencies FOR ALL 
TO authenticated 
USING (is_super_admin());

-- Step 5: Create Edge Function endpoint for user management
-- This should be deployed as a Supabase Edge Function
-- File: supabase/functions/admin-api/index.ts

-- Step 6: Update super admin user in auth.users (Supabase Auth)
-- This ensures the user has proper role in JWT
UPDATE auth.users 
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'), 
  '{user_role}', 
  '"super_admin"'
)
WHERE email = 'admin@syncedupsolutions.com';

-- Step 7: Ensure portal_users has super_admin role (backup)
UPDATE portal_users 
SET role = 'super_admin'
WHERE email = 'admin@syncedupsolutions.com';

-- Step 8: Create index for performance
CREATE INDEX IF NOT EXISTS idx_portal_users_email_role 
ON portal_users(email, role);

-- Verify the setup
SELECT 
  'Auth User' as source,
  email,
  raw_app_meta_data ->> 'user_role' as role
FROM auth.users
WHERE email = 'admin@syncedupsolutions.com'
UNION ALL
SELECT 
  'Portal User' as source,
  email,
  role
FROM portal_users
WHERE email = 'admin@syncedupsolutions.com';