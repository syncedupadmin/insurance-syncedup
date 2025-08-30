import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // Check admin auth
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No authorization token' });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Get user details
  const { data: currentUser } = await supabase
    .from('users')
    .select('role, agency_id')
    .eq('id', user.id)
    .single();

  if (!currentUser || !['admin', 'super_admin'].includes(currentUser.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  if (req.method === 'POST') {
    const { email, name, role = 'agent', agent_code } = req.body;
    
    // Generate password
    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
    const password_hash = await bcrypt.hash(tempPassword, 10);
    
    // Create user
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash,
        name,
        role,
        agent_code,
        agency_id: currentUser.agency_id,
        must_change_password: true,
        is_active: true
      })
      .select()
      .single();
    
    if (error) return res.status(400).json({ error: error.message });
    
    // Send welcome email
    try {
      await resend.emails.send({
        from: 'SyncedUp <onboarding@resend.dev>',
        to: email,
        subject: 'Welcome to SyncedUp - Your Login Credentials',
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
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to SyncedUp!</h1>
              </div>
              <div class="content">
                <h2>Hello ${name},</h2>
                <p>Your SyncedUp account has been successfully created. Below are your login credentials:</p>
                
                <div class="credentials">
                  <p><strong>Email:</strong> ${email}</p>
                  <p><strong>Temporary Password:</strong> ${tempPassword}</p>
                </div>
                
                <p><strong>Important:</strong> You will be required to change your password upon first login.</p>
                
                <p style="text-align: center; margin-top: 30px;">
                  <a href="https://syncedup-insurance-demo.vercel.app/login.html" class="button">Login to SyncedUp</a>
                </p>
                
                <p style="margin-top: 30px; font-size: 14px; color: #666;">
                  If you have any questions, please contact your administrator at admin@syncedupsolutions.com
                </p>
              </div>
            </div>
          </body>
          </html>
        `
      });
      
      return res.status(201).json({ 
        success: true,
        user: newUser,
        message: 'User created and email sent successfully!'
      });
    } catch (emailError) {
      // User created but email failed
      console.error('Email error:', emailError);
      return res.status(201).json({ 
        success: true,
        user: newUser,
        temp_password: tempPassword,
        warning: 'User created but email failed. Share password manually.'
      });
    }
  }
  
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('agency_id', currentUser.agency_id)
      .order('created_at', { ascending: false });
    
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data || []);
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
