// Set a known password for testing
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const setKnownPassword = async () => {
  const testEmail = 'admin@syncedupsolutions.com';
  const testPassword = 'TestPassword123!';

  try {
    console.log('Setting known password for testing...');
    console.log('Email:', testEmail);
    console.log('Password:', testPassword);

    // Hash the password
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    console.log('Hashed password generated');

    // Update the password in the database
    const { data, error } = await supabase
      .from('portal_users')
      .update({ 
        password_hash: hashedPassword,
        must_change_password: false  // Set to false for testing
      })
      .eq('email', testEmail.toLowerCase());

    if (error) {
      console.error('❌ Database update error:', error);
      return;
    }

    console.log('✅ Password updated successfully in database');

    // Now test login with the known password
    const baseUrl = 'https://insurance-syncedup-qxak6umhw-nicks-projects-f40381ea.vercel.app';
    
    console.log('\nTesting login with known password...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });

    const loginData = await loginResponse.json();
    
    if (loginResponse.ok) {
      console.log('✅ SUCCESS: Login with known password works!');
      console.log('User:', loginData.user.email, 'Role:', loginData.user.role);
      console.log('\n🎉 FIXED: You can now log in with password:', testPassword);
    } else {
      console.log('❌ FAILED: Login still not working:', loginData.error);
    }

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
};

setKnownPassword();