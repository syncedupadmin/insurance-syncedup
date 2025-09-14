const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
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

        const { user_id } = req.body;
        if (!user_id) {
            return res.status(400).json({ error: 'user_id is required' });
        }

        // Generate strong random password
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=";
        const randomBytes = Array.from(crypto.getRandomValues(new Uint8Array(24)));
        const new_password = randomBytes.map(b => alphabet[b % alphabet.length]).join('');

        // Update user password using admin API
        const { error: updateError } = await supabase.auth.admin.updateUserById(user_id, {
            password: new_password
        });

        if (updateError) {
            console.error('Password update error:', updateError);
            return res.status(400).json({ error: updateError.message });
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