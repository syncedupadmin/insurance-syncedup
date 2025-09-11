// Debug endpoint to diagnose 500 errors
module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Check environment variables
        const envCheck = {
            JWT_SECRET: !!process.env.JWT_SECRET,
            SUPABASE_URL: !!process.env.SUPABASE_URL || !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY || !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            NODE_ENV: process.env.NODE_ENV
        };

        // Check cookie parsing
        const getCookie = (name) => {
            const match = (req.headers.cookie || '').match(new RegExp(`(?:^|; )${name}=([^;]+)`));
            return match ? decodeURIComponent(match[1]) : null;
        };
        
        const cookieCheck = {
            hasAuthToken: !!getCookie('auth_token'),
            hasUserRole: !!getCookie('user_role'),
            cookies: req.headers.cookie ? 'Present' : 'Missing'
        };

        // Try JWT verification if token exists
        let jwtCheck = { status: 'Not tested' };
        const token = getCookie('auth_token');
        if (token && process.env.JWT_SECRET) {
            try {
                const jwt = require('jsonwebtoken');
                const payload = jwt.verify(token, process.env.JWT_SECRET);
                jwtCheck = {
                    status: 'Valid',
                    email: payload.email,
                    role: payload.role
                };
            } catch (error) {
                jwtCheck = {
                    status: 'Invalid',
                    error: error.message
                };
            }
        } else if (!process.env.JWT_SECRET) {
            jwtCheck = { status: 'Error', error: 'JWT_SECRET not configured' };
        }

        // Try Supabase connection
        let supabaseCheck = { status: 'Not tested' };
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (supabaseUrl && supabaseKey) {
            try {
                const { createClient } = require('@supabase/supabase-js');
                const supabase = createClient(supabaseUrl, supabaseKey);
                
                // Try a simple query
                const { data, error } = await supabase
                    .from('portal_users')
                    .select('count')
                    .limit(1);
                
                if (error) {
                    supabaseCheck = {
                        status: 'Connection OK, Query Failed',
                        error: error.message
                    };
                } else {
                    supabaseCheck = { status: 'OK' };
                }
            } catch (error) {
                supabaseCheck = {
                    status: 'Connection Failed',
                    error: error.message
                };
            }
        } else {
            supabaseCheck = {
                status: 'Error',
                error: 'Supabase credentials not configured'
            };
        }

        return res.status(200).json({
            status: 'Debug endpoint working',
            timestamp: new Date().toISOString(),
            checks: {
                environment: envCheck,
                cookies: cookieCheck,
                jwt: jwtCheck,
                supabase: supabaseCheck
            },
            recommendation: getRecommendation(envCheck, cookieCheck, jwtCheck, supabaseCheck)
        });

    } catch (error) {
        return res.status(200).json({
            status: 'Debug endpoint error',
            error: error.message,
            stack: error.stack
        });
    }
};

function getRecommendation(env, cookies, jwt, supabase) {
    const issues = [];
    
    if (!env.JWT_SECRET) {
        issues.push('JWT_SECRET environment variable is missing');
    }
    if (!env.SUPABASE_URL) {
        issues.push('SUPABASE_URL environment variable is missing');
    }
    if (!env.SUPABASE_SERVICE_KEY) {
        issues.push('SUPABASE_SERVICE_KEY environment variable is missing');
    }
    if (!cookies.hasAuthToken) {
        issues.push('No auth_token cookie found - user may not be logged in');
    }
    if (jwt.status === 'Invalid') {
        issues.push('JWT token is invalid or expired - user needs to login again');
    }
    if (supabase.status.includes('Failed')) {
        issues.push('Supabase connection or query failed - check database configuration');
    }
    
    return issues.length > 0 ? issues : ['All checks passed'];
}