import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../_middleware/authCheck.js';
import { getUserContext } from '../utils/auth-helper.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function userManagementHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { agencyId, role } = getUserContext(req);

    switch (req.method) {
      case 'GET':
        return handleGetUsers(req, res, agencyId);
      case 'POST':
        return handleCreateUser(req, res, agencyId);
      case 'PUT':
        return handleUpdateUser(req, res, agencyId);
      case 'DELETE':
        return handleDeleteUser(req, res, agencyId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('User management API error:', error);
    return res.status(500).json({ 
      error: 'Failed to process user management request', 
      details: error.message 
    });
  }
}

async function handleGetUsers(req, res, agencyId) {
  const { user_id, role_filter, status_filter, manager_id } = req.query;

  try {
    // Get users
    let query = supabase
      .from('portal_users')
      .select(`
        id,
        full_name,
        email,
        role,
        agent_code,
        manager_id,
        phone,
        license_number,
        license_state,
        license_expiry,
        hire_date,
        is_active,
        created_at,
        last_login
      `)
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });

    if (user_id) query = query.eq('id', user_id);
    if (role_filter) query = query.eq('role', role_filter);
    if (status_filter === 'active') query = query.eq('is_active', true);
    if (status_filter === 'inactive') query = query.eq('is_active', false);
    if (manager_id) query = query.eq('manager_id', manager_id);

    const { data: users, error: usersError } = await query;

    if (usersError) throw usersError;

    // Get manager names for agents
    const managerIds = [...new Set(users?.filter(u => u.manager_id).map(u => u.manager_id) || [])];
    const { data: managers } = managerIds.length > 0 ? await supabase
      .from('portal_users')
      .select('id, full_name')
      .in('id', managerIds) : { data: [] };

    const managerMap = (managers || []).reduce((map, manager) => {
      map[manager.id] = manager.full_name;
      return map;
    }, {});

    // Enhance user data
    const enhancedUsers = (users || []).map(user => ({
      ...user,
      manager_name: user.manager_id ? managerMap[user.manager_id] || 'Unknown Manager' : null,
      license_status: getLicenseStatus(user.license_expiry),
      days_since_login: user.last_login ? 
        Math.floor((new Date() - new Date(user.last_login)) / (1000 * 60 * 60 * 24)) : 
        null
    }));

    // Calculate summary
    const summary = {
      total_users: enhancedUsers.length,
      active_users: enhancedUsers.filter(u => u.is_active).length,
      inactive_users: enhancedUsers.filter(u => !u.is_active).length,
      agents: enhancedUsers.filter(u => u.role === 'agent').length,
      managers: enhancedUsers.filter(u => u.role === 'manager').length,
      admins: enhancedUsers.filter(u => u.role === 'admin' || u.role === 'super_admin').length,
      licenses_expiring_soon: enhancedUsers.filter(u => u.license_status === 'expiring_soon').length,
      expired_licenses: enhancedUsers.filter(u => u.license_status === 'expired').length
    };

    return res.status(200).json({
      users: enhancedUsers,
      summary,
      available_managers: enhancedUsers.filter(u => u.role === 'manager' && u.is_active)
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}

async function handleCreateUser(req, res, agencyId) {
  const {
    full_name,
    email,
    role,
    manager_id,
    agent_code,
    phone,
    license_number,
    license_state,
    license_expiry,
    hire_date,
    password,
    send_welcome_email
  } = req.body;

  if (!full_name || !email || !role) {
    return res.status(400).json({ error: 'Missing required fields: full_name, email, role' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Validate role
  const validRoles = ['agent', 'manager', 'admin', 'super_admin'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('portal_users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Generate agent code if not provided
    let finalAgentCode = agent_code;
    if (!finalAgentCode && role === 'agent') {
      finalAgentCode = await generateAgentCode(agencyId, full_name);
    }

    const { data, error } = await supabase
      .from('portal_users')
      .insert({
        agency_id: agencyId,
        full_name,
        email: email.toLowerCase(),
        role,
        manager_id: manager_id || null,
        agent_code: finalAgentCode,
        phone: phone || '',
        license_number: license_number || '',
        license_state: license_state || '',
        license_expiry: license_expiry || null,
        hire_date: hire_date || new Date().toISOString().split('T')[0],
        is_active: true,
        created_at: new Date().toISOString(),
        // Note: In production, use proper password hashing
        password_hash: password ? hashPassword(password) : null
      })
      .select()
      .single();

    if (error) throw error;

    // Send welcome email if requested (mock implementation)
    if (send_welcome_email) {
      await sendWelcomeEmail(data.email, data.full_name, password || 'temp123');
    }

    // Remove sensitive data from response
    const { password_hash, ...safeUser } = data;

    return res.status(201).json({
      message: 'User created successfully',
      user: safeUser,
      welcome_email_sent: send_welcome_email || false
    });

  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ error: 'Failed to create user' });
  }
}

async function handleUpdateUser(req, res, agencyId) {
  const { user_id } = req.query;
  const updates = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'User ID required' });
  }

  try {
    // Remove sensitive fields that shouldn't be updated this way
    const { password_hash, agency_id: _, id, ...safeUpdates } = updates;

    const { data, error } = await supabase
      .from('portal_users')
      .update({
        ...safeUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id)
      .eq('agency_id', agencyId)
      .select()
      .single();

    if (error) throw error;

    // Remove sensitive data from response
    const { password_hash: _, ...safeUser } = data;

    return res.status(200).json({
      message: 'User updated successfully',
      user: safeUser
    });

  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ error: 'Failed to update user' });
  }
}

async function handleDeleteUser(req, res, agencyId) {
  const { user_id, soft_delete } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'User ID required' });
  }

  try {
    if (soft_delete === 'true') {
      // Soft delete - just deactivate
      const { data, error } = await supabase
        .from('portal_users')
        .update({
          is_active: false,
          deactivated_at: new Date().toISOString()
        })
        .eq('id', user_id)
        .eq('agency_id', agencyId)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({
        message: 'User deactivated successfully',
        user: data
      });
    } else {
      // Hard delete - remove completely
      const { error } = await supabase
        .from('portal_users')
        .delete()
        .eq('id', user_id)
        .eq('agency_id', agencyId);

      if (error) throw error;

      return res.status(200).json({
        message: 'User deleted successfully'
      });
    }

  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
}

// Helper functions
function getLicenseStatus(expiryDate) {
  if (!expiryDate) return 'no_license';
  
  const expiry = new Date(expiryDate);
  const today = new Date();
  const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 30) return 'expiring_soon';
  return 'valid';
}

async function generateAgentCode(agencyId, fullName) {
  const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase();
  
  // Get existing agent codes to avoid duplicates
  const { data: existingCodes } = await supabase
    .from('portal_users')
    .select('agent_code')
    .eq('agency_id', agencyId)
    .like('agent_code', `${initials}%`);

  let counter = 1;
  let proposedCode = `${initials}${counter.toString().padStart(3, '0')}`;
  
  while (existingCodes?.some(code => code.agent_code === proposedCode)) {
    counter++;
    proposedCode = `${initials}${counter.toString().padStart(3, '0')}`;
  }
  
  return proposedCode;
}

function hashPassword(password) {
  // In production, use proper password hashing like bcrypt
  // This is a mock implementation
  return `hashed_${password}_${Date.now()}`;
}

async function sendWelcomeEmail(email, fullName, tempPassword) {
  // Mock email sending function
  console.log(`Welcome email sent to ${email} (${fullName}) with temp password: ${tempPassword}`);
  return true;
}

export default requireAuth(['admin', 'super_admin'])(userManagementHandler);