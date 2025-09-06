-- Row Level Security Setup for SyncedUp Insurance
-- Run these commands in your Supabase SQL Editor

-- Enable RLS on the sales table
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Create policies for sales table
-- Policy 1: Agents can only see their own sales
CREATE POLICY "Agents see own sales" ON sales
  FOR SELECT 
  USING (
    -- Check if the current user is the agent or an admin
    agent_id = (SELECT id FROM users WHERE email = current_setting('app.current_user_email', true))
    OR
    (SELECT role FROM users WHERE email = current_setting('app.current_user_email', true)) = 'admin'
  );

-- Policy 2: Agents can only insert sales with their own agent_id
CREATE POLICY "Agents insert own sales" ON sales
  FOR INSERT
  WITH CHECK (
    agent_id = (SELECT id FROM users WHERE email = current_setting('app.current_user_email', true))
    OR
    (SELECT role FROM users WHERE email = current_setting('app.current_user_email', true)) = 'admin'
  );

-- Policy 3: Agents can update their own sales
CREATE POLICY "Agents update own sales" ON sales
  FOR UPDATE
  USING (
    agent_id = (SELECT id FROM users WHERE email = current_setting('app.current_user_email', true))
    OR
    (SELECT role FROM users WHERE email = current_setting('app.current_user_email', true)) = 'admin'
  )
  WITH CHECK (
    agent_id = (SELECT id FROM users WHERE email = current_setting('app.current_user_email', true))
    OR
    (SELECT role FROM users WHERE email = current_setting('app.current_user_email', true)) = 'admin'
  );

-- Enable RLS on the commissions table
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

-- Commissions policies
CREATE POLICY "Agents see own commissions" ON commissions
  FOR SELECT
  USING (
    agent_id = (SELECT id FROM users WHERE email = current_setting('app.current_user_email', true))
    OR
    (SELECT role FROM users WHERE email = current_setting('app.current_user_email', true)) = 'admin'
  );

-- Enable RLS on the chargebacks table
ALTER TABLE chargebacks ENABLE ROW LEVEL SECURITY;

-- Chargebacks policies
CREATE POLICY "Agents see own chargebacks" ON chargebacks
  FOR SELECT
  USING (
    agent_id = (SELECT id FROM users WHERE email = current_setting('app.current_user_email', true))
    OR
    (SELECT role FROM users WHERE email = current_setting('app.current_user_email', true)) = 'admin'
  );

-- Enable RLS on the cancellations table (if it exists)
-- ALTER TABLE cancellations ENABLE ROW LEVEL SECURITY;

-- Cancellations policies
-- CREATE POLICY "Agents see own cancellations" ON cancellations
--   FOR SELECT
--   USING (
--     agent_id = (SELECT id FROM users WHERE email = current_setting('app.current_user_email', true))
--     OR
--     (SELECT role FROM users WHERE email = current_setting('app.current_user_email', true)) = 'admin'
--   );

-- Create a function to set the current user context
CREATE OR REPLACE FUNCTION set_current_user_email(user_email TEXT)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_user_email', user_email, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION set_current_user_email(TEXT) TO authenticated;

-- Optional: Create a view for easier agent access
CREATE OR REPLACE VIEW agent_sales_view AS
SELECT 
  s.*,
  u.name as agent_name,
  u.email as agent_email
FROM sales s
JOIN users u ON s.agent_id = u.id
WHERE 
  s.agent_id = (SELECT id FROM users WHERE email = current_setting('app.current_user_email', true))
  OR
  (SELECT role FROM users WHERE email = current_setting('app.current_user_email', true)) = 'admin';

-- Grant access to the view
GRANT SELECT ON agent_sales_view TO authenticated;