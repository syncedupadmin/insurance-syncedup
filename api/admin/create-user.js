const { createClient } = require('@supabase/supabase-js');
const { getUserContext } = require('../utils/auth-helper.js');
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { agencyId, role: userRole } = getUserContext(req);
    
    // Only admins can create users within their agency
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { 
      email, 
      name, 
      role = 'agent',
      phone,
      license_number,
      hire_date,
      commission_rate
    } = req.body;

    // Validate required fields
    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }

    // Validate role - admins can only create agents and managers within their agency
    if (!['agent', 'manager'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Admin can only create agents and managers' });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('portal_users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + 
                        Math.random().toString(36).slice(-4).toUpperCase() + '!';
    const password_hash = await bcrypt.hash(tempPassword, 10);

    // Create user data
    const userData = {
      email: email.toLowerCase(),
      password_hash,
      name,
      role,
      agency_id: agencyId,
      phone: phone || '',
      license_number: license_number || '',
      hire_date: hire_date || new Date().toISOString().split('T')[0],
      commission_rate: commission_rate || 0.05,
      is_active: true,
      must_change_password: true,
      created_at: new Date().toISOString()
    };

    // If creating an agent, also set agent_id to the user's id
    if (role === 'agent') {
      // First insert to get the ID, then update with agent_id
      const { data: newUser, error: insertError } = await supabase
        .from('portal_users')
        .insert(userData)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Update with agent_id
      const { data: updatedUser, error: updateError } = await supabase
        .from('portal_users')
        .update({ agent_id: newUser.id })
        .eq('id', newUser.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Send welcome email
      try {
        await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'welcome',
            to: email,
            data: {
              name,
              temp_password: tempPassword,
              role,
              agency_name: 'Your Agency'
            }
          })
        });
      } catch (emailError) {
        console.error('Email send failed:', emailError);
      }

      return res.status(201).json({
        success: true,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
          agency_id: updatedUser.agency_id,
          agent_id: updatedUser.agent_id,
          phone: updatedUser.phone,
          license_number: updatedUser.license_number,
          hire_date: updatedUser.hire_date,
          commission_rate: updatedUser.commission_rate,
          is_active: updatedUser.is_active
        },
        temp_password: tempPassword,
        message: 'User created successfully and welcome email sent'
      });
    } else {
      // For managers, no agent_id needed
      const { data: newUser, error: insertError } = await supabase
        .from('portal_users')
        .insert(userData)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Send welcome email
      try {
        await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'welcome',
            to: email,
            data: {
              name,
              temp_password: tempPassword,
              role,
              agency_name: 'Your Agency'
            }
          })
        });
      } catch (emailError) {
        console.error('Email send failed:', emailError);
      }

      return res.status(201).json({
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          agency_id: newUser.agency_id,
          phone: newUser.phone,
          license_number: newUser.license_number,
          hire_date: newUser.hire_date,
          commission_rate: newUser.commission_rate,
          is_active: newUser.is_active
        },
        temp_password: tempPassword,
        message: 'User created successfully and welcome email sent'
      });
    }

  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({ 
      error: 'Failed to create user', 
      details: error.message 
    });
  }
}
module.exports = handler;
