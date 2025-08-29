import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  try {
    console.log('Testing database connection...')
    
    // Test users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, role')
      .limit(5)

    console.log('Users query result:', { users, usersError })

    // Test if agencies table exists
    const { data: agencies, error: agenciesError } = await supabase
      .from('agencies')
      .select('*')
      .limit(5)

    console.log('Agencies query result:', { agencies, agenciesError })

    return res.json({
      success: true,
      data: {
        users: users || [],
        users_error: usersError?.message,
        agencies: agencies || [],
        agencies_error: agenciesError?.message,
        env: {
          supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set',
          service_key: process.env.SUPABASE_SERVICE_KEY ? 'Set' : 'Not set'
        }
      }
    })

  } catch (error) {
    console.error('Database test error:', error)
    return res.status(500).json({
      error: error.message,
      stack: error.stack
    })
  }
}