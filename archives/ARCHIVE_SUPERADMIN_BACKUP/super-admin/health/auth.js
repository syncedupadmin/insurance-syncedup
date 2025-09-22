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
        // Initialize Supabase client for auth check
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase authentication configuration missing');
        }
        
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Test authentication service by checking user count
        const { data, error } = await supabase
            .from('portal_users')
            .select('count', { count: 'exact' })
            .limit(1);
        
        if (error) {
            throw new Error(`Auth service query failed: ${error.message}`);
        }
        
        // Check if JWT secret is configured
        const jwtSecretConfigured = !!(process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET);
        
        return res.status(200).json({
            status: 'operational',
            timestamp: new Date().toISOString(),
            service: 'Supabase Auth',
            jwt_configured: jwtSecretConfigured,
            auth_url: supabaseUrl,
            user_count: data?.[0]?.count || 0
        });
        
    } catch (error) {
        console.error('Auth service health check failed:', error);
        return res.status(503).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}