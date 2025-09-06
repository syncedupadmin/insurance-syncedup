import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { Resend } from 'resend';
import { EMAIL_CONFIG } from '../email/config.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No authorization token' });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { data: currentUser } = await supabase
    .from('portal_users')
    .select('role, agency_id')
    .eq('id', user.id)
    .single();

  if (!currentUser || !['admin', 'super_admin'].includes(currentUser.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  if (req.method === 'POST') {
    const { email, name, role = 'agent', agent_code } = req.body;
    
    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
    const password_hash = await bcrypt.hash(tempPassword, 10);
    
    const { data: newUser, error } = await supabase
      .from('portal_users')
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
    
    try {
      await resend.emails.send({
        from: EMAIL_CONFIG.from,
        to: email,
        subject: 'Welcome to SyncedUp - Your Login Credentials',
        html: `
          <h2>Welcome ${name}!</h2>
          <p>Your SyncedUp account has been created.</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Temporary Password:</strong> ${tempPassword}</p>
          <p>Login at: https://insurance.syncedupsolutions.com/login.html</p>
        `
      });
      
      return res.status(201).json({ 
        success: true,
        user: newUser,
        message: 'User created and email sent!'
      });
    } catch (emailError) {
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
      .from('portal_users')
      .select('*')
      .eq('agency_id', currentUser.agency_id)
      .order('created_at', { ascending: false });
    
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data || []);
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
