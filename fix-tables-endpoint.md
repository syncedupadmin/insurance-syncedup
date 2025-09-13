# Fix for Tables Endpoint - 400 Error

The 400 error is happening because the Edge Function is trying to call `list_tables_simple` but it's in the `private` schema. Here's the fix:

## Option 1: Update the Edge Function (Recommended)

Replace your current `/admin-gateway/tables` endpoint with this:

```typescript
app.get("/admin-gateway/tables", async (c) => {
  const supa = getSupabaseAdmin();

  // Call the function with the full schema path
  const { data, error } = await supa.rpc("list_tables_simple", undefined, {
    schema: 'private'
  });

  if (error) {
    console.error('RPC error:', error);
    return c.json({ error: error.message }, 400);
  }

  return c.json({ tables: data || [] });
});
```

## Option 2: Create a Public Wrapper Function

If Option 1 doesn't work, create this in Supabase SQL Editor:

```sql
-- Create a public wrapper that calls the private function
create or replace function public.get_table_list()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select private.list_tables_simple();
$$;

-- Grant execute only to service role
revoke all on function public.get_table_list() from public, anon, authenticated;
grant execute on function public.get_table_list() to service_role;
```

Then update the Edge Function to:

```typescript
app.get("/admin-gateway/tables", async (c) => {
  const supa = getSupabaseAdmin();
  const { data, error } = await supa.rpc("get_table_list");

  if (error) {
    console.error('RPC error:', error);
    return c.json({ error: error.message }, 400);
  }

  return c.json({ tables: data || [] });
});
```

## Option 3: Direct Query (Simplest)

Skip the RPC entirely and query directly:

```typescript
app.get("/admin-gateway/tables", async (c) => {
  const supa = getSupabaseAdmin();

  // Direct query to information_schema
  const { data, error } = await supa
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public');

  if (error) {
    console.error('Query error:', error);
    return c.json({ error: error.message }, 400);
  }

  // Format the response
  const tables = data?.map(row => ({
    schema: 'public',
    name: row.table_name
  })) || [];

  return c.json({ tables });
});
```

## Testing

After updating the Edge Function, test it directly:

```bash
curl https://zgkszwkxibpnxhvlenct.supabase.co/functions/v1/admin-gateway/tables
```

You should see:
```json
{
  "tables": [
    {"schema": "public", "name": "agencies"},
    {"schema": "public", "name": "portal_users"},
    ...
  ]
}
```

## Why This Happens

1. RPC functions in non-public schemas need the schema specified
2. The service role can access private schema but needs explicit path
3. Direct queries to information_schema work but might be blocked by RLS

Choose Option 3 for the quickest fix - it's the simplest and most reliable.