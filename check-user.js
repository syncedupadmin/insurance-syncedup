const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkUser() {
  try {
    console.log('🔍 Checking Supabase users...\n');
    
    const { data: users, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;
    
    console.log('📋 All users in database:');
    users.users.forEach(user => {
      console.log('- Email:', user.email);
      console.log('  ID:', user.id);
      console.log('  Role:', user.user_metadata?.role || 'No role set');
      console.log('  Metadata:', JSON.stringify(user.user_metadata, null, 2));
      console.log('  Created:', user.created_at);
      console.log('  Confirmed:', user.email_confirmed_at ? 'Yes' : 'No');
      console.log('---');
    });
    
    const targetUser = users.users.find(u => u.email === 'admin@syncedupsolutions.com');
    if (targetUser) {
      console.log('✅ Found admin@syncedupsolutions.com user');
      console.log('Current role:', targetUser.user_metadata?.role || 'No role');
      
      if (targetUser.user_metadata?.role !== 'super_admin') {
        console.log('⚠️  Updating user role to super_admin...');
        const { error: updateError } = await supabase.auth.admin.updateUserById(targetUser.id, {
          user_metadata: {
            ...targetUser.user_metadata,
            role: 'super_admin',
            name: 'Super Admin'
          }
        });
        
        if (updateError) {
          console.log('❌ Error updating user:', updateError.message);
        } else {
          console.log('✅ User role updated to super_admin');
        }
      }
    } else {
      console.log('❌ admin@syncedupsolutions.com not found');
      console.log('🔧 Creating admin@syncedupsolutions.com user...');
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: 'admin@syncedupsolutions.com',
        password: 'SuperAdmin2024!',
        email_confirm: true,
        user_metadata: {
          role: 'super_admin',
          name: 'Super Admin'
        }
      });
      
      if (createError) {
        console.log('❌ Error creating user:', createError.message);
      } else {
        console.log('✅ User created successfully');
        console.log('   Email: admin@syncedupsolutions.com');
        console.log('   Password: SuperAdmin2024!');
        console.log('   Role: super_admin');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkUser();