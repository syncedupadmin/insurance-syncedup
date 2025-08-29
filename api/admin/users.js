import { requireAuth, logAction } from '../_middleware/authCheck.js';
import bcrypt from 'bcryptjs';

async function usersHandler(req, res) {
  const supabase = req.supabase;

  try {
    if (req.method === 'GET') {
      let query = supabase
        .from('users')
        .select('id, email, name, role, agent_code, is_active, created_at, last_login, agency_id');
      
      // Filter by agency for non-super admins
      if (req.user.role !== 'super_admin') {
        query = query.eq('agency_id', req.user.agency_id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const { email, name, role, agent_code } = req.body;
      
      // Validate inputs
      if (!email || !name) {
        return res.status(400).json({ error: 'Email and name are required' });
      }
      
      // Check permissions
      if (role === 'admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({ error: 'Only super admin can create admin users' });
      }
      
      // Check for duplicate email
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();
        
      if (existing) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      
      // Check for duplicate agent code if provided
      if (agent_code) {
        const { data: existingCode } = await supabase
          .from('users')
          .select('id')
          .eq('agent_code', agent_code)
          .single();
          
        if (existingCode) {
          return res.status(400).json({ error: 'Agent code already in use' });
        }
      }
      
      // Generate password
      const tempPassword = Math.random().toString(36).slice(-8) + 
                          Math.random().toString(36).slice(-4).toUpperCase() + '!';
      const password_hash = await bcrypt.hash(tempPassword, 10);
      
      const newUser = {
        email: email.toLowerCase(),
        password_hash,
        name,
        role: role || 'agent',
        agent_code,
        agency_id: req.user.agency_id,
        parent_user_id: req.user.id,
        must_change_password: true,
        is_active: true
      };
      
      const { data, error } = await supabase
        .from('users')
        .insert(newUser)
        .select()
        .single();
      
      if (error) throw error;
      
      await logAction(supabase, req.user.id, req.user.agency_id, 'CREATE', 'user', data.id);
      
      return res.status(201).json({ 
        success: true,
        user: data, 
        temp_password: tempPassword,
        message: `User created. Temporary password: ${tempPassword}`
      });
    }

    if (req.method === 'PATCH') {
      const { id } = req.query;
      const updates = req.body;
      
      // Don't allow password updates through this endpoint
      delete updates.password_hash;
      
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      await logAction(supabase, req.user.id, req.user.agency_id, 'UPDATE', 'user', id, updates);
      
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Users handler error:', error);
    return res.status(500).json({ error: error.message });
  }
}

export default requireAuth(['super_admin', 'admin', 'manager'])(usersHandler);
