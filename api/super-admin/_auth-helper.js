const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifySuperAdmin(token) {
  if (!token) return null;
  
  try {
    // Get user from token
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      console.log('Failed to get user from token:', error?.message);
      return null;
    }
    
    // Check role in portal_users table (the actual source of truth)
    const { data: dbUser, error: dbError } = await supabase
      .from('portal_users')
      .select('id, email, role, full_name')
      .eq('email', user.email)
      .single();
    
    if (dbError) {
      console.log('Failed to get user from portal_users:', dbError.message);
      return null;
    }
    
    if (dbUser?.role === 'super_admin') {
      // Return combined user data
      return {
        ...user,
        ...dbUser,
        id: dbUser.id || user.id
      };
    }
    
    console.log(`Access denied: User ${user.email} has role ${dbUser?.role}, not super_admin`);
    return null;
  } catch (error) {
    console.error('Auth verification error:', error);
    return null;
  }
}

module.exports = { verifySuperAdmin };