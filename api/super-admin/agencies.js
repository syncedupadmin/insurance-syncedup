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
      const { agency_id } = req.query;
      
      if (agency_id) {
        // Get single agency with detailed info
        const { data: agency, error } = await supabase
          .from('agencies')
          .select(`
            *,
            profiles!profiles_agency_id_fkey (
              id, email, name, role, created_at, last_login, is_active, agent_code
            )
          `)
          .eq('id', agency_id)
          .single();

        if (error) throw error;

        // Get user stats
        const adminUser = agency.profiles?.find(p => p.role === 'admin');
        const userCount = agency.profiles?.length || 0;
        const activeUsers = agency.profiles?.filter(p => p.is_active).length || 0;

        return res.json({
          ...agency,
          admin_user: adminUser,
          user_count: userCount,
          active_users: activeUsers
        });
      } else {
        // Get all agencies with summary
        const { data: agencies, error } = await supabase
          .from('agencies')
          .select(`
            *,
            profiles!profiles_agency_id_fkey (id, role, is_active)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const processedAgencies = agencies.map(agency => ({
          ...agency,
          user_count: agency.profiles?.length || 0,
          active_users: agency.profiles?.filter(p => p.is_active).length || 0,
          admin_user: agency.profiles?.find(p => p.role === 'admin')
        }));

        return res.json({ agencies: processedAgencies });
      }
    }

    if (req.method === 'POST') {
      const { name, admin_email, admin_name, phone, address, website, subscription_plan = 'starter' } = req.body;
      
      if (!name || !admin_email || !admin_name) {
        return res.status(400).json({ error: 'Agency name, admin email, and admin name are required' });
      }
      
      // Check if admin email already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', admin_email.toLowerCase())
        .single();
      
      if (existingUser) {
        return res.status(400).json({ error: 'Admin email already exists' });
      }
      
      // Create agency
      const { data: agency, error: agencyError } = await supabase
        .from('agencies')
        .insert({
          name,
          phone,
          address,
          website,
          subscription_plan,
          is_active: true
        })
        .select()
        .single();

      if (agencyError) throw agencyError;

      // Generate secure password
      const tempPassword = Math.random().toString(36).slice(-8) + 
                          Math.random().toString(36).slice(-4).toUpperCase() + '!';
      const password_hash = await bcrypt.hash(tempPassword, 10);

      // Create admin user
      const { data: adminUser, error: userError } = await supabase
        .from('profiles')
        .insert({
          email: admin_email.toLowerCase(),
          password_hash,
          name: admin_name,
          role: 'admin',
          agency_id: agency.id,
          must_change_password: true,
          is_active: true
        })
        .select()
        .single();

      if (userError) {
        await supabase.from('agencies').delete().eq('id', agency.id);
        throw userError;
      }

      // Send welcome email
      try {
        await fetch(`${process.env.APP_URL}/api/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'welcome',
            to: admin_email,
            data: {
              name: admin_name,
              temp_password: tempPassword,
              agency_name: name
            }
          })
        });
      } catch (emailError) {
        console.error('Email send failed:', emailError);
      }

      await logAction(supabase, req.user.id, agency.id, 'CREATE', 'agency', agency.id);

      return res.status(201).json({ 
        success: true,
        agency, 
        admin_user: adminUser,
        temp_password: tempPassword,
        message: 'Agency created successfully and welcome email sent'
      });
    }

    if (req.method === 'PUT') {
      const { agency_id } = req.query;
      const updates = req.body;
      
      if (!agency_id) {
        return res.status(400).json({ error: 'Agency ID required' });
      }
      
      const allowedFields = ['name', 'phone', 'address', 'website', 'subscription_plan', 'is_active'];
      const updateData = {};
      
      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
          updateData[key] = updates[key];
        }
      });

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      const { data: agency, error } = await supabase
        .from('agencies')
        .update(updateData)
        .eq('id', agency_id)
        .select()
        .single();

      if (error) throw error;
      
      await logAction(supabase, req.user.id, agency_id, 'UPDATE', 'agency', agency_id, updateData);
      
      return res.json({ 
        success: true, 
        agency,
        message: 'Agency updated successfully' 
      });
    }

    if (req.method === 'DELETE') {
      const { agency_id } = req.query;
      
      if (!agency_id) {
        return res.status(400).json({ error: 'Agency ID required' });
      }

      // Check if agency has users
      const { data: users } = await supabase
        .from('profiles')
        .select('id')
        .eq('agency_id', agency_id);

      if (users && users.length > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete agency with existing users. Deactivate the agency instead.' 
        });
      }

      const { error } = await supabase
        .from('agencies')
        .delete()
        .eq('id', agency_id);

      if (error) throw error;

      await logAction(supabase, req.user.id, agency_id, 'DELETE', 'agency', agency_id);
      
      return res.json({ 
        success: true,
        message: 'Agency deleted successfully' 
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Agency handler error:', error);
    return res.status(500).json({ error: error.message });
  }
}

export default requireAuth(['super_admin'])(agenciesHandler);
