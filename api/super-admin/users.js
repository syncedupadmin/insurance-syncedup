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

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'Database configuration error' });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    if (req.method === 'GET') {
        try {
            const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({
                page: 1,
                perPage: 1000
            });

            if (authError) {
                console.error('Error fetching auth users:', authError);
                return res.status(500).json({ error: 'Failed to fetch auth users' });
            }

            const users = authUsers.users.map(user => ({
                id: user.id,
                auth_user_id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0],
                name: user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0],
                role: user.app_metadata?.role || user.user_metadata?.role || null,
                agency_id: user.app_metadata?.agency_id || user.user_metadata?.agency_id || null,
                is_active: !user.banned_until && user.email_confirmed_at,
                email_confirmed: !!user.email_confirmed_at,
                last_login: user.last_sign_in_at,
                created_at: user.created_at
            }));

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
            const { email, full_name, role, agency_id, password } = req.body;

            const { data, error } = await supabase.auth.admin.createUser({
                email,
                password: password || Math.random().toString(36).slice(-12),
                email_confirm: true,
                app_metadata: { role, agency_id },
                user_metadata: { full_name, role, agency_id, email_verified: true }
            });

            if (error) {
                return res.status(400).json({ error: error.message });
            }

            return res.status(201).json({ success: true, user: data.user });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to create user' });
        }
    }

    if (req.method === 'PUT') {
        try {
            const { id, role, agency_id, full_name } = req.body;

            const { data: user, error: getUserError } = await supabase.auth.admin.getUserById(id);
            if (getUserError) {
                return res.status(404).json({ error: 'User not found' });
            }

            const updates = {
                app_metadata: {
                    ...user.user.app_metadata,
                    role: role || user.user.app_metadata?.role,
                    agency_id: agency_id !== undefined ? agency_id : user.user.app_metadata?.agency_id
                },
                user_metadata: {
                    ...user.user.user_metadata,
                    role: role || user.user.user_metadata?.role,
                    agency_id: agency_id !== undefined ? agency_id : user.user.user_metadata?.agency_id,
                    full_name: full_name || user.user.user_metadata?.full_name
                }
            };

            const { data, error } = await supabase.auth.admin.updateUserById(id, updates);

            if (error) {
                return res.status(400).json({ error: error.message });
            }

            return res.status(200).json({ success: true, user: data.user });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to update user' });
        }
    }

    if (req.method === 'DELETE') {
        try {
            const { id } = req.body;

            const { error } = await supabase.auth.admin.deleteUser(id);

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