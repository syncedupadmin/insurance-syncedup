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
    
    // Check API gateway health
    const startTime = Date.now();
    
    try {
        // Simple health check metrics
        const healthMetrics = {
            status: 'operational',
            version: '1.0.0',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            responseTime: Date.now() - startTime,
            environment: process.env.NODE_ENV || 'development',
            memory: process.memoryUsage(),
            pid: process.pid
        };
        
        return res.status(200).json(healthMetrics);
        
    } catch (error) {
        console.error('API health check failed:', error);
        return res.status(503).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}