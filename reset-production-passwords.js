import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  'https://zgkszwkxibpnxhvlenct.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpna3N6d2t4aWJwbnhodmxlbmN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjMxOTc5MywiZXhwIjoyMDcxODk1NzkzfQ.Cy15WKK89KKa4SrwwD-0Wpkyu6PK_VMx0Wc-_xmsoCI'
);

// Production passwords - secure but testable
const PRODUCTION_PASSWORDS = {
  'admin@demo.com': 'Demo@Admin2024!',
  'agent@demo.com': 'Demo@Agent2024!', 
  'manager@demo.com': 'Demo@Manager2024!',
  'service@demo.com': 'Demo@Service2024!',
  'admin@syncedupsolutions.com': 'Super@Admin2024!',
  'admin@phsagency.com': 'PHS@Admin2024!',
  'manager@phsagency.com': 'PHS@Manager2024!',
  'agent1@phsagency.com': 'PHS@Agent2024!'
};

async function resetProductionPasswords() {
  console.log('🔐 RESETTING PRODUCTION PASSWORDS');
  console.log('='.repeat(50));
  console.log('Setting secure, testable passwords for all users...\n');
  
  let updated = 0;
  let errors = 0;
  
  for (const [email, password] of Object.entries(PRODUCTION_PASSWORDS)) {
    try {
      console.log(`🔄 Updating password for: ${email}`);
      
      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      // Update the user's password
      const { data, error } = await supabase
        .from('portal_users')
        .update({ 
          password_hash: hashedPassword,
          must_change_password: false // Allow immediate login
        })
        .eq('email', email)
        .select('id, email');
      
      if (error) {
        console.log(`   ❌ Error: ${error.message}`);
        errors++;
      } else if (data && data.length > 0) {
        console.log(`   ✅ Password updated successfully`);
        console.log(`   📝 New password: ${password}`);
        updated++;
      } else {
        console.log(`   ⚠️ User not found in database`);
        errors++;
      }
      
    } catch (error) {
      console.log(`   ❌ Exception: ${error.message}`);
      errors++;
    }
    
    console.log('');
  }
  
  console.log('='.repeat(50));
  console.log('🎯 PASSWORD RESET RESULTS');
  console.log('='.repeat(50));
  console.log(`✅ Successfully updated: ${updated}`);
  console.log(`❌ Errors: ${errors}`);
  
  if (errors === 0) {
    console.log('\n🎉 ALL PASSWORDS RESET SUCCESSFULLY!');
    console.log('\n📋 PRODUCTION LOGIN CREDENTIALS:');
    console.log('='.repeat(40));
    
    for (const [email, password] of Object.entries(PRODUCTION_PASSWORDS)) {
      console.log(`${email}`);
      console.log(`Password: ${password}`);
      console.log('');
    }
    
    console.log('⚠️ SECURITY NOTE: Change these passwords after testing!');
  } else {
    console.log('\n🚨 SOME PASSWORDS FAILED TO UPDATE');
    console.log('Check errors above and retry');
  }
}

resetProductionPasswords().catch(error => {
  console.error('❌ Password reset failed:', error);
  process.exit(1);
});