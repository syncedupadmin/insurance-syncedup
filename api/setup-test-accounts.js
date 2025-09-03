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
    const testAccounts = [
      {
        email: 'agent@test.com',
        password: 'agent123',
        name: 'Test Agent',
        role: 'agent'
      },
      {
        email: 'manager@test.com', 
        password: 'manager123',
        name: 'Test Manager',
        role: 'manager'
      },
      {
        email: 'admin@test.com',
        password: 'admin123', 
        name: 'Test Admin',
        role: 'admin'
      },
      {
        email: 'customerservice@test.com',
        password: 'password123',
        name: 'Test Customer Service',
        role: 'customer-service'
      }
    ];

    const results = [];
    
    for (const account of testAccounts) {
      try {
        // Check if account already exists
        const { data: existingUser } = await supabase
          .from('portal_users')
          .select('email')
          .eq('email', account.email)
          .single();

        if (existingUser) {
          // Update existing account
          const hashedPassword = await bcrypt.hash(account.password, 10);
          
          const { data, error } = await supabase
            .from('portal_users')
            .update({
              password_hash: hashedPassword,
              name: account.name,
              role: account.role,
              is_active: true,
              must_change_password: false,
              updated_at: new Date().toISOString()
            })
            .eq('email', account.email)
            .select()
            .single();

          if (error) {
            results.push({ email: account.email, status: 'error', message: error.message });
          } else {
            results.push({ email: account.email, status: 'updated', role: account.role });
          }
        } else {
          // Create new account
          const hashedPassword = await bcrypt.hash(account.password, 10);
          
          const { data, error } = await supabase
            .from('portal_users')
            .insert({
              email: account.email,
              password_hash: hashedPassword,
              name: account.name,
              role: account.role,
              is_active: true,
              must_change_password: false,
              created_at: new Date().toISOString()
            })
            .select()
            .single();

          if (error) {
            results.push({ email: account.email, status: 'error', message: error.message });
          } else {
            results.push({ email: account.email, status: 'created', role: account.role });
          }
        }
      } catch (accountError) {
        results.push({ email: account.email, status: 'error', message: accountError.message });
      }
    }

    res.status(200).json({ 
      success: true,
      message: 'Test accounts setup completed',
      results: results,
      testCredentials: {
        agent: { email: 'agent@test.com', password: 'agent123' },
        manager: { email: 'manager@test.com', password: 'manager123' },
        admin: { email: 'admin@test.com', password: 'admin123' },
        customerService: { email: 'customerservice@test.com', password: 'password123' }
      }
    });

  } catch (error) {
    console.error('Error setting up test accounts:', error);
    res.status(500).json({ 
      error: 'Failed to setup test accounts', 
      details: error.message 
    });
  }
}