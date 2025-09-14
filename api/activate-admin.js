import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Activate the admin account
  const { data, error } = await supabase
    .from('portal_users')
    .update({ 
      is_active: true,
      must_change_password: false 
    })
    .eq('email', 'admin@syncedupsolutions.com')
    .select();
    
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  
  return res.json({ 
    success: true, 
    message: 'Admin account activated',
    user: data 
  });
}
