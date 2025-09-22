const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const bcrypt = require('bcryptjs');
const { requireCSRF } = require('../utils/csrf.js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  try {
    const { data: user } = await supabase
      .from('portal_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (user) {
      // Generate new password
      const newPassword = Math.random().toString(36).slice(-8) + 'C3!';
      const password_hash = await bcrypt.hash(newPassword, 10);

      // Update password
      await supabase
        .from('portal_users')
        .update({ 
          password_hash,
          must_change_password: true 
        })
        .eq('email', email.toLowerCase());

      // Send email
      await resend.emails.send({
        from: 'SyncedUp <noreply@insurance.syncedupsolutions.com>',
        to: email,
        subject: 'Password Reset',
        html: `
          <h2>Password Reset</h2>
          <p>Your new password is: <strong>${newPassword}</strong></p>
          <p>Login at: https://insurance.syncedupsolutions.com/login.html</p>
        `
      });
    }

    // Always return the same message whether user exists or not
    return res.status(200).json({ 
      success: true, 
      message: "If an account exists with that email, we've sent reset instructions." 
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(200).json({ 
      success: true, 
      message: "If an account exists with that email, we've sent reset instructions." 
    });
  }
};
