-- Add missing columns to agencies table for super-admin management
-- These columns are expected by the frontend super-admin portal

ALTER TABLE agencies
ADD COLUMN IF NOT EXISTS code VARCHAR(50),
ADD COLUMN IF NOT EXISTS admin_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS monthly_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS next_billing_date DATE,
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS user_limit INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS storage_limit_gb INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS api_calls_limit INTEGER DEFAULT 100000;

-- Update existing agencies to have reasonable defaults
UPDATE agencies
SET
    code = COALESCE(code, LEFT(id::text, 8)),
    admin_email = COALESCE(admin_email, contact_email),
    subscription_status = COALESCE(subscription_status, billing_status, 'active'),
    next_billing_date = COALESCE(next_billing_date, (CURRENT_DATE + INTERVAL '1 month')::DATE)
WHERE code IS NULL OR admin_email IS NULL OR subscription_status IS NULL OR next_billing_date IS NULL;

-- Create index for agency code lookups
CREATE INDEX IF NOT EXISTS idx_agencies_code ON agencies(code);
CREATE INDEX IF NOT EXISTS idx_agencies_subscription_status ON agencies(subscription_status);