import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function documentSchema() {
  const tables = [
    'portal_agencies',
    'portal_agents',
    'portal_users',
    'portal_sales',
    'portal_commissions',
    'agencies',
    'products',
    'customers',
    'quotes'
  ];

  console.log('='.repeat(80));
  console.log('DATABASE SCHEMA DOCUMENTATION');
  console.log('='.repeat(80));

  for (const table of tables) {
    console.log(`\n### ${table.toUpperCase()} ###\n`);

    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact' })
      .limit(1);

    if (error) {
      console.log(`❌ Error: ${error.message}`);
      console.log(`   (Table may not exist or access denied)`);
      continue;
    }

    console.log(`✅ Table exists`);
    console.log(`📊 Row count: ${count}`);

    if (data && data.length > 0) {
      console.log(`\n📋 Columns:`);
      Object.entries(data[0]).forEach(([key, value]) => {
        const type = typeof value;
        const preview = value ? String(value).substring(0, 50) : 'null';
        console.log(`   - ${key} (${type}): ${preview}`);
      });
    } else {
      console.log(`\n⚠️  No data in table - cannot infer schema`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('SCHEMA INVESTIGATION COMPLETE');
  console.log('='.repeat(80));
}

documentSchema();