const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Check if user is super admin
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'No authorization token' });
        }

        // Verify the token and check role
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Check if user is super admin
        if (user.user_metadata?.role !== 'super_admin' && user.app_metadata?.role !== 'super_admin') {
            return res.status(403).json({ error: 'Unauthorized - Super Admin access required' });
        }

        const { action, email, password, metadata } = req.body;

        if (action === 'create') {
            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password are required' });
            }

            // Create user in auth.users
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: metadata || {},
                app_metadata: metadata || {}
            });

            if (createError) {
                console.error('Create user error:', createError);
                return res.status(400).json({ error: createError.message });
            }

            // Also create in portal_users
            const { error: portalError } = await supabase
                .from('portal_users')
                .insert({
                    email,
                    role: metadata?.role || 'agent',
                    roles: [metadata?.role || 'agent'],
                    full_name: metadata?.full_name || email.split('@')[0],
                    name: metadata?.full_name || email.split('@')[0],
                    agency_id: metadata?.agency_id || null,
                    auth_user_id: newUser.user.id,
                    is_active: true
                });

            if (portalError) {
                console.error('Portal user creation error:', portalError);
                // User created in auth but not portal - still return success
            }

            return res.status(200).json({
                user: newUser.user,
                message: 'User created successfully'
            });
        }

        return res.status(400).json({ error: 'Invalid action' });

    } catch (error) {
        console.error('Create user error:', error);
        return res.status(500).json({ error: error.message });
    }
};