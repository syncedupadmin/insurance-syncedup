/**
 * Script to create simple test users in Supabase
 * Run with: node scripts/create-test-users.js
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const testUsers = [
  {
    email: 'admin@demo.com',
    name: 'Admin User',
    role: 'admin',
    agency_id: 'DEMO001',
    is_active: true,
    password_hash: 'demo123', // This will be demo password
    must_change_password: false,
    login_count: 0
  },
  {
    email: 'manager@demo.com', 
    name: 'Manager User',
    role: 'manager',
    agency_id: 'DEMO001',
    is_active: true,
    password_hash: 'demo123',
    must_change_password: false,
    login_count: 0
  },
  {
    email: 'agent@demo.com',
    name: 'Agent User', 
    role: 'agent',
    agency_id: 'DEMO001',
    is_active: true,
    password_hash: 'demo123',
    must_change_password: false,
    login_count: 0
  },
  {
    email: 'super@demo.com',
    name: 'Super Admin',
    role: 'super-admin',
    agency_id: 'DEMO001', 
    is_active: true,
    password_hash: 'demo123',
    must_change_password: false,
    login_count: 0
  },
  {
    email: 'service@demo.com',
    name: 'Customer Service',
    role: 'customer-service',
    agency_id: 'DEMO001',
    is_active: true, 
    password_hash: 'demo123',
    must_change_password: false,
    login_count: 0
  }
];

async function createTestUsers() {
  console.log('Creating test users...');
  
  for (const user of testUsers) {
    try {
      // First try to update if user exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single();
      
      if (existingUser) {
        // Update existing user
        const { error } = await supabase
          .from('users')
          .update(user)
          .eq('email', user.email);
          
        if (error) {
          console.error(`Error updating ${user.email}:`, error);
        } else {
          console.log(`✅ Updated ${user.email} (${user.role})`);
        }
      } else {
        // Create new user
        const { error } = await supabase
          .from('users')
          .insert([user]);
          
        if (error) {
          console.error(`Error creating ${user.email}:`, error);
        } else {
          console.log(`✅ Created ${user.email} (${user.role})`);
        }
      }
    } catch (error) {
      console.error(`Error processing ${user.email}:`, error);
    }
  }
  
  console.log('\n🎉 Test users setup complete!');
  console.log('\n📋 Login Credentials:');
  testUsers.forEach(user => {
    console.log(`${user.role.toUpperCase().padEnd(15)} ${user.email.padEnd(20)} / demo123`);
  });
}

createTestUsers().catch(console.error);