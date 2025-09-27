import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verify() {
  console.log('Attempting to query portal_sales...');

  const { data, error, count } = await supabase
    .from('portal_sales')
    .select('*', { count: 'exact' })
    .limit(5);

  console.log('Count:', count);
  console.log('Error:', error);
  console.log('Data:', JSON.stringify(data, null, 2));

  if (data && data.length > 0) {
    console.log('\nColumns found:');
    Object.keys(data[0]).forEach(col => console.log(`  - ${col}`));
  }

  const { data: insertTest, error: insertError} = await supabase
    .from('portal_sales')
    .insert({
      id: 'TEST123',
      agent_id: '00000000-0000-0000-0000-000000000001',
      agency_id: '00000000-0000-0000-0000-000000000001',
      customer_name: 'Test Customer',
      product_name: 'Test Product'
    })
    .select();

  console.log('\nInsert test error:', insertError);
  console.log('Insert test data:', JSON.stringify(insertTest, null, 2));

  if (insertTest && insertTest.length > 0) {
    console.log('\nSuccessfully inserted! Columns:');
    Object.keys(insertTest[0]).forEach(col => console.log(`  - ${col}`));
  }
}

verify();