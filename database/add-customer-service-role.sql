-- Add customer-service role to portal_users table
-- This script adds the 'customer-service' role to the existing role check constraint

-- First, let's see the current constraint (for reference)
-- SELECT conname, consrc FROM pg_constraint WHERE conname = 'portal_users_role_check';

-- Drop the existing role check constraint
ALTER TABLE portal_users DROP CONSTRAINT IF EXISTS portal_users_role_check;

-- Add the new constraint with customer-service role included
ALTER TABLE portal_users ADD CONSTRAINT portal_users_role_check 
CHECK (role IN ('agent', 'manager', 'admin', 'super-admin', 'customer-service'));

-- Optional: Add comment for documentation
COMMENT ON CONSTRAINT portal_users_role_check ON portal_users 
IS 'Allowed roles: agent, manager, admin, super-admin, customer-service';