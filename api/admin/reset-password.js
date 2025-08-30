import { requireAuth, logAction } from '../_middleware/authCheck.js';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

async function resetPasswordHandler(req, res) {
  const supabase = req.supabase || createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    if (req.method === 'POST') {
      const { userId, sendEmail = true } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // Get the user (only allow password reset for agents)
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .eq('role', 'agent')
        .single();

      if (userError || !user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Generate new temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + 
                          Math.random().toString(36).slice(-4).toUpperCase() + '!';
      const password_hash = await bcrypt.hash(tempPassword, 10);

      // Update user with new password and force change
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ 
          password_hash,
          must_change_password: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Send password reset email if requested
      let emailSent = false;
      if (sendEmail) {
        try {
          console.log('Sending password reset email to:', user.email);
          const emailResponse = await fetch(`${process.env.APP_URL}/api/email/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'password-reset-admin',
              to: user.email,
              data: {
                name: user.name,
                temp_password: tempPassword,
                admin_name: req.user.name,
                agency_name: 'SyncedUp Insurance'
              }
            })
          });
          
          if (emailResponse.ok) {
            const emailResult = await emailResponse.json();
            console.log('Password reset email sent successfully:', emailResult);
            emailSent = true;
          } else {
            const emailError = await emailResponse.text();
            console.error('Email API returned error:', emailError);
          }
        } catch (emailError) {
          console.error('Email send failed with exception:', emailError);
        }
      }

      // Log the action
      try {
        await logAction(
          supabase, 
          req.user.id, 
          userId, 
          'PASSWORD_RESET', 
          'user', 
          userId, 
          { admin_initiated: true }
        );
      } catch (logError) {
        console.error('Log action failed:', logError);
      }

      return res.status(200).json({
        success: true,
        message: emailSent ? 
          'Password reset successfully and email sent to user' : 
          'Password reset successfully',
        temp_password: sendEmail ? undefined : tempPassword, // Only return password if email wasn't sent
        email_sent: emailSent
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Password reset handler error:', error);
    return res.status(500).json({ error: error.message });
  }
}

export default requireAuth(['admin'])(resetPasswordHandler);