-- Database setup for SyncedUp Insurance Platform
-- Run this in your Supabase SQL editor

-- Create agencies table if not exists
CREATE TABLE IF NOT EXISTS agencies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subscription_plan VARCHAR(50) DEFAULT 'starter',
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    website VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add agency_id to portal_users if missing
ALTER TABLE portal_users 
ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id);

-- Add last_login to portal_users for session tracking
ALTER TABLE portal_users 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Create transactions table if not exists  
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id UUID REFERENCES agencies(id),
    user_id UUID REFERENCES portal_users(id),
    amount DECIMAL(10, 2),
    type VARCHAR(50) DEFAULT 'commission',
    status VARCHAR(50) DEFAULT 'pending',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_agency ON transactions(agency_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_users_agency ON portal_users(agency_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON portal_users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON portal_users(last_login);
CREATE INDEX IF NOT EXISTS idx_agencies_active ON agencies(is_active);

-- Insert some sample agencies for testing (optional)
INSERT INTO agencies (name, subscription_plan, contact_email, is_active) 
VALUES 
  ('PHS Insurance Agency', 'professional', 'admin@phsagency.com', true),
  ('Demo Insurance Group', 'starter', 'demo@demo.com', true)
ON CONFLICT DO NOTHING;

-- Insert some sample transactions for testing (optional)
INSERT INTO transactions (agency_id, amount, type, status, description)
SELECT 
  a.id,
  (random() * 1000 + 100)::decimal(10,2),
  'commission',
  'completed',
  'Sample transaction for ' || a.name
FROM agencies a
WHERE NOT EXISTS (SELECT 1 FROM transactions WHERE agency_id = a.id)
LIMIT 10;

-- Update portal_users to have agency_id for existing users
UPDATE portal_users 
SET agency_id = (SELECT id FROM agencies WHERE contact_email LIKE '%' || split_part(portal_users.email, '@', 2) LIMIT 1)
WHERE agency_id IS NULL AND email NOT LIKE '%demo.com%';

-- Set demo users to demo agency
UPDATE portal_users 
SET agency_id = (SELECT id FROM agencies WHERE name = 'Demo Insurance Group' LIMIT 1)
WHERE agency_id IS NULL AND email LIKE '%demo.com%';

-- Enable RLS (Row Level Security) for better security
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Super admin can view all agencies" ON agencies
  FOR ALL USING (true); -- Super admin bypasses this with service role key

CREATE POLICY "Super admin can view all transactions" ON transactions
  FOR ALL USING (true); -- Super admin bypasses this with service role key

COMMENT ON TABLE agencies IS 'Insurance agencies using the SyncedUp platform';
COMMENT ON TABLE transactions IS 'Financial transactions and commissions for agencies';
COMMENT ON COLUMN portal_users.agency_id IS 'Links users to their respective insurance agencies';
COMMENT ON COLUMN portal_users.last_login IS 'Tracks user session activity for admin dashboard';