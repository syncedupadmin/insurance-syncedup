-- Insurance.SyncedUp Database Schema Export
-- Generated: 2025-09-23T04:43:02.077Z


-- Table: profiles
CREATE TABLE profiles (
  id INTEGER,
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  email TEXT,
  role TEXT,
  agency_id TEXT,
  phone TEXT,
  department TEXT,
  supervisor_id TEXT,
  commission_rate TEXT,
  is_active BOOLEAN,
  last_login TEXT
);

-- Table: agencies
CREATE TABLE agencies (
  id UUID,
  name TEXT,
  code TEXT,
  admin_email TEXT,
  api_credentials JSONB,
  features JSONB,
  settings JSONB,
  commission_split INTEGER,
  is_active BOOLEAN,
  created_at TIMESTAMP,
  participate_global_leaderboard BOOLEAN,
  commission_structure JSONB,
  pay_period TEXT,
  pay_day INTEGER,
  is_demo BOOLEAN,
  stripe_customer_id TEXT,
  agency_id TEXT,
  subscription_plan TEXT,
  contact_email TEXT,
  updated_at TIMESTAMP,
  monthly_fee INTEGER,
  subscription_status TEXT,
  next_billing_date TEXT,
  user_limit INTEGER,
  storage_limit_gb INTEGER,
  trial_ends_at TEXT,
  payment_status TEXT,
  last_payment_date TEXT,
  failed_payment_count INTEGER,
  storage_used_gb INTEGER,
  api_calls_this_month INTEGER,
  api_calls_limit INTEGER
);

-- Table: customers
CREATE TABLE customers (
  id UUID,
  agency_id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Table: quotes
-- Table exists but is empty
-- Row count: 0

-- Table: sales
-- Table exists but is empty
-- Row count: 0

-- Table: commissions
-- Table exists but is empty
-- Row count: 0

-- Table: claims
-- Error accessing table: Could not find the table 'public.claims' in the schema cache

-- Table: payments
-- Table exists but is empty
-- Row count: 0

-- Table: products
CREATE TABLE products (
  id UUID,
  name TEXT,
  carrier TEXT,
  states JSONB,
  premium INTEGER,
  commission_rate INTEGER,
  created_at TIMESTAMP,
  coverage_tier TEXT
);

-- Table: activities
-- Error accessing table: Could not find the table 'public.activities' in the schema cache

-- Table: notifications
-- Error accessing table: Could not find the table 'public.notifications' in the schema cache

-- Table: messages
-- Error accessing table: Could not find the table 'public.messages' in the schema cache

-- Table: audit_logs
CREATE TABLE audit_logs (
  id UUID,
  agency_id TEXT,
  user_id TEXT,
  action TEXT,
  resource_type TEXT,
  resource_id TEXT,
  changes TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP,
  admin_email TEXT,
  user_email TEXT,
  details JSONB,
  portal TEXT,
  admin_id TEXT,
  session_id TEXT,
  screen_resolution TEXT,
  browser_language TEXT,
  referrer TEXT,
  metadata TEXT,
  target_resource TEXT
);

-- Table: documents
-- Table exists but is empty
-- Row count: 0

-- Table: teams
CREATE TABLE teams (
  id UUID,
  agency_id UUID,
  name TEXT,
  manager_id UUID,
  created_at TIMESTAMP
);
