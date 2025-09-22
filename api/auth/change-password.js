const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, currentPassword, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  // Validate new password strength
  if (newPassword.length < 8) {
    return res.status(400).json({ 
      error: 'New password must be at least 8 characters long' 
    });
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  
  // Handle hardcoded production accounts - just log the request
  const productionAccounts = [
    'admin@syncedupsolutions.com',
    'admin@phsagency.com', 
    'manager@phsagency.com',
    'agent1@phsagency.com'
  ];
  
  if (productionAccounts.includes(normalizedEmail)) {
    console.log(`PASSWORD CHANGE REQUEST: ${normalizedEmail} at ${new Date().toISOString()}`);
    return res.status(200).json({ 
      success: true,
      message: 'Password change request logged. Contact system administrator to update hardcoded credentials.',
      requestId: `PWD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    });
  }
  
  // Demo accounts can't change passwords
  if (normalizedEmail.includes('demo.com')) {
    return res.status(400).json({ 
      error: 'Demo accounts cannot change passwords.' 
    });
  }

  try {
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Debug logging
    console.log('Changing password for email:', email);
    console.log('Hashed password length:', hashedPassword.length);

    // Update the password in your portal_users table
    const { data, error } = await supabase
      .from('portal_users')
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
      .from('portal_users')
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