import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Setting up customer service database role...');

    // First, let's try to create the customer service user directly
    // and see if it works (it might already be allowed)
    
    const testUser = {
      email: 'customerservice@test.com',
      password_hash: '$2a$10$8K1p/a0dUrAKh/KLgpFV.uHrp8pJg7aWs8TdvqkWx.tJ5z2n4K2Qe', // password123 hashed
      name: 'Test Customer Service',
      role: 'customer-service',
      is_active: true,
      must_change_password: false
    };

    // Try to insert or update the customer service user
    const { data: existingUser } = await supabase
      .from('portal_users')
      .select('email')
      .eq('email', testUser.email)
      .single();

    let result;
    if (existingUser) {
      // Update existing user
      const { data, error } = await supabase
        .from('portal_users')
        .update({
          password_hash: testUser.password_hash,
          name: testUser.name,
          role: testUser.role,
          is_active: testUser.is_active,
          must_change_password: testUser.must_change_password
        })
        .eq('email', testUser.email)
        .select()
        .single();
      
      result = { data, error, action: 'updated' };
    } else {
      // Create new user
      const { data, error } = await supabase
        .from('portal_users')
        .insert(testUser)
        .select()
        .single();
      
      result = { data, error, action: 'created' };
    }

    if (result.error) {
      // If we get a constraint error, the role doesn't exist in the database constraint
      if (result.error.message.includes('check constraint') || result.error.message.includes('role_check')) {
        return res.status(400).json({
          error: 'Database constraint violation',
          message: 'The customer-service role is not allowed in the database. Manual database update required.',
          details: result.error.message,
          manualSteps: [
            '1. Login to Supabase dashboard',
            '2. Go to SQL Editor',
            '3. Run: ALTER TABLE portal_users DROP CONSTRAINT IF EXISTS portal_users_role_check;',
            "4. Run: ALTER TABLE portal_users ADD CONSTRAINT portal_users_role_check CHECK (role IN ('agent', 'manager', 'admin', 'super-admin', 'customer-service'));",
            '5. Then call this API again'
          ]
        });
      } else {
        throw new Error(result.error.message);
      }
    }

    // Success - customer service user created/updated
    res.status(200).json({
      success: true,
      message: `Customer service user ${result.action} successfully`,
      user: {
        email: result.data.email,
        name: result.data.name,
        role: result.data.role
      },
      credentials: {
        email: 'customerservice@test.com',
        password: 'password123'
      }
    });

  } catch (error) {
    console.error('Error setting up customer service:', error);
    res.status(500).json({
      error: 'Failed to setup customer service',
      details: error.message
    });
  }
}