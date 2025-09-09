-- =====================================================================
-- PRODUCTION CRITICAL: Fix Database Integrity Issues
-- EXECUTE IMMEDIATELY IN SUPABASE SQL EDITOR
-- =====================================================================

-- Step 1: Create audit trail for changes
INSERT INTO audit_logs (user_id, agency_id, action, resource_type, details, timestamp)
VALUES (NULL, 'SYSTEM', 'START_DATA_INTEGRITY_FIX', 'database', 'Beginning production data integrity repair', NOW())
ON CONFLICT DO NOTHING;

-- =====================================================================
-- PROBLEM 1: FIX ORPHANED USERS WITH INVALID AGENCY_IDS
-- =====================================================================

-- First, let's see what we're dealing with
SELECT 
    'BEFORE USER FIX' as status,
    agency_id,
    COUNT(*) as user_count,
    STRING_AGG(email, ', ' ORDER BY email) as emails,
    COUNT(CASE WHEN is_active THEN 1 END) as active_count
FROM portal_users 
GROUP BY agency_id
ORDER BY user_count DESC;

-- Create valid agencies if they don't exist
INSERT INTO agencies (id, agency_id, agency_name, is_active, created_at, updated_at)
VALUES 
    ('a1111111-1111-1111-1111-111111111111', 'SYSTEM', 'SyncedUp System', true, NOW(), NOW()),
    ('a2222222-2222-2222-2222-222222222222', 'DEMO001', 'Demo Agency', true, NOW(), NOW()),
    ('a3333333-3333-3333-3333-333333333333', 'PHS001', 'PHS Insurance Agency', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW(),
    is_active = true;

-- Create backup of orphaned users before fixing
CREATE TABLE IF NOT EXISTS portal_users_backup_20250909 AS
SELECT *, NOW() as backup_timestamp 
FROM portal_users 
WHERE agency_id NOT IN (
    'a1111111-1111-1111-1111-111111111111',
    'a2222222-2222-2222-2222-222222222222', 
    'a3333333-3333-3333-3333-333333333333'
);

-- Fix orphaned users - assign them to DEMO001 agency to preserve data
UPDATE portal_users 
SET 
    agency_id = 'a2222222-2222-2222-2222-222222222222',
    updated_at = NOW()
WHERE agency_id NOT IN (
    'a1111111-1111-1111-1111-111111111111',
    'a2222222-2222-2222-2222-222222222222', 
    'a3333333-3333-3333-3333-333333333333'
);

-- Log the user fix
INSERT INTO audit_logs (user_id, agency_id, action, resource_type, details, timestamp)
SELECT 
    NULL,
    'SYSTEM',
    'FIX_ORPHANED_USERS',
    'portal_users',
    'Reassigned ' || COUNT(*) || ' orphaned users to DEMO001 agency',
    NOW()
FROM portal_users_backup_20250909;

-- =====================================================================
-- PROBLEM 2: CREATE MISSING COMMISSION RECORDS FROM SALES
-- =====================================================================

-- Check current state of sales and commissions
SELECT 
    'BEFORE COMMISSION FIX' as status,
    COUNT(*) as total_sales,
    SUM(premium) as total_premium,
    SUM(commission_amount) as total_commission_in_sales,
    (SELECT COUNT(*) FROM commissions) as existing_commission_records
FROM portal_sales;

-- Create commissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS commissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sale_id UUID REFERENCES portal_sales(id),
    agent_id UUID REFERENCES portal_users(id),
    agency_id VARCHAR(255) NOT NULL,
    
    -- Commission Details
    commission_rate DECIMAL(5,2), -- percentage
    commission_amount DECIMAL(10,2) NOT NULL,
    base_amount DECIMAL(10,2), -- premium amount commission is based on
    
    -- Commission Type
    commission_type VARCHAR(50) DEFAULT 'initial', -- initial, renewal, override, bonus
    payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, cancelled
    
    -- Payment Details
    payment_date DATE,
    payment_period VARCHAR(20), -- month/year like '2024-09'
    payment_batch_id VARCHAR(100),
    
    -- Product Information
    product_name VARCHAR(255),
    carrier VARCHAR(100),
    policy_number VARCHAR(100),
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create commission records from existing sales
INSERT INTO commissions (
    sale_id, 
    agent_id, 
    agency_id,
    commission_rate,
    commission_amount,
    base_amount,
    commission_type,
    payment_status,
    product_name,
    carrier,
    policy_number,
    payment_period,
    created_at,
    updated_at
)
SELECT 
    s.id as sale_id,
    s.agent_id,
    COALESCE(s.agency_id, u.agency_id) as agency_id, -- Use agent's agency if sale agency is null
    s.commission_rate,
    s.commission_amount,
    s.premium as base_amount,
    'initial' as commission_type,
    CASE 
        WHEN s.status = 'active' THEN 'pending'
        WHEN s.status = 'cancelled' THEN 'cancelled'
        ELSE 'pending'
    END as payment_status,
    s.product_name,
    s.carrier,
    s.policy_number,
    TO_CHAR(s.sale_date, 'YYYY-MM') as payment_period,
    s.created_at,
    NOW() as updated_at
FROM portal_sales s
LEFT JOIN portal_users u ON s.agent_id = u.id
WHERE s.commission_amount > 0
AND NOT EXISTS (
    SELECT 1 FROM commissions c WHERE c.sale_id = s.id
);

-- =====================================================================
-- PROBLEM 3: FIX ORPHANED SALES WITH NULL AGENCY_ID
-- =====================================================================

-- Check sales with null agency_id
SELECT 
    'BEFORE SALES FIX' as status,
    COUNT(*) as sales_with_null_agency,
    SUM(premium) as total_premium_orphaned,
    STRING_AGG(DISTINCT u.agency_id, ', ') as agent_agencies
FROM portal_sales s
LEFT JOIN portal_users u ON s.agent_id = u.id
WHERE s.agency_id IS NULL;

-- Create backup of sales that will be modified
CREATE TABLE IF NOT EXISTS portal_sales_backup_20250909 AS
SELECT *, NOW() as backup_timestamp 
FROM portal_sales 
WHERE agency_id IS NULL;

-- Fix sales with null agency_id - assign based on agent's agency
UPDATE portal_sales 
SET 
    agency_id = u.agency_id,
    updated_at = NOW()
FROM portal_users u
WHERE portal_sales.agent_id = u.id
AND portal_sales.agency_id IS NULL;

-- For any remaining sales without agents, assign to DEMO001
UPDATE portal_sales 
SET 
    agency_id = 'a2222222-2222-2222-2222-222222222222',
    updated_at = NOW()
WHERE agency_id IS NULL;

-- =====================================================================
-- STEP 4: ADD FOREIGN KEY CONSTRAINTS TO PREVENT FUTURE ORPHANS
-- =====================================================================

-- Add foreign key constraint for portal_users.agency_id -> agencies.id
-- Note: We'll add these as checks first, then constraints after data is clean

-- Check if we can add the constraint (all users should have valid agencies now)
SELECT 
    'CONSTRAINT CHECK' as status,
    COUNT(*) as total_users,
    COUNT(CASE WHEN u.agency_id IN (
        'a1111111-1111-1111-1111-111111111111',
        'a2222222-2222-2222-2222-222222222222', 
        'a3333333-3333-3333-3333-333333333333'
    ) THEN 1 END) as users_with_valid_agency,
    COUNT(CASE WHEN a.id IS NOT NULL THEN 1 END) as users_with_existing_agency
FROM portal_users u
LEFT JOIN agencies a ON u.agency_id = a.id;

-- Add foreign key constraints (will fail if data isn't clean)
-- Portal users must reference valid agencies
ALTER TABLE portal_users 
ADD CONSTRAINT fk_portal_users_agency_id 
FOREIGN KEY (agency_id) REFERENCES agencies(id)
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Sales must reference valid agencies  
ALTER TABLE portal_sales 
ADD CONSTRAINT fk_portal_sales_agency_id 
FOREIGN KEY (agency_id) REFERENCES agencies(id)
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Commissions must reference valid agencies
ALTER TABLE commissions 
ADD CONSTRAINT fk_commissions_agency_id 
FOREIGN KEY (agency_id) REFERENCES agencies(id)
ON DELETE RESTRICT ON UPDATE CASCADE;

-- =====================================================================
-- STEP 5: VERIFY DATABASE INTEGRITY
-- =====================================================================

-- Final verification
SELECT 
    'FINAL VERIFICATION' as status,
    'Users' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN agency_id IN (
        'a1111111-1111-1111-1111-111111111111',
        'a2222222-2222-2222-2222-222222222222', 
        'a3333333-3333-3333-3333-333333333333'
    ) THEN 1 END) as valid_agency_records,
    COUNT(CASE WHEN is_active THEN 1 END) as active_records
FROM portal_users

UNION ALL

SELECT 
    'FINAL VERIFICATION' as status,
    'Sales' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN agency_id IS NOT NULL THEN 1 END) as valid_agency_records,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_records
FROM portal_sales

UNION ALL

SELECT 
    'FINAL VERIFICATION' as status,
    'Commissions' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN agency_id IS NOT NULL THEN 1 END) as valid_agency_records,
    COUNT(CASE WHEN payment_status != 'cancelled' THEN 1 END) as active_records
FROM commissions;

-- Commission summary
SELECT 
    'COMMISSION SUMMARY' as status,
    COUNT(*) as total_commission_records,
    SUM(commission_amount) as total_commission_amount,
    COUNT(DISTINCT agent_id) as agents_with_commissions,
    COUNT(DISTINCT agency_id) as agencies_with_commissions
FROM commissions;

-- Log completion
INSERT INTO audit_logs (user_id, agency_id, action, resource_type, details, timestamp)
VALUES (NULL, 'SYSTEM', 'COMPLETE_DATA_INTEGRITY_FIX', 'database', 'Production data integrity repair completed successfully', NOW());

-- Success message
SELECT 
    'SUCCESS' as status,
    'Database integrity has been restored!' as message,
    'All orphaned records have been fixed and constraints added.' as details;

-- =====================================================================
-- EMERGENCY ROLLBACK INSTRUCTIONS (IF NEEDED)
-- =====================================================================
/*
-- IF SOMETHING GOES WRONG, RUN THESE QUERIES TO ROLLBACK:

-- Restore users from backup
INSERT INTO portal_users SELECT * FROM portal_users_backup_20250909 
ON CONFLICT (id) DO UPDATE SET 
    agency_id = EXCLUDED.agency_id,
    updated_at = EXCLUDED.updated_at;

-- Restore sales from backup  
INSERT INTO portal_sales SELECT * FROM portal_sales_backup_20250909
ON CONFLICT (id) DO UPDATE SET
    agency_id = EXCLUDED.agency_id,
    updated_at = EXCLUDED.updated_at;

-- Remove created commissions
DELETE FROM commissions WHERE created_at >= '2024-09-09';

-- Drop constraints
ALTER TABLE portal_users DROP CONSTRAINT IF EXISTS fk_portal_users_agency_id;
ALTER TABLE portal_sales DROP CONSTRAINT IF EXISTS fk_portal_sales_agency_id;
ALTER TABLE commissions DROP CONSTRAINT IF EXISTS fk_commissions_agency_id;
*/