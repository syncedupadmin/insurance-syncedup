import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const superAdminAccount = {
      email: 'superadmin@syncedup.com',
      password: 'superadmin123',
      name: 'Super Admin',
      role: 'super-admin'
    };

    // Check if super-admin already exists
    const { data: existingUser } = await supabase
      .from('portal_users')
      .select('email, role')
      .eq('email', superAdminAccount.email)
      .single();

    const hashedPassword = await bcrypt.hash(superAdminAccount.password, 10);

    if (existingUser) {
      // Update existing super-admin
      const { data, error } = await supabase
        .from('portal_users')
        .update({
          password_hash: hashedPassword,
          name: superAdminAccount.name,
          role: superAdminAccount.role,
          is_active: true,
          must_change_password: false
        })
        .eq('email', superAdminAccount.email)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: 'Failed to update super-admin', details: error.message });
      }

      return res.status(200).json({
        success: true,
        message: 'Super Admin account updated successfully',
        credentials: {
          email: superAdminAccount.email,
          password: superAdminAccount.password,
          portal_url: 'https://insurance.syncedupsolutions.com/super-admin/'
        },
        status: 'updated'
      });
    } else {
      // Create new super-admin
      const { data, error } = await supabase
        .from('portal_users')
        .insert({
          email: superAdminAccount.email,
          password_hash: hashedPassword,
          name: superAdminAccount.name,
          role: superAdminAccount.role,
          is_active: true,
          must_change_password: false
        })
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: 'Failed to create super-admin', details: error.message });
      }

      return res.status(200).json({
        success: true,
        message: 'Super Admin account created successfully',
        credentials: {
          email: superAdminAccount.email,
          password: superAdminAccount.password,
          portal_url: 'https://insurance.syncedupsolutions.com/super-admin/'
        },
        status: 'created'
      });
    }

  } catch (error) {
    console.error('Error setting up super-admin:', error);
    res.status(500).json({ 
      error: 'Failed to setup super-admin account', 
      details: error.message 
    });
  }
}