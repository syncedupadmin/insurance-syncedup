# Complete Setup Request

The basic profiles table was created, but I need the COMPLETE insurance system setup. Please modify the profiles table and complete the setup:

## 1. ALTER the profiles table to add missing columns:
```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE NOT NULL,
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'manager', 'agent', 'customer_service', 'customer')),
ADD COLUMN IF NOT EXISTS agency_id BIGINT REFERENCES agencies(id),
ADD COLUMN IF NOT EXISTS supervisor_id BIGINT REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
```

## 2. POPULATE profiles with this exact data:

From auth.users (both are super_admin):
- user_id: '41589ffb-5613-41ad-9251-03ca35ab9d89', email: 'admin@syncedupsolutions.com', full_name: 'SyncedUp Super Admin', role: 'super_admin'
- user_id: 'c6dad962-c773-4ec9-8ac3-a6324fe8f889', email: 'superadmin@demo.com', full_name: 'Super Admin Demo', role: 'super_admin'

From portal_users (without auth accounts):
- email: 'admin@demo.com', name: 'Demo Admin', role: 'admin'
- email: 'manager@demo.com', name: 'Demo Manager', role: 'manager'
- email: 'service@demo.com', name: 'Demo Service', role: 'customer_service'
- email: 'admin@phsagency.com', name: 'PHS Administrator', role: 'agent'
- email: 'manager@phsagency.com', name: 'PHS Manager', role: 'agent'
- email: 'agent1@phsagency.com', name: 'PHS Agent 1', role: 'agent'
- email: 'agent@demo.com', name: 'Demo Agent', role: 'agent'

## 3. Link profiles to agencies:
- Emails ending in @demo.com → Demo Agency
- Emails ending in @phsagency.com → PHS Insurance Agency
- Emails ending in @syncedupsolutions.com → SyncedUp Solutions

## 4. Add monthly_fee to agencies:
```sql
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC(10,2);
UPDATE agencies SET monthly_fee = 99 WHERE name = 'Demo Agency';
UPDATE agencies SET monthly_fee = 299 WHERE name = 'PHS Insurance Agency';
UPDATE agencies SET monthly_fee = 999 WHERE name = 'SyncedUp Solutions';
```

## 5. Add sample commission_records for testing

## 6. Add one system_metrics record for today

## 7. Update RLS policies to include:
- Service role bypass for API access
- Role-based access (super_admin sees all, admin sees agency, agent sees own, etc.)

Please provide the complete SQL script to finish this setup.