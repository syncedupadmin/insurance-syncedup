-- Convoso Integration Database Schema
-- Run this SQL in Supabase

-- Agencies table to store Convoso configuration for each agency
CREATE TABLE IF NOT EXISTS agencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  convoso_auth_token TEXT NOT NULL,
  api_base_url TEXT DEFAULT 'https://api.convoso.com/v1',
  campaigns JSONB DEFAULT '[]',
  lists JSONB DEFAULT '[]',
  queues JSONB DEFAULT '[]',
  field_mappings JSONB DEFAULT '{}',
  webhook_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_sync TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Convoso leads tracking table
CREATE TABLE IF NOT EXISTS convoso_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  internal_lead_id UUID,
  convoso_lead_id TEXT NOT NULL,
  list_id INTEGER NOT NULL,
  campaign_id INTEGER,
  status TEXT,
  last_disposition TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(agency_id, convoso_lead_id)
);

-- Convoso calls tracking table
CREATE TABLE IF NOT EXISTS convoso_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  convoso_lead_id TEXT,
  call_id TEXT,
  duration INTEGER DEFAULT 0,
  disposition TEXT,
  recording_url TEXT,
  agent_id TEXT,
  agent_name TEXT,
  call_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_convoso_leads_agency ON convoso_leads(agency_id);
CREATE INDEX IF NOT EXISTS idx_convoso_leads_convoso_id ON convoso_leads(convoso_lead_id);
CREATE INDEX IF NOT EXISTS idx_convoso_calls_agency ON convoso_calls(agency_id);
CREATE INDEX IF NOT EXISTS idx_convoso_calls_disposition ON convoso_calls(disposition);
CREATE INDEX IF NOT EXISTS idx_convoso_calls_call_time ON convoso_calls(call_time);

-- Update triggers for timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agencies_updated_at BEFORE UPDATE ON agencies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_convoso_leads_updated_at BEFORE UPDATE ON convoso_leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();