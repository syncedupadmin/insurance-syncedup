const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Test all possible environment variable combinations
console.log('Environment Variables Check:')
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...')
console.log('SUPABASE_URL:', process.env.SUPABASE_URL)
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...')
console.log('')

async function testAuth() {
  try {
    // Try with NEXT_PUBLIC variables
    const supabase1 = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    console.log('Testing with NEXT_PUBLIC_SUPABASE_ANON_KEY...')
    const { data: data1, error: error1 } = await supabase1.auth.signInWithPassword({
      email: 'agent1@phsagency.com',
      password: 'useh#=1JWNhEYCN^m^L'
    })

    if (error1) {
      console.log('❌ Failed with ANON_KEY:', error1.message)
    } else {
      console.log('✅ Success with ANON_KEY!')
      console.log('User:', data1.user.email)
      console.log('Role:', data1.user.user_metadata?.role || data1.user.app_metadata?.role)
    }
  } catch (e) {
    console.log('❌ Error with ANON_KEY:', e.message)
  }

  try {
    // Try with SERVICE_ROLE_KEY
    const supabase2 = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    console.log('\nTesting with SUPABASE_SERVICE_ROLE_KEY...')
    const { data: data2, error: error2 } = await supabase2.auth.signInWithPassword({
      email: 'agent1@phsagency.com',
      password: 'useh#=1JWNhEYCN^m^L'
    })

    if (error2) {
      console.log('❌ Failed with SERVICE_ROLE_KEY:', error2.message)
    } else {
      console.log('✅ Success with SERVICE_ROLE_KEY!')
      console.log('User:', data2.user.email)
      console.log('Role:', data2.user.user_metadata?.role || data2.user.app_metadata?.role)
    }
  } catch (e) {
    console.log('❌ Error with SERVICE_ROLE_KEY:', e.message)
  }
}

testAuth()