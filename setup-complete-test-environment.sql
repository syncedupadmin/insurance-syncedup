-- Complete Test Environment Setup for SyncedUp Insurance
-- This script creates all missing tables and sets up a complete test agency with users and data

-- =====================================
-- STEP 1: CREATE MISSING TABLES
-- =====================================

-- Products table (referenced by sales.js)
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    base_commission DECIMAL(5,4) DEFAULT 0.0500, -- 5% default
    carrier VARCHAR(100),
    min_premium DECIMAL(10,2) DEFAULT 0,
    max_premium DECIMAL(10,2),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Commission settings table (referenced by sales.js)
CREATE TABLE IF NOT EXISTS commission_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id VARCHAR(50) NOT NULL,
    product_id UUID REFERENCES products(id),
    role VARCHAR(50) NOT NULL DEFAULT 'agent',
    base_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0500,
    bonus_threshold DECIMAL(10,2) DEFAULT 10000,
    bonus_rate DECIMAL(5,4) DEFAULT 0.0100,
    effective_date DATE DEFAULT CURRENT_DATE,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Portal goals table (referenced by dashboard APIs)
CREATE TABLE IF NOT EXISTS portal_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id VARCHAR(50) NOT NULL,
    user_id UUID,
    goal_type VARCHAR(50) NOT NULL, -- 'sales', 'revenue', 'leads'
    target_amount DECIMAL(12,2) NOT NULL,
    period_type VARCHAR(20) NOT NULL DEFAULT 'monthly', -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    current_amount DECIMAL(12,2) DEFAULT 0,
    achieved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Convoso leads table (referenced by webhook APIs)
CREATE TABLE IF NOT EXISTS convoso_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id VARCHAR(50) NOT NULL,
    convoso_lead_id VARCHAR(100) UNIQUE,
    campaign_id VARCHAR(100),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    status VARCHAR(50) DEFAULT 'new',
    score INTEGER DEFAULT 0,
    assigned_agent_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook logs table (referenced by webhook APIs)
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id VARCHAR(50),
    webhook_type VARCHAR(50) NOT NULL,
    payload JSONB,
    status VARCHAR(20) DEFAULT 'received',
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lead analytics table (referenced by lead APIs)
CREATE TABLE IF NOT EXISTS lead_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id VARCHAR(50) NOT NULL,
    lead_id UUID,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(12,4),
    metric_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer service cases table (referenced by dashboard)
CREATE TABLE IF NOT EXISTS customer_service_cases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id VARCHAR(50) NOT NULL,
    customer_id UUID,
    case_number VARCHAR(50) UNIQUE,
    subject VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'open',
    priority VARCHAR(20) DEFAULT 'medium',
    assigned_agent_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Portal API keys table (referenced by admin APIs)
CREATE TABLE IF NOT EXISTS portal_api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id VARCHAR(50) NOT NULL,
    key_name VARCHAR(100) NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    permissions JSONB DEFAULT '[]',
    active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Portal settings table (referenced by admin APIs)
CREATE TABLE IF NOT EXISTS portal_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id VARCHAR(50) NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB,
    setting_type VARCHAR(50) DEFAULT 'string',
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agency_id, setting_key)
);

-- System alerts table (referenced by manager dashboard)
CREATE TABLE IF NOT EXISTS system_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id VARCHAR(50),
    alert_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    severity VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'error', 'critical'
    read BOOLEAN DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fix the duplicate tables issue - Create actual chargebacks and cancellations tables
CREATE TABLE IF NOT EXISTS chargebacks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id VARCHAR(50) NOT NULL,
    sale_id UUID,
    agent_id UUID,
    amount DECIMAL(10,2) NOT NULL,
    reason VARCHAR(255),
    chargeback_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cancellations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id VARCHAR(50) NOT NULL,
    sale_id UUID,
    agent_id UUID,
    cancellation_date DATE DEFAULT CURRENT_DATE,
    reason VARCHAR(255),
    refund_amount DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'processed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================
-- STEP 2: CREATE TEST AGENCY
-- =====================================

-- Insert test agency
INSERT INTO agencies (
    id, name, status, plan, settings, created_at, updated_at
) VALUES (
    'TEST-001',
    'Test Agency Inc',
    'active',
    'enterprise',
    '{"commission_rates": {"agent": 0.05, "manager": 0.02}, "features": ["advanced_analytics", "custom_reports", "api_access"]}',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    status = EXCLUDED.status,
    plan = EXCLUDED.plan,
    settings = EXCLUDED.settings,
    updated_at = NOW();

-- =====================================
-- STEP 3: CREATE TEST USERS
-- =====================================

-- Test Admin User
INSERT INTO portal_users (
    id, email, name, role, agency_id, password_hash, active, created_at, updated_at
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'test-admin@test.com',
    'Test Admin User',
    'admin',
    'TEST-001',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- TestPass123!
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    agency_id = EXCLUDED.agency_id,
    updated_at = NOW();

-- Test Manager User
INSERT INTO portal_users (
    id, email, name, role, agency_id, password_hash, active, created_at, updated_at
) VALUES (
    '22222222-2222-2222-2222-222222222222',
    'test-manager@test.com',
    'Test Manager User',
    'manager',
    'TEST-001',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- TestPass123!
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    agency_id = EXCLUDED.agency_id,
    updated_at = NOW();

-- Test Agent User
INSERT INTO portal_users (
    id, email, name, role, agency_id, password_hash, active, created_at, updated_at
) VALUES (
    '33333333-3333-3333-3333-333333333333',
    'test-agent@test.com',
    'Test Agent User',
    'agent',
    'TEST-001',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- TestPass123!
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    agency_id = EXCLUDED.agency_id,
    updated_at = NOW();

-- Test Customer Service User
INSERT INTO portal_users (
    id, email, name, role, agency_id, password_hash, active, created_at, updated_at
) VALUES (
    '44444444-4444-4444-4444-444444444444',
    'test-cs@test.com',
    'Test CS User',
    'customer_service',
    'TEST-001',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- TestPass123!
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    agency_id = EXCLUDED.agency_id,
    updated_at = NOW();

-- Test Super Admin User (no agency_id)
INSERT INTO portal_users (
    id, email, name, role, password_hash, active, created_at, updated_at
) VALUES (
    '55555555-5555-5555-5555-555555555555',
    'test-super@test.com',
    'Test Super Admin',
    'super_admin',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- TestPass123!
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    updated_at = NOW();

-- =====================================
-- STEP 4: CREATE TEST PRODUCTS
-- =====================================

INSERT INTO products (id, name, category, base_commission, carrier, min_premium, max_premium) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Auto Insurance Basic', 'auto', 0.0400, 'Progressive', 500, 2000),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Auto Insurance Premium', 'auto', 0.0600, 'Progressive', 2000, 5000),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Home Insurance', 'home', 0.0500, 'State Farm', 800, 3000),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Life Insurance Term', 'life', 0.0800, 'MetLife', 300, 1500),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Health Insurance', 'health', 0.0300, 'Blue Cross', 1200, 8000)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    base_commission = EXCLUDED.base_commission,
    updated_at = NOW();

-- =====================================
-- STEP 5: CREATE COMMISSION SETTINGS
-- =====================================

INSERT INTO commission_settings (agency_id, product_id, role, base_rate, bonus_threshold, bonus_rate) VALUES
('TEST-001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'agent', 0.0400, 5000, 0.0050),
('TEST-001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'agent', 0.0600, 8000, 0.0075),
('TEST-001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'agent', 0.0500, 6000, 0.0060),
('TEST-001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'agent', 0.0800, 4000, 0.0100),
('TEST-001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'agent', 0.0300, 10000, 0.0040),
('TEST-001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'manager', 0.0100, 20000, 0.0020),
('TEST-001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'manager', 0.0150, 25000, 0.0025)
ON CONFLICT DO NOTHING;

-- =====================================
-- STEP 6: CREATE TEST CUSTOMERS
-- =====================================

INSERT INTO customers (id, agency_id, first_name, last_name, email, phone, address, city, state, zip_code) VALUES
('c1111111-1111-1111-1111-111111111111', 'TEST-001', 'John', 'Smith', 'john.smith@email.com', '555-0101', '123 Main St', 'Chicago', 'IL', '60601'),
('c2222222-2222-2222-2222-222222222222', 'TEST-001', 'Jane', 'Johnson', 'jane.johnson@email.com', '555-0102', '456 Oak Ave', 'Chicago', 'IL', '60602'),
('c3333333-3333-3333-3333-333333333333', 'TEST-001', 'Mike', 'Williams', 'mike.williams@email.com', '555-0103', '789 Pine St', 'Chicago', 'IL', '60603'),
('c4444444-4444-4444-4444-444444444444', 'TEST-001', 'Sarah', 'Brown', 'sarah.brown@email.com', '555-0104', '321 Elm Dr', 'Chicago', 'IL', '60604'),
('c5555555-5555-5555-5555-555555555555', 'TEST-001', 'David', 'Davis', 'david.davis@email.com', '555-0105', '654 Maple Ln', 'Chicago', 'IL', '60605')
ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    updated_at = NOW();

-- =====================================
-- STEP 7: CREATE TEST LEADS
-- =====================================

INSERT INTO leads (id, agency_id, first_name, last_name, email, phone, state, zip_code, source, status, assigned_agent_id, score) VALUES
('l1111111-1111-1111-1111-111111111111', 'TEST-001', 'Robert', 'Miller', 'robert.miller@email.com', '555-0201', 'IL', '60606', 'website', 'new', '33333333-3333-3333-3333-333333333333', 85),
('l2222222-2222-2222-2222-222222222222', 'TEST-001', 'Lisa', 'Wilson', 'lisa.wilson@email.com', '555-0202', 'IL', '60607', 'referral', 'contacted', '33333333-3333-3333-3333-333333333333', 92),
('l3333333-3333-3333-3333-333333333333', 'TEST-001', 'Mark', 'Taylor', 'mark.taylor@email.com', '555-0203', 'IL', '60608', 'advertising', 'qualified', '33333333-3333-3333-3333-333333333333', 78),
('l4444444-4444-4444-4444-444444444444', 'TEST-001', 'Emily', 'Anderson', 'emily.anderson@email.com', '555-0204', 'IL', '60609', 'website', 'proposal_sent', '33333333-3333-3333-3333-333333333333', 88),
('l5555555-5555-5555-5555-555555555555', 'TEST-001', 'Chris', 'Thomas', 'chris.thomas@email.com', '555-0205', 'IL', '60610', 'cold_call', 'closed_lost', '33333333-3333-3333-3333-333333333333', 65)
ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    status = EXCLUDED.status,
    updated_at = NOW();

-- =====================================
-- STEP 8: CREATE TEST SALES
-- =====================================

INSERT INTO portal_sales (id, agency_id, agent_id, customer_id, product_id, premium, commission, status, sale_date) VALUES
('s1111111-1111-1111-1111-111111111111', 'TEST-001', '33333333-3333-3333-3333-333333333333', 'c1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1500.00, 60.00, 'active', CURRENT_DATE - INTERVAL '30 days'),
('s2222222-2222-2222-2222-222222222222', 'TEST-001', '33333333-3333-3333-3333-333333333333', 'c2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 3500.00, 210.00, 'active', CURRENT_DATE - INTERVAL '25 days'),
('s3333333-3333-3333-3333-333333333333', 'TEST-001', '33333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 2200.00, 110.00, 'active', CURRENT_DATE - INTERVAL '20 days'),
('s4444444-4444-4444-4444-444444444444', 'TEST-001', '33333333-3333-3333-3333-333333333333', 'c4444444-4444-4444-4444-444444444444', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 800.00, 64.00, 'active', CURRENT_DATE - INTERVAL '15 days'),
('s5555555-5555-5555-5555-555555555555', 'TEST-001', '33333333-3333-3333-3333-333333333333', 'c5555555-5555-5555-5555-555555555555', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 4500.00, 135.00, 'active', CURRENT_DATE - INTERVAL '10 days'),
('s6666666-6666-6666-6666-666666666666', 'TEST-001', '33333333-3333-3333-3333-333333333333', 'c1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1200.00, 48.00, 'active', CURRENT_DATE - INTERVAL '8 days'),
('s7777777-7777-7777-7777-777777777777', 'TEST-001', '33333333-3333-3333-3333-333333333333', 'c2222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 1800.00, 90.00, 'active', CURRENT_DATE - INTERVAL '5 days'),
('s8888888-8888-8888-8888-888888888888', 'TEST-001', '33333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 2800.00, 168.00, 'pending', CURRENT_DATE - INTERVAL '3 days'),
('s9999999-9999-9999-9999-999999999999', 'TEST-001', '33333333-3333-3333-3333-333333333333', 'c4444444-4444-4444-4444-444444444444', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 950.00, 76.00, 'active', CURRENT_DATE - INTERVAL '1 days'),
('saaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'TEST-001', '33333333-3333-3333-3333-333333333333', 'c5555555-5555-5555-5555-555555555555', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 6200.00, 186.00, 'active', CURRENT_DATE)
ON CONFLICT (id) DO UPDATE SET
    premium = EXCLUDED.premium,
    commission = EXCLUDED.commission,
    status = EXCLUDED.status,
    updated_at = NOW();

-- =====================================
-- STEP 9: CREATE CORRESPONDING COMMISSIONS
-- =====================================

INSERT INTO portal_commissions (id, agency_id, agent_id, sale_id, amount, status, period) VALUES
('cm111111-1111-1111-1111-111111111111', 'TEST-001', '33333333-3333-3333-3333-333333333333', 's1111111-1111-1111-1111-111111111111', 60.00, 'paid', DATE_TRUNC('month', CURRENT_DATE - INTERVAL '30 days')),
('cm222222-2222-2222-2222-222222222222', 'TEST-001', '33333333-3333-3333-3333-333333333333', 's2222222-2222-2222-2222-222222222222', 210.00, 'paid', DATE_TRUNC('month', CURRENT_DATE - INTERVAL '25 days')),
('cm333333-3333-3333-3333-333333333333', 'TEST-001', '33333333-3333-3333-3333-333333333333', 's3333333-3333-3333-3333-333333333333', 110.00, 'paid', DATE_TRUNC('month', CURRENT_DATE - INTERVAL '20 days')),
('cm444444-4444-4444-4444-444444444444', 'TEST-001', '33333333-3333-3333-3333-333333333333', 's4444444-4444-4444-4444-444444444444', 64.00, 'paid', DATE_TRUNC('month', CURRENT_DATE - INTERVAL '15 days')),
('cm555555-5555-5555-5555-555555555555', 'TEST-001', '33333333-3333-3333-3333-333333333333', 's5555555-5555-5555-5555-555555555555', 135.00, 'pending', DATE_TRUNC('month', CURRENT_DATE - INTERVAL '10 days')),
('cm666666-6666-6666-6666-666666666666', 'TEST-001', '33333333-3333-3333-3333-333333333333', 's6666666-6666-6666-6666-666666666666', 48.00, 'pending', DATE_TRUNC('month', CURRENT_DATE)),
('cm777777-7777-7777-7777-777777777777', 'TEST-001', '33333333-3333-3333-3333-333333333333', 's7777777-7777-7777-7777-777777777777', 90.00, 'pending', DATE_TRUNC('month', CURRENT_DATE)),
('cm888888-8888-8888-8888-888888888888', 'TEST-001', '33333333-3333-3333-3333-333333333333', 's8888888-8888-8888-8888-888888888888', 168.00, 'pending', DATE_TRUNC('month', CURRENT_DATE)),
('cm999999-9999-9999-9999-999999999999', 'TEST-001', '33333333-3333-3333-3333-333333333333', 's9999999-9999-9999-9999-999999999999', 76.00, 'pending', DATE_TRUNC('month', CURRENT_DATE)),
('cmaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'TEST-001', '33333333-3333-3333-3333-333333333333', 'saaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 186.00, 'pending', DATE_TRUNC('month', CURRENT_DATE))
ON CONFLICT (id) DO UPDATE SET
    amount = EXCLUDED.amount,
    status = EXCLUDED.status,
    updated_at = NOW();

-- =====================================
-- STEP 10: CREATE TEST GOALS
-- =====================================

INSERT INTO portal_goals (id, agency_id, user_id, goal_type, target_amount, period_type, period_start, period_end, current_amount) VALUES
('g1111111-1111-1111-1111-111111111111', 'TEST-001', '33333333-3333-3333-3333-333333333333', 'sales', 15000.00, 'monthly', DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day', 12500.00),
('g2222222-2222-2222-2222-222222222222', 'TEST-001', '33333333-3333-3333-3333-333333333333', 'revenue', 50000.00, 'quarterly', DATE_TRUNC('quarter', CURRENT_DATE), DATE_TRUNC('quarter', CURRENT_DATE) + INTERVAL '3 months' - INTERVAL '1 day', 35000.00),
('g3333333-3333-3333-3333-333333333333', 'TEST-001', '22222222-2222-2222-2222-222222222222', 'sales', 100000.00, 'monthly', DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day', 85000.00),
('g4444444-4444-4444-4444-444444444444', 'TEST-001', NULL, 'revenue', 200000.00, 'quarterly', DATE_TRUNC('quarter', CURRENT_DATE), DATE_TRUNC('quarter', CURRENT_DATE) + INTERVAL '3 months' - INTERVAL '1 day', 150000.00)
ON CONFLICT (id) DO UPDATE SET
    target_amount = EXCLUDED.target_amount,
    current_amount = EXCLUDED.current_amount,
    updated_at = NOW();

-- =====================================
-- STEP 11: CREATE SAMPLE CONVOSO DATA
-- =====================================

INSERT INTO convoso_leads (id, agency_id, convoso_lead_id, campaign_id, first_name, last_name, email, phone, state, zip_code, status, score, assigned_agent_id) VALUES
('cl111111-1111-1111-1111-111111111111', 'TEST-001', 'CVS001', 'AUTO2024', 'Alex', 'Rodriguez', 'alex.rodriguez@email.com', '555-0301', 'IL', '60611', 'new', 87, '33333333-3333-3333-3333-333333333333'),
('cl222222-2222-2222-2222-222222222222', 'TEST-001', 'CVS002', 'AUTO2024', 'Maria', 'Garcia', 'maria.garcia@email.com', '555-0302', 'IL', '60612', 'contacted', 92, '33333333-3333-3333-3333-333333333333'),
('cl333333-3333-3333-3333-333333333333', 'TEST-001', 'CVS003', 'HOME2024', 'James', 'Martinez', 'james.martinez@email.com', '555-0303', 'IL', '60613', 'qualified', 79, '33333333-3333-3333-3333-333333333333')
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    score = EXCLUDED.score,
    updated_at = NOW();

-- =====================================
-- STEP 12: CREATE SAMPLE CUSTOMER SERVICE DATA
-- =====================================

INSERT INTO customer_service_cases (id, agency_id, customer_id, case_number, subject, status, priority, assigned_agent_id) VALUES
('cs111111-1111-1111-1111-111111111111', 'TEST-001', 'c1111111-1111-1111-1111-111111111111', 'CS-2024-001', 'Policy Change Request', 'open', 'medium', '44444444-4444-4444-4444-444444444444'),
('cs222222-2222-2222-2222-222222222222', 'TEST-001', 'c2222222-2222-2222-2222-222222222222', 'CS-2024-002', 'Claim Processing Issue', 'in_progress', 'high', '44444444-4444-4444-4444-444444444444'),
('cs333333-3333-3333-3333-333333333333', 'TEST-001', 'c3333333-3333-3333-3333-333333333333', 'CS-2024-003', 'Billing Question', 'resolved', 'low', '44444444-4444-4444-4444-444444444444')
ON CONFLICT (id) DO UPDATE SET
    subject = EXCLUDED.subject,
    status = EXCLUDED.status,
    updated_at = NOW();

-- =====================================
-- STEP 13: CREATE SAMPLE SETTINGS AND ALERTS
-- =====================================

INSERT INTO portal_settings (agency_id, setting_key, setting_value, setting_type) VALUES
('TEST-001', 'commission_auto_calculation', 'true', 'boolean'),
('TEST-001', 'lead_assignment_method', '"round_robin"', 'string'),
('TEST-001', 'notification_email', '"notifications@testagency.com"', 'string'),
('TEST-001', 'dashboard_refresh_interval', '30', 'number')
ON CONFLICT (agency_id, setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

INSERT INTO system_alerts (agency_id, alert_type, title, message, severity) VALUES
('TEST-001', 'commission', 'Commission Calculation Complete', 'Monthly commissions have been calculated and are ready for review.', 'info'),
('TEST-001', 'system', 'Backup Complete', 'Daily backup completed successfully at 2:00 AM.', 'info'),
('TEST-001', 'lead', 'New High-Value Lead', 'A new lead with score 95+ has been assigned to your team.', 'warning')
ON CONFLICT DO NOTHING;

-- =====================================
-- INDEXES FOR PERFORMANCE
-- =====================================

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_commission_settings_agency_product ON commission_settings(agency_id, product_id);
CREATE INDEX IF NOT EXISTS idx_portal_goals_agency_user ON portal_goals(agency_id, user_id);
CREATE INDEX IF NOT EXISTS idx_convoso_leads_agency_status ON convoso_leads(agency_id, status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_agency_type ON webhook_logs(agency_id, webhook_type);
CREATE INDEX IF NOT EXISTS idx_lead_analytics_agency_date ON lead_analytics(agency_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_customer_service_cases_agency_status ON customer_service_cases(agency_id, status);
CREATE INDEX IF NOT EXISTS idx_portal_api_keys_agency ON portal_api_keys(agency_id);
CREATE INDEX IF NOT EXISTS idx_portal_settings_agency_key ON portal_settings(agency_id, setting_key);
CREATE INDEX IF NOT EXISTS idx_system_alerts_agency_read ON system_alerts(agency_id, read);
CREATE INDEX IF NOT EXISTS idx_chargebacks_agency_agent ON chargebacks(agency_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_cancellations_agency_agent ON cancellations(agency_id, agent_id);

-- =====================================
-- VERIFY SETUP
-- =====================================

-- Show created test data summary
SELECT 
    'Test Setup Complete!' as status,
    (SELECT COUNT(*) FROM agencies WHERE id = 'TEST-001') as agencies_created,
    (SELECT COUNT(*) FROM portal_users WHERE agency_id = 'TEST-001' OR role = 'super_admin') as users_created,
    (SELECT COUNT(*) FROM products) as products_created,
    (SELECT COUNT(*) FROM portal_sales WHERE agency_id = 'TEST-001') as sales_created,
    (SELECT COUNT(*) FROM portal_commissions WHERE agency_id = 'TEST-001') as commissions_created,
    (SELECT COUNT(*) FROM leads WHERE agency_id = 'TEST-001') as leads_created,
    (SELECT COUNT(*) FROM customers WHERE agency_id = 'TEST-001') as customers_created,
    (SELECT COUNT(*) FROM portal_goals WHERE agency_id = 'TEST-001') as goals_created;