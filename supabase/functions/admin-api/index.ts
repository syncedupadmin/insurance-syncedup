import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with user's JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false }
      }
    )

    // Verify user is super_admin
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token)
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if user is super_admin (from app_metadata or portal_users)
    const isSuperAdmin = user.app_metadata?.user_role === 'super_admin'
    if (!isSuperAdmin) {
      // Fallback: check portal_users table
      const { data: portalUser } = await supabaseUser
        .from('portal_users')
        .select('role')
        .eq('email', user.email)
        .single()
      
      if (portalUser?.role !== 'super_admin') {
        return new Response(JSON.stringify({ error: 'Unauthorized - super admin only' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Create admin client with service role for privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // Parse URL and route to appropriate handler
    const url = new URL(req.url)
    const path = url.pathname.replace('/admin-api', '')
    
    // Route: POST /users - Create new user
    if (path === '/users' && req.method === 'POST') {
      const body = await req.json()
      const { email, password, role, full_name } = body

      // Create auth user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: { user_role: role || 'agent' },
        user_metadata: { full_name }
      })

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Add to portal_users
      const { error: portalError } = await supabaseAdmin
        .from('portal_users')
        .insert({
          id: newUser.user.id,
          email,
          full_name,
          role: role || 'agent',
          is_active: true,
          password_hash: 'managed_by_supabase_auth'
        })

      if (portalError) {
        console.error('Error adding to portal_users:', portalError)
      }

      // Log the action
      await supabaseAdmin.from('audit_logs').insert({
        admin_id: user.id,
        admin_email: user.email,
        action: 'USER_CREATED',
        details: { message: `Created user ${email} with role ${role}` },
        target_resource: newUser.user.id,
        portal: 'super-admin'
      })

      return new Response(JSON.stringify({ 
        success: true, 
        user: newUser.user 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Route: PATCH /users/:id/role - Update user role
    if (path.startsWith('/users/') && path.endsWith('/role') && req.method === 'PATCH') {
      const userId = path.split('/')[2]
      const { role } = await req.json()

      // Update auth.users app_metadata
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { app_metadata: { user_role: role } }
      )

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Update portal_users
      await supabaseAdmin
        .from('portal_users')
        .update({ role })
        .eq('id', userId)

      // Log the action
      await supabaseAdmin.from('audit_logs').insert({
        admin_id: user.id,
        admin_email: user.email,
        action: 'ROLE_UPDATED',
        details: { message: `Updated user role to ${role}` },
        target_resource: userId,
        portal: 'super-admin'
      })

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Route: DELETE /users/:id - Delete user
    if (path.startsWith('/users/') && req.method === 'DELETE') {
      const userId = path.split('/')[2]

      // Soft delete by disabling the user
      const { error: deleteError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { 
          app_metadata: { deleted: true, deleted_at: new Date().toISOString() },
          banned_until: '2999-12-31T23:59:59Z' // Effectively ban forever
        }
      )

      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Update portal_users
      await supabaseAdmin
        .from('portal_users')
        .update({ is_active: false })
        .eq('id', userId)

      // Log the action
      await supabaseAdmin.from('audit_logs').insert({
        admin_id: user.id,
        admin_email: user.email,
        action: 'USER_DELETED',
        details: { message: `Deleted user ${userId}` },
        target_resource: userId,
        portal: 'super-admin'
      })

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Route: GET /users - List all users
    if (path === '/users' && req.method === 'GET') {
      const { data: users, error } = await supabaseAdmin
        .from('portal_users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ users }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Route not found
    return new Response(JSON.stringify({ error: 'Route not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})