# Schema Details for SQL Assistant

## portal_users columns:
- id (UUID primary key)
- email (text)
- name (text) - Note: NOT full_name, just "name"
- role (text)
- agency_id (UUID)
- is_active (boolean)
- created_at (timestamp)
- last_login (timestamp)
- No "full_name" column - use "name" instead

## agencies columns:
- id (bigint primary key)
- name (text)
- code (text)
- contact_email (text)
- admin_email (text)
- is_active (boolean)
- No "monthly_fee" column yet - needs to be added

## profiles columns:
- id (bigint primary key generated always as identity)
- user_id (UUID unique, nullable, FK to auth.users(id))
- email (text unique not null)
- full_name (text not null)
- role (text with CHECK constraint for valid roles)
- agency_id (bigint, FK to agencies(id))
- is_active (boolean default true)
- supervisor_id (bigint, FK to profiles(id)) - for manager relationships
- created_at (timestamp)
- No direct manager_id, but supervisor_id can be used

## commission_records columns:
- id (bigint primary key generated always as identity)
- agent_id (bigint FK to profiles(id))
- commission_type (text)
- sale_amount (numeric(12,2))
- commission_rate (numeric(5,2))
- commission_amount (numeric(12,2))
- status (text)
- payment_date (timestamp)
- notes (text)
- created_at (timestamp)

## system_metrics columns:
- id (bigint primary key generated always as identity)
- metric_date (timestamp)
- total_users (bigint)
- active_users (bigint)
- new_users_today (bigint)
- new_users_week (bigint)
- new_users_month (bigint)
- total_quotes (bigint)
- total_policies (bigint)
- total_claims (bigint)
- revenue_monthly (numeric(14,2))
- revenue_annual (numeric(14,2))
- system_uptime (numeric(5,2))
- conversion_rate (numeric(5,2))
- api_response_time_ms (integer)
- created_at (timestamp)

## quotes columns:
- id (UUID primary key)
- agency_id (bigint)
- customer_id (bigint)
- agent_id (bigint)
- created_by (bigint)
- status (text)
- created_at (timestamp)

## policies columns:
- id (UUID primary key)
- agency_id (bigint)
- customer_id (bigint)
- agent_id (bigint)
- created_by (bigint)
- status (text)
- active (boolean)
- created_at (timestamp)

## claims columns:
- id (UUID primary key)
- policy_id (UUID)
- agency_id (bigint)
- handler_id (bigint)
- status (text)
- created_at (timestamp)

## Key constraints:
- profiles.email is UNIQUE
- profiles.user_id is UNIQUE and nullable (FK to auth.users)
- Team structure: use supervisor_id to define reporting relationships
- All agency_id columns should reference agencies(id)
- All agent_id, created_by, handler_id columns should reference profiles(id)

Please create the complete SQL script with this schema information.