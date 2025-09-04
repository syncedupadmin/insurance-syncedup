-- Fix agencies table to support proper organizational hierarchy
-- Hierarchy: Super-admin -> Agency -> Admin -> Manager -> Customer Service -> Agent

-- First, let's see what columns exist in the current agencies table
-- and add the missing ones needed for proper agency management

-- Add missing columns to agencies table if they don't exist
ALTER TABLE agencies 
ADD COLUMN IF NOT EXISTS agency_id VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS plan_type VARCHAR(50) DEFAULT 'basic',
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS monthly_revenue DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS user_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS performance_score DECIMAL(5,2) DEFAULT 75.0,
ADD COLUMN IF NOT EXISTS last_active VARCHAR(100) DEFAULT 'Just created',
ADD COLUMN IF NOT EXISTS created_by_super_admin_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create a trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_agencies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_agencies_updated_at_trigger ON agencies;
CREATE TRIGGER update_agencies_updated_at_trigger
    BEFORE UPDATE ON agencies
    FOR EACH ROW
    EXECUTE FUNCTION update_agencies_updated_at();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_agencies_agency_id ON agencies(agency_id);
CREATE INDEX IF NOT EXISTS idx_agencies_status ON agencies(status);
CREATE INDEX IF NOT EXISTS idx_agencies_plan_type ON agencies(plan_type);
CREATE INDEX IF NOT EXISTS idx_agencies_created_by ON agencies(created_by_super_admin_id);

-- Ensure users table has proper role hierarchy
-- Update users table to support the full hierarchy
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role_level INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id),
ADD COLUMN IF NOT EXISTS reports_to_user_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS department VARCHAR(100);

-- Update role levels to reflect hierarchy
-- 1 = Super Admin
-- 2 = Agency Admin  
-- 3 = Manager
-- 4 = Customer Service
-- 5 = Agent

UPDATE users SET role_level = 1 WHERE role = 'super-admin' OR role = 'super_admin';
UPDATE users SET role_level = 2 WHERE role = 'admin';
UPDATE users SET role_level = 3 WHERE role = 'manager';
UPDATE users SET role_level = 4 WHERE role = 'customer-service' OR role = 'customer_service';
UPDATE users SET role_level = 5 WHERE role = 'agent';

-- Add constraints for role hierarchy
ALTER TABLE users ADD CONSTRAINT check_role_hierarchy 
    CHECK (role_level BETWEEN 1 AND 5);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_role_level ON users(role_level);
CREATE INDEX IF NOT EXISTS idx_users_agency_id ON users(agency_id);
CREATE INDEX IF NOT EXISTS idx_users_reports_to ON users(reports_to_user_id);

-- Create a view for the organizational hierarchy
CREATE OR REPLACE VIEW organizational_hierarchy AS
SELECT 
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    u.role,
    u.role_level,
    u.agency_id,
    a.name as agency_name,
    u.reports_to_user_id,
    boss.first_name || ' ' || boss.last_name as reports_to_name,
    u.department,
    u.created_at
FROM users u
LEFT JOIN agencies a ON u.agency_id = a.id
LEFT JOIN users boss ON u.reports_to_user_id = boss.id
ORDER BY u.role_level, a.name, u.last_name;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON agencies TO authenticated;
GRANT SELECT ON organizational_hierarchy TO authenticated;