import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchemas() {
  console.log('=== CHECKING QUOTES TABLE ===');
  const { data: quotesData, error: quotesError } = await supabase
    .from('quotes')
    .select('*')
    .limit(1);

  if (quotesError) {
    console.error('Error:', quotesError);
  } else if (quotesData && quotesData.length > 0) {
    console.log('Sample quote record:');
    console.log(JSON.stringify(quotesData[0], null, 2));
    console.log('\nAvailable columns:');
    Object.keys(quotesData[0]).forEach(key => console.log(`  - ${key}`));
  } else {
    console.log('No quotes found, checking table structure via insert attempt...');
  }

  console.log('\n=== CHECKING PORTAL_SALES TABLE ===');
  const { data: salesData, error: salesError } = await supabase
    .from('portal_sales')
    .select('*')
    .limit(1);

  if (salesError) {
    console.error('Error:', salesError);
  } else if (salesData && salesData.length > 0) {
    console.log('Sample sales record:');
    console.log(JSON.stringify(salesData[0], null, 2));
    console.log('\nAvailable columns:');
    Object.keys(salesData[0]).forEach(key => console.log(`  - ${key}`));
  } else {
    console.log('No sales found, table is empty');
  }

  console.log('\n=== CHECKING TABLE INFO FROM INFORMATION_SCHEMA ===');
  const { data: quotesColumns, error: qcError } = await supabase
    .rpc('exec_sql', {
      sql: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'quotes' ORDER BY ordinal_position"
    });

  if (!qcError && quotesColumns) {
    console.log('\nQuotes table columns from information_schema:');
    quotesColumns.forEach(col => console.log(`  - ${col.column_name} (${col.data_type})`));
  }

  const { data: salesColumns, error: scError } = await supabase
    .rpc('exec_sql', {
      sql: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'portal_sales' ORDER BY ordinal_position"
    });

  if (!scError && salesColumns) {
    console.log('\nPortal_sales table columns from information_schema:');
    salesColumns.forEach(col => console.log(`  - ${col.column_name} (${col.data_type})`));
  }
}

checkSchemas();