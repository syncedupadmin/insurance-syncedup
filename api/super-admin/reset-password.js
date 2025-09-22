const { createClient } = require('@supabase/supabase-js');
const { verifyToken } = require('../../lib/auth-bridge.js');
const crypto = require('crypto');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getCookie(req, name) {
    const m = (req.headers.cookie || "").match(new RegExp(`(?:^|; )${name}=([^;]+)`));
    return m ? decodeURIComponent(m[1]) : null;
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Check cookie-based authentication
        const token = getCookie(req, "auth_token");
        if (!token) {
            return res.status(401).json({ error: 'No authorization token' });
        }

        // Verify the token and check role
        const payload = await verifyToken(token);
        if (!payload) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Check if user is super admin (normalize role names)
        const userRole = payload.role?.toLowerCase().replace(/-/g, '_');
        if (userRole !== 'super_admin') {
            return res.status(403).json({ error: 'Unauthorized - Super Admin access required' });
        }

        const { user_id } = req.body;
        if (!user_id) {
            return res.status(400).json({ error: 'user_id is required' });
        }

        // Generate strong random password
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=";
        const randomBytes = crypto.randomBytes(24);
        const new_password = Array.from(randomBytes).map(b => alphabet[b % alphabet.length]).join('');

        // First, try to get the user by email (since user_id might be from a different system)
        let authUser = null;

        // Search for user by user_id first (in case it's a Supabase auth ID)
        try {
            const { data: userById } = await supabase.auth.admin.getUserById(user_id);
            if (userById && userById.user) {
                authUser = userById.user;
            }
        } catch (e) {
            // User not found by ID, will try by email
        }

        // If no user found by ID, we need to get email from somewhere
        // Check if user_id is actually an email
        let userEmail = null;
        if (user_id.includes('@')) {
            userEmail = user_id;
        } else {
            // Try to get user info from portal_users table
            const { data: portalUser } = await supabase
                .from('portal_users')
                .select('email')
                .eq('id', user_id)
                .single();

            if (portalUser) {
                userEmail = portalUser.email;
            }
        }

        if (!authUser && userEmail) {
            // Try to find user by email
            const { data: userList } = await supabase.auth.admin.listUsers();
            authUser = userList?.users?.find(u => u.email === userEmail);
        }

        // Now update or create the user
        if (authUser) {
            // User exists, update password
            const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
                password: new_password
            });

            if (updateError) {
                console.error('Password update error:', updateError);
                return res.status(400).json({ error: updateError.message });
            }
        } else if (userEmail) {
            // User doesn't exist in Supabase Auth, create them
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email: userEmail,
                password: new_password,
                email_confirm: true
            });

            if (createError) {
                console.error('User creation error:', createError);
                return res.status(400).json({ error: createError.message });
            }
        } else {
            return res.status(400).json({ error: 'Could not find user email' });
        }

        // Invalidate all refresh tokens
        try {
            await supabase.rpc('revoke_refresh_tokens', { user_id });
        } catch (revokeError) {
            console.log('Could not revoke tokens:', revokeError);
            // Continue anyway - password is already reset
        }

        return res.status(200).json({
            user_id,
            new_password,
            tokens_invalidated: true
        });

    } catch (error) {
        console.error('Reset password error:', error);
        return res.status(500).json({ error: error.message });
    }
};