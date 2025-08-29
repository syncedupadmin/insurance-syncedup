import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, to, data } = req.body;

  try {
    let emailContent;
    
    switch(type) {
      case 'welcome':
        emailContent = {
          from: 'SyncedUp Insurance <onboarding@syncedupsolutions.com>',
          to: to,
          subject: `Welcome to ${data.agency_name || 'SyncedUp'} - Your Login Credentials`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1>Welcome to ${data.agency_name || 'SyncedUp Insurance'}</h1>
              </div>
              <div style="padding: 30px; background: #f7f7f7;">
                <p>Hi ${data.name},</p>
                <p>Your account has been successfully created. Here are your login credentials:</p>
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                  <p><strong>Email:</strong> ${to}</p>
                  <p><strong>Temporary Password:</strong> <code style="background: #f1f1f1; padding: 5px; border-radius: 4px;">${data.temp_password}</code></p>
                </div>
                <p><strong>Important:</strong> You will be required to change this password on your first login.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.APP_URL}/login.html" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Login Now</a>
                </div>
              </div>
            </div>
          `
        };
        break;
        
      case 'password-reset':
        emailContent = {
          from: 'SyncedUp Insurance <security@syncedupsolutions.com>',
          to: to,
          subject: 'Password Reset Request - SyncedUp Insurance',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1>Password Reset Request</h1>
              </div>
              <div style="padding: 30px; background: #f7f7f7;">
                <p>Hi ${data.name || 'User'},</p>
                <p>We received a request to reset your password. Click the button below to create a new password:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.APP_URL}/reset-password.html?token=${data.token}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
                </div>
                <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
                  <p><strong>⚠️ This link expires in 1 hour.</strong></p>
                  <p>If you didn't request this, please ignore this email.</p>
                </div>
              </div>
            </div>
          `
        };
        break;
        
      case 'bulk-upload-complete':
        emailContent = {
          from: 'SyncedUp Insurance <admin@syncedupsolutions.com>',
          to: to,
          subject: 'Bulk User Upload Complete',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1>Bulk Upload Complete</h1>
              </div>
              <div style="padding: 30px; background: #f7f7f7;">
                <p>Your bulk user upload has been completed:</p>
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p>✅ Successfully created: ${data.success_count} users</p>
                  ${data.error_count > 0 ? `<p>❌ Failed: ${data.error_count} users</p>` : ''}
                </div>
                ${data.download_link ? `<p><a href="${data.download_link}">Download Results CSV</a></p>` : ''}
              </div>
            </div>
          `
        };
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid email type' });
    }

    const result = await resend.emails.send(emailContent);
    return res.status(200).json({ success: true, id: result.id });
    
  } catch (error) {
    console.error('Email send error:', error);
    return res.status(500).json({ error: error.message });
  }
}