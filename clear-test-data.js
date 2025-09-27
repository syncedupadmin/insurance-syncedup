import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function clearData() {
  const { data, error } = await supabase
    .from('portal_sales')
    .delete()
    .neq('id', '');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Cleared all portal_sales data');
  }
}

clearData();