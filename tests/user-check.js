const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function checkUser() {
  try {
    // List users with admin client
    console.log('Checking if user exists in Supabase Auth...')
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 100
    })

    if (error) {
      console.log('Error listing users:', error.message)
      return
    }

    console.log(`Found ${data.users.length} users in Supabase Auth`)

    // Look for agent1@phsagency.com
    const targetUser = data.users.find(u => u.email === 'agent1@phsagency.com')

    if (targetUser) {
      console.log('\n✅ User agent1@phsagency.com EXISTS!')
      console.log('User ID:', targetUser.id)
      console.log('Email confirmed:', targetUser.email_confirmed_at ? 'Yes' : 'No')
      console.log('Last sign in:', targetUser.last_sign_in_at || 'Never')
      console.log('Role (app_metadata):', targetUser.app_metadata?.role)
      console.log('Role (user_metadata):', targetUser.user_metadata?.role)

      // Try to reset the password
      console.log('\n🔧 Resetting password to the test password...')
      const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        targetUser.id,
        {
          password: 'useh#=1JWNhEYCN^m^L',
          email_confirm: true
        }
      )

      if (updateError) {
        console.log('❌ Error updating password:', updateError.message)
      } else {
        console.log('✅ Password reset successfully!')
      }
    } else {
      console.log('\n❌ User agent1@phsagency.com NOT FOUND')
      console.log('Creating user...')

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: 'agent1@phsagency.com',
        password: 'useh#=1JWNhEYCN^m^L',
        email_confirm: true,
        app_metadata: { role: 'agent', agency_id: 1 },
        user_metadata: { role: 'agent', agency_id: 1 }
      })

      if (createError) {
        console.log('❌ Error creating user:', createError.message)
      } else {
        console.log('✅ User created successfully!')
        console.log('User ID:', newUser.user.id)
      }
    }

    // List first 5 users as examples
    console.log('\nFirst 5 users in system:')
    data.users.slice(0, 5).forEach(u => {
      console.log(`  - ${u.email} (Role: ${u.app_metadata?.role || u.user_metadata?.role || 'none'})`);
    })

  } catch (e) {
    console.log('Error:', e.message)
  }
}

checkUser()
