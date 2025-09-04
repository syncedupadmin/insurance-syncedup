const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: './.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function resetPasswords() {
  console.log('Setting all user passwords to "demo123"...');
  
  const newPasswordHash = await bcrypt.hash('demo123', 10);
  
  // Update all users to have password "demo123"
  const { data, error } = await supabase
    .from('users')
    .update({ 
      password_hash: newPasswordHash,
      must_change_password: false
    })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all except non-existent id
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('All passwords updated to "demo123"');
    
    // Show first few users for verification
    const { data: users } = await supabase
      .from('users')
      .select('email, name, role')
      .limit(5);
      
    console.log('\nFirst 5 users:');
    users.forEach(user => {
      console.log(`${user.email} - ${user.name} (${user.role})`);
    });
    
    console.log('\nAll users can now login with password: demo123');
  }
}

resetPasswords();