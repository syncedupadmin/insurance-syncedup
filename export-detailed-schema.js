const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zgkszwkxibpnxhvlenct.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function exportDetailedSchema() {
  const fs = require('fs');
  let schemaOutput = '-- Insurance.SyncedUp Database Schema Export\n';
  schemaOutput += `-- Generated: ${new Date().toISOString()}\n\n`;

  const tables = [
    'profiles', 'agencies', 'customers', 'quotes', 'sales',
    'commissions', 'claims', 'payments', 'products', 'activities',
    'notifications', 'messages', 'audit_logs', 'documents', 'teams'
  ];

  console.log('=== DETAILED SCHEMA EXPORT ===\n');

  for (const tableName of tables) {
    console.log(`\nAnalyzing table: ${tableName}`);
    schemaOutput += `\n-- Table: ${tableName}\n`;

    try {
      // Get a sample row to understand structure
      const { data: sample, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (!error && sample && sample.length > 0) {
        const row = sample[0];
        const columns = Object.keys(row);

        schemaOutput += `CREATE TABLE ${tableName} (\n`;
        console.log(`  Columns found: ${columns.length}`);

        const columnDefs = [];
        for (const col of columns) {
          const value = row[col];
          let dataType = 'TEXT';

          if (value === null) {
            dataType = 'TEXT'; // Can't determine from null
          } else if (typeof value === 'boolean') {
            dataType = 'BOOLEAN';
          } else if (typeof value === 'number') {
            dataType = Number.isInteger(value) ? 'INTEGER' : 'NUMERIC';
          } else if (typeof value === 'string') {
            if (value.match(/^\d{4}-\d{2}-\d{2}T/)) {
              dataType = 'TIMESTAMP';
            } else if (value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
              dataType = 'UUID';
            } else {
              dataType = 'TEXT';
            }
          } else if (typeof value === 'object') {
            dataType = 'JSONB';
          }

          columnDefs.push(`  ${col} ${dataType}`);
          console.log(`    - ${col}: ${dataType}`);
        }

        schemaOutput += columnDefs.join(',\n');
        schemaOutput += '\n);\n';
      } else if (!error) {
        // Table exists but is empty
        console.log('  Table is empty - cannot determine structure');
        schemaOutput += `-- Table exists but is empty\n`;

        // Try to get at least basic info
        const { count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        schemaOutput += `-- Row count: ${count || 0}\n`;
      } else {
        console.log(`  Error: ${error.message}`);
        schemaOutput += `-- Error accessing table: ${error.message}\n`;
      }
    } catch (e) {
      console.log(`  Error: ${e.message}`);
      schemaOutput += `-- Error: ${e.message}\n`;
    }
  }

  // Save to file
  fs.writeFileSync('schema.sql', schemaOutput);
  console.log('\n✅ Schema exported to schema.sql');

  // Also check for sample data
  console.log('\n=== DATA SUMMARY ===\n');

  for (const tableName of tables) {
    try {
      const { count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      console.log(`${tableName}: ${count || 0} rows`);

      // Get sample data for non-empty tables
      if (count > 0 && count <= 10) {
        const { data } = await supabase
          .from(tableName)
          .select('*')
          .limit(3);

        if (data && data.length > 0) {
          console.log(`  Sample data:`);
          data.forEach((row, i) => {
            const preview = Object.entries(row)
              .slice(0, 3)
              .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
              .join(', ');
            console.log(`    Row ${i + 1}: ${preview}...`);
          });
        }
      }
    } catch (e) {
      console.log(`${tableName}: Error - ${e.message}`);
    }
  }

  // Check relationships
  console.log('\n=== CHECKING RELATIONSHIPS ===\n');

  // Check profiles -> agencies relationship
  const { data: profilesWithAgency } = await supabase
    .from('profiles')
    .select('id, email, agency_id')
    .limit(5);

  if (profilesWithAgency) {
    console.log('Profiles -> Agencies relationship:');
    for (const profile of profilesWithAgency) {
      if (profile.agency_id) {
        const { data: agency } = await supabase
          .from('agencies')
          .select('name')
          .eq('id', profile.agency_id)
          .single();

        console.log(`  ${profile.email} -> ${agency?.name || 'Unknown Agency'}`);
      } else {
        console.log(`  ${profile.email} -> No agency assigned`);
      }
    }
  }

  return schemaOutput;
}

exportDetailedSchema()
  .then(() => console.log('\n✅ Export complete!'))
  .catch(err => console.error('Fatal error:', err));