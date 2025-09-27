# 🔍 How to Debug Supabase Issues

## Quick Diagnosis Scripts

### 1. Check Schema & Data
```bash
node debug-supabase-schema.js
```
Shows: tables, columns, data types, sample data

### 2. Find Bad Agency IDs
```bash
node find-bad-agency-ids.js
```
Shows: users with non-UUID agency_ids

### 3. Decode JWT Tokens
```bash
node debug-jwt-token.js "your-token-here"
```
Shows: what's inside the user's authentication token

---

## Using Supabase Dashboard

### Access Your Database:
1. Go to https://supabase.com
2. Sign in to your project
3. Click "Table Editor" (left sidebar)

### Common Queries:

#### Find Users by Email:
```sql
SELECT * FROM portal_users WHERE email = 'admin@demo.com';
```

#### Find Users with Bad Agency IDs:
```sql
SELECT id, email, role, agency_id
FROM portal_users
WHERE agency_id NOT SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
```

#### Check Agency Table:
```sql
SELECT id, name, code FROM agencies ORDER BY created_at DESC;
```

#### Find Leads with Invalid Agency IDs:
```sql
SELECT * FROM leads WHERE agency_id = 'test-agency-001';
```

---

## Using SQL Editor in Supabase

1. Go to "SQL Editor" in left sidebar
2. Click "New Query"
3. Paste your SQL
4. Click "Run"

### Useful Queries:

#### Check Column Types:
```sql
SELECT
  table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('agencies', 'portal_users', 'leads')
  AND column_name IN ('id', 'agency_id')
ORDER BY table_name, column_name;
```

#### Find Orphaned Records:
```sql
-- Users without matching agencies
SELECT u.email, u.agency_id
FROM portal_users u
LEFT JOIN agencies a ON u.agency_id = a.id
WHERE a.id IS NULL;

-- Leads without matching agencies
SELECT l.id, l.name, l.agency_id
FROM leads l
LEFT JOIN agencies a ON l.agency_id = a.id
WHERE a.id IS NULL;
```

---

## Common Errors & Solutions

### Error: `invalid input syntax for type uuid`

**Problem:** Trying to query UUID column with a string value

**Solution:**
- Check the actual data: `SELECT agency_id FROM portal_users LIMIT 10;`
- Find non-UUIDs: Run "Find Bad Agency IDs" query above
- Fix the data or change column type

### Error: `relation "table_name" does not exist`

**Problem:** Table hasn't been created yet

**Solution:**
```sql
-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'your_table_name'
);
```

### Error: `column "column_name" does not exist`

**Problem:** Column missing or renamed

**Solution:**
```sql
-- List all columns in a table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'your_table_name';
```

---

## Direct Supabase JS Queries

### In Node.js:
```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Select all
const { data, error } = await supabase
  .from('portal_users')
  .select('*');

// Filter
const { data, error } = await supabase
  .from('portal_users')
  .select('*')
  .eq('role', 'admin');

// Multiple filters
const { data, error } = await supabase
  .from('portal_users')
  .select('*')
  .eq('role', 'admin')
  .eq('agency_id', 'some-uuid');

// Join
const { data, error } = await supabase
  .from('portal_users')
  .select(`
    *,
    agencies (
      id,
      name,
      code
    )
  `)
  .eq('role', 'admin');
```

---

## Real-time Logs

### Check Vercel Logs:
1. Go to Vercel Dashboard
2. Select your project
3. Click "Logs" tab
4. Filter by function (e.g., `/api/admin/leads`)

### Check Supabase Logs:
1. Go to Supabase Dashboard
2. Click "Logs" (left sidebar)
3. Choose log type:
   - Database: SQL queries
   - API: API requests
   - Auth: Authentication events

---

## Current Issue: "test-agency-001" Error

### Root Cause:
Old JWT token in browser cookies contains `agency_id: "test-agency-001"` (string)
But database expects UUID format

### Solution:
**Clear browser cookies and re-login**

Or run this in browser console:
```javascript
document.cookie.split(';').forEach(c => {
  document.cookie = c.trim().split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/';
});
location.reload();
```

Then login again with valid credentials.