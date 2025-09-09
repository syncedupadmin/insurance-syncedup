-- PRODUCTION DATABASE CLEANUP: Remove orphaned records with invalid agency_ids
-- CRITICAL: Only valid agency_ids should exist in portal_users

-- Step 1: Identify valid agency_ids that should exist
-- Valid agency_ids are:
-- a1111111-1111-1111-1111-111111111111 (SYSTEM)
-- a2222222-2222-2222-2222-222222222222 (DEMO001)  
-- a3333333-3333-3333-3333-333333333333 (PHS001)

-- Step 2: Create agencies table records for valid agency_ids if they don't exist
INSERT INTO agencies (id, agency_id, agency_name, is_active, created_at, updated_at)
VALUES 
    ('a1111111-1111-1111-1111-111111111111', 'SYSTEM', 'SyncedUp System', true, NOW(), NOW()),
    ('a2222222-2222-2222-2222-222222222222', 'DEMO001', 'Demo Agency', true, NOW(), NOW()),
    ('a3333333-3333-3333-3333-333333333333', 'PHS001', 'PHS Insurance Agency', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW(),
    is_active = true;

-- Step 3: Identify orphaned users (users with invalid agency_ids)
-- First, let's see what we have
SELECT 
    'BEFORE CLEANUP' as status,
    agency_id,
    COUNT(*) as user_count,
    STRING_AGG(email, ', ') as emails
FROM portal_users 
GROUP BY agency_id
ORDER BY user_count DESC;

-- Step 4: Create a backup of users that will be affected
CREATE TABLE IF NOT EXISTS portal_users_backup_orphaned AS
SELECT * FROM portal_users 
WHERE agency_id NOT IN (
    'a1111111-1111-1111-1111-111111111111',
    'a2222222-2222-2222-2222-222222222222', 
    'a3333333-3333-3333-3333-333333333333'
);

-- Step 5: Log the cleanup action in audit_logs (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        INSERT INTO audit_logs (
            user_id, agency_id, action, resource_type, 
            details, timestamp
        ) 
        SELECT 
            NULL,
            'SYSTEM',
            'CLEANUP_ORPHANED_USERS',
            'portal_users',
            'Cleaning up users with invalid agency_ids: ' || STRING_AGG(agency_id, ', '),
            NOW()
        FROM (
            SELECT DISTINCT agency_id 
            FROM portal_users 
            WHERE agency_id NOT IN (
                'a1111111-1111-1111-1111-111111111111',
                'a2222222-2222-2222-2222-222222222222', 
                'a3333333-3333-3333-3333-333333333333'
            )
        ) invalid_agencies;
    END IF;
END $$;

-- Step 6: Option A - DELETE orphaned users (DESTRUCTIVE)
-- Uncomment the next block to DELETE orphaned users
/*
DELETE FROM portal_users 
WHERE agency_id NOT IN (
    'a1111111-1111-1111-1111-111111111111',
    'a2222222-2222-2222-2222-222222222222', 
    'a3333333-3333-3333-3333-333333333333'
);
*/

-- Step 6: Option B - MOVE orphaned users to DEMO001 agency (SAFER)
-- Uncomment the next block to move orphaned users to DEMO001
/*
UPDATE portal_users 
SET 
    agency_id = 'a2222222-2222-2222-2222-222222222222',
    updated_at = NOW()
WHERE agency_id NOT IN (
    'a1111111-1111-1111-1111-111111111111',
    'a2222222-2222-2222-2222-222222222222', 
    'a3333333-3333-3333-3333-333333333333'
);
*/

-- Step 6: Option C - DEACTIVATE orphaned users (SAFEST)
-- This is the default action - deactivate users with invalid agency_ids
UPDATE portal_users 
SET 
    is_active = false,
    deactivated_at = NOW(),
    updated_at = NOW()
WHERE agency_id NOT IN (
    'a1111111-1111-1111-1111-111111111111',
    'a2222222-2222-2222-2222-222222222222', 
    'a3333333-3333-3333-3333-333333333333'
)
AND is_active = true;

-- Step 7: Verify cleanup results
SELECT 
    'AFTER CLEANUP' as status,
    agency_id,
    COUNT(*) as user_count,
    COUNT(CASE WHEN is_active THEN 1 END) as active_users,
    COUNT(CASE WHEN NOT is_active THEN 1 END) as inactive_users,
    STRING_AGG(CASE WHEN is_active THEN email END, ', ') as active_emails
FROM portal_users 
GROUP BY agency_id
ORDER BY user_count DESC;

-- Step 8: Show summary
SELECT 
    'CLEANUP SUMMARY' as status,
    COUNT(*) as total_users,
    COUNT(CASE WHEN is_active THEN 1 END) as active_users,
    COUNT(CASE WHEN NOT is_active THEN 1 END) as deactivated_users,
    COUNT(CASE WHEN agency_id IN (
        'a1111111-1111-1111-1111-111111111111',
        'a2222222-2222-2222-2222-222222222222', 
        'a3333333-3333-3333-3333-333333333333'
    ) THEN 1 END) as valid_agency_users,
    COUNT(CASE WHEN agency_id NOT IN (
        'a1111111-1111-1111-1111-111111111111',
        'a2222222-2222-2222-2222-222222222222', 
        'a3333333-3333-3333-3333-333333333333'
    ) THEN 1 END) as orphaned_users
FROM portal_users;

-- Success message
SELECT 'Database cleanup completed successfully! Orphaned users have been deactivated and backed up.' as result;