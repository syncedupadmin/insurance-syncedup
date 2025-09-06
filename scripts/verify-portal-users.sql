-- Verify portal users after seeding
SELECT 
  email,
  role, 
  is_active,
  agency_id,
  full_name,
  created_at
FROM portal_users 
WHERE email IN (
  'admin@syncedupsolutions.com',
  'admin@demo.com', 
  'manager@demo.com',
  'agent@demo.com', 
  'service@demo.com'
)
ORDER BY 
  CASE role
    WHEN 'super_admin' THEN 1
    WHEN 'admin' THEN 2  
    WHEN 'manager' THEN 3
    WHEN 'agent' THEN 4
    WHEN 'customer_service' THEN 5
    ELSE 6
  END,
  email;