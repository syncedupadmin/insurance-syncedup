import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { name, contact_email, phone_number, address, plan_type } = req.body;

    // Validate required fields
    if (!name || !contact_email || !plan_type) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: name, contact_email, plan_type' 
      });
    }

    // Generate agency code
    const agencyCode = name.toUpperCase()
      .replace(/[^A-Z0-9\\s]/g, '')
      .replace(/\\s+/g, '')
      .substring(0, 10) + Math.floor(Math.random() * 100).toString().padStart(2, '0');

    // Create agency
    const { data: newAgency, error: agencyError } = await supabase
      .from('agencies')
      .insert([{
        name: name,
        code: agencyCode,
        admin_email: contact_email,
        is_active: true
      }])
      .select('*')
      .single();

    if (agencyError) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to create agency: ' + agencyError.message 
      });
    }

    // Create ONE admin user
    const password_hash = await bcrypt.hash('TempPass123!', 10);
    const adminDomain = name.toLowerCase().replace(/[^a-z0-9\\s]/g, '').replace(/\\s+/g, '');
    
    const { data: adminUser, error: userError } = await supabase
      .from('users')
      .insert({
        email: `admin@${adminDomain}.com`,
        password_hash: password_hash,
        name: 'Agency Admin',
        role: 'admin',
        agency_id: newAgency.id,
        is_active: true,
        must_change_password: true
      })
      .select()
      .single();

    if (userError) {
      // Rollback agency
      await supabase.from('agencies').delete().eq('id', newAgency.id);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to create admin user: ' + userError.message 
      });
    }

    return res.status(201).json({
      success: true,
      message: `Agency "${name}" created successfully with admin user`,
      data: {
        agency: {
          id: newAgency.id,
          name: newAgency.name,
          code: newAgency.code,
          admin_email: newAgency.admin_email
        },
        admin_user: {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          role: adminUser.role
        },
        default_password: 'TempPass123!',
        note: 'Admin user must change password on first login. You can manually add more users later.'
      }
    });

  } catch (error) {
    console.error('Error in simple-create-agency:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    });
  }
}