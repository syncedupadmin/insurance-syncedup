require('dotenv').config({ path: '.env.production' });
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestUsers() {
  const password = 'Test123!';
  const passwordHash = await bcrypt.hash(password, 10);
  
  const users = [
    {
      email: 'manager@testalpha.com',
      password_hash: passwordHash,
      full_name: 'Test Manager Alpha',
      role: 'manager',
      agency_id: 'test-agency-001',
      is_active: true
    },
    {
      email: 'cs@testalpha.com',
      password_hash: passwordHash,
      full_name: 'Test Customer Service Alpha',
      role: 'customer_service',
      agency_id: 'test-agency-001',
      is_active: true
    },
    {
      email: 'manager@testbeta.com',
      password_hash: passwordHash,
      full_name: 'Test Manager Beta',
      role: 'manager',
      agency_id: 'test-agency-002',
      is_active: true
    },
    {
      email: 'cs@testbeta.com',
      password_hash: passwordHash,
      full_name: 'Test Customer Service Beta',
      role: 'customer_service',
      agency_id: 'test-agency-002',
      is_active: true
    }
  ];
  
  console.log('Creating 4 test users (2 managers, 2 customer service)...\n');
  
  for (const user of users) {
    const { data: existing } = await supabase
      .from('portal_users')
      .select('id, email')
      .eq('email', user.email)
      .single();
    
    if (existing) {
      console.log(`✓ ${user.email} already exists (${user.role})`);
      continue;
    }
    
    const { data, error } = await supabase
      .from('portal_users')
      .insert(user)
      .select()
      .single();
    
    if (error) {
      console.error(`✗ Failed to create ${user.email}:`, error.message);
    } else {
      console.log(`✓ Created ${user.email} (${user.role})`);
    }
  }
  
  console.log('\n=== Test Logins ===');
  console.log('Password for all: Test123!\n');
  console.log('Managers:');
  console.log('  manager@testalpha.com');
  console.log('  manager@testbeta.com\n');
  console.log('Customer Service:');
  console.log('  cs@testalpha.com');
  console.log('  cs@testbeta.com');
}

createTestUsers().catch(console.error);
