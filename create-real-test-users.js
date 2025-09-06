const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createTestUsers() {
  console.log('🔧 Creating real test users with proper bcrypt hashes...');
  
  const testPassword = 'TestPass123!';
  const hashedPassword = bcrypt.hashSync(testPassword, 10);
  
  console.log(`📝 Using password: ${testPassword}`);
  console.log(`🔐 Generated hash: ${hashedPassword}`);
  
  const testUsers = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      email: 'test-admin@test.com',
      name: 'Test Admin User',
      role: 'admin',
      agency_id: 'TEST-001'
    },
    {
      id: '22222222-2222-2222-2222-222222222222', 
      email: 'test-manager@test.com',
      name: 'Test Manager User', 
      role: 'manager',
      agency_id: 'TEST-001'
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      email: 'test-agent@test.com', 
      name: 'Test Agent User',
      role: 'agent', 
      agency_id: 'TEST-001'
    },
    {
      id: '44444444-4444-4444-4444-444444444444',
      email: 'test-cs@test.com',
      name: 'Test CS User',
      role: 'customer_service',
      agency_id: 'TEST-001'
    }
  ];

  try {
    // First, ensure TEST-001 agency exists
    console.log('🏢 Creating TEST-001 agency...');
    const { error: agencyError } = await supabase
      .from('agencies')
      .upsert({
        agency_id: 'TEST-001',
        name: 'Test Agency LLC',
        contact_email: 'admin@test-agency.com',
        contact_phone: '555-TEST-001',
        address: '123 Test Street',
        city: 'Test City',
        state: 'TX',
        zip: '12345',
        plan: 'professional',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'agency_id' });

    if (agencyError) {
      console.log('⚠️ Agency creation note:', agencyError.message);
    } else {
      console.log('✅ TEST-001 agency ready');
    }

    // Create test users in portal_users table
    for (const user of testUsers) {
      console.log(`👤 Creating user: ${user.email} (${user.role})`);
      
      const { error } = await supabase
        .from('portal_users')
        .upsert({
          ...user,
          password_hash: hashedPassword,
          active: true,
          must_change_password: false,
          login_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'email' });

      if (error) {
        console.error(`❌ Error creating ${user.email}:`, error.message);
      } else {
        console.log(`✅ Created ${user.email}`);
      }
    }

    // Also create backup entries in users table (for fallback)
    console.log('🔄 Creating backup entries in users table...');
    for (const user of testUsers) {
      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          agency_id: user.agency_id,
          is_active: true,
          must_change_password: false,
          password_hash: hashedPassword,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'email' });

      if (error) {
        console.log(`⚠️ Backup entry for ${user.email}:`, error.message);
      }
    }

    console.log('\n🎉 Test users created successfully!');
    console.log('🔐 Test Credentials:');
    console.log('='.repeat(40));
    testUsers.forEach(user => {
      console.log(`${user.email.padEnd(25)} | ${user.role.padEnd(15)} | ${testPassword}`);
    });
    console.log('='.repeat(40));

  } catch (error) {
    console.error('💥 Fatal error:', error);
  }
}

createTestUsers();