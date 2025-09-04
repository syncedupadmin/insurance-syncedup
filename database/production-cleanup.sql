-- Production Data Cleanup Script
-- This script removes all fake/test data while preserving only demo accounts (@demo.com)
-- and ensures a clean slate for live agency integration

-- WARNING: This will permanently delete non-demo data. Run with caution.

BEGIN;

-- ===========================================
-- 1. PRESERVE DEMO ACCOUNTS AND DEMO001 AGENCY
-- ===========================================

-- Mark demo users for preservation
CREATE TEMP TABLE demo_users AS
SELECT id, email, role, name
FROM portal_users 
WHERE email LIKE '%@demo.com' 
   OR email = 'superadmin@demo.com'
   OR email = 'admin@syncedupsolutions.com';

-- Get demo user IDs for reference
CREATE TEMP TABLE demo_user_ids AS
SELECT id FROM demo_users;

-- ===========================================
-- 2. CLEAN LEADS DATA
-- ===========================================

-- Delete all leads data except demo leads (DEMO_LEAD_* pattern)
DELETE FROM convoso_leads 
WHERE lead_id NOT LIKE 'DEMO_LEAD_%'
   OR lead_id NOT LIKE 'DEMO%'
   OR agent_assignment NOT IN (SELECT id FROM demo_user_ids);

-- Clean lead analytics table
DELETE FROM lead_analytics 
WHERE date < CURRENT_DATE - INTERVAL '90 days'
   OR source NOT IN ('convoso', 'demo');

-- Clean lead activity logs for non-demo leads
DELETE FROM lead_activity_log 
WHERE lead_id NOT LIKE 'DEMO_LEAD_%'
   OR agent_id NOT IN (SELECT id FROM demo_user_ids);

-- Clean agent assignments for non-demo data
DELETE FROM agent_lead_assignments 
WHERE lead_id NOT LIKE 'DEMO_LEAD_%'
   OR agent_id NOT IN (SELECT id FROM demo_user_ids);

-- ===========================================
-- 3. CLEAN COMMISSION DATA  
-- ===========================================

-- Delete all commission records except demo commissions (DEMO_SALE_* pattern)
DELETE FROM portal_commissions 
WHERE sale_id NOT LIKE 'DEMO_SALE_%'
   OR agency_id != 'DEMO001'
   OR agent_id NOT IN (SELECT id FROM demo_user_ids);

-- ===========================================
-- 4. CLEAN SUPPORT TICKETS
-- ===========================================

-- Delete all support tickets except demo tickets (TKT-DEMO-* pattern)
DELETE FROM support_tickets 
WHERE ticket_number NOT LIKE 'TKT-DEMO-%'
   OR agency_id != 'DEMO001'
   OR created_by NOT IN (SELECT id FROM demo_user_ids);

-- ===========================================
-- 5. CLEAN SALES DATA
-- ===========================================

-- Delete all sales records except demo sales
DELETE FROM portal_sales 
WHERE sale_id NOT LIKE 'DEMO_SALE_%'
   OR agency_id != 'DEMO001'
   OR agent_id NOT IN (SELECT id FROM demo_user_ids);

-- ===========================================
-- 6. CLEAN USER-RELATED DATA
-- ===========================================

-- Delete all non-demo users (preserve only @demo.com emails)
DELETE FROM portal_users 
WHERE email NOT LIKE '%@demo.com' 
  AND email != 'admin@syncedupsolutions.com'
  AND role != 'super_admin';

-- Clean user sessions/tokens for deleted users
DELETE FROM user_sessions 
WHERE user_id NOT IN (SELECT id FROM demo_user_ids);

-- ===========================================
-- 7. CLEAN AGENCY DATA
-- ===========================================

-- Delete all agencies except DEMO001
DELETE FROM portal_agencies 
WHERE id != 'DEMO001' 
  AND name != 'Demo Agency';

-- ===========================================
-- 8. CLEAN ANALYTICS AND REPORTING DATA
-- ===========================================

-- Clean goals data for non-demo users
DELETE FROM agent_goals 
WHERE agent_id NOT IN (SELECT id FROM demo_user_ids);

-- Clean performance tracking data
DELETE FROM agent_performance_history 
WHERE agent_id NOT IN (SELECT id FROM demo_user_ids);

-- Clean vendor data for non-demo agencies
DELETE FROM vendors 
WHERE agency_id != 'DEMO001';

-- Clean campaign data for non-demo sources
DELETE FROM campaign_performance 
WHERE campaign_id NOT LIKE 'DEMO_CAMP_%';

-- ===========================================
-- 9. CLEAN AUDIT LOGS (OPTIONAL - KEEP RECENT)
-- ===========================================

-- Keep only last 30 days of audit logs to preserve system integrity
DELETE FROM audit_logs 
WHERE created_at < CURRENT_DATE - INTERVAL '30 days'
   OR agency_id != 'DEMO001';

-- ===========================================
-- 10. UPDATE SEQUENCES AND RESET COUNTERS
-- ===========================================

-- Reset auto-increment sequences for clean production start
-- Note: Adjust table names based on your actual schema

-- Reset commission sequence if exists
SELECT setval('portal_commissions_id_seq', 1000, false);

-- Reset sales sequence if exists  
SELECT setval('portal_sales_id_seq', 1000, false);

-- Reset support tickets sequence if exists
SELECT setval('support_tickets_id_seq', 1000, false);

-- ===========================================
-- 11. VERIFY CLEANUP RESULTS
-- ===========================================

-- Verification queries to confirm cleanup
DO $$
DECLARE 
    demo_user_count INTEGER;
    demo_leads_count INTEGER;  
    demo_commissions_count INTEGER;
    demo_tickets_count INTEGER;
    demo_sales_count INTEGER;
BEGIN
    -- Count remaining demo data
    SELECT COUNT(*) INTO demo_user_count FROM portal_users WHERE email LIKE '%@demo.com';
    SELECT COUNT(*) INTO demo_leads_count FROM convoso_leads WHERE lead_id LIKE 'DEMO_LEAD_%';
    SELECT COUNT(*) INTO demo_commissions_count FROM portal_commissions WHERE sale_id LIKE 'DEMO_SALE_%';
    SELECT COUNT(*) INTO demo_tickets_count FROM support_tickets WHERE ticket_number LIKE 'TKT-DEMO-%';
    SELECT COUNT(*) INTO demo_sales_count FROM portal_sales WHERE sale_id LIKE 'DEMO_SALE_%';
    
    -- Log cleanup results
    RAISE NOTICE 'CLEANUP VERIFICATION:';
    RAISE NOTICE 'Demo users remaining: %', demo_user_count;
    RAISE NOTICE 'Demo leads remaining: %', demo_leads_count;
    RAISE NOTICE 'Demo commissions remaining: %', demo_commissions_count;
    RAISE NOTICE 'Demo tickets remaining: %', demo_tickets_count;  
    RAISE NOTICE 'Demo sales remaining: %', demo_sales_count;
    
    -- Ensure we have the expected demo data
    IF demo_user_count != 5 THEN
        RAISE EXCEPTION 'Expected 5 demo users, found %', demo_user_count;
    END IF;
END $$;

-- ===========================================
-- 12. PRODUCTION READINESS CHECKS
-- ===========================================

-- Verify no production data exists
DO $$
DECLARE
    non_demo_users INTEGER;
    non_demo_commissions INTEGER;
    non_demo_tickets INTEGER;
BEGIN
    -- Check for any non-demo users
    SELECT COUNT(*) INTO non_demo_users 
    FROM portal_users 
    WHERE email NOT LIKE '%@demo.com' 
      AND email != 'admin@syncedupsolutions.com';
    
    -- Check for any non-demo commissions
    SELECT COUNT(*) INTO non_demo_commissions 
    FROM portal_commissions 
    WHERE sale_id NOT LIKE 'DEMO_SALE_%';
    
    -- Check for any non-demo tickets
    SELECT COUNT(*) INTO non_demo_tickets 
    FROM support_tickets 
    WHERE ticket_number NOT LIKE 'TKT-DEMO-%';
    
    -- Verify clean state
    IF non_demo_users > 0 THEN
        RAISE EXCEPTION 'Found % non-demo users remaining', non_demo_users;
    END IF;
    
    IF non_demo_commissions > 0 THEN
        RAISE EXCEPTION 'Found % non-demo commissions remaining', non_demo_commissions;
    END IF;
    
    IF non_demo_tickets > 0 THEN
        RAISE EXCEPTION 'Found % non-demo tickets remaining', non_demo_tickets;
    END IF;
    
    RAISE NOTICE 'PRODUCTION READINESS: VERIFIED ✓';
    RAISE NOTICE 'System is clean and ready for live data integration';
END $$;

-- Drop temporary tables
DROP TABLE IF EXISTS demo_users;
DROP TABLE IF EXISTS demo_user_ids;

COMMIT;

-- ===========================================
-- POST-CLEANUP RECOMMENDATIONS
-- ===========================================

/*
After running this cleanup script:

1. Verify all dashboards show "No data" states appropriately
2. Test that demo accounts still function correctly  
3. Ensure API endpoints handle empty data gracefully
4. Confirm analytics show zero/empty states
5. Test live data integration endpoints
6. Update any hardcoded demo data in API responses

Remember to:
- Backup your database before running this script
- Run in a test environment first
- Verify demo functionality after cleanup
- Monitor logs for any issues with empty states
*/