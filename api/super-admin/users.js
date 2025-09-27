import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();

    // Check authentication from cookie
    const getCookie = (name) => {
        const match = (req.headers.cookie || '').match(new RegExp(`(?:^|; )${name}=([^;]+)`));
        return match ? decodeURIComponent(match[1]) : null;
    };

    const token = getCookie('auth_token');
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    // Initialize Supabase client with service role (bypasses RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'Database configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify token and check if user is super-admin
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Check if user is super-admin in portal_users
        const { data: portalUser, error: portalError } = await supabase
            .from('portal_users')
            .select('role')
            .eq('auth_user_id', user.id)
            .single();

        // Normalize role (database has super_admin, but system normalizes to super-admin)
        const normalizeRole = r => String(r||'').trim().toLowerCase().replace(/_/g,'-');
        const userRole = normalizeRole(portalUser.role);

        if (portalError || !portalUser || userRole !== 'super-admin') {
            return res.status(403).json({ error: 'Super-admin access required' });
        }
    } catch (error) {
        console.error('Auth verification error:', error);
        return res.status(401).json({ error: 'Authorization failed' });
    }
    
    if (req.method === 'GET') {
        try {
            // Get ONLY users that exist in BOTH portal_users AND auth.users
            // This ensures we only show real, authenticated users
            const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({
                page: 1,
                perPage: 1000
            });

            if (authError) {
                console.error('Error fetching auth users:', authError);
                return res.status(500).json({ error: 'Failed to fetch auth users' });
            }

            // Get portal users
            const { data: portalUsers, error: portalError } = await supabase
                .from('portal_users')
                .select('*')
                .order('created_at', { ascending: false });

            if (portalError) {
                console.error('Error fetching portal users:', portalError);
                return res.status(500).json({ error: 'Failed to fetch portal users' });
            }

            // Create a map of auth users by email for quick lookup
            const authUserMap = new Map();
            authUsers.users.forEach(user => {
                authUserMap.set(user.email.toLowerCase(), user);
            });

            // Filter portal users to only include those that exist in auth.users
            // and merge auth metadata
            const users = (portalUsers || []).filter(portalUser => {
                const authUser = authUserMap.get(portalUser.email.toLowerCase());
                if (authUser) {
                    // Merge auth user ID and metadata
                    portalUser.auth_user_id = authUser.id;
                    portalUser.auth_role = authUser.app_metadata?.role || authUser.user_metadata?.role;
                    portalUser.email_confirmed = !!authUser.email_confirmed_at;
                    return true;
                }
                return false; // Exclude users not in auth.users
            });

            const count = users.length;
            
            return res.status(200).json({
                users: users || [],
                pagination: {
                    page: 1,
                    limit: 50,
                    total: count || 0,
                    total_pages: Math.ceil((count || 0) / 50)
                },
                filters_applied: {}
            });
        } catch (error) {
            console.error('Users API error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    
    if (req.method === 'POST') {
        try {
            const { email, full_name, role, agency_id } = req.body;
            
            const { data, error } = await supabase
                .from('portal_users')
                .insert([{
                    email,
                    full_name,
                    role,
                    agency_id,
                    is_active: true,
                    created_at: new Date().toISOString()
                }])
                .select();
                
            if (error) {
                return res.status(400).json({ error: error.message });
            }
            
            return res.status(201).json({ success: true, user: data[0] });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to create user' });
        }
    }
    
    if (req.method === 'PUT') {
        try {
            const { id, ...updates } = req.body;
            
            const { data, error } = await supabase
                .from('portal_users')
                .update(updates)
                .eq('id', id)
                .select();
                
            if (error) {
                return res.status(400).json({ error: error.message });
            }
            
            return res.status(200).json({ success: true, user: data[0] });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to update user' });
        }
    }
    
    if (req.method === 'DELETE') {
        try {
            const { id } = req.body;
            
            const { error } = await supabase
                .from('portal_users')
                .delete()
                .eq('id', id);
                
            if (error) {
                return res.status(400).json({ error: error.message });
            }
            
            return res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to delete user' });
        }
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
}