import { requireAuth, logAction } from '../_middleware/authCheck.js';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

async function agenciesHandler(req, res) {
  const supabase = req.supabase || createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('agencies')
        .select(`
          *,
          users!inner(id, email, name, role)
        `)
        .eq('users.role', 'admin')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const { name, code, admin_email } = req.body;
      
      // Validate inputs
      if (!name || !code || !admin_email) {
        return res.status(400).json({ error: 'Name, code, and admin email are required' });
      }
      
      // Check if code already exists
      const { data: existing } = await supabase
        .from('agencies')
        .select('id')
        .eq('code', code.toUpperCase())
        .single();
      
      if (existing) {
        return res.status(400).json({ error: 'Agency code already exists' });
      }
      
      // Start transaction
      const { data: agency, error: agencyError } = await supabase
        .from('agencies')
        .insert({
          name,
          code: code.toUpperCase(),
          admin_email
        })
        .select()
        .single();

      if (agencyError) throw agencyError;

      // Generate secure password
      const tempPassword = Math.random().toString(36).slice(-8) + 
                          Math.random().toString(36).slice(-4).toUpperCase() + '!';
      const password_hash = await bcrypt.hash(tempPassword, 10);

      // Create admin user for agency
      const { data: adminUser, error: userError } = await supabase
        .from('users')
        .insert({
          email: admin_email.toLowerCase(),
          password_hash,
          name: `${name} Admin`,
          role: 'admin',
          agency_id: agency.id,
          must_change_password: true,
          is_active: true
        })
        .select()
        .single();

      if (userError) {
        // Rollback agency creation
        await supabase.from('agencies').delete().eq('id', agency.id);
        throw userError;
      }

      // Log action
      await logAction(supabase, req.user.id, agency.id, 'CREATE', 'agency', agency.id);

      return res.status(201).json({ 
        success: true,
        agency, 
        admin_user: adminUser,
        temp_password: tempPassword,
        message: `Agency created. Admin password: ${tempPassword}`
      });
    }

    if (req.method === 'PATCH') {
      const { id } = req.query;
      const updates = req.body;
      
      const { data, error } = await supabase
        .from('agencies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      await logAction(supabase, req.user.id, id, 'UPDATE', 'agency', id, updates);
      
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Agency handler error:', error);
    return res.status(500).json({ error: error.message });
  }
}

export default requireAuth(['super_admin'])(agenciesHandler);
