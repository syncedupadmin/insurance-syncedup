import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Sample customer record:');
    console.log(JSON.stringify(data, null, 2));

    if (data && data.length > 0) {
      console.log('\nAvailable columns:');
      Object.keys(data[0]).forEach(key => console.log(`  - ${key}`));
    }
  }
}

checkSchema();