import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // First, try Supabase Auth sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password
    });

    if (authError) {
      // If auth fails, check our users table for demo/test accounts
      const { data: users, error: queryError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

      if (queryError || !users) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // For demo accounts, allow simple password check
      if (users.is_demo_account && password === 'demo') {
        return res.status(200).json({
          success: true,
          user: {
            id: users.id,
            email: users.email,
            firstName: users.first_name,
            lastName: users.last_name,
            role: users.role,
            agency_id: users.agency_id,
            isDemoAccount: users.is_demo_account
          },
          token: 'demo-token'
        });
      }

      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Success - get user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (profileError) {
      // Create basic profile if it doesn't exist
      const userProfile = {
        id: authData.user.id,
        email: authData.user.email,
        firstName: authData.user.user_metadata?.first_name || 'User',
        lastName: authData.user.user_metadata?.last_name || '',
        role: authData.user.user_metadata?.role || 'agent',
        agency_id: authData.user.user_metadata?.agency_id || 'PHS001'
      };

      return res.status(200).json({
        success: true,
        user: userProfile,
        token: authData.session.access_token
      });
    }

    // Return user with profile data
    return res.status(200).json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        role: profile.role,
        agency_id: profile.agency_id,
        isDemoAccount: profile.is_demo_account || false
      },
      token: authData.session.access_token
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}