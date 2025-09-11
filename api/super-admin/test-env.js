// Simple test to see which env vars are available
module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const envStatus = {
        JWT_SECRET: !!process.env.JWT_SECRET,
        SUPABASE_URL: !!process.env.SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
        // Try to get the actual URL (safely)
        url_value: process.env.SUPABASE_URL ? 'Has value' : 'Missing',
        next_url_value: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Has value' : 'Missing'
    };
    
    return res.status(200).json({
        status: 'Environment check',
        env: envStatus,
        recommendation: !envStatus.SUPABASE_SERVICE_ROLE_KEY ? 
            'SUPABASE_SERVICE_ROLE_KEY is missing!' : 
            'All required vars present'
    });
}