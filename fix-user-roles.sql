-- Fix PHSAgency user roles
-- admin@phsagency.com should be 'admin'
-- manager@phsagency.com should be 'manager'
-- agent1@phsagency.com should be 'agent'

UPDATE portal_users 
SET role = 'admin' 
WHERE email = 'admin@phsagency.com';

UPDATE portal_users 
SET role = 'manager' 
WHERE email = 'manager@phsagency.com';

-- agent1@phsagency.com is already 'agent', which is correct

-- Verify the changes
SELECT email, role, name 
FROM portal_users 
WHERE email LIKE '%phsagency%'
ORDER BY email;