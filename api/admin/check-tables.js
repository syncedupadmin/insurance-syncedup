import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    try {
        // Try to get table information
        const { data, error } = await supabase
            .rpc('get_schema_tables', {});
            
        if (error) {
            console.log('RPC failed, trying alternative approach...');
            
            // Alternative: try to access a known table
            const { data: testData, error: testError } = await supabase
                .from('agency_integrations')
                .select('count(*)');
                
            if (testError) {
                return res.json({
                    tablesExist: false,
                    error: testError.message,
                    recommendation: 'Please create tables manually in Supabase dashboard'
                });
            }
            
            return res.json({
                tablesExist: true,
                agency_integrations_accessible: true,
                count: testData
            });
        }
        
        res.json({
            success: true,
            tables: data
        });
        
    } catch (error) {
        res.json({
            success: false,
            error: error.message,
            tablesExist: false
        });
    }
}