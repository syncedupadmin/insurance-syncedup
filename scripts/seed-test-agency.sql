-- Seed SQL for Test Agency and Users
-- Run this in Supabase SQL editor (once) to create test accounts

-- 1. Create demo agency if not exists
INSERT INTO portal_agencies (id, name, status, created_at, updated_at) 
VALUES ('DEMO001', 'Demo Agency', 'active', now(), now())
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  updated_at = now();

-- 2. Upsert portal_users (using upsert to avoid duplicates)
INSERT INTO portal_users (
  email, 
  email_norm, 
  role, 
  full_name,
  agency_id, 
  is_active, 
  password_hash, 
  must_change_password,
  created_at, 
  updated_at
) VALUES 
  (
    'admin@syncedupsolutions.com',
    'admin@syncedupsolutions.com', 
    'super_admin',
    'Super Administrator',
    'DEMO001',
    true,
    '$2b$10$JE6wnWs9reik5566bTOxuurfN0OJErvEDzDcbKgiHjPk5YWHA5ZMW',
    false,
    now(),
    now()
  ),
  (
    'admin@demo.com',
    'admin@demo.com',
    'admin', 
    'Demo Administrator',
    'DEMO001',
    true,
    '$2b$10$SI769MEe/mq.izK671/UJukoG6JSL6qoe2cFpuXOG3ogRq0M.9UPC',
    false,
    now(),
    now()
  ),
  (
    'manager@demo.com',
    'manager@demo.com',
    'manager',
    'Demo Manager', 
    'DEMO001',
    true,
    '$2b$10$SI769MEe/mq.izK671/UJukoG6JSL6qoe2cFpuXOG3ogRq0M.9UPC',
    false,
    now(),
    now()
  ),
  (
    'agent@demo.com',
    'agent@demo.com',
    'agent',
    'Demo Agent',
    'DEMO001',
    true,
    '$2b$10$SI769MEe/mq.izK671/UJukoG6JSL6qoe2cFpuXOG3ogRq0M.9UPC',
    false,
    now(),
    now()
  ),
  (
    'service@demo.com',
    'service@demo.com',
    'customer_service',
    'Demo Customer Service',
    'DEMO001', 
    true,
    '$2b$10$SI769MEe/mq.izK671/UJukoG6JSL6qoe2cFpuXOG3ogRq0M.9UPC',
    false,
    now(),
    now()
  )
ON CONFLICT (email) DO UPDATE SET
  email_norm = EXCLUDED.email_norm,
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name,
  agency_id = EXCLUDED.agency_id,
  is_active = EXCLUDED.is_active,
  password_hash = EXCLUDED.password_hash,
  must_change_password = EXCLUDED.must_change_password,
  updated_at = now();

-- 3. Create password_resets table if not exists (for forgot password flow)
CREATE TABLE IF NOT EXISTS password_resets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);

-- Verify results
SELECT 'Accounts created/updated:' as status;
SELECT email, role, is_active, agency_id FROM portal_users 
WHERE email IN (
  'admin@syncedupsolutions.com',
  'admin@demo.com', 
  'manager@demo.com',
  'agent@demo.com',
  'service@demo.com'
) ORDER BY role, email;