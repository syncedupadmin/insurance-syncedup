const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function ensureUser() {
  try {
    console.log('Creating/updating user agent1@phsagency.com...')

    // First try to create the user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: 'agent1@phsagency.com',
      password: 'useh#=1JWNhEYCN^m^L',
      email_confirm: true,
      app_metadata: { role: 'agent', agency_id: 1 },
      user_metadata: { role: 'agent', agency_id: 1 }
    })

    if (createError && createError.message.includes('already been registered')) {
      console.log('User already exists, updating password...')

      // Get the user first
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000
      })

      const user = listData.users.find(u => u.email === 'agent1@phsagency.com')

      if (user) {
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          user.id,
          {
            password: 'useh#=1JWNhEYCN^m^L',
            email_confirm: true
          }
        )

        if (updateError) {
          console.log('Error updating:', updateError.message)
        } else {
          console.log('Password updated successfully!')
        }
      }
    } else if (createError) {
      console.log('Error:', createError.message)
    } else {
      console.log('User created successfully!')
    }

    // Now test login
    console.log('\nTesting login...')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'agent1@phsagency.com',
      password: 'useh#=1JWNhEYCN^m^L'
    })

    if (error) {
      console.log('Login failed:', error.message)
    } else {
      console.log('Login successful!')
      console.log('Access token:', data.session.access_token.substring(0, 20) + '...')
    }

  } catch (e) {
    console.log('Error:', e.message)
  }
}

ensureUser()