const { verifyToken } = require('../lib/auth-bridge.js');
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        const decoded = await verifyToken(, ["auth_token","auth-token","user_role","user_roles","assumed_role"]);
        const userId = decoded.id;

        const { fileId } = req.body;

        if (!fileId) {
            return res.status(400).json({ error: 'fileId is required' });
        }

        // Update file status to completed
        const { data, error } = await supabase
            .from('documents')
            .update({ status: 'completed' })
            .eq('id', fileId)
            .eq('user_id', userId)
            .select()
            .single();

        if (error || !data) {
            console.error('Database error:', error);
            return res.status(500).json({ error: 'Failed to update file status' });
        }

        res.status(200).json({
            success: true,
            fileId: data.id,
            status: data.status
        });

    } catch (error) {
        console.error('Complete upload error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
