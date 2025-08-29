import { requireAuth, logAction } from '../_middleware/authCheck.js';
import bcrypt from 'bcryptjs';

async function bulkUploadHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = req.supabase;
  const { users } = req.body; // Array of user objects from CSV

  if (!Array.isArray(users) || users.length === 0) {
    return res.status(400).json({ error: 'No users provided' });
  }

  const results = {
    success: [],
    errors: []
  };

  for (const userData of users) {
    try {
      const { email, name, agent_code, role = 'agent' } = userData;
      
      if (!email || !name) {
        results.errors.push({
          row: userData,
          error: 'Email and name are required'
        });
        continue;
      }

      // Check for existing user
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

      if (existing) {
        results.errors.push({
          email,
          error: 'User already exists'
        });
        continue;
      }

      // Check agent code uniqueness
      if (agent_code) {
        const { data: existingCode } = await supabase
          .from('users')
          .select('id')
          .eq('agent_code', agent_code)
          .single();
          
        if (existingCode) {
          results.errors.push({
            email,
            error: `Agent code ${agent_code} already in use`
          });
          continue;
        }
      }

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
          role,
          agent_code,
          agency_id: req.user.agency_id,
          parent_user_id: req.user.id,
          must_change_password: true,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      results.success.push({
        email,
        name,
        agent_code,
        temp_password: tempPassword
      });

    } catch (error) {
      results.errors.push({
        email: userData.email,
        error: error.message
      });
    }
  }

  // Log bulk action
  await logAction(
    supabase, 
    req.user.id, 
    req.user.agency_id, 
    'BULK_CREATE', 
    'users', 
    null, 
    { created: results.success.length, failed: results.errors.length }
  );

  return res.status(200).json({
    success: true,
    summary: {
      created: results.success.length,
      failed: results.errors.length,
      total: users.length
    },
    results
  });
}

export default requireAuth(['super_admin', 'admin', 'manager'])(bulkUploadHandler);
