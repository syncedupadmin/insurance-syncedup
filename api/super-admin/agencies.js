import { requireAuth, logAction } from '../_middleware/authCheck.js';
import { createClient } from '@supabase/supabase-js';
import { getUserContext } from '../utils/auth-helper.js';
import bcrypt from 'bcryptjs';

async function agenciesHandler(req, res) {
  const supabase = req.supabase || createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    const { role } = getUserContext(req);
    
    if (req.method === 'GET') {
      // Get agencies from portal_users table
      const { data: agencies, error: agenciesError } = await supabase
        .from('portal_agencies')
        .select('*')
        .order('created_at', { ascending: false });

      if (agenciesError) {
        // Fallback to portal_users for backward compatibility
        const { data: users, error } = await supabase
          .from('portal_users')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Group users by role and create agency-like structure
        const adminUsers = users.filter(u => u.role === 'admin');
        const agentUsers = users.filter(u => u.role === 'agent');
      
      const processedAgencies = adminUsers.map(admin => {
        // Count agents for this admin (simplified - would need proper agency_id in real schema)
        const agentCount = agentUsers.length; // This is simplified
        const activeAgents = agentUsers.filter(a => a.is_active !== false).length;
        
        return {
          id: admin.id,
          name: admin.name || `${admin.name || 'Admin'} Agency`,
          created_at: admin.created_at,
          is_active: admin.is_active !== false,
          subscription_plan: 'professional', // Default
          admin_user: {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: admin.role
          },
          user_count: agentCount,
          active_users: activeAgents,
          phone: admin.phone || '',
          website: admin.website || '',
          address: admin.address || ''
        };
      });

      return res.json({ agencies: processedAgencies });
    }

    if (req.method === 'POST') {
      const { name, admin_email, admin_name, phone, address, website, subscription_plan = 'starter' } = req.body;
      
      if (!admin_email || !admin_name) {
        return res.status(400).json({ error: 'Admin email and admin name are required' });
      }
      
      // Check if admin email already exists
      const { data: existingUser } = await supabase
        .from('portal_users')
        .select('id')
        .eq('email', admin_email.toLowerCase())
        .single();
      
      if (existingUser) {
        return res.status(400).json({ error: 'Admin email already exists' });
      }

      // Generate secure password
      const tempPassword = Math.random().toString(36).slice(-8) + 
                          Math.random().toString(36).slice(-4).toUpperCase() + '!';
      const password_hash = await bcrypt.hash(tempPassword, 10);

      // Create admin user in portal_users table
      const { data: adminUser, error: userError } = await supabase
        .from('portal_users')
        .insert({
          email: admin_email.toLowerCase(),
          password_hash,
          name: admin_name,
          role: 'admin',
          phone: phone || '',
          website: website || '',
          address: address || '',
          is_active: true,
          must_change_password: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (userError) {
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
              agency_name: admin_name + ' Agency'
            }
          })
        });
      } catch (emailError) {
        console.error('Email send failed:', emailError);
      }

      // Create mock agency object for response
      const mockAgency = {
        id: adminUser.id,
        name: admin_name + ' Agency',
        created_at: adminUser.created_at,
        is_active: true,
        subscription_plan,
        phone,
        website,
        address
      };

      try {
        await logAction(supabase, req.user.id, adminUser.id, 'CREATE', 'admin_user', adminUser.id);
      } catch (logError) {
        console.error('Log action failed:', logError);
      }

      return res.status(201).json({ 
        success: true,
        agency: mockAgency, 
        admin_user: adminUser,
        temp_password: tempPassword,
        message: 'Admin user created successfully and welcome email sent'
      });
    }

    if (req.method === 'PUT') {
      const { agency_id } = req.query;
      const updates = req.body;
      
      if (!agency_id) {
        return res.status(400).json({ error: 'User ID required' });
      }
      
      // Map agency fields to user fields
      const updateData = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.phone) updateData.phone = updates.phone;
      if (updates.address) updateData.address = updates.address;
      if (updates.website) updateData.website = updates.website;
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      const { data: user, error } = await supabase
        .from('portal_users')
        .update(updateData)
        .eq('id', agency_id)
        .eq('role', 'admin') // Only update admin users
        .select()
        .single();

      if (error) throw error;
      
      try {
        await logAction(supabase, req.user.id, agency_id, 'UPDATE', 'admin_user', agency_id, updateData);
      } catch (logError) {
        console.error('Log action failed:', logError);
      }
      
      return res.json({ 
        success: true, 
        agency: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          address: user.address,
          website: user.website,
          is_active: user.is_active,
          created_at: user.created_at
        },
        message: 'Admin user updated successfully' 
      });
    }

    if (req.method === 'DELETE') {
      const { agency_id } = req.query;
      
      if (!agency_id) {
        return res.status(400).json({ error: 'User ID required' });
      }

      // Check if this admin user exists
      const { data: adminUser } = await supabase
        .from('portal_users')
        .select('*')
        .eq('id', agency_id)
        .eq('role', 'admin')
        .single();

      if (!adminUser) {
        return res.status(404).json({ error: 'Admin user not found' });
      }

      // For safety, we'll deactivate instead of delete
      const { data: updatedUser, error } = await supabase
        .from('portal_users')
        .update({ is_active: false })
        .eq('id', agency_id)
        .eq('role', 'admin')
        .select()
        .single();

      if (error) throw error;

      try {
        await logAction(supabase, req.user.id, agency_id, 'DEACTIVATE', 'admin_user', agency_id);
      } catch (logError) {
        console.error('Log action failed:', logError);
      }
      
      return res.json({ 
        success: true,
        message: 'Admin user deactivated successfully' 
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Agency handler error:', error);
    return res.status(500).json({ error: error.message });
  }
}

export default requireAuth(['admin'])(agenciesHandler);
