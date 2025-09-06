-- Fix test user passwords with correct bcrypt hashes
-- Password for all test users: TestPass123!
-- Hash: $2b$10$XTURErlHRBkydPR3JnD3yOnrEecCoGLZp6L44hjpiFUY9s1k/FcC6

-- First, ensure TEST-001 agency exists
INSERT INTO agencies (
    agency_id, name, contact_email, contact_phone, address, city, state, zip, 
    plan, status, created_at, updated_at
) VALUES (
    'TEST-001', 'Test Agency LLC', 'admin@test-agency.com', '555-TEST-001',
    '123 Test Street', 'Test City', 'TX', '12345', 'professional', 'active',
    NOW(), NOW()
) ON CONFLICT (agency_id) DO UPDATE SET updated_at = NOW();

-- Create/update test users in portal_users table
INSERT INTO portal_users (
    id, email, name, role, agency_id, password_hash, active, must_change_password, login_count, created_at, updated_at
) VALUES 
(
    '11111111-1111-1111-1111-111111111111', 
    'test-admin@test.com', 
    'Test Admin User', 
    'admin', 
    'TEST-001', 
    '$2b$10$XTURErlHRBkydPR3JnD3yOnrEecCoGLZp6L44hjpiFUY9s1k/FcC6', 
    true, 
    false, 
    0, 
    NOW(), 
    NOW()
),
(
    '22222222-2222-2222-2222-222222222222', 
    'test-manager@test.com', 
    'Test Manager User', 
    'manager', 
    'TEST-001', 
    '$2b$10$XTURErlHRBkydPR3JnD3yOnrEecCoGLZp6L44hjpiFUY9s1k/FcC6', 
    true, 
    false, 
    0, 
    NOW(), 
    NOW()
),
(
    '33333333-3333-3333-3333-333333333333', 
    'test-agent@test.com', 
    'Test Agent User', 
    'agent', 
    'TEST-001', 
    '$2b$10$XTURErlHRBkydPR3JnD3yOnrEecCoGLZp6L44hjpiFUY9s1k/FcC6', 
    true, 
    false, 
    0, 
    NOW(), 
    NOW()
),
(
    '44444444-4444-4444-4444-444444444444', 
    'test-cs@test.com', 
    'Test CS User', 
    'customer_service', 
    'TEST-001', 
    '$2b$10$XTURErlHRBkydPR3JnD3yOnrEecCoGLZp6L44hjpiFUY9s1k/FcC6', 
    true, 
    false, 
    0, 
    NOW(), 
    NOW()
)
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    agency_id = EXCLUDED.agency_id,
    password_hash = EXCLUDED.password_hash,
    active = EXCLUDED.active,
    must_change_password = EXCLUDED.must_change_password,
    updated_at = NOW();

-- Also create backup entries in users table (if it exists)
INSERT INTO users (
    id, email, name, role, agency_id, password_hash, is_active, must_change_password, login_count, created_at, updated_at
) VALUES 
(
    '11111111-1111-1111-1111-111111111111', 
    'test-admin@test.com', 
    'Test Admin User', 
    'admin', 
    'TEST-001', 
    '$2b$10$XTURErlHRBkydPR3JnD3yOnrEecCoGLZp6L44hjpiFUY9s1k/FcC6', 
    true, 
    false, 
    0, 
    NOW(), 
    NOW()
),
(
    '22222222-2222-2222-2222-222222222222', 
    'test-manager@test.com', 
    'Test Manager User', 
    'manager', 
    'TEST-001', 
    '$2b$10$XTURErlHRBkydPR3JnD3yOnrEecCoGLZp6L44hjpiFUY9s1k/FcC6', 
    true, 
    false, 
    0, 
    NOW(), 
    NOW()
),
(
    '33333333-3333-3333-3333-333333333333', 
    'test-agent@test.com', 
    'Test Agent User', 
    'agent', 
    'TEST-001', 
    '$2b$10$XTURErlHRBkydPR3JnD3yOnrEecCoGLZp6L44hjpiFUY9s1k/FcC6', 
    true, 
    false, 
    0, 
    NOW(), 
    NOW()
),
(
    '44444444-4444-4444-4444-444444444444', 
    'test-cs@test.com', 
    'Test CS User', 
    'customer_service', 
    'TEST-001', 
    '$2b$10$XTURErlHRBkydPR3JnD3yOnrEecCoGLZp6L44hjpiFUY9s1k/FcC6', 
    true, 
    false, 
    0, 
    NOW(), 
    NOW()
)
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    agency_id = EXCLUDED.agency_id,
    password_hash = EXCLUDED.password_hash,
    is_active = EXCLUDED.is_active,
    must_change_password = EXCLUDED.must_change_password,
    updated_at = NOW();