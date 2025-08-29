import { requireAuth, logAction } from '../_middleware/authCheck.js';
import bcrypt from 'bcryptjs';

async function usersHandler(req, res) {
  const supabase = req.supabase;

  if (req.method === 'POST') {
    const { email, name, role, agent_code } = req.body;
    
    // Generate password
    const tempPassword = Math.random().toString(36).slice(-8) + 
                        Math.random().toString(36).slice(-4).toUpperCase() + '!';
    const password_hash = await bcrypt.hash(tempPassword, 10);
    
    // Create user
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash,
        name,
        role: role || 'agent',
        agent_code,
        agency_id: req.user.agency_id,
        must_change_password: true,
        is_active: true
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Send welcome email
    await fetch(`${process.env.APP_URL}/api/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'welcome',
        to: email,
        data: {
          name: name,
          temp_password: tempPassword,
          agency_name: req.user.agency_name || 'Your Agency'
        }
      })
    });
    
    return res.status(201).json({ 
      success: true,
      user: newUser,
      message: 'User created and email sent'
    });
  }
  
  // ... rest of the handler
}

export default requireAuth(['super_admin', 'admin', 'manager'])(usersHandler);