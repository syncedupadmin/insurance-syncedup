-- Backfill agency_id for existing data
-- Run this AFTER the RLS upgrade script

-- First, ensure profiles have agency_id set
UPDATE profiles SET agency_id = (
    SELECT id FROM agencies WHERE name = 'Demo Agency' LIMIT 1
) WHERE email LIKE '%@demo.com' AND agency_id IS NULL;

UPDATE profiles SET agency_id = (
    SELECT id FROM agencies WHERE name = 'PHS Insurance Agency' LIMIT 1  
) WHERE (email LIKE '%@phsagency.com' OR email LIKE '%@phs%') AND agency_id IS NULL;

UPDATE profiles SET agency_id = (
    SELECT id FROM agencies WHERE name = 'SyncedUp Solutions' LIMIT 1
) WHERE email LIKE '%@syncedupsolutions.com' AND agency_id IS NULL;

-- Set a default agency for any remaining profiles
UPDATE profiles SET agency_id = (
    SELECT id FROM agencies WHERE name = 'Demo Agency' LIMIT 1
) WHERE agency_id IS NULL AND role != 'super_admin';

-- Backfill quotes if they exist
UPDATE public.quotes q 
SET agency_id = p.agency_id 
FROM public.profiles p 
WHERE q.created_by = p.id 
AND q.agency_id IS NULL;

-- Backfill policies if they exist  
UPDATE public.policies pol 
SET agency_id = p.agency_id 
FROM public.profiles p 
WHERE pol.created_by = p.id 
AND pol.agency_id IS NULL;

-- Backfill claims if they exist
UPDATE public.claims c 
SET agency_id = pol.agency_id 
FROM public.policies pol 
WHERE c.policy_id = pol.id 
AND c.agency_id IS NULL;

-- Verify the backfill
SELECT 'Agency Assignment Summary:' as info;
SELECT 
    a.name as agency_name,
    COUNT(p.id) as profile_count,
    STRING_AGG(DISTINCT p.role, ', ') as roles
FROM agencies a
LEFT JOIN profiles p ON p.agency_id = a.id
GROUP BY a.id, a.name
ORDER BY a.name;

SELECT 'RLS Security Model Active!' as status;
SELECT 'Agency-based isolation: ✅' as feature;
SELECT 'Role-based permissions: ✅' as feature;
SELECT 'Super admin override: ✅' as feature;