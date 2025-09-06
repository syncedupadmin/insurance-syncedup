-- ================================================
-- CONVOSO MULTI-TENANT INTEGRATION SCHEMA
-- Production-ready system with AES-256 encryption
-- ================================================

-- 1. AGENCY INTEGRATIONS TABLE
-- Stores encrypted Convoso credentials per agency
CREATE TABLE IF NOT EXISTS agency_integrations (
    id SERIAL PRIMARY KEY,
    agency_id VARCHAR(50) NOT NULL UNIQUE,
    agency_name VARCHAR(255) NOT NULL,
    
    -- Integration Configuration
    integration_type VARCHAR(50) NOT NULL DEFAULT 'convoso',
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Encrypted Credentials (AES-256)
    encrypted_api_key TEXT NOT NULL,        -- Convoso API key (encrypted)
    encrypted_webhook_secret TEXT,          -- Webhook validation secret (encrypted)
    encrypted_account_id TEXT,              -- Convoso account/client ID (encrypted)
    encryption_key_id VARCHAR(100) NOT NULL, -- Key identifier for rotation
    
    -- Webhook Configuration
    webhook_url TEXT NOT NULL,              -- Our webhook endpoint for this agency
    webhook_events TEXT[] DEFAULT ARRAY['lead_created', 'lead_updated'],
    
    -- API Limits and Configuration
    rate_limit_per_minute INTEGER DEFAULT 60,
    rate_limit_per_hour INTEGER DEFAULT 3600,
    max_retries INTEGER DEFAULT 3,
    timeout_seconds INTEGER DEFAULT 30,
    
    -- Onboarding Status
    onboarding_status VARCHAR(50) DEFAULT 'pending', -- pending, validated, active, error
    last_validation_at TIMESTAMP,
    validation_error TEXT,
    
    -- Metadata
    integration_settings JSONB DEFAULT '{}', -- Additional settings
    created_by INTEGER REFERENCES portal_users(id),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. CONVOSO LEADS TABLE (Multi-tenant)
-- Agency-isolated lead storage with comprehensive tracking
CREATE TABLE IF NOT EXISTS convoso_leads (
    id SERIAL PRIMARY KEY,
    agency_id VARCHAR(50) NOT NULL REFERENCES agency_integrations(agency_id),
    
    -- Lead Identification
    lead_id VARCHAR(255) NOT NULL,         -- Convoso lead ID
    external_id VARCHAR(255),              -- External/campaign specific ID
    phone_number VARCHAR(20) NOT NULL,     -- Primary contact number
    email VARCHAR(255),
    
    -- Personal Information
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    date_of_birth DATE,
    age INTEGER,
    gender VARCHAR(20),
    
    -- Contact Information
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(10),
    country VARCHAR(50) DEFAULT 'US',
    
    -- Lead Source Information
    source VARCHAR(100) DEFAULT 'convoso',
    campaign_id VARCHAR(255),
    campaign_name VARCHAR(255),
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    
    -- Financial Information
    cost DECIMAL(10,2) DEFAULT 0.00,
    estimated_value DECIMAL(12,2) DEFAULT 0.00,
    
    -- Insurance Information
    insurance_type VARCHAR(50) DEFAULT 'auto',   -- auto, home, life, health, commercial
    coverage_type VARCHAR(100),
    current_carrier VARCHAR(100),
    policy_expires DATE,
    policy_number VARCHAR(100),
    annual_premium DECIMAL(10,2),
    
    -- Lead Status and Assignment
    agent_id INTEGER REFERENCES portal_users(id), -- Assigned agent
    status VARCHAR(50) DEFAULT 'new',      -- new, contacted, qualified, quoted, sold, lost, nurturing
    sub_status VARCHAR(100),               -- More specific status details
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    lead_score INTEGER DEFAULT 50,         -- Quality score (0-100)
    lead_temperature VARCHAR(20) DEFAULT 'warm', -- hot, warm, cold
    
    -- Communication Tracking
    call_attempts INTEGER DEFAULT 0,
    email_attempts INTEGER DEFAULT 0,
    last_contact_at TIMESTAMP,
    last_contact_method VARCHAR(50),       -- call, email, sms, in_person
    next_follow_up_at TIMESTAMP,
    
    -- Conversion Tracking
    quoted_at TIMESTAMP,
    quote_amount DECIMAL(12,2),
    sold_at TIMESTAMP,
    sale_amount DECIMAL(12,2),
    commission_amount DECIMAL(10,2),
    lost_reason VARCHAR(255),
    lost_at TIMESTAMP,
    
    -- Lead Intelligence
    lead_intent VARCHAR(100),              -- high, medium, low
    lead_quality VARCHAR(50),              -- a_grade, b_grade, c_grade
    behavioral_score INTEGER DEFAULT 50,   -- AI-calculated behavior score
    engagement_score INTEGER DEFAULT 50,   -- Engagement level score
    
    -- Communication Preferences
    preferred_contact_method VARCHAR(50) DEFAULT 'phone',
    best_time_to_call VARCHAR(100),
    timezone VARCHAR(50),
    do_not_call BOOLEAN DEFAULT FALSE,
    do_not_email BOOLEAN DEFAULT FALSE,
    
    -- Additional Data
    notes TEXT,
    tags TEXT[],                          -- Searchable tags
    additional_data JSONB DEFAULT '{}',    -- Flexible storage for extra fields
    
    -- Audit Trail
    source_ip VARCHAR(45),                -- IP where lead originated
    user_agent TEXT,                      -- Browser/device info
    referrer_url TEXT,                    -- Where they came from
    landing_page TEXT,                    -- Where they landed
    
    -- Timestamps
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- When webhook received
    first_contacted_at TIMESTAMP,         -- First agent contact
    last_updated_by INTEGER REFERENCES portal_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique leads per agency
    UNIQUE(agency_id, lead_id)
);

-- 3. LEAD ANALYTICS TABLE (Multi-tenant)
-- Daily aggregated analytics per agency and campaign
CREATE TABLE IF NOT EXISTS lead_analytics (
    id SERIAL PRIMARY KEY,
    agency_id VARCHAR(50) NOT NULL REFERENCES agency_integrations(agency_id),
    date DATE NOT NULL,
    
    -- Segmentation
    source VARCHAR(100) NOT NULL,
    campaign_id VARCHAR(255),
    campaign_name VARCHAR(255),
    insurance_type VARCHAR(50),
    agent_id INTEGER REFERENCES portal_users(id),
    
    -- Volume Metrics
    total_leads INTEGER DEFAULT 0,
    new_leads INTEGER DEFAULT 0,
    contacted_leads INTEGER DEFAULT 0,
    qualified_leads INTEGER DEFAULT 0,
    quoted_leads INTEGER DEFAULT 0,
    sold_leads INTEGER DEFAULT 0,
    lost_leads INTEGER DEFAULT 0,
    nurturing_leads INTEGER DEFAULT 0,
    
    -- Financial Metrics
    total_cost DECIMAL(12,2) DEFAULT 0.00,
    total_revenue DECIMAL(12,2) DEFAULT 0.00,
    total_commission DECIMAL(12,2) DEFAULT 0.00,
    cost_per_lead DECIMAL(10,2) DEFAULT 0.00,
    cost_per_sale DECIMAL(10,2) DEFAULT 0.00,
    revenue_per_lead DECIMAL(10,2) DEFAULT 0.00,
    roi_percentage DECIMAL(10,2) DEFAULT 0.00,
    
    -- Quality Metrics
    avg_lead_score DECIMAL(5,2) DEFAULT 0.00,
    avg_behavioral_score DECIMAL(5,2) DEFAULT 0.00,
    avg_engagement_score DECIMAL(5,2) DEFAULT 0.00,
    conversion_rate DECIMAL(5,2) DEFAULT 0.00,
    quote_rate DECIMAL(5,2) DEFAULT 0.00,
    
    -- Performance Metrics
    avg_response_time_minutes INTEGER DEFAULT 0,
    avg_calls_per_lead DECIMAL(5,2) DEFAULT 0.00,
    avg_emails_per_lead DECIMAL(5,2) DEFAULT 0.00,
    avg_days_to_close DECIMAL(5,2) DEFAULT 0.00,
    
    -- Agent Performance
    assigned_agents INTEGER DEFAULT 0,
    active_agents INTEGER DEFAULT 0,
    top_performing_agent_id INTEGER REFERENCES portal_users(id),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint for date/agency/source/campaign combination
    UNIQUE(agency_id, date, source, COALESCE(campaign_id, ''))
);

-- 4. WEBHOOK LOGS TABLE
-- Complete logging of all webhook requests and responses
CREATE TABLE IF NOT EXISTS webhook_logs (
    id SERIAL PRIMARY KEY,
    agency_id VARCHAR(50) NOT NULL REFERENCES agency_integrations(agency_id),
    
    -- Request Information
    request_id VARCHAR(100) NOT NULL,      -- Unique request identifier
    webhook_url TEXT NOT NULL,
    http_method VARCHAR(10) DEFAULT 'POST',
    
    -- Headers and Authentication
    request_headers JSONB DEFAULT '{}',
    response_headers JSONB DEFAULT '{}',
    signature_validation VARCHAR(50),      -- valid, invalid, missing, error
    api_key_validation VARCHAR(50),        -- valid, invalid, missing, error
    
    -- Payload Data
    request_payload JSONB DEFAULT '{}',
    response_payload JSONB DEFAULT '{}',
    payload_size_bytes INTEGER DEFAULT 0,
    
    -- Processing Results
    http_status_code INTEGER,
    processing_status VARCHAR(50),         -- success, error, retry, skipped
    processing_time_ms INTEGER DEFAULT 0,
    error_message TEXT,
    error_code VARCHAR(100),
    retry_count INTEGER DEFAULT 0,
    
    -- Lead Processing Results
    lead_id VARCHAR(255),
    lead_action VARCHAR(50),               -- created, updated, duplicate, invalid
    agent_assigned INTEGER REFERENCES portal_users(id),
    
    -- Network Information
    source_ip VARCHAR(45),
    user_agent TEXT,
    request_size_bytes INTEGER DEFAULT 0,
    response_size_bytes INTEGER DEFAULT 0,
    
    -- Timestamps
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. CONVOSO AUDIT TRAIL TABLE
-- Complete audit trail for compliance and debugging
CREATE TABLE IF NOT EXISTS convoso_audit_trail (
    id SERIAL PRIMARY KEY,
    agency_id VARCHAR(50) NOT NULL REFERENCES agency_integrations(agency_id),
    
    -- Event Information
    event_type VARCHAR(100) NOT NULL,      -- webhook_received, lead_created, lead_updated, etc.
    event_category VARCHAR(50) NOT NULL,   -- integration, lead, user_action, system
    event_description TEXT NOT NULL,
    
    -- Context Information
    lead_id VARCHAR(255),
    user_id INTEGER REFERENCES portal_users(id),
    session_id VARCHAR(100),
    request_id VARCHAR(100),
    
    -- Data Changes (for update events)
    old_values JSONB DEFAULT '{}',
    new_values JSONB DEFAULT '{}',
    changed_fields TEXT[],
    
    -- System Information
    ip_address VARCHAR(45),
    user_agent TEXT,
    api_endpoint TEXT,
    http_method VARCHAR(10),
    
    -- Result Information
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    error_code VARCHAR(100),
    processing_time_ms INTEGER DEFAULT 0,
    
    -- Additional Context
    metadata JSONB DEFAULT '{}',
    tags TEXT[],
    
    -- Timestamps
    event_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ================================================

-- Agency Integrations Indexes
CREATE INDEX IF NOT EXISTS idx_agency_integrations_agency_id ON agency_integrations(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_integrations_active ON agency_integrations(is_active);
CREATE INDEX IF NOT EXISTS idx_agency_integrations_status ON agency_integrations(onboarding_status);

-- Convoso Leads Indexes (Multi-tenant optimized)
CREATE INDEX IF NOT EXISTS idx_convoso_leads_agency_id ON convoso_leads(agency_id);
CREATE INDEX IF NOT EXISTS idx_convoso_leads_agency_lead_id ON convoso_leads(agency_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_convoso_leads_agency_phone ON convoso_leads(agency_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_convoso_leads_agency_email ON convoso_leads(agency_id, email);
CREATE INDEX IF NOT EXISTS idx_convoso_leads_agency_status ON convoso_leads(agency_id, status);
CREATE INDEX IF NOT EXISTS idx_convoso_leads_agency_agent ON convoso_leads(agency_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_convoso_leads_agency_received ON convoso_leads(agency_id, received_at);
CREATE INDEX IF NOT EXISTS idx_convoso_leads_agency_campaign ON convoso_leads(agency_id, campaign_id);
CREATE INDEX IF NOT EXISTS idx_convoso_leads_priority ON convoso_leads(priority);
CREATE INDEX IF NOT EXISTS idx_convoso_leads_temperature ON convoso_leads(lead_temperature);
CREATE INDEX IF NOT EXISTS idx_convoso_leads_score ON convoso_leads(lead_score);
CREATE INDEX IF NOT EXISTS idx_convoso_leads_next_followup ON convoso_leads(next_follow_up_at);
CREATE INDEX IF NOT EXISTS idx_convoso_leads_insurance_type ON convoso_leads(agency_id, insurance_type);

-- Lead Analytics Indexes
CREATE INDEX IF NOT EXISTS idx_lead_analytics_agency_date ON lead_analytics(agency_id, date);
CREATE INDEX IF NOT EXISTS idx_lead_analytics_agency_source ON lead_analytics(agency_id, source);
CREATE INDEX IF NOT EXISTS idx_lead_analytics_agency_campaign ON lead_analytics(agency_id, campaign_id);
CREATE INDEX IF NOT EXISTS idx_lead_analytics_agent ON lead_analytics(agent_id);

-- Webhook Logs Indexes
CREATE INDEX IF NOT EXISTS idx_webhook_logs_agency_id ON webhook_logs(agency_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_request_id ON webhook_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_lead_id ON webhook_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_received_at ON webhook_logs(received_at);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processing_status ON webhook_logs(processing_status);

-- Audit Trail Indexes
CREATE INDEX IF NOT EXISTS idx_audit_trail_agency_id ON convoso_audit_trail(agency_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_event_type ON convoso_audit_trail(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_trail_event_category ON convoso_audit_trail(event_category);
CREATE INDEX IF NOT EXISTS idx_audit_trail_lead_id ON convoso_audit_trail(lead_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user_id ON convoso_audit_trail(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_timestamp ON convoso_audit_trail(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_trail_request_id ON convoso_audit_trail(request_id);

-- ================================================
-- TRIGGERS AND FUNCTIONS
-- ================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for timestamp updates
CREATE TRIGGER update_agency_integrations_updated_at 
    BEFORE UPDATE ON agency_integrations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_convoso_leads_updated_at 
    BEFORE UPDATE ON convoso_leads 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lead_analytics_updated_at 
    BEFORE UPDATE ON lead_analytics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- VIEWS FOR COMMON QUERIES
-- ================================================

-- Active Integrations View
CREATE OR REPLACE VIEW active_integrations AS
SELECT 
    ai.*,
    COUNT(cl.id) as total_leads,
    COUNT(CASE WHEN cl.status = 'new' THEN 1 END) as new_leads,
    COUNT(CASE WHEN cl.status = 'sold' THEN 1 END) as converted_leads,
    MAX(cl.received_at) as last_lead_received
FROM agency_integrations ai
LEFT JOIN convoso_leads cl ON ai.agency_id = cl.agency_id
WHERE ai.is_active = TRUE
GROUP BY ai.id, ai.agency_id, ai.agency_name, ai.integration_type, 
         ai.is_active, ai.webhook_url, ai.onboarding_status, 
         ai.created_at, ai.updated_at;

-- Agency Lead Summary View (Multi-tenant safe)
CREATE OR REPLACE VIEW agency_lead_summary AS
SELECT 
    cl.agency_id,
    ai.agency_name,
    COUNT(*) as total_leads,
    COUNT(CASE WHEN cl.status = 'new' THEN 1 END) as new_leads,
    COUNT(CASE WHEN cl.status = 'contacted' THEN 1 END) as contacted_leads,
    COUNT(CASE WHEN cl.status = 'qualified' THEN 1 END) as qualified_leads,
    COUNT(CASE WHEN cl.status = 'quoted' THEN 1 END) as quoted_leads,
    COUNT(CASE WHEN cl.status = 'sold' THEN 1 END) as sold_leads,
    COUNT(CASE WHEN cl.status = 'lost' THEN 1 END) as lost_leads,
    SUM(cl.cost) as total_cost,
    SUM(cl.sale_amount) as total_revenue,
    AVG(cl.lead_score) as avg_lead_score,
    ROUND(
        COUNT(CASE WHEN cl.status = 'sold' THEN 1 END)::DECIMAL / 
        NULLIF(COUNT(*), 0) * 100, 2
    ) as conversion_rate
FROM convoso_leads cl
JOIN agency_integrations ai ON cl.agency_id = ai.agency_id
GROUP BY cl.agency_id, ai.agency_name;

-- Hot Leads View (Multi-tenant safe)
CREATE OR REPLACE VIEW hot_leads AS
SELECT 
    cl.*,
    ai.agency_name,
    pu.name as agent_name,
    EXTRACT(EPOCH FROM (NOW() - cl.received_at))/3600 as hours_since_received,
    CASE 
        WHEN cl.received_at > NOW() - INTERVAL '1 hour' AND cl.lead_score >= 80 THEN 'critical'
        WHEN cl.received_at > NOW() - INTERVAL '2 hours' AND cl.lead_score >= 70 THEN 'urgent' 
        WHEN cl.received_at > NOW() - INTERVAL '4 hours' AND cl.lead_score >= 60 THEN 'important'
        ELSE 'normal'
    END as urgency_level
FROM convoso_leads cl
JOIN agency_integrations ai ON cl.agency_id = ai.agency_id
LEFT JOIN portal_users pu ON cl.agent_id = pu.id
WHERE cl.status IN ('new', 'contacted') 
AND cl.received_at > NOW() - INTERVAL '24 hours'
ORDER BY cl.lead_score DESC, cl.received_at DESC;

-- ================================================
-- ROW LEVEL SECURITY (RLS) SETUP
-- ================================================

-- Enable RLS on all multi-tenant tables
ALTER TABLE convoso_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE convoso_audit_trail ENABLE ROW LEVEL SECURITY;

-- Create policies for agency isolation
-- Note: These would be activated with proper user context in production
-- For now, application-level filtering will be enforced

-- ================================================
-- SAMPLE DATA FOR TESTING
-- ================================================

-- Insert test agency integration for PHS001
INSERT INTO agency_integrations (
    agency_id, agency_name, integration_type, is_active,
    encrypted_api_key, encrypted_webhook_secret, encrypted_account_id,
    encryption_key_id, webhook_url, onboarding_status
) VALUES (
    'PHS001', 
    'Phoenix Health Solutions', 
    'convoso', 
    TRUE,
    'ENCRYPTED_KEY_PLACEHOLDER',  -- Will be properly encrypted by application
    'ENCRYPTED_SECRET_PLACEHOLDER',
    'ENCRYPTED_ACCOUNT_PLACEHOLDER',
    'key_v1',
    'https://insurance.syncedupsolutions.com/api/leads/convoso-webhook/PHS001',
    'pending'
) ON CONFLICT (agency_id) DO NOTHING;

-- Performance analysis query (for monitoring)
/*
SELECT 
    ai.agency_id,
    ai.agency_name,
    COUNT(cl.id) as total_leads,
    AVG(wl.processing_time_ms) as avg_processing_time,
    COUNT(CASE WHEN wl.processing_status = 'success' THEN 1 END) as successful_webhooks,
    COUNT(CASE WHEN wl.processing_status = 'error' THEN 1 END) as failed_webhooks
FROM agency_integrations ai
LEFT JOIN convoso_leads cl ON ai.agency_id = cl.agency_id
LEFT JOIN webhook_logs wl ON ai.agency_id = wl.agency_id
WHERE ai.is_active = TRUE
AND cl.received_at > NOW() - INTERVAL '7 days'
GROUP BY ai.agency_id, ai.agency_name;
*/