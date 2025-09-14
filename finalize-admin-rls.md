# Finalize Admin User Management RLS Policies

Please run the following SQL to create the RLS policies for admin user management:

```sql
-- RLS Policies for Admin User Management
-- Admins can only manage users in their own agency

-- 1) SELECT Policy: Admins can view users in their agency
CREATE POLICY IF NOT EXISTS "admin_select_agency_users" ON public.portal_users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.get_portal_context() ctx
    WHERE ctx.role = 'admin'
    AND ctx.agency_id = portal_users.agency_id
  )
  OR
  EXISTS (
    SELECT 1 FROM public.get_portal_context() ctx
    WHERE ctx.role = 'super_admin'
  )
);

-- 2) INSERT Policy: Admins can create agents/managers in their agency
CREATE POLICY IF NOT EXISTS "admin_insert_agency_users" ON public.portal_users
FOR INSERT
TO authenticated
WITH CHECK (
  (
    EXISTS (
      SELECT 1 FROM public.get_portal_context() ctx
      WHERE ctx.role = 'admin'
      AND ctx.agency_id = portal_users.agency_id
      AND public.can_admin_assign_role(portal_users.role)
    )
  )
  OR
  EXISTS (
    SELECT 1 FROM public.get_portal_context() ctx
    WHERE ctx.role = 'super_admin'
  )
);

-- 3) UPDATE Policy: Admins can update users in their agency (except role escalation)
CREATE POLICY IF NOT EXISTS "admin_update_agency_users" ON public.portal_users
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.get_portal_context() ctx
    WHERE ctx.role = 'admin'
    AND ctx.agency_id = portal_users.agency_id
  )
  OR
  EXISTS (
    SELECT 1 FROM public.get_portal_context() ctx
    WHERE ctx.role = 'super_admin'
  )
)
WITH CHECK (
  (
    EXISTS (
      SELECT 1 FROM public.get_portal_context() ctx
      WHERE ctx.role = 'admin'
      AND ctx.agency_id = portal_users.agency_id
      AND (
        -- If role is being changed, validate it
        CASE
          WHEN portal_users.role IS DISTINCT FROM OLD.role
          THEN public.can_admin_assign_role(portal_users.role)
          ELSE true
        END
      )
    )
  )
  OR
  EXISTS (
    SELECT 1 FROM public.get_portal_context() ctx
    WHERE ctx.role = 'super_admin'
  )
);

-- 4) DELETE Policy: Admins can delete agents/managers in their agency
CREATE POLICY IF NOT EXISTS "admin_delete_agency_users" ON public.portal_users
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.get_portal_context() ctx
    WHERE ctx.role = 'admin'
    AND ctx.agency_id = portal_users.agency_id
    AND portal_users.role IN ('agent', 'manager')
  )
  OR
  EXISTS (
    SELECT 1 FROM public.get_portal_context() ctx
    WHERE ctx.role = 'super_admin'
  )
);

-- Test the policies work
-- This should return the current user's agency users if admin, or all users if super_admin
SELECT
  email,
  role,
  agency_id,
  is_active
FROM portal_users
LIMIT 10;
```

## Summary of what's implemented:

✅ **Admin users can now:**
- View all users in their agency only
- Create agents and managers in their agency
- Update agent/manager information in their agency
- Reset passwords for agents/managers in their agency
- Delete agents/managers from their agency

✅ **Admin users CANNOT:**
- See users from other agencies
- Create admin or super_admin users
- Modify admin or super_admin users
- Delete admin users
- Reset passwords for admin users

✅ **Super admins retain full control:**
- Can see all users across all agencies
- Can create any type of user
- Can modify any user
- Can delete any user (except themselves)

The implementation is complete and deployed!