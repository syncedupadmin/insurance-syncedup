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
          from: 'SyncedUp <onboarding@resend.dev>',  // Use resend.dev for testing
          to: to,
          subject: `Welcome to SyncedUp - Your Login Credentials`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1>Welcome to SyncedUp Insurance</h1>
              </div>
              <div style="padding: 30px; background: #f7f7f7;">
                <p>Hi ${data.name},</p>
                <p>Your account has been successfully created. Here are your login credentials:</p>
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                  <p><strong>Email:</strong> ${to}</p>
                  <p><strong>Temporary Password:</strong> <code style="background: #f1f1f1; padding: 5px; border-radius: 4px;">${data.temp_password}</code></p>
                </div>
                <p><strong>Important:</strong> You will be required to change this password on your first login.</p>
                <a href="${process.env.APP_URL || 'https://syncedup-insurance-demo.vercel.app'}/login.html" 
                   style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                   Login Now
                </a>
              </div>
            </div>
          `
        };
        break;
        
      case 'password-reset':
        emailContent = {
          from: 'SyncedUp <security@resend.dev>',
          to: to,
          subject: 'Password Reset Request',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1>Password Reset</h1>
              </div>
              <div style="padding: 30px; background: #f7f7f7;">
                <p>Click below to reset your password:</p>
                <a href="${process.env.APP_URL}/reset-password.html?token=${data.token}" 
                   style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                   Reset Password
                </a>
                <p style="color: #666; margin-top: 20px;">This link expires in 1 hour.</p>
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
        
      case 'individual-welcome':
        emailContent = {
          from: 'SyncedUp Insurance <welcome@syncedupsolutions.com>',
          to: to,
          subject: 'Welcome to SyncedUp Insurance - Your Personal Agency is Ready!',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1>🎉 Welcome to SyncedUp Insurance!</h1>
                <p style="font-size: 1.1rem; margin-top: 10px;">Your personal agency is now active</p>
              </div>
              <div style="padding: 30px; background: #f7f7f7;">
                <p>Hi ${data.name},</p>
                <p>Congratulations! Your personal insurance agency has been successfully set up. You now have access to all the tools you need to manage your insurance business.</p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                  <h3 style="margin-top: 0; color: #333;">Your Agency Details:</h3>
                  <p><strong>Agency Name:</strong> ${data.agency_name}</p>
                  <p><strong>Agent Code:</strong> <code style="background: #f1f1f1; padding: 5px; border-radius: 4px;">${data.agent_code}</code></p>
                  <p><strong>Email:</strong> ${to}</p>
                </div>
                
                <h3 style="color: #333;">What's Next?</h3>
                <ul style="color: #555; line-height: 1.6;">
                  <li>📊 Track your sales performance with real-time analytics</li>
                  <li>💰 Monitor your commissions and earnings</li>
                  <li>👥 Manage your customer relationships</li>
                  <li>📋 Process quotes and applications</li>
                  <li>📈 Export your payroll and tax documents</li>
                </ul>
                
                <div style="background: #e8f4fd; padding: 15px; border-left: 4px solid #3182ce; margin: 20px 0;">
                  <p><strong>💡 Pro Tip:</strong> As an individual agent, you keep 100% of your commissions with no agency splits!</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${data.login_url}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Access Your Dashboard</a>
                </div>
                
                <p style="color: #666; font-size: 0.9rem; margin-top: 30px;">
                  Need help getting started? Reply to this email or check out our <a href="${process.env.APP_URL}/help" style="color: #667eea;">Help Center</a>.
                </p>
              </div>
            </div>
          `
        };
        break;

      case 'password-reset-admin':
        emailContent = {
          from: 'SyncedUp <security@resend.dev>',
          to: to,
          subject: 'Password Reset - SyncedUp Insurance',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1>Password Reset</h1>
              </div>
              <div style="padding: 30px; background: #f7f7f7;">
                <p>Hi ${data.name},</p>
                <p>Your password has been reset by your administrator (${data.admin_name}). Here are your new login credentials:</p>
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                  <p><strong>Email:</strong> ${to}</p>
                  <p><strong>New Temporary Password:</strong> <code style="background: #f1f1f1; padding: 5px; border-radius: 4px;">${data.temp_password}</code></p>
                </div>
                <p><strong>Important:</strong> You will be required to change this password when you next log in.</p>
                <a href="${process.env.APP_URL || 'https://syncedup-insurance-demo.vercel.app'}/login.html" 
                   style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                   Login Now
                </a>
                <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
                  <p><strong>Security Note:</strong> If you did not request this password reset, please contact your administrator immediately.</p>
                </div>
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