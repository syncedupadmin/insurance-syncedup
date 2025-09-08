-- License Management Database Schema for SyncedUp Insurance Platform
-- This schema supports NIPR integration and comprehensive license tracking

-- Create licenses table
CREATE TABLE IF NOT EXISTS licenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id UUID REFERENCES portal_users(id),
    agency_id UUID REFERENCES agencies(id),
    license_number VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    license_type VARCHAR(50) NOT NULL,
    issue_date DATE NOT NULL,
    expiration_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'Active',
    nipr_id VARCHAR(100),
    last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add constraints
    CONSTRAINT licenses_status_check CHECK (status IN ('Active', 'Expired', 'Suspended', 'Pending')),
    CONSTRAINT licenses_state_check CHECK (LENGTH(state) = 2),
    CONSTRAINT licenses_dates_check CHECK (expiration_date > issue_date)
);

-- Create license types lookup table
CREATE TABLE IF NOT EXISTS license_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type_code VARCHAR(20) UNIQUE NOT NULL,
    type_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert standard license types
INSERT INTO license_types (type_code, type_name, description) VALUES
    ('LIFE', 'Life Insurance', 'Life insurance producer license'),
    ('HEALTH', 'Health Insurance', 'Health insurance producer license'),
    ('PROP', 'Property Insurance', 'Property insurance producer license'),
    ('CAS', 'Casualty Insurance', 'Casualty insurance producer license'),
    ('LIFE_HEALTH', 'Life & Health', 'Combined life and health insurance license'),
    ('PROP_CAS', 'Property & Casualty', 'Combined property and casualty license'),
    ('VAR_LIFE', 'Variable Life', 'Variable life insurance license'),
    ('VAR_ANN', 'Variable Annuities', 'Variable annuities license'),
    ('SURPLUS', 'Surplus Lines', 'Surplus lines insurance license'),
    ('ADJUSTER', 'Claims Adjuster', 'Insurance claims adjuster license')
ON CONFLICT (type_code) DO NOTHING;

-- Create license renewal reminders table
CREATE TABLE IF NOT EXISTS license_reminders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    license_id UUID REFERENCES licenses(id) ON DELETE CASCADE,
    reminder_date DATE NOT NULL,
    reminder_type VARCHAR(20) DEFAULT 'expiration',
    status VARCHAR(20) DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT reminder_type_check CHECK (reminder_type IN ('expiration', 'renewal', 'compliance')),
    CONSTRAINT reminder_status_check CHECK (status IN ('pending', 'sent', 'cancelled'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_licenses_agent_id ON licenses(agent_id);
CREATE INDEX IF NOT EXISTS idx_licenses_agency_id ON licenses(agency_id);
CREATE INDEX IF NOT EXISTS idx_licenses_state ON licenses(state);
CREATE INDEX IF NOT EXISTS idx_licenses_expiration_date ON licenses(expiration_date);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_license_type ON licenses(license_type);
CREATE INDEX IF NOT EXISTS idx_licenses_last_sync ON licenses(last_sync);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_licenses_agency_status ON licenses(agency_id, status);
CREATE INDEX IF NOT EXISTS idx_licenses_expiration_status ON licenses(expiration_date, status);

-- Create function to calculate days until expiration
CREATE OR REPLACE FUNCTION days_until_expiration(exp_date DATE)
RETURNS INTEGER AS $$
BEGIN
    RETURN (exp_date - CURRENT_DATE);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to get compliance status
CREATE OR REPLACE FUNCTION get_compliance_status(exp_date DATE, status VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
    IF status != 'Active' THEN
        RETURN 'Non-Compliant';
    END IF;
    
    IF exp_date < CURRENT_DATE THEN
        RETURN 'Expired';
    ELSIF exp_date <= CURRENT_DATE + INTERVAL '30 days' THEN
        RETURN 'Expiring Soon';
    ELSIF exp_date <= CURRENT_DATE + INTERVAL '60 days' THEN
        RETURN 'Renewal Required';
    ELSE
        RETURN 'Compliant';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create view for license summary with calculated fields
CREATE OR REPLACE VIEW license_summary AS
SELECT 
    l.*,
    u.full_name as agent_name,
    u.email as agent_email,
    a.name as agency_name,
    days_until_expiration(l.expiration_date) as days_until_expiry,
    get_compliance_status(l.expiration_date, l.status) as compliance_status,
    CASE 
        WHEN l.expiration_date < CURRENT_DATE THEN 'expired'
        WHEN l.expiration_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring-soon'
        WHEN l.expiration_date <= CURRENT_DATE + INTERVAL '60 days' THEN 'renewal-needed'
        ELSE 'valid'
    END as expiration_category
FROM licenses l
LEFT JOIN portal_users u ON l.agent_id = u.id
LEFT JOIN agencies a ON l.agency_id = a.id;

-- Enable RLS (Row Level Security) for multi-tenant access
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_reminders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for licenses
CREATE POLICY "Users can view their agency's licenses" ON licenses
    FOR SELECT USING (
        agency_id IN (
            SELECT agency_id FROM portal_users 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Admins can manage all licenses" ON licenses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM portal_users 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- Insert sample data for testing (optional)
DO $$
DECLARE
    sample_agency_id UUID;
    sample_agent_id UUID;
BEGIN
    -- Get a sample agency and agent for testing
    SELECT id INTO sample_agency_id FROM agencies LIMIT 1;
    SELECT id INTO sample_agent_id FROM portal_users WHERE role = 'agent' LIMIT 1;
    
    IF sample_agency_id IS NOT NULL AND sample_agent_id IS NOT NULL THEN
        INSERT INTO licenses (
            agent_id, agency_id, license_number, state, license_type, 
            issue_date, expiration_date, status, nipr_id
        ) VALUES 
        (sample_agent_id, sample_agency_id, 'TX-123456', 'TX', 'LIFE_HEALTH', 
         '2022-01-15', '2025-01-15', 'Active', 'NIPR-TX-123456'),
        (sample_agent_id, sample_agency_id, 'CA-789012', 'CA', 'PROP_CAS', 
         '2021-06-01', '2024-12-31', 'Active', 'NIPR-CA-789012'),
        (sample_agent_id, sample_agency_id, 'FL-345678', 'FL', 'LIFE', 
         '2020-03-10', '2024-03-10', 'Expired', 'NIPR-FL-345678');
    END IF;
END $$;

-- Add helpful comments
COMMENT ON TABLE licenses IS 'Insurance license records with NIPR integration';
COMMENT ON COLUMN licenses.nipr_id IS 'National Insurance Producer Registry identifier';
COMMENT ON COLUMN licenses.metadata IS 'Additional license data from NIPR or manual entry';
COMMENT ON COLUMN licenses.last_sync IS 'Last synchronization timestamp with NIPR';
COMMENT ON VIEW license_summary IS 'Comprehensive license view with calculated fields for dashboard display';