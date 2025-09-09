-- Create audit_logs table for comprehensive system auditing
-- This table is referenced in the codebase but was missing from the database

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- User and Agency Context
    user_id UUID REFERENCES portal_users(id),
    agency_id VARCHAR(255) NOT NULL,
    
    -- Action Details
    action VARCHAR(100) NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.
    resource_type VARCHAR(100), -- user, lead, sale, etc.
    resource_id VARCHAR(255), -- ID of the affected resource
    
    -- Change Tracking
    old_values JSONB DEFAULT '{}',
    new_values JSONB DEFAULT '{}',
    changes JSONB DEFAULT '{}',
    
    -- Request Context
    ip_address VARCHAR(45),
    user_agent TEXT,
    endpoint VARCHAR(255),
    method VARCHAR(10),
    
    -- Additional Details
    details TEXT,
    metadata JSONB DEFAULT '{}',
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    
    -- Timestamps
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_agency_id ON audit_logs(agency_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_agency_timestamp ON audit_logs(agency_id, timestamp DESC);

-- Enable RLS for multi-tenant access
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for agency isolation
CREATE POLICY "Users can view their agency's audit logs" ON audit_logs
    FOR SELECT USING (
        agency_id IN (
            SELECT agency_id FROM portal_users 
            WHERE id = auth.uid()
        )
    );

-- Super admins can see all audit logs
CREATE POLICY "Super admins can view all audit logs" ON audit_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM portal_users 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Add helpful comments
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all system actions';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type of resource being acted upon (user, lead, sale, etc.)';
COMMENT ON COLUMN audit_logs.resource_id IS 'ID of the specific resource being acted upon';
COMMENT ON COLUMN audit_logs.changes IS 'JSONB object containing the changes made';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional context information';

-- Create function to automatically log actions
CREATE OR REPLACE FUNCTION log_audit_action(
    p_user_id UUID,
    p_agency_id VARCHAR(255),
    p_action VARCHAR(100),
    p_resource_type VARCHAR(100) DEFAULT NULL,
    p_resource_id VARCHAR(255) DEFAULT NULL,
    p_changes JSONB DEFAULT '{}',
    p_details TEXT DEFAULT NULL,
    p_ip_address VARCHAR(45) DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    audit_id UUID;
BEGIN
    INSERT INTO audit_logs (
        user_id, agency_id, action, resource_type, resource_id,
        changes, details, ip_address, user_agent
    ) VALUES (
        p_user_id, p_agency_id, p_action, p_resource_type, p_resource_id,
        p_changes, p_details, p_ip_address, p_user_agent
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql;

-- Sample audit entries for testing
INSERT INTO audit_logs (user_id, agency_id, action, resource_type, details) 
SELECT 
    id, 
    agency_id, 
    'TABLE_CREATED', 
    'audit_logs', 
    'Audit logs table created and initialized'
FROM portal_users 
WHERE role = 'super_admin' 
LIMIT 1
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT ALL ON audit_logs TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Verification query
SELECT 'Audit logs table created successfully!' as status;