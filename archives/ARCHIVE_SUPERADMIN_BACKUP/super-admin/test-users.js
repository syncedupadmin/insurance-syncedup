// Direct test of portal_users query
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    try {
        const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        const supabase = createClient(url, key);
        
        // Try the exact query that's failing
        const { data, error } = await supabase
            .from('portal_users')
            .select('id,email,role,agency_id,full_name,is_active,created_at,last_login')
            .order('created_at', { ascending: false });
            
        if (error) {
            return res.status(200).json({ 
                error: error.message,
                details: error,
                hint: error.hint,
                code: error.code
            });
        }
        
        return res.status(200).json({ 
            success: true,
            count: data?.length || 0,
            data: data
        });
        
    } catch (err) {
        return res.status(200).json({ 
            catch_error: err.message,
            stack: err.stack
        });
    }
};