const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zgkszwkxibpnxhvlenct.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseKey) {
  console.error('SUPABASE_SERVICE_KEY not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

async function exportSchema() {
  console.log('Fetching database schema...\n');

  try {
    // Get all tables
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_schema')
      .in('table_schema', ['public'])
      .order('table_name');

    if (tablesError) throw tablesError;

    console.log('=== DATABASE TABLES ===\n');

    for (const table of tables || []) {
      console.log(`\nTABLE: ${table.table_name}`);
      console.log('-'.repeat(50));

      // Get columns for each table
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default, character_maximum_length')
        .eq('table_schema', 'public')
        .eq('table_name', table.table_name)
        .order('ordinal_position');

      if (columnsError) {
        console.log(`  Error fetching columns: ${columnsError.message}`);
        continue;
      }

      for (const col of columns || []) {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const maxLength = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';

        console.log(`  ${col.column_name}: ${col.data_type}${maxLength} ${nullable}${defaultVal}`);
      }

      // Get foreign keys
      const { data: fks, error: fksError } = await supabase
        .rpc('get_table_foreign_keys', { table_name: table.table_name })
        .single();

      if (!fksError && fks) {
        console.log('\n  Foreign Keys:');
        console.log(`    ${JSON.stringify(fks, null, 2)}`);
      }
    }

    // Get RLS policies
    console.log('\n\n=== ROW LEVEL SECURITY POLICIES ===\n');

    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('schemaname', 'public');

    if (policiesError) {
      console.log(`Error fetching policies: ${policiesError.message}`);
    } else if (policies && policies.length > 0) {
      for (const policy of policies) {
        console.log(`\nPOLICY: ${policy.policyname}`);
        console.log(`  Table: ${policy.tablename}`);
        console.log(`  Command: ${policy.cmd}`);
        console.log(`  Roles: ${policy.roles}`);
        console.log(`  Definition: ${policy.qual}`);
      }
    } else {
      console.log('No RLS policies found');
    }

  } catch (error) {
    console.error('Error exporting schema:', error.message);

    // Alternative approach - try to query tables directly
    console.log('\n\nAttempting alternative approach...\n');

    const knownTables = [
      'profiles', 'agencies', 'customers', 'quotes', 'sales',
      'commissions', 'claims', 'payments', 'products', 'activities',
      'notifications', 'messages', 'audit_logs', 'documents', 'teams'
    ];

    console.log('=== CHECKING KNOWN TABLES ===\n');

    for (const tableName of knownTables) {
      try {
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (!error) {
          console.log(`✅ ${tableName}: EXISTS (${count || 0} rows)`);
        } else {
          console.log(`❌ ${tableName}: ${error.message}`);
        }
      } catch (e) {
        console.log(`❌ ${tableName}: Error checking table`);
      }
    }
  }
}

exportSchema().then(() => {
  console.log('\nSchema export complete!');
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});