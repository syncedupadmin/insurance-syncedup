import { requireAuth, logAction } from '../_middleware/authCheck.js';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

async function agentsHandler(req, res) {
  const supabase = req.supabase || createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    if (req.method === 'GET') {
      // Get all agent users
      const { data: agents, error } = await supabase
        .from('portal_users')
        .select('*')
        .eq('role', 'agent')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return res.json({ agents });
    }

    if (req.method === 'POST') {
      const { name, email, agent_code } = req.body;
      
      if (!email || !name) {
        return res.status(400).json({ error: 'Email and name are required' });
      }
      
      // Check if email already exists
      const { data: existingUser } = await supabase
        .from('portal_users')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();
      
      if (existingUser) {
        return res.status(400).json({ error: 'Email already exists' });
      }

      // Generate secure password
      const tempPassword = Math.random().toString(36).slice(-8) + 
                          Math.random().toString(36).slice(-4).toUpperCase() + '!';
      const password_hash = await bcrypt.hash(tempPassword, 10);

      // Generate agent code if not provided
      const finalAgentCode = agent_code || `AG${new Date().getFullYear()}${Math.floor(Math.random() * 9000) + 1000}`;

      // Create agent user
      const { data: agent, error: userError } = await supabase
        .from('portal_users')
        .insert({
          email: email.toLowerCase(),
          password_hash,
          name,
          role: 'agent',
          agent_code: finalAgentCode,
          is_active: true,
          must_change_password: true
        })
        .select()
        .single();

      if (userError) {
        throw userError;
      }

      // Send welcome email
      try {
        console.log('Attempting to send welcome email to:', email);
        const emailResponse = await fetch(`${process.env.APP_URL}/api/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'welcome',
            to: email,
            data: {
              name,
              temp_password: tempPassword,
              agency_name: 'SyncedUp Insurance',
              role: 'agent'
            }
          })
        });
        
        if (emailResponse.ok) {
          const emailResult = await emailResponse.json();
          console.log('Welcome email sent successfully:', emailResult);
        } else {
          const emailError = await emailResponse.text();
          console.error('Email API returned error:', emailError);
        }
      } catch (emailError) {
        console.error('Email send failed with exception:', emailError);
      }

      try {
        await logAction(supabase, req.user.id, agent.id, 'CREATE', 'agent_user', agent.id);
      } catch (logError) {
        console.error('Log action failed:', logError);
      }

      return res.status(201).json({ 
        success: true,
        agent,
        password: tempPassword,
        message: 'Agent created successfully and welcome email sent'
      });
    }

    if (req.method === 'PUT') {
      const { id } = req.query;
      const updates = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'Agent ID required' });
      }
      
      // Only allow specific fields to be updated
      const updateData = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.agent_code !== undefined) updateData.agent_code = updates.agent_code;
      if (updates.status !== undefined) updateData.is_active = updates.status === 'active';

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      const { data: agent, error } = await supabase
        .from('portal_users')
        .update(updateData)
        .eq('id', id)
        .eq('role', 'agent')
        .select()
        .single();

      if (error) throw error;
      
      try {
        await logAction(supabase, req.user.id, id, 'UPDATE', 'agent_user', id, updateData);
      } catch (logError) {
        console.error('Log action failed:', logError);
      }
      
      return res.json({ 
        success: true, 
        agent,
        message: 'Agent updated successfully' 
      });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ error: 'Agent ID required' });
      }

      // Check if agent exists
      const { data: agent } = await supabase
        .from('portal_users')
        .select('*')
        .eq('id', id)
        .eq('role', 'agent')
        .single();

      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      // For safety, deactivate instead of delete
      const { data: updatedAgent, error } = await supabase
        .from('portal_users')
        .update({ is_active: false })
        .eq('id', id)
        .eq('role', 'agent')
        .select()
        .single();

      if (error) throw error;

      try {
        await logAction(supabase, req.user.id, id, 'DEACTIVATE', 'agent_user', id);
      } catch (logError) {
        console.error('Log action failed:', logError);
      }
      
      return res.json({ 
        success: true,
        message: 'Agent deactivated successfully' 
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Agent handler error:', error);
    return res.status(500).json({ error: error.message });
  }
}

export default requireAuth(['admin'])(agentsHandler);