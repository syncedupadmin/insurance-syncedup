import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (!user) {
    return res.status(404).json({ error: 'Email not found' });
  }

  // Generate new password
  const newPassword = Math.random().toString(36).slice(-8) + 'C3!';
  const password_hash = await bcrypt.hash(newPassword, 10);

  // Update password
  await supabase
    .from('users')
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

  return res.status(200).json({ 
    success: true, 
    message: 'Password reset email sent' 
  });
}
