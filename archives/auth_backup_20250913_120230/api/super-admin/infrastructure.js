import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    try {
        // Get real record counts
        const { count: totalUsers } = await supabase
            .from('portal_users')
            .select('*', { count: 'exact', head: true });
            
        const { count: totalAgencies } = await supabase
            .from('agencies')
            .select('*', { count: 'exact', head: true });
        
        // Try to get storage bucket info (may need different approach)
        let storageUsed = 0;
        try {
            const { data: buckets } = await supabase.storage.listBuckets();
            // Note: Getting actual file sizes requires listing all files
            // which can be expensive for large buckets
        } catch (e) {
            console.log('Storage API not accessible');
        }
        
        // For Supabase Free Tier limits
        const limits = {
            database: 0.5, // 500MB
            storage: 1, // 1GB  
            bandwidth: 2, // 2GB
            users: 50000, // 50k MAUs
            apiRequests: 500000 // 500k/month
        };
        
        // Estimate based on record counts (rough calculation)
        const estimatedDBSizeMB = (
            (totalUsers || 0) * 0.01 + // ~10KB per user
            (totalAgencies || 0) * 0.05 // ~50KB per agency
        );
        
        const estimatedDBSizeGB = estimatedDBSizeMB / 1024;
        
        return res.status(200).json({
            success: true,
            database: {
                estimatedSizeGB: estimatedDBSizeGB.toFixed(3),
                limitGB: limits.database,
                usagePercent: ((estimatedDBSizeGB / limits.database) * 100).toFixed(1),
                status: estimatedDBSizeGB > (limits.database * 0.8) ? 'warning' : 'healthy'
            },
            storage: {
                sizeGB: (storageUsed / 1024 / 1024 / 1024).toFixed(3),
                limitGB: limits.storage,
                usagePercent: ((storageUsed / (limits.storage * 1024 * 1024 * 1024)) * 100).toFixed(1),
                status: 'healthy',
                note: 'Requires bucket inspection for accurate data'
            },
            records: {
                users: totalUsers || 0,
                agencies: totalAgencies || 0,
                total: (totalUsers || 0) + (totalAgencies || 0)
            },
            limits: {
                plan: 'Free Tier',
                database: '500 MB',
                storage: '1 GB',
                bandwidth: '2 GB',
                users: '50,000 MAUs',
                functions: '500K invocations'
            },
            recommendations: []
        });
        
    } catch (error) {
        console.error('Infrastructure error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}