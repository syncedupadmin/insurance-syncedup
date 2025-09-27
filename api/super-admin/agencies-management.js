import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const getCookie = (name) => {
        const match = (req.headers.cookie || '').match(new RegExp(`(?:^|; )${name}=([^;]+)`));
        return match ? decodeURIComponent(match[1]) : null;
    };

    const token = getCookie('auth_token');
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        if (req.method === 'GET') {
            const { data: agencies, error } = await supabase
                .from('agencies')
                .select('*')
                .order('created_at', { ascending: false});

            if (error) throw error;

            const agenciesWithMetrics = await Promise.all(
                (agencies || []).map(async (agency) => {
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

            if (!agency_id) {
                return res.status(400).json({
                    success: false,
                    error: 'agency_id is required'
                });
            }

            const cleanAgencyId = agency_id.replace(/['"]/g, '');

            const { data, error } = await supabase
                .from('agencies')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', cleanAgencyId)
                .select()
                .single();

            if (error) throw error;

            return res.status(200).json({
                success: true,
                agency: data,
                message: 'Agency updated successfully'
            });
        }

        if (req.method === 'DELETE') {
            const { id } = req.body;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'id is required'
                });
            }

            const { count: userCount } = await supabase
                .from('portal_users')
                .select('*', { count: 'exact', head: true })
                .eq('agency_id', id);

            if (userCount && userCount > 0) {
                return res.status(400).json({
                    success: false,
                    error: `Cannot delete agency with ${userCount} users. Please reassign or delete users first.`
                });
            }

            const { error } = await supabase
                .from('agencies')
                .delete()
                .eq('id', id);

            if (error) throw error;

            return res.status(200).json({
                success: true,
                message: 'Agency deleted successfully'
            });
        }

        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });

    } catch (error) {
        console.error('Agencies Management API error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
}