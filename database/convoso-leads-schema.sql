-- Convoso Leads Integration Database Schema
-- This schema creates tables for storing Convoso lead data and analytics

-- 1. CONVOSO LEADS TABLE
-- Main table for storing lead information from Convoso webhook
CREATE TABLE IF NOT EXISTS convoso_leads (
    id SERIAL PRIMARY KEY,
    lead_id VARCHAR(255) UNIQUE NOT NULL, -- Convoso lead ID
    external_id VARCHAR(255), -- External/campaign specific ID
    phone_number VARCHAR(20) NOT NULL, -- Primary contact number
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    
    -- Lead Source Information
    source VARCHAR(100) DEFAULT 'convoso', -- Lead source identifier
    campaign_id VARCHAR(255), -- Convoso campaign ID
    campaign_name VARCHAR(255), -- Campaign name for reporting
    
    -- Financial Information
    cost DECIMAL(10,2) DEFAULT 0.00, -- Cost per lead
    
    -- Geographic Information
    state VARCHAR(50),
    city VARCHAR(100),
    zip_code VARCHAR(10),
    
    -- Personal Information
    age INTEGER,
    gender VARCHAR(20),
    
    -- Insurance Information
    insurance_type VARCHAR(50) DEFAULT 'auto', -- auto, home, life, health, etc.
    coverage_type VARCHAR(100), -- Coverage details
    current_carrier VARCHAR(100), -- Current insurance company
    policy_expires DATE, -- When current policy expires
    
    -- Assignment and Status
    agent_assignment INTEGER REFERENCES users(user_id), -- Assigned agent
    status VARCHAR(50) DEFAULT 'new', -- new, contacted, qualified, quoted, sold, lost
    priority VARCHAR(20) DEFAULT 'normal', -- normal, high, urgent
    lead_score INTEGER DEFAULT 50, -- Lead quality score (0-100)
    
    -- Call Tracking
    call_attempts INTEGER DEFAULT 0,
    last_call_time TIMESTAMP,
    
    -- Additional Information
    notes TEXT,
    additional_data JSONB, -- Store additional Convoso fields
    
    -- Timestamps
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- When webhook received
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. LEAD ANALYTICS TABLE
-- Aggregated analytics for performance tracking and reporting
CREATE TABLE IF NOT EXISTS lead_analytics (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    source VARCHAR(100) NOT NULL,
    
    -- Volume Metrics
    total_leads INTEGER DEFAULT 0,
    new_leads INTEGER DEFAULT 0,
    contacted_leads INTEGER DEFAULT 0,
    qualified_leads INTEGER DEFAULT 0,
    quoted_leads INTEGER DEFAULT 0,
    sold_leads INTEGER DEFAULT 0,
    lost_leads INTEGER DEFAULT 0,
    
    -- Financial Metrics
    total_cost DECIMAL(12,2) DEFAULT 0.00,
    total_revenue DECIMAL(12,2) DEFAULT 0.00,
    cost_per_lead DECIMAL(10,2) DEFAULT 0.00,
    cost_per_sale DECIMAL(10,2) DEFAULT 0.00,
    roi_percentage DECIMAL(10,2) DEFAULT 0.00,
    
    -- Quality Metrics
    avg_lead_score DECIMAL(5,2) DEFAULT 0.00,
    conversion_rate DECIMAL(5,2) DEFAULT 0.00,
    avg_response_time INTEGER DEFAULT 0, -- in minutes
    
    -- Agent Performance
    assigned_agents INTEGER DEFAULT 0,
    avg_calls_per_lead DECIMAL(5,2) DEFAULT 0.00,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint for date/source combination
    UNIQUE(date, source)
);

-- 3. LEAD ACTIVITY LOG TABLE
-- Track all activities and status changes for leads
CREATE TABLE IF NOT EXISTS lead_activity_log (
    id SERIAL PRIMARY KEY,
    lead_id VARCHAR(255) REFERENCES convoso_leads(lead_id),
    agent_id INTEGER REFERENCES users(user_id),
    
    -- Activity Information
    activity_type VARCHAR(50) NOT NULL, -- call, email, note, status_change, assignment
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    
    -- Call Information
    call_duration INTEGER, -- seconds
    call_outcome VARCHAR(100), -- connected, voicemail, busy, no_answer, etc.
    
    -- Notes and Details
    notes TEXT,
    details JSONB,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. AGENT LEAD ASSIGNMENTS TABLE
-- Track current and historical agent assignments
CREATE TABLE IF NOT EXISTS agent_lead_assignments (
    id SERIAL PRIMARY KEY,
    lead_id VARCHAR(255) REFERENCES convoso_leads(lead_id),
    agent_id INTEGER REFERENCES users(user_id),
    assigned_by INTEGER REFERENCES users(user_id), -- Who made the assignment
    
    -- Assignment Details
    assignment_type VARCHAR(50) DEFAULT 'automatic', -- automatic, manual, reassignment
    assignment_reason TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- 5. CAMPAIGN PERFORMANCE TABLE
-- Track performance by Convoso campaigns
CREATE TABLE IF NOT EXISTS campaign_performance (
    id SERIAL PRIMARY KEY,
    campaign_id VARCHAR(255) NOT NULL,
    campaign_name VARCHAR(255),
    date DATE NOT NULL,
    
    -- Volume Metrics
    leads_received INTEGER DEFAULT 0,
    leads_processed INTEGER DEFAULT 0,
    leads_converted INTEGER DEFAULT 0,
    
    -- Financial Metrics
    total_cost DECIMAL(12,2) DEFAULT 0.00,
    avg_cost_per_lead DECIMAL(10,2) DEFAULT 0.00,
    total_revenue DECIMAL(12,2) DEFAULT 0.00,
    
    -- Quality Metrics
    avg_lead_score DECIMAL(5,2) DEFAULT 0.00,
    conversion_rate DECIMAL(5,2) DEFAULT 0.00,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint
    UNIQUE(campaign_id, date)
);

-- INDEXES for Performance Optimization
-- Main table indexes
CREATE INDEX IF NOT EXISTS idx_convoso_leads_phone ON convoso_leads(phone_number);
CREATE INDEX IF NOT EXISTS idx_convoso_leads_email ON convoso_leads(email);
CREATE INDEX IF NOT EXISTS idx_convoso_leads_status ON convoso_leads(status);
CREATE INDEX IF NOT EXISTS idx_convoso_leads_agent ON convoso_leads(agent_assignment);
CREATE INDEX IF NOT EXISTS idx_convoso_leads_source ON convoso_leads(source);
CREATE INDEX IF NOT EXISTS idx_convoso_leads_received_at ON convoso_leads(received_at);
CREATE INDEX IF NOT EXISTS idx_convoso_leads_created_at ON convoso_leads(created_at);
CREATE INDEX IF NOT EXISTS idx_convoso_leads_state ON convoso_leads(state);
CREATE INDEX IF NOT EXISTS idx_convoso_leads_insurance_type ON convoso_leads(insurance_type);
CREATE INDEX IF NOT EXISTS idx_convoso_leads_priority ON convoso_leads(priority);

-- Analytics table indexes
CREATE INDEX IF NOT EXISTS idx_lead_analytics_date ON lead_analytics(date);
CREATE INDEX IF NOT EXISTS idx_lead_analytics_source ON lead_analytics(source);
CREATE INDEX IF NOT EXISTS idx_lead_analytics_date_source ON lead_analytics(date, source);

-- Activity log indexes
CREATE INDEX IF NOT EXISTS idx_lead_activity_lead_id ON lead_activity_log(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activity_agent_id ON lead_activity_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_lead_activity_type ON lead_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_lead_activity_created_at ON lead_activity_log(created_at);

-- Assignment table indexes
CREATE INDEX IF NOT EXISTS idx_agent_assignments_lead_id ON agent_lead_assignments(lead_id);
CREATE INDEX IF NOT EXISTS idx_agent_assignments_agent_id ON agent_lead_assignments(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_assignments_active ON agent_lead_assignments(is_active);

-- Campaign performance indexes
CREATE INDEX IF NOT EXISTS idx_campaign_performance_campaign_id ON campaign_performance(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_performance_date ON campaign_performance(date);

-- TRIGGERS for automatic timestamp updates
-- Update timestamp trigger for convoso_leads
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_convoso_leads_updated_at 
    BEFORE UPDATE ON convoso_leads 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lead_analytics_updated_at 
    BEFORE UPDATE ON lead_analytics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_performance_updated_at 
    BEFORE UPDATE ON campaign_performance 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- VIEWS for Common Queries
-- Active leads view
CREATE OR REPLACE VIEW active_leads AS
SELECT 
    cl.*,
    u.name as agent_name,
    u.email as agent_email,
    EXTRACT(EPOCH FROM (NOW() - cl.received_at))/3600 as hours_since_received,
    CASE 
        WHEN cl.received_at > NOW() - INTERVAL '1 hour' THEN 'hot'
        WHEN cl.received_at > NOW() - INTERVAL '4 hours' THEN 'warm'
        ELSE 'cold'
    END as lead_temperature
FROM convoso_leads cl
LEFT JOIN users u ON cl.agent_assignment = u.user_id
WHERE cl.status NOT IN ('sold', 'lost');

-- Daily performance view
CREATE OR REPLACE VIEW daily_performance AS
SELECT 
    DATE(received_at) as date,
    source,
    COUNT(*) as total_leads,
    SUM(cost) as total_cost,
    AVG(cost) as avg_cost_per_lead,
    AVG(lead_score) as avg_lead_score,
    COUNT(CASE WHEN status = 'sold' THEN 1 END) as converted_leads,
    ROUND(
        COUNT(CASE WHEN status = 'sold' THEN 1 END)::DECIMAL / COUNT(*) * 100, 2
    ) as conversion_rate
FROM convoso_leads
GROUP BY DATE(received_at), source
ORDER BY date DESC, source;

-- Agent performance view
CREATE OR REPLACE VIEW agent_performance AS
SELECT 
    u.user_id,
    u.name,
    u.email,
    COUNT(cl.id) as total_leads,
    COUNT(CASE WHEN cl.status = 'contacted' THEN 1 END) as contacted_leads,
    COUNT(CASE WHEN cl.status = 'sold' THEN 1 END) as converted_leads,
    ROUND(
        COUNT(CASE WHEN cl.status = 'sold' THEN 1 END)::DECIMAL / 
        NULLIF(COUNT(cl.id), 0) * 100, 2
    ) as conversion_rate,
    SUM(cl.cost) as total_lead_cost,
    AVG(cl.lead_score) as avg_lead_score,
    AVG(cl.call_attempts) as avg_call_attempts
FROM users u
LEFT JOIN convoso_leads cl ON u.user_id = cl.agent_assignment
WHERE u.role = 'agent' AND u.status = 'active'
GROUP BY u.user_id, u.name, u.email
ORDER BY converted_leads DESC, conversion_rate DESC;

-- Add column to users table for lead assignment tracking if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'last_lead_assigned'
    ) THEN
        ALTER TABLE users ADD COLUMN last_lead_assigned TIMESTAMP;
    END IF;
END $$;

-- Insert sample data for testing (optional)
-- This can be removed in production
/*
INSERT INTO convoso_leads (
    lead_id, phone_number, first_name, last_name, email, source, 
    campaign_id, campaign_name, cost, state, city, insurance_type, 
    lead_score, status
) VALUES 
('CONV001', '555-1234', 'John', 'Doe', 'john.doe@example.com', 'convoso', 
 'CAMP001', 'Auto Insurance Q4', 25.00, 'CA', 'Los Angeles', 'auto', 
 75, 'new'),
('CONV002', '555-5678', 'Jane', 'Smith', 'jane.smith@example.com', 'convoso', 
 'CAMP002', 'Home Insurance Special', 35.00, 'TX', 'Houston', 'home', 
 85, 'new'),
('CONV003', '555-9012', 'Bob', 'Johnson', 'bob.johnson@example.com', 'convoso', 
 'CAMP001', 'Auto Insurance Q4', 25.00, 'FL', 'Miami', 'auto', 
 65, 'contacted')
ON CONFLICT (lead_id) DO NOTHING;
*/