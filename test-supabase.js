const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function test() {
  const { data, error } = await supabase
    .from('portal_users')
    .select('email')
    .limit(1);
  
  console.log('Error:', error);
  console.log('Data:', data);
}

test();