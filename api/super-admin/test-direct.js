// Direct test to isolate the exact error
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const results = {
        step: 'starting',
        error: null
    };
    
    try {
        // Step 1: Check environment variables
        results.step = 'env_check';
        const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (!url || !key) {
            results.error = `Missing: URL=${!!url}, KEY=${!!key}`;
            return res.status(200).json(results);
        }
        
        // Step 2: Create client
        results.step = 'create_client';
        const supabase = createClient(url, key);
        
        // Step 3: Try to insert a simple audit log
        results.step = 'insert_audit';
        const { data, error } = await supabase
            .from('audit_logs')
            .insert({
                admin_email: 'test@test.com',
                action: 'TEST_ACTION',
                details: { message: 'Test insert' },
                ip_address: '127.0.0.1',
                portal: 'super-admin'
            })
            .select();
            
        if (error) {
            results.error = error.message;
            results.error_details = error;
        } else {
            results.success = true;
            results.inserted_id = data?.[0]?.id;
        }
        
    } catch (err) {
        results.catch_error = err.message;
        results.stack = err.stack;
    }
    
    return res.status(200).json(results);
};