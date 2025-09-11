// Simple diagnostic to find the exact error
module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const results = {
        env_check: {
            JWT_SECRET: !!process.env.JWT_SECRET,
            SUPABASE_URL: !!process.env.SUPABASE_URL,
            NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
        supabase_test: null,
        error_details: null
    };

    try {
        // Test Supabase connection
        const { createClient } = require('@supabase/supabase-js');
        const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (!url || !key) {
            results.error_details = `Missing: ${!url ? 'URL' : ''} ${!key ? 'KEY' : ''}`;
            return res.status(200).json(results);
        }

        const supabase = createClient(url, key);
        
        // Try a simple query
        const { data, error } = await supabase
            .from('portal_users')
            .select('email')
            .limit(1);
            
        if (error) {
            results.supabase_test = 'FAILED';
            results.error_details = error.message;
        } else {
            results.supabase_test = 'SUCCESS';
            results.portal_users_found = !!data;
        }
        
    } catch (err) {
        results.error_details = err.message;
    }
    
    return res.status(200).json(results);
};