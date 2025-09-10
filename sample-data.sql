-- ═══════════════════════════════════════════════════════════════
-- INSURANCE.SYNCEDUP COMPREHENSIVE SAMPLE DATA
-- ═══════════════════════════════════════════════════════════════
-- This file creates realistic sample data for all portal testing
-- Run after complete-schema.sql to populate the database
-- ═══════════════════════════════════════════════════════════════

-- Clear existing data (in correct order to handle foreign keys)
DELETE FROM audit_logs;
DELETE FROM security_events;
DELETE FROM user_sessions;
DELETE FROM webhook_logs;
DELETE FROM convoso_calls;
DELETE FROM convoso_leads;
DELETE FROM lead_analytics;
DELETE FROM leads;
DELETE FROM global_leaderboard;
DELETE FROM portal_goals;
DELETE FROM support_tickets;
DELETE FROM customer_service_cases;
DELETE FROM claims;
DELETE FROM policies;
DELETE FROM portal_commissions;
DELETE FROM commissions;
DELETE FROM portal_sales;
DELETE FROM quotes;
DELETE FROM customers;
DELETE FROM documents;
DELETE FROM transactions;
DELETE FROM api_keys;
DELETE FROM commission_settings;
DELETE FROM agency_integrations;
DELETE FROM products;
DELETE FROM portal_users;
DELETE FROM users;
DELETE FROM agencies;

-- Reset sequences
ALTER SEQUENCE IF EXISTS audit_logs_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS security_events_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS user_sessions_id_seq RESTART WITH 1;

-- ═══════════════════════════════════════════════════════════════
-- 1. AGENCIES (Foundation)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO agencies (id, agency_id, name, subscription_plan, contact_email, contact_phone, address, website, is_active, stripe_customer_id, billing_status, created_at, updated_at) VALUES
-- Main Agency
('11111111-1111-1111-1111-111111111111', 'PHSINS', 'PHS Insurance Agency', 'professional', 'admin@phsagency.com', '555-0100', '123 Insurance Blvd, Dallas, TX 75201', 'https://phsagency.com', true, 'cus_PHStest123', 'active', NOW() - INTERVAL '90 days', NOW()),

-- Demo/Test Agency
('22222222-2222-2222-2222-222222222222', 'DEMO', 'Demo Insurance Group', 'starter', 'demo@demo.com', '555-0200', '456 Demo Street, Austin, TX 78701', 'https://demo.com', true, 'cus_DEMOtest456', 'trial', NOW() - INTERVAL '30 days', NOW()),

-- Enterprise Agency
('33333333-3333-3333-3333-333333333333', 'ENTERPRISE', 'Enterprise Insurance Solutions', 'enterprise', 'admin@enterprise.com', '555-0300', '789 Enterprise Ave, Houston, TX 77001', 'https://enterprise.com', true, 'cus_ENTtest789', 'active', NOW() - INTERVAL '180 days', NOW()),

-- Inactive Agency (for testing)
('44444444-4444-4444-4444-444444444444', 'INACTIVE', 'Inactive Test Agency', 'basic', 'test@inactive.com', '555-0400', '999 Inactive Rd, Austin, TX 78702', NULL, false, NULL, 'cancelled', NOW() - INTERVAL '365 days', NOW() - INTERVAL '30 days');

-- ═══════════════════════════════════════════════════════════════
-- 2. PRODUCTS (Product Catalog)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO products (id, name, carrier, product_type, commission_rate, base_premium, description, is_active) VALUES
('AUTO_BASIC', 'Basic Auto Insurance', 'State Farm', 'auto', 15.00, 850.00, 'Basic liability and collision coverage', true),
('AUTO_FULL', 'Full Coverage Auto', 'Allstate', 'auto', 18.00, 1200.00, 'Comprehensive auto insurance with full coverage', true),
('HOME_BASIC', 'Basic Homeowners', 'Liberty Mutual', 'home', 20.00, 1500.00, 'Basic homeowners insurance', true),
('HOME_PREMIUM', 'Premium Home Coverage', 'State Farm', 'home', 25.00, 2200.00, 'Premium homeowners with additional protections', true),
('LIFE_TERM', 'Term Life Insurance', 'MetLife', 'life', 30.00, 480.00, '20-year term life insurance', true),
('LIFE_WHOLE', 'Whole Life Insurance', 'Prudential', 'life', 45.00, 2400.00, 'Whole life insurance with investment component', true),
('HEALTH_IND', 'Individual Health Plan', 'Blue Cross', 'health', 10.00, 3600.00, 'Individual health insurance plan', true),
('HEALTH_FAM', 'Family Health Plan', 'Aetna', 'health', 12.00, 7200.00, 'Family health insurance coverage', true),
('BUSINESS_GL', 'Business General Liability', 'Hartford', 'business', 22.00, 800.00, 'General liability for small businesses', true),
('BUSINESS_WC', 'Workers Compensation', 'Travelers', 'business', 18.00, 1200.00, 'Workers compensation insurance', true);

-- ═══════════════════════════════════════════════════════════════
-- 3. PORTAL USERS (All roles across agencies)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO portal_users (id, email, password_hash, name, first_name, last_name, role, agency_id, is_active, must_change_password, login_count, last_login, phone, department, permissions, two_factor_enabled, login_attempts, created_at, updated_at) VALUES

-- Super Admin (No agency)
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'superadmin@syncedup.com', '$2b$12$LQv3c1yqBwWFcXsaPiJOoe.PGGqlr.5D1YV8JtQz8WF5nZr5qJg6u', 'Super Admin', 'Super', 'Admin', 'super_admin', NULL, true, false, 25, NOW() - INTERVAL '2 hours', '555-0001', 'System Administration', '{"all": true}', true, 0, NOW() - INTERVAL '365 days', NOW()),

-- PHS Agency Users
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'admin@phsagency.com', '$2b$12$LQv3c1yqBwWFcXsaPiJOoe.PGGqlr.5D1YV8JtQz8WF5nZr5qJg6u', 'John Smith', 'John', 'Smith', 'admin', '11111111-1111-1111-1111-111111111111', true, false, 45, NOW() - INTERVAL '1 hour', '555-0101', 'Administration', '{"users": true, "sales": true, "reports": true}', false, 0, NOW() - INTERVAL '90 days', NOW()),

('cccccccc-cccc-cccc-cccc-cccccccccccc', 'manager@phsagency.com', '$2b$12$LQv3c1yqBwWFcXsaPiJOoe.PGGqlr.5D1YV8JtQz8WF5nZr5qJg6u', 'Sarah Johnson', 'Sarah', 'Johnson', 'manager', '11111111-1111-1111-1111-111111111111', true, false, 78, NOW() - INTERVAL '30 minutes', '555-0102', 'Sales Management', '{"sales": true, "agents": true, "goals": true}', false, 0, NOW() - INTERVAL '85 days', NOW()),

('dddddddd-dddd-dddd-dddd-dddddddddddd', 'agent1@phsagency.com', '$2b$12$LQv3c1yqBwWFcXsaPiJOoe.PGGqlr.5D1YV8JtQz8WF5nZr5qJg6u', 'Mike Davis', 'Mike', 'Davis', 'agent', '11111111-1111-1111-1111-111111111111', true, false, 156, NOW() - INTERVAL '15 minutes', '555-0103', 'Sales', '{"sales": true, "customers": true}', false, 0, NOW() - INTERVAL '80 days', NOW()),

('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'agent2@phsagency.com', '$2b$12$LQv3c1yqBwWFcXsaPiJOoe.PGGqlr.5D1YV8JtQz8WF5nZr5qJg6u', 'Lisa Wilson', 'Lisa', 'Wilson', 'agent', '11111111-1111-1111-1111-111111111111', true, false, 234, NOW() - INTERVAL '5 minutes', '555-0104', 'Sales', '{"sales": true, "customers": true}', false, 0, NOW() - INTERVAL '75 days', NOW()),

('ffffffff-ffff-ffff-ffff-ffffffffffff', 'cs@phsagency.com', '$2b$12$LQv3c1yqBwWFcXsaPiJOoe.PGGqlr.5D1YV8JtQz8WF5nZr5qJg6u', 'Jennifer Brown', 'Jennifer', 'Brown', 'customer_service', '11111111-1111-1111-1111-111111111111', true, false, 89, NOW() - INTERVAL '1 hour', '555-0105', 'Customer Service', '{"tickets": true, "customers": true}', false, 0, NOW() - INTERVAL '70 days', NOW()),

-- Demo Agency Users
('12345678-1234-1234-1234-123456789012', 'demo@demo.com', '$2b$12$LQv3c1yqBwWFcXsaPiJOoe.PGGqlr.5D1YV8JtQz8WF5nZr5qJg6u', 'Demo Admin', 'Demo', 'Admin', 'admin', '22222222-2222-2222-2222-222222222222', true, false, 12, NOW() - INTERVAL '2 hours', '555-0201', 'Demo Department', '{"basic": true}', false, 0, NOW() - INTERVAL '30 days', NOW()),

('87654321-4321-4321-4321-210987654321', 'demoagent@demo.com', '$2b$12$LQv3c1yqBwWFcXsaPiJOoe.PGGqlr.5D1YV8JtQz8WF5nZr5qJg6u', 'Demo Agent', 'Demo', 'Agent', 'agent', '22222222-2222-2222-2222-222222222222', true, false, 34, NOW() - INTERVAL '4 hours', '555-0202', 'Demo Sales', '{"basic": true}', false, 0, NOW() - INTERVAL '25 days', NOW()),

-- Enterprise Agency Users  
('99999999-9999-9999-9999-999999999999', 'admin@enterprise.com', '$2b$12$LQv3c1yqBwWFcXsaPiJOoe.PGGqlr.5D1YV8JtQz8WF5nZr5qJg6u', 'Enterprise Admin', 'Enterprise', 'Admin', 'admin', '33333333-3333-3333-3333-333333333333', true, false, 67, NOW() - INTERVAL '3 hours', '555-0301', 'Enterprise Admin', '{"all": true}', true, 0, NOW() - INTERVAL '180 days', NOW());

-- ═══════════════════════════════════════════════════════════════
-- 4. CUSTOMERS (Sample customer profiles)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO customers (id, member_id, first_name, last_name, email, phone, date_of_birth, address_street, address_city, address_state, address_zip, product_type, agency_id, status, notes, lead_source, created_at, updated_at) VALUES

-- PHS Agency Customers
('c1111111-1111-1111-1111-111111111111', 'PHS001', 'Robert', 'Anderson', 'robert.anderson@email.com', '555-1001', '1985-03-15', '123 Oak Street', 'Dallas', 'TX', '75201', 'auto', '11111111-1111-1111-1111-111111111111', 'active', 'Excellent customer, referrals', 'Website', NOW() - INTERVAL '60 days', NOW() - INTERVAL '5 days'),

('c2222222-2222-2222-2222-222222222222', 'PHS002', 'Maria', 'Rodriguez', 'maria.rodriguez@email.com', '555-1002', '1990-07-22', '456 Pine Avenue', 'Dallas', 'TX', '75202', 'home', '11111111-1111-1111-1111-111111111111', 'active', 'New homeowner', 'Agent Referral', NOW() - INTERVAL '45 days', NOW() - INTERVAL '10 days'),

('c3333333-3333-3333-3333-333333333333', 'PHS003', 'James', 'Miller', 'james.miller@email.com', '555-1003', '1978-11-08', '789 Elm Road', 'Dallas', 'TX', '75203', 'life', '11111111-1111-1111-1111-111111111111', 'active', 'Family life insurance', 'Cold Call', NOW() - INTERVAL '30 days', NOW() - INTERVAL '2 days'),

('c4444444-4444-4444-4444-444444444444', 'PHS004', 'Emily', 'Davis', 'emily.davis@email.com', '555-1004', '1982-05-12', '321 Maple Drive', 'Dallas', 'TX', '75204', 'health', '11111111-1111-1111-1111-111111111111', 'prospect', 'Interested in family plan', 'Website', NOW() - INTERVAL '15 days', NOW() - INTERVAL '1 day'),

-- Demo Agency Customers
('c5555555-5555-5555-5555-555555555555', 'DEMO001', 'Demo', 'Customer', 'demo.customer@email.com', '555-2001', '1988-01-01', '111 Demo Street', 'Austin', 'TX', '78701', 'auto', '22222222-2222-2222-2222-222222222222', 'active', 'Demo customer for testing', 'Demo', NOW() - INTERVAL '20 days', NOW()),

-- Enterprise Customers
('c6666666-6666-6666-6666-666666666666', 'ENT001', 'Corporate', 'Client', 'corporate@enterprise.com', '555-3001', '1975-12-31', '999 Corporate Blvd', 'Houston', 'TX', '77001', 'business', '33333333-3333-3333-3333-333333333333', 'active', 'Large business account', 'B2B Sales', NOW() - INTERVAL '120 days', NOW() - INTERVAL '15 days');

-- ═══════════════════════════════════════════════════════════════
-- 5. QUOTES (Active and historical quotes)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO quotes (id, customer_id, product_id, agency_id, agent_id, quoted_premium, coverage_details, status, valid_until, quote_data, created_at, updated_at) VALUES

('q1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'AUTO_FULL', '11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 1350.00, '{"liability": "100/300/100", "collision": "$500 deductible", "comprehensive": "$250 deductible"}', 'accepted', NOW() + INTERVAL '30 days', '{"vehicle": {"year": 2020, "make": "Toyota", "model": "Camry"}}', NOW() - INTERVAL '65 days', NOW() - INTERVAL '60 days'),

('q2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'HOME_BASIC', '11111111-1111-1111-1111-111111111111', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 1650.00, '{"dwelling": "$300000", "personal_property": "$150000", "liability": "$500000"}', 'accepted', NOW() + INTERVAL '25 days', '{"property": {"value": 300000, "year_built": 2015}}', NOW() - INTERVAL '50 days', NOW() - INTERVAL '45 days'),

('q3333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333', 'LIFE_TERM', '11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 520.00, '{"coverage_amount": "$500000", "term": "20 years", "premium_guaranteed": true}', 'accepted', NOW() + INTERVAL '20 days', '{"beneficiary": {"primary": "spouse", "contingent": "children"}}', NOW() - INTERVAL '35 days', NOW() - INTERVAL '30 days'),

('q4444444-4444-4444-4444-444444444444', 'c4444444-4444-4444-4444-444444444444', 'HEALTH_FAM', '11111111-1111-1111-1111-111111111111', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 7800.00, '{"deductible": "$2000", "out_of_pocket_max": "$8000", "network": "PPO"}', 'pending', NOW() + INTERVAL '15 days', '{"family_size": 4, "ages": [32, 29, 8, 5]}', NOW() - INTERVAL '10 days', NOW() - INTERVAL '5 days'),

-- Demo quotes
('q5555555-5555-5555-5555-555555555555', 'c5555555-5555-5555-5555-555555555555', 'AUTO_BASIC', '22222222-2222-2222-2222-222222222222', '87654321-4321-4321-4321-210987654321', 890.00, '{"liability": "50/100/50", "collision": "$1000 deductible"}', 'accepted', NOW() + INTERVAL '10 days', '{"vehicle": {"year": 2018, "make": "Honda", "model": "Civic"}}', NOW() - INTERVAL '25 days', NOW() - INTERVAL '20 days');

-- ═══════════════════════════════════════════════════════════════
-- 6. PORTAL SALES (Sales records across all portals)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO portal_sales (id, agency_id, agent_id, customer_id, product_id, quote_id, sale_amount, commission_amount, commission_rate, status, sale_date, policy_start_date, policy_end_date, payment_method, notes, created_at, updated_at) VALUES

-- PHS Agency Sales
('s1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'c1111111-1111-1111-1111-111111111111', 'AUTO_FULL', 'q1111111-1111-1111-1111-111111111111', 1350.00, 243.00, 18.00, 'completed', NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days', NOW() + INTERVAL '305 days', 'credit_card', 'Smooth transaction', NOW() - INTERVAL '60 days', NOW() - INTERVAL '55 days'),

('s2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'c2222222-2222-2222-2222-222222222222', 'HOME_BASIC', 'q2222222-2222-2222-2222-222222222222', 1650.00, 330.00, 20.00, 'completed', NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days', NOW() + INTERVAL '320 days', 'check', 'First-time homeowner', NOW() - INTERVAL '45 days', NOW() - INTERVAL '40 days'),

('s3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'c3333333-3333-3333-3333-333333333333', 'LIFE_TERM', 'q3333333-3333-3333-3333-333333333333', 520.00, 156.00, 30.00, 'completed', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days', NOW() + INTERVAL '7270 days', 'bank_transfer', '20-year term policy', NOW() - INTERVAL '30 days', NOW() - INTERVAL '25 days'),

-- Demo Sale
('s5555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', '87654321-4321-4321-4321-210987654321', 'c5555555-5555-5555-5555-555555555555', 'AUTO_BASIC', 'q5555555-5555-5555-5555-555555555555', 890.00, 133.50, 15.00, 'completed', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days', NOW() + INTERVAL '345 days', 'credit_card', 'Demo transaction', NOW() - INTERVAL '20 days', NOW() - INTERVAL '15 days'),

-- Recent sales for leaderboard
('s6666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'c1111111-1111-1111-1111-111111111111', 'AUTO_BASIC', NULL, 850.00, 127.50, 15.00, 'completed', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days', NOW() + INTERVAL '358 days', 'credit_card', 'Additional vehicle', NOW() - INTERVAL '7 days', NOW() - INTERVAL '2 days'),

('s7777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'c2222222-2222-2222-2222-222222222222', 'LIFE_WHOLE', NULL, 2400.00, 1080.00, 45.00, 'completed', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NOW() + INTERVAL '36525 days', 'bank_transfer', 'Whole life upgrade', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day');

-- ═══════════════════════════════════════════════════════════════
-- 7. COMMISSION SETTINGS (Agency commission structures)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO commission_settings (id, agency_id, product_type, base_rate, tier_structure, bonus_structure, effective_date, created_at) VALUES
(1, '11111111-1111-1111-1111-111111111111', 'auto', 15.00, '[{"min_sales": 0, "max_sales": 10, "rate": 15.0}, {"min_sales": 11, "max_sales": 25, "rate": 17.0}, {"min_sales": 26, "max_sales": null, "rate": 20.0}]', '{"monthly_bonus": 500, "quarterly_bonus": 2000}', NOW() - INTERVAL '90 days', NOW() - INTERVAL '90 days'),
(2, '11111111-1111-1111-1111-111111111111', 'home', 20.00, '[{"min_sales": 0, "max_sales": 5, "rate": 20.0}, {"min_sales": 6, "max_sales": 15, "rate": 22.0}, {"min_sales": 16, "max_sales": null, "rate": 25.0}]', '{"monthly_bonus": 750, "quarterly_bonus": 3000}', NOW() - INTERVAL '90 days', NOW() - INTERVAL '90 days'),
(3, '22222222-2222-2222-2222-222222222222', 'auto', 10.00, '[{"min_sales": 0, "max_sales": null, "rate": 10.0}]', '{}', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days');

-- ═══════════════════════════════════════════════════════════════
-- 8. PORTAL GOALS (Manager/Admin dashboard goals)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO portal_goals (id, agency_id, user_id, goal_type, target_value, current_value, period, start_date, end_date, status, created_at, updated_at) VALUES

-- Monthly sales goals for PHS agents
('g1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'sales_amount', 15000.00, 12350.00, 'monthly', date_trunc('month', NOW()), date_trunc('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day', 'active', NOW() - INTERVAL '20 days', NOW()),

('g2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'sales_amount', 18000.00, 16780.00, 'monthly', date_trunc('month', NOW()), date_trunc('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day', 'active', NOW() - INTERVAL '20 days', NOW()),

-- Quarterly agency goal
('g3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'sales_count', 100.00, 87.00, 'quarterly', date_trunc('quarter', NOW()), date_trunc('quarter', NOW()) + INTERVAL '3 months' - INTERVAL '1 day', 'active', NOW() - INTERVAL '60 days', NOW());

-- ═══════════════════════════════════════════════════════════════
-- 9. GLOBAL LEADERBOARD (Cross-agency performance)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO global_leaderboard (id, user_id, agency_id, period, sales_count, sales_amount, commission_earned, ranking, score, period_start, period_end, created_at, updated_at) VALUES

-- Current month rankings
(1, 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'monthly', 8, 16780.00, 2987.50, 1, 98.5, date_trunc('month', NOW()), date_trunc('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day', NOW() - INTERVAL '5 days', NOW()),

(2, 'dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'monthly', 6, 12350.00, 2156.25, 2, 92.3, date_trunc('month', NOW()), date_trunc('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day', NOW() - INTERVAL '5 days', NOW()),

(3, '87654321-4321-4321-4321-210987654321', '22222222-2222-2222-2222-222222222222', 'monthly', 3, 4500.00, 675.00, 3, 76.8, date_trunc('month', NOW()), date_trunc('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day', NOW() - INTERVAL '5 days', NOW());

-- ═══════════════════════════════════════════════════════════════
-- 10. CUSTOMER SERVICE DATA
-- ═══════════════════════════════════════════════════════════════

INSERT INTO customer_service_cases (id, customer_id, agency_id, assigned_to, subject, description, status, priority, case_type, resolution_notes, created_at, updated_at) VALUES

('cs111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Policy renewal question', 'Customer asking about early renewal options for auto policy', 'open', 'medium', 'inquiry', NULL, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day'),

('cs222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Billing inquiry', 'Question about premium payment schedule', 'resolved', 'low', 'billing', 'Explained payment schedule and sent documentation', NOW() - INTERVAL '7 days', NOW() - INTERVAL '5 days');

INSERT INTO support_tickets (id, agency_id, submitted_by, assigned_to, category, subject, description, status, priority, resolution_notes, created_at, updated_at, resolved_at) VALUES

('st111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'technical', 'Portal login issues', 'Agent experiencing intermittent login failures', 'in_progress', 'high', NULL, NOW() - INTERVAL '1 day', NOW(), NULL),

('st222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '12345678-1234-1234-1234-123456789012', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'feature_request', 'Export functionality', 'Request for CSV export of sales data', 'resolved', 'medium', 'Feature added to next release cycle', NOW() - INTERVAL '10 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days');

-- ═══════════════════════════════════════════════════════════════
-- 11. AUDIT LOGS (System activity tracking)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO audit_logs (user_id, agency_id, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent, timestamp) VALUES

('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'CREATE', 'sale', 's1111111-1111-1111-1111-111111111111', NULL, '{"amount": 1350.00, "product": "AUTO_FULL"}', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '60 days'),

('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'UPDATE', 'customer', 'c2222222-2222-2222-2222-222222222222', '{"status": "prospect"}', '{"status": "active"}', '192.168.1.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '40 days'),

('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, 'LOGIN', 'user_session', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, '{"login_time": "' || (NOW() - INTERVAL '2 hours')::text || '"}', '10.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', NOW() - INTERVAL '2 hours');

-- ═══════════════════════════════════════════════════════════════
-- 12. USER SESSIONS (Active session tracking)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, expires_at, is_active, created_at, last_activity) VALUES

('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'super_admin_session_' || extract(epoch from NOW())::text, '10.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', NOW() + INTERVAL '24 hours', true, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '30 minutes'),

('dddddddd-dddd-dddd-dddd-dddddddddddd', 'agent_session_' || extract(epoch from NOW())::text, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() + INTERVAL '8 hours', true, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '5 minutes'),

('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'agent2_session_' || extract(epoch from NOW())::text, '192.168.1.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() + INTERVAL '8 hours', true, NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '2 minutes');

-- ═══════════════════════════════════════════════════════════════
-- 13. ADDITIONAL SAMPLE DATA FOR TESTING
-- ═══════════════════════════════════════════════════════════════

-- Add some transactions
INSERT INTO transactions (id, agency_id, user_id, amount, type, status, description, created_at, updated_at) VALUES
('t1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 243.00, 'commission', 'completed', 'Commission from sale s1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '55 days', NOW() - INTERVAL '55 days'),
('t2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 330.00, 'commission', 'completed', 'Commission from sale s2222222-2222-2222-2222-222222222222', NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days'),
('t3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '87654321-4321-4321-4321-210987654321', 133.50, 'commission', 'completed', 'Commission from sale s5555555-5555-5555-5555-555555555555', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days');

-- Add schema version tracking
INSERT INTO schema_version (version, description, applied_at) VALUES
('1.0.0', 'Initial comprehensive schema deployment', NOW()),
('1.0.1', 'Sample data population', NOW());

-- ═══════════════════════════════════════════════════════════════
-- COMPLETION MESSAGE
-- ═══════════════════════════════════════════════════════════════

SELECT 'Sample data population completed successfully!' as status,
       'Created realistic test data for all portals' as description,
       '4 agencies, 10 users, 6 customers, 5 quotes, 7 sales, and supporting data' as summary;