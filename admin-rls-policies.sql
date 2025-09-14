-- RLS Policies for Admin User Management
-- Admins can only manage users in their own agency

-- 1) SELECT Policy: Admins can view users in their agency
CREATE POLICY "admin_select_agency_users" ON public.portal_users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.get_portal_context() ctx
    WHERE ctx.role = 'admin'
    AND ctx.agency_id = portal_users.agency_id
  )
);

-- 2) INSERT Policy: Admins can create agents/managers in their agency
CREATE POLICY "admin_insert_agency_users" ON public.portal_users
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.get_portal_context() ctx
    WHERE ctx.role = 'admin'
    AND ctx.agency_id = portal_users.agency_id
    AND public.can_admin_assign_role(portal_users.role)
  )
);

-- 3) UPDATE Policy: Admins can update users in their agency (except role escalation)
CREATE POLICY "admin_update_agency_users" ON public.portal_users
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.get_portal_context() ctx
    WHERE ctx.role = 'admin'
    AND ctx.agency_id = portal_users.agency_id
  )
)
WITH CHECK (
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
);

-- 4) DELETE Policy: Admins can delete agents/managers in their agency
CREATE POLICY "admin_delete_agency_users" ON public.portal_users
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.get_portal_context() ctx
    WHERE ctx.role = 'admin'
    AND ctx.agency_id = portal_users.agency_id
    AND portal_users.role IN ('agent', 'manager')
  )
);

-- 5) Function for password reset scoping
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(target_user_id uuid, new_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  ctx record;
  target_agency text;
BEGIN
  -- Get admin's context
  SELECT * INTO ctx FROM public.get_portal_context();

  -- Check if caller is admin
  IF ctx.role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get target user's agency
  SELECT agency_id INTO target_agency
  FROM public.portal_users
  WHERE auth_user_id = target_user_id;

  -- Check if target user is in admin's agency
  IF target_agency != ctx.agency_id THEN
    RAISE EXCEPTION 'Unauthorized: User not in your agency';
  END IF;

  -- Update password in auth.users (requires service role in actual implementation)
  -- This is a placeholder - actual password update would be done via Edge Function
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(uuid, text) TO authenticated;