import { requireAuth } from '../_middleware/authCheck.js';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

async function resetPasswordHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = req.supabase || createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const { user_id, email, send_email = true } = req.body;

  if (!user_id && !email) {
    return res.status(400).json({ error: 'User ID or email is required' });
  }

  try {
    // Find the user
    let query = supabase.from('portal_users').select('*');
    if (user_id) {
      query = query.eq('id', user_id);
    } else {
      query = query.eq('email', email.toLowerCase());
    }

    const { data: user, error: userError } = await query.single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate new temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + 
                        Math.random().toString(36).slice(-4).toUpperCase() + '!';
    const password_hash = await bcrypt.hash(tempPassword, 10);

    // Update user password and force change
    const { error: updateError } = await supabase
      .from('portal_users')
      .update({
        password_hash,
        must_change_password: true
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    // Send reset email if requested
    if (send_email) {
      try {

        await fetch(`${process.env.APP_URL}/api/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'password-reset',
            to: user.email,
            data: {
              name: user.name,
              temp_password: tempPassword,
              agency_name: user.name + ' Agency'
            }
          })
        });
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        // Continue even if email fails
      }
    }

    return res.json({
      success: true,
      message: send_email 
        ? 'Password reset successfully. New credentials sent via email.' 
        : 'Password reset successfully.',
      temp_password: send_email ? undefined : tempPassword,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({ error: error.message });
  }
}

export default requireAuth(['super_admin'])(resetPasswordHandler);