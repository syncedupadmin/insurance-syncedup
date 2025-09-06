-- ================================================
-- CONVOSO INTEGRATION TABLES - FIXED VERSION
-- Execute this in Supabase Dashboard > SQL Editor
-- ================================================

-- First, drop any existing tables to avoid conflicts
DROP TABLE IF EXISTS convoso_audit_trail CASCADE;
DROP TABLE IF EXISTS webhook_logs CASCADE;
DROP TABLE IF EXISTS convoso_leads CASCADE;
DROP TABLE IF EXISTS agency_integrations CASCADE;

-- ================================================
-- 1. AGENCY INTEGRATIONS TABLE
-- ================================================
CREATE TABLE agency_integrations (
    id SERIAL PRIMARY KEY,
    agency_id VARCHAR(50) NOT NULL UNIQUE,
    agency_name VARCHAR(255) NOT NULL,
    integration_type VARCHAR(50) NOT NULL DEFAULT 'convoso',
    is_active BOOLEAN DEFAULT TRUE,
    encrypted_api_key TEXT NOT NULL,
    encrypted_webhook_secret TEXT,
    encrypted_account_id TEXT,
    encryption_key_id VARCHAR(100) NOT NULL,
    webhook_url TEXT NOT NULL,
    webhook_events TEXT[] DEFAULT ARRAY['lead_created', 'lead_updated'],
    rate_limit_per_minute INTEGER DEFAULT 60,
    rate_limit_per_hour INTEGER DEFAULT 3600,
    max_retries INTEGER DEFAULT 3,
    timeout_seconds INTEGER DEFAULT 30,
    onboarding_status VARCHAR(50) DEFAULT 'pending',
    last_validation_at TIMESTAMP,
    validation_error TEXT,
    integration_settings JSONB DEFAULT '{}',
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- 2. CONVOSO LEADS TABLE
-- ================================================
CREATE TABLE convoso_leads (
    id SERIAL PRIMARY KEY,
    agency_id VARCHAR(50) NOT NULL,
    lead_id VARCHAR(255) NOT NULL,
    external_id VARCHAR(255),
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    date_of_birth DATE,
    age INTEGER,
    gender VARCHAR(20),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(10),
    country VARCHAR(50) DEFAULT 'US',
    source VARCHAR(100) DEFAULT 'convoso',
    campaign_id VARCHAR(255),
    campaign_name VARCHAR(255),
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    cost DECIMAL(10,2) DEFAULT 0.00,
    estimated_value DECIMAL(12,2) DEFAULT 0.00,
    insurance_type VARCHAR(50) DEFAULT 'auto',
    coverage_type VARCHAR(100),
    current_carrier VARCHAR(100),
    policy_expires DATE,
    policy_number VARCHAR(100),
    annual_premium DECIMAL(10,2),
    agent_id INTEGER,
    status VARCHAR(50) DEFAULT 'new',
    sub_status VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'normal',
    lead_score INTEGER DEFAULT 50,
    lead_temperature VARCHAR(20) DEFAULT 'warm',
    call_attempts INTEGER DEFAULT 0,
    email_attempts INTEGER DEFAULT 0,
    last_contact_at TIMESTAMP,
    last_contact_method VARCHAR(50),
    next_follow_up_at TIMESTAMP,
    quoted_at TIMESTAMP,
    quote_amount DECIMAL(12,2),
    sold_at TIMESTAMP,
    sale_amount DECIMAL(12,2),
    commission_amount DECIMAL(10,2),
    lost_reason VARCHAR(255),
    lost_at TIMESTAMP,
    notes TEXT,
    tags TEXT[],
    additional_data JSONB DEFAULT '{}',
    source_ip VARCHAR(45),
    user_agent TEXT,
    referrer_url TEXT,
    landing_page TEXT,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    first_contacted_at TIMESTAMP,
    last_updated_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agency_id, lead_id)
);

-- ================================================
-- 3. WEBHOOK LOGS TABLE
-- ================================================
CREATE TABLE webhook_logs (
    id SERIAL PRIMARY KEY,
    agency_id VARCHAR(50) NOT NULL,
    request_id VARCHAR(100) NOT NULL,
    webhook_url TEXT NOT NULL,
    http_method VARCHAR(10) DEFAULT 'POST',
    request_headers JSONB DEFAULT '{}',
    response_headers JSONB DEFAULT '{}',
    signature_validation VARCHAR(50),
    api_key_validation VARCHAR(50),
    request_payload JSONB DEFAULT '{}',
    response_payload JSONB DEFAULT '{}',
    payload_size_bytes INTEGER DEFAULT 0,
    http_status_code INTEGER,
    processing_status VARCHAR(50),
    processing_time_ms INTEGER DEFAULT 0,
    error_message TEXT,
    error_code VARCHAR(100),
    retry_count INTEGER DEFAULT 0,
    lead_id VARCHAR(255),
    lead_action VARCHAR(50),
    agent_assigned INTEGER,
    source_ip VARCHAR(45),
    user_agent TEXT,
    request_size_bytes INTEGER DEFAULT 0,
    response_size_bytes INTEGER DEFAULT 0,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- 4. AUDIT TRAIL TABLE
-- ================================================
CREATE TABLE convoso_audit_trail (
    id SERIAL PRIMARY KEY,
    agency_id VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_category VARCHAR(50) NOT NULL,
    event_description TEXT NOT NULL,
    lead_id VARCHAR(255),
    user_id INTEGER,
    session_id VARCHAR(100),
    request_id VARCHAR(100),
    old_values JSONB DEFAULT '{}',
    new_values JSONB DEFAULT '{}',
    changed_fields TEXT[],
    ip_address VARCHAR(45),
    user_agent TEXT,
    api_endpoint TEXT,
    http_method VARCHAR(10),
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    error_code VARCHAR(100),
    processing_time_ms INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    tags TEXT[],
    event_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- INDEXES
-- ================================================
CREATE INDEX idx_agency_integrations_agency_id ON agency_integrations(agency_id);
CREATE INDEX idx_agency_integrations_active ON agency_integrations(is_active);
CREATE INDEX idx_agency_integrations_status ON agency_integrations(onboarding_status);

CREATE INDEX idx_convoso_leads_agency_id ON convoso_leads(agency_id);
CREATE INDEX idx_convoso_leads_agency_lead_id ON convoso_leads(agency_id, lead_id);
CREATE INDEX idx_convoso_leads_agency_phone ON convoso_leads(agency_id, phone_number);
CREATE INDEX idx_convoso_leads_agency_status ON convoso_leads(agency_id, status);
CREATE INDEX idx_convoso_leads_received ON convoso_leads(received_at);

CREATE INDEX idx_webhook_logs_agency_id ON webhook_logs(agency_id);
CREATE INDEX idx_webhook_logs_request_id ON webhook_logs(request_id);
CREATE INDEX idx_webhook_logs_received_at ON webhook_logs(received_at);

CREATE INDEX idx_audit_trail_agency_id ON convoso_audit_trail(agency_id);
CREATE INDEX idx_audit_trail_event_type ON convoso_audit_trail(event_type);
CREATE INDEX idx_audit_trail_timestamp ON convoso_audit_trail(event_timestamp);

-- ================================================
-- TRIGGERS
-- ================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agency_integrations_updated_at 
    BEFORE UPDATE ON agency_integrations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_convoso_leads_updated_at 
    BEFORE UPDATE ON convoso_leads 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- SAMPLE DATA
-- ================================================
INSERT INTO agency_integrations (
    agency_id, 
    agency_name, 
    integration_type, 
    is_active,
    encrypted_api_key, 
    encrypted_webhook_secret, 
    encrypted_account_id,
    encryption_key_id, 
    webhook_url, 
    onboarding_status
) VALUES (
    'PHS001', 
    'Phoenix Health Solutions', 
    'convoso', 
    TRUE,
    'TEMP_convoso_api_key_test_2024_secure',
    'TEMP_webhook_secret_secure_123',
    'TEMP_conv_acc_001',
    'temp_v1',
    'https://insurance-syncedup-negempfdu-nicks-projects-f40381ea.vercel.app/api/leads/convoso-webhook/PHS001',
    'validated'
);

-- ================================================
-- VERIFICATION
-- ================================================
SELECT 'Tables created successfully!' as status;
SELECT COUNT(*) as agency_integrations_count FROM agency_integrations;
SELECT agency_id, agency_name, onboarding_status FROM agency_integrations WHERE agency_id = 'PHS001';