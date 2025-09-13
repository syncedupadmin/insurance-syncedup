import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'Database configuration error' });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    if (req.method === 'GET') {
        try {
            // Get REAL users from database
            const { data: users, error, count } = await supabase
                .from('portal_users')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false });
                
            if (error) {
                console.error('Error fetching users:', error);
                return res.status(500).json({ error: 'Failed to fetch users' });
            }
            
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