import { requireAuth } from '../_middleware/authCheck.js';
import bcrypt from 'bcryptjs';

async function usersHandler(req, res) {
  const supabase = req.supabase;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('agency_id', req.user.agency_id)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return res.status(200).json(data || []);
  }

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
        agency_id: req.user.agency_id,
        must_change_password: true,
        is_active: true
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Send welcome email
    try {
      await fetch(`${process.env.APP_URL}/api/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'welcome',
          to: email,
          data: {
            name: name,
            temp_password: tempPassword
          }
        })
      });
    } catch (emailError) {
      console.error('Email failed:', emailError);
      // Still return success but note email failed
      return res.status(201).json({ 
        success: true,
        user: newUser,
        temp_password: tempPassword,
        message: 'User created but email failed. Please share password manually.'
      });
    }
    
    return res.status(201).json({ 
      success: true,
      user: newUser,
      message: 'User created and email sent'
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default requireAuth(['admin', 'super_admin'])(usersHandler);
