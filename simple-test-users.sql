-- Simple test user creation - run these one at a time if needed
-- Password: TestPass123!

-- Step 1: Create agency
INSERT INTO agencies (agency_id, name, contact_email, plan, status, created_at, updated_at) 
VALUES ('TEST-001', 'Test Agency LLC', 'admin@test-agency.com', 'professional', 'active', NOW(), NOW())
ON CONFLICT (agency_id) DO NOTHING;

-- Step 2: Create test admin
INSERT INTO portal_users (id, email, name, role, agency_id, password_hash, active, created_at, updated_at) 
VALUES ('11111111-1111-1111-1111-111111111111', 'test-admin@test.com', 'Test Admin User', 'admin', 'TEST-001', '$2b$10$XTURErlHRBkydPR3JnD3yOnrEecCoGLZp6L44hjpiFUY9s1k/FcC6', true, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET password_hash = '$2b$10$XTURErlHRBkydPR3JnD3yOnrEecCoGLZp6L44hjpiFUY9s1k/FcC6', updated_at = NOW();

-- Step 3: Create test manager  
INSERT INTO portal_users (id, email, name, role, agency_id, password_hash, active, created_at, updated_at)
VALUES ('22222222-2222-2222-2222-222222222222', 'test-manager@test.com', 'Test Manager User', 'manager', 'TEST-001', '$2b$10$XTURErlHRBkydPR3JnD3yOnrEecCoGLZp6L44hjpiFUY9s1k/FcC6', true, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET password_hash = '$2b$10$XTURErlHRBkydPR3JnD3yOnrEecCoGLZp6L44hjpiFUY9s1k/FcC6', updated_at = NOW();

-- Step 4: Create test agent
INSERT INTO portal_users (id, email, name, role, agency_id, password_hash, active, created_at, updated_at)
VALUES ('33333333-3333-3333-3333-333333333333', 'test-agent@test.com', 'Test Agent User', 'agent', 'TEST-001', '$2b$10$XTURErlHRBkydPR3JnD3yOnrEecCoGLZp6L44hjpiFUY9s1k/FcC6', true, NOW(), NOW())  
ON CONFLICT (email) DO UPDATE SET password_hash = '$2b$10$XTURErlHRBkydPR3JnD3yOnrEecCoGLZp6L44hjpiFUY9s1k/FcC6', updated_at = NOW();

-- Step 5: Create test customer service
INSERT INTO portal_users (id, email, name, role, agency_id, password_hash, active, created_at, updated_at)
VALUES ('44444444-4444-4444-4444-444444444444', 'test-cs@test.com', 'Test CS User', 'customer_service', 'TEST-001', '$2b$10$XTURErlHRBkydPR3JnD3yOnrEecCoGLZp6L44hjpiFUY9s1k/FcC6', true, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET password_hash = '$2b$10$XTURErlHRBkydPR3JnD3yOnrEecCoGLZp6L44hjpiFUY9s1k/FcC6', updated_at = NOW();