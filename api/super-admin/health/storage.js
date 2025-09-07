import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        // Initialize Supabase client for storage check
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
            return res.status(200).json({
                status: 'not_configured',
                message: 'Supabase storage not configured',
                timestamp: new Date().toISOString()
            });
        }
        
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Test storage by listing buckets
        const { data: buckets, error } = await supabase.storage.listBuckets();
        
        if (error) {
            // Storage might not be configured, but that's not necessarily an error
            return res.status(200).json({
                status: 'warning',
                message: 'Storage service not accessible',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
        
        return res.status(200).json({
            status: 'operational',
            timestamp: new Date().toISOString(),
            service: 'Supabase Storage',
            buckets_count: buckets?.length || 0,
            buckets: buckets?.map(b => b.name) || []
        });
        
    } catch (error) {
        console.error('Storage health check failed:', error);
        
        // Storage is optional, so return warning instead of error
        return res.status(200).json({
            status: 'warning',
            message: 'Storage service check failed',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}