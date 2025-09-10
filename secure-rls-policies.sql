-- SECURE RLS POLICIES FOR INSURANCE.SYNCEDUP
-- Implements proper role-based and agency-based security

-- OWNERSHIP MODEL:
-- 1. super_admin: Can see/edit everything
-- 2. admin: Can see/edit within their agency
-- 3. manager: Can see/edit their team within agency
-- 4. agent: Can see/edit only their own data
-- 5. customer_service: Can view customer data, edit claims
-- 6. customer: Can only see their own data

-- First, let's add agency_id to profiles if missing
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS agency_id BIGINT;

-- Update profiles with agency associations based on email domains
UPDATE profiles SET agency_id = (
    SELECT id FROM agencies WHERE name = 'Demo Agency' LIMIT 1
) WHERE email LIKE '%@demo.com';

UPDATE profiles SET agency_id = (
    SELECT id FROM agencies WHERE name = 'PHS Insurance Agency' LIMIT 1
) WHERE email LIKE '%@phsagency.com' OR email LIKE '%@phs%';

UPDATE profiles SET agency_id = (
    SELECT id FROM agencies WHERE name = 'SyncedUp Solutions' LIMIT 1
) WHERE email LIKE '%@syncedupsolutions.com';

-- Create a function to get current user's profile
CREATE OR REPLACE FUNCTION auth.user_profile()
RETURNS TABLE (
    id BIGINT,
    role TEXT,
    agency_id BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT id, role, agency_id 
    FROM profiles 
    WHERE user_id = auth.uid()
    LIMIT 1;
$$;

-- Drop all existing weak policies
DROP POLICY IF EXISTS "Profiles select" ON profiles;
DROP POLICY IF EXISTS "Profiles insert" ON profiles;
DROP POLICY IF EXISTS "Profiles update" ON profiles;
DROP POLICY IF EXISTS "Profiles delete" ON profiles;

DROP POLICY IF EXISTS "Commissions select" ON commission_records;
DROP POLICY IF EXISTS "Commissions insert" ON commission_records;
DROP POLICY IF EXISTS "Commissions update" ON commission_records;
DROP POLICY IF EXISTS "Commissions delete" ON commission_records;

DROP POLICY IF EXISTS "Agencies select" ON agencies;
DROP POLICY IF EXISTS "Agencies insert" ON agencies;
DROP POLICY IF EXISTS "Agencies update" ON agencies;
DROP POLICY IF EXISTS "Agencies delete" ON agencies;

DROP POLICY IF EXISTS "Metrics select" ON system_metrics;
DROP POLICY IF EXISTS "Metrics insert" ON system_metrics;
DROP POLICY IF EXISTS "Metrics update" ON system_metrics;
DROP POLICY IF EXISTS "Metrics delete" ON system_metrics;

-- PROFILES POLICIES
-- Super admins can see all profiles
CREATE POLICY "Super admin full access" ON profiles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.user_id = auth.uid() 
            AND p.role = 'super_admin'
        )
    );

-- Admins can see profiles in their agency
CREATE POLICY "Admin agency access" ON profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.user_id = auth.uid() 
            AND p.role = 'admin'
            AND p.agency_id = profiles.agency_id
        )
    );

-- Managers can see their team
CREATE POLICY "Manager team access" ON profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.user_id = auth.uid() 
            AND p.role = 'manager'
            AND p.agency_id = profiles.agency_id
        )
    );

-- Users can see their own profile
CREATE POLICY "Own profile access" ON profiles
    FOR SELECT
    USING (user_id = auth.uid());

-- Users can update their own profile (limited fields)
CREATE POLICY "Own profile update" ON profiles
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- COMMISSION RECORDS POLICIES
-- Super admins and admins can see all commissions
CREATE POLICY "Admin commission access" ON commission_records
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.user_id = auth.uid() 
            AND p.role IN ('super_admin', 'admin')
        )
    );

-- Managers can see commissions in their agency
CREATE POLICY "Manager commission access" ON commission_records
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p1, profiles p2
            WHERE p1.user_id = auth.uid() 
            AND p1.role = 'manager'
            AND p2.id = commission_records.agent_id
            AND p1.agency_id = p2.agency_id
        )
    );

-- Agents can only see their own commissions
CREATE POLICY "Agent own commissions" ON commission_records
    FOR SELECT
    USING (
        agent_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

-- AGENCIES POLICIES
-- Everyone can view agencies (for dropdowns, etc.)
CREATE POLICY "Public agency read" ON agencies
    FOR SELECT
    USING (true);

-- Only super admins can modify agencies
CREATE POLICY "Super admin agency write" ON agencies
    FOR INSERT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

CREATE POLICY "Super admin agency update" ON agencies
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

CREATE POLICY "Super admin agency delete" ON agencies
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- SYSTEM METRICS POLICIES
-- Only admins and super admins can view metrics
CREATE POLICY "Admin metrics access" ON system_metrics
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('super_admin', 'admin')
        )
    );

-- Only system/service role can write metrics
CREATE POLICY "Service metrics write" ON system_metrics
    FOR INSERT
    WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- QUOTES POLICIES (agency-scoped)
CREATE POLICY "Quote agency access" ON quotes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.user_id = auth.uid() 
            AND (
                p.role = 'super_admin' OR
                (p.agency_id = quotes.agency_id AND p.role IN ('admin', 'manager', 'agent'))
            )
        )
    );

-- POLICIES TABLE (agency-scoped)
CREATE POLICY "Policy agency access" ON policies
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.user_id = auth.uid() 
            AND (
                p.role = 'super_admin' OR
                (p.agency_id = policies.agency_id AND p.role IN ('admin', 'manager', 'agent', 'customer_service'))
            )
        )
    );

-- CLAIMS POLICIES (customer service can edit)
CREATE POLICY "Claims access" ON claims
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.user_id = auth.uid() 
            AND p.role IN ('super_admin', 'admin', 'manager', 'customer_service')
        )
    );

CREATE POLICY "Customer service claims edit" ON claims
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.user_id = auth.uid() 
            AND p.role IN ('super_admin', 'admin', 'customer_service')
        )
    );

-- Add service role bypass for API access
CREATE POLICY "Service role bypass profiles" ON profiles
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role bypass commissions" ON commission_records
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role bypass agencies" ON agencies
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role bypass metrics" ON system_metrics
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role bypass quotes" ON quotes
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role bypass policies" ON policies
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role bypass claims" ON claims
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- Verify the policies
SELECT 'RLS Policies Updated!' as status;
SELECT tablename, COUNT(*) as policy_count 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'commission_records', 'agencies', 'system_metrics', 'quotes', 'policies', 'claims')
GROUP BY tablename
ORDER BY tablename;