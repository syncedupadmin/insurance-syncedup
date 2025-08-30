import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const { email, name, password } = req.body;

  try {
    // Hash password
    const password_hash = await bcrypt.hash(password, 10);
    
    // Create personal agency
    const { data: personalAgency, error: agencyError } = await supabase
      .from('agencies')
      .insert({
        name: `${name} - Personal`,
        code: `IND-${Date.now()}`,
        admin_email: email,
        commission_split: 100,
        features: {
          personal_account: true,
          csv_upload: false,
          bulk_operations: false
        }
      })
      .select()
      .single();

    if (agencyError) throw agencyError;

    // Create user account
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        name,
        password_hash,
        role: 'agent',
        agency_id: personalAgency.id,
        personal_dashboard: true,
        is_active: true
      })
      .select()
      .single();

    if (userError) throw userError;

    return res.status(201).json({ 
      success: true, 
      message: 'Personal account created successfully'
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: error.message });
  }
}