import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export default async function handler(req, res) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  if (req.method === 'POST') {
    const { action, email, token, newPassword } = req.body;

    try {
      if (action === 'request') {
        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expires_at = new Date(Date.now() + 3600000).toISOString(); // 1 hour

        // Get user
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('email', email.toLowerCase())
          .single();

        if (!user) {
          // Don't reveal if email exists
          return res.status(200).json({ message: 'If the email exists, a reset link has been sent' });
        }

        // Store reset token
        await supabase
          .from('password_resets')
          .insert({
            user_id: user.id,
            token: resetToken,
            expires_at
          });

        // TODO: Send email via GoHighLevel
        // For now, return token in development
        return res.status(200).json({ 
          message: 'Reset token generated',
          token: process.env.NODE_ENV === 'development' ? resetToken : undefined
        });
      }

      if (action === 'reset') {
        // Validate token
        const { data: resetRequest } = await supabase
          .from('password_resets')
          .select('*, users!inner(*)')
          .eq('token', token)
          .eq('used', false)
          .gt('expires_at', new Date().toISOString())
          .single();

        if (!resetRequest) {
          return res.status(400).json({ error: 'Invalid or expired token' });
        }

        // Validate password complexity
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
          return res.status(400).json({ 
            error: 'Password must contain uppercase, lowercase, number, and special character' 
          });
        }

        // Hash new password
        const password_hash = await bcrypt.hash(newPassword, 10);

        // Update user password
        await supabase
          .from('users')
          .update({
            password_hash,
            must_change_password: false,
            last_password_change: new Date().toISOString()
          })
          .eq('id', resetRequest.user_id);

        // Mark token as used
        await supabase
          .from('password_resets')
          .update({ used: true })
          .eq('id', resetRequest.id);

        return res.status(200).json({ message: 'Password reset successful' });
      }

      return res.status(400).json({ error: 'Invalid action' });
    } catch (error) {
      console.error('Password reset error:', error);
      return res.status(500).json({ error: 'Failed to process request' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
