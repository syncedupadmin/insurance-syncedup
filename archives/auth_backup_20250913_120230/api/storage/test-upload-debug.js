// Debug version of upload API to identify configuration issues
export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const diagnostics = {
            timestamp: new Date().toISOString(),
            environment: {},
            request: {},
            issues: []
        };

        // Check environment variables
        const requiredEnvVars = [
            'R2_ENDPOINT', 
            'R2_ACCESS_KEY_ID', 
            'R2_SECRET_ACCESS_KEY', 
            'R2_BUCKET_NAME',
            'JWT_SECRET',
            'NEXT_PUBLIC_SUPABASE_URL',
            'SUPABASE_SERVICE_KEY'
        ];

        requiredEnvVars.forEach(envVar => {
            const value = process.env[envVar];
            diagnostics.environment[envVar] = value ? 'SET' : 'MISSING';
            if (!value) {
                diagnostics.issues.push(`Missing environment variable: ${envVar}`);
            }
        });

        // Check request data
        diagnostics.request.hasAuthHeader = !!req.headers.authorization;
        diagnostics.request.authHeader = req.headers.authorization ? 'Bearer ***' : 'MISSING';
        diagnostics.request.hasBody = !!req.body;
        diagnostics.request.bodyKeys = req.body ? Object.keys(req.body) : [];

        const { fileName, fileType, fileSize } = req.body || {};
        diagnostics.request.fileName = fileName || 'MISSING';
        diagnostics.request.fileType = fileType || 'MISSING';
        diagnostics.request.fileSize = fileSize || 'MISSING';

        if (!fileName || !fileType) {
            diagnostics.issues.push('Missing fileName or fileType in request body');
        }

        // JWT verification check
        if (req.headers.authorization && process.env.JWT_SECRET) {
            try {
                const jwt = await import('jsonwebtoken');
                const token = req.headers.authorization.substring(7);
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                diagnostics.request.tokenValid = true;
                diagnostics.request.userId = decoded.id || 'NO_ID';
            } catch (jwtError) {
                diagnostics.request.tokenValid = false;
                diagnostics.request.jwtError = jwtError.message;
                diagnostics.issues.push(`JWT verification failed: ${jwtError.message}`);
            }
        }

        // Check Supabase connection
        if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
            try {
                const { createClient } = await import('@supabase/supabase-js');
                const supabase = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL,
                    process.env.SUPABASE_SERVICE_KEY
                );
                
                // Test connection with a simple query
                const { data, error } = await supabase
                    .from('portal_users')
                    .select('count')
                    .limit(1);
                
                diagnostics.supabase = {
                    connected: !error,
                    error: error?.message || null
                };
                
                if (error) {
                    diagnostics.issues.push(`Supabase connection failed: ${error.message}`);
                }
            } catch (supabaseError) {
                diagnostics.supabase = {
                    connected: false,
                    error: supabaseError.message
                };
                diagnostics.issues.push(`Supabase setup failed: ${supabaseError.message}`);
            }
        }

        // Check R2 configuration
        if (process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID) {
            try {
                const { S3Client } = await import('@aws-sdk/client-s3');
                const s3Client = new S3Client({
                    region: 'auto',
                    endpoint: process.env.R2_ENDPOINT,
                    credentials: {
                        accessKeyId: process.env.R2_ACCESS_KEY_ID,
                        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
                    },
                });
                
                diagnostics.r2 = {
                    configured: true,
                    endpoint: process.env.R2_ENDPOINT,
                    bucket: process.env.R2_BUCKET_NAME || 'NOT_SET'
                };
            } catch (r2Error) {
                diagnostics.r2 = {
                    configured: false,
                    error: r2Error.message
                };
                diagnostics.issues.push(`R2 configuration failed: ${r2Error.message}`);
            }
        }

        // Summary
        diagnostics.summary = {
            totalIssues: diagnostics.issues.length,
            canUpload: diagnostics.issues.length === 0,
            nextSteps: diagnostics.issues.length > 0 ? 
                'Fix the issues listed above to enable uploads' : 
                'All systems ready for upload'
        };

        return res.status(200).json(diagnostics);

    } catch (error) {
        return res.status(500).json({
            error: 'Debug API failed',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
}