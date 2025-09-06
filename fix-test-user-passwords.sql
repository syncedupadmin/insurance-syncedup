-- Fix Test User Passwords
-- Update the test users to have simple plain text passwords for now

-- Update test users to not have password hashes (will use plain text fallback)
UPDATE portal_users SET password_hash = NULL WHERE email IN (
    'test-admin@test.com',
    'test-manager@test.com', 
    'test-agent@test.com',
    'test-cs@test.com',
    'test-super@test.com'
);

-- Verify the test users exist
SELECT email, name, role, agency_id, active FROM portal_users WHERE email LIKE 'test-%@test.com';

-- Also create these users in the 'users' table as backup (some APIs might check there)
INSERT INTO users (
    id, email, name, role, agency_id, is_active, created_at, updated_at
) VALUES 
('11111111-1111-1111-1111-111111111111', 'test-admin@test.com', 'Test Admin User', 'admin', 'TEST-001', true, NOW(), NOW()),
('22222222-2222-2222-2222-222222222222', 'test-manager@test.com', 'Test Manager User', 'manager', 'TEST-001', true, NOW(), NOW()),
('33333333-3333-3333-3333-333333333333', 'test-agent@test.com', 'Test Agent User', 'agent', 'TEST-001', true, NOW(), NOW()),
('44444444-4444-4444-4444-444444444444', 'test-cs@test.com', 'Test CS User', 'customer_service', 'TEST-001', true, NOW(), NOW()),
('55555555-5555-5555-5555-555555555555', 'test-super@test.com', 'Test Super Admin', 'super_admin', NULL, true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    agency_id = EXCLUDED.agency_id,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Verify both tables have the test users
SELECT 'portal_users' as table_name, email, role, active as is_active FROM portal_users WHERE email LIKE 'test-%@test.com'
UNION ALL
SELECT 'users' as table_name, email, role, is_active FROM users WHERE email LIKE 'test-%@test.com'
ORDER BY table_name, email;