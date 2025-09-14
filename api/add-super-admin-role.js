import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Update the role constraint to include super-admin
    const { data, error } = await supabase.rpc('exec', {
      sql: `
        -- Drop existing constraint
        ALTER TABLE portal_users DROP CONSTRAINT IF EXISTS portal_users_role_check;
        
        -- Add new constraint with super-admin role
        ALTER TABLE portal_users ADD CONSTRAINT portal_users_role_check 
        CHECK (role IN ('agent', 'manager', 'admin', 'super-admin', 'customer-service'));
      `
    });

    if (error) {
      console.error('Error updating role constraint:', error);
      return res.status(500).json({ 
        error: 'Failed to update role constraint', 
        details: error.message,
        instructions: [
          'Please run this SQL in your Supabase SQL Editor:',
          'ALTER TABLE portal_users DROP CONSTRAINT IF EXISTS portal_users_role_check;',
          "ALTER TABLE portal_users ADD CONSTRAINT portal_users_role_check CHECK (role IN ('agent', 'manager', 'admin', 'super-admin', 'customer-service'));"
        ]
      });
    }

    res.status(200).json({ 
      success: true,
      message: 'Role constraint updated successfully to include super-admin role'
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Database constraint update failed',
      details: error.message,
      instructions: [
        'Please run this SQL manually in your Supabase SQL Editor:',
        'ALTER TABLE portal_users DROP CONSTRAINT IF EXISTS portal_users_role_check;',
        "ALTER TABLE portal_users ADD CONSTRAINT portal_users_role_check CHECK (role IN ('agent', 'manager', 'admin', 'super-admin', 'customer-service'));"
      ]
    });
  }
}