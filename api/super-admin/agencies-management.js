import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    try {
        if (req.method === 'GET') {
            const { data: agencies, error } = await supabase
                .from('agencies')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            
            const agenciesWithMetrics = await Promise.all(
                agencies.map(async (agency) => {
                    const { count: userCount } = await supabase
                        .from('portal_users')
                        .select('*', { count: 'exact', head: true })
                        .eq('agency_id', agency.id.toString());
                    
                    return {
                        ...agency,
                        user_count: userCount || 0
                    };
                })
            );
            
            return res.status(200).json({
                success: true,
                agencies: agenciesWithMetrics
            });
        }
        
        if (req.method === 'PUT') {
            const { agency_id, updates } = req.body;
            
            // Remove quotes if agency_id is wrapped in them
            const cleanAgencyId = agency_id.replace(/['"]/g, '');
            
            const { data, error } = await supabase
                .from('agencies')
                .update(updates)
                .eq('id', cleanAgencyId)
                .select()
                .single();
                
            if (error) throw error;
            
            return res.status(200).json({ success: true, agency: data });
        }
        
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}