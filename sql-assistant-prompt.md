# SQL Assistant Request: Complete Database Setup for Insurance Portal System

## Current Situation:
I have an insurance management system with these existing tables:
- `auth.users` (2 users: admin@syncedupsolutions.com and superadmin@demo.com)
- `portal_users` (8 users with roles: admin, manager, agent, customer_service, super_admin)
- `agencies` (3 records: Demo Agency, PHS Insurance Agency, SyncedUp Solutions)
- `profiles` (EXISTS but EMPTY - 0 rows)
- `commission_records` (EXISTS but EMPTY)
- `system_metrics` (EXISTS but EMPTY)
- `quotes`, `policies`, `claims` (all exist but empty)

## What I Need:
Create a single SQL script that will:

1. **Populate the empty `profiles` table** with:
   - The 2 auth.users (both should have role='super_admin')
   - The 8 portal_users (keeping their existing roles: admin, manager, agent, customer_service)
   - Link profiles to agencies based on email domain:
     - @demo.com → Demo Agency
     - @phsagency.com → PHS Insurance Agency  
     - @syncedupsolutions.com → SyncedUp Solutions

2. **Add `monthly_fee` column to agencies table** and set:
   - Demo Agency: $99/month
   - PHS Insurance Agency: $299/month
   - SyncedUp Solutions: $999/month

3. **Create sample commission_records** for testing (5-10 records for any agent)

4. **Populate system_metrics** with one record for today with reasonable values

5. **Set up Row Level Security (RLS)** with these rules:
   - super_admin: Can see/edit everything
   - admin: Can see/edit everything in their agency
   - manager: Can see/edit their team in their agency
   - agent: Can only see/edit their own records
   - customer_service: Can view customers and edit claims
   - Service role (used by APIs): Bypass all RLS

## Important Notes:
- The `profiles` table has columns: id (bigint), user_id (uuid), email, full_name, role, agency_id, is_active
- auth.users IDs are: '41589ffb-5613-41ad-9251-03ca35ab9d89' and 'c6dad962-c773-4ec9-8ac3-a6324fe8f889'
- Use ON CONFLICT to avoid duplicate errors
- Make the script idempotent (safe to run multiple times)
- The script should complete without errors even if some data already exists

## Expected Result:
After running the script:
- profiles table should have ~10 records (2 from auth.users + 8 from portal_users)
- agencies should have monthly_fee values
- commission_records should have sample data
- system_metrics should have today's metrics
- RLS policies should be active but allow service role to bypass for API access

Please create a single, complete SQL script that handles all of this without errors.