-- Simplified Row Level Security Setup for SyncedUp Insurance
-- This approach uses simpler policies that work better with JWT authentication

-- Enable RLS on core tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chargebacks ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Allow public read access for authentication (login process needs to read user data)
CREATE POLICY "Public users can read for auth" ON users
  FOR SELECT USING (true);

-- Prevent unauthorized modifications to users table
CREATE POLICY "Only service can modify users" ON users
  FOR ALL USING (false);

-- Sales table policies
-- Agents can only see their own sales, admins can see all
CREATE POLICY "Agents see own sales only" ON sales
  FOR SELECT USING (
    agent_id = current_setting('app.current_agent_id', true)::uuid
    OR 
    current_setting('app.current_user_role', true) = 'admin'
  );

-- Agents can only insert sales with their own agent_id
CREATE POLICY "Agents create own sales only" ON sales
  FOR INSERT WITH CHECK (
    agent_id = current_setting('app.current_agent_id', true)::uuid
    OR 
    current_setting('app.current_user_role', true) = 'admin'
  );

-- Agents can only update their own sales
CREATE POLICY "Agents update own sales only" ON sales
  FOR UPDATE USING (
    agent_id = current_setting('app.current_agent_id', true)::uuid
    OR 
    current_setting('app.current_user_role', true) = 'admin'
  );

-- Commissions table policies
CREATE POLICY "Agents see own commissions only" ON commissions
  FOR SELECT USING (
    agent_id = current_setting('app.current_agent_id', true)::uuid
    OR 
    current_setting('app.current_user_role', true) = 'admin'
  );

-- Chargebacks table policies  
CREATE POLICY "Agents see own chargebacks only" ON chargebacks
  FOR SELECT USING (
    agent_id = current_setting('app.current_agent_id', true)::uuid
    OR 
    current_setting('app.current_user_role', true) = 'admin'
  );

-- Helper function to set current user context from JWT
-- This function should be called by your middleware after JWT verification
CREATE OR REPLACE FUNCTION set_current_user_context(user_id UUID, user_role TEXT)
RETURNS void AS $$
BEGIN
  -- Set the current agent ID and role for RLS policies
  PERFORM set_config('app.current_agent_id', user_id::text, true);
  PERFORM set_config('app.current_user_role', user_role, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION set_current_user_context(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION set_current_user_context(UUID, TEXT) TO service_role;

-- Optional: Create view for easier agent access to their own data
CREATE OR REPLACE VIEW agent_dashboard AS
SELECT 
  u.name as agent_name,
  u.email as agent_email,
  COUNT(s.id) as total_sales,
  COALESCE(SUM(c.amount), 0) as total_commissions,
  COALESCE(SUM(ch.amount), 0) as total_chargebacks
FROM users u
LEFT JOIN sales s ON u.id = s.agent_id
LEFT JOIN commissions c ON u.id = c.agent_id  
LEFT JOIN chargebacks ch ON u.id = ch.agent_id
WHERE u.id = current_setting('app.current_agent_id', true)::uuid
GROUP BY u.id, u.name, u.email;

-- Grant access to the dashboard view
GRANT SELECT ON agent_dashboard TO authenticated;
GRANT SELECT ON agent_dashboard TO service_role;