import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function handler(req, res) {
  const { method } = req

  // Verify admin authentication
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Check if user has admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    switch (method) {
      case 'GET':
        return await handleGet(req, res)
      case 'POST':
        return await handlePost(req, res)
      case 'PUT':
        return await handlePut(req, res)
      case 'DELETE':
        return await handleDelete(req, res)
      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Admin licensing API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleGet(req, res) {
  const { state, expiring, agent_id } = req.query

  try {
    let query = supabase
      .from('agent_licenses')
      .select(`
        *,
        profiles:agent_id (
          name,
          email,
          agent_code
        )
      `)

    // Filter by state if provided
    if (state) {
      query = query.eq('state', state)
    }

    // Filter by agent if provided
    if (agent_id) {
      query = query.eq('agent_id', agent_id)
    }

    // Filter expiring licenses (within 60 days)
    if (expiring === 'true') {
      const sixtyDaysFromNow = new Date()
      sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60)
      query = query.lte('expiration_date', sixtyDaysFromNow.toISOString().split('T')[0])
    }

    const { data: licenses, error } = await query.order('expiration_date', { ascending: true })

    if (error) throw error

    // Get compliance summary
    const { data: allLicenses } = await supabase
      .from('agent_licenses')
      .select('*')

    const summary = {
      total_licenses: allLicenses?.length || 0,
      active_licenses: allLicenses?.filter(l => new Date(l.expiration_date) > new Date()).length || 0,
      expiring_soon: allLicenses?.filter(l => {
        const expDate = new Date(l.expiration_date)
        const today = new Date()
        const daysDiff = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24))
        return daysDiff <= 60 && daysDiff > 0
      }).length || 0,
      expired: allLicenses?.filter(l => new Date(l.expiration_date) <= new Date()).length || 0,
      states_covered: [...new Set(allLicenses?.map(l => l.state))].length || 0
    }

    // Group by state for state breakdown
    const by_state = allLicenses?.reduce((acc, license) => {
      if (!acc[license.state]) {
        acc[license.state] = {
          total: 0,
          active: 0,
          expiring: 0,
          expired: 0
        }
      }
      acc[license.state].total++
      
      const expDate = new Date(license.expiration_date)
      const today = new Date()
      const daysDiff = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24))
      
      if (daysDiff > 60) acc[license.state].active++
      else if (daysDiff > 0) acc[license.state].expiring++
      else acc[license.state].expired++
      
      return acc
    }, {}) || {}

    return res.json({
      licenses,
      summary,
      by_state
    })

  } catch (error) {
    console.error('Error fetching licenses:', error)
    return res.status(500).json({ error: 'Failed to fetch licenses' })
  }
}

async function handlePost(req, res) {
  const { agent_id, state, license_number, license_type, issue_date, expiration_date } = req.body

  if (!agent_id || !state || !license_number || !expiration_date) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    // Check if license already exists
    const { data: existing } = await supabase
      .from('agent_licenses')
      .select('*')
      .eq('agent_id', agent_id)
      .eq('state', state)
      .eq('license_number', license_number)
      .single()

    if (existing) {
      return res.status(409).json({ error: 'License already exists' })
    }

    const { data: license, error } = await supabase
      .from('agent_licenses')
      .insert([{
        agent_id,
        state,
        license_number,
        license_type: license_type || 'Property & Casualty',
        issue_date: issue_date || new Date().toISOString().split('T')[0],
        expiration_date,
        status: 'active'
      }])
      .select(`
        *,
        profiles:agent_id (
          name,
          email,
          agent_code
        )
      `)
      .single()

    if (error) throw error

    return res.status(201).json(license)

  } catch (error) {
    console.error('Error creating license:', error)
    return res.status(500).json({ error: 'Failed to create license' })
  }
}

async function handlePut(req, res) {
  const { id } = req.query
  const { license_number, license_type, issue_date, expiration_date, status } = req.body

  if (!id) {
    return res.status(400).json({ error: 'License ID required' })
  }

  try {
    const updates = {}
    if (license_number !== undefined) updates.license_number = license_number
    if (license_type !== undefined) updates.license_type = license_type
    if (issue_date !== undefined) updates.issue_date = issue_date
    if (expiration_date !== undefined) updates.expiration_date = expiration_date
    if (status !== undefined) updates.status = status

    const { data: license, error } = await supabase
      .from('agent_licenses')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        profiles:agent_id (
          name,
          email,
          agent_code
        )
      `)
      .single()

    if (error) throw error

    return res.json(license)

  } catch (error) {
    console.error('Error updating license:', error)
    return res.status(500).json({ error: 'Failed to update license' })
  }
}

async function handleDelete(req, res) {
  const { id } = req.query

  if (!id) {
    return res.status(400).json({ error: 'License ID required' })
  }

  try {
    const { error } = await supabase
      .from('agent_licenses')
      .delete()
      .eq('id', id)

    if (error) throw error

    return res.json({ message: 'License deleted successfully' })

  } catch (error) {
    console.error('Error deleting license:', error)
    return res.status(500).json({ error: 'Failed to delete license' })
  }
}
module.exports = handler;
