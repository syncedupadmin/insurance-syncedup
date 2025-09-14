import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, adminId } = req.body;

  try {
    // Verify admin has permission
    const { data: admin } = await supabase
      .from('portal_users')
      .select('role, agency_id')
      .eq('id', adminId)
      .single();

    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get user details
    const { data: user } = await supabase
      .from('portal_users')
      .select('email, name, agency_id')
      .eq('id', userId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Admin has universal access - no agency verification needed

    // Generate new password
    const newPassword = Math.random().toString(36).slice(-8) + 'B2!';
    const password_hash = await bcrypt.hash(newPassword, 10);

    // Update user password
    const { error: updateError } = await supabase
      .from('portal_users')
      .update({ 
        password_hash,
        must_change_password: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update password' });
    }

    // Send email with new password
    const { error: emailError } = await resend.emails.send({
      from: 'SyncedUp <onboarding@resend.dev>',
      to: user.email,
      subject: 'SyncedUp - Password Reset',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; margin-top: 20px; }
            .credentials { background: white; padding: 15px; border-left: 4px solid #4F46E5; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 5px; }
            .warning { background: #FEF2F2; border-left: 4px solid #EF4444; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset</h1>
            </div>
            <div class="content">
              <h2>Hello ${user.name},</h2>
              <p>Your password has been reset by an administrator. Here are your new login credentials:</p>
              
              <div class="credentials">
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>New Password:</strong> ${newPassword}</p>
              </div>
              
              <div class="warning">
                <p><strong>Important:</strong> You will be required to change this password upon your next login.</p>
              </div>
              
              <p style="text-align: center; margin-top: 30px;">
                <a href="https://syncedup-insurance-demo.vercel.app/login.html" class="button">Login to SyncedUp</a>
              </p>
              
              <p style="margin-top: 30px; font-size: 14px; color: #666;">
                If you did not request this password reset, please contact your administrator immediately at admin@syncedupsolutions.com
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (emailError) {
      console.error('Email error:', emailError);
      return res.status(200).json({ 
        success: true,
        warning: 'Password reset but email failed to send',
        tempPassword: newPassword 
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Password reset successfully and email sent' 
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ error: error.message });
  }
}
