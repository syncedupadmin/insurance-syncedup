-- Create a public wrapper for the private.list_tables_simple function
-- This is safe and maintains security

create or replace function public.list_tables_simple()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select private.list_tables_simple();
$$;

-- Revoke all permissions by default
revoke all on function public.list_tables_simple() from public, anon, authenticated;

-- Grant execute only to service_role (used by Edge Functions)
grant execute on function public.list_tables_simple() to service_role;

-- This creates a secure public wrapper that:
-- 1. Only the Edge Function (service_role) can call
-- 2. Executes with definer privileges
-- 3. Has empty search_path for security
-- 4. Simply delegates to the private function