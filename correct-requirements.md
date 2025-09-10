# STOP - Wrong Direction!

I don't need a generic user profile system with usernames, bios, marketing consent, etc.

I have an INSURANCE MANAGEMENT SYSTEM that needs:

## Current profiles table structure (already exists):
```sql
profiles (
  id bigint primary key,
  user_id uuid references auth.users,
  email text unique not null,
  full_name text not null,
  role text CHECK (role IN ('super_admin', 'admin', 'manager', 'agent', 'customer_service')),
  agency_id bigint references agencies(id),
  is_active boolean default true
)
```

## What I need is INSURANCE-SPECIFIC:

1. **Populate profiles with these EXACT records:**
   - 2 super admins from auth.users
   - 8 insurance staff from portal_users (agents, managers, etc.)

2. **Link to agencies table** (insurance agencies, not social profiles!)

3. **Add commission tracking** for insurance agents

4. **Add system_metrics** for insurance KPIs (quotes, policies, claims)

5. **RLS for insurance roles:**
   - Agents see only their customers
   - Managers see their team
   - Admins see their agency
   - Super admins see everything

Please provide SQL for an INSURANCE SYSTEM, not a social media platform. No usernames, no marketing consent, no bios needed!