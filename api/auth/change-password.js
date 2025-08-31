import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Debug logging
    console.log('Changing password for email:', email);
    console.log('Hashed password length:', hashedPassword.length);

    // Update the password in your users table
    const { data, error } = await supabase
      .from('users')
      .update({ 
        password_hash: hashedPassword,
        must_change_password: false,
        last_password_change: new Date().toISOString()
      })
      .eq('email', email)
      .select()
      .single();

    console.log('Update result:', { data, error });
    if (data) {
      console.log('Updated user must_change_password:', data.must_change_password);
    }

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to update password' });
    }

    if (!data) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Clear any password reset tokens if you have them
    await supabase
      .from('users')
      .update({ reset_token: null, reset_token_expires: null })
      .eq('email', email);

    res.status(200).json({ 
      success: true, 
      message: 'Password updated successfully' 
    });

  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}