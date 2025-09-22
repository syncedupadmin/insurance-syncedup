import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  const newPassword = 'Admin123!';
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  const { data, error } = await supabase
    .from('portal_users')
    .update({ 
      is_active: true,
      password_hash: hashedPassword,
      must_change_password: false 
    })
    .eq('email', 'admin@syncedupsolutions.com')
    .select();
    
  return res.json({ 
    success: true, 
    message: 'Account activated with password: Admin123!',
    data 
  });
}
