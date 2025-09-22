const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { Resend } = require('resend');
const { EMAIL_CONFIG } = require('../email/config.js');
// const speakeasy = require('speakeasy'); // Not used
// const QRCode = require('qrcode'); // Not used
const { setCORSHeaders, handleCORSPreflight } = require('../_utils/cors.js');
const { validateUserContext, createAgencySecureQuery, logSecurityViolation } = require('../_utils/agency-isolation.js');
const { verifyCookieAuth } = require('../_utils/cookie-auth.js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Log audit events
async function logAudit(userId, action, details, ipAddress, userAgent = 'API') {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      details: JSON.stringify(details),
      ip_address: ipAddress,
      user_agent: userAgent,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
}

module.exports = async function handler(req, res) {
  // Handle CORS preflight  
  if (handleCORSPreflight(req, res)) return;
  
  // Set secure CORS headers
  setCORSHeaders(req, res);

  // Verify authentication using cookie-based auth
  const auth = await verifyCookieAuth(req);
  if (!auth.success) {
    return res.status(401).json({ error: auth.error });
  }

  // Check for admin or super_admin role
  const allowedRoles = ['admin', 'super_admin'];
  if (!allowedRoles.includes(auth.user.normalizedRole)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const user = auth.user;
  const currentUser = user;
  const normalizedRole = user.normalizedRole;
  const isAdmin = normalizedRole === 'admin';
  const isSuperAdmin = normalizedRole === 'super_admin';

  const clientIP = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const resend = new Resend(process.env.RESEND_API_KEY);

  // GET /api/admin/users - Get all users with pagination and filtering
  if (req.method === 'GET') {
    try {
      const userContext = validateUserContext(req);
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const search = req.query.search || '';
      const role = req.query.role || '';
      const status = req.query.status || '';
      const offset = (page - 1) * limit;

      // Create agency-filtered query - admins only see their agency, super admins see all
      let query;
      if (isAdmin) {
        // Admin: filter by their agency
        query = supabase.from('portal_users')
          .select('id, email, name, role, agent_code, is_active, last_login, created_at, two_factor_enabled, login_attempts, agency_id', { count: 'exact' })
          .eq('agency_id', currentUser.agency_id);
      } else {
        // Super admin: see all users
        query = supabase.from('portal_users')
          .select('id, email, name, role, agent_code, is_active, last_login, created_at, two_factor_enabled, login_attempts, agency_id', { count: 'exact' });
      }

      // Apply filters
      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,agent_code.ilike.%${search}%`);
      }
      if (role) {
        query = query.eq('role', role);
      }
      if (status === 'active') {
        query = query.eq('is_active', true);
      } else if (status === 'inactive') {
        query = query.eq('is_active', false);
      }

      const { data: users, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) return res.status(500).json({ error: error.message });

      // Calculate stats
      const { data: allUsers } = await supabase
        .from('portal_users')
        .select('role, is_active');

      const stats = {
        total: count || 0,
        active: allUsers?.filter(u => u.is_active).length || 0,
        inactive: allUsers?.filter(u => !u.is_active).length || 0,
        admins: allUsers?.filter(u => ['admin', 'super_admin'].includes(u.role)).length || 0,
        agents: allUsers?.filter(u => u.role === 'agent').length || 0
      };

      await logAudit(currentUser.id, 'VIEW_USERS', { page, limit, search, role, status }, clientIP, userAgent);

      return res.status(200).json({
        users: users || [],
        pagination: {
          currentPage: page,
          totalPages: Math.ceil((count || 0) / limit),
          totalItems: count || 0,
          itemsPerPage: limit
        },
        stats
      });

    } catch (error) {
      console.error('Error getting users:', error);
      return res.status(500).json({ error: 'Failed to retrieve users' });
    }
  }

  // POST /api/admin/users - Create new user
  if (req.method === 'POST') {
    try {
      const { email, name, role = 'agent', agent_code, permissions, department } = req.body;

      // Validation
      if (!email || !name || !role) {
        return res.status(400).json({ error: 'Email, name, and role are required' });
      }

      // Role validation for admins - they can only create agents, managers, and customer service
      if (isAdmin && !['agent', 'manager', 'customer_service'].includes(role)) {
        return res.status(403).json({
          error: 'Admins can only create agent, manager, and customer service accounts'
        });
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
          department,
          agency_id: currentUser.agency_id,
          must_change_password: true,
          is_active: true,
          permissions: permissions ? JSON.stringify(permissions) : null,
          created_by: currentUser.id
        })
        .select('id, email, name, role, agent_code, is_active, created_at, department')
        .single();

      if (error) return res.status(400).json({ error: error.message });

      // Send welcome email
      try {
        await resend.emails.send({
          from: EMAIL_CONFIG.from,
          to: email,
          subject: 'Welcome to SyncedUp Insurance Portal',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Welcome to SyncedUp Insurance Portal!</h2>
              <p>Hello ${name},</p>
              <p>Your account has been created successfully. Here are your login credentials:</p>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Temporary Password:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${tempPassword}</code></p>
                <p><strong>Role:</strong> ${role}</p>
              </div>
              <p><strong>Login URL:</strong> <a href="https://insurance.syncedupsolutions.com/login.html" style="color: #2563eb;">https://insurance.syncedupsolutions.com/login.html</a></p>
              <p><em>Note: You will be required to change your password on first login for security.</em></p>
              <hr style="margin: 30px 0; border: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px;">This is an automated message from the SyncedUp Insurance Portal.</p>
            </div>
          `
        });

        await logAudit(currentUser.id, 'CREATE_USER', { 
          newUserId: newUser.id, 
          email, 
          role,
          emailSent: true 
        }, clientIP, userAgent);

        return res.status(201).json({
          success: true,
          user: newUser,
          message: 'User created successfully and welcome email sent!'
        });

      } catch (emailError) {
        console.error('Email send failed:', emailError);
        
        await logAudit(currentUser.id, 'CREATE_USER', { 
          newUserId: newUser.id, 
          email, 
          role,
          emailSent: false,
          emailError: emailError.message 
        }, clientIP, userAgent);

        return res.status(201).json({
          success: true,
          user: newUser,
          temp_password: tempPassword,
          warning: 'User created but email failed to send. Please share credentials manually.'
        });
      }

    } catch (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ error: 'Failed to create user' });
    }
  }

  // PUT /api/admin/users/[id] - Update user
  if (req.method === 'PUT') {
    try {
      const userId = req.query.id || req.body.id;
      const updates = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // Get existing user
      const { data: existingUser } = await supabase
        .from('portal_users')
        .select('*')
        .eq('id', userId)
        .single();

      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Agency validation for admins
      if (isAdmin && existingUser.agency_id !== currentUser.agency_id) {
        return res.status(403).json({ error: 'Cannot modify users from other agencies' });
      }

      // Prevent modifying super admin or admin users unless you are super admin
      if ((existingUser.role === 'super_admin' || existingUser.role === 'admin') && !isSuperAdmin) {
        return res.status(403).json({ error: 'Cannot modify admin users' });
      }

      // Role update validation for admins
      if (isAdmin && updates.role && !['agent', 'manager', 'customer_service'].includes(updates.role)) {
        return res.status(403).json({
          error: 'Admins can only assign agent, manager, or customer service roles'
        });
      }

      // Hash password if provided
      if (updates.password) {
        if (updates.password.length < 8) {
          return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        updates.password_hash = await bcrypt.hash(updates.password, 10);
        updates.must_change_password = false;
        delete updates.password;
      }

      // Prepare update object
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
        updated_by: currentUser.id
      };

      // Remove fields that shouldn't be updated directly
      delete updateData.id;
      delete updateData.created_at;

      const { data: updatedUser, error } = await supabase
        .from('portal_users')
        .update(updateData)
        .eq('id', userId)
        .select('id, email, name, role, agent_code, is_active, last_login, created_at, department')
        .single();

      if (error) return res.status(400).json({ error: error.message });

      await logAudit(currentUser.id, 'UPDATE_USER', { 
        userId, 
        updates: Object.keys(updates) 
      }, clientIP, userAgent);

      return res.status(200).json({
        success: true,
        user: updatedUser,
        message: 'User updated successfully'
      });

    } catch (error) {
      console.error('Error updating user:', error);
      return res.status(500).json({ error: 'Failed to update user' });
    }
  }

  // DELETE /api/admin/users/[id] - Delete user
  if (req.method === 'DELETE') {
    try {
      const userId = req.query.id || req.body.id;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // Get user to be deleted
      const { data: userToDelete } = await supabase
        .from('portal_users')
        .select('role, email, name, agency_id')
        .eq('id', userId)
        .single();

      if (!userToDelete) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Agency validation for admins
      if (isAdmin && userToDelete.agency_id !== currentUser.agency_id) {
        return res.status(403).json({ error: 'Cannot delete users from other agencies' });
      }

      // Prevent deleting super admin or admin users unless you are super admin
      if ((userToDelete.role === 'super_admin' || userToDelete.role === 'admin') && !isSuperAdmin) {
        return res.status(403).json({ error: 'Cannot delete admin users' });
      }

      // Admins can only delete agents, managers, and customer service
      if (isAdmin && !['agent', 'manager', 'customer_service'].includes(userToDelete.role)) {
        return res.status(403).json({ error: 'Cannot delete this user type' });
      }

      // Prevent self-deletion
      if (userId === currentUser.id) {
        return res.status(403).json({ error: 'Cannot delete your own account' });
      }

      const { error } = await supabase
        .from('portal_users')
        .delete()
        .eq('id', userId);

      if (error) return res.status(400).json({ error: error.message });

      await logAudit(currentUser.id, 'DELETE_USER', { 
        deletedUserId: userId,
        email: userToDelete.email,
        name: userToDelete.name 
      }, clientIP, userAgent);

      return res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting user:', error);
      return res.status(500).json({ error: 'Failed to delete user' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
