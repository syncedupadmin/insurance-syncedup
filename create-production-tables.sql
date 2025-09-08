-- Production Database Schema for Insurance.SyncedUp Admin Portal
-- Run these in Supabase SQL Editor

-- 1. Leads table for real lead management
CREATE TABLE IF NOT EXISTS leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    name VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    insurance_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'new',
    source VARCHAR(100),
    agent_id UUID,
    estimated_premium DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT leads_status_check CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost'))
);

-- 2. Portal users table for user management
CREATE TABLE IF NOT EXISTS portal_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL,
    agent_code VARCHAR(50),
    manager_id UUID REFERENCES portal_users(id),
    phone VARCHAR(50),
    license_number VARCHAR(100),
    license_state VARCHAR(10),
    license_expiry DATE,
    hire_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    password_hash TEXT,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deactivated_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT portal_users_role_check CHECK (role IN ('agent', 'manager', 'admin', 'super_admin'))
);

-- 3. Portal sales table for commission calculations
CREATE TABLE IF NOT EXISTS portal_sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id VARCHAR(255) NOT NULL,
    agent_id UUID REFERENCES portal_users(id),
    customer_name VARCHAR(255),
    product_name VARCHAR(255),
    premium DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,2), -- percentage
    commission_amount DECIMAL(10,2),
    sale_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    policy_number VARCHAR(100),
    carrier VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT portal_sales_status_check CHECK (status IN ('active', 'cancelled', 'lapsed'))
);

-- 4. Analytics events for tracking
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    user_id UUID,
    agent_id UUID,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Agencies table for multi-tenancy
CREATE TABLE IF NOT EXISTS agencies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id VARCHAR(255) UNIQUE NOT NULL, -- Human readable ID
    agency_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    subscription_tier VARCHAR(50) DEFAULT 'basic',
    stripe_customer_id VARCHAR(255) UNIQUE,
    stripe_subscription_id VARCHAR(255) UNIQUE,
    subscription_status VARCHAR(50) DEFAULT 'active',
    trial_end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_agency_id ON leads(agency_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_agent_id ON leads(agent_id);

CREATE INDEX IF NOT EXISTS idx_portal_users_agency_id ON portal_users(agency_id);
CREATE INDEX IF NOT EXISTS idx_portal_users_role ON portal_users(role);
CREATE INDEX IF NOT EXISTS idx_portal_users_manager_id ON portal_users(manager_id);

CREATE INDEX IF NOT EXISTS idx_portal_sales_agency_id ON portal_sales(agency_id);
CREATE INDEX IF NOT EXISTS idx_portal_sales_agent_id ON portal_sales(agent_id);
CREATE INDEX IF NOT EXISTS idx_portal_sales_sale_date ON portal_sales(sale_date DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_agency_id ON analytics_events(agency_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic - can be refined based on needs)
CREATE POLICY IF NOT EXISTS "Users can access their agency data" ON leads
    FOR ALL USING (agency_id IN (
        SELECT agency_id FROM portal_users WHERE id = auth.uid()
    ));

CREATE POLICY IF NOT EXISTS "Users can access their agency users" ON portal_users
    FOR ALL USING (agency_id IN (
        SELECT agency_id FROM portal_users WHERE id = auth.uid()
    ));

CREATE POLICY IF NOT EXISTS "Users can access their agency sales" ON portal_sales
    FOR ALL USING (agency_id IN (
        SELECT agency_id FROM portal_users WHERE id = auth.uid()
    ));

CREATE POLICY IF NOT EXISTS "Users can access their agency analytics" ON analytics_events
    FOR ALL USING (agency_id IN (
        SELECT agency_id FROM portal_users WHERE id = auth.uid()
    ));

-- Insert sample agency for testing
INSERT INTO agencies (agency_id, agency_name, contact_email, phone) 
VALUES ('AGENCY001', 'PHS Agency', 'admin@phsagency.com', '(555) 000-0000')
ON CONFLICT (agency_id) DO NOTHING;

-- Insert admin user
INSERT INTO portal_users (
    agency_id, 
    full_name, 
    email, 
    role, 
    agent_code, 
    is_active, 
    hire_date
) VALUES (
    'AGENCY001',
    'Admin User', 
    'admin@phsagency.com', 
    'admin', 
    'ADMIN001', 
    TRUE, 
    CURRENT_DATE
) ON CONFLICT (email) DO NOTHING;

-- Sample data for testing (optional - remove for production)
INSERT INTO leads (agency_id, name, email, phone, insurance_type, status, source, estimated_premium)
VALUES 
    ('AGENCY001', 'John Doe', 'john.doe@example.com', '(555) 123-4567', 'Auto Insurance', 'new', 'Website', 1200.00),
    ('AGENCY001', 'Jane Smith', 'jane.smith@example.com', '(555) 234-5678', 'Home Insurance', 'contacted', 'Referral', 800.00),
    ('AGENCY001', 'Bob Johnson', 'bob.johnson@example.com', '(555) 345-6789', 'Life Insurance', 'qualified', 'QuoteWizard', 2400.00)
ON CONFLICT DO NOTHING;

-- Grant permissions to service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;