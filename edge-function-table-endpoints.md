# Add These Table Endpoints to Your Edge Function

Add these new routes to your `admin-gateway` Edge Function, right after the existing routes and before `Deno.serve`:

```typescript
// GET /admin-gateway/tables - List all database tables
app.get("/admin-gateway/tables", async (c) => {
  const authz = await requireSuperAdmin(c.req.raw);
  if (!authz.ok) return c.json({ error: authz.message }, authz.status);

  const { adminClient } = getSupabaseClients();

  try {
    // Query information_schema to get all public tables
    const { data: tables, error } = await adminClient
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');

    if (error) {
      // Fallback: try with a raw SQL query
      const { data: sqlResult, error: sqlError } = await adminClient.rpc('get_tables_list');

      if (sqlError) {
        return c.json({ ok: false, error: 'Unable to fetch tables' }, 500);
      }

      const tableNames = sqlResult?.map((t: any) => t.table_name) || [];
      return c.json({ ok: true, tables: tableNames });
    }

    const tableNames = tables?.map(t => t.table_name) || [];
    return c.json({ ok: true, tables: tableNames });
  } catch (err) {
    console.error('Error fetching tables:', err);
    return c.json({ ok: false, error: 'Failed to fetch tables' }, 500);
  }
});

// POST /admin-gateway/table-info - Get column information for a table
app.post("/admin-gateway/table-info", async (c) => {
  const authz = await requireSuperAdmin(c.req.raw);
  if (!authz.ok) return c.json({ error: authz.message }, authz.status);

  let body: { table?: string } = {};
  try { body = await c.req.json(); } catch {}
  const tableName = body.table;

  if (!tableName) return c.json({ error: "table name is required" }, 400);

  const { adminClient } = getSupabaseClients();

  try {
    const { data: columns, error } = await adminClient
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default, character_maximum_length')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .order('ordinal_position');

    if (error) {
      return c.json({ ok: false, error: error.message }, 500);
    }

    return c.json({ ok: true, columns: columns || [] });
  } catch (err) {
    console.error('Error fetching table info:', err);
    return c.json({ ok: false, error: 'Failed to fetch table info' }, 500);
  }
});

// POST /admin-gateway/table-ddl - Generate CREATE TABLE statement
app.post("/admin-gateway/table-ddl", async (c) => {
  const authz = await requireSuperAdmin(c.req.raw);
  if (!authz.ok) return c.json({ error: authz.message }, authz.status);

  let body: { table?: string } = {};
  try { body = await c.req.json(); } catch {}
  const tableName = body.table;

  if (!tableName) return c.json({ error: "table name is required" }, 400);

  const { adminClient } = getSupabaseClients();

  try {
    const { data: columns, error } = await adminClient
      .from('information_schema.columns')
      .select('*')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .order('ordinal_position');

    if (error) {
      return c.json({ ok: false, error: error.message }, 500);
    }

    if (!columns || columns.length === 0) {
      return c.json({ ok: false, error: 'Table not found' }, 404);
    }

    // Build CREATE TABLE statement
    let ddl = `CREATE TABLE ${tableName} (\n`;

    columns.forEach((col: any, idx: number) => {
      ddl += `    ${col.column_name} ${col.data_type.toUpperCase()}`;

      // Add length for varchar, char, etc.
      if (col.character_maximum_length) {
        ddl += `(${col.character_maximum_length})`;
      }

      // Add numeric precision if available
      if (col.numeric_precision && col.data_type === 'numeric') {
        ddl += `(${col.numeric_precision}${col.numeric_scale ? `, ${col.numeric_scale}` : ''})`;
      }

      // Add NOT NULL constraint
      if (col.is_nullable === 'NO') {
        ddl += ' NOT NULL';
      }

      // Add default value
      if (col.column_default) {
        ddl += ` DEFAULT ${col.column_default}`;
      }

      if (idx < columns.length - 1) {
        ddl += ',';
      }

      ddl += '\n';
    });

    ddl += ');';

    return c.json({ ok: true, ddl });
  } catch (err) {
    console.error('Error generating DDL:', err);
    return c.json({ ok: false, error: 'Failed to generate DDL' }, 500);
  }
});

// Alternative: If information_schema access is restricted, create this RPC function in Supabase SQL Editor:
/*
CREATE OR REPLACE FUNCTION get_tables_list()
RETURNS TABLE(table_name text)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT t.table_name::text
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
  ORDER BY t.table_name;
END;
$$ LANGUAGE plpgsql;
*/
```

## How to Add These to Your Edge Function

1. Copy the code above
2. In Supabase Dashboard, go to Edge Functions
3. Click on `admin-gateway`
4. Add these routes after your existing `/admin-gateway/reset-password` route
5. Click Deploy

## What This Adds

1. **GET /admin-gateway/tables** - Returns list of all database tables
2. **POST /admin-gateway/table-info** - Returns column details for a specific table
3. **POST /admin-gateway/table-ddl** - Generates CREATE TABLE statement for a table

## Testing

After deploying:
1. Go to your super admin dashboard
2. Navigate to Infrastructure
3. The Database Tables section should now show all your tables
4. Click on any table to see its structure
5. Use "Copy CREATE TABLE" to get the DDL

## Security

- All endpoints require super_admin role
- Only exposes table structure, never actual data
- Maintains privacy-preserving approach