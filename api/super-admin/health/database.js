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
        // Initialize Supabase client
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase configuration missing');
        }
        
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Test database connection with a simple query
        const { data, error } = await supabase
            .from('portal_users')
            .select('count')
            .limit(1);
        
        if (error) {
            throw new Error(`Database query failed: ${error.message}`);
        }
        
        return res.status(200).json({ 
            status: 'operational',
            timestamp: new Date().toISOString(),
            connection: 'healthy',
            latency: Date.now() % 100 // Simple latency simulation
        });
        
    } catch (error) {
        console.error('Database health check failed:', error);
        return res.status(503).json({ 
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}