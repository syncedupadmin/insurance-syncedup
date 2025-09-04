-- Add demo users for testing
-- Run this in your Supabase SQL editor

-- Insert or update demo users
INSERT INTO users (id, email, name, role, agency_id, is_active, must_change_password, login_count, password_hash, created_at, updated_at)
VALUES 
  (
    gen_random_uuid(),
    'admin@demo.com',
    'Admin User', 
    'admin',
    'DEMO001',
    true,
    false,
    0,
    'demo123',
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    'manager@demo.com',
    'Manager User',
    'manager', 
    'DEMO001',
    true,
    false,
    0,
    'demo123',
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    'agent@demo.com',
    'Agent User',
    'agent',
    'DEMO001', 
    true,
    false,
    0,
    'demo123',
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    'super@demo.com',
    'Super Admin',
    'super-admin',
    'DEMO001',
    true,
    false, 
    0,
    'demo123',
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    'service@demo.com',
    'Customer Service',
    'customer-service',
    'DEMO001',
    true,
    false,
    0,
    'demo123', 
    now(),
    now()
  )
ON CONFLICT (email) 
DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  agency_id = EXCLUDED.agency_id,
  is_active = EXCLUDED.is_active,
  must_change_password = EXCLUDED.must_change_password,
  password_hash = EXCLUDED.password_hash,
  updated_at = now();