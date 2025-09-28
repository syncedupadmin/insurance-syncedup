-- Fix api_keys table schema to match application code expectations
-- Run this in Supabase SQL Editor

-- Add missing columns to api_keys table
ALTER TABLE api_keys
ADD COLUMN IF NOT EXISTS service VARCHAR(100),
ADD COLUMN IF NOT EXISTS name VARCHAR(255),
ADD COLUMN IF NOT EXISTS api_key_prefix VARCHAR(50),
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for faster lookups by agency and service
CREATE INDEX IF NOT EXISTS idx_api_keys_agency_service ON api_keys(agency_id, service);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);

-- Update existing rows to have 'active' status if null
UPDATE api_keys SET status = 'active' WHERE status IS NULL;

-- Add constraints (drop first if they exist to avoid errors)
DO $$
BEGIN
    -- Add status check constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'api_keys_status_check') THEN
        ALTER TABLE api_keys
        ADD CONSTRAINT api_keys_status_check
        CHECK (status IN ('active', 'inactive', 'expired', 'revoked'));
    END IF;

    -- Add service check constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'api_keys_service_check') THEN
        ALTER TABLE api_keys
        ADD CONSTRAINT api_keys_service_check
        CHECK (service IN ('convoso', 'boberdoo', 'stripe', 'twilio', 'sendgrid', 'other'));
    END IF;
END $$;

COMMENT ON COLUMN api_keys.service IS 'The external service this API key is for (e.g., convoso, boberdoo)';
COMMENT ON COLUMN api_keys.name IS 'Human-readable name for this API key';
COMMENT ON COLUMN api_keys.api_key_prefix IS 'First 8 chars of API key for display purposes';
COMMENT ON COLUMN api_keys.status IS 'Current status: active, inactive, expired, or revoked';
COMMENT ON COLUMN api_keys.last_used_at IS 'Timestamp of last time this key was used';
COMMENT ON COLUMN api_keys.encrypted_key IS 'Encrypted API key using AES-256-CBC (format: IV:ENCRYPTED)';