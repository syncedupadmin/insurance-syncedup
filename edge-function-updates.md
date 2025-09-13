# Edge Function Updates Required for Table Viewer

The super admin dashboard now includes a table viewer that needs the following endpoints to be added to your `admin-gateway` Edge Function:

## 1. GET /tables endpoint
Returns a list of all tables in the database.

```typescript
// Handle GET /tables
if (req.method === 'GET' && pathname === '/tables') {
  const { data: tables, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .order('table_name');

  if (error) {
    return jsonResponse({ ok: false, error: error.message }, 500);
  }

  const tableNames = tables?.map(t => t.table_name) || [];
  return jsonResponse({ ok: true, tables: tableNames });
}
```

## 2. POST /table-info endpoint
Returns column information for a specific table.

```typescript
// Handle POST /table-info
if (req.method === 'POST' && pathname === '/table-info') {
  const { table } = await req.json();

  if (!table) {
    return jsonResponse({ ok: false, error: 'Table name required' }, 400);
  }

  const { data: columns, error } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable, column_default')
    .eq('table_schema', 'public')
    .eq('table_name', table)
    .order('ordinal_position');

  if (error) {
    return jsonResponse({ ok: false, error: error.message }, 500);
  }

  return jsonResponse({ ok: true, columns: columns || [] });
}
```

## 3. POST /table-ddl endpoint
Returns the CREATE TABLE statement for a specific table (reconstructed from column info).

```typescript
// Handle POST /table-ddl
if (req.method === 'POST' && pathname === '/table-ddl') {
  const { table } = await req.json();

  if (!table) {
    return jsonResponse({ ok: false, error: 'Table name required' }, 400);
  }

  const { data: columns, error } = await supabase
    .from('information_schema.columns')
    .select('*')
    .eq('table_schema', 'public')
    .eq('table_name', table)
    .order('ordinal_position');

  if (error) {
    return jsonResponse({ ok: false, error: error.message }, 500);
  }

  // Reconstruct DDL
  let ddl = `CREATE TABLE ${table} (\n`;

  columns?.forEach((col, idx) => {
    ddl += `    ${col.column_name} ${col.data_type.toUpperCase()}`;

    if (col.character_maximum_length) {
      ddl += `(${col.character_maximum_length})`;
    }

    if (col.is_nullable === 'NO') {
      ddl += ' NOT NULL';
    }

    if (col.column_default) {
      ddl += ` DEFAULT ${col.column_default}`;
    }

    if (idx < columns.length - 1) {
      ddl += ',';
    }

    ddl += '\n';
  });

  ddl += ');';

  return jsonResponse({ ok: true, ddl });
}
```

## Alternative: Using Supabase's Built-in Functions

If `information_schema` access is restricted, you can use Supabase's RPC functions:

```typescript
// For getting tables (alternative method)
const { data: tables, error } = await supabase.rpc('get_tables_list');

// You would need to create this function in Supabase:
/*
CREATE OR REPLACE FUNCTION get_tables_list()
RETURNS TABLE(table_name text) AS $$
BEGIN
  RETURN QUERY
  SELECT t.table_name::text
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
  ORDER BY t.table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/
```

## Full Integration Points

Add these handlers after your existing SQL execution handler in the Edge Function:

1. The table listing will appear automatically when users navigate to Infrastructure
2. Clicking on a table name will show its structure
3. The "Copy CREATE TABLE" button will generate DDL and copy it to clipboard
4. The DDL will also be placed in the SQL query editor for easy modification

## Testing

After adding these endpoints to your Edge Function:

1. Navigate to Infrastructure tab
2. You should see a list of all database tables
3. Click on any table to see its structure
4. Try the "Copy CREATE TABLE" button to get the DDL

## Security Note

These endpoints only expose table structure information, not actual data. This maintains the privacy-preserving approach while giving super admins the database schema visibility they need for management tasks.