import { requireAuth } from '../_middleware/authCheck.js';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

async function demoLoginHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = req.supabase || createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    const { email, role } = req.body;
    
    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required' });
    }

    // Find the demo user
    const { data: demoUser, error: userError } = await supabase
      .from('portal_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('role', role)
      .single();

    if (userError || !demoUser) {
      return res.status(404).json({ error: 'Demo user not found' });
    }

    if (!demoUser.is_active) {
      return res.status(403).json({ error: 'Demo account is deactivated' });
    }

    // Generate JWT token for demo user
    const token = jwt.sign(
      {
        userId: demoUser.id,
        email: demoUser.email,
        role: demoUser.role,
        agencyId: 'DEMO001',
        name: demoUser.name
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    const userResponse = {
      id: demoUser.id,
      email: demoUser.email,
      name: demoUser.name,
      role: demoUser.role,
      agency_id: 'DEMO001',
      is_active: demoUser.is_active
    };

    return res.json({
      success: true,
      token,
      user: userResponse,
      message: `Successfully logged in as ${role} demo account`
    });

  } catch (error) {
    console.error('Demo login error:', error);
    return res.status(500).json({ error: error.message });
  }
}

export default requireAuth(['super_admin'])(demoLoginHandler);