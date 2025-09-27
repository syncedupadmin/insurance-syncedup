const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { verifyCookieAuth } = require('../_utils/cookie-auth.js');

async function resetPasswordHandler(req, res) {
  // Verify authentication using cookie-based auth
  const auth = await verifyCookieAuth(req);
  if (!auth.success) {
    return res.status(401).json({ error: auth.error });
  }

  // Check for admin or super_admin role
  const allowedRoles = ['admin', 'super_admin'];
  if (!allowedRoles.includes(auth.user.normalizedRole)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const user = auth.user;
  const supabase = req.supabase || createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    if (req.method === 'POST') {
      const { userId, sendEmail = true } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // Get current admin user from auth
      const currentUser = user;
      const isAdmin = currentUser?.role === 'admin';
      const isSuperAdmin = currentUser?.role === 'super_admin';

      // Get the target user
      const { data: user, error: userError } = await supabase
        .from('portal_users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Permission checks based on role
      if (isAdmin) {
        // Admin can only reset passwords for agents/managers in their agency
        if (user.agency_id !== currentUser.agency_id) {
          return res.status(403).json({ error: 'Cannot reset password for users in other agencies' });
        }
        if (!['agent', 'manager'].includes(user.role)) {
          return res.status(403).json({ error: 'Cannot reset password for admin users' });
        }
      } else if (!isSuperAdmin) {
        // If not admin or super admin, deny access
        return res.status(403).json({ error: 'Admin access required' });
      }

      // Generate new temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + 
                          Math.random().toString(36).slice(-4).toUpperCase() + '!';
      const password_hash = await bcrypt.hash(tempPassword, 10);

      // Update user with new password and force change
      const { data: updatedUser, error: updateError } = await supabase
        .from('portal_users')
        .update({ 
          password_hash,
          must_change_password: true
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
