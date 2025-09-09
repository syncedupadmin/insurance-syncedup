import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  'https://zgkszwkxibpnxhvlenct.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpna3N6d2t4aWJwbnhodmxlbmN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjMxOTc5MywiZXhwIjoyMDcxODk1NzkzfQ.Cy15WKK89KKa4SrwwD-0Wpkyu6PK_VMx0Wc-_xmsoCI'
);

async function checkUserPasswords() {
  console.log('=== CHECKING USER PASSWORDS IN DATABASE ===\n');
  
  const { data: users, error } = await supabase
    .from('portal_users')
    .select('id, email, password_hash, is_active')
    .order('email');
  
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }
  
  console.log(`Found ${users.length} users in portal_users table:\n`);
  
  const testPasswords = ['demo123', 'Demo123', 'admin123', 'Admin123', 'password', 'Password123', 'TempPass123!', 'test123', 'Test123'];
  
  for (const user of users) {
    console.log(`👤 ${user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Active: ${user.is_active}`);
    console.log(`   Hash: ${user.password_hash ? user.password_hash.substring(0, 20) + '...' : 'NULL'}`);
    
    if (!user.password_hash) {
      console.log('   ❌ NO PASSWORD HASH - Cannot login');
    } else {
      console.log('   🔍 Testing common passwords...');
      let found = false;
      for (const testPass of testPasswords) {
        try {
          const matches = await bcrypt.compare(testPass, user.password_hash);
          if (matches) {
            console.log(`   ✅ PASSWORD FOUND: "${testPass}"`);
            found = true;
            break;
          }
        } catch (error) {
          console.log(`   ⚠️ Error testing password "${testPass}": ${error.message}`);
        }
      }
      if (!found) {
        console.log('   ❌ None of the test passwords match');
      }
    }
    console.log('');
  }
}

checkUserPasswords().catch(console.error);